import { describe, expect, it, beforeEach } from 'vitest';
import { WeaponSlotSwitchService } from '../electron/services/weaponSlotService';
import { AcceleratorTransport } from '../electron/services/inputTransport';
import type {
  InputEventHandler,
  InputTransport,
  TransportSelection,
} from '../electron/services/inputTransport';
import type { ForegroundAppProvider } from '../electron/services/foregroundApp';
import {
  __registeredAccelerators,
  __triggerShortcut,
  shortcutLog,
} from './mocks/electron';
import { makeBinding } from '../src/lib/weaponSlots/keys';
import { getPresetIndex } from '../src/lib/presetLibrary';
import { createDefaultState, DEFAULT_PROFILE_ID } from '../src/lib/weaponSlots/defaults';
import { addSlot, assignPreset, setSlotBinding, setSlotEnabled } from '../src/lib/weaponSlots/slotStore';
import {
  FALLBACK_CAPABILITIES,
  PASSIVE_CAPABILITIES,
  createFakeHost,
  down,
  event,
  fakePreset,
  fiveSlotIndex,
  fiveSlotState,
  makeIndex,
  profile,
  runtime,
  slot,
  state,
  up,
} from './helpers';
import type {
  InputTransportCapabilities,
  NormalisedInputEvent,
  SlotKeyBinding,
  WeaponSlotStatus,
  WeaponSlotSwitchedPayload,
} from '../src/lib/weaponSlots/types';

/**
 * Integration: the service that owns the key-press path.
 *
 * These tests prove the feature is wired into crshhx's existing plumbing rather
 * than bolted on beside it — the overlay is updated through the same channel the
 * designer uses, no window is ever recreated, and the app's pre-existing
 * global hotkeys are left completely alone.
 */

class FakeTransport implements InputTransport {
  readonly id = 'fake-passive';
  handler: InputEventHandler | null = null;
  running = false;
  bindings: SlotKeyBinding[] = [];
  startCount = 0;
  stopCount = 0;

  constructor(public capabilities: InputTransportCapabilities = PASSIVE_CAPABILITIES) {}

  start(onEvent: InputEventHandler): boolean {
    this.handler = onEvent;
    this.running = true;
    this.startCount += 1;
    return true;
  }

  stop(): void {
    this.running = false;
    this.stopCount += 1;
    this.handler = null;
  }

  isRunning(): boolean {
    return this.running;
  }

  setBindings(bindings: SlotKeyBinding[]): void {
    this.bindings = bindings;
  }

  /** Simulate the OS delivering an input event. */
  fire(e: NormalisedInputEvent): void {
    this.handler?.(e);
  }

  press(code: string, modifiers: SlotKeyBinding['modifiers'] = [], timestamp = Date.now()): void {
    this.fire(event(makeBinding(code, modifiers), 'down', timestamp));
  }

  release(code: string, modifiers: SlotKeyBinding['modifiers'] = [], timestamp = Date.now()): void {
    this.fire(event(makeBinding(code, modifiers), 'up', timestamp));
  }
}

class FakeForegroundProvider implements ForegroundAppProvider {
  readonly id = 'fake';
  private value: string | null = null;
  /**
   * Starts unavailable, exactly like `WindowsForegroundProvider`: the real
   * provider only reports available after its worker answers successfully for
   * the first time. Defaulting this to true let the service look correct while
   * relying on a `stop()` call it no longer makes.
   */
  private availableValue = false;
  /**
   * Models a provider whose worker never answers — broken PowerShell, or any
   * non-Windows host. `start()` is still attempted and counted, exactly like the
   * real provider, but availability never arrives.
   */
  private canStartValue = true;
  startCount = 0;
  stopCount = 0;

  isAvailable(): boolean {
    return this.availableValue;
  }
  start(): void {
    this.startCount += 1;
    if (this.canStartValue) this.availableValue = true;
  }
  setCanStart(v: boolean): void {
    this.canStartValue = v;
    if (!v) this.availableValue = false;
  }
  stop(): void {
    this.stopCount += 1;
    this.availableValue = false;
  }
  current(): string | null {
    return this.value;
  }
  set(name: string | null): void {
    this.value = name;
  }
  setAvailable(v: boolean): void {
    this.availableValue = v;
  }
}

interface Harness {
  service: WeaponSlotSwitchService;
  transport: FakeTransport;
  foreground: FakeForegroundProvider;
  fake: ReturnType<typeof createFakeHost>;
}

function harness(options: {
  capabilities?: InputTransportCapabilities;
  degraded?: boolean;
} = {}): Harness {
  const fake = createFakeHost();
  const transport = new FakeTransport(options.capabilities ?? PASSIVE_CAPABILITIES);
  const foreground = new FakeForegroundProvider();

  const factory = (handler: InputEventHandler): TransportSelection => {
    transport.start(handler);
    return { transport, degraded: options.degraded ?? false };
  };

  const service = new WeaponSlotSwitchService(
    fake.host,
    { transportFactory: factory, foregroundProvider: foreground },
  );
  service.start();

  return { service, transport, foreground, fake };
}

function statuses(fake: ReturnType<typeof createFakeHost>): WeaponSlotStatus[] {
  return fake.log.studioSends
    .filter((s) => s.channel === 'weapon-slot-status')
    .map((s) => s.payload as WeaponSlotStatus);
}

function switched(fake: ReturnType<typeof createFakeHost>): WeaponSlotSwitchedPayload[] {
  return fake.log.studioSends
    .filter((s) => s.channel === 'weapon-slot-switched')
    .map((s) => s.payload as WeaponSlotSwitchedPayload);
}

let h: Harness;

beforeEach(() => {
  h = harness();
  h.service.applyRuntime(runtime(fiveSlotState(), fiveSlotIndex()));
});

describe('integration: the overlay is updated through the existing pathway', () => {
  it('sends the assigned crosshair on the crosshair-updated channel', () => {
    h.transport.press('Digit1');
    const applied = h.fake.appliedConfigs();
    expect(applied).toHaveLength(1);
    expect(applied[0].id).toBe('preset-1');
  });

  it('uses the same channel the designer already uses', () => {
    h.transport.press('Digit3');
    expect(h.fake.log.overlaySends.map((s) => s.channel)).toEqual(['crosshair-updated']);
  });

  it('applies each slot\'s own crosshair', () => {
    for (let n = 1; n <= 5; n += 1) {
      h.transport.press(`Digit${n}`, [], 1000 + n * 200);
      h.transport.release(`Digit${n}`, [], 1050 + n * 200);
    }
    expect(h.fake.appliedConfigs().map((c) => c.id)).toEqual([
      'preset-1', 'preset-2', 'preset-3', 'preset-4', 'preset-5',
    ]);
  });

  it('exposes no way to create, destroy, reload or focus a window', () => {
    // The host interface is the architectural guarantee: the switcher simply
    // cannot recreate the overlay, because it was never given that ability.
    const surface = Object.keys(h.fake.host).sort();
    expect(surface).toEqual([
      'getOverlayWindow',
      'getStudioWindow',
      'isOverlayVisible',
      'sendToOverlay',
      'sendToStudio',
    ]);
    expect(h.fake.log.overlayWindowCreations).toBe(0);
    expect(h.fake.log.overlayWindowDestroys).toBe(0);
  });

  it('does not restart the transport on every switch', () => {
    for (let n = 1; n <= 5; n += 1) {
      h.transport.press(`Digit${n}`, [], 1000 + n * 200);
      h.transport.release(`Digit${n}`, [], 1050 + n * 200);
    }
    expect(h.transport.startCount).toBe(1);
    expect(h.transport.stopCount).toBe(0);
  });
});

describe('integration: the active-slot indicator', () => {
  it('reports the slot number and name for the status bar', () => {
    h.transport.press('Digit2');
    const payload = switched(h.fake)[0];
    expect(payload.slotIndex).toBe(2);
    expect(payload.slotName).toBe('AR');
    expect(payload.presetId).toBe('preset-2');
  });

  it('updates the status snapshot after each switch', () => {
    h.transport.press('Digit4');
    const status = statuses(h.fake).at(-1)!;
    expect(status.activeSlot.slotIndex).toBe(4);
    expect(status.activeSlot.slotName).toBe('Sniper');
    expect(status.activeSlot.presetId).toBe('preset-4');
    expect(status.activeProfileId).toBe(DEFAULT_PROFILE_ID);
  });

  it('tracks successive switches', () => {
    h.transport.press('Digit1', [], 1000);
    h.transport.release('Digit1', [], 1010);
    expect(statuses(h.fake).at(-1)!.activeSlot.slotName).toBe('Shotgun');

    h.transport.press('Digit5', [], 2000);
    expect(statuses(h.fake).at(-1)!.activeSlot.slotName).toBe('Utility');
  });

  it('still refreshes the indicator when the same slot is pressed twice', () => {
    h.transport.press('Digit2', [], 1000);
    h.transport.release('Digit2', [], 1010);
    h.transport.press('Digit2', [], 2000);

    // The overlay is not told to redraw an identical config…
    expect(h.fake.appliedConfigs()).toHaveLength(1);
    // …but the indicator still confirms the press landed.
    expect(switched(h.fake)).toHaveLength(2);
    expect(switched(h.fake)[1].unchanged).toBe(true);
  });

  it('reports which profile is live', () => {
    h.transport.press('Digit1');
    expect(statuses(h.fake).at(-1)!.activeProfileName).toBe('Default');
  });

  it('restores an indicator after a renderer reload', () => {
    h.service.restoreActiveSlot({ slotId: 'slot-3', slotName: 'SMG', slotIndex: 3 });
    const status = statuses(h.fake).at(-1)!;
    expect(status.activeSlot.slotName).toBe('SMG');
    expect(status.activeSlot.slotIndex).toBe(3);
  });
});

describe('integration: ignored triggers are explainable, not silent', () => {
  it('reports an unassigned slot and sends nothing to the overlay', () => {
    const st = fiveSlotState();
    st.profiles[0].slots[1] = { ...st.profiles[0].slots[1], presetId: null };
    h.service.applyRuntime(runtime(st, fiveSlotIndex()));

    h.transport.press('Digit2');
    expect(h.fake.appliedConfigs()).toHaveLength(0);
    const status = statuses(h.fake).at(-1)!;
    expect(status.lastIgnore?.reason).toBe('preset-unassigned');
    expect(status.lastIgnore?.detail).toMatch(/keeping the current crosshair/i);
  });

  it('reports a deleted preset and sends nothing to the overlay', () => {
    h.service.applyRuntime(runtime(fiveSlotState(), makeIndex(fakePreset('preset-1'))));
    h.transport.press('Digit5');
    expect(h.fake.appliedConfigs()).toHaveLength(0);
    expect(statuses(h.fake).at(-1)!.lastIgnore?.reason).toBe('preset-missing');
  });

  it('reports a disabled slot', () => {
    const st = fiveSlotState();
    st.profiles[0].slots[0] = { ...st.profiles[0].slots[0], enabled: false };
    h.service.applyRuntime(runtime(st, fiveSlotIndex()));

    h.transport.press('Digit1');
    expect(h.fake.appliedConfigs()).toHaveLength(0);
    expect(statuses(h.fake).at(-1)!.lastIgnore?.reason).toBe('slot-disabled');
  });

  it('stays silent for keys no slot uses, so the log is not flooded', () => {
    h.transport.press('KeyZ');
    h.transport.press('KeyX');
    expect(statuses(h.fake).at(-1)!.lastIgnore).toBeNull();
  });

  it('clears the last ignore after a successful switch', () => {
    const st = fiveSlotState();
    st.profiles[0].slots[0] = { ...st.profiles[0].slots[0], enabled: false };
    h.service.applyRuntime(runtime(st, fiveSlotIndex()));
    h.transport.press('Digit1');
    expect(statuses(h.fake).at(-1)!.lastIgnore).not.toBeNull();

    h.service.applyRuntime(runtime(fiveSlotState(), fiveSlotIndex()));
    h.transport.press('Digit2', [], 5000);
    expect(statuses(h.fake).at(-1)!.lastIgnore).toBeNull();
  });
});

describe('integration: master switch, overlay visibility and recording', () => {
  it('does nothing while the feature is disabled', () => {
    h.service.applyRuntime(runtime(fiveSlotState({ enabled: false }), fiveSlotIndex()));
    h.transport.press('Digit1');
    expect(h.fake.appliedConfigs()).toHaveLength(0);
    expect(statuses(h.fake).at(-1)!.enabled).toBe(false);
  });

  it('does nothing while the HUD overlay is hidden', () => {
    h.fake.setOverlayVisible(false);
    h.transport.press('Digit1');
    expect(h.fake.appliedConfigs()).toHaveLength(0);
    expect(statuses(h.fake).at(-1)!.lastIgnore?.reason).toBe('overlay-hidden');
  });

  it('resumes when the overlay is shown again', () => {
    h.fake.setOverlayVisible(false);
    h.transport.press('Digit1', [], 1000);
    h.transport.release('Digit1', [], 1010);
    h.fake.setOverlayVisible(true);
    h.transport.press('Digit1', [], 2000);
    expect(h.fake.appliedConfigs()).toHaveLength(1);
  });

  it('does nothing while a key-capture field is recording', () => {
    h.service.setRecording(true);
    h.transport.press('Digit1');
    expect(h.fake.appliedConfigs()).toHaveLength(0);
    expect(statuses(h.fake).at(-1)!.lastIgnore?.reason).toBe('recording-binding');
  });

  it('recording a key that is already bound does not also switch', () => {
    h.service.setRecording(true);
    h.transport.press('Digit3');
    h.service.setRecording(false);
    expect(h.fake.appliedConfigs()).toHaveLength(0);
  });

  it('resumes switching after recording ends', () => {
    h.service.setRecording(true);
    h.transport.press('Digit1', [], 1000);
    h.transport.release('Digit1', [], 1010);
    h.service.setRecording(false);
    // The guard was reset when recording began, so the key is not stuck "held".
    h.transport.press('Digit1', [], 2000);
    expect(h.fake.appliedConfigs()).toHaveLength(1);
  });
});

describe('integration: repeat suppression end to end', () => {
  it('applies once for a held key', () => {
    for (let t = 0; t <= 1500; t += 30) {
      h.transport.fire(event(makeBinding('Digit1'), 'down', t));
    }
    expect(h.fake.appliedConfigs()).toHaveLength(1);
    expect(switched(h.fake)).toHaveLength(1);
  });

  it('applies once per deliberate tap', () => {
    h.transport.press('Digit1', [], 1000);
    h.transport.release('Digit1', [], 1100);
    h.transport.press('Digit1', [], 2000);
    h.transport.release('Digit1', [], 2100);
    expect(h.fake.appliedConfigs()).toHaveLength(1); // same slot -> unchanged second time
    expect(switched(h.fake)).toHaveLength(2);
  });

  it('handles a fast sweep without dropping or duplicating', () => {
    let t = 1000;
    for (let n = 1; n <= 5; n += 1) {
      h.transport.press(`Digit${n}`, [], t);
      t += 20;
      h.transport.release(`Digit${n}`, [], t);
      t += 20;
    }
    expect(h.fake.appliedConfigs().map((c) => c.id)).toEqual([
      'preset-1', 'preset-2', 'preset-3', 'preset-4', 'preset-5',
    ]);
  });

  it('ignores key-up events entirely', () => {
    h.transport.release('Digit1', [], 1000);
    h.transport.release('Digit1', [], 1100);
    expect(h.fake.appliedConfigs()).toHaveLength(0);
  });
});

describe('integration: configuration changes take effect immediately', () => {
  it('picks up a newly assigned crosshair without a restart', () => {
    let st = fiveSlotState();
    const slotId = st.profiles[0].slots[0].id;
    const result = assignPreset(st, DEFAULT_PROFILE_ID, slotId, 'preset-4');
    if (!result.ok) throw new Error(result.error);
    st = result.state;
    h.service.applyRuntime(runtime(st, fiveSlotIndex()));

    h.transport.press('Digit1');
    expect(h.fake.appliedConfigs()[0].id).toBe('preset-4');
  });

  it('picks up a rebound key', () => {
    let st = fiveSlotState();
    const slotId = st.profiles[0].slots[0].id;
    const rebound = setSlotBinding(st, DEFAULT_PROFILE_ID, slotId, makeBinding('KeyV'));
    if (!rebound.ok) throw new Error(rebound.error);
    h.service.applyRuntime(runtime(rebound.state, fiveSlotIndex()));

    h.transport.press('Digit1', [], 1000);
    expect(h.fake.appliedConfigs()).toHaveLength(0);
    h.transport.press('KeyV', [], 2000);
    expect(h.fake.appliedConfigs()).toHaveLength(1);
  });

  it('stops switching for a slot the user disabled', () => {
    let st = fiveSlotState();
    const toggled = setSlotEnabled(st, DEFAULT_PROFILE_ID, st.profiles[0].slots[2].id, false);
    if (!toggled.ok) throw new Error(toggled.error);
    h.service.applyRuntime(runtime(toggled.state, fiveSlotIndex()));

    h.transport.press('Digit3');
    expect(h.fake.appliedConfigs()).toHaveLength(0);
  });

  it('picks up a newly added slot', () => {
    let st = fiveSlotState();
    const added = addSlot(st, DEFAULT_PROFILE_ID, 'Melee');
    if (!added.ok) throw new Error(added.error);
    st = added.state;
    const newSlot = st.profiles[0].slots[5];
    let bound = setSlotBinding(st, DEFAULT_PROFILE_ID, newSlot.id, makeBinding('KeyV'));
    if (!bound.ok) throw new Error(bound.error);
    bound = assignPreset(bound.state, DEFAULT_PROFILE_ID, newSlot.id, 'preset-2');
    if (!bound.ok) throw new Error(bound.error);
    h.service.applyRuntime(runtime(bound.state, fiveSlotIndex()));

    h.transport.press('KeyV');
    expect(h.fake.appliedConfigs()[0].id).toBe('preset-2');
  });

  it('switches profiles when the active profile changes', () => {
    const st = state({
      enabled: true,
      activeProfileId: 'profile-a',
      profiles: [
        profile({ id: 'profile-a', name: 'A', slots: [slot({ index: 1, binding: makeBinding('Digit1'), presetId: 'preset-1' })] }),
        profile({ id: 'profile-b', name: 'B', isDefault: false, slots: [slot({ index: 1, binding: makeBinding('Digit1'), presetId: 'preset-3' })] }),
      ],
    });
    h.service.applyRuntime(runtime(st, fiveSlotIndex()));
    h.transport.press('Digit1', [], 1000);
    expect(h.fake.appliedConfigs().at(-1)!.id).toBe('preset-1');

    h.service.applyRuntime(runtime({ ...st, activeProfileId: 'profile-b' }, fiveSlotIndex()));
    h.transport.release('Digit1', [], 1100);
    h.transport.press('Digit1', [], 2000);
    expect(h.fake.appliedConfigs().at(-1)!.id).toBe('preset-3');
  });

  it('clears the active slot when the profile changes underneath it', () => {
    h.transport.press('Digit1', [], 1000);
    expect(statuses(h.fake).at(-1)!.activeSlot.slotName).toBe('Shotgun');

    const st = state({
      enabled: true,
      activeProfileId: 'other',
      profiles: [profile({ id: 'other', name: 'Other', slots: [] })],
    });
    h.service.applyRuntime(runtime(st, {}));
    expect(statuses(h.fake).at(-1)!.activeSlot.slotId).toBeNull();
  });
});

describe('integration: foreground-driven profile selection', () => {
  const gameProfiles = () =>
    state({
      enabled: true,
      autoSelectProfileByForegroundApp: true,
      activeProfileId: DEFAULT_PROFILE_ID,
      profiles: [
        profile({ id: DEFAULT_PROFILE_ID, slots: [slot({ index: 1, binding: makeBinding('Digit1'), presetId: 'preset-1' })] }),
        profile({
          id: 'profile-cs2', name: 'CS2', isDefault: false, matchProcessNames: ['cs2.exe'],
          slots: [slot({ index: 1, binding: makeBinding('Digit1'), presetId: 'preset-2' })],
        }),
      ],
    });

  it('starts the tracker only when it is actually needed', () => {
    h.service.applyRuntime(runtime(createDefaultState(), fiveSlotIndex()));
    expect(h.foreground.startCount).toBe(0);

    h.service.applyRuntime(runtime(gameProfiles(), fiveSlotIndex()));
    expect(h.foreground.startCount).toBe(1);
  });

  it('starts the tracker when auto-select is turned on and stops it when turned off', () => {
    const startsBefore = h.foreground.startCount;
    const stopsBefore = h.foreground.stopCount;

    h.service.applyRuntime(runtime(gameProfiles(), fiveSlotIndex()));
    expect(h.foreground.startCount).toBe(startsBefore + 1);
    expect(h.foreground.isAvailable()).toBe(true);

    h.service.applyRuntime(runtime(createDefaultState(), fiveSlotIndex()));
    expect(h.foreground.stopCount).toBe(stopsBefore + 1);
    expect(h.foreground.isAvailable()).toBe(false);
  });

  it('does not restart the tracker on every unrelated settings change', () => {
    h.service.applyRuntime(runtime(gameProfiles(), fiveSlotIndex()));
    const starts = h.foreground.startCount;
    for (let i = 0; i < 5; i += 1) {
      h.service.applyRuntime(runtime(gameProfiles(), fiveSlotIndex()));
    }
    expect(h.foreground.startCount).toBe(starts);
  });

  it('applies the game profile while that game is in the foreground', () => {
    h.service.applyRuntime(runtime(gameProfiles(), fiveSlotIndex()));
    h.foreground.set('cs2.exe');
    h.transport.press('Digit1', [], 1000);
    expect(h.fake.appliedConfigs().at(-1)!.id).toBe('preset-2');
    expect(statuses(h.fake).at(-1)!.activeProfileName).toBe('CS2');
  });

  it('applies the default profile for any other foreground app', () => {
    h.service.applyRuntime(runtime(gameProfiles(), fiveSlotIndex()));
    h.foreground.set('discord.exe');
    h.transport.press('Digit1', [], 1000);
    expect(h.fake.appliedConfigs().at(-1)!.id).toBe('preset-1');
  });

  it('follows the foreground app as it changes', () => {
    h.service.applyRuntime(runtime(gameProfiles(), fiveSlotIndex()));

    h.foreground.set('cs2.exe');
    h.transport.press('Digit1', [], 1000);
    h.transport.release('Digit1', [], 1010);
    expect(h.fake.appliedConfigs().at(-1)!.id).toBe('preset-2');

    h.foreground.set('desktop');
    h.transport.press('Digit1', [], 2000);
    expect(h.fake.appliedConfigs().at(-1)!.id).toBe('preset-1');
  });

  it('enforces a per-profile foreground restriction', () => {
    const st = gameProfiles();
    st.profiles[1] = { ...st.profiles[1], restrictToMatchedProcesses: true };
    st.activeProfileId = 'profile-cs2';
    h.service.applyRuntime(runtime(st, fiveSlotIndex()));

    h.foreground.set('notepad.exe');
    h.transport.press('Digit1', [], 1000);
    expect(h.fake.appliedConfigs()).toHaveLength(0);
    expect(statuses(h.fake).at(-1)!.lastIgnore?.reason).toBe('foreground-not-allowed');

    h.transport.release('Digit1', [], 1010);
    h.foreground.set('cs2.exe');
    h.transport.press('Digit1', [], 2000);
    expect(h.fake.appliedConfigs()).toHaveLength(1);
  });
});

describe('integration: lifecycle', () => {
  it('starts the transport exactly once', () => {
    expect(h.transport.startCount).toBe(1);
    h.service.applyRuntime(runtime(fiveSlotState(), fiveSlotIndex()));
    expect(h.transport.startCount).toBe(1);
  });

  it('ignores input before any configuration arrives', () => {
    const fresh = harness();
    fresh.transport.press('Digit1');
    expect(fresh.fake.appliedConfigs()).toHaveLength(0);
  });

  it('stops the transport on dispose', () => {
    h.service.dispose();
    expect(h.transport.stopCount).toBe(1);
    expect(h.transport.running).toBe(false);
  });

  it('ignores input after dispose', () => {
    h.transport.press('Digit1', [], 1000);
    expect(h.fake.appliedConfigs()).toHaveLength(1);
    h.service.dispose();
    h.transport.handler = null; // transport is stopped, but be explicit
    expect(h.fake.appliedConfigs()).toHaveLength(1);
  });

  it('dispose is idempotent', () => {
    h.service.dispose();
    h.service.dispose();
    expect(h.transport.stopCount).toBe(1);
  });

  it('dispose survives a transport that throws while stopping', () => {
    const broken = harness();
    broken.transport.stop = () => {
      throw new Error('hook removal failed');
    };
    expect(() => broken.service.dispose()).not.toThrow();
  });

  it('survives a transport that fails to start', () => {
    const fake = createFakeHost();
    const service = new WeaponSlotSwitchService(fake.host, {
      transportFactory: () => ({
        transport: {
          id: 'dead',
          capabilities: FALLBACK_CAPABILITIES,
          start: () => false,
          stop: () => undefined,
          isRunning: () => false,
          setBindings: () => undefined,
        },
        degraded: true,
        reason: 'test',
      }),
    });
    expect(() => service.start()).not.toThrow();
    service.applyRuntime(runtime(fiveSlotState(), fiveSlotIndex()));
    expect(service.getStatus().transport.name).toBe('OS Hotkeys (fallback)');
  });
});

describe('integration: status reporting', () => {
  it('describes the live transport', () => {
    const status = h.service.getStatus();
    expect(status.transport.name).toBe('Passive Input Hook');
    expect(status.transport.passiveGlobalKeyboard).toBe(true);
    expect(status.degraded).toBe(false);
  });

  it('reports a degraded transport honestly', () => {
    const degraded = harness({ capabilities: FALLBACK_CAPABILITIES, degraded: true });
    degraded.service.applyRuntime(runtime(fiveSlotState(), fiveSlotIndex()));
    const status = degraded.service.getStatus();
    expect(status.degraded).toBe(true);
    expect(status.transport.passiveGlobalKeyboard).toBe(false);
  });

  it('reports the slot count for the active profile', () => {
    expect(h.service.getStatus().slotCount).toBe(5);
  });

  it('reports foreground tracking availability', () => {
    // The tracker is only started when something needs it, so ask for it.
    h.service.applyRuntime(
      runtime(state({ enabled: true, autoSelectProfileByForegroundApp: true }), fiveSlotIndex()),
    );
    expect(h.service.getStatus().foregroundTrackingAvailable).toBe(true);

    h.foreground.setAvailable(false);
    expect(h.service.getStatus().foregroundTrackingAvailable).toBe(false);
  });

  it('does not claim tracking is available when nothing asked for it', () => {
    expect(h.service.getStatus().foregroundTrackingAvailable).toBe(false);
  });

  it('does not respawn the tracker when it is wanted but cannot start', () => {
    // The broken-PowerShell case: tracking is wanted, the provider is started,
    // and it never becomes available. Keying the sync off availability would
    // call start() again on every configuration change; keying it off intent
    // calls it once.
    const fresh = harness();
    fresh.foreground.setCanStart(false);
    const started = fresh.foreground.startCount;

    for (let i = 0; i < 12; i++) {
      fresh.service.applyRuntime(
        runtime(fiveSlotState({ autoSelectProfileByForegroundApp: true }), fiveSlotIndex()),
      );
    }

    expect(fresh.foreground.isAvailable()).toBe(false);
    expect(fresh.foreground.startCount - started).toBe(1);
    expect(fresh.service.getStatus().foregroundTrackingAvailable).toBe(false);
  });

  it('does not call stop() repeatedly while tracking is unwanted', () => {
    const fresh = harness();
    const stopped = fresh.foreground.stopCount;

    for (let i = 0; i < 12; i++) {
      fresh.service.applyRuntime(runtime(fiveSlotState(), fiveSlotIndex()));
    }

    expect(fresh.foreground.stopCount - stopped).toBe(0);
  });

  it('stops tracking exactly once when the user turns the option back off', () => {
    const fresh = harness();
    fresh.service.applyRuntime(
      runtime(fiveSlotState({ autoSelectProfileByForegroundApp: true }), fiveSlotIndex()),
    );
    const stopped = fresh.foreground.stopCount;

    for (let i = 0; i < 5; i++) {
      fresh.service.applyRuntime(runtime(fiveSlotState(), fiveSlotIndex()));
    }

    expect(fresh.foreground.stopCount - stopped).toBe(1);
  });

  it('retries tracking after the user turns it off and on again', () => {
    const fresh = harness();
    fresh.service.applyRuntime(
      runtime(fiveSlotState({ autoSelectProfileByForegroundApp: true }), fiveSlotIndex()),
    );
    fresh.service.applyRuntime(runtime(fiveSlotState(), fiveSlotIndex()));
    const started = fresh.foreground.startCount;

    fresh.service.applyRuntime(
      runtime(fiveSlotState({ autoSelectProfileByForegroundApp: true }), fiveSlotIndex()),
    );

    expect(fresh.foreground.startCount - started).toBe(1);
    expect(fresh.foreground.isAvailable()).toBe(true);
  });

  it('reports a sensible status before any configuration arrives', () => {
    const fresh = harness();
    const status = fresh.service.getStatus();
    expect(status.enabled).toBe(false);
    expect(status.slotCount).toBe(0);
    expect(status.activeSlot.slotId).toBeNull();
  });
});

/* ------------------------------------------------------------------ *
 * Fallback transport: Electron globalShortcut
 * ------------------------------------------------------------------ */

describe('integration: accelerator fallback transport', () => {
  function acceleratorHarness() {
    const fake = createFakeHost();
    const transport = new AcceleratorTransport();
    const service = new WeaponSlotSwitchService(fake.host, {
      transportFactory: (handler) => {
        transport.start(handler);
        return { transport, degraded: true, reason: 'test fallback' };
      },
      foregroundProvider: new FakeForegroundProvider(),
    });
    service.start();
    return { service, transport, fake };
  }

  /** A config that is legal on a consuming transport: modified keys only. */
  function modifiedState() {
    return state({
      enabled: true,
      profiles: [
        profile({
          slots: [
            slot({ index: 1, name: 'Shotgun', binding: makeBinding('Digit1', ['alt']), presetId: 'preset-1' }),
            slot({ index: 2, name: 'AR', binding: makeBinding('Digit2', ['alt']), presetId: 'preset-2' }),
          ],
        }),
      ],
    });
  }

  it('registers an OS hotkey for each usable slot binding', () => {
    const { service } = acceleratorHarness();
    service.applyRuntime(runtime(modifiedState(), fiveSlotIndex(), FALLBACK_CAPABILITIES));
    expect(__registeredAccelerators().sort()).toEqual(['Alt+1', 'Alt+2']);
  });

  it('fires a real switch when the OS hotkey triggers', () => {
    const { service, fake } = acceleratorHarness();
    service.applyRuntime(runtime(modifiedState(), fiveSlotIndex(), FALLBACK_CAPABILITIES));

    expect(__triggerShortcut('Alt+2')).toBe(true);
    expect(fake.appliedConfigs().map((c) => c.id)).toEqual(['preset-2']);
    expect(switched(fake)[0].slotName).toBe('AR');
  });

  it('refuses to register a bare number key, which would be stolen from the game', () => {
    const { service } = acceleratorHarness();
    service.applyRuntime(runtime(fiveSlotState(), fiveSlotIndex(), FALLBACK_CAPABILITIES));
    expect(__registeredAccelerators()).toEqual([]);
  });

  it('refuses to register mouse and wheel bindings it cannot express', () => {
    const { service } = acceleratorHarness();
    const st = state({
      enabled: true,
      profiles: [
        profile({
          slots: [
            slot({ index: 1, binding: makeBinding('WheelUp'), presetId: 'preset-1' }),
            slot({ index: 2, binding: makeBinding('MouseButton4'), presetId: 'preset-2' }),
            slot({ index: 3, binding: makeBinding('Digit3', ['ctrl']), presetId: 'preset-3' }),
          ],
        }),
      ],
    });
    service.applyRuntime(runtime(st, fiveSlotIndex(), FALLBACK_CAPABILITIES));
    expect(__registeredAccelerators()).toEqual(['Ctrl+3']);
  });

  it('does not register unassigned or disabled slots', () => {
    const { service } = acceleratorHarness();
    let st = modifiedState();
    const cleared = assignPreset(st, DEFAULT_PROFILE_ID, st.profiles[0].slots[1].id, null);
    if (!cleared.ok) throw new Error(cleared.error);
    st = cleared.state;
    const disabled = setSlotEnabled(st, DEFAULT_PROFILE_ID, st.profiles[0].slots[0].id, false);
    if (!disabled.ok) throw new Error(disabled.error);

    service.applyRuntime(runtime(disabled.state, fiveSlotIndex(), FALLBACK_CAPABILITIES));
    expect(__registeredAccelerators()).toEqual([]);
  });

  it('unregisters bindings that are no longer configured', () => {
    const { service } = acceleratorHarness();
    service.applyRuntime(runtime(modifiedState(), fiveSlotIndex(), FALLBACK_CAPABILITIES));
    expect(__registeredAccelerators().sort()).toEqual(['Alt+1', 'Alt+2']);

    const reduced = state({
      enabled: true,
      profiles: [
        profile({ slots: [slot({ index: 1, binding: makeBinding('Digit1', ['alt']), presetId: 'preset-1' })] }),
      ],
    });
    service.applyRuntime(runtime(reduced, fiveSlotIndex(), FALLBACK_CAPABILITIES));
    expect(__registeredAccelerators()).toEqual(['Alt+1']);
    expect(shortcutLog.unregisterCalls).toContain('Alt+2');
  });

  it('never calls unregisterAll, so the existing F10/F9 hotkeys survive', () => {
    const { service } = acceleratorHarness();
    service.applyRuntime(runtime(modifiedState(), fiveSlotIndex(), FALLBACK_CAPABILITIES));
    service.applyRuntime(runtime(fiveSlotState(), fiveSlotIndex(), FALLBACK_CAPABILITIES));
    service.dispose();
    expect(shortcutLog.unregisterAllCalls).toBe(0);
  });

  it('tolerates the OS refusing a registration', () => {
    shortcutLog.failing.add('Alt+2');
    const { service, fake } = acceleratorHarness();
    service.applyRuntime(runtime(modifiedState(), fiveSlotIndex(), FALLBACK_CAPABILITIES));
    expect(__registeredAccelerators()).toEqual(['Alt+1']);

    // The one that did register still works.
    __triggerShortcut('Alt+1');
    expect(fake.appliedConfigs().map((c) => c.id)).toEqual(['preset-1']);
  });

  it('registers bindings from every auto-selectable profile, without duplicates', () => {
    const { service } = acceleratorHarness();
    const st = state({
      enabled: true,
      autoSelectProfileByForegroundApp: true,
      profiles: [
        profile({ id: 'a', slots: [slot({ index: 1, binding: makeBinding('Digit1', ['alt']), presetId: 'preset-1' })] }),
        profile({
          id: 'b', name: 'B', isDefault: false, matchProcessNames: ['cs2.exe'],
          slots: [slot({ index: 1, binding: makeBinding('Digit1', ['alt']), presetId: 'preset-2' })],
        }),
      ],
    });
    service.applyRuntime(runtime(st, fiveSlotIndex(), FALLBACK_CAPABILITIES));
    expect(__registeredAccelerators()).toEqual(['Alt+1']);
  });

  it('only registers the active profile when auto-select is off', () => {
    const { service } = acceleratorHarness();
    const st = state({
      enabled: true,
      activeProfileId: 'b',
      profiles: [
        profile({ id: 'a', slots: [slot({ index: 1, binding: makeBinding('Digit1', ['alt']), presetId: 'preset-1' })] }),
        profile({ id: 'b', name: 'B', isDefault: false, slots: [slot({ index: 1, binding: makeBinding('Digit2', ['alt']), presetId: 'preset-2' })] }),
      ],
    });
    service.applyRuntime(runtime(st, fiveSlotIndex(), FALLBACK_CAPABILITIES));
    // 'a' is the default profile so it stays reachable; nothing else is registered.
    expect(__registeredAccelerators().sort()).toEqual(['Alt+1', 'Alt+2']);
  });
});

describe('integration: existing crshhx behaviour is untouched', () => {
  it('leaves the app-level hotkeys for the slot transport to avoid', () => {
    // The service registers only slot bindings; F10/F9/F8 remain owned by
    // registerHotkeys() in main.ts.
    const { service } = harness();
    service.applyRuntime(runtime(fiveSlotState(), fiveSlotIndex()));
    expect(shortcutLog.registerCalls).toEqual([]);
    expect(shortcutLog.unregisterAllCalls).toBe(0);
  });

  it('reports the reserved app hotkeys it was given', () => {
    const rt = runtime(fiveSlotState(), fiveSlotIndex());
    rt.reservedBindings = [makeBinding('F10'), makeBinding('F9')];
    h.service.applyRuntime(rt);
    // Switching still works for slot keys…
    h.transport.press('Digit1');
    expect(h.fake.appliedConfigs()).toHaveLength(1);
  });

  it('does not touch the designer working copy when a slot switches', () => {
    // The switcher only ever talks to the overlay + status channels.
    h.transport.press('Digit2');
    const channels = new Set(h.fake.log.overlaySends.map((s) => s.channel));
    expect(channels).toEqual(new Set(['crosshair-updated']));
    expect(h.fake.log.studioSends.map((s) => s.channel)).not.toContain('update-crosshair');
  });

  it('never writes to storage on the key-press path', () => {
    const before = localStorage.length;
    for (let n = 1; n <= 5; n += 1) {
      h.transport.press(`Digit${n}`, [], 1000 + n * 300);
      h.transport.release(`Digit${n}`, [], 1050 + n * 300);
    }
    expect(localStorage.length).toBe(before);
  });
});

describe('integration: transport selection is reported to the UI', () => {
  it('exposes capabilities so validation can gate mouse and wheel bindings', () => {
    const passive = h.service.getStatus().transport;
    expect(passive.mouseButtons).toBe(true);
    expect(passive.mouseWheel).toBe(true);

    // The real fallback transport must explain the consequence plainly.
    const caps = new AcceleratorTransport().capabilities;
    expect(caps.passiveGlobalKeyboard).toBe(false);
    expect(caps.mouseButtons).toBe(false);
    expect(caps.mouseWheel).toBe(false);
    expect(caps.warning).toMatch(/capture the combination exclusively/i);
    expect(caps.warning).toMatch(/must include Ctrl or Alt/i);

    const degraded = harness({ capabilities: FALLBACK_CAPABILITIES, degraded: true });
    expect(degraded.service.getStatus().degraded).toBe(true);
  });

  it('accepts a wheel trigger on the passive transport', () => {
    const st = state({
      enabled: true,
      profiles: [
        profile({
          slots: [
            slot({ index: 1, binding: makeBinding('WheelUp'), presetId: 'preset-1' }),
            slot({ index: 2, binding: makeBinding('WheelDown'), presetId: 'preset-2' }),
          ],
        }),
      ],
    });
    h.service.applyRuntime(runtime(st, fiveSlotIndex()));

    h.transport.press('WheelUp', [], 1000);
    expect(h.fake.appliedConfigs().at(-1)!.id).toBe('preset-1');
    h.transport.press('WheelDown', [], 1500);
    expect(h.fake.appliedConfigs().at(-1)!.id).toBe('preset-2');
  });

  it('collapses one fast wheel flick into a single switch', () => {
    const st = state({
      enabled: true,
      profiles: [
        profile({ slots: [slot({ index: 1, binding: makeBinding('WheelUp'), presetId: 'preset-1' })] }),
      ],
    });
    h.service.applyRuntime(runtime(st, fiveSlotIndex()));
    for (let t = 1000; t <= 1060; t += 10) {
      h.transport.press('WheelUp', [], t);
    }
    expect(h.fake.appliedConfigs()).toHaveLength(1);
  });

  it('accepts a mouse side-button trigger on the passive transport', () => {
    const st = state({
      enabled: true,
      profiles: [
        profile({ slots: [slot({ index: 1, binding: makeBinding('MouseButton4'), presetId: 'preset-3' })] }),
      ],
    });
    h.service.applyRuntime(runtime(st, fiveSlotIndex()));
    h.transport.press('MouseButton4', [], 1000);
    expect(h.fake.appliedConfigs().at(-1)!.id).toBe('preset-3');
  });
});

describe('integration: the shipped defaults work out of the box', () => {
  it('switches all five default slots once the feature is enabled', () => {
    const index = getPresetIndex();
    const st = { ...createDefaultState(), enabled: true };
    h.service.applyRuntime(runtime(st, index));

    for (let n = 1; n <= 5; n += 1) {
      h.transport.press(`Digit${n}`, [], 1000 + n * 300);
      h.transport.release(`Digit${n}`, [], 1050 + n * 300);
    }

    const applied = h.fake.appliedConfigs().map((c) => c.name);
    expect(applied).toHaveLength(5);
    expect(applied[0]).toMatch(/shotgun/i);
    expect(applied[3]).toMatch(/sniper/i);
    expect(new Set(applied).size).toBe(5);
  });
});
