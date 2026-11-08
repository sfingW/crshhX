"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_SLOT_SEEDS = exports.DEFAULT_PROFILE_ID = exports.WEAPON_SLOTS_SCHEMA_VERSION = void 0;
exports.newSlotId = newSlotId;
exports.newProfileId = newProfileId;
exports.__resetIdSequence = __resetIdSequence;
exports.createSlot = createSlot;
exports.createDefaultSlots = createDefaultSlots;
exports.createDefaultProfile = createDefaultProfile;
exports.createDefaultState = createDefaultState;
exports.createFortniteProfile = createFortniteProfile;
exports.createCs2Profile = createCs2Profile;
const keys_1 = require("./keys");
/**
 * Default Weapon Slot Crosshairs configuration.
 *
 * The five slots below are *defaults only* — they are a starting point that the
 * user can rename, rebind, disable, delete, and extend up to
 * `MAX_SLOTS_PER_PROFILE`. Nothing else in crshhx assumes there are five.
 *
 * Preset references use stable library identifiers from
 * `src/lib/crosshairCollection.ts`. If the library ever changes and an id stops
 * resolving, the slot degrades to a visibly "unassigned" state instead of
 * silently picking a different crosshair (see `presetIndex.ts`). A test in
 * `tests/weaponSlots.defaults.test.ts` guards these ids.
 */
exports.WEAPON_SLOTS_SCHEMA_VERSION = 1;
exports.DEFAULT_PROFILE_ID = 'profile-default';
let slotSequence = 0;
/** Deterministic-within-run unique slot id. */
function newSlotId(prefix = 'slot') {
    slotSequence += 1;
    return `${prefix}-${Date.now().toString(36)}-${slotSequence}`;
}
function newProfileId() {
    return `profile-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
}
/** Reset the id counter — used by tests to keep ids predictable. */
function __resetIdSequence() {
    slotSequence = 0;
}
exports.DEFAULT_SLOT_SEEDS = [
    { name: 'Shotgun', code: 'Digit1', presetId: 'pro-11' }, // Pump Breacher (Shotgun Spread)
    { name: 'Assault Rifle', code: 'Digit2', presetId: 'pro-15' }, // W-Key Striker (Cyan Cross)
    { name: 'SMG', code: 'Digit3', presetId: 'pro-28' }, // Aggro Phenom (Micro Cyan)
    { name: 'Sniper', code: 'Digit4', presetId: 'pro-8' }, // Sniper Prodigy (Flick Pin)
    { name: 'Utility', code: 'Digit5', presetId: 'pro-5' }, // Phantom Shroud (Universal)
];
/**
 * @param idPrefix when supplied the slot ids are deterministic
 *   (`slot-<prefix>-1`). Shipped profiles use this so their ids are stable
 *   across restarts and across tests. Omit it for user-created content, which
 *   must get a globally unique id — slot ids key the validation report, so two
 *   profiles must never share one.
 */
function createSlot(seed) {
    return {
        id: seed.id ?? newSlotId(),
        index: seed.index,
        name: seed.name?.trim() || `Slot ${seed.index}`,
        binding: seed.code ? (0, keys_1.makeBinding)(seed.code) : null,
        presetId: seed.presetId ?? null,
        enabled: true,
    };
}
function createDefaultSlots(idPrefix) {
    return exports.DEFAULT_SLOT_SEEDS.map((seed, i) => createSlot({
        ...seed,
        index: i + 1,
        id: idPrefix ? `slot-${idPrefix}-${i + 1}` : undefined,
    }));
}
function createDefaultProfile() {
    return {
        id: exports.DEFAULT_PROFILE_ID,
        name: 'Default',
        matchProcessNames: [],
        restrictToMatchedProcesses: false,
        isDefault: true,
        slots: createDefaultSlots('default'),
    };
}
function createDefaultState() {
    return {
        version: exports.WEAPON_SLOTS_SCHEMA_VERSION,
        // Off by default: the feature installs a global input listener, so it must
        // be an explicit opt-in rather than something that happens to the user.
        enabled: false,
        profiles: [createDefaultProfile()],
        activeProfileId: exports.DEFAULT_PROFILE_ID,
        autoSelectProfileByForegroundApp: false,
        unassignedSlotBehaviour: 'keep-current',
        // Off by default so a user can press their new slot keys inside crshhx and
        // immediately see the overlay respond — the fastest way to verify a bind.
        // Available as an explicit toggle for anyone who finds it distracting.
        suppressWhileStudioFocused: false,
    };
}
/** A ready-made Fortnite profile users can add in one click. */
function createFortniteProfile() {
    const seeds = [
        { name: 'Shotgun', code: 'Digit1', presetId: 'pro-11' },
        { name: 'AR', code: 'Digit2', presetId: 'pro-12' },
        { name: 'SMG', code: 'Digit3', presetId: 'pro-13' },
        { name: 'Sniper / Explosive', code: 'Digit4', presetId: 'pro-16' },
        { name: 'Utility / Heal', code: 'Digit5', presetId: 'pro-14' },
    ];
    return {
        id: newProfileId(),
        name: 'Fortnite',
        matchProcessNames: ['fortniteclient-win64-shipping.exe'],
        restrictToMatchedProcesses: false,
        isDefault: false,
        slots: seeds.map((s, i) => createSlot({ ...s, index: i + 1, id: `slot-fortnite-${i + 1}` })),
    };
}
/** A ready-made CS2 profile users can add in one click. */
function createCs2Profile() {
    const seeds = [
        { name: 'Rifle', code: 'Digit1', presetId: 'pro-30' },
        { name: 'Pistol', code: 'Digit2', presetId: 'pro-3' },
        { name: 'Sniper (AWP)', code: 'Digit3', presetId: 'pro-8' },
        { name: 'Heavy / Shotgun', code: 'Digit4', presetId: 'pro-11' },
        { name: 'Utility', code: 'Digit5', presetId: 'pro-7' },
    ];
    return {
        id: newProfileId(),
        name: 'CS2',
        matchProcessNames: ['cs2.exe'],
        restrictToMatchedProcesses: false,
        isDefault: false,
        slots: seeds.map((s, i) => createSlot({ ...s, index: i + 1, id: `slot-cs2-${i + 1}` })),
    };
}
