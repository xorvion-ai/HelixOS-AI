"""Agent tools — the real, typed actions each agent can take.

Every tool reads and/or writes the shared `business_state` (via `ToolContext`)
so live-mode decisions move the *same* KPIs the demo's scripted cycle does —
keeping both modes consistent (the explicit requirement in STATUS §9.2). The
cause→effect deltas mirror the demo's `seed._apply_*` functions:

    marketing.create_campaign  → users +5%, budget −spend, cac −$3  (gated >$1k)
    sales.crm_upsert           → users +2%
    finance.record_txn         → cac −$2
    support.send_email         → churn −0.3pp  (day-21 win-back)
    analytics.aggregate_kpis   → mrr +8.7%

Tools are exposed to Gemini as function declarations (`ToolSpec`). The model
chooses which to call with what args; we execute them and feed results back.
`demo_args` provide deterministic defaults for the offline/fallback path and
backfill any args the model omits. Each tool returns a short human-readable
result string that becomes part of the observability trace.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from .llm import ToolSpec
from .memory_store import MemoryStore
from .models import Memory
from .rag import KnowledgeIndex


# --- shared context -----------------------------------------------------

@dataclass
class ToolContext:
    """Mutable scratchpad for one agent invocation. `state` is the working
    business-state dict the tools mutate; the rest accumulate side outputs the
    node turns into traces, the activity feed, approvals and insights."""
    state: dict[str, Any]
    cycle: int
    prev: dict[str, Any]
    rag: KnowledgeIndex
    memory_store: MemoryStore
    memories: list[Memory]
    goal: str = ""
    citations: list[str] = field(default_factory=list)
    recalled: list[str] = field(default_factory=list)
    events: list[str] = field(default_factory=list)
    insights: list[dict] = field(default_factory=list)
    approvals: list[dict] = field(default_factory=list)
    tasks: list[dict] = field(default_factory=list)
    campaign: dict[str, Any] | None = None


# --- state mutation helpers (clamped, typed to match CyclePoint) --------

def _grow_users(state: dict, pct: float) -> int:
    state["users"] = round(state["users"] * (1 + pct))
    return state["users"]


def _spend_budget(state: dict, amount: int) -> int:
    state["budget"] = max(0, state["budget"] - int(amount))
    return state["budget"]


def _shift_cac(state: dict, delta: int) -> int:
    state["cac"] = max(1, state["cac"] + int(delta))
    return state["cac"]


def _shift_churn(state: dict, delta: float) -> float:
    state["churn"] = max(0.0, round(state["churn"] + delta, 3))
    return state["churn"]


def _grow_mrr(state: dict, pct: float) -> int:
    state["mrr"] = round(state["mrr"] * (1 + pct))
    return state["mrr"]


# --- campaign application (gated by approval) ---------------------------

def apply_campaign(ctx: ToolContext) -> str:
    """Apply the drafted campaign's effect to business_state. Called by the
    marketing node only after the spend is approved (autonomous guardrail or
    human resume). Mirrors `seed._apply_marketing`."""
    c = ctx.campaign or {"spend": 1200}
    _grow_users(ctx.state, 0.05)
    _spend_budget(ctx.state, int(c.get("spend", 1200)))
    _shift_cac(ctx.state, -3)
    return f"Launched: users +5%, budget −${int(c.get('spend', 1200))}, CAC −$3"


# --- per-agent tool builders --------------------------------------------
# Each returns the ToolSpec list bound to `ctx`. `parameters` follows a minimal
# JSON-schema shape the LLM layer maps to a google-genai Schema.

def _founder_tools(ctx: ToolContext) -> list[ToolSpec]:
    def recall_memory(args):
        hits = ctx.memory_store.recall(ctx.memories, args.get("context", ""), k=3)
        ctx.recalled = [h.lesson for h in hits]
        return "; ".join(ctx.recalled) or "no prior learnings"

    def query_knowledge(args):
        hits = ctx.rag.query(args.get("query", ""), args.get("collection"), k=2)
        ctx.citations += [h.cite() for h in hits]
        return " | ".join(h.text for h in hits) or "no matching docs"

    def set_goal(args):
        ctx.goal = args.get("goal", "").strip() or ctx.goal
        return f"goal set: {ctx.goal}"

    def assign_task(args):
        ctx.tasks.append({"agent": args.get("agent", "operations"), "title": args.get("title", "")})
        return f"assigned to {args.get('agent', 'operations')}: {args.get('title', '')}"

    return [
        ToolSpec("recall_memory", "Recall relevant past learnings before planning.",
                 {"type": "object", "properties": {"context": {"type": "string", "description": "what to recall about"}}},
                 recall_memory, {"context": "growth strategy, CAC and churn"}),
        ToolSpec("query_knowledge", "Retrieve company strategy documents (RAG).",
                 {"type": "object", "properties": {"query": {"type": "string"}, "collection": {"type": "string"}}},
                 query_knowledge, {"query": "quarterly growth plan and CAC target", "collection": "strategy_docs"}),
        ToolSpec("set_goal", "Set this cycle's strategic goal.",
                 {"type": "object", "properties": {"goal": {"type": "string"}}, "required": ["goal"]},
                 set_goal, {"goal": "Grow MRR ~8% while holding CAC under $105"}),
        ToolSpec("assign_task", "Assign a task to an agent.",
                 {"type": "object", "properties": {"agent": {"type": "string"}, "title": {"type": "string"}}},
                 assign_task, {"agent": "operations", "title": "Run the growth loop across all agents"}),
    ]


def _operations_tools(ctx: ToolContext) -> list[ToolSpec]:
    def route_to_agent(args):
        return f"routed to {args.get('agent', 'workers')}: {args.get('reason', '')}"

    def update_task_status(args):
        return f"{args.get('task', 'cycle')} → {args.get('status', 'running')}"

    return [
        ToolSpec("route_to_agent", "Route work to a worker agent.",
                 {"type": "object", "properties": {"agent": {"type": "string"}, "reason": {"type": "string"}}},
                 route_to_agent, {"agent": "all workers", "reason": "execute the cycle plan"}),
        ToolSpec("update_task_status", "Update a task's status.",
                 {"type": "object", "properties": {"task": {"type": "string"}, "status": {"type": "string"}}},
                 update_task_status, {"task": "cycle plan", "status": "running"}),
    ]


def _marketing_tools(ctx: ToolContext) -> list[ToolSpec]:
    def query_knowledge(args):
        hits = ctx.rag.query(args.get("query", ""), args.get("collection", "marketing_guidelines"), k=2)
        ctx.citations += [h.cite() for h in hits]
        return " | ".join(h.text for h in hits) or "no matching docs"

    def create_campaign(args):
        spend = int(args.get("spend", 1200))
        ctx.campaign = {
            "channel": args.get("channel", "Instagram + TikTok short-form"),
            "spend": spend,
            "audience": args.get("audience", "18–25"),
            "creative": "3 short-form videos",
            "duration": "14 days",
        }
        if spend > 1000:  # Channel Playbook: spend >$1k must be approved
            ctx.approvals.append({
                "agent": "marketing", "action": "Send campaign", "risk": "medium",
                "title": f"Launch '{ctx.campaign['channel']}' paid campaign",
                "summary": f"Spend ${spend} on {ctx.campaign['channel']}, audience {ctx.campaign['audience']}. "
                           f"Est. +5% users, CAC −$3.",
                "payload": dict(ctx.campaign),
            })
            return f"campaign drafted (${spend}) — spend >$1k, approval requested"
        return f"campaign drafted (${spend}) — within auto-approve threshold"

    def write_blog(args):
        return f"SEO blog drafted: '{args.get('topic', 'Best cashback apps 2026')}'"

    def analyze_content(args):
        return f"analyzed {args.get('subject', 'recent creative')}: short-form over-indexes for 18–25"

    return [
        ToolSpec("query_knowledge", "Retrieve marketing guidelines (RAG) before creating content.",
                 {"type": "object", "properties": {"query": {"type": "string"}, "collection": {"type": "string"}}},
                 query_knowledge, {"query": "audience persona and channel playbook", "collection": "marketing_guidelines"}),
        ToolSpec("create_campaign", "Draft an acquisition campaign (spend in USD). >$1k requires approval.",
                 {"type": "object", "properties": {"channel": {"type": "string"}, "spend": {"type": "integer"}, "audience": {"type": "string"}}},
                 create_campaign, {"channel": "Instagram + TikTok short-form", "spend": 1200, "audience": "18–25"}),
        ToolSpec("write_blog", "Write an SEO blog post.",
                 {"type": "object", "properties": {"topic": {"type": "string"}}},
                 write_blog, {"topic": "Best cashback apps 2026"}),
        ToolSpec("analyze_content", "Analyze past content performance.",
                 {"type": "object", "properties": {"subject": {"type": "string"}}},
                 analyze_content, {"subject": "last campaign creative"}),
    ]


def _sales_tools(ctx: ToolContext) -> list[ToolSpec]:
    def web_search(args):
        return f"web search '{args.get('query', 'cashback buyers')}': strong inbound from the campaign"

    def qualify_lead(args):
        return f"qualified {args.get('count', 38)} inbound leads against ICP"

    def draft_outreach(args):
        return f"drafted outreach for {args.get('segment', 'high-intent')} segment"

    def crm_upsert(args):
        users = _grow_users(ctx.state, 0.02)
        return f"upserted {args.get('count', 12)} qualified leads → users {users:,}"

    return [
        ToolSpec("web_search", "Search the web for prospects/intent (no LinkedIn scraping).",
                 {"type": "object", "properties": {"query": {"type": "string"}}},
                 web_search, {"query": "people looking for cashback apps"}),
        ToolSpec("qualify_lead", "Score inbound leads against the ICP.",
                 {"type": "object", "properties": {"count": {"type": "integer"}}},
                 qualify_lead, {"count": 38}),
        ToolSpec("draft_outreach", "Draft outreach for a segment.",
                 {"type": "object", "properties": {"segment": {"type": "string"}}},
                 draft_outreach, {"segment": "high-intent"}),
        ToolSpec("crm_upsert", "Upsert qualified leads into the CRM (converts to users).",
                 {"type": "object", "properties": {"count": {"type": "integer"}}},
                 crm_upsert, {"count": 12}),
    ]


def _research_tools(ctx: ToolContext) -> list[ToolSpec]:
    def web_search(args):
        return f"web search '{args.get('query', 'competitor pricing')}': rising 'cashback app' search volume"

    def rss_reader(args):
        return "RSS: industry chatter about a rival promotion"

    def competitor_analyzer(args):
        event = "Competitor cut price 15% — churn risk for the price-sensitive cohort"
        ctx.events.append(event)
        ctx.insights.append({"kind": "watch", "text": event + "; demand for cashback rising (opportunity)."})
        return event

    return [
        ToolSpec("web_search", "Search the web for market/competitor signals.",
                 {"type": "object", "properties": {"query": {"type": "string"}}},
                 web_search, {"query": "competitor cashback pricing changes"}),
        ToolSpec("rss_reader", "Read industry RSS feeds.",
                 {"type": "object", "properties": {"feed": {"type": "string"}}},
                 rss_reader, {"feed": "industry"}),
        ToolSpec("competitor_analyzer", "Analyze competitors; may inject a market event.",
                 {"type": "object", "properties": {"competitor": {"type": "string"}}},
                 competitor_analyzer, {"competitor": "nearest rival"}),
    ]


def _finance_tools(ctx: ToolContext) -> list[ToolSpec]:
    def record_txn(args):
        cac = _shift_cac(ctx.state, -2)  # efficiency gains lower blended CAC
        return f"recorded {args.get('kind', 'spend')} ${args.get('amount', 1200)} → CAC ${cac}"

    def build_pnl(args):
        return "P&L updated: ARPU steady, revenue tracks user growth"

    def forecast_cashflow(args):
        return "forecast updated: runway +1mo, healthy"

    def import_csv(args):
        return f"imported {args.get('file', 'transactions.csv')}"

    return [
        ToolSpec("record_txn", "Record a transaction (lowers blended CAC via efficiency).",
                 {"type": "object", "properties": {"kind": {"type": "string"}, "amount": {"type": "integer"}}},
                 record_txn, {"kind": "marketing spend", "amount": 1200}),
        ToolSpec("build_pnl", "Build the profit & loss statement.",
                 {"type": "object", "properties": {}}, build_pnl, {}),
        ToolSpec("forecast_cashflow", "Forecast cashflow & runway.",
                 {"type": "object", "properties": {}}, forecast_cashflow, {}),
        ToolSpec("import_csv", "Import a transactions CSV.",
                 {"type": "object", "properties": {"file": {"type": "string"}}},
                 import_csv, {"file": "transactions.csv"}),
    ]


def _support_tools(ctx: ToolContext) -> list[ToolSpec]:
    def answer_ticket(args):
        return f"resolved {args.get('count', 26)} tickets · CSAT 94%"

    def escalate(args):
        return f"escalated {args.get('count', 2)} edge cases"

    def send_email(args):
        churn = _shift_churn(ctx.state, -0.003)  # day-21 win-back recovers ~3%
        return f"sent {args.get('campaign', 'day-21 win-back')} → churn {churn * 100:.1f}%"

    return [
        ToolSpec("answer_ticket", "Answer and resolve support tickets.",
                 {"type": "object", "properties": {"count": {"type": "integer"}}},
                 answer_ticket, {"count": 26}),
        ToolSpec("escalate", "Escalate edge-case tickets.",
                 {"type": "object", "properties": {"count": {"type": "integer"}}},
                 escalate, {"count": 2}),
        ToolSpec("send_email", "Send a retention/win-back email (lowers churn).",
                 {"type": "object", "properties": {"campaign": {"type": "string"}}},
                 send_email, {"campaign": "day-21 win-back"}),
    ]


def _analytics_tools(ctx: ToolContext) -> list[ToolSpec]:
    def query_db(args):
        return "queried business_state: users, mrr, churn, cac"

    def aggregate_kpis(args):
        mrr = _grow_mrr(ctx.state, 0.087)  # user growth + retention lift MRR
        return f"KPIs aggregated → MRR ${mrr:,}"

    def generate_insight(args):
        ins = {"kind": args.get("kind", "win"), "text": args.get("text", "")}
        if not ins["text"]:
            d_cac = ctx.prev["cac"] - ctx.state["cac"]
            ins["text"] = f"CAC fell ${d_cac} to ${ctx.state['cac']} — under the $105 ceiling."
        ctx.insights.append(ins)
        return f"insight ({ins['kind']}): {ins['text']}"

    return [
        ToolSpec("query_db", "Query the current business state.",
                 {"type": "object", "properties": {"metric": {"type": "string"}}},
                 query_db, {"metric": "all"}),
        ToolSpec("aggregate_kpis", "Aggregate KPIs (rolls up MRR from the cycle's activity).",
                 {"type": "object", "properties": {}}, aggregate_kpis, {}),
        ToolSpec("generate_insight", "Surface an insight (kind: win/watch/risk).",
                 {"type": "object", "properties": {"kind": {"type": "string"}, "text": {"type": "string"}}},
                 generate_insight, {"kind": "win", "text": ""}),
    ]


_BUILDERS = {
    "founder": _founder_tools,
    "operations": _operations_tools,
    "marketing": _marketing_tools,
    "sales": _sales_tools,
    "research": _research_tools,
    "finance": _finance_tools,
    "support": _support_tools,
    "analytics": _analytics_tools,
}


def build_tools(agent_id: str, ctx: ToolContext) -> list[ToolSpec]:
    return _BUILDERS[agent_id](ctx)
