# Crosshair Editing, Preset Organisation and File Transfer

This document covers the subsystems added after Weapon Slot Crosshairs: the
crosshair schema and renderer, the designer editor, the preset library sidecar,
and the import/export file format. For the overlay, input hooks and weapon-slot
switching, see [architecture.md](architecture.md).

## Contents

- [Design goals](#design-goals)
- [Layering](#layering)
- [The crosshair schema](#the-crosshair-schema)
- [Storage keys](#storage-keys)
- [Preset organisation: the sidecar](#preset-organisation-the-sidecar)
- [The transfer format](#the-transfer-format)
- [The editor](#the-editor)
- [The preset manager](#the-preset-manager)
- [Invariants](#invariants)
- [Known dead ends and deliberate omissions](#known-dead-ends-and-deliberate-omissions)

## Design goals

1. **Nothing is lost silently.** A crosshair is never overwritten, renumbered or
   deleted without the user having seen that it was about to happen.
2. **Ranges come from the shipped library, not from guesswork.** The inspector's
   slider bounds are derived by measuring the 258 presets that ship with crshhx,
   because invented bounds would have silently redrawn a third of them.
3. **One validator.** Every config — loaded from storage, arriving in a file, or
   leaving the editor — passes through the same `normalizeCrosshairConfig`. There
   is no second, weaker path.
4. **Organisation is not data.** Folders, favourites, descriptions and timestamps
   live beside the crosshairs, never inside them.

## Layering

```
src/lib/crosshairSchema.ts   pure — the single validator, ranges, arm geometry
src/lib/colorUtils.ts        pure — colour parsing, contrast, naming
src/lib/configDiff.ts        pure — A/B difference rows
src/lib/presetOrganizer.ts   pure — folders, favourites, search, sort
src/lib/presetTransfer.ts    pure — envelope build/parse, import plan, apply
src/lib/fileTransfer.ts      DOM only — download and file-picker helpers
src/lib/storage.ts           localStorage, including the favourites migration

src/components/editor/       controls, colour field, arm geometry, compare, history
src/components/views/        DesignerTabbedView, CrosshairsView, PresetManagerView
src/components/modals/       ImportPreviewModal, ShareImportModal
```

The pure modules are deliberately DOM-free so they typecheck under
`tsconfig.node.json` as well, and so they can be tested without jsdom.
`fileTransfer.ts` is the one exception and sits outside the node program.

## The crosshair schema

`crosshairSchema.ts` owns `CROSSHAIR_SCHEMA_VERSION` (currently **2**), `LIMITS`,
`V2_DEFAULTS` and `normalizeCrosshairConfig(raw, context) → { config, repairs }`.

Normalization is **idempotent**, **visually neutral for v1 configs**, and
**accepts anything** — it never throws and never refuses a config. A value
outside `LIMITS` is clamped and recorded in `repairs`; a missing v2 field takes
its `V2_DEFAULTS` value. The `context` string (e.g. `import[3]`) prefixes each
repair so a user can tell which crosshair needed correcting.

### v2 additions

| Field | Meaning |
| --- | --- |
| `asymmetricArms` | When false, all four arms use the global `length`/`thickness` — exactly the pre-v2 behaviour. When true, `armSpecs` per direction apply. |
| `rotation` | One `<g transform="rotate(deg cx cy)">` around the arms, chevron and centre dot. The ring stays outside it. |
| `scale` | Multiplied into the preview scale by `effectiveScale`, which refuses 0 and NaN. |
| `innerOutline*` | An inset stroke, omitted when `w - t <= 0` or `h - t <= 0`. |

Per-arm overrides persist even while `asymmetricArms` is off, so turning the mode
back on restores what the user set. Geometry must always be read through
`resolveArmGeometry`, never by reading `length` directly.

### Measured ranges of the shipped library

These are the real bounds of the 258 presets in `COMPLETE_CROSSHAIR_VAULT`, and
they are why `LIMITS` looks unusual:

```
length 0–10        thickness 0–3        gap −3–16
centerDotSize 1–6  outlineThickness 1–1.5   circleRadius 8–28
circleThickness 1–2   glowBlur 0–5      offsetX/Y 0
primaryOpacity 0.9–1   outlineOpacity 0.9–1   circleOpacity 0.5–0.8
adsScale 0.4–0.7   firingBloomExpansion 0–8   firingDecayMs 100–150
```

Negative gaps and zero thickness are legitimate and common. `LIMITS` is
therefore wider than the shipped data (`thickness.min` 0, `gap.min` −20) so that
a user can go past the library without the inspector fighting them.

`topology === 'circle'` is **never** special-cased: it renders as a cross, and a
ring appears only when `circleEnabled` is set.

## Storage keys

| Key | Contents |
| --- | --- |
| `crshhx_current_config` | The config the overlay is drawing. |
| `crshhx_app_settings` | The seven settings in `SETTING_LABELS`. |
| `crshhx_custom_presets` | The user's own crosshairs. Byte-compatible with the weapon-slot preset index. |
| `crshhx_color_swatches` | Recent and saved colours, `SWATCH_VERSION` 1. |
| `crshhx_preset_library` | The organisation sidecar (below). |
| `crshhx_favorites` | **Legacy.** Migrated into the sidecar on first read, then removed. |
| `crshhx_weapon_slots*` | Weapon-slot profiles; see [architecture.md](architecture.md). |

Every loader is fail-open to a usable default and reports what it did. A corrupt
`crshhx_preset_library` yields an empty library plus the repair line *"…Your
crosshairs are untouched."*, because losing folder names is recoverable and
losing crosshairs is not.

### Favourites

Favourites have **one** store: `library.entries[id].favourite`. The functions
`loadFavoriteIds`, `saveFavoriteIds` and `toggleFavoriteId` remain as the vault's
API but read and write the sidecar. Previously the vault kept `crshhx_favorites`
and the manager kept the sidecar, so starring a crosshair in one view did not
appear in the other and the next write from the manager undid it.

The migration is one-way and idempotent: on first read the legacy ids become
favourites, a repair line reports how many moved, and the legacy key is deleted.
A genuine first run seeds `['pro-1', 'pro-2', 'pro-11']` **into the sidecar** so
both views start out agreeing; once the user has chosen to have none, nothing
re-seeds.

Because the vault writes straight to storage while `App.tsx` holds its own copy
of the library in state, App re-reads the library on every view change. All
writes are synchronous, so re-reading cannot discard unsaved work.

## Preset organisation: the sidecar

`presetOrganizer.ts` is pure. State shape:

```ts
PresetLibraryState {
  version: 1;
  folders: PresetFolder[];        // { id, name, createdAt }
  entries: Record<string, PresetEntry>;  // keyed by preset id
  sort: 'name' | 'created' | 'modified' | 'recent';
}
PresetEntry { folderId: string | null; favourite: boolean; description: string;
              createdAt: number; modifiedAt: number; lastUsedAt: number | null }
```

**Why a sidecar keyed by preset id rather than fields on `CrosshairConfig`:**
built-in presets are module constants that cannot carry per-user state, and
`crshhx_custom_presets` must stay byte-compatible with the weapon-slot preset
index. Adding optional fields there would have meant every reader defending
against their absence, forever.

Consequences worth knowing:

- `entryFor` returns defaults **without persisting**, so listing the 258 built-ins
  creates 258 empty records for nothing.
- Deleting a folder moves its presets out; it never deletes them. A folder is
  organisation, not a container of data. Refusals (duplicate name, over
  `MAX_FOLDERS`) return the *same* state object so callers can compare by
  identity.
- A duplicate folder name is suffixed using the casing of the **first** folder
  with that name, not the casing the user typed — `rifles` colliding with
  `Rifles` produces `Rifles (2)`, never `rifles (2)`.
- `searchViews` is substring based: whitespace-split, every term must match,
  haystack = name + description + folder name + game + `favourite favorite
  starred`. Note that the indexed `game` field is a real search term, so a
  one-character query like `a` matches almost everything.
- `sortViews` always puts favourites first, puts `lastUsedAt: null` last under
  `recent`, breaks ties by name, and does not mutate.
- `folderCounts` has **no** key for an empty folder — read `counts[id] ?? 0`. The
  `null` group is always present.
- `markUsed` does not touch `modifiedAt`; applying a crosshair is not editing it.

## The transfer format

`presetTransfer.ts` writes and reads `crshhx-export` version **1**.

```ts
TransferEnvelope {
  format: 'crshhx-export'; version: 1;
  kind: 'presets' | 'configuration';
  exportedAt: string; appVersion: string; crosshairSchema: number;
  presets: { config, meta? }[];
  folders?: string[];               // names only — no local ids travel
  settings?: Partial<AppSettings>;  // configuration kind only
  weaponSlots?: WeaponSlotsState;   // configuration kind only
}
```

`meta` is omitted entirely for presets the user never organised, so a plain
export of untouched crosshairs carries no sidecar noise.

### Parse refuses what it cannot honestly interpret

`parseTransferFile` rejects non-JSON, a non-object root, a missing or foreign
`format`, a missing or non-numeric `version`, and — importantly — **a version
higher than this build supports**, with "Update crshhx" rather than half-applying
a format it only partly understands. It accepts a configuration file with no
presets, notes a different `appVersion`, and notes a newer `crosshairSchema` as
*"ignored, not discarded"*.

### Import is two steps: plan, then apply

The unrecoverable failure this prevents is a file quietly replacing crosshairs.
Nothing is written until a plan exists and the user has seen it in
`ImportPreviewModal`.

`planImport(envelope, existing)` defaults are safe:

| Situation | Default |
| --- | --- |
| Id already in the local library | `add-with-new-id` — keep both |
| Name already used locally | keep both, with a note |
| Same id twice in the file | the later one is skipped |
| Settings differ | listed as differences, **not** applied |
| Weapon-slot profiles present | offered as an opt-in checkbox |

Nothing overwrites unless the user sets that specific entry to "Replace mine".
An import of `LARGE_IMPORT_THRESHOLD` (25) or more crosshairs needs an explicit
tick, because it cannot be undone.

### Two bugs this design caught

**Id allocation across a whole file.** `allocateId` used to walk `custom-2`,
`custom-3`, … against the ids already claimed *so far*. When entry 1 collided and
was renumbered onto `custom-2`, entry 2 — which legitimately wanted `custom-2` —
was then reported as an in-file duplicate and skipped. The file lost a crosshair
the user never chose to lose. Every id in the file is now reserved **before** any
allocation happens, and a separate `seen` set does the genuine-duplicate check.

**Repairing twice and telling nobody.** `buildEnvelope` used to normalize values
on the way out. An out-of-range local value was then repaired on export *and* on
import, so the exported file silently disagreed with the user's own library and
no repair was ever reported. Export now writes values as the user has them; the
importer is the single validator and reports every repair it makes.

## The editor

`DesignerTabbedView` is the shell, `ReticleControls` the only inspector, and
`PreviewStage` (from `ComparePanel.tsx`) the only place a crosshair is drawn in
the designer — using the same `ReticleRenderer` the overlay uses. Inspector
ranges come from `LIMITS`, never from hard-coded numbers in a component.

- `useConfigHistory(config, onChange)` gives undo/redo with coalescing. It keeps
  an `acknowledged` ref compared **by value**, because comparing by identity
  wiped the undo stack on any parent re-render that passed an equal config.
- `ColorField` accepts `#rrggbb`, `rrggbb`, `#rgb`, `rgb()` and `rgba()` in any
  case and canonicalises to lower-case `#rrggbb`. It **rejects CSS colour names**
  rather than guessing, and shows contrast against the current backdrop with a
  verdict from `contrastVerdict`.
- `ComparePanel` pins the current config as A and shows live differences grouped
  by `configDiff`. `id`, `name` and `game` are ignored, and an
  equivalent-asymmetric-vs-symmetric pair diffs to `[]`.
- Reset merges over a baseline that declares **every** field it should clear.
  Merging over `DEFAULT_CONFIG` could not clear a key the baseline omitted.

## The preset manager

`PresetManagerView` is a two-pane view: a folder rail (All / Favourites / Not in
a folder / user folders, each with a live count) and a preset list with a
rendered thumbnail per row.

Rename and delete are **disabled for built-ins**, with the reason in the tooltip,
and duplicating is offered instead — that is how you edit one. Deleting a
crosshair names the weapon-slot profiles that point at it, so the user can see
which bindings will start showing as missing. Deleting a folder states plainly
that the crosshairs inside survive.

### Two imports, deliberately different

| | Share (top bar) | Preset Manager → Import file |
| --- | --- | --- |
| Input | Pasted Valorant code, CS2 console snippet or JSON | A `crshhx-export` file |
| Scope | One crosshair, applied to the editor | Many crosshairs, folders, optionally settings and weapon slots |
| Confirmation | Immediate | A preview listing every change first |

Both say what they are for and point at the other. `CodeImportExport.tsx` was
deleted: it had no importers anywhere in `src` or `tests` and duplicated the
code-paste role `ShareImportModal` already fills.

## Invariants

- A weapon slot references a preset by **stable id**, never by name.
- `crshhx_custom_presets` stays byte-compatible with the weapon-slot preset index.
- Every config passes through `normalizeCrosshairConfig` exactly once per
  boundary — load, file arrival, editor commit.
- Import writes nothing before a plan exists and the user has confirmed it.
- Deleting a folder never deletes a crosshair.
- Favourites have exactly one store.
- The pure `src/lib` modules stay DOM-free.

## Known dead ends and deliberate omissions

- **`custom-image` topology is dead.** `customImageUrl` and `customImageScale`
  are declared in the type but no preset in the vault uses them, no control sets
  them and the renderer ignores them. They are left in place rather than removed,
  because removing a declared field would break any config a user hand-edited to
  include one. A decision to implement or delete them is still outstanding.
- **`fileTransfer.ts` downloads to the OS default folder.** A native save dialog
  would need an IPC round trip to the main process; the trade-off is documented
  in the module itself.
- **Hand-rolled brace scanners do not work on TSX.** Stripping template literals
  desyncs line numbers, and emitting a brace per `${…}` makes depth drift. Use
  `esbuild file.tsx --outfile=/tmp/x.js` for a precise parse error, `head -N` to
  isolate a half, then read the unreviewed region. Note that a missing `};` 390
  lines earlier is reported as *"Unexpected end of file"* at the last line — the
  reported line is useless.
- **Grep for importers before extending any UI file.** Two components
  (`ReticleControls`/`LivePreview`, then `CodeImportExport`) turned out to have
  none.
