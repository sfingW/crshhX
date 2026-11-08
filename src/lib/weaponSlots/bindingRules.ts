import {
  bindingKey,
  bindingsEqual,
  formatBinding,
  isBareTypingKey,
  isKnownCode,
  kindOfCode,
} from './keys';
import type {
  BindingIssue,
  InputTransportCapabilities,
  SlotKeyBinding,
  WeaponSlot,
  WeaponSlotProfile,
  WeaponSlotsState,
} from './types';

/**
 * Binding rules for Weapon Slot Crosshairs.
 *
 * One place decides whether an input may be bound to a slot and why not, so the
 * renderer, the main process and the tests all agree. Rules are pure: no I/O,
 * no platform calls.
 */

/** Hard ceiling on slots per profile. The UI adds slots one at a time. */
export const MAX_SLOTS_PER_PROFILE = 24;

export interface ValidationContext {
  /** App-level inputs already owned by crshhx (overlay toggle, preset cycle…). */
  reservedBindings: SlotKeyBinding[];
  capabilities: InputTransportCapabilities;
  /**
   * Every preset id that currently exists in the library.
   *
   * Optional so the rules stay usable without a library (and so callers cannot
   * be forced to load presets just to validate a key). When supplied, a slot
   * pointing at a deleted preset is reported as blocking instead of being
   * counted as switchable — the switcher would ignore that key press anyway.
   */
  knownPresetIds?: ReadonlySet<string>;
}

export interface SlotValidation {
  slotId: string;
  issues: BindingIssue[];
  /** True when at least one issue prevents the slot from ever firing. */
  blocking: boolean;
  /** True when the slot will actually switch on its key press. */
  canSwitch: boolean;
  /** True when the slot has no crosshair selected. */
  unassigned: boolean;
  /** True when the slot has no activation key. */
  unbound: boolean;
}

export type ValidationReport = Record<string, SlotValidation>;

function issue(
  code: BindingIssue['code'],
  message: string,
  blocking: boolean,
): BindingIssue {
  return { code, message, blocking };
}

/**
 * Validates one candidate binding for one slot.
 *
 * `owningProfileId` / `owningSlotId` identify the slot being edited so that it
 * is not reported as conflicting with itself.
 */
export function validateBinding(
  binding: SlotKeyBinding | null,
  ctx: ValidationContext,
  profile: WeaponSlotProfile,
  owningSlotId: string,
): BindingIssue[] {
  if (!binding) {
    return [issue('empty', 'No activation key assigned — this slot will never trigger.', false)];
  }

  const issues: BindingIssue[] = [];

  if (!isKnownCode(binding.code)) {
    issues.push(issue('unknown-key', `Unknown input "${binding.code}".`, true));
    return issues;
  }

  // 1. Conflicts with crshhx's own application shortcuts.
  for (const reserved of ctx.reservedBindings) {
    if (bindingsEqual(reserved, binding)) {
      issues.push(issue(
        'reserved',
        `${formatBinding(binding)} is reserved by crshhx for another function.`,
        true,
      ));
      break;
    }
  }

  // 2. Conflicts with another slot in the *same* profile.
  //    Cross-profile duplicates are intentional and allowed: only one profile
  //    is active at a time, so "1..5" can be reused per game.
  for (const slot of profile.slots) {
    if (slot.id === owningSlotId) continue;
    if (bindingsEqual(slot.binding, binding)) {
      issues.push(issue(
        'conflict-slot',
        `${formatBinding(binding)} is already used by slot ${slot.index} "${slot.name}" in this profile.`,
        true,
      ));
      break;
    }
  }

  // 3. Transport capability.
  //    `kind` is derived data that travels with the binding, so it is recomputed
  //    from the code here rather than trusted: a binding assembled by hand, or
  //    one written by an older build, must not be able to slip a mouse or wheel
  //    input past the capability gate and end up silently non-functional.
  const kind = kindOfCode(binding.code);
  if (kind === 'mouse' && !ctx.capabilities.mouseButtons) {
    issues.push(issue(
      'unsupported-by-transport',
      `Mouse buttons need the passive input hook, which is not running (current transport: ${ctx.capabilities.name}).`,
      true,
    ));
  }
  if (kind === 'wheel' && !ctx.capabilities.mouseWheel) {
    issues.push(issue(
      'unsupported-by-transport',
      `Mouse wheel needs the passive input hook, which is not running (current transport: ${ctx.capabilities.name}).`,
      true,
    ));
  }

  // 4. A consuming transport would eat plain typing keys system-wide.
  if (!ctx.capabilities.passiveGlobalKeyboard) {
    if (isBareTypingKey(binding)) {
      issues.push(issue(
        'modifier-required',
        `${formatBinding(binding)} is a plain typing key. Without the passive input hook crshhx would capture it system-wide and stop it reaching the game, so a modifier (Ctrl/Alt) is required.`,
        true,
      ));
    }
  } else if (isBareTypingKey(binding)) {
    issues.push(issue(
      'typing-critical',
      `${formatBinding(binding)} is observed passively — the game still receives the key press.`,
      false,
    ));
  }

  // 5. Modifiers-only bindings are meaningless.
  if (binding.modifiers.length > 0 && isKnownCode(binding.code) === false) {
    issues.push(issue('unknown-key', 'Modifier-only bindings are not supported.', true));
  }

  return issues;
}

/** Full validation pass over a state, keyed by slot id. */
export function validateState(
  state: WeaponSlotsState,
  ctx: ValidationContext,
): ValidationReport {
  const report: ValidationReport = {};

  for (const profile of state.profiles) {
    for (const slot of profile.slots) {
      const issues = validateBinding(slot.binding, ctx, profile, slot.id);

      if (!slot.presetId) {
        issues.push(issue(
          'preset-unassigned',
          'No crosshair assigned — pressing this key keeps the current crosshair.',
          false,
        ));
      } else if (ctx.knownPresetIds && !ctx.knownPresetIds.has(slot.presetId)) {
        // The preset was deleted. Never silently substitute another one: report
        // it so the user can see exactly which slot broke and why.
        issues.push(issue(
          'preset-missing',
          `The crosshair "${slot.presetId}" no longer exists in your library — this slot will not switch until another is chosen.`,
          true,
        ));
      }

      const blocking = issues.some((i) => i.blocking);
      report[slot.id] = {
        slotId: slot.id,
        issues,
        blocking,
        unassigned: !slot.presetId,
        unbound: !slot.binding,
        canSwitch: state.enabled && slot.enabled && !blocking && !!slot.binding && !!slot.presetId,
      };
    }
  }

  return report;
}

/** Every duplicate binding inside a single profile, reported once per group. */
export function findDuplicateBindings(profile: WeaponSlotProfile): WeaponSlot[][] {
  const groups = new Map<string, WeaponSlot[]>();
  for (const slot of profile.slots) {
    if (!slot.binding) continue;
    const key = bindingKey(slot.binding);
    const list = groups.get(key);
    if (list) list.push(slot);
    else groups.set(key, [slot]);
  }
  return [...groups.values()].filter((g) => g.length > 1);
}

/** Resolves which slot (if any) a binding maps to within one profile. */
export function findSlotForBinding(
  profile: WeaponSlotProfile,
  binding: SlotKeyBinding,
): WeaponSlot | null {
  for (const slot of profile.slots) {
    if (slot.binding && bindingsEqual(slot.binding, binding)) return slot;
  }
  return null;
}

/**
 * Repairs a slot list in place-safe fashion: drops duplicate bindings (keeping
 * the lowest-numbered slot) so that a hand-edited or corrupted settings file
 * can never produce an ambiguous key map. Returns a new array.
 */
export function dedupeSlotBindings(slots: readonly WeaponSlot[]): WeaponSlot[] {
  const seen = new Set<string>();
  return slots.map((slot) => {
    if (!slot.binding) return slot;
    const key = bindingKey(slot.binding);
    if (seen.has(key)) {
      return { ...slot, binding: null };
    }
    seen.add(key);
    return slot;
  });
}
