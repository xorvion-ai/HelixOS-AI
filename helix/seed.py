"""Seed data — Python port of the design's `data.jsx` (`window.HELIX`).

This is the single source of truth for the demo/free phase: the CouponEx SaaS
scenario plus presets, the eight agents, org edges, the cycle script (with
cause->effect state mutations), past traces, memory, knowledge base, tasks,
approvals and insights. The simulation engine and API read from here until
Supabase persistence is wired in.
"""

from __future__ import annotations

from typing import Callable

from .models import (
    Agent,
    AgentMessage,
    Approval,
    CyclePoint,
    Insight,
    KnowledgeCollection,
    KnowledgeDoc,
    Memory,
    OrgEdge,
    Scenario,
    Trace,
)

# --- Scenario presets ---------------------------------------------------

SCENARIOS: list[Scenario] = [
    Scenario(
        id="couponex", name="CouponEx", tag="SaaS · Coupon marketplace",
        desc="Early-stage B2C coupon & cashback platform. Growth-stage, churn-sensitive, three direct competitors.",
        active=True,
        seed={"users": 10000, "mrr": 50000, "marketing_budget": 5000, "competitors": 3, "churn": 0.06, "cac": 120},
    ),
    Scenario(
        id="lumen", name="Lumen Skincare", tag="D2C · Subscription beauty",
        desc="Direct-to-consumer skincare with a subscription box. High AOV, repeat-purchase driven.",
        active=False,
        seed={"users": 4200, "mrr": 88000, "marketing_budget": 12000, "competitors": 5, "churn": 0.04, "cac": 240},
    ),
    Scenario(
        id="forge", name="Forge Analytics", tag="B2B · Dev tooling",
        desc="Usage-based developer analytics SaaS. Long sales cycle, expansion-revenue focused.",
        active=False,
        seed={"users": 820, "mrr": 134000, "marketing_budget": 9000, "competitors": 2, "churn": 0.021, "cac": 1100},
    ),
]

# --- Business state history (hand-authored per cycle for the demo) ------

# Hand-authored so the demo charts read like a *real* business — every metric
# wobbles up and down between cycles (dips at C2 and C4, rebounds after) rather
# than a smooth line. The endpoints (C0 baseline, C6 "current") and the C5→C6
# deltas are pinned so the headline cards (+8.7% MRR, +6.6% users, 0.2pp churn,
# −$3 CAC) stay correct.
CYCLE_HISTORY: list[CyclePoint] = [
    CyclePoint(cycle=0, users=10000, mrr=50000, churn=0.060, cac=120, budget=5000, nps=31, runway=14),
    CyclePoint(cycle=1, users=10780, mrr=54200, churn=0.057, cac=121, budget=4400, nps=34, runway=15),
    CyclePoint(cycle=2, users=10510, mrr=52600, churn=0.063, cac=114, budget=4850, nps=32, runway=14),
    CyclePoint(cycle=3, users=12240, mrr=61900, churn=0.052, cac=110, budget=4200, nps=37, runway=17),
    CyclePoint(cycle=4, users=11960, mrr=59300, churn=0.058, cac=116, budget=4600, nps=35, runway=16),
    CyclePoint(cycle=5, users=13680, mrr=71200, churn=0.051, cac=104, budget=3950, nps=38, runway=18),
    CyclePoint(cycle=6, users=14580, mrr=77400, churn=0.049, cac=101, budget=4300, nps=40, runway=19),
]

# --- Agents -------------------------------------------------------------

AGENTS: list[Agent] = [
    Agent(id="founder", name="Founder", role="CEO · Strategy", glyph="crown", phase=1, status="idle",
          model="Gemini 2.5 Pro",
          blurb="Sets goals, KPIs and strategic direction. Assigns work to the org and adapts to market events.",
          tools=["set_goal", "assign_task", "query_knowledge"],
          outputs=["Business plan", "Quarterly goals", "Task assignments"]),
    Agent(id="operations", name="Operations", role="Supervisor · Orchestration", glyph="flow", phase=1, status="idle",
          model="Gemini 2.5 Pro",
          blurb="The supervisor node. Sequences work, tracks dependencies, routes between agents and gates approvals.",
          tools=["route_to_agent", "update_task_status", "request_approval"],
          outputs=["Task graph", "Run logs", "Status updates"]),
    Agent(id="marketing", name="Marketing", role="Content & Campaigns", glyph="spark", phase=1, status="idle",
          model="Gemini 2.5 Flash",
          blurb="Plans and writes campaigns, blog content and ads. Pulls brand guidelines from the knowledge base first.",
          tools=["create_campaign", "write_blog", "analyze_content", "query_knowledge"],
          outputs=["Campaigns", "SEO blog", "Email & ad plans"]),
    Agent(id="analytics", name="Analytics", role="KPIs & Insights", glyph="chart", phase=1, status="idle",
          model="Gemini 2.5 Flash",
          blurb="Aggregates business state into KPI snapshots and surfaces insights with cycle-over-cycle deltas.",
          tools=["aggregate_kpis", "generate_insight", "query_db"],
          outputs=["KPI snapshots", "Insights", "Chart data"]),
    Agent(id="sales", name="Sales", role="Leads & Outreach", glyph="target", phase=1, status="idle",
          model="Gemini 2.5 Flash",
          blurb="Finds and qualifies leads, drafts outreach and maintains the funnel.",
          tools=["web_search", "qualify_lead", "draft_outreach", "crm_upsert"],
          outputs=["Leads", "Lead scores", "Outreach drafts"]),
    Agent(id="research", name="Research", role="Market & Competitors", glyph="scope", phase=1, status="idle",
          model="Gemini 2.5 Flash",
          blurb="Tracks competitors, trends and feedback. Injects market events the org reacts to.",
          tools=["web_search", "rss_reader", "competitor_analyzer"],
          outputs=["Competitor notes", "Trend digest", "Opportunities"]),
    Agent(id="finance", name="Finance", role="Revenue & Forecast", glyph="coin", phase=1, status="idle",
          model="Gemini 2.5 Flash",
          blurb="Records revenue and expenses, builds P&L and forecasts cashflow.",
          tools=["record_txn", "build_pnl", "forecast_cashflow", "import_csv"],
          outputs=["Revenue", "Expenses", "P&L & forecast"]),
    Agent(id="support", name="Support", role="Tickets & CSAT", glyph="life", phase=1, status="idle",
          model="Gemini 2.5 Flash",
          blurb="Answers and resolves tickets, escalates edge cases and tracks CSAT.",
          tools=["answer_ticket", "escalate", "send_email"],
          outputs=["Replies", "Escalations", "CSAT"]),
]

AGENTS_BY_ID: dict[str, Agent] = {a.id: a for a in AGENTS}


def agent_by_id(agent_id: str) -> Agent | None:
    return AGENTS_BY_ID.get(agent_id)


# --- Org chart edges (Phase 1 collaboration loop) -----------------------

ORG_EDGES: list[OrgEdge] = [
    OrgEdge(from_="founder", to="operations"),
    OrgEdge(from_="operations", to="marketing"),
    OrgEdge(from_="operations", to="analytics"),
    OrgEdge(from_="analytics", to="founder"),
]


# --- The cycle script — what plays when you hit "Run cycle" -------------
# Each step lights an edge, appends a feed message + trace, and may mutate
# the business state via `apply`. Mirrors data.jsx CYCLE_SCRIPT.

def _apply_marketing(s: dict) -> dict:
    return {**s, "users": round(s["users"] * 1.05), "budget": s["budget"] - 1200, "cac": s["cac"] - 3}


def _apply_sales(s: dict) -> dict:
    return {**s, "users": round(s["users"] * 1.02)}


def _apply_finance(s: dict) -> dict:
    return {**s, "cac": s["cac"] - 2}


def _apply_support(s: dict) -> dict:
    return {**s, "churn": round(s["churn"] - 0.003, 3)}


def _apply_analytics(s: dict) -> dict:
    return {**s, "mrr": round(s["mrr"] * 1.087)}


CycleScriptStep = dict
CYCLE_SCRIPT: list[CycleScriptStep] = [
    {
        "edge": ["founder", "operations"], "actor": "founder",
        "message": "Set Q3 goal: grow MRR 8% while holding CAC under $105.",
        "trace": {"agent": "founder", "task": "Plan cycle goals",
                  "decision": "Prioritize short-form acquisition over paid search",
                  "reasoning": "Recalled memory: short-form content drove +25% CTR last campaign. CAC trending down; double-down.",
                  "tools": ["recall_memory", "set_goal", "assign_task"],
                  "result": "1 goal · 6 tasks assigned", "dur": 2100, "tokens": 1180},
        "apply": None,
    },
    {
        "edge": ["operations", "research"], "actor": "research",
        "message": "Research → Operations: competitor cut price 15%, demand for cashback rising.",
        "trace": {"agent": "research", "task": "Scan market & competitors",
                  "decision": "Flag competitor promo as a churn risk + an opportunity",
                  "reasoning": "RSS + web_search show a rival 15% price cut and rising 'cashback app' search volume.",
                  "tools": ["web_search", "rss_reader", "competitor_analyzer"],
                  "result": "1 risk · 1 opportunity", "dur": 2700, "tokens": 1120},
        "apply": None,
    },
    {
        "edge": ["operations", "marketing"], "actor": "marketing",
        "message": "Marketing → Operations: drafted 'Summer Cashback' short-form campaign.",
        "trace": {"agent": "marketing", "task": "Generate acquisition campaign",
                  "decision": "Short-form video, audience 18–25, gate spend on approval",
                  "reasoning": "Pulled marketing_guidelines via RAG: core audience skews 18–25; spend > $1k → request_approval.",
                  "tools": ["query_knowledge", "create_campaign", "request_approval"],
                  "result": "Campaign drafted · est. +5% users · $1.2k", "dur": 3200, "tokens": 1240},
        "apply": _apply_marketing,
    },
    {
        "edge": ["operations", "sales"], "actor": "sales",
        "message": "Sales → Operations: qualified 38 inbound leads, drafted outreach.",
        "trace": {"agent": "sales", "task": "Qualify leads & draft outreach",
                  "decision": "Prioritize 12 high-intent leads from the campaign",
                  "reasoning": "web_search + scoring against ICP; campaign traffic produced strong inbound.",
                  "tools": ["web_search", "qualify_lead", "draft_outreach", "crm_upsert"],
                  "result": "38 leads · 12 qualified", "dur": 2400, "tokens": 980},
        "apply": _apply_sales,
    },
    {
        "edge": ["operations", "finance"], "actor": "finance",
        "message": "Finance → Operations: recorded spend, updated forecast.",
        "trace": {"agent": "finance", "task": "Record txns & forecast",
                  "decision": "Reinvest efficiency gains; runway healthy",
                  "reasoning": "Campaign + tooling spend recorded; ARPU steady so revenue tracks user growth.",
                  "tools": ["record_txn", "build_pnl", "forecast_cashflow"],
                  "result": "P&L updated · runway +1mo", "dur": 2000, "tokens": 870},
        "apply": _apply_finance,
    },
    {
        "edge": ["operations", "support"], "actor": "support",
        "message": "Support → Operations: resolved 26 tickets, ran a win-back on at-risk users.",
        "trace": {"agent": "support", "task": "Resolve tickets & retention",
                  "decision": "Trigger day-21 win-back to blunt competitor churn",
                  "reasoning": "Recalled memory: win-back emails at day 21 recover ~3% of churned users.",
                  "tools": ["answer_ticket", "escalate", "send_email"],
                  "result": "26 resolved · CSAT 94%", "dur": 1900, "tokens": 760},
        "apply": _apply_support,
    },
    {
        "edge": ["operations", "analytics"], "actor": "analytics",
        "message": "Analytics → Operations: KPI snapshot ready — MRR +8.7%, CAC −$5.",
        "trace": {"agent": "analytics", "task": "Aggregate KPIs & insights",
                  "decision": "Flag CAC improvement as the cycle's headline",
                  "reasoning": "User growth from Marketing + Sales lifts MRR; Support held churn despite the competitor promo.",
                  "tools": ["query_db", "aggregate_kpis", "generate_insight"],
                  "result": "5 KPIs updated · 3 insights", "dur": 2600, "tokens": 1010},
        "apply": _apply_analytics,
    },
    {
        "edge": ["analytics", "founder"], "actor": "analytics",
        "message": "Report → Founder: goal met across all eight agents. Learning stored.",
        "trace": {"agent": "founder", "task": "Evaluate & learn",
                  "decision": "Goal met — store learning, plan next cycle",
                  "reasoning": "Short-form again outperformed. Reinforce strategy; raise next goal to +9% MRR.",
                  "tools": ["generate_insight", "write_memory"],
                  "result": "1 learning written · next goal raised", "dur": 1500, "tokens": 640},
        "apply": None,
    },
]


# --- Pre-populated traces (past cycles) for Observability ---------------

PAST_TRACES: list[Trace] = [
    Trace(id="t-063", cycle=6, agent="research", task="Competitor scan", decision="Flag rival price cut", reasoning="Detected a 15% competitor price cut via RSS; churn risk for price-sensitive cohort.", tools=["web_search", "rss_reader"], result="1 risk flagged", dur=2600, tokens=1080, status="warn", ago="2h ago"),
    Trace(id="t-062", cycle=6, agent="support", task="Resolve tickets", decision="Run day-21 win-back", reasoning="Recalled memory: day-21 win-back recovers ~3% of churned users.", tools=["answer_ticket", "send_email"], result="26 resolved · CSAT 94%", dur=1850, tokens=740, status="ok", ago="2h ago"),
    Trace(id="t-061", cycle=6, agent="analytics", task="Aggregate KPIs", decision="Headline MRR growth", reasoning="MRR crossed $77k, churn at all-time low of 4.9%.", tools=["query_db", "aggregate_kpis"], result="3 KPIs · 2 insights", dur=2480, tokens=990, status="ok", ago="2h ago"),
    Trace(id="t-060", cycle=6, agent="marketing", task="Write SEO blog", decision="Target 'best cashback apps 2026'", reasoning="Research flagged rising search volume; gap vs competitors.", tools=["query_knowledge", "write_blog"], result="1 post · 1.4k words", dur=4100, tokens=2210, status="ok", ago="2h ago"),
    Trace(id="t-056", cycle=5, agent="sales", task="Qualify leads", decision="Prioritize 12 high-intent leads", reasoning="Campaign inbound scored against ICP; focus reps on best-fit accounts.", tools=["web_search", "qualify_lead", "crm_upsert"], result="41 leads · 12 qualified", dur=2300, tokens=940, status="ok", ago="1d ago"),
    Trace(id="t-054", cycle=5, agent="finance", task="Forecast cashflow", decision="Reinvest efficiency gains", reasoning="ARPU steady, CAC falling; runway supports a larger acquisition push.", tools=["build_pnl", "forecast_cashflow"], result="Runway +1mo", dur=1950, tokens=820, status="ok", ago="1d ago"),
    Trace(id="t-059", cycle=6, agent="operations", task="Route task graph", decision="Parallelize blog + campaign", reasoning="No shared dependencies; safe to run concurrently.", tools=["route_to_agent", "update_task_status"], result="2 routes", dur=880, tokens=410, status="ok", ago="2h ago"),
    Trace(id="t-058", cycle=6, agent="founder", task="Plan cycle", decision="Hold CAC under $105", reasoning="Runway healthy; reinvest efficiency gains into growth.", tools=["recall_memory", "set_goal"], result="1 goal · 3 tasks", dur=1900, tokens=1120, status="ok", ago="2h ago"),
    Trace(id="t-052", cycle=5, agent="marketing", task="Generate campaign", decision="Short-form Instagram promo", reasoning="Audience 18–25 from marketing_guidelines; short-form over-indexes.", tools=["query_knowledge", "create_campaign"], result="Campaign · +5.9% users", dur=3050, tokens=1190, status="ok", ago="1d ago"),
    Trace(id="t-048", cycle=4, agent="analytics", task="Detect anomaly", decision="Churn ticked up to 5.7%", reasoning="Competitor price cut event injected; retention pressure.", tools=["query_db", "generate_insight"], result="1 risk flagged", dur=2200, tokens=870, status="warn", ago="2d ago"),
    Trace(id="t-047", cycle=4, agent="founder", task="Adapt strategy", decision="Add retention task to next cycle", reasoning="Reacting to competitor price cut; protect base before growth.", tools=["recall_memory", "set_goal", "assign_task"], result="Strategy updated", dur=1700, tokens=1040, status="ok", ago="2d ago"),
]


# --- Long-term memory (learnings) ---------------------------------------

MEMORY: list[Memory] = [
    Memory(id="m-07", cycle=6, agent="marketing", result="Short-form 'Summer Cashback' drove +6.4% users", lesson="Short-form video consistently beats static creative for the 18–25 segment.", confidence="high"),
    Memory(id="m-06", cycle=5, agent="analytics", result="CAC fell to $104 after creative refresh", lesson="Refreshing ad creative every 2 cycles prevents fatigue and holds CAC down.", confidence="high"),
    Memory(id="m-05", cycle=4, agent="founder", result="Competitor price cut raised churn to 5.7%", lesson="Price-sensitive segment reacts fast to competitor promos — add a retention play before growth.", confidence="medium"),
    Memory(id="m-04", cycle=3, agent="marketing", result="SEO blog ranked for 2 target keywords", lesson="Long-form SEO compounds — keep a steady cadence, don't pause it for campaigns.", confidence="medium"),
    Memory(id="m-03", cycle=2, agent="analytics", result="Email reactivation recovered 3% of churned users", lesson="Win-back emails at day 21 post-churn have the best response rate.", confidence="high"),
    Memory(id="m-02", cycle=1, agent="operations", result="Approval gate prevented an over-budget spend", lesson="Gating spend above $1k catches runaway campaigns without slowing the org.", confidence="high"),
]


# --- Knowledge base (RAG collections) -----------------------------------

KNOWLEDGE: list[KnowledgeCollection] = [
    KnowledgeCollection(collection="company_docs", color="info", docs=[
        KnowledgeDoc(name="CouponEx Company Overview.pdf", chunks=42, size="1.2 MB", updated="3d ago"),
        KnowledgeDoc(name="Brand Voice & Tone.md", chunks=11, size="38 KB", updated="5d ago"),
    ]),
    KnowledgeCollection(collection="strategy_docs", color="accent", docs=[
        KnowledgeDoc(name="Q3 Growth Plan.docx", chunks=28, size="640 KB", updated="2d ago"),
        KnowledgeDoc(name="Pricing Strategy 2026.pdf", chunks=19, size="880 KB", updated="1w ago"),
    ]),
    KnowledgeCollection(collection="marketing_guidelines", color="ok", docs=[
        KnowledgeDoc(name="Audience Personas.pdf", chunks=24, size="1.0 MB", updated="4d ago"),
        KnowledgeDoc(name="Channel Playbook.md", chunks=16, size="52 KB", updated="6d ago"),
        KnowledgeDoc(name="Creative Guidelines.pdf", chunks=31, size="2.1 MB", updated="1w ago"),
    ]),
    KnowledgeCollection(collection="sales_playbook", color="warn", docs=[
        KnowledgeDoc(name="ICP & Qualification.md", chunks=14, size="44 KB", updated="2w ago"),
    ]),
]


# --- Tasks (current cycle graph) ----------------------------------------

TASKS_SEED = [
    {"id": "T-31", "title": "Set Q3 growth goal", "agent": "founder", "status": "done", "deps": []},
    {"id": "T-32", "title": "Launch short-form campaign", "agent": "marketing", "status": "done", "deps": ["T-31"]},
    {"id": "T-33", "title": "Approve campaign spend", "agent": "operations", "status": "approved", "deps": ["T-32"]},
    {"id": "T-34", "title": "Publish SEO blog post", "agent": "marketing", "status": "running", "deps": ["T-31"]},
    {"id": "T-35", "title": "Recompute KPI snapshot", "agent": "analytics", "status": "queued", "deps": ["T-32", "T-34"]},
    {"id": "T-36", "title": "Evaluate & store learnings", "agent": "founder", "status": "queued", "deps": ["T-35"]},
]


# --- Approvals (pending) ------------------------------------------------

APPROVALS_SEED = [
    {"id": "ap-12", "agent": "marketing", "action": "Send campaign", "risk": "medium",
     "title": "Launch 'Summer Cashback' paid campaign",
     "summary": "Spend $1,200 across Instagram + TikTok short-form. Est. +6.4% users, CAC −$4.",
     "payload": {"channels": ["Instagram", "TikTok"], "spend": 1200, "audience": "18–25", "duration": "14 days", "creative": "3 short-form videos"},
     "requested": "just now"},
    {"id": "ap-11", "agent": "founder", "action": "Spend budget", "risk": "low",
     "title": "Allocate $800 to SEO content tooling",
     "summary": "Quarterly tool subscription to support the SEO blog cadence.",
     "payload": {"vendor": "Ahrefs (mock)", "amount": 800, "term": "quarterly"},
     "requested": "8m ago"},
]


# --- Insights (analytics output) ----------------------------------------

INSIGHTS: list[Insight] = [
    Insight(kind="win", text="MRR grew 8.7% this cycle — best result in 6 cycles, driven by short-form acquisition."),
    Insight(kind="win", text="CAC fell to $101, now $19 under the Founder's $120 ceiling."),
    Insight(kind="watch", text="Churn at 4.9% is healthy but the price-sensitive cohort remains exposed to competitor promos."),
]


# --- Base activity feed -------------------------------------------------

BASE_FEED: list[AgentMessage] = [
    AgentMessage(from_="analytics", to="founder", message="KPI snapshot delivered — MRR at $77.4k, churn 4.9%.", ts="2h ago"),
    AgentMessage(from_="operations", to="analytics", message="Routed KPI recompute after blog publish.", ts="2h ago"),
    AgentMessage(from_="marketing", to="operations", message="Published SEO blog: 'Best cashback apps 2026'.", ts="2h ago"),
    AgentMessage(from_="founder", to="operations", message="Assigned 3 tasks for cycle 6: campaign, blog, KPI roll-up.", ts="2h ago"),
    AgentMessage(from_="analytics", to="founder", message="Flagged CAC improvement — now $19 under ceiling.", ts="1d ago"),
]
