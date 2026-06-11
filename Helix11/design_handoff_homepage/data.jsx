/* ============================================================
   HelixOS AI — seed data
   CouponEx SaaS scenario, agents, cycle history, traces,
   messages, memory, knowledge base, approvals.
   Everything attaches to window for cross-file use.
   ============================================================ */

// ---- Scenario presets -------------------------------------------------
const SCENARIOS = [
  {
    id: "couponex",
    name: "CouponEx",
    tag: "SaaS · Coupon marketplace",
    desc: "Early-stage B2C coupon & cashback platform. Growth-stage, churn-sensitive, three direct competitors.",
    active: true,
    seed: { users: 10000, mrr: 50000, marketing_budget: 5000, competitors: 3, churn: 0.06, cac: 120 },
  },
  {
    id: "lumen",
    name: "Lumen Skincare",
    tag: "D2C · Subscription beauty",
    desc: "Direct-to-consumer skincare with a subscription box. High AOV, repeat-purchase driven.",
    active: false,
    seed: { users: 4200, mrr: 88000, marketing_budget: 12000, competitors: 5, churn: 0.04, cac: 240 },
  },
  {
    id: "forge",
    name: "Forge Analytics",
    tag: "B2B · Dev tooling",
    desc: "Usage-based developer analytics SaaS. Long sales cycle, expansion-revenue focused.",
    active: false,
    seed: { users: 820, mrr: 134000, marketing_budget: 9000, competitors: 2, churn: 0.021, cac: 1100 },
  },
];

// ---- Business state, hand-authored per cycle --------------------------
// cause→effect with one deliberate wobble (cycle 4 competitor price cut)
const CYCLE_HISTORY = [
  { cycle: 0, users: 10000, mrr: 50000, churn: 0.060, cac: 120, budget: 5000, nps: 31, runway: 14 },
  { cycle: 1, users: 10620, mrr: 53400, churn: 0.058, cac: 116, budget: 4400, nps: 33, runway: 15 },
  { cycle: 2, users: 11280, mrr: 57000, churn: 0.057, cac: 112, budget: 4850, nps: 34, runway: 15 },
  { cycle: 3, users: 12100, mrr: 61500, churn: 0.054, cac: 108, budget: 4200, nps: 36, runway: 16 },
  { cycle: 4, users: 12740, mrr: 65800, churn: 0.057, cac: 109, budget: 4600, nps: 35, runway: 16 },
  { cycle: 5, users: 13680, mrr: 71200, churn: 0.051, cac: 104, budget: 3950, nps: 38, runway: 18 },
  { cycle: 6, users: 14580, mrr: 77400, churn: 0.049, cac: 101, budget: 4300, nps: 40, runway: 19 },
];

// ---- Agents -----------------------------------------------------------
const AGENTS = [
  {
    id: "founder", name: "Founder", role: "CEO · Strategy", glyph: "crown", phase: 1, status: "idle",
    model: "Gemini 1.5 Pro", blurb: "Sets goals, KPIs and strategic direction. Assigns work to the org and adapts to market events.",
    tools: ["set_goal", "assign_task", "query_knowledge"],
    outputs: ["Business plan", "Quarterly goals", "Task assignments"],
  },
  {
    id: "operations", name: "Operations", role: "Supervisor · Orchestration", glyph: "flow", phase: 1, status: "idle",
    model: "Gemini 1.5 Pro", blurb: "The supervisor node. Sequences work, tracks dependencies, routes between agents and gates approvals.",
    tools: ["route_to_agent", "update_task_status", "request_approval"],
    outputs: ["Task graph", "Run logs", "Status updates"],
  },
  {
    id: "marketing", name: "Marketing", role: "Content & Campaigns", glyph: "spark", phase: 1, status: "idle",
    model: "Gemini 1.5 Flash", blurb: "Plans and writes campaigns, blog content and ads. Pulls brand guidelines from the knowledge base first.",
    tools: ["create_campaign", "write_blog", "analyze_content", "query_knowledge"],
    outputs: ["Campaigns", "SEO blog", "Email & ad plans"],
  },
  {
    id: "analytics", name: "Analytics", role: "KPIs & Insights", glyph: "chart", phase: 1, status: "idle",
    model: "Gemini 1.5 Flash", blurb: "Aggregates business state into KPI snapshots and surfaces insights with cycle-over-cycle deltas.",
    tools: ["aggregate_kpis", "generate_insight", "query_db"],
    outputs: ["KPI snapshots", "Insights", "Chart data"],
  },
  // Growth & service agents (now active alongside the core four)
  {
    id: "sales", name: "Sales", role: "Leads & Outreach", glyph: "target", phase: 1, status: "idle",
    model: "Gemini 1.5 Flash", blurb: "Finds and qualifies leads, drafts outreach and maintains the funnel.",
    tools: ["web_search", "qualify_lead", "draft_outreach", "crm_upsert"],
    outputs: ["Leads", "Lead scores", "Outreach drafts"],
  },
  {
    id: "research", name: "Research", role: "Market & Competitors", glyph: "scope", phase: 1, status: "idle",
    model: "Gemini 1.5 Flash", blurb: "Tracks competitors, trends and feedback. Injects market events the org reacts to.",
    tools: ["web_search", "rss_reader", "competitor_analyzer"],
    outputs: ["Competitor notes", "Trend digest", "Opportunities"],
  },
  {
    id: "finance", name: "Finance", role: "Revenue & Forecast", glyph: "coin", phase: 1, status: "idle",
    model: "Gemini 1.5 Flash", blurb: "Records revenue and expenses, builds P&L and forecasts cashflow.",
    tools: ["record_txn", "build_pnl", "forecast_cashflow", "import_csv"],
    outputs: ["Revenue", "Expenses", "P&L & forecast"],
  },
  {
    id: "support", name: "Support", role: "Tickets & CSAT", glyph: "life", phase: 1, status: "idle",
    model: "Gemini 1.5 Flash", blurb: "Answers and resolves tickets, escalates edge cases and tracks CSAT.",
    tools: ["answer_ticket", "escalate", "send_email"],
    outputs: ["Replies", "Escalations", "CSAT"],
  },
];

const agentById = (id) => AGENTS.find((a) => a.id === id);

// ---- Org chart edges (Phase 1 collaboration loop) ---------------------
const ORG_EDGES = [
  { from: "founder", to: "operations" },
  { from: "operations", to: "marketing" },
  { from: "operations", to: "analytics" },
  { from: "analytics", to: "founder" },
];

// ---- The cycle script — what plays when you hit "Run cycle" -----------
// Each step animates an edge, appends a trace, and may mutate state.
const CYCLE_SCRIPT = [
  {
    edge: ["founder", "operations"], actor: "founder",
    message: "Set Q3 goal: grow MRR 8% while holding CAC under $105.",
    trace: {
      agent: "founder", task: "Plan cycle goals",
      decision: "Prioritize short-form acquisition over paid search",
      reasoning: "Recalled memory: short-form content drove +25% CTR last campaign. CAC trending down; double-down.",
      tools: ["recall_memory", "set_goal", "assign_task"],
      result: "1 goal · 6 tasks assigned", dur: 2100, tokens: 1180,
    },
  },
  {
    edge: ["operations", "research"], actor: "research", reverse: true,
    message: "Research → Operations: competitor cut price 15%, demand for cashback rising.",
    trace: {
      agent: "research", task: "Scan market & competitors",
      decision: "Flag competitor promo as a churn risk + an opportunity",
      reasoning: "RSS + web_search show a rival 15% price cut and rising 'cashback app' search volume.",
      tools: ["web_search", "rss_reader", "competitor_analyzer"],
      result: "1 risk · 1 opportunity", dur: 2700, tokens: 1120,
    },
  },
  {
    edge: ["operations", "marketing"], actor: "marketing", reverse: true,
    message: "Marketing → Operations: drafted 'Summer Cashback' short-form campaign.",
    trace: {
      agent: "marketing", task: "Generate acquisition campaign",
      decision: "Short-form video, audience 18–25, gate spend on approval",
      reasoning: "Pulled marketing_guidelines via RAG: core audience skews 18–25; spend > $1k → request_approval.",
      tools: ["query_knowledge", "create_campaign", "request_approval"],
      result: "Campaign drafted · est. +5% users · $1.2k", dur: 3200, tokens: 1240,
    },
    apply: (s) => ({ ...s, users: Math.round(s.users * 1.05), budget: s.budget - 1200, cac: s.cac - 3 }),
  },
  {
    edge: ["operations", "sales"], actor: "sales", reverse: true,
    message: "Sales → Operations: qualified 38 inbound leads, drafted outreach.",
    trace: {
      agent: "sales", task: "Qualify leads & draft outreach",
      decision: "Prioritize 12 high-intent leads from the campaign",
      reasoning: "web_search + scoring against ICP; campaign traffic produced strong inbound.",
      tools: ["web_search", "qualify_lead", "draft_outreach", "crm_upsert"],
      result: "38 leads · 12 qualified", dur: 2400, tokens: 980,
    },
    apply: (s) => ({ ...s, users: Math.round(s.users * 1.02) }),
  },
  {
    edge: ["operations", "finance"], actor: "finance", reverse: true,
    message: "Finance → Operations: recorded spend, updated forecast.",
    trace: {
      agent: "finance", task: "Record txns & forecast",
      decision: "Reinvest efficiency gains; runway healthy",
      reasoning: "Campaign + tooling spend recorded; ARPU steady so revenue tracks user growth.",
      tools: ["record_txn", "build_pnl", "forecast_cashflow"],
      result: "P&L updated · runway +1mo", dur: 2000, tokens: 870,
    },
    apply: (s) => ({ ...s, cac: s.cac - 2 }),
  },
  {
    edge: ["operations", "support"], actor: "support", reverse: true,
    message: "Support → Operations: resolved 26 tickets, ran a win-back on at-risk users.",
    trace: {
      agent: "support", task: "Resolve tickets & retention",
      decision: "Trigger day-21 win-back to blunt competitor churn",
      reasoning: "Recalled memory: win-back emails at day 21 recover ~3% of churned users.",
      tools: ["answer_ticket", "escalate", "send_email"],
      result: "26 resolved · CSAT 94%", dur: 1900, tokens: 760,
    },
    apply: (s) => ({ ...s, churn: +(s.churn - 0.003).toFixed(3) }),
  },
  {
    edge: ["operations", "analytics"], actor: "analytics", reverse: true,
    message: "Analytics → Operations: KPI snapshot ready — MRR +8.7%, CAC −$5.",
    trace: {
      agent: "analytics", task: "Aggregate KPIs & insights",
      decision: "Flag CAC improvement as the cycle's headline",
      reasoning: "User growth from Marketing + Sales lifts MRR; Support held churn despite the competitor promo.",
      tools: ["query_db", "aggregate_kpis", "generate_insight"],
      result: "5 KPIs updated · 3 insights", dur: 2600, tokens: 1010,
    },
    apply: (s) => ({ ...s, mrr: Math.round(s.mrr * 1.087) }),
  },
  {
    edge: ["analytics", "founder"], actor: "analytics", reverse: true,
    message: "Report → Founder: goal met across all eight agents. Learning stored.",
    trace: {
      agent: "founder", task: "Evaluate & learn",
      decision: "Goal met — store learning, plan next cycle",
      reasoning: "Short-form again outperformed. Reinforce strategy; raise next goal to +9% MRR.",
      tools: ["generate_insight", "write_memory"],
      result: "1 learning written · next goal raised", dur: 1500, tokens: 640,
    },
  },
];

// ---- Pre-populated traces (past cycles) for Observability -------------
const PAST_TRACES = [
  { id: "t-063", cycle: 6, agent: "research", task: "Competitor scan", decision: "Flag rival price cut", reasoning: "Detected a 15% competitor price cut via RSS; churn risk for price-sensitive cohort.", tools: ["web_search", "rss_reader"], result: "1 risk flagged", dur: 2600, tokens: 1080, status: "warn", ago: "2h ago" },
  { id: "t-062", cycle: 6, agent: "support", task: "Resolve tickets", decision: "Run day-21 win-back", reasoning: "Recalled memory: day-21 win-back recovers ~3% of churned users.", tools: ["answer_ticket", "send_email"], result: "26 resolved · CSAT 94%", dur: 1850, tokens: 740, status: "ok", ago: "2h ago" },
  { id: "t-061", cycle: 6, agent: "analytics", task: "Aggregate KPIs", decision: "Headline MRR growth", reasoning: "MRR crossed $77k, churn at all-time low of 4.9%.", tools: ["query_db", "aggregate_kpis"], result: "3 KPIs · 2 insights", dur: 2480, tokens: 990, status: "ok", ago: "2h ago" },
  { id: "t-060", cycle: 6, agent: "marketing", task: "Write SEO blog", decision: "Target 'best cashback apps 2026'", reasoning: "Research flagged rising search volume; gap vs competitors.", tools: ["query_knowledge", "write_blog"], result: "1 post · 1.4k words", dur: 4100, tokens: 2210, status: "ok", ago: "2h ago" },
  { id: "t-056", cycle: 5, agent: "sales", task: "Qualify leads", decision: "Prioritize 12 high-intent leads", reasoning: "Campaign inbound scored against ICP; focus reps on best-fit accounts.", tools: ["web_search", "qualify_lead", "crm_upsert"], result: "41 leads · 12 qualified", dur: 2300, tokens: 940, status: "ok", ago: "1d ago" },
  { id: "t-054", cycle: 5, agent: "finance", task: "Forecast cashflow", decision: "Reinvest efficiency gains", reasoning: "ARPU steady, CAC falling; runway supports a larger acquisition push.", tools: ["build_pnl", "forecast_cashflow"], result: "Runway +1mo", dur: 1950, tokens: 820, status: "ok", ago: "1d ago" },
  { id: "t-059", cycle: 6, agent: "operations", task: "Route task graph", decision: "Parallelize blog + campaign", reasoning: "No shared dependencies; safe to run concurrently.", tools: ["route_to_agent", "update_task_status"], result: "2 routes", dur: 880, tokens: 410, status: "ok", ago: "2h ago" },
  { id: "t-058", cycle: 6, agent: "founder", task: "Plan cycle", decision: "Hold CAC under $105", reasoning: "Runway healthy; reinvest efficiency gains into growth.", tools: ["recall_memory", "set_goal"], result: "1 goal · 3 tasks", dur: 1900, tokens: 1120, status: "ok", ago: "2h ago" },
  { id: "t-052", cycle: 5, agent: "marketing", task: "Generate campaign", decision: "Short-form Instagram promo", reasoning: "Audience 18–25 from marketing_guidelines; short-form over-indexes.", tools: ["query_knowledge", "create_campaign"], result: "Campaign · +5.9% users", dur: 3050, tokens: 1190, status: "ok", ago: "1d ago" },
  { id: "t-048", cycle: 4, agent: "analytics", task: "Detect anomaly", decision: "Churn ticked up to 5.7%", reasoning: "Competitor price cut event injected; retention pressure.", tools: ["query_db", "generate_insight"], result: "1 risk flagged", dur: 2200, tokens: 870, status: "warn", ago: "2d ago" },
  { id: "t-047", cycle: 4, agent: "founder", task: "Adapt strategy", decision: "Add retention task to next cycle", reasoning: "Reacting to competitor price cut; protect base before growth.", tools: ["recall_memory", "set_goal", "assign_task"], result: "Strategy updated", dur: 1700, tokens: 1040, status: "ok", ago: "2d ago" },
];

// ---- Long-term memory (learnings) -------------------------------------
const MEMORY = [
  { id: "m-07", cycle: 6, agent: "marketing", result: "Short-form 'Summer Cashback' drove +6.4% users", lesson: "Short-form video consistently beats static creative for the 18–25 segment.", confidence: "high" },
  { id: "m-06", cycle: 5, agent: "analytics", result: "CAC fell to $104 after creative refresh", lesson: "Refreshing ad creative every 2 cycles prevents fatigue and holds CAC down.", confidence: "high" },
  { id: "m-05", cycle: 4, agent: "founder", result: "Competitor price cut raised churn to 5.7%", lesson: "Price-sensitive segment reacts fast to competitor promos — add a retention play before growth pushes.", confidence: "medium" },
  { id: "m-04", cycle: 3, agent: "marketing", result: "SEO blog ranked for 2 target keywords", lesson: "Long-form SEO compounds — keep a steady cadence, don't pause it for campaigns.", confidence: "medium" },
  { id: "m-03", cycle: 2, agent: "analytics", result: "Email reactivation recovered 3% of churned users", lesson: "Win-back emails at day 21 post-churn have the best response rate.", confidence: "high" },
  { id: "m-02", cycle: 1, agent: "operations", result: "Approval gate prevented an over-budget spend", lesson: "Gating spend above $1k catches runaway campaigns without slowing the org.", confidence: "high" },
];

// ---- Knowledge base (RAG collections) ---------------------------------
const KNOWLEDGE = [
  { collection: "company_docs", color: "info", docs: [
    { name: "CouponEx Company Overview.pdf", chunks: 42, size: "1.2 MB", updated: "3d ago" },
    { name: "Brand Voice & Tone.md", chunks: 11, size: "38 KB", updated: "5d ago" },
  ]},
  { collection: "strategy_docs", color: "accent", docs: [
    { name: "Q3 Growth Plan.docx", chunks: 28, size: "640 KB", updated: "2d ago" },
    { name: "Pricing Strategy 2026.pdf", chunks: 19, size: "880 KB", updated: "1w ago" },
  ]},
  { collection: "marketing_guidelines", color: "ok", docs: [
    { name: "Audience Personas.pdf", chunks: 24, size: "1.0 MB", updated: "4d ago" },
    { name: "Channel Playbook.md", chunks: 16, size: "52 KB", updated: "6d ago" },
    { name: "Creative Guidelines.pdf", chunks: 31, size: "2.1 MB", updated: "1w ago" },
  ]},
  { collection: "sales_playbook", color: "warn", docs: [
    { name: "ICP & Qualification.md", chunks: 14, size: "44 KB", updated: "2w ago" },
  ]},
];

// ---- Tasks (current cycle graph) --------------------------------------
const TASKS = [
  { id: "T-31", title: "Set Q3 growth goal", agent: "founder", status: "done", deps: [] },
  { id: "T-32", title: "Launch short-form campaign", agent: "marketing", status: "done", deps: ["T-31"] },
  { id: "T-33", title: "Approve campaign spend", agent: "operations", status: "approved", deps: ["T-32"] },
  { id: "T-34", title: "Publish SEO blog post", agent: "marketing", status: "running", deps: ["T-31"] },
  { id: "T-35", title: "Recompute KPI snapshot", agent: "analytics", status: "queued", deps: ["T-32", "T-34"] },
  { id: "T-36", title: "Evaluate & store learnings", agent: "founder", status: "queued", deps: ["T-35"] },
];

// ---- Approvals (pending) ----------------------------------------------
const APPROVALS = [
  {
    id: "ap-12", agent: "marketing", action: "Send campaign", risk: "medium",
    title: "Launch 'Summer Cashback' paid campaign",
    summary: "Spend $1,200 across Instagram + TikTok short-form. Est. +6.4% users, CAC −$4.",
    payload: { channels: ["Instagram", "TikTok"], spend: 1200, audience: "18–25", duration: "14 days", creative: "3 short-form videos" },
    requested: "just now",
  },
  {
    id: "ap-11", agent: "founder", action: "Spend budget", risk: "low",
    title: "Allocate $800 to SEO content tooling",
    summary: "Quarterly tool subscription to support the SEO blog cadence.",
    payload: { vendor: "Ahrefs (mock)", amount: 800, term: "quarterly" },
    requested: "8m ago",
  },
];

// ---- Insights (analytics output) --------------------------------------
const INSIGHTS = [
  { kind: "win", text: "MRR grew 8.7% this cycle — best result in 6 cycles, driven by short-form acquisition." },
  { kind: "win", text: "CAC fell to $101, now $19 under the Founder's $120 ceiling." },
  { kind: "watch", text: "Churn at 4.9% is healthy but the price-sensitive cohort remains exposed to competitor promos." },
];

window.HELIX = {
  SCENARIOS, CYCLE_HISTORY, AGENTS, agentById, ORG_EDGES, CYCLE_SCRIPT,
  PAST_TRACES, MEMORY, KNOWLEDGE, TASKS, APPROVALS, INSIGHTS,
};
