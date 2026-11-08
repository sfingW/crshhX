import { bindingKey, isModifierCode } from './keys';
import { cloneForApply, resolvePreset } from './presetIndex';
import { foregroundDenialReason, selectProfile } from './profileMatching';
import { getActiveProfile } from './slotStore';
import type {
  InputTransportCapabilities,
  NormalisedInputEvent,
  PresetIndex,
  SlotKeyBinding,
  SwitchDecision,
  SwitchEnvironment,
  SwitchIgnoreReason,
  WeaponSlot,
  WeaponSlotsState,
} from './types';

/**
 * The switching decision engine.
 *
 * This is the single place that answers "this input just arrived — should the
 * overlay change, and to what?". It is a pure function of the input event, the
 * persisted state, the preset index and the runtime environment, which means the
 * entire behaviour contract of Weapon Slot Crosshairs is unit-testable without
 * Electron, a window system or a keyboard.
 *
 * The engine never performs I/O. Applying the decision (sending it to the
 * overlay, updating the status bar) is the caller's job — see
 * `electron/services/weaponSlotService.ts`.
 */

/**
 * When false (default) a binding's declared modifiers must all be held, but
 * extra modifiers held at the same time are ignored. That matches how players
 * actually press keys in-game — slot keys are frequently pressed while Shift or
 * Ctrl are already down for movement/abilities.
 *
 * When true the modifier set must match exactly.
 */
export interface MatchOptions {
  strictModifiers: boolean;
}

export const DEFAULT_MATCH_OPTIONS: MatchOptions = { strictModifiers: false };

export function matchesBinding(
  binding: SlotKeyBinding,
  pressed: SlotKeyBinding,
  options: MatchOptions = DEFAULT_MATCH_OPTIONS,
): boolean {
  if (binding.code !== pressed.code) return false;

  const declared = new Set(binding.modifiers);
  const held = new Set(pressed.modifiers);

  for (const m of declared) {
    if (!held.has(m)) return false;
  }
  if (options.strictModifiers && declared.size !== held.size) return false;
  return true;
}

/** Resolves the slot a pressed input maps to inside one profile. */
export function resolveSlot(
  slots: readonly WeaponSlot[],
  pressed: SlotKeyBinding,
  options: MatchOptions = DEFAULT_MATCH_OPTIONS,
): WeaponSlot | null {
  // Exact-modifier matches win over subset matches so that a user who binds
  // both `1` and `Ctrl+1` gets the more specific one.
  let looseMatch: WeaponSlot | null = null;
  for (const slot of slots) {
    if (!slot.binding) continue;
    if (matchesBinding(slot.binding, pressed, { strictModifiers: true })) return slot;
    if (!options.strictModifiers && !looseMatch && matchesBinding(slot.binding, pressed, options)) {
      looseMatch = slot;
    }
  }
  return looseMatch;
}

function makeIgnore(
  reason: SwitchIgnoreReason,
  detail?: string,
): SwitchDecision {
  return detail ? { kind: 'ignore', reason, detail } : { kind: 'ignore', reason };
}

export interface SwitchRequest {
  event: NormalisedInputEvent;
  state: WeaponSlotsState;
  presetIndex: PresetIndex;
  environment: SwitchEnvironment;
  capabilities: InputTransportCapabilities;
  /** Currently displayed slot/preset, used to detect a no-op re-trigger. */
  activeSlotId?: string | null;
  activePresetId?: string | null;
  matchOptions?: MatchOptions;
}

/**
 * Decides what a single input event should do.
 *
 * Check order is deliberate and mirrors the documented behaviour contract:
 * cheapest and most global rejections first, so a disabled feature costs
 * almost nothing on the hot path.
 */
export function decideSwitch(request: SwitchRequest): SwitchDecision {
  const {
    event, state, presetIndex, environment, capabilities,
  } = request;
  const options = request.matchOptions ?? DEFAULT_MATCH_OPTIONS;

  // 0. Modifier-only key presses are never a slot trigger.
  if (isModifierCode(event.binding.code)) {
    return makeIgnore('no-matching-slot', 'Modifier key pressed alone.');
  }

  // 1. Auto-repeat of a held key.
  if (event.isRepeat) return makeIgnore('key-repeat');

  // 2. A key-capture field is listening — the press belongs to the recorder.
  if (environment.isRecordingBinding) return makeIgnore('recording-binding');

  // 3. Master switch.
  if (!state.enabled) return makeIgnore('feature-disabled');

  // 4. Nothing to draw into.
  if (!environment.overlayRunning) return makeIgnore('overlay-hidden');

  // 5. Avoid triggering while the user is working inside crshhx itself.
  if (state.suppressWhileStudioFocused && environment.studioFocused) {
    return makeIgnore('studio-focused');
  }

  // 6. Which profile is live?
  const selection = selectProfile(state, environment.foregroundProcessName);
  const profile = selection.profile ?? getActiveProfile(state);
  if (!profile) return makeIgnore('no-matching-slot', 'No profile configured.');

  // 7. Foreground restriction (opt-in per profile, honoured strictly).
  const denial = foregroundDenialReason(
    profile,
    environment.foregroundProcessName,
    environment.foregroundTrackingAvailable,
  );
  if (denial) return makeIgnore('foreground-not-allowed', denial);

  // 8. Which slot does this input belong to?
  const slot = resolveSlot(profile.slots, event.binding, options);
  if (!slot) return makeIgnore('no-matching-slot');

  // 9. Per-slot enable flag.
  if (!slot.enabled) return makeIgnore('slot-disabled', `Slot ${slot.index} "${slot.name}" is disabled.`);

  // 10. Transport can actually deliver this input kind.
  if (event.binding.kind === 'mouse' && !capabilities.mouseButtons) {
    return makeIgnore('input-kind-unsupported', 'Mouse buttons need the passive input hook.');
  }
  if (event.binding.kind === 'wheel' && !capabilities.mouseWheel) {
    return makeIgnore('input-kind-unsupported', 'Mouse wheel needs the passive input hook.');
  }

  // 11. Unassigned slot -> leave the overlay exactly as it is.
  if (!slot.presetId) {
    return makeIgnore(
      'preset-unassigned',
      `Slot ${slot.index} "${slot.name}" has no crosshair assigned — keeping the current crosshair.`,
    );
  }

  // 12. Deleted preset -> still leave the overlay alone, but say why.
  const resolution = resolvePreset(presetIndex, slot.presetId);
  if (resolution.status === 'missing') {
    return makeIgnore(
      'preset-missing',
      `Crosshair "${resolution.presetId}" assigned to slot ${slot.index} no longer exists — keeping the current crosshair.`,
    );
  }
  if (resolution.status === 'unassigned') {
    return makeIgnore('preset-unassigned');
  }

  const unchanged =
    request.activeSlotId === slot.id && request.activePresetId === slot.presetId;

  return {
    kind: 'apply',
    slotId: slot.id,
    slotName: slot.name,
    slotIndex: slot.index,
    profileId: profile.id,
    presetId: slot.presetId,
    config: cloneForApply(resolution.config),
    unchanged,
  };
}

/**
 * Suppresses duplicate switches caused by OS key auto-repeat and by held keys.
 *
 * The passive hook reports a fresh key-down for every auto-repeat while a key
 * is held, and it does not flag them. This guard therefore reconstructs the
 * repeat state itself: a key-down for a code that is already recorded as held
 * is a repeat. Wheel events have no up-phase, so they are debounced by time
 * instead — one fast flick must not skip three slots.
 */
export class KeyRepeatGuard {
  private readonly held = new Set<string>();
  private readonly lastEventAt = new Map<string, number>();

  /**
   * @param wheelDebounceMs minimum spacing between two wheel triggers
   * @param keyDebounceMs   minimum spacing between two triggers of the same key
   */
  constructor(
    private readonly wheelDebounceMs = 90,
    private readonly keyDebounceMs = 40,
  ) {}

  /**
   * @returns true when the event must be dropped as a repeat.
   */
  shouldSuppress(event: NormalisedInputEvent): boolean {
    const key = bindingKey(event.binding);

    if (event.phase === 'up') {
      this.held.delete(key);
      return true; // key-up never triggers a switch
    }

    if (event.binding.kind === 'wheel') {
      const last = this.lastEventAt.get(key) ?? -Infinity;
      if (event.timestamp - last < this.wheelDebounceMs) return true;
      this.lastEventAt.set(key, event.timestamp);
      return false;
    }

    if (event.isRepeat) return true;
    if (this.held.has(key)) return true;

    this.held.add(key);
    const last = this.lastEventAt.get(key) ?? -Infinity;
    if (event.timestamp - last < this.keyDebounceMs) return true;
    this.lastEventAt.set(key, event.timestamp);
    return false;
  }

  /** Forget every held key — call on transport restart or window focus loss. */
  reset(): void {
    this.held.clear();
    this.lastEventAt.clear();
  }

  /** Number of keys currently considered held. Exposed for diagnostics/tests. */
  get heldCount(): number {
    return this.held.size;
  }
}
