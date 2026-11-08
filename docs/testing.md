# Testing — crshhx

Covers three bodies of work: **Weapon Slot Crosshairs**, the **advanced crosshair
editor**, and the **preset manager with file import/export**. The architecture of
the latter two is in [`preset-system.md`](preset-system.md).

## Running the suite

```bash
npm test              # vitest run — full suite, once
npm run test:watch    # watch mode
npm run test:coverage # with coverage
```

No Electron binary is required. The suite runs under Node and jsdom, with `electron`
aliased to a recording stub (`tests/mocks/electron.ts`) so main-process behaviour can be
asserted without launching a window.

```bash
npm run typecheck:main   # tsc -p tsconfig.node.json --noEmit
npm run build            # vite build (renderer) + tsc (main process)
```

---

## Current results

**1061 tests, 20 files, all passing** (`Test Files 20 passed (20)`, `Tests 1061 passed (1061)`).
Run on Linux (x64), Node 20, in a sandbox without an Electron binary and without a display
server. Nothing was skipped. One test was deliberately **rewritten** — `exportPresets` used
to be asserted to normalise values on the way out, and that behaviour was reversed for a
reason recorded as defect #19 below; the test now asserts the new contract and says why.
Five more were **replaced** when the migration stopped evaluating generated JavaScript: the
tests that `eval`'d `dumpScript`/`injectScript` now execute the real probe preload through a
stubbed IPC channel against the same real `localStorage`, which is strictly stronger — the
code under test is the code that ships. No other existing test was removed or weakened.

The same commit was also verified on GitHub's own runners: the `quality` job of
`windows-release.yml` ran green for pull request #1 (run 42496448453, 44 s, `npm ci` →
1061 tests → both typechecks → production build), so the suite is not only passing in this
sandbox. The Windows `package` job was **skipped** for that pull request by design and has
still never run anywhere.

| File | Tests | Covers |
| --- | --- | --- |
| `weaponSlots.switching.test.ts` | 40 | `decideSwitch` rejection chain, profile selection, foreground gating, fail-closed behaviour |
| `weaponSlots.repeatGuard.test.ts` | 21 | Key-repeat suppression, hold behaviour, wheel/key debounce, `reset()` |
| `weaponSlots.bindingRules.test.ts` | 52 | Conflicts, reserved keys, transport gating, bare-key policy, **deleted presets** |
| `weaponSlots.config.test.ts` | 62 | Slot/profile CRUD, guard rails, immutability, renumbering, **creating a profile selects it** |
| `weaponSlots.profiles.test.ts` | 31 | Profile templates, duplication, deletion, process association, default-profile protection |
| `weaponSlots.presets.test.ts` | 24 | `PresetIndex` construction, resolution, pruning, corrupt-source tolerance |
| `weaponSlots.persistence.test.ts` | 49 | Serialisation, migration, normalisation idempotency, existing-keys preservation |
| `weaponSlots.integration.test.ts` | 75 | End-to-end through the real service: transport → policy → overlay channel → status |
| `weaponSlots.ui.test.tsx` | 152 | Real React components in jsdom: table, recorder, picker, **profile bar / game associations**, indicator, Keybinds page, IPC-robustness, write-isolation |
| `buildLayout.test.ts` | 41 | Build-layout integrity, production renderer loading, packaging configuration guards, storage-key completeness, native-dependency safety, the **single marker write site**, the absence of any `executeJavaScript` call, and the release workflow's triggers and permissions |
| `productionRuntime.test.ts` | 54 | The `app://crshhx` asset resolver and its traversal guard, content types, the CSP in both modes, the **probe preload executed against a real localStorage**, every branch of `decideMigration`, and `settleProbe` for success, rejection, timeout and timer cleanup |
| `crosshairSchema.test.ts` | 45 | Schema v2 normalisation, idempotency, clamping and repairs, arm geometry, rotation/scale resolution, tolerance of junk input |
| `colorUtils.test.ts` | 58 | Colour parsing and canonicalisation, contrast ratios and verdicts, readable text colour, compositing, colour naming, swatch push |
| `configDiff.test.ts` | 15 | A/B difference rows, grouping, ignored identity fields, asymmetric-vs-symmetric equivalence |
| `renderer.test.tsx` | 39 | `ReticleRenderer` output for every topology, per-arm geometry, rotation, scale, inner outline, ring |
| `editor.ui.test.tsx` | 86 | Designer in jsdom: undo/redo, number and colour controls, arm geometry panel, compare panel, reset dialog, keyboard shortcuts |
| `crosshairsView.test.tsx` | 27 | Vault categories, sub-tabs, favourites seeding and persistence, empty states, card interaction |
| `presetOrganizer.test.ts` | 77 | Folders, favourites, descriptions, timestamps, search, sort, counts, normalisation, the storage sidecar and the **favourites migration** |
| `presetTransfer.test.ts` | 68 | Envelope build/parse, refusal cases, version handling, import planning and defaults, **id allocation across a whole file**, apply, round-trips |
| `presetManager.ui.test.tsx` | 45 | Preset manager in jsdom: listing, built-in protections, folder CRUD and its confirmations, search/sort, and the **import preview modal** including its overwrite, skip and large-import gates |

---

## What is covered

### Configuration
- Slot table columns and per-row controls render for every slot.
- Add, remove, rename, reorder, enable/disable — each asserted to change **only** the
  intended part of the state.
- Not limited to five slots: up to `MAX_SLOTS_PER_PROFILE` (24), with the limit enforced
  in the UI and the store.
- Blank and over-long names are refused with an explanation; accepted names are trimmed.
- Restore defaults resets the current profile only, after confirmation, and keeps other
  profiles and unrelated settings.
- Unassigned slots are clearly shown and the documented no-op behaviour is stated in the UI.
- Invalid and conflicting bindings are flagged with a warning marker and counted.

### Switching
- The full ordered rejection chain, one test per reason.
- Unassigned and missing-preset slots leave the displayed crosshair **unchanged** and
  never substitute another preset.
- Modifier matching is non-strict, with exact-modifier preference over subset.
- A 2-second hold delivered as 66 key-down events at 30 ms triggers **exactly once**.
- Key-up never triggers and clears the held entry; explicit `isRepeat` is honoured.
- Wheel debounced at 90 ms, keys at 40 ms; `reset()` clears both held keys and debounce
  history.
- Recording suspends switching so binding `1` cannot also fire slot `1`.
- A restricted profile **fails closed** when foreground tracking is unavailable, and the
  message tells the user how to proceed.

### Persistence
- Round-trip serialisation for every field.
- Migration of a pre-profiles (v0) flat slot array, with a recorded repair note.
- Legacy string bindings (`'1'`, `'F10'`, `'num1'`, `'q'`, `'Alt+1'`, `'Ctrl+Alt+Q'`,
  `'Shift+Alt+Ctrl+1'`) parsed; ambiguous input (`''`, `'NotAKey'`, `'Alt-'`, `'1+2'`,
  `null`, `undefined`) returns `null` rather than guessing.
- Newer schema versions load without discarding understood fields.
- Normalisation is idempotent and always yields exactly one default profile, contiguous
  indices, ≤24 slots and ≤48-character names.
- Accepts either an object **or** a JSON string.
- Existing storage keys are preserved **byte for byte**.
- Corrupt runtime records do not take down the app.
- Repairs are surfaced in the UI and can be dismissed.

### Preset references
- Slots store a stable **identifier**; renaming a preset cannot break a slot, and the
  stored name is asserted absent from the serialised slot.
- Deleting a preset makes the slot visibly invalid, counts it as not ready, and leaves
  the reference in place so the slot recovers if the preset returns.
- `buildPresetIndex` tolerates non-array sources and malformed entries instead of
  throwing.

### Integration (through the real service)
- The overlay receives `crosshair-updated` through the **existing** pathway.
- The host surface is exactly `getOverlayWindow` / `getStudioWindow` / `isOverlayVisible`
  / `sendToOverlay` / `sendToStudio` — window creation is impossible, and
  `overlayWindowCreations === 0`.
- The transport is started once and never restarted per switch.
- Indicator payloads track successive switches and survive a renderer reload via
  `restoreActiveSlot`.
- Ignored triggers are explainable and cleared after a successful switch.
- Unrelated keys stay silent.
- Configuration changes (assign, rebind, disable, add slot, switch profile) take effect
  immediately.
- Foreground-driven selection follows the app and enforces per-profile restriction.
- `dispose()` is idempotent and survives a throwing transport.
- `AcceleratorTransport` registers only expressible non-bare bindings, diffs out stale
  ones, tolerates OS refusal, and **never** calls `globalShortcut.unregisterAll()`
  (asserted: `unregisterAllCalls === 0`, so the existing `F10`/`F9` survive).
- The key-press path performs **zero `localStorage` writes**.
- The shipped five-slot default configuration switches five distinct reticles.

### UI (jsdom + Testing Library, real components)
- Key recording: click → *Press a key…* → press → committed; Escape cancels; modifier-only
  presses are ignored; `preventDefault` stops the key activating a control; unmounting
  mid-capture resumes switching; mouse side/middle buttons and wheel directions record on
  the passive transport and are ignored on the fallback; left and right click are never
  offered.
- Crosshair picker: opens from the cell, lists the existing library, marks the preset in
  use, assigns **by identifier**, changes only the targeted slot, offers no create/save
  path, closes on select and on dismiss, and filters by search.
- Transport banner: reports the passive hook positively; warns in amber with the reason on
  fallback; surfaces a transport warning verbatim; lists mouse, wheel and controller
  support honestly; does not guess before the first status arrives.
- Conflict explanations quoted verbatim: duplicate (naming the other slot), reserved by
  crshhx, plain-typing-key on the fallback, mouse/wheel without the hook, unbound.
- Cross-profile key reuse is explicitly **not** flagged.
- Active-slot indicator reads `Active slot: 2 — AR`, `Slots off`, `No slot active`, and
  exposes profile, transport and last-ignore detail in its tooltip.
- Last-ignore explanation in the table footer, with a reason-code fallback.
- Feature framing: asserts the UI never claims automatic weapon recognition.
- Profile bar (game-specific configuration): one tab per profile, the shipped default is
  badged and cannot be deleted, the active profile's table is the one shown, a game icon
  appears on a profile associated with an executable, and the association editor states
  that crshhx compares ordinary foreground-window names and *never reads game memory or
  injects anything*.
- Profile actions: selecting a tab, adding the blank/Fortnite/CS2 templates (each new
  profile is **selected**, with fresh slot ids that cannot collide), renaming with a
  duplicate name refused and explained, duplicating, deleting with fallback to the
  default, saving trimmed de-duplicated executable names, cancelling without saving, and
  the strict foreground restriction with its fail-closed explanation.
- Foreground readout honesty: says `foreground tracking unavailable` rather than guessing,
  names the app and the profile it selected, hides itself while auto-select is off, and
  badges the profile the main process is *really* using as `LIVE` when that disagrees with
  the manually selected tab.
- The master switch governs **switching, not configuration**: rows dim and the page states
  that no key will do anything yet, but every control stays usable so a first-time user can
  set the table up before enabling. (This replaced an earlier design that locked the whole
  table; the change is asserted by test, including the dimming and the explanatory tooltip.)
- IPC robustness: renders when `activeSlot` arrives as `null`, when the transport
  description is missing, and when `lastIgnore` has no detail string.
- Write isolation: the view renders with **no Electron bridge at all**, writes no storage
  key of its own, and leaves `crshhx_app_settings` and `crshhx_custom_presets` byte-for-byte
  intact through add/remove/rename/master-switch operations. Every change is handed to the
  parent instead of being applied locally.
- Keybinds & ADS page: the old decorative mock is gone, the overlay-toggle recorder works
  and persists an accelerator string, cannot be unbound, warns on collisions and on plain
  typing keys, and links to the real feature with live status.

### Build integrity
- `package.json` `main` matches where `tsc` actually emits `electron/main.ts`.
- The compiled main process resolves the renderer bundle to Vite's `dist` — **not** to a
  path inside its own output directory. This is a real regression class: getting it wrong
  passes every typecheck and does not break `npm run dev`, but silently breaks the
  packaged app.
- The shared core is included in the node tsconfig and imports no `electron`, `react` or
  `child_process`.
- `uiohook-napi` is an **optional** dependency, loaded behind a `try/catch`, and the
  source is statically asserted never to call `keyTap`/`keyToggle`.

---

### Crosshair schema and rendering

- Normalisation is **idempotent** — running it twice changes nothing the second time.
- It is **visually neutral for v1 configs**: a config with no v2 fields renders exactly as
  it did before the schema existed. This is asserted against the shipped library, not just
  against hand-made fixtures.
- It **never throws and never refuses**. Junk input, wrong types, missing keys, negative
  and infinite numbers all come back as a usable config plus repair lines.
- Every clamped value is reported with the context that produced it, so a repair says
  which crosshair it came from.
- Arm geometry resolves to global values while `asymmetricArms` is off, and per-direction
  values while it is on, with overrides preserved across the toggle.
- `effectiveScale` refuses 0 and NaN; `effectiveRotation` and the stretch ratio are covered.
- `ReticleRenderer` output is asserted per topology, including that the ring stays outside
  the rotation transform and that the inner outline disappears when it would be inverted.

### Colours and config diffing

- `parseColorInput` accepts `#rrggbb`, `rrggbb`, `#rgb`, `rgb()` and `rgba()` in any case
  and canonicalises to lower-case `#rrggbb`; it **rejects CSS colour names** rather than
  guessing one.
- `contrastRatio` returns the **minimum** ratio for a colour it cannot parse — defect #12.
- Verdict boundaries are pinned at 7 / 4.5 / 3 / 1.8.
- `diffConfigs` ignores identity fields (`id`, `name`, `game`), groups rows, and treats an
  asymmetric config that matches its symmetric equivalent as **no difference**.

### Editor UI (jsdom, real components)

- Undo/redo depth, coalescing of rapid changes, and that a parent re-render passing an
  equal config does **not** wipe the stack — defect #15.
- Disabled controls are disabled for real: both the number input and the slider refuse
  input, not just visually — defect #16.
- Keyboard shortcuts (`Ctrl+Z`, `Ctrl+Shift+Z`, `Ctrl+Y`) fire, and are suppressed while
  typing in an input, textarea or contentEditable.
- Reset goes through an inline confirmation, preserves identity fields, and clears every
  field the baseline declares — defect #17.
- The compare panel pins A, shows grouped differences, and "Revert to A" feeds the change
  through the same history handler as typing does.

### Preset organisation and its storage

- Folder create/rename/delete, including that **delete moves presets out and never deletes
  them**, that refusals return the identical state object, and that a duplicate name is
  suffixed from the existing folder's casing — defect #14.
- `entryFor` returns defaults without persisting, so listing 258 built-ins writes nothing.
- Search is substring-based across every indexed field, with a test pinning that a term
  matching the indexed `game` field really does match.
- Sort always puts favourites first, puts `lastUsedAt: null` last under `recent`, breaks
  ties by name and does not mutate.
- `markUsed` leaves `modifiedAt` alone; `markModified` preserves `createdAt`.
- The storage sidecar round-trips, recovers from a corrupt blob with a repair line that
  says the crosshairs are untouched, and normalises a hand-edited file.
- **The favourites migration**: legacy ids move into the sidecar, the old key is deleted,
  the migration cannot run twice, an unreadable legacy list does not damage the library,
  favourites already in the library survive, and a user who chose to have none is never
  re-seeded — defect #20.

### Import / export transfer

- Parse refuses non-JSON, a non-object root, a missing or foreign `format`, a
  non-numeric version, and a **version this build does not support** — refused outright
  rather than half-applied.
- Notes (not failures) for a different `appVersion`, a newer `crosshairSchema`, and a
  configuration file with no presets.
- Planning defaults are asserted one by one: id collision → keep both, name collision →
  keep both, repeated id in the file → the later one skipped, settings listed but not
  applied, weapon slots opt-in.
- **Id allocation across a whole file** — defect #18 — with a case that would have lost a
  crosshair, and an assertion that all three incoming ids survive.
- Export writes values **as the user has them**, and the round-trip proves the importer
  then repairs and reports them — defect #19.
- `applyImport` never mutates its inputs, creates folders by name reusing an existing
  folder case-insensitively, and replaces a vanished overwrite target by adding it
  instead, with a note.

### Preset manager and import preview UI (jsdom)

- Built-ins cannot be renamed or deleted, the disabled controls carry the reason, and
  duplicating is offered as the way to edit one.
- Deleting a crosshair names the weapon-slot profiles that point at it; deleting a folder
  promises the crosshairs survive.
- Folder CRUD goes through a dialog that keeps what the user typed and shows the refusal
  reason inline rather than discarding the input.
- Search, sort and every empty state, including that an empty state quotes the term.
- The import preview: counts before anything is written, per-entry Keep both / Replace
  mine / Do not import, the resulting button label, the settings difference rows, the
  weapon-slot opt-in, the per-crosshair repair list, and that a large import is
  **blocked until explicitly acknowledged**.
- A parse error shows "nothing was changed" and offers no import button at all.

### Production runtime and packaging

- The URL → path resolver serves the studio at the bare origin, maps every asset to
  its correct content type, strips query strings, and labels unknown extensions as
  octet-stream rather than guessing.
- The traversal guard. Plain `..` walks are collapsed by the URL parser before the
  handler ever sees them, so the test pins what the guard *actually* defends
  against: **percent-encoded** traversal, plus NUL bytes and bad percent-encoding.
  Other schemes and other hosts are refused rather than guessed at.
- Both renderer layouts resolve to the real Vite output: packaged
  (`appPath/dist`) and unpackaged (`dist-electron/electron` → `../../dist`), so
  the relationship defect #9 got wrong once cannot quietly return.
- The production CSP forbids inline and evaluated script, and a helper asserts
  that property so loosening `script-src` later fails loudly. The same helper
  asserts development *is* laxer, so nobody "fixes" Vite by tightening dev.
- `style-src 'unsafe-inline'` is asserted with a comment, because it looks like a
  weakness and is in fact required by React inline style attributes.
- The probe preload is **executed**, not just parsed: it is imported with
  `electron` stubbed and its IPC listener is driven against a primed
  `localStorage`. A dump returns exactly crshhx's keys and no foreign ones; a
  write stores only absent keys and reports which; an origin that throws on read
  answers with an `error` rather than an empty result, and a refused write does
  the same instead of claiming it copied nothing. A 200 KB value containing
  quotes, newlines and a literal `</script>` round-trips intact, and an unknown
  operation is answered with an error rather than silence.
- Every branch of `decideMigration`, the only thing that may authorise the
  completion marker: keys copied, **nothing to copy** (defect #21), the current
  origin already superseded the old one, the source probe timed out, the
  destination probe threw, the probe document reported an error, the copy never
  confirmed, and a destination that moved mid-copy. `settleProbe` is covered for
  success, rejection and timeout, and is asserted to clear its timer either way —
  a timer left pending behind startup is the kind of thing nobody notices.
- The release workflow is read as data: it builds on a Windows runner, gates
  packaging behind the quality job, gives a pull request the gate but not the
  Windows job, reports SHA-256 hashes, fails if no executable was produced, signs
  and publishes nothing, and asks for `contents: read` and no write scope.
- Planning rules: copy only what the destination lacks, never overwrite, no-op for
  a fresh install, and `crshhx_theme_accent` — the key most likely to be forgotten
  — is pinned by name.
- Packaging guards read `electron-builder.yml` as data: both Windows targets and
  no unverified platform, `asarUnpack` for the native hook, `npmRebuild: false`,
  `deleteAppDataOnUninstall: false`, `publish: null`, a real `.ico` with the ICO
  magic number, and the metadata the installer requires.
- The migrated-key list is re-derived by walking every `.ts`/`.tsx` under `src/`
  and `electron/` and comparing to `MIGRATED_STORAGE_KEYS`, so a newly persisted
  key cannot be added without also being migrated.

---

## Bugs found by the tests

**Twenty-one** real defects were caught and fixed during development. They are recorded here
because every one of them would have shipped. #6, #10 and #11 were found by the jsdom
component suite — that is, by executing the React layer for the first time — which is why
it exists. #12–#20 came from the editor and preset work; #18 and #20 were found by tests
written against the UI rather than the library, which is the same lesson again. #21 was
found by **reviewing the branch**, not by any test — and a static assertion in this very
suite had looked straight at it and passed, which is its own lesson: asserting that a string
appears somewhere in a file says nothing about whether the line containing it is reachable.

**Read the implementation before asserting its contract.** Of the twenty-one, five were the
*test* being wrong rather than the code (#14's cousins, the `allocateId` renumbering
expectations, the `searchViews` one-character-query case, the `add`-vs-`add-with-new-id`
count, and a helper that silently dropped its third argument). A failing assertion is a
question, not a verdict: decide which side is wrong before changing either.

| # | Defect | Impact if shipped |
| --- | --- | --- |
| 1 | `decideSwitch` and `isForegroundAllowed` disagreed on fail-open vs fail-closed for a restricted profile when foreground tracking is unavailable. | A profile marked "only in this game" could have fired in *every* app whenever tracking blipped. Consolidated into one helper that **fails closed**. |
| 2 | Slot-level store operations on a non-existent `slotId` returned `ok(state)` while doing nothing — and `setSlotBinding` still ran its "steal this key from other slots" pass. | **Silent data loss**: a stale slot id could clear another slot's binding. Fixed with `requireSlot()` guards on every slot operation. |
| 3 | `normalizeState` returned factory defaults when handed a serialised JSON **string**. | Any caller that skipped `JSON.parse` would wipe the user's entire slot configuration on load. Now parses strings itself; `deserializeState` delegates. |
| 4 | `buildPresetIndex` threw `TypeError: source is not iterable` on a corrupt preset source. | The whole settings UI would fail to mount. Now skips non-array sources and non-object entries. |
| 5 | `WeaponSlotSwitchService.currentProfile()` read `state.activeProfileId` instead of resolving through `selectProfile`. | With foreground auto-selection on, the status bar and the `weapon-slot-switched` payload named the **manually selected** profile while a game profile was actually applied — the indicator would contradict reality. |
| 6 | `validateState` reported `canSwitch: true` for a slot whose preset had been **deleted** (it only checked that an id was present). | The header would claim `5/5 ready` while one slot could never fire, and the row would show no warning. Now takes an optional `knownPresetIds` set and reports a blocking `preset-missing`. |
| 7 | `KeyCaptureButton` only displayed `typing-critical` notices. | An unbound slot showed **no explanation at all** under its key field. Now surfaces any non-blocking key-related notice. |
| 8 | `reservedBindingsFromSettings` reserved `AppSettings.centerLockHotkey` (`F8`), which no part of crshhx registers or handles. | A slot bound to `F8` would have been refused with the message *"F8 is reserved by crshhx for another function"* — which was simply untrue, and cost the user a perfectly usable key. Now only the two hotkeys `registerHotkeys()` actually registers are reserved. |
| 9 | Changing the main-process output layout (`dist-electron/main.js` → `dist-electron/electron/main.js`) left `loadFile('../dist/index.html')` pointing inside the compiled output directory. | The **packaged** app would open blank studio and overlay windows. Dev mode would keep working, so it could easily go unnoticed. Fixed with a single derived `RENDERER_DIST`, now pinned by `buildLayout.test.ts`. |
| 10 | `WeaponSlotsView` read `status?.activeSlot.slotId`. Optional chaining guards `status`, **not** the member after it, and `activeSlot` is an object whose *fields* are nullable. | The whole Weapon Slots page threw `Cannot read properties of null` and white-screened any time no slot had been triggered yet — i.e. on first open. Found by the component suite. Now `status?.activeSlot?.slotId`, with a test that feeds a deliberately malformed IPC payload. |
| 11 | `validateBinding` trusted the binding's derived `kind` field to decide whether a mouse or wheel input was gated by transport capability. | A binding carrying a missing or stale `kind` — hand-assembled, or written by an older build — slipped past the capability gate and was reported as switchable while being permanently dead on the fallback transport. `kind` is now recomputed from `code` with `kindOfCode`. |
| 12 | `contrastRatio` returned **21:1** — the maximum possible — for a colour it could not parse. | The contrast verdict, which exists to warn that a reticle will be invisible, reported "Excellent" for garbage input. An unparseable colour now yields the minimum ratio, 1. |
| 13 | `parseColorInput` rejected **upper-case** hex. | `#FF0000` pasted from a game code or another tool was refused as invalid while `#ff0000` worked, so the colour field appeared to malfunction at random. |
| 14 | A duplicate folder name was suffixed using the casing the user **typed**, not the casing of the folder it collided with. | Typing `rifles` when `Rifles` existed produced a second folder called `rifles (2)` — two folders differing only by case, which the case-insensitive collision check would then treat as duplicates forever. `normalizeLibrary` now keeps a map of lower-case name → first spelling. |
| 15 | `useConfigHistory` compared the incoming config **by identity** and reset the undo stack when it differed. | Any parent re-render that passed an equal-but-not-identical config object wiped the user's entire undo history mid-edit. Now an `acknowledged` ref is compared by value. |
| 16 | `NumberControl` was disabled **visually only** (`opacity-45 pointer-events-none` on a wrapper). | A control that looked disabled still accepted keyboard input and still fired `onChange`, so a user could move a value on a parameter that was supposed to be inactive. Both inputs now carry a real `disabled` attribute. |
| 17 | Reset-to-defaults merged over `DEFAULT_CONFIG`, which omitted keys it should have cleared. | A merge can never remove a key the baseline does not mention, so "reset" left several parameters at whatever the user had set. Any reset baseline must now declare every field it is meant to clear. |
| 18 | `allocateId` walked replacement ids against the ids claimed *so far* in a file, not against every id the file would want. | Entry 1 colliding with a local id could be renumbered onto the id entry 2 legitimately wanted; entry 2 was then reported as an in-file duplicate and **skipped**. An import silently lost a crosshair the user never chose to lose, and the preview said "skipped" as though it were expected. Every id in the file is now reserved before any allocation, with a separate set doing the genuine-duplicate check. |
| 19 | `buildEnvelope` normalised crosshair values **on the way out**, so an out-of-range local value was repaired on export and again on import. | The exported file silently disagreed with the user's own library, and because the importer saw a clean value it reported **no** repair — the correction was invisible to everyone. Export now writes values as the user has them and the importer is the single validator. An existing test asserted the old behaviour and was rewritten. |
| 20 | Favourites had **two stores**: the vault read and wrote `crshhx_favorites` while the preset manager used `library.entries[id].favourite`. | Starring a crosshair in the vault did not make it a favourite in the manager, and the manager's next write silently un-starred it. Both views disagreed about the same idea, with no error anywhere. `loadFavoriteIds`/`saveFavoriteIds`/`toggleFavoriteId` now read and write the sidecar, the legacy key is migrated on first read and then deleted, and App re-reads the library on every view change. |
| 21 | `migrateStorageOrigin` wrote its completion marker only on the branch that copied keys; the empty-plan branch `return`ed before reaching it. | No distributed build ever used the `file://` origin, so *every* install hits the empty branch — meaning **every launch** rebuilt a hidden window, wrote a temp file and probed two origins before the overlay could appear, forever, and the docs claimed the opposite. Found in review, not by a test: the existing static assertion checked that `markerContents` appeared in the function body, which it did, on a line the empty path never reached. `decideMigration()` is now the only decision point, there is exactly one guarded marker write site, and both facts are pinned. |

---

## ⚠️ Windows verification was NOT performed

**No manual verification on Windows was carried out.** This work was done in a headless
Linux sandbox in which:

- the Electron binary could not be downloaded (postinstall TLS failure), so **the
  application was never launched**;
- `uiohook-napi` cannot load at all — it fails with `libXrandr.so.2: cannot open shared
  object file`, a headless-Linux/X11 limitation, not a code defect;
- there is no Windows, so `WindowsForegroundProvider` and its PowerShell worker were
  never executed;
- there is no display server, so no overlay, DPI, multi-monitor or fullscreen behaviour
  could be observed.

Everything below the "automated" line is therefore **implemented and unit/integration
tested, but unverified on real hardware**. Do not treat any of it as confirmed working.

### Items that are unverified

| Item | Risk | Why it cannot be verified here |
| --- | --- | --- |
| `PassiveHookTransport` with real `uiohook-napi` on Windows | **High** — the preferred transport has never executed | Native module cannot load on Linux |
| libuiohook mouse-button numbering (back/forward/middle) | **High** — the DOM→hook index table (`{1:3, 3:4, 4:5}`) is derived from documentation, not observation | No hardware |
| libuiohook wheel direction sign on Windows | Medium | No hardware |
| libuiohook keycodes for numpad, punctuation, `IntlBackslash` and media keys | Medium — the key table is from upstream documentation | No hardware |
| `WindowsForegroundProvider` and its persistent PowerShell worker | **High** — entirely unexecuted | No Windows, no PowerShell |
| Foreground process-name matching against real game executables | High | No Windows |
| `AcceleratorTransport` against the real Windows `RegisterHotKey` | Medium — tested only against a stub | No Electron binary |
| Whether bare `1`–`5` genuinely reach the game under the passive hook | **High** — this is the feature's central safety claim | No hardware, no game |
| Overlay update latency and behaviour under load in a real game | Medium | No display, no game |
| Exclusive-fullscreen / borderless interaction with the topmost overlay | Medium | No display |
| DPI scaling and per-monitor DPI changes | Medium | No display |
| Multi-monitor placement and `selectedMonitor` interaction | Medium | No display |
| Clean hook removal on real shutdown (`will-quit` ordering) | Medium — logic tested against a stub | No Electron binary |
| Existing `F10`/`F9` hotkeys still working alongside slot keys | Medium — asserted against a stub, not the OS | No Electron binary |
| Existing dynamic switching / designer → overlay flow unaffected | Low — pathway reused unchanged and asserted by test | No display |
| **All visual layout and rendering** — the editor, the preset manager, the import preview, the compare panel, every colour picker and backdrop | **High** — the jsdom suites assert structure, text, attributes and which handler fired with which argument; they cannot assert that any of it *looks* right | No display server |
| `downloadTextFile` against a real Electron window | Medium — the Blob-and-anchor path is standard, but where the file actually lands, and whether the anchor click is honoured at all, is untested here | No Electron binary |
| `pickAndReadTextFile` cancel handling on a real OS file dialog | Medium — cancellation is detected with a `window` focus fallback, which is a heuristic and may resolve `null` late or not at all on some platforms | No OS dialog |
| Reading a genuinely large export (near the 8 MiB ceiling) | Low — size is checked before parsing, but main-thread blocking during parse is unmeasured | No large real-world file |
| The favourites migration on a **real** user profile with an existing `crshhx_favorites` list | Medium — exercised with fixtures written directly to `localStorage`, not with a profile produced by an older build | No pre-existing user data |
| **The packaged application has never been launched** — no `.exe`, no installer, not even an unpacked app directory | **High** — everything in the packaging phase is configuration plus unit tests | The sandbox can reach `github.com` but not the release-asset CDN that serves the NSIS and code-sign toolchains; 36 consecutive download attempts failed |
| The `app://crshhx` protocol handler executing inside Electron (`protocol.handle`, `net.fetch` through the asar, the `fs` fallback) | **High** — the resolver logic is unit tested against the real built bundle, but the Electron wiring has never run | No Electron binary in the sandbox |
| The storage migration running against a genuine `file://` profile, and the probe preload answering over IPC from inside a sandboxed hidden window | **High** — rests on Chromium keying `file://` localStorage to the scheme rather than the full path, and on a sandboxed preload reaching `localStorage` on both origins. If either is wrong it degrades to a fresh install, or to a retried migration, rather than to data loss. The first launch logs the origins the probe answered from, which is the check | Cannot launch Electron here |
| The Content Security Policy as observed by a real renderer: whether the export download (`blob:` anchor) works under it, and **whether `onHeadersReceived` is invoked at all for responses served by `protocol.handle`** | **High** for the second half — if that listener never fires for `app://`, the policy is inert for the production windows and must be delivered as a `<meta>` tag instead. Electron's typings do not say either way. The migration no longer depends on the answer | No Electron binary |
| Executable icon and version stamping (`rcedit`) | Low — a Linux-built Windows target cannot run it; the installer chrome still carries the icon | Requires Windows or Wine |
| The NSIS installer and the portable exe actually installing, launching, and keeping data after the portable exe is moved | **High** — the whole point of the packaging work | Artifacts could not be produced here |

### Pre-existing condition of the repository

The renderer had **21 pre-existing `tsc` errors** (all `TS6133`, unused imports) when the
weapon-slot work started, in files it did not need to touch: `CodeImportExport.tsx`,
`LivePreview.tsx`, `ProPresetsModal.tsx`, `TopNav.tsx`, `ShareImportModal.tsx`,
`DesignerTabbedView.tsx`, `PositionView.tsx`, `crosshairCollection.ts`.

Since then the situation has changed:

- `DesignerTabbedView.tsx` was **rewritten** as the editor shell and is now error-free.
- `LivePreview.tsx` was **deleted** — `PreviewStage` is the single place a crosshair is
  drawn in the designer.
- `CodeImportExport.tsx` was **deleted** — it had no importers anywhere in `src` or
  `tests`, and duplicated the code-paste role `ShareImportModal.tsx` actually fills.

That leaves five files with pre-existing unused-import errors: `ProPresetsModal.tsx`,
`TopNav.tsx`, `ShareImportModal.tsx`, `PositionView.tsx`, `crosshairCollection.ts`. They
are still **left alone deliberately** — none of them is on a path this work touches, and
`npm run build` is unaffected because Vite does not typecheck. Every file added or
rewritten by the editor and preset work is error-free, and the typecheck command used
during development filters exactly these five:

```bash
./node_modules/.bin/tsc -p tsconfig.json --noEmit 2>&1 \
  | grep -vE "ProPresetsModal|TopNav\.tsx|ShareImportModal|PositionView|crosshairCollection"
```

> **Grep for importers before extending any UI file.** Two components were worked on or
> left in place while nothing imported them. `grep -rn "ComponentName" src/ tests/` takes
> a second and has twice saved a wasted effort.

### Manual test checklist for Windows

Run these on a Windows machine with a real display. Tick each one; do not assume any of
them pass.

**Setup**
- [ ] `npm install` completes and `uiohook-napi` is present in `node_modules`.
- [ ] `npm run build` succeeds.
- [ ] `npm start` launches the Studio and the overlay.
- [ ] The Weapon Slots page shows `Input: Passive Input Hook` (not the amber fallback).
      If it shows the fallback, record the reason text and test the fallback path too.

**Configuration**
- [ ] **Weapon Slots** appears in the sidebar and the page opens.
- [ ] The master switch turns the feature on and off.
- [ ] The five shipped slots are listed with names, keys, previews and switches.
- [ ] Clicking a key field shows *Press a key…*; pressing a key assigns it.
- [ ] `Escape` cancels recording.
- [ ] A modifier combination (e.g. `Ctrl+Alt+Q`) records and displays correctly.
- [ ] Middle mouse button and both side buttons record, **and the label matches the
      physical button you pressed** (this is the numbering risk above).
- [ ] Wheel up and wheel down record with the correct directions.
- [ ] Assigning a key already used by another slot in the same profile shows the conflict
      message naming that slot.
- [ ] Assigning `F10` or `F9` shows the reserved-by-crshhx message.
- [ ] Assigning `F8` is **allowed** — crshhx declares that setting but never registers it.
- [ ] The crosshair picker opens, lists your library, and assigning updates the preview.
- [ ] `Add slot`, rename, reorder and `Remove slot` all work; `Restore defaults` asks
      first and restores the five shipped slots.
- [ ] Disabling a single slot leaves its key and crosshair in place.
- [ ] Configuration survives a full app restart.

**Switching in game**
- [ ] With the overlay visible, pressing each slot key changes the reticle immediately.
- [ ] **The game still receives the key** — your weapon actually swaps when you press the
      bound number key. This is the most important check in the list.
- [ ] Typing in another application is unaffected while the feature is on.
- [ ] Holding a slot key does not repeatedly switch or flicker.
- [ ] An unassigned slot's key changes nothing and the reticle stays as it was.
- [ ] A disabled slot's key changes nothing.
- [ ] The status-bar chip updates to `Active slot: N — Name`.
- [ ] The overlay does **not** blink, resize, re-create or reload on switch.
- [ ] Switching works in borderless and in exclusive fullscreen.
- [ ] Switching works on a secondary monitor and at non-100% DPI scaling.
- [ ] The reticle stays centred and square at 4:3 stretched after a switch.

**Coexistence and shutdown**
- [ ] `F10` still toggles the overlay; `F9` still cycles presets.
- [ ] Editing and saving a crosshair in the designer still updates the overlay.
- [ ] While a key field is recording, pressing that key does **not** also switch.
- [ ] Closing crshhx releases all hooks: after exit, no key feels intercepted and no
      stale registration remains.
- [ ] Task Manager shows the PowerShell worker only when foreground auto-select is on,
      and it disappears on exit.

**Foreground profiles**
- [ ] With auto-select on, focusing a matched process switches to its profile.
- [ ] Returning to the desktop returns to the Default profile.
- [ ] A profile set to *restrict to matched apps* stops switching when tracking is
      unavailable, and the UI explains why.
- [ ] With auto-select **off**, no polling process runs at all.

**Fallback transport** (force it by temporarily renaming `node_modules/uiohook-napi`)
- [ ] The banner turns amber, names the transport and gives a reason.
- [ ] Bare `1`–`5` are refused with the modifier-required explanation.
- [ ] Mouse and wheel bindings are refused with an explanation.
- [ ] `Ctrl`/`Alt` combinations do switch.
- [ ] `F10`/`F9` still work.
- [ ] Re-installing the hook restores the passive transport on next launch.

**Migration**
- [ ] An existing installation with saved presets, settings and a current crosshair keeps
      all of them after upgrading.
- [ ] Any repairs made on load are listed on the Weapon Slots page.
- [ ] *Packaged build, first launch:* the log carries
      `[crshhx] storage probe answered from <origin> and <origin>` with two real origins —
      `null` for the legacy `file://` document and `app://crshhx` for the new one.
      `undefined` means a probe never answered: nothing was touched, and the next launch
      retries.
- [ ] *Packaged build, second launch:* the log says the migration was skipped, and
      `%APPDATA%\Crshhx Crosshair Studio\storage-migration-v1.done` exists with a `report`
      worth quoting in a support request. This is defect #21's check — the marker must
      appear **even when there was nothing to migrate**, which is the normal case.
- [ ] *Packaged build:* DevTools → Network → `index.html` shows a
      `Content-Security-Policy` response header on the `app://crshhx` document. If it is
      absent, `onHeadersReceived` is not invoked for `protocol.handle` responses and the
      policy is inert for the production windows — see `docs/packaging.md`.
