"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { BrandMark } from "@/components/BrandMark";
import { Wordmark } from "@/components/Wordmark";
import { getBrowserSupabase, supabaseEnabled } from "@/lib/supabase/client";

type OAuthProvider = "google" | "azure" | "github";

function LoginScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/dashboard";

  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState<null | "email" | OAuthProvider>(null);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const redirectTo =
    typeof window !== "undefined"
      ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`
      : undefined;

  async function oauth(provider: OAuthProvider) {
    setError(null);
    const supabase = getBrowserSupabase();
    if (!supabase) return router.push(next); // demo mode
    setBusy(provider);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo },
    });
    if (error) {
      setError(error.message);
      setBusy(null);
    }
    // On success the browser is redirected to the provider.
  }

  async function continueWithEmail(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const supabase = getBrowserSupabase();
    if (!supabase) return router.push(next); // demo mode
    setBusy("email");
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    });
    setBusy(null);
    if (error) setError(error.message);
    else setSent(true);
  }

  return (
    <div className="auth-grid">
      <style>{authCss}</style>

      {/* ── Left: brand / hero ─────────────────────────────── */}
      <aside className="auth-left">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <BrandMark size={30} />
          <div>
            <Wordmark size={23} />
            <div className="mono" style={{ fontSize: 10.5, color: "var(--text-3)", letterSpacing: ".22em", marginTop: 4 }}>
              AGENTIC AI
            </div>
          </div>
        </div>

        <div style={{ maxWidth: 480 }}>
          <h1 style={{ fontSize: 46, fontWeight: 700, lineHeight: 1.08, letterSpacing: "-.03em" }}>
            Your autonomous <span style={{ color: "var(--accent-strong)" }}>AI workforce</span>, running the business.
          </h1>
          <p style={{ fontSize: 15.5, lineHeight: 1.7, color: "var(--text-2)", marginTop: 28, maxWidth: 440 }}>
            Eight specialized agents collaborate — strategy, operations, marketing, analytics, sales,
            research, finance and support — with real tool-calling, RAG, long-term memory and human approval.
          </p>

          <div style={{ display: "flex", gap: 56, marginTop: 48 }}>
            {[
              { v: "8", l: "AI agents" },
              { v: "RAG", l: "+ memory" },
              { v: "Live", l: "org chart" },
            ].map((s) => (
              <div key={s.l}>
                <div className="mono tnum" style={{ fontSize: 28, fontWeight: 600, letterSpacing: "-.02em", color: "var(--accent-strong)" }}>
                  {s.v}
                </div>
                <div className="mono" style={{ fontSize: 11, color: "var(--text-3)", fontWeight: 600, letterSpacing: ".1em", textTransform: "uppercase", marginTop: 8 }}>
                  {s.l}
                </div>
              </div>
            ))}
          </div>
        </div>

        <footer style={{ fontSize: 12.5, color: "var(--text-3)", lineHeight: 1.8 }}>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "6px 16px" }}>
            <span>Built by <strong style={{ color: "var(--text-2)" }}>Xorvion</strong></span>
            <Dot /><span>2026</span>
            <Dot /><a href="/" style={linkStyle}>Website ↗</a>
            <Dot /><a href="/#contact" style={linkStyle}>Contact us</a>
            <Dot /><a href="/#privacy" style={linkStyle}>Privacy Policy</a>
          </div>
          <div style={{ marginTop: 14, color: "var(--text-3)" }}>© 2026 Xorvion. All rights reserved.</div>
        </footer>
      </aside>

      {/* ── Right: sign-in panel ───────────────────────────── */}
      <main className="auth-right">
        <div style={{ width: "min(360px, 100%)" }}>
          <a href="/" style={{ ...linkStyle, display: "inline-flex", alignItems: "center", gap: 7, fontSize: 13, color: "var(--text-2)" }}>
            <Arrow dir="left" /> Back to home
          </a>

          <h2 style={{ fontSize: 27, fontWeight: 700, letterSpacing: "-.02em", marginTop: 22 }}>Sign in to HelixOS</h2>
          <p style={{ fontSize: 14, color: "var(--text-2)", marginTop: 8 }}>Welcome back. Continue with your account.</p>

          {sent ? (
            <div style={{ marginTop: 26 }}>
              <div style={{ padding: "14px 16px", borderRadius: 12, border: "1px solid var(--accent-line)", background: "var(--accent-soft)", fontSize: 14, color: "var(--text)" }}>
                Check your inbox — we sent a magic link to <strong>{email}</strong>. Open it to finish signing in.
              </div>
              <button type="button" onClick={() => setSent(false)} style={{ ...textBtn, marginTop: 14 }}>
                Use a different email
              </button>
            </div>
          ) : (
            <>
              <div style={{ display: "grid", gap: 12, marginTop: 30 }}>
                <OAuthButton label="Google" onClick={() => oauth("google")} busy={busy === "google"}><GoogleLogo /></OAuthButton>
                <OAuthButton
                  label="Microsoft"
                  onClick={() => setError("Microsoft sign-in is temporarily unavailable (server error). Please try a different method.")}
                  busy={false}
                ><MicrosoftLogo /></OAuthButton>
                <OAuthButton label="GitHub" onClick={() => oauth("github")} busy={busy === "github"}><GitHubLogo /></OAuthButton>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 14, margin: "26px 0" }}>
                <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
                <span className="mono" style={{ fontSize: 11, color: "var(--text-3)", letterSpacing: ".12em" }}>OR</span>
                <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
              </div>

              <form onSubmit={continueWithEmail}>
                <label style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-2)", display: "block", marginBottom: 7 }}>
                  Email address
                </label>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-3)", display: "grid" }}>
                    <MailIcon />
                  </span>
                  <input
                    type="email"
                    required
                    value={email}
                    autoComplete="email"
                    placeholder="you@company.com"
                    onChange={(e) => setEmail(e.target.value)}
                    style={{
                      width: "100%", padding: "11px 12px 11px 38px", borderRadius: 10,
                      border: "1px solid var(--border)", background: "var(--surface-2)",
                      color: "var(--text)", fontSize: 14, outline: "none",
                    }}
                  />
                </div>

                {error && <div style={{ color: "var(--danger)", fontSize: 13, marginTop: 10 }}>{error}</div>}

                <button type="submit" disabled={busy === "email"} style={primaryBtn}>
                  {busy === "email" ? "Sending…" : <>Continue with email <Arrow dir="right" /></>}
                </button>
              </form>

              <p style={{ fontSize: 12, color: "var(--text-3)", textAlign: "center", marginTop: 16, lineHeight: 1.5 }}>
                By continuing you agree to the{" "}
                <a href="/#privacy" style={{ ...linkStyle, textDecoration: "underline" }}>Privacy Policy</a>.
                {" "}No phone number required.
              </p>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

/* ── Pieces ───────────────────────────────────────────── */

function OAuthButton({ children, label, onClick, busy }: {
  children: React.ReactNode; label: string; onClick: () => void; busy: boolean;
}) {
  const [h, setH] = useState(false);
  return (
    <button type="button" onClick={onClick} disabled={busy}
      onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{
        display: "flex", alignItems: "center", gap: 12, width: "100%",
        padding: "11px 16px", borderRadius: 10, border: "1px solid var(--border)",
        background: h ? "var(--surface-2)" : "var(--surface)", color: "var(--text)",
        fontSize: 14, fontWeight: 600, cursor: busy ? "default" : "pointer",
        opacity: busy ? 0.6 : 1, transition: "background .15s",
      }}>
      <span style={{ display: "grid", placeItems: "center", width: 18 }}>{children}</span>
      {busy ? "Redirecting…" : label}
    </button>
  );
}

const linkStyle: React.CSSProperties = { color: "var(--accent-strong)", textDecoration: "none" };
const textBtn: React.CSSProperties = { background: "none", border: "none", color: "var(--accent-strong)", cursor: "pointer", fontWeight: 600, fontSize: 13, padding: 0 };
const primaryBtn: React.CSSProperties = {
  display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%",
  marginTop: 14, padding: "12px 16px", borderRadius: 10, border: "1px solid transparent",
  background: "var(--accent)", color: "var(--accent-fg)", fontSize: 14, fontWeight: 700,
  cursor: "pointer", boxShadow: "var(--shadow-sm)",
};

function Dot() {
  return <span aria-hidden style={{ color: "var(--border-strong)" }}>·</span>;
}

function Arrow({ dir }: { dir: "left" | "right" }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      style={{ transform: dir === "left" ? "scaleX(-1)" : "none" }} aria-hidden>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" />
    </svg>
  );
}

function GoogleLogo() {
  return (
    <svg width="17" height="17" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.1 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.1 29.5 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.1-11.3-7.6l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.1 5.6l6.2 5.2C39.9 36 44 30.5 44 24c0-1.3-.1-2.3-.4-3.5z" />
    </svg>
  );
}

function MicrosoftLogo() {
  return (
    <svg width="15" height="15" viewBox="0 0 23 23" aria-hidden>
      <path fill="#F25022" d="M1 1h10v10H1z" /><path fill="#7FBA00" d="M12 1h10v10H12z" />
      <path fill="#00A4EF" d="M1 12h10v10H1z" /><path fill="#FFB900" d="M12 12h10v10H12z" />
    </svg>
  );
}

function GitHubLogo() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="var(--text)" aria-hidden>
      <path d="M12 .5C5.7.5.5 5.7.5 12c0 5.1 3.3 9.4 7.9 10.9.6.1.8-.2.8-.5v-2c-3.2.7-3.9-1.4-3.9-1.4-.5-1.3-1.3-1.7-1.3-1.7-1.1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.7 1.3 3.4 1 .1-.8.4-1.3.7-1.6-2.6-.3-5.3-1.3-5.3-5.8 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0C17.3 5 18.3 5.3 18.3 5.3c.6 1.6.2 2.8.1 3.1.8.8 1.2 1.8 1.2 3.1 0 4.5-2.7 5.5-5.3 5.8.4.4.8 1.1.8 2.2v3.3c0 .3.2.6.8.5 4.6-1.5 7.9-5.8 7.9-10.9C23.5 5.7 18.3.5 12 .5z" />
    </svg>
  );
}

const authCss = `
.auth-grid { min-height: 100vh; display: grid; grid-template-columns: 1.05fr 0.95fr; background: var(--surface); }
.auth-left {
  display: flex; flex-direction: column; justify-content: space-between; gap: 72px;
  padding: 80px 88px;
  background: linear-gradient(155deg, var(--accent-soft) 0%, oklch(0.97 0.02 var(--acc-h)) 38%, var(--bg) 100%);
}
.auth-right { display: grid; place-items: center; padding: 72px 64px; background: var(--surface); }

/* Animated halo behind the brand mark */
.brand-mark { position: relative; display: inline-grid; place-items: center; width: 30px; height: 30px; }
.brand-mark > svg { position: relative; z-index: 1; }
.brand-glow, .brand-ring { position: absolute; inset: 0; margin: auto; border-radius: 50%; pointer-events: none; }
.brand-glow {
  width: 58px; height: 58px; filter: blur(4px);
  background: radial-gradient(circle, oklch(0.74 0.17 var(--acc-h) / 0.5), transparent 66%);
  animation: brandPulse 5.5s ease-in-out infinite;
}
.brand-ring {
  width: 48px; height: 48px;
  background: conic-gradient(from 0deg, transparent 0deg, oklch(0.74 0.17 var(--acc-h) / 0.6) 110deg, transparent 230deg);
  -webkit-mask: radial-gradient(closest-side, transparent 66%, #000 68%);
  mask: radial-gradient(closest-side, transparent 66%, #000 68%);
  animation: brandSpin 6s linear infinite;
}
@keyframes brandPulse { 0%, 100% { transform: scale(0.88); opacity: 0.4; } 50% { transform: scale(1.12); opacity: 0.8; } }
@keyframes brandSpin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) {
  .brand-glow, .brand-ring { animation: none; }
}

@media (max-width: 1100px) {
  .auth-left { padding: 56px 52px; gap: 52px; }
  .auth-right { padding: 56px 40px; }
}
@media (max-width: 880px) {
  .auth-grid { grid-template-columns: 1fr; }
  .auth-left { display: none; }
}
`;

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginScreen />
    </Suspense>
  );
}
