"use client";

import { useEffect, useState } from "react";
import type { Approval, KnowledgeCollection, Memory, Trace } from "@/lib/types";
import { api } from "@/lib/api";
import { fmt } from "@/lib/agents";
import { useSim } from "./SimulationProvider";
import { useAgents } from "./AgentsContext";
import { AgentGlyph, Badge, Button, Card, Empty, Icon, SectionTitle } from "./ui";
import { OrgChart } from "./OrgChart";

const PANEL = { display: "flex", flexDirection: "column", gap: "var(--s5)" } as const;

// ---- Tool chip --------------------------------------------------------
function ToolChip({ name }: { name: string }) {
  return (
    <span className="mono" style={{
      fontSize: 11, padding: "2px 8px", borderRadius: 7, background: "var(--bg-sunken)",
      color: "var(--text-2)", border: "1px solid var(--border)", whiteSpace: "nowrap",
    }}>{name}</span>
  );
}

// ===== Live Org Chart (full view) ======================================
export function OrgChartScreen() {
  const sim = useSim();
  return (
    <Card pad="0" style={{ overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "var(--s4) var(--s5)", borderBottom: "1px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <span style={{ fontWeight: 650, fontSize: 14 }}>Org chart</span>
          <Badge tone={sim.isRunning ? "accent" : "neutral"} dot>{sim.isRunning ? "Cycle running" : "Idle"}</Badge>
        </div>
        <span style={{ fontSize: 12.5, color: "var(--text-2)" }}>Founder → Operations → specialists → Analytics → Founder</span>
      </div>
      <div style={{ height: 620, padding: "var(--s6)" }}>
        <OrgChart statuses={sim.statuses} activeEdge={sim.activeEdge} activeNodes={sim.activeNodes}
          onSelect={(id) => sim.setScreen("agents", { agent: id })} layout="tree" ambient />
      </div>
    </Card>
  );
}

// ===== Observability ===================================================
export function ObservabilityScreen() {
  const sim = useSim();
  const [traces, setTraces] = useState<Trace[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let on = true;
    setLoading(true); setError(null);
    api.traces(filter === "all" ? undefined : filter)
      .then((t) => on && setTraces(t))
      .catch(() => on && setError("Couldn't load traces."))
      .finally(() => on && setLoading(false));
    return () => { on = false; };
  }, [filter, sim.cycle]);

  return (
    <div style={PANEL}>
      <SectionTitle sub="Every step an agent took — the decision it made, why, the tools it used, and the cost."
        right={
          <select value={filter} onChange={(e) => setFilter(e.target.value)}
            style={{ padding: "7px 11px", borderRadius: "var(--r2)", border: "1px solid var(--border-strong)", background: "var(--surface)", color: "var(--text)", fontSize: 13 }}>
            <option value="all">All agents</option>
            {sim.agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        }>Agent traces</SectionTitle>

      {error ? <Card><Empty icon="x" title="Couldn't load traces" text={error} /></Card>
        : loading ? <Empty icon="trace" title="Loading traces…" />
        : traces.length === 0 ? <Empty icon="trace" title="No traces yet" text="Run a cycle to generate agent traces." />
        : traces.map((t) => (
          <Card key={t.id}>
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <AgentGlyph id={t.agent} size={34} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 650, fontSize: 14 }}>{sim.agents.find((a) => a.id === t.agent)?.name ?? t.agent}</span>
                  <span style={{ color: "var(--text-3)" }}>·</span>
                  <span style={{ fontSize: 13.5, color: "var(--text-2)" }}>{t.task}</span>
                  <Badge tone={t.status === "warn" ? "warn" : "ok"} style={{ marginLeft: "auto" }}>{t.status}</Badge>
                  <span className="mono" style={{ fontSize: 11.5, color: "var(--text-3)" }}>{t.ago}</span>
                </div>
                <div style={{ marginTop: 10, fontSize: 13.5 }}>
                  <span style={{ fontWeight: 600, color: "var(--text-2)" }}>Decision: </span>{t.decision}
                </div>
                <div style={{ marginTop: 4, fontSize: 13, color: "var(--text-2)", lineHeight: 1.5 }}>
                  <span style={{ fontWeight: 600 }}>Reason: </span>{t.reasoning}
                </div>
                <div style={{ marginTop: 10, display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                  {t.tools.map((tool, i) => <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    {i > 0 && <Icon name="arrowRight" size={12} style={{ color: "var(--text-3)" }} />}<ToolChip name={tool} />
                  </span>)}
                </div>
                <div style={{ marginTop: 12, display: "flex", gap: 16, fontSize: 12.5, color: "var(--text-2)" }}>
                  <span><span style={{ fontWeight: 600, color: "var(--text)" }}>{t.result}</span></span>
                  <span className="mono" style={{ marginLeft: "auto" }}>cycle {String(t.cycle).padStart(2, "0")}</span>
                  <span className="mono">{(t.dur / 1000).toFixed(1)}s</span>
                  <span className="mono">~{fmt.int(t.tokens)} tok</span>
                </div>
              </div>
            </div>
          </Card>
        ))}
    </div>
  );
}

// ===== Agents ==========================================================
export function AgentsScreen() {
  const sim = useSim();
  const selected = (sim.navParams.agent as string) || null;
  const [traces, setTraces] = useState<Trace[]>([]);

  useEffect(() => {
    if (!selected) return;
    let on = true;
    api.traces(selected).then((t) => on && setTraces(t));
    return () => { on = false; };
  }, [selected]);

  const sel = selected ? sim.agents.find((a) => a.id === selected) : null;

  return (
    <div style={{ display: "grid", gridTemplateColumns: sel ? "1fr 380px" : "1fr", gap: "var(--s5)", alignItems: "start" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "var(--s4)" }}>
        {sim.agents.map((a) => (
          <Card key={a.id} hover onClick={() => sim.setScreen("agents", { agent: a.id })}
            style={{ borderColor: selected === a.id ? "var(--accent)" : "var(--border)", borderWidth: selected === a.id ? 2 : 1 }}>
            <div style={{ display: "flex", gap: 11, alignItems: "center" }}>
              <AgentGlyph id={a.id} size={40} />
              <div>
                <div style={{ fontWeight: 650, fontSize: 15 }}>{a.name}</div>
                <div style={{ fontSize: 12, color: "var(--text-3)" }}>{a.role}</div>
              </div>
            </div>
            <div style={{ fontSize: 12.5, color: "var(--text-2)", marginTop: 11, lineHeight: 1.5 }}>{a.blurb}</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 12 }}>
              {a.tools.slice(0, 4).map((t) => <ToolChip key={t} name={t} />)}
            </div>
          </Card>
        ))}
      </div>

      {sel && (
        <Card style={{ position: "sticky", top: 0 }}>
          <div style={{ display: "flex", gap: 11, alignItems: "center" }}>
            <AgentGlyph id={sel.id} size={44} />
            <div>
              <div style={{ fontWeight: 700, fontSize: 17 }}>{sel.name}</div>
              <div style={{ fontSize: 12.5, color: "var(--text-3)" }}>{sel.role} · Live</div>
            </div>
          </div>
          <div style={{ fontSize: 13, color: "var(--text-2)", marginTop: 12, lineHeight: 1.55 }}>{sel.blurb}</div>
          <div style={{ marginTop: 14, fontSize: 11, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: ".08em" }}>Tools</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>{sel.tools.map((t) => <ToolChip key={t} name={t} />)}</div>
          <div style={{ marginTop: 16, fontSize: 11, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: ".08em" }}>Recent traces</div>
          <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
            {traces.length === 0 ? <div style={{ fontSize: 12.5, color: "var(--text-3)" }}>No traces yet.</div>
              : traces.slice(0, 5).map((t) => (
                <div key={t.id} style={{ padding: "9px 11px", borderRadius: "var(--r2)", background: "var(--bg-sunken)" }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600 }}>{t.task}</div>
                  <div style={{ fontSize: 12, color: "var(--text-2)", marginTop: 2 }}>{t.decision}</div>
                </div>
              ))}
          </div>
          <AgentChat key={sel.id} agentId={sel.id} agentName={sel.name} />
        </Card>
      )}
    </div>
  );
}

// ---- Agent chat (detail panel) ----------------------------------------
function AgentChat({ agentId, agentName }: { agentId: string; agentName: string }) {
  const [msgs, setMsgs] = useState<{ role: "you" | "agent"; text: string }[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  async function send() {
    const q = input.trim();
    if (!q || busy) return;
    setInput("");
    setMsgs((m) => [...m, { role: "you", text: q }]);
    setBusy(true);
    try {
      const res = await api.chatAgent(agentId, q);
      setMsgs((m) => [...m, { role: "agent", text: res.reply }]);
    } catch {
      setMsgs((m) => [...m, { role: "agent", text: "I couldn't reach the backend just now — try again." }]);
    } finally { setBusy(false); }
  }

  return (
    <div style={{ marginTop: 16, borderTop: "1px solid var(--border)", paddingTop: 14 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 10 }}>Ask {agentName}</div>
      {msgs.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10, maxHeight: 260, overflowY: "auto" }}>
          {msgs.map((m, i) => (
            <div key={i} style={{
              alignSelf: m.role === "you" ? "flex-end" : "flex-start", maxWidth: "88%",
              padding: "8px 11px", borderRadius: m.role === "you" ? "10px 10px 2px 10px" : "10px 10px 10px 2px",
              fontSize: 12.5, lineHeight: 1.5,
              background: m.role === "you" ? "var(--accent)" : "var(--bg-sunken)",
              color: m.role === "you" ? "var(--accent-fg)" : "var(--text)",
            }}>{m.text}</div>
          ))}
          {busy && <div style={{ alignSelf: "flex-start", fontSize: 12, color: "var(--text-3)", padding: "4px 2px" }}>{agentName} is thinking…</div>}
        </div>
      )}
      <div style={{ display: "flex", gap: 8 }}>
        <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") send(); }}
          placeholder={`Message ${agentName}…`}
          style={{ flex: 1, padding: "9px 12px", borderRadius: 9, border: "1px solid var(--border-strong)", background: "var(--bg)", color: "var(--text)", fontSize: 13, outline: "none", fontFamily: "inherit" }} />
        <Button variant="primary" icon="arrowRight" onClick={send} disabled={busy || !input.trim()} />
      </div>
    </div>
  );
}

// ===== Approvals =======================================================
export function ApprovalsScreen() {
  const sim = useSim();
  if (sim.approvals.length === 0) {
    return <Card><Empty icon="check" title="All clear" text="No actions are awaiting your sign-off right now." /></Card>;
  }
  return (
    <div style={PANEL}>
      {sim.approvals.map((ap: Approval) => (
        <Card key={ap.id}>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <AgentGlyph id={ap.agent} size={36} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontWeight: 650, fontSize: 15 }}>{ap.title}</span>
                <Badge tone={ap.risk === "high" ? "danger" : ap.risk === "medium" ? "warn" : "neutral"}>{ap.risk} risk</Badge>
                <span className="mono" style={{ marginLeft: "auto", fontSize: 11.5, color: "var(--text-3)" }}>{ap.requested}</span>
              </div>
              <div style={{ fontSize: 13.5, color: "var(--text-2)", marginTop: 6, lineHeight: 1.5 }}>{ap.summary}</div>
              <div style={{ marginTop: 12, padding: "12px 14px", borderRadius: "var(--r2)", background: "var(--bg-sunken)", border: "1px solid var(--border)" }}>
                {Object.entries(ap.payload).map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, padding: "3px 0" }}>
                    <span style={{ color: "var(--text-3)", fontWeight: 600 }}>{k}</span>
                    <span className="mono" style={{ color: "var(--text)" }}>{Array.isArray(v) ? v.join(", ") : String(v)}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                <Button variant="primary" icon="check" onClick={() => sim.resolveApproval(ap.id, "approved")}>Approve</Button>
                <Button variant="ghost" icon="x" onClick={() => sim.resolveApproval(ap.id, "rejected")}>Reject</Button>
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

// ===== Knowledge Base ==================================================
export function KnowledgeScreen() {
  const [cols, setCols] = useState<KnowledgeCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setError(null);
    return api.knowledge().then(setCols).catch(() => setError("Couldn't load the knowledge base."));
  }
  useEffect(() => {
    let on = true;
    api.knowledge().then((c) => on && setCols(c))
      .catch(() => on && setError("Couldn't load the knowledge base."))
      .finally(() => on && setLoading(false));
    return () => { on = false; };
  }, []);

  if (loading) return <Empty icon="knowledge" title="Loading knowledge base…" />;
  if (error) return <Card><Empty icon="x" title="Knowledge base unavailable" text={error} /></Card>;
  return (
    <div style={PANEL}>
      <UploadDocument collections={cols.map((c) => c.collection)} onUploaded={load} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "var(--s4)", alignItems: "start" }}>
      {cols.map((c) => (
        <Card key={c.collection} pad="0" style={{ overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "var(--s4) var(--s5)", borderBottom: "1px solid var(--border)" }}>
            <span style={{ width: 9, height: 9, borderRadius: 99, background: `var(--${c.color})` }} />
            <span className="mono" style={{ fontWeight: 600, fontSize: 13 }}>{c.collection}</span>
            <Badge style={{ marginLeft: "auto" }}>{c.docs.length} docs</Badge>
          </div>
          {c.docs.map((d) => (
            <div key={d.name} style={{ display: "flex", gap: 10, alignItems: "center", padding: "11px var(--s5)", borderBottom: "1px solid var(--border)" }}>
              <Icon name="doc" size={16} style={{ color: "var(--text-3)" }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.name}</div>
                <div className="mono" style={{ fontSize: 11, color: "var(--text-3)", marginTop: 1 }}>{d.chunks} chunks · {d.size} · {d.updated}</div>
              </div>
            </div>
          ))}
        </Card>
      ))}
      </div>
    </div>
  );
}

// ---- Knowledge upload -------------------------------------------------
function UploadDocument({ collections, onUploaded }: { collections: string[]; onUploaded: () => Promise<unknown> }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [collection, setCollection] = useState(collections[0] ?? "company_docs");
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const inp: React.CSSProperties = { width: "100%", padding: "10px 12px", borderRadius: 9, border: "1px solid var(--border-strong)", background: "var(--bg)", color: "var(--text)", fontSize: 13.5, outline: "none", fontFamily: "inherit" };

  async function submit() {
    setErr(null);
    if (!name.trim()) { setErr("Give the document a name."); return; }
    setBusy(true);
    try {
      await api.uploadDocument(name.trim(), collection, content);
      await onUploaded();
      setName(""); setContent(""); setOpen(false);
    } catch { setErr("Upload failed — please try again."); } finally { setBusy(false); }
  }

  if (!open) {
    return (
      <Card hover onClick={() => setOpen(true)} style={{ borderStyle: "dashed", cursor: "pointer" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: "var(--accent-soft)", color: "var(--accent-strong)", display: "grid", placeItems: "center" }}><Icon name="plus" size={20} /></div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 650 }}>Upload a document</div>
            <div style={{ fontSize: 12.5, color: "var(--text-3)" }}>Add to the knowledge base — agents retrieve it before acting (RAG).</div>
          </div>
          <Button variant="default" size="sm" icon="doc">Add document</Button>
        </div>
      </Card>
    );
  }
  return (
    <Card>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--s4)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 15, fontWeight: 700 }}>Upload a document</div>
          <Button variant="ghost" size="sm" icon="x" onClick={() => setOpen(false)}>Cancel</Button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 220px", gap: "var(--s4)" }}>
          <div>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-2)", marginBottom: 6 }}>Document name</div>
            <input style={inp} placeholder="Q3 brand guidelines" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-2)", marginBottom: 6 }}>Collection</div>
            <select style={inp} value={collection} onChange={(e) => setCollection(e.target.value)}>
              {collections.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-2)", marginBottom: 6 }}>Content (pasted text)</div>
          <textarea style={{ ...inp, minHeight: 120, resize: "vertical", lineHeight: 1.5 }} placeholder="Paste the document text — we chunk it for retrieval." value={content} onChange={(e) => setContent(e.target.value)} />
        </div>
        {err && <div style={{ color: "var(--danger)", fontSize: 13 }}>{err}</div>}
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <Button variant="primary" icon="doc" onClick={submit} disabled={busy}>{busy ? "Ingesting…" : "Ingest document"}</Button>
          <span style={{ fontSize: 12, color: "var(--text-3)" }}>Mock-chunked in demo · real vector ingest in live mode.</span>
        </div>
      </div>
    </Card>
  );
}

// ===== Memory ==========================================================
export function MemoryScreen() {
  const sim = useSim();
  const [mem, setMem] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let on = true;
    setLoading(true); setError(null);
    api.memory().then((m) => on && setMem(m))
      .catch(() => on && setError("Couldn't load memory."))
      .finally(() => on && setLoading(false));
    return () => { on = false; };
  }, [sim.cycle]);

  if (error) return <Card><Empty icon="x" title="Memory unavailable" text={error} /></Card>;
  if (loading) return <Empty icon="memory" title="Loading memory…" />;
  if (mem.length === 0) return <Empty icon="memory" title="No learnings yet" text="Run a cycle — the org stores what it learns." />;
  return (
    <div style={PANEL}>
      {mem.map((m) => (
        <Card key={m.id}>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <AgentGlyph id={m.agent} size={32} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 12.5, color: "var(--text-2)" }}>{m.result}</span>
                <Badge tone={m.confidence === "high" ? "ok" : m.confidence === "medium" ? "warn" : "neutral"} style={{ marginLeft: "auto" }}>{m.confidence}</Badge>
                <span className="mono" style={{ fontSize: 11.5, color: "var(--text-3)" }}>cycle {String(m.cycle).padStart(2, "0")}</span>
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, marginTop: 6, lineHeight: 1.45, display: "flex", gap: 8 }}>
                <Icon name="bolt" size={16} style={{ color: "var(--accent-strong)", marginTop: 2, flexShrink: 0 }} />
                {m.lesson}
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
