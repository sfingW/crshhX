"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WEAPON_SLOTS_RUNTIME_KEY = exports.WEAPON_SLOTS_STORAGE_KEY = void 0;
exports.normalizeBinding = normalizeBinding;
exports.normalizeState = normalizeState;
exports.serializeState = serializeState;
exports.deserializeState = deserializeState;
exports.loadState = loadState;
exports.reservedBindingsFromSettings = reservedBindingsFromSettings;
exports.defaultRuntimeState = defaultRuntimeState;
exports.normalizeRuntimeState = normalizeRuntimeState;
const bindingRules_1 = require("./bindingRules");
const defaults_1 = require("./defaults");
const keys_1 = require("./keys");
const slotStore_1 = require("./slotStore");
const presetIndex_1 = require("./presetIndex");
/**
 * Persistence schema, normalisation and migration for Weapon Slot Crosshairs.
 *
 * Design rules:
 *
 *  - Weapon slots live in their **own** storage key. The pre-existing
 *    `crshhx_app_settings` blob is never rewritten by this feature, so a user
 *    upgrading keeps their overlay hotkeys, monitor choice and startup
 *    preferences byte-for-byte.
 *  - Loading is total: any input — `null`, a truncated string, a hand-edited
 *    JSON file, a blob from an older schema — produces a valid state. Repair is
 *    recorded in a report so the UI (and the tests) can see what happened
 *    instead of failures being silent.
 *  - Repair never invents data. A binding we cannot parse becomes *unbound*; a
 *    preset id we cannot resolve becomes *unassigned*. Both are visible states
 *    in the UI rather than a silently substituted crosshair.
 */
exports.WEAPON_SLOTS_STORAGE_KEY = 'crshhx_weapon_slots';
/** Small runtime-only key: which slot is live. Written debounced, never per keypress. */
exports.WEAPON_SLOTS_RUNTIME_KEY = 'crshhx_weapon_slots_runtime';
const VALID_MODIFIERS = ['ctrl', 'alt', 'shift', 'meta'];
function isRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function asString(value, fallback) {
    return typeof value === 'string' ? value : fallback;
}
function asBoolean(value, fallback) {
    return typeof value === 'boolean' ? value : fallback;
}
function asStringArray(value) {
    if (!Array.isArray(value))
        return [];
    return value.filter((v) => typeof v === 'string');
}
/* ------------------------------------------------------------------ *
 * Binding normalisation
 * ------------------------------------------------------------------ */
/**
 * Accepts every binding shape crshhx has ever written:
 *   - canonical object `{ code, modifiers, kind }`
 *   - older object `{ key: 'Alt+1' }`
 *   - bare accelerator string `'Alt+1'` / `'1'` / `'num3'`
 * Returns `null` (unbound) for anything it cannot understand.
 */
function normalizeBinding(raw, repairs, context) {
    if (raw === null || raw === undefined || raw === '')
        return null;
    if (typeof raw === 'string') {
        const parsed = (0, keys_1.parseLegacyBinding)(raw);
        if (!parsed) {
            repairs.push(`${context}: dropped unrecognised key "${raw}".`);
            return null;
        }
        repairs.push(`${context}: migrated legacy key string "${raw}".`);
        return parsed;
    }
    if (!isRecord(raw)) {
        repairs.push(`${context}: dropped malformed binding.`);
        return null;
    }
    // Modern canonical form.
    if (typeof raw.code === 'string') {
        const code = raw.code;
        if (!(0, keys_1.isKnownCode)(code)) {
            repairs.push(`${context}: dropped binding for unknown input "${code}".`);
            return null;
        }
        const modifiers = Array.isArray(raw.modifiers)
            ? (0, keys_1.normalizeModifiers)(raw.modifiers.filter((m) => typeof m === 'string' && VALID_MODIFIERS.includes(m)))
            : [];
        return (0, keys_1.makeBinding)(code, modifiers);
    }
    // Legacy `{ key: ... }` form.
    const legacyKey = raw.key ?? raw.accelerator ?? raw.binding;
    if (typeof legacyKey === 'string') {
        const parsed = (0, keys_1.parseLegacyBinding)(legacyKey);
        if (!parsed) {
            repairs.push(`${context}: dropped unrecognised legacy key "${legacyKey}".`);
            return null;
        }
        repairs.push(`${context}: migrated legacy binding "${legacyKey}".`);
        return parsed;
    }
    repairs.push(`${context}: dropped binding with no key.`);
    return null;
}
/* ------------------------------------------------------------------ *
 * Slot / profile normalisation
 * ------------------------------------------------------------------ */
function normalizeSlot(raw, index, profileLabel, repairs) {
    if (!isRecord(raw)) {
        repairs.push(`${profileLabel}: dropped malformed slot at position ${index + 1}.`);
        return null;
    }
    const context = `${profileLabel} slot ${index + 1}`;
    // Accept both the current field names and the older aliases.
    const rawName = raw.name ?? raw.label ?? raw.title;
    const rawPreset = raw.presetId ?? raw.crosshairId ?? raw.preset ?? raw.crosshair;
    const rawEnabled = raw.enabled ?? raw.active;
    const rawBinding = raw.binding ?? raw.key ?? raw.accelerator;
    const id = typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : (0, defaults_1.newSlotId)();
    const presetId = typeof rawPreset === 'string' && rawPreset.trim() ? rawPreset.trim() : null;
    if (rawPreset !== null && rawPreset !== undefined && presetId === null) {
        repairs.push(`${context}: dropped non-string crosshair reference.`);
    }
    return {
        id,
        index: index + 1,
        name: asString(rawName, `Slot ${index + 1}`).slice(0, 48),
        binding: normalizeBinding(rawBinding, repairs, context),
        presetId,
        enabled: asBoolean(rawEnabled, true),
    };
}
function normalizeProfile(raw, repairs, fallbackId) {
    if (!isRecord(raw))
        return null;
    const id = typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : fallbackId;
    const name = asString(raw.name, 'Default').slice(0, 64);
    const rawSlots = Array.isArray(raw.slots) ? raw.slots : [];
    if (!Array.isArray(raw.slots) && raw.slots !== undefined) {
        repairs.push(`Profile "${name}": slots was not a list; rebuilt as empty.`);
    }
    const slots = [];
    for (const entry of rawSlots) {
        if (slots.length >= bindingRules_1.MAX_SLOTS_PER_PROFILE) {
            repairs.push(`Profile "${name}": truncated to ${bindingRules_1.MAX_SLOTS_PER_PROFILE} slots.`);
            break;
        }
        const slot = normalizeSlot(entry, slots.length, `Profile "${name}"`, repairs);
        if (slot)
            slots.push(slot);
    }
    return {
        id,
        name,
        matchProcessNames: (0, slotStore_1.normalizeProcessNames)(asStringArray(raw.matchProcessNames)),
        restrictToMatchedProcesses: asBoolean(raw.restrictToMatchedProcesses, false),
        isDefault: asBoolean(raw.isDefault, false),
        slots: (0, bindingRules_1.dedupeSlotBindings)(slots),
    };
}
/**
 * v0 → v1 migration.
 *
 * The earliest shape this feature could have written was a flat slot list with
 * no profile concept: `{ enabled, slots: [...] }`. Wrap it in the default
 * profile so game-specific configurations can exist from v1 onwards.
 */
function migrateV0ToV1(raw, repairs) {
    if (Array.isArray(raw.profiles))
        return raw;
    repairs.push('Migrated flat slot list (v0) into the default profile (v1).');
    return {
        ...raw,
        version: 1,
        profiles: [
            {
                id: defaults_1.DEFAULT_PROFILE_ID,
                name: 'Default',
                matchProcessNames: [],
                restrictToMatchedProcesses: false,
                isDefault: true,
                slots: Array.isArray(raw.slots) ? raw.slots : [],
            },
        ],
        activeProfileId: defaults_1.DEFAULT_PROFILE_ID,
    };
}
function createdResult(repairs, clean) {
    return {
        state: (0, defaults_1.createDefaultState)(),
        report: {
            clean,
            fromVersion: 0,
            toVersion: defaults_1.WEAPON_SLOTS_SCHEMA_VERSION,
            repairs,
            created: true,
        },
    };
}
/**
 * Total function: any input yields a valid, self-consistent state.
 *
 * Accepts either an already-parsed object or the serialised JSON string, so
 * there is exactly one code path from disk to a usable state and no way for a
 * caller to hand it the wrong shape and silently get defaults back.
 */
function normalizeState(raw) {
    const repairs = [];
    if (raw === null || raw === undefined || raw === '') {
        return createdResult([], true);
    }
    let candidate = raw;
    if (typeof candidate === 'string') {
        try {
            candidate = JSON.parse(candidate);
        }
        catch {
            return createdResult(['Stored weapon-slot data was not valid JSON; restored defaults.'], false);
        }
    }
    if (candidate === null || candidate === undefined) {
        return createdResult([], true);
    }
    if (!isRecord(candidate)) {
        return createdResult(['Stored weapon-slot data was not an object; restored defaults.'], false);
    }
    const parsed = candidate;
    const rawVersion = typeof parsed.version === 'number' ? parsed.version : 0;
    let working = parsed;
    if (rawVersion < 1)
        working = migrateV0ToV1(working, repairs);
    if (rawVersion > defaults_1.WEAPON_SLOTS_SCHEMA_VERSION) {
        repairs.push(`Stored data claims version ${rawVersion}, newer than this build understands (${defaults_1.WEAPON_SLOTS_SCHEMA_VERSION}); loading what is recognisable.`);
    }
    const rawProfiles = Array.isArray(working.profiles) ? working.profiles : [];
    const profiles = [];
    const seenIds = new Set();
    for (const entry of rawProfiles) {
        const fallbackId = profiles.length === 0 ? defaults_1.DEFAULT_PROFILE_ID : (0, defaults_1.newProfileId)();
        const profile = normalizeProfile(entry, repairs, fallbackId);
        if (!profile) {
            repairs.push('Dropped a malformed profile.');
            continue;
        }
        if (seenIds.has(profile.id)) {
            repairs.push(`Profile "${profile.name}" had a duplicate id; assigned a new one.`);
            profile.id = (0, defaults_1.newProfileId)();
        }
        seenIds.add(profile.id);
        profiles.push(profile);
    }
    if (profiles.length === 0) {
        repairs.push('No usable profiles found; restored the default profile.');
        profiles.push((0, defaults_1.createDefaultProfile)());
    }
    // Exactly one default profile.
    if (!profiles.some((p) => p.isDefault)) {
        repairs.push('No profile was marked default; marked the first one.');
        profiles[0] = { ...profiles[0], isDefault: true };
    }
    else {
        let seenDefault = false;
        for (let i = 0; i < profiles.length; i += 1) {
            if (!profiles[i].isDefault)
                continue;
            if (seenDefault) {
                repairs.push(`Profile "${profiles[i].name}" was also marked default; cleared the flag.`);
                profiles[i] = { ...profiles[i], isDefault: false };
            }
            seenDefault = true;
        }
    }
    let activeProfileId = asString(working.activeProfileId, '');
    if (!profiles.some((p) => p.id === activeProfileId)) {
        if (activeProfileId) {
            repairs.push(`Active profile "${activeProfileId}" no longer exists; selected the default.`);
        }
        activeProfileId =
            profiles.find((p) => p.isDefault)?.id ?? profiles[0].id;
    }
    const state = {
        version: defaults_1.WEAPON_SLOTS_SCHEMA_VERSION,
        enabled: asBoolean(working.enabled, false),
        profiles,
        activeProfileId,
        autoSelectProfileByForegroundApp: asBoolean(working.autoSelectProfileByForegroundApp, false),
        unassignedSlotBehaviour: 'keep-current',
        suppressWhileStudioFocused: asBoolean(working.suppressWhileStudioFocused, false),
    };
    if (working.unassignedSlotBehaviour !== undefined && working.unassignedSlotBehaviour !== 'keep-current') {
        repairs.push(`Unsupported unassigned-slot behaviour "${String(working.unassignedSlotBehaviour)}"; using "keep-current".`);
    }
    return {
        state,
        report: {
            clean: repairs.length === 0,
            fromVersion: rawVersion,
            toVersion: defaults_1.WEAPON_SLOTS_SCHEMA_VERSION,
            repairs,
            created: false,
        },
    };
}
function serializeState(state) {
    return JSON.stringify(state);
}
function deserializeState(json) {
    return normalizeState(json);
}
/**
 * Normalise, then drop references to presets that no longer exist.
 * This is the full "load from disk" path.
 */
function loadState(json, presetIndex) {
    const { state, report } = deserializeState(json);
    const { state: pruned, pruned: missing } = (0, presetIndex_1.pruneMissingAssignments)(state, presetIndex);
    if (missing.length > 0) {
        for (const m of missing) {
            report.repairs.push(`Slot ${m.slotIndex} "${m.slotName}" in profile "${m.profileName}" referenced deleted crosshair "${m.presetId}"; cleared the assignment.`);
        }
        report.clean = false;
    }
    return { state: pruned, report, prunedPresetIds: missing.map((m) => m.presetId) };
}
/* ------------------------------------------------------------------ *
 * Interop with the pre-existing app settings
 * ------------------------------------------------------------------ */
/**
 * Derives the app-level inputs that weapon slots must not steal.
 *
 * crshhx already owns the overlay toggle (`F10`) and the preset cycle (`F9`).
 * Reading them from the *existing* settings object is what keeps the two systems
 * coexisting: the generic hotkeys stay exactly as the user left them, and slot
 * validation simply refuses to collide with them.
 */
function reservedBindingsFromSettings(settings) {
    /**
     * Only the hotkeys `electron/main.ts` actually registers with
     * `globalShortcut` are reserved, so a slot is never refused a key that no
     * part of crshhx is listening for.
     *
     * `AppSettings.centerLockHotkey` ('F8' by default) is deliberately **not**
     * here: the setting is persisted and shipped, but nothing registers or
     * reacts to it, so F8 is free for a weapon slot. If centre-lock is ever
     * wired up, add it back to this list.
     */
    const candidates = [
        settings?.toggleOverlayHotkey,
        settings?.cyclePresetHotkey,
    ];
    const out = [];
    const seen = new Set();
    for (const raw of candidates) {
        const binding = (0, keys_1.parseLegacyBinding)(raw);
        if (!binding)
            continue;
        const key = [...binding.modifiers, binding.code].join('+');
        if (seen.has(key))
            continue;
        seen.add(key);
        out.push(binding);
    }
    return out;
}
function defaultRuntimeState() {
    return {
        activeProfileId: defaults_1.DEFAULT_PROFILE_ID,
        activeSlotId: null,
        activePresetId: null,
        lastSwitchAt: 0,
    };
}
function normalizeRuntimeState(raw) {
    const fallback = defaultRuntimeState();
    if (!isRecord(raw))
        return fallback;
    return {
        activeProfileId: asString(raw.activeProfileId, fallback.activeProfileId),
        activeSlotId: typeof raw.activeSlotId === 'string' && raw.activeSlotId ? raw.activeSlotId : null,
        activePresetId: typeof raw.activePresetId === 'string' && raw.activePresetId ? raw.activePresetId : null,
        lastSwitchAt: typeof raw.lastSwitchAt === 'number' ? raw.lastSwitchAt : 0,
    };
}
