/* ============================================================
   HelixOS AI — homepage visuals
   Brand mark · orb · hero orbit · live Command Center showcase ·
   orchestrator hub. Uses the existing (light/themed) palette.
   Loaded before intro.jsx.
   ============================================================ */
const { useState: useHX, useEffect: useHXEff, useRef: useHXRef } = React;

/* ---- HelixOS helix brand mark, scalable ---- */
function BrandMark({ size = 40, glow = false }) {
  return (
    <svg width={size} height={size} viewBox="0 0 26 26" aria-hidden="true"
      style={{ filter: glow ? `drop-shadow(0 0 12px oklch(0.7 0.13 var(--acc-h) / 0.5))` : "none", display: "block" }}>
      <line x1="7" y1="6" x2="19" y2="13" stroke="var(--accent)" strokeWidth="1.7" strokeLinecap="round" />
      <line x1="19" y1="13" x2="7" y2="20" stroke="var(--accent)" strokeWidth="1.7" strokeLinecap="round" />
      <line x1="7" y1="6" x2="7" y2="20" stroke="var(--border-strong)" strokeWidth="1.7" strokeLinecap="round" />
      <circle cx="7" cy="6" r="3" fill="var(--accent)" />
      <circle cx="19" cy="13" r="3" fill="var(--surface)" stroke="var(--accent)" strokeWidth="1.9" />
      <circle cx="7" cy="20" r="3" fill="var(--surface)" stroke="var(--border-strong)" strokeWidth="1.9" />
    </svg>
  );
}

/* ---- soft disc that cradles the mark (hub + hero centerpiece) ---- */
function BrandOrb({ size = 120, markScale = 0.48 }) {
  return (
    <div style={{ position: "relative", width: size, height: size, borderRadius: "50%", display: "grid", placeItems: "center",
      background: "radial-gradient(circle at 40% 32%, var(--surface), var(--bg-sunken) 78%)",
      boxShadow: "var(--shadow-lg), inset 0 1px 1px oklch(1 0 0 / 0.6), 0 0 0 1px var(--border)" }}>
      <div style={{ position: "absolute", inset: 0, borderRadius: "50%",
        background: "radial-gradient(circle at 50% 118%, oklch(0.72 0.14 var(--acc-h) / 0.28), transparent 62%)", pointerEvents: "none" }}></div>
      <BrandMark size={size * markScale} glow />
    </div>
  );
}

/* ---- hero centerpiece: orb + concentric rings + orbiting dots ---- */
function HeroOrbit({ size = 360 }) {
  const c = size / 2;
  const rings = [0.92, 0.66, 0.42];
  const dots = [
    { r: 0.92, a: -18 }, { r: 0.92, a: 150 },
    { r: 0.66, a: 70 }, { r: 0.66, a: 220 },
    { r: 0.42, a: -100 },
  ];
  return (
    <div style={{ position: "relative", width: size, height: size, margin: "0 auto" }}>
      <div style={{ position: "absolute", inset: "-14%", borderRadius: "50%",
        background: "radial-gradient(circle, oklch(0.72 0.14 var(--acc-h) / 0.16), transparent 60%)",
        animation: "aurora 16s ease-in-out infinite", pointerEvents: "none" }}></div>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        {rings.map((rr, i) => (
          <circle key={i} cx={c} cy={c} r={c * rr} fill="none"
            stroke="var(--border-strong)" strokeWidth="1"
            strokeDasharray={i === 0 ? "2 7" : i === 1 ? "none" : "1 6"}
            strokeOpacity={i === 1 ? 0.55 : 0.9}
            style={i === 0 ? { transformOrigin: "center", animation: "spin 60s linear infinite" } : i === 2 ? { transformOrigin: "center", animation: "spin 40s linear infinite reverse" } : null} />
        ))}
        {dots.map((d, i) => {
          const rad = (d.a * Math.PI) / 180;
          return <circle key={i} cx={c + Math.cos(rad) * c * d.r} cy={c + Math.sin(rad) * c * d.r} r="2.6"
            fill="var(--accent)" style={{ filter: "drop-shadow(0 0 4px oklch(0.72 0.14 var(--acc-h) / 0.7))" }} />;
        })}
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", animation: "float-y 7s ease-in-out infinite" }}>
        <BrandOrb size={size * 0.42} markScale={0.52} />
      </div>
    </div>
  );
}

/* ---- scale a fixed-width design down to fit its container ---- */
function ScaleToFit({ designWidth = 1240, children }) {
  const outer = useHXRef(null);
  const inner = useHXRef(null);
  const [s, setS] = useHX(1);
  const [h, setH] = useHX(0);
  useHXEff(() => {
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
  }, []);
  return (
    <div ref={outer} style={{ width: "100%", height: h, overflow: "hidden" }}>
      <div ref={inner} style={{ width: designWidth, transform: `scale(${s})`, transformOrigin: "top left" }}>
        {children}
      </div>
    </div>
  );
}

/* ---- faithful, non-interactive Command Center "screenshot" ---- */
const FRAME_NAV = [
  ["command", "Command Center", "command", true],
  ["orgchart", "Live Org Chart", "org"],
  ["trace", "Observability", "trace"],
  ["agents", "Agents", "agents"],
  ["approvals", "Approvals", "approvals", false, 2],
  ["knowledge", "Knowledge Base", "knowledge"],
  ["memory", "Memory", "memory"],
  ["scenario", "Simulation", "scenario"],
];

function AppFrameMock() {
  const H = window.HELIX;
  const history = H.CYCLE_HISTORY;
  const state = history[history.length - 1];
  const prev = history[history.length - 2];
  const mockCtx = {
    state, prev, history, cycle: state.cycle,
    scenario: H.SCENARIOS[0], liveLog: [],
    activeEdge: ["operations", "marketing"], activeNodes: ["operations", "marketing"],
    isRunning: true, approvals: H.APPROVALS, statuses: { marketing: "working" },
    bumped: {}, orgLayout: "radial",
    nav: () => {}, resolveApproval: () => {},
  };
  return (
    <div style={{ display: "flex", height: 768, background: "var(--bg)", border: "1px solid var(--border-strong)", borderRadius: 16, overflow: "hidden", boxShadow: "var(--shadow-lg)", pointerEvents: "none" }}>
      {/* sidebar */}
      <aside style={{ width: 214, flexShrink: 0, borderRight: "1px solid var(--border)", background: "var(--surface)", display: "flex", flexDirection: "column", padding: "18px 14px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 8px 20px" }}>
          <BrandMark size={30} />
          <div style={{ lineHeight: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 18, letterSpacing: "-.01em" }}>HelixOS</div>
            <div className="mono" style={{ fontSize: 9.5, color: "var(--text-3)", letterSpacing: ".16em", marginTop: 3 }}>AGENTIC AI</div>
          </div>
        </div>
        <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {FRAME_NAV.map(([id, label, icon, active, badge]) => (
            <div key={id} style={{ display: "flex", alignItems: "center", gap: 11, padding: "9px 11px", borderRadius: 9,
              background: active ? "var(--accent-soft)" : "transparent", color: active ? "var(--accent-strong)" : "var(--text-2)", fontSize: 13.5, fontWeight: active ? 650 : 550 }}>
              <Icon name={icon} size={17} stroke={active ? 1.9 : 1.6} />
              <span style={{ flex: 1 }}>{label}</span>
              {badge && <span style={{ minWidth: 18, height: 18, padding: "0 5px", borderRadius: 99, background: "var(--warn)", color: "var(--accent-fg)", fontSize: 11, fontWeight: 700, display: "grid", placeItems: "center" }}>{badge}</span>}
            </div>
          ))}
        </nav>
        <div style={{ marginTop: "auto", display: "flex", alignItems: "center", gap: 9, padding: "10px 11px", borderRadius: 10, background: "var(--bg-sunken)", border: "1px solid var(--border)" }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: "var(--accent)", color: "var(--accent-fg)", display: "grid", placeItems: "center", fontWeight: 700, fontSize: 13 }}>A</div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 12.5, fontWeight: 600 }}>Andre · Founder</div>
            <div style={{ fontSize: 11, color: "var(--text-3)" }}>CouponEx workspace</div>
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
            <div style={{ width: 1, height: 30, background: "var(--border)" }}></div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "9px 15px", borderRadius: "var(--r2)", background: "var(--accent)", color: "var(--accent-fg)", fontWeight: 600, fontSize: 13.5 }}>
              <span style={{ width: 14, height: 14, border: "2px solid currentColor", borderRightColor: "transparent", borderRadius: 99, display: "inline-block", animation: "spin .7s linear infinite" }}></span> Running cycle…
            </div>
          </div>
        </header>
        <div style={{ flex: 1, overflow: "hidden", padding: "24px 28px" }}>
          <CommandCenter ctx={mockCtx} />
        </div>
      </div>
    </div>
  );
}

/* ---- orchestrator hub: HELIXOS CORE + radiating capability cards ---- */
function CapNode({ icon, title, sub, style }) {
  return (
    <div style={{ position: "absolute", transform: "translate(-50%,-50%)", width: 216, display: "flex", alignItems: "center", gap: 12,
      padding: "13px 15px", borderRadius: 14, background: "var(--surface)", border: "1px solid var(--border)",
      boxShadow: "var(--shadow-md)", ...style }}>
      <div style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0, display: "grid", placeItems: "center",
        background: "var(--accent-soft)", color: "var(--accent-strong)" }}>
        <Icon name={icon} size={19} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 15 }}>{title}</div>
        <div className="mono" style={{ fontSize: 10, color: "var(--text-3)", letterSpacing: ".12em", marginTop: 3 }}>{sub}</div>
      </div>
    </div>
  );
}

function OrchestratorHub() {
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
          <div style={{ position: "absolute", width: 220, height: 220, borderRadius: "50%", border: "1px solid var(--border)" }}></div>
          <div style={{ position: "absolute", width: 168, height: 168, borderRadius: "50%", border: "1px dashed var(--border-strong)", animation: "spin 50s linear infinite" }}></div>
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

Object.assign(window, { BrandMark, BrandOrb, HeroOrbit, ScaleToFit, AppFrameMock, OrchestratorHub });
