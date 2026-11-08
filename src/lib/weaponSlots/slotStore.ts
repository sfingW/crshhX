import { MAX_SLOTS_PER_PROFILE, dedupeSlotBindings } from './bindingRules';
import {
  createCs2Profile,
  createDefaultProfile,
  createDefaultSlots,
  createDefaultState,
  createFortniteProfile,
  DEFAULT_PROFILE_ID,
  newProfileId,
  newSlotId,
} from './defaults';
import { bindingsEqual, makeBinding } from './keys';
import type {
  SlotKeyBinding,
  WeaponSlot,
  WeaponSlotProfile,
  WeaponSlotsState,
} from './types';

/**
 * Pure mutation layer for Weapon Slot Crosshairs.
 *
 * Every function takes a state and returns a *new* state; nothing is mutated in
 * place. That makes the whole configuration surface trivially testable without
 * React, Electron or localStorage, and lets the renderer treat the result as an
 * ordinary immutable value it can hand to `setState`.
 */

export type StoreResult =
  | { ok: true; state: WeaponSlotsState }
  | { ok: false; error: string };

function ok(state: WeaponSlotsState): StoreResult {
  return { ok: true, state };
}

function fail(error: string): StoreResult {
  return { ok: false, error };
}

function mapProfile(
  state: WeaponSlotsState,
  profileId: string,
  fn: (profile: WeaponSlotProfile) => WeaponSlotProfile,
): WeaponSlotsState {
  return {
    ...state,
    profiles: state.profiles.map((p) => (p.id === profileId ? fn(p) : p)),
  };
}

function mapSlot(
  state: WeaponSlotsState,
  profileId: string,
  slotId: string,
  fn: (slot: WeaponSlot) => WeaponSlot,
): WeaponSlotsState {
  return mapProfile(state, profileId, (profile) => ({
    ...profile,
    slots: profile.slots.map((s) => (s.id === slotId ? fn(s) : s)),
  }));
}

/**
 * Guards every slot-level operation.
 *
 * Without this, an operation aimed at a slot id that no longer exists (a stale
 * UI row, a hand-edited settings file) would report success while doing nothing
 * — and worse, the side-effecting passes below could still mutate *other*
 * slots. Failing loudly keeps the store honest.
 */
function requireSlot(
  state: WeaponSlotsState,
  profileId: string,
  slotId: string,
): WeaponSlot | null {
  const profile = getProfile(state, profileId);
  if (!profile) return null;
  return profile.slots.find((s) => s.id === slotId) ?? null;
}

/** Re-numbers `index` so the UI always shows a contiguous 1..n slot column. */
function reindex(slots: readonly WeaponSlot[]): WeaponSlot[] {
  return slots.map((slot, i) => (slot.index === i + 1 ? slot : { ...slot, index: i + 1 }));
}

export function getProfile(
  state: WeaponSlotsState,
  profileId: string,
): WeaponSlotProfile | null {
  return state.profiles.find((p) => p.id === profileId) ?? null;
}

export function getActiveProfile(state: WeaponSlotsState): WeaponSlotProfile | null {
  return (
    getProfile(state, state.activeProfileId) ??
    state.profiles.find((p) => p.isDefault) ??
    state.profiles[0] ??
    null
  );
}

export function getSlot(
  state: WeaponSlotsState,
  profileId: string,
  slotId: string,
): WeaponSlot | null {
  return getProfile(state, profileId)?.slots.find((s) => s.id === slotId) ?? null;
}

/* ------------------------------------------------------------------ *
 * Slot operations
 * ------------------------------------------------------------------ */

export function addSlot(
  state: WeaponSlotsState,
  profileId: string,
  name?: string,
): StoreResult {
  const profile = getProfile(state, profileId);
  if (!profile) return fail(`Unknown profile "${profileId}".`);
  if (profile.slots.length >= MAX_SLOTS_PER_PROFILE) {
    return fail(`A profile can hold at most ${MAX_SLOTS_PER_PROFILE} slots.`);
  }

  const slot: WeaponSlot = {
    id: newSlotId(),
    index: profile.slots.length + 1,
    name: name?.trim() || `Slot ${profile.slots.length + 1}`,
    binding: null,
    presetId: null,
    enabled: true,
  };

  return ok(mapProfile(state, profileId, (p) => ({ ...p, slots: [...p.slots, slot] })));
}

export function removeSlot(
  state: WeaponSlotsState,
  profileId: string,
  slotId: string,
): StoreResult {
  const profile = getProfile(state, profileId);
  if (!profile) return fail(`Unknown profile "${profileId}".`);
  if (!profile.slots.some((s) => s.id === slotId)) return fail(`Unknown slot "${slotId}".`);

  const next = mapProfile(state, profileId, (p) => ({
    ...p,
    slots: reindex(p.slots.filter((s) => s.id !== slotId)),
  }));
  return ok(next);
}

export function renameSlot(
  state: WeaponSlotsState,
  profileId: string,
  slotId: string,
  name: string,
): StoreResult {
  if (!requireSlot(state, profileId, slotId)) return fail(`Unknown slot "${slotId}".`);
  const trimmed = name.trim();
  if (!trimmed) return fail('Slot name cannot be empty.');
  if (trimmed.length > 48) return fail('Slot name must be 48 characters or fewer.');

  return ok(mapSlot(state, profileId, slotId, (s) => ({ ...s, name: trimmed })));
}

export function setSlotBinding(
  state: WeaponSlotsState,
  profileId: string,
  slotId: string,
  binding: SlotKeyBinding | null,
): StoreResult {
  if (!requireSlot(state, profileId, slotId)) return fail(`Unknown slot "${slotId}".`);
  const next = mapSlot(state, profileId, slotId, (s) => ({ ...s, binding }));

  // A hand-set binding could collide with an existing one. Keep the key map
  // unambiguous by clearing the *other* slot that held the same input, rather
  // than refusing the edit — the user's most recent choice always wins.
  if (!binding) return ok(next);

  return ok(
    mapProfile(next, profileId, (p) => ({
      ...p,
      slots: p.slots.map((s) =>
        s.id !== slotId && bindingsEqual(s.binding, binding) ? { ...s, binding: null } : s,
      ),
    })),
  );
}

export function setSlotBindingFromCode(
  state: WeaponSlotsState,
  profileId: string,
  slotId: string,
  code: string | null,
): StoreResult {
  return setSlotBinding(state, profileId, slotId, code ? makeBinding(code) : null);
}

export function clearSlotBinding(
  state: WeaponSlotsState,
  profileId: string,
  slotId: string,
): StoreResult {
  return setSlotBinding(state, profileId, slotId, null);
}

export function assignPreset(
  state: WeaponSlotsState,
  profileId: string,
  slotId: string,
  presetId: string | null,
): StoreResult {
  if (!requireSlot(state, profileId, slotId)) return fail(`Unknown slot "${slotId}".`);
  if (presetId !== null && (!presetId || typeof presetId !== 'string')) {
    return fail('Preset id must be a non-empty string.');
  }
  return ok(mapSlot(state, profileId, slotId, (s) => ({ ...s, presetId })));
}

export function clearPreset(
  state: WeaponSlotsState,
  profileId: string,
  slotId: string,
): StoreResult {
  return assignPreset(state, profileId, slotId, null);
}

export function setSlotEnabled(
  state: WeaponSlotsState,
  profileId: string,
  slotId: string,
  enabled: boolean,
): StoreResult {
  if (!requireSlot(state, profileId, slotId)) return fail(`Unknown slot "${slotId}".`);
  return ok(mapSlot(state, profileId, slotId, (s) => ({ ...s, enabled })));
}

export function toggleSlotEnabled(
  state: WeaponSlotsState,
  profileId: string,
  slotId: string,
): StoreResult {
  const slot = getSlot(state, profileId, slotId);
  if (!slot) return fail(`Unknown slot "${slotId}".`);
  return setSlotEnabled(state, profileId, slotId, !slot.enabled);
}

export function moveSlot(
  state: WeaponSlotsState,
  profileId: string,
  slotId: string,
  direction: -1 | 1,
): StoreResult {
  const profile = getProfile(state, profileId);
  if (!profile) return fail(`Unknown profile "${profileId}".`);
  const from = profile.slots.findIndex((s) => s.id === slotId);
  if (from < 0) return fail(`Unknown slot "${slotId}".`);
  const to = from + direction;
  if (to < 0 || to >= profile.slots.length) return ok(state);

  const slots = [...profile.slots];
  const [moved] = slots.splice(from, 1);
  slots.splice(to, 0, moved);

  return ok(mapProfile(state, profileId, (p) => ({ ...p, slots: reindex(slots) })));
}

export function resetProfileSlots(
  state: WeaponSlotsState,
  profileId: string,
): StoreResult {
  const profile = getProfile(state, profileId);
  if (!profile) return fail(`Unknown profile "${profileId}".`);
  return ok(mapProfile(state, profileId, (p) => ({ ...p, slots: createDefaultSlots() })));
}

/* ------------------------------------------------------------------ *
 * Profile operations
 * ------------------------------------------------------------------ */

export function addProfile(
  state: WeaponSlotsState,
  name: string,
  matchProcessNames: string[] = [],
): StoreResult {
  const trimmed = name.trim();
  if (!trimmed) return fail('Profile name cannot be empty.');
  if (state.profiles.some((p) => p.name.toLowerCase() === trimmed.toLowerCase())) {
    return fail(`A profile named "${trimmed}" already exists.`);
  }

  const profile: WeaponSlotProfile = {
    id: newProfileId(),
    name: trimmed,
    matchProcessNames: normalizeProcessNames(matchProcessNames),
    restrictToMatchedProcesses: false,
    isDefault: false,
    slots: createDefaultSlots(),
  };

  // Creating a profile selects it: the management UI adds a tab, and the user's
  // next action is always to look at or edit what they just created.
  return ok({
    ...state,
    profiles: [...state.profiles, profile],
    activeProfileId: profile.id,
  });
}

export function addTemplateProfile(
  state: WeaponSlotsState,
  template: 'fortnite' | 'cs2' | 'blank',
): StoreResult {
  const profile =
    template === 'fortnite' ? createFortniteProfile()
    : template === 'cs2' ? createCs2Profile()
    : {
        ...createDefaultProfile(),
        id: newProfileId(),
        name: 'New Profile',
        isDefault: false,
        // Fresh ids: the blank template must not share ids with the shipped
        // default profile, or the validation report would collide.
        slots: createDefaultSlots(),
      };

  let name = profile.name;
  let n = 2;
  while (state.profiles.some((p) => p.name.toLowerCase() === name.toLowerCase())) {
    name = `${profile.name} ${n}`;
    n += 1;
  }

  const added: WeaponSlotProfile = { ...profile, name };
  return ok({
    ...state,
    profiles: [...state.profiles, added],
    activeProfileId: added.id,
  });
}

export function removeProfile(state: WeaponSlotsState, profileId: string): StoreResult {
  const profile = getProfile(state, profileId);
  if (!profile) return fail(`Unknown profile "${profileId}".`);
  if (profile.isDefault) return fail('The default profile cannot be removed.');
  if (state.profiles.length <= 1) return fail('At least one profile must remain.');

  const profiles = state.profiles.filter((p) => p.id !== profileId);
  const activeProfileId =
    state.activeProfileId === profileId ? DEFAULT_PROFILE_ID : state.activeProfileId;

  return ok({ ...state, profiles, activeProfileId });
}

export function renameProfile(
  state: WeaponSlotsState,
  profileId: string,
  name: string,
): StoreResult {
  const trimmed = name.trim();
  if (!trimmed) return fail('Profile name cannot be empty.');
  if (state.profiles.some((p) => p.id !== profileId && p.name.toLowerCase() === trimmed.toLowerCase())) {
    return fail(`A profile named "${trimmed}" already exists.`);
  }
  return ok(mapProfile(state, profileId, (p) => ({ ...p, name: trimmed })));
}

export function setProfileProcessNames(
  state: WeaponSlotsState,
  profileId: string,
  rawNames: string[],
): StoreResult {
  return ok(
    mapProfile(state, profileId, (p) => ({
      ...p,
      matchProcessNames: normalizeProcessNames(rawNames),
    })),
  );
}

export function setActiveProfile(state: WeaponSlotsState, profileId: string): StoreResult {
  if (!getProfile(state, profileId)) return fail(`Unknown profile "${profileId}".`);
  return ok({ ...state, activeProfileId: profileId });
}

export function duplicateProfile(state: WeaponSlotsState, profileId: string): StoreResult {
  const source = getProfile(state, profileId);
  if (!source) return fail(`Unknown profile "${profileId}".`);

  let name = `${source.name} Copy`;
  let n = 2;
  while (state.profiles.some((p) => p.name.toLowerCase() === name.toLowerCase())) {
    name = `${source.name} Copy ${n}`;
    n += 1;
  }

  const copy: WeaponSlotProfile = {
    ...source,
    id: newProfileId(),
    name,
    isDefault: false,
    slots: source.slots.map((s) => ({ ...s, id: newSlotId() })),
  };

  return ok({
    ...state,
    profiles: [...state.profiles, copy],
    activeProfileId: copy.id,
  });
}

/* ------------------------------------------------------------------ *
 * Feature-level operations
 * ------------------------------------------------------------------ */

export function setFeatureEnabled(state: WeaponSlotsState, enabled: boolean): WeaponSlotsState {
  return { ...state, enabled };
}

export function setAutoSelectByForeground(
  state: WeaponSlotsState,
  enabled: boolean,
): WeaponSlotsState {
  return { ...state, autoSelectProfileByForegroundApp: enabled };
}

export function setSuppressWhileStudioFocused(
  state: WeaponSlotsState,
  enabled: boolean,
): WeaponSlotsState {
  return { ...state, suppressWhileStudioFocused: enabled };
}

/**
 * "Restore defaults" in the UI: puts the *default profile's* slot table back to
 * the shipped five slots. Other game profiles, the master switch and all other
 * preferences are deliberately left alone — a restore button should not be able
 * to destroy unrelated configuration.
 */
export function restoreDefaultSlots(state: WeaponSlotsState): WeaponSlotsState {
  const target = getProfile(state, DEFAULT_PROFILE_ID) ? DEFAULT_PROFILE_ID : state.profiles[0]?.id;
  if (!target) return state;
  const result = resetProfileSlots(state, target);
  return result.ok ? result.state : state;
}

/** Full factory reset — drops every profile and returns to shipped defaults. */
export function factoryReset(): WeaponSlotsState {
  return createDefaultState();
}

export function normalizeProcessNames(raw: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const entry of raw) {
    if (typeof entry !== 'string') continue;
    // Accept a full path, a bare exe name, or a comma/space separated list.
    for (const part of entry.split(/[,;]/)) {
      const name = part.trim().toLowerCase().replace(/\\/g, '/').split('/').pop() || '';
      if (!name || seen.has(name)) continue;
      seen.add(name);
      out.push(name);
    }
  }
  return out;
}

/** Applies `dedupeSlotBindings` across every profile. Used by the migration layer. */
export function dedupeAllBindings(state: WeaponSlotsState): WeaponSlotsState {
  return {
    ...state,
    profiles: state.profiles.map((p) => ({ ...p, slots: dedupeSlotBindings(p.slots) })),
  };
}
