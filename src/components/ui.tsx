"use client";

import { CSSProperties, ReactNode, useId, useMemo, useState } from "react";
import { AGENT_HUE, STATUS_META } from "@/lib/agents";
import { useAgents } from "./AgentsContext";

// ---- Icons (1.6px stroke, 24 grid) ------------------------------------
const PATHS: Record<string, string> = {
  command: "M4 6h16M4 12h10M4 18h7",
  org: "M12 4v4M5 20v-3a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v3M5 20h2M17 20h2M11 20h2M9 8h6v2H9z",
  trace: "M4 7h16M4 12h16M4 17h10",
  scenario: "M3 13a9 9 0 1 0 9-9v9z",
  agents: "M7 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM2 20a5 5 0 0 1 10 0M17 11a3 3 0 1 0 0-6M16 19a5 5 0 0 1 6-3",
  approvals: "M9 12l2 2 4-4M12 3l7 3v6c0 4-3 7-7 8-4-1-7-4-7-8V6z",
  knowledge: "M4 5a2 2 0 0 1 2-2h7v16H6a2 2 0 0 0-2 2zM20 3a0 0 0 0 0 0 0h-3v16h3a0 0 0 0 0 0 0z",
  memory: "M12 3a4 4 0 0 0-4 4 3 3 0 0 0-1 5.8A3 3 0 0 0 9 18a3 3 0 0 0 6 0 3 3 0 0 0 2-5.2A3 3 0 0 0 16 7a4 4 0 0 0-4-4ZM12 3v18",
  play: "M7 5l12 7-12 7z",
  crown: "M4 18h16M4 18l1.5-9 4 4 2.5-6 2.5 6 4-4L20 18",
  flow: "M6 6h6a4 4 0 0 1 0 8H8M6 18h6M6 6v.01M6 18v.01",
  spark: "M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z",
  chart: "M5 19V9M10 19V5M15 19v-7M20 19v-4M4 19h16",
  target: "M12 12m-8 0a8 8 0 1 0 16 0 8 8 0 1 0-16 0M12 12m-3.5 0a3.5 3.5 0 1 0 7 0 3.5 3.5 0 1 0-7 0M12 12h.01",
  scope: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14ZM16 16l4 4",
  coin: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM12 8v8M9.5 10.5a2.5 2 0 0 1 5 0c0 2-5 1.5-5 3.5a2.5 2 0 0 0 5 0",
  life: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7ZM6 6l3 3M18 6l-3 3M6 18l3-3M18 18l-3-3",
  lock: "M7 11V8a5 5 0 0 1 10 0v3M5 11h14v9H5z",
  check: "M5 12l4 4L19 6",
  x: "M6 6l12 12M18 6L6 18",
  arrowRight: "M5 12h14M13 6l6 6-6 6",
  arrowUp: "M12 19V5M6 11l6-6 6 6",
  arrowDown: "M12 5v14M6 13l6 6 6-6",
  bolt: "M13 3L5 13h6l-1 8 8-10h-6z",
  clock: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM12 7v5l3 2",
  doc: "M6 3h8l4 4v14H6zM14 3v4h4",
  plus: "M12 5v14M5 12h14",
  dot: "M12 12m-3 0a3 3 0 1 0 6 0 3 3 0 1 0-6 0",
  search: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14ZM16 16l4 4",
  settings: "M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM12 2v3M12 19v3M5 5l2 2M17 17l2 2M2 12h3M19 12h3M5 19l2-2M17 7l2-2",
  pause: "M8 5v14M16 5v14",
  pending: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM12 8v4l2.5 1.5",
  brain: "M9 4a3 3 0 0 0-3 3 3 3 0 0 0-1 5 3 3 0 0 0 2 5h3V4zM15 4a3 3 0 0 1 3 3 3 3 0 0 1 1 5 3 3 0 0 1-2 5h-3V4z",
  mail: "M4 6h16v12H4zM4 7l8 6 8-6",
  external: "M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5",
  logout: "M15 4h3a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-3M10 12h9M16 8l4 4-4 4",
  edit: "M4 20h4l10-10-4-4L4 16zM13.5 6.5l4 4",
  chevronDown: "M6 9l6 6 6-6",
  shield: "M12 3l7 3v6c0 4-3 7-7 8-4-1-7-4-7-8V6z",
  globe: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM3 12h18M12 3c2.5 2.5 2.5 15.5 0 18M12 3c-2.5 2.5-2.5 15.5 0 18",
  book: "M5 4h14v16H7a2 2 0 0 1-2-2zM5 18a2 2 0 0 1 2-2h12",
  sun: "M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10ZM12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19",
  moon: "M20 14.5A8 8 0 0 1 9.5 4 7 7 0 1 0 20 14.5Z",
  scroll: "M6 3h10a2 2 0 0 1 2 2v13a2 2 0 0 0 2 2H8a2 2 0 0 1-2-2zM6 3a2 2 0 0 0-2 2v2h2M9 8h6M9 12h6M9 16h4",
  paperclip: "M21 11l-8.5 8.5a5 5 0 0 1-7-7L14 4a3.5 3.5 0 0 1 5 5l-8.5 8.5a2 2 0 0 1-3-3L15 6",
  upload: "M12 16V4M7 9l5-5 5 5M5 20h14",
  image: "M4 5h16v14H4zM4 15l4-4 4 4 3-3 5 5M9 9a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0",
};

export function Icon({ name, size = 18, stroke = 1.6, fill = "none", style, className }: {
  name: string; size?: number; stroke?: number; fill?: string; style?: CSSProperties; className?: string;
}) {
  const d = PATHS[name] || PATHS.dot;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill === "none" ? "none" : "currentColor"}
      stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round"
      style={{ flexShrink: 0, ...style }} className={className} aria-hidden="true">
      {d.split("M").filter(Boolean).map((seg, i) => <path key={i} d={"M" + seg} />)}
    </svg>
  );
}

// ---- Card -------------------------------------------------------------
export function Card({ children, style, pad = "var(--s5)", className, onClick, hover }: {
  children: ReactNode; style?: CSSProperties; pad?: string; className?: string; onClick?: () => void; hover?: boolean;
}) {
  const [h, setH] = useState(false);
  return (
    <div onClick={onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)} className={className}
      style={{
        background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r3)", padding: pad,
        boxShadow: hover && h ? "var(--shadow-md)" : "var(--shadow-sm)",
        transition: "box-shadow .2s, transform .2s, border-color .2s",
        transform: hover && h ? "translateY(-2px)" : "none",
        cursor: onClick ? "pointer" : "default", ...style,
      }}>
      {children}
    </div>
  );
}

// ---- Badge ------------------------------------------------------------
const TONE: Record<string, [string, string]> = {
  ok: ["var(--ok)", "var(--ok-soft)"], warn: ["var(--warn)", "var(--warn-soft)"],
  danger: ["var(--danger)", "var(--danger-soft)"], info: ["var(--info)", "var(--info-soft)"],
  accent: ["var(--accent-strong)", "var(--accent-soft)"], neutral: ["var(--text-2)", "var(--bg-sunken)"],
};
export function Badge({ children, tone = "neutral", dot, icon, style }: {
  children?: ReactNode; tone?: string; dot?: boolean; icon?: string; style?: CSSProperties;
}) {
  const [fg, bg] = TONE[tone] || TONE.neutral;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 9px", borderRadius: 99,
      fontSize: 11.5, fontWeight: 600, letterSpacing: ".01em", color: fg, background: bg,
      lineHeight: 1.4, whiteSpace: "nowrap", ...style,
    }}>
      {dot && <span style={{ width: 6, height: 6, borderRadius: 99, background: fg }} />}
      {icon && <Icon name={icon} size={12} stroke={2} />}
      {children}
    </span>
  );
}

// ---- Button -----------------------------------------------------------
export function Button({ children, variant = "default", size = "md", icon, iconRight, onClick, disabled, style, full }: {
  children?: ReactNode; variant?: "primary" | "default" | "ghost" | "danger"; size?: "sm" | "md" | "lg";
  icon?: string; iconRight?: string; onClick?: () => void; disabled?: boolean; style?: CSSProperties; full?: boolean;
}) {
  const [h, setH] = useState(false);
  const pads = { sm: "6px 11px", md: "9px 15px", lg: "12px 20px" } as const;
  const fs = { sm: 12.5, md: 13.5, lg: 15 } as const;
  const variants: Record<string, CSSProperties> = {
    primary: { background: h ? "var(--accent-strong)" : "var(--accent)", color: "var(--accent-fg)", border: "1px solid transparent" },
    default: { background: h ? "var(--surface-2)" : "var(--surface)", color: "var(--text)", border: "1px solid var(--border-strong)" },
    ghost: { background: h ? "var(--bg-sunken)" : "transparent", color: "var(--text-2)", border: "1px solid transparent" },
    danger: { background: h ? "var(--danger)" : "var(--danger-soft)", color: h ? "var(--accent-fg)" : "var(--danger)", border: "1px solid transparent" },
  };
  return (
    <button onClick={disabled ? undefined : onClick} disabled={disabled}
      onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7,
        padding: pads[size], fontSize: fs[size], fontWeight: 600, borderRadius: "var(--r2)",
        width: full ? "100%" : "auto", opacity: disabled ? 0.45 : 1,
        cursor: disabled ? "not-allowed" : "pointer", transition: "all .15s",
        boxShadow: variant === "primary" && !disabled ? "var(--shadow-sm)" : "none",
        ...variants[variant], ...style,
      }}>
      {icon && <Icon name={icon} size={size === "sm" ? 14 : 16} stroke={2} />}
      {children}
      {iconRight && <Icon name={iconRight} size={size === "sm" ? 14 : 16} stroke={2} />}
    </button>
  );
}

// ---- Agent glyph chip -------------------------------------------------
export function AgentGlyph({ id, size = 36, active, status }: {
  id: string; size?: number; active?: boolean; status?: string;
}) {
  const { byId } = useAgents();
  const a = byId(id);
  const hue = AGENT_HUE[id] ?? 250;
  const locked = status === "locked" || a?.status === "locked";
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.32, flexShrink: 0,
      display: "grid", placeItems: "center", position: "relative",
      background: locked ? "var(--bg-sunken)" : `oklch(0.95 0.05 ${hue})`,
      color: locked ? "var(--text-3)" : `oklch(0.5 0.14 ${hue})`,
      border: `1px solid ${locked ? "var(--border)" : `oklch(0.85 0.07 ${hue})`}`,
      boxShadow: active ? `0 0 0 3px oklch(0.85 0.1 ${hue} / 0.5)` : "none",
      transition: "box-shadow .3s",
    }}>
      <Icon name={locked ? "lock" : (a?.glyph || "dot")} size={size * 0.5} stroke={1.7} />
    </div>
  );
}

// ---- Status pill ------------------------------------------------------
export function StatusPill({ status }: { status: string }) {
  const [tone, label] = STATUS_META[status] || STATUS_META.idle;
  const live = status === "working" || status === "running";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <span style={{
        width: 7, height: 7, borderRadius: 99, background: `var(--${tone === "neutral" ? "text-3" : tone})`,
        animation: live ? "pulse-dot 1.1s ease-in-out infinite" : "none",
      }} />
      <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2)" }}>{label}</span>
    </span>
  );
}

// ---- Sparkline / area chart -------------------------------------------
export function Sparkline({ data, w = 240, h = 56, stroke = "var(--accent)", fill = true, dots }: {
  data: number[]; w?: number; h?: number; stroke?: string; fill?: boolean; dots?: boolean;
}) {
  const min = Math.min(...data), max = Math.max(...data);
  const rng = max - min || 1;
  const pts = data.map((v, i) => [(i / (data.length - 1)) * w, h - 6 - ((v - min) / rng) * (h - 12)] as const);
  const line = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
  const area = `${line} L${w} ${h} L0 ${h} Z`;
  // Stable across server + client renders (useId) so the gradient id can't
  // cause a hydration mismatch; colons stripped to stay valid in url(#id).
  const gid = "g" + useId().replace(/:/g, "");
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ display: "block", overflow: "visible" }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.18" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      {fill && <path d={area} fill={`url(#${gid})`} />}
      <path d={line} fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      {dots && pts.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r="2.5" fill={stroke} vectorEffect="non-scaling-stroke" />)}
      {dots && <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="3.5" fill={stroke} stroke="var(--surface)" strokeWidth="2" vectorEffect="non-scaling-stroke" />}
    </svg>
  );
}

// ---- Section header ---------------------------------------------------
export function SectionTitle({ children, sub, right }: { children: ReactNode; sub?: string; right?: ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: "var(--s4)", gap: 16 }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: ".02em", textTransform: "uppercase", color: "var(--text-3)" }}>{children}</div>
        {sub && <div style={{ fontSize: 13, color: "var(--text-2)", marginTop: 3 }}>{sub}</div>}
      </div>
      {right}
    </div>
  );
}

// ---- Empty state ------------------------------------------------------
export function Empty({ icon = "scenario", title, text }: { icon?: string; title: string; text?: string }) {
  return (
    <div style={{ display: "grid", placeItems: "center", padding: "var(--s12) var(--s6)", textAlign: "center", gap: 4 }}>
      <div style={{ width: 48, height: 48, borderRadius: 14, display: "grid", placeItems: "center", background: "var(--bg-sunken)", color: "var(--text-3)", marginBottom: 8 }}>
        <Icon name={icon} size={22} />
      </div>
      <div style={{ fontWeight: 650, fontSize: 15 }}>{title}</div>
      {text && <div style={{ fontSize: 13, color: "var(--text-2)", maxWidth: 320 }}>{text}</div>}
    </div>
  );
}
