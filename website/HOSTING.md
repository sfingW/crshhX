# Hosting the crshhx website

The website builds to plain static files in `website/dist`. There is no server, no database,
no accounts and no analytics, so hosting is a matter of putting those files behind a CDN with
TLS.

**Current state: published on Cloudflare Pages at `https://crshhx.pages.dev`**, built by the
Pages Git integration from `main`. No custom domain is attached — `crshhx.com` did not resolve
when it was checked, and `SITE_URL` must not point at an origin nobody controls. This document
records the options that were evaluated, the configuration the live one needs, and the two
requirements that are easy to break.

## Requirements

| Requirement                            | Why it matters                                                             |
| -------------------------------------- | -------------------------------------------------------------------------- |
| Serve `dist/` as-is                    | No build step on the host means no host-specific build failures             |
| Custom 404                             | `dist/404.html` must be served for unknown paths                            |
| Clean URLs                               | `dist/features/index.html` must answer `/features` without a redirect loop   |
| Free TLS, HTTP/2                       | Baseline for a product site                                                 |
| Optional path prefix                   | Some hosts serve project sites from a subdirectory                          |
| No cost required to evaluate           | Deployment must stay free until a domain is chosen                          |
| Never touches application packaging    | The website must not be able to break an Electron release                   |
| Build sees the whole repository        | `npm run build` reads the desktop application's catalogue (see below)       |

## Options evaluated

### Cloudflare Pages — recommended

- Direct upload of `dist/`, or a Git build with `npm run build` in `website/` and
  `website/dist` as the output directory.
- Clean URLs and `404.html` handled automatically; custom domains and TLS included.
- Generous free tier for a site this size (the whole build is a few hundred kilobytes).
- Build-time environment: `SITE_URL=https://<origin>`, `SITE_BASE=/`.

### Netlify — equally good

- Same model: build command `npm run build`, publish directory `website/dist`.
- `404.html` is honoured natively; clean URLs are the default.
- Add `SITE_URL` in the site's environment variables.

### GitHub Pages — works, with one caveat

- Free and already tied to this repository, but a *project* site is served from a path
  prefix: `https://<user>.github.io/crshhx-website/`.
- Build with `SITE_BASE=/crshhx-website/` (and `SITE_URL=https://<user>.github.io/crshhx-website`).
  The router basename, canonical URLs, Open Graph image URL and sitemap all follow that
  prefix, so nothing needs hand-editing.
- Unknown paths serve `404.html` automatically.

### Object storage + CDN (S3, R2, GCS)

- Viable and cheap, but you configure error documents, cache headers and TLS yourself.
  Not worth the extra work for a seven-route site when Pages/Netlify do it for free.

### Anything with a server (Vercel functions, a VPS, a container)

- Rejected. The site has no runtime, and adding one would add cost, attack surface and a
  deployment failure mode for no benefit.

## Two build requirements that are easy to break

**1. The build needs the repository, not just `website/`.**
`npm run build` starts with `npm run extract:check`, which bundles
`src/lib/proCrosshairs.ts`, `src/lib/academy.ts` and `src/lib/crosshairCollection.ts` from the
*desktop application* (one directory above `website/`) and compares the result with the
committed `website/src/catalogue.json`. The Pro Crosshairs and Crosshair Academy pages render
that file, so the site describes the product as it actually is rather than as somebody typed it.

Cloudflare Pages satisfies this: it clones the whole repository and only changes the working
directory, so `../src` is present. A host that checks out `website/` alone — or a Docker build
that copies only that directory — would fail here, deliberately and with a message saying which
file is missing. To regenerate the catalogue after an application change:

```sh
cd website && npm run extract        # rewrite src/catalogue.json
git diff --stat src/catalogue.json   # review, then commit it
```

`src/catalogue.json` is generated and committed, never hand-edited; `src/catalogue.ts` is the
typed boundary the pages import.

**2. Deployment is configured in the Cloudflare dashboard, not in this repository.**
Build command `npm run build`, working directory `website`, output `website/dist`, production
branch `main`. Those settings cannot be read or verified from here — `dash.cloudflare.com` is
not reachable from the development environment — so a change to them is invisible to CI. If a
deploy ever produces an empty or stale site, check the dashboard settings before the build.

`.github/workflows/website.yml` is the verification gate (typecheck, tests, extract check,
build, dist verification). **It does not deploy anything** and has `contents: read` only;
deployment stays with the Pages integration so that a workflow change cannot publish the site.

## Keeping deployment separate from packaging

The desktop application is packaged by `.github/workflows/windows-release.yml`, which runs
`electron-builder` and is triggered by tags and manual dispatch. The website must never be
part of that path, and the reverse must also hold: a website deploy must never run
`electron-builder`.

Rules that keep them apart:

1. `website/` has its own `package.json` and lockfile. `npm ci` at the repository root does
   not install website dependencies, and `npm ci` inside `website/` does not install the
   application's.
2. `electron-builder.yml` selects files by whitelist, so `website/` is not part of any
   packaged artifact.
3. The website's TypeScript project (`website/tsconfig.json`) includes only `website/src`
   and `website/tests`; the application's projects include only their own directories. A
   website type error cannot fail an application typecheck.
4. A website deploy workflow should be a separate file, `.github/workflows/website.yml`,
   triggered by `workflow_dispatch` (and optionally by pushes that touch `website/**`),
   running only inside `website/`.

Rule 4 is what actually shipped, with one difference: `.github/workflows/website.yml` exists
and **verifies without deploying**. It runs on pull requests and pushes to `main` that touch
`website/**`, installs only website dependencies, and runs typecheck → tests → extract check →
build → `scripts/verify-dist.mjs`. It has no `pages: write` and no `id-token: write`, and it
never calls `electron-builder`. The sketch that was here described a GitHub Pages deploy; it was
removed rather than left to contradict the file that exists.

## Status

- [x] Host chosen and live: Cloudflare Pages, `https://crshhx.pages.dev`, production branch
      `main`.
- [x] `SITE_URL` defaults to that origin in `src/site.ts`, so `canonical`, `og:url` and
      `sitemap.xml` are emitted without depending on a dashboard variable. Setting `SITE_URL`
      in the build environment still overrides it, which is the path to take if a domain is
      ever attached.
- [x] Real executables published: v1.1.0 is in `src/releases.json` with measured byte sizes and
      SHA-256 values transcribed from the release workflow's output, so the download page and
      changelog serve direct file links instead of a pending state.
- [x] Verification workflow enabled (`.github/workflows/website.yml`).
- [ ] A custom domain, if wanted. Not purchased, deliberately.
- [ ] Re-check Open Graph previews with a platform debugger after the next deploy: that needs a
      browser and a public fetch, neither of which is available in the development environment.
- [ ] Confirm the dashboard settings above after any change to them; they are not visible to CI.
