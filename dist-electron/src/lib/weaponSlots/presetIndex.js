"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildPresetIndex = buildPresetIndex;
exports.resolvePreset = resolvePreset;
exports.cloneForApply = cloneForApply;
exports.findMissingAssignments = findMissingAssignments;
exports.pruneMissingAssignments = pruneMissingAssignments;
exports.referencedPresetIds = referencedPresetIds;
exports.projectIndex = projectIndex;
exports.listSelectablePresets = listSelectablePresets;
/**
 * Builds a lookup from every preset source crshhx already owns:
 * the generated vault, the built-in pro presets, and the user's saved customs.
 * Later sources win on id collision so a user's custom preset can shadow a
 * built-in with the same id (which cannot normally happen, but must not crash).
 */
function buildPresetIndex(sources) {
    const index = {};
    for (const source of sources) {
        // Defensive: a corrupt library load must degrade to "fewer presets
        // available", never to a crash that takes the settings UI with it.
        if (!Array.isArray(source))
            continue;
        for (const preset of source) {
            if (!preset || typeof preset !== 'object')
                continue;
            if (typeof preset.id === 'string' && preset.id) {
                index[preset.id] = preset;
            }
        }
    }
    return index;
}
function resolvePreset(index, presetId) {
    if (!presetId)
        return { status: 'unassigned' };
    const config = index[presetId];
    if (!config)
        return { status: 'missing', presetId };
    return { status: 'ok', config };
}
/**
 * Clone used for the overlay apply pathway. The clone guarantees that nothing
 * downstream (renderer state, IPC, the overlay's own animation state) can write
 * back into the saved library preset.
 */
function cloneForApply(config) {
    return { ...config };
}
/** Every slot whose assigned preset id is absent from the library. */
function findMissingAssignments(state, index) {
    const out = [];
    for (const profile of state.profiles) {
        for (const slot of profile.slots) {
            if (!slot.presetId)
                continue;
            if (!index[slot.presetId]) {
                out.push({
                    profileId: profile.id,
                    profileName: profile.name,
                    slotId: slot.id,
                    slotIndex: slot.index,
                    slotName: slot.name,
                    presetId: slot.presetId,
                });
            }
        }
    }
    return out;
}
/**
 * Repair pass used when loading settings: any slot pointing at a deleted preset
 * is cleared to `null` so the UI shows it as unassigned. The slot itself, its
 * name, its key and its enabled flag are all preserved — only the dead
 * reference is dropped.
 */
function pruneMissingAssignments(state, index) {
    const pruned = findMissingAssignments(state, index);
    if (pruned.length === 0)
        return { state, pruned };
    const drop = new Set(pruned.map((p) => p.slotId));
    const profiles = state.profiles.map((profile) => ({
        ...profile,
        slots: profile.slots.map((slot) => drop.has(slot.id) ? { ...slot, presetId: null } : slot),
    }));
    return { state: { ...state, profiles }, pruned };
}
/** Ids referenced by the state — used to keep the runtime payload small. */
function referencedPresetIds(state) {
    const ids = new Set();
    for (const profile of state.profiles) {
        for (const slot of profile.slots) {
            if (slot.presetId)
                ids.add(slot.presetId);
        }
    }
    return [...ids];
}
/** Narrow a full index down to only the presets the state actually uses. */
function projectIndex(index, state) {
    const out = {};
    for (const id of referencedPresetIds(state)) {
        if (index[id])
            out[id] = index[id];
    }
    return out;
}
/**
 * Flat, grouped list for the crosshair picker. Reuses whatever presets the app
 * already loaded — this module does not own a second library.
 */
function listSelectablePresets(index) {
    const groups = [
        ['Saved (Custom)', (id) => id.startsWith('custom-')],
        ['Pro Crosshairs', (id) => id.startsWith('pc-')],
        ['Built-in Pro', (id) => id.startsWith('preset-')],
        ['Pro Roster', (id) => id.startsWith('pro-')],
        ['Precision Dots', (id) => id.startsWith('dot-')],
        ['Tactical', (id) => id.startsWith('tac-')],
        ['Rings & Shotgun', (id) => id.startsWith('ring-') || id.startsWith('shotgun-')],
        ['Chevrons & Boxes', (id) => id.startsWith('chev-') || id.startsWith('box-')],
        ['Specialty', (id) => id.startsWith('novelty-')],
    ];
    const out = [];
    const claimed = new Set();
    for (const [group, matches] of groups) {
        for (const id of Object.keys(index)) {
            if (claimed.has(id))
                continue;
            if (!matches(id))
                continue;
            claimed.add(id);
            out.push({ id, name: index[id].name || id, group, config: index[id] });
        }
    }
    for (const id of Object.keys(index)) {
        if (claimed.has(id))
            continue;
        out.push({ id, name: index[id].name || id, group: 'Other', config: index[id] });
    }
    return out;
}
