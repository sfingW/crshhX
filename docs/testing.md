# Testing — Weapon Slot Crosshairs

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

**520 tests, 10 files, all passing** (`Test Files 10 passed (10)`, `Tests 520 passed (520)`).
Run on Linux (x64), Node 20, in a sandbox without an Electron binary and without a display
server. Nothing was skipped, and no existing test was removed or weakened to get there.

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
| `buildLayout.test.ts` | 14 | Build-layout integrity, native-dependency safety |

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

## Bugs found by the tests

Eleven real defects were caught and fixed during development. They are recorded here
because every one of them would have shipped. #6, #10 and #11 were found by the jsdom
component suite — that is, by executing the React layer for the first time — which is why
it exists.

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

### Pre-existing condition of the repository

The renderer had **21 pre-existing `tsc` errors** (all `TS6133`, unused imports) in files
this feature does not need to touch: `CodeImportExport.tsx`, `LivePreview.tsx`,
`ProPresetsModal.tsx`, `TopNav.tsx`, `ShareImportModal.tsx`, `DesignerTabbedView.tsx`,
`PositionView.tsx`, `crosshairCollection.ts`.

These were **left alone deliberately** — removing them would mean editing eight unrelated
files, which is outside the scope of this feature and risks conflicting with other work.
`npm run build` is unaffected because Vite does not typecheck. The files this feature
added or rewrote are all **error-free**, and the count went *down* from 32 to 21 because
unused imports in `Sidebar.tsx`, `TopHeader.tsx`, `KeybindsView.tsx` and `App.tsx` were
cleaned up as part of editing them.

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
