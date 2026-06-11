/* ============================================================
   HelixOS AI — Command Center + Scenario picker
   ============================================================ */
const { useState: useS1, useMemo: useMemo1 } = React;

// ---- delta helper -----------------------------------------------------
function calcDelta(cur, prev, lowerBetter) {
  if (prev == null) return null;
  const abs = cur - prev;
  const pct = prev ? abs / prev : 0;
  const good = lowerBetter ? abs < 0 : abs > 0;
  return { abs, pct, good, flat: Math.abs(abs) < 1e-9 };
}

// ---- KPI stat card ----------------------------------------------------
function StatCard({ label, value, unit, delta, deltaLabel, spark, hue = 48, bumped }) {
  return (
    <Card pad="var(--s5)" style={{ position: "relative", overflow: "hidden" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-2)", letterSpacing: ".01em" }}>{label}</div>
        {delta && !delta.flat && (
          <Badge tone={delta.good ? "ok" : "danger"} icon={delta.abs > 0 ? "arrowUp" : "arrowDown"}>
            {deltaLabel}
          </Badge>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginTop: 10 }}>
        <span className="mono tnum" style={{ fontSize: 30, fontWeight: 600, letterSpacing: "-.02em",
          color: bumped ? "var(--accent-strong)" : "var(--text)", transition: "color .5s" }}>{value}</span>
        {unit && <span className="mono" style={{ fontSize: 14, color: "var(--text-3)" }}>{unit}</span>}
      </div>
      {spark && (
        <div style={{ marginTop: 14, marginLeft: -2, marginRight: -2 }}>
          <Sparkline data={spark} h={40} stroke={`oklch(0.62 0.14 ${hue})`} />
        </div>
      )}
    </Card>
  );
}

// ---- Activity feed row ------------------------------------------------
function FeedRow({ msg, fresh }) {
  const from = window.HELIX.agentById(msg.from);
  const to = window.HELIX.agentById(msg.to);
  return (
    <div className={fresh ? "fade-up" : ""} style={{
      display: "flex", gap: 11, padding: "11px var(--s4)", borderBottom: "1px solid var(--border)",
      background: fresh ? "var(--accent-soft)" : "transparent", transition: "background 1s",
    }}>
      <AgentGlyph id={msg.from} size={28} />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "var(--text-2)", flexWrap: "wrap" }}>
          <span style={{ fontWeight: 650, color: "var(--text)" }}>{from.name}</span>
          <Icon name="arrowRight" size={13} style={{ color: "var(--text-3)" }} />
          <span style={{ fontWeight: 650, color: "var(--text)" }}>{to.name}</span>
          <span style={{ marginLeft: "auto", fontSize: 11.5, color: "var(--text-3)" }} className="mono">{msg.ts}</span>
        </div>
        <div style={{ fontSize: 13, color: "var(--text-2)", marginTop: 3, lineHeight: 1.45 }}>{msg.message}</div>
      </div>
    </div>
  );
}

// ---- Command Center ---------------------------------------------------
function CommandCenter({ ctx }) {
  const { state, prev, history, cycle, scenario, liveLog, activeEdge, activeNodes, isRunning, approvals, nav, bumped, statuses } = ctx;
  const H = window.HELIX;

  const usersHist = history.map((c) => c.users);
  const mrrHist = history.map((c) => c.mrr);
  const churnHist = history.map((c) => c.churn);
  const cacHist = history.map((c) => c.cac);

  const dMrr = calcDelta(state.mrr, prev?.mrr, false);
  const dUsers = calcDelta(state.users, prev?.users, false);
  const dChurn = calcDelta(state.churn, prev?.churn, true);
  const dCac = calcDelta(state.cac, prev?.cac, true);

  const baseFeed = [
    { from: "analytics", to: "founder", message: "KPI snapshot delivered — MRR at $77.4k, churn 4.9%.", ts: "2h ago" },
    { from: "operations", to: "analytics", message: "Routed KPI recompute after blog publish.", ts: "2h ago" },
    { from: "marketing", to: "operations", message: "Published SEO blog: 'Best cashback apps 2026'.", ts: "2h ago" },
    { from: "founder", to: "operations", message: "Assigned 3 tasks for cycle 6: campaign, blog, KPI roll-up.", ts: "2h ago" },
    { from: "analytics", to: "founder", message: "Flagged CAC improvement — now $19 under ceiling.", ts: "1d ago" },
  ];
  const feed = [...liveLog].reverse().concat(baseFeed);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: "var(--s5)", alignItems: "start" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--s5)" }}>
        {/* KPI row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "var(--s4)" }}>
          <StatCard label="Monthly Recurring Rev" value={fmt.money(state.mrr)} delta={dMrr} bumped={bumped.mrr}
            deltaLabel={dMrr ? (dMrr.pct * 100).toFixed(1) + "%" : ""} spark={mrrHist} hue={48} />
          <StatCard label="Active Users" value={fmt.int(state.users)} delta={dUsers} bumped={bumped.users}
            deltaLabel={dUsers ? (dUsers.pct * 100).toFixed(1) + "%" : ""} spark={usersHist} hue={250} />
          <StatCard label="Churn Rate" value={(state.churn * 100).toFixed(1)} unit="%" delta={dChurn} bumped={bumped.churn}
            deltaLabel={dChurn ? (dChurn.abs * 100).toFixed(1) + "pp" : ""} spark={churnHist} hue={25} />
          <StatCard label="Customer Acq. Cost" value={"$" + state.cac} delta={dCac} bumped={bumped.cac}
            deltaLabel={dCac ? "$" + Math.abs(dCac.abs) : ""} spark={cacHist} hue={155} />
        </div>

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

// ---- Scenario picker --------------------------------------------------
function Scenarios({ ctx }) {
  const H = window.HELIX;
  const [sel, setSel] = useS1(ctx.scenario.id);
  const [custom, setCustom] = useS1({ ...H.SCENARIOS[0].seed });
  const current = H.SCENARIOS.find((s) => s.id === sel);
  const isCustom = sel === "custom";
  const seed = isCustom ? custom : current.seed;

  const fields = [
    { k: "users", label: "Starting users", min: 100, max: 50000, step: 100, fmt: (v) => fmt.int(v) },
    { k: "mrr", label: "Monthly revenue", min: 1000, max: 200000, step: 1000, fmt: (v) => "$" + fmt.int(v) },
    { k: "marketing_budget", label: "Marketing budget", min: 500, max: 30000, step: 500, fmt: (v) => "$" + fmt.int(v) },
    { k: "churn", label: "Monthly churn", min: 0.01, max: 0.15, step: 0.005, fmt: (v) => (v * 100).toFixed(1) + "%" },
    { k: "cac", label: "Acquisition cost", min: 20, max: 1500, step: 10, fmt: (v) => "$" + v },
    { k: "competitors", label: "Competitors", min: 0, max: 10, step: 1, fmt: (v) => v },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: "var(--s6)", alignItems: "start" }}>
      <div>
        <SectionTitle sub="Pick a preset business or define your own. Agents run cycles against this state and move the numbers.">Choose a simulation</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--s4)" }}>
          {H.SCENARIOS.map((s) => (
            <Card key={s.id} hover onClick={() => setSel(s.id)}
              style={{ borderColor: sel === s.id ? "var(--accent)" : "var(--border)", borderWidth: sel === s.id ? 2 : 1, padding: "var(--s5)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontWeight: 650, fontSize: 16 }}>{s.name}</div>
                  <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2, fontWeight: 600 }}>{s.tag}</div>
                </div>
                {s.active && <Badge tone="accent" dot>Active</Badge>}
                {sel === s.id && !s.active && <Icon name="check" size={18} style={{ color: "var(--accent)" }} />}
              </div>
              <div style={{ fontSize: 13, color: "var(--text-2)", marginTop: 10, lineHeight: 1.5 }}>{s.desc}</div>
              <div style={{ display: "flex", gap: 16, marginTop: 14, flexWrap: "wrap" }}>
                <Mini label="Users" value={fmt.int(s.seed.users)} />
                <Mini label="MRR" value={fmt.money(s.seed.mrr)} />
                <Mini label="Churn" value={(s.seed.churn * 100).toFixed(1) + "%"} />
              </div>
            </Card>
          ))}
          {/* custom */}
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

      {/* config rail */}
      <Card style={{ position: "sticky", top: 0 }}>
        <div style={{ fontWeight: 650, fontSize: 15 }}>{isCustom ? "Custom business" : current.name}</div>
        <div style={{ fontSize: 12.5, color: "var(--text-2)", marginTop: 2 }}>{isCustom ? "Tune the seed metrics" : current.tag}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--s4)", marginTop: "var(--s5)" }}>
          {fields.map((f) => (
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
          <Button variant="primary" full icon="play" onClick={() => { ctx.loadScenario(sel, isCustom ? custom : null); }}>
            Load as active business
          </Button>
        </div>
        <div style={{ fontSize: 11.5, color: "var(--text-3)", marginTop: 10, textAlign: "center", lineHeight: 1.5 }}>
          Loading resets the simulation to cycle 0 with these metrics.
        </div>
      </Card>
    </div>
  );
}

function Mini({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 10.5, color: "var(--text-3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".03em" }}>{label}</div>
      <div className="mono tnum" style={{ fontSize: 15, fontWeight: 600, marginTop: 1 }}>{value}</div>
    </div>
  );
}

Object.assign(window, { CommandCenter, Scenarios, StatCard, calcDelta });
