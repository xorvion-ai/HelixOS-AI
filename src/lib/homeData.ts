// Static data for the public marketing homepage.
//
// The homepage is the logged-out landing page and must render fast and
// reliably with NO backend dependency, so it ships its own static snapshot
// (mirroring the design handoff's `data.jsx` and the backend `seed.py`)
// rather than fetching /api. The in-app screens still use the live API.

import type { Agent, AgentMessage, CyclePoint } from "./types";

export const HOME_AGENTS: Agent[] = [
  { id: "founder", name: "Founder", role: "CEO · Strategy", glyph: "crown", phase: 1, status: "idle",
    model: "Gemini 2.5 Pro",
    blurb: "Sets goals, KPIs and strategic direction. Assigns work to the org and adapts to market events.",
    tools: ["set_goal", "assign_task", "query_knowledge"],
    outputs: ["Business plan", "Quarterly goals", "Task assignments"] },
  { id: "operations", name: "Operations", role: "Supervisor · Orchestration", glyph: "flow", phase: 1, status: "idle",
    model: "Gemini 2.5 Pro",
    blurb: "The supervisor node. Sequences work, tracks dependencies, routes between agents and gates approvals.",
    tools: ["route_to_agent", "update_task_status", "request_approval"],
    outputs: ["Task graph", "Run logs", "Status updates"] },
  { id: "marketing", name: "Marketing", role: "Content & Campaigns", glyph: "spark", phase: 1, status: "idle",
    model: "Gemini 2.5 Flash",
    blurb: "Plans and writes campaigns, blog content and ads. Pulls brand guidelines from the knowledge base first.",
    tools: ["create_campaign", "write_blog", "analyze_content", "query_knowledge"],
    outputs: ["Campaigns", "SEO blog", "Email & ad plans"] },
  { id: "analytics", name: "Analytics", role: "KPIs & Insights", glyph: "chart", phase: 1, status: "idle",
    model: "Gemini 2.5 Flash",
    blurb: "Aggregates business state into KPI snapshots and surfaces insights with cycle-over-cycle deltas.",
    tools: ["aggregate_kpis", "generate_insight", "query_db"],
    outputs: ["KPI snapshots", "Insights", "Chart data"] },
  { id: "sales", name: "Sales", role: "Leads & Outreach", glyph: "target", phase: 1, status: "idle",
    model: "Gemini 2.5 Flash",
    blurb: "Finds and qualifies leads, drafts outreach and maintains the funnel.",
    tools: ["web_search", "qualify_lead", "draft_outreach", "crm_upsert"],
    outputs: ["Leads", "Lead scores", "Outreach drafts"] },
  { id: "research", name: "Research", role: "Market & Competitors", glyph: "scope", phase: 1, status: "idle",
    model: "Gemini 2.5 Flash",
    blurb: "Tracks competitors, trends and feedback. Injects market events the org reacts to.",
    tools: ["web_search", "rss_reader", "competitor_analyzer"],
    outputs: ["Competitor notes", "Trend digest", "Opportunities"] },
  { id: "finance", name: "Finance", role: "Revenue & Forecast", glyph: "coin", phase: 1, status: "idle",
    model: "Gemini 2.5 Flash",
    blurb: "Records revenue and expenses, builds P&L and forecasts cashflow.",
    tools: ["record_txn", "build_pnl", "forecast_cashflow", "import_csv"],
    outputs: ["Revenue", "Expenses", "P&L & forecast"] },
  { id: "support", name: "Support", role: "Tickets & CSAT", glyph: "life", phase: 1, status: "idle",
    model: "Gemini 2.5 Flash",
    blurb: "Answers and resolves tickets, escalates edge cases and tracks CSAT.",
    tools: ["answer_ticket", "escalate", "send_email"],
    outputs: ["Replies", "Escalations", "CSAT"] },
];

// Total real tools across all agents → drives the "27+ real tools" stat.
export const TOOL_COUNT = HOME_AGENTS.reduce((s, a) => s + a.tools.length, 0);

// Business-state history for the showcase sparklines (mirrors seed.CYCLE_HISTORY).
export const SHOWCASE_HISTORY: CyclePoint[] = [
  { cycle: 0, users: 10000, mrr: 50000, churn: 0.060, cac: 120, budget: 5000, nps: 31, runway: 14 },
  { cycle: 1, users: 10780, mrr: 54200, churn: 0.057, cac: 121, budget: 4400, nps: 34, runway: 15 },
  { cycle: 2, users: 10510, mrr: 52600, churn: 0.063, cac: 114, budget: 4850, nps: 32, runway: 14 },
  { cycle: 3, users: 12240, mrr: 61900, churn: 0.052, cac: 110, budget: 4200, nps: 37, runway: 17 },
  { cycle: 4, users: 11960, mrr: 59300, churn: 0.058, cac: 116, budget: 4600, nps: 35, runway: 16 },
  { cycle: 5, users: 13680, mrr: 71200, churn: 0.051, cac: 104, budget: 3950, nps: 38, runway: 18 },
  { cycle: 6, users: 14580, mrr: 77400, churn: 0.049, cac: 101, budget: 4300, nps: 40, runway: 19 },
];

export const SHOWCASE_APPROVALS = [
  { id: "ap-12", agent: "marketing", title: "Launch 'Summer Cashback' paid campaign" },
  { id: "ap-11", agent: "founder", title: "Allocate $800 to SEO content tooling" },
];

export const SHOWCASE_FEED: AgentMessage[] = [
  { from: "analytics", to: "founder", message: "KPI snapshot delivered — MRR at $77.4k, churn 4.9%.", ts: "now" },
  { from: "marketing", to: "operations", message: "Drafted 'Summer Cashback' short-form campaign.", ts: "now" },
  { from: "operations", to: "analytics", message: "Routed KPI recompute after blog publish.", ts: "2m" },
  { from: "founder", to: "operations", message: "Set Q3 goal: grow MRR 8%, hold CAC under $105.", ts: "3m" },
];
