"use client";

import { CSSProperties, useState } from "react";
import { Button, Card, Icon } from "./ui";
import { Wordmark } from "./Wordmark";
import { useSim } from "./SimulationProvider";
import { useMe } from "./MeContext";
import type { ScenarioSeed } from "@/lib/types";

// Shown to a brand-new (non-admin) user whose workspace isn't set up yet. They
// describe their company → we seed their workspace (custom scenario) and their
// eight agents start operating on *their* business.

const FIELDS: { key: keyof ScenarioSeed; label: string; hint: string; step?: number }[] = [
  { key: "users", label: "Active users", hint: "How many customers/users today" },
  { key: "mrr", label: "Monthly revenue ($)", hint: "Approx. MRR" },
  { key: "marketing_budget", label: "Marketing budget ($/mo)", hint: "Monthly spend" },
  { key: "cac", label: "Customer acquisition cost ($)", hint: "Avg. cost per new customer" },
  { key: "churn", label: "Monthly churn (%)", hint: "e.g. 4 for 4%", step: 0.1 },
  { key: "competitors", label: "Known competitors", hint: "Roughly how many" },
];

const DEFAULTS: ScenarioSeed = {
  users: 1200, mrr: 8000, marketing_budget: 3000, competitors: 4, churn: 5, cac: 45,
};

export function Onboarding() {
  const sim = useSim();
  const { me, setOnboarded } = useMe();
  const [name, setName] = useState("");
  const [seed, setSeed] = useState<ScenarioSeed>(DEFAULTS);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const inp: CSSProperties = { width: "100%", padding: "10px 12px", borderRadius: 9, border: "1px solid var(--border-strong)", background: "var(--bg)", color: "var(--text)", fontSize: 14, outline: "none", fontFamily: "inherit" };

  function set<K extends keyof ScenarioSeed>(k: K, v: number) {
    setSeed((s) => ({ ...s, [k]: v }));
  }

  async function submit() {
    setErr(null);
    if (!name.trim()) { setErr("Give your business a name."); return; }
    setBusy(true);
    try {
      // churn is entered as a percentage; the model stores a fraction.
      const payload: ScenarioSeed = { ...seed, churn: seed.churn / 100 };
      await sim.loadScenario("custom", payload);
      setOnboarded(true);
      sim.setScreen("command");
    } catch {
      setErr("Couldn't set up your workspace — please try again.");
    } finally { setBusy(false); }
  }

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "var(--s8) var(--s5)", background: "var(--bg)" }}>
      <div style={{ width: "100%", maxWidth: 620 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
          <Wordmark size={22} />
          <span style={{ fontSize: 13, color: "var(--text-3)" }}>· Set up your workspace</span>
        </div>

        <Card style={{ padding: "var(--s8)" }}>
          <div style={{ width: 48, height: 48, borderRadius: 13, background: "var(--accent-soft)", color: "var(--accent-strong)", display: "grid", placeItems: "center", marginBottom: 16 }}>
            <Icon name="bolt" size={24} />
          </div>
          <div style={{ fontSize: 22, fontWeight: 750, letterSpacing: "-.02em" }}>
            Welcome{me?.name ? `, ${me.name.split(" ")[0]}` : ""} 👋
          </div>
          <div style={{ fontSize: 14, color: "var(--text-2)", marginTop: 6, lineHeight: 1.6 }}>
            Tell us about your business. Your eight AI agents will start operating on these
            numbers — running autonomous growth cycles against your real metrics.
          </div>

          <div style={{ marginTop: 24 }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-2)", marginBottom: 6 }}>Company name</div>
            <input style={inp} placeholder="Acme Inc." value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--s4)", marginTop: 16 }}>
            {FIELDS.map((f) => (
              <div key={f.key}>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-2)", marginBottom: 6 }}>{f.label}</div>
                <input style={inp} type="number" step={f.step ?? 1} min={0}
                  value={seed[f.key]} onChange={(e) => set(f.key, Number(e.target.value))} />
                <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 4 }}>{f.hint}</div>
              </div>
            ))}
          </div>

          {err && <div style={{ color: "var(--danger)", fontSize: 13, marginTop: 14 }}>{err}</div>}

          <div style={{ marginTop: 24, display: "flex", alignItems: "center", gap: 14 }}>
            <Button variant="primary" size="lg" iconRight="arrowRight" onClick={submit} disabled={busy}>
              {busy ? "Setting up…" : "Launch my workspace"}
            </Button>
            <span style={{ fontSize: 12, color: "var(--text-3)" }}>You can change these anytime in Simulation.</span>
          </div>
        </Card>
      </div>
    </div>
  );
}
