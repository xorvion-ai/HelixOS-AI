"use client";

import { CSSProperties, ReactNode } from "react";
import { Badge, Button, Icon } from "./ui";
import { BrandMark } from "./BrandMark";
import { Wordmark } from "./Wordmark";
import { useSim, type Screen } from "./SimulationProvider";
import { useMe } from "./MeContext";
import { Tweaks } from "./Tweaks";

const NAV: { key: Screen; label: string; icon: string }[] = [
  { key: "command", label: "Command Center", icon: "command" },
  { key: "orgchart", label: "Live Org Chart", icon: "org" },
  { key: "observability", label: "Observability", icon: "trace" },
  { key: "agents", label: "Agents", icon: "agents" },
  { key: "approvals", label: "Approvals", icon: "approvals" },
  { key: "knowledge", label: "Knowledge Base", icon: "knowledge" },
  { key: "memory", label: "Memory", icon: "memory" },
  { key: "simulation", label: "Simulation", icon: "scenario" },
];

const HEAD: Record<Screen, { title: string; sub: string }> = {
  command: { title: "Command Center", sub: "Your autonomous AI workforce, live." },
  orgchart: { title: "Live Org Chart", sub: "Watch the agents collaborate in real time." },
  observability: { title: "Observability", sub: "Every agent decision, with reasoning and cost." },
  agents: { title: "Agents", sub: "The eight specialists running your business." },
  approvals: { title: "Approvals", sub: "Sensitive actions awaiting your sign-off." },
  knowledge: { title: "Knowledge Base", sub: "The company docs agents retrieve before acting." },
  memory: { title: "Memory", sub: "Long-term learnings recalled across cycles." },
  simulation: { title: "Simulation", sub: "Choose the business your agents operate." },
  profile: { title: "My Profile", sub: "Your account, workspace and connected providers." },
  support: { title: "Support", sub: "Get help, contact us, and read the FAQ." },
  privacy: { title: "Privacy Policy", sub: "How HelixOS handles your data." },
  terms: { title: "Terms & Conditions", sub: "The terms that govern your use of HelixOS." },
  admin: { title: "Admin Console", sub: "Workspace administration and the support queue." },
};

// Screens that are utility/account pages — no cycle controls in the header.
const UTILITY: Screen[] = ["profile", "support", "privacy", "terms", "admin"];

function pill(active: boolean): CSSProperties {
  return {
    display: "flex", alignItems: "center", justifyContent: "center", gap: 6, flex: 1,
    padding: "7px 10px", borderRadius: "var(--r2)", fontSize: 12.5, fontWeight: 600,
    border: "1px solid var(--border)", cursor: "pointer",
    background: active ? "var(--accent-soft)" : "var(--surface)",
    color: active ? "var(--accent-strong)" : "var(--text-2)",
  };
}

export function AppShell({ children }: { children: ReactNode }) {
  const sim = useSim();
  const { me } = useMe();
  const head = HEAD[sim.activeScreen];
  const displayName = me?.name || me?.email || "Account";
  const initial = (displayName[0] || "A").toUpperCase();
  const roleLine = me?.is_admin ? `Admin · ${sim.scenario.name}` : `${sim.scenario.name} workspace`;

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg)" }}>
      {/* Sidebar */}
      <aside style={{
        width: 234, flexShrink: 0, borderRight: "1px solid var(--border)", background: "var(--surface)",
        display: "flex", flexDirection: "column", position: "sticky", top: 0, height: "100vh",
      }}>
        <button onClick={() => sim.setScreen("command")}
          style={{ display: "flex", alignItems: "center", gap: 11, padding: "18px 18px 16px", background: "transparent", border: "none", textAlign: "left" }}>
          <BrandMark size={30} />
          <div>
            <Wordmark size={18} />
            <div className="mono" style={{ fontSize: 9.5, color: "var(--text-3)", letterSpacing: ".22em", marginTop: 2 }}>AGENTIC AI</div>
          </div>
        </button>

        <nav style={{ display: "flex", flexDirection: "column", gap: 2, padding: "6px 12px", flex: 1 }}>
          {NAV.map((n) => {
            const on = n.key === sim.activeScreen;
            return (
              <button key={n.key} onClick={() => sim.setScreen(n.key)}
                style={{
                  display: "flex", alignItems: "center", gap: 11, padding: "9px 12px", borderRadius: "var(--r2)",
                  fontSize: 13.5, fontWeight: 600, border: "none", textAlign: "left", width: "100%",
                  background: on ? "var(--accent-soft)" : "transparent",
                  color: on ? "var(--accent-strong)" : "var(--text-2)",
                }}>
                <Icon name={n.icon} size={17} />
                <span style={{ flex: 1 }}>{n.label}</span>
                {n.key === "approvals" && sim.approvals.length > 0 && <Badge tone="warn">{sim.approvals.length}</Badge>}
              </button>
            );
          })}

          {/* Admin Console — owner-only (admin email); separated below the nav */}
          {me?.is_admin && (
            <>
              <div style={{ borderTop: "1px solid var(--border)", margin: "8px 0" }} />
              <button type="button" onClick={() => sim.setScreen("admin")}
                style={{
                  display: "flex", alignItems: "center", gap: 11, padding: "9px 12px", borderRadius: "var(--r2)",
                  fontSize: 13.5, fontWeight: 600, border: "none", textAlign: "left", width: "100%",
                  background: sim.activeScreen === "admin" ? "var(--accent-soft)" : "transparent",
                  color: sim.activeScreen === "admin" ? "var(--accent-strong)" : "var(--text-2)",
                }}>
                <Icon name="settings" size={17} />
                <span style={{ flex: 1 }}>Admin Console</span>
                <Badge tone="neutral">ADMIN</Badge>
              </button>
            </>
          )}
        </nav>

        <div style={{ borderTop: "1px solid var(--border)", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <button type="button" onClick={() => sim.setScreen("support")} style={pill(sim.activeScreen === "support")}>
              <Icon name="life" size={14} /> Support
            </button>
            <button type="button" onClick={() => sim.setScreen("privacy")} style={pill(sim.activeScreen === "privacy")}>
              <Icon name="shield" size={14} /> Privacy
            </button>
            <button type="button" onClick={() => sim.setScreen("terms")} style={pill(sim.activeScreen === "terms")}>
              <Icon name="scroll" size={14} /> Terms &amp; Conditions
            </button>
          </div>
          <button type="button" onClick={() => sim.setScreen("profile")}
            style={{
              display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "8px 10px",
              borderRadius: "var(--r2)", border: "1px solid var(--border)", cursor: "pointer", textAlign: "left",
              background: sim.activeScreen === "profile" ? "var(--accent-soft)" : "var(--surface)",
            }}>
            {me?.picture ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={me.picture} alt="" referrerPolicy="no-referrer" style={{ width: 32, height: 32, borderRadius: 10, objectFit: "cover" }} />
            ) : (
              <div style={{ width: 32, height: 32, borderRadius: 10, background: "var(--accent)", color: "var(--accent-fg)", display: "grid", placeItems: "center", fontWeight: 700, fontSize: 14 }}>{initial}</div>
            )}
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 12.5, fontWeight: 650, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{displayName}</div>
              <div style={{ fontSize: 11, color: "var(--text-3)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{roleLine}</div>
            </div>
            <Icon name="arrowRight" size={14} style={{ color: "var(--text-3)" }} />
          </button>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <header style={{
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
          padding: "18px 28px", borderBottom: "1px solid var(--border)",
          position: "sticky", top: 0, background: "color-mix(in oklch, var(--bg), transparent 12%)",
          backdropFilter: "blur(10px)", zIndex: 10,
        }}>
          <div>
            <h1 style={{ fontSize: 21, fontWeight: 700, letterSpacing: "-.02em" }}>{head.title}</h1>
            <div style={{ fontSize: 13, color: "var(--text-2)", marginTop: 2 }}>{head.sub}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {!UTILITY.includes(sim.activeScreen) && (
              <>
                <div className="mono" style={{ fontSize: 12.5, color: "var(--text-3)" }}>
                  Cycle <span style={{ color: "var(--text)", fontWeight: 600 }}>{String(sim.cycle).padStart(2, "0")}</span>
                </div>
                <Button variant="primary" icon={sim.isRunning ? "pause" : "play"} onClick={sim.runCycle} disabled={sim.isRunning}>
                  {sim.isRunning ? "Running cycle…" : "Run cycle"}
                </Button>
              </>
            )}
            <Tweaks />
          </div>
        </header>
        <div style={{ padding: "24px 28px", flex: 1 }}>{children}</div>
      </main>
    </div>
  );
}
