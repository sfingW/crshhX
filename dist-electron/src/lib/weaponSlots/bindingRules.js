"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAX_SLOTS_PER_PROFILE = void 0;
exports.validateBinding = validateBinding;
exports.validateState = validateState;
exports.findDuplicateBindings = findDuplicateBindings;
exports.findSlotForBinding = findSlotForBinding;
exports.dedupeSlotBindings = dedupeSlotBindings;
const keys_1 = require("./keys");
/**
 * Binding rules for Weapon Slot Crosshairs.
 *
 * One place decides whether an input may be bound to a slot and why not, so the
 * renderer, the main process and the tests all agree. Rules are pure: no I/O,
 * no platform calls.
 */
/** Hard ceiling on slots per profile. The UI adds slots one at a time. */
exports.MAX_SLOTS_PER_PROFILE = 24;
function issue(code, message, blocking) {
    return { code, message, blocking };
}
/**
 * Validates one candidate binding for one slot.
 *
 * `owningProfileId` / `owningSlotId` identify the slot being edited so that it
 * is not reported as conflicting with itself.
 */
function validateBinding(binding, ctx, profile, owningSlotId) {
    if (!binding) {
        return [issue('empty', 'No activation key assigned — this slot will never trigger.', false)];
    }
    const issues = [];
    if (!(0, keys_1.isKnownCode)(binding.code)) {
        issues.push(issue('unknown-key', `Unknown input "${binding.code}".`, true));
        return issues;
    }
    // 1. Conflicts with crshhx's own application shortcuts.
    for (const reserved of ctx.reservedBindings) {
        if ((0, keys_1.bindingsEqual)(reserved, binding)) {
            issues.push(issue('reserved', `${(0, keys_1.formatBinding)(binding)} is reserved by crshhx for another function.`, true));
            break;
        }
    }
    // 2. Conflicts with another slot in the *same* profile.
    //    Cross-profile duplicates are intentional and allowed: only one profile
    //    is active at a time, so "1..5" can be reused per game.
    for (const slot of profile.slots) {
        if (slot.id === owningSlotId)
            continue;
        if ((0, keys_1.bindingsEqual)(slot.binding, binding)) {
            issues.push(issue('conflict-slot', `${(0, keys_1.formatBinding)(binding)} is already used by slot ${slot.index} "${slot.name}" in this profile.`, true));
            break;
        }
    }
    // 3. Transport capability.
    //    `kind` is derived data that travels with the binding, so it is recomputed
    //    from the code here rather than trusted: a binding assembled by hand, or
    //    one written by an older build, must not be able to slip a mouse or wheel
    //    input past the capability gate and end up silently non-functional.
    const kind = (0, keys_1.kindOfCode)(binding.code);
    if (kind === 'mouse' && !ctx.capabilities.mouseButtons) {
        issues.push(issue('unsupported-by-transport', `Mouse buttons need the passive input hook, which is not running (current transport: ${ctx.capabilities.name}).`, true));
    }
    if (kind === 'wheel' && !ctx.capabilities.mouseWheel) {
        issues.push(issue('unsupported-by-transport', `Mouse wheel needs the passive input hook, which is not running (current transport: ${ctx.capabilities.name}).`, true));
    }
    // 4. A consuming transport would eat plain typing keys system-wide.
    if (!ctx.capabilities.passiveGlobalKeyboard) {
        if ((0, keys_1.isBareTypingKey)(binding)) {
            issues.push(issue('modifier-required', `${(0, keys_1.formatBinding)(binding)} is a plain typing key. Without the passive input hook crshhx would capture it system-wide and stop it reaching the game, so a modifier (Ctrl/Alt) is required.`, true));
        }
    }
    else if ((0, keys_1.isBareTypingKey)(binding)) {
        issues.push(issue('typing-critical', `${(0, keys_1.formatBinding)(binding)} is observed passively — the game still receives the key press.`, false));
    }
    // 5. Modifiers-only bindings are meaningless.
    if (binding.modifiers.length > 0 && (0, keys_1.isKnownCode)(binding.code) === false) {
        issues.push(issue('unknown-key', 'Modifier-only bindings are not supported.', true));
    }
    return issues;
}
/** Full validation pass over a state, keyed by slot id. */
function validateState(state, ctx) {
    const report = {};
    for (const profile of state.profiles) {
        for (const slot of profile.slots) {
            const issues = validateBinding(slot.binding, ctx, profile, slot.id);
            if (!slot.presetId) {
                issues.push(issue('preset-unassigned', 'No crosshair assigned — pressing this key keeps the current crosshair.', false));
            }
            else if (ctx.knownPresetIds && !ctx.knownPresetIds.has(slot.presetId)) {
                // The preset was deleted. Never silently substitute another one: report
                // it so the user can see exactly which slot broke and why.
                issues.push(issue('preset-missing', `The crosshair "${slot.presetId}" no longer exists in your library — this slot will not switch until another is chosen.`, true));
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
function findDuplicateBindings(profile) {
    const groups = new Map();
    for (const slot of profile.slots) {
        if (!slot.binding)
            continue;
        const key = (0, keys_1.bindingKey)(slot.binding);
        const list = groups.get(key);
        if (list)
            list.push(slot);
        else
            groups.set(key, [slot]);
    }
    return [...groups.values()].filter((g) => g.length > 1);
}
/** Resolves which slot (if any) a binding maps to within one profile. */
function findSlotForBinding(profile, binding) {
    for (const slot of profile.slots) {
        if (slot.binding && (0, keys_1.bindingsEqual)(slot.binding, binding))
            return slot;
    }
    return null;
}
/**
 * Repairs a slot list in place-safe fashion: drops duplicate bindings (keeping
 * the lowest-numbered slot) so that a hand-edited or corrupted settings file
 * can never produce an ambiguous key map. Returns a new array.
 */
function dedupeSlotBindings(slots) {
    const seen = new Set();
    return slots.map((slot) => {
        if (!slot.binding)
            return slot;
        const key = (0, keys_1.bindingKey)(slot.binding);
        if (seen.has(key)) {
            return { ...slot, binding: null };
        }
        seen.add(key);
        return slot;
    });
}
