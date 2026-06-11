"""LangGraph orchestration — the live multi-agent cycle.

Replaces the demo's scripted cycle with a real graph: Operations supervises a
sequence of agent nodes, each of which builds its prompt from business state +
recalled memory + RAG context, calls Gemini with its own tools (real
tool-calling), mutates `business_state`, and emits an observability step
(edge + feed message + trace). Marketing's campaign spend is gated by a human
approval `interrupt()` (interactive mode) or an Operations guardrail policy
(autonomous mode). The Founder's evaluate node writes the cycle's learning.

Topology (linear; Operations is the supervisor between Founder and the workers):

    START → founder_plan → operations → research → marketing
          → sales → finance → support → analytics → founder_eval → END

Each emitting node appends one step to `state["steps"]`; the runner (`live.py`)
turns those into the `CycleRunResponse` the frontend already consumes. Every LLM
/ tool failure degrades to the demo-quality scripted fallback so a cycle never
breaks mid-demo.
"""

from __future__ import annotations

import operator
import time
from typing import Annotated, Any, TypedDict

from langgraph.graph import END, START, StateGraph
from langgraph.types import interrupt

from . import seed
from .config import get_settings
from .llm import LLM, AgentTurn
from .memory_store import MemoryStore
from .models import Memory
from .rag import KnowledgeIndex
from .tools import ToolContext, apply_campaign, build_tools


# --- graph state --------------------------------------------------------

class HelixState(TypedDict, total=False):
    cycle: int
    interactive: bool
    prev: dict[str, Any]
    business: dict[str, Any]
    goal: str
    route: list[str]
    steps: Annotated[list[dict], operator.add]
    events: Annotated[list[str], operator.add]
    insights: Annotated[list[dict], operator.add]
    approvals: Annotated[list[dict], operator.add]
    citations: Annotated[list[str], operator.add]
    recalled: Annotated[list[str], operator.add]
    campaign: dict[str, Any] | None
    learning: dict[str, Any] | None


# --- fallback content (demo-quality, indexed from the cycle script) -----
# Keyed by node name → the scripted decision/reasoning/result/tools/cost so a
# live run with no/failed LLM still reads like the demo.
def _fb(agent: str, task: str, decision: str, reasoning: str, result: str,
        tools: list[str], dur: int, tokens: int) -> dict:
    return {"agent": agent, "task": task, "decision": decision, "reasoning": reasoning,
            "result": result, "tools": tools, "dur": dur, "tokens": tokens}


FALLBACK = {
    "founder_plan": _fb(
        "founder", "Plan cycle goals",
        "Prioritize short-form acquisition over paid search",
        "Recalled memory: short-form content drove +25% CTR last campaign. CAC trending down; double-down.",
        "1 goal · 6 tasks assigned", ["recall_memory", "query_knowledge", "set_goal", "assign_task"], 2100, 1180),
    "operations": _fb(
        "operations", "Route the task graph",
        "Run the standard growth loop; parallelize where safe",
        "No shared dependencies between research, marketing and sales; gate any spend over $1k.",
        "6 tasks routed", ["route_to_agent", "update_task_status"], 900, 520),
    "research": _fb(
        "research", "Scan market & competitors",
        "Flag competitor promo as a churn risk + an opportunity",
        "RSS + web_search show a rival 15% price cut and rising 'cashback app' search volume.",
        "1 risk · 1 opportunity", ["web_search", "rss_reader", "competitor_analyzer"], 2700, 1120),
    "marketing": _fb(
        "marketing", "Generate acquisition campaign",
        "Short-form video, audience 18–25, gate spend on approval",
        "Pulled marketing_guidelines via RAG: core audience skews 18–25; spend > $1k → request_approval.",
        "Campaign drafted · est. +5% users · $1.2k", ["query_knowledge", "create_campaign"], 3200, 1240),
    "sales": _fb(
        "sales", "Qualify leads & draft outreach",
        "Prioritize 12 high-intent leads from the campaign",
        "web_search + scoring against ICP; campaign traffic produced strong inbound.",
        "38 leads · 12 qualified", ["web_search", "qualify_lead", "draft_outreach", "crm_upsert"], 2400, 980),
    "finance": _fb(
        "finance", "Record txns & forecast",
        "Reinvest efficiency gains; runway healthy",
        "Campaign + tooling spend recorded; ARPU steady so revenue tracks user growth.",
        "P&L updated · runway +1mo", ["record_txn", "build_pnl", "forecast_cashflow"], 2000, 870),
    "support": _fb(
        "support", "Resolve tickets & retention",
        "Trigger day-21 win-back to blunt competitor churn",
        "Recalled memory: win-back emails at day 21 recover ~3% of churned users.",
        "26 resolved · CSAT 94%", ["answer_ticket", "escalate", "send_email"], 1900, 760),
    "analytics": _fb(
        "analytics", "Aggregate KPIs & insights",
        "Flag CAC improvement as the cycle's headline",
        "User growth from Marketing + Sales lifts MRR; Support held churn despite the competitor promo.",
        "5 KPIs updated · 3 insights", ["query_db", "aggregate_kpis", "generate_insight"], 2600, 1010),
    "founder_eval": _fb(
        "founder", "Evaluate & learn",
        "Goal met — store learning, plan next cycle",
        "Short-form again outperformed. Reinforce strategy; raise next goal to +9% MRR.",
        "1 learning written · next goal raised", ["generate_insight", "write_memory"], 1500, 640),
}

MESSAGES = {
    "founder_plan": "Set Q3 goal: grow MRR 8% while holding CAC under $105.",
    "operations": "Operations: routed the cycle across the org; spend over $1k gated.",
    "research": "Research → Operations: competitor cut price 15%, demand for cashback rising.",
    "marketing": "Marketing → Operations: drafted 'Summer Cashback' short-form campaign.",
    "sales": "Sales → Operations: qualified 38 inbound leads, drafted outreach.",
    "finance": "Finance → Operations: recorded spend, updated forecast.",
    "support": "Support → Operations: resolved 26 tickets, ran a win-back on at-risk users.",
    "analytics": "Analytics → Operations: KPI snapshot ready — MRR +8.7%, CAC −$5.",
    "founder_eval": "Report → Founder: goal met across all eight agents. Learning stored.",
}

EDGES = {
    "founder_plan": ["founder", "operations"],
    "operations": ["founder", "operations"],
    "research": ["operations", "research"],
    "marketing": ["operations", "marketing"],
    "sales": ["operations", "sales"],
    "finance": ["operations", "finance"],
    "support": ["operations", "support"],
    "analytics": ["operations", "analytics"],
    "founder_eval": ["analytics", "founder"],
}

SYSTEM = {
    "founder": "You are the Founder/CEO agent of HelixOS running the business CouponEx. "
               "Recall prior learnings and read the strategy docs, then set one clear cycle goal "
               "and assign work. Be decisive and concrete.",
    "operations": "You are the Operations supervisor. Route work to the worker agents and gate any "
                  "spend over $1,000 for approval. Keep the cycle moving.",
    "marketing": "You are the Marketing agent. ALWAYS pull marketing_guidelines via query_knowledge "
                 "before creating a campaign, then create one targeted at the core audience. Any spend "
                 "over $1,000 must go through approval.",
    "sales": "You are the Sales agent. Find and qualify inbound leads against the ICP and upsert the "
             "best ones. No LinkedIn scraping — use web search and the CRM.",
    "research": "You are the Research agent. Scan competitors and trends, and flag market events the "
                "org should react to.",
    "finance": "You are the Finance agent. Record the cycle's transactions, update the P&L and forecast "
               "cashflow/runway.",
    "support": "You are the Support agent. Resolve tickets and run a retention win-back to protect churn.",
    "analytics": "You are the Analytics agent. Query the business state, aggregate KPIs and surface the "
                 "cycle's headline insights.",
}

PROMPT_HINT = ("Respond after using your tools with three lines:\n"
               "Decision: <one line>\nReason: <one line, cite any guidelines/memory used>\n"
               "Result: <one line summary>")


# --- the graph ----------------------------------------------------------

class HelixGraph:
    """Builds and runs the live cycle graph. Services (LLM, RAG, memory) are
    process-level; per-run data (current memories) is passed via config so it
    isn't checkpointed."""

    def __init__(self, llm: LLM, rag: KnowledgeIndex, memory_store: MemoryStore) -> None:
        self._llm = llm
        self._rag = rag
        self._mem = memory_store
        s = get_settings()
        self._pro = s.gemini_model_pro
        self._flash = s.gemini_model_flash
        self._graph = self._build()

    # -- node helpers ---------------------------------------------------

    def _ctx(self, state: HelixState, config) -> ToolContext:
        memories = (config or {}).get("configurable", {}).get("memories", [])
        return ToolContext(
            state=dict(state["business"]), cycle=state["cycle"], prev=dict(state["prev"]),
            rag=self._rag, memory_store=self._mem, memories=memories, goal=state.get("goal", ""),
        )

    def _run(self, node: str, agent: str, model: str, state: HelixState, ctx: ToolContext,
             prompt_extra: str = "") -> tuple[AgentTurn, dict]:
        """Common path: build tools, call the LLM (with demo fallback), and
        assemble the trace dict."""
        fb_raw = FALLBACK[node]
        fallback = AgentTurn(
            text=fb_raw["result"], decision=fb_raw["decision"], reasoning=fb_raw["reasoning"],
            tools_used=fb_raw["tools"], calls=[], tokens=fb_raw["tokens"],
        )
        tools = build_tools(agent, ctx)
        prompt = (
            f"Business state (cycle {state['cycle']}): users {ctx.state['users']:,}, MRR ${ctx.state['mrr']:,}, "
            f"churn {ctx.state['churn'] * 100:.1f}%, CAC ${ctx.state['cac']}, budget ${ctx.state['budget']:,}.\n"
            f"Cycle goal: {state.get('goal') or 'set the goal'}.\n{prompt_extra}\n{PROMPT_HINT}"
        )
        t0 = time.time()
        turn = self._llm.run_agent(model=model, system=SYSTEM[agent], prompt=prompt,
                                   tools=tools, fallback=fallback)
        dur = int((time.time() - t0) * 1000)
        trace = {
            "agent": agent, "task": fb_raw["task"],
            "decision": turn.decision or fb_raw["decision"],
            "reasoning": turn.reasoning or fb_raw["reasoning"],
            "tools": turn.tools_used or fb_raw["tools"],
            "result": turn.text or fb_raw["result"],
            "dur": dur if (self._llm.enabled and dur > 0) else fb_raw["dur"],
            "tokens": turn.tokens or fb_raw["tokens"],
            "status": "warn" if ctx.events else "ok",
        }
        return turn, trace

    def _state_after(self, state: HelixState, ctx: ToolContext) -> dict:
        out = dict(ctx.state)
        out["cycle"] = state["cycle"]
        return out

    def _step(self, node: str, trace: dict, ctx: ToolContext, state: HelixState,
              message: str | None = None) -> dict:
        return {
            "edge": EDGES[node], "actor": trace["agent"],
            "message": message or MESSAGES[node],
            "trace": trace, "state_after": self._state_after(state, ctx),
        }

    # -- nodes ----------------------------------------------------------

    def _founder_plan(self, state: HelixState, config) -> dict:
        ctx = self._ctx(state, config)
        turn, trace = self._run("founder_plan", "founder", self._pro, state, ctx,
                                 prompt_extra="Recall prior learnings and read the Q3 growth plan first.")
        goal = ctx.goal or "Grow MRR ~8% while holding CAC under $105"
        return {"goal": goal, "steps": [self._step("founder_plan", trace, ctx, state)],
                "citations": ctx.citations, "recalled": ctx.recalled}

    def _operations(self, state: HelixState, config) -> dict:
        ctx = self._ctx(state, config)
        turn, trace = self._run("operations", "operations", self._pro, state, ctx,
                                 prompt_extra="Decide the order of work and what must be gated for approval.")
        route = ["research", "marketing", "sales", "finance", "support", "analytics"]
        return {"route": route, "steps": [self._step("operations", trace, ctx, state)]}

    def _research(self, state: HelixState, config) -> dict:
        ctx = self._ctx(state, config)
        turn, trace = self._run("research", "research", self._flash, state, ctx)
        return {"steps": [self._step("research", trace, ctx, state)],
                "business": self._state_after(state, ctx),
                "events": ctx.events, "insights": ctx.insights}

    def _marketing(self, state: HelixState, config) -> dict:
        ctx = self._ctx(state, config)
        turn, trace = self._run("marketing", "marketing", self._flash, state, ctx,
                                 prompt_extra="Pull marketing_guidelines, then create one short-form campaign.")
        campaign = ctx.campaign or {"spend": 1200, "channel": "Instagram + TikTok short-form", "audience": "18–25"}
        spend = int(campaign.get("spend", 1200))

        # --- approval gate (Operations' responsibility) ---------------
        # Interactive mode: pause for a human via interrupt() and honour the
        # verdict. Autonomous mode (default): proceed with the spend but log a
        # *pending* approval for human review afterwards (demo semantics).
        needs_approval = spend > 1000
        if needs_approval and state.get("interactive"):
            verdict = interrupt({
                "type": "approval",
                "approval": ctx.approvals[-1] if ctx.approvals else {
                    "agent": "marketing", "action": "Send campaign", "risk": "medium",
                    "title": "Launch paid campaign", "summary": f"Spend ${spend}.", "payload": dict(campaign),
                },
            })
            approved = verdict == "approved"
            ap_status = "approved" if approved else "rejected"
        else:
            approved = True
            ap_status = "pending" if needs_approval else None

        if approved:
            apply_note = apply_campaign(ctx)
            trace["result"] = f"{trace['result']} · {apply_note}"
        else:
            trace["result"] = f"{trace['result']} · campaign held (spend rejected)"
            trace["status"] = "warn"

        approvals_out = [{**a, "status": ap_status} for a in ctx.approvals] if ap_status else []

        return {"steps": [self._step("marketing", trace, ctx, state)],
                "business": self._state_after(state, ctx),
                "approvals": approvals_out, "campaign": campaign,
                "citations": ctx.citations}

    def _worker(self, node: str, agent: str):
        def fn(state: HelixState, config) -> dict:
            ctx = self._ctx(state, config)
            turn, trace = self._run(node, agent, self._flash, state, ctx)
            out = {"steps": [self._step(node, trace, ctx, state)],
                   "business": self._state_after(state, ctx)}
            if ctx.insights:
                out["insights"] = ctx.insights
            return out
        return fn

    def _founder_eval(self, state: HelixState, config) -> dict:
        ctx = self._ctx(state, config)
        turn, trace = self._run("founder_eval", "founder", self._pro, state, ctx,
                                 prompt_extra="Evaluate the cycle vs the goal and record one learning.")
        prev, cur = state["prev"], ctx.state
        d_mrr = (cur["mrr"] - prev["mrr"]) / prev["mrr"] if prev.get("mrr") else 0
        learning = {
            "cycle": state["cycle"], "agent": "founder",
            "result": f"Cycle {state['cycle']}: MRR {'+' if d_mrr >= 0 else ''}{d_mrr * 100:.1f}%, "
                      f"CAC ${cur['cac']}, churn {cur['churn'] * 100:.1f}%",
            "lesson": "Short-form acquisition + day-21 win-back continues to lift growth while holding "
                      "CAC down. Reinforce next cycle.",
            "confidence": "high" if d_mrr > 0 else "medium",
        }
        return {"steps": [self._step("founder_eval", trace, ctx, state)], "learning": learning}

    # -- build ----------------------------------------------------------

    def _build(self):
        g = StateGraph(HelixState)
        g.add_node("founder_plan", self._founder_plan)
        g.add_node("operations", self._operations)
        g.add_node("research", self._research)
        g.add_node("marketing", self._marketing)
        g.add_node("sales", self._worker("sales", "sales"))
        g.add_node("finance", self._worker("finance", "finance"))
        g.add_node("support", self._worker("support", "support"))
        g.add_node("analytics", self._worker("analytics", "analytics"))
        g.add_node("founder_eval", self._founder_eval)

        order = ["founder_plan", "operations", "research", "marketing",
                 "sales", "finance", "support", "analytics", "founder_eval"]
        g.add_edge(START, order[0])
        for a, b in zip(order, order[1:]):
            g.add_edge(a, b)
        g.add_edge(order[-1], END)

        from .checkpointer import get_checkpointer

        return g.compile(checkpointer=get_checkpointer())

    @property
    def compiled(self):
        return self._graph
