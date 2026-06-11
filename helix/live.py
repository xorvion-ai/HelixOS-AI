"""Live cycle runner — bridges the LangGraph graph to the API contract.

`LiveRunner` executes one autonomous cycle through `HelixGraph` and converts the
graph's accumulated steps into the exact `CycleStep` / `Trace` / `Memory` shapes
the frontend already consumes — so live mode is wire-compatible with demo mode
(the `CycleRunResponse` is identical, with a few optional fields added).

Two execution paths:

* **Autonomous** (`interactive=False`, the default `/api/cycle/run`): runs the
  graph to completion in one shot and returns all steps. Marketing's >$1k spend
  is applied and a *pending* approval is logged for human review (demo
  semantics — approve/reject just clears the queue item).
* **Interactive** (`interactive=True`): the graph pauses at Marketing's approval
  `interrupt()`; the runner returns the steps so far plus a `thread_id` and the
  pending approval. `resume(thread_id, decision)` continues the graph — applying
  or holding the campaign based on the human decision — and returns the rest.

The Simulation owns committed state and ID counters; it passes ID-generator
callables in so trace/memory/approval IDs stay in one sequence across modes.
"""

from __future__ import annotations

import logging
import uuid
from dataclasses import dataclass, field
from typing import Callable

from langgraph.types import Command

from .graph import HelixGraph
from .llm import LLM, get_llm
from .memory_store import MemoryStore
from .models import (
    Approval,
    CyclePoint,
    CycleStep,
    Insight,
    Memory,
    Trace,
)
from .rag import KnowledgeIndex

log = logging.getLogger("helix.live")


@dataclass
class LiveOutcome:
    status: str                              # "complete" | "paused"
    cycle: int
    steps: list[CycleStep]
    new_traces: list[Trace]
    prev: CyclePoint
    final_state: CyclePoint | None = None
    learning: Memory | None = None
    pending_approvals: list[Approval] = field(default_factory=list)
    insights: list[Insight] = field(default_factory=list)
    thread_id: str | None = None
    pending_approval: Approval | None = None


@dataclass
class _Paused:
    config: dict
    prev: CyclePoint
    cycle: int
    returned: int
    mk_trace_id: Callable[[], str]
    mk_mem_id: Callable[[], str]
    mk_approval_id: Callable[[], str]


class LiveRunner:
    """Builds the graph once and runs cycles against it. One instance per
    workspace (the free-phase demo has a single workspace)."""

    def __init__(self, llm: LLM | None = None) -> None:
        self._llm = llm or get_llm()
        self._rag = KnowledgeIndex(self._llm)
        self._mem = MemoryStore(self._llm)
        self._graph = HelixGraph(self._llm, self._rag, self._mem).compiled
        self._paused: dict[str, _Paused] = {}

    @property
    def enabled(self) -> bool:
        return self._llm.enabled

    # -- public API -----------------------------------------------------

    def start(self, *, prev: CyclePoint, cycle: int, memories: list[Memory],
              interactive: bool, mk_trace_id: Callable[[], str],
              mk_mem_id: Callable[[], str], mk_approval_id: Callable[[], str]) -> LiveOutcome:
        thread_id = f"cycle-{cycle}-{uuid.uuid4().hex[:8]}"
        config = {"configurable": {"thread_id": thread_id, "memories": memories}}
        init = {
            "cycle": cycle, "interactive": interactive,
            "prev": prev.model_dump(), "business": prev.model_dump(),
            "goal": "", "steps": [], "events": [], "insights": [],
            "approvals": [], "citations": [], "recalled": [],
            "campaign": None, "learning": None,
        }
        self._graph.invoke(init, config)
        return self._collect(thread_id, config, prev, cycle, 0,
                             mk_trace_id, mk_mem_id, mk_approval_id)

    def resume(self, *, thread_id: str, decision: str) -> LiveOutcome | None:
        bk = self._paused.pop(thread_id, None)
        if bk is None:
            return None
        self._graph.invoke(Command(resume=decision), bk.config)
        return self._collect(thread_id, bk.config, bk.prev, bk.cycle, bk.returned,
                             bk.mk_trace_id, bk.mk_mem_id, bk.mk_approval_id)

    def has_paused(self, thread_id: str) -> bool:
        return thread_id in self._paused

    # -- internals ------------------------------------------------------

    def _collect(self, thread_id, config, prev, cycle, returned,
                 mk_trace_id, mk_mem_id, mk_approval_id) -> LiveOutcome:
        snap = self._graph.get_state(config)
        values = snap.values
        all_steps = values.get("steps", [])
        new_raw = all_steps[returned:]
        steps = [self._to_step(s, cycle, prev, mk_trace_id) for s in new_raw]
        traces = [s.trace for s in steps]

        # Paused at an interrupt → return partial steps + the pending approval.
        if snap.next:
            payload = {}
            for task in snap.tasks:
                if task.interrupts:
                    payload = task.interrupts[0].value or {}
                    break
            approval = self._to_approval(payload.get("approval", {}), mk_approval_id, status="pending")
            self._paused[thread_id] = _Paused(
                config=config, prev=prev, cycle=cycle, returned=len(all_steps),
                mk_trace_id=mk_trace_id, mk_mem_id=mk_mem_id, mk_approval_id=mk_approval_id,
            )
            return LiveOutcome(
                status="paused", cycle=cycle, steps=steps, new_traces=traces, prev=prev,
                thread_id=thread_id, pending_approval=approval,
            )

        # Complete → final state, learning, pending approvals, insights.
        final_state = self._final_state(steps, prev, cycle)
        learning = self._to_memory(values.get("learning"), mk_mem_id)
        pending = [
            self._to_approval(a, mk_approval_id, status="pending")
            for a in values.get("approvals", []) if a.get("status") == "pending"
        ]
        insights = [
            Insight(kind=i.get("kind", "watch"), text=i["text"])
            for i in values.get("insights", []) if i.get("text")
        ]
        return LiveOutcome(
            status="complete", cycle=cycle, steps=steps, new_traces=traces, prev=prev,
            final_state=final_state, learning=learning, pending_approvals=pending, insights=insights,
            thread_id=thread_id,
        )

    # -- converters -----------------------------------------------------

    @staticmethod
    def _to_step(s: dict, cycle: int, prev: CyclePoint, mk_trace_id) -> CycleStep:
        b = s["state_after"]
        state_after = CyclePoint(
            cycle=cycle, users=b["users"], mrr=b["mrr"], churn=b["churn"],
            cac=b["cac"], budget=b["budget"],
            nps=b.get("nps", prev.nps), runway=b.get("runway", prev.runway),
        )
        t = s["trace"]
        trace = Trace(
            id=mk_trace_id(), cycle=cycle, agent=t["agent"], task=t["task"],
            decision=t["decision"], reasoning=t["reasoning"], tools=t["tools"],
            result=t["result"], dur=t["dur"], tokens=t["tokens"],
            status=t.get("status", "ok"), ago="just now",
        )
        return CycleStep(edge=s["edge"], actor=s["actor"], message=s["message"],
                         trace=trace, state_after=state_after)

    @staticmethod
    def _final_state(steps: list[CycleStep], prev: CyclePoint, cycle: int) -> CyclePoint:
        base = steps[-1].state_after if steps else prev.model_copy(update={"cycle": cycle})
        # Same gentle organic drift the scripted cycle applies, so modes match.
        return base.model_copy(update={
            "nps": min(prev.nps + 2, 75), "runway": prev.runway + 1,
        })

    @staticmethod
    def _to_memory(learning: dict | None, mk_mem_id) -> Memory | None:
        if not learning:
            return None
        return Memory(
            id=mk_mem_id(), cycle=learning["cycle"], agent=learning.get("agent", "founder"),
            result=learning["result"], lesson=learning["lesson"],
            confidence=learning.get("confidence", "medium"),
        )

    @staticmethod
    def _to_approval(a: dict, mk_approval_id, status: str) -> Approval:
        return Approval(
            id=mk_approval_id(), agent=a.get("agent", "marketing"),
            action=a.get("action", "Send campaign"), risk=a.get("risk", "medium"),
            title=a.get("title", "Approve action"), summary=a.get("summary", ""),
            payload=a.get("payload", {}), requested="just now", status=status,  # type: ignore[arg-type]
        )
