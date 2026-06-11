// Thin fetch client for the HelixOS backend.
// In dev, next.config rewrites /api/* to the FastAPI server, so same-origin
// relative paths work everywhere (local + Vercel).

import type {
  AdminUsage,
  Agent,
  Approval,
  ChatResponse,
  Me,
  CycleRunResponse,
  DashboardResponse,
  Document,
  KnowledgeCollection,
  Memory,
  OrgChartResponse,
  Scenario,
  ScenarioSeed,
  Trace,
} from "./types";

import { getAccessToken } from "./supabase/client";

const BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";

/** Stable per-browser-session id. Stamped on cycle requests so this tab can
 *  ignore its own echoed realtime events (it animates locally instead). */
export const CLIENT_ID: string =
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  // Attach the Supabase session token when auth is configured; a no-op
  // (null) in demo mode, so requests stay unauthenticated as before.
  const token = await getAccessToken();
  const authHeader: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...authHeader,
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => res.statusText);
    throw new Error(`API ${res.status} ${path}: ${detail}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  health: () => req<{ status: string; mode: string }>("/api/health"),
  me: () => req<Me>("/api/me"),
  dashboard: () => req<DashboardResponse>("/api/dashboard"),
  scenarios: () => req<Scenario[]>("/api/scenarios"),
  startSimulation: (scenario_id: string, custom_seed?: ScenarioSeed) =>
    req<DashboardResponse>("/api/simulation/start", {
      method: "POST",
      body: JSON.stringify({ scenario_id, custom_seed: custom_seed ?? null }),
    }),
  runCycle: () =>
    req<CycleRunResponse>("/api/cycle/run", {
      method: "POST",
      headers: { "X-Client-Id": CLIENT_ID },
    }),
  orgchart: () => req<OrgChartResponse>("/api/orgchart"),
  agents: () => req<Agent[]>("/api/agents"),
  traces: (agent?: string, cycle?: number) => {
    const q = new URLSearchParams();
    if (agent) q.set("agent", agent);
    if (cycle != null) q.set("cycle", String(cycle));
    const qs = q.toString();
    return req<Trace[]>(`/api/traces${qs ? `?${qs}` : ""}`);
  },
  approvals: () => req<Approval[]>("/api/approvals"),
  resolveApproval: (id: string, decision: "approved" | "rejected") =>
    req<Approval>(`/api/approvals/${id}`, { method: "POST", body: JSON.stringify({ decision }) }),
  knowledge: () => req<KnowledgeCollection[]>("/api/knowledge"),
  documents: () => req<Document[]>("/api/documents"),
  uploadDocument: (name: string, collection: string, content: string) =>
    req<Document>("/api/documents", {
      method: "POST",
      body: JSON.stringify({ name, collection, content }),
    }),
  chatAgent: (agentId: string, message: string) =>
    req<ChatResponse>(`/api/agents/${agentId}/chat`, {
      method: "POST",
      body: JSON.stringify({ message }),
    }),
  memory: () => req<Memory[]>("/api/memory"),
  adminUsage: () => req<AdminUsage>("/api/admin/usage"),
};
