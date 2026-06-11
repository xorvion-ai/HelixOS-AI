import { DashboardClient } from "@/components/DashboardClient";
import type { Agent, DashboardResponse } from "@/lib/types";
import { getServerAccessToken } from "@/lib/supabase/server";

// The browser talks to /api (same origin); for the initial server render we
// hit the API directly via the dev proxy target or same-origin on Vercel.
const SERVER_API = process.env.API_PROXY_TARGET || "http://127.0.0.1:8000";

async function load<T>(path: string, token: string | null): Promise<T> {
  const res = await fetch(`${SERVER_API}${path}`, {
    cache: "no-store",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
  return res.json() as Promise<T>;
}

export default async function DashboardPage() {
  let initial: DashboardResponse | null = null;
  let agents: Agent[] = [];
  try {
    // Forward the session token (when auth is configured) so the API scopes
    // the SSR render to this user's workspace; null/no-op in demo mode.
    const token = await getServerAccessToken();
    [initial, agents] = await Promise.all([
      load<DashboardResponse>("/api/dashboard", token),
      load<Agent[]>("/api/agents", token),
    ]);
  } catch {
    return (
      <div style={{ display: "grid", placeItems: "center", minHeight: "100vh", padding: 40, textAlign: "center" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>Backend not reachable</h1>
          <p style={{ color: "var(--text-2)", marginTop: 8, maxWidth: 460 }}>
            Start the API: <code className="mono">uvicorn helix.api:app --reload --port 8000</code>,
            then reload this page.
          </p>
        </div>
      </div>
    );
  }

  return <DashboardClient initial={initial} agents={agents} />;
}
