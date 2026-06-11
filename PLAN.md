# HelixOS AI — Project Plan (Free Phase)

## Context

**What:** HelixOS AI is an Agentic AI platform where specialized AI agents collaborate to autonomously run and grow a business — a "virtual company" of AI employees for strategy, operations, marketing, analytics (Phase 1) plus sales, research, finance, support (Phase 2).

**Why:** Small businesses/startups can't afford dedicated teams. HelixOS gives them an autonomous AI workforce. It's also a **portfolio / recruiter-grade** project: the differentiators — **RAG, long-term memory, real tool-calling agents, agent-to-agent communication, human approval, agent observability, and a live AI org chart** — are what make it stand out. Recruiters care that the system *actually works*, not that it has 8 agents on day one.

**Constraint:** Build entirely on **free-tier** services for now, with clean interfaces so paid integrations swap in later.

**Workflow agreement:** This document plans the *idea + architecture + backend*. The **frontend UI/UX is designed separately in Claude (design)**. So this plan includes a **Design Brief** (screens/components/states) and a **frozen API contract** so design and backend agree without rework. When the design returns, I build the backend to match and wire the frontend.

---

## Decisions Locked

| Area | Decision |
|---|---|
| Scope | **Phased: 4 agents first, then 4 more** (de-risk; prove the system works) |
| Phase 1 agents | **Founder, Operations, Marketing, Analytics** |
| Phase 2 agents | **Sales, Research, Finance, Support** |
| LLM | **Google Gemini (free tier)** |
| RAG | **ChromaDB** company knowledge base + embeddings (retrieve before acting) |
| Memory | **Long-term memory** of learnings, retrieved each cycle |
| Tools | **Real tool-calling per agent** (not prompt chaining) |
| Observability | **Agent trace store** (decision, reasoning, result, duration, cost) → dashboard |
| Org chart | **Live AI org chart** visualizing agent-to-agent execution |
| Simulation | **Business Simulation Mode** — agents run cycles against a realistic seeded business whose metrics evolve from their decisions |
| Integrations | **Free real where possible**, mock the rest behind clean interfaces |
| Stack | **Next.js frontend + Python (FastAPI) backend** |
| Agent framework | **LangGraph** (state, checkpointing, human-in-the-loop, durable execution) |
| Hosting | **Vercel** for both (see below) |
| Data + Auth | **Supabase** (Postgres + Auth + Realtime) |
| Vector store | **Chroma Cloud free tier** (serverless-safe); pgvector as fallback |

---

## "Can we use Vercel?" — Yes ✅ (free Hobby tier)

Vercel now runs **full Python** via **Fluid Compute** (300s default timeout, all plans). Both apps in one project:
- **Next.js** frontend = the app.
- **FastAPI** backend = Vercel **Python Serverless Functions** under `/api`.

**Long-running agents on serverless — solved by LangGraph design:**
- LangGraph **checkpoints state to Supabase Postgres** after each node → every step is a short request, no long-lived process.
- **Human Approval Mode** = LangGraph `interrupt()` pauses + checkpoints + returns; approval in UI **resumes from the checkpoint** (textbook serverless pattern).
- **Autonomous cycles** triggered by Vercel **Cron** (Hobby = daily) or a free external cron / "Run cycle" button for demos.
- Live UI via **Supabase Realtime** websockets — no backend polling.

**Vector store note:** ChromaDB's local persistence does **not** survive serverless invocations, so we use **Chroma Cloud (free tier)** as the hosted vector DB. Keeps the ChromaDB resume keyword and works on Vercel. (Fallback if Chroma Cloud limits bite: Supabase **pgvector** — no extra service.)

**Hobby limits to respect:** non-commercial, 300s timeout, daily cron. None block the MVP.

---

## High-Level Architecture

```
                      ┌──────────────────────────────────────────┐
                      │  Next.js Frontend (Vercel)                │
                      │  Command Center · Live Org Chart ·        │
                      │  Agent Trace/Observability views          │
                      │  (UI designed in Claude design)           │
                      └─────────────┬────────────────────────────┘
                                    │ REST/JSON + Supabase Realtime
                                    ▼
                      ┌──────────────────────────────────────────┐
                      │  FastAPI on Vercel Python Functions /api  │
                      └─────────────┬────────────────────────────┘
                                    ▼
                      ┌──────────────────────────────────────────┐
                      │  LangGraph Orchestrator                   │
                      │  Operations = supervisor · agent nodes    │
                      │  tool-calling · approval interrupts       │
                      └──┬───────────┬───────────┬───────────┬────┘
                         ▼           ▼           ▼           ▼
                   ┌─────────┐ ┌──────────┐ ┌─────────┐ ┌──────────────┐
                   │ Gemini  │ │ ChromaDB │ │ Memory  │ │ Tools layer  │
                   │ (LLM +  │ │ (RAG:    │ │ store   │ │ (web search, │
                   │ tools)  │ │ company  │ │ (learn- │ │ rss, email,  │
                   └─────────┘ │ docs)    │ │ ings)   │ │ create_*…)   │
                               └──────────┘ └─────────┘ └──────────────┘
                                    │
                      ┌──────────────────────────────────────────┐
                      │  Supabase: Postgres (state, checkpoints,  │
                      │  observability traces, memory, domain) ·  │
                      │  Auth · Realtime                          │
                      └──────────────────────────────────────────┘
```

**Live collaboration flow (rendered in the org chart):**
```
Founder → Operations → { Marketing } → Analytics → Founder   (Phase 1)
                     → { Marketing, Sales, Research, Finance, Support } → Analytics  (Phase 2)
```

---

## Agents (LangGraph nodes, phased)

Each agent = a LangGraph node: loads shared state → **retrieves from RAG + memory** → calls Gemini **with its tools** → writes structured output + an **observability trace** + `agent_messages`. **Operations is the supervisor** routing between agents.

### Phase 1 (build first — prove it works)

| Agent | Job | Tools | Outputs |
|---|---|---|---|
| **Founder (CEO)** | Strategy, goals, KPIs, assign tasks | `set_goal`, `assign_task`, `query_knowledge` | Business plan, goals/KPIs, task list |
| **Operations** | Orchestrate, sequence, track deps | `route_to_agent`, `update_task_status`, `request_approval` | Task graph, run logs, status |
| **Marketing** | Content + campaigns | `create_campaign`, `write_blog`, `analyze_content`, `query_knowledge` | Posts, SEO blog, email campaign, ad plan |
| **Analytics** | Aggregate → dashboards + insights | `aggregate_kpis`, `generate_insight`, `query_db` | KPI snapshots, insights, charts data |

### Phase 2 (add after Phase 1 is solid)

| Agent | Job | Tools | Outputs |
|---|---|---|---|
| **Sales** | Find/qualify leads, outreach, funnel | `web_search`, `qualify_lead`, `draft_outreach`, `crm_upsert`(mock) | Leads, scores, outreach drafts |
| **Research** | Competitors, trends, feedback | `web_search`, `rss_reader`, `competitor_analyzer` | Competitor notes, trend digest, opportunities |
| **Finance** | Revenue/expenses, reports, forecast | `record_txn`, `build_pnl`, `forecast_cashflow`, `import_csv` | Revenue, expenses, P&L, forecast |
| **Support** | Answer/resolve/escalate | `answer_ticket`, `escalate`, `send_email`(SMTP) | Replies, escalation flags, CSAT |

**Integration policy:** every tool's external call sits behind an adapter (`EmailProvider`, `CRMProvider`, `SearchProvider`…). Free-real where it exists (SMTP email, web search, RSS); mock otherwise with seeded realistic data. No LinkedIn scraping (ToS/ban risk) — Sales uses web search + mock CRM. Swapping to paid APIs later = change one adapter.

---

## Advanced Capabilities (the resume boosters)

### 1. RAG — Company Knowledge Base (ChromaDB)
Collections: `company_docs`, `strategy_docs`, `sales_playbook`, `marketing_guidelines`. Docs chunked + embedded (Gemini embeddings) into **Chroma Cloud**. Agents call `query_knowledge(query)` to retrieve relevant context **before acting** (e.g., Marketing pulls `marketing_guidelines` before writing a campaign). Gives RAG + Agentic + Multi-Agent in one project.

### 2. Long-Term Memory
After each cycle, store structured **learnings**:
```json
{ "campaign": "Instagram Promo", "result": "CTR +25%",
  "lesson": "Short-form content performs better", "agent": "marketing", "cycle": 7 }
```
Stored in `memory` table (+ embedded for semantic recall). Next cycle, agents `recall_memory(context)` and the lesson is injected into the prompt → the system visibly improves over time.

### 3. Tool Calling (real agents, not prompt chains)
Each agent is bound to a typed toolset (Gemini function-calling via LangGraph `ToolNode`). The model **decides which tool to call**; we execute it and feed results back. This is what makes it a genuine agent system.

### 4. Agent Observability
Every agent step writes a trace: `agent`, `task`, `reasoning_summary`, `decision`, `tools_used`, `result`, `duration_ms`, `token_cost`. Rendered in the dashboard:
```
Marketing Agent — Generate Campaign
Decision: Selected Instagram strategy
Reason:  Audience age 18–25 (from marketing_guidelines)
Tools:   query_knowledge → create_campaign
Result:  Campaign created · 3.2s · ~1,240 tokens
```

### 5. Live AI Org Chart
Visual tree (Founder → Operations → agents → Analytics → Founder). Edges **light up live** as agents communicate, driven by Supabase Realtime on `agent_messages`. This is the single most distinctive UI feature.

### 6. Human Approval Mode
Sensitive actions (send campaign, spend budget, mass email) call `interrupt()` → `approvals` row pending + graph paused; approve/reject in UI resumes the graph.

### 7. Autonomous Cycle
Plan → Execute → Evaluate → **Learn (write memory)** → next cycle recalls memory. Triggered by cron or "Run cycle" button.

### 8. Business Simulation Mode ⭐
Since integrations are mocked, agents operate against a **realistic seeded business** whose state **evolves from their decisions** — turning mocks into a believable, self-contained demo with no external API dependency.

**Example seeded scenario — "CouponEx Startup":**
```json
{ "name": "CouponEx", "users": 10000, "monthly_revenue": 50000,
  "marketing_budget": 5000, "competitors": 3, "churn_rate": 0.06, "cac": 120 }
```

**How it works:** a **simulation engine** holds the business state. Each cycle, agent decisions feed a lightweight model that updates metrics with realistic cause→effect + noise. Examples:
- Marketing launches a short-form campaign (recalled lesson: "+25% CTR") → users +X%, marketing_budget −spend, CAC shifts.
- Finance records the spend → revenue/forecast update.
- Research detects "Competitor X cut price 15%" (injected event) → churn risk up → Founder adapts strategy next cycle.
- Analytics reads the new state → KPI deltas the dashboard shows.

**Benefits:** demonstrates real autonomous decision-making, zero external-API dependency, instantly understandable results, easy to run live in interviews. Ships with 2–3 preset scenarios (e.g. SaaS startup, D2C brand) + an editable custom scenario. A "Run cycle" steps the simulation forward and the org chart/observability light up.

---

## Data Model (Supabase Postgres)

- `organizations`, `users` (Supabase Auth) — multi-tenant ready.
- `goals`, `tasks` (status, assigned_agent, depends_on, result).
- `agent_messages` (from, to, type, payload, ts) → org-chart + activity feed.
- `agent_traces` (agent, task, reasoning, decision, tools_used, result, duration_ms, token_cost) → observability.
- `memory` (agent, cycle, result, lesson, embedding) → long-term memory.
- `cycles` / `agent_runs` (plan/eval/learnings).
- `scenarios` (preset/custom business definitions) + `business_state` (current sim metrics per org, versioned per cycle) + `sim_events` (injected events like competitor price cut).
- `approvals` (action, payload, status, checkpoint_id).
- Domain: `leads`, `campaigns`, `tickets`, `transactions`, `competitors`, `insights`.
- `langgraph_checkpoints` (LangGraph Postgres checkpointer).
- Vectors live in **Chroma Cloud** (knowledge base); memory embeddings either in Chroma or pgvector.

Realtime subscriptions on `agent_messages`, `tasks`, `approvals`, `agent_traces`.

---

## API Contract (frozen for design handoff)

| Method | Endpoint | Purpose |
|---|---|---|
| `GET/POST` | `/api/scenarios` | List presets / create custom scenario |
| `POST` | `/api/simulation/start` | Load a scenario as the active business |
| `GET` | `/api/simulation/state` | Current + historical business metrics (for trend charts) |
| `POST` | `/api/cycle/run` | Step the simulation: run one autonomous cycle (also cron target) |
| `GET` | `/api/dashboard` | Command Center summary |
| `GET` | `/api/orgchart` | Org-chart structure + live edge activity (also Realtime) |
| `GET` | `/api/traces` | Agent observability traces (filter by agent/cycle) |
| `GET/POST` | `/api/goals` | List/create strategic goals |
| `GET` | `/api/tasks` | Task graph + statuses |
| `GET` | `/api/agents/activity` | Recent agent-to-agent messages (also Realtime) |
| `GET` | `/api/agents/{id}` | Agent detail + recent outputs + traces |
| `GET/POST` | `/api/approvals` · `POST /api/approvals/{id}` | Pending approvals; approve/reject → resume graph |
| `GET/POST` | `/api/knowledge` | List/upload knowledge-base docs (RAG ingest) |
| `GET` | `/api/memory` | Stored learnings |
| `POST` | `/api/chat` | Talk to a specific agent / Founder |
| `GET` | `/api/leads` `/api/campaigns` `/api/tickets` `/api/finance` `/api/research` | Domain views (Phase 2 populated) |

Exact response shapes go in `docs/api-contract.md` (shared TS/Python types).

---

## Design Brief (for Claude design)

Screens to design (consume only the API contract above):
1. **Command Center** — KPI cards (with cycle-over-cycle deltas from the sim), live activity feed, pending-approvals panel, "Run cycle" button.
1b. **Scenario picker / Simulation setup** ⭐ — choose a preset (CouponEx SaaS, D2C brand…) or edit a custom business (users, revenue, budget, competitors, churn); shows current metrics + trend chart over cycles.
2. **Live AI Org Chart** ⭐ — agent tree with edges animating on communication; node states idle/working/waiting-approval.
3. **Agent Observability** ⭐ — trace timeline cards (decision, reasoning, tools, result, duration, cost).
4. **Agents view** — Phase 1 agent cards (status) → detail + chat + recent traces.
5. **Approvals** — pending action queue with payload preview + approve/reject.
6. **Knowledge Base** — upload/list docs feeding RAG.
7. **Memory** — list of learnings ("what the system learned").
8. **Domain pages** (Phase 2) — Leads funnel, Campaigns, Tickets, Finance charts, Research digest.
9. **Auth / org settings** (Supabase Auth).

States: empty, loading, agent-working (streaming), waiting-approval, error.

---

## Build Phases

**A. Foundation** — Repo (Next.js + `/api` FastAPI on Vercel), Supabase project + schema, Chroma Cloud, env wiring (Gemini, Supabase, Chroma), deploy `/api/health`.

**B. Orchestration core** — LangGraph graph + Postgres checkpointer; shared state; Operations supervisor; `agent_messages` + `agent_traces` logging from the start.

**C. RAG + Memory + Tools infra** — Chroma ingest pipeline + `query_knowledge`; `memory` write/`recall_memory`; LangGraph `ToolNode` tool-calling harness.

**C2. Simulation engine** — `scenarios` + `business_state` + `sim_events`; preset scenarios (CouponEx etc.); the metric-update model that maps agent decisions → state deltas (+ injected events). Agent tools read/write business_state so decisions actually move the numbers.

**D. Phase 1 agents** — Founder, Operations, Marketing, Analytics with their tools; full Founder→Operations→Marketing→Analytics→Founder cycle working end-to-end.

**E. Approval mode** — `interrupt()` + `approvals` + resume endpoint.

**F. Autonomous cycle + Learn** — Plan/Execute/Evaluate/Learn loop writing memory; cron + "Run cycle" trigger.

**G. API + Realtime** — finalize endpoints (incl. `/orgchart`, `/traces`), Realtime channels; publish `docs/api-contract.md`.

**H. Wire frontend** — build Next.js screens against the contract once Claude's design lands (Command Center, Org Chart, Observability first).

**I. Phase 2 agents** — add Sales, Research, Finance, Support behind the same patterns; populate domain pages.

**J. Polish + deploy** — seed demo org + knowledge docs, deploy to Vercel, verify end-to-end.

---

## Verification

- **Tools:** each agent's tool calls execute and return typed results (pytest).
- **RAG:** `query_knowledge` returns relevant chunks for a seeded doc; Marketing's output reflects `marketing_guidelines`.
- **Memory:** run cycle N, write a lesson; run cycle N+1, assert the lesson is recalled and injected.
- **Simulation:** load CouponEx scenario; run a cycle where Marketing spends budget → assert `business_state` updates (users up, budget down, revenue/forecast shift) and deltas surface on the dashboard; inject a competitor-price-cut event → assert Founder strategy adapts next cycle.
- **Orchestration:** `POST /api/cycle/run` on seeded org → task graph executes, `agent_messages` + `agent_traces` populated, Analytics produces KPI snapshot.
- **Approval:** trigger campaign send → `approvals` pending + graph paused; approve → graph resumes, action completes.
- **Org chart / Realtime:** subscribe in browser, run a cycle, confirm edges light up live.
- **Observability:** traces show decision/reasoning/duration/cost per step.
- **Free-tier sanity:** a full cycle completes within 300s (chunk across nodes/invocations if needed).
- **Deploy:** `vercel deploy` → hit `/api/health`, `/api/dashboard`, `/api/orgchart` live.

---

## Deferred to Paid Phase
Real LinkedIn sourcing, WhatsApp Business API, paid ad spend, sub-daily autonomous cron, commercial-use hosting. All behind adapters → drop-in later.
