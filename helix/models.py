"""Pydantic models — the API data contract.

Field names mirror exactly what the frontend design (Helix11/design_handoff)
consumes via `window.HELIX`, so responses drop straight into the existing
components. Where a key collides with a Python keyword (`from`), we alias it
and serialise back to the original wire name.
"""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

AgentId = Literal[
    "founder", "operations", "marketing", "analytics",
    "sales", "research", "finance", "support",
]


# --- Scenarios & business state -----------------------------------------

class ScenarioSeed(BaseModel):
    users: int
    mrr: int
    marketing_budget: int
    competitors: int
    churn: float
    cac: int


class Scenario(BaseModel):
    id: str
    name: str
    tag: str
    desc: str
    active: bool = False
    seed: ScenarioSeed


class CyclePoint(BaseModel):
    """One row of business state history (per cycle)."""
    cycle: int
    users: int
    mrr: int
    churn: float
    cac: int
    budget: int
    nps: int
    runway: int


# --- Agents & org chart -------------------------------------------------

class Agent(BaseModel):
    id: AgentId
    name: str
    role: str
    glyph: str
    phase: int
    status: str
    model: str
    blurb: str
    tools: list[str]
    outputs: list[str]


class OrgEdge(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    from_: str = Field(alias="from", serialization_alias="from")
    to: str


class AgentMessage(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    from_: str = Field(alias="from", serialization_alias="from")
    to: str
    message: str
    ts: str


# --- Observability traces -----------------------------------------------

class Trace(BaseModel):
    id: str
    cycle: int
    agent: AgentId
    task: str
    decision: str
    reasoning: str
    tools: list[str]
    result: str
    dur: int          # milliseconds
    tokens: int
    status: str = "ok"
    ago: str = "just now"


# --- Long-term memory ---------------------------------------------------

class Memory(BaseModel):
    id: str
    cycle: int
    agent: AgentId
    result: str
    lesson: str
    confidence: Literal["low", "medium", "high"] = "medium"


# --- Knowledge base (RAG) -----------------------------------------------

class KnowledgeDoc(BaseModel):
    name: str
    chunks: int
    size: str
    updated: str


class KnowledgeCollection(BaseModel):
    collection: str
    color: str
    docs: list[KnowledgeDoc]


class Document(BaseModel):
    """A user-uploaded knowledge-base document (RAG ingest)."""
    id: str
    name: str
    collection: str
    chunks: int
    size: str
    source_type: str = "text"
    status: Literal["pending", "ready", "failed"] = "ready"
    updated: str = "just now"


# --- Tasks --------------------------------------------------------------

class Task(BaseModel):
    id: str
    title: str
    agent: AgentId
    status: str
    deps: list[str] = Field(default_factory=list)


# --- Approvals ----------------------------------------------------------

class Approval(BaseModel):
    id: str
    agent: AgentId
    action: str
    risk: Literal["low", "medium", "high"]
    title: str
    summary: str
    payload: dict[str, Any]
    requested: str
    status: Literal["pending", "approved", "rejected"] = "pending"


# --- Insights -----------------------------------------------------------

class Insight(BaseModel):
    kind: Literal["win", "watch", "risk"]
    text: str


# --- Request bodies -----------------------------------------------------

class StartSimulationRequest(BaseModel):
    scenario_id: str
    custom_seed: ScenarioSeed | None = None
    # Company name for a custom business (carried onto the scenario).
    name: str | None = None


class ResolveApprovalRequest(BaseModel):
    decision: Literal["approved", "rejected"]


class ResumeCycleRequest(BaseModel):
    """Resume a live cycle paused at a human-approval interrupt."""
    thread_id: str
    decision: Literal["approved", "rejected"]


class UploadDocumentRequest(BaseModel):
    """Add a document to the knowledge base (mock RAG ingest in demo)."""
    name: str
    collection: str = "company_docs"
    content: str = ""


class ChatAttachment(BaseModel):
    """A file the operator attached to a chat message. `kind="image"` carries
    base64-encoded image bytes (analyzed by the multimodal model); `kind="text"`
    carries extracted document text included as context."""
    name: str
    mime: str = ""
    kind: Literal["image", "text"] = "text"
    data: str = ""  # base64 (image) or UTF-8 text (text)


class ChatRequest(BaseModel):
    """Ask an agent a question in its detail panel."""
    message: str
    attachment: ChatAttachment | None = None


class ChatResponse(BaseModel):
    agent: str
    reply: str
    mode: Literal["demo", "live"] = "demo"


# --- Composite responses ------------------------------------------------

class DashboardResponse(BaseModel):
    cycle: int
    scenario: Scenario
    state: CyclePoint
    prev: CyclePoint | None
    history: list[CyclePoint]
    insights: list[Insight]
    approvals: list[Approval]
    activity: list[AgentMessage]
    is_running: bool = False


class CycleRunResponse(BaseModel):
    cycle: int
    state: CyclePoint
    prev: CyclePoint
    steps: list["CycleStep"]
    new_traces: list[Trace]
    new_memory: Memory | None = None
    # --- live mode (optional; demo mode leaves these at defaults) -------
    # "complete" for a finished cycle, "paused" when a live cycle is waiting
    # on a human approval (interactive mode). `thread_id` resumes it.
    status: Literal["complete", "paused"] = "complete"
    thread_id: str | None = None
    pending_approval: Approval | None = None


class CycleStep(BaseModel):
    """One animated step of a cycle run: an edge lights up, a message is
    appended to the feed, and a trace is recorded."""
    model_config = ConfigDict(populate_by_name=True)
    edge: list[str]
    actor: AgentId
    message: str
    trace: Trace
    state_after: CyclePoint


CycleRunResponse.model_rebuild()
