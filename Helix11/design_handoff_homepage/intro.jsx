/* ============================================================
   HelixOS AI — public homepage (shown first, before login)
   Light themed. Hero orbit · live Command Center showcase ·
   orchestrator hub · agents · contact.
   ============================================================ */
const { useState: useIn, useEffect: useInEff, useRef: useInRef } = React;

// scroll-reveal: observes .reveal children, adds .in; timed fallback
function RevealRoot({ children, scrollRef }) {
  const innerRef = useInRef(null);
  useInEff(() => {
    const root = innerRef.current;
    if (!root) return;
    const items = root.querySelectorAll(".reveal");
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px", root: scrollRef?.current || null });
    items.forEach((it) => io.observe(it));
    const fallback = setTimeout(() => items.forEach((it) => it.classList.add("in")), 1500);
    return () => { io.disconnect(); clearTimeout(fallback); };
  }, []);
  return <div ref={innerRef}>{children}</div>;
}

// count-up that animates on mount
function useCountUp(target, dur = 1300) {
  const [v, setV] = useIn(0);
  useInEff(() => {
    let raf; const t0 = performance.now();
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / dur);
      setV(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick); else setV(target);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return v;
}

function Intro({ onStart, onPrivacy }) {
  const H = window.HELIX;
  const agents = H.AGENTS;
  const scrollRef = useInRef(null);
  const toolCount = agents.reduce((s, a) => s + a.tools.length, 0);

  const scrollTo = (id) => {
    const c = scrollRef.current; if (!c) return;
    const el = c.querySelector("#" + id);
    if (el) c.scrollTo({ top: el.offsetTop - 72, behavior: "smooth" });
  };

  const caps = [
    { icon: "knowledge", title: "RAG knowledge base", text: "Agents retrieve company docs from a vector store before they act — grounded, not guessing." },
    { icon: "memory", title: "Long-term memory", text: "Every cycle writes structured learnings the org recalls next time. It visibly improves." },
    { icon: "bolt", title: "Real tool-calling", text: "Agents decide which typed tools to call — create_campaign, aggregate_kpis — not prompt chains." },
    { icon: "trace", title: "Full observability", text: "Every decision is traced: reasoning, tools, result, duration and token cost." },
    { icon: "org", title: "Live org chart", text: "Watch agents communicate in real time as edges light up across the tree." },
    { icon: "approvals", title: "Human approval", text: "Sensitive actions pause the graph until you sign off — then resume from the checkpoint." },
  ];
  const steps = [
    { n: "01", t: "Plan", d: "Founder sets goals & KPIs", icon: "crown" },
    { n: "02", t: "Execute", d: "Operations routes to agents", icon: "flow" },
    { n: "03", t: "Evaluate", d: "Analytics reads the new state", icon: "chart" },
    { n: "04", t: "Learn", d: "Memory is written for next cycle", icon: "memory" },
  ];
  const stats = [
    { v: 8, suffix: "", label: "AI agents" },
    { v: toolCount, suffix: "+", label: "Real tools" },
    { v: 4, suffix: "", label: "RAG collections" },
    { v: 100, suffix: "%", label: "Free-tier built" },
  ];

  const navLink = { background: "none", border: "none", color: "var(--text-2)", fontSize: 13.5, fontWeight: 600, padding: "8px 12px", borderRadius: 8, cursor: "pointer" };

  return (
    <div ref={scrollRef} style={{ position: "fixed", inset: 0, overflowY: "auto", background: "var(--bg)" }}>
      {/* ---- top nav ---- */}
      <div style={{ position: "sticky", top: 0, zIndex: 20, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px var(--s10)", borderBottom: "1px solid var(--border)", background: "color-mix(in oklch, var(--bg), transparent 12%)", backdropFilter: "blur(10px)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <BrandMark size={34} />
          <div style={{ lineHeight: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 22, letterSpacing: "-.02em" }}>HelixOS</div>
            <div className="mono" style={{ fontSize: 10.5, color: "var(--text-3)", letterSpacing: ".22em", marginTop: 4 }}>AGENTIC AI</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {[["Product", "showcase"], ["Architecture", "architecture"], ["Agents", "agents"], ["Contact", "contact"]].map(([l, id]) => (
            <button key={id} onClick={() => scrollTo(id)} style={navLink}
              onMouseEnter={(e) => e.currentTarget.style.color = "var(--text)"} onMouseLeave={(e) => e.currentTarget.style.color = "var(--text-2)"}>{l}</button>
          ))}
          <div style={{ width: 1, height: 22, background: "var(--border)", margin: "0 8px" }}></div>
          <Button variant="ghost" onClick={onStart}>Sign in</Button>
          <Button variant="primary" iconRight="arrowRight" onClick={onStart}>Get started</Button>
        </div>
      </div>

      <RevealRoot scrollRef={scrollRef}>
        {/* ---- hero ---- */}
        <section style={{ position: "relative", overflow: "hidden", padding: "var(--s12) var(--s10) var(--s10)" }}>
          <div style={{ position: "absolute", top: "-30%", left: "18%", width: 560, height: 560, borderRadius: "50%", background: "radial-gradient(circle, oklch(0.78 0.16 var(--acc-h) / 0.13), transparent 65%)", animation: "aurora 14s ease-in-out infinite", pointerEvents: "none" }}></div>
          <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(var(--border-strong) 1px, transparent 1px)", backgroundSize: "26px 26px", opacity: 0.35, maskImage: "radial-gradient(circle at 50% 0%, black, transparent 72%)", WebkitMaskImage: "radial-gradient(circle at 50% 0%, black, transparent 72%)", pointerEvents: "none" }}></div>
          <div style={{ position: "relative", maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: "1.08fr 0.92fr", gap: "var(--s10)", alignItems: "center" }}>
            <div className="reveal in">
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 13px", borderRadius: 99, border: "1px solid var(--border-strong)", background: "var(--surface)" }}>
                <span style={{ width: 7, height: 7, borderRadius: 99, background: "var(--accent)", animation: "pulse-dot 1.4s infinite" }}></span>
                <span className="mono" style={{ fontSize: 11.5, fontWeight: 600, letterSpacing: ".14em", color: "var(--text-2)" }}>AGENTIC AI&nbsp;&nbsp;//&nbsp;&nbsp;EST. 2026</span>
              </span>
              <h1 style={{ fontSize: 58, fontWeight: 700, lineHeight: 1.04, letterSpacing: "-.03em", marginTop: 22 }}>
                A virtual company<br />of <span style={{ color: "var(--accent-strong)" }}>AI employees.</span>
              </h1>
              <p style={{ fontSize: 17, color: "var(--text-2)", lineHeight: 1.62, marginTop: 22, maxWidth: 500 }}>
                HelixOS is an <strong style={{ color: "var(--text)" }}>agentic AI</strong> platform — eight specialist agents that collaborate to autonomously operate and grow a business, with real tools, RAG, long-term memory and human oversight.
              </p>
              <div style={{ display: "flex", gap: 12, marginTop: 32 }}>
                <Button variant="primary" size="lg" iconRight="arrowRight" onClick={onStart}>Get started</Button>
                <Button variant="default" size="lg" icon="play" onClick={onStart}>Watch a cycle</Button>
              </div>
            </div>
            <div className="reveal in">
              <HeroOrbit size={400} />
            </div>
          </div>
        </section>

        {/* ---- stat band ---- */}
        <section style={{ borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)", background: "var(--surface)" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto", padding: "var(--s8) var(--s10)", display: "grid", gridTemplateColumns: "repeat(4, 1fr)" }}>
            {stats.map((s, i) => <Stat key={i} {...s} divider={i > 0} />)}
          </div>
        </section>

        {/* ---- command center showcase ---- */}
        <Band id="showcase">
          <div style={{ textAlign: "center", maxWidth: 660, margin: "0 auto" }}>
            <Eyebrow center>Inside HelixOS</Eyebrow>
            <H2 center>The Command Center, live.</H2>
            <p className="reveal" style={{ fontSize: 15.5, color: "var(--text-2)", lineHeight: 1.6, marginTop: 14 }}>
              One screen for the whole autonomous org. Watch business KPIs move, agents light up the live graph, approvals queue for your sign-off, and the activity feed stream — all in real time as a cycle runs.
            </p>
          </div>
          <div className="reveal" style={{ marginTop: "var(--s10)" }}>
            <div style={{ position: "relative" }}>
              <div style={{ position: "absolute", inset: "-4% -2% -8%", background: "radial-gradient(circle at 50% 40%, oklch(0.78 0.16 var(--acc-h) / 0.1), transparent 70%)", pointerEvents: "none", filter: "blur(10px)" }}></div>
              <ScaleToFit designWidth={1240}><AppFrameMock /></ScaleToFit>
            </div>
          </div>
          {/* the cycle, explained */}
          <div style={{ marginTop: "var(--s10)" }}>
            <div className="reveal" style={{ textAlign: "center", fontSize: 12.5, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--text-3)", marginBottom: "var(--s5)" }}>How one autonomous cycle runs</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "var(--s4)" }}>
              {steps.map((s, i) => (
                <div key={s.n} className="reveal" style={{ transitionDelay: `${i * 80}ms`, position: "relative" }}>
                  <Card hover style={{ height: "100%" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ width: 40, height: 40, borderRadius: 11, background: "var(--accent-soft)", color: "var(--accent-strong)", display: "grid", placeItems: "center" }}><Icon name={s.icon} size={20} /></div>
                      <span className="mono" style={{ fontSize: 13, fontWeight: 600, color: "var(--text-3)" }}>{s.n}</span>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 16, marginTop: 14 }}>{s.t}</div>
                    <div style={{ fontSize: 13, color: "var(--text-2)", marginTop: 4, lineHeight: 1.5 }}>{s.d}</div>
                  </Card>
                  {i < steps.length - 1 && (
                    <div style={{ position: "absolute", right: "calc(var(--s4) * -0.5)", top: "50%", transform: "translate(50%,-50%)", color: "var(--border-strong)", zIndex: 1 }}>
                      <Icon name="arrowRight" size={16} stroke={2} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </Band>

        {/* ---- orchestrator architecture ---- */}
        <Band id="architecture" tint>
          <div style={{ textAlign: "center", maxWidth: 660, margin: "0 auto" }}>
            <Eyebrow center>The architecture</Eyebrow>
            <H2 center>One core orchestrates every capability.</H2>
            <p className="reveal" style={{ fontSize: 15.5, color: "var(--text-2)", lineHeight: 1.6, marginTop: 14 }}>
              At the center sits the HelixOS orchestrator. It routes work between reasoning, retrieval, tools, memory, approvals and observability — so every agent action is grounded, traced and accountable.
            </p>
          </div>
          <div className="reveal"><OrchestratorHub /></div>
        </Band>

        {/* ---- about ---- */}
        <Band>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--s10)", alignItems: "center" }}>
            <div>
              <Eyebrow>What is HelixOS</Eyebrow>
              <H2>An autonomous workforce, not another chatbot.</H2>
              <p className="reveal" style={{ fontSize: 15, color: "var(--text-2)", lineHeight: 1.65, marginTop: 14 }}>
                Most "AI tools" answer one prompt at a time. HelixOS is a <strong style={{ color: "var(--text)" }}>multi-agent organization</strong>: a Founder sets strategy, Operations orchestrates, and specialist agents execute real work — then the whole org evaluates results and learns for the next cycle.
              </p>
              <p className="reveal" style={{ fontSize: 15, color: "var(--text-2)", lineHeight: 1.65, marginTop: 12 }}>
                It's built for small teams who can't hire eight specialists — and engineered to actually work: real tool-calling, retrieval-grounded decisions, durable memory, and a human in the loop for anything sensitive.
              </p>
            </div>
            <div className="reveal" style={{ display: "flex", flexDirection: "column", gap: "var(--s3)" }}>
              {[["Grounded", "Retrieves company knowledge before acting (RAG)"], ["Improving", "Writes & recalls learnings every cycle"], ["Accountable", "Every decision traced with cost & duration"], ["Safe", "Human approval gates sensitive actions"]].map(([t, d]) => (
                <div key={t} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "14px 16px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r2)" }}>
                  <div style={{ width: 26, height: 26, borderRadius: 8, background: "var(--accent-soft)", color: "var(--accent-strong)", display: "grid", placeItems: "center", flexShrink: 0, marginTop: 1 }}><Icon name="check" size={15} stroke={2.4} /></div>
                  <div>
                    <div style={{ fontWeight: 650, fontSize: 14 }}>{t}</div>
                    <div style={{ fontSize: 13, color: "var(--text-2)", marginTop: 2, lineHeight: 1.45 }}>{d}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Band>

        {/* ---- marquee of agents ---- */}
        <section style={{ borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)", overflow: "hidden", background: "var(--surface)", padding: "var(--s5) 0" }}>
          <div style={{ display: "flex", width: "max-content", gap: "var(--s8)", animation: "marquee 26s linear infinite" }}>
            {[...agents, ...agents].map((a, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                <AgentGlyph id={a.id} size={28} />
                <span style={{ fontWeight: 650, fontSize: 14 }}>{a.name}</span>
                <span style={{ fontSize: 12.5, color: "var(--text-3)" }}>{a.role}</span>
                <span style={{ color: "var(--border-strong)", marginLeft: "var(--s4)" }}>•</span>
              </div>
            ))}
          </div>
        </section>

        {/* ---- agents ---- */}
        <Band id="agents">
          <Eyebrow>Your AI workforce</Eyebrow>
          <H2>Eight specialists, one autonomous org.</H2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "var(--s4)", marginTop: "var(--s8)" }}>
            {agents.map((a, i) => (
              <div key={a.id} className="reveal" style={{ transitionDelay: `${(i % 4) * 80}ms` }}>
                <Card hover style={{ height: "100%" }}>
                  <AgentGlyph id={a.id} size={44} />
                  <div style={{ fontWeight: 650, fontSize: 16, marginTop: 14 }}>{a.name}</div>
                  <div style={{ fontSize: 12, color: "var(--text-3)", fontWeight: 600 }}>{a.role}</div>
                  <div style={{ fontSize: 12.5, color: "var(--text-2)", lineHeight: 1.5, marginTop: 10 }}>{a.blurb}</div>
                </Card>
              </div>
            ))}
          </div>
        </Band>

        {/* ---- capabilities ---- */}
        <Band tint>
          <Eyebrow>Built to stand out</Eyebrow>
          <H2>The differentiators, working — not just listed.</H2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "var(--s4)", marginTop: "var(--s8)" }}>
            {caps.map((c, i) => (
              <div key={c.title} className="reveal" style={{ transitionDelay: `${(i % 3) * 90}ms` }}>
                <Card hover style={{ height: "100%" }}>
                  <div style={{ width: 38, height: 38, borderRadius: 11, background: "var(--bg-sunken)", color: "var(--accent-strong)", display: "grid", placeItems: "center", marginBottom: 12 }}><Icon name={c.icon} size={19} /></div>
                  <div style={{ fontWeight: 650, fontSize: 15.5 }}>{c.title}</div>
                  <div style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.55, marginTop: 6 }}>{c.text}</div>
                </Card>
              </div>
            ))}
          </div>
        </Band>

        {/* ---- contact ---- */}
        <Band id="contact">
          <div style={{ display: "grid", gridTemplateColumns: "0.9fr 1.1fr", gap: "var(--s10)", alignItems: "start" }}>
            <div className="reveal">
              <Eyebrow>Get in touch</Eyebrow>
              <H2>Questions? Talk to us.</H2>
              <p style={{ fontSize: 15, color: "var(--text-2)", lineHeight: 1.6, marginTop: 14 }}>
                Want a walkthrough, a partnership, or help getting started with HelixOS? Send a note and the Xorvion team will get back within 24 hours.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 24 }}>
                {[["mail", "xorvion.ai@gmail.com", "Email us"], ["globe", "xorvion-ai.vercel.app", "Visit the site"]].map(([ic, val, sub]) => (
                  <div key={val} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 11, background: "var(--surface)", border: "1px solid var(--border)", color: "var(--accent-strong)", display: "grid", placeItems: "center" }}><Icon name={ic} size={18} /></div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{val}</div>
                      <div style={{ fontSize: 12, color: "var(--text-3)" }}>{sub}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="reveal"><ContactBox /></div>
          </div>
        </Band>

        {/* ---- final CTA + footer ---- */}
        <Band tint>
          <div className="reveal">
            <Card style={{ textAlign: "center", padding: "var(--s12) var(--s8)", background: "linear-gradient(150deg, var(--accent-soft), var(--surface) 70%)", borderColor: "var(--accent-line)" }}>
              <H2 center>Ready to watch the org run itself?</H2>
              <p style={{ fontSize: 15, color: "var(--text-2)", marginTop: 10, maxWidth: 460, marginInline: "auto" }}>
                Sign in, step into the Command Center, hit <strong>Run cycle</strong>, and see all eight agents collaborate live.
              </p>
              <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 26 }}>
                <Button variant="primary" size="lg" iconRight="arrowRight" onClick={onStart}>Get started</Button>
              </div>
            </Card>
          </div>
          <div style={{ marginTop: "var(--s8)", paddingTop: "var(--s6)", borderTop: "1px solid var(--border)" }}>
            <XorvionFooter onPrivacy={onPrivacy} onContact={() => scrollTo("contact")} />
          </div>
        </Band>
      </RevealRoot>
    </div>
  );
}

const TOPICS = ["Product partnership", "Get started / demo", "General question", "Press & media", "Something else"];

// custom dropdown — the native <select> popup can't be themed, so we render
// our own menu that matches the form's surface, accent and radii.
function TopicSelect({ value, onChange, field }) {
  const [open, setOpen] = useIn(false);
  const ref = useInRef(null);
  useInEff(() => {
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onKey); };
  }, []);
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button type="button" onClick={() => setOpen((o) => !o)}
        style={{ ...field, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, fontWeight: 600, cursor: "pointer", textAlign: "left", borderColor: open ? "var(--accent)" : "var(--border-strong)" }}>
        <span>{value}</span>
        <Icon name="chevronDown" size={16} style={{ color: "var(--text-3)", flexShrink: 0, transform: open ? "rotate(180deg)" : "none", transition: "transform .18s" }} />
      </button>
      {open && (
        <div className="fade-up" style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, zIndex: 40, background: "var(--surface)", border: "1px solid var(--border-strong)", borderRadius: 12, boxShadow: "var(--shadow-lg)", padding: 6 }}>
          {TOPICS.map((t) => {
            const sel = t === value;
            return (
              <button key={t} type="button" onClick={() => { onChange(t); setOpen(false); }}
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, width: "100%", textAlign: "left", padding: "10px 12px", borderRadius: 8, border: "none", background: sel ? "var(--accent-soft)" : "transparent", color: sel ? "var(--accent-strong)" : "var(--text)", fontSize: 14, fontWeight: sel ? 650 : 550, cursor: "pointer" }}
                onMouseEnter={(e) => { if (!sel) e.currentTarget.style.background = "var(--bg-sunken)"; }}
                onMouseLeave={(e) => { if (!sel) e.currentTarget.style.background = "transparent"; }}>
                {t}{sel && <Icon name="check" size={15} stroke={2.4} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ContactBox() {
  const [sent, setSent] = useIn(false);
  const [f, setF] = useIn({ name: "", email: "", company: "", topic: TOPICS[0], msg: "" });
  const lbl = { fontSize: 11, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--text-3)", display: "block", marginBottom: 8 };
  const inp = { width: "100%", padding: "13px 15px", borderRadius: 12, border: "1px solid var(--border-strong)", background: "var(--bg)", color: "var(--text)", fontSize: 14, outline: "none", fontFamily: "inherit" };
  return (
    <Card style={{ boxShadow: "var(--shadow-md)", padding: "var(--s8)" }}>
      {sent ? (
        <div style={{ textAlign: "center", padding: "var(--s10) var(--s4)" }}>
          <div style={{ width: 52, height: 52, borderRadius: 99, background: "var(--ok-soft)", color: "var(--ok)", display: "grid", placeItems: "center", margin: "0 auto 14px" }}><Icon name="check" size={26} stroke={2.2} /></div>
          <div style={{ fontWeight: 650, fontSize: 16 }}>Thanks — message sent</div>
          <div style={{ fontSize: 13, color: "var(--text-2)", marginTop: 4 }}>We'll reply to {f.email || "your inbox"} within 24 hours.</div>
          <div style={{ marginTop: 18 }}><Button variant="default" onClick={() => { setSent(false); setF({ name: "", email: "", company: "", topic: TOPICS[0], msg: "" }); }}>Send another</Button></div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--s5)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--s5)" }}>
            <div>
              <label style={lbl}>Name</label>
              <input style={inp} placeholder="Jane Doe" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
            </div>
            <div>
              <label style={lbl}>Email</label>
              <input style={inp} placeholder="you@company.com" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
            </div>
          </div>
          <div>
            <label style={lbl}>Company / Organization</label>
            <input style={inp} placeholder="Optional" value={f.company} onChange={(e) => setF({ ...f, company: e.target.value })} />
          </div>
          <div>
            <label style={lbl}>What's this about?</label>
            <TopicSelect value={f.topic} onChange={(t) => setF({ ...f, topic: t })} field={inp} />
          </div>
          <div>
            <label style={lbl}>Message</label>
            <textarea style={{ ...inp, resize: "vertical", minHeight: 130, lineHeight: 1.5 }} rows={5} placeholder="A few sentences about what you're working on…" value={f.msg} onChange={(e) => setF({ ...f, msg: e.target.value })}></textarea>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <Button variant="primary" size="lg" iconRight="arrowRight" onClick={() => setSent(true)}>Send message</Button>
            <span style={{ fontSize: 12.5, color: "var(--text-3)", lineHeight: 1.45, maxWidth: 260 }}>By sending, you agree to be contacted at the email above.</span>
          </div>
        </div>
      )}
    </Card>
  );
}

function Stat({ v, suffix, label, divider }) {
  const n = useCountUp(v);
  return (
    <div className="reveal" style={{ textAlign: "center", borderLeft: divider ? "1px solid var(--border)" : "none", padding: "0 var(--s4)" }}>
      <div className="mono tnum" style={{ fontSize: 40, fontWeight: 600, letterSpacing: "-.02em", color: "var(--accent-strong)" }}>{Math.round(n)}{suffix}</div>
      <div className="mono" style={{ fontSize: 11, color: "var(--text-3)", fontWeight: 600, letterSpacing: ".1em", textTransform: "uppercase", marginTop: 8 }}>{label}</div>
    </div>
  );
}

function Band({ children, tint, id }) {
  return (
    <section id={id} style={{ background: tint ? "var(--bg-sunken)" : "transparent", borderTop: "1px solid var(--border)" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "var(--s12) var(--s10)" }}>{children}</div>
    </section>
  );
}
function Eyebrow({ children, center }) {
  return <div className="reveal" style={{ fontSize: 12.5, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--accent-strong)", textAlign: center ? "center" : "left" }}>{children}</div>;
}
function H2({ children, center }) {
  return <h2 className="reveal" style={{ fontSize: 33, fontWeight: 700, letterSpacing: "-.02em", marginTop: 12, lineHeight: 1.15, textAlign: center ? "center" : "left" }}>{children}</h2>;
}

Object.assign(window, { Intro });
