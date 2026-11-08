import { DEFAULT_CONFIG } from '../src/lib/defaultPresets';
import { makeBinding } from '../src/lib/weaponSlots/keys';
import { createDefaultState, DEFAULT_PROFILE_ID } from '../src/lib/weaponSlots/defaults';
import type { CrosshairConfig } from '../src/types/crosshair';
import type {
  InputTransportCapabilities,
  KeyModifier,
  NormalisedInputEvent,
  PresetIndex,
  SlotKeyBinding,
  SwitchEnvironment,
  WeaponSlot,
  WeaponSlotProfile,
  WeaponSlotsRuntime,
  WeaponSlotsState,
} from '../src/lib/weaponSlots/types';

/** Shared fixtures for the Weapon Slot Crosshairs suite. */

export function fakePreset(id: string, name = id, extra: Partial<CrosshairConfig> = {}): CrosshairConfig {
  return { ...DEFAULT_CONFIG, id, name, ...extra };
}

export function makeIndex(...presets: CrosshairConfig[]): PresetIndex {
  const index: PresetIndex = {};
  for (const p of presets) index[p.id] = p;
  return index;
}

export const PASSIVE_CAPABILITIES: InputTransportCapabilities = {
  name: 'Passive Input Hook',
  passiveGlobalKeyboard: true,
  worksWhenUnfocused: true,
  mouseButtons: true,
  mouseWheel: true,
};

export const FALLBACK_CAPABILITIES: InputTransportCapabilities = {
  name: 'OS Hotkeys (fallback)',
  passiveGlobalKeyboard: false,
  worksWhenUnfocused: true,
  mouseButtons: false,
  mouseWheel: false,
};

export function slot(overrides: Partial<WeaponSlot> & { index: number }): WeaponSlot {
  return {
    id: overrides.id ?? `slot-${overrides.index}`,
    index: overrides.index,
    name: overrides.name ?? `Slot ${overrides.index}`,
    binding: overrides.binding === undefined ? null : overrides.binding,
    presetId: overrides.presetId === undefined ? null : overrides.presetId,
    enabled: overrides.enabled ?? true,
  };
}

export function profile(overrides: Partial<WeaponSlotProfile> = {}): WeaponSlotProfile {
  return {
    id: overrides.id ?? DEFAULT_PROFILE_ID,
    name: overrides.name ?? 'Default',
    matchProcessNames: overrides.matchProcessNames ?? [],
    restrictToMatchedProcesses: overrides.restrictToMatchedProcesses ?? false,
    isDefault: overrides.isDefault ?? true,
    slots: overrides.slots ?? [],
  };
}

export function state(overrides: Partial<WeaponSlotsState> = {}): WeaponSlotsState {
  return { ...createDefaultState(), ...overrides };
}

/** A ready five-slot state bound to 1..5 with matching presets. */
export function fiveSlotState(overrides: Partial<WeaponSlotsState> = {}): WeaponSlotsState {
  const names = ['Shotgun', 'AR', 'SMG', 'Sniper', 'Utility'];
  const slots = names.map((name, i) =>
    slot({
      index: i + 1,
      id: `slot-${i + 1}`,
      name,
      binding: makeBinding(`Digit${i + 1}`),
      presetId: `preset-${i + 1}`,
    }),
  );
  return state({
    enabled: true,
    profiles: [profile({ slots })],
    ...overrides,
  });
}

export function fiveSlotIndex(): PresetIndex {
  return makeIndex(
    ...[1, 2, 3, 4, 5].map((n) => fakePreset(`preset-${n}`, `Preset ${n}`)),
  );
}

export function env(overrides: Partial<SwitchEnvironment> = {}): SwitchEnvironment {
  return {
    overlayRunning: true,
    isRecordingBinding: false,
    studioFocused: false,
    foregroundProcessName: null,
    foregroundTrackingAvailable: false,
    ...overrides,
  };
}

let eventClock = 0;

/** Reset the synthetic clock so timing tests are deterministic. */
export function resetClock(): void {
  eventClock = 0;
}

export function advance(ms: number): number {
  eventClock += ms;
  return eventClock;
}

export function down(
  code: string,
  modifiers: KeyModifier[] = [],
  options: { isRepeat?: boolean; timestamp?: number } = {},
): NormalisedInputEvent {
  return {
    binding: makeBinding(code, modifiers),
    phase: 'down',
    isRepeat: options.isRepeat ?? false,
    timestamp: options.timestamp ?? (eventClock += 100),
  };
}

export function up(code: string, modifiers: KeyModifier[] = [], timestamp?: number): NormalisedInputEvent {
  return {
    binding: makeBinding(code, modifiers),
    phase: 'up',
    isRepeat: false,
    timestamp: timestamp ?? (eventClock += 1),
  };
}

export function event(binding: SlotKeyBinding, phase: 'down' | 'up', timestamp: number, isRepeat = false): NormalisedInputEvent {
  return { binding, phase, isRepeat, timestamp };
}

export function runtime(
  st: WeaponSlotsState,
  index: PresetIndex,
  capabilities: InputTransportCapabilities = PASSIVE_CAPABILITIES,
): WeaponSlotsRuntime {
  return { state: st, presetIndex: index, reservedBindings: [], capabilities };
}

/** Records everything the service tries to do to the windows. */
export interface FakeHostLog {
  overlaySends: Array<{ channel: string; payload: unknown }>;
  studioSends: Array<{ channel: string; payload: unknown }>;
  overlayWindowCreations: number;
  overlayWindowDestroys: number;
}

export function createFakeHost(options: { overlayVisible?: boolean } = {}) {
  const log: FakeHostLog = {
    overlaySends: [],
    studioSends: [],
    overlayWindowCreations: 0,
    overlayWindowDestroys: 0,
  };

  let overlayVisible = options.overlayVisible ?? true;
  let studioFocused = false;

  const host = {
    getOverlayWindow: () => ({ isDestroyed: () => false }) as never,
    getStudioWindow: () => ({ isDestroyed: () => false }) as never,
    isOverlayVisible: () => overlayVisible,
    sendToStudio: (channel: string, payload?: unknown) => {
      log.studioSends.push({ channel, payload });
    },
    sendToOverlay: (channel: string, payload?: unknown) => {
      log.overlaySends.push({ channel, payload });
    },
  };

  return {
    host,
    log,
    setOverlayVisible: (v: boolean) => {
      overlayVisible = v;
    },
    setStudioFocused: (v: boolean) => {
      studioFocused = v;
    },
    isStudioFocused: () => studioFocused,
    /** Crosshair configs actually delivered to the overlay window. */
    appliedConfigs: () =>
      log.overlaySends
        .filter((s) => s.channel === 'crosshair-updated')
        .map((s) => s.payload as CrosshairConfig),
  };
}
