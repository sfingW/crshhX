import { describe, expect, it } from 'vitest';
import { KeyRepeatGuard, decideSwitch } from '../src/lib/weaponSlots/switchPolicy';
import { makeBinding } from '../src/lib/weaponSlots/keys';
import {
  FALLBACK_CAPABILITIES,
  PASSIVE_CAPABILITIES,
  down,
  env,
  fakePreset,
  fiveSlotIndex,
  fiveSlotState,
  makeIndex,
  profile,
  resetClock,
  slot,
  state,
  up,
} from './helpers';

/**
 * Switching behaviour — the core contract of Weapon Slot Crosshairs.
 *
 * Every test drives `decideSwitch`, the single pure function the Electron main
 * process calls on the key-press hot path.
 */

function request(overrides: Partial<Parameters<typeof decideSwitch>[0]> = {}) {
  return decideSwitch({
    event: down('Digit1'),
    state: fiveSlotState(),
    presetIndex: fiveSlotIndex(),
    environment: env(),
    capabilities: PASSIVE_CAPABILITIES,
    ...overrides,
  } as Parameters<typeof decideSwitch>[0]);
}

describe('switching: correct key applies the correct crosshair', () => {
  it('maps slot 1 to its own assigned preset', () => {
    const decision = request();
    expect(decision.kind).toBe('apply');
    if (decision.kind !== 'apply') return;
    expect(decision.slotIndex).toBe(1);
    expect(decision.slotName).toBe('Shotgun');
    expect(decision.presetId).toBe('preset-1');
    expect(decision.config.id).toBe('preset-1');
  });

  it('applies a different preset for every slot', () => {
    for (let n = 1; n <= 5; n += 1) {
      const decision = request({ event: down(`Digit${n}`) });
      expect(decision.kind).toBe('apply');
      if (decision.kind !== 'apply') continue;
      expect(decision.slotIndex).toBe(n);
      expect(decision.presetId).toBe(`preset-${n}`);
      expect(decision.config.id).toBe(`preset-${n}`);
    }
  });

  it('never applies a preset belonging to a different slot', () => {
    const decision = request({ event: down('Digit3') });
    if (decision.kind !== 'apply') throw new Error('expected apply');
    expect(decision.config.id).not.toBe('preset-1');
    expect(decision.config.id).not.toBe('preset-2');
    expect(decision.config.id).toBe('preset-3');
  });

  it('reports the owning profile so the status bar can name it', () => {
    const decision = request({ event: down('Digit2') });
    if (decision.kind !== 'apply') throw new Error('expected apply');
    expect(decision.profileId).toBe('profile-default');
  });
});

describe('switching: unassigned and disabled states keep the overlay untouched', () => {
  it('ignores a slot with no crosshair assigned (keep-current default)', () => {
    const st = fiveSlotState();
    st.profiles[0].slots[1] = { ...st.profiles[0].slots[1], presetId: null };

    const decision = request({ state: st, event: down('Digit2') });
    expect(decision).toEqual(
      expect.objectContaining({ kind: 'ignore', reason: 'preset-unassigned' }),
    );
    expect(decision.kind === 'ignore' && /keeping the current crosshair/.test(decision.detail ?? ''))
      .toBe(true);
  });

  it('ignores a slot whose preset was deleted from the library', () => {
    const index = makeIndex(fakePreset('preset-1')); // 2..5 gone
    const decision = request({ presetIndex: index, event: down('Digit4') });
    expect(decision.kind).toBe('ignore');
    if (decision.kind !== 'ignore') return;
    expect(decision.reason).toBe('preset-missing');
    expect(decision.detail).toContain('preset-4');
  });

  it('does not substitute a different preset when the assigned one is missing', () => {
    const index = makeIndex(fakePreset('preset-1'), fakePreset('preset-2'));
    const decision = request({ presetIndex: index, event: down('Digit5') });
    expect(decision.kind).toBe('ignore');
  });

  it('ignores a disabled slot even though it is fully configured', () => {
    const st = fiveSlotState();
    st.profiles[0].slots[2] = { ...st.profiles[0].slots[2], enabled: false };

    const decision = request({ state: st, event: down('Digit3') });
    expect(decision).toEqual(
      expect.objectContaining({ kind: 'ignore', reason: 'slot-disabled' }),
    );
  });

  it('ignores everything when the feature master switch is off', () => {
    const decision = request({ state: fiveSlotState({ enabled: false }) });
    expect(decision).toEqual(
      expect.objectContaining({ kind: 'ignore', reason: 'feature-disabled' }),
    );
  });

  it('ignores a key that no slot is bound to', () => {
    const decision = request({ event: down('Digit9') });
    expect(decision).toEqual(
      expect.objectContaining({ kind: 'ignore', reason: 'no-matching-slot' }),
    );
  });

  it('ignores an unbound slot even when the same code is pressed', () => {
    const st = fiveSlotState();
    st.profiles[0].slots[0] = { ...st.profiles[0].slots[0], binding: null };
    const decision = request({ state: st, event: down('Digit1') });
    expect(decision).toEqual(
      expect.objectContaining({ kind: 'ignore', reason: 'no-matching-slot' }),
    );
  });

  it('ignores input while the overlay is hidden', () => {
    const decision = request({ environment: env({ overlayRunning: false }) });
    expect(decision).toEqual(
      expect.objectContaining({ kind: 'ignore', reason: 'overlay-hidden' }),
    );
  });
});

describe('switching: modifiers', () => {
  const bound = state({
    enabled: true,
    profiles: [
      profile({
        slots: [
          slot({ index: 1, name: 'Alt AR', binding: makeBinding('Digit2', ['alt']), presetId: 'preset-2' }),
          slot({ index: 2, name: 'Plain AR', binding: makeBinding('Digit3'), presetId: 'preset-3' }),
        ],
      }),
    ],
  });
  const index = fiveSlotIndex();

  it('fires only when every declared modifier is held', () => {
    expect(request({ state: bound, presetIndex: index, event: down('Digit2') }).kind).toBe('ignore');
    expect(
      request({ state: bound, presetIndex: index, event: down('Digit2', ['alt']) }).kind,
    ).toBe('apply');
  });

  it('ignores extra modifiers by default so in-game Shift/Ctrl holds still work', () => {
    const decision = request({
      state: bound,
      presetIndex: index,
      event: down('Digit3', ['shift']),
    });
    expect(decision.kind).toBe('apply');
    if (decision.kind !== 'apply') return;
    expect(decision.presetId).toBe('preset-3');
  });

  it('honours strict modifier matching when requested', () => {
    const decision = request({
      state: bound,
      presetIndex: index,
      event: down('Digit3', ['shift']),
      matchOptions: { strictModifiers: true },
    });
    expect(decision.kind).toBe('ignore');
  });

  it('prefers the more specific binding when both a plain and a modified key exist', () => {
    const both = state({
      enabled: true,
      profiles: [
        profile({
          slots: [
            slot({ index: 1, binding: makeBinding('Digit4'), presetId: 'preset-4' }),
            slot({ index: 2, binding: makeBinding('Digit4', ['ctrl']), presetId: 'preset-5' }),
          ],
        }),
      ],
    });

    const ctrl = request({ state: both, presetIndex: index, event: down('Digit4', ['ctrl']) });
    expect(ctrl.kind).toBe('apply');
    if (ctrl.kind === 'apply') expect(ctrl.presetId).toBe('preset-5');

    const plain = request({ state: both, presetIndex: index, event: down('Digit4') });
    expect(plain.kind).toBe('apply');
    if (plain.kind === 'apply') expect(plain.presetId).toBe('preset-4');
  });

  it('never treats a bare modifier press as a slot trigger', () => {
    const decision = request({ event: down('ControlLeft') });
    expect(decision).toEqual(
      expect.objectContaining({ kind: 'ignore', reason: 'no-matching-slot' }),
    );
  });
});

describe('switching: key recording must not trigger a switch', () => {
  it('ignores input while a capture field is listening', () => {
    const decision = request({ environment: env({ isRecordingBinding: true }) });
    expect(decision).toEqual(
      expect.objectContaining({ kind: 'ignore', reason: 'recording-binding' }),
    );
  });

  it('resumes switching once recording ends', () => {
    expect(request({ environment: env({ isRecordingBinding: false }) }).kind).toBe('apply');
  });

  it('prioritises the recording check above slot matching', () => {
    // Even a key that is not bound to anything reports "recording", not
    // "no-matching-slot", so the recorder always owns the press.
    const decision = request({
      environment: env({ isRecordingBinding: true }),
      event: down('Digit9'),
    });
    if (decision.kind !== 'ignore') throw new Error('expected ignore');
    expect(decision.reason).toBe('recording-binding');
  });
});

describe('switching: studio focus suppression is opt-in', () => {
  it('does not suppress by default so bindings can be tested inside crshhx', () => {
    const decision = request({ environment: env({ studioFocused: true }) });
    expect(decision.kind).toBe('apply');
  });

  it('suppresses when the user enabled the option', () => {
    const decision = request({
      state: fiveSlotState({ suppressWhileStudioFocused: true }),
      environment: env({ studioFocused: true }),
    });
    expect(decision).toEqual(
      expect.objectContaining({ kind: 'ignore', reason: 'studio-focused' }),
    );
  });

  it('still switches when the studio is not focused', () => {
    const decision = request({
      state: fiveSlotState({ suppressWhileStudioFocused: true }),
      environment: env({ studioFocused: false }),
    });
    expect(decision.kind).toBe('apply');
  });
});

describe('switching: foreground-process restrictions are respected', () => {
  const restricted = state({
    enabled: true,
    autoSelectProfileByForegroundApp: true,
    profiles: [
      profile({
        id: 'profile-fortnite',
        name: 'Fortnite',
        isDefault: false,
        matchProcessNames: ['fortniteclient-win64-shipping.exe'],
        restrictToMatchedProcesses: true,
        slots: [slot({ index: 1, binding: makeBinding('Digit1'), presetId: 'preset-1' })],
      }),
      profile({
        id: 'profile-default',
        name: 'Default',
        slots: [slot({ index: 1, binding: makeBinding('Digit9'), presetId: 'preset-2' })],
      }),
    ],
    activeProfileId: 'profile-fortnite',
  });
  const index = fiveSlotIndex();

  it('switches while the matching game is in the foreground', () => {
    const decision = request({
      state: restricted,
      presetIndex: index,
      event: down('Digit1'),
      environment: env({
        foregroundProcessName: 'FortniteClient-Win64-Shipping.exe',
        foregroundTrackingAvailable: true,
      }),
    });
    expect(decision.kind).toBe('apply');
    if (decision.kind === 'apply') expect(decision.presetId).toBe('preset-1');
  });

  it('blocks the restricted profile while another app is in the foreground', () => {
    const decision = request({
      state: restricted,
      presetIndex: index,
      event: down('Digit1'),
      environment: env({
        foregroundProcessName: 'notepad.exe',
        foregroundTrackingAvailable: true,
      }),
    });
    expect(decision).toEqual(
      expect.objectContaining({ kind: 'ignore', reason: 'foreground-not-allowed' }),
    );
  });

  it('blocks a restricted profile when tracking is on but no window is known', () => {
    const decision = request({
      state: restricted,
      presetIndex: index,
      event: down('Digit1'),
      environment: env({ foregroundProcessName: null, foregroundTrackingAvailable: true }),
    });
    expect(decision).toEqual(
      expect.objectContaining({ kind: 'ignore', reason: 'foreground-not-allowed' }),
    );
  });

  it('fails closed when no foreground provider exists, so the restriction still holds', () => {
    const decision = request({
      state: restricted,
      presetIndex: index,
      event: down('Digit1'),
      environment: env({ foregroundProcessName: null, foregroundTrackingAvailable: false }),
    });
    expect(decision).toEqual(
      expect.objectContaining({ kind: 'ignore', reason: 'foreground-not-allowed' }),
    );
    if (decision.kind === 'ignore') {
      expect(decision.detail).toMatch(/cannot read the foreground application/i);
    }
  });

  it('never restricts a profile that did not opt in', () => {
    const decision = request({
      state: fiveSlotState(),
      event: down('Digit1'),
      environment: env({ foregroundProcessName: 'notepad.exe', foregroundTrackingAvailable: true }),
    });
    expect(decision.kind).toBe('apply');
  });
});

describe('switching: automatic profile selection by foreground app', () => {
  const twoProfiles = state({
    enabled: true,
    autoSelectProfileByForegroundApp: true,
    activeProfileId: 'profile-default',
    profiles: [
      profile({
        id: 'profile-default',
        name: 'Default',
        slots: [slot({ index: 1, binding: makeBinding('Digit1'), presetId: 'preset-1' })],
      }),
      profile({
        id: 'profile-cs2',
        name: 'CS2',
        isDefault: false,
        matchProcessNames: ['cs2.exe'],
        slots: [slot({ index: 1, binding: makeBinding('Digit1'), presetId: 'preset-3' })],
      }),
    ],
  });
  const index = fiveSlotIndex();

  it('uses the game profile when that game is foreground', () => {
    const decision = request({
      state: twoProfiles,
      presetIndex: index,
      event: down('Digit1'),
      environment: env({ foregroundProcessName: 'cs2.exe', foregroundTrackingAvailable: true }),
    });
    if (decision.kind !== 'apply') throw new Error('expected apply');
    expect(decision.profileId).toBe('profile-cs2');
    expect(decision.presetId).toBe('preset-3');
  });

  it('falls back to the manual profile when no game matches', () => {
    const decision = request({
      state: twoProfiles,
      presetIndex: index,
      event: down('Digit1'),
      environment: env({ foregroundProcessName: 'explorer.exe', foregroundTrackingAvailable: true }),
    });
    if (decision.kind !== 'apply') throw new Error('expected apply');
    expect(decision.profileId).toBe('profile-default');
    expect(decision.presetId).toBe('preset-1');
  });

  it('ignores process names entirely when auto-select is off', () => {
    const decision = request({
      state: { ...twoProfiles, autoSelectProfileByForegroundApp: false },
      presetIndex: index,
      event: down('Digit1'),
      environment: env({ foregroundProcessName: 'cs2.exe', foregroundTrackingAvailable: true }),
    });
    if (decision.kind !== 'apply') throw new Error('expected apply');
    expect(decision.profileId).toBe('profile-default');
  });
});

describe('switching: transport capabilities gate mouse and wheel inputs', () => {
  const wheelState = state({
    enabled: true,
    profiles: [
      profile({
        slots: [
          slot({ index: 1, binding: makeBinding('WheelUp'), presetId: 'preset-1' }),
          slot({ index: 2, binding: makeBinding('MouseButton4'), presetId: 'preset-2' }),
        ],
      }),
    ],
  });
  const index = fiveSlotIndex();

  it('accepts wheel triggers on the passive hook', () => {
    const decision = request({
      state: wheelState,
      presetIndex: index,
      event: down('WheelUp'),
      capabilities: PASSIVE_CAPABILITIES,
    });
    expect(decision.kind).toBe('apply');
  });

  it('accepts mouse side-button triggers on the passive hook', () => {
    const decision = request({
      state: wheelState,
      presetIndex: index,
      event: down('MouseButton4'),
      capabilities: PASSIVE_CAPABILITIES,
    });
    expect(decision.kind).toBe('apply');
  });

  it('rejects wheel triggers on the fallback transport', () => {
    const decision = request({
      state: wheelState,
      presetIndex: index,
      event: down('WheelUp'),
      capabilities: FALLBACK_CAPABILITIES,
    });
    expect(decision).toEqual(
      expect.objectContaining({ kind: 'ignore', reason: 'input-kind-unsupported' }),
    );
  });

  it('rejects mouse triggers on the fallback transport', () => {
    const decision = request({
      state: wheelState,
      presetIndex: index,
      event: down('MouseButton4'),
      capabilities: FALLBACK_CAPABILITIES,
    });
    expect(decision).toEqual(
      expect.objectContaining({ kind: 'ignore', reason: 'input-kind-unsupported' }),
    );
  });
});

describe('switching: library presets are never modified', () => {
  it('hands out a clone, leaving the stored preset untouched', () => {
    const original = fakePreset('preset-1', 'Preset 1', { gap: 2 });
    const index = makeIndex(original);
    const st = state({
      enabled: true,
      profiles: [
        profile({ slots: [slot({ index: 1, binding: makeBinding('Digit1'), presetId: 'preset-1' })] }),
      ],
    });

    const decision = request({ state: st, presetIndex: index, event: down('Digit1') });
    if (decision.kind !== 'apply') throw new Error('expected apply');

    // Mutating what the overlay received must not reach the library.
    decision.config.gap = 99;
    decision.config.name = 'CORRUPTED';

    expect(index['preset-1'].gap).toBe(2);
    expect(index['preset-1'].name).toBe('Preset 1');
    expect(original.gap).toBe(2);
  });

  it('does not add, remove or rename entries in the preset index', () => {
    const index = fiveSlotIndex();
    const before = Object.keys(index).sort();

    for (let n = 1; n <= 5; n += 1) {
      request({ presetIndex: index, event: down(`Digit${n}`) });
    }

    expect(Object.keys(index).sort()).toEqual(before);
  });
});

describe('switching: repeated identical triggers are reported as no-ops', () => {
  it('flags unchanged when the same slot is already live', () => {
    const decision = request({
      event: down('Digit2'),
      activeSlotId: 'slot-2',
      activePresetId: 'preset-2',
    });
    if (decision.kind !== 'apply') throw new Error('expected apply');
    expect(decision.unchanged).toBe(true);
  });

  it('does not flag unchanged when a different slot becomes live', () => {
    const decision = request({
      event: down('Digit2'),
      activeSlotId: 'slot-1',
      activePresetId: 'preset-1',
    });
    if (decision.kind !== 'apply') throw new Error('expected apply');
    expect(decision.unchanged).toBe(false);
  });
});

describe('switching: key-up events never trigger', () => {
  it('passes a key-down through and drops every key-up', () => {
    // `decideSwitch` is deliberately phase-agnostic; filtering up-events is the
    // repeat guard's job. Test the pair together so the contract is covered.
    resetClock();
    const guard = new KeyRepeatGuard();
    const st = fiveSlotState();
    const index = fiveSlotIndex();

    const downEvent = down('Digit1');
    expect(guard.shouldSuppress(downEvent)).toBe(false);
    expect(request({ state: st, presetIndex: index, event: downEvent }).kind).toBe('apply');

    const upEvent = up('Digit1');
    expect(guard.shouldSuppress(upEvent)).toBe(true);
    expect(guard.shouldSuppress(up('Digit1'))).toBe(true);
  });
});
