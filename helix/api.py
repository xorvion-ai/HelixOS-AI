"""FastAPI application — the HelixOS backend API.

Serves the Command Center, org chart, observability, scenarios/simulation,
approvals, knowledge base and memory.

State is per-workspace behind a `Store`. In demo mode (no Supabase creds) every
request resolves to the single in-memory `"default"` workspace, so the wire
shapes and behavior match the design's `window.HELIX` contract exactly. With
Supabase configured, the bearer token is verified and each authenticated user
gets their own durable Postgres-backed workspace.
"""

from __future__ import annotations

from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from . import seed
from .auth import AuthUser, resolve_user
from .config import get_settings
from .llm import get_llm
from .models import (
    Agent,
    AgentMessage,
    Approval,
    ChatRequest,
    ChatResponse,
    CycleRunResponse,
    DashboardResponse,
    Document,
    Insight,
    KnowledgeCollection,
    KnowledgeDoc,
    Memory,
    ResolveApprovalRequest,
    ResumeCycleRequest,
    Scenario,
    StartSimulationRequest,
    Trace,
    UploadDocumentRequest,
)
from .simulation import Simulation, get_simulation
from .store import StaleWorkspaceError

settings = get_settings()

app = FastAPI(
    title="HelixOS AI",
    version="0.1.0",
    description="Autonomous multi-agent business operating system — backend API.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Workspace resolution (dependency) ----------------------------------

def current_user(authorization: str | None = Header(default=None)) -> AuthUser:
    """Resolve the request to its authenticated user (or the public demo user
    in demo mode). Raises 401 when a token is required but missing/invalid."""
    return resolve_user(authorization)


def current_sim(user: AuthUser = Depends(current_user)) -> Simulation:
    """Resolve the request to its workspace Simulation. Demo mode → the
    in-memory `"default"` workspace; with Supabase, the authenticated user's
    durable workspace. Admins (and the public demo) get the seeded CouponEx
    workspace; everyone else gets their own (empty → onboarding) workspace."""
    return get_simulation(user.id, seed_demo=user.is_admin)


@app.exception_handler(StaleWorkspaceError)
def _stale_handler(_request, _exc: StaleWorkspaceError):
    from fastapi.responses import JSONResponse

    return JSONResponse(
        status_code=409,
        content={"detail": "Workspace was modified concurrently; reload and retry."},
    )


# --- Health / meta ------------------------------------------------------

@app.get("/api/health")
def health() -> dict:
    return {
        "status": "ok",
        "app": settings.app_name,
        "environment": settings.environment,
        "capabilities": {
            "gemini": settings.gemini_enabled,
            "chroma": settings.chroma_enabled,
            "supabase": settings.supabase_enabled,
        },
        "mode": "demo" if not settings.gemini_enabled else "live",
    }


@app.get("/api/me")
def me(user: AuthUser = Depends(current_user), sim: Simulation = Depends(current_sim)) -> dict:
    """The signed-in user + their workspace status — powers the profile, the
    admin-nav gate, and the onboarding redirect."""
    return {
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "is_admin": user.is_admin,
        "is_default": user.is_default,
        "onboarded": sim.onboarded,
        "workspace": sim.scenario.name,
        "mode": "live" if settings.gemini_enabled else "demo",
    }


# --- Scenarios & simulation --------------------------------------------

@app.get("/api/scenarios", response_model=list[Scenario])
def list_scenarios(sim: Simulation = Depends(current_sim)) -> list[Scenario]:
    # Reflect which preset is currently active in the simulation.
    return [s.model_copy(update={"active": s.id == sim.scenario.id}) for s in seed.SCENARIOS]


@app.post("/api/simulation/start", response_model=DashboardResponse)
def start_simulation(
    req: StartSimulationRequest, sim: Simulation = Depends(current_sim)
) -> DashboardResponse:
    try:
        sim.load_scenario(req.scenario_id, req.custom_seed)
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
    return _dashboard(sim)


@app.get("/api/simulation/state")
def simulation_state(sim: Simulation = Depends(current_sim)) -> dict:
    return {
        "scenario": sim.scenario,
        "cycle": sim.cycle,
        "state": sim.state,
        "prev": sim.prev,
        "history": sim.history,
    }


@app.post("/api/cycle/run", response_model=CycleRunResponse)
def run_cycle(
    interactive: bool = False,
    sim: Simulation = Depends(current_sim),
    x_client_id: str | None = Header(default=None),
) -> CycleRunResponse:
    """Step the simulation forward one autonomous cycle.

    Default (`interactive=false`) runs to completion. With `interactive=true`,
    a live cycle pauses at a human-approval interrupt and returns
    `status="paused"` + a `thread_id`; resume it via `/api/cycle/resume`.

    `X-Client-Id` (the caller's browser session) is stamped on the emitted
    realtime events so the triggering tab ignores its own echo.
    """
    return sim.run_cycle(interactive=interactive, client_id=x_client_id)


@app.post("/api/cycle/resume", response_model=CycleRunResponse)
def resume_cycle(
    req: ResumeCycleRequest,
    sim: Simulation = Depends(current_sim),
    x_client_id: str | None = Header(default=None),
) -> CycleRunResponse:
    """Resume a live cycle paused at a human-approval interrupt."""
    resumed = sim.resume_cycle(req.thread_id, req.decision, client_id=x_client_id)
    if resumed is None:
        raise HTTPException(status_code=404, detail="No paused cycle for that thread")
    return resumed


# --- Dashboard (Command Center) ----------------------------------------

def _dashboard(sim: Simulation) -> DashboardResponse:
    return DashboardResponse(
        cycle=sim.cycle,
        scenario=sim.scenario,
        state=sim.state,
        prev=sim.prev,
        history=sim.history,
        insights=sim.insights or seed.INSIGHTS,
        approvals=sim.approvals,
        activity=seed.BASE_FEED,
        is_running=sim.is_running,
    )


@app.get("/api/dashboard", response_model=DashboardResponse)
def dashboard(sim: Simulation = Depends(current_sim)) -> DashboardResponse:
    return _dashboard(sim)


# --- Org chart ----------------------------------------------------------

@app.get("/api/orgchart")
def orgchart() -> dict:
    return {
        "nodes": [a.model_dump() for a in seed.AGENTS],
        "edges": [e.model_dump(by_alias=True) for e in seed.ORG_EDGES],
    }


# --- Agents -------------------------------------------------------------

@app.get("/api/agents", response_model=list[Agent])
def list_agents() -> list[Agent]:
    return seed.AGENTS


@app.get("/api/agents/activity", response_model=list[AgentMessage])
def agent_activity() -> list[AgentMessage]:
    return seed.BASE_FEED


@app.get("/api/agents/{agent_id}")
def get_agent(agent_id: str, sim: Simulation = Depends(current_sim)) -> dict:
    agent = seed.agent_by_id(agent_id)
    if agent is None:
        raise HTTPException(status_code=404, detail=f"Unknown agent: {agent_id}")
    traces = [t for t in sim.traces if t.agent == agent_id][:10]
    return {"agent": agent, "traces": traces}


# --- Observability ------------------------------------------------------

@app.get("/api/traces", response_model=list[Trace])
def list_traces(
    agent: str | None = None, cycle: int | None = None, sim: Simulation = Depends(current_sim)
) -> list[Trace]:
    traces = sim.traces
    if agent:
        traces = [t for t in traces if t.agent == agent]
    if cycle is not None:
        traces = [t for t in traces if t.cycle == cycle]
    return traces


# --- Approvals ----------------------------------------------------------

@app.get("/api/approvals", response_model=list[Approval])
def list_approvals(sim: Simulation = Depends(current_sim)) -> list[Approval]:
    return sim.approvals


@app.post("/api/approvals/{approval_id}", response_model=Approval)
def resolve_approval(
    approval_id: str, req: ResolveApprovalRequest, sim: Simulation = Depends(current_sim)
) -> Approval:
    ap = sim.resolve_approval(approval_id, req.decision)
    if ap is None:
        raise HTTPException(status_code=404, detail=f"Unknown approval: {approval_id}")
    return ap


# --- Knowledge base (RAG) ----------------------------------------------

@app.get("/api/knowledge", response_model=list[KnowledgeCollection])
def list_knowledge(sim: Simulation = Depends(current_sim)) -> list[KnowledgeCollection]:
    """Seed collections with any user-uploaded documents merged in (newest
    first), so an upload appears in its collection immediately."""
    cols = [c.model_copy(deep=True) for c in seed.KNOWLEDGE]
    by_name = {c.collection: c for c in cols}
    for d in sim.documents:
        kd = KnowledgeDoc(name=d.name, chunks=d.chunks, size=d.size, updated=d.updated)
        target = by_name.get(d.collection)
        if target is None:
            target = KnowledgeCollection(collection=d.collection, color="accent", docs=[])
            by_name[d.collection] = target
            cols.append(target)
        target.docs.insert(0, kd)
    return cols


@app.get("/api/documents", response_model=list[Document])
def list_documents(sim: Simulation = Depends(current_sim)) -> list[Document]:
    return sim.documents


@app.post("/api/documents", response_model=Document)
def upload_document(req: UploadDocumentRequest, sim: Simulation = Depends(current_sim)) -> Document:
    """Ingest a document into the knowledge base. Demo/free mode mock-chunks it;
    real vector ingest (Chroma / pgvector) plugs into `Simulation.add_document`."""
    return sim.add_document(req.name, req.collection, req.content)


# --- Agent chat ---------------------------------------------------------

def _agent_chat(agent: Agent, message: str, sim: Simulation) -> str:
    """One-shot reply from an agent's persona, grounded in live business state.
    Live mode (Gemini) fills the reply; demo mode returns the templated fallback
    — a single code path via `LLM.plan`."""
    s = sim.state
    recent = next((t for t in sim.traces if t.agent == agent.id), None)
    ctx = (f"Current business state — users {s.users:,}, MRR ${s.mrr:,}, "
           f"churn {s.churn * 100:.1f}%, CAC ${s.cac}, cycle {sim.cycle}.")
    recent_line = (f"My most recent action: {recent.task} → {recent.result}."
                   if recent else "No actions logged yet this run.")
    msg = message.strip()
    demo_reply = (
        f"As the {agent.role}, here's my read. {ctx} {recent_line} "
        f"On “{msg}” — I'd lean on {', '.join(agent.tools[:3])} to move the needle. "
        f"Kick off a cycle and I'll put it into action."
    )
    system = (
        f"You are {agent.name}, the {agent.role} agent inside HelixOS, an autonomous multi-agent "
        f"business operating system. {agent.blurb} Your tools: {', '.join(agent.tools)}. "
        f"Answer the operator concisely (2–4 sentences), grounded in the current business state. "
        f"Never invent metrics beyond those provided."
    )
    prompt = f"{ctx}\n{recent_line}\n\nOperator asks: {msg}"
    out = get_llm().plan(
        model=settings.gemini_model_flash, system=system, prompt=prompt,
        fallback={"reply": demo_reply},
    )
    return out.get("reply", demo_reply).strip() or demo_reply


@app.post("/api/agents/{agent_id}/chat", response_model=ChatResponse)
def chat_agent(agent_id: str, req: ChatRequest, sim: Simulation = Depends(current_sim)) -> ChatResponse:
    agent = seed.agent_by_id(agent_id)
    if agent is None:
        raise HTTPException(status_code=404, detail=f"Unknown agent: {agent_id}")
    reply = _agent_chat(agent, req.message, sim)
    return ChatResponse(agent=agent_id, reply=reply, mode="live" if settings.gemini_enabled else "demo")


# --- Memory -------------------------------------------------------------

@app.get("/api/memory", response_model=list[Memory])
def list_memory(sim: Simulation = Depends(current_sim)) -> list[Memory]:
    return sim.memory


# --- Insights -----------------------------------------------------------

@app.get("/api/insights", response_model=list[Insight])
def list_insights(sim: Simulation = Depends(current_sim)) -> list[Insight]:
    return sim.insights or seed.INSIGHTS


# --- Admin console (owner-scoped) --------------------------------------

@app.get("/api/admin/usage")
def admin_usage(
    user: AuthUser = Depends(current_user), sim: Simulation = Depends(current_sim)
) -> dict:
    """Real usage aggregates for the owner's workspace: cycles run, estimated
    Gemini tokens + run time (summed from observability traces), per-agent
    breakdown, and the live capability flags. Powers the Admin Console.
    Owner-only: 403 for non-admin users."""
    if not user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    traces = sim.traces
    tokens = sum(t.tokens for t in traces)
    duration_ms = sum(t.dur for t in traces)

    by_agent: dict[str, dict] = {}
    for t in traces:
        b = by_agent.setdefault(t.agent, {"agent": t.agent, "traces": 0, "tokens": 0})
        b["traces"] += 1
        b["tokens"] += t.tokens

    return {
        "cycles": sim.cycle,
        "traces": len(traces),
        "tokens": tokens,
        "duration_ms": duration_ms,
        "memory": len(sim.memory),
        "insights": len(sim.insights),
        "approvals_pending": len([a for a in sim.approvals if a.status == "pending"]),
        "agents": len(seed.AGENTS),
        "by_agent": sorted(by_agent.values(), key=lambda x: x["tokens"], reverse=True),
        "capabilities": {
            "gemini": settings.gemini_enabled,
            "chroma": settings.chroma_enabled,
            "supabase": settings.supabase_enabled,
        },
        "mode": "live" if settings.gemini_enabled else "demo",
    }


# Local dev entrypoint: `python -m helix.api` or `uvicorn helix.api:app --reload`
if __name__ == "__main__":
    import uvicorn

    uvicorn.run("helix.api:app", host="127.0.0.1", port=8000, reload=True)
