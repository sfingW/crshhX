import { makeBinding } from './keys';
import type { WeaponSlot, WeaponSlotProfile, WeaponSlotsState } from './types';

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

export const WEAPON_SLOTS_SCHEMA_VERSION = 1;

export const DEFAULT_PROFILE_ID = 'profile-default';

let slotSequence = 0;

/** Deterministic-within-run unique slot id. */
export function newSlotId(prefix = 'slot'): string {
  slotSequence += 1;
  return `${prefix}-${Date.now().toString(36)}-${slotSequence}`;
}

export function newProfileId(): string {
  return `profile-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
}

/** Reset the id counter — used by tests to keep ids predictable. */
export function __resetIdSequence(): void {
  slotSequence = 0;
}

export interface DefaultSlotSeed {
  name: string;
  /** Canonical key code; `null` leaves the slot unbound. */
  code: string | null;
  /** Library preset id; `null` leaves the slot unassigned. */
  presetId: string | null;
}

export const DEFAULT_SLOT_SEEDS: DefaultSlotSeed[] = [
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
export function createSlot(
  seed: Partial<DefaultSlotSeed> & { index: number; id?: string },
): WeaponSlot {
  return {
    id: seed.id ?? newSlotId(),
    index: seed.index,
    name: seed.name?.trim() || `Slot ${seed.index}`,
    binding: seed.code ? makeBinding(seed.code) : null,
    presetId: seed.presetId ?? null,
    enabled: true,
  };
}

export function createDefaultSlots(idPrefix?: string): WeaponSlot[] {
  return DEFAULT_SLOT_SEEDS.map((seed, i) =>
    createSlot({
      ...seed,
      index: i + 1,
      id: idPrefix ? `slot-${idPrefix}-${i + 1}` : undefined,
    }),
  );
}

export function createDefaultProfile(): WeaponSlotProfile {
  return {
    id: DEFAULT_PROFILE_ID,
    name: 'Default',
    matchProcessNames: [],
    restrictToMatchedProcesses: false,
    isDefault: true,
    slots: createDefaultSlots('default'),
  };
}

export function createDefaultState(): WeaponSlotsState {
  return {
    version: WEAPON_SLOTS_SCHEMA_VERSION,
    // Off by default: the feature installs a global input listener, so it must
    // be an explicit opt-in rather than something that happens to the user.
    enabled: false,
    profiles: [createDefaultProfile()],
    activeProfileId: DEFAULT_PROFILE_ID,
    autoSelectProfileByForegroundApp: false,
    unassignedSlotBehaviour: 'keep-current',
    // Off by default so a user can press their new slot keys inside crshhx and
    // immediately see the overlay respond — the fastest way to verify a bind.
    // Available as an explicit toggle for anyone who finds it distracting.
    suppressWhileStudioFocused: false,
  };
}

/** A ready-made Fortnite profile users can add in one click. */
export function createFortniteProfile(): WeaponSlotProfile {
  const seeds: DefaultSlotSeed[] = [
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
export function createCs2Profile(): WeaponSlotProfile {
  const seeds: DefaultSlotSeed[] = [
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
