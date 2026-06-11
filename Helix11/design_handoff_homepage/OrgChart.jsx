/* ============================================================
   HelixOS AI — Live AI Org Chart
   Hierarchical tree (default) or radial. Edges pulse + a
   packet travels along the active edge during a cycle.
   ============================================================ */
const { useState: useStateOC, useRef: useRefOC, useEffect: useEffectOC } = React;

// node layout in normalized 0..100 space
const TREE_POS = {
  founder:    { x: 50, y: 13 },
  operations: { x: 50, y: 42 },
  sales:      { x: 9,  y: 77 },
  research:   { x: 25.4, y: 77 },
  marketing:  { x: 41.8, y: 77 },
  analytics:  { x: 58.2, y: 77 },
  finance:    { x: 74.6, y: 77 },
  support:    { x: 91, y: 77 },
};

function radialPos(r = 39) {
  const out = { operations: { x: 50, y: 50 } };
  const ring = ["founder", "marketing", "analytics", "finance", "support", "research", "sales"];
  ring.forEach((id, i) => {
    const ang = (-90 + (360 / ring.length) * i) * (Math.PI / 180);
    out[id] = { x: 50 + Math.cos(ang) * r, y: 50 + Math.sin(ang) * (r * 0.92) };
  });
  return out;
}

function useSize(ref) {
  const [s, setS] = useStateOC({ w: 800, h: 460 });
  useEffectOC(() => {
    if (!ref.current) return;
    const measure = () => {
      const r = ref.current.getBoundingClientRect();
      if (r.width) setS({ w: r.width, h: r.height });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(ref.current);
    // a couple of deferred measures in case layout settles after fonts/animation
    const t1 = setTimeout(measure, 120);
    const t2 = setTimeout(measure, 500);
    return () => { ro.disconnect(); clearTimeout(t1); clearTimeout(t2); };
  }, []);
  return s;
}

function curve(a, b, layout) {
  // returns an SVG path string between two points (px)
  if (layout === "radial") return `M${a.x} ${a.y} L${b.x} ${b.y}`;
  const dy = b.y - a.y;
  const c1y = a.y + dy * 0.55, c2y = b.y - dy * 0.55;
  return `M${a.x} ${a.y} C${a.x} ${c1y} ${b.x} ${c2y} ${b.x} ${b.y}`;
}

function OrgChart({ statuses = {}, activeEdge, activeNodes = [], onSelect, layout = "tree", compact, only, ambient }) {
  const ref = useRefOC(null);
  const { w, h } = useSize(ref);
  const H = window.HELIX;
  const keep = (id) => !only || only.includes(id);
  const POS0 = layout === "radial" ? radialPos(compact ? 35 : 39) : TREE_POS;
  // when filtered to the Phase-1 four (hero), spread the bottom pair wider
  const phase1Hero = only && only.length <= 4 && layout !== "radial";
  const POS1 = phase1Hero
    ? { ...POS0, marketing: { x: 30, y: 76 }, analytics: { x: 70, y: 76 } }
    : POS0;
  // in the compact embedded chart, squeeze the wide bottom row inward so
  // the outermost nodes don't clip against the container edges
  const POS = (compact && layout !== "radial")
    ? Object.fromEntries(Object.entries(POS1).map(([k, p]) => [k, { x: 50 + (p.x - 50) * 0.78, y: p.y }]))
    : POS1;
  const px = (id) => ({ x: (POS[id].x / 100) * w, y: (POS[id].y / 100) * h });

  // edges: org tree + the analytics→founder feedback loop
  const edges = [
    { from: "founder", to: "operations" },
    { from: "operations", to: "sales" },
    { from: "operations", to: "research" },
    { from: "operations", to: "marketing" },
    { from: "operations", to: "analytics" },
    { from: "operations", to: "finance" },
    { from: "operations", to: "support" },
    { from: "analytics", to: "founder", loop: true },
  ].filter((e) => keep(e.from) && keep(e.to));

  const isActive = (e) => activeEdge && (
    (activeEdge[0] === e.from && activeEdge[1] === e.to) ||
    (activeEdge[0] === e.to && activeEdge[1] === e.from)
  );

  const order = ["founder", "operations", "sales", "research", "marketing", "analytics", "finance", "support"].filter(keep);

  return (
    <div ref={ref} style={{ position: "relative", width: "100%", height: "100%", minHeight: 300 }}>
      <svg width={w} height={h} style={{ position: "absolute", inset: 0, overflow: "visible", pointerEvents: "none" }}>
        <defs>
          <filter id="glow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="3" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        {edges.map((e, i) => {
          const a = px(e.from), b = px(e.to);
          // offset loop edge outward so it doesn't overlap the down edge
          let p;
          if (e.loop && layout === "tree") {
            p = `M${a.x} ${a.y} C${a.x + w * 0.32} ${a.y - h * 0.05} ${b.x + w * 0.3} ${b.y + h * 0.2} ${b.x} ${b.y}`;
          } else {
            p = curve(a, b, layout);
          }
          const act = isActive(e);
          const locked = statuses[e.to] === "locked" || statuses[e.from] === "locked"
            || H.agentById(e.to)?.phase === 2 || H.agentById(e.from)?.phase === 2;
          return (
            <g key={i}>
              <path d={p} fill="none"
                stroke={act ? "var(--accent)" : "var(--border-strong)"}
                strokeWidth={act ? 2.4 : 1.4}
                strokeDasharray={e.loop ? "4 4" : "none"}
                strokeOpacity={locked && !act ? 0.4 : 1}
                style={{ transition: "stroke .3s, stroke-width .3s" }}
                filter={act ? "url(#glow)" : "none"} />
              {act && (
                <>
                  <path d={p} fill="none" stroke="var(--accent)" strokeWidth="2.4"
                    strokeDasharray="2 14" strokeLinecap="round"
                    style={{ animation: "flow 0.7s linear infinite", opacity: 0.9 }} />
                  <circle r="4.5" fill="var(--accent)" filter="url(#glow)">
                    <animateMotion dur="0.9s" repeatCount="indefinite" path={p} rotate="auto" />
                  </circle>
                </>
              )}
            </g>
          );
        })}
      </svg>

      {order.map((id) => {
        const a = H.agentById(id);
        const p = px(id);
        const st = statuses[id] || a.status;
        const locked = st === "locked";
        const active = activeNodes.includes(id);
        const hue = AGENT_HUE[id];
        return (
          <button key={id} onClick={() => !locked && onSelect && onSelect(id)}
            style={{
              position: "absolute", left: p.x, top: p.y, transform: "translate(-50%,-50%)",
              display: "flex", alignItems: "center", gap: 9,
              padding: compact ? "6px 10px 6px 6px" : "9px 14px 9px 9px",
              background: "var(--surface)",
              border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
              borderRadius: 13, boxShadow: active ? "var(--shadow-md)" : "var(--shadow-sm)",
              cursor: locked ? "default" : "pointer", opacity: locked ? 0.62 : 1,
              transition: "border-color .25s, box-shadow .25s, transform .25s",
              transform: active ? "translate(-50%,-50%) scale(1.04)" : "translate(-50%,-50%)",
              animation: ambient && !active && !locked ? `breathe 3.4s ease-in-out ${(order.indexOf(id) % 5) * 0.5}s infinite` : "none",
              whiteSpace: "nowrap", textAlign: "left",
            }}>
            <AgentGlyph id={id} size={compact ? 30 : 36} active={active} status={st} />
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontWeight: 650, fontSize: compact ? 12.5 : 14, color: "var(--text)" }}>{a.name}</span>
                {a.phase === 2 && !compact && <span style={{ fontSize: 9.5, fontWeight: 700, color: "var(--text-3)", border: "1px solid var(--border)", borderRadius: 5, padding: "1px 4px" }}>P2</span>}
              </div>
              {!compact && !locked && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                  <StatusPill status={active ? "working" : st} />
                </div>
              )}
            </div>
            {active && (
              <span style={{ position: "absolute", right: -4, top: -4, width: 10, height: 10 }}>
                <span style={{ position: "absolute", inset: 0, borderRadius: 99, background: "var(--accent)" }} />
                <span style={{ position: "absolute", inset: 0, borderRadius: 99, background: "var(--accent)", animation: "ping 1.2s ease-out infinite" }} />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

Object.assign(window, { OrgChart });
