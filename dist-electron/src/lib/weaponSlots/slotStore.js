"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProfile = getProfile;
exports.getActiveProfile = getActiveProfile;
exports.getSlot = getSlot;
exports.addSlot = addSlot;
exports.removeSlot = removeSlot;
exports.renameSlot = renameSlot;
exports.setSlotBinding = setSlotBinding;
exports.setSlotBindingFromCode = setSlotBindingFromCode;
exports.clearSlotBinding = clearSlotBinding;
exports.assignPreset = assignPreset;
exports.clearPreset = clearPreset;
exports.setSlotEnabled = setSlotEnabled;
exports.toggleSlotEnabled = toggleSlotEnabled;
exports.moveSlot = moveSlot;
exports.resetProfileSlots = resetProfileSlots;
exports.addProfile = addProfile;
exports.addTemplateProfile = addTemplateProfile;
exports.removeProfile = removeProfile;
exports.renameProfile = renameProfile;
exports.setProfileProcessNames = setProfileProcessNames;
exports.setActiveProfile = setActiveProfile;
exports.duplicateProfile = duplicateProfile;
exports.setFeatureEnabled = setFeatureEnabled;
exports.setAutoSelectByForeground = setAutoSelectByForeground;
exports.setSuppressWhileStudioFocused = setSuppressWhileStudioFocused;
exports.restoreDefaultSlots = restoreDefaultSlots;
exports.factoryReset = factoryReset;
exports.normalizeProcessNames = normalizeProcessNames;
exports.dedupeAllBindings = dedupeAllBindings;
const bindingRules_1 = require("./bindingRules");
const defaults_1 = require("./defaults");
const keys_1 = require("./keys");
function ok(state) {
    return { ok: true, state };
}
function fail(error) {
    return { ok: false, error };
}
function mapProfile(state, profileId, fn) {
    return {
        ...state,
        profiles: state.profiles.map((p) => (p.id === profileId ? fn(p) : p)),
    };
}
function mapSlot(state, profileId, slotId, fn) {
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
function requireSlot(state, profileId, slotId) {
    const profile = getProfile(state, profileId);
    if (!profile)
        return null;
    return profile.slots.find((s) => s.id === slotId) ?? null;
}
/** Re-numbers `index` so the UI always shows a contiguous 1..n slot column. */
function reindex(slots) {
    return slots.map((slot, i) => (slot.index === i + 1 ? slot : { ...slot, index: i + 1 }));
}
function getProfile(state, profileId) {
    return state.profiles.find((p) => p.id === profileId) ?? null;
}
function getActiveProfile(state) {
    return (getProfile(state, state.activeProfileId) ??
        state.profiles.find((p) => p.isDefault) ??
        state.profiles[0] ??
        null);
}
function getSlot(state, profileId, slotId) {
    return getProfile(state, profileId)?.slots.find((s) => s.id === slotId) ?? null;
}
/* ------------------------------------------------------------------ *
 * Slot operations
 * ------------------------------------------------------------------ */
function addSlot(state, profileId, name) {
    const profile = getProfile(state, profileId);
    if (!profile)
        return fail(`Unknown profile "${profileId}".`);
    if (profile.slots.length >= bindingRules_1.MAX_SLOTS_PER_PROFILE) {
        return fail(`A profile can hold at most ${bindingRules_1.MAX_SLOTS_PER_PROFILE} slots.`);
    }
    const slot = {
        id: (0, defaults_1.newSlotId)(),
        index: profile.slots.length + 1,
        name: name?.trim() || `Slot ${profile.slots.length + 1}`,
        binding: null,
        presetId: null,
        enabled: true,
    };
    return ok(mapProfile(state, profileId, (p) => ({ ...p, slots: [...p.slots, slot] })));
}
function removeSlot(state, profileId, slotId) {
    const profile = getProfile(state, profileId);
    if (!profile)
        return fail(`Unknown profile "${profileId}".`);
    if (!profile.slots.some((s) => s.id === slotId))
        return fail(`Unknown slot "${slotId}".`);
    const next = mapProfile(state, profileId, (p) => ({
        ...p,
        slots: reindex(p.slots.filter((s) => s.id !== slotId)),
    }));
    return ok(next);
}
function renameSlot(state, profileId, slotId, name) {
    if (!requireSlot(state, profileId, slotId))
        return fail(`Unknown slot "${slotId}".`);
    const trimmed = name.trim();
    if (!trimmed)
        return fail('Slot name cannot be empty.');
    if (trimmed.length > 48)
        return fail('Slot name must be 48 characters or fewer.');
    return ok(mapSlot(state, profileId, slotId, (s) => ({ ...s, name: trimmed })));
}
function setSlotBinding(state, profileId, slotId, binding) {
    if (!requireSlot(state, profileId, slotId))
        return fail(`Unknown slot "${slotId}".`);
    const next = mapSlot(state, profileId, slotId, (s) => ({ ...s, binding }));
    // A hand-set binding could collide with an existing one. Keep the key map
    // unambiguous by clearing the *other* slot that held the same input, rather
    // than refusing the edit — the user's most recent choice always wins.
    if (!binding)
        return ok(next);
    return ok(mapProfile(next, profileId, (p) => ({
        ...p,
        slots: p.slots.map((s) => s.id !== slotId && (0, keys_1.bindingsEqual)(s.binding, binding) ? { ...s, binding: null } : s),
    })));
}
function setSlotBindingFromCode(state, profileId, slotId, code) {
    return setSlotBinding(state, profileId, slotId, code ? (0, keys_1.makeBinding)(code) : null);
}
function clearSlotBinding(state, profileId, slotId) {
    return setSlotBinding(state, profileId, slotId, null);
}
function assignPreset(state, profileId, slotId, presetId) {
    if (!requireSlot(state, profileId, slotId))
        return fail(`Unknown slot "${slotId}".`);
    if (presetId !== null && (!presetId || typeof presetId !== 'string')) {
        return fail('Preset id must be a non-empty string.');
    }
    return ok(mapSlot(state, profileId, slotId, (s) => ({ ...s, presetId })));
}
function clearPreset(state, profileId, slotId) {
    return assignPreset(state, profileId, slotId, null);
}
function setSlotEnabled(state, profileId, slotId, enabled) {
    if (!requireSlot(state, profileId, slotId))
        return fail(`Unknown slot "${slotId}".`);
    return ok(mapSlot(state, profileId, slotId, (s) => ({ ...s, enabled })));
}
function toggleSlotEnabled(state, profileId, slotId) {
    const slot = getSlot(state, profileId, slotId);
    if (!slot)
        return fail(`Unknown slot "${slotId}".`);
    return setSlotEnabled(state, profileId, slotId, !slot.enabled);
}
function moveSlot(state, profileId, slotId, direction) {
    const profile = getProfile(state, profileId);
    if (!profile)
        return fail(`Unknown profile "${profileId}".`);
    const from = profile.slots.findIndex((s) => s.id === slotId);
    if (from < 0)
        return fail(`Unknown slot "${slotId}".`);
    const to = from + direction;
    if (to < 0 || to >= profile.slots.length)
        return ok(state);
    const slots = [...profile.slots];
    const [moved] = slots.splice(from, 1);
    slots.splice(to, 0, moved);
    return ok(mapProfile(state, profileId, (p) => ({ ...p, slots: reindex(slots) })));
}
function resetProfileSlots(state, profileId) {
    const profile = getProfile(state, profileId);
    if (!profile)
        return fail(`Unknown profile "${profileId}".`);
    return ok(mapProfile(state, profileId, (p) => ({ ...p, slots: (0, defaults_1.createDefaultSlots)() })));
}
/* ------------------------------------------------------------------ *
 * Profile operations
 * ------------------------------------------------------------------ */
function addProfile(state, name, matchProcessNames = []) {
    const trimmed = name.trim();
    if (!trimmed)
        return fail('Profile name cannot be empty.');
    if (state.profiles.some((p) => p.name.toLowerCase() === trimmed.toLowerCase())) {
        return fail(`A profile named "${trimmed}" already exists.`);
    }
    const profile = {
        id: (0, defaults_1.newProfileId)(),
        name: trimmed,
        matchProcessNames: normalizeProcessNames(matchProcessNames),
        restrictToMatchedProcesses: false,
        isDefault: false,
        slots: (0, defaults_1.createDefaultSlots)(),
    };
    // Creating a profile selects it: the management UI adds a tab, and the user's
    // next action is always to look at or edit what they just created.
    return ok({
        ...state,
        profiles: [...state.profiles, profile],
        activeProfileId: profile.id,
    });
}
function addTemplateProfile(state, template) {
    const profile = template === 'fortnite' ? (0, defaults_1.createFortniteProfile)()
        : template === 'cs2' ? (0, defaults_1.createCs2Profile)()
            : {
                ...(0, defaults_1.createDefaultProfile)(),
                id: (0, defaults_1.newProfileId)(),
                name: 'New Profile',
                isDefault: false,
                // Fresh ids: the blank template must not share ids with the shipped
                // default profile, or the validation report would collide.
                slots: (0, defaults_1.createDefaultSlots)(),
            };
    let name = profile.name;
    let n = 2;
    while (state.profiles.some((p) => p.name.toLowerCase() === name.toLowerCase())) {
        name = `${profile.name} ${n}`;
        n += 1;
    }
    const added = { ...profile, name };
    return ok({
        ...state,
        profiles: [...state.profiles, added],
        activeProfileId: added.id,
    });
}
function removeProfile(state, profileId) {
    const profile = getProfile(state, profileId);
    if (!profile)
        return fail(`Unknown profile "${profileId}".`);
    if (profile.isDefault)
        return fail('The default profile cannot be removed.');
    if (state.profiles.length <= 1)
        return fail('At least one profile must remain.');
    const profiles = state.profiles.filter((p) => p.id !== profileId);
    const activeProfileId = state.activeProfileId === profileId ? defaults_1.DEFAULT_PROFILE_ID : state.activeProfileId;
    return ok({ ...state, profiles, activeProfileId });
}
function renameProfile(state, profileId, name) {
    const trimmed = name.trim();
    if (!trimmed)
        return fail('Profile name cannot be empty.');
    if (state.profiles.some((p) => p.id !== profileId && p.name.toLowerCase() === trimmed.toLowerCase())) {
        return fail(`A profile named "${trimmed}" already exists.`);
    }
    return ok(mapProfile(state, profileId, (p) => ({ ...p, name: trimmed })));
}
function setProfileProcessNames(state, profileId, rawNames) {
    return ok(mapProfile(state, profileId, (p) => ({
        ...p,
        matchProcessNames: normalizeProcessNames(rawNames),
    })));
}
function setActiveProfile(state, profileId) {
    if (!getProfile(state, profileId))
        return fail(`Unknown profile "${profileId}".`);
    return ok({ ...state, activeProfileId: profileId });
}
function duplicateProfile(state, profileId) {
    const source = getProfile(state, profileId);
    if (!source)
        return fail(`Unknown profile "${profileId}".`);
    let name = `${source.name} Copy`;
    let n = 2;
    while (state.profiles.some((p) => p.name.toLowerCase() === name.toLowerCase())) {
        name = `${source.name} Copy ${n}`;
        n += 1;
    }
    const copy = {
        ...source,
        id: (0, defaults_1.newProfileId)(),
        name,
        isDefault: false,
        slots: source.slots.map((s) => ({ ...s, id: (0, defaults_1.newSlotId)() })),
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
function setFeatureEnabled(state, enabled) {
    return { ...state, enabled };
}
function setAutoSelectByForeground(state, enabled) {
    return { ...state, autoSelectProfileByForegroundApp: enabled };
}
function setSuppressWhileStudioFocused(state, enabled) {
    return { ...state, suppressWhileStudioFocused: enabled };
}
/**
 * "Restore defaults" in the UI: puts the *default profile's* slot table back to
 * the shipped five slots. Other game profiles, the master switch and all other
 * preferences are deliberately left alone — a restore button should not be able
 * to destroy unrelated configuration.
 */
function restoreDefaultSlots(state) {
    const target = getProfile(state, defaults_1.DEFAULT_PROFILE_ID) ? defaults_1.DEFAULT_PROFILE_ID : state.profiles[0]?.id;
    if (!target)
        return state;
    const result = resetProfileSlots(state, target);
    return result.ok ? result.state : state;
}
/** Full factory reset — drops every profile and returns to shipped defaults. */
function factoryReset() {
    return (0, defaults_1.createDefaultState)();
}
function normalizeProcessNames(raw) {
    const seen = new Set();
    const out = [];
    for (const entry of raw) {
        if (typeof entry !== 'string')
            continue;
        // Accept a full path, a bare exe name, or a comma/space separated list.
        for (const part of entry.split(/[,;]/)) {
            const name = part.trim().toLowerCase().replace(/\\/g, '/').split('/').pop() || '';
            if (!name || seen.has(name))
                continue;
            seen.add(name);
            out.push(name);
        }
    }
    return out;
}
/** Applies `dedupeSlotBindings` across every profile. Used by the migration layer. */
function dedupeAllBindings(state) {
    return {
        ...state,
        profiles: state.profiles.map((p) => ({ ...p, slots: (0, bindingRules_1.dedupeSlotBindings)(p.slots) })),
    };
}
