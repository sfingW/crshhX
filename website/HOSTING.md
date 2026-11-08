# Hosting the crshhx website

The website builds to plain static files in `website/dist`. There is no server, no database,
no accounts and no analytics, so hosting is a matter of putting those files behind a CDN with
TLS. Nothing has been purchased, provisioned or published — this document records the options
that were evaluated and the configuration each one needs.

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
  Not worth the extra work for a five-page site when Pages/Netlify do it for free.

### Anything with a server (Vercel functions, a VPS, a container)

- Rejected. The site has no runtime, and adding one would add cost, attack surface and a
  deployment failure mode for no benefit.

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

Sketch of that workflow — **not enabled, because nothing is published yet**:

```yaml
name: website
on:
  workflow_dispatch:
permissions:
  contents: read
  pages: write
  id-token: write
concurrency:
  group: pages
  cancel-in-progress: true
jobs:
  build:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - name: Install website dependencies
        working-directory: website
        run: npm install --no-audit --no-fund
      - name: Verify
        working-directory: website
        run: npm run typecheck && npm test
      - name: Build and prerender
        working-directory: website
        env:
          SITE_URL: ${{ vars.SITE_URL }}
          SITE_BASE: ${{ vars.SITE_BASE }}
        run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: website/dist
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

## Before going live

- [ ] Choose a host and, if wanted, a domain (not purchased yet, deliberately).
- [ ] Set `SITE_URL` (and `SITE_BASE` if the host uses a path prefix) in the build
      environment, then rebuild: this emits `canonical`, `og:url` and `sitemap.xml`.
- [ ] Add the deploy workflow above as its own file and run it manually the first time.
- [ ] Publish real executables first: populate `src/releases.json` from the release
      workflow's measured output, so the download page and changelog stop showing the
      Coming Soon state.
- [ ] Re-check Open Graph previews with the host's debugger once a public URL exists.
