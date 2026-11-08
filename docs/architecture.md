# Weapon Slot Crosshairs — Architecture

This document describes how the feature is built, why it is built that way, and which
existing crshhx machinery it reuses. It is written for anyone maintaining the code.

User-facing documentation lives in [weapon-slot-crosshairs.md](./weapon-slot-crosshairs.md).
Test documentation lives in [testing.md](./testing.md).

---

## Contents

- [Design goals](#design-goals)
- [Layering](#layering)
- [Module map](#module-map)
- [Build layout](#build-layout)
- [Data flow: configuration](#data-flow-configuration)
- [Data flow: a key press](#data-flow-a-key-press)
- [Input transports](#input-transports)
- [Foreground tracking](#foreground-tracking)
- [Persistence and schema](#persistence-and-schema)
- [Migration](#migration)
- [IPC surface](#ipc-surface)
- [Reuse of existing services](#reuse-of-existing-services)
- [Prohibited behaviours and how they are prevented](#prohibited-behaviours-and-how-they-are-prevented)
- [Proposed future architecture](#proposed-future-architecture)

---

## Design goals

The brief imposed a set of hard constraints. Each one shaped a specific decision:

| Constraint | Decision |
| --- | --- |
| No per-key-press disk writes | The renderer resolves the whole configuration into a **runtime snapshot** and pushes it to the main process on change. At key-press time the main process only reads in-memory state. Verified by test: the key-press path performs zero `localStorage` writes. |
| No blocking the hook callback with UI work | The transport callback does policy + `webContents.send` only. Status and indicator updates are pushed to the renderer asynchronously; the renderer is never on the critical path. |
| No second global keyboard hook | Exactly one transport is started, chosen once at startup by `startBestTransport`. Slot bindings are carried by that one transport. |
| No recreating or reloading the overlay | The service is given a **host interface** exposing only `getOverlayWindow`, `getStudioWindow`, `isOverlayVisible`, `sendToOverlay`, `sendToStudio`. It has no ability to create, destroy or reload a window. Verified by test: `overlayWindowCreations === 0`. |
| No modifying or duplicating the preset library | Slots store a preset **id**. Resolution goes through one shared `PresetIndex` built from the existing vault + pro presets + user customs. The picker has no create/save path. |
| Never silently reassign a deleted preset | `validateState` reports `preset-missing` as **blocking**, the row turns red, and the stored id is left intact. |
| Never swallow the user's keys | The passive hook observes only. The fallback transport refuses bare typing keys rather than capturing them system-wide. |
| Coexist with existing generic switching | Separate storage keys and separate reserved-key awareness. The app's *registered* hotkeys (`F10` toggle, `F9` cycle) are treated as reserved and `globalShortcut.unregisterAll()` is never called. |

## Layering

```
┌──────────────────────────────────────────────────────────────────────┐
│ Renderer (React)                                                     │
│                                                                      │
│  WeaponSlotsView ── SlotRow ── KeyCaptureButton / CrosshairPicker    │
│        │            ProfileBar      ActiveSlotIndicator              │
│        │                                                             │
│        ├── src/lib/weaponSlots/slotStore   (immutable CRUD)          │
│        ├── src/lib/weaponSlots/bindingRules(validation, pure)        │
│        ├── src/lib/presetLibrary           (index + runtime builder) │
│        └── src/lib/storage                 (persistence, debounced)  │
└──────────────────────────────┬───────────────────────────────────────┘
                        IPC    │  runtime snapshot in / status out
┌──────────────────────────────┴───────────────────────────────────────┐
│ Main process (Electron)                                              │
│                                                                      │
│  WeaponSlotSwitchService                                             │
│    ├── InputTransport  ── PassiveHookTransport | AcceleratorTransport│
│    ├── ForegroundProvider ── Windows… | Null…                        │
│    ├── switchPolicy.decideSwitch   (SHARED with renderer)            │
│    ├── KeyRepeatGuard                (SHARED)                        │
│    └── host.sendToOverlay('crosshair-updated', config)  ← EXISTING   │
│                                                                      │
│  src/lib/weaponSlots/*  ← the SAME pure core, compiled twice         │
└──────────────────────────────────────────────────────────────────────┘
```

The critical idea is the **shared pure core**. `src/lib/weaponSlots/` contains no
Electron, DOM or React imports. It is compiled twice — once by Vite for the renderer,
once by `tsconfig.node.json` for the main process — so *validation, key parsing, profile
matching, preset resolution and switch policy are literally the same code on both sides*.
There is one set of rules, not two that can drift.

That is also why `tsconfig.node.json` has no DOM lib and why the shared modules avoid
DOM types: `ActiveSlotInfo`, `WeaponSlotStatus` and `WeaponSlotSwitchedPayload` live in
`src/lib/weaponSlots/types.ts` even though they are renderer-facing, so the main process
can produce them without a DOM dependency.

## Module map

### `src/lib/weaponSlots/` — pure core (no Electron, no DOM, no React)

| File | Responsibility |
| --- | --- |
| `types.ts` | Every shared shape: `SlotKeyBinding`, `BindingIssue`, `WeaponSlot`, `WeaponSlotProfile`, `WeaponSlotsState`, `PresetIndex`, `WeaponSlotsRuntime`, `InputTransportCapabilities`, `NormalisedInputEvent`, `SwitchDecision`, `SwitchEnvironment`, `ActiveSlotInfo`, `WeaponSlotStatus`, `WeaponSlotSwitchedPayload`. |
| `keys.ts` | The single **key table** mapping DOM `code` ↔ libuiohook keycode ↔ Electron accelerator ↔ display label ↔ `typingCritical`. Plus `makeBinding`, `formatBinding`, `toAccelerator`, `toUiohookKeycode`, `parseLegacyBinding`, `isBareTypingKey`, `isSafeBareKey`, modifier helpers, mouse-button helpers. |
| `bindingRules.ts` | `MAX_SLOTS_PER_PROFILE`, `validateBinding`, `validateState`, `findDuplicateBindings`, `findSlotForBinding`, `dedupeSlotBindings`. |
| `defaults.ts` | `WEAPON_SLOTS_SCHEMA_VERSION`, `DEFAULT_PROFILE_ID`, deterministic default slot ids, `createDefaultSlots`, `createDefaultProfile`, `createDefaultState`, the Fortnite/CS2 templates, `addTemplateProfile`. |
| `presetIndex.ts` | `buildPresetIndex`, `resolvePreset`, `cloneForApply`, `findMissingAssignments`, `pruneMissingAssignments`, `referencedPresetIds`, `listSelectablePresets`. |
| `profileMatching.ts` | `normalizeProcessName`, `profileMatchesProcess`, `selectProfile`, `isForegroundAllowed`, `foregroundDenialReason`. |
| `slotStore.ts` | Immutable CRUD over the whole state tree. Every operation returns a `StoreResult` (`ok` + new state, or `fail` + message). Slot-level operations are guarded by `requireSlot()`. |
| `switchPolicy.ts` | `matchesBinding`, `resolveSlot`, `decideSwitch`, `KeyRepeatGuard`, `makeIgnore`. The ordered rejection chain that turns an input event into a decision. |
| `migration.ts` | Storage keys, `normalizeState`, `serializeState`, `deserializeState`, `loadState`, `reservedBindingsFromSettings`, runtime-state helpers, `migrateV0ToV1`, legacy aliases. |
| `index.ts` | Barrel. |

### `electron/services/` — main process

| File | Responsibility |
| --- | --- |
| `inputTransport.ts` | `InputTransport` interface, `PassiveHookTransport` (lazy `require('uiohook-napi')`), `AcceleratorTransport` (diff-based `globalShortcut` registration), `startBestTransport`. |
| `foregroundApp.ts` | `ForegroundProvider` interface, `WindowsForegroundProvider` (persistent PowerShell worker), `NullForegroundProvider`, `createForegroundProvider`. |
| `weaponSlotService.ts` | `WeaponSlotSwitchService` — holds the runtime, wires transport → policy → host, tracks the active slot, publishes status. Takes `transportFactory` and `foregroundProvider` by **constructor injection** so tests need no test-only hooks in production code. |

### Renderer

| File | Responsibility |
| --- | --- |
| `src/lib/presetLibrary.ts` | `getPresetIndex(customPresets)` — the one bridge from the existing library to the shared core. `buildWeaponSlotsRuntime(...)` assembles the snapshot. `UNKNOWN_TRANSPORT_CAPABILITIES`. |
| `src/lib/storage.ts` | Appended (never rewritten): `loadWeaponSlotsState`, `saveWeaponSlotsState`, `loadWeaponSlotsRuntimeState`, `saveWeaponSlotsRuntimeState`, `createDebouncedRuntimeSaver`. |
| `src/components/views/WeaponSlotsView.tsx` | The page: header + master switch, transport banner, repair list, profile bar, options, slot table, help panels. Presentation only — every mutation is a call into `slotStore`. |
| `src/components/weaponSlots/SlotRow.tsx` | One row of the table. |
| `src/components/weaponSlots/KeyCaptureButton.tsx` | The key recording field. |
| `src/components/weaponSlots/CrosshairPicker.tsx` | Modal picker over the existing library. Returns an **id** or `null`. |
| `src/components/weaponSlots/ProfileBar.tsx` | Profile tabs, add/duplicate/delete, game-association editor, live-profile readout. |
| `src/components/ActiveSlotIndicator.tsx` | The status-bar chip. |
| `src/components/TopHeader.tsx` | Mounts the chip. |
| `src/components/Sidebar.tsx` | Adds the `weaponslots` nav entry. |
| `src/studio/App.tsx` | Owns the state, persists it, pushes the runtime, relays status/switch events, suspends switching during recording. |

## Build layout

The shared core has to compile twice: once for the renderer (Vite/esbuild, with the DOM
lib) and once for the main process (`tsc`, CommonJS, **no** DOM lib). That is why
`src/lib/weaponSlots/` imports no `electron`, no `react` and no DOM types — a rule that
`buildLayout.test.ts` enforces statically, so it cannot rot.

`tsconfig.node.json` was changed to accommodate this:

| Setting | Before | After | Why |
| --- | --- | --- | --- |
| `include` | `electron/**/*` | `electron/**/*`, `src/lib/weaponSlots/**/*`, `src/types/**/*` | The main process now imports the shared core. |
| `rootDir` | *(unset)* | `.` | Keeps the emitted tree predictable once sources live in two top-level directories. |
| `outDir` | `dist-electron` | `dist-electron` *(unchanged)* | — |

Because `rootDir` moved to the repository root, the emitted main process moved from
`dist-electron/main.js` to **`dist-electron/electron/main.js`**. Two things had to follow:

- `package.json` `main` → `dist-electron/electron/main.js`.
- `electron/main.ts` resolves the renderer bundle through a single derived constant:

```ts
// __dirname is <repo>/dist-electron/electron at runtime.
const RENDERER_DIST = path.join(__dirname, '..', '..', 'dist');
studioWindow.loadFile(path.join(RENDERER_DIST, 'index.html'));
overlayWindow.loadFile(path.join(RENDERER_DIST, 'overlay.html'));
```

This is a genuine regression class, and it was hit during development. Getting the hop
count wrong passes every typecheck, does not break `npm run dev` (dev loads from the Vite
server), and only shows up as **blank windows in the packaged app**. `buildLayout.test.ts`
now pins the relationship down by reading `tsconfig.node.json`, `vite.config.ts`,
`package.json` and `electron/main.ts` and asserting that the compiled main process's
`RENDERER_DIST` resolves to Vite's `outDir` — and specifically *not* to a path inside the
compiled main-process output.

### The optional native dependency

`uiohook-napi` is declared under **`optionalDependencies`**, never `dependencies`:

```json
"optionalDependencies": { "uiohook-napi": "^1.5.5" }
```

`inputTransport.ts` loads it with `require('uiohook-napi')` inside a `try/catch`. If it is
missing, fails to install, or cannot load on the host (it needs X11 libraries on Linux, for
instance), crshhx logs the reason and falls back to `AcceleratorTransport`. The app must
never fail to start because an *optional* performance improvement is unavailable.

It ships N-API prebuilds, so it loads under Electron without `electron-rebuild` and without
compiling anything at install time.

The loader is also statically asserted never to call `keyTap` or `keyToggle`. Those are
libuiohook's input-*injection* functions; crshhx only ever observes, and synthesising input
into a game is precisely what an anti-cheat looks for. See
[Prohibited behaviours](#prohibited-behaviours-and-how-they-are-prevented).

## Data flow: configuration

```
user edits a slot
  → WeaponSlotsView calls slotStore.renameSlot / setSlotBinding / assignPreset / …
  → slotStore returns { ok, state }        (immutable; original untouched)
  → view calls onChange(nextState)
  → App: setWeaponSlotsState(next) + saveWeaponSlotsState(next)   [localStorage]
  → App effect: buildWeaponSlotsRuntime(state, presetIndex, appSettings, capabilities)
  → electronAPI.applyWeaponSlotsRuntime(runtime)
  → IPC 'weapon-slots:apply-runtime'
  → WeaponSlotSwitchService.applyRuntime(runtime)
  → syncs the transport bindings (diff), selects the profile, pushes status
  → IPC 'weapon-slot-status' → App → status bar
```

Persistence happens in the **renderer**, where the existing `localStorage` conventions
already live. The main process never reads or writes configuration, so it needs no IPC
round trip to make a decision.

Note the `capabilitiesKey` detail in `App.tsx`: the runtime-push effect depends on a
**stringified** signature of the transport capabilities, not the status object. Depending
on the object would re-run the effect on every status message, and since applying a
runtime publishes a status, that would loop forever.

## Data flow: a key press

```
OS input event
  → InputTransport (passive hook, or globalShortcut)
  → normalise to NormalisedInputEvent { code, modifiers, kind, phase, isRepeat, timestamp }
  → KeyRepeatGuard.shouldTrigger(event)          [repeat / debounce rejection]
  → switchPolicy.decideSwitch(event, environment) [ordered rejection chain]
  → if decision.kind === 'apply':
        host.sendToOverlay('crosshair-updated', decision.config)   ← EXISTING CHANNEL
        OverlayApp.setConfig(config)                               ← EXISTING HANDLER
        record active slot, publish status + switched payload
     else:
        record lastIgnore(reason, detail), publish status
```

`decideSwitch` evaluates, in order:

1. modifier-only press → ignore
2. key repeat / debounce → ignore (`key-repeat`)
3. a key field is currently recording → ignore (`recording-binding`)
4. feature disabled → ignore (`feature-disabled`)
5. overlay hidden → ignore (`overlay-hidden`)
6. Studio focused and suppression enabled → ignore (`studio-focused`)
7. select the profile (manual, or by foreground when auto-select is on)
8. profile restricted and its process not in the foreground → ignore (`foreground-not-allowed`) — **fails closed**
9. no slot matches the binding → ignore (`no-matching-slot`)
10. slot disabled → ignore (`slot-disabled`)
11. input kind the transport cannot deliver → ignore (`input-kind-unsupported`)
12. slot has no preset → ignore (`preset-unassigned`)
13. preset no longer exists → ignore (`preset-missing`)
14. otherwise → `{ kind: 'apply', config: cloneForApply(resolved) }`

Steps 12 and 13 both leave the displayed crosshair **unchanged**. Neither substitutes
another preset.

Every ignore carries a reason and a human-readable detail, which is how the UI can say
`Last key did nothing: …` instead of failing silently.

The config passed to the overlay is a **clone** (`cloneForApply`), so the overlay can
never hold a reference into the preset library and mutate it.

## Input transports

`InputTransport` is a tiny interface:

```ts
interface InputTransport {
  readonly capabilities: InputTransportCapabilities;
  start(onEvent: (e: NormalisedInputEvent) => void): void;
  stop(): void;
  syncBindings(bindings: BindingRegistration[]): SyncResult;
}
```

`startBestTransport()` tries the passive hook first and returns
`{ transport, degraded, reason }`. Exactly one transport is ever started.

**`PassiveHookTransport`** lazily `require`s `uiohook-napi` inside a `try/catch`, so a
missing or unloadable native module degrades instead of crashing the app. It subscribes
to `keyDown`/`keyUp`/`mouseDown`/`wheel` and translates them through the shared key
table. It **never** calls `keyTap` or `keyToggle` — asserted by test.

**`AcceleratorTransport`** keeps a `Map` of registered accelerators and computes a diff
on each `syncBindings`, registering and unregistering only what changed. It guards
against a missing `globalShortcut`, tolerates the OS refusing a registration, and never
calls `unregisterAll()` — asserted by test, because `registerHotkeys()` in
`electron/main.ts` does call it for the app's own `F10`/`F9`.

> **Maintenance note.** `registerHotkeys()` currently runs *before*
> `createWeaponSlotService()`, so the ordering is safe. If it is ever re-run later (for
> example to pick up a changed app hotkey), it will wipe the accelerator transport's
> slot registrations. `syncTransportBindings()` must be called again afterwards. This is
> the single most fragile ordering assumption in the feature.

Bindings that `globalShortcut` cannot express (mouse, wheel) are skipped with a reason
rather than failing the whole sync.

## Foreground tracking

`ForegroundProvider` is `{ start(), stop(), current(): string | null, available: boolean }`.

`WindowsForegroundProvider` spawns **one persistent** PowerShell worker that polls the
foreground window's process name every 1500 ms (never more often than 500 ms) and writes
to stdout. It does not spawn a process per poll. After `maxFailures` (5) consecutive
failures it marks itself unavailable and stops trying.

`NullForegroundProvider` is used on non-Windows platforms and reports
`available === false` honestly.

Nothing starts until `autoSelectProfileByForegroundApp` is enabled — it is off by
default, so the worker is never spawned for users who do not want it.

`selectProfile(state, foregroundName)` resolves which profile is active, and
`isForegroundAllowed(profile, name, trackingAvailable)` decides whether a restricted
profile may fire. When tracking is unavailable and a profile is restricted, the answer is
**no** — fail closed, with a message telling the user to disable the restriction or
switch profiles manually. This consolidation fixed a real inconsistency where
`decideSwitch` and the helper disagreed about fail-open versus fail-closed.

## Persistence and schema

Two new `localStorage` keys, both separate from everything that already existed:

| Key | Contents |
| --- | --- |
| `crshhx_weapon_slots` | The whole configuration: schema version, enabled flag, options, profiles with their slots. |
| `crshhx_weapon_slots_runtime` | Ephemeral view state: which profile and slot were last active. Written **debounced at 600 ms**. |

Existing keys (`crshhx_current_config`, `crshhx_custom_presets`, `crshhx_app_settings`)
are never touched — verified byte-for-byte by test.

```ts
WeaponSlotsState {
  version: 1,
  enabled: boolean,                    // ships false
  activeProfileId: string,
  autoSelectProfileByForegroundApp: boolean,   // ships false
  suppressWhileStudioFocused: boolean,          // ships false
  unassignedSlotBehaviour: 'keep-current',      // the only supported value
  profiles: WeaponSlotProfile[],
}

WeaponSlotProfile {
  id: string,
  name: string,                        // ≤ 48 chars
  matchProcessNames: string[],
  restrictToMatchedProcesses: boolean,
  isDefault: boolean,
  slots: WeaponSlot[],                 // ≤ 24, contiguous indices
}

WeaponSlot {
  id: string,                          // stable, unique
  index: number,
  name: string,                        // ≤ 48 chars
  binding: SlotKeyBinding | null,
  presetId: string | null,             // ← identifier, never a name
  enabled: boolean,
}

SlotKeyBinding {
  code: string,                        // 'Digit1', 'KeyQ', 'F5', 'MouseButton4', 'WheelUp'
  modifiers: KeyModifier[],            // 'ctrl' | 'alt' | 'shift' | 'meta'
  kind: 'key' | 'mouse' | 'wheel',
}
```

`normalizeState` is the only entry point and is **idempotent**. It accepts either an
object or a JSON string (a real bug found by test: handed a serialised string it used to
return factory defaults, which would have wiped a user's configuration). It guarantees:

- exactly one default profile, always present
- contiguous slot indices starting at 1
- at most 24 slots per profile
- names trimmed and capped at 48 characters
- any unsupported `unassignedSlotBehaviour` replaced by `'keep-current'`
- duplicate bindings within a profile deduplicated (via `dedupeSlotBindings`)
- unparseable bindings dropped, not guessed at

Newer schema versions are loaded without discarding the fields this version understands.

## Migration

`migrateV0ToV1` handles a pre-profiles configuration: a flat `slots` array is wrapped
into the default profile and a **repair note** is recorded. `parseLegacyBinding` converts
old string bindings (`'1'`, `'F10'`, `'num1'`, `'q'`, `'Alt+1'`, `'Ctrl+Alt+Q'`,
`'Shift+Alt+Ctrl+1'`) into canonical `SlotKeyBinding`s, and returns `null` — never a
guess — for anything ambiguous (`''`, `'NotAKey'`, `'Alt-'`, `'1+2'`, `null`).

Every repair made during load is surfaced in the UI under *"N settings repaired on
load"*. Nothing is discarded silently.

## IPC surface

Renderer → main:

| Channel | Purpose |
| --- | --- |
| `weapon-slots:apply-runtime` | Push the resolved runtime snapshot. |
| `weapon-slots:set-recording` | Suspend/resume switching while a key field is recording. |
| `weapon-slots:restore-active` | Restore the indicator after a Studio reload. |
| `weapon-slots:get-status` | `ipcRenderer.invoke` — fetch current status on mount. |

Main → renderer:

| Channel | Purpose |
| --- | --- |
| `weapon-slot-switched` | A switch happened: slot, profile, preset id, config, `unchanged` flag. |
| `weapon-slot-status` | Current status: enabled, transport, degraded + reason, active profile/slot, foreground info, `lastIgnore`, slot count. |

Unchanged and still the pathway slot switching applies through:

| Channel | Purpose |
| --- | --- |
| `update-crosshair` | Designer → main → overlay (existing). |
| `crosshair-updated` | Main → overlay window (existing). **Slot switching uses this same channel.** |

Preload exposes these as `applyWeaponSlotsRuntime`, `setWeaponSlotRecording`,
`restoreWeaponSlotActive`, `getWeaponSlotStatus`, `onWeaponSlotSwitched` and
`onWeaponSlotStatus`, all through a shared `subscribe<T>()` helper that returns an
unsubscribe function. Every new member is declared **optional** (`?:`) in
`src/types/electron.d.ts`, so the Studio still runs in a plain browser and older preloads
cannot break the type contract.

On shutdown, `will-quit` disposes the weapon-slot service **before**
`globalShortcut.unregisterAll()`, so slot registrations are removed cleanly and
deterministically. `dispose()` is idempotent and survives a throwing transport — both
asserted by test.

## Reuse of existing services

Nothing in this feature duplicates existing machinery:

| Existing facility | Reused for |
| --- | --- |
| `crosshair-updated` IPC → `OverlayApp.setConfig` | Applying a switched crosshair. No new overlay pathway. |
| `PRO_PRESETS` + `COMPLETE_CROSSHAIR_VAULT` + `customPresets` | The single preset library, exposed through one `PresetIndex`. |
| `ReticleRenderer` | Live previews in the slot table and in the picker. |
| `src/lib/storage.ts` conventions | New keys appended to the existing module, existing keys untouched. |
| `TopHeader` | Hosts the active-slot chip — no new status bar. |
| `Sidebar` / `ActiveNavView` | The new section is one more entry in the existing navigation. |
| `AppSettings` | `reservedBindingsFromSettings` derives the registered app hotkeys as reserved, so the two systems coexist. |
| Theme tokens (`--brand-accent`, `surface.*`) | All new UI uses the existing design tokens. |

What was **replaced** rather than reused: `KeybindsView`'s "In-Game Profile Hotkeys"
block. It was three hardcoded rows in local React state — never persisted, never wired to
anything, and its key capture relied on an `onKeyDown` handler attached to a `<button>`,
which only fires when that button happens to hold DOM focus and uppercases `e.key` (so
Space, arrows and Shift produced garbage). It now points at the real feature, and its
overlay-toggle field uses the working recorder.

## Prohibited behaviours and how they are prevented

| Prohibited | Mechanism | Test |
| --- | --- | --- |
| Recreating the overlay window per switch | The service receives a host exposing only getters and `send*`; it cannot create windows. | `overlayWindowCreations === 0` |
| Restarting the app / reloading the settings UI | No `app.relaunch`, no `webContents.reload` anywhere in the feature. | Integration suite asserts only `crosshair-updated` is sent. |
| Modifying or overwriting saved presets | Slots store an id; `cloneForApply` hands the overlay a copy; the picker has no save path. | `presets` + UI suites |
| Creating new presets on switch | No write path exists in the switching flow. | `presets` suite |
| Disk writes per key press | Runtime is pushed on change; the active-slot record is debounced 600 ms. | Key-press path asserts zero `localStorage` writes |
| Duplicate switches from key repeat | `KeyRepeatGuard`: key-up clears the held entry, key-down while held is a repeat, explicit `isRepeat` honoured, wheel debounced 90 ms, keys 40 ms. | 2 s hold at 30 ms ⇒ exactly one trigger |
| Interfering with / swallowing / remapping keys | Passive hook observes only; `keyTap`/`keyToggle` never called; fallback refuses bare typing keys. | Static assertion on `inputTransport.ts` |
| Artificial input delay | No `setTimeout`/sleep on the switch path. | — |
| Blocking the hook callback with UI work | Callback does policy + `send`; status is published asynchronously. | — |
| A second global keyboard hook | One `startBestTransport()` result, started once. | Transport started once, never restarted per switch |
| Game memory reading / injection / file modification / anti-cheat bypass | None of these APIs appear anywhere in the codebase. The only OS facilities used are a low-level input *listener* and reading the foreground process name. | — |
| Silent discarding on migration | Every repair is recorded and surfaced in the UI. | `persistence` + UI suites |

## Proposed future architecture

Two things were investigated and deliberately **not** forced into this implementation.

### Controller / gamepad support

Not viable inside Electron's main process: the Gamepad API is renderer-only, requires
window focus, and is poll-based, while games take exclusive XInput ownership. Doing it
properly needs a native module exposing a controller listener with the same
observe-only contract as the keyboard hook. The clean seam already exists —
`InputTransport` is an interface, so a `GamepadTransport` could be added and selected by
`startBestTransport` without touching the policy, persistence or UI layers. It would need
`capabilities.controller = true` and a new binding `kind`.

### Richer per-game configuration

The current model is **process-name matching on the foreground window**, which is
deliberately modest: opt-in, Windows-only, and fail-closed. It answers "is this game in
front of me?" and nothing more.

If per-game configuration ever needs to go further (per-game *slot counts*, per-game
*key maps* that differ structurally, or importing a game's own bind layout), the clean
shape is:

1. Keep `WeaponSlotProfile` as the unit of configuration — it already carries its own
   slots, key bindings and process associations.
2. Replace the `matchProcessNames: string[]` + `restrictToMatchedProcesses: boolean`
   pair with a `MatchRule` discriminated union (`{ kind: 'process', names }`,
   `{ kind: 'windowTitle', pattern }`, …). `profileMatching.ts` is already the single
   place that answers "does this profile match?", so the change is contained.
3. Add a **precedence** field so overlapping rules resolve deterministically, and let
   `selectProfile` order by it. Today the default profile is the implicit fallback.
4. Keep `selectProfile` pure so the main process and renderer cannot disagree.

That is an additive change to one module and one type; it does not require restructuring
the service, the persistence format or the UI.
