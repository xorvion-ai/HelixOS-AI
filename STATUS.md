# HelixOS AI — Project Status & Reference

_Last updated: 2026-06-13 — **🚀 DEPLOYED & LIVE on Vercel.** The 250 MB
serverless-function blocker is resolved; the owner has set all Vercel env vars
(both Gemini keys, `GEMINI_MODEL_FALLBACK=gemini-3.1-flash-lite`, `CRON_SECRET`,
Supabase, `ADMIN_EMAILS`) and run Supabase migrations `0001`→`0004`. App is
running in **live mode**. **Remaining gaps:** several agent tools are still
mocked (`web_search`, `send_email`/SMTP, `rss_reader`, CRM); the **Support
contact form posts to Web3Forms email, NOT to the Admin dashboard** — the Admin
"Support queue" still shows seeded demo tickets, so real user tickets/bugs do
**not** appear there yet (needs a `support_tickets` table + Admin read); cron is
once/day on Hobby; pgvector/Chroma not wired. UX + real-vs-demo data separation
pass (2026-06-13) added: a one-click light/dark
toggle (replacing the accent/density panel), hid the Gemini model label (shows
"Live"), a Terms & Conditions page with a vertical Support/Privacy/Terms bar, a
working **Edit profile** modal + **sign-in avatar** (profile + sidebar), a
**second Gemini API key with automatic 429/quota failover** to
`gemini-3.1-flash-lite`, a **background cron** endpoint (`/api/cron/cycle`,
`CRON_SECRET`-guarded) + daily Vercel cron, **demo-vs-real data separation**
(`Simulation.is_demo` gates seeded insights/feed/knowledge; non-admins see only
the CouponEx "Demo" preset + Custom; onboarding carries the company name; the
marketing `create_campaign` approval is now sized to the user's own budget, not
hardcoded CouponEx $1200), and **file/image upload in agent chat** (ingests to
the Knowledge Base). All pushed to both GitHub repos with per-account authorship
(no co-author). tsc + 34 pytest + 41 offline checks green.

Prior (2026-06-12): per-user workspaces + onboarding, admin allowlist
(`sumitchoudhary2812@gmail.com`-only Admin Console + demo data), dynamic
profile/sidebar, `/api/me`. Pushed to **github.com/Sumitkr28/HelixOS-AI** and
**github.com/xorvion-ai/HelixOS-AI** (per-account READMEs + favicon
`src/app/icon.svg`; CLAUDE.md/.claude/build-logs removed). xorvion-ai also has
Vercel Web Analytics (`@vercel/analytics`, pnpm). Earlier: feature-complete pass
(Tweaks/upload/chat/responsive/pytest), Realtime, Admin Console, Supabase
persistence+Auth. (The Vercel deploy that was blocked here is now live.)_

This is the **single source of truth** for the project: what it is, what we're
building, what's done, and what's left — in detail. Companion docs:
[PLAN.md](PLAN.md) (full architecture/roadmap) and [README.md](README.md) (run steps).

---

## 1. What this project is

**HelixOS AI** is an **autonomous multi-agent business operating system** — an
"Agentic AI" platform (by Xorvion) where a team of specialist AI agents
collaborate to **run and grow a business on their own**. Instead of one chatbot,
it behaves like a virtual company with AI "employees" for strategy, operations,
marketing, sales, research, finance, support, and analytics.

### The problem it solves
Startups and small businesses can't afford dedicated teams for marketing, sales,
support, research, and ops. Founders burn time switching between tools and doing
repetitive work. HelixOS gives them an **autonomous AI workforce** that can set
strategy, run campaigns, find leads, handle tickets, track finances, watch
competitors, analyze performance, and coordinate all of it — with the human kept
in the loop for sensitive actions.

### Why it's also a portfolio / recruiter piece
It deliberately combines the things that make an AI project stand out:
**RAG, long-term memory, real tool-calling agents, agent-to-agent communication,
human approval, full observability, a live org chart, and a business simulation.**
The emphasis is on a system that **actually works and demos well**, not a long
feature list.

---

## 2. What we're building (the approach)

- **Free phase first.** Everything is built on free-tier services with clean
  interfaces, so paid integrations can drop in later.
- **Demo-first / no-keys-required.** The entire app runs with **zero external
  services** in "demo mode" — an in-memory **Business Simulation** drives
  realistic data and the autonomous cycle. When you add API keys, it upgrades to
  "live mode" (real Gemini reasoning, RAG, persistence). This keeps the free
  phase truly free and the demo dependable (no rate limits / outages mid-demo).
- **Design-led.** The UI was designed separately in Claude design (the
  `Helix11/` handoff bundle). The backend was built to match that design's exact
  data contract, and the frontend recreates the design in production Next.js.
- **Phased agents.** Architecture supports all 8 agents; we prove the loop with
  the core four (Founder, Operations, Marketing, Analytics) and the other four
  (Sales, Research, Finance, Support) plug into the same patterns.

---

## 3. Architecture

```
┌──────────────────────────────────────────────────────────┐
│  Next.js 16 frontend  (Vercel)                            │
│  • Command Center  • Live Org Chart  • Observability      │
│  • Scenario picker  • Approvals / Knowledge / Memory      │
└───────────────┬──────────────────────────────────────────┘
                │  REST JSON over /api  (+ Supabase Realtime, later)
                ▼
┌──────────────────────────────────────────────────────────┐
│  FastAPI backend  (Vercel Python / Fluid Compute, 300s)   │
│  helix/api.py  — all /api/* endpoints                     │
└───────────────┬──────────────────────────────────────────┘
                ▼
┌──────────────────────────────────────────────────────────┐
│  Orchestration + Simulation                               │
│  • Simulation engine (demo mode)   ← built & working      │
│  • LangGraph supervisor + agents   ← live mode ✅ BUILT    │
└──────┬───────────────┬───────────────┬───────────────┬────┘
       ▼               ▼               ▼               ▼
   Gemini (LLM)    RAG retrieval    Memory store    Tools layer
   ✅ built        ✅ built          ✅ built         ✅ built
                ▼
┌──────────────────────────────────────────────────────────┐
│  Supabase  — Postgres + Auth + Realtime  (todo)           │
└──────────────────────────────────────────────────────────┘
```

**Live collaboration loop (rendered in the org chart):**
`Founder → Operations → {Marketing, Sales, Research, Finance, Support} → Analytics → Founder`

---

## 4. Tech stack & key decisions

| Layer | Choice | Notes |
|---|---|---|
| Frontend | **Next.js 16.2.7 + React 19 (TypeScript)** | App Router; pinned to stable (npm `latest` points at an unstable preview) |
| Styling | **Design tokens in CSS custom properties** (OKLCH) | ported verbatim from the design's `styles.css`; light/dark + accent + density |
| Backend | **Python 3.12 + FastAPI** | structured for Vercel Python serverless / Fluid Compute |
| Agent framework | **LangGraph** | state, checkpointing, human-in-the-loop, durable execution _(live mode, todo)_ |
| LLM | **Google Gemini (free tier)** | optional — demo mode needs no key |
| RAG vector store | **Chroma Cloud (free tier)** | serverless-safe; Supabase pgvector is the fallback |
| Data + Auth | **Supabase** (Postgres + Auth + Realtime) | _(todo)_ — currently in-memory simulation |
| Hosting | **Vercel** (one project: Next.js + Python `/api`) | `vercel.json` routes `/api/*` to the Python function |

**Notable decisions**
- Every AI/integration key is **optional** → demo vs live mode auto-detected.
- **No LinkedIn scraping** (ToS/ban risk) — Sales uses web search + a mock CRM.
- Business Simulation Mode makes mocked integrations cohere into one believable,
  evolving world that's instantly legible in a demo.

---

## 5. The 8 agents

| # | Agent | Role | Key tools | Phase |
|---|---|---|---|---|
| 1 | **Founder (CEO)** | Strategy, goals, KPIs, task assignment | `set_goal`, `assign_task`, `query_knowledge` | 1 |
| 2 | **Operations** | Supervisor: routes work, tracks deps, gates approvals | `route_to_agent`, `update_task_status`, `request_approval` | 1 |
| 3 | **Marketing** | Campaigns, blog, ads (RAG brand guidelines first) | `create_campaign`, `write_blog`, `analyze_content`, `query_knowledge` | 1 |
| 4 | **Analytics** | Aggregates state → KPI snapshots + insights | `aggregate_kpis`, `generate_insight`, `query_db` | 1 |
| 5 | **Sales** | Find/qualify leads, outreach, funnel | `web_search`, `qualify_lead`, `draft_outreach`, `crm_upsert` (mock) | 2 |
| 6 | **Research** | Competitors, trends, injects market events | `web_search`, `rss_reader`, `competitor_analyzer` | 2 |
| 7 | **Finance** | Revenue/expenses, P&L, forecast | `record_txn`, `build_pnl`, `forecast_cashflow`, `import_csv` | 2 |
| 8 | **Support** | Tickets, escalation, CSAT | `answer_ticket`, `escalate`, `send_email` | 2 |

**Decision: build all 8 agents (no phasing).** All eight are already present in
the demo data, the org chart, and the autonomous cycle today. In live mode all
eight get real Gemini reasoning + tool-calling (see §9.2 for the per-agent
remaining work).

---

## 6. The differentiating capabilities (what makes it notable)

1. **Business Simulation Mode** — agents run cycles against a realistic seeded
   business (CouponEx: 10k users, $50k MRR, etc.) whose metrics **evolve from
   their decisions**. _Built & working in demo mode._
2. **Autonomous cycle** — Plan → Execute → Evaluate → **Learn** (writes a memory)
   → next cycle recalls it. _Scripted version working; **LLM-driven (LangGraph)
   version now built** — runs on Gemini when `GOOGLE_API_KEY` is set._
3. **Agent-to-agent communication** — every handoff is a message that drives the
   live activity feed and the org-chart edges. _Working (animated)._
4. **Live AI Org Chart** — hierarchical tree; the active edge pulses and a packet
   travels along it during a cycle. _Working._
5. **Agent observability** — every step records decision, reasoning, tools,
   result, duration, token cost. _Data + endpoint working; UI screen todo._
6. **RAG knowledge base** — `company_docs`, `strategy_docs`, `sales_playbook`,
   `marketing_guidelines`; agents retrieve before acting. _Data + endpoint
   working; **real `query_knowledge` retrieval now built** (Gemini-embedding
   in-memory index, keyword fallback). Chroma Cloud optional/todo._
7. **Long-term memory** — structured learnings recalled across cycles.
   _Working in sim; **semantic `recall_memory` + `write_memory` now built**._
8. **Human approval mode** — sensitive actions (campaign send, budget spend)
   need sign-off. _Approve/reject working in sim; **LangGraph `interrupt()` +
   `/api/cycle/resume` now built** (interactive mode)._

---

## 7. ✅ What's done & verified

### 7.1 Backend (Python / FastAPI) — runs with no external services
| Component | File | Status |
|---|---|---|
| Settings; all AI keys optional → demo/live auto-detect | `helix/config.py` | ✅ |
| Pydantic data contract (matches design `data.jsx`, incl. `from`/`to` aliasing) | `helix/models.py` | ✅ |
| Seed data: scenarios, 8 agents, cycle history, cycle script (cause→effect), past traces, memory, knowledge, tasks, approvals, insights, base feed | `helix/seed.py` | ✅ |
| Simulation engine: `run_cycle()`, scenario load/reset, approvals, learnings | `helix/simulation.py` | ✅ |
| FastAPI app + CORS + all endpoints | `helix/api.py` | ✅ |
| Vercel Python entry + config (Fluid Compute, 300s, `/api` rewrite) | `api/index.py`, `vercel.json` | ✅ |
| Dependencies | `requirements.txt` | ✅ (core installed; AI libs listed for live mode) |

**Endpoints implemented & live:** `/api/health`, `/api/dashboard`,
`/api/scenarios`, `/api/simulation/start`, `/api/simulation/state`,
`/api/cycle/run`, `/api/orgchart`, `/api/agents`, `/api/agents/{id}`,
`/api/agents/activity`, `/api/traces`, `/api/approvals`, `/api/approvals/{id}`,
`/api/knowledge`, `/api/memory`, `/api/insights`.

**Verified:** dashboard returns CouponEx @ cycle 6 (MRR $77.4k); `cycle/run`
advances 6→7 with 8 collaboration steps + 8 traces + a written learning;
loading another scenario / a custom seed resets to cycle 0 correctly.

### 7.2 Frontend (Next.js 16 + React 19, TypeScript)
| Component | File | Status |
|---|---|---|
| Design tokens (light/dark, accent hue, density) | `src/app/globals.css` | ✅ ported from `styles.css` |
| Root layout + Geist / Geist Mono fonts | `src/app/layout.tsx` | ✅ |
| TS types mirroring the API contract | `src/lib/types.ts` | ✅ |
| Fetch client for all endpoints | `src/lib/api.ts` | ✅ |
| Static helpers (agent hues, status meta, number fmt) | `src/lib/agents.ts` | ✅ |
| UI primitives: Icon, Card, Badge, Button, AgentGlyph, StatusPill, Sparkline, SectionTitle, Empty | `src/components/ui.tsx` | ✅ ported from `ui.jsx` |
| Brand "Linkgraph" mark (kept exactly) | `src/components/BrandMark.tsx` | ✅ |
| Agents context (resolves agent metadata from API) | `src/components/AgentsContext.tsx` | ✅ |
| Live Org Chart (tree, pulsing active edge, traveling packet) | `src/components/OrgChart.tsx` | ✅ ported from `OrgChart.jsx` |
| Command Center (KPI cards + deltas + sparklines, goal, approvals, activity feed) | `src/components/CommandCenter.tsx` | ✅ ported from `screens1.jsx` |
| App shell (sidebar nav + header + Run-cycle button) | `src/components/AppShell.tsx` | ✅ |
| Cycle-run animation orchestration (state, step animation, KPI bump, approval resolve) | `src/components/DashboardClient.tsx` | ✅ |
| Dashboard page (SSR fetch) + root redirect | `src/app/dashboard/page.tsx`, `src/app/page.tsx` | ✅ |
| Simulation context (shared state, run-cycle, screen switching) | `src/components/SimulationProvider.tsx` | ✅ |
| **Scenario picker** (presets + custom seed sliders → load business) | `src/components/Scenarios.tsx` | ✅ |
| **Observability** (trace timeline: decision/reason/tools/cost, agent filter) | `src/components/screens.tsx` | ✅ |
| **Agents** (roster grid + detail panel + recent traces) | `src/components/screens.tsx` | ✅ |
| **Approvals** (full queue + payload preview + approve/reject) | `src/components/screens.tsx` | ✅ |
| **Knowledge Base** (RAG collections + docs) | `src/components/screens.tsx` | ✅ |
| **Memory** (long-term learnings) | `src/components/screens.tsx` | ✅ |
| **Live Org Chart** full-page view | `src/components/screens.tsx` | ✅ |
| Sidebar navigation (switches all 8 screens, per-screen header) | `src/components/AppShell.tsx` | ✅ |

**Verified:** `tsc --noEmit` clean; `/dashboard` SSR-renders every Command
Center section with live backend data; the browser `/api` proxy forwards to
FastAPI including `POST /api/cycle/run` (MRR 77400 → 84134); the dev server
boots clean and the full sidebar (8 screens) renders.

### 7.3 Environment / tooling
- Python 3.12 venv with core deps; Node 24; Next 16.2.7 pinned.
- **Network does TLS inspection** — `pip` needs
  `--trusted-host pypi.org --trusted-host files.pythonhosted.org`;
  `npm` needs `NODE_OPTIONS=--use-system-ca`. (Documented in README.)

---

## 8. 🟡 Built but not yet wired
- **All 8 app screens are now built and navigable** (sidebar switches them; the
  org chart + Run-cycle work from every screen via shared context).
- Still **demo data only** — screens read the in-memory simulation, not Supabase.
- **Agent detail "chat"** is not interactive yet (shows blurb + recent traces).
- **Knowledge "upload"** is read-only (no RAG ingest yet).
- **Marketing homepage** ✅ built — root (`/`) now serves the public landing page;
  its CTAs route into the app at `/dashboard`.

---

## 9. ⬜ What's left (in detail)

### 9.1 Remaining frontend screens
The 8 in-app screens are **done**. Still to build:
1. **Marketing homepage** — ✅ **built** (`src/app/page.tsx` → `src/components/home/`).
   Recreated `intro.jsx` + `home-extras.jsx`: sticky nav, hero + animated orbit,
   count-up stat band, Command Center showcase (static `AppFrameMock` scaled to
   fit — reuses the real `OrgChart` + UI primitives, backend-independent),
   orchestrator hub, about, agents marquee + grid, capabilities, contact form
   (custom themed dropdown + submitted state), final CTA + footer. CTAs route to
   `/dashboard`. Verified: `tsc --noEmit` clean; dev server serves `/` (200) with
   every section present. ✅ **Responsive/mobile** now done — key grids
   (`home-hero`/`home-split`/`home-contact`/`home-stats`/`home-grid-3|4`) moved to
   CSS classes in `globals.css` with breakpoints at 900px/560px; nav links hide +
   section padding tightens on mobile.
2. **Auth screens** — ✅ done (`/login`). **Tweaks panel** — ✅ **built**
   (`src/components/Tweaks.tsx`): theme (light/dark), accent hue swatches, density,
   persisted to `localStorage`, applied via `<html>` data-attrs/CSS vars, with a
   pre-hydration script in `layout.tsx` (no flash). Mounted in the app header.
3. **Polish on existing screens** — ✅ interactive **agent chat** (Agents detail
   panel → `/api/agents/{id}/chat`); ✅ **knowledge upload UI** (`KnowledgeScreen`
   → `/api/documents`, mock-chunk ingest); ✅ **loading/error states** on
   Observability / Knowledge / Memory. _(`prefers-reduced-motion` already handled
   globally in `globals.css`.)_

### 9.2 Backend — LIVE MODE: all 8 agents ✅ BUILT (Phase B/C)
Demo mode runs all 8 agents via the scripted cycle. **Live mode is now built**:
when `GOOGLE_API_KEY` is set, `POST /api/cycle/run` runs a real **LangGraph**
graph where each agent is a node that calls **Gemini** with its own tools,
retrieves from **RAG**, and recalls **memory**. It auto-falls-back to demo mode
if the key is unset, and per-node it degrades to the scripted result on any LLM
error so a demo never breaks mid-cycle. Verified offline end-to-end with a
deterministic `FakeLLM` (`tests/test_live.py`, 41 checks).

**New backend modules:** `helix/llm.py` (Gemini client + `FakeLLM` fallback),
`helix/rag.py` (retrieval), `helix/memory_store.py` (semantic recall),
`helix/knowledge_corpus.py` (real doc text), `helix/tools.py` (all agent tools),
`helix/graph.py` (the LangGraph graph), `helix/live.py` (runner → API contract).

**Shared infrastructure:**
- ✅ LangGraph graph + **Operations supervisor** node + checkpointer
  (`MemorySaver`; Postgres checkpointer deferred to the Supabase phase).
- ✅ Gemini client (Pro for Founder/Operations, Flash for the rest) via
  `GOOGLE_API_KEY`. Defaults updated to **gemini-2.5-pro / gemini-2.5-flash**
  (the 1.5 family was retired in 2025).
- ✅ Real `query_knowledge` retrieval over a knowledge corpus — semantic via
  **Gemini embeddings** (in-memory cosine index), keyword fallback offline.
  _(Chroma Cloud is the optional hosted store; not required and not installed.)_
- ✅ **Long-term memory**: semantic `recall_memory` (embeddings/keyword) +
  `write_memory` (Founder's evaluate node writes the cycle learning).
- ✅ **Real tool-calling**: Gemini function-calling loop; the model chooses
  tools, we execute them and feed results back (`llm.run_agent`).
- ✅ **Human approval** via LangGraph `interrupt()` + `POST /api/cycle/resume`
  (interactive mode). Default autonomous mode logs a *pending* approval.
- 🟡 Integration adapters (email SMTP, web search, RSS) — tools currently
  return realistic **mock** results; real-where-free wiring is the remaining bit.
- ✅ Each agent writes a real **observability trace** + feed message per step
  (9 steps/cycle: Founder, Operations, then the 6 workers, then Founder eval).

**Per-agent work (all 8) — ✅ implemented in `helix/tools.py` + `graph.py`:**
| Agent | Live-mode tools | Notes |
|---|---|---|
| **Founder** | `recall_memory`, `query_knowledge`, `set_goal`, `assign_task` | Gemini Pro; reads memory + strategy_docs to plan the cycle goal |
| **Operations** | `route_to_agent`, `update_task_status` | Gemini Pro; supervisor node — sequences work + owns the approval gate |
| **Marketing** | `query_knowledge`, `create_campaign`, `write_blog`, `analyze_content` | RAG `marketing_guidelines` first; spend > $1k → approval |
| **Analytics** | `query_db`, `aggregate_kpis`, `generate_insight` | rolls MRR up, computes deltas, writes insights |
| **Sales** | `web_search`, `qualify_lead`, `draft_outreach`, `crm_upsert` (mock) | no LinkedIn scraping; mock CRM; converts leads → users |
| **Research** | `web_search`, `rss_reader`, `competitor_analyzer` | injects a competitor-price-cut market event + a watch insight |
| **Finance** | `record_txn`, `build_pnl`, `forecast_cashflow`, `import_csv` | records spend, lowers blended CAC |
| **Support** | `answer_ticket`, `escalate`, `send_email` (mock SMTP) | day-21 win-back lowers churn |

Every tool reads/writes the simulation's `business_state`, so live-mode
decisions move the **same KPIs** the demo does (deltas mirror `seed._apply_*`):
marketing +5% users / −spend / −$3 CAC, sales +2% users, finance −$2 CAC,
support −0.3pp churn, analytics +8.7% MRR.

### 9.3 Data & platform
- **Supabase persistence + Auth** — ✅ **built (Track C, part 1)**. The in-memory
  `Simulation` now sits behind a pluggable `Store` (`helix/store.py`): demo mode
  uses `InMemoryStore` (byte-identical), and with `SUPABASE_URL`/`SUPABASE_SERVICE_KEY`
  set, `SupabaseStore` (`helix/supabase_store.py`) persists each workspace to
  normalized Postgres tables. Per-workspace state is `WorkspaceState`
  (`helix/state.py`); `get_simulation(workspace_id)` resolves it. **Auth**: an
  optional FastAPI dependency (`helix/auth.py`) verifies the Supabase JWT via
  `GET /auth/v1/user` and scopes every endpoint to `workspace_id = user.id`
  (demo → `"default"`, no gate). Frontend: `@supabase/ssr` browser+server clients
  (`src/lib/supabase/`), a themed `/login` page, `src/middleware.ts` (gates
  `/dashboard` only when configured), and token forwarding in `src/lib/api.ts` +
  the dashboard SSR fetch. Schema: `supabase/migrations/0001_init.sql`
  (workspaces + optimistic-locking `version`, workspace_settings, cycle_points,
  agent_traces, memory, approvals, insights, documents; RLS on).
  - **Realtime** (live feed + org-chart edges) — ✅ **built (Track C, part 2-A)**.
    Append-only `activity_events` table (`supabase/migrations/0002_realtime.sql`,
    RLS owner-scoped, in the `supabase_realtime` publication). Backend emits one
    `step` row per agent handoff + a terminal `cycle_complete` for **persisted**
    workspaces only — `Store.append_events` (no-op on `InMemoryStore`, batch insert
    on `SupabaseStore`), threaded a `client_id` from `X-Client-Id`. Frontend
    (`src/lib/supabase/realtime.ts` + a play-queue in `SimulationProvider.tsx`)
    subscribes per-workspace and drips remote events at 950ms — replaying the
    org-chart pulse + feed; a tab ignores its **own** echo (`CLIENT_ID` match) and
    keeps its instant local animation. _Offline-verified (tsc clean, 41/41); needs
    a real project + the 0002 migration for a two-tab live smoke test._
  - **Postgres LangGraph checkpointer** — ✅ **wired** (`helix/checkpointer.py`):
    `get_checkpointer()` uses LangGraph's `PostgresSaver` when `DATABASE_URL` is
    set + the optional `langgraph-checkpoint-postgres` package is installed,
    otherwise falls back to `MemorySaver`. `graph.py` compiles with it. Demo /
    offline always use MemorySaver (41/41 unchanged). _Needs a live DB + the
    optional dep to verify the durable path._
  - **`documents` upload/ingest UI** — ✅ **done** (Knowledge screen → `/api/documents`;
    metadata persists to the `documents` table for authed workspaces). _Real
    vector ingest plugs into `Simulation.add_document` (mock-chunk today)._
  - **Remaining (needs a live DB to build+verify):** **pgvector** memory
    embeddings (memory_store already does semantic recall via Gemini embeddings
    with keyword fallback — pgvector would persist them) and **Chroma Cloud**
    vector store for RAG.
  - **Live smoke test**: ✅ **passed** on a real project — authed cycle persists to
    Postgres and survives a backend restart; no-auth → 401; version increments.
    Needs `truststore` on TLS-inspection networks (auto-injected by `config.py`).
- **Admin & Support console (Phase K)** — ✅ **built**. Owner-only `AdminScreen`
  (`src/components/AccountScreens.tsx`) backed by a real aggregates endpoint
  `GET /api/admin/usage` (owner-scoped via `current_sim`): cycles, estimated
  Gemini tokens + run time summed from traces, per-agent token breakdown, and the
  live capability flags. Renders usage stat cards, **free-tier gauges** (Gemini
  tokens / Supabase rows / stored traces vs representative ceilings), a per-agent
  usage bar table, a **members** table (owner from auth + seeded teammates +
  client-side invite), and a **support queue** (seeded tickets with select / reply
  / mark-resolved, client-side). _tsc clean; offline test 41/41._
  - **Remaining (optional):** persist support tickets + members to Postgres
    (today members/tickets are seeded + client-side, mirroring the Web3Forms
    demo approach); real multi-tenant platform-admin (cross-workspace) view.
- **Cron / autonomous trigger** — Vercel Cron (daily on Hobby) or a free external
  cron to step cycles automatically; "Run cycle" button already covers manual.
- **Deploy** to Vercel (frontend + Python function) and end-to-end smoke test.

### 9.4 Quality / ops
- ✅ **Backend tests** — `pytest` suite (`tests/test_simulation.py`, `test_store.py`,
  `test_api.py` via `TestClient`) = **31 tests**, plus the offline live-graph
  check (`tests/test_live.py`, 41 checks). `tests/conftest.py` forces hermetic
  demo mode. Run: `pip install -r requirements-dev.txt` then `pytest -q`.
- ✅ **Frontend states** — loading / empty / error on the data screens;
  agent-working + waiting-approval already animated.
- ✅ **`prefers-reduced-motion`** respected globally (`globals.css`).
- ⬜ Remaining ops: **deploy to Vercel** + live smoke tests with real keys/DB
  (see §13), and **secret rotation**.

---

## 10. How to run

```powershell
# 1) Backend  (terminal A)
python -m venv .venv
.venv\Scripts\python.exe -m pip install -r requirements.txt `
  --trusted-host pypi.org --trusted-host files.pythonhosted.org   # if SSL errors
.venv\Scripts\python.exe -m uvicorn helix.api:app --reload --port 8000

# 2) Frontend  (terminal B)
$env:NODE_OPTIONS="--use-system-ca"   # this network needs it
npm install
npm run dev

# 3) Open
#    http://localhost:3000/dashboard   (app)
#    http://127.0.0.1:8000/docs        (API docs)
```
With no `.env`, you're in **demo mode**. Copy `.env.example` → `.env` and add
keys to switch on live Gemini / Chroma / Supabase.

---

## 11. Repository layout

```
helix/                 Python backend package
  config.py              env-driven settings (AI keys optional)
  models.py              Pydantic data contract
  seed.py                CouponEx seed data + cycle script
  simulation.py          Business Simulation Mode engine
  api.py                 FastAPI app + all /api/* endpoints
api/index.py           Vercel Python entry (re-exports helix.api:app)
vercel.json            Vercel config (Fluid Compute + /api rewrite)
requirements.txt       Python deps
src/
  app/
    layout.tsx           root layout + fonts
    globals.css          design tokens (ported)
    page.tsx             root → redirects to /dashboard
    dashboard/page.tsx   Command Center (SSR, live data)
  components/            UI primitives, OrgChart, CommandCenter, AppShell, …
  lib/                   api client, types, helpers
package.json / tsconfig.json / next.config.mjs
Helix11/               Design handoff reference (from Claude design)
PLAN.md · README.md · STATUS.md
```

---

## 12. Progress snapshot

| Phase | Description | Status |
|---|---|---|
| A | Backend foundation (models, seed, API) | ✅ done |
| C2 | Simulation engine (run-cycle) | ✅ done |
| — | Frontend core slice (Command Center + Org Chart, wired & verified) | ✅ done |
| — | All 8 in-app screens + sidebar nav (demo mode) | ✅ done |
| — | Marketing homepage (public landing) | ✅ done |
| — | Auth screens + Tweaks panel (theme/accent/density) | ✅ done |
| — | Knowledge upload + agent chat + loading/error states + responsive homepage | ✅ done |
| Q | Backend pytest suite (simulation/store/api) + offline check | ✅ done (31 pytest + 41 checks) |
| B / C | LangGraph + Gemini + RAG + memory + tools — **all 8 agents** (live mode) | ✅ done (offline-verified; needs a real key for a live smoke test) |
| Data | Supabase **persistence + Auth** (Store abstraction, per-user workspaces, JWT, /login) | ✅ done (offline-verified; needs a real project for a live smoke test) |
| Data | Supabase **Realtime** (activity stream → live feed + org-chart edges) | ✅ done (offline-verified; needs the 0002 migration + a two-tab live test) |
| Data | **Postgres LangGraph checkpointer** + pgvector | ⬜ todo |
| K | Admin & Support console (usage metrics, members, support queue) | ✅ done (real usage endpoint; members/tickets seeded + client-side) |
| Deploy | Vercel deploy + smoke test | ⬜ todo |

---

## 13. Where to pick up next (session handoff)

### 🚨 DEPLOY BLOCKER (2026-06-12) — Vercel build fails: Python function > 250 MB
Deploying **xorvion-ai/HelixOS-AI** to Vercel (project `helix-os-ai`, Hobby).
The Next.js build succeeds; the deploy then fails with:
> _"A Serverless Function has exceeded the unzipped maximum size of 250 MB."_

This is the **Python/FastAPI** function (`api/index.py`, `@vercel/python@4.3.1`,
routed via `vercel.json` rewrite `/api/(.*) → /api/index`). The app is a
Next.js 16 frontend + Python `/api` **hybrid in one Vercel project**.

**Tried (did NOT fix it):**
1. `vercel.json` → `functions["api/index.py"].excludeFiles` glob for
   `{node_modules,.next,…}`. **Ignored** — Vercel ignores `functions.excludeFiles`
   in **Next.js-framework** projects (per the vercel.json docs caveat; it points
   to `outputFileTracingExcludes`, which only governs Next's *own* functions, not
   our separate Python one).
2. Removed `uvicorn[standard]` from `requirements.txt` → `requirements-dev.txt`
   (Vercel invokes the ASGI `app` directly; uvicorn is dev-only).
3. Added `.vercelignore` (node_modules, .next, tests, Helix11, *.log, …).

**Diagnosis:** the real Python deps are light — local `.venv` site-packages is
~104 MB *including* dev-only junk (pip, pytest, win32, tree_sitter) that Vercel
never installs; true runtime set (fastapi, pydantic(-settings), httpx,
google-genai, langgraph, langchain-core, supabase, truststore, python-dotenv) is
~100–130 MB. So 250 MB strongly implies the `@vercel/python` builder is
**bundling the build-time `node_modules`** (~300 MB) into the function — and in a
Next.js project there's no `vercel.json` knob to stop it.

**NEXT STEP — get ground truth, then fix:**
1. Vercel → Settings → Env Vars → add `VERCEL_ANALYZE_BUILD_OUTPUT=1`, redeploy,
   read the failed build's logs → it lists the largest files in the function
   bundle. **Confirm whether `node_modules` is inside the Python function.**
2. If `node_modules` IS bundled (most likely), candidate fixes:
   - **Split deployment**: deploy the Python backend as its **own** Vercel
     project (or Render/Railway/Fly free tier) and set `NEXT_PUBLIC_API_BASE` to
     its URL; keep this project as Next-only. (Cleanest; `api.ts` already honors
     `NEXT_PUBLIC_API_BASE`, and CORS is configurable via `CORS_ORIGINS`.)
   - Or try a **root `api/` with its own `requirements.txt`** isolated from the
     Next root, / investigate `@vercel/python` `includeFiles` whitelist behavior.
3. If it's genuinely the **deps**: drop `supabase` (supabase-py → rewrite
   `supabase_store.py` over PostgREST via `httpx`, which is already used in
   `auth.py`) — removes gotrue/postgrest/realtime/storage3/supafunc + cryptography.
   Live mode still needs google-genai + langgraph + langchain-core.

**Repo/deploy facts for the new session:**
- Vercel project `helix-os-ai` (team `xorvionai-1386's projects`, Hobby), imports
  `xorvion-ai/HelixOS-AI`, Next.js preset, root `./`.
- Env: import `.env.production.local` (git-ignored, in repo root) — has Supabase
  (backend + `NEXT_PUBLIC_*`), `GOOGLE_API_KEY`, `ADMIN_EMAILS`,
  `CORS_ORIGINS=https://helix-os-ai.vercel.app`; **`NEXT_PUBLIC_API_BASE` removed**
  (must stay relative on Vercel).
- After a green deploy: run migrations `0001`→`0004` in Supabase; add
  `https://helix-os-ai.vercel.app/auth/callback` to Supabase Auth redirect URLs +
  Google OAuth; update the README live-badge URL (`helix-os-ai.vercel.app`).
- 🔐 Rotate the leaked secrets (GitHub PATs, Gemini key, Supabase service_role).

### Landed this session (2026-06-13) — UX + real-vs-demo data separation
Pushed to both repos (per-account author, no co-author): xorvion-ai
`d933a52→ca08375`, Sumitkr28 `57432af→4ff1be7` (+ a follow-up commit for the
data-separation pass). All offline-verified: **tsc clean, 34 pytest, 41 live**.

- ✅ **One-click theme toggle.** `Tweaks.tsx` is now a single sun/moon button
  (light↔dark); the accent-hue + density controls were removed. Same
  `helix.tweaks` localStorage key + pre-hydration script (no flash). Added `sun`
  / `moon` / `scroll` / `paperclip` / `upload` icons to `ui.tsx`.
- ✅ **Hid the model name.** Agents detail shows `Role · Live` (was
  "Gemini 2.5 Flash"); profile Mode shows "Live" (was "Live (Gemini)").
- ✅ **Terms & Conditions page** (`AccountScreens.tsx` `TermsScreen`, 10
  clauses) + `Screen` type `"terms"` + `DashboardClient` route. Sidebar
  Support/Privacy/**Terms** are now a **vertical** stack (`AppShell.tsx`).
- ✅ **Edit profile works.** `EditProfileModal` updates the Supabase user's
  `full_name`/`name` (`sb.auth.updateUser`) then refreshes `/api/me`.
- ✅ **Sign-in avatar.** `auth.py` reads `avatar_url`/`picture` from
  `user_metadata` → `AuthUser.picture` → `/api/me` `picture` → `Me.picture`;
  rendered in the profile banner + sidebar (falls back to the initial).
- ✅ **Second Gemini key + failover.** `config.py` `google_api_key_2` +
  `gemini_keys` + `gemini_model_fallback` (default **`gemini-3.1-flash-lite`**).
  `llm.py` `GeminiLLM` holds one client per key (`_KeySlot`); `_gen()` retries
  the next key on a 429/`RESOURCE_EXHAUSTED`/quota error (`_is_quota_error`),
  spare keys serve the fallback model. `embed()` fails over too. Demo/`FakeLLM`
  path unchanged.
- ✅ **Background cron.** `POST /api/cron/cycle` (guarded by `CRON_SECRET`;
  503 when unset, 401 on bad token) steps the demo workspace (demo mode) or each
  onboarded/idle workspace (Supabase) — `Store.list_onboarded_workspace_ids`
  (InMemory + Supabase impls). `vercel.json` `crons` → daily `0 9 * * *`.
  ⚠️ Vercel Hobby cron = once/day; true continuous needs a paid plan or an
  always-on worker.
- ✅ **Real-vs-demo data separation.** `Simulation.is_demo` = active scenario is
  a built-in preset (`couponex`/`lumen`/`forge`). Seed sample content now shows
  **only** for the demo: `/api/dashboard` (insights + activity feed),
  `/api/agents/activity`, `/api/knowledge`, `/api/insights` all return empty for
  a real/custom company. `/api/scenarios` lists every preset for admins but only
  CouponEx for everyone else (UI badges it **"Demo"**). Onboarding now passes the
  **company name** → `StartSimulationRequest.name` → custom scenario name (was
  dropped). The marketing **`create_campaign`** approval is now sized to the
  workspace's own marketing budget + generic channel/audience for real companies
  (was hardcoded "Instagram + TikTok / $1,200") — threaded `is_demo`/`company`
  through `live.start` → `HelixState` → `ToolContext`.
- ✅ **File/image upload in agent chat.** `AgentChat` (`screens.tsx`) has a 📎
  button → reads text files (else stores a reference) → `POST /api/documents`
  (existing mock-chunk ingest) → the doc lands in the Knowledge Base for RAG.
  _(Knowledge Base already had its own upload card.)_
- 🟡 **Still demo-flavored:** the **whole-cycle scripted fallback**
  (`_run_scripted`, used only when no Gemini key or a live cycle fully errors)
  still replays the CouponEx `CYCLE_SCRIPT` traces/learning. With a key set the
  live graph runs, so this only affects pure-demo / hard-fallback runs.
- 🔧 **Env to set on Vercel** (also in the git-ignored `.env.production.local`,
  ready to upload): `GOOGLE_API_KEY`, `GOOGLE_API_KEY_2`, `GEMINI_MODEL_FALLBACK`
  (`gemini-3.1-flash-lite` — **verify the exact id in Google AI Studio**),
  `GEMINI_MODEL_PRO`, `GEMINI_MODEL_FLASH`, `ADMIN_EMAILS`, `CRON_SECRET`,
  `CORS_ORIGINS`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `SUPABASE_ANON_KEY`,
  `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Then redeploy +
  run Supabase migrations `0001`→`0004`.
- ⬜ **Not done (needs your input):** refresh the public homepage Command-Center
  showcase mock to match the live app; the "add the words from the last pic"
  request (unclear which words/pic).

### Landed this session (2026-06-13, part 3) — deployed; CouponEx demo restores full history
- ✅ **Loading the CouponEx "Demo" preset restores its full 7-cycle history**
  (`WorkspaceState.reset_to_demo()`), so the demo charts aren't a flat 2-dot line
  after one cycle. Non-demo presets / custom businesses still reset to cycle 0.
  Tests updated (`test_load_couponex_restores_demo_history`); **35 pytest**.
- ✅ **DEPLOYED & LIVE.** Owner resolved the 250 MB blocker, set all Vercel env
  vars, and ran Supabase migrations `0001`→`0004`. Running in live mode.

### ⬜ Open / next up (post-deploy)
- **Real integrations (next task).** Replace the mocked agent tools with real
  ones where free: `rss_reader` (real feeds — no creds, stdlib XML + httpx),
  `web_search` (needs a provider key — e.g. Tavily/Brave free tier),
  `send_email`/SMTP (needs SMTP or Resend creds). Files: `helix/tools.py`
  (tool fns + `demo_args`), `helix/config.py` (new keys). Keep the demo/offline
  fallback so a missing key degrades gracefully (don't bloat the serverless
  function — prefer httpx + stdlib over heavy deps).
- **Support tickets/bugs → Admin dashboard.** Today the Support form posts to
  **Web3Forms email**, and the Admin "Support queue" shows **seeded demo
  tickets** — real submissions do NOT appear in-app. To fix: a `support_tickets`
  table (Supabase) + `POST /api/support` from the form + Admin reads real rows.
- **Live smoke tests** with real keys (Gemini `mode:"live"`, second-key failover,
  two-tab Realtime, cron run). pgvector/Chroma still optional.

### Landed this session (2026-06-13, part 2) — multimodal chat, real pipeline, demo graph variation
Same-day follow-ups (offline-verified: tsc clean, 34 pytest, 41 live):

- ✅ **Homepage Command-Center mock matches the app** (`home/visuals.tsx`):
  vertical Support / Privacy / Terms bar in the mock sidebar; org chart switched
  from `radial` to the **tree** layout the real Command Center uses.
- ✅ **Real task pipeline.** `CommandCenter.tsx` `TaskPipeline` is no longer a
  hardcoded `TASKS` array. The demo keeps a hand-authored showcase; a **real
  company** builds the pipeline from its **actual cycle traces** (`api.traces`
  for the current cycle → one card per completed agent step), with an empty
  state ("Run a cycle…") until it has run one.
- ✅ **Multimodal agent chat (image + doc analysis).** The 📎 in agent chat now
  **stages an attachment** for the next message instead of silently ingesting:
  images are sent to Gemini's multimodal model (`LLM.vision` → `GeminiLLM`
  builds a `Part.from_bytes` image part; `FakeLLM`/demo returns an honest "needs
  live mode" note); text docs are passed as context **and** ingested into the
  Knowledge Base. New `ChatAttachment` model + `attachment` on `ChatRequest`;
  `_agent_chat` branches on `kind` (`image`/`text`). Fixes the earlier
  "I cannot view images" reply. New `image` icon in `ui.tsx`.
- ✅ **Demo graphs look real.** `seed.CYCLE_HISTORY` + `lib/homeData.ts`
  `SHOWCASE_HISTORY` reworked so every metric **wobbles up/down** (dips at C2/C4,
  rebounds) instead of a smooth line. Endpoints (C0, C6) and the C5→C6 deltas
  are pinned so the headline cards (+8.7% MRR, +6.6% users, 0.2pp churn, −$3 CAC)
  stay correct. _(Real companies still start empty and fill in from their own
  cycles — this only touches the **demo** seed.)_
- ⬜ Still open: the public homepage mock numbers are a fixed demo snapshot (by
  design); the unresolved **"words from the last pic"** request; and the **250 MB
  Vercel deploy blocker** (§13 top) — nothing is live until that's fixed.

### Multi-tenant + publish (2026-06-12)
- **Per-user product**: `helix/auth.py` `resolve_user()` → `AuthUser`
  (id/email/name/is_admin); `config.admin_emails` allowlist
  (`sumitchoudhary2812@gmail.com`). `current_sim` seeds the **CouponEx demo** only
  for admins/the public demo; everyone else gets `WorkspaceState.onboarding()`
  (empty, `onboarded=False`). `GET /api/me`; `/api/admin/usage` 403s non-admins.
  `store.ensure(seed_demo)`, migration `0004_onboarding.sql` (workspaces.onboarded).
- **Frontend**: `MeContext` (`/api/me`), `Onboarding.tsx` (gate in `DashboardClient`
  when `!onboarded` → company-setup form → `loadScenario("custom", seed)`),
  dynamic `ProfileScreen` + sidebar user card, Admin nav gated to `is_admin`.
- **Published** to both GitHub repos (per-account author + README + favicon).
  Verified live on remotes. Tests: 34 pytest + 41 offline; local prod build green.

### Landed this session (2026-06-11) — Feature-complete pass
- ✅ **Tweaks panel** (`src/components/Tweaks.tsx`) — theme (light/dark), accent
  hue swatches, density; persisted to `localStorage`, applied via `<html>`
  data-attrs + CSS vars, pre-hydration script in `layout.tsx` (no flash). Mounted
  in the app header (always visible, incl. utility screens).
- ✅ **Knowledge upload** — `UploadDocument` card on the Knowledge screen →
  `POST /api/documents`. Backend: `Document` model, `WorkspaceState.documents`,
  `Simulation.add_document` (mock-chunk ingest), `GET/POST /api/documents`,
  `/api/knowledge` merges uploads into their collection. `SupabaseStore` persists
  docs (best-effort) + migration `0003_documents.sql` (collection/size columns).
- ✅ **Interactive agent chat** — `AgentChat` in the Agents detail panel →
  `POST /api/agents/{id}/chat`. One code path via `LLM.plan`: demo returns a
  persona-templated, KPI-grounded reply; live mode (Gemini) fills it. 404 on
  unknown agent.
- ✅ **Loading/error states** on Observability / Knowledge / Memory; **homepage
  responsive** (CSS-class grids + 900/560px breakpoints, nav collapses).
- ✅ **pytest suite** (31 tests: simulation/store/api via `TestClient`) +
  `tests/conftest.py` (hermetic demo mode) + `requirements-dev.txt`. Offline
  `test_live.py` still 41/41.
- ✅ **Postgres LangGraph checkpointer** wired (`helix/checkpointer.py`,
  `DATABASE_URL` + optional dep → `PostgresSaver`, else `MemorySaver`). `graph.py`
  compiles with it. Demo/offline unaffected.
- 🔬 **Needs you (can't run offline):** deploy to Vercel; live-key smoke tests
  (Gemini cycle `mode:"live"`, Realtime two-tab, Postgres checkpointer durable
  resume, pgvector/Chroma); **rotate the leaked GitHub/Google/Supabase secrets**.

### Landed earlier (2026-06-11) — Admin & Support console (Phase K)
- ✅ **Real usage endpoint.** `GET /api/admin/usage` (`helix/api.py`, owner-scoped
  via the `current_sim` dependency) aggregates the workspace's real telemetry:
  cycles run, estimated Gemini tokens + total/avg run time summed from
  observability traces, memory/insight/approval counts, and a per-agent token
  breakdown — plus the live `capabilities` flags + `mode`. Verified against the
  demo workspace (6 cycles, 11 traces, 11,410 tok, 8 agents).
- ✅ **AdminScreen rebuilt** (`src/components/AccountScreens.tsx`, replacing the
  placeholder) — owner-only console: a banner with an Owner-only + demo/live
  badge; 4 usage stat cards; **free-tier gauges** (Gemini tokens / Supabase rows /
  stored traces vs representative ceilings, colour-shifting at 70/90%); a
  **System status** card (Gemini / Supabase / Chroma live flags); a **per-agent
  usage** bar table (agent-hued, from `by_agent`); a **Members** table (owner
  email from Supabase auth + seeded teammates + a working client-side invite row);
  and a **Support queue** — seeded tickets in a two-pane list/detail with
  select → reply → mark-resolved (client-side, mirroring the Web3Forms demo
  approach). New: `AdminUsage` type + `api.adminUsage()`.
- 🟡 **Not persisted (by design, for now):** members + support tickets are seeded
  client-side. A later pass could store them in Postgres + a real platform-admin
  (cross-workspace) view. Usage numbers are fully real (from traces).
- ✅ `tsc --noEmit` clean; offline test still **41/41**.

### Landed this session (2026-06-11) — Realtime activity stream (Track C, part 2-A)
- ✅ **Append-only `activity_events` stream.** New migration
  `supabase/migrations/0002_realtime.sql`: `activity_events`
  (workspace_id, client_id, cycle, seq, kind `step`|`cycle_complete`, actor,
  edge jsonb, message, state_after jsonb), RLS `workspace_id = auth.uid()`, and a
  guarded `alter publication supabase_realtime add table` so postgres_changes
  fires. **A dedicated append-only table on purpose** — subscribing to the
  existing child tables would emit a delete/insert churn storm (they're rewritten
  wholesale each save).
- ✅ **Backend emit.** `Store.append_events(workspace_id, events)` added to the
  protocol: **no-op on `InMemoryStore`** (demo never broadcasts — the triggering
  tab animates locally), **batch insert on `SupabaseStore`** (best-effort; logs +
  swallows if the table/publication is missing). `Simulation._emit_events` builds
  one `step` per `CycleStep` + a terminal `cycle_complete`, called after
  `_persist()` in both `_run_scripted` and `_commit_outcome` (paused emits steps,
  no terminal). A `client_id` is threaded from the `X-Client-Id` header through
  `run_cycle`/`resume_cycle`. **Default/demo workspace is in-memory → emits
  nothing; offline test still 41/41.**
- ✅ **Frontend replay.** `src/lib/api.ts` mints a per-session `CLIENT_ID` and
  sends it as `X-Client-Id` on `runCycle`. `src/lib/supabase/realtime.ts`
  (`subscribeActivity`) subscribes to INSERTs filtered by workspace. A play-queue
  in `SimulationProvider.tsx` drains events at 950ms — driving `activeEdge`,
  `activeNodes`, `liveLog`, `state`, then on `cycle_complete` does the KPI bump +
  history append + approvals refetch. A tab **ignores its own echo**
  (`client_id === CLIENT_ID`) so the triggering tab keeps its instant local
  animation; only **remote** tabs replay from the stream. `tsc --noEmit` clean.
- 🔬 **Verify next (needs the real project):** apply `0002_realtime.sql`, open
  `/dashboard` in two tabs as the same user, run a cycle in tab A → tab B's org
  chart should pulse and the feed grow live. Confirm the table is in the
  `supabase_realtime` publication and RLS lets the authed client SELECT.

### Landed earlier (2026-06-11) — Supabase persistence + Auth (Track C, part 1)
- ✅ **Pluggable `Store`** behind the simulation. New: `helix/state.py`
  (`WorkspaceState` + `demo()`), `helix/store.py` (`Store` protocol, `InMemoryStore`,
  `StaleWorkspaceError`, `get_store`), `helix/supabase_store.py` (`SupabaseStore`).
  `helix/simulation.py` refactored to property proxies + `get_simulation(workspace_id)`;
  `SIM` (public demo workspace) is always in-memory. **Offline test 41/41 unchanged;
  demo path byte-identical (CouponEx @ cycle 6 → 7, MRR 77.4k → 84.1k).**
- ✅ **Auth + workspace scoping.** `helix/auth.py` (JWT verify via `/auth/v1/user`,
  short-TTL cache); `helix/api.py` threads a `current_sim` dependency through every
  endpoint (demo → `"default"`); stale saves → HTTP 409. `helix/config.py` gains
  `supabase_anon_key` + `database_url`.
- ✅ **Schema** `supabase/migrations/0001_init.sql`: workspaces (+`version`
  optimistic-locking, `updated_at` trigger), workspace_settings, cycle_points,
  agent_traces (canonical observability; wire `Trace` projected from it), memory,
  approvals, insights, documents — RLS owner-scoped on all.
- ✅ **Frontend auth.** `@supabase/ssr` clients (`src/lib/supabase/{client,server}.ts`),
  themed `src/app/login/page.tsx`, `src/middleware.ts` (gates `/dashboard` only when
  configured), token in `src/lib/api.ts` + dashboard SSR fetch. `tsc --noEmit` clean.
  Deps installed: `supabase==2.11.0` (py), `@supabase/supabase-js` + `@supabase/ssr` (npm).
- ✅ **Live smoke test PASSED** against a real Supabase project (`helixos-ai`,
  ref `vcbgzejkfdeoipguenyt`): migration applied; backend `supabase=True`;
  no-auth `/api/dashboard` → 401; authed user got a fresh workspace (cycle 6),
  ran a cycle → 7 (MRR 77.4k→84.1k), rows landed in Postgres
  (history 8, traces 19); clearing the in-process cache (restart) still read
  cycle 7 — **state survived**. Optimistic-lock `version` increments confirmed.
- 🧩 **TLS-inspection gotcha fixed**: httpx (supabase-py + JWT check) failed cert
  verification on this network. Added optional **`truststore`** (`helix/config.py`
  injects it if installed) → routes SSL through the OS trust store. `.env` uses
  the **legacy anon/service_role JWT keys** (the new `sb_publishable`/`sb_secret`
  format wasn't needed for the pinned libs).
- 🌐 **Frontend auth** wired + tsc-clean. `/login` rebuilt to match the
  Xorvion design (split layout: homepage hero left, sign-in panel right) with
  **Google + GitHub OAuth**, **email magic link** (`signInWithOtp`), and a
  **Microsoft** button stubbed to show "try a different method". Added
  `src/app/auth/callback/route.ts` (PKCE code exchange).
- ✅ **OAuth verified** on the live project: Supabase reports google/github/email
  enabled (azure off); the `authorize` endpoint 302-redirects to
  github.com / accounts.google.com with a valid `client_id` for both. Final
  interactive consent click-through is the user's to do in a browser. Google is
  in "Testing" mode (only added test users can sign in).
- 📨 **Contact form wired to Web3Forms** (`src/components/home/Homepage.tsx`
  `ContactBox`): real client-side submit (key is a public form id), validation +
  busy/error states; design unchanged. (Free tier blocks server-side calls, so
  it only works from the browser — by design.)
- 🔐 **Action items**: rotate the GitHub + Google client secrets (pasted during
  setup); the Supabase service_role key + DB password too if keeping the project.

### UI build (2026-06-11, same session) — auth UI, account screens, Command Center
- ✅ **Login `/login`** rebuilt to the Xorvion design: split layout (homepage-hero
  left + sign-in right), Google/GitHub OAuth, email magic link, Microsoft button
  stubbed ("try a different method"), `src/app/auth/callback/route.ts` for PKCE
  code exchange. OAuth verified live (Supabase 302 → provider with client_id).
- ✅ **Two-tone `Wordmark`** (`src/components/Wordmark.tsx`, "Helix" ink + "OS"
  accent gradient) applied everywhere: login, homepage nav + mock header, in-app
  sidebar. Removed the orange brand glow/ring on login.
- ✅ **Account screens** (`src/components/AccountScreens.tsx`, new `Screen` types
  + `DashboardClient` cases): **My Profile** (live stats, connected Google, sign
  out), **Support** (channels + Web3Forms contact form + FAQ), **Privacy Policy**,
  **Admin Console** placeholder (Phase K). Sidebar gained **Support/Privacy pills**,
  a clickable **user card → Profile**, and an **Admin Console** nav item; cycle
  controls hidden on these utility screens (`AppShell.tsx`).
- ✅ **Command Center — clickable KPI detail** (`src/components/MetricDetail.tsx`):
  click a card → expandable panel with metric tabs (MRR/Users/Churn/CAC), this-cycle
  badge, line chart (axis labels), cycle-by-cycle table, and Current/Last/All-time/
  Average/Peak stats. Plus a **task pipeline** (`TaskPipeline` in `CommandCenter.tsx`,
  T-31…T-36, "3/6 complete") below the org chart.
- ✅ **Contact form → Web3Forms** on the homepage (`ContactBox`) and Support page —
  real client-side submit (public form id), design unchanged.
- ✅ **Hero orbit animation** (`visuals.tsx`): orbiting + twinkling dots and a
  pulsing halo behind the brand orb.
- 🐛 **Fixes**: hydration mismatch (Sparkline random gradient id → `useId`);
  `getBoundingClientRect on null` in OrgChart `useSize` (unmount guard); Command
  Center horizontal overflow (`minmax(0,1fr)` grid columns so the right rail fits);
  the **default/demo workspace now always uses `InMemoryStore`** even when Supabase
  is configured (a bare `Simulation()` was trying to persist a non-UUID `"default"`
  row → also makes the offline test robust to `.env` being present).
- ✅ **Realistic cycle noise** (`_run_scripted` in `simulation.py`): scripted cycles
  add gentle bounded jitter to users/mrr/churn/cac so charts show real peaks/valleys
  (the odd up-tick) instead of a dead-straight line; MRR keeps its net-positive
  trend so the test invariant holds. Live path unchanged (it has exact-value tests).
- 🧰 **Optional dep added**: `truststore` (auto-injected by `helix/config.py`) so
  httpx works on TLS-inspecting networks. `.env` uses the legacy anon/service_role
  JWT keys.
- All frontend changes are **tsc --noEmit clean**; demo offline test still 41/41.

### Earlier (2026-06-10)
- ✅ **Live Mode — all 8 agents** (Phase B/C). New backend modules: `helix/llm.py`,
  `helix/rag.py`, `helix/memory_store.py`, `helix/knowledge_corpus.py`,
  `helix/tools.py`, `helix/graph.py`, `helix/live.py`. Wired into
  `helix/simulation.py` + `helix/api.py` (`POST /api/cycle/run?interactive=`,
  `POST /api/cycle/resume`). Gemini defaults → `gemini-2.5-pro/flash`.
  Offline-verified: `tests/test_live.py` (41 checks). **Falls back to demo mode
  with no key.**
- ✅ **Marketing homepage** (public landing). `src/app/page.tsx` →
  `src/components/home/{Homepage,visuals}.tsx` + `src/lib/homeData.ts`. Static,
  backend-independent; CTAs → `/dashboard`. `tsc --noEmit` clean; `/` serves 200.

### What's left to "ship" (all need things only you can provide)
The buildable, offline-verifiable surface is **done**. Remaining items require
real keys / a live DB / your Vercel account, so they can't be done or verified
from here:
1. **Deploy to Vercel** — `vercel` (frontend + Python `/api` per `vercel.json`),
   set env vars (`vercel env`), then a production smoke test. CLI not installed
   here (`npm i -g vercel`).
2. **Live-key smoke tests** — add `GOOGLE_API_KEY` → confirm `POST /api/cycle/run`
   returns `mode:"live"`; apply migrations `0002`/`0003`; two-tab **Realtime**
   test; set `DATABASE_URL` (+ `langgraph-checkpoint-postgres`) to verify the
   **durable checkpointer** resume. Fix anything the real APIs surface.
3. **pgvector + Chroma** vector stores (§9.3) — needs a live DB/Chroma to
   build+verify; memory/RAG already work via embeddings + keyword fallback.
4. 🔐 **Rotate the leaked secrets** — GitHub + Google client secrets, Supabase
   service_role key + DB password (pasted in an earlier chat).

To run tests locally: `pip install -r requirements-dev.txt` then `pytest -q`
(31 tests) and `python tests/test_live.py` (41 checks).

### Run / env reminders
- Backend (demo): `.venv\Scripts\python.exe -m uvicorn helix.api:app --reload --port 8000`
- Frontend: `$env:NODE_OPTIONS="--use-system-ca"; npm run dev` (port 3000)
- Free a stray port first (3000/8000) — see prior-session note.
- pip on this network needs `--trusted-host pypi.org --trusted-host files.pythonhosted.org`.
- Live-mode libs already installed in `.venv` (langgraph, langchain-core, google-genai).
- **code-review-graph** is set up globally (user-scoped MCP, auto-watch). The
  graph for this repo is built — prefer its MCP tools over Grep/Read.
