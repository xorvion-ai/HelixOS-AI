# Handoff: HelixOS Marketing Homepage (redesign)

## Overview
This bundle documents the **public marketing homepage** for **HelixOS** ("Agentic AI" platform by Xorvion) — the page shown to logged-out visitors before sign-in. It is a long-scroll, single-page site with: top nav, hero, stat band, a live **Command Center product showcase**, an **orchestrator architecture diagram**, an About block, an agents marquee + grid, a capabilities grid, a contact form, and a footer CTA.

The logo is **unchanged** — keep the existing HelixOS "Linkgraph" mark (three connected nodes; see Assets).

## About the Design Files
The files in this bundle are **design references built in HTML/React (via in-browser Babel)** — prototypes that show the intended look and behavior. They are **not production code to copy verbatim**. The task is to **recreate these designs in the target codebase** using its established framework, component library, and conventions (e.g. a real React/Next.js + CSS-modules/Tailwind setup). If no front-end environment exists yet, pick the most appropriate modern stack and implement there.

Notably, the prototype renders the **real app's Command Center component** (`CommandCenter` from `screens1.jsx`) inside a scaled, non-interactive frame to act as the product "screenshot." In production you can either (a) embed a real read-only instance of the dashboard, or (b) replace it with a static screenshot/image. Either is acceptable — the section's job is to show the product.

## Fidelity
**High-fidelity.** Final colors, typography, spacing, radii, shadows, and interactions are all specified below and in `styles.css`. Recreate pixel-faithfully, then map the raw values onto the codebase's design-token system.

---

## Global / Theme

- **Theme:** light. Warm-neutral background, single accent (amber/orange). The whole design is driven by CSS custom properties on `:root` / `[data-theme="light"]` (see `styles.css`) plus four data-attributes (`data-theme`, `--acc-h`, `--acc-c`, `--d`) the app's Tweaks panel flips at runtime. For a static rebuild you can inline the resolved values from the Design Tokens section.
- **Fonts:** `Geist` (UI) + `Geist Mono` (mono labels/numbers), loaded from Google Fonts. Mono is used for eyebrow/stat labels and the "AGENTIC AI" tagline.
- **Content width:** centered column, `max-width: 1100px`, horizontal padding `40px` (`--s10`).
- **Section rhythm:** each band has `border-top: 1px solid var(--border)` and vertical padding `48px` (`--s12`). Alternating bands use a slightly sunken background (`--bg-sunken`).

---

## Screens / Views

There is one screen (the homepage), composed of stacked sections. Top → bottom:

### 1. Top Nav (sticky)
- **Layout:** sticky top bar, `space-between`, padding `12px 40px`, `border-bottom: 1px solid var(--border)`, translucent background `color-mix(in oklch, var(--bg), transparent 12%)` + `backdrop-filter: blur(10px)`, `z-index: 20`.
- **Left — logo lockup:** the Linkgraph mark at **34px**, then a stacked wordmark:
  - "HelixOS" — weight 700, **22px**, letter-spacing `-.02em`.
  - "AGENTIC AI" — Geist Mono, **10.5px**, color `--text-3`, letter-spacing `.22em`, `margin-top: 4px`.
  - (This enlarged logo + tagline was a specific requirement.)
- **Right — nav:** text buttons "Product", "Architecture", "Agents", "Contact" (13.5px / 600, color `--text-2` → `--text` on hover), each smooth-scrolls to the matching section id (`#showcase`, `#architecture`, `#agents`, `#contact`). Then a `1px` divider, a **ghost** "Sign in" button and a **primary** "Get started →" button.

### 2. Hero
- **Layout:** 2-column grid `1.08fr 0.92fr`, gap `40px`, items centered, `max-width: 1100px`. Section padding `48px 40px 40px`. `position: relative; overflow: hidden`.
- **Background decoration (behind content, `pointer-events:none`):**
  - An aurora glow blob: `560×560` circle at `top:-30% left:18%`, `radial-gradient(circle, oklch(0.78 0.16 var(--acc-h) / 0.13), transparent 65%)`, animated `aurora 14s ease-in-out infinite`.
  - A masked dot grid over the whole section: `radial-gradient(var(--border-strong) 1px, transparent 1px)` at `background-size: 26px 26px`, `opacity: .35`, masked with `radial-gradient(circle at 50% 0%, black, transparent 72%)`.
- **Left column:**
  - **Eyebrow pill:** inline-flex, `padding: 6px 13px`, `border: 1px solid var(--border-strong)`, `background: var(--surface)`, `border-radius: 99px`. Contains a 7px accent dot (pulsing, `pulse-dot 1.4s infinite`) + mono text "AGENTIC AI // EST. 2026" (11.5px / 600, letter-spacing `.14em`, color `--text-2`).
  - **H1:** "A virtual company\nof AI employees." — weight 700, **58px**, line-height 1.04, letter-spacing `-.03em`, `margin-top: 22px`. The phrase **"AI employees."** is colored `--accent-strong`.
  - **Body:** 17px, color `--text-2`, line-height 1.62, `max-width: 500px`, `margin-top: 22px`. Copy: *"HelixOS is an **agentic AI** platform — eight specialist agents that collaborate to autonomously operate and grow a business, with real tools, RAG, long-term memory and human oversight."* — "agentic AI" is bold and colored `--text`.
  - **Buttons:** primary "Get started →" (size lg) + default "Watch a cycle" (size lg, play icon), gap 12, `margin-top: 32px`.
- **Right column — `HeroOrbit` (see `home-extras.jsx`):** a 400px square containing the brand mark inside a soft "orb," ringed by concentric circles and small orbiting dots. Details:
  - Outer accent glow (radial, `aurora` animation).
  - 3 concentric `<circle>` rings (radii 0.92 / 0.66 / 0.42 of half-size) stroked with `--border-strong`; the outer ring dashed `2 7` and slowly rotating (`spin 60s`), the inner dashed `1 6` rotating reverse (`spin 40s`).
  - 5 accent dots positioned on the rings (filled `--accent`, with a soft accent drop-shadow).
  - Center: **`BrandOrb`** — a circle (`size×0.42`≈168px) with `radial-gradient(circle at 40% 32%, var(--surface), var(--bg-sunken) 78%)`, `box-shadow: var(--shadow-lg), inset 0 1px 1px rgba(255,255,255,.6), 0 0 0 1px var(--border)`, a bottom accent under-glow, and the **Linkgraph mark** centered with a `drop-shadow` glow. The whole orb floats (`float-y 7s`).

### 3. Stat Band
- **Layout:** full-width band, `background: var(--surface)`, top+bottom borders. Inner: 4-column grid, padding `32px 40px`, `max-width: 1100px`.
- **Each stat (`Stat`):** centered; columns 2–4 have `border-left: 1px solid var(--border)`. Big number in Geist Mono `40px / 600`, color `--accent-strong`, animated count-up on mount (cubic ease-out, ~1.3s). Below it a mono uppercase label, 11px / 600, `--text-3`, letter-spacing `.1em`, `margin-top: 8px`.
- **Values:** `8` AI AGENTS · `27+` REAL TOOLS · `4` RAG COLLECTIONS · `100%` FREE-TIER BUILT. (The "27+" tool count is computed from data — sum of every agent's `tools[]`.)

### 4. Command Center Showcase  — `id="showcase"`
- **Heading block:** centered, `max-width: 660px`. Eyebrow "INSIDE HELIXOS" (accent), H2 "The Command Center, live." (33px / 700, `-.02em`), sub-paragraph 15.5px `--text-2`.
- **The frame:** the full app UI rendered at a fixed design width of **1240px** and scaled down to fit the column via a `ScaleToFit` wrapper (measures container width, applies `transform: scale()`, sets wrapper height to scaled content height). It is wrapped in a soft radial accent glow. The frame itself (`AppFrameMock`):
  - `display:flex`, height 768px, `border: 1px solid var(--border-strong)`, `border-radius: 16px`, `box-shadow: var(--shadow-lg)`, `overflow: hidden`, `pointer-events: none` (it reads as a screenshot).
  - **Left sidebar (214px):** logo lockup (mark 30px + "HelixOS" 18px + "AGENTIC AI" mono), then nav list — Command Center (active: `--accent-soft` bg, `--accent-strong` text), Live Org Chart, Observability, Agents, Approvals (with a `2` warn badge), Knowledge Base, Memory, Simulation. Bottom: a user chip ("Andre · Founder · CouponEx workspace").
  - **Main:** header with "Command Center" title + subtitle, a right-aligned "Cycle 06" readout, divider, and a "Running cycle…" pill (accent bg, spinner). Body renders the real **`CommandCenter`** dashboard: a 4-up KPI card row (MRR, Active Users, Churn, CAC — each with delta badge + sparkline), a "Live org chart" card (radial graph with one active/pulsing edge), and a right rail (Active goal card, Pending approvals, Agent activity feed).
- **"How one autonomous cycle runs" strip:** a centered mono-uppercase label, then a 4-column grid of cards (`Plan → Execute → Evaluate → Learn`), each with an accent-soft icon chip (40px, radius 11), a mono step number (01–04), a 16px title and a 13px description. A small chevron-right sits between cards.

### 5. Orchestrator Architecture  — `id="architecture"` (sunken band)
- **Heading block:** centered. Eyebrow "THE ARCHITECTURE", H2 "One core orchestrates every capability.", sub-paragraph.
- **`OrchestratorHub`:** a `position: relative`, `max-width: 1000px`, `height: 600px` stage:
  - **Center hub:** concentric rings (220px solid `--border` ring + 168px dashed `--border-strong` ring rotating `spin 50s`) around a 120px `BrandOrb`. Below it: mono label "HELIXOS CORE" (15px / 600, letter-spacing `.22em`) and "// ORCHESTRATOR" (11px, `--text-3`, `.2em`).
  - **6 capability cards (`CapNode`)** absolutely positioned around the hub at these center percentages: Reasoning (16%,16%), Knowledge (50%,9%), Tools (84%,16%), Memory (16%,84%), Approvals (50%,91%), Observability (84%,84%). Each card: width 216px, `padding: 13px 15px`, `border-radius: 14px`, `background: var(--surface)`, `border: 1px solid var(--border)`, `box-shadow: var(--shadow-md)`; an icon chip (38px, radius 10, `--accent-soft` bg, `--accent-strong` icon) + a 15px/700 title + a mono sub-label (10px, `.12em`, e.g. "PLAN · DECIDE").
  - **Connectors:** an SVG layer (viewBox `0 0 1000 600`) draws, from hub center (500,300) to each card, a static dashed line (`--border-strong`, `dasharray 2 7`) plus an animated dashed line (`--accent`, `dasharray 2 26`, `flow` keyframe) for a flowing-packet effect.

### 6. About
- 2-column grid `1fr 1fr`, gap 40px. **Left:** eyebrow "WHAT IS HELIXOS", H2 "An autonomous workforce, not another chatbot.", two body paragraphs (15px / `--text-2`). **Right:** 4 stacked feature rows (Grounded / Improving / Accountable / Safe), each a `--surface` card with a 26px accent-soft check chip + title + description.

### 7. Agents Marquee + Grid  — `id="agents"`
- **Marquee:** full-width `--surface` band, padding `20px 0`, an infinite horizontal scroll (`marquee 26s linear infinite`) of all 8 agents (glyph + name + role + bullet), list duplicated for seamless loop.
- **Grid:** eyebrow "YOUR AI WORKFORCE", H2 "Eight specialists, one autonomous org.", then a 4-column card grid (8 cards). Each card: `AgentGlyph` (44px, per-agent hue), name (16px / 650), role (12px `--text-3`), blurb (12.5px `--text-2`). Cards lift on hover.

### 8. Capabilities (sunken band)
- Eyebrow "BUILT TO STAND OUT", H2 "The differentiators, working — not just listed.", 3-column grid of 6 cards (RAG knowledge base, Long-term memory, Real tool-calling, Full observability, Live org chart, Human approval). Each: 38px icon chip (`--bg-sunken` bg, `--accent-strong` icon), title (15.5px / 650), text (13px `--text-2`).

### 9. Contact  — `id="contact"`
- 2-column grid `0.9fr 1.1fr`, gap 40px, `align-items: start`.
- **Left:** eyebrow "GET IN TOUCH", H2 "Questions? Talk to us.", paragraph, then a contact-method list — two rows, each a 38px `--surface` icon tile + value/label:
  - **mail** → **`xorvion.ai@gmail.com`** / "Email us"  *(this is the live contact email — also used in the footer "Contact us" mailto and the in-app Support screen)*
  - **globe** → `xorvion-ai.vercel.app` / "Visit the site"
- **Right — `ContactBox`:** a `--surface` card (`padding: 32px`, `box-shadow: var(--shadow-md)`). Vertical stack, gap 20px:
  - Row of two fields: **Name** (placeholder "Jane Doe") and **Email** (placeholder "you@company.com").
  - **Company / Organization** (placeholder "Optional").
  - **What's this about?** — a **custom dropdown** (NOT a native `<select>` — see Interactions). Options: Product partnership · Get started / demo · General question · Press & media · Something else.
  - **Message** — textarea, `min-height: 130px`, placeholder "A few sentences about what you're working on…".
  - Footer row: primary "Send message →" button + caption "By sending, you agree to be contacted at the email above." (12.5px, `--text-3`).
  - **Field styling:** label = 11px / 700, uppercase, letter-spacing `.12em`, color `--text-3`, `margin-bottom: 8px`. Input = full width, `padding: 13px 15px`, `border-radius: 12px`, `border: 1px solid var(--border-strong)`, `background: var(--bg)`, font 14px.
  - **Submitted state:** replaces the form with a centered ok-check badge + "Thanks — message sent" + "We'll reply to {email} within 24 hours." + a "Send another" button.

### 10. Footer CTA (sunken band)
- A centered gradient card (`linear-gradient(150deg, var(--accent-soft), var(--surface) 70%)`, border `--accent-line`, padding `48px 32px`): H2 "Ready to watch the org run itself?", paragraph, primary "Get started →". Below, a divider + footer row (privacy & contact links, copyright).

---

## Interactions & Behavior
- **Nav links** smooth-scroll the page container to the target section (offset ~72px for the sticky nav).
- **Scroll reveals:** elements with class `.reveal` start at `opacity:0; translateY(22px)` and animate to visible (`.in`) via an IntersectionObserver (threshold 0.12). A 1.5s timer reveals everything as a fallback so content never stays hidden. Transition: `opacity/transform .8s cubic-bezier(.2,.7,.2,1)`.
- **Count-up stats** animate from 0 → target on mount (rAF, cubic ease-out, settle exactly on target).
- **Custom dropdown** (the "What's this about?" field): a button toggles a themed menu (absolute, `--surface`, `border-radius: 12px`, `var(--shadow-lg)`). Selected option gets `--accent-soft` bg + `--accent-strong` text + a check icon; others hover to `--bg-sunken`. The chevron rotates 180° when open. Closes on outside-click or `Escape`. **Do not** use a native `<select>` — its OS popup can't be themed (this was a fix).
- **Buttons:** primary = accent bg → `--accent-strong` on hover, `--accent-fg` text, subtle shadow; default = `--surface` → `--surface-2` on hover with a `--border-strong` border; ghost = transparent → `--bg-sunken`. Sizes sm/md/lg map to padding `6/9/12px ...` and font `12.5/13.5/15px`.
- **Cards** with `hover` lift `translateY(-2px)` and raise shadow over `.2s`.
- **Ambient motion:** hero orbit rings rotate, orb floats, aurora glows drift, marquee scrolls, the showcase shows a "running cycle" with a pulsing active edge. All decorative loops respect `@media (prefers-reduced-motion: reduce)` (durations collapse to ~0).
- **Primary CTAs** ("Get started", "Sign in", "Watch a cycle") call `onStart` → navigate to the login screen in the prototype. In production, wire to your auth/start route.

## State Management
- `ContactBox`: `{ name, email, company, topic, msg }` + `sent` boolean.
- Custom dropdown: `open` boolean + outside-click/Escape listeners.
- Reveal/count-up: local mount effects (no global state).
- The homepage itself is stateless beyond the contact form; navigation is handled by the parent app shell.

## Design Tokens
Resolved light-theme values (authoritative source is `styles.css`; accent derives from `--acc-h: 48`, `--acc-c: 0.16`):

**Color**
- `--bg` `oklch(0.985 0.003 80)` · `--bg-sunken` `oklch(0.965 0.004 80)`
- `--surface` `oklch(1 0 0)` · `--surface-2` `oklch(0.982 0.003 80)`
- `--border` `oklch(0.915 0.004 80)` · `--border-strong` `oklch(0.86 0.005 80)`
- `--text` `oklch(0.23 0.01 70)` · `--text-2` `oklch(0.46 0.008 70)` · `--text-3` `oklch(0.62 0.006 70)`
- `--accent` `oklch(0.66 0.16 48)` (~`#df6a28`) · `--accent-strong` `oklch(0.58 0.16 48)` · `--accent-soft` `oklch(0.95 0.072 48)` · `--accent-line` `oklch(0.84 0.096 48)` · `--accent-fg` `oklch(0.99 0.01 48)`
- status: `--ok` `oklch(0.62 0.14 155)`, `--warn` `oklch(0.72 0.15 75)`, `--danger` `oklch(0.6 0.18 25)`, `--info` `oklch(0.62 0.13 250)` (+ `*-soft` variants)

**Spacing** (`--s1..s12`): 4, 8, 12, 16, 20, 24, 32, 40, 48 px (multiplied by density `--d`, default 1).
**Radius:** `--r1` 6 · `--r2` 10 · `--r3` 14 · `--r4` 20 px.
**Shadows:** `--shadow-sm/md/lg` — see `styles.css` (soft, low-opacity warm shadows).
**Type:** Geist 300–700; Geist Mono 400–600. Hero H1 58px; section H2 33px; body 15–17px; eyebrow/label 11–12.5px.

## Assets
- **Logo — "Linkgraph" mark (KEEP AS-IS):** pure inline SVG, no external asset. Three nodes connected by links in a triangle: node A filled accent, node B accent-outline, node C neutral-outline; two accent links + one neutral link. Source: `BrandMark` in `home-extras.jsx` (48-grid version) and the matching mark in `app.jsx`/`auth.jsx` (26-grid). Render at 34px in the nav.
- **Icons:** a small inline-SVG icon set (1.6px stroke, 24-grid) — see `PATHS`/`Icon` in `ui.jsx` (command, org, trace, agents, approvals, knowledge, memory, bolt, brain, check, arrowRight, chevronDown, mail, globe, play, etc.). No icon-font/library needed.
- **Agent glyphs:** colored chips per agent (`AgentGlyph` in `ui.jsx`), hue per agent in `AGENT_HUE`.
- No raster images are required for the homepage (the product "screenshot" is a live render; swap for a PNG if preferred).

## Files (in this bundle)
- `index.html` — entry; script load order (Babel-in-browser prototype).
- `styles.css` — **all design tokens, themes, keyframes.** Primary reference for values.
- `intro.jsx` — **the homepage itself** (`Intro`, `ContactBox`, `TopicSelect`, `Stat`, `Band`, `Eyebrow`, `H2`, reveal/count-up helpers).
- `home-extras.jsx` — homepage visuals: `BrandMark`, `BrandOrb`, `HeroOrbit`, `ScaleToFit`, `AppFrameMock`, `OrchestratorHub`, `CapNode`.
- `ui.jsx` — primitives: `Icon`, `Card`, `Badge`, `Button`, `AgentGlyph`, `StatusPill`, `Sparkline`, `SectionTitle`, `fmt`.
- `screens1.jsx` — `CommandCenter` (the dashboard shown in the showcase) + `StatCard`.
- `OrgChart.jsx` — the live org-graph used by the showcase.
- `data.jsx` — seed data (`window.HELIX`): agents, cycle history/script, approvals, etc. Drives the showcase numbers.

> To run the prototype as reference: open `index.html` in a browser; the logged-out homepage shows first.
