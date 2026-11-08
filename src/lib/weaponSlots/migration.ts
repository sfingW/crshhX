import { MAX_SLOTS_PER_PROFILE, dedupeSlotBindings } from './bindingRules';
import {
  DEFAULT_PROFILE_ID,
  WEAPON_SLOTS_SCHEMA_VERSION,
  createDefaultProfile,
  createDefaultState,
  newProfileId,
  newSlotId,
} from './defaults';
import { isKnownCode, makeBinding, normalizeModifiers, parseLegacyBinding } from './keys';
import { normalizeProcessNames } from './slotStore';
import type {
  AppSettings,
} from '../../types/crosshair';
import type {
  KeyModifier,
  PresetIndex,
  SlotKeyBinding,
  WeaponSlot,
  WeaponSlotProfile,
  WeaponSlotsState,
} from './types';
import { pruneMissingAssignments } from './presetIndex';

/**
 * Persistence schema, normalisation and migration for Weapon Slot Crosshairs.
 *
 * Design rules:
 *
 *  - Weapon slots live in their **own** storage key. The pre-existing
 *    `crshhx_app_settings` blob is never rewritten by this feature, so a user
 *    upgrading keeps their overlay hotkeys, monitor choice and startup
 *    preferences byte-for-byte.
 *  - Loading is total: any input — `null`, a truncated string, a hand-edited
 *    JSON file, a blob from an older schema — produces a valid state. Repair is
 *    recorded in a report so the UI (and the tests) can see what happened
 *    instead of failures being silent.
 *  - Repair never invents data. A binding we cannot parse becomes *unbound*; a
 *    preset id we cannot resolve becomes *unassigned*. Both are visible states
 *    in the UI rather than a silently substituted crosshair.
 */

export const WEAPON_SLOTS_STORAGE_KEY = 'crshhx_weapon_slots';

/** Small runtime-only key: which slot is live. Written debounced, never per keypress. */
export const WEAPON_SLOTS_RUNTIME_KEY = 'crshhx_weapon_slots_runtime';

export interface MigrationReport {
  /** True when nothing had to be changed. */
  clean: boolean;
  fromVersion: number;
  toVersion: number;
  repairs: string[];
  created: boolean;
}

const VALID_MODIFIERS: KeyModifier[] = ['ctrl', 'alt', 'shift', 'meta'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asString(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

function asBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === 'string');
}

/* ------------------------------------------------------------------ *
 * Binding normalisation
 * ------------------------------------------------------------------ */

/**
 * Accepts every binding shape crshhx has ever written:
 *   - canonical object `{ code, modifiers, kind }`
 *   - older object `{ key: 'Alt+1' }`
 *   - bare accelerator string `'Alt+1'` / `'1'` / `'num3'`
 * Returns `null` (unbound) for anything it cannot understand.
 */
export function normalizeBinding(
  raw: unknown,
  repairs: string[],
  context: string,
): SlotKeyBinding | null {
  if (raw === null || raw === undefined || raw === '') return null;

  if (typeof raw === 'string') {
    const parsed = parseLegacyBinding(raw);
    if (!parsed) {
      repairs.push(`${context}: dropped unrecognised key "${raw}".`);
      return null;
    }
    repairs.push(`${context}: migrated legacy key string "${raw}".`);
    return parsed;
  }

  if (!isRecord(raw)) {
    repairs.push(`${context}: dropped malformed binding.`);
    return null;
  }

  // Modern canonical form.
  if (typeof raw.code === 'string') {
    const code = raw.code;
    if (!isKnownCode(code)) {
      repairs.push(`${context}: dropped binding for unknown input "${code}".`);
      return null;
    }
    const modifiers = Array.isArray(raw.modifiers)
      ? normalizeModifiers(raw.modifiers.filter((m): m is KeyModifier =>
          typeof m === 'string' && VALID_MODIFIERS.includes(m as KeyModifier)))
      : [];
    return makeBinding(code, modifiers);
  }

  // Legacy `{ key: ... }` form.
  const legacyKey = raw.key ?? raw.accelerator ?? raw.binding;
  if (typeof legacyKey === 'string') {
    const parsed = parseLegacyBinding(legacyKey);
    if (!parsed) {
      repairs.push(`${context}: dropped unrecognised legacy key "${legacyKey}".`);
      return null;
    }
    repairs.push(`${context}: migrated legacy binding "${legacyKey}".`);
    return parsed;
  }

  repairs.push(`${context}: dropped binding with no key.`);
  return null;
}

/* ------------------------------------------------------------------ *
 * Slot / profile normalisation
 * ------------------------------------------------------------------ */

function normalizeSlot(
  raw: unknown,
  index: number,
  profileLabel: string,
  repairs: string[],
): WeaponSlot | null {
  if (!isRecord(raw)) {
    repairs.push(`${profileLabel}: dropped malformed slot at position ${index + 1}.`);
    return null;
  }

  const context = `${profileLabel} slot ${index + 1}`;

  // Accept both the current field names and the older aliases.
  const rawName = raw.name ?? raw.label ?? raw.title;
  const rawPreset = raw.presetId ?? raw.crosshairId ?? raw.preset ?? raw.crosshair;
  const rawEnabled = raw.enabled ?? raw.active;
  const rawBinding = raw.binding ?? raw.key ?? raw.accelerator;

  const id = typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : newSlotId();

  const presetId =
    typeof rawPreset === 'string' && rawPreset.trim() ? rawPreset.trim() : null;

  if (rawPreset !== null && rawPreset !== undefined && presetId === null) {
    repairs.push(`${context}: dropped non-string crosshair reference.`);
  }

  return {
    id,
    index: index + 1,
    name: asString(rawName, `Slot ${index + 1}`).slice(0, 48),
    binding: normalizeBinding(rawBinding, repairs, context),
    presetId,
    enabled: asBoolean(rawEnabled, true),
  };
}

function normalizeProfile(
  raw: unknown,
  repairs: string[],
  fallbackId: string,
): WeaponSlotProfile | null {
  if (!isRecord(raw)) return null;

  const id = typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : fallbackId;
  const name = asString(raw.name, 'Default').slice(0, 64);

  const rawSlots = Array.isArray(raw.slots) ? raw.slots : [];
  if (!Array.isArray(raw.slots) && raw.slots !== undefined) {
    repairs.push(`Profile "${name}": slots was not a list; rebuilt as empty.`);
  }

  const slots: WeaponSlot[] = [];
  for (const entry of rawSlots) {
    if (slots.length >= MAX_SLOTS_PER_PROFILE) {
      repairs.push(`Profile "${name}": truncated to ${MAX_SLOTS_PER_PROFILE} slots.`);
      break;
    }
    const slot = normalizeSlot(entry, slots.length, `Profile "${name}"`, repairs);
    if (slot) slots.push(slot);
  }

  return {
    id,
    name,
    matchProcessNames: normalizeProcessNames(asStringArray(raw.matchProcessNames)),
    restrictToMatchedProcesses: asBoolean(raw.restrictToMatchedProcesses, false),
    isDefault: asBoolean(raw.isDefault, false),
    slots: dedupeSlotBindings(slots),
  };
}

/**
 * v0 → v1 migration.
 *
 * The earliest shape this feature could have written was a flat slot list with
 * no profile concept: `{ enabled, slots: [...] }`. Wrap it in the default
 * profile so game-specific configurations can exist from v1 onwards.
 */
function migrateV0ToV1(raw: Record<string, unknown>, repairs: string[]): Record<string, unknown> {
  if (Array.isArray(raw.profiles)) return raw;

  repairs.push('Migrated flat slot list (v0) into the default profile (v1).');
  return {
    ...raw,
    version: 1,
    profiles: [
      {
        id: DEFAULT_PROFILE_ID,
        name: 'Default',
        matchProcessNames: [],
        restrictToMatchedProcesses: false,
        isDefault: true,
        slots: Array.isArray(raw.slots) ? raw.slots : [],
      },
    ],
    activeProfileId: DEFAULT_PROFILE_ID,
  };
}

export interface NormalizeResult {
  state: WeaponSlotsState;
  report: MigrationReport;
}

function createdResult(repairs: string[], clean: boolean): NormalizeResult {
  return {
    state: createDefaultState(),
    report: {
      clean,
      fromVersion: 0,
      toVersion: WEAPON_SLOTS_SCHEMA_VERSION,
      repairs,
      created: true,
    },
  };
}

/**
 * Total function: any input yields a valid, self-consistent state.
 *
 * Accepts either an already-parsed object or the serialised JSON string, so
 * there is exactly one code path from disk to a usable state and no way for a
 * caller to hand it the wrong shape and silently get defaults back.
 */
export function normalizeState(raw: unknown): NormalizeResult {
  const repairs: string[] = [];

  if (raw === null || raw === undefined || raw === '') {
    return createdResult([], true);
  }

  let candidate: unknown = raw;
  if (typeof candidate === 'string') {
    try {
      candidate = JSON.parse(candidate);
    } catch {
      return createdResult(['Stored weapon-slot data was not valid JSON; restored defaults.'], false);
    }
  }

  if (candidate === null || candidate === undefined) {
    return createdResult([], true);
  }

  if (!isRecord(candidate)) {
    return createdResult(['Stored weapon-slot data was not an object; restored defaults.'], false);
  }

  const parsed = candidate;
  const rawVersion = typeof parsed.version === 'number' ? parsed.version : 0;
  let working: Record<string, unknown> = parsed;

  if (rawVersion < 1) working = migrateV0ToV1(working, repairs);
  if (rawVersion > WEAPON_SLOTS_SCHEMA_VERSION) {
    repairs.push(
      `Stored data claims version ${rawVersion}, newer than this build understands (${WEAPON_SLOTS_SCHEMA_VERSION}); loading what is recognisable.`,
    );
  }

  const rawProfiles = Array.isArray(working.profiles) ? working.profiles : [];
  const profiles: WeaponSlotProfile[] = [];
  const seenIds = new Set<string>();

  for (const entry of rawProfiles) {
    const fallbackId = profiles.length === 0 ? DEFAULT_PROFILE_ID : newProfileId();
    const profile = normalizeProfile(entry, repairs, fallbackId);
    if (!profile) {
      repairs.push('Dropped a malformed profile.');
      continue;
    }
    if (seenIds.has(profile.id)) {
      repairs.push(`Profile "${profile.name}" had a duplicate id; assigned a new one.`);
      profile.id = newProfileId();
    }
    seenIds.add(profile.id);
    profiles.push(profile);
  }

  if (profiles.length === 0) {
    repairs.push('No usable profiles found; restored the default profile.');
    profiles.push(createDefaultProfile());
  }

  // Exactly one default profile.
  if (!profiles.some((p) => p.isDefault)) {
    repairs.push('No profile was marked default; marked the first one.');
    profiles[0] = { ...profiles[0], isDefault: true };
  } else {
    let seenDefault = false;
    for (let i = 0; i < profiles.length; i += 1) {
      if (!profiles[i].isDefault) continue;
      if (seenDefault) {
        repairs.push(`Profile "${profiles[i].name}" was also marked default; cleared the flag.`);
        profiles[i] = { ...profiles[i], isDefault: false };
      }
      seenDefault = true;
    }
  }

  let activeProfileId = asString(working.activeProfileId, '');
  if (!profiles.some((p) => p.id === activeProfileId)) {
    if (activeProfileId) {
      repairs.push(`Active profile "${activeProfileId}" no longer exists; selected the default.`);
    }
    activeProfileId =
      profiles.find((p) => p.isDefault)?.id ?? profiles[0].id;
  }

  const state: WeaponSlotsState = {
    version: WEAPON_SLOTS_SCHEMA_VERSION,
    enabled: asBoolean(working.enabled, false),
    profiles,
    activeProfileId,
    autoSelectProfileByForegroundApp: asBoolean(working.autoSelectProfileByForegroundApp, false),
    unassignedSlotBehaviour: 'keep-current',
    suppressWhileStudioFocused: asBoolean(working.suppressWhileStudioFocused, false),
  };

  if (working.unassignedSlotBehaviour !== undefined && working.unassignedSlotBehaviour !== 'keep-current') {
    repairs.push(
      `Unsupported unassigned-slot behaviour "${String(working.unassignedSlotBehaviour)}"; using "keep-current".`,
    );
  }

  return {
    state,
    report: {
      clean: repairs.length === 0,
      fromVersion: rawVersion,
      toVersion: WEAPON_SLOTS_SCHEMA_VERSION,
      repairs,
      created: false,
    },
  };
}

export function serializeState(state: WeaponSlotsState): string {
  return JSON.stringify(state);
}

export function deserializeState(json: string | null): NormalizeResult {
  return normalizeState(json);
}

/**
 * Normalise, then drop references to presets that no longer exist.
 * This is the full "load from disk" path.
 */
export function loadState(
  json: string | null,
  presetIndex: PresetIndex,
): NormalizeResult & { prunedPresetIds: string[] } {
  const { state, report } = deserializeState(json);
  const { state: pruned, pruned: missing } = pruneMissingAssignments(state, presetIndex);

  if (missing.length > 0) {
    for (const m of missing) {
      report.repairs.push(
        `Slot ${m.slotIndex} "${m.slotName}" in profile "${m.profileName}" referenced deleted crosshair "${m.presetId}"; cleared the assignment.`,
      );
    }
    report.clean = false;
  }

  return { state: pruned, report, prunedPresetIds: missing.map((m) => m.presetId) };
}

/* ------------------------------------------------------------------ *
 * Interop with the pre-existing app settings
 * ------------------------------------------------------------------ */

/**
 * Derives the app-level inputs that weapon slots must not steal.
 *
 * crshhx already owns the overlay toggle (`F10`) and the preset cycle (`F9`).
 * Reading them from the *existing* settings object is what keeps the two systems
 * coexisting: the generic hotkeys stay exactly as the user left them, and slot
 * validation simply refuses to collide with them.
 */
export function reservedBindingsFromSettings(settings: AppSettings): SlotKeyBinding[] {
  /**
   * Only the hotkeys `electron/main.ts` actually registers with
   * `globalShortcut` are reserved, so a slot is never refused a key that no
   * part of crshhx is listening for.
   *
   * `AppSettings.centerLockHotkey` ('F8' by default) is deliberately **not**
   * here: the setting is persisted and shipped, but nothing registers or
   * reacts to it, so F8 is free for a weapon slot. If centre-lock is ever
   * wired up, add it back to this list.
   */
  const candidates: Array<string | undefined> = [
    settings?.toggleOverlayHotkey,
    settings?.cyclePresetHotkey,
  ];

  const out: SlotKeyBinding[] = [];
  const seen = new Set<string>();
  for (const raw of candidates) {
    const binding = parseLegacyBinding(raw);
    if (!binding) continue;
    const key = [...binding.modifiers, binding.code].join('+');
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(binding);
  }
  return out;
}

/** Runtime state persisted separately and debounced — never on the hot path. */
export interface WeaponSlotsRuntimeState {
  activeProfileId: string;
  activeSlotId: string | null;
  activePresetId: string | null;
  lastSwitchAt: number;
}

export function defaultRuntimeState(): WeaponSlotsRuntimeState {
  return {
    activeProfileId: DEFAULT_PROFILE_ID,
    activeSlotId: null,
    activePresetId: null,
    lastSwitchAt: 0,
  };
}

export function normalizeRuntimeState(raw: unknown): WeaponSlotsRuntimeState {
  const fallback = defaultRuntimeState();
  if (!isRecord(raw)) return fallback;
  return {
    activeProfileId: asString(raw.activeProfileId, fallback.activeProfileId),
    activeSlotId:
      typeof raw.activeSlotId === 'string' && raw.activeSlotId ? raw.activeSlotId : null,
    activePresetId:
      typeof raw.activePresetId === 'string' && raw.activePresetId ? raw.activePresetId : null,
    lastSwitchAt: typeof raw.lastSwitchAt === 'number' ? raw.lastSwitchAt : 0,
  };
}
