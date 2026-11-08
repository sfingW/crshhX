# crshhx website

The public website for **crshhx** (Crshhx Crosshair Studio): home, features, download,
documentation and changelog. It is a static site — no backend, no accounts, no database,
no analytics, no telemetry.

This directory is deliberately isolated from the desktop application. It has its own
`package.json`, lockfile, TypeScript project, Vite config, tests and deploy workflow, and
imports nothing from `src/`, `electron/` or `vite/` at the repository root. Running any
command here cannot change how the Electron app is built or packaged.

## Commands

```bash
npm install        # website dependencies only
npm run dev        # dev server on http://localhost:5199
npm run build      # client build + server build + prerender every route
npm run preview    # serve dist/ on http://localhost:4173 (what a host would serve)
npm run typecheck  # tsc --noEmit over src/ and tests/
npm test           # vitest: routes, manifest honesty, SSR content, hydration, links
```

`npm run build` produces `website/dist/`, which is the entire deployable artifact:

```
dist/index.html            prerendered home
dist/features/index.html   prerendered features
dist/download/index.html   prerendered download
dist/docs/index.html       prerendered documentation
dist/changelog/index.html  prerendered changelog
dist/404.html              prerendered not-found page
dist/assets/*              one JS bundle, one CSS bundle, self-hosted woff2 fonts
```

Every route is rendered to real HTML on the server and hydrated in the browser, so the
site is crawlable and readable with JavaScript disabled, and interactive when it is not.

## Architecture

| Layer            | Choice                                                              | Why                                                            |
| ---------------- | ------------------------------------------------------------------- | -------------------------------------------------------------- |
| UI               | React 19 + TypeScript 5.7, strict                                   | Same language and framework as the desktop app, no new concepts |
| Router           | `react-router-dom` 6 (`BrowserRouter` client, `StaticRouter` build)  | Client navigation plus prerendering from one route table        |
| Build            | Vite 6                                                              | Small bundles, no config sprawl                                 |
| Styles           | Hand-written CSS custom properties in `src/styles/`                 | One design system, zero runtime CSS dependencies                |
| Fonts            | `@fontsource/*` latin subsets, self-hosted                          | Works offline, no third-party requests                          |
| Tests            | Vitest + jsdom                                                      | Matches the desktop app's test runner                           |
| Analytics        | None                                                                | Requirement: no tracking by default                             |

`src/site.ts` is the single source of truth for identity, the route table and navigation
labels. `src/releases.json` is the single source of truth for what exists to download.
`scripts/prerender.mjs` reads both from the built server entry, so titles, descriptions,
the sitemap and the download state cannot drift from the pages that render them.

### Adding a route

1. Add an entry to `ROUTES` in `src/site.ts` (path, nav label, title, description).
2. Create the page component in `src/pages/` and register it in `src/App.tsx`.
3. Nothing else: navigation, `<title>`, meta description, Open Graph tags, the
   prerendered file and the sitemap entry all follow from the route table.

## Releasing: connecting real download links

**Do not add a download URL by hand.** The download page and the changelog both render
from `src/releases.json`, and `scripts/prerender.mjs` fails the build if any page links to
an `.exe` while `latest` is `null`.

When the release workflow has produced and verified artifacts it prints, for each file, the
exact name, byte size and SHA-256. Transcribe that output:

```jsonc
{
  "channel": "released",            // was "unreleased"
  "latest": "1.0.0",                // was null
  "published": [
    {
      "version": "1.0.0",
      "date": "2026-11-20",         // the date the artifacts were published
      "status": "published",
      "summary": "First public build.",
      "added": ["…"],
      "artifacts": [
        {
          "file": "crshhx-Setup-1.0.0.exe",
          "url": "https://github.com/sfingW/crshhX/releases/download/v1.0.0/crshhx-Setup-1.0.0.exe",
          "size": 83123456,         // measured bytes, never an estimate
          "sha256": "…"
        }
      ]
    }
  ],
  "development": []                 // move entries into "published" once shipped
}
```

The download page then renders live buttons, version, release date, size and hash; the
changelog lists the release as published and keeps development notes separate.

## Hosting

The site is plain static files, so any static host works. Recommendation and reasoning
live in `HOSTING.md` next to this file; in short:

- **Cloudflare Pages** or **Netlify** — root deployment, automatic `_redirects`/`404.html`
  handling, free TLS, no build-time surprises. Set `SITE_URL` to the public origin.
- **GitHub Pages** — fine, but it serves from a path prefix for project sites, so set
  `SITE_BASE=/crshhx-website/` (the router, canonical URLs and the sitemap all follow it).

Deployment is configured separately from application packaging: the website workflow only
builds and publishes `website/dist` and never runs `electron-builder`.

### Environment variables (build time only)

| Variable     | Default | Purpose                                                              |
| ------------ | ------- | -------------------------------------------------------------------- |
| `SITE_URL`   | *(empty)* | Public origin, e.g. `https://crshhx.app`. Empty ⇒ `canonical`, `og:url` and `sitemap.xml` are omitted rather than guessed |
| `SITE_BASE`  | `/`     | Path prefix for hosts that serve from a subdirectory                   |

Nothing here is a runtime secret and nothing is read by the browser after the build.

## Product visuals

No application screenshots exist in this repository, so every product visual is a
hand-built HTML/CSS/SVG mockup rendered from the application's real parameters — arm
lengths, gaps, outline and centre-dot settings taken from shipped presets, and the real
view names in the sidebar. Each one carries the caption in `MOCK_DISCLOSURE`, and a test
asserts that caption is present and that no mockup is described as a screenshot.
