import { describe, expect, it } from 'vitest';
import {
  dedupeSlotBindings,
  findDuplicateBindings,
  findSlotForBinding,
  MAX_SLOTS_PER_PROFILE,
  validateBinding,
  validateState,
} from '../src/lib/weaponSlots/bindingRules';
import { makeBinding, parseLegacyBinding, toAccelerator } from '../src/lib/weaponSlots/keys';
import { reservedBindingsFromSettings } from '../src/lib/weaponSlots/migration';
import { createDefaultState, DEFAULT_PROFILE_ID } from '../src/lib/weaponSlots/defaults';
import {
  FALLBACK_CAPABILITIES,
  PASSIVE_CAPABILITIES,
  profile,
  slot,
  state,
} from './helpers';
import type {
  InputTransportCapabilities,
  SlotKeyBinding,
  WeaponSlotsState,
} from '../src/lib/weaponSlots/types';

/**
 * Binding rules: conflict detection, reserved keys and transport capability
 * gating. These are the rules the UI quotes back to the user, so the messages
 * are asserted as well as the verdicts.
 */

function ctx(
  capabilities: InputTransportCapabilities = PASSIVE_CAPABILITIES,
  reservedBindings: SlotKeyBinding[] = [makeBinding('F10'), makeBinding('F9'), makeBinding('F8')],
) {
  return { capabilities, reservedBindings };
}

const defaultProfile = () => createDefaultState().profiles[0];

/**
 * An empty profile isolates a single rule: with the shipped defaults present, a
 * bare `Digit1` would also trip the conflict rule and mask what is being tested.
 */
const emptyProfile = () => profile({ slots: [] });

function codes(issues: Array<{ code: string }>): string[] {
  return issues.map((i) => i.code);
}

describe('binding rules: unbound slots', () => {
  it('reports an unbound slot as a non-blocking notice', () => {
    const issues = validateBinding(null, ctx(), defaultProfile(), 'slot-default-1');
    expect(codes(issues)).toEqual(['empty']);
    expect(issues[0].blocking).toBe(false);
  });

  it('explains that an unbound slot will never trigger', () => {
    const issues = validateBinding(null, ctx(), defaultProfile(), 'slot-default-1');
    expect(issues[0].message).toMatch(/never trigger/i);
  });

  it('marks an unbound slot as not switchable', () => {
    const st = state({
      enabled: true,
      profiles: [profile({ slots: [slot({ index: 1, binding: null, presetId: 'pro-1' })] })],
    });
    const report = validateState(st, ctx());
    const entry = Object.values(report)[0];
    expect(entry.unbound).toBe(true);
    expect(entry.canSwitch).toBe(false);
    expect(entry.blocking).toBe(false);
  });
});

describe('binding rules: unknown inputs', () => {
  it('rejects a code that is not in the key table', () => {
    const issues = validateBinding(
      makeBinding('NotAKey'),
      ctx(),
      defaultProfile(),
      'slot-default-1',
    );
    expect(codes(issues)).toContain('unknown-key');
    expect(issues.some((i) => i.blocking)).toBe(true);
  });

  it('accepts every code the key table defines', () => {
    for (const code of ['Digit1', 'KeyQ', 'F12', 'Numpad5', 'ArrowUp', 'Space', 'Backquote']) {
      const issues = validateBinding(makeBinding(code), ctx(), defaultProfile(), 'slot-default-1');
      expect(issues.some((i) => i.code === 'unknown-key')).toBe(false);
    }
  });

  it('accepts mouse and wheel codes as known', () => {
    for (const code of ['MouseButton4', 'MouseButton5', 'WheelUp', 'WheelDown']) {
      const issues = validateBinding(makeBinding(code), ctx(), defaultProfile(), 'slot-default-1');
      expect(issues.some((i) => i.code === 'unknown-key')).toBe(false);
    }
  });
});

describe('binding rules: keys reserved by crshhx itself', () => {
  it('refuses the overlay-toggle hotkey', () => {
    const issues = validateBinding(makeBinding('F10'), ctx(), defaultProfile(), 'slot-default-1');
    expect(codes(issues)).toContain('reserved');
    expect(issues.find((i) => i.code === 'reserved')?.blocking).toBe(true);
  });

  it('refuses the preset-cycle and centre-lock hotkeys', () => {
    for (const code of ['F9', 'F8']) {
      const issues = validateBinding(makeBinding(code), ctx(), defaultProfile(), 'slot-default-1');
      expect(codes(issues)).toContain('reserved');
    }
  });

  it('matches reserved keys including their modifiers', () => {
    const reserved = [makeBinding('Digit1', ['ctrl'])];
    const issues = validateBinding(
      makeBinding('Digit1', ['ctrl']),
      ctx(PASSIVE_CAPABILITIES, reserved),
      defaultProfile(),
      'slot-default-1',
    );
    expect(codes(issues)).toContain('reserved');
  });

  it('allows an unreserved function key', () => {
    const issues = validateBinding(makeBinding('F6'), ctx(), defaultProfile(), 'slot-default-1');
    expect(codes(issues)).not.toContain('reserved');
  });

  it('derives reserved keys from the real app settings, preserving them', () => {
    // The registered overlay hotkeys must keep working; slots may not steal them.
    const reserved = reservedBindingsFromSettings({
      overlayVisible: true,
      toggleOverlayHotkey: 'F10',
      cyclePresetHotkey: 'F9',
      centerLockHotkey: 'F8',
      selectedMonitor: 0,
      runAtStartup: false,
      suspendedWhenMinimized: true,
    });
    expect(reserved.map((b) => b.code)).toEqual(['F10', 'F9']);
  });

  it('lets a slot use F8, which crshhx declares but never registers', () => {
    const settings = {
      overlayVisible: true,
      toggleOverlayHotkey: 'F10',
      cyclePresetHotkey: 'F9',
      centerLockHotkey: 'F8',
      selectedMonitor: 0,
      runAtStartup: false,
      suspendedWhenMinimized: true,
    };
    const issues = validateBinding(
      makeBinding('F8'),
      { capabilities: PASSIVE_CAPABILITIES, reservedBindings: reservedBindingsFromSettings(settings) },
      emptyProfile(),
      'slot-x',
    );
    expect(codes(issues)).not.toContain('reserved');
    expect(issues.some((i) => i.blocking)).toBe(false);
  });
});

describe('binding rules: conflicts between slots', () => {
  it('reports a duplicate key inside the same profile and names the other slot', () => {
    const p = profile({
      slots: [
        slot({ index: 1, name: 'Shotgun', binding: makeBinding('Digit1'), presetId: 'pro-11' }),
        slot({ index: 2, name: 'AR', binding: null, presetId: 'pro-15' }),
      ],
    });
    const issues = validateBinding(makeBinding('Digit1'), ctx(), p, p.slots[1].id);
    const conflict = issues.find((i) => i.code === 'conflict-slot');
    expect(conflict).toBeDefined();
    expect(conflict?.blocking).toBe(true);
    expect(conflict?.message).toContain('Shotgun');
    expect(conflict?.message).toContain('slot 1');
  });

  it('does not report a slot as conflicting with itself', () => {
    const p = defaultProfile();
    const issues = validateBinding(makeBinding('Digit1'), ctx(), p, p.slots[0].id);
    expect(codes(issues)).not.toContain('conflict-slot');
  });

  it('treats a different modifier combination as a different binding', () => {
    const p = profile({
      slots: [slot({ index: 1, binding: makeBinding('Digit1'), presetId: 'pro-11' })],
    });
    const issues = validateBinding(makeBinding('Digit1', ['alt']), ctx(), p, 'other');
    expect(codes(issues)).not.toContain('conflict-slot');
  });

  it('permits the same key in a different profile', () => {
    const st = state({
      enabled: true,
      profiles: [
        profile({ id: 'a', name: 'A', slots: [slot({ index: 1, binding: makeBinding('Digit1'), presetId: 'pro-1' })] }),
        profile({ id: 'b', name: 'B', isDefault: false, slots: [slot({ index: 1, binding: makeBinding('Digit1'), presetId: 'pro-2' })] }),
      ],
    });
    const report = validateState(st, ctx());
    expect(Object.values(report).every((r) => !r.blocking)).toBe(true);
  });

  it('findDuplicateBindings groups every collision in a profile', () => {
    const p = profile({
      slots: [
        slot({ index: 1, binding: makeBinding('Digit1') }),
        slot({ index: 2, binding: makeBinding('Digit1') }),
        slot({ index: 3, binding: makeBinding('Digit2') }),
        slot({ index: 4, binding: makeBinding('Digit1') }),
      ],
    });
    const groups = findDuplicateBindings(p);
    expect(groups).toHaveLength(1);
    expect(groups[0]).toHaveLength(3);
  });

  it('dedupeSlotBindings keeps the first slot and clears the rest', () => {
    const p = profile({
      slots: [
        slot({ index: 1, binding: makeBinding('Digit1'), presetId: 'a' }),
        slot({ index: 2, binding: makeBinding('Digit1'), presetId: 'b' }),
      ],
    });
    const deduped = dedupeSlotBindings(p.slots);
    expect(deduped[0].binding?.code).toBe('Digit1');
    expect(deduped[1].binding).toBeNull();
    // Everything except the binding survives.
    expect(deduped[1].presetId).toBe('b');
    expect(deduped[1].name).toBe(p.slots[1].name);
  });
});

describe('binding rules: transport capabilities', () => {
  it('blocks mouse bindings when the passive hook is not running', () => {
    const issues = validateBinding(
      makeBinding('MouseButton4'),
      ctx(FALLBACK_CAPABILITIES),
      emptyProfile(),
      'slot-x',
    );
    const unsupported = issues.find((i) => i.code === 'unsupported-by-transport');
    expect(unsupported?.blocking).toBe(true);
    expect(unsupported?.message).toMatch(/passive input hook/i);
  });

  it('blocks wheel bindings when the passive hook is not running', () => {
    const issues = validateBinding(
      makeBinding('WheelUp'),
      ctx(FALLBACK_CAPABILITIES),
      emptyProfile(),
      'slot-x',
    );
    expect(codes(issues)).toContain('unsupported-by-transport');
  });

  it('allows mouse and wheel bindings on the passive hook', () => {
    for (const code of ['MouseButton4', 'MouseButton5', 'WheelUp', 'WheelDown']) {
      const issues = validateBinding(makeBinding(code), ctx(PASSIVE_CAPABILITIES), emptyProfile(), 'slot-x');
      expect(issues.some((i) => i.blocking)).toBe(false);
    }
  });

  it('notes that mouse and wheel cannot be expressed as an OS hotkey', () => {
    expect(toAccelerator(makeBinding('MouseButton4'))).toBeNull();
    expect(toAccelerator(makeBinding('WheelUp'))).toBeNull();
    expect(toAccelerator(makeBinding('Digit1'))).toBe('1');
  });
});

describe('binding rules: bare typing keys and the consuming fallback', () => {
  it('demands a modifier on a plain number key when the transport consumes input', () => {
    const issues = validateBinding(makeBinding('Digit1'), ctx(FALLBACK_CAPABILITIES), emptyProfile(), 'slot-x');
    const required = issues.find((i) => i.code === 'modifier-required');
    expect(required?.blocking).toBe(true);
    expect(required?.message).toMatch(/stop it reaching the game/i);
  });

  it('demands a modifier on plain letters too', () => {
    const issues = validateBinding(makeBinding('KeyW'), ctx(FALLBACK_CAPABILITIES), emptyProfile(), 'slot-x');
    expect(codes(issues)).toContain('modifier-required');
  });

  it('accepts a modified key on the consuming transport', () => {
    const issues = validateBinding(makeBinding('Digit1', ['alt']), ctx(FALLBACK_CAPABILITIES), emptyProfile(), 'slot-x');
    expect(issues.some((i) => i.blocking)).toBe(false);
  });

  it('accepts a bare function key on the consuming transport', () => {
    const issues = validateBinding(makeBinding('F6'), ctx(FALLBACK_CAPABILITIES), emptyProfile(), 'slot-x');
    expect(issues.some((i) => i.blocking)).toBe(false);
  });

  it('allows a bare number key on the passive hook and says the game still gets it', () => {
    const issues = validateBinding(makeBinding('Digit1'), ctx(PASSIVE_CAPABILITIES), emptyProfile(), 'slot-x');
    const info = issues.find((i) => i.code === 'typing-critical');
    expect(info).toBeDefined();
    expect(info?.blocking).toBe(false);
    expect(info?.message).toMatch(/observed passively/i);
    expect(issues.some((i) => i.blocking)).toBe(false);
  });
});

describe('binding rules: validateState produces a usable switchability matrix', () => {
  const st: WeaponSlotsState = state({
    enabled: true,
    profiles: [
      profile({
        slots: [
          slot({ index: 1, id: 'good', binding: makeBinding('Digit1'), presetId: 'pro-1' }),
          slot({ index: 2, id: 'disabled', binding: makeBinding('Digit2'), presetId: 'pro-2', enabled: false }),
          slot({ index: 3, id: 'unassigned', binding: makeBinding('Digit3'), presetId: null }),
          slot({ index: 4, id: 'unbound', binding: null, presetId: 'pro-4' }),
          slot({ index: 5, id: 'reserved', binding: makeBinding('F10'), presetId: 'pro-5' }),
        ],
      }),
    ],
  });
  const report = validateState(st, ctx());

  it('marks only the fully configured slot as switchable', () => {
    expect(report.good.canSwitch).toBe(true);
    expect(report.disabled.canSwitch).toBe(false);
    expect(report.unassigned.canSwitch).toBe(false);
    expect(report.unbound.canSwitch).toBe(false);
    expect(report.reserved.canSwitch).toBe(false);
  });

  it('flags only the reserved binding as blocking', () => {
    expect(report.good.blocking).toBe(false);
    expect(report.disabled.blocking).toBe(false);
    expect(report.unassigned.blocking).toBe(false);
    expect(report.unbound.blocking).toBe(false);
    expect(report.reserved.blocking).toBe(true);
  });

  it('reports unassigned and unbound separately', () => {
    expect(report.unassigned.unassigned).toBe(true);
    expect(report.unassigned.unbound).toBe(false);
    expect(report.unbound.unbound).toBe(true);
    expect(report.unbound.unassigned).toBe(false);
  });

  it('marks nothing switchable when the feature is off', () => {
    const off = validateState({ ...st, enabled: false }, ctx());
    expect(Object.values(off).every((r) => !r.canSwitch)).toBe(true);
  });

  it('explains an unassigned slot as keeping the current crosshair', () => {
    const notice = report.unassigned.issues.find((i) => i.message.match(/current crosshair/i));
    expect(notice).toBeDefined();
    expect(notice?.blocking).toBe(false);
  });
});

describe('binding rules: slot lookup', () => {
  it('finds the slot that owns a binding', () => {
    const p = defaultProfile();
    expect(findSlotForBinding(p, makeBinding('Digit3'))?.name).toBe('SMG');
  });

  it('returns null when nothing owns the binding', () => {
    expect(findSlotForBinding(defaultProfile(), makeBinding('Digit9'))).toBeNull();
  });

  it('skips unbound slots', () => {
    const p = profile({ slots: [slot({ index: 1, binding: null })] });
    expect(findSlotForBinding(p, makeBinding('Digit1'))).toBeNull();
  });
});

describe('binding rules: limits', () => {
  it('exposes a generous slot ceiling rather than hardcoding five', () => {
    expect(MAX_SLOTS_PER_PROFILE).toBeGreaterThan(5);
  });
});

describe('binding rules: legacy accelerator parsing feeds validation', () => {
  it('parses the strings older settings stored', () => {
    expect(parseLegacyBinding('1')?.code).toBe('Digit1');
    expect(parseLegacyBinding('F10')?.code).toBe('F10');
    expect(parseLegacyBinding('num1')?.code).toBe('Numpad1');
    expect(parseLegacyBinding('Alt+1')?.modifiers).toEqual(['alt']);
    expect(parseLegacyBinding('Ctrl+Alt+Q')?.code).toBe('KeyQ');
    expect(parseLegacyBinding('q')?.code).toBe('KeyQ');
  });

  it('returns null rather than guessing on nonsense', () => {
    for (const bad of ['', '   ', 'NotAKey', 'Alt+', '1+2', null, undefined]) {
      expect(parseLegacyBinding(bad as string | null | undefined)).toBeNull();
    }
  });

  it('normalises modifier order regardless of input order', () => {
    expect(parseLegacyBinding('Shift+Alt+Ctrl+1')?.modifiers).toEqual(['ctrl', 'alt', 'shift']);
  });
});

describe('binding rules: the shipped default profile validates cleanly', () => {
  it('has no blocking issues on the passive hook', () => {
    const report = validateState(createDefaultState(), ctx(PASSIVE_CAPABILITIES));
    expect(Object.values(report).every((r) => !r.blocking)).toBe(true);
  });

  it('every default slot is switchable once the feature is enabled', () => {
    const report = validateState(
      { ...createDefaultState(), enabled: true },
      ctx(PASSIVE_CAPABILITIES),
    );
    expect(Object.values(report)).toHaveLength(5);
    expect(Object.values(report).every((r) => r.canSwitch)).toBe(true);
  });

  it('reports the shipped defaults as invalid on the consuming fallback transport', () => {
    // Honest behaviour: bare 1-5 cannot be honoured by OS hotkeys without
    // stealing them from the game, so the UI must say so instead of pretending.
    const report = validateState(
      { ...createDefaultState(), enabled: true },
      ctx(FALLBACK_CAPABILITIES),
    );
    expect(Object.values(report).every((r) => r.blocking)).toBe(true);
    expect(
      Object.values(report).every((r) => r.issues.some((i) => i.code === 'modifier-required')),
    ).toBe(true);
  });

  it('uses the default profile id constant consistently', () => {
    expect(defaultProfile().id).toBe(DEFAULT_PROFILE_ID);
  });
});

describe('binding rules: deleted presets are reported, never substituted', () => {
  const known = new Set(['pro-1', 'pro-2']);

  const st = (): WeaponSlotsState =>
    state({
      enabled: true,
      profiles: [
        profile({
          slots: [
            slot({ index: 1, id: 'ok', binding: makeBinding('Digit1'), presetId: 'pro-1' }),
            slot({ index: 2, id: 'gone', binding: makeBinding('Digit2'), presetId: 'pro-deleted' }),
            slot({ index: 3, id: 'none', binding: makeBinding('Digit3'), presetId: null }),
          ],
        }),
      ],
    });

  it('marks a slot pointing at a deleted preset as blocking', () => {
    const report = validateState(st(), { ...ctx(), knownPresetIds: known });
    expect(report.gone.blocking).toBe(true);
    expect(report.gone.canSwitch).toBe(false);
    expect(report.gone.issues.some((i) => i.code === 'preset-missing')).toBe(true);
  });

  it('names the missing identifier so the user can see exactly what broke', () => {
    const report = validateState(st(), { ...ctx(), knownPresetIds: known });
    const msg = report.gone.issues.find((i) => i.code === 'preset-missing')?.message ?? '';
    expect(msg).toContain('pro-deleted');
    expect(msg).toMatch(/no longer exists in your library/);
  });

  it('never reassigns the slot to a different preset', () => {
    const before = st();
    validateState(before, { ...ctx(), knownPresetIds: known });
    // Validation is read-only: the stored reference is untouched, so the slot
    // recovers by itself if the preset ever comes back.
    expect(before.profiles[0].slots[1].presetId).toBe('pro-deleted');
  });

  it('still counts a resolvable slot as switchable', () => {
    const report = validateState(st(), { ...ctx(), knownPresetIds: known });
    expect(report.ok.canSwitch).toBe(true);
    expect(report.ok.blocking).toBe(false);
  });

  it('reports an unassigned slot as a non-blocking no-op, not as missing', () => {
    const report = validateState(st(), { ...ctx(), knownPresetIds: known });
    expect(report.none.unassigned).toBe(true);
    expect(report.none.blocking).toBe(false);
    expect(report.none.canSwitch).toBe(false);
    expect(report.none.issues.some((i) => i.code === 'preset-unassigned')).toBe(true);
    expect(report.none.issues.some((i) => i.code === 'preset-missing')).toBe(false);
  });

  it('uses a distinct code for unassigned vs deleted so the UI can word them differently', () => {
    const report = validateState(st(), { ...ctx(), knownPresetIds: known });
    const unassignedCodes = report.none.issues.map((i) => i.code);
    const missingCodes = report.gone.issues.map((i) => i.code);
    expect(unassignedCodes).toContain('preset-unassigned');
    expect(missingCodes).toContain('preset-missing');
    expect(missingCodes).not.toContain('preset-unassigned');
  });

  it('does not invent a missing-preset verdict when no library was supplied', () => {
    // Callers that only care about key conflicts must not be forced to load the
    // preset library, and must not be told a preset is missing when unknown.
    const report = validateState(st(), ctx());
    expect(report.gone.blocking).toBe(false);
    expect(report.gone.canSwitch).toBe(true);
    expect(report.gone.issues.some((i) => i.code === 'preset-missing')).toBe(false);
  });

  it('treats an empty library as every preset being deleted', () => {
    const report = validateState(st(), { ...ctx(), knownPresetIds: new Set() });
    expect(report.ok.blocking).toBe(true);
    expect(report.gone.blocking).toBe(true);
    expect(Object.values(report).every((r) => !r.canSwitch)).toBe(true);
  });

  it('reports a deleted preset in every profile, not just the active one', () => {
    const two = st();
    two.profiles.push(
      profile({
        id: 'other',
        name: 'Other',
        isDefault: false,
        slots: [
          slot({ index: 1, id: 'other-gone', binding: makeBinding('Digit1'), presetId: 'pro-9' }),
        ],
      }),
    );
    const report = validateState(two, { ...ctx(), knownPresetIds: known });
    expect(report['other-gone'].blocking).toBe(true);
  });
});
