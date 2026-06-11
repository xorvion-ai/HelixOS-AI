"""WorkspaceState — the per-workspace dynamic state of the simulation.

This is a plain, serializable container for everything that *changes* as a
workspace runs cycles: the active scenario, business-state history, traces,
memory, approvals, insights, the run flag, paused-cycle bookkeeping, and the
id cursors. It deliberately holds **no** threading lock and **no** LiveRunner —
those are process/runtime concerns owned by `Simulation`, not workspace data.

A `Store` (see `helix.store`) loads and persists `WorkspaceState`:
- `InMemoryStore` keeps it in a process dict (demo mode — today's behavior).
- `SupabaseStore` reads/writes it to Postgres (live persistence).

`WorkspaceState.demo()` reproduces the exact boot state the in-memory
`Simulation` used before this refactor (the CouponEx scenario with its authored
history, traces, memory, approvals and insights, with id cursors at 1000/100/20)
— so demo mode stays byte-identical.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from . import seed
from .models import (
    Approval,
    CyclePoint,
    Document,
    Insight,
    Memory,
    Scenario,
    ScenarioSeed,
    Trace,
)

# Id-cursor bases. The demo deliberately starts well above the seed-data ids
# (which look like t-063 / m-07 / ap-12) so freshly minted ids never collide
# with seeded ones and the displayed sequence is stable.
TRACE_BASE = 1000
MEM_BASE = 100
APPROVAL_BASE = 20


def default_settings() -> dict:
    """Workspace settings row, defaulted. Mirrors the `workspace_settings`
    table; endpoints may read/write these later."""
    return {"default_model": None, "memory_enabled": True, "theme": None}


@dataclass
class WorkspaceState:
    """All per-workspace dynamic state. Pure data — no lock, no runner."""

    workspace_id: str
    scenario: Scenario
    history: list[CyclePoint]
    cycle: int
    traces: list[Trace] = field(default_factory=list)
    memory: list[Memory] = field(default_factory=list)
    approvals: list[Approval] = field(default_factory=list)
    insights: list[Insight] = field(default_factory=list)
    documents: list[Document] = field(default_factory=list)
    # False until the user has set up their business (the onboarding flow).
    # Demo/seeded workspaces are onboarded by definition.
    onboarded: bool = True
    is_running: bool = False
    paused_thread: str | None = None
    paused_approval_id: str | None = None
    # Id cursors (persisted as ints, not itertools.count objects).
    next_trace: int = TRACE_BASE
    next_mem: int = MEM_BASE
    next_approval: int = APPROVAL_BASE
    # Optimistic-locking token (bumped on each persisted save).
    version: int = 1
    # workspace_settings row.
    settings: dict = field(default_factory=default_settings)

    # --- id minting (cursor lives on the state so it persists) ----------

    def mint_trace_id(self) -> str:
        v = self.next_trace
        self.next_trace += 1
        return f"t-{v}"

    def mint_mem_id(self) -> str:
        v = self.next_mem
        self.next_mem += 1
        return f"m-{v}"

    def mint_approval_id(self) -> str:
        v = self.next_approval
        self.next_approval += 1
        return f"ap-{v}"

    # --- accessors ------------------------------------------------------

    @property
    def state(self) -> CyclePoint:
        return self.history[-1]

    @property
    def prev(self) -> CyclePoint | None:
        return self.history[-2] if len(self.history) > 1 else None

    # --- factories ------------------------------------------------------

    @classmethod
    def demo(cls, workspace_id: str = "default") -> "WorkspaceState":
        """The default boot state: the CouponEx scenario with its authored
        history, so the dashboard looks alive on first load. Byte-identical to
        the old `Simulation.reset_to_demo()`."""
        history = [c.model_copy() for c in seed.CYCLE_HISTORY]
        return cls(
            workspace_id=workspace_id,
            scenario=next(s for s in seed.SCENARIOS if s.active),
            history=history,
            cycle=history[-1].cycle,
            traces=[t.model_copy() for t in seed.PAST_TRACES],
            memory=[m.model_copy() for m in seed.MEMORY],
            approvals=[Approval(**a) for a in seed.APPROVALS_SEED],
            insights=[i.model_copy() for i in seed.INSIGHTS],
        )

    @classmethod
    def onboarding(cls, workspace_id: str) -> "WorkspaceState":
        """A fresh, not-yet-set-up workspace for a new (non-admin) user. Holds a
        neutral zero business so the dashboard renders; the frontend detects
        `onboarded=False` and routes to the onboarding flow, where the user
        adds their company (→ `reset_scenario`)."""
        base = CyclePoint(cycle=0, users=0, mrr=0, churn=0.0, cac=0, budget=0, nps=0, runway=0)
        scenario = Scenario(
            id="unset", name="Your business",
            tag="Set up your company to begin",
            desc="Add your business to start running autonomous cycles.",
            active=True,
            seed=ScenarioSeed(users=0, mrr=0, marketing_budget=0, competitors=0, churn=0.0, cac=0),
        )
        return cls(workspace_id=workspace_id, scenario=scenario, history=[base], cycle=0, onboarded=False)

    def reset_scenario(self, scenario: Scenario, base: CyclePoint) -> None:
        """Reset to a freshly loaded business at cycle 0. Mirrors the old
        `load_scenario`: clears dynamic lists but **keeps the id cursors**
        (they advanced over the instance's lifetime, as before). Marks the
        workspace onboarded — the user has chosen a business."""
        self.scenario = scenario
        self.history = [base]
        self.cycle = 0
        self.traces = []
        self.memory = []
        self.approvals = []
        self.insights = []
        self.onboarded = True
        self.is_running = False
        self.paused_thread = None
        self.paused_approval_id = None
