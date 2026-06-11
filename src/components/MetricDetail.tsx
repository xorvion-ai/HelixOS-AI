"use client";

import { CSSProperties, useId } from "react";
import { Card, Icon } from "./ui";

export type DeltaKind = "pct" | "pp" | "money";

export type MetricSeries = {
  key: string;
  short: string;            // tab label, e.g. "MRR"
  label: string;            // full label, e.g. "Monthly Recurring Revenue"
  subtitle: string;
  hue: number;
  lowerBetter?: boolean;
  deltaKind: DeltaKind;
  format: (v: number) => string; // self-contained value display
  cycles: number[];
  values: number[];
};

type Delta = { up: boolean; good: boolean; text: string } | null;

function delta(s: MetricSeries, cur: number, prev: number | undefined): Delta {
  if (prev == null) return null;
  const up = cur > prev;
  const good = s.lowerBetter ? cur < prev : cur > prev;
  let text: string;
  if (s.deltaKind === "pct") text = Math.abs(prev ? ((cur - prev) / prev) * 100 : 0).toFixed(1) + "%";
  else if (s.deltaKind === "pp") text = Math.abs((cur - prev) * 100).toFixed(1) + "pp";
  else text = "$" + Math.abs(Math.round(cur - prev));
  return { up, good, text };
}

function DeltaTag({ d, big, signed }: { d: Delta; big?: boolean; signed?: boolean }) {
  if (!d) return <span className="mono" style={{ color: "var(--text-3)", fontSize: big ? 18 : 12.5 }}>—</span>;
  const color = d.good ? "var(--ok)" : "var(--danger)";
  // arrow mode (badge/table) shows ↑/↓ + magnitude; signed mode (stats) shows ±.
  const prefix = signed ? (d.up ? "+" : "-") : d.up ? "↑ " : "↓ ";
  return (
    <span className="mono" style={{ color, fontWeight: 600, fontSize: big ? 18 : 12.5 }}>{prefix}{d.text}</span>
  );
}

// Rich, trackable KPI panel: switch metrics via tabs, see the full line chart,
// a cycle-by-cycle table, and summary stats. Opens below the KPI cards.
export function MetricDetail({ series, activeKey, onSelect, onClose }: {
  series: MetricSeries[]; activeKey: string; onSelect: (key: string) => void; onClose: () => void;
}) {
  const s = series.find((x) => x.key === activeKey) ?? series[0];
  const { values, cycles, format, hue } = s;
  const stroke = `oklch(0.62 0.14 ${hue})`;
  const gid = "mg" + useId().replace(/:/g, "");

  const n = values.length;
  const cur = values[n - 1], prev = values[n - 2];
  const first = values[0];
  const min = Math.min(...values), max = Math.max(...values);
  const avg = values.reduce((a, b) => a + b, 0) / n;
  const thisCycle = delta(s, cur, prev);
  const allTime = delta(s, cur, first);
  const peakIdx = s.lowerBetter ? values.indexOf(min) : values.indexOf(max);
  const peakVal = s.lowerBetter ? min : max;

  // chart geometry (y labels reserved on the left)
  const W = 560, H = 232, padL = 52, padR = 10, padT = 16, padB = 26;
  const lo = min - (max - min || 1) * 0.12;
  const hi = max + (max - min || 1) * 0.12;
  const X = (i: number) => padL + (i / (n - 1 || 1)) * (W - padL - padR);
  const Y = (v: number) => padT + (1 - (v - lo) / (hi - lo || 1)) * (H - padT - padB);
  const pts = values.map((v, i) => [X(i), Y(v)] as const);
  const line = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
  const area = `${line} L${X(n - 1)} ${H - padB} L${padL} ${H - padB} Z`;
  const grid = [hi, lo + (hi - lo) * 0.66, lo + (hi - lo) * 0.33, lo];

  const tab = (active: boolean): CSSProperties => ({
    padding: "5px 12px", borderRadius: 8, fontSize: 12.5, fontWeight: 600, border: "none", cursor: "pointer",
    background: active ? "var(--surface)" : "transparent", color: active ? "var(--text)" : "var(--text-2)",
    boxShadow: active ? "var(--shadow-sm)" : "none",
  });

  return (
    <Card pad="0" style={{ overflow: "hidden" }}>
      {/* header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, padding: "var(--s4) var(--s5)", borderBottom: "1px solid var(--border)", flexWrap: "wrap" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <span style={{ width: 9, height: 9, borderRadius: 99, background: stroke }} />
            <span style={{ fontWeight: 700, fontSize: 15.5 }}>{s.label}</span>
            {thisCycle && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 99, fontSize: 12, background: thisCycle.good ? "var(--ok-soft)" : "var(--danger-soft)" }}>
                <DeltaTag d={thisCycle} /> <span style={{ color: "var(--text-2)", fontWeight: 500 }}>this cycle</span>
              </span>
            )}
          </div>
          <div style={{ fontSize: 12.5, color: "var(--text-2)", marginTop: 5 }}>{s.subtitle}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ display: "flex", gap: 2, padding: 3, borderRadius: 10, background: "var(--bg-sunken)" }}>
            {series.map((m) => (
              <button key={m.key} type="button" onClick={() => onSelect(m.key)} style={tab(m.key === s.key)}>{m.short}</button>
            ))}
          </div>
          <button type="button" onClick={onClose} style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "transparent", border: "none", color: "var(--text-2)", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
            <Icon name="x" size={14} /> Close
          </button>
        </div>
      </div>

      {/* body: chart + stats (left) · cycle-by-cycle (right) */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 232px" }}>
        <div style={{ padding: "var(--s5) var(--s5) var(--s4)" }}>
          <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: "block", overflow: "visible" }}>
            <defs>
              <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={stroke} stopOpacity="0.16" />
                <stop offset="100%" stopColor={stroke} stopOpacity="0" />
              </linearGradient>
            </defs>
            {grid.map((gv, i) => (
              <g key={i}>
                <line x1={padL} x2={W - padR} y1={Y(gv)} y2={Y(gv)} stroke="var(--border)" strokeWidth="1" strokeDasharray="2 5" />
                <text x={padL - 8} y={Y(gv) + 3} fontSize="10" fill="var(--text-3)" textAnchor="end" className="mono">{format(gv)}</text>
              </g>
            ))}
            <path d={area} fill={`url(#${gid})`} />
            <path d={line} fill="none" stroke={stroke} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            {pts.map((p, i) => (
              <g key={i}>
                <circle cx={p[0]} cy={p[1]} r="3.4" fill="var(--surface)" stroke={stroke} strokeWidth="2" />
                <text x={p[0]} y={H - padB + 16} fontSize="10" fill="var(--text-3)" textAnchor="middle" className="mono">C{cycles[i]}</text>
              </g>
            ))}
          </svg>

          {/* stats */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "20px 28px", marginTop: 18 }}>
            <StatCell label="Current" value={format(cur)} sub={`cycle ${cycles[n - 1]}`} accent />
            <StatCell label="Last cycle" node={<DeltaTag d={thisCycle} big signed />} sub={prev != null ? `from ${format(prev)}` : ""} />
            <StatCell label="All time" node={<DeltaTag d={allTime} big signed />} sub={`since cycle ${cycles[0]}`} />
            <StatCell label="Average" value={format(Math.round(avg))} sub={`${n} cycles`} />
            <StatCell label={s.lowerBetter ? "Best (low)" : "Peak"} value={format(peakVal)} sub={`cycle ${cycles[peakIdx]}`} />
          </div>
        </div>

        {/* cycle-by-cycle */}
        <div style={{ borderLeft: "1px solid var(--border)", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "12px var(--s4)", fontSize: 11, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--text-3)", borderBottom: "1px solid var(--border)" }}>Cycle by cycle</div>
          <div style={{ flex: 1, overflowY: "auto" }}>
            {values.map((v, i) => i).reverse().map((i) => {
              const d = delta(s, values[i], values[i - 1]);
              const isCur = i === n - 1;
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px var(--s4)", borderBottom: "1px solid var(--border)", background: isCur ? "var(--accent-soft)" : "transparent" }}>
                  <span className="mono" style={{ fontSize: 11.5, color: "var(--text-3)", width: 22 }}>C{cycles[i]}</span>
                  <span className="mono tnum" style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>{format(values[i])}</span>
                  <span style={{ fontSize: 12 }}><DeltaTag d={d} /></span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Card>
  );
}

function StatCell({ label, value, node, sub, accent }: { label: string; value?: string; node?: React.ReactNode; sub?: string; accent?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: 10.5, color: "var(--text-3)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em" }}>{label}</div>
      <div className="mono tnum" style={{ fontSize: 18, fontWeight: 600, marginTop: 4, color: accent ? "var(--accent-strong)" : "var(--text)" }}>
        {node ?? value}
      </div>
      {sub && <div className="mono" style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}
