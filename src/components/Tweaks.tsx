"use client";

import { useEffect, useState } from "react";
import { Icon } from "./ui";

// Appearance control — a single light/dark toggle. Click the button to flip
// the whole app between light and dark; the choice is driven by a data-theme
// attribute + CSS custom properties on <html> (see globals.css) and persisted
// to localStorage, re-applied pre-hydration by a small script in layout.tsx
// (no flash). Accent hue + density are fixed to the brand defaults.

type Theme = "light" | "dark";
interface TweakPrefs { theme: Theme; hue: number; density: number }

const KEY = "helix.tweaks";
const DEFAULTS: TweakPrefs = { theme: "light", hue: 48, density: 1 };

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
  const [t, setT] = useState<TweakPrefs>(DEFAULTS);

  useEffect(() => { setT(read()); }, []);

  function toggle() {
    const next: TweakPrefs = { ...t, theme: t.theme === "light" ? "dark" : "light" };
    setT(next);
    apply(next);
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* ignore */ }
  }

  const isDark = t.theme === "dark";
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Light mode" : "Dark mode"}
      style={{
        width: 36, height: 36, borderRadius: "var(--r2)", display: "grid", placeItems: "center",
        border: "1px solid var(--border-strong)", background: "var(--surface)", color: "var(--text-2)",
        cursor: "pointer",
      }}
    >
      <Icon name={isDark ? "sun" : "moon"} size={17} />
    </button>
  );
}
