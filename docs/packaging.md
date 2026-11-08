# Packaging — building and shipping the Windows app

How `crshhx` goes from a repository to something a user can install, what each
packaging decision protects, and — importantly — **what has never been verified
on a real machine**.

## Building

```bash
npm run build          # renderer (Vite → dist) + main process (tsc → dist-electron)
npm run dist:win       # NSIS installer + portable exe into release/
npm run pack           # unpacked app directory only (release/win-unpacked), no installer
```

`npm run dist:win` needs network access to GitHub for the Electron distribution
and the NSIS toolchain. On a normal machine that just works.

> **Not yet performed.** As of this document, no Windows artifact has ever been
> produced or executed. The sandbox this work was done in can reach `github.com`
> but not the release-asset CDN the NSIS and code-sign toolchains are fetched
> from, so `dist:win` has never completed. Everything below is therefore
> configuration and reasoning, verified only by unit tests and by inspection.
> The first real build on a Windows machine is expected to surface problems;
> `docs/testing.md` carries the checklist.

## Why the renderer is served from `app://crshhx`

Production used to call `loadFile()`, putting the document on `file://`. Two
consequences made that unsuitable for a distributed app:

1. **ES modules over `file://`.** Vite emits module scripts (both HTML entries
   share one code-split chunk, so this is structural). Chromium fetches module
   scripts in CORS mode and a `file://` document has an opaque origin, so the
   bundle can be refused and the window renders blank with a CORS error in the
   console. This failure mode is silent at build time and at typecheck time.
2. **Storage is partitioned by origin.** Every crosshair, folder, favourite,
   description, swatch, setting, theme accent and weapon-slot profile lives in
   `localStorage`. On `file://` that partition is tied to the file's location, so
   moving a portable exe — or updating to a new install path — can make the whole
   library appear to have been erased.

`electron/services/rendererAssets.ts` registers a privileged scheme and serves the
bundle from a fixed origin. Module scripts get a real same-origin relationship,
and storage is keyed to something that never moves.

The handler refuses, rather than guesses: other schemes, other hosts, NUL bytes,
bad percent-encoding, and — the point of having a guard at all — any path that
resolves outside the renderer bundle. Plain `..` walks are already collapsed by
the URL parser before the handler runs; the vector that actually reaches the
guard is *percent-encoded* traversal, and there is a test for exactly that.

`RENDERER_DIST` is derived through `resolveRendererDist()`, which branches on
`app.isPackaged`. This is the same relationship that defect #9 got wrong once
silently; `tests/buildLayout.test.ts` pins both layouts.

## The storage migration

Switching origins moves the storage partition, so `electron/main.ts` migrates
before creating any window. The rules are blunt on purpose:

- Copy a key **only if the destination does not already have it**. The new origin
  may already hold newer data; overwriting would destroy it.
- A missing or unreadable source is a no-op, never an error.
- The source is never deleted. A failed migration stays recoverable by hand.

The write has to happen **before the studio window boots**, because the app
persists first-run defaults (it seeds the starter favourites) and would otherwise
claim exactly the keys the migration needs to fill. Hence a hidden same-origin
document at `app://crshhx/__storage-probe.html`, which serves no script and
renders nothing.

**The one assumption that could not be verified:** reading the legacy data relies
on Chromium keying `file://` `localStorage` to the scheme rather than to the full
file path, so a throwaway file in the temp directory can see what older builds
wrote. If that is wrong on some platform, the migration finds nothing and behaves
as a fresh install — data is not lost, it simply is not carried across. If that
ever bites, the recovery is to launch an older build once and re-export via the
preset manager.

## Content Security Policy

`electron/services/contentSecurity.ts`, applied to every response through
`session.defaultSession.webRequest.onHeadersReceived`.

Production forbids inline and evaluated script — the guarantee that makes the
policy worth having. `style-src` keeps `'unsafe-inline'` **because it must**:
React sets inline `style` attributes throughout the studio and `overlay.html`
carries an inline `<style>` block; inline style attributes cannot be allowed by
hash or nonce. Fonts are `'self'` only, because they are bundled.

Development is deliberately laxer (Vite injects an inline react-refresh preamble
and opens an HMR websocket) and a test asserts the difference in both directions.

Two things to check on the first real run, because neither is verifiable here:
whether the export download (`blob:` URL anchor click) works under the production
policy, and whether `executeJavaScript` used by the migration probe is unaffected
by the page CSP (it should be — it is a privileged call, not page script).

## What ships, and what does not

`electron-builder.yml` includes only `dist/**`, `dist-electron/**` and
`package.json`. Source, tests and docs do not end up in front of users.

`uiohook-napi` is unpacked from the asar: a `.node` binary cannot be loaded from
inside an archive. It is **not** rebuilt (`npmRebuild: false`) because the npm
tarball ships N-API prebuilds that load under Electron's ABI; a source build
would need a C toolchain and X11 headers that a packaging machine has no reason
to carry.

`deleteAppDataOnUninstall` is pinned to `false`. Uninstalling the application must
not destroy the user's library, which lives in the roaming application-data
directory — deliberately outside the install directory, and pinned there by
`app.setPath('userData', …)` in `main.ts` so that a portable exe keeps its data
when moved.

## Known limitations of builds produced on Linux

A Windows build made from Linux cannot run `rcedit`, the tool that stamps the
executable's icon and version metadata — it is a Windows binary and needs Wine.
Such a build produces a working installer whose *shortcuts and installer chrome*
carry the icon, while the `.exe` itself shows a generic one. Build on Windows (or
in CI with Wine) to get a stamped executable. `signAndEditExecutable` is left at
its default so a proper Windows build does the full job.

## Not done, deliberately

- **No code signing.** There is no certificate and none was purchased. Expect
  SmartScreen warnings on an unsigned build; that is a business decision, not a
  build-config one.
- **No auto-update.** `publish: null`. There is no update backend, and a half
  wired one is worse than none.
- **No licence.** `package.json` says `UNLICENSED`, which grants nobody any
  rights. The repository ships no licence file; choosing one is the owner's
  legal decision and should happen before anything is sold or distributed.
- **No macOS or Linux targets.** The overlay, foreground detection and input
  behaviour are written against Windows and verified nowhere else. Adding a
  target that has never run would be shipping a guess.

## Separate investigation: replacing the global input hook

Recorded here because it was raised during packaging and is **not** part of this
work.

The weapon-slot feature observes key presses through `uiohook-napi`, which
installs a **global low-level OS input hook**. That is the mechanism that makes
"press `2` for your AR crosshair while the game keeps the keypress" possible —
Electron's `globalShortcut` alternative *captures* the key, which is why bare
number keys are refused on that transport.

It is also the riskiest mechanism in the product. A global hook is precisely the
shape that kernel-level anti-cheat scrutinises, and the leading commercial
competitor in this space advertises "no hooks, no injection" as a feature while
documenting "keybinds don't work in-game" as a known limitation — i.e. crshhx's
differentiator is the competitor's avoided risk, and vice versa.

A candidate replacement is Windows **Raw Input** (`RegisterRawInputDevices` with
`RIDEV_INPUTSINK`), which can observe input without consuming it and without a
`WH_KEYBOARD_LL` hook. It would need:

- a spike proving bare digit keys still reach the game while the studio observes
  them, in at least one DirectX and one Vulkan title, windowed and exclusive
  fullscreen;
- confirmation that mouse side buttons and wheel directions arrive with the same
  semantics the current transport promises;
- a decision on what happens when the game runs with elevated privileges, where
  Raw Input from a non-elevated process may be filtered;
- the same fail-closed degradation the current transport implements when the
  mechanism is unavailable.

Until that spike exists, the current hook stays, and nothing in the product or
its documentation claims it is safe with any particular anti-cheat.

## Lightweight optimisation — what was measured and what changed

All figures below are **measured** on this repository's build output unless
labelled otherwise.

| Change | Measured effect |
| --- | --- |
| Dropped legacy `.woff` fallbacks from the bundled fonts (`vite/fontFallbacks.ts`) | Renderer bundle 1,480,430 → 958,545 bytes (**−521,885**, −35%). The fallbacks existed for browsers this app cannot run in; Chromium has used woff2 throughout. |
| Moved `react`, `react-dom`, `clsx`, `lucide-react`, `tailwind-merge` from dependencies to devDependencies | They are tree-shaken into `dist` by Vite; as runtime dependencies electron-builder copied ~57 MB of source into every install. App payload in the asar is now ≈1.27 MB (dist 958,545 + dist-electron 162,086 + win32-x64 hook 173,116 + manifest). |
| Pruned uiohook-napi prebuilds for darwin/linux/win-arm64/win-ia32 | ~950 KB per download and install. The module degrades to the accelerator transport if its binary is absent, so a wrong prune costs a feature, not a crash. |
| Studio window left at Chromium's default throttling | The studio has no work that must continue while a game is in front; an unfocused studio no longer runs timers and compositing at full rate. The overlay keeps `backgroundThrottling: false`, which it genuinely needs. |
| Storage migration now runs at most once per install, through one reused probe window | First launch unchanged; every later launch skips two hidden windows and two storage probes for the cost of one `stat()`. A failed attempt writes no marker, so it retries. |
| Removed 12 unused imports/locals; underscored one unused parameter | The renderer typecheck is now clean with **zero** errors, so CI runs it unfiltered instead of grepping known failures away. |

### Declined, with reasons

- **Splitting the overlay's CSS.** The overlay carries ~37 KB of Tailwind preflight
  and utilities it does not use. Replacing it with hand-written rules would save
  that, but the overlay is the one surface where a pixel-level regression is
  unacceptable, and the saving is 2% of the payload. Not worth the risk.
- **Lazy-loading the vault or the preset manager.** `App.tsx` builds the preset
  index at startup because weapon-slot switching resolves presets by id from it.
  Deferring the vault would delay a safety-critical path to save tens of
  milliseconds of first paint. The brief forbids that trade explicitly.
- **Re-splitting the renderer chunks.** The 258-preset vault is *not* in the chunk
  the overlay loads (an earlier suspicion, disproved by inspecting the built
  output: the only `novelty-` string in the shared chunk is a category matcher).
  The overlay pulls React plus the renderer, which it needs.

### What remains inherently large

Electron itself. The runtime is on the order of a few hundred megabytes unpacked
and tens of megabytes compressed; **this is an estimate**, not a measurement,
because the sandbox cannot download the Windows distribution. The application's
own contribution to that is the ≈1.27 MB measured above. Anyone evaluating
"lightweight" should compare that 1.27 MB, not the runtime, against alternatives.

## The Windows-native packaging workflow

`.github/workflows/windows-release.yml` builds both artifacts on a Windows
runner: a `quality` job (tests, both typechecks unfiltered, production build)
gates a `package` job that runs `electron-builder --win`, prints measured sizes
and SHA-256 hashes for the installer and the portable exe, and uploads both.

It exists because that is the only environment where the toolchain downloads
natively *and* `rcedit` can stamp the executable. Run it with **Actions →
windows-release → Run workflow**, or push a `v*` tag.

To build on a Windows machine directly:

```bash
npm ci
npm run build
npm run dist:win
```

Artifacts land in `release/`. No environment variables, no CA workarounds and no
mirrors are needed outside the restricted sandbox.
