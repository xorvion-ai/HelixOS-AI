"use client";

import { CSSProperties, useEffect, useState } from "react";
import type { AgentMessage, Trace } from "@/lib/types";
import { api } from "@/lib/api";
import { fmt } from "@/lib/agents";
import { useAgents } from "./AgentsContext";
import { useSim } from "./SimulationProvider";
import { AgentGlyph, Badge, Button, Card, Empty, Icon, Sparkline } from "./ui";
import { OrgChart } from "./OrgChart";
import { MetricDetail, type MetricSeries } from "./MetricDetail";

// ---- delta helper -----------------------------------------------------
export function calcDelta(cur: number, prev: number | null | undefined, lowerBetter?: boolean) {
  if (prev == null) return null;
  const abs = cur - prev;
  const pct = prev ? abs / prev : 0;
  const good = lowerBetter ? abs < 0 : abs > 0;
  return { abs, pct, good, flat: Math.abs(abs) < 1e-9 };
}

// ---- KPI stat card ----------------------------------------------------
function StatCard({ label, value, unit, delta, deltaLabel, spark, hue = 48, bumped, onClick, active }: {
  label: string; value: string; unit?: string;
  delta: ReturnType<typeof calcDelta>; deltaLabel?: string; spark?: number[]; hue?: number; bumped?: boolean;
  onClick?: () => void; active?: boolean;
}) {
  return (
    <Card pad="var(--s5)" onClick={onClick} hover={!!onClick} style={{
      position: "relative", overflow: "hidden",
      cursor: onClick ? "pointer" : "default",
      borderColor: active ? "var(--accent-line)" : undefined,
      boxShadow: active ? "0 0 0 1px var(--accent-line)" : undefined,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-2)", letterSpacing: ".01em" }}>{label}</div>
        {delta && !delta.flat && (
          <Badge tone={delta.good ? "ok" : "danger"} icon={delta.abs > 0 ? "arrowUp" : "arrowDown"}>
            {deltaLabel}
          </Badge>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginTop: 10 }}>
        <span className="mono tnum" style={{
          fontSize: 30, fontWeight: 600, letterSpacing: "-.02em",
          color: bumped ? "var(--accent-strong)" : "var(--text)", transition: "color .5s",
        }}>{value}</span>
        {unit && <span className="mono" style={{ fontSize: 14, color: "var(--text-3)" }}>{unit}</span>}
      </div>
      {spark && (
        <div style={{ marginTop: 14, marginLeft: -2, marginRight: -2 }}>
          <Sparkline data={spark} h={40} stroke={`oklch(0.62 0.14 ${hue})`} />
        </div>
      )}
      {onClick && (
        <span aria-hidden style={{ position: "absolute", bottom: 8, right: 10, color: active ? "var(--accent-strong)" : "var(--text-3)", transition: "transform .2s", transform: active ? "rotate(180deg)" : "none" }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
        </span>
      )}
    </Card>
  );
}

// ---- Activity feed row ------------------------------------------------
function FeedRow({ msg, fresh }: { msg: AgentMessage; fresh: boolean }) {
  const { byId } = useAgents();
  const from = byId(msg.from);
  const to = byId(msg.to);
  const wrap: CSSProperties = {
    display: "flex", gap: 11, padding: "11px var(--s4)", borderBottom: "1px solid var(--border)",
    background: fresh ? "var(--accent-soft)" : "transparent", transition: "background 1s",
  };
  return (
    <div className={fresh ? "fade-up" : ""} style={wrap}>
      <AgentGlyph id={msg.from} size={28} />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "var(--text-2)", flexWrap: "wrap" }}>
          <span style={{ fontWeight: 650, color: "var(--text)" }}>{from?.name ?? msg.from}</span>
          <Icon name="arrowRight" size={13} style={{ color: "var(--text-3)" }} />
          <span style={{ fontWeight: 650, color: "var(--text)" }}>{to?.name ?? msg.to}</span>
          <span style={{ marginLeft: "auto", fontSize: 11.5, color: "var(--text-3)" }} className="mono">{msg.ts}</span>
        </div>
        <div style={{ fontSize: 13, color: "var(--text-2)", marginTop: 3, lineHeight: 1.45 }}>{msg.message}</div>
      </div>
    </div>
  );
}

// ---- This cycle's task pipeline ---------------------------------------
// The demo workspace shows a hand-authored showcase pipeline; a real company's
// pipeline is built from the actual agent traces of its latest cycle (each
// completed agent step = one task), so it reflects real work, not demo data.
const PRESET_IDS = ["couponex", "lumen", "forge"];

const DEMO_TASKS: { id: string; title: string; agent: string; status: string }[] = [
  { id: "T-31", title: "Set Q3 growth goal", agent: "founder", status: "done" },
  { id: "T-32", title: "Launch short-form campaign", agent: "marketing", status: "done" },
  { id: "T-33", title: "Approve campaign spend", agent: "operations", status: "approved" },
  { id: "T-34", title: "Publish SEO blog post", agent: "marketing", status: "running" },
  { id: "T-35", title: "Recompute KPI snapshot", agent: "analytics", status: "queued" },
  { id: "T-36", title: "Evaluate & store learnings", agent: "founder", status: "queued" },
];

const TASK_ST: Record<string, { label: string; bg: string; fg: string; dot: string }> = {
  done: { label: "Done", bg: "var(--ok-soft)", fg: "var(--ok)", dot: "var(--ok)" },
  approved: { label: "Approved", bg: "var(--ok-soft)", fg: "var(--ok)", dot: "var(--ok)" },
  running: { label: "Running", bg: "var(--accent-soft)", fg: "var(--accent-strong)", dot: "var(--accent)" },
  queued: { label: "Queued", bg: "var(--surface-2)", fg: "var(--text-3)", dot: "var(--text-3)" },
};

function TaskPipeline() {
  const ctx = useSim();
  const isDemo = PRESET_IDS.includes(ctx.scenario.id);
  const [tasks, setTasks] = useState<{ id: string; title: string; agent: string; status: string }[]>(
    isDemo ? DEMO_TASKS : []
  );

  useEffect(() => {
    if (isDemo) { setTasks(DEMO_TASKS); return; }
    let on = true;
    // Real company: derive the pipeline from this cycle's completed agent steps.
    api.traces(undefined, ctx.cycle)
      .then((ts: Trace[]) => {
        if (!on) return;
        // Traces come newest-first; show them in execution order.
        setTasks([...ts].reverse().map((t) => ({ id: t.id, title: t.task, agent: t.agent, status: "done" })));
      })
      .catch(() => { if (on) setTasks([]); });
    return () => { on = false; };
  }, [isDemo, ctx.cycle]);

  return (
    <Card pad="0">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "var(--s4) var(--s5)", borderBottom: "1px solid var(--border)" }}>
        <span style={{ fontWeight: 650, fontSize: 14 }}>This cycle&apos;s task pipeline</span>
        {tasks.length > 0 && (
          <span className="mono" style={{ fontSize: 12, color: "var(--accent-strong)", fontWeight: 600 }}>
            {tasks.filter((t) => t.status === "done" || t.status === "approved").length}/{tasks.length} complete
          </span>
        )}
      </div>
      {tasks.length === 0 ? (
        <Empty icon="flow" title="No tasks yet" text="Run a cycle and your agents' work will appear here as a live pipeline." />
      ) : (
        <div style={{ display: "flex", alignItems: "center", overflowX: "auto", padding: "var(--s5) var(--s4)" }}>
          {tasks.map((t, i) => {
            const st = TASK_ST[t.status] ?? TASK_ST.done;
            return (
              <div key={t.id} style={{ display: "flex", alignItems: "center" }}>
                <div style={{ width: 152, flexShrink: 0, padding: "11px 12px", borderRadius: 12, background: st.bg, border: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 7 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <AgentGlyph id={t.agent} size={20} />
                    <span className="mono" style={{ fontSize: 11, color: "var(--text-3)" }}>{t.id}</span>
                    <span style={{ marginLeft: "auto", width: 7, height: 7, borderRadius: 99, background: st.dot }} />
                  </div>
                  <div style={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.3, minHeight: 32 }}>{t.title}</div>
                  <div style={{ fontSize: 11.5, fontWeight: 600, color: st.fg }}>{st.label}</div>
                </div>
                {i < tasks.length - 1 && <Icon name="arrowRight" size={15} style={{ color: "var(--text-3)", margin: "0 6px", flexShrink: 0 }} />}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

// ---- Command Center ---------------------------------------------------
export function CommandCenter() {
  const ctx = useSim();
  const { state, prev, history, cycle, liveLog, activeEdge, activeNodes, isRunning, approvals, nav, bumped, statuses } = ctx;

  const usersHist = history.map((c) => c.users);
  const mrrHist = history.map((c) => c.mrr);
  const churnHist = history.map((c) => c.churn);
  const cacHist = history.map((c) => c.cac);

  const dMrr = calcDelta(state.mrr, prev?.mrr, false);
  const dUsers = calcDelta(state.users, prev?.users, false);
  const dChurn = calcDelta(state.churn, prev?.churn, true);
  const dCac = calcDelta(state.cac, prev?.cac, true);

  const cycles = history.map((c) => c.cycle);
  const [openMetric, setOpenMetric] = useState<string | null>(null);

  // Each KPI: card display fields + a self-contained series for the detail view.
  const kpis: {
    series: MetricSeries; cardLabel: string; cardValue: string; cardUnit?: string;
    deltaObj: ReturnType<typeof calcDelta>; deltaLabel: string; spark: number[]; bumped?: boolean;
  }[] = [
    { series: { key: "mrr", short: "MRR", label: "Monthly Recurring Revenue", subtitle: "Recurring revenue booked per cycle across all active subscriptions.", hue: 48, lowerBetter: false, deltaKind: "pct", cycles, values: mrrHist, format: (v) => fmt.money(v) },
      cardLabel: "Monthly Recurring Rev", cardValue: fmt.money(state.mrr), deltaObj: dMrr, deltaLabel: dMrr ? (dMrr.pct * 100).toFixed(1) + "%" : "", spark: mrrHist, bumped: bumped.mrr },
    { series: { key: "users", short: "Users", label: "Active Users", subtitle: "Monthly active users across the product.", hue: 250, lowerBetter: false, deltaKind: "pct", cycles, values: usersHist, format: (v) => fmt.int(v) },
      cardLabel: "Active Users", cardValue: fmt.int(state.users), deltaObj: dUsers, deltaLabel: dUsers ? (dUsers.pct * 100).toFixed(1) + "%" : "", spark: usersHist, bumped: bumped.users },
    { series: { key: "churn", short: "Churn", label: "Churn Rate", subtitle: "Share of paying users lost per cycle. Lower is better.", hue: 25, lowerBetter: true, deltaKind: "pp", cycles, values: churnHist, format: (v) => (v * 100).toFixed(1) + "%" },
      cardLabel: "Churn Rate", cardValue: (state.churn * 100).toFixed(1), cardUnit: "%", deltaObj: dChurn, deltaLabel: dChurn ? (dChurn.abs * 100).toFixed(1) + "pp" : "", spark: churnHist, bumped: bumped.churn },
    { series: { key: "cac", short: "CAC", label: "Customer Acquisition Cost", subtitle: "Average cost to acquire one new customer. Lower is better.", hue: 155, lowerBetter: true, deltaKind: "money", cycles, values: cacHist, format: (v) => "$" + Math.round(v) },
      cardLabel: "Customer Acq. Cost", cardValue: "$" + state.cac, deltaObj: dCac, deltaLabel: dCac ? "$" + Math.abs(dCac.abs) : "", spark: cacHist, bumped: bumped.cac },
  ];

  const feed = [...liveLog].reverse().concat(ctx.baseFeed);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 340px", gap: "var(--s5)", alignItems: "start" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--s5)", minWidth: 0 }}>
        {/* KPI row — click a card to expand its full chart below */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: "var(--s4)" }}>
          {kpis.map((k) => (
            <StatCard key={k.series.key} label={k.cardLabel} value={k.cardValue} unit={k.cardUnit}
              delta={k.deltaObj} deltaLabel={k.deltaLabel} spark={k.spark} hue={k.series.hue} bumped={k.bumped}
              active={openMetric === k.series.key}
              onClick={() => setOpenMetric(openMetric === k.series.key ? null : k.series.key)} />
          ))}
        </div>

        {/* Expanded metric detail — switch metrics via tabs */}
        {openMetric && (
          <MetricDetail series={kpis.map((k) => k.series)} activeKey={openMetric}
            onSelect={setOpenMetric} onClose={() => setOpenMetric(null)} />
        )}

        {/* Live org chart */}
        <Card pad="0" style={{ overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "var(--s4) var(--s5)", borderBottom: "1px solid var(--border)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <span style={{ fontWeight: 650, fontSize: 14 }}>Live org chart</span>
              <Badge tone={isRunning ? "accent" : "neutral"} dot>{isRunning ? "Cycle running" : "Idle"}</Badge>
            </div>
            <Button size="sm" variant="ghost" icon="org" onClick={() => nav("orgchart")}>Open full view</Button>
          </div>
          <div style={{ height: 432, padding: "var(--s5) var(--s4) var(--s4)" }}>
            <OrgChart statuses={statuses} activeEdge={activeEdge} activeNodes={activeNodes}
              onSelect={(id) => nav("agents", { agent: id })} layout={ctx.orgLayout} compact />
          </div>
        </Card>

        {/* This cycle's task pipeline */}
        <TaskPipeline />
      </div>

      {/* Right rail */}
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--s5)", position: "sticky", top: 0 }}>
        {/* Goal card */}
        <Card style={{ background: "var(--accent-soft)", borderColor: "var(--accent-line)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, fontWeight: 700, color: "var(--accent-strong)", textTransform: "uppercase", letterSpacing: ".03em" }}>
            <Icon name="target" size={14} /> Active goal · cycle {cycle}
          </div>
          <div style={{ fontSize: 15, fontWeight: 600, marginTop: 8, lineHeight: 1.4, color: "var(--text)" }}>
            Grow MRR 8% while holding CAC under $105
          </div>
          <div style={{ display: "flex", gap: 18, marginTop: 14 }}>
            <div>
              <div style={{ fontSize: 11, color: "var(--text-2)", fontWeight: 600 }}>MRR growth</div>
              <div className="mono" style={{ fontSize: 18, fontWeight: 600, color: dMrr?.good ? "var(--ok)" : "var(--text)" }}>
                {dMrr ? "+" + (dMrr.pct * 100).toFixed(1) + "%" : "—"}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "var(--text-2)", fontWeight: 600 }}>CAC</div>
              <div className="mono" style={{ fontSize: 18, fontWeight: 600, color: state.cac < 105 ? "var(--ok)" : "var(--warn)" }}>${state.cac}</div>
            </div>
          </div>
        </Card>

        {/* Approvals */}
        <Card pad="0">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "var(--s4) var(--s5)", borderBottom: "1px solid var(--border)" }}>
            <span style={{ fontWeight: 650, fontSize: 14 }}>Pending approvals</span>
            {approvals.length > 0 && <Badge tone="warn">{approvals.length}</Badge>}
          </div>
          {approvals.length === 0
            ? <div style={{ padding: "var(--s6)" }}><Empty icon="check" title="All clear" text="No actions awaiting your sign-off." /></div>
            : approvals.slice(0, 2).map((ap) => (
              <div key={ap.id} style={{ padding: "var(--s4) var(--s5)", borderBottom: "1px solid var(--border)" }}>
                <div style={{ display: "flex", gap: 9, alignItems: "center", marginBottom: 8 }}>
                  <AgentGlyph id={ap.agent} size={26} />
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{ap.title}</span>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <Button size="sm" variant="primary" icon="check" onClick={() => ctx.resolveApproval(ap.id, "approved")}>Approve</Button>
                  <Button size="sm" variant="ghost" icon="x" onClick={() => ctx.resolveApproval(ap.id, "rejected")}>Reject</Button>
                </div>
              </div>
            ))}
          {approvals.length > 0 && (
            <button onClick={() => nav("approvals")} style={{ width: "100%", padding: "11px", background: "transparent", border: "none", color: "var(--text-2)", fontSize: 12.5, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
              Review queue <Icon name="arrowRight" size={13} />
            </button>
          )}
        </Card>

        {/* Activity feed */}
        <Card pad="0">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "var(--s4) var(--s5)", borderBottom: "1px solid var(--border)" }}>
            <span style={{ fontWeight: 650, fontSize: 14 }}>Agent activity</span>
            <span className="mono" style={{ fontSize: 11.5, color: "var(--text-3)" }}>realtime</span>
          </div>
          <div style={{ maxHeight: 360, overflowY: "auto" }}>
            {feed.map((m, i) => <FeedRow key={i} msg={m} fresh={i < liveLog.length} />)}
          </div>
        </Card>
      </div>
    </div>
  );
}
