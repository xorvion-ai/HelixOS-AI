"""SupabaseStore — durable, multi-workspace persistence on Postgres.

Reads/writes a `WorkspaceState` to normalized Supabase tables using the
service-role key (server-side trusted; bypasses RLS — the API resolves the
workspace id from a verified JWT before this store is ever touched).

This module is imported **lazily** (only when Supabase credentials are set), so
demo mode never needs the optional `supabase` package.

Mapping notes:
- The wire string ids (`t-1000`, `m-07`, `ap-20`) are stored verbatim in a
  `wire_id` column; surrogate PKs handle relational integrity.
- `agent_traces` is the canonical observability table. The wire `Trace` is
  projected from it: `task←action`, `reasoning←reasoning_summary`,
  `tools←tools_used`, `dur←duration_ms`, `tokens←input_tokens+output_tokens`
  (the sim records a single total today → stored as `output_tokens`).
- Child-row order is preserved with an explicit `seq` (0 = newest), matching the
  in-memory newest-first lists.
- Optimistic locking: `save` bumps `workspaces.version` with a guarded UPDATE;
  a concurrent writer that already bumped it triggers `StaleWorkspaceError`.

`documents` / vector ingestion are out of scope here (table exists for later).
"""

from __future__ import annotations

import logging

from .config import get_settings
from .models import Approval, CyclePoint, Document, Insight, Memory, Scenario, Trace
from .state import WorkspaceState, default_settings
from .store import StaleWorkspaceError

log = logging.getLogger("helix.supabase_store")

# Child tables replaced wholesale on each save (tiny per-workspace data).
_CHILD_TABLES = ("cycle_points", "agent_traces", "memory", "approvals", "insights")


class SupabaseStore:
    def __init__(self) -> None:
        from supabase import create_client  # lazy: optional dependency

        s = get_settings()
        self._client = create_client(s.supabase_url, s.supabase_service_key)

    # --- public API ----------------------------------------------------

    def load(self, workspace_id: str) -> WorkspaceState | None:
        row = self._one("workspaces", workspace_id)
        if row is None:
            return None

        history = [
            self._to_cycle_point(r)
            for r in self._children("cycle_points", workspace_id, order="seq")
        ]
        traces = [
            self._to_trace(r)
            for r in self._children("agent_traces", workspace_id, order="seq")
        ]
        memory = [
            self._to_memory(r)
            for r in self._children("memory", workspace_id, order="seq")
        ]
        approvals = [
            self._to_approval(r)
            for r in self._children("approvals", workspace_id, order="seq")
        ]
        insights = [
            Insight(kind=r["kind"], text=r["text"])
            for r in self._children("insights", workspace_id, order="seq")
        ]
        documents = self._load_documents(workspace_id)
        settings = self._settings(workspace_id)

        return WorkspaceState(
            workspace_id=workspace_id,
            scenario=Scenario(**row["scenario_json"]),
            history=history,
            cycle=row["cycle"],
            traces=traces,
            memory=memory,
            approvals=approvals,
            insights=insights,
            documents=documents,
            is_running=bool(row["is_running"]),
            onboarded=bool(row.get("onboarded", True)),
            paused_thread=row.get("paused_thread"),
            paused_approval_id=row.get("paused_approval_id"),
            next_trace=row["next_trace_id"],
            next_mem=row["next_mem_id"],
            next_approval=row["next_approval_id"],
            version=row["version"],
            settings=settings,
        )

    def ensure(self, workspace_id: str, seed_demo: bool = True) -> WorkspaceState:
        ws = self.load(workspace_id)
        if ws is None:
            ws = WorkspaceState.demo(workspace_id) if seed_demo else WorkspaceState.onboarding(workspace_id)
            self.save(ws)
        return ws

    def save(self, state: WorkspaceState) -> None:
        wid = state.workspace_id
        row = self._workspace_row(state)

        new_version = state.version + 1
        updated = (
            self._client.table("workspaces")
            .update({**row, "version": new_version})
            .eq("id", wid)
            .eq("version", state.version)
            .execute()
        )
        if updated.data:
            state.version = new_version
        else:
            # Either the row doesn't exist yet (first save) or another writer
            # bumped the version since we loaded it.
            if self._one("workspaces", wid) is not None:
                raise StaleWorkspaceError(wid)
            self._client.table("workspaces").insert({**row, "version": 1}).execute()
            state.version = 1

        self._save_settings(state)
        self._replace_children(state)
        self._save_documents(state)

    def _load_documents(self, workspace_id: str) -> list[Document]:
        """Best-effort: returns [] if the table/columns aren't present yet."""
        try:
            rows = self._children("documents", workspace_id, order="created_at")
        except Exception:  # pragma: no cover - defensive
            log.exception("documents load failed")
            return []
        return [
            Document(
                id=str(r["id"]), name=r.get("title") or "Untitled",
                collection=r.get("collection") or "company_docs",
                chunks=r.get("chunk_count", 0) or 0, size=r.get("size") or "—",
                source_type=r.get("source_type") or "text",
                status=r.get("status") or "ready", updated="saved",
            )
            for r in rows
        ]

    def _save_documents(self, state) -> None:
        """Best-effort replace of the workspace's documents (small set)."""
        wid = state.workspace_id
        try:
            self._client.table("documents").delete().eq("workspace_id", wid).execute()
            rows = [
                {
                    "id": d.id, "workspace_id": wid, "title": d.name,
                    "collection": d.collection, "chunk_count": d.chunks, "size": d.size,
                    "source_type": d.source_type, "status": d.status,
                }
                for d in state.documents
            ]
            if rows:
                self._client.table("documents").insert(rows).execute()
        except Exception:  # pragma: no cover - defensive
            log.exception("documents persist failed")

    def append_events(self, workspace_id: str, events: list[dict]) -> None:
        """Append-only insert into `activity_events` (the Realtime stream).
        Best-effort: a failure here must never break the cycle response, so it
        is logged and swallowed (the migration may not be applied yet)."""
        if not events:
            return
        rows = [{"workspace_id": workspace_id, **e} for e in events]
        try:
            self._client.table("activity_events").insert(rows).execute()
        except Exception:  # pragma: no cover - defensive (table/publication missing)
            log.exception("activity_events insert failed (realtime disabled?)")

    # --- row builders ---------------------------------------------------

    @staticmethod
    def _workspace_row(state: WorkspaceState) -> dict:
        return {
            "id": state.workspace_id,
            "owner_user_id": state.workspace_id,
            "cycle": state.cycle,
            "is_running": state.is_running,
            "onboarded": state.onboarded,
            "paused_thread": state.paused_thread,
            "paused_approval_id": state.paused_approval_id,
            "next_trace_id": state.next_trace,
            "next_mem_id": state.next_mem,
            "next_approval_id": state.next_approval,
            "scenario_id": state.scenario.id,
            "scenario_json": state.scenario.model_dump(),
        }

    def _save_settings(self, state: WorkspaceState) -> None:
        s = {**default_settings(), **(state.settings or {})}
        self._client.table("workspace_settings").upsert(
            {
                "workspace_id": state.workspace_id,
                "default_model": s.get("default_model"),
                "memory_enabled": s.get("memory_enabled", True),
                "theme": s.get("theme"),
            },
            on_conflict="workspace_id",
        ).execute()

    def _replace_children(self, state: WorkspaceState) -> None:
        wid = state.workspace_id
        for table in _CHILD_TABLES:
            self._client.table(table).delete().eq("workspace_id", wid).execute()

        cps = [
            {"workspace_id": wid, "seq": i, **self._from_cycle_point(cp)}
            for i, cp in enumerate(state.history)
        ]
        if cps:
            self._client.table("cycle_points").insert(cps).execute()

        traces = [
            {"workspace_id": wid, "seq": i, **self._from_trace(t)}
            for i, t in enumerate(state.traces)
        ]
        if traces:
            self._client.table("agent_traces").insert(traces).execute()

        mems = [
            {
                "workspace_id": wid, "seq": i, "wire_id": m.id, "cycle": m.cycle,
                "agent": m.agent, "result": m.result, "lesson": m.lesson,
                "confidence": m.confidence,
            }
            for i, m in enumerate(state.memory)
        ]
        if mems:
            self._client.table("memory").insert(mems).execute()

        aps = [
            {
                "workspace_id": wid, "seq": i, "wire_id": a.id, "agent": a.agent,
                "action": a.action, "risk": a.risk, "title": a.title,
                "summary": a.summary, "payload": a.payload, "requested": a.requested,
                "status": a.status,
            }
            for i, a in enumerate(state.approvals)
        ]
        if aps:
            self._client.table("approvals").insert(aps).execute()

        ins = [
            {"workspace_id": wid, "seq": i, "kind": x.kind, "text": x.text}
            for i, x in enumerate(state.insights)
        ]
        if ins:
            self._client.table("insights").insert(ins).execute()

    # --- field mappers --------------------------------------------------

    @staticmethod
    def _from_cycle_point(cp: CyclePoint) -> dict:
        return {
            "cycle": cp.cycle, "users": cp.users, "mrr": cp.mrr, "churn": cp.churn,
            "cac": cp.cac, "budget": cp.budget, "nps": cp.nps, "runway": cp.runway,
        }

    @staticmethod
    def _to_cycle_point(r: dict) -> CyclePoint:
        return CyclePoint(
            cycle=r["cycle"], users=r["users"], mrr=r["mrr"], churn=r["churn"],
            cac=r["cac"], budget=r["budget"], nps=r["nps"], runway=r["runway"],
        )

    @staticmethod
    def _from_trace(t: Trace) -> dict:
        return {
            "wire_id": t.id, "cycle": t.cycle, "agent_name": t.agent,
            "action": t.task, "decision": t.decision, "reasoning_summary": t.reasoning,
            "tools_used": t.tools, "result": t.result,
            "input_tokens": 0, "output_tokens": t.tokens,
            "duration_ms": t.dur, "status": t.status, "ago": t.ago,
        }

    @staticmethod
    def _to_trace(r: dict) -> Trace:
        return Trace(
            id=r["wire_id"], cycle=r["cycle"], agent=r["agent_name"],
            task=r["action"], decision=r.get("decision", ""),
            reasoning=r.get("reasoning_summary", ""), tools=r.get("tools_used") or [],
            result=r.get("result", ""),
            dur=r.get("duration_ms", 0),
            tokens=(r.get("input_tokens", 0) or 0) + (r.get("output_tokens", 0) or 0),
            status=r.get("status", "ok"), ago=r.get("ago", "just now"),
        )

    @staticmethod
    def _to_memory(r: dict) -> Memory:
        return Memory(
            id=r["wire_id"], cycle=r["cycle"], agent=r["agent"],
            result=r["result"], lesson=r["lesson"], confidence=r["confidence"],
        )

    @staticmethod
    def _to_approval(r: dict) -> Approval:
        return Approval(
            id=r["wire_id"], agent=r["agent"], action=r["action"], risk=r["risk"],
            title=r["title"], summary=r["summary"], payload=r.get("payload") or {},
            requested=r["requested"], status=r["status"],
        )

    # --- low-level helpers ---------------------------------------------

    def _one(self, table: str, workspace_id: str) -> dict | None:
        res = (
            self._client.table(table)
            .select("*")
            .eq("id", workspace_id)
            .limit(1)
            .execute()
        )
        return res.data[0] if res.data else None

    def _children(self, table: str, workspace_id: str, order: str) -> list[dict]:
        res = (
            self._client.table(table)
            .select("*")
            .eq("workspace_id", workspace_id)
            .order(order)
            .execute()
        )
        return res.data or []

    def _settings(self, workspace_id: str) -> dict:
        res = (
            self._client.table("workspace_settings")
            .select("*")
            .eq("workspace_id", workspace_id)
            .limit(1)
            .execute()
        )
        if not res.data:
            return default_settings()
        r = res.data[0]
        return {
            "default_model": r.get("default_model"),
            "memory_enabled": r.get("memory_enabled", True),
            "theme": r.get("theme"),
        }
