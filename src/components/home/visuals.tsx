"use client";

// Homepage visuals — brand orb, hero orbit, scale-to-fit, the static Command
// Center "screenshot", and the orchestrator hub. Ported from the design
// handoff's home-extras.jsx into production React/TS. The showcase frame is a
// faithful *static* replica (no backend / providers) so the landing page is
// fast and self-contained; it reuses the real OrgChart + UI primitives.

import { CSSProperties, ReactNode, useEffect, useRef, useState } from "react";
import { BrandMark } from "@/components/BrandMark";
import { Wordmark } from "@/components/Wordmark";
import { AgentGlyph, Badge, Card, Icon, Sparkline } from "@/components/ui";
import { OrgChart } from "@/components/OrgChart";
import { SHOWCASE_APPROVALS, SHOWCASE_FEED, SHOWCASE_HISTORY } from "@/lib/homeData";

// ---- soft disc that cradles the mark (hub + hero centerpiece) ---------
export function BrandOrb({ size = 120, markScale = 0.48 }: { size?: number; markScale?: number }) {
  return (
    <div style={{
      position: "relative", width: size, height: size, borderRadius: "50%", display: "grid", placeItems: "center",
      background: "radial-gradient(circle at 40% 32%, var(--surface), var(--bg-sunken) 78%)",
      boxShadow: "var(--shadow-lg), inset 0 1px 1px oklch(1 0 0 / 0.6), 0 0 0 1px var(--border)",
    }}>
      <div style={{
        position: "absolute", inset: 0, borderRadius: "50%", pointerEvents: "none",
        background: "radial-gradient(circle at 50% 118%, oklch(0.72 0.14 var(--acc-h) / 0.28), transparent 62%)",
      }} />
      <BrandMark size={size * markScale} glow />
    </div>
  );
}

// ---- hero centerpiece: orb + concentric rings + orbiting dots ---------
const heroOrbitCss =
  "@keyframes helix-halo { 0%,100% { opacity:.45; transform:scale(.9); } 50% { opacity:1; transform:scale(1.08); } }";

export function HeroOrbit({ size = 360 }: { size?: number }) {
  const c = size / 2;
  const rings = [0.92, 0.66, 0.42];
  // Dots grouped per ring so each group can orbit the centre at its own pace.
  const ringDots = [
    { r: 0.92, angles: [-18, 150, 268], dur: 52, reverse: false },
    { r: 0.66, angles: [70, 220], dur: 38, reverse: true },
    { r: 0.42, angles: [-100, 60], dur: 27, reverse: false },
  ];
  return (
    <div style={{ position: "relative", width: size, height: size, margin: "0 auto", maxWidth: "100%" }}>
      <style>{heroOrbitCss}</style>
      {/* ambient aurora wash */}
      <div style={{
        position: "absolute", inset: "-14%", borderRadius: "50%", pointerEvents: "none",
        background: "radial-gradient(circle, oklch(0.72 0.14 var(--acc-h) / 0.16), transparent 60%)",
        animation: "aurora 16s ease-in-out infinite",
      }} />
      {/* soft pulsing halo cradling the orb */}
      <div style={{
        position: "absolute", inset: "27%", borderRadius: "50%", pointerEvents: "none",
        background: "radial-gradient(circle, oklch(0.72 0.16 var(--acc-h) / 0.22), transparent 70%)",
        animation: "helix-halo 4.5s ease-in-out infinite",
      }} />
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        {rings.map((rr, i) => (
          <circle key={i} cx={c} cy={c} r={c * rr} fill="none"
            stroke="var(--border-strong)" strokeWidth="1"
            strokeDasharray={i === 0 ? "2 7" : i === 1 ? "none" : "1 6"}
            strokeOpacity={i === 1 ? 0.55 : 0.9}
            style={i === 0
              ? { transformOrigin: "center", animation: "spin 60s linear infinite" }
              : i === 2
                ? { transformOrigin: "center", animation: "spin 40s linear infinite reverse" }
                : undefined} />
        ))}
        {ringDots.map((ring, gi) => (
          <g key={gi} style={{
            transformOrigin: `${c}px ${c}px`,
            animation: `spin ${ring.dur}s linear infinite${ring.reverse ? " reverse" : ""}`,
          }}>
            {ring.angles.map((a, di) => {
              const rad = (a * Math.PI) / 180;
              return <circle key={di}
                cx={c + Math.cos(rad) * c * ring.r} cy={c + Math.sin(rad) * c * ring.r} r="2.8"
                fill="var(--accent)"
                style={{
                  filter: "drop-shadow(0 0 4px oklch(0.72 0.14 var(--acc-h) / 0.7))",
                  animation: `pulse-dot ${3 + di}s ease-in-out ${(gi * 0.6 + di * 0.4).toFixed(1)}s infinite`,
                }} />;
            })}
          </g>
        ))}
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", animation: "float-y 7s ease-in-out infinite" }}>
        <BrandOrb size={size * 0.42} markScale={0.52} />
      </div>
    </div>
  );
}

// ---- scale a fixed-width design down to fit its container -------------
export function ScaleToFit({ designWidth = 1240, children }: { designWidth?: number; children: ReactNode }) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [s, setS] = useState(1);
  const [h, setH] = useState(0);
  useEffect(() => {
    const measure = () => {
      const ow = outer.current ? outer.current.clientWidth : designWidth;
      const sc = Math.min(1, ow / designWidth);
      setS(sc);
      const ih = inner.current ? inner.current.offsetHeight : 0;
      setH(ih * sc);
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (outer.current) ro.observe(outer.current);
    if (inner.current) ro.observe(inner.current);
    const t = setTimeout(measure, 300);
    return () => { ro.disconnect(); clearTimeout(t); };
  }, [designWidth]);
  return (
    <div ref={outer} style={{ width: "100%", height: h, overflow: "hidden" }}>
      <div ref={inner} style={{ width: designWidth, transform: `scale(${s})`, transformOrigin: "top left" }}>
        {children}
      </div>
    </div>
  );
}

// ---- static Command Center "screenshot" -------------------------------
const FRAME_NAV: [string, string, string, boolean?, number?][] = [
  ["command", "Command Center", "command", true],
  ["orgchart", "Live Org Chart", "org"],
  ["trace", "Observability", "trace"],
  ["agents", "Agents", "agents"],
  ["approvals", "Approvals", "approvals", false, 2],
  ["knowledge", "Knowledge Base", "knowledge"],
  ["memory", "Memory", "memory"],
  ["scenario", "Simulation", "scenario"],
];

function FrameStat({ label, value, unit, delta, good, spark, hue }: {
  label: string; value: string; unit?: string; delta: string; good: boolean; spark: number[]; hue: number;
}) {
  return (
    <Card pad="var(--s5)">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-2)" }}>{label}</div>
        <Badge tone={good ? "ok" : "danger"} icon={good ? "arrowUp" : "arrowDown"}>{delta}</Badge>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginTop: 10 }}>
        <span className="mono tnum" style={{ fontSize: 30, fontWeight: 600, letterSpacing: "-.02em" }}>{value}</span>
        {unit && <span className="mono" style={{ fontSize: 14, color: "var(--text-3)" }}>{unit}</span>}
      </div>
      <div style={{ marginTop: 14, marginInline: -2 }}>
        <Sparkline data={spark} h={40} stroke={`oklch(0.62 0.14 ${hue})`} />
      </div>
    </Card>
  );
}

export function AppFrameMock() {
  const hist = SHOWCASE_HISTORY;
  const state = hist[hist.length - 1];
  return (
    <div style={{
      display: "flex", height: 768, background: "var(--bg)", border: "1px solid var(--border-strong)",
      borderRadius: 16, overflow: "hidden", boxShadow: "var(--shadow-lg)", pointerEvents: "none",
    }}>
      {/* sidebar */}
      <aside style={{ width: 214, flexShrink: 0, borderRight: "1px solid var(--border)", background: "var(--surface)", display: "flex", flexDirection: "column", padding: "18px 14px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 8px 20px" }}>
          <BrandMark size={30} />
          <div style={{ lineHeight: 1 }}>
            <Wordmark size={18} />
            <div className="mono" style={{ fontSize: 9.5, color: "var(--text-3)", letterSpacing: ".16em", marginTop: 3 }}>AGENTIC AI</div>
          </div>
        </div>
        <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {FRAME_NAV.map(([id, label, icon, active, badge]) => (
            <div key={id} style={{
              display: "flex", alignItems: "center", gap: 11, padding: "9px 11px", borderRadius: 9,
              background: active ? "var(--accent-soft)" : "transparent",
              color: active ? "var(--accent-strong)" : "var(--text-2)", fontSize: 13.5, fontWeight: active ? 650 : 550,
            }}>
              <Icon name={icon} size={17} stroke={active ? 1.9 : 1.6} />
              <span style={{ flex: 1 }}>{label}</span>
              {badge && <span style={{ minWidth: 18, height: 18, padding: "0 5px", borderRadius: 99, background: "var(--warn)", color: "var(--accent-fg)", fontSize: 11, fontWeight: 700, display: "grid", placeItems: "center" }}>{badge}</span>}
            </div>
          ))}
        </nav>
        <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
          {/* Support / Privacy / Terms — vertical, matching the real app */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {([["life", "Support"], ["shield", "Privacy"], ["scroll", "Terms & Conditions"]] as [string, string][]).map(([icon, label]) => (
              <div key={label} style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                padding: "7px 10px", borderRadius: 9, fontSize: 12, fontWeight: 600,
                border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-2)",
              }}>
                <Icon name={icon} size={14} /> {label}
              </div>
            ))}
          </div>
          {/* user card */}
          <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "10px 11px", borderRadius: 10, background: "var(--bg-sunken)", border: "1px solid var(--border)" }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: "var(--accent)", color: "var(--accent-fg)", display: "grid", placeItems: "center", fontWeight: 700, fontSize: 13 }}>A</div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600 }}>Andre · Founder</div>
              <div style={{ fontSize: 11, color: "var(--text-3)" }}>CouponEx workspace</div>
            </div>
          </div>
        </div>
      </aside>

      {/* main */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "16px 28px", borderBottom: "1px solid var(--border)" }}>
          <div>
            <div style={{ fontSize: 19, fontWeight: 700, letterSpacing: "-.01em" }}>Command Center</div>
            <div style={{ fontSize: 12.5, color: "var(--text-2)", marginTop: 2 }}>Live business state + the autonomous org at a glance</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, color: "var(--text-3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".04em" }}>Cycle</div>
              <div className="mono tnum" style={{ fontSize: 17, fontWeight: 600 }}>{String(state.cycle).padStart(2, "0")}</div>
            </div>
            <div style={{ width: 1, height: 30, background: "var(--border)" }} />
            <div style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "9px 15px", borderRadius: "var(--r2)", background: "var(--accent)", color: "var(--accent-fg)", fontWeight: 600, fontSize: 13.5 }}>
              <span style={{ width: 14, height: 14, border: "2px solid currentColor", borderRightColor: "transparent", borderRadius: 99, display: "inline-block", animation: "spin .7s linear infinite" }} /> Running cycle…
            </div>
          </div>
        </header>

        <div style={{ flex: 1, overflow: "hidden", padding: "24px 28px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: "var(--s5)", alignItems: "start" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--s5)" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "var(--s4)" }}>
                <FrameStat label="Monthly Recurring Rev" value="$77.4k" delta="8.7%" good spark={hist.map((c) => c.mrr)} hue={48} />
                <FrameStat label="Active Users" value="14,580" delta="6.6%" good spark={hist.map((c) => c.users)} hue={250} />
                <FrameStat label="Churn Rate" value="4.9" unit="%" delta="0.2pp" good spark={hist.map((c) => c.churn)} hue={25} />
                <FrameStat label="Customer Acq. Cost" value="$101" delta="$3" good spark={hist.map((c) => c.cac)} hue={155} />
              </div>
              <Card pad="0" style={{ overflow: "hidden" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "var(--s4) var(--s5)", borderBottom: "1px solid var(--border)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                    <span style={{ fontWeight: 650, fontSize: 14 }}>Live org chart</span>
                    <Badge tone="accent" dot>Cycle running</Badge>
                  </div>
                </div>
                <div style={{ height: 392, padding: "var(--s5) var(--s4) var(--s4)" }}>
                  <OrgChart layout="tree" compact ambient
                    statuses={{ marketing: "working" }}
                    activeEdge={["operations", "marketing"]} activeNodes={["operations", "marketing"]} />
                </div>
              </Card>
            </div>

            {/* right rail */}
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--s5)" }}>
              <Card style={{ background: "var(--accent-soft)", borderColor: "var(--accent-line)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, fontWeight: 700, color: "var(--accent-strong)", textTransform: "uppercase", letterSpacing: ".03em" }}>
                  <Icon name="target" size={14} /> Active goal · cycle {state.cycle}
                </div>
                <div style={{ fontSize: 15, fontWeight: 600, marginTop: 8, lineHeight: 1.4 }}>Grow MRR 8% while holding CAC under $105</div>
                <div style={{ display: "flex", gap: 18, marginTop: 14 }}>
                  <div>
                    <div style={{ fontSize: 11, color: "var(--text-2)", fontWeight: 600 }}>MRR growth</div>
                    <div className="mono" style={{ fontSize: 18, fontWeight: 600, color: "var(--ok)" }}>+8.7%</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: "var(--text-2)", fontWeight: 600 }}>CAC</div>
                    <div className="mono" style={{ fontSize: 18, fontWeight: 600, color: "var(--ok)" }}>${state.cac}</div>
                  </div>
                </div>
              </Card>
              <Card pad="0">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "var(--s4) var(--s5)", borderBottom: "1px solid var(--border)" }}>
                  <span style={{ fontWeight: 650, fontSize: 14 }}>Pending approvals</span>
                  <Badge tone="warn">{SHOWCASE_APPROVALS.length}</Badge>
                </div>
                {SHOWCASE_APPROVALS.map((ap) => (
                  <div key={ap.id} style={{ padding: "var(--s4) var(--s5)", borderBottom: "1px solid var(--border)" }}>
                    <div style={{ display: "flex", gap: 9, alignItems: "center", marginBottom: 8 }}>
                      <AgentGlyph id={ap.agent} size={26} />
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{ap.title}</span>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 11px", fontSize: 12.5, fontWeight: 600, borderRadius: "var(--r2)", background: "var(--accent)", color: "var(--accent-fg)" }}><Icon name="check" size={14} stroke={2} /> Approve</span>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 11px", fontSize: 12.5, fontWeight: 600, borderRadius: "var(--r2)", color: "var(--text-2)" }}><Icon name="x" size={14} stroke={2} /> Reject</span>
                    </div>
                  </div>
                ))}
              </Card>
              <Card pad="0">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "var(--s4) var(--s5)", borderBottom: "1px solid var(--border)" }}>
                  <span style={{ fontWeight: 650, fontSize: 14 }}>Agent activity</span>
                  <span className="mono" style={{ fontSize: 11.5, color: "var(--text-3)" }}>realtime</span>
                </div>
                <div>
                  {SHOWCASE_FEED.map((m, i) => (
                    <div key={i} style={{ display: "flex", gap: 11, padding: "11px var(--s4)", borderBottom: "1px solid var(--border)" }}>
                      <AgentGlyph id={m.from} size={28} />
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "var(--text-2)" }}>
                          <span style={{ fontWeight: 650, color: "var(--text)", textTransform: "capitalize" }}>{m.from}</span>
                          <Icon name="arrowRight" size={13} style={{ color: "var(--text-3)" }} />
                          <span style={{ fontWeight: 650, color: "var(--text)", textTransform: "capitalize" }}>{m.to}</span>
                          <span className="mono" style={{ marginLeft: "auto", fontSize: 11.5, color: "var(--text-3)" }}>{m.ts}</span>
                        </div>
                        <div style={{ fontSize: 13, color: "var(--text-2)", marginTop: 3, lineHeight: 1.45 }}>{m.message}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---- orchestrator hub: HELIXOS CORE + radiating capability cards ------
function CapNode({ icon, title, sub, style }: { icon: string; title: string; sub: string; style?: CSSProperties }) {
  return (
    <div style={{
      position: "absolute", transform: "translate(-50%,-50%)", width: 216, display: "flex", alignItems: "center", gap: 12,
      padding: "13px 15px", borderRadius: 14, background: "var(--surface)", border: "1px solid var(--border)",
      boxShadow: "var(--shadow-md)", ...style,
    }}>
      <div style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0, display: "grid", placeItems: "center", background: "var(--accent-soft)", color: "var(--accent-strong)" }}>
        <Icon name={icon} size={19} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 15 }}>{title}</div>
        <div className="mono" style={{ fontSize: 10, color: "var(--text-3)", letterSpacing: ".12em", marginTop: 3 }}>{sub}</div>
      </div>
    </div>
  );
}

export function OrchestratorHub() {
  const nodes = [
    { icon: "brain", title: "Reasoning", sub: "PLAN · DECIDE", x: 16, y: 16 },
    { icon: "knowledge", title: "Knowledge", sub: "RETRIEVE · GROUND", x: 50, y: 9 },
    { icon: "bolt", title: "Tools", sub: "CALL · EXECUTE", x: 84, y: 16 },
    { icon: "memory", title: "Memory", sub: "RECALL · LEARN", x: 16, y: 84 },
    { icon: "approvals", title: "Approvals", sub: "PAUSE · APPROVE", x: 50, y: 91 },
    { icon: "trace", title: "Observability", sub: "TRACE · INSPECT", x: 84, y: 84 },
  ];
  return (
    <div style={{ position: "relative", width: "100%", maxWidth: 1000, height: 600, margin: "var(--s8) auto 0" }}>
      <svg viewBox="0 0 1000 600" preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible" }}>
        {nodes.map((n, i) => (
          <g key={i}>
            <line x1="500" y1="300" x2={n.x * 10} y2={n.y * 6} stroke="var(--border-strong)" strokeWidth="1.2" strokeDasharray="2 7" strokeOpacity="0.85" />
            <line x1="500" y1="300" x2={n.x * 10} y2={n.y * 6} stroke="var(--accent)" strokeWidth="1.4" strokeDasharray="2 26" strokeLinecap="round" style={{ animation: `flow ${1.6 + i * 0.2}s linear infinite`, opacity: 0.7 }} />
          </g>
        ))}
      </svg>
      <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
        <div style={{ position: "relative", display: "grid", placeItems: "center" }}>
          <div style={{ position: "absolute", width: 220, height: 220, borderRadius: "50%", border: "1px solid var(--border)" }} />
          <div style={{ position: "absolute", width: 168, height: 168, borderRadius: "50%", border: "1px dashed var(--border-strong)", animation: "spin 50s linear infinite" }} />
          <BrandOrb size={120} markScale={0.46} />
        </div>
        <div style={{ textAlign: "center" }}>
          <div className="mono" style={{ fontSize: 15, fontWeight: 600, letterSpacing: ".22em", color: "var(--text)" }}>HELIXOS CORE</div>
          <div className="mono" style={{ fontSize: 11, letterSpacing: ".2em", color: "var(--text-3)", marginTop: 4 }}>// ORCHESTRATOR</div>
        </div>
      </div>
      {nodes.map((n, i) => (
        <CapNode key={i} icon={n.icon} title={n.title} sub={n.sub} style={{ left: n.x + "%", top: n.y + "%" }} />
      ))}
    </div>
  );
}
