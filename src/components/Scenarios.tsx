"use client";

import { useEffect, useState } from "react";
import type { Scenario, ScenarioSeed } from "@/lib/types";
import { api } from "@/lib/api";
import { fmt } from "@/lib/agents";
import { useSim } from "./SimulationProvider";
import { Badge, Button, Card, Icon, SectionTitle } from "./ui";

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 10.5, color: "var(--text-3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".03em" }}>{label}</div>
      <div className="mono tnum" style={{ fontSize: 15, fontWeight: 600, marginTop: 1 }}>{value}</div>
    </div>
  );
}

const FIELDS: { k: keyof ScenarioSeed; label: string; min: number; max: number; step: number; fmt: (v: number) => string }[] = [
  { k: "users", label: "Starting users", min: 100, max: 50000, step: 100, fmt: (v) => fmt.int(v) },
  { k: "mrr", label: "Monthly revenue", min: 1000, max: 200000, step: 1000, fmt: (v) => "$" + fmt.int(v) },
  { k: "marketing_budget", label: "Marketing budget", min: 500, max: 30000, step: 500, fmt: (v) => "$" + fmt.int(v) },
  { k: "churn", label: "Monthly churn", min: 0.01, max: 0.15, step: 0.005, fmt: (v) => (v * 100).toFixed(1) + "%" },
  { k: "cac", label: "Acquisition cost", min: 20, max: 1500, step: 10, fmt: (v) => "$" + v },
  { k: "competitors", label: "Competitors", min: 0, max: 10, step: 1, fmt: (v) => String(v) },
];

export function ScenariosScreen() {
  const sim = useSim();
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [sel, setSel] = useState(sim.scenario.id);
  const [custom, setCustom] = useState<ScenarioSeed>(sim.scenario.seed);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let on = true;
    api.scenarios().then((s) => {
      if (!on) return;
      setScenarios(s);
      if (!s.find((x) => x.id === sel) && s[0]) { setSel(s[0].id); setCustom(s[0].seed); }
    });
    return () => { on = false; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const isCustom = sel === "custom";
  const current = scenarios.find((s) => s.id === sel);
  const seed = isCustom ? custom : current?.seed ?? custom;

  async function load() {
    setBusy(true);
    try { await sim.loadScenario(sel, isCustom ? custom : undefined); }
    finally { setBusy(false); }
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: "var(--s6)", alignItems: "start" }}>
      <div>
        <SectionTitle sub="Pick a preset business or define your own. Agents run cycles against this state and move the numbers.">Choose a simulation</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--s4)" }}>
          {scenarios.map((s) => (
            <Card key={s.id} hover onClick={() => setSel(s.id)}
              style={{ borderColor: sel === s.id ? "var(--accent)" : "var(--border)", borderWidth: sel === s.id ? 2 : 1, padding: "var(--s5)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontWeight: 650, fontSize: 16 }}>{s.name}</div>
                  <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2, fontWeight: 600 }}>{s.tag}</div>
                </div>
                {s.id === sim.scenario.id && <Badge tone="accent" dot>Active</Badge>}
                {sel === s.id && s.id !== sim.scenario.id && <Icon name="check" size={18} style={{ color: "var(--accent)" }} />}
              </div>
              <div style={{ fontSize: 13, color: "var(--text-2)", marginTop: 10, lineHeight: 1.5 }}>{s.desc}</div>
              <div style={{ display: "flex", gap: 16, marginTop: 14, flexWrap: "wrap" }}>
                <Mini label="Users" value={fmt.int(s.seed.users)} />
                <Mini label="MRR" value={fmt.money(s.seed.mrr)} />
                <Mini label="Churn" value={(s.seed.churn * 100).toFixed(1) + "%"} />
              </div>
            </Card>
          ))}
          <Card hover onClick={() => setSel("custom")}
            style={{ borderColor: isCustom ? "var(--accent)" : "var(--border)", borderWidth: isCustom ? 2 : 1, borderStyle: "dashed", padding: "var(--s5)", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", minHeight: 150, gap: 6 }}>
            <div style={{ width: 38, height: 38, borderRadius: 11, display: "grid", placeItems: "center", background: "var(--bg-sunken)", color: "var(--text-2)" }}>
              <Icon name="plus" size={20} />
            </div>
            <div style={{ fontWeight: 650, fontSize: 15 }}>Custom business</div>
            <div style={{ fontSize: 12.5, color: "var(--text-2)" }}>Define your own seed metrics</div>
          </Card>
        </div>
      </div>

      <Card style={{ position: "sticky", top: 0 }}>
        <div style={{ fontWeight: 650, fontSize: 15 }}>{isCustom ? "Custom business" : current?.name ?? ""}</div>
        <div style={{ fontSize: 12.5, color: "var(--text-2)", marginTop: 2 }}>{isCustom ? "Tune the seed metrics" : current?.tag ?? ""}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--s4)", marginTop: "var(--s5)" }}>
          {FIELDS.map((f) => (
            <div key={f.k}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 6 }}>
                <span style={{ color: "var(--text-2)", fontWeight: 600 }}>{f.label}</span>
                <span className="mono" style={{ fontWeight: 600 }}>{f.fmt(seed[f.k])}</span>
              </div>
              <input type="range" min={f.min} max={f.max} step={f.step} value={seed[f.k]}
                disabled={!isCustom}
                onChange={(e) => setCustom((c) => ({ ...c, [f.k]: +e.target.value }))}
                style={{ width: "100%", accentColor: "var(--accent)", opacity: isCustom ? 1 : 0.55, cursor: isCustom ? "pointer" : "not-allowed" }} />
            </div>
          ))}
        </div>
        <div style={{ marginTop: "var(--s5)" }}>
          <Button variant="primary" full icon="play" disabled={busy} onClick={load}>
            {busy ? "Loading…" : "Load as active business"}
          </Button>
        </div>
        <div style={{ fontSize: 11.5, color: "var(--text-3)", marginTop: 10, textAlign: "center", lineHeight: 1.5 }}>
          Loading resets the simulation to cycle 0 with these metrics.
        </div>
      </Card>
    </div>
  );
}
