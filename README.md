# HelixOS AI — your autonomous AI workforce

**HelixOS AI** is a full-stack, multi-agent **business operating system** by **[Xorvion](https://xorvion-ai.vercel.app)**. Eight specialist AI agents (Founder, Operations, Marketing, Sales, Research, Finance, Support, Analytics) collaborate to **run and grow a business on their own**, with a human kept in the loop for sensitive actions.

[![Live Demo](https://img.shields.io/badge/▲%20Open%20Live%20App-helixos--ai.vercel.app-22c55e?style=for-the-badge)](https://helixos-ai.vercel.app)

> Sign in, describe your company, and watch eight AI agents run autonomous growth cycles against **your** real metrics.

---

## ✨ Features

- **Eight collaborating agents** — a virtual company that plans, executes, evaluates, and **learns** every cycle: `Founder → Operations → {Marketing, Sales, Research, Finance, Support} → Analytics → Founder`.
- **Demo *and* live mode** — runs with **zero API keys** (in-memory business simulation) and upgrades to real reasoning when `GOOGLE_API_KEY` is set (**Gemini + LangGraph**, genuine tool-calling).
- **Bring your own business** — onboard your company's metrics and your agents operate on *your* numbers.
- **Live org chart** — watch handoffs animate edge-by-edge as a cycle runs (Supabase **Realtime**, so a second tab follows along).
- **Full observability** — every agent step records its decision, reasoning, tools, duration, and token cost.
- **Human approval** — sensitive actions pause the graph (LangGraph `interrupt()`) and wait for your sign-off.
- **RAG knowledge base + upload**, **long-term memory**, and **interactive agent chat**.
- **Admin Console** — owner-only usage metrics, members, and a support queue.
- **Free-tier first** — Next.js + FastAPI on Vercel, Supabase, Gemini free tier.

---

## 🧭 How it works

1. **Mode** — every key is optional; HelixOS auto-detects **demo** (scripted simulation) vs **live** (Gemini-driven LangGraph graph), falling back per-step so a demo never breaks.
2. **A cycle** — the Founder sets a goal, Operations routes work, the six specialists act with their own tools, Analytics aggregates KPIs, and the Founder writes a learning to long-term memory.
3. **Workspaces** — sign in (Supabase Auth) and each user gets a durable, Postgres-backed workspace; the admin account sees the seeded demo, everyone else onboards their own business.
4. **State moves** — agent decisions mutate the same KPIs the dashboard charts (users, MRR, churn, CAC), so growth is visible cycle over cycle.

---

## 📦 Project structure

```text
helix/                  # Python / FastAPI backend
  api.py                #   all /api/* endpoints
  simulation.py         #   business simulation engine (demo mode)
  graph.py · llm.py     #   LangGraph multi-agent graph + Gemini (live mode)
  rag.py · memory_store.py · tools.py
  store.py · supabase_store.py · auth.py   # pluggable persistence + JWT auth
src/
  app/                  # Next.js 16 App Router (landing, /login, /dashboard)
  components/           # Command Center, Org Chart, screens, Onboarding, Admin
  lib/                  # API client, types, Supabase clients
supabase/migrations/    # Postgres schema (workspaces, traces, realtime, …)
tests/                  # pytest suite + offline live-graph checks
```

---

## 🚀 Run it locally

```bash
# Backend (terminal A) — demo mode, no keys needed
python -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/uvicorn helix.api:app --reload --port 8000

# Frontend (terminal B)
npm install && npm run dev      # http://localhost:3000

# Tests
pip install -r requirements-dev.txt && pytest -q
```

Add keys to `.env` (copy `.env.example`) to switch on live Gemini, Supabase persistence/auth, and Realtime.

---

## 🏢 About Xorvion

**Xorvion** is an independent AI studio created by **[Sumit Kumar](https://www.linkedin.com/in/sumit-kumar2812/)**, based in Noida, India. Xorvion designs, builds, and ships AI products end-to-end — from multi-agent orchestration and live/demo architecture to auth, persistence, realtime, and the design system. **HelixOS AI** is one of its flagship builds.

- 🌐 **Website:** [xorvion-ai.vercel.app](https://xorvion-ai.vercel.app)
- 🔗 **LinkedIn:** [linkedin.com/company/xorvion](https://www.linkedin.com/company/xorvion)
- 🐙 **GitHub:** [github.com/xorvion-ai](https://github.com/xorvion-ai)
- 📨 **Email:** [xorvion.ai@gmail.com](mailto:xorvion.ai@gmail.com)

### 👤 Creator — Sumit Kumar

AI Engineer based in Noida, India, who takes AI products from idea to production.

- 💼 **LinkedIn:** [linkedin.com/in/sumit-kumar2812](https://www.linkedin.com/in/sumit-kumar2812/)
- 🌐 **Portfolio:** [sumitkr28.vercel.app](https://sumitkr28.vercel.app)
- 🐙 **GitHub:** [github.com/Sumitkr28](https://github.com/Sumitkr28)
