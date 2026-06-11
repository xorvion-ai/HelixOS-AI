"use client";

import { CSSProperties, useEffect, useState } from "react";
import { Badge, Button, Card, Empty, Icon } from "./ui";
import { useSim } from "./SimulationProvider";
import { useMe } from "./MeContext";
import { useAgents } from "./AgentsContext";
import { AGENT_HUE } from "@/lib/agents";
import { api } from "@/lib/api";
import type { AdminUsage } from "@/lib/types";
import { getBrowserSupabase, supabaseEnabled } from "@/lib/supabase/client";

const WEB3FORMS_KEY = "6e6ef58d-8589-40ac-acc7-3579b7c0ca91";
const DEFAULT_EMAIL = "andre@couponex.io";

// Resolve the signed-in user's email (real when authed; design default otherwise).
function useAccountEmail() {
  const [email, setEmail] = useState<string>(DEFAULT_EMAIL);
  useEffect(() => {
    const sb = getBrowserSupabase();
    if (!sb) return;
    sb.auth.getUser().then(({ data }) => {
      if (data.user?.email) setEmail(data.user.email);
    });
  }, []);
  return email;
}

async function signOut() {
  const sb = getBrowserSupabase();
  if (sb) await sb.auth.signOut();
  window.location.href = supabaseEnabled ? "/login" : "/";
}

// ===================================================================
// My Profile
// ===================================================================
export function ProfileScreen() {
  const sim = useSim();
  const { me } = useMe();
  const accEmail = useAccountEmail();
  const email = me?.email || accEmail;
  const name = me?.name || email.split("@")[0] || "Account";
  const role = me?.is_admin ? "Admin" : "Owner";
  const initial = (name[0] || "A").toUpperCase();

  const stats = [
    { icon: "scenario", value: String(sim.cycle), label: "Cycles run" },
    { icon: "approvals", value: String(sim.approvals.length), label: "Approvals pending" },
    { icon: "memory", value: String(sim.cycle), label: "Learnings stored" },
    { icon: "agents", value: String(sim.agents.length), label: "Active agents" },
  ];
  const details: [string, string][] = [
    ["Full name", name],
    ["Email", email],
    ["Role", role],
    ["Workspace", sim.scenario.name],
    ["Mode", me?.mode === "live" ? "Live (Gemini)" : "Demo"],
    ["Member since", "2026"],
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--s5)", maxWidth: 1060 }}>
      {/* banner */}
      <Card style={{ background: "linear-gradient(120deg, var(--accent-soft), var(--surface) 70%)", borderColor: "var(--accent-line)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
          <div style={{ width: 76, height: 76, borderRadius: 18, background: "var(--accent)", color: "var(--accent-fg)", display: "grid", placeItems: "center", fontWeight: 800, fontSize: 32 }}>{initial}</div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 24, fontWeight: 750, letterSpacing: "-.02em" }}>{name}</span>
              <Badge tone="accent" dot>{role}</Badge>
            </div>
            <div style={{ fontSize: 13.5, color: "var(--text-2)", marginTop: 4 }}>{email} · {sim.scenario.name} workspace</div>
          </div>
          <Button variant="default" icon="edit">Edit profile</Button>
        </div>
      </Card>

      {/* stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "var(--s4)" }}>
        {stats.map((s) => (
          <Card key={s.label} pad="var(--s5)">
            <Icon name={s.icon} size={18} style={{ color: "var(--text-3)" }} />
            <div className="mono tnum" style={{ fontSize: 26, fontWeight: 600, marginTop: 12 }}>{s.value}</div>
            <div style={{ fontSize: 12.5, color: "var(--text-2)", marginTop: 4 }}>{s.label}</div>
          </Card>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--s5)", alignItems: "start" }}>
        {/* account details */}
        <Card pad="0">
          <SectionLabel>Account details</SectionLabel>
          {details.map(([k, v], i) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "13px var(--s5)", borderTop: i === 0 ? "none" : "1px solid var(--border)" }}>
              <span style={{ fontSize: 13, color: "var(--text-2)" }}>{k}</span>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{v}</span>
            </div>
          ))}
        </Card>

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--s5)" }}>
          {/* workspace */}
          <Card>
            <SectionLabel bare>Workspace</SectionLabel>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 11, background: "var(--accent-soft)", color: "var(--accent-strong)", display: "grid", placeItems: "center", fontWeight: 700 }}>{sim.scenario.name[0]}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 650, fontSize: 14 }}>{sim.scenario.name}</div>
                <div style={{ fontSize: 12, color: "var(--text-3)" }}>Free · Hobby</div>
              </div>
              <Badge tone="ok" dot>Active</Badge>
            </div>
          </Card>

          {/* connected accounts */}
          <Card>
            <SectionLabel bare>Connected accounts</SectionLabel>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 12 }}>
              <GoogleG />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 650, fontSize: 14 }}>Google</div>
                <div style={{ fontSize: 12, color: "var(--text-3)" }}>{email}</div>
              </div>
              <Badge tone="ok" icon="check">Linked</Badge>
            </div>
          </Card>

          {/* sign out */}
          <Card>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 650, fontSize: 14 }}>Sign out</div>
                <div style={{ fontSize: 12, color: "var(--text-3)" }}>End this session on HelixOS.</div>
              </div>
              <Button variant="danger" icon="logout" onClick={signOut}>Sign out</Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ===================================================================
// Support
// ===================================================================
const FAQ: [string, string][] = [
  ["What can the agents actually do?",
    "Each agent calls real tools (function-calling via Gemini). Marketing creates campaigns, Analytics aggregates KPIs, Operations routes work, and the Founder sets strategy — all against your live simulation state."],
  ["Is my data used to train models?",
    "No. Your knowledge-base documents and long-term memory are used only to run your agents (RAG + recall) — never to train foundation models."],
  ["How does human approval work?",
    "Sensitive actions (sending a campaign, spending budget) pause the graph with an interrupt and queue an approval. The cycle resumes from that checkpoint once you approve or reject."],
  ["What does the free tier include?",
    "All eight agents, RAG, long-term memory, the live org chart and observability — running on free-tier Gemini, Supabase and Chroma. No credit card required."],
];

export function SupportScreen() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--s5)", maxWidth: 1060 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "var(--s4)" }}>
        <ChannelCard icon="mail" hue="var(--accent-soft)" title="Email support" main="xorvion.ai@gmail.com" sub="Replies within 24h" />
        <ChannelCard icon="book" hue="var(--accent-soft)" title="Documentation" main="Guides & API reference" sub="Self-serve help" />
        <ChannelCard icon="globe" hue="var(--ok-soft)" title="System status" main="All systems operational" sub="" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--s5)", alignItems: "start" }}>
        <SupportContactForm />
        <div>
          <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: "-.01em", marginBottom: "var(--s4)" }}>Frequently asked</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--s3, 10px)" }}>
            {FAQ.map(([q, a], i) => <FaqRow key={i} q={q} a={a} defaultOpen={i === 0} />)}
          </div>
        </div>
      </div>
    </div>
  );
}

function ChannelCard({ icon, hue, title, main, sub }: { icon: string; hue: string; title: string; main: string; sub: string }) {
  return (
    <Card pad="var(--s5)">
      <div style={{ width: 42, height: 42, borderRadius: 12, background: hue, color: "var(--accent-strong)", display: "grid", placeItems: "center" }}><Icon name={icon} size={20} /></div>
      <div style={{ fontWeight: 650, fontSize: 15, marginTop: 16 }}>{title}</div>
      <div style={{ fontSize: 13.5, color: "var(--text)", marginTop: 4 }}>{main}</div>
      {sub && <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>{sub}</div>}
    </Card>
  );
}

function FaqRow({ q, a, defaultOpen }: { q: string; a: string; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <Card pad="0">
      <button type="button" onClick={() => setOpen(!open)}
        style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "15px var(--s5)", background: "transparent", border: "none", textAlign: "left", cursor: "pointer" }}>
        <span style={{ flex: 1, fontWeight: 600, fontSize: 14 }}>{q}</span>
        <span aria-hidden style={{ color: "var(--text-3)", transition: "transform .2s", transform: open ? "rotate(180deg)" : "none" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
        </span>
      </button>
      {open && <div style={{ padding: "0 var(--s5) 16px", fontSize: 13.5, color: "var(--text-2)", lineHeight: 1.6 }}>{a}</div>}
    </Card>
  );
}

const TOPICS = ["General question", "Technical issue", "Billing", "Partnership", "Feedback"];

function SupportContactForm() {
  const [f, setF] = useState({ name: "", email: "", topic: TOPICS[0], msg: "" });
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const inp: CSSProperties = { width: "100%", padding: "11px 13px", borderRadius: 10, border: "1px solid var(--border-strong)", background: "var(--bg)", color: "var(--text)", fontSize: 14, outline: "none", fontFamily: "inherit" };
  const lbl: CSSProperties = { fontSize: 12.5, fontWeight: 600, color: "var(--text-2)", display: "block", marginBottom: 6 };

  async function submit() {
    setErr(null);
    if (!f.name.trim() || !f.email.trim() || !f.msg.trim()) { setErr("Please fill in your name, email and message."); return; }
    setBusy(true);
    try {
      const res = await fetch("https://api.web3forms.com/submit", {
        method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ access_key: WEB3FORMS_KEY, subject: `HelixOS support — ${f.topic}`, from_name: f.name, name: f.name, email: f.email, topic: f.topic, message: f.msg }),
      });
      const d = await res.json();
      if (d.success) setSent(true); else setErr(d.message || "Something went wrong.");
    } catch { setErr("Network error — please try again."); } finally { setBusy(false); }
  }

  return (
    <Card>
      {sent ? (
        <div style={{ textAlign: "center", padding: "var(--s8) var(--s4)" }}>
          <div style={{ width: 50, height: 50, borderRadius: 99, background: "var(--ok-soft)", color: "var(--ok)", display: "grid", placeItems: "center", margin: "0 auto 12px" }}><Icon name="check" size={26} stroke={2.2} /></div>
          <div style={{ fontWeight: 650, fontSize: 16 }}>Message sent</div>
          <div style={{ fontSize: 13, color: "var(--text-2)", marginTop: 4 }}>We&apos;ll reply to {f.email} within 24h.</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--s4)" }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: "-.01em" }}>Contact us</div>
            <div style={{ fontSize: 13, color: "var(--text-2)", marginTop: 3 }}>Tell us what you need — we&apos;ll get back fast.</div>
          </div>
          <div><label style={lbl}>Name</label><input style={inp} placeholder="Jane Doe" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
          <div><label style={lbl}>Email</label><input style={inp} type="email" placeholder="you@company.com" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
          <div><label style={lbl}>Topic</label>
            <select style={inp} value={f.topic} onChange={(e) => setF({ ...f, topic: e.target.value })}>
              {TOPICS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div><label style={lbl}>Message</label><textarea style={{ ...inp, resize: "vertical", minHeight: 110, lineHeight: 1.5 }} placeholder="How can we help?" value={f.msg} onChange={(e) => setF({ ...f, msg: e.target.value })} /></div>
          {err && <div style={{ color: "var(--danger)", fontSize: 13 }}>{err}</div>}
          <Button variant="primary" size="lg" iconRight="arrowRight" full onClick={submit} disabled={busy}>{busy ? "Sending…" : "Send message"}</Button>
        </div>
      )}
    </Card>
  );
}

// ===================================================================
// Privacy Policy
// ===================================================================
const POLICY: [string, string][] = [
  ["1. Overview", "HelixOS AI, operated by Xorvion, runs a multi-agent simulation against business state you provide. This policy explains what we collect, how we use it, and the choices you have. We keep it short and plain."],
  ["2. Information we collect", "Account basics from your sign-in provider (name, email, avatar). Workspace content you create — scenarios, goals, knowledge-base documents, and agent outputs. Operational telemetry — agent traces, durations and token estimates used to power the observability dashboard."],
  ["3. How we use it", "To run your agents, retrieve relevant context (RAG), recall long-term memory, and render your dashboards. We do not sell your data, and we do not use your knowledge-base documents or memory to train foundation models."],
  ["4. RAG, memory & embeddings", "Documents you upload are chunked and embedded into a vector store (Chroma Cloud) scoped to your workspace. Learnings are stored as structured memory. Both are retrievable only by your own agents and are deleted when you remove the source or delete your workspace."],
  ["5. Third-party processors", "We rely on infrastructure providers — Google Gemini (model inference), Supabase (database & auth), Vercel (hosting) and Chroma Cloud (vectors). Each processes data only to provide their service under their own terms."],
  ["6. Your choices", "Export or delete your workspace at any time. Revoke connected sign-in providers from your profile. Deleting your account removes your workspace content and embeddings."],
];

export function PrivacyScreen() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--s5)", maxWidth: 880 }}>
      <Card style={{ background: "linear-gradient(120deg, var(--accent-soft), var(--surface) 75%)", borderColor: "var(--accent-line)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 46, height: 46, borderRadius: 12, background: "var(--surface)", display: "grid", placeItems: "center", color: "var(--accent-strong)", border: "1px solid var(--accent-line)" }}><Icon name="shield" size={22} /></div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700 }}>Privacy Policy</div>
            <div className="mono" style={{ fontSize: 12, color: "var(--text-2)", marginTop: 3, letterSpacing: ".04em" }}>Last updated · February 2026</div>
          </div>
        </div>
      </Card>
      {POLICY.map(([h, body]) => (
        <Card key={h}>
          <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-.01em" }}>{h}</div>
          <div style={{ fontSize: 13.5, color: "var(--text-2)", lineHeight: 1.65, marginTop: 8 }}>{body}</div>
        </Card>
      ))}
    </div>
  );
}

// ===================================================================
// Admin Console — owner-only: usage, members, support queue
// ===================================================================
const fmt = (n: number) => n.toLocaleString("en-US");

// Representative free-tier ceilings (Gemini / Supabase) for the usage gauges.
const FREE_TIER = { geminiTokens: 1_000_000, dbRows: 50_000, traces: 5_000 };

const SEED_TICKETS = [
  { id: "sup-204", name: "Priya Nair", email: "priya@brightcart.io", topic: "Technical issue", ago: "2h ago", risk: "high",
    message: "The org chart stops animating after the third cycle in Safari — Chrome is fine. Any ideas on what to check?" },
  { id: "sup-203", name: "Daniel Okafor", email: "dan@launchpad.dev", topic: "Billing", ago: "5h ago", risk: "medium",
    message: "Do you offer an annual plan once we move off the free tier? We're scaling to about 12 workspaces next quarter." },
  { id: "sup-202", name: "Sofia Marchetti", email: "sofia@nimbus.co", topic: "Partnership", ago: "1d ago", risk: "low",
    message: "We'd love to embed HelixOS agents into our onboarding flow. Who's the right person to talk to about partnerships?" },
  { id: "sup-201", name: "Wei Chen", email: "wei@dataloop.ai", topic: "Feedback", ago: "2d ago", risk: "low",
    message: "The human-approval interrupt flow is fantastic. Could we get a webhook fired when an approval is queued?" },
];

export function AdminScreen() {
  const sim = useSim();
  const email = useAccountEmail();
  const [usage, setUsage] = useState<AdminUsage | null>(null);

  useEffect(() => {
    let on = true;
    api.adminUsage().then((u) => { if (on) setUsage(u); }).catch(() => { /* keep null → graceful */ });
    return () => { on = false; };
  }, [sim.cycle]); // refresh after a cycle advances

  const cap = usage?.capabilities ?? { gemini: false, supabase: false, chroma: false };
  const avgMs = usage && usage.traces ? Math.round(usage.duration_ms / usage.traces) : 0;
  const stats = [
    { icon: "scenario", value: fmt(usage?.cycles ?? sim.cycle), label: "Cycles run" },
    { icon: "coin", value: usage ? fmt(usage.tokens) : "—", label: "Gemini tokens (est.)" },
    { icon: "trace", value: usage ? fmt(usage.traces) : "—", label: "Agent runs logged" },
    { icon: "clock", value: avgMs ? `${(avgMs / 1000).toFixed(1)}s` : "—", label: "Avg run time" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--s5)", maxWidth: 1100 }}>
      {/* banner */}
      <Card style={{ background: "linear-gradient(120deg, var(--accent-soft), var(--surface) 70%)", borderColor: "var(--accent-line)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <div style={{ width: 50, height: 50, borderRadius: 13, background: "var(--surface)", color: "var(--accent-strong)", display: "grid", placeItems: "center", border: "1px solid var(--accent-line)" }}><Icon name="settings" size={24} /></div>
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 20, fontWeight: 750, letterSpacing: "-.02em" }}>Admin Console</span>
              <Badge tone="accent" icon="lock">Owner only</Badge>
            </div>
            <div style={{ fontSize: 13, color: "var(--text-2)", marginTop: 4 }}>{sim.scenario.name} workspace · usage, members &amp; support</div>
          </div>
          <Badge tone={usage?.mode === "live" ? "ok" : "neutral"} dot>{usage?.mode === "live" ? "Live mode" : "Demo mode"}</Badge>
        </div>
      </Card>

      {/* usage stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: "var(--s4)" }}>
        {stats.map((s) => (
          <Card key={s.label} pad="var(--s5)">
            <Icon name={s.icon} size={18} style={{ color: "var(--text-3)" }} />
            <div className="mono tnum" style={{ fontSize: 24, fontWeight: 600, marginTop: 12 }}>{s.value}</div>
            <div style={{ fontSize: 12.5, color: "var(--text-2)", marginTop: 4 }}>{s.label}</div>
          </Card>
        ))}
      </div>

      {/* free-tier gauges + system status */}
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "var(--s5)", alignItems: "start" }}>
        <Card>
          <SectionLabel bare>Free-tier usage</SectionLabel>
          <Gauge label="Gemini tokens" used={usage?.tokens ?? 0} limit={FREE_TIER.geminiTokens} />
          <Gauge label="Database rows (Supabase)" used={(usage?.traces ?? 0) + (usage?.memory ?? 0) + (usage?.cycles ?? 0) + (usage?.insights ?? 0)} limit={FREE_TIER.dbRows} hue="var(--info)" />
          <Gauge label="Observability traces stored" used={usage?.traces ?? 0} limit={FREE_TIER.traces} hue="var(--ok)" />
          <div style={{ fontSize: 11.5, color: "var(--text-3)", marginTop: 14, lineHeight: 1.5 }}>
            Token counts are estimated from observability traces. Limits reflect representative free-tier ceilings for Gemini and Supabase.
          </div>
        </Card>

        <Card>
          <SectionLabel bare>System status</SectionLabel>
          <div style={{ marginTop: 6 }}>
            <StatusRow label="Gemini reasoning" ok={cap.gemini} okText="Live" offText="Demo (no key)" />
            <StatusRow label="Supabase persistence" ok={cap.supabase} okText="Connected" offText="In-memory" />
            <StatusRow label="Chroma vectors" ok={cap.chroma} okText="Connected" offText="Keyword fallback" />
          </div>
        </Card>
      </div>

      {/* per-agent token breakdown */}
      <Card pad="0">
        <SectionLabel>Usage by agent</SectionLabel>
        <AgentBreakdown rows={usage?.by_agent ?? []} />
      </Card>

      {/* members */}
      <MembersCard ownerEmail={email} />

      {/* support queue */}
      <SupportQueue />
    </div>
  );
}

function Gauge({ label, used, limit, hue = "var(--accent)" }: { label: string; used: number; limit: number; hue?: string }) {
  const pct = Math.min(100, limit ? (used / limit) * 100 : 0);
  const tone = pct > 90 ? "var(--danger)" : pct > 70 ? "var(--warn)" : hue;
  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 6 }}>
        <span style={{ color: "var(--text-2)", fontWeight: 600 }}>{label}</span>
        <span className="mono tnum" style={{ color: "var(--text-3)" }}>{fmt(used)} / {fmt(limit)}</span>
      </div>
      <div style={{ height: 8, borderRadius: 99, background: "var(--bg-sunken)", overflow: "hidden" }}>
        <div style={{ width: `${Math.max(pct, used > 0 ? 2 : 0)}%`, height: "100%", background: tone, borderRadius: 99, transition: "width .5s ease" }} />
      </div>
    </div>
  );
}

function StatusRow({ label, ok, okText, offText }: { label: string; ok: boolean; okText: string; offText: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderTop: "1px solid var(--border)" }}>
      <span style={{ fontSize: 13.5, color: "var(--text-2)" }}>{label}</span>
      <Badge tone={ok ? "ok" : "neutral"} dot>{ok ? okText : offText}</Badge>
    </div>
  );
}

function AgentBreakdown({ rows }: { rows: { agent: string; traces: number; tokens: number }[] }) {
  const { byId } = useAgents();
  if (!rows.length) return <div style={{ padding: "var(--s2, 8px) 0" }}><Empty icon="agents" title="No agent activity yet" text="Run a cycle to see per-agent token usage." /></div>;
  const max = Math.max(1, ...rows.map((r) => r.tokens));
  return (
    <div>
      {rows.map((r, i) => {
        const hue = AGENT_HUE[r.agent] ?? 250;
        const name = byId(r.agent)?.name ?? r.agent;
        return (
          <div key={r.agent} style={{ display: "grid", gridTemplateColumns: "150px 1fr 110px", alignItems: "center", gap: 14, padding: "13px var(--s5)", borderTop: i === 0 ? "none" : "1px solid var(--border)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
              <span style={{ width: 8, height: 8, borderRadius: 99, background: `oklch(0.62 0.15 ${hue})`, flexShrink: 0 }} />
              <span style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</span>
            </div>
            <div style={{ height: 7, borderRadius: 99, background: "var(--bg-sunken)", overflow: "hidden" }}>
              <div style={{ width: `${(r.tokens / max) * 100}%`, height: "100%", background: `oklch(0.62 0.15 ${hue})`, borderRadius: 99 }} />
            </div>
            <div className="mono tnum" style={{ fontSize: 12.5, color: "var(--text-2)", textAlign: "right" }}>
              {fmt(r.tokens)} tok · {r.traces} run{r.traces === 1 ? "" : "s"}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MembersCard({ ownerEmail }: { ownerEmail: string }) {
  const { me } = useMe();
  const ownerName = me?.name || ownerEmail.split("@")[0] || "Owner";
  const [invited, setInvited] = useState<{ email: string }[]>([]);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const base = [
    { name: ownerName, email: ownerEmail, role: "Owner", tone: "accent" as const, you: true },
    { name: "Mara Lindqvist", email: "mara@couponex.io", role: "Operator", tone: "info" as const, you: false },
    { name: "Tomás Reis", email: "tomas@couponex.io", role: "Viewer", tone: "neutral" as const, you: false },
  ];
  function invite() {
    const e = draft.trim();
    if (!e) return;
    setInvited((xs) => [...xs, { email: e }]);
    setDraft(""); setInviteOpen(false);
  }
  return (
    <Card pad="0">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px var(--s5)", borderBottom: "1px solid var(--border)" }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--text-3)" }}>Members</span>
        <Button variant="default" size="sm" icon="plus" onClick={() => setInviteOpen((v) => !v)}>Invite</Button>
      </div>
      {inviteOpen && (
        <div style={{ display: "flex", gap: 10, padding: "12px var(--s5)", borderBottom: "1px solid var(--border)", background: "var(--bg-sunken)" }}>
          <input value={draft} onChange={(e) => setDraft(e.target.value)} type="email" placeholder="teammate@company.com"
            onKeyDown={(e) => { if (e.key === "Enter") invite(); }}
            style={{ flex: 1, padding: "9px 12px", borderRadius: 9, border: "1px solid var(--border-strong)", background: "var(--bg)", color: "var(--text)", fontSize: 13.5, outline: "none", fontFamily: "inherit" }} />
          <Button variant="primary" size="sm" iconRight="arrowRight" onClick={invite}>Send invite</Button>
        </div>
      )}
      {base.map((m, i) => (
        <div key={m.email + i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px var(--s5)", borderTop: i === 0 ? "none" : "1px solid var(--border)" }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--accent-soft)", color: "var(--accent-strong)", display: "grid", placeItems: "center", fontWeight: 700, fontSize: 14 }}>{m.name[0]}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 650 }}>{m.name}{m.you && <span style={{ color: "var(--text-3)", fontWeight: 500 }}> · you</span>}</div>
            <div style={{ fontSize: 12, color: "var(--text-3)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.email}</div>
          </div>
          <Badge tone={m.tone} dot>{m.role}</Badge>
        </div>
      ))}
      {invited.map((m) => (
        <div key={m.email} style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px var(--s5)", borderTop: "1px solid var(--border)" }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--bg-sunken)", color: "var(--text-3)", display: "grid", placeItems: "center", fontWeight: 700, fontSize: 14 }}>{m.email[0]?.toUpperCase()}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 650, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.email}</div>
            <div style={{ fontSize: 12, color: "var(--text-3)" }}>Invitation pending</div>
          </div>
          <Badge tone="warn" dot>Invited</Badge>
        </div>
      ))}
    </Card>
  );
}

function SupportQueue() {
  const [tickets, setTickets] = useState(() => SEED_TICKETS.map((t) => ({ ...t, status: "open" as "open" | "resolved" })));
  const [selId, setSelId] = useState(SEED_TICKETS[0].id);
  const [reply, setReply] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const sel = tickets.find((t) => t.id === selId) ?? tickets[0];
  const openCount = tickets.filter((t) => t.status === "open").length;

  function select(id: string) { setSelId(id); setReply(""); setSentTo(null); }
  function resolve(id: string) { setTickets((ts) => ts.map((t) => (t.id === id ? { ...t, status: "resolved" } : t))); }
  function send() {
    if (!reply.trim()) return;
    setSentTo(sel.id);
    resolve(sel.id);
    setReply("");
  }
  const riskTone = (r: string) => (r === "high" ? "danger" : r === "medium" ? "warn" : "neutral");

  return (
    <Card pad="0">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px var(--s5)", borderBottom: "1px solid var(--border)" }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--text-3)" }}>Support queue</span>
        <Badge tone={openCount ? "accent" : "ok"} dot>{openCount} open</Badge>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr" }}>
        {/* list */}
        <div style={{ borderRight: "1px solid var(--border)" }}>
          {tickets.map((t) => {
            const active = t.id === sel.id;
            return (
              <button key={t.id} type="button" onClick={() => select(t.id)}
                style={{ display: "block", width: "100%", textAlign: "left", padding: "13px var(--s5)", border: "none", borderBottom: "1px solid var(--border)", cursor: "pointer", background: active ? "var(--accent-soft)" : "transparent" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 650, color: "var(--text)" }}>{t.name}</span>
                  {t.status === "resolved"
                    ? <Badge tone="ok" icon="check">Resolved</Badge>
                    : <Badge tone={riskTone(t.risk)} dot>{t.topic}</Badge>}
                </div>
                <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.message}</div>
                <div className="mono" style={{ fontSize: 10.5, color: "var(--text-3)", marginTop: 5, letterSpacing: ".03em" }}>{t.ago}</div>
              </button>
            );
          })}
        </div>
        {/* detail */}
        <div style={{ padding: "var(--s5)", display: "flex", flexDirection: "column", gap: "var(--s4)" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700 }}>{sel.name}</div>
              <div style={{ fontSize: 12.5, color: "var(--text-3)" }}>{sel.email}</div>
            </div>
            <Badge tone={riskTone(sel.risk)} dot>{sel.topic}</Badge>
          </div>
          <div style={{ fontSize: 13.5, color: "var(--text-2)", lineHeight: 1.6, background: "var(--bg-sunken)", padding: "13px 15px", borderRadius: "var(--r2)" }}>{sel.message}</div>

          {sentTo === sel.id ? (
            <div style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 13, color: "var(--ok)", fontWeight: 600 }}>
              <Icon name="check" size={16} stroke={2.2} /> Reply sent to {sel.email} · ticket resolved.
            </div>
          ) : (
            <>
              <textarea value={reply} onChange={(e) => setReply(e.target.value)} placeholder={`Reply to ${sel.name}…`}
                style={{ width: "100%", minHeight: 92, resize: "vertical", padding: "11px 13px", borderRadius: 10, border: "1px solid var(--border-strong)", background: "var(--bg)", color: "var(--text)", fontSize: 13.5, outline: "none", fontFamily: "inherit", lineHeight: 1.5 }} />
              <div style={{ display: "flex", gap: 10 }}>
                <Button variant="primary" icon="mail" onClick={send} disabled={!reply.trim()}>Send reply</Button>
                {sel.status === "open"
                  ? <Button variant="default" icon="check" onClick={() => resolve(sel.id)}>Mark resolved</Button>
                  : <Badge tone="ok" icon="check" style={{ alignSelf: "center" }}>Resolved</Badge>}
              </div>
            </>
          )}
        </div>
      </div>
    </Card>
  );
}

// ---- shared bits ------------------------------------------------------
function SectionLabel({ children, bare }: { children: React.ReactNode; bare?: boolean }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--text-3)",
      padding: bare ? 0 : "14px var(--s5)", borderBottom: bare ? "none" : "1px solid var(--border)",
    }}>{children}</div>
  );
}

function GoogleG() {
  return (
    <svg width="22" height="22" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.1 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.1 29.5 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.1-11.3-7.6l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.1 5.6l6.2 5.2C39.9 36 44 30.5 44 24c0-1.3-.1-2.3-.4-3.5z" />
    </svg>
  );
}
