# crshhx website — redesign research and design strategy

Status: **Phase 1–2 complete (research + documented direction). No frontend code written yet.**
Author: design/engineering review of `website/` at `4ecedfc`.
Scope: `website/` only. The desktop application, `electron-builder.yml`, the release
workflows and both published release binaries are untouched by this project.

This document is the design authority for the redesign. Every numeric claim below is
either measured in this repository, computed, or explicitly marked as unverified.

---

## 0. Method, and the limits of this research

**Tool constraint, stated up front.** The only web tool available here returns pages as
markdown/text. That yields information architecture, hierarchy, copy, section order,
component inventory and image strategy — but **not computed CSS**. The exact font sizes,
hex values, spacing scales and easing curves of the reference sites could not be read, and
there is no browser in this environment, so nothing could be rendered, screenshotted or
visually compared. Sandbox outbound network is allowlisted to `registry.npmjs.org`,
`pypi.org` and `files.pythonhosted.org`.

Consequence, and it is deliberate: the analysis of Linear, Raycast and Framer below is
about **structure and design reasoning**. Every numeric token proposed in §8 is an original
decision for crshhx, justified on craft grounds and — where accessibility is concerned —
computed rather than guessed. **No value has been copied from a reference site, and none is
presented as a measurement of one.**

Consequence for Phase 5: *"open the deployed website and inspect it visually, compare it
against the references"* cannot be performed here. Structure, content, metadata, contrast
ratios, byte budgets and link integrity can be verified precisely; whether a section
*looks* right cannot. That review belongs to the product owner. It is not claimed as done
anywhere in this project.

---

## 1. Research log

### Inspected and read

| Source | Coverage | Verdict |
| --- | --- | --- |
| linear.app | Full homepage (2/2 chunks) | Primary reference — high value |
| raycast.com | Chunks 0 & 2 of 5: hero, product demos, values, extensions, community | Primary reference — high value |
| **raycast.com/windows** | Chunk 0 of 4: hero, CTA block, eight feature sections | **Highest value** — a Windows utility from a reference company |
| framer.com | Chunk 0 of 3: hero, canvas demos, agent sections | Primary reference — high value |
| checklist.design | Homepage; Website / Design system / Flows categories | Phase 5 gate |
| frontendchecklist.io | Homepage; full category and rule census | Phase 5 gate |
| Front-End-Performance-Checklist (GitHub) | Chunks 0 & 2 of 8; HTML and CSS sections | Phase 5 gate |
| component.gallery | Homepage; 60 components / 95 design systems | Semantics reference |
| magicui.design | Chunk 0 of 5 | **Rejected** — §3 |
| saaspages.xyz | Full homepage; block taxonomy | Block checklist |
| awwwards.com/websites | Chunk 0 of 3 | **Discounted** — §3 |

Also inspected in this repository (primary evidence for §5–§7): `website/HOSTING.md`,
`website/README.md`, `website/scripts/prerender.mjs`, `website/src/site.ts`,
`website/src/App.tsx`, `website/src/releases.json`, all five stylesheets, `Reticle.tsx`,
`AppWindow.tsx`, `Playground.tsx`, `ProductMock.tsx`, `Nav.tsx`, `HomePage.tsx`,
`.github/workflows/windows-release.yml`, and the desktop application's own design tokens in
`tailwind.config.js` and `src/studio/index.css`.

### Not inspected — recorded, not skipped silently

dribbble, collectui, httpster, hoverstat.es, mkdir.directory, awesome-design-systems,
uiverse.io, uidesigndaily, open-ui.org, lapa.ninja, html5up, themewagon, templatemo,
codemyui, fomantic-ui, beercss, cssbed, layoutit, picsum, dummyimage, blurha.sh, visiwig,
formito/favicon, icon-shelf, scrollbar.app, naker, lottiefiles creator, http.cat,
awesome-web-animation, vite.dev, storybook.js.org, html5boilerplate.

Reasons: context budget across ~40 URLs plus the tool limits in §0. Assessment of each
group, so the omission is not silent:

- **Galleries** (dribbble, collectui, httpster, hoverstat.es, mkdir.directory, lapa.ninja,
  awwwards) supply taste calibration, not engineering guidance. Their dominant idiom —
  WebGL, 3D, scroll choreography, agency bravura — points away from this brief.
- **Template sites** (html5up, themewagon, templatemo) are the generic-template source the
  brief rules out.
- **Placeholder/asset tools** (picsum, dummyimage, blurha.sh, http.cat, naker, lottiefiles)
  conflict with "no meaningless placeholder imagery" and "never present a prototype as a
  screenshot". crshhx needs real rendered product surfaces.
- **UI frameworks** (fomantic-ui, beercss, cssbed, layoutit) each impose a visual language
  that would override crshhx's.
- **open-ui.org** and **awesome-design-systems** are worth reading during implementation for
  accessible component semantics (disclosure, tabs, combobox); deferred, not dismissed.
- **vite.dev** is covered by the framework decision in §6. **storybook.js.org** is assessed
  in §3. **html5boilerplate** is superseded by the existing prerender pipeline, which
  already emits per-route metadata, `404.html`, robots and a sitemap.

### Domain note

`https://crshhx.com/` **did not resolve** from this environment. `HOSTING.md` records that
no domain has been purchased ("Choose a host and, if wanted, a domain (not purchased yet,
deliberately)"). The verified live origin is `https://crshhx.pages.dev`. `SITE_URL` must not
be set to a domain whose existence is unconfirmed — the repository's own comment is right
that a wrong canonical is worse than none. See §16, decision D3.

---

## 2. What makes the references effective

### Linear

The homepage is not a headline over a gradient — it is a **rendered issue tracker with a
live-looking activity feed** ("Linear created the issue via Slack on behalf of Karri ·
2 min ago", "Triage Intelligence added the labels Performance and iOS"). Four deep sections
follow (Intake, Planning, AI, Build/Review/Ship), each presenting a **full working
surface**: a backlog board with real ticket IDs and status columns, a roadmap Gantt with
month columns and Alpha/Beta/GA markers, an agent transcript, a code diff containing actual
TypeScript.

Why it works:

- **Coherent fictional data.** `ENG-2085`, `Cycle 144`, `Linear App 1.6881…⋅Jun 25`,
  consistent assignee avatars. Density of *internally consistent* detail reads as real
  software; sparse or inconsistent placeholder data reads as template.
- **An engineering-document register.** "Fig 0.1 / 0.2 / 0.3" captions. The site speaks in
  the product's own documentation voice.
- **Proof, rationed.** Three short attributed quotes, then a single number ("powers over
  50,000 product teams"). Not a logo wall.
- **A repeating rhythm that never repeats visually**: heading → one-line value → *large
  product surface* → "Learn more →". Same grammar, different composition each time.
- **A quiet terminal CTA**: Get started / Contact sales / Open app / Download. No urgency
  theatre.

### Raycast

- **The hero is the product**: a launcher window with clipboard history, emoji picker,
  command search and calculator results at real density. The headline is four words —
  "Your shortcut to everything."
- **Requirements at the decision point.** On the Mac hero: "macOS Tahoe and Apple Silicon
  required", plus an alternative install path. On `/windows`:
  **`v2.11.1.0 | Windows 10+ | Install via WinGet`** directly beneath the store badge.
  Disclosing friction up front increases trust — and this is the single most transferable
  pattern found for the crshhx download page.
- **Values as measurable facts**, not adjectives: "**Fast.** Think in milliseconds."
  "**Ergonomic.** Keyboard First." "**Reliable.** 99.8% crash-free rate."
- **Falsifiable social proof**: named people, real handles, real roles, each with a
  *specific* favourite feature and extension.
- **Density as a feature**: "What else can Raycast do?" — a dozen capabilities in rapid
  sequence.

### Raycast for Windows — the closest analogue to crshhx

Eight feature sections, all using one grammar: a **feature-name chip** ("App Launcher",
"File Search", "Clipboard History", "Snippets", "Quicklinks", "Calculator", "Shortcuts"), a
**two-part punchy headline** ("Open apps quickly. Super quickly." / "Less Copy, More
Paste." / "Beats bookmarks."), **one line of explanation**, then a **real UI surface**. The
grammar repeats eight times and never looks repetitive, because each surface is different.
This is the exact structure the crshhx features page should adopt, with the chip naming a
real application view.

### Framer

- **The canvas is the hero**: browser chrome, layers panel, page tree, breakpoint switcher
  (Desktop 1200 / Tablet 810), Publish button — the tool shown mid-task.
- **A three-beat narrative**: Start with the agent → Refine on the canvas → Publish
  instantly. Sequential, numbered, each beat carrying a real artefact.
- **Process made visible**: prompt → "Thinking…" → generated `ImageWheel.tsx`. Showing the
  work convinces more than describing the result.
- **Real artefacts over abstraction**: a CMS table with collection counts (Articles 320,
  Creators 256), status pills, thumbnails.

### The shared principle

**The product is the centrepiece, and every claim is anchored to something visible and
specific.** Premium is produced by *specificity, density and restraint* — not by effects.
The generic-AI-SaaS look is the precise inverse: adjective-led copy, uniform card grids,
gradient blobs, and stock abstraction standing in for a product shot.

---

## 3. Resource assessment

**Use**

- **checklist.design** — `Website` (Features, 404, FAQ) and `Design system` (Typography,
  Tokens, Button, Accordion) map onto the pages being rebuilt.
- **frontendchecklist.io** — now a 350+ rule corpus across 11 categories (Accessibility 95,
  SEO 94, Performance 44, CSS 32, JavaScript 26, HTML 25, Images 25, Security 22,
  Testing 13, Privacy 5, I18n 5). All 350 is not a sensible gate for a five-route static
  site; the **four curated checklists** are used instead — Launch (16), SEO Audit (12),
  Performance Quick Wins (8), Accessibility Essentials (12) = **48 verifiable rules**,
  reported rule by rule.
- **Front-End-Performance-Checklist** — HTML/CSS/JS/fonts/images items map onto build
  guarantees: CSS before JS, minification, no unused CSS, font `preload` +
  `font-display: swap`, no render-blocking resources, explicit image dimensions.
- **component.gallery** — as a *semantics* reference for disclosure, tabs, accordion and
  tooltip behaviour. Not a code source.

**Reject, with reasons**

- **Magic UI** — verified: 150+ animated components on React + TypeScript + **Tailwind CSS +
  Motion**, positioned as a shadcn/ui companion. Adopting it means adopting Tailwind *and* a
  Motion runtime, and its register (dither fields, shimmer, marquees, beams) is the
  "excessive animation / AI-generated SaaS" look the brief rules out. Rejected as a
  dependency; the two or three effects worth having are hand-built in CSS.
- **Awwwards** — accessible, but current Site-of-the-Day winners are agency, portfolio and
  game sites leaning on WebGL and scroll choreography. Wrong signal for a Windows utility,
  and against the animation constraints. Discounted deliberately.
- **Tailwind CSS** — would mean rewriting 2,065 lines of considered token-driven CSS into
  utility classes, and utility-first markup is a large part of why sites look alike.
  Rejected. Note the desktop application *does* use Tailwind; that is a reason to keep the
  website's hand-authored system clearly separate, not to converge on it.
- **Storybook** — for a five-route static marketing site the maintenance cost exceeds the
  benefit. Components are documented against the tokens instead.
- **Placeholder/asset services** — would put stock or filler imagery on a site whose
  credibility rests on "no screenshots exist, so every visual is rendered from real
  parameters". Rejected on integrity grounds.
- **Full UI frameworks and templates** — each carries a visual language that overrides
  crshhx's. Rejected.

**Coherent component approach** (the brief asks for one, not a mixture): a single
hand-authored component set, scoped by CSS Modules or BEM-style prefixes, drawing
*behavioural* semantics from open-ui/component.gallery and *nothing* else. No third-party
component library is installed.

---

## 4. Strongest patterns found across the research

1. **Hero = the working product**, not a headline plus an illustration.
2. **Requirements and version stated at the CTA**, in one monospace line.
3. **One repeating section grammar, never one repeating layout**: chip → headline →
   one-liner → real surface → link.
4. **Numbers instead of adjectives.** Measured facts carry the persuasion.
5. **Coherent fictional/product data at density** — real IDs, real values, real states.
6. **Proof rationed and falsifiable**, or omitted entirely rather than fabricated.
7. **Quiet terminal CTA.** No urgency, no countdown, no modal.
8. **Editorial register**: figure numbers, captions, disclosure of how a visual was made.

---

## 5. Audit of the current website — measured

### Assets to preserve

- **`Reticle.tsx`** — an SVG crosshair renderer mirroring the desktop schema
  (`src/types/crosshair.ts`): per-arm presence, length, thickness, gap, centre dot, outline
  colour/thickness, spread ring, rotation, scale, opacity. `PX = 3.1` maps overlay pixels to
  SVG units so proportions match the product. Deliberately separate from the app — the
  website imports nothing from the desktop source — but faithful to it.
- **`AppWindow.tsx`** — window chrome listing the application's **real** views: Crosshairs,
  Designer, Preset Manager, Weapon Slots, Keybinds, Position.
- **`Playground.tsx`** — interactive editor whose slider ranges match the real controls
  (length 0–12, thickness 0–6, gap −4–12, outline 0–6, dot 0–6, rotation 0–360 in 15°
  steps), preset buttons loading **actual shipped vault parameter sets**, pointer parallax
  written to CSS custom properties to avoid re-renders, constant initial state for
  hydration safety.
- **`MOCK_DISCLOSURE`** — every visual carries "Illustrative interface preview, rendered
  from the application's real parameters — not a screenshot." A test asserts the caption is
  present and that no mockup is described as a screenshot. This *is* the integrity guarantee
  the brief asks for; it already exists and becomes a design feature rather than small print.
- **`scripts/prerender.mjs` is a honesty gate, not just a build step.** It throws if a route
  renders under 900 bytes or lacks `<main id="main">`; throws if a `<!--TITLE-->` /
  `<!--HEAD-->` marker survives substitution; and — critically — **throws if any page links
  to an `.exe` while the manifest has no release**. That guard must survive the redesign in
  whatever form the build takes.
- **Single sources of truth**: `src/site.ts` (identity, route table, titles, descriptions,
  nav) and `src/releases.json` (what exists to download). Adding a route is two steps and
  everything else follows. Keep the principle.
- **Three runtime dependencies** (react, react-dom, react-router-dom). No animation library.
  The build emits **one JS bundle and one CSS bundle** plus self-hosted woff2 subsets.
- **Motion already restrained**: exactly two `@keyframes` in the whole codebase
  (`panel-in`, `bloom`).

### Defects, measured

1. **Collapsed type hierarchy — the primary cause of "flat".** `.hero-title` peaks at
   `clamp(2.5rem, 5.2vw, 3.9rem)` ≈ 62px (a later override pushes it to 4.05rem) while
   `.section-title` peaks at `2.5rem` = 40px, over 17px body. The hero is only ~1.6× a
   section heading. With no decisive jump between display and body, every block speaks in
   the same voice. **Highest-leverage fix available.**
2. **Uniform surface treatment.** Three radii (6/10/14px) applied near-uniformly plus
   hairline borders on most surfaces — structurally this *is* "endless rounded cards, borders
   around everything". `.section + .section { border-top }` draws a rule between **every**
   section, so the page reads as a stack of boxes rather than a composition.
3. **An HUD treatment the brief now bans.** `.pg-stage` paints a 28px mint hairline grid
   (`--grid-line: rgba(111,217,192,0.05)`) with centre crosshair rules via `::before` /
   `::after`; `.hud` is used as a general container on `Playground` and in `FeaturesPage`;
   `stage-hud` labels read "live preview" and "dynamic firing bloom · looped demonstration".
   **Action: delete the decorative grid and `--grid-line`; keep the centre axis guides** —
   they are functional, since aligning a crosshair needs a centre reference — **and rename
   `stage-hud` → `stage-label`, styled quietly.** The decorative/functional distinction is
   worth holding.
4. **A real accessibility failure.** `--text-faint #6b767e` on `--ink-0 #0b0e12` computes to
   **4.16:1**, below the 4.5:1 WCAG AA threshold for normal-size text — and it is used at
   11px uppercase (`.pg-head`), unambiguously normal size. Measured replacement:
   **`#868c98`**, which clears AA on every surface in the proposed ramp (5.55 / 5.03 /
   4.63:1). `#7d828c` was rejected: 4.41 and 4.05 on card surfaces.
5. **The website has no CI gate at all.** The job named *"Tests, typechecks, production
   build"* runs at the **repository root** against the **Electron app** (`npm ci`,
   `npm test`, `tsc -p tsconfig.json`, `npm run typecheck:main`, `npm run build`). It never
   enters `website/`. `HOSTING.md` contains a sketched `.github/workflows/website.yml`
   marked *"not enabled, because nothing is published yet"* — but the site **is** published.
   This is why the `vite.config.ts` `process` typecheck errors never blocked a merge, and why
   a redesign could ship broken behind green checks. **Prerequisite, not a nicety.**
6. **SEO metadata silently dropped in production.** `SITE.url` reads `SITE_URL`, which is
   unset in the deploy environment; the build prints `origin=(unset — canonical and og:url
   omitted)` and `sitemap.xml skipped`. The live site therefore has **no canonical, no
   `og:url` and no sitemap**. The production origin is now known and verified
   (`https://crshhx.pages.dev`), so this is fixable entirely in the repository.
7. **Pill overuse**, now explicitly banned. The download page alone renders "Recommended",
   "available" and "Latest stable release"; the changelog adds "published". **Action: at
   most one status pill per surface**, reserved for genuine state (`published` /
   `development`, `Recommended`); everything else becomes a plain typographic label.
8. **One number was unverified — now verified.** The homepage states "258 built-in presets".
   An earlier note in this project's history suggested the true figure might be ~298 (258
   vault entries plus additional `pro-` and `pc-` sets). **Resolved by execution, not by
   reading:** `src/lib/crosshairCollection.ts` generates the vault combinatorially, so it was
   transpiled with the website's own esbuild and run. `COMPLETE_CROSSHAIR_VAULT.length` is
   **exactly 258**, every entry `isBuiltIn: true`, all ids unique. **The website's figure is
   correct and stands.** No test previously pinned this (only `toBeGreaterThan(0)`), so a
   test asserting the published figure equals the generated vault length is added — the claim
   on the site and the code that produces it can no longer drift apart.

   The same run yields a real breakdown, which becomes usable "measured data" copy in place of
   the social proof crshhx cannot honestly claim (§9):

   | Dimension | Census |
   | --- | --- |
   | Total built-in presets | **258** |
   | By game | universal 141, fortnite 53, apex 32, cs2 19, valorant 13 |
   | By topology | cross 98, dot 59, circle 54, chevron 35, t-shape 12 |
   | Id families | 23 (`dot-round` 35, `pro` 30, `novelty` 25, `ring-hollow` 24, `chev` 24, `dot-sq` 20, `ring-dot` 18, 6 `box-*` families × 5, 8 `tac-*` families × 5, `shotgun-cross` 6, `chev-dot` 6) |
9. **CSS drift has begun.** `.hero-title` is defined three times in `pages.css` (lines 32,
   806, 826) with different values, across 2,065 lines of global CSS (`components.css`
   1,133 + `pages.css` 932). Scoping is needed before the redesign adds more.

### Deployment configuration, as investigated

`HOSTING.md` documents the live Cloudflare Pages setup: **Git build, `npm run build` in
`website/`, output directory `website/dist`**, with `SITE_URL` / `SITE_BASE` as build-time
variables. There is **no** `wrangler.*`, `_redirects` or `_headers` in the repository (0
files found) — the Pages project configuration lives in the dashboard, which is unreachable
from this sandbox. Recorded requirements: serve `dist/` as-is, custom `404.html`, clean URLs
(`/features` → `features/index.html` with no redirect loop), free TLS/HTTP-2, and an absolute
rule that **a website deploy must never run `electron-builder`, nor the reverse**.

Verified git state before any change: branch `arena/349e1219-crshhx` at `4ecedfc`, identical
to `origin/main`, working tree clean. Production branch is `main`.

### Release manifest — recorded verbatim, never to be altered

`channel: released`, `latest: 1.1.0`, one published entry dated `2026-11-08`, plus one
`1.0.0/development` note.

| Artifact | Bytes | Display | SHA-256 |
| --- | --- | --- | --- |
| `crshhx-crosshair-studio-setup-1.1.0.exe` | 88,862,700 | 84.7 MB | `bed1e654a6ce8dc0226c77fd8872da848e2d0a2f3eba6bb7dd104084dccac45d` |
| `crshhx-crosshair-studio-portable-1.1.0.exe` | 81,455,085 | 77.7 MB | `037476deef04f4a56de5a58860dc7c61e80a9c8abab078c183d63a0e8ba842e2` |

URLs: `https://github.com/sfingW/crshhX/releases/download/v1.1.0/<file>`.
Display maths: `bytes / 1048576`, `toFixed(1)`. These are asserted by tests before and after
the redesign and must be byte-identical.

---

## 6. Light, dark or mixed — decided on measurement

The brief instructs that dark must not be assumed. It was tested rather than assumed.

**The decisive constraint is legibility of the product itself.** The site's job is to show
crosshairs, and the shipped palette includes a **white** reticle. WCAG 1.4.11 requires
**≥ 3:1** for a non-text graphic to be perceivable. Computed against the six reticle colours
actually used by the product and the site (`#35e0ff`, `#2be08a`, `#f2f5f6`, `#ff5ea8`,
`#ffc24d`, `#ff5c5c`):

| Field | Worst of six | Result |
| --- | --- | --- |
| `#ffffff` white page | **1.10** | white 1.10, cyan 1.58, green 1.73, amber 1.61, magenta 2.83 — **five invisible** |
| `#f4f5f7` light grey | **1.00** | **five invisible** |
| `#111215` app base | 6.19 | all visible |
| `#1b1c22` app card | 5.61 | all visible |
| `#0c0d10` sunken | 6.42 | all visible |
| `#202329` raised field | 5.20 | all visible |
| `#3d4249` mid field | 3.35 | all visible |
| `#44474d` lightest viable field | 3.08 | all visible — the ceiling |

**Correction to an earlier claim in this document.** This section originally concluded that
"a light-themed crshhx site cannot honestly show the product", and rejected a mixed
light-page/dark-stage approach on that basis. **That conclusion was overstated and is
withdrawn.** The measurement is sound but narrower than the claim drawn from it: what fails
at 3:1 is a light **field** — the surface a reticle is drawn on. A light **page** that places
its product surfaces on dark plates is entirely viable, because the reticle never sits on
paper. Directions B and C in §15 are both built that way, and they work.

What the measurement does establish, and what still holds:

- The surface a crosshair is drawn on must stay dark. `#44474d` is the lightest field on
  which all six shipped colours still clear 3:1, so there is a hard ceiling.
- Consequently a fully light site is impossible without boxing every product visual, and
  hierarchy on any light surface must be carried by typography and spacing rather than by
  showing the product large and free.
- Dark-first remains the *lowest-risk* answer, but it is no longer the only defensible one,
  and "the product is dark so the site must be dark" is not by itself a sufficient argument.

**Corollary that shapes the whole identity:** because the field must stay dark enough for a
white crosshair, the *page* can never be light — so contrast and hierarchy must come from
**typography, spacing and layering**, which is exactly where Linear, Raycast and Framer put
their effort anyway. The constraint and the reference quality point the same way.

---

## 7. Framework decision: keep Vite

The brief asks whether a Next.js migration is justified, and to explain if Vite is
recommended. **Recommendation: keep Vite. Do not migrate.**

**What the current stack already delivers.** React 19 + TypeScript 5.7 strict;
`react-router-dom` 6 (`BrowserRouter` client, `StaticRouter` at build); Vite 6; hand-written
CSS custom properties; self-hosted `@fontsource` latin subsets; Vitest + jsdom. Every route
is server-rendered to real HTML and hydrated, so the site is crawlable and works with
JavaScript disabled. `scripts/prerender.mjs` injects per-route title, description, OG/Twitter
tags, `robots`, canonical (when an origin is set) and a sitemap — and enforces the honesty
guards in §5.

That is, functionally, what Next.js static export provides. **The gaps are not
architectural.** They are the design (§5.1–5.4), the missing CI (§5.5) and the unset origin
(§5.6) — all fixable without changing framework.

**What Next.js would add:** file-based routing; a metadata API replacing the hand-rolled
injection; `next/font` with automatic subsetting, preloading and zero layout shift
(genuinely better than manual `@font-face`); per-route code splitting; built-in
`sitemap.ts` / `robots.ts`; long-term ecosystem support.

**What it would cost:**

- A **larger JavaScript runtime** on a site that currently ships three dependencies and one
  bundle — directly against "fast loading and minimal unnecessary JavaScript".
- `next/image` optimisation is **unavailable under static export** (`unoptimized: true`
  required), so image optimisation gets *worse*, not better, unless assets are pre-compressed
  by hand.
- Rewrite of all routing/`Link` usage and all eight test files.
- Reimplementation of the three prerender honesty guards inside a different build — with a
  real risk of silently losing the `.exe`-without-release failure that protects the download
  page.
- **Deployment risk that cannot be verified from here.** Pages' build command, output
  directory and **Node version** are dashboard-side. Verified from the registry:
  `next@16.4.5` requires **Node ≥ 20.9.0**. If the Pages project is pinned to an older Node,
  the build fails at deploy time and the setting is invisible from this sandbox.

A reliable path *does* exist if migration is ever wanted: redefine `website/package.json`'s
`build` to run the Next build and place the output at `website/dist`, so the existing Pages
configuration keeps working with zero dashboard changes, plus a committed `website/.nvmrc`.
But it solves no problem the site has.

**Verdict.** Migrating would add risk, add JavaScript, degrade image handling and endanger a
working, verified download page — in exchange for capabilities the current prerender pipeline
already implements. That is a framework change for its own sake, which the brief explicitly
forbids. **Keep Vite 6, and spend the effort on the design.** Revisit only if a genuine
requirement appears (per-route data fetching, i18n routing, a content layer).

**Node.js backend:** none. The product is local-first and the site is static; a backend,
database, auth layer or cloud dependency would contradict that philosophy.

**Flutter:** not introduced. There is no mobile application requirement — crshhx is a Windows
desktop overlay depending on a Win32 input hook and a topmost overlay window. Adding Flutter
would mean inventing a requirement.

---

## 8. Visual identity and design system

### The identity: **"the product's own surface"**

The most consequential finding of this research is that **the website and the application do
not currently share a design language.**

The desktop application defines its own tokens — `tailwind.config.js` and
`src/studio/index.css` (line 6), with the accent referenced across **24 files**:

```
surface.base      #111215      brand.accent        #00e599
surface.sidebar   #16171b      brand.accentHover   #05f1a5
surface.card      #1b1c22      brand.accentMuted   rgba(0,229,153,0.12)
surface.cardHover #22232b      brand.accentBorder  rgba(0,229,153,0.30)
surface.border    #262832
surface.borderLight #323542
```

The website instead uses a **blue-cool** ink ramp (`#0b0e12 → #1a212a`) and a **pale mint**
accent `#6fd9c0`, which `tokens.css` describes as "derived from the application's own mark".
The application's actual accent token is `#00e599` — a different hue. Both pass contrast
(§8.1), so this was never caught by a test; it is a **brand coherence** failure, and it is a
large part of why the site does not feel like the product.

**Direction: the website adopts the application's real tokens.** Same surface ramp, same
accent, same accent-muted/accent-border alpha system. The site then reads as the product's
own marketing surface rather than a separate brochure — which is the most direct route to
"recognisably crshhx", and it is grounded in the repository rather than invented.

Four principles follow:

1. **The reticle is the subject, not a motif.** The site already owns a renderer that draws
   the real thing. It appears at scale — hero centrepiece, section punctuation, preset
   thumbnails — because it *is* the product. No floating shapes, no abstract decoration, no
   stock imagery.
2. **Typography does the work that effects usually do.** A decisive display size, tight
   tracking at large sizes, one lead per section, disciplined measure. This is where the
   references spend their "premium", and it costs zero bytes.
3. **Measured data replaces social proof.** crshhx has no customers to quote and no logos to
   show, and inventing any would break the honesty rule. In their place, real numbers in
   monospace: 84.7 MB, 77.7 MB, SHA-256 digests, five rebindable slots, F10/F9/F8, 64-bit,
   zero telemetry, offline after install. Verifiable specificity is stronger proof than a
   testimonial, and it is the only kind available.
4. **Accent is a signal, never a theme.** `#00e599` marks interactive and active elements:
   links, focus rings, the primary button, the active nav item, at most one data emphasis per
   view. It never becomes a background field, a gradient, a headline treatment or a glow. The
   brief's "neon green everywhere" failure mode is avoided by *budget*, not by desaturating
   the brand: the accent stays exactly the product's colour and simply appears rarely.
   Reticle colours appear **only inside product visuals**, where they are information —
   enforced by test.

**Removed from the current design:** the 28px HUD grid and `--grid-line`; `--grad-accent`
(the one unjustified gradient); `.section + .section` border rules; decorative pills;
uniform three-radius rounding; the failing `--text-faint`.

**Depth without effects:** elevated surfaces, one sunken well tone for product stages,
hairlines used sparingly and meaningfully, separation achieved through spacing and
background shift. **At most one gradient site-wide**, and only if it earns its place as the
light a monitor throws behind an overlay. If it cannot be justified, it is removed.

### 8.1 Colour tokens (all ratios computed)

Surfaces — the application's own ramp, extended downward for product stages:

| Token | Value | Role |
| --- | --- | --- |
| `--stage` | `#0C0D10` | Product stage / well (all six reticle colours ≥ 6.42:1) |
| `--bg` | `#111215` | Page — app `surface.base` |
| `--surface-1` | `#16171B` | Raised — app `surface.sidebar` |
| `--surface-2` | `#1B1C22` | Cards, panels — app `surface.card` |
| `--surface-3` | `#22232B` | Hover, elevated — app `surface.cardHover` |
| `--field` | `#202329` | Reticle field inside a stage (worst of six: 5.20:1) |
| `--line` | `#262832` | Hairline — app `surface.border` |
| `--line-2` | `#323542` | Strong hairline — app `surface.borderLight` |

Text:

| Token | Value | Contrast on `--bg` / `--surface-2` / `--surface-3` | Grade |
| --- | --- | --- | --- |
| `--text` | `#F2F3F5` | 16.87 / 15.31 / 14.08 | AAA |
| `--text-2` | `#A8ADB8` | 8.33 / 7.55 / 6.95 | AAA / AAA / AA |
| `--text-3` | `#868C98` | 5.55 / 5.03 / 4.63 | **AA everywhere** |

`--text-3` replaces the current `#6b767e`, which fails at 4.16:1 while being used at 11px.
A CI test asserts these pairs stay ≥ 4.5:1.

Accent — the application's, with the application's own alpha system:

| Token | Value | Note |
| --- | --- | --- |
| `--accent` | `#00E599` | 11.30 / 10.25 / 9.43:1 on the three main surfaces — AAA |
| `--accent-hover` | `#05F1A5` | app `brand.accentHover` |
| `--accent-muted` | `rgba(0,229,153,.12)` | fills only, never text — app `brand.accentMuted` |
| `--accent-border` | `rgba(0,229,153,.30)` | borders only — app `brand.accentBorder` |
| `--on-accent` | `#0B0C0E` | button label on accent: **11.80:1** AAA |

Reticle palette — **product visuals only**, test-enforced: `#35E0FF` `#2BE08A` `#F2F5F6`
`#FF5EA8` `#FFC24D` `#FF5C5C`.

Semantic: `--ok #4FBF8B`, `--warn #D9A441`, `--danger #D9695A` (8.54 / 8.71 / 5.71:1 on
`--bg`).

### 8.2 Typography

Keep the existing self-hosted trio — **Space Grotesk** (display), **Inter** (body),
**JetBrains Mono** (data). No new families: they are already woff2 latin subsets with dead
`.woff` fallbacks stripped, and adding payload would not fix a *scale* problem. The scale is
the problem, so the scale changes:

| Token | Size | Line-height | Tracking | Use |
| --- | --- | --- | --- | --- |
| `--display-1` | `clamp(2.875rem, 6.6vw, 5.75rem)` (46→92px) | 0.98 | −0.045em | Hero headline only |
| `--display-2` | `clamp(2.125rem, 4.2vw, 3.5rem)` | 1.04 | −0.035em | Major section openings |
| `--title-1` | `clamp(1.625rem, 2.6vw, 2.25rem)` | 1.15 | −0.025em | Sections |
| `--title-2` | `1.25rem` | 1.30 | −0.015em | Cards, panels |
| `--lead` | `1.25rem` (20px) | 1.50 | −0.01em | **One per section**, `--text-2` |
| `--body` | `1.0625rem` (17px) | 1.65 | 0 | Prose, max **68ch** |
| `--small` | `0.9375rem` | 1.55 | 0 | Supporting |
| `--data` | `0.8125rem` mono | 1.45 | +0.02em | Readouts, sizes, hashes, keys |
| `--eyebrow` | `0.6875rem` mono | 1.20 | +0.16em uppercase | Labels |

Hero-to-body ratio moves from **~3.7× to ~5.4×**. Weights already shipped: Space Grotesk
500/700, Inter 400/500/600, JetBrains Mono 400. No new weight is added without a measured
need — each is real kilobytes. Long-form comfort (the reason a light theme was considered)
is bought here instead: 68ch prose, 76ch documentation, 1.65 leading, and a lifted surface.

### 8.3 Spacing, grid, layout

- **4px base**, ramp `4 8 12 16 24 32 48 64 96 128 160 208`.
- `--section-y: clamp(96px, 11vw, 168px)` — the current `clamp(72px, 9vw, 128px)` is too
  tight for this scale. Whitespace is what separates "empty" from "confident".
- **Container 1200px** (from 1120), `padding-inline: clamp(20px, 5vw, 48px)`, on a
  **12-column grid**, 24px gutter.
- **Optical spacing rule:** section-head-to-content gap ≈ 60% of the between-section gap, so
  groups read as groups.
- **No automatic section borders.** Separation comes from spacing plus alternating `--bg` /
  `--surface-1`. A hairline appears only where it means something: inside a product frame,
  under a scrolled nav, above the footer.

### 8.4 Shape and surfaces

Two radii, used consistently: **`--radius-s: 6px`** (buttons, inputs, pills, code) and
**`--radius-l: 12px`** (panels, product frames). Product frames get a distinct treatment —
chrome bar, 1px `--line-2`, inset shadow, `--stage` interior with a `--field` reticle area —
so they can never be mistaken for content cards. That distinction is what stops the
"endless rounded cards" read.

### 8.5 Navigation

Sticky, 64px, `--bg` at ~85% opacity with `backdrop-filter: blur(12px)`; a hairline appears
**only after scroll** (none at rest). Wordmark + four links + one accent Download button.
Active link marked by colour plus a 2px underline — not a pill. Mobile: full-screen sheet,
48px targets, `aria-expanded` / `aria-controls` preserved from the current implementation,
focus trapped and restored, `Esc` to close.

### 8.6 Buttons and interactive states

| Variant | Treatment |
| --- | --- |
| **Primary** | `--accent` fill, `--on-accent` text, 6px radius, 44px (48px in hero), weight 600. Hover: `--accent-hover` + 1px lift. Active: −1px, lift removed. |
| **Secondary** | Transparent, `--line-2` border, `--text`. Hover: border → `--text-3`, background → `--surface-2`. |
| **Ghost** | No border, `--text-2`. Hover: `--text` + subtle background. |
| **Disabled** | `--surface-2` fill, `--text-3`, `cursor: not-allowed`, with an explicit "coming soon" explanation nearby — never a silently dead control. |

Every interactive element defines all five states: rest, hover, focus-visible, active,
disabled. `:focus-visible` is a 2px `--accent` ring at 2px offset and is never removed.

### 8.7 Animation principles

Three permitted classes, each requiring a reason:

1. **Enter** — scroll reveal via the existing `Reveal`/IntersectionObserver, 420ms,
   `translateY` ≤ 12px plus opacity, fired once, never looping.
2. **Intent feedback** — hover / press / focus, ≤ 180ms.
3. **Product demonstration** — reticle ADS morph (shrink → dot-only → fade), firing-bloom
   decay, preset switching. Justified because these are **real product behaviours**, not
   decoration; the `bloom` keyframe already exists.

All three fully disabled under `prefers-reduced-motion: reduce` — content appears
immediately, no transforms. **No animation library.** No marquees, no scroll parallax, no
scroll-jacking, no looping ambient motion, no blinking, no scan lines. Single easing token
`cubic-bezier(.2,.6,.2,1)`.

### 8.8 Responsive system

Breakpoints: **< 640** mobile, **640–1023** tablet, **1024–1439** desktop, **≥ 1440** wide.
Grids collapse to one column below 1024. Product frames keep aspect ratio and never
overflow. Type uses `clamp` throughout so no breakpoint-specific size overrides are needed —
this is what kills the triple-definition drift in §5.9. Buttons go full-width below 640.
Touch targets ≥ 44px. The docs sidebar becomes a collapsible drawer on mobile.
`overflow-x: hidden` is **not** used as a substitute for fixing overflow: a test asserts no
horizontal overflow at 360, 768, 1024 and 1440.

---

## 9. Product presentation — the centrepiece

**Hero: the editor, live.** `Playground` is promoted from a mid-page feature to the hero
centrepiece — a full-width product frame containing the real reticle at large scale, the real
control set, and a monospace parameter readout that updates on drag. Above it the headline at
`--display-1` and one lead sentence; below it the primary Download CTA with
`Windows 10 & 11 · 64-bit · 84.7 MB` in one monospace line, following the Raycast `/windows`
pattern exactly. **The visitor edits a real crosshair before scrolling.** Nothing is stock,
abstract or invented, and the disclosure caption stays.

**Then, per capability, a different composition** — never six identical two-column blocks.
Each uses the Raycast-for-Windows grammar (chip naming a **real application view** →
two-part headline → one line → real surface), with the surface varying:

- **Designer** — large annotated frame: per-arm length, gap, outline, centre dot, spread
  ring, and the contrast-reporting colour tool demonstrated live.
- **Preset Manager** — a grid of reticles rendered from **actual shipped vault parameter
  sets**, in real chrome (search, folder tree, favourite toggles), with the count taken from
  a verified recount (§5.8).
- **Import / export** — the versioned transfer artefact as a real preview: entries,
  conflicts, repairs, keep/replace/skip choices. Unusual to show, and it demonstrates
  engineering care.
- **Game profiles** — profile cards with real game tags, auto-select and restricted-switching
  states, including the honest "stops switching rather than guesses" behaviour.
- **Weapon Slots** — the slot table with real defaults (shotgun 1, rifle 2, SMG 3, sniper 4,
  utility 5) and the passive-hook explanation: the game sees every keypress.
- **Overlay** — reticle on a `--field` demonstrating ADS morph and firing bloom with
  configurable decay; F10/F9/F8 as real key caps.

Every visual keeps `MOCK_DISCLOSURE`, given a considered quiet treatment rather than hidden.
It is a trust signal and more credible than a fabricated screenshot.

---

## 10. Page structures

**Homepage** — sticky nav → hero (display headline + live editor + CTA with the version /
platform / size line) → measured-facts strip in monospace → Designer → Preset Manager →
Import & export → Game profiles → Weapon Slots → Overlay & dynamic behaviour → **Honest
limits** (unsigned/SmartScreen, anti-cheat cannot be guaranteed, offline, no account, no
telemetry) → FAQ → quiet closing CTA → footer.

**Features** — the six areas in six *different* compositions, plus an A/B compare view
mirroring the application's own compare panel, plus a data table of the full parameter space.

**Download** — keep the structure verified live at `4ecedfc` (release strip, two balanced
panels, "Verify download" disclosures with working Copy buttons and `certutil` commands,
three-step guide, requirements table, troubleshooting) and elevate it: the new type scale,
requirements at the CTA, at most one pill per panel. **URLs, sizes and SHA-256s byte-identical,
asserted by test.**

**Documentation** — the largest readability win available: sticky grouped left nav, in-page
TOC on the right, anchor links on every heading, proper code blocks, callout variants, 76ch
measure, print-friendly output. Content preserved.

**Changelog** — dated timeline; published and development entries clearly distinguished (the
existing honest labelling stays); version anchors; links to GitHub releases. **No fabricated
notes.**

**Navigation and footer** — nav per §8.5. Footer rebuilt as a structured link matrix
(product / resources / repository / legal) with the wordmark, a "no analytics, no telemetry"
line and the repository link.

**404** — carries the reticle motif and provides real onward links. Verified as already
  correct: `dist/404.html` has exactly one `<title>` ("Page not found — crshhx") and one
  `<h1>`, and `prerender.mjs` sets `robots: noindex` for it. An earlier draft of this
  document claimed the 404 title was missing; that was a bad check against
  `dist/404/index.html` rather than `dist/404.html`, and the claim is withdrawn.

---

## 11. Testing and quality control

**Gated in CI (new `.github/workflows/website.yml`, the gap in §5.5):** install →
`vitest run` → `tsc --noEmit` **clean, including fixing the pre-existing `vite.config.ts`
`process` errors via `@types/node`** → production build → per-route prerender assertions →
**JS and CSS byte budgets that fail the build** → **contrast assertions** for every token
pair.

**Honesty tests preserved and extended:** no analytics or tracking; download URLs
byte-identical to `releases.json`; sizes and hashes matching the GitHub asset API;
pending-manifest state rendering zero links and disabled controls; `MOCK_DISCLOSURE` present
on every product visual and no visual described as a screenshot; **reticle colours never used
outside product visuals**; the `.exe`-without-release build failure retained.

**Per-route assertions on prerendered HTML:** title, description, canonical, `og:*`, a single
`<h1>`, no leftover markers, no horizontal overflow at 360 / 768 / 1024 / 1440.

**jsdom interaction tests:** mobile nav open/close/focus/`Esc`, disclosure toggles,
copy-to-clipboard, playground sliders and preset loading, keyboard reachability of every
control.

**Checklists:** the 48 curated frontendchecklist.io rules (Launch, SEO Audit, Performance
Quick Wins, Accessibility Essentials), the applicable checklist.design pages, and the
Front-End-Performance-Checklist items — reported rule by rule, with anything unsatisfied
named rather than glossed.

**Live production verification:** every route fetched on the deployed origin after merge.
CI green or a preview deploy is not proof.

**What cannot be done here, stated plainly:**

- **No visual inspection.** No browser, no rendering, no screenshots. Judging whether a
  section *looks* right — spacing, rhythm, typography by eye, comparison against the
  references — belongs to the product owner. The system in §8 exists precisely so that
  judgement is constrained by numbers rather than taste; a review checklist is provided and
  the design iterates on what the owner sees.
- **No real-browser E2E.** Browser binaries cannot be installed in this sandbox, so
  Playwright/Cypress is not feasible. Lighthouse, Core Web Vitals field data, real
  keyboard/screen-reader passes and on-device responsive behaviour remain the owner's
  verification step. None is claimed as passed.
- **No Cloudflare dashboard access.** `dash.cloudflare.com` is unreachable. Anything needing
  a Pages setting change is the owner's; the build is designed so nothing needs to change.

---

## 12. Delivery plan and git safety

Staged so production is never dark and every pull request is reviewable:

1. **Foundations** — website CI workflow; `SITE.url` default so canonical/`og:url`/sitemap
   are emitted; `@types/node` and a clean typecheck; contrast fix `#6b767e → #868c98`;
   recount the preset figure; remove the HUD grid, `--grid-line`, `--grad-accent` and the
   section-border rules. *Correctness before redesign.*
2. **Design system** — new tokens (§8.1–8.4), type scale, spacing, scoped CSS architecture,
   nav, footer, 404.
3. **Homepage** — hero with the live editor, then the capability sections.
4. **Features** — six distinct compositions.
5. **Download** — elevated; links, sizes and hashes untouched.
6. **Documentation** — docs shell, TOC, anchors.
7. **Changelog.**
8. **Responsive, motion and performance pass** — budgets enforced.
9. **QC** — the three checklists, production verification, owner's visual review, refinement.

Each branch preview deploys to its own `*.crshhx.pages.dev` URL automatically, so the
existing production site stays live and untouched until a pull request merges.

**Nothing is merged or deployed until the redesign has been reviewed and approved by the
product owner.**

**Rule compliance:** `website/` only — the desktop application, `electron-builder.yml`, the
release workflows and both published binaries are never touched, preserving the documented
separation that a website deploy can never run `electron-builder`. No existing functionality
removed. No invented features, claims, statistics, compatibility or screenshots. No new
dependencies beyond those justified in §3 and §7 — the recommended path adds **none**. No
accounts, telemetry, marketplace or social features. No release overwritten. Separate branch,
normal pull-request workflow, checks green before any merge request.

---

## 13. Open decisions for the product owner

- **D1 — Accent.** Adopt the application's real `#00e599` (recommended, §8), or keep the
  website's pale mint `#6fd9c0`? Both pass contrast; the argument for `#00e599` is brand
  coherence with the product. It is a single token to change either way.
- **D2 — Framework.** Keep Vite (recommended, §7) or migrate to Next.js despite the costs
  listed?
- **D3 — Origin.** `crshhx.com` does not resolve and no domain is recorded as purchased. Set
  `SITE_URL` to the verified `https://crshhx.pages.dev` now (recommended), or wait for a
  purchased domain and leave canonical/`og:url`/sitemap omitted?
- **D4 — Preset count. RESOLVED, no decision needed.** Verified by execution as exactly
  **258** (§5.8); the website's existing figure is correct. The remaining action is a test
  pinning the published figure to the generated vault length, so it cannot silently drift.

---

## 14. Visual inspection: what was verified and what was not

This section exists because the distinction is load-bearing, and because an earlier pass of
this work blurred it.

**`fetch_page` returns rendered Markdown. It returns no CSS, no computed styles, no images
and no layout.** Everything recorded in §1–§3 about linear.app, raycast.com and framer.com is
therefore about *content, information architecture, copy and hierarchy* — and those findings
are real: section order, headline wording, figure numbering, CTA placement, the `v2.11.1.0 |
Windows 10+ | Install via WinGet` microcopy line, Raycast's metric-led four-up row, Linear's
Fig-numbered editorial device, Framer's layered application chrome, the shape of Linear's
`/download`.

**Nothing numeric about those sites is measured.** Their font stacks, sizes, hex values,
spacing and easing curves were never observable, and any such figure in this document is a
proposal for crshhx, not a reading of them. Their stylesheet URLs and images are unreachable
from this environment.

**Browser automation was attempted and is not available.** No browser binary is installed
(Chrome, Chromium, Firefox, WebKit and `headless_shell` are all absent) and no Playwright or
Puppeteer cache exists. `playwright-core@1.65.0` and `playwright@1.65.0` install from npm
successfully, but `npx playwright install chromium` fails with `ECONNRESET` on
`cdn.playwright.dev` while fetching Chrome for Testing 158.0.8127.18. A direct `fetch` probe
confirms the cause: only `registry.npmjs.org` responds; `cdn.playwright.dev`,
`storage.googleapis.com`, `unpkg.com`, `cdnjs.cloudflare.com`, `cdn.jsdelivr.net`,
`fonts.googleapis.com`, `linear.app` and `www.raycast.com` all fail with `ECONNRESET`, and
`github.com` over node `fetch` fails certificate verification. Bash egress is effectively
npm-only; `fetch_page` runs elsewhere and does reach the general web.

**Consequence, stated plainly: I have not visually inspected any website, including
crshhx.com in production, and I cannot render anything to an image to inspect it myself.**
No screenshot in this project was produced by me. Where this document describes how the
current site *looks*, that is inferred from reading 2,065 lines of its CSS and its component
markup — which is how the type-hierarchy, uniform-surface and CSS-drift findings in §7 were
obtained, and which is reliable for those structural claims but is not a substitute for
seeing the page.

**The method adopted instead: build the directions as real pages and have a human look at
them.** `docs/design/concepts/` contains four self-contained HTML documents — an index and
one per direction — written in plain HTML and CSS, served locally so they can be opened,
scrolled and resized in an actual browser. Visual judgement is thereby delegated to someone
who can actually see. The concepts deliberately load their display faces from Google Fonts so
each direction can be judged with the typeface it intends; **that link must never ship**,
because production self-hosts woff2 subsets and `verify-dist.mjs` fails the build on any
non-first-party origin. They live outside `website/src` so they are never compiled, bundled or
published.

Resources that were **not** inspected, and are not claimed: collectui, httpster,
hoverstat.es, mkdir.directory, awesome-design-systems, uiverse.io, uidesigndaily,
open-ui.org, lapa.ninja, html5up, themewagon, templatemo, codemyui, fomantic-ui, beercss,
cssbed, layoutit, picsum, dummyimage, blurha.sh, visiwig, formito's favicon generator,
icon-shelf, scrollbar.app, naker, lottiefiles' creator, http.cat, vite.dev,
storybook.js.org, html5boilerplate, and everything beyond the first chunk of
awesome-web-animation. The reason is context budget and the images-only limitation of
`fetch_page` — **not** that these sites blocked access. Dribbble and Awwwards were reached but
yield only alt-text, so their visuals could not be studied; both are recorded as low-relevance
for that reason rather than for their content.

---

## 15. Three genuinely different visual directions

All three were built as working pages (`docs/design/concepts/`), each with real crshhx copy
and real product data. Each attacks a different axis: **A** changes the surface treatment and
scale; **B** changes the light/dark balance and the typographic identity; **C** changes the
structural concept. They are not three colourways of one idea.

### Direction A — "Aperture": immersive dark, product-lit

**The idea.** One dark room, one lit subject. Rather than a page decorated with product
screenshots, the page *is* the environment the overlay draws into, and the reticle is the
only bright thing on it.

**Treatment.** Background `#08090B`, a single raised surface `#0E1013`, field `#12141A`,
hairlines `#1E2128`. Display face Inter Tight at 600, `clamp(46px,6.4vw,92px)`, line-height
0.96, tracking −0.045em, with a deliberately dimmed third line — the first typographic move
the current site lacks. Accent `#00E599`, used maybe six times on the page.

**Composition.** An asymmetric 7/5 hero — headline on one side, a large square stage holding
a 240px reticle with a monospace parameter readout on the other, the stage aligned to the
headline's second line rather than centred. Then a **specification rail**: four facts in a
borderless row separated by space alone, no cards, no dividers — the specific antidote to the
current site's uniform bordered boxes. Then two capability sections that alternate side by
side rather than repeating a layout. Then a raised download strip and a minimal footer.

**What it is good at.** It is the closest of the three to the Linear/Raycast register, every
reticle colour is comfortably legible, and it is by far the cheapest to build from the code
that already exists. It reads as a serious tool rather than a game mod.

**What it risks.** It is the nearest neighbour to the "generic dark developer-documentation"
look the brief objects to. It is the least distinctive of the three, and because it has no
strong structural idea of its own, it depends entirely on typographic discipline and
composition to avoid flatness — exactly the failure mode documented in §7.

### Direction B — "Paper & Precision": light editorial with dark plates

**The idea.** A technical monograph about an instrument. Confident, spare, printed — the
opposite of a gaming site, and a deliberate test of the brief's instruction to explore a
different light/dark balance instead of assuming dark.

**Treatment.** Warm paper `#F6F5F1`, ink `#15161A`, rules `#DCD9D0`, secondary ink `#4A4C52`.
Display face **Instrument Serif** at 400 with italic used as an emphasis device, at
`clamp(52px,8.4vw,124px)` — a serif at that size on warm paper is a strong, unmistakable
identity. Body Inter 17px, mono IBM Plex Mono for data. Accent is a deep green `#0A6B4C`
chosen for contrast on paper, not the neon accent. Product plates are `#111215` with a
`#0C0D10` field — the only dark surfaces on the page, which is exactly why they hold the eye.

**Composition.** An editorial masthead hero: kicker, three-line serif headline with an italic
mid-word, then a two-column block pairing the lead paragraph and CTA against a ruled facts
list (version, platform, both file sizes, preset count, telemetry) laid out as data rather
than as badges. Sections numbered like a journal — `01 / Designer`, `02 / Library`,
`03 / Download` — in a 110px-plus-content grid. Capabilities as **ruled specification lists**
(`<span>` term, text value, hairline between) rather than cards. Presets as a **real table**
with hover, not a card grid. Download as two bordered options with the SmartScreen note in a
left-ruled callout.

**What it is good at.** Nothing else in this category looks like it, which is a genuine
differentiator for a product whose competitors all use neon-on-black. Long-form reading is
materially more comfortable, which matters because crshhx has a real documentation section and
a changelog. Editorial restraint reads as established rather than as eager. And the dark
plates solve the §6 legibility constraint while making the product the focal point of every
section by contrast alone.

**What it risks.** A serif display is a strong taste commitment and the least safe of the
three choices; if it misses, it reads as quaint rather than premium. Light chrome can feel
less like software and more like publishing. Two surface worlds (paper and plate) must be kept
consistent across five routes, which is more design surface to police. And the product appears
as an inset artefact rather than as an environment, which slightly undersells the overlay.

### Direction C — "Field & Studio": split contrast on one seam

**The idea.** Not a style preference but a fact about the product: crshhx exists between two
worlds. The **field** is the game — dark, full-screen, where the reticle is drawn. The
**studio** is the editor — precise, light, where you control it. The site is laid out as that
boundary, and the crosshair sits on it.

**Treatment.** Field `#0B0C0E` with surfaces `#141619`/`#1D2025` and lines `#282C33`; studio
`#F4F4F2` with lines `#D8D8D2`. One accent `#00E599` on the field side, a deep green
`#0A6B4C` on the studio side — the same hue family, adjusted for its ground. Display face
**Archivo 800** at `clamp(44px,5.6vw,86px)`, tracking −0.05em: bold, tight, graphic, and
deliberately not a thin geometric face.

**Composition.** The hero is a 50/50 split, field on the left and studio on the right, each
half carrying its own kicker (`The field — what the game sees` / `The studio — what you
control`), its own headline at its own scale, and its own content idiom: prose and the
download CTA on the dark side, and the *actual control set* — length, thickness, gap,
outline, rotation rendered as labelled sliders with values — on the light side. The reticle
is absolutely positioned on the seam between them, over a soft radial so it reads on both
grounds. Sections then alternate world: weapon slots on the field (rendered as keycaps,
`1 Shotgun … F10 Toggle overlay`), the studio's guarantees on paper as four ruled columns, and
download as a single panel split down the middle exactly like the hero, installer on the dark
half and portable on the light half with its own ink button.

**What it is good at.** It is the most original and most memorable of the three, and it is the
only one whose form is derived from something *true about crshhx* rather than applied to it —
which is the difference between looking designed and looking styled. It answers the brief's
objection head-on: a light studio half is the direct opposite of generic dark developer
documentation. It also gets the best of the light/dark argument instead of choosing a side —
product legibility from the dark field, editorial readability from the light studio — and it
gives the brand a graphic identity (the seam) that survives into OG images, screenshots and
the application's own about screen.

**What it risks.** Highest build and maintenance cost: two full palettes, two accent values
and two type scales in use, every component needing a variant, and contrast verification
doubled. The split collapses to a stacked pair on mobile, where the central idea is weakest
and needs a deliberate fallback. Archivo 800 at large sizes tips into loud if used more than
once per viewport. And the seam motif must not become a gimmick applied to every band — it
earns its place as structure, not decoration.

---

## 16. Comparison and recommendation

| Axis | A · Aperture | B · Paper & Precision | C · Field & Studio |
|---|---|---|---|
| Core idea | Lit subject in a dark room | Technical monograph | The product's own boundary |
| Distinctiveness | Low — nearest the current look | High | Highest |
| Reticle legibility | Excellent (field ≥ 5.2:1) | Good, but boxed on plates | Excellent on field, boxed on studio |
| Long-form readability | Good | Best | Good (studio bands) |
| Feels like software | Strong | Moderate | Strong |
| Build cost from current code | Low | Medium-high | High |
| Ongoing maintenance | Low | Medium (two surface worlds) | Highest (two palettes, two accents) |
| Contrast-verification burden | 9 pairs | ~14 pairs | ~18 pairs |
| Failure mode | Flat, generic | Quaint, undersells the overlay | Loud, gimmicky, costly |
| Mobile robustness | Strong | Strong | Weakest — the split stacks |

**Recommendation: Direction C as the identity, executed with Direction A's restraint, and
Direction B's editorial rigour on the long-form routes.**

Why C wins, in order of weight:

1. **It is the only direction whose form is a consequence of the product.** A and B are both
   excellent *treatments* that could be applied to almost any developer tool. C could only be
   crshhx: an overlay that lives between a dark game and a light editor. That is what makes a
   site look designed rather than styled, and it is the direct answer to "generic and
   template-like" — a template cannot have a concept, and this one does.
2. **It resolves the light-versus-dark question instead of picking a side.** The measured
   constraint in §6 is real: reticles need a dark field, and long-form reading prefers light.
   C satisfies both by assigning each to the surface where it belongs. A ignores the second,
   B boxes the first.
3. **It most decisively breaks the appearance the brief objects to.** Half of every screen is
   light. The dark half is no longer a documentation theme because it is not alone.
4. **It gives the brand a graphic device** — the seam, and a reticle straddling it — that
   works in the OG cover, in a README header and eventually in the application itself.

Why it must be restrained rather than adopted wholesale: C's failure mode is loudness, and the
brief explicitly forbids gimmickry. Three rules, therefore. **The split is used as structure
at most three times on the homepage** (hero, one capability band, download) and never as
decoration on every section. **Display weight is capped** — one Archivo 800 headline per
viewport, everything else at 600 or below. **The accent stays rare**, as in A: it appears on
the CTA, the active control and one or two data points, never as a wash.

Why not A alone: it is the safest and cheapest, and if build cost were the deciding factor it
would win. But it is the closest of the three to the look already rejected, and it carries no
idea of its own — it would need to earn its premium feel purely through typography and
spacing, which is precisely the discipline the current site failed at (§7). Choosing it would
be choosing to fix the symptoms.

Why not B alone: it is genuinely strong and the most readable, and its components are worth
stealing. But a serif masthead makes crshhx look like a publication about an instrument
rather than the instrument, which undersells the product at the exact moment a first-time
visitor decides whether to download an unsigned 85 MB executable. Its editorial devices are
better employed where reading is the task.

**What is taken from each.** From A: the rare-accent rule, the borderless specification rail,
the asymmetric hero alignment, and the discipline of one composition per section. From B:
ruled specification lists instead of card grids, presets as a real table, numbered sections on
`/docs` and `/changelog`, and the left-ruled callout for the SmartScreen note. From C: the
two-world palette, the seam, Archivo's display weight, and the alternating band structure.

**If build cost is the deciding factor**, the fallback order is A then B, and A can be
delivered in stage 2 with the existing components largely intact. That decision is recorded in
§19 as an open question rather than assumed.

---

## 17. Proposed design system

§8 above specifies a token system, and it remains valid, but it was written for a single dark
world. Under the recommended direction it is extended as follows. Where §8 and this section
conflict, **this section wins** — but only once a direction is chosen; until then §8 is the
fallback (it describes Direction A).

**Surfaces — two worlds, one scale.** Each world has four steps and nothing else, so a
component never has to invent a fifth: field `#0B0C0E` → raised `#141619` → sunken
`#0C0D10` → plate `#1D2025`; studio `#F4F4F2` → raised `#EAEAE6` → sunken `#FCFCFB` →
plate `#DCDCD6`. Lines are two steps per world: `#282C33` / `#3D434C` and `#D8D8D2` /
`#C3C3BB`. Any surface outside this set is a bug.

> **Corrected during implementation.** The studio sunken step was written as `#FFFFFF`. Pure
> white is a trap here for a mechanical reason: lightningcss shortens `#ffffff` to `#fff`, and a
> six-digit-only hex matcher silently skips that token — so the contrast pair disappears from the
> report instead of failing. The shipped value is `#FCFCFB`, indistinguishable on screen and
> matched exactly. The matcher now accepts and expands three-digit shorthands.

**Text — three steps per world, all AA-verified.** Field `#F0F1F3` / `#9BA1A9` / `#868C98`;
studio `#14161A` / `#4C5058` / `#5A5F67`. The third step is the one that failed before
(`#6B767E`, 4.16:1) and is verified in the build gate, not by eye.

> **Corrected during implementation.** The values first proposed here — field `#6E747C`, studio
> `#7B8089` — were written from the page ground and are wrong. Measured against every surface a
> faint label actually lands on, `#7B8089` gives 4.13:1 on `--studio-1` and 3.62:1 on
> `--studio-3`: both fail AA. The shipped values are the numeric solution to "≥4.5:1 against the
> *darkest* surface in the world, not the page", which is `#868C98` for the field (worst 4.84:1,
> on `--field-3`) and `#5A5F67` for the studio (worst 4.67:1, on `--studio-3`). The rule is now
> encoded in `scripts/verify-dist.mjs`, which computes all 24 pairs from the built CSS.

**Accent — one hue, two values, never a wash.** `#00E599` on field grounds, `#0A6B4C` on
studio grounds; both clear 4.5:1 as text on their own world. On-accent text `#06231C`. The
12% tint fill and 30% tint border remain permitted for a selected control; the accent is
never used as a background band, a gradient or a glow.

**Typography — the hierarchy the current site lacks.** Display: Archivo 800,
`clamp(44px,5.6vw,86px)`, line-height 0.92–0.98, tracking −0.05em, **one per viewport**.
Section: Archivo 700, `clamp(32px,4.4vw,64px)`, tracking −0.045em. Sub-section: 600 at 19–23px.
Lead: 400 at 18–19px, max 48ch, one per section. Body: 400 at 16.5–17px, line-height 1.6,
max 68ch. Data: JetBrains Mono 12px. Eyebrow: mono 11px, tracking +0.18em, uppercase —
replacing the current overused pill. Hero-to-body ratio moves from ~3.7× to ~5.2×, and
crucially **no two heading levels share a weight**, which is the single change that most
directly fixes §7's primary finding.

**Spacing and grid.** A 4px ramp to 208 (`4 8 12 16 24 32 48 64 96 128 160 208`),
`--section-y: clamp(64px,8vw,120px)`, container 1320px on the marketing routes (wider than
today's 1120px, to give the split room) and 1120px on `/docs`. The automatic
`.section + .section { border-top }` is removed: separation comes from alternating world or
from space, never from a rule applied by default.

**Shape.** Two radii, 4px for controls and 8px for panels — tighter than today's 6/10/14
trio, because softer corners read as generic. Product frames get distinct chrome (bar, 1px
line, inset shadow, sunken interior) so they never resemble content cards.

**Buttons.** One primary per viewport. Primary is a solid fill with the accent or ink of its
world, 48px, 600 weight, 4px radius, 1px lift on hover; secondary is a 1px outline that
brightens its border rather than filling. Every button states a fact where a fact is
available — `Download · 84.7 MB`, `v1.1.0 · Windows 10 & 11 · 64-bit` — following the Raycast
pattern, because that microcopy does the trust work a badge cannot.

**Motion.** Three classes only, all off under `prefers-reduced-motion`: *enter* (Reveal,
420ms, ≤12px translate, once); *intent* (≤180ms on hover/focus/active); *demonstration* (the
overlay's own behaviour — ADS morph, firing bloom, preset switch, slot cycling). One easing
curve site-wide, `cubic-bezier(.2,.6,.2,1)`. No library, no marquee, no parallax beyond the
pointer-tracking already in `Playground.tsx`, no scroll-jacking, nothing that blinks. The
test for any animation is the five purposes in §3: does it give feedback, aid orientation,
direct attention, show causality or express the brand? If it only decorates, it goes.

**Responsive.** Breakpoints `<640 / 640–1023 / 1024–1439 / ≥1440`, `clamp()` everywhere,
44px minimum targets, and no horizontal overflow asserted at 360/768/1024/1440. The split
hero stacks below 980px with the reticle re-anchored to the bottom-right of the field half
rather than to a seam that no longer exists — this is the one place Direction C needs a
designed fallback rather than a reflow, and it is called out here so it is not forgotten.

**Fonts.** Self-hosted woff2 latin subsets only, `font-display: swap`, CSS before JS.
Direction C needs Archivo (700/800), Inter (400/500/600) and JetBrains Mono (400) — three
families where the site has three today, but a different set, so the payload changes. The
current budget is 132,000 B raw against 119,708 B used; **adding Archivo 800 while keeping
Inter and Space Grotesk would exceed it**, so Space Grotesk is dropped and the budget is
re-measured and re-set in stage 2 rather than silently raised. The Google Fonts links in the
concept pages are preview-only and must not be copied into `website/`.

---

## 18. Page-by-page redesign plan

Five routes plus a 404. Each entry states the job of the page, the structure, and what is
deliberately *not* on it.

**`/` Home — make the product undeniable in one screen.**
Seam hero (field half: three-line headline "Drawn over the game. Never inside it.", one
paragraph on the passive hook, the download CTA with the requirement line beneath it; studio
half: the real control set, live-adjustable via the existing `Playground`). Reticle on the
seam, rendered by `Reticle.tsx` from real parameters, captioned with `MOCK_DISCLOSURE`.
Specification rail — 258 presets / 5 slots / F10 / 0 telemetry — borderless. Then three
capability bands alternating world: weapon slots (field, rendered as keycaps), the studio's
guarantees (paper, four ruled columns: library, transfer, profiles, compensation), and the
overlay's behaviour (field, ADS morph and firing bloom demonstrated). Download strip. Footer.
**Not on it:** testimonials, customer counts, awards, an integrations wall, a logo grid, a
video hero, an FAQ (that lives on `/docs`), or a second CTA above the fold.

**`/features` — the deep dive, one composition per capability.**
Six capabilities in the Raycast-for-Windows grammar but never the same layout twice: a naming
chip identifying a real application view, a two-part headline, one line of explanation, then a
genuine surface. Designer (annotated plate with parameter callouts), Library (a real table of
presets with topology counts), Transfer (a versioned export artefact shown as data), Profiles
(including the honest "stops switching rather than guesses" behaviour), Slots (real defaults
plus the passive-hook explanation), Overlay (ADS morph, firing bloom, keycaps). Each surface
is a rendered component, not an image, so it stays truthful and costs no bytes.
**Not on it:** icon-in-a-rounded-box grids, "and much more", feature counts that cannot be
verified, or a repeated two-column layout six times — the current page's actual defect.

**`/download` — earn the decision at the decision point.**
The Linear `/download` page is strikingly sparse: an icon, a heading, one line, and bare
platform rows with no hashes, sizes, guidance or troubleshooting. That restraint is correct
for an established, signed product and **wrong here**: crshhx ships an unsigned 85 MB
executable, so the trust work has to happen on this page. Structure: version and platform
facts; a split panel — installer on the field half with the recommended accent button,
portable on the studio half — each stating its size, its SHA-256 behind an expandable
"Verify download" with a working Copy button and the `certutil` command, and what it does
differently; a left-ruled SmartScreen callout using B's treatment; a three-step install guide;
a requirements table; single-column troubleshooting. The pending-release state keeps its
existing honest behaviour, pinned by `downloadPending.test.tsx`. **Not on it:** three pills on
one surface (today's defect), a ZIP or intermediate artefact, invented compatibility claims,
or any statement that the build was tested on physical hardware.

**`/docs` — Direction B's editorial rigour, because reading is the task.**
Numbered sections, a sticky contents rail on `≥1024px`, ruled specification tables, mono for
every parameter name and value, one accent for links and nothing else. Long-form measure held
to 68ch with 1.65 leading. Every illustrated control carries `MOCK_DISCLOSURE`. This is the
route where a light ground is most defensible and where B's serif-adjacent calm pays off;
whether `/docs` runs in the studio world or on paper is an open question (§19). **Not on it:**
accordion nesting deeper than two levels, code blocks in colours that fail contrast, or
documentation of a feature the application does not have.

**`/changelog` — a release history, not a feed.**
Dated entries newest-first, each with a version heading in display weight, a one-line summary
and a link to the release on GitHub, following Linear's pattern of title plus one or two
sentences rather than a wall of notes. The published 1.1.0 entry and the 1.0.0 development
note are the only entries that exist and the only entries shown; the 1.0.0 entry is not
touched. Status language is factual — "released" and "in development" — with at most one
status marker per entry. The route's description is corrected: it currently claims nothing has
been published, which has been untrue since v1.1.0. **Not on it:** fabricated releases,
backdated entries, or a roadmap promising undated features.

**`/404` — one line and a way out.**
Keeps `noindex`, states the page does not exist, offers the three real destinations. A small
rendered reticle is the only decoration. **Not on it:** a joke, a search box with nothing to
search, or a full navigation duplicate.

**Cross-cutting.** One `<h1>` per route; unique title, description, canonical, `og:url` and
`og:image`; skip link and `main#main` preserved; focus-visible states on every interactive
element; the manifest-driven release rendering untouched so URLs, sizes and digests cannot
drift; and `verify-dist.mjs` extended to cover the second palette's contrast pairs before any
of this ships.

---

## 19. Status, and what is blocked

**Delivered in this phase.** The reference research (§1–§4) with its access limits stated; the
measured audit of the current site (§7); the corrected light/dark finding (§6, §14); three
built directions (§15) as working pages; a comparison and a reasoned recommendation (§16); a
design system for the recommended direction (§17); a page-by-page plan (§18).

**Already shipped on this branch, before the redesign was re-scoped.** A CI gate for
`website/` (`.github/workflows/website.yml`), which proved necessary because no job ran the
website's tests and a live failure was sitting on `main`; the production SEO default origin,
canonical, `og:url` and sitemap; a contrast fix to `#868C98`; removal of the grid, HUD and
glow treatments; and a test pinning the preset count at 258. Website 61/61, application
1185/1185, both typechecks clean, build and `verify-dist.mjs` passing. Committed and pushed;
**no pull request opened, nothing merged, nothing deployed.**

**Blocked, and reported rather than worked around.** Visual inspection of any website,
including crshhx's own production pages (§14). Browser automation, screenshots, Lighthouse,
Core Web Vitals, real-device responsive behaviour, and keyboard or screen-reader passes
conducted by me. Every Cloudflare Pages setting, because the configuration is dashboard-only
and `dash.cloudflare.com` is unreachable. Whether `crshhx.com` is the intended domain — it did
not resolve when fetched, and `SITE_URL` must not be pointed at an unconfirmed origin.
Verification of the Windows build on physical hardware, which remains the owner's step.

**Open questions for the owner.** (1) **Direction** — C as recommended, or A or B, after
looking at the built pages. (2) **Budget for the direction** — C roughly doubles the contrast
pairs to verify and needs a second palette in tokens and tests; if that cost is not wanted, A
is the fallback and can ship from the existing components. (3) **`/docs` ground** — studio
dark or paper light. (4) **Display face** — Archivo needs a self-hosted subset added and Space
Grotesk dropped to stay inside the font budget; confirm that trade. (5) **Domain** — confirm
the production origin before `SITE_URL` is set.

**Next step, once a direction is chosen.** Stage 2 implements it on this branch: tokens and
typography first, then the homepage, then `/features`, `/download`, `/docs`, `/changelog` and
`/404`, with `verify-dist.mjs` extended before each route rather than after all of them. A
pull request will be opened for review; **nothing will be merged or deployed until the
redesign has been reviewed and approved.**

> **Superseded.** Direction C was approved and stage 2 is implemented. What actually shipped,
> with its measured numbers and its deviations from this plan, is recorded in §20.

---

## 20. Implementation record (stage 2, Direction C)

This section records what was built, the numbers measured from the build rather than estimated,
every place the implementation deviates from §17–§18, and — most importantly — what was **not**
verified. It is written to be checkable: each figure can be reproduced with the command beside
it.

### 20.1 What shipped

**Seven routes plus a 404**, all prerendered to real HTML and hydrated: `/`, `/features`,
`/pro-crosshairs`, `/academy`, `/download`, `/docs`, `/changelog`. The two new routes are the
Pro Crosshairs vault and the Crosshair Academy — both already shipped inside the application and
previously absent from the site entirely.

**Two worlds, one seam.** `tokens.css` defines four surface steps, three text steps and two line
steps per world, plus one accent hue with a value per world. `.world-field` and `.world-studio`
are the only two backgrounds a band may have; a component never picks its own ground. The
homepage uses the split exactly three times (hero, "two collections", download strip) and that
count is asserted by a test rather than remembered.

**The honesty rule, enforced by measurement.** The light studio world is editorial only. Every
product visual — window mockups, the live playground, all 40 catalogue reticles — is drawn on a
dark `--field-2` plate whichever world it sits in, because the six shipped reticle colours fall
to **1.01:1** against `--studio-0`. A reticle on paper would be invisible as well as untrue.
Every mockup carries the caption "Illustrative interface preview — not a screenshot", and a test
requires that on every page the word "screenshot" appears *only* inside such a denial.

**The catalogue is extracted, not retyped.** `scripts/extract-catalogue.mjs` bundles the
application's own `proCrosshairs.ts`, `academy.ts` and `crosshairCollection.ts` with esbuild,
maps each `CrosshairConfig` onto the website's renderer spec, and writes `src/catalogue.json`
(27,003 B raw / 4,979 B gzipped). `src/catalogue.ts` is the typed boundary; no page imports
application code. `npm run extract:check` re-extracts and fails on drift, and it is wired into
both `npm run build` and the CI workflow — so the site cannot quietly keep describing a product
that has moved on. Extracted facts: **258** built-in presets, **40** pro designs in 8 categories
(35 inspired, 5 original, 0 verified — the vault deliberately attributes nothing to a named
player), **10** tutorials with 45 steps.

**Reticle renderer extended to the real schema.** Per-arm presence and geometry, square and
circular dots, inner as well as outer outlines, whole-reticle rotation and scale. Where a static
drawing cannot represent a shipped behaviour, the extractor records it in `beyond[]` and the page
says so in words — one design (Bloom Trainer) uses firing bloom, and its card states that the
drawing omits it rather than implying completeness.

### 20.2 Measured numbers

Reproduce with `cd website && npm run build` (the figures are printed by `verify-dist.mjs`).

| Measure | Before (4ecedfc) | After | Budget |
| --- | --- | --- | --- |
| JavaScript, gzipped | 96,426 B | **108,699 B** | 112,000 B |
| CSS, gzipped | 6,907 B | **7,518 B** | 10,000 B |
| Self-hosted fonts, raw | 119,708 B | **122,480 B** | 126,000 B |
| Contrast pairs verified | 9 | **24**, all ≥4.50:1 | — |
| Prerendered pages | 6 | **8** (7 routes + 404) | — |
| Website tests | 61 in 8 files | **83 in 10 files** | — |

Per-route HTML, raw / gzipped: `/` 66.1 KB / 9.5 KB · `/features` 63.7 KB / 8.4 KB ·
`/pro-crosshairs` 55.7 KB / 8.8 KB · `/academy` 22.9 KB / 5.5 KB · `/download` 17.0 KB / 5.0 KB ·
`/docs` 18.3 KB / 6.4 KB · `/changelog` 11.9 KB / 4.1 KB · `/404` 6.2 KB / 2.0 KB.

The JavaScript increase is accounted for rather than absorbed: `catalogue.json` is 4,979 B
gzipped of it, and the rest is two new routes plus a renderer that now covers per-arm geometry,
square dots, inner outlines, rotation and scale. Budgets were re-set from the measured result and
the reasoning is written into `verify-dist.mjs` beside the numbers, so the next increase has to
justify itself instead of hiding.

CSS grew by about 600 B while gaining a second palette, a contact sheet, a curriculum, rails and
split panels. It grew that little because **33 dead rules from the previous design were removed**
(the old feature explorer and its tabs, the step grid, the plate components, `.lead`, `.dim`,
`.sr-only`). The removal was verified by comparing the selector sets before and after, so nothing
live was lost with them.

Fonts: Space Grotesk dropped (−26,152 B), Archivo 700 and 800 added (+28,924 B), Inter 400/500/600
and JetBrains Mono 400 kept. **Archivo 600 was deliberately excluded** — it costs 13,820 B and
would have broken the previous ceiling, so sub-headings use Inter 600. Seven woff2 files, latin
subsets, `font-display: swap`. The concept pages' Google Fonts `<link>`s never entered
`website/`; a test fails the build on any origin that is not the repository or the site itself.

### 20.3 Deviations from the plan, and why

1. **`/features` is six sections, not a tabbed explorer.** §18 sketched tabs. A tablist hides five
   of the six areas from a crawler and from a reader without script, and repeating one layout six
   times was precisely §7's finding about the old site. Each area now has its own composition — a
   ruled parameter list, a contact sheet of eight real presets, a flipped split, three columns,
   keycaps, and a flush dark stage with the one looped demonstration on the page (firing bloom,
   which shows a behaviour rather than decorating a section). A jump index at the top links the
   six anchors.
2. **Buttons state their fact beside the label, not inside it.** §17 proposed `Download · 84.7 MB`.
   The owner specified the pair "Download crshhx" / "Download portable" in an earlier round, so
   those labels are kept and the measured size, version and SHA-256 sit in the fact row directly
   above each button, where two builds can be compared.
3. **`/docs` is a light studio page.** §19 listed this as an open question. It is answered in
   favour of the studio world: documentation is editorial surface, and its product visuals are
   plates, so the honesty rule is not bent. Its tables sit in focusable, labelled scroll regions
   rather than being crushed or hidden.
4. **A shared `SectionHead` component was deleted.** It was one reason every section looked the
   same. Each page now writes its own head; only `Callout` survives as a shared block.
5. **The header carries five text links, not seven.** Home is the brand and Download is the call
   to action; repeating either as a text link is noise. The mobile menu lists all seven.

### 20.4 What was verified, and how

* **Tests** — `npm test`: 83 passed, 10 files. Includes hydration without markup change on every
  route, one `<h1>` per page, banned-phrase and fabricated-statistic sweeps over all pages, the
  "screenshot only as a denial" rule, mockup captions, the real release facts (URLs, byte sizes,
  SHA-256s), the no-JS pending state, the catalogue's internal consistency, and a test that reads
  the desktop application's `Sidebar.tsx` and requires every navigation label the website shows to
  exist in the product.
* **Types** — `npm run typecheck`: both projects clean.
* **Build and distribution** — `npm run build`: extract check, client build, server build,
  prerender, then `verify-dist.mjs`, which recomputes all 24 contrast pairs *from the built CSS*,
  checks budgets, requires every `.exe` href to exist in the release manifest and every manifest
  fact to appear on `/download`, and fails on any third-party origin.
* **Release facts, against production** — the download page's filenames, byte sizes, URLs and
  SHA-256 values were compared with GitHub's own record of the published release, not just with
  `src/releases.json`:
  `gh api repos/sfingW/crshhX/releases/tags/v1.1.0 --jq '.assets[] | {name, size, digest}'`
  returns `sha256:bed1e654…dccac45d` / 88,862,700 B for the installer and
  `sha256:037476de…8ba842e2` / 81,455,085 B for the portable build — both identical to what the
  page prints. A request for the installer URL returns `302` to the asset host with
  `filename=crshhx-crosshair-studio-setup-1.1.0.exe`, so the link is live and points at a real
  file. (The asset host itself is not reachable from the development environment, so the bytes
  could not be re-downloaded and re-hashed locally; the digest comparison is GitHub's.)
* **Links** — every `href` in the built HTML was resolved: 111 unique links across 8 pages.
  Internal paths resolve to files that exist, in-page anchors resolve to ids on the same page,
  cross-page anchors (`/docs#faq`, `/docs#troubleshooting`) resolve to ids in the target file, and
  both executable links match the manifest exactly.
* **Structure and accessibility, statically** — a scripted audit of the built HTML: one `<h1>` per
  page, no skipped heading level, no duplicate `id`, no button or link without an accessible name,
  no positive `tabindex`, `<main id="main">` and a skip link on every page, every `<nav>` labelled,
  every table with header cells, every `<details>` with a `<summary>`. Eight pages, zero findings.
  Focus is a single global `:focus-visible` ring in the accent of the current world (11.80:1 on the
  field, 5.92:1 in the studio), all motion is disabled under `prefers-reduced-motion`, the category
  filter uses `aria-pressed` with a `role="status"` count, and the mobile menu reports
  `aria-expanded` and `aria-controls`.
* **Responsive, by construction** — every composition is an `auto-fit`/`auto-fill` grid or a
  wrapping flex row except two, which have explicit breakpoints: the ruled list collapses to one
  column below 640px, and the three-column requirements table scrolls in a focusable region. The
  split hero stacks below 980px with the reticle re-anchored to the field half, as §17 required.
  Navigation switches to a menu below 1024px.
* **Routes and assets, over HTTP** — serving the built `dist/` locally returned `200` with the
  correct document and the correct `<h1>` for all seven routes, `404` with the custom page for an
  unknown path, and `200` with correct content types for the CSS, JS, woff2 and sitemap.
* **Cloudflare Pages built the branch** — pushing it made the Pages Git integration build and
  report `Deploy successful!` for commit `3347d38`, producing a *preview* deployment (production
  is `main` and was not touched: `https://crshhx.pages.dev/` still serves the previous design, its
  `<h1>` still "Your crosshair, exactly where you put it."). Two things this proves that a local
  build cannot: their environment satisfies `extract:check`'s need to read the application's
  catalogue modules one directory above `website/`, and the site deploys there with no dashboard
  change. Fetching the preview returned the new home page, `/features` and `/pro-crosshairs` with
  their full prerendered content — all 40 designs, the real application navigation inside the
  mockups, the disclosure captions, and the download button pointing at the release asset.

### 20.5 What was **not** verified — stated plainly

**No browser was used, and nothing was looked at.** Browser automation is unavailable in this
environment (no browser binaries; the Playwright download host is unreachable), so there are no
screenshots, and no claim in this document or in the pull request is based on seeing the rendered
site. Specifically **not** verified:

* visual appearance, alignment, spacing rhythm, type scale and colour as actually rendered;
* real-browser responsive behaviour at 360 / 768 / 1024 / 1440 px, and the absence of horizontal
  overflow — asserted from CSS structure, not measured in a viewport;
* keyboard traversal and screen-reader behaviour in a real assistive technology;
* Lighthouse, Core Web Vitals, field or lab performance, and paint behaviour with the fonts;
* the Cloudflare Pages *production* deployment and its dashboard configuration — the branch built
  as a preview (§20.4), but no production deploy happened and the dashboard cannot be read;
* the Windows application itself on physical hardware.

The CSS in this redesign is therefore reasoned about numerically (every colour measured, every
layout described in intrinsic grid terms) and checked structurally, but its appearance has not
been seen by me. **Reviewing the rendered pages in a browser is the owner's step, and it is the
one gap this record cannot close.**

One observation from reading the deployed pages is recorded in §20.6 rather than resolved there.

### 20.6 Cloudflare Pages: what pushing the branch did

Pushing the branch made the Pages Git integration build it and report **`Deploy successful!`** for
commit `3347d38`, with a preview at `https://dedb5063.crshhx.pages.dev` and a branch preview at
`https://arena-349e1219-crshhx.crshhx.pages.dev`. That is the project's own configuration doing
what it does for every branch; it was not a deploy step taken here, and **production was not
touched** — `https://crshhx.pages.dev/` still serves `main`, which is still the previous design
(its `<h1>` remains "Your crosshair, exactly where you put it."). Nothing merges, releases or
deploys without approval.

Two useful things the preview proves that a local build cannot:

1. **The Pages build environment satisfies the new `extract:check` step.** The build begins by
   reading the desktop application's catalogue modules one directory above `website/`. A host that
   checked out `website/` alone would fail there; Cloudflare clones the repository and only changes
   the working directory, and the successful build confirms it.
2. **The deployed documents are the prerendered ones.** Reading the preview returned all 40 designs
   with their real names, descriptions, tiers and topologies on `/pro-crosshairs`, the six areas on
   `/features`, and the new home page with its rail of counted facts — content that exists in the
   static HTML rather than only after hydration.

**One observation, recorded rather than resolved.** Reading a route through this environment's page
fetcher reported `<title>Page not found — crshhx</title>` for `/features` and `/pro-crosshairs`
while returning those pages' correct content, and reported the right title for `/`. The same thing
happens on **production `/features`, which has been live and working since before this branch**, so
it is a property of the fetch path (Pages answers `/features` with a redirect to `/features/`) and
not something this redesign introduced. The prerendered files are unambiguous — each route carries
exactly its own `<title>`, asserted by the build gate — and `*.pages.dev` cannot be requested
directly from here, so no status code could be read to settle it. It costs one look in a browser:
open a route and check the tab title. If a directory route really did answer 404, the fix would be
to emit a flat `features.html` beside each directory index, or add a `_redirects` file.

### 20.7 Git

All work is on `arena/349e1219-crshhx`, branched from `4ecedfc`. Nothing was pushed to `main`,
no release was created, and no production deployment was made. Pull request #10 is open for
review; merging, releasing and deploying wait for the owner's approval.
