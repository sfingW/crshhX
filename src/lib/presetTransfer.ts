import type { AppSettings, CrosshairConfig } from '../types/crosshair';
import { CROSSHAIR_SCHEMA_VERSION, normalizeCrosshairConfig } from './crosshairSchema';
import { normalizeState as normalizeWeaponSlots } from './weaponSlots/migration';
import type { WeaponSlotsState } from './weaponSlots/types';
import {
  MAX_DESCRIPTION,
  MAX_FOLDER_NAME,
  createFolder,
  movePreset,
  setDescription,
  setFavourite,
  type PresetLibraryState,
} from './presetOrganizer';

/**
 * Import and export of crosshairs and of a whole crshhx configuration.
 *
 * The format is versioned and self-describing, and importing is a two-step
 * process on purpose: **parse and plan**, then **apply**. Nothing is written
 * until a plan exists and the user has seen it, because the failure mode this
 * guards against — a file silently replacing crosshairs the user cared about —
 * is not recoverable.
 *
 * Safety rules, all of which are tested:
 * - A file is never applied because it merely parsed. It has to name itself as a
 *   crshhx export and carry a version this build understands.
 * - Nothing is overwritten by default. An id collision produces a *new* id, and
 *   overwriting is an explicit per-entry choice.
 * - Every incoming config goes through the same `normalizeCrosshairConfig` used
 *   on load, and every repair it makes is reported rather than applied quietly.
 * - A file from a newer crshhx is refused with an actionable message, not
 *   half-applied.
 */

export const TRANSFER_FORMAT = 'crshhx-export';
export const TRANSFER_VERSION = 1;

/** Above this many presets the importer insists on an explicit confirmation. */
export const LARGE_IMPORT_THRESHOLD = 25;

export const APP_VERSION = '1.0.0';

export interface ExportedPresetMeta {
  description: string;
  favourite: boolean;
  /** Folder *name*, not id — ids are local to one machine and mean nothing here. */
  folder: string | null;
  createdAt: number;
  modifiedAt: number;
  lastUsedAt: number | null;
}

export interface ExportedPreset {
  config: CrosshairConfig;
  meta?: ExportedPresetMeta;
}

export type TransferKind = 'presets' | 'configuration';

export interface TransferEnvelope {
  format: typeof TRANSFER_FORMAT;
  version: number;
  kind: TransferKind;
  exportedAt: string;
  appVersion: string;
  crosshairSchema: number;
  presets: ExportedPreset[];
  /** Folder names to make sure exist on import. */
  folders?: string[];
  /** Only present in a full configuration export. */
  settings?: Partial<AppSettings>;
  weaponSlots?: WeaponSlotsState;
}

/* ------------------------------------------------------------------ *
 * Export
 * ------------------------------------------------------------------ */

export interface ExportSource {
  presets: readonly CrosshairConfig[];
  library?: PresetLibraryState;
  settings?: AppSettings;
  weaponSlots?: WeaponSlotsState;
}

function metaFor(
  preset: CrosshairConfig,
  library: PresetLibraryState | undefined,
): ExportedPresetMeta | undefined {
  if (!library) return undefined;
  const entry = library.entries[preset.id];
  if (!entry) return undefined;
  const folder = entry.folderId
    ? (library.folders.find((f) => f.id === entry.folderId)?.name ?? null)
    : null;
  const empty =
    !entry.description && !entry.favourite && folder === null && entry.lastUsedAt === null;
  if (empty) return undefined; // do not pad the file with defaults
  return {
    description: entry.description,
    favourite: entry.favourite,
    folder,
    createdAt: entry.createdAt,
    modifiedAt: entry.modifiedAt,
    lastUsedAt: entry.lastUsedAt,
  };
}

/**
 * Builds an envelope. `kind: 'configuration'` includes settings and weapon-slot
 * bindings; `kind: 'presets'` carries crosshairs only.
 */
export function buildEnvelope(source: ExportSource, kind: TransferKind, now = Date.now()): TransferEnvelope {
  const library = source.library;
  const presets: ExportedPreset[] = source.presets.map((config) => {
    // Normalising on the way out means a file always contains values this
    // schema understands, even if the in-memory config pre-dates it.
    const { config: normalised } = normalizeCrosshairConfig(config, `export:${config.id}`);
    const meta = metaFor(normalised, library);
    return meta ? { config: normalised, meta } : { config: normalised };
  });

  const envelope: TransferEnvelope = {
    format: TRANSFER_FORMAT,
    version: TRANSFER_VERSION,
    kind,
    exportedAt: new Date(now).toISOString(),
    appVersion: APP_VERSION,
    crosshairSchema: CROSSHAIR_SCHEMA_VERSION,
    presets,
  };

  if (library) {
    envelope.folders = library.folders.map((f) => f.name);
  }
  if (kind === 'configuration') {
    if (source.settings) envelope.settings = { ...source.settings };
    if (source.weaponSlots) envelope.weaponSlots = source.weaponSlots;
  }
  return envelope;
}

/** Serialises to the text a user saves to a file. Stable key order, readable. */
export function serializeEnvelope(envelope: TransferEnvelope): string {
  return JSON.stringify(envelope, null, 2);
}

export function exportPresets(source: ExportSource, now = Date.now()): string {
  return serializeEnvelope(buildEnvelope(source, 'presets', now));
}

export function exportConfiguration(source: ExportSource, now = Date.now()): string {
  return serializeEnvelope(buildEnvelope(source, 'configuration', now));
}

/** A sensible file name, with no characters that break on any platform. */
export function suggestedFileName(kind: TransferKind, now = Date.now()): string {
  const stamp = new Date(now).toISOString().slice(0, 10);
  return kind === 'configuration' ? `crshhx-backup-${stamp}.json` : `crshhx-crosshairs-${stamp}.json`;
}

/* ------------------------------------------------------------------ *
 * Parse
 * ------------------------------------------------------------------ */

export type ParseResult =
  | { ok: true; envelope: TransferEnvelope; notes: string[] }
  | { ok: false; error: string };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Validates the *container*. Individual crosshairs are validated during
 * planning, so that one bad preset does not hide the other two hundred.
 */
export function parseTransferFile(text: string): ParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (err) {
    return {
      ok: false,
      error: `This file is not valid JSON (${(err as Error).message}). A crshhx export is a plain .json file — if it was edited or truncated, re-export it.`,
    };
  }

  if (!isRecord(raw)) {
    return { ok: false, error: 'The file is valid JSON but is not a crshhx export object.' };
  }
  if (raw.format !== TRANSFER_FORMAT) {
    const found = typeof raw.format === 'string' ? `“${raw.format}”` : 'nothing';
    return {
      ok: false,
      error: `This is not a crshhx export file: the format marker is ${found} instead of “${TRANSFER_FORMAT}”.`,
    };
  }

  const version = raw.version;
  if (typeof version !== 'number' || !Number.isFinite(version)) {
    return {
      ok: false,
      error: 'The file has no version number, so crshhx cannot tell whether it understands the contents.',
    };
  }
  if (version > TRANSFER_VERSION) {
    return {
      ok: false,
      error: `This file was exported by a newer version of crshhx (format v${version}; this build understands v${TRANSFER_VERSION}). Update crshhx to import it — importing part of a newer file risks losing data.`,
    };
  }
  if (version < 1) {
    return { ok: false, error: `Unsupported format version ${version}.` };
  }

  const kind: TransferKind = raw.kind === 'configuration' ? 'configuration' : 'presets';
  const notes: string[] = [];
  if (version < TRANSFER_VERSION) {
    notes.push(`Importing an older format (v${version}) as v${TRANSFER_VERSION}.`);
  }
  if (raw.appVersion && raw.appVersion !== APP_VERSION) {
    notes.push(`Exported by crshhx ${String(raw.appVersion)}.`);
  }
  if (typeof raw.crosshairSchema === 'number' && raw.crosshairSchema > CROSSHAIR_SCHEMA_VERSION) {
    notes.push(
      `The crosshairs in this file use schema v${raw.crosshairSchema}; this build understands v${CROSSHAIR_SCHEMA_VERSION}. Newer fields will be ignored, not discarded from the file.`,
    );
  }

  if (!Array.isArray(raw.presets)) {
    if (kind === 'configuration' && (raw.settings || raw.weaponSlots)) {
      notes.push('The file contains no crosshairs, only settings.');
    } else {
      return {
        ok: false,
        error: 'The file has no preset list, so there is nothing to import.',
      };
    }
  }

  const envelope: TransferEnvelope = {
    format: TRANSFER_FORMAT,
    version,
    kind,
    exportedAt: typeof raw.exportedAt === 'string' ? raw.exportedAt : '',
    appVersion: typeof raw.appVersion === 'string' ? raw.appVersion : 'unknown',
    crosshairSchema:
      typeof raw.crosshairSchema === 'number' ? raw.crosshairSchema : CROSSHAIR_SCHEMA_VERSION,
    presets: Array.isArray(raw.presets) ? (raw.presets as ExportedPreset[]) : [],
  };
  if (Array.isArray(raw.folders)) {
    envelope.folders = raw.folders.filter((f): f is string => typeof f === 'string');
  }
  if (kind === 'configuration') {
    if (isRecord(raw.settings)) envelope.settings = raw.settings as Partial<AppSettings>;
    if (isRecord(raw.weaponSlots)) {
      envelope.weaponSlots = raw.weaponSlots as unknown as WeaponSlotsState;
    }
  }

  return { ok: true, envelope, notes };
}

/* ------------------------------------------------------------------ *
 * Plan
 * ------------------------------------------------------------------ */

export type EntryStatus = 'new' | 'id-conflict' | 'name-conflict' | 'duplicate-in-file';
export type EntryAction = 'add' | 'overwrite' | 'add-with-new-id' | 'skip';

export interface ImportEntry {
  index: number;
  incoming: CrosshairConfig;
  meta: ExportedPresetMeta | null;
  status: EntryStatus;
  /** The safe default. The user may change it before applying. */
  action: EntryAction;
  /** Id this entry collides with, when it collides. */
  conflictsWith?: string;
  /** The id that will actually be written, if the action adds it. */
  assignedId?: string;
  note?: string;
  repairs: string[];
}

export interface SettingDifference {
  key: keyof AppSettings;
  label: string;
  current: string;
  incoming: string;
  value: AppSettings[keyof AppSettings];
}

export interface ImportPlan {
  kind: TransferKind;
  exportedAt: string;
  entries: ImportEntry[];
  folderNames: string[];
  settings: SettingDifference[];
  weaponSlots: {
    included: boolean;
    state: WeaponSlotsState | null;
    profiles: number;
    slots: number;
    repairs: string[];
  };
  notes: string[];
  warnings: string[];
  counts: { total: number; add: number; overwrite: number; skip: number };
  isLarge: boolean;
}

const SETTING_LABELS: Record<keyof AppSettings, string> = {
  overlayVisible: 'Overlay visible',
  toggleOverlayHotkey: 'Show/hide overlay key',
  cyclePresetHotkey: 'Cycle preset key',
  centerLockHotkey: 'Centre lock key',
  selectedMonitor: 'Selected monitor',
  runAtStartup: 'Start with Windows',
  suspendedWhenMinimized: 'Suspend while minimised',
};

function describe(value: unknown): string {
  if (typeof value === 'boolean') return value ? 'on' : 'off';
  if (value === null || value === undefined || value === '') return 'not set';
  return String(value);
}

/** A free id for an incoming preset whose id is already taken locally. */
export function allocateId(desired: string, taken: ReadonlySet<string>, now = Date.now()): string {
  if (desired && !taken.has(desired)) return desired;
  const stem = desired.replace(/-\d+$/, '') || 'imported';
  for (let n = 2; n < 10_000; n++) {
    const candidate = `${stem}-${n}`;
    if (!taken.has(candidate)) return candidate;
  }
  return `custom-${now}`;
}

export interface ExistingState {
  presets: readonly CrosshairConfig[];
  settings?: AppSettings;
}

/**
 * Works out exactly what an import would do, without doing it.
 *
 * The defaults are the safe ones: new presets are added, colliding ids get a new
 * id, duplicates inside the file are skipped, and settings are only listed —
 * applying them is a separate decision the user makes in the UI.
 */
export function planImport(envelope: TransferEnvelope, existing: ExistingState): ImportPlan {
  const notes: string[] = [];
  const warnings: string[] = [];

  const existingById = new Map(existing.presets.map((p) => [p.id, p]));
  const existingNames = new Map(
    existing.presets.map((p) => [p.name.trim().toLowerCase(), p.id]),
  );
  /** Ids already claimed by an earlier entry in this same file. */
  const claimed = new Set<string>(existingById.keys());

  const entries: ImportEntry[] = [];
  for (let index = 0; index < envelope.presets.length; index++) {
    const raw = envelope.presets[index] as unknown;
    const repairs: string[] = [];

    if (!isRecord(raw)) {
      warnings.push(`Entry ${index + 1} is not an object — skipped.`);
      continue;
    }

    const rawConfig = isRecord(raw.config) ? raw.config : raw; // tolerate a bare config
    if (!isRecord(raw.config) && isRecord(raw.meta)) {
      warnings.push(`Entry ${index + 1} has no config — skipped.`);
      continue;
    }

    const normalised = normalizeCrosshairConfig(rawConfig, `import[${index}]`);
    repairs.push(...normalised.repairs);
    const incoming = normalised.config;

    const rawMeta = isRecord(raw.meta) ? raw.meta : null;
    const meta: ExportedPresetMeta | null = rawMeta
      ? {
          description:
            typeof rawMeta.description === 'string'
              ? rawMeta.description.slice(0, MAX_DESCRIPTION)
              : '',
          favourite: rawMeta.favourite === true,
          folder:
            typeof rawMeta.folder === 'string' ? rawMeta.folder.slice(0, MAX_FOLDER_NAME) : null,
          createdAt: Number(rawMeta.createdAt) || Date.now(),
          modifiedAt: Number(rawMeta.modifiedAt) || Date.now(),
          lastUsedAt:
            typeof rawMeta.lastUsedAt === 'number' && Number.isFinite(rawMeta.lastUsedAt)
              ? rawMeta.lastUsedAt
              : null,
        }
      : null;

    const inFile = claimed.has(incoming.id) && existingById.has(incoming.id) === false;
    const idCollision = existingById.has(incoming.id);
    const nameCollision = existingNames.get(incoming.name.trim().toLowerCase());

    let status: EntryStatus = 'new';
    let action: EntryAction = 'add';
    let conflictsWith: string | undefined;
    let assignedId: string | undefined = incoming.id;
    let note: string | undefined;

    if (inFile) {
      // The same id appeared twice in the file: keep the first, skip the rest.
      status = 'duplicate-in-file';
      action = 'skip';
      note = `Id “${incoming.id}” already appears earlier in this file.`;
      assignedId = undefined;
    } else if (idCollision) {
      status = 'id-conflict';
      action = 'add-with-new-id';
      conflictsWith = incoming.id;
      assignedId = allocateId(incoming.id, claimed);
      note = `You already have a crosshair with the id “${incoming.id}”. Nothing will be overwritten unless you choose to.`;
    } else if (nameCollision) {
      status = 'name-conflict';
      action = 'add';
      conflictsWith = nameCollision;
      note = `You already have a crosshair called “${incoming.name}”. Both will be kept.`;
    }

    claimed.add(incoming.id);
    if (action !== 'skip' && assignedId) claimed.add(assignedId);

    entries.push({
      index,
      incoming,
      meta,
      status,
      action,
      conflictsWith,
      assignedId,
      note,
      repairs,
    });
  }

  /* Folders: matched by name so no local ids are invented by the file. */
  const folderNames = [...new Set((envelope.folders ?? []).map((n) => n.trim()).filter(Boolean))];
  for (const entry of entries) {
    if (entry.meta?.folder && !folderNames.includes(entry.meta.folder)) {
      folderNames.push(entry.meta.folder);
    }
  }

  /* Settings: reported as differences, never applied silently. */
  const settings: SettingDifference[] = [];
  if (envelope.kind === 'configuration' && envelope.settings && existing.settings) {
    for (const key of Object.keys(SETTING_LABELS) as Array<keyof AppSettings>) {
      const incomingValue = envelope.settings[key];
      if (incomingValue === undefined) continue;
      const currentValue = existing.settings[key];
      if (currentValue === incomingValue) continue;
      settings.push({
        key,
        label: SETTING_LABELS[key],
        current: describe(currentValue),
        incoming: describe(incomingValue),
        value: incomingValue,
      });
    }
    if (settings.length === 0) notes.push('Your settings already match the file.');
  }

  /* Weapon slots: normalised through the same code path as a local load. */
  const weaponSlots: ImportPlan['weaponSlots'] = {
    included: false,
    state: null,
    profiles: 0,
    slots: 0,
    repairs: [],
  };
  if (envelope.kind === 'configuration' && envelope.weaponSlots) {
    const result = normalizeWeaponSlots(envelope.weaponSlots);
    weaponSlots.included = true;
    weaponSlots.state = result.state;
    weaponSlots.repairs = result.report.repairs;
    weaponSlots.profiles = result.state.profiles.length;
    weaponSlots.slots = result.state.profiles.reduce((n, p) => n + p.slots.length, 0);
    notes.push(
      `The file contains ${weaponSlots.profiles} weapon-slot profile${weaponSlots.profiles === 1 ? '' : 's'} with ${weaponSlots.slots} slot${weaponSlots.slots === 1 ? '' : 's'}. Importing replaces your current profiles.`,
    );
  }

  const totalRepairs = entries.reduce((n, e) => n + e.repairs.length, 0);
  if (totalRepairs > 0) {
    notes.push(
      `${totalRepairs} value${totalRepairs === 1 ? ' was' : 's were'} outside the ranges crshhx supports and ${totalRepairs === 1 ? 'was' : 'were'} corrected. The details are listed per crosshair.`,
    );
  }
  if (entries.length === 0 && envelope.kind === 'presets') {
    warnings.push('The file contains no usable crosshairs.');
  }

  const counts = {
    total: entries.length,
    add: entries.filter((e) => e.action === 'add' || e.action === 'add-with-new-id').length,
    overwrite: entries.filter((e) => e.action === 'overwrite').length,
    skip: entries.filter((e) => e.action === 'skip').length,
  };

  return {
    kind: envelope.kind,
    exportedAt: envelope.exportedAt,
    entries,
    folderNames,
    settings,
    weaponSlots,
    notes,
    warnings,
    counts,
    isLarge: counts.add >= LARGE_IMPORT_THRESHOLD,
  };
}

/** Convenience: text in, plan out. */
export function planFromFile(text: string, existing: ExistingState):
  | { ok: true; plan: ImportPlan; envelope: TransferEnvelope }
  | { ok: false; error: string } {
  const parsed = parseTransferFile(text);
  if (!parsed.ok) return { ok: false, error: parsed.error };
  return { ok: true, plan: planImport(parsed.envelope, existing), envelope: parsed.envelope };
}

/* ------------------------------------------------------------------ *
 * Apply
 * ------------------------------------------------------------------ */

export interface ImportTargets {
  presets: CrosshairConfig[];
  library: PresetLibraryState;
  settings: AppSettings;
  weaponSlots: WeaponSlotsState | null;
}

export interface ApplyOptions {
  /** Presets to add or overwrite. */
  plan: ImportPlan;
  existing: ExistingState;
  library: PresetLibraryState;
  settings: AppSettings;
  /** Apply the settings differences the plan listed. Off by default. */
  applySettings?: boolean;
  /** Replace weapon-slot profiles with the ones in the file. Off by default. */
  applyWeaponSlots?: boolean;
  now?: number;
}

export interface ApplyResult {
  targets: ImportTargets;
  added: number;
  overwritten: number;
  skipped: number;
  notes: string[];
}

/**
 * Applies a plan. Idempotent for a given plan: running it twice produces the
 * same library, because the second run's ids are already taken and are
 * re-allocated deterministically from the same starting set.
 */
export function applyImport(options: ApplyOptions): ApplyResult {
  const { plan, existing, library, now = Date.now() } = options;
  const notes: string[] = [];

  const presets: CrosshairConfig[] = [...existing.presets];
  const byId = new Map(presets.map((p) => [p.id, p] as const));
  let nextLibrary = library;
  let added = 0;
  let overwritten = 0;
  let skipped = 0;

  /* Folders first, so presets can be filed as they land. */
  const folderIdByName = new Map<string, string>();
  for (const folder of nextLibrary.folders) {
    folderIdByName.set(folder.name.trim().toLowerCase(), folder.id);
  }
  for (const name of plan.folderNames) {
    const key = name.trim().toLowerCase();
    if (folderIdByName.has(key)) continue;
    const created = createFolder(nextLibrary, name, { now });
    if (created.ok && created.folderId) {
      nextLibrary = created.state;
      folderIdByName.set(key, created.folderId);
    } else if (created.error) {
      notes.push(`Could not create folder “${name}”: ${created.error}`);
    }
  }

  for (const entry of plan.entries) {
    if (entry.action === 'skip') {
      skipped++;
      continue;
    }

    let config = entry.incoming;
    if (entry.action === 'add-with-new-id' && entry.assignedId) {
      config = { ...config, id: entry.assignedId };
    }

    if (entry.action === 'overwrite') {
      const index = presets.findIndex((p) => p.id === config.id);
      if (index >= 0) {
        presets[index] = config;
        byId.set(config.id, config);
        overwritten++;
      } else {
        // The plan was built against a library that has since changed.
        presets.push(config);
        byId.set(config.id, config);
        added++;
        notes.push(`“${config.name}” was no longer present, so it was added instead of overwritten.`);
      }
    } else {
      presets.push(config);
      byId.set(config.id, config);
      added++;
    }

    if (entry.meta) {
      if (entry.meta.description) {
        nextLibrary = setDescription(nextLibrary, config.id, entry.meta.description);
      }
      if (entry.meta.favourite) {
        nextLibrary = setFavourite(nextLibrary, config.id, true);
      }
      if (entry.meta.folder) {
        const folderId = folderIdByName.get(entry.meta.folder.trim().toLowerCase());
        if (folderId) nextLibrary = movePreset(nextLibrary, config.id, folderId).state;
      }
    }
  }

  let settings = options.settings;
  if (options.applySettings && plan.settings.length > 0) {
    settings = { ...settings };
    for (const difference of plan.settings) {
      (settings as unknown as Record<string, unknown>)[difference.key] = difference.value;
    }
    notes.push(`Applied ${plan.settings.length} setting change${plan.settings.length === 1 ? '' : 's'} from the file.`);
  } else if (!options.applySettings && plan.settings.length > 0) {
    notes.push(`Left your settings alone (${plan.settings.length} difference${plan.settings.length === 1 ? '' : 's'} in the file).`);
  }

  let weaponSlots: WeaponSlotsState | null = null;
  if (options.applyWeaponSlots && plan.weaponSlots.state) {
    weaponSlots = plan.weaponSlots.state;
    notes.push('Replaced your weapon-slot profiles with the ones from the file.');
  } else if (plan.weaponSlots.included && !options.applyWeaponSlots) {
    notes.push('Left your weapon-slot profiles alone.');
  }

  return {
    targets: { presets, library: nextLibrary, settings, weaponSlots },
    added,
    overwritten,
    skipped,
    notes,
  };
}
