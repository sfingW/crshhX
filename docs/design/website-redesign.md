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

**A light-themed crshhx site cannot honestly show the product.** That is a functional
finding, not a preference.

Three options were weighed:

- **Light with dark product stages (mixed).** Technically viable — reticles live inside dark
  insets, so they stay legible. Rejected: it makes the product look like a screenshot pasted
  onto a brochure, contradicts the application (which is dark), and pushes every reticle into
  a box rather than letting it occupy the page.
- **Mixed by page** (dark marketing, light documentation). Considered seriously, because
  long-form reading is more comfortable on light paper. Rejected for coherence: the
  documentation also illustrates crosshair parameters with rendered reticles, so it inherits
  the same legibility constraint; and a theme change mid-site would read as two products.
  Long-form comfort is instead bought with measure, leading and surface lift (§8).
- **Dark-first throughout. Chosen.** Not black: a warm-neutral ramp lifted from the
  application itself, with product stages on a slightly raised field so all six reticle
  colours clear 3:1 with margin.

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
