"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "./ui";

// Live appearance controls. Theme/accent/density are driven by data-attributes
// + CSS custom properties on <html> (see globals.css), so flipping them here
// restyles the whole app instantly. Prefs persist to localStorage and are
// re-applied pre-hydration by a small script in layout.tsx (no flash).

type Density = 0.9 | 1 | 1.12;
interface TweakPrefs { theme: "light" | "dark"; hue: number; density: Density }

const KEY = "helix.tweaks";
const DEFAULTS: TweakPrefs = { theme: "light", hue: 48, density: 1 };

const ACCENTS: { name: string; hue: number }[] = [
  { name: "Amber", hue: 48 },
  { name: "Blue", hue: 250 },
  { name: "Violet", hue: 295 },
  { name: "Green", hue: 155 },
  { name: "Teal", hue: 195 },
  { name: "Rose", hue: 12 },
];

const DENSITIES: { name: string; value: Density }[] = [
  { name: "Compact", value: 0.9 },
  { name: "Default", value: 1 },
  { name: "Cozy", value: 1.12 },
];

function read(): TweakPrefs {
  if (typeof localStorage === "undefined") return DEFAULTS;
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || "{}") }; }
  catch { return DEFAULTS; }
}

function apply(t: TweakPrefs) {
  const el = document.documentElement;
  el.setAttribute("data-theme", t.theme);
  el.style.setProperty("--acc-h", String(t.hue));
  el.style.setProperty("--d", String(t.density));
}

export function Tweaks() {
  const [open, setOpen] = useState(false);
  const [t, setT] = useState<TweakPrefs>(DEFAULTS);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { setT(read()); }, []);
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (open && ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  function update(patch: Partial<TweakPrefs>) {
    const next = { ...t, ...patch };
    setT(next);
    apply(next);
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* ignore */ }
  }

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button type="button" aria-label="Appearance" onClick={() => setOpen((v) => !v)}
        style={{
          width: 36, height: 36, borderRadius: "var(--r2)", display: "grid", placeItems: "center",
          border: "1px solid var(--border-strong)", background: open ? "var(--surface-2)" : "var(--surface)",
          color: "var(--text-2)",
        }}>
        <Icon name="settings" size={17} />
      </button>

      {open && (
        <div style={{
          position: "absolute", right: 0, top: 44, width: 280, zIndex: 50,
          background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r3)",
          boxShadow: "var(--shadow-lg)", padding: "var(--s5)",
          display: "flex", flexDirection: "column", gap: "var(--s5)",
          animation: "fade-up .2s cubic-bezier(.2,.7,.2,1)",
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--text-3)" }}>Appearance</div>

          {/* theme */}
          <Field label="Theme">
            <Segmented
              options={[{ k: "light", label: "Light" }, { k: "dark", label: "Dark" }]}
              value={t.theme} onChange={(k) => update({ theme: k as "light" | "dark" })} />
          </Field>

          {/* accent */}
          <Field label="Accent">
            <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
              {ACCENTS.map((a) => {
                const on = a.hue === t.hue;
                return (
                  <button key={a.hue} type="button" title={a.name} onClick={() => update({ hue: a.hue })}
                    style={{
                      width: 30, height: 30, borderRadius: 9, cursor: "pointer",
                      background: `oklch(0.66 0.16 ${a.hue})`,
                      border: on ? "2px solid var(--text)" : "2px solid transparent",
                      boxShadow: on ? "0 0 0 2px var(--surface)" : "none",
                    }} />
                );
              })}
            </div>
          </Field>

          {/* density */}
          <Field label="Density">
            <Segmented
              options={DENSITIES.map((d) => ({ k: String(d.value), label: d.name }))}
              value={String(t.density)} onChange={(k) => update({ density: Number(k) as Density })} />
          </Field>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-2)", marginBottom: 8 }}>{label}</div>
      {children}
    </div>
  );
}

function Segmented({ options, value, onChange }: {
  options: { k: string; label: string }[]; value: string; onChange: (k: string) => void;
}) {
  return (
    <div style={{ display: "flex", gap: 4, background: "var(--bg-sunken)", padding: 3, borderRadius: "var(--r2)" }}>
      {options.map((o) => {
        const on = o.k === value;
        return (
          <button key={o.k} type="button" onClick={() => onChange(o.k)}
            style={{
              flex: 1, padding: "7px 8px", borderRadius: 7, border: "none", fontSize: 12.5, fontWeight: 600,
              background: on ? "var(--surface)" : "transparent",
              color: on ? "var(--text)" : "var(--text-3)",
              boxShadow: on ? "var(--shadow-sm)" : "none",
            }}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
