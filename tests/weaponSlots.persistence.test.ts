import { describe, expect, it } from 'vitest';
import {
  WEAPON_SLOTS_RUNTIME_KEY,
  WEAPON_SLOTS_STORAGE_KEY,
  deserializeState,
  loadState,
  normalizeState,
  normalizeBinding,
  reservedBindingsFromSettings,
  serializeState,
  defaultRuntimeState,
  normalizeRuntimeState,
} from '../src/lib/weaponSlots/migration';
import {
  createDebouncedRuntimeSaver,
  loadAppSettings,
  loadCustomPresets,
  loadWeaponSlotsRuntimeState,
  loadWeaponSlotsState,
  saveAppSettings,
  saveCustomPresets,
  saveWeaponSlotsRuntimeState,
  saveWeaponSlotsState,
} from '../src/lib/storage';
import { getPresetIndex } from '../src/lib/presetLibrary';
import { createDefaultState, DEFAULT_PROFILE_ID } from '../src/lib/weaponSlots/defaults';
import { addProfile, getActiveProfile, setSlotBinding } from '../src/lib/weaponSlots/slotStore';
import { makeBinding } from '../src/lib/weaponSlots/keys';
import { MAX_SLOTS_PER_PROFILE } from '../src/lib/weaponSlots/bindingRules';
import { fakePreset, fiveSlotIndex, fiveSlotState, makeIndex } from './helpers';
import type { AppSettings } from '../src/types/crosshair';

/**
 * Persistence, schema migration and backward compatibility.
 *
 * The headline guarantee: an existing crshhx user upgrades, and nothing they
 * already had — overlay hotkeys, saved reticles, current crosshair — changes.
 */

const LEGACY_APP_SETTINGS_BLOB = JSON.stringify({
  overlayVisible: true,
  toggleOverlayHotkey: 'F10',
  cyclePresetHotkey: 'F9',
  centerLockHotkey: 'F8',
  selectedMonitor: 1,
  runAtStartup: true,
  suspendedWhenMinimized: false,
});

function seedLegacyUser() {
  localStorage.setItem('crshhx_app_settings', LEGACY_APP_SETTINGS_BLOB);
  localStorage.setItem('crshhx_current_config', JSON.stringify(fakePreset('custom-old', 'My Old Reticle')));
  localStorage.setItem(
    'crshhx_custom_presets',
    JSON.stringify([fakePreset('custom-1', 'Saved One'), fakePreset('custom-2', 'Saved Two')]),
  );
}

describe('persistence: round trip survives an application restart', () => {
  it('restores slot names, keys, presets and enabled flags', () => {
    // fiveSlotIndex() holds exactly the ids fiveSlotState() references, so the
    // load path exercises a clean round trip with no pruning.
    const index = fiveSlotIndex();
    const st = fiveSlotState();
    saveWeaponSlotsState(st);

    // Simulate a restart: nothing in memory, only localStorage remains.
    const loaded = loadWeaponSlotsState(index);

    expect(loaded.state.enabled).toBe(true);
    const slots = getActiveProfile(loaded.state)!.slots;
    expect(slots.map((s) => s.name)).toEqual(['Shotgun', 'AR', 'SMG', 'Sniper', 'Utility']);
    expect(slots.map((s) => s.binding?.code)).toEqual(['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5']);
    expect(slots.map((s) => s.presetId)).toEqual(['preset-1', 'preset-2', 'preset-3', 'preset-4', 'preset-5']);
    expect(slots.every((s) => s.enabled)).toBe(true);
    expect(loaded.report.clean).toBe(true);
  });

  it('restores modifiers on a binding', () => {
    const index = fiveSlotIndex();
    const st = fiveSlotState();
    const slotId = getActiveProfile(st)!.slots[0].id;
    const modified = setSlotBinding(st, DEFAULT_PROFILE_ID, slotId, makeBinding('Digit1', ['ctrl', 'alt']));
    if (!modified.ok) throw new Error(modified.error);
    saveWeaponSlotsState(modified.state);

    const loaded = loadWeaponSlotsState(index);
    expect(getActiveProfile(loaded.state)!.slots[0].binding?.modifiers).toEqual(['ctrl', 'alt']);
  });

  it('restores multiple game profiles and the active selection', () => {
    const index = getPresetIndex();
    let st = fiveSlotState();
    const added = addProfile(st, 'Fortnite', ['fortniteclient-win64-shipping.exe']);
    if (!added.ok) throw new Error(added.error);
    st = { ...added.state, activeProfileId: added.state.profiles[1].id };
    saveWeaponSlotsState(st);

    const loaded = loadWeaponSlotsState(index);
    expect(loaded.state.profiles.map((p) => p.name)).toEqual(['Default', 'Fortnite']);
    expect(loaded.state.activeProfileId).toBe(st.activeProfileId);
    expect(loaded.state.profiles[1].matchProcessNames).toEqual(['fortniteclient-win64-shipping.exe']);
  });

  it('restores feature-level preferences', () => {
    const index = getPresetIndex();
    saveWeaponSlotsState({
      ...createDefaultState(),
      enabled: true,
      autoSelectProfileByForegroundApp: true,
      suppressWhileStudioFocused: true,
    });
    const loaded = loadWeaponSlotsState(index);
    expect(loaded.state.enabled).toBe(true);
    expect(loaded.state.autoSelectProfileByForegroundApp).toBe(true);
    expect(loaded.state.suppressWhileStudioFocused).toBe(true);
  });

  it('creates a clean disabled default when nothing is stored yet', () => {
    const loaded = loadWeaponSlotsState(getPresetIndex());
    expect(loaded.report.created).toBe(true);
    expect(loaded.state.enabled).toBe(false);
    expect(getActiveProfile(loaded.state)!.slots).toHaveLength(5);
  });

  it('serializes to stable JSON that deserializes to an equal state', () => {
    const st = fiveSlotState();
    const json = serializeState(st);
    expect(deserializeState(json).state).toEqual(st);
  });
});

describe('persistence: existing settings are never disturbed', () => {
  it('leaves the stored app-settings blob byte-for-byte identical', () => {
    seedLegacyUser();
    const before = localStorage.getItem('crshhx_app_settings');

    loadWeaponSlotsState(getPresetIndex());
    saveWeaponSlotsState(createDefaultState());

    expect(localStorage.getItem('crshhx_app_settings')).toBe(before);
  });

  it('preserves every existing app setting value', () => {
    seedLegacyUser();
    loadWeaponSlotsState(getPresetIndex());
    saveWeaponSlotsState(createDefaultState());

    const settings = loadAppSettings();
    expect(settings.toggleOverlayHotkey).toBe('F10');
    expect(settings.cyclePresetHotkey).toBe('F9');
    expect(settings.centerLockHotkey).toBe('F8');
    expect(settings.selectedMonitor).toBe(1);
    expect(settings.runAtStartup).toBe(true);
    expect(settings.suspendedWhenMinimized).toBe(false);
  });

  it('preserves the registered app hotkeys as reserved inputs', () => {
    seedLegacyUser();
    const settings = loadAppSettings();
    const reserved = reservedBindingsFromSettings(settings);
    // F10 (overlay toggle) and F9 (preset cycle) are the two that
    // `registerHotkeys()` in electron/main.ts actually registers.
    expect(reserved.map((b) => b.code)).toEqual(['F10', 'F9']);
  });

  it('survives the user changing an overlay hotkey', () => {
    seedLegacyUser();
    const settings = loadAppSettings();
    saveAppSettings({ ...settings, toggleOverlayHotkey: 'F7' } as AppSettings);
    const reserved = reservedBindingsFromSettings(loadAppSettings());
    expect(reserved.map((b) => b.code)).toEqual(['F7', 'F9']);
  });

  it('does not reserve a hotkey crshhx never registers', () => {
    // `AppSettings.centerLockHotkey` ships as 'F8' and is persisted, but no
    // code registers or reacts to it. Reserving it would refuse the user a key
    // that nothing is listening for, and would tell them it is "reserved by
    // crshhx for another function" — which would not be true.
    seedLegacyUser();
    const settings = loadAppSettings();
    expect(settings.centerLockHotkey).toBe('F8');
    expect(reservedBindingsFromSettings(settings).map((b) => b.code)).not.toContain('F8');
  });

  it('still preserves the unwired setting itself untouched', () => {
    seedLegacyUser();
    saveWeaponSlotsState(createDefaultState());
    expect(loadAppSettings().centerLockHotkey).toBe('F8');
  });

  it('does not rewrite the custom preset library', () => {
    seedLegacyUser();
    const before = localStorage.getItem('crshhx_custom_presets');
    saveWeaponSlotsState(createDefaultState());
    expect(localStorage.getItem('crshhx_custom_presets')).toBe(before);
    expect(loadCustomPresets().map((p) => p.id)).toEqual(['custom-1', 'custom-2']);
  });

  it('does not rewrite the current crosshair', () => {
    seedLegacyUser();
    const before = localStorage.getItem('crshhx_current_config');
    saveWeaponSlotsState(createDefaultState());
    expect(localStorage.getItem('crshhx_current_config')).toBe(before);
  });

  it('stores weapon slots under their own key', () => {
    saveWeaponSlotsState(createDefaultState());
    expect(localStorage.getItem(WEAPON_SLOTS_STORAGE_KEY)).not.toBeNull();
    expect(localStorage.getItem('crshhx_app_settings')).toBeNull();
  });

  it('custom presets added by the user become assignable to slots', () => {
    const customs = [fakePreset('custom-mine', 'My Reticle')];
    saveCustomPresets(customs);
    const index = getPresetIndex(loadCustomPresets());
    expect(index['custom-mine']).toBeDefined();
  });
});

describe('persistence: missing and deleted presets are handled safely', () => {
  it('clears the assignment of a slot whose preset was deleted', () => {
    const index = makeIndex(fakePreset('preset-1'));
    const result = loadState(serializeState(fiveSlotState()), index);

    const slots = getActiveProfile(result.state)!.slots;
    expect(slots[0].presetId).toBe('preset-1');
    expect(slots[1].presetId).toBeNull();
    expect(slots[4].presetId).toBeNull();
    expect(result.prunedPresetIds).toEqual(['preset-2', 'preset-3', 'preset-4', 'preset-5']);
  });

  it('keeps the slot, its name, its key and its enabled flag', () => {
    const index = makeIndex();
    const result = loadState(serializeState(fiveSlotState()), index);
    const slots = getActiveProfile(result.state)!.slots;

    expect(slots).toHaveLength(5);
    expect(slots.map((s) => s.name)).toEqual(['Shotgun', 'AR', 'SMG', 'Sniper', 'Utility']);
    expect(slots.map((s) => s.binding?.code)).toEqual(['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5']);
    expect(slots.every((s) => s.enabled)).toBe(true);
    expect(slots.every((s) => s.presetId === null)).toBe(true);
  });

  it('reports each pruned reference so the UI can explain it', () => {
    const result = loadState(serializeState(fiveSlotState()), makeIndex(fakePreset('preset-1')));
    expect(result.report.clean).toBe(false);
    expect(result.report.repairs.join('\n')).toMatch(/deleted crosshair "preset-3"/);
  });

  it('never substitutes another preset for a deleted one', () => {
    const result = loadState(serializeState(fiveSlotState()), makeIndex(fakePreset('preset-1')));
    const slots = getActiveProfile(result.state)!.slots;
    expect(slots[1].presetId).toBeNull();
    expect(slots[1].presetId).not.toBe('preset-1');
  });

  it('is a no-op when every referenced preset still exists', () => {
    const st = fiveSlotState();
    const index = makeIndex(...[1, 2, 3, 4, 5].map((n) => fakePreset(`preset-${n}`)));
    const result = loadState(serializeState(st), index);
    expect(result.prunedPresetIds).toEqual([]);
    expect(result.state).toEqual(st);
  });
});

describe('persistence: duplicate and invalid bindings are repaired', () => {
  it('clears a duplicated key, keeping the lowest-numbered slot', () => {
    const raw = {
      version: 1,
      enabled: true,
      profiles: [{
        id: DEFAULT_PROFILE_ID,
        name: 'Default',
        isDefault: true,
        matchProcessNames: [],
        restrictToMatchedProcesses: false,
        slots: [
          { id: 'a', index: 1, name: 'One', binding: { code: 'Digit1', modifiers: [], kind: 'key' }, presetId: 'p1', enabled: true },
          { id: 'b', index: 2, name: 'Two', binding: { code: 'Digit1', modifiers: [], kind: 'key' }, presetId: 'p2', enabled: true },
          { id: 'c', index: 3, name: 'Three', binding: { code: 'Digit1', modifiers: [], kind: 'key' }, presetId: 'p3', enabled: true },
        ],
      }],
      activeProfileId: DEFAULT_PROFILE_ID,
    };

    const { state: repaired } = normalizeState(raw);
    const slots = getActiveProfile(repaired)!.slots;
    expect(slots[0].binding?.code).toBe('Digit1');
    expect(slots[1].binding).toBeNull();
    expect(slots[2].binding).toBeNull();
    // The rest of the slot is preserved.
    expect(slots[1].presetId).toBe('p2');
    expect(slots[2].name).toBe('Three');
  });

  it('drops a binding for an unknown key code', () => {
    const repairs: string[] = [];
    expect(normalizeBinding({ code: 'KeyThatDoesNotExist' }, repairs, 'slot 1')).toBeNull();
    expect(repairs[0]).toMatch(/unknown input/);
  });

  it('drops a malformed binding object but keeps the slot', () => {
    const raw = {
      version: 1,
      profiles: [{
        id: DEFAULT_PROFILE_ID, name: 'Default', isDefault: true,
        matchProcessNames: [], restrictToMatchedProcesses: false,
        slots: [{ id: 'a', index: 1, name: 'Broken', binding: { nonsense: true }, presetId: 'p1', enabled: true }],
      }],
      activeProfileId: DEFAULT_PROFILE_ID,
    };
    const { state: repaired, report } = normalizeState(raw);
    const slots = getActiveProfile(repaired)!.slots;
    expect(slots).toHaveLength(1);
    expect(slots[0].binding).toBeNull();
    expect(slots[0].presetId).toBe('p1');
    expect(report.clean).toBe(false);
  });

  it('coerces wrong-typed fields instead of throwing', () => {
    const raw = {
      version: 'one',
      enabled: 'yes',
      profiles: [{
        id: 42, name: null, isDefault: 'true', matchProcessNames: 'cs2.exe',
        restrictToMatchedProcesses: 1,
        slots: [{ id: 7, index: 'x', name: 99, enabled: 'no', presetId: ['p1'], binding: 'Digit2' }],
      }],
      activeProfileId: 42,
    };
    const { state: repaired } = normalizeState(raw);
    expect(repaired.version).toBe(1);
    expect(typeof repaired.enabled).toBe('boolean');
    const slots = getActiveProfile(repaired)!.slots;
    expect(slots).toHaveLength(1);
    expect(slots[0].index).toBe(1);
    expect(typeof slots[0].name).toBe('string');
    expect(typeof slots[0].enabled).toBe('boolean');
    expect(slots[0].presetId).toBeNull();
    // A bare accelerator string is still understood.
    expect(slots[0].binding?.code).toBe('Digit2');
  });

  it('restores defaults when the blob is not JSON', () => {
    localStorage.setItem(WEAPON_SLOTS_STORAGE_KEY, '{ this is not json');
    const result = loadWeaponSlotsState(getPresetIndex());
    expect(result.report.created).toBe(true);
    expect(result.report.repairs.join(' ')).toMatch(/not valid JSON/i);
    expect(getActiveProfile(result.state)!.slots).toHaveLength(5);
  });

  it('restores defaults when the blob is a number, array or string', () => {
    for (const bad of ['42', '[]', '"hello"', 'null', 'true']) {
      const { state: repaired } = deserializeState(bad);
      expect(getActiveProfile(repaired)!.slots).toHaveLength(5);
      expect(repaired.profiles).toHaveLength(1);
    }
  });

  it('drops a malformed profile but keeps the good ones', () => {
    const raw = {
      version: 1,
      profiles: [
        42,
        null,
        { id: 'good', name: 'Good', isDefault: true, slots: [{ index: 1, name: 'S', binding: 'Digit1', presetId: 'p' }] },
      ],
      activeProfileId: 'good',
    };
    const { state: repaired, report } = normalizeState(raw);
    expect(repaired.profiles).toHaveLength(1);
    expect(repaired.profiles[0].name).toBe('Good');
    expect(report.repairs.join(' ')).toMatch(/malformed profile/);
  });

  it('re-points the active profile when the stored one no longer exists', () => {
    const raw = {
      version: 1,
      profiles: [{ id: DEFAULT_PROFILE_ID, name: 'Default', isDefault: true, slots: [] }],
      activeProfileId: 'profile-deleted',
    };
    const { state: repaired, report } = normalizeState(raw);
    expect(repaired.activeProfileId).toBe(DEFAULT_PROFILE_ID);
    expect(report.repairs.join(' ')).toMatch(/no longer exists/);
  });

  it('guarantees exactly one default profile', () => {
    const none = normalizeState({ version: 1, profiles: [{ id: 'a', name: 'A', isDefault: false, slots: [] }] });
    expect(none.state.profiles.filter((p) => p.isDefault)).toHaveLength(1);

    const many = normalizeState({
      version: 1,
      profiles: [
        { id: 'a', name: 'A', isDefault: true, slots: [] },
        { id: 'b', name: 'B', isDefault: true, slots: [] },
      ],
      activeProfileId: 'a',
    });
    expect(many.state.profiles.filter((p) => p.isDefault)).toHaveLength(1);
    expect(many.report.repairs.join(' ')).toMatch(/also marked default/);
  });

  it('assigns a new id when two profiles collide', () => {
    const { state: repaired, report } = normalizeState({
      version: 1,
      profiles: [
        { id: 'dup', name: 'A', isDefault: true, slots: [] },
        { id: 'dup', name: 'B', isDefault: false, slots: [] },
      ],
      activeProfileId: 'dup',
    });
    const ids = repaired.profiles.map((p) => p.id);
    expect(new Set(ids).size).toBe(2);
    expect(report.repairs.join(' ')).toMatch(/duplicate id/);
  });

  it('rebuilds a default profile when the list ends up empty', () => {
    const { state: repaired, report } = normalizeState({ version: 1, profiles: [] });
    expect(repaired.profiles).toHaveLength(1);
    expect(getActiveProfile(repaired)!.slots).toHaveLength(5);
    expect(report.repairs.join(' ')).toMatch(/restored the default profile/);
  });

  it('truncates a slot list beyond the supported ceiling', () => {
    const slots = Array.from({ length: MAX_SLOTS_PER_PROFILE + 10 }, (_, i) => ({
      id: `s${i}`, index: i + 1, name: `Slot ${i + 1}`, binding: null, presetId: null, enabled: true,
    }));
    const { state: repaired, report } = normalizeState({
      version: 1,
      profiles: [{ id: DEFAULT_PROFILE_ID, name: 'Default', isDefault: true, slots }],
      activeProfileId: DEFAULT_PROFILE_ID,
    });
    expect(getActiveProfile(repaired)!.slots).toHaveLength(MAX_SLOTS_PER_PROFILE);
    expect(report.repairs.join(' ')).toMatch(/truncated/);
  });

  it('re-indexes slot numbers so the column is always contiguous', () => {
    const { state: repaired } = normalizeState({
      version: 1,
      profiles: [{
        id: DEFAULT_PROFILE_ID, name: 'Default', isDefault: true,
        slots: [
          { id: 'a', index: 99, name: 'A' },
          { id: 'b', index: -4, name: 'B' },
          { id: 'c', name: 'C' },
        ],
      }],
      activeProfileId: DEFAULT_PROFILE_ID,
    });
    expect(getActiveProfile(repaired)!.slots.map((s) => s.index)).toEqual([1, 2, 3]);
  });

  it('truncates an over-long slot name', () => {
    const { state: repaired } = normalizeState({
      version: 1,
      profiles: [{
        id: DEFAULT_PROFILE_ID, name: 'Default', isDefault: true,
        slots: [{ id: 'a', index: 1, name: 'x'.repeat(500) }],
      }],
      activeProfileId: DEFAULT_PROFILE_ID,
    });
    expect(getActiveProfile(repaired)!.slots[0].name.length).toBeLessThanOrEqual(48);
  });
});

describe('persistence: schema migration', () => {
  it('migrates a flat v0 slot list into the default profile', () => {
    const v0 = {
      enabled: true,
      slots: [
        { id: 'a', name: 'Shotgun', binding: { code: 'Digit1', modifiers: [], kind: 'key' }, presetId: 'pro-11', enabled: true },
        { id: 'b', name: 'AR', binding: { code: 'Digit2', modifiers: [], kind: 'key' }, presetId: 'pro-15', enabled: true },
      ],
    };
    const { state: migrated, report } = normalizeState(v0);

    expect(migrated.version).toBe(1);
    expect(migrated.profiles).toHaveLength(1);
    expect(migrated.profiles[0].id).toBe(DEFAULT_PROFILE_ID);
    expect(migrated.profiles[0].isDefault).toBe(true);
    expect(migrated.activeProfileId).toBe(DEFAULT_PROFILE_ID);
    expect(migrated.enabled).toBe(true);
    expect(migrated.profiles[0].slots.map((s) => s.name)).toEqual(['Shotgun', 'AR']);
    expect(report.fromVersion).toBe(0);
    expect(report.repairs.join(' ')).toMatch(/flat slot list \(v0\)/);
  });

  it('migrates legacy accelerator strings into canonical bindings', () => {
    const v0 = {
      slots: [
        { id: 'a', name: 'One', key: '1', presetId: 'p1' },
        { id: 'b', name: 'Two', key: 'Alt+2', presetId: 'p2' },
        { id: 'c', name: 'Three', key: 'num3', presetId: 'p3' },
        { id: 'd', name: 'Four', key: 'F6', presetId: 'p4' },
      ],
    };
    const { state: migrated } = normalizeState(v0);
    const slots = getActiveProfile(migrated)!.slots;
    expect(slots[0].binding?.code).toBe('Digit1');
    expect(slots[1].binding?.code).toBe('Digit2');
    expect(slots[1].binding?.modifiers).toEqual(['alt']);
    expect(slots[2].binding?.code).toBe('Numpad3');
    expect(slots[3].binding?.code).toBe('F6');
  });

  it('migrates legacy field aliases', () => {
    const v0 = {
      slots: [{ id: 'a', label: 'Old Name', crosshairId: 'p1', active: false, accelerator: 'Ctrl+4' }],
    };
    const { state: migrated } = normalizeState(v0);
    const slot = getActiveProfile(migrated)!.slots[0];
    expect(slot.name).toBe('Old Name');
    expect(slot.presetId).toBe('p1');
    expect(slot.enabled).toBe(false);
    expect(slot.binding?.code).toBe('Digit4');
    expect(slot.binding?.modifiers).toEqual(['ctrl']);
  });

  it('drops an unparseable legacy key rather than guessing', () => {
    const repairs: string[] = [];
    expect(normalizeBinding('DefinitelyNotAKey', repairs, 'slot 1')).toBeNull();
    expect(repairs[0]).toMatch(/unrecognised key/);
  });

  it('loads a blob written by a newer version without discarding what it understands', () => {
    const future = {
      version: 99,
      enabled: true,
      profiles: [{
        id: DEFAULT_PROFILE_ID, name: 'Default', isDefault: true, matchProcessNames: [],
        restrictToMatchedProcesses: false,
        slots: [{ id: 'a', index: 1, name: 'Kept', binding: { code: 'Digit1', modifiers: [], kind: 'key' }, presetId: 'p1', enabled: true }],
      }],
      activeProfileId: DEFAULT_PROFILE_ID,
      someFutureField: 'ignored',
    };
    const { state: loaded, report } = normalizeState(future);
    expect(getActiveProfile(loaded)!.slots[0].name).toBe('Kept');
    expect(loaded.enabled).toBe(true);
    expect(report.repairs.join(' ')).toMatch(/newer than this build/);
  });

  it('replaces an unsupported unassigned-slot behaviour with the safe default', () => {
    const { state: repaired, report } = normalizeState({
      version: 1,
      unassignedSlotBehaviour: 'reset-to-default',
      profiles: [{ id: DEFAULT_PROFILE_ID, name: 'D', isDefault: true, slots: [] }],
      activeProfileId: DEFAULT_PROFILE_ID,
    });
    expect(repaired.unassignedSlotBehaviour).toBe('keep-current');
    expect(report.repairs.join(' ')).toMatch(/keep-current/);
  });

  it('is idempotent — re-normalising changes nothing', () => {
    const once = normalizeState(serializeState(fiveSlotState())).state;
    const twice = normalizeState(serializeState(once)).state;
    expect(twice).toEqual(once);
    expect(normalizeState(serializeState(twice)).report.clean).toBe(true);
  });
});

describe('persistence: runtime state (which slot is live)', () => {
  it('round-trips the active slot record', () => {
    saveWeaponSlotsRuntimeState({
      activeProfileId: 'profile-fortnite',
      activeSlotId: 'slot-2',
      activePresetId: 'preset-2',
      lastSwitchAt: 12345,
    });
    const loaded = loadWeaponSlotsRuntimeState();
    expect(loaded.activeProfileId).toBe('profile-fortnite');
    expect(loaded.activeSlotId).toBe('slot-2');
    expect(loaded.activePresetId).toBe('preset-2');
    expect(loaded.lastSwitchAt).toBe(12345);
  });

  it('falls back to an empty record when nothing is stored', () => {
    expect(loadWeaponSlotsRuntimeState()).toEqual(defaultRuntimeState());
  });

  it('repairs a corrupt runtime record', () => {
    localStorage.setItem(WEAPON_SLOTS_RUNTIME_KEY, '{"activeSlotId": 99, "lastSwitchAt": "soon"}');
    const loaded = loadWeaponSlotsRuntimeState();
    expect(loaded.activeSlotId).toBeNull();
    expect(loaded.lastSwitchAt).toBe(0);
  });

  it('repairs a non-JSON runtime record', () => {
    localStorage.setItem(WEAPON_SLOTS_RUNTIME_KEY, 'nonsense');
    expect(loadWeaponSlotsRuntimeState()).toEqual(defaultRuntimeState());
  });

  it('coalesces rapid writes so switching never hits disk per key press', async () => {
    const saver = createDebouncedRuntimeSaver(30);
    for (let n = 1; n <= 8; n += 1) {
      saver.save({
        activeProfileId: DEFAULT_PROFILE_ID,
        activeSlotId: `slot-${n}`,
        activePresetId: `preset-${n}`,
        lastSwitchAt: n,
      });
    }
    // Nothing written yet.
    expect(localStorage.getItem(WEAPON_SLOTS_RUNTIME_KEY)).toBeNull();

    await new Promise((resolve) => setTimeout(resolve, 60));
    const written = JSON.parse(localStorage.getItem(WEAPON_SLOTS_RUNTIME_KEY) ?? '{}');
    expect(written.activeSlotId).toBe('slot-8');
    saver.cancel();
  });

  it('flush() writes immediately on shutdown', () => {
    const saver = createDebouncedRuntimeSaver(10_000);
    saver.save({ ...defaultRuntimeState(), activeSlotId: 'slot-3' });
    expect(localStorage.getItem(WEAPON_SLOTS_RUNTIME_KEY)).toBeNull();
    saver.flush();
    expect(JSON.parse(localStorage.getItem(WEAPON_SLOTS_RUNTIME_KEY) ?? '{}').activeSlotId).toBe('slot-3');
  });

  it('cancel() discards a pending write', () => {
    const saver = createDebouncedRuntimeSaver(10_000);
    saver.save({ ...defaultRuntimeState(), activeSlotId: 'slot-4' });
    saver.cancel();
    saver.flush();
    expect(localStorage.getItem(WEAPON_SLOTS_RUNTIME_KEY)).toBeNull();
  });
});
