import { describe, expect, it } from 'vitest';
import {
  addProfile,
  addSlot,
  addTemplateProfile,
  assignPreset,
  clearPreset,
  clearSlotBinding,
  duplicateProfile,
  factoryReset,
  getActiveProfile,
  getSlot,
  moveSlot,
  removeProfile,
  removeSlot,
  renameProfile,
  renameSlot,
  resetProfileSlots,
  restoreDefaultSlots,
  setActiveProfile,
  setFeatureEnabled,
  setProfileProcessNames,
  setSlotBinding,
  setSlotEnabled,
  toggleSlotEnabled,
} from '../src/lib/weaponSlots/slotStore';
import { MAX_SLOTS_PER_PROFILE } from '../src/lib/weaponSlots/bindingRules';
import { createDefaultState, DEFAULT_PROFILE_ID } from '../src/lib/weaponSlots/defaults';
import { makeBinding } from '../src/lib/weaponSlots/keys';
import type { WeaponSlotsState } from '../src/lib/weaponSlots/types';

/**
 * Configuration surface: every mutation a user can perform in the Weapon Slot
 * Crosshairs UI, exercised through the pure store layer.
 */

const P = DEFAULT_PROFILE_ID;

function base(): WeaponSlotsState {
  return createDefaultState();
}

function expectOk(result: { ok: boolean; state?: WeaponSlotsState; error?: string }): WeaponSlotsState {
  if (!result.ok || !result.state) throw new Error(`expected success, got: ${result.error}`);
  return result.state;
}

describe('configuration: creating slots', () => {
  it('ships five ready-made slots in the default profile', () => {
    const st = base();
    expect(getActiveProfile(st)?.slots).toHaveLength(5);
    expect(getActiveProfile(st)?.slots.map((s) => s.name)).toEqual([
      'Shotgun', 'Assault Rifle', 'SMG', 'Sniper', 'Utility',
    ]);
  });

  it('binds the five default slots to keys 1-5', () => {
    const st = base();
    expect(getActiveProfile(st)?.slots.map((s) => s.binding?.code)).toEqual([
      'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5',
    ]);
  });

  it('adds a slot with the next sequential index', () => {
    const st = expectOk(addSlot(base(), P, 'Pistol'));
    const slots = getActiveProfile(st)!.slots;
    expect(slots).toHaveLength(6);
    expect(slots[5].name).toBe('Pistol');
    expect(slots[5].index).toBe(6);
    expect(slots[5].enabled).toBe(true);
    expect(slots[5].binding).toBeNull();
    expect(slots[5].presetId).toBeNull();
  });

  it('gives an unnamed new slot a sensible placeholder label', () => {
    const st = expectOk(addSlot(base(), P));
    expect(getActiveProfile(st)!.slots[5].name).toBe('Slot 6');
  });

  it('assigns every new slot a unique id', () => {
    let st = base();
    for (let i = 0; i < 5; i += 1) st = expectOk(addSlot(st, P));
    const ids = getActiveProfile(st)!.slots.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('supports well beyond the five example slots', () => {
    let st = base();
    for (let i = 0; i < 12; i += 1) st = expectOk(addSlot(st, P, `Extra ${i}`));
    expect(getActiveProfile(st)!.slots).toHaveLength(17);
  });

  it('refuses to exceed the documented ceiling', () => {
    let st = base();
    for (let i = 0; i < MAX_SLOTS_PER_PROFILE - 5; i += 1) st = expectOk(addSlot(st, P));
    expect(getActiveProfile(st)!.slots).toHaveLength(MAX_SLOTS_PER_PROFILE);

    const overflow = addSlot(st, P);
    expect(overflow.ok).toBe(false);
    if (!overflow.ok) expect(overflow.error).toMatch(/at most/);
  });

  it('rejects adding to a profile that does not exist', () => {
    const result = addSlot(base(), 'profile-nope');
    expect(result.ok).toBe(false);
  });
});

describe('configuration: removing slots', () => {
  it('removes the requested slot', () => {
    const st = expectOk(removeSlot(base(), P, getActiveProfile(base())!.slots[2].id));
    const names = getActiveProfile(st)!.slots.map((s) => s.name);
    expect(names).toEqual(['Shotgun', 'Assault Rifle', 'Sniper', 'Utility']);
  });

  it('re-numbers the remaining slots so the column stays contiguous', () => {
    const st = expectOk(removeSlot(base(), P, getActiveProfile(base())!.slots[0].id));
    expect(getActiveProfile(st)!.slots.map((s) => s.index)).toEqual([1, 2, 3, 4]);
  });

  it('leaves the other slots untouched', () => {
    const before = getActiveProfile(base())!.slots;
    const st = expectOk(removeSlot(base(), P, before[1].id));
    const after = getActiveProfile(st)!.slots;
    expect(after[0].binding?.code).toBe(before[0].binding?.code);
    expect(after[0].presetId).toBe(before[0].presetId);
    expect(after[0].name).toBe(before[0].name);
  });

  it('can remove every slot, leaving an empty but valid profile', () => {
    let st = base();
    for (const s of getActiveProfile(base())!.slots) {
      st = expectOk(removeSlot(st, P, s.id));
    }
    expect(getActiveProfile(st)!.slots).toHaveLength(0);
  });

  it('rejects removing an unknown slot', () => {
    expect(removeSlot(base(), P, 'nope').ok).toBe(false);
  });
});

describe('configuration: renaming slots', () => {
  it('renames a slot', () => {
    const id = getActiveProfile(base())!.slots[0].id;
    const st = expectOk(renameSlot(base(), P, id, 'Pump Shotgun'));
    expect(getSlot(st, P, id)?.name).toBe('Pump Shotgun');
  });

  it('trims surrounding whitespace', () => {
    const id = getActiveProfile(base())!.slots[0].id;
    const st = expectOk(renameSlot(base(), P, id, '   SMG   '));
    expect(getSlot(st, P, id)?.name).toBe('SMG');
  });

  it('rejects an empty name', () => {
    const id = getActiveProfile(base())!.slots[0].id;
    const result = renameSlot(base(), P, id, '    ');
    expect(result.ok).toBe(false);
  });

  it('rejects an absurdly long name', () => {
    const id = getActiveProfile(base())!.slots[0].id;
    expect(renameSlot(base(), P, id, 'x'.repeat(80)).ok).toBe(false);
  });

  it('allows two slots to share a display name', () => {
    const slots = getActiveProfile(base())!.slots;
    let st = expectOk(renameSlot(base(), P, slots[0].id, 'Primary'));
    st = expectOk(renameSlot(st, P, slots[1].id, 'Primary'));
    expect(getActiveProfile(st)!.slots.filter((s) => s.name === 'Primary')).toHaveLength(2);
  });

  it('renaming never changes the slot id or its binding', () => {
    const id = getActiveProfile(base())!.slots[3].id;
    const st = expectOk(renameSlot(base(), P, id, 'AWP'));
    const renamed = getSlot(st, P, id)!;
    expect(renamed.id).toBe(id);
    expect(renamed.binding?.code).toBe('Digit4');
    expect(renamed.presetId).toBe('pro-8');
  });
});

describe('configuration: changing activation keys', () => {
  it('assigns a key to an unbound slot', () => {
    const st0 = expectOk(addSlot(base(), P, 'Melee'));
    const id = getActiveProfile(st0)!.slots[5].id;
    const st = expectOk(setSlotBinding(st0, P, id, makeBinding('KeyV')));
    expect(getSlot(st, P, id)?.binding?.code).toBe('KeyV');
  });

  it('replaces an existing key', () => {
    const id = getActiveProfile(base())!.slots[0].id;
    const st = expectOk(setSlotBinding(base(), P, id, makeBinding('Numpad1')));
    expect(getSlot(st, P, id)?.binding?.code).toBe('Numpad1');
  });

  it('preserves modifiers', () => {
    const id = getActiveProfile(base())!.slots[0].id;
    const st = expectOk(setSlotBinding(base(), P, id, makeBinding('Digit1', ['ctrl', 'alt'])));
    expect(getSlot(st, P, id)?.binding?.modifiers).toEqual(['ctrl', 'alt']);
  });

  it('clears a key, leaving the slot unbound rather than deleting it', () => {
    const id = getActiveProfile(base())!.slots[0].id;
    const st = expectOk(clearSlotBinding(base(), P, id));
    const cleared = getSlot(st, P, id)!;
    expect(cleared.binding).toBeNull();
    expect(cleared.name).toBe('Shotgun');
    expect(cleared.presetId).toBe('pro-11');
  });

  it('steals the key from another slot in the same profile instead of duplicating it', () => {
    const slots = getActiveProfile(base())!.slots;
    // Give slot 5 the key that slot 1 currently owns.
    const st = expectOk(setSlotBinding(base(), P, slots[4].id, makeBinding('Digit1')));
    const after = getActiveProfile(st)!.slots;
    expect(after[4].binding?.code).toBe('Digit1');
    expect(after[0].binding).toBeNull();
  });

  it('allows the same key in two different profiles', () => {
    let st = expectOk(addTemplateProfile(base(), 'fortnite'));
    const fortnite = st.profiles.find((p) => p.name === 'Fortnite')!;
    st = expectOk(setActiveProfile(st, fortnite.id));
    expect(getActiveProfile(st)!.slots[0].binding?.code).toBe('Digit1');
    expect(st.profiles.find((p) => p.id === P)!.slots[0].binding?.code).toBe('Digit1');
  });
});

describe('configuration: assigning and clearing crosshairs', () => {
  it('assigns a preset by id', () => {
    const id = getActiveProfile(base())!.slots[0].id;
    const st = expectOk(assignPreset(base(), P, id, 'dot-round-0-1'));
    expect(getSlot(st, P, id)?.presetId).toBe('dot-round-0-1');
  });

  it('clears an assignment without touching the key or the name', () => {
    const id = getActiveProfile(base())!.slots[0].id;
    const st = expectOk(clearPreset(base(), P, id));
    const cleared = getSlot(st, P, id)!;
    expect(cleared.presetId).toBeNull();
    expect(cleared.binding?.code).toBe('Digit1');
    expect(cleared.name).toBe('Shotgun');
  });

  it('rejects a non-string preset reference', () => {
    const id = getActiveProfile(base())!.slots[0].id;
    expect(assignPreset(base(), P, id, 42 as unknown as string).ok).toBe(false);
    expect(assignPreset(base(), P, id, '').ok).toBe(false);
  });

  it('keeps the assignment when the slot is renamed or rebound', () => {
    const id = getActiveProfile(base())!.slots[2].id;
    let st = expectOk(assignPreset(base(), P, id, 'pro-1'));
    st = expectOk(renameSlot(st, P, id, 'Spray Control'));
    st = expectOk(setSlotBinding(st, P, id, makeBinding('KeyR')));
    expect(getSlot(st, P, id)?.presetId).toBe('pro-1');
  });
});

describe('configuration: enabling and disabling individual slots', () => {
  it('disables a slot', () => {
    const id = getActiveProfile(base())!.slots[1].id;
    const st = expectOk(setSlotEnabled(base(), P, id, false));
    expect(getSlot(st, P, id)?.enabled).toBe(false);
  });

  it('toggles a slot back on', () => {
    const id = getActiveProfile(base())!.slots[1].id;
    let st = expectOk(toggleSlotEnabled(base(), P, id));
    expect(getSlot(st, P, id)?.enabled).toBe(false);
    st = expectOk(toggleSlotEnabled(st, P, id));
    expect(getSlot(st, P, id)?.enabled).toBe(true);
  });

  it('keeps every other property when disabled', () => {
    const id = getActiveProfile(base())!.slots[0].id;
    const st = expectOk(setSlotEnabled(base(), P, id, false));
    const disabled = getSlot(st, P, id)!;
    expect(disabled.binding?.code).toBe('Digit1');
    expect(disabled.presetId).toBe('pro-11');
    expect(disabled.name).toBe('Shotgun');
  });

  it('rejects toggling an unknown slot', () => {
    expect(toggleSlotEnabled(base(), P, 'nope').ok).toBe(false);
  });

  it('toggles the whole feature independently of the slots', () => {
    const st = setFeatureEnabled(base(), true);
    expect(st.enabled).toBe(true);
    expect(getActiveProfile(st)!.slots.every((s) => s.enabled)).toBe(true);
  });
});

describe('configuration: ordering', () => {
  it('moves a slot down and renumbers', () => {
    const slots = getActiveProfile(base())!.slots;
    const st = expectOk(moveSlot(base(), P, slots[0].id, 1));
    expect(getActiveProfile(st)!.slots.map((s) => s.name)).toEqual([
      'Assault Rifle', 'Shotgun', 'SMG', 'Sniper', 'Utility',
    ]);
    expect(getActiveProfile(st)!.slots.map((s) => s.index)).toEqual([1, 2, 3, 4, 5]);
  });

  it('moves a slot up', () => {
    const slots = getActiveProfile(base())!.slots;
    const st = expectOk(moveSlot(base(), P, slots[4].id, -1));
    expect(getActiveProfile(st)!.slots.map((s) => s.name)[3]).toBe('Utility');
  });

  it('is a no-op at either end of the list', () => {
    const slots = getActiveProfile(base())!.slots;
    const atTop = expectOk(moveSlot(base(), P, slots[0].id, -1));
    expect(atTop).toEqual(base());
    const atBottom = expectOk(moveSlot(base(), P, slots[4].id, 1));
    expect(atBottom).toEqual(base());
  });

  it('carries the binding and preset along with the slot', () => {
    const slots = getActiveProfile(base())!.slots;
    const st = expectOk(moveSlot(base(), P, slots[0].id, 1));
    const moved = getActiveProfile(st)!.slots[1];
    expect(moved.binding?.code).toBe('Digit1');
    expect(moved.presetId).toBe('pro-11');
  });
});

describe('configuration: restoring defaults', () => {
  it('restores the shipped five slots after the user has wrecked them', () => {
    let st = base();
    st = expectOk(removeSlot(st, P, getActiveProfile(st)!.slots[0].id));
    st = expectOk(renameSlot(st, P, getActiveProfile(st)!.slots[0].id, 'Renamed'));
    st = expectOk(addSlot(st, P, 'Junk'));

    const restored = expectOk(resetProfileSlots(st, P));
    const slots = getActiveProfile(restored)!.slots;
    expect(slots).toHaveLength(5);
    expect(slots.map((s) => s.name)).toEqual([
      'Shotgun', 'Assault Rifle', 'SMG', 'Sniper', 'Utility',
    ]);
  });

  it('"restore defaults" in the UI leaves the master switch alone', () => {
    const enabled = setFeatureEnabled(base(), true);
    const restored = restoreDefaultSlots(enabled);
    expect(restored.enabled).toBe(true);
  });

  it('"restore defaults" does not delete other game profiles', () => {
    const withProfile = expectOk(addTemplateProfile(base(), 'cs2'));
    const restored = restoreDefaultSlots(withProfile);
    expect(restored.profiles.map((p) => p.name)).toContain('CS2');
  });

  it('factory reset returns a pristine, disabled state', () => {
    const fresh = factoryReset();
    expect(fresh.enabled).toBe(false);
    expect(fresh.profiles).toHaveLength(1);
    expect(getActiveProfile(fresh)!.slots).toHaveLength(5);
  });
});

describe('configuration: game profiles', () => {
  it('adds a blank profile with a full default slot set', () => {
    const st = expectOk(addProfile(base(), 'Apex Legends', ['r5apex.exe']));
    const added = st.profiles.find((p) => p.name === 'Apex Legends')!;
    expect(added.slots).toHaveLength(5);
    expect(added.matchProcessNames).toEqual(['r5apex.exe']);
    expect(added.isDefault).toBe(false);
    expect(added.restrictToMatchedProcesses).toBe(false);
  });

  it('normalises process names from paths, mixed case and lists', () => {
    const st = expectOk(
      setProfileProcessNames(base(), P, [
        'C:\\Games\\FortniteClient-Win64-Shipping.exe',
        'CS2.EXE',
        'valorant.exe, deadgame.exe',
      ]),
    );
    expect(getActiveProfile(st)!.matchProcessNames).toEqual([
      'fortniteclient-win64-shipping.exe',
      'cs2.exe',
      'valorant.exe',
      'deadgame.exe',
    ]);
  });

  it('de-duplicates process names', () => {
    const st = expectOk(setProfileProcessNames(base(), P, ['cs2.exe', 'CS2.exe', 'cs2.exe']));
    expect(getActiveProfile(st)!.matchProcessNames).toEqual(['cs2.exe']);
  });

  it('rejects duplicate profile names case-insensitively', () => {
    expect(addProfile(base(), 'default').ok).toBe(false);
  });

  it('rejects an empty profile name', () => {
    expect(addProfile(base(), '   ').ok).toBe(false);
  });

  it('switches the active profile', () => {
    const st = expectOk(addProfile(base(), 'Fortnite'));
    const fortnite = st.profiles.find((p) => p.name === 'Fortnite')!;
    const activated = expectOk(setActiveProfile(st, fortnite.id));
    expect(activated.activeProfileId).toBe(fortnite.id);
    expect(getActiveProfile(activated)?.name).toBe('Fortnite');
  });

  it('refuses to activate an unknown profile', () => {
    expect(setActiveProfile(base(), 'nope').ok).toBe(false);
  });

  it('duplicates a profile with fresh slot ids', () => {
    const st = expectOk(duplicateProfile(base(), P));
    const copy = st.profiles.find((p) => p.name === 'Default Copy')!;
    const original = st.profiles.find((p) => p.id === P)!;
    expect(copy.slots.map((s) => s.name)).toEqual(original.slots.map((s) => s.name));
    expect(copy.slots.map((s) => s.presetId)).toEqual(original.slots.map((s) => s.presetId));
    expect(copy.slots.every((s) => !original.slots.some((o) => o.id === s.id))).toBe(true);
    expect(copy.isDefault).toBe(false);
  });

  it('refuses to remove the default profile', () => {
    const result = removeProfile(base(), P);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/cannot be removed/);
  });

  it('removes a non-default profile and re-points the active selection', () => {
    let st = expectOk(addProfile(base(), 'Fortnite'));
    const fortnite = st.profiles.find((p) => p.name === 'Fortnite')!;
    st = expectOk(setActiveProfile(st, fortnite.id));
    st = expectOk(removeProfile(st, fortnite.id));
    expect(st.profiles).toHaveLength(1);
    expect(st.activeProfileId).toBe(P);
  });

  it('renames a profile', () => {
    const st = expectOk(renameProfile(base(), P, 'Everything Else'));
    expect(getActiveProfile(st)!.name).toBe('Everything Else');
  });

  it('offers Fortnite and CS2 templates with matching process names', () => {
    const fortnite = expectOk(addTemplateProfile(base(), 'fortnite'));
    expect(fortnite.profiles[1].matchProcessNames).toEqual(['fortniteclient-win64-shipping.exe']);
    const cs2 = expectOk(addTemplateProfile(base(), 'cs2'));
    expect(cs2.profiles[1].matchProcessNames).toEqual(['cs2.exe']);
  });

  it('suffixes a template name when it collides', () => {
    let st = expectOk(addTemplateProfile(base(), 'fortnite'));
    st = expectOk(addTemplateProfile(st, 'fortnite'));
    expect(st.profiles.map((p) => p.name)).toEqual(['Default', 'Fortnite', 'Fortnite 2']);
  });
});

describe('configuration: immutability', () => {
  it('never mutates the state it was given', () => {
    const original = base();
    const snapshot = JSON.stringify(original);
    const id = getActiveProfile(original)!.slots[0].id;

    expectOk(renameSlot(original, P, id, 'Changed'));
    expectOk(removeSlot(original, P, id));
    expectOk(addSlot(original, P, 'Added'));
    expectOk(setSlotEnabled(original, P, id, false));
    expectOk(assignPreset(original, P, id, 'pro-1'));

    expect(JSON.stringify(original)).toBe(snapshot);
  });

  it('invalid slot configurations are rejected rather than half-applied', () => {
    const original = base();
    const failures = [
      renameSlot(original, P, 'missing', 'X'),
      assignPreset(original, 'missing', 'x', 'pro-1'),
      setSlotBinding(original, P, 'missing', makeBinding('Digit1')),
      moveSlot(original, P, 'missing', 1),
    ];
    for (const result of failures) expect(result.ok).toBe(false);
    expect(original).toEqual(base());
  });
});

describe('configuration: creating a profile selects it', () => {
  it('selects a newly added blank profile', () => {
    const st = expectOk(addProfile(base(), 'Apex Legends', ['r5apex.exe']));
    const added = st.profiles.find((p) => p.name === 'Apex Legends')!;
    expect(st.activeProfileId).toBe(added.id);
    expect(getActiveProfile(st)!.name).toBe('Apex Legends');
  });

  it('selects a newly added template profile', () => {
    const st = expectOk(addTemplateProfile(base(), 'cs2'));
    expect(getActiveProfile(st)!.name).toBe('CS2');
    expect(st.activeProfileId).not.toBe(P);
  });

  it('selects the copy after duplicating', () => {
    const st = expectOk(duplicateProfile(base(), P));
    const copy = st.profiles.find((p) => p.name === 'Default Copy')!;
    expect(st.activeProfileId).toBe(copy.id);
  });

  it('still refuses to activate an unknown profile', () => {
    expect(setActiveProfile(base(), 'nope').ok).toBe(false);
    expect(base().activeProfileId).toBe(P);
  });

  it('leaves the default profile selected when creation fails', () => {
    const st = addProfile(base(), 'default');
    expect(st.ok).toBe(false);
    expect((st as { state?: unknown }).state).toBeUndefined();
  });
});
