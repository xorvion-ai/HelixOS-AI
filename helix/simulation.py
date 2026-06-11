"""Simulation engine — Business Simulation Mode.

Holds the active business state and advances it one autonomous cycle at a time.
Each "Run cycle" replays the cycle script: agents collaborate (edges light up),
emit observability traces, and apply cause->effect mutations to the metrics
(users / mrr / churn / cac / budget). State history feeds the dashboard's
sparklines and cycle-over-cycle deltas.

State lives in a `WorkspaceState` behind a pluggable `Store`: `InMemoryStore`
for demo mode (zero deps, single process) and `SupabaseStore` for durable,
multi-workspace Postgres persistence. `Simulation` is a thin runtime wrapper —
it owns the lock and the lazy `LiveRunner`, and proxies all workspace data to
the active `WorkspaceState`. The API surface is unchanged across modes.
"""

from __future__ import annotations

import logging
import random
import threading

from .config import get_settings
import uuid

from .models import (
    CyclePoint,
    CycleRunResponse,
    CycleStep,
    Document,
    Memory,
    Scenario,
    ScenarioSeed,
    Trace,
)
from . import seed
from .state import WorkspaceState
from .store import InMemoryStore, StaleWorkspaceError, Store, get_store

log = logging.getLogger("helix.simulation")

# How many times to re-hydrate + retry a mutation when a persistent store
# reports the workspace row changed underneath us (optimistic-locking).
_MAX_SAVE_RETRIES = 4


def _seed_to_state(cycle: int, s: ScenarioSeed) -> CyclePoint:
    """Project a scenario seed into a cycle-0 business-state row."""
    return CyclePoint(
        cycle=cycle,
        users=s.users,
        mrr=s.mrr,
        churn=s.churn,
        cac=s.cac,
        budget=s.marketing_budget,
        nps=30,
        runway=14,
    )


class Simulation:
    """Runtime wrapper around a single workspace's `WorkspaceState`, backed by
    a `Store`. Defaults to the in-memory "default" workspace so demo mode and
    existing imports are unchanged."""

    def __init__(self, workspace_id: str = "default", store: Store | None = None, seed_demo: bool = True) -> None:
        self._lock = threading.Lock()
        self._workspace_id = workspace_id
        # `seed_demo` decides how a *new* workspace is seeded: the CouponEx demo
        # (admin / public workspace) vs a fresh, not-yet-onboarded workspace.
        self._seed_demo = seed_demo
        # The "default" (public demo) workspace is ALWAYS in-memory, even when
        # Supabase is configured — it's never persisted and its id isn't a UUID.
        # Only authenticated, per-user workspaces use the configured store.
        self._store: Store = store or (InMemoryStore() if workspace_id == "default" else get_store())
        # Live mode (built lazily on first use when GOOGLE_API_KEY is set).
        self._live = None
        self._live_ok = True
        self._ws: WorkspaceState = self._store.ensure(workspace_id, seed_demo=seed_demo)

    # --- lifecycle ------------------------------------------------------

    def reset_to_demo(self) -> None:
        """Reset this workspace to the default CouponEx boot state."""
        self._ws = WorkspaceState.demo(self._workspace_id)
        self._store.save(self._ws)

    def _hydrate(self) -> None:
        """Refresh the working state from the store. For the in-memory store
        this returns the same live object; for a persistent store it makes the
        store authoritative (the serverless requirement)."""
        self._ws = self._store.ensure(self._workspace_id, seed_demo=self._seed_demo)

    def load_scenario(self, scenario_id: str, custom_seed: ScenarioSeed | None) -> None:
        """Load a preset (or custom) business as the active simulation,
        resetting to cycle 0 with those seed metrics."""
        with self._lock:
            self._hydrate()
            if scenario_id == "custom" and custom_seed is not None:
                scenario = Scenario(
                    id="custom", name="Custom business", tag="Custom · Your seed metrics",
                    desc="A custom business defined from seed metrics.", active=True,
                    seed=custom_seed,
                )
                base_seed = custom_seed
            else:
                found = next((s for s in seed.SCENARIOS if s.id == scenario_id), None)
                if found is None:
                    raise KeyError(f"Unknown scenario: {scenario_id}")
                scenario = found.model_copy(update={"active": True})
                base_seed = found.seed

            self._ws.reset_scenario(scenario, _seed_to_state(0, base_seed))
            self._persist()

    # --- workspace-state proxies ---------------------------------------

    @property
    def scenario(self) -> Scenario:
        return self._ws.scenario

    @scenario.setter
    def scenario(self, v: Scenario) -> None:
        self._ws.scenario = v

    @property
    def history(self) -> list[CyclePoint]:
        return self._ws.history

    @history.setter
    def history(self, v: list[CyclePoint]) -> None:
        self._ws.history = v

    @property
    def cycle(self) -> int:
        return self._ws.cycle

    @cycle.setter
    def cycle(self, v: int) -> None:
        self._ws.cycle = v

    @property
    def traces(self) -> list[Trace]:
        return self._ws.traces

    @traces.setter
    def traces(self, v: list[Trace]) -> None:
        self._ws.traces = v

    @property
    def memory(self) -> list[Memory]:
        return self._ws.memory

    @memory.setter
    def memory(self, v: list[Memory]) -> None:
        self._ws.memory = v

    @property
    def approvals(self):
        return self._ws.approvals

    @approvals.setter
    def approvals(self, v) -> None:
        self._ws.approvals = v

    @property
    def insights(self):
        return self._ws.insights

    @insights.setter
    def insights(self, v) -> None:
        self._ws.insights = v

    @property
    def documents(self) -> list[Document]:
        return self._ws.documents

    @documents.setter
    def documents(self, v) -> None:
        self._ws.documents = v

    @property
    def onboarded(self) -> bool:
        return self._ws.onboarded

    @property
    def is_running(self) -> bool:
        return self._ws.is_running

    @is_running.setter
    def is_running(self, v: bool) -> None:
        self._ws.is_running = v

    @property
    def _paused_thread(self) -> str | None:
        return self._ws.paused_thread

    @_paused_thread.setter
    def _paused_thread(self, v: str | None) -> None:
        self._ws.paused_thread = v

    @property
    def _paused_approval_id(self) -> str | None:
        return self._ws.paused_approval_id

    @_paused_approval_id.setter
    def _paused_approval_id(self, v: str | None) -> None:
        self._ws.paused_approval_id = v

    @property
    def state(self) -> CyclePoint:
        return self._ws.state

    @property
    def prev(self) -> CyclePoint | None:
        return self._ws.prev

    # --- persistence ----------------------------------------------------

    def _persist(self) -> None:
        self._store.save(self._ws)

    # --- id minting (cursors live on the workspace state) --------------

    def _next_trace_id(self) -> str:
        return self._ws.mint_trace_id()

    def _next_mem_id(self) -> str:
        return self._ws.mint_mem_id()

    def _next_approval_id(self) -> str:
        return self._ws.mint_approval_id()

    # --- live mode (LangGraph + Gemini) --------------------------------

    def _get_live(self):
        """Lazily build the live runner. Returns None if it can't be built
        (missing libs / init error) so we transparently fall back to scripted."""
        if self._live is None and self._live_ok:
            try:
                from .live import LiveRunner
                self._live = LiveRunner()
            except Exception:  # pragma: no cover - defensive
                log.exception("could not initialise live runner; using scripted cycle")
                self._live_ok = False
        return self._live

    def run_cycle(self, interactive: bool = False, client_id: str | None = None) -> CycleRunResponse:
        """Advance one autonomous cycle. In live mode (GOOGLE_API_KEY set) this
        runs the real LangGraph multi-agent graph; otherwise — or if a live run
        errors — it replays the scripted collaboration. Both produce the same
        `CycleRunResponse` shape so the frontend is unchanged.

        `client_id` (the originating browser session) is stamped on the emitted
        realtime `activity_events` so that client can ignore its own echo."""
        self._hydrate()
        if get_settings().gemini_enabled:
            live = self._get_live()
            if live is not None:
                try:
                    return self._run_live(live, interactive, client_id)
                except Exception:
                    log.exception("live cycle failed; falling back to scripted cycle")
        return self._run_scripted(client_id)

    def _run_live(self, live, interactive: bool, client_id: str | None) -> CycleRunResponse:
        with self._lock:
            prev = self.state
            next_cycle = self.cycle + 1
            outcome = live.start(
                prev=prev, cycle=next_cycle, memories=list(self.memory),
                interactive=interactive,
                mk_trace_id=self._next_trace_id, mk_mem_id=self._next_mem_id,
                mk_approval_id=self._next_approval_id,
            )
            return self._commit_outcome(outcome, client_id)

    def resume_cycle(
        self, thread_id: str, decision: str, client_id: str | None = None
    ) -> CycleRunResponse | None:
        """Resume a live cycle paused at a human-approval interrupt."""
        live = self._get_live()
        if live is None:
            return None
        with self._lock:
            self._hydrate()
            outcome = live.resume(thread_id=thread_id, decision=decision)
            if outcome is None:
                return None
            # The paused approval is now decided — clear it from the queue.
            if self._paused_approval_id:
                self.approvals = [a for a in self.approvals if a.id != self._paused_approval_id]
                self._paused_approval_id = None
            return self._commit_outcome(outcome, client_id)

    def _emit_events(
        self, steps: list[CycleStep], final_state: CyclePoint,
        cycle: int, client_id: str | None, *, complete: bool,
    ) -> None:
        """Append the cycle's animated steps (and a terminal `cycle_complete`)
        to the realtime stream. A no-op on the in-memory demo store."""
        events: list[dict] = [
            {
                "client_id": client_id, "cycle": cycle, "seq": i, "kind": "step",
                "actor": s.actor, "edge": list(s.edge), "message": s.message,
                "state_after": s.state_after.model_dump(),
            }
            for i, s in enumerate(steps)
        ]
        if complete:
            events.append({
                "client_id": client_id, "cycle": cycle, "seq": len(steps),
                "kind": "cycle_complete", "actor": None, "edge": None, "message": None,
                "state_after": final_state.model_dump(),
            })
        self._store.append_events(self._workspace_id, events)

    def _commit_outcome(self, outcome, client_id: str | None = None) -> CycleRunResponse:
        """Fold a LiveOutcome into committed simulation state and build the
        response. A 'paused' outcome records partial progress + the pending
        approval but does not advance the cycle until it is resumed."""
        self.traces = outcome.new_traces + self.traces

        if outcome.status == "paused":
            self.is_running = True
            self._paused_thread = outcome.thread_id
            if outcome.pending_approval is not None:
                self.approvals.append(outcome.pending_approval)
                self._paused_approval_id = outcome.pending_approval.id
            partial_state = outcome.steps[-1].state_after if outcome.steps else outcome.prev
            self._persist()
            # Stream progress up to the pause; no terminal event (cycle not done).
            self._emit_events(outcome.steps, partial_state, outcome.cycle, client_id, complete=False)
            return CycleRunResponse(
                cycle=outcome.cycle, state=partial_state, prev=outcome.prev,
                steps=outcome.steps, new_traces=outcome.new_traces, new_memory=None,
                status="paused", thread_id=outcome.thread_id,
                pending_approval=outcome.pending_approval,
            )

        # complete
        final_state = outcome.final_state
        self.history.append(final_state)
        self.cycle = outcome.cycle
        if outcome.learning is not None:
            self.memory.insert(0, outcome.learning)
        for ap in outcome.pending_approvals:
            self.approvals.append(ap)
        if outcome.insights:
            self.insights = outcome.insights
        self.is_running = False
        self._paused_thread = None
        self._persist()
        self._emit_events(outcome.steps, final_state, outcome.cycle, client_id, complete=True)
        return CycleRunResponse(
            cycle=outcome.cycle, state=final_state, prev=outcome.prev,
            steps=outcome.steps, new_traces=outcome.new_traces,
            new_memory=outcome.learning, status="complete",
        )

    def _run_scripted(self, client_id: str | None = None) -> CycleRunResponse:
        """Advance one autonomous cycle by replaying the scripted multi-agent
        collaboration, mutating state and recording traces + a learning."""
        with self._lock:
            prev = self.state
            next_cycle = self.cycle + 1
            working: dict = prev.model_dump()
            working["cycle"] = next_cycle

            steps: list[CycleStep] = []
            new_traces: list[Trace] = []

            for raw in seed.CYCLE_SCRIPT:
                apply = raw.get("apply")
                if callable(apply):
                    working = apply(working)
                    working["cycle"] = next_cycle

                state_after = CyclePoint(**{
                    "cycle": next_cycle,
                    "users": working["users"],
                    "mrr": working["mrr"],
                    "churn": working["churn"],
                    "cac": working["cac"],
                    "budget": working["budget"],
                    "nps": working.get("nps", prev.nps),
                    "runway": working.get("runway", prev.runway),
                })

                t = raw["trace"]
                trace = Trace(
                    id=self._next_trace_id(), cycle=next_cycle,
                    agent=t["agent"], task=t["task"], decision=t["decision"],
                    reasoning=t["reasoning"], tools=t["tools"], result=t["result"],
                    dur=t["dur"], tokens=t["tokens"], status="ok", ago="just now",
                )
                new_traces.append(trace)
                steps.append(CycleStep(
                    edge=raw["edge"], actor=raw["actor"],
                    message=raw["message"], trace=trace, state_after=state_after,
                ))

            # Commit the new state + traces
            base = steps[-1].state_after
            # Gentle organic noise so the charts read like a real business —
            # varying slopes and the occasional up-tick instead of a dead-straight
            # line. MRR keeps its net-positive trend (its base step is +8.7%, so a
            # small negative jitter can't flip it); churn/CAC may wobble either way.
            final_state = base.model_copy(update={
                "users": int(base.users * (1 + random.uniform(-0.010, 0.016))),
                "mrr": int(base.mrr * (1 + random.uniform(-0.004, 0.020))),
                "churn": round(max(0.005, base.churn + random.uniform(-0.004, 0.005)), 4),
                "cac": max(20, base.cac + random.randint(-3, 6)),
                "nps": min(prev.nps + random.randint(0, 3), 80),
                "runway": prev.runway + 1,
            })
            self.history.append(final_state)
            self.cycle = next_cycle
            self.traces = new_traces + self.traces

            # Write a learning (the "Learn" phase of the autonomous loop)
            d_mrr = (final_state.mrr - prev.mrr) / prev.mrr if prev.mrr else 0
            learning = Memory(
                id=self._next_mem_id(), cycle=next_cycle, agent="founder",
                result=f"Cycle {next_cycle}: MRR {'+' if d_mrr >= 0 else ''}{d_mrr * 100:.1f}%, "
                       f"CAC ${final_state.cac}, churn {final_state.churn * 100:.1f}%",
                lesson="Short-form acquisition + day-21 win-back continues to lift growth while "
                       "holding CAC down. Reinforce next cycle.",
                confidence="high" if d_mrr > 0 else "medium",
            )
            self.memory.insert(0, learning)
            self._persist()
            self._emit_events(steps, final_state, next_cycle, client_id, complete=True)

            return CycleRunResponse(
                cycle=next_cycle, state=final_state, prev=prev,
                steps=steps, new_traces=new_traces, new_memory=learning,
            )

    # --- approvals ------------------------------------------------------

    # --- knowledge base (documents) ------------------------------------

    @staticmethod
    def _human_size(n: int) -> str:
        if n < 1024:
            return f"{n} B"
        if n < 1024 * 1024:
            return f"{n / 1024:.1f} KB"
        return f"{n / (1024 * 1024):.1f} MB"

    def add_document(self, name: str, collection: str, content: str) -> Document:
        """Mock-ingest a document into the knowledge base: chunk it, record
        metadata, and (when persistent) save it. Real vector ingest (Chroma /
        pgvector) plugs in here later — the contract is unchanged."""
        with self._lock:
            self._hydrate()
            nbytes = len(content.encode("utf-8"))
            chunks = max(1, -(-len(content) // 600))  # ceil(len/600), >=1
            doc = Document(
                id=uuid.uuid4().hex,
                name=name.strip() or "Untitled document",
                collection=collection or "company_docs",
                chunks=chunks,
                size=self._human_size(nbytes),
                source_type="text",
                status="ready",
                updated="just now",
            )
            self.documents = [doc, *self.documents]
            self._persist()
            return doc

    def resolve_approval(self, approval_id: str, decision: str) -> "object | None":
        """Approve/reject a pending approval. Idempotent, so on an optimistic-
        locking conflict (StaleWorkspaceError) we re-hydrate and retry rather
        than surfacing a 409 — re-applying the same decision is safe."""
        with self._lock:
            for attempt in range(_MAX_SAVE_RETRIES):
                self._hydrate()
                found = next((a for a in self.approvals if a.id == approval_id), None)
                if found is None:
                    return None
                found.status = decision  # type: ignore[assignment]
                self.approvals = [a for a in self.approvals if a.status == "pending"]
                try:
                    self._persist()
                    return found
                except StaleWorkspaceError:
                    if attempt == _MAX_SAVE_RETRIES - 1:
                        raise
            return None


# Module-level singleton for the public, no-auth demo workspace. It is ALWAYS
# in-memory — even when Supabase is configured — so the zero-keys demo keeps
# working and we never write a non-UUID "default" row to Postgres. Authenticated
# users get their own store-backed workspace via get_simulation(user_id).
SIM = Simulation(store=InMemoryStore())

# Cache of Simulation wrappers per workspace id. Each wrapper re-hydrates from
# the store on every mutation, so caching the wrapper (not the state) is safe on
# serverless: state stays authoritative in Postgres, the wrapper just holds the
# lock + lazy LiveRunner.
_sims: dict[str, Simulation] = {"default": SIM}
_sims_lock = threading.Lock()


def get_simulation(workspace_id: str = "default", seed_demo: bool = True) -> Simulation:
    """Return the Simulation bound to a workspace. `"default"` returns the demo
    singleton; any other id gets a cached, store-backed Simulation for that
    workspace (created on first access). `seed_demo` controls how a brand-new
    workspace is seeded (CouponEx demo for admins; empty/onboarding otherwise)."""
    if workspace_id == "default":
        return SIM
    sim = _sims.get(workspace_id)
    if sim is None:
        with _sims_lock:
            sim = _sims.get(workspace_id)
            if sim is None:
                sim = Simulation(workspace_id=workspace_id, seed_demo=seed_demo)
                _sims[workspace_id] = sim
    return sim
