import type { CrosshairConfig } from '../types/crosshair';

/**
 * Preset organisation: folders, favourites, descriptions and timestamps.
 *
 * **Why a sidecar rather than fields on `CrosshairConfig`.** Built-in presets
 * are module constants — the vault and the pro presets cannot be mutated, so
 * "favourite this one" or "put that one in a folder" has nowhere to live on the
 * config itself. A store keyed by preset id lets users organise *any* crosshair,
 * built-in or their own, and it leaves `crshhx_custom_presets` byte-compatible
 * so the weapon-slot preset index is unaffected.
 *
 * This is deliberately **not** a second preset store. The crosshair values still
 * come from exactly one place (`lib/presetLibrary.ts` reads the vault, the pro
 * presets and the custom presets). This module holds only what the user has said
 * *about* them.
 *
 * Invariants the functions below maintain:
 * - Deleting a folder never deletes a preset. Its contents move to "no folder".
 * - An entry can never point at a folder that does not exist.
 * - Timestamps are numbers; a missing `lastUsedAt` is `null`, not 0, because
 *   "never used" and "used in 1970" must sort differently.
 * - Pure throughout: every function returns a new state and never mutates.
 */

export const PRESET_LIBRARY_SCHEMA_VERSION = 1;

export const MAX_FOLDERS = 64;
export const MAX_FOLDER_NAME = 48;
export const MAX_DESCRIPTION = 280;

export type PresetSort = 'name' | 'created' | 'modified' | 'recent';

export const SORT_OPTIONS: Array<{ value: PresetSort; label: string }> = [
  { value: 'name', label: 'Name' },
  { value: 'created', label: 'Date created' },
  { value: 'modified', label: 'Date modified' },
  { value: 'recent', label: 'Recently used' },
];

export interface PresetFolder {
  id: string;
  name: string;
  createdAt: number;
}

export interface PresetEntry {
  /** `null` means "not in a folder", which is a real place, not an error. */
  folderId: string | null;
  favourite: boolean;
  description: string;
  createdAt: number;
  modifiedAt: number;
  /** Null until the crosshair has actually been applied once. */
  lastUsedAt: number | null;
}

export interface PresetLibraryState {
  version: number;
  folders: PresetFolder[];
  entries: Record<string, PresetEntry>;
  sort: PresetSort;
}

export interface LibraryResult {
  state: PresetLibraryState;
  /** Human-readable notes about anything that had to be corrected or refused. */
  repairs: string[];
}

/* ------------------------------------------------------------------ *
 * Construction
 * ------------------------------------------------------------------ */

let idCounter = 0;

/** Ids are opaque and never shown; stability matters, readability does not. */
export function newFolderId(now = Date.now()): string {
  idCounter = (idCounter + 1) % 1e6;
  return `folder-${now.toString(36)}-${idCounter.toString(36)}`;
}

export function emptyLibrary(): PresetLibraryState {
  return { version: PRESET_LIBRARY_SCHEMA_VERSION, folders: [], entries: {}, sort: 'name' };
}

function entryDefaults(now: number): PresetEntry {
  return {
    folderId: null,
    favourite: false,
    description: '',
    createdAt: now,
    modifiedAt: now,
    lastUsedAt: null,
  };
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

function toTimestamp(value: unknown, fallback: number): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/**
 * Validates a library read from storage or from an imported file.
 *
 * Never throws and never discards the whole store because one entry is odd: a
 * bad entry is dropped with a note, and the rest survives. Losing someone's
 * folder structure because one timestamp was a string would be a worse outcome
 * than the repair.
 */
export function normalizeLibrary(raw: unknown, now = Date.now()): LibraryResult {
  const repairs: string[] = [];
  if (raw === null || raw === undefined) return { state: emptyLibrary(), repairs };
  if (!isRecord(raw)) {
    return {
      state: emptyLibrary(),
      repairs: ['Stored library was not an object — started a fresh one.'],
    };
  }

  const version = typeof raw.version === 'number' ? raw.version : 0;
  if (version > PRESET_LIBRARY_SCHEMA_VERSION) {
    repairs.push(
      `Library was written by a newer version of crshhx (schema ${version}); reading it as ${PRESET_LIBRARY_SCHEMA_VERSION}. Some organisation may be ignored.`,
    );
  }

  /* Folders */
  const folders: PresetFolder[] = [];
  const seenFolderIds = new Set<string>();
  /** lower-case name -> how the first folder with that name is actually spelled */
  const seenFolderNames = new Map<string, string>();
  if (Array.isArray(raw.folders)) {
    for (const item of raw.folders) {
      if (!isRecord(item)) {
        repairs.push('Ignored a folder entry that was not an object.');
        continue;
      }
      const id = typeof item.id === 'string' ? item.id.trim() : '';
      if (!id) {
        repairs.push('Ignored a folder with no id.');
        continue;
      }
      if (seenFolderIds.has(id)) {
        repairs.push(`Ignored duplicate folder id "${id}".`);
        continue;
      }
      let name = typeof item.name === 'string' ? item.name.trim() : '';
      if (!name) {
        name = 'Unnamed folder';
        repairs.push(`Folder "${id}" had no name — called it "${name}".`);
      }
      name = name.slice(0, MAX_FOLDER_NAME);
      // Suffix from the *first* spelling, so "Rifles" and "rifles" become
      // "Rifles" and "Rifles (2)" rather than a pair that differ only by case.
      const firstSpelling = seenFolderNames.get(name.toLowerCase());
      let uniqueName = name;
      if (firstSpelling !== undefined) {
        let suffix = 2;
        while (seenFolderNames.has(uniqueName.toLowerCase())) {
          uniqueName = `${firstSpelling} (${suffix++})`.slice(0, MAX_FOLDER_NAME);
        }
        repairs.push(`Two folders were both called "${name}" — renamed one to "${uniqueName}".`);
      }
      seenFolderIds.add(id);
      seenFolderNames.set(uniqueName.toLowerCase(), uniqueName);
      folders.push({ id, name: uniqueName, createdAt: toTimestamp(item.createdAt, now) });
      if (folders.length >= MAX_FOLDERS) {
        repairs.push(`Kept the first ${MAX_FOLDERS} folders and ignored the rest.`);
        break;
      }
    }
  } else if (raw.folders !== undefined) {
    repairs.push('Library folders were not a list — ignored them.');
  }

  /* Entries */
  const entries: Record<string, PresetEntry> = {};
  if (isRecord(raw.entries)) {
    for (const [presetId, value] of Object.entries(raw.entries)) {
      if (!presetId) continue;
      if (!isRecord(value)) {
        repairs.push(`Ignored organisation for preset "${presetId}": not an object.`);
        continue;
      }
      const defaults = entryDefaults(toTimestamp(value.createdAt, now));
      const folderId = typeof value.folderId === 'string' ? value.folderId : null;
      entries[presetId] = {
        folderId,
        favourite: value.favourite === true,
        description:
          typeof value.description === 'string'
            ? value.description.slice(0, MAX_DESCRIPTION)
            : defaults.description,
        createdAt: defaults.createdAt,
        modifiedAt: toTimestamp(value.modifiedAt, defaults.createdAt),
        lastUsedAt:
          typeof value.lastUsedAt === 'number' && Number.isFinite(value.lastUsedAt)
            ? value.lastUsedAt
            : null,
      };
    }
  } else if (raw.entries !== undefined) {
    repairs.push('Library entries were not an object — ignored them.');
  }

  /* An entry cannot reference a folder that is not there. */
  const folderIds = new Set(folders.map((f) => f.id));
  for (const [presetId, entry] of Object.entries(entries)) {
    if (entry.folderId !== null && !folderIds.has(entry.folderId)) {
      repairs.push(
        `Preset "${presetId}" pointed at a folder that does not exist — moved it out of folders.`,
      );
      entry.folderId = null;
    }
  }

  const sort: PresetSort = SORT_OPTIONS.some((o) => o.value === raw.sort)
    ? (raw.sort as PresetSort)
    : 'name';
  if (raw.sort !== undefined && sort !== raw.sort) {
    repairs.push(`Unknown sort order "${String(raw.sort)}" — used "name".`);
  }

  return {
    state: { version: PRESET_LIBRARY_SCHEMA_VERSION, folders, entries, sort },
    repairs,
  };
}

/* ------------------------------------------------------------------ *
 * Folders
 * ------------------------------------------------------------------ */

export interface FolderAction {
  state: PresetLibraryState;
  ok: boolean;
  /** Set when the action was refused; safe to show to the user. */
  error?: string;
  folderId?: string;
}

function refuse(state: PresetLibraryState, error: string): FolderAction {
  return { state, ok: false, error };
}

/** Folder names are compared case-insensitively, but stored as typed. */
function nameTaken(state: PresetLibraryState, name: string, exceptId?: string): boolean {
  const needle = name.trim().toLowerCase();
  return state.folders.some((f) => f.id !== exceptId && f.name.trim().toLowerCase() === needle);
}

export function createFolder(
  state: PresetLibraryState,
  name: string,
  options: { id?: string; now?: number } = {},
): FolderAction {
  const now = options.now ?? Date.now();
  const trimmed = name.trim().slice(0, MAX_FOLDER_NAME);
  if (!trimmed) return refuse(state, 'Give the folder a name.');
  if (state.folders.length >= MAX_FOLDERS) {
    return refuse(state, `You have reached the limit of ${MAX_FOLDERS} folders.`);
  }
  if (nameTaken(state, trimmed)) {
    return refuse(state, `A folder called “${trimmed}” already exists.`);
  }
  const folder: PresetFolder = { id: options.id ?? newFolderId(now), name: trimmed, createdAt: now };
  return { state: { ...state, folders: [...state.folders, folder] }, ok: true, folderId: folder.id };
}

export function renameFolder(
  state: PresetLibraryState,
  folderId: string,
  name: string,
): FolderAction {
  const folder = state.folders.find((f) => f.id === folderId);
  if (!folder) return refuse(state, 'That folder no longer exists.');
  const trimmed = name.trim().slice(0, MAX_FOLDER_NAME);
  if (!trimmed) return refuse(state, 'Give the folder a name.');
  if (trimmed === folder.name) return { state, ok: true, folderId };
  if (nameTaken(state, trimmed, folderId)) {
    return refuse(state, `A folder called “${trimmed}” already exists.`);
  }
  return {
    state: {
      ...state,
      folders: state.folders.map((f) => (f.id === folderId ? { ...f, name: trimmed } : f)),
    },
    ok: true,
    folderId,
  };
}

/**
 * Deletes a folder. Its crosshairs are **not** deleted — they move to "no
 * folder", because a folder is a way of looking at presets, not a container that
 * owns them.
 */
export function deleteFolder(state: PresetLibraryState, folderId: string): FolderAction {
  const folder = state.folders.find((f) => f.id === folderId);
  if (!folder) return refuse(state, 'That folder no longer exists.');

  const entries: Record<string, PresetEntry> = {};
  for (const [presetId, entry] of Object.entries(state.entries)) {
    entries[presetId] = entry.folderId === folderId ? { ...entry, folderId: null } : entry;
  }
  return {
    state: { ...state, folders: state.folders.filter((f) => f.id !== folderId), entries },
    ok: true,
    folderId,
  };
}

/* ------------------------------------------------------------------ *
 * Entries
 * ------------------------------------------------------------------ */

/**
 * Returns the entry for a preset, creating a default one if there is none.
 *
 * Built-in presets have no entry until the user does something with them, so
 * 250+ empty records are not written to storage on first run.
 */
export function entryFor(state: PresetLibraryState, presetId: string, now = Date.now()): PresetEntry {
  return state.entries[presetId] ?? entryDefaults(now);
}

function withEntry(
  state: PresetLibraryState,
  presetId: string,
  update: (entry: PresetEntry) => PresetEntry,
  now = Date.now(),
): PresetLibraryState {
  return {
    ...state,
    entries: { ...state.entries, [presetId]: update(entryFor(state, presetId, now)) },
  };
}

export function movePreset(
  state: PresetLibraryState,
  presetId: string,
  folderId: string | null,
): FolderAction {
  if (folderId !== null && !state.folders.some((f) => f.id === folderId)) {
    return refuse(state, 'That folder no longer exists.');
  }
  return { state: withEntry(state, presetId, (e) => ({ ...e, folderId })), ok: true };
}

export function setFavourite(
  state: PresetLibraryState,
  presetId: string,
  favourite: boolean,
): PresetLibraryState {
  return withEntry(state, presetId, (e) => ({ ...e, favourite }));
}

export function toggleFavourite(
  state: PresetLibraryState,
  presetId: string,
): PresetLibraryState {
  return withEntry(state, presetId, (e) => ({ ...e, favourite: !e.favourite }));
}

export function setDescription(
  state: PresetLibraryState,
  presetId: string,
  description: string,
): PresetLibraryState {
  const text = description.slice(0, MAX_DESCRIPTION);
  return withEntry(state, presetId, (e) => ({ ...e, description: text }));
}

/** Records that the preset's own values changed. */
export function markModified(
  state: PresetLibraryState,
  presetId: string,
  now = Date.now(),
): PresetLibraryState {
  return withEntry(state, presetId, (e) => ({ ...e, modifiedAt: now }), now);
}

/** Records that the preset was applied to the overlay. */
export function markUsed(
  state: PresetLibraryState,
  presetId: string,
  now = Date.now(),
): PresetLibraryState {
  return withEntry(state, presetId, (e) => ({ ...e, lastUsedAt: now }), now);
}

/** Sets the sort order used across the library views. */
export function setSort(state: PresetLibraryState, sort: PresetSort): PresetLibraryState {
  return SORT_OPTIONS.some((o) => o.value === sort) ? { ...state, sort } : state;
}

/**
 * Drops entries whose preset no longer exists.
 *
 * Called with the ids the app can actually resolve, so deleting a custom preset
 * does not leave its organisation behind to be resurrected if the id is reused.
 */
export function pruneOrphans(
  state: PresetLibraryState,
  knownIds: Iterable<string>,
): { state: PresetLibraryState; removed: string[] } {
  const known = new Set(knownIds);
  const entries: Record<string, PresetEntry> = {};
  const removed: string[] = [];
  for (const [presetId, entry] of Object.entries(state.entries)) {
    if (known.has(presetId)) entries[presetId] = entry;
    else removed.push(presetId);
  }
  return { state: removed.length ? { ...state, entries } : state, removed };
}

/* ------------------------------------------------------------------ *
 * Querying
 * ------------------------------------------------------------------ */

export interface PresetView {
  preset: CrosshairConfig;
  entry: PresetEntry;
  /** Resolved folder name, or null when the preset is not in a folder. */
  folderName: string | null;
}

/** Joins presets with their organisation. Presets without an entry still appear. */
export function decorate(
  presets: readonly CrosshairConfig[],
  state: PresetLibraryState,
  now = Date.now(),
): PresetView[] {
  const folderNames = new Map(state.folders.map((f) => [f.id, f.name]));
  return presets.map((preset) => {
    const entry = entryFor(state, preset.id, now);
    return {
      preset,
      entry,
      folderName: entry.folderId ? (folderNames.get(entry.folderId) ?? null) : null,
    };
  });
}

/**
 * Case-insensitive search over name, description and folder.
 *
 * Empty or whitespace-only queries match everything — an empty search box is not
 * a request for zero results.
 */
export function searchViews(views: readonly PresetView[], query: string): PresetView[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [...views];
  const terms = needle.split(/\s+/);
  return views.filter((view) => {
    const haystack = [
      view.preset.name,
      view.entry.description,
      view.folderName ?? '',
      view.preset.game,
      view.entry.favourite ? 'favourite favorite starred' : '',
    ]
      .join(' ')
      .toLowerCase();
    return terms.every((term) => haystack.includes(term));
  });
}

/** Favourites first, then the chosen ordering. A favourite is never buried. */
export function sortViews(views: readonly PresetView[], sort: PresetSort): PresetView[] {
  const byName = (a: PresetView, b: PresetView) =>
    a.preset.name.localeCompare(b.preset.name, undefined, { numeric: true, sensitivity: 'base' });

  const byTimestamp = (pick: (v: PresetView) => number | null) => (a: PresetView, b: PresetView) => {
    const av = pick(a);
    const bv = pick(b);
    // Nulls (never used) sort last rather than pretending to be oldest.
    if (av === null && bv === null) return byName(a, b);
    if (av === null) return 1;
    if (bv === null) return -1;
    return bv - av || byName(a, b);
  };

  const comparator =
    sort === 'name'
      ? byName
      : sort === 'created'
        ? byTimestamp((v) => v.entry.createdAt)
        : sort === 'modified'
          ? byTimestamp((v) => v.entry.modifiedAt)
          : byTimestamp((v) => v.entry.lastUsedAt);

  return [...views].sort((a, b) => {
    if (a.entry.favourite !== b.entry.favourite) return a.entry.favourite ? -1 : 1;
    return comparator(a, b);
  });
}

/** Presets in one folder. `folderId === null` selects the unfoldered ones. */
export function viewsInFolder(views: readonly PresetView[], folderId: string | null): PresetView[] {
  return views.filter((v) => v.entry.folderId === folderId);
}

export function folderCounts(views: readonly PresetView[]): Map<string | null, number> {
  const counts = new Map<string | null, number>();
  for (const view of views) {
    const key = view.entry.folderId;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}
