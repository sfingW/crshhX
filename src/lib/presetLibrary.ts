import { PRO_PRESETS } from './defaultPresets';
import { COMPLETE_CROSSHAIR_VAULT } from './crosshairCollection';
import { PRO_CROSSHAIRS } from './proCrosshairs';
import { buildPresetIndex, projectIndex } from './weaponSlots/presetIndex';
import { reservedBindingsFromSettings } from './weaponSlots/migration';
import type { AppSettings, CrosshairConfig } from '../types/crosshair';
import type {
  InputTransportCapabilities,
  PresetIndex,
  WeaponSlotsRuntime,
  WeaponSlotsState,
} from './weaponSlots/types';

/**
 * Bridge between the crosshair library crshhx already has and the Weapon Slot
 * Crosshairs feature.
 *
 * There is deliberately **no second preset store** here: this module reads the
 * same generated vault, the same built-in pro presets and the same
 * localStorage-backed custom presets the rest of the app uses, and produces an
 * id-keyed index. Slots only ever hold an id, so renaming, reordering or
 * deleting library entries can never silently re-point a slot.
 */

export function getPresetIndex(customPresets: readonly CrosshairConfig[] = []): PresetIndex {
  return buildPresetIndex([COMPLETE_CROSSHAIR_VAULT, PRO_PRESETS, PRO_CROSSHAIRS, customPresets]);
}

/**
 * Builds the payload handed to the Electron main process.
 *
 * Only the presets actually referenced by a slot are included, so the IPC
 * message stays small even though the vault holds 250+ entries. The main
 * process can then perform a switch with no renderer round-trip and no disk
 * access — which is what keeps the key-press path fast.
 */
export function buildWeaponSlotsRuntime(
  state: WeaponSlotsState,
  presetIndex: PresetIndex,
  appSettings: AppSettings,
  capabilities: InputTransportCapabilities,
): WeaponSlotsRuntime {
  return {
    state,
    presetIndex: projectIndex(presetIndex, state),
    reservedBindings: reservedBindingsFromSettings(appSettings),
    capabilities,
  };
}

/** Capability set used before the main process reports the real transport. */
export const UNKNOWN_TRANSPORT_CAPABILITIES: InputTransportCapabilities = {
  name: 'Detecting…',
  passiveGlobalKeyboard: false,
  worksWhenUnfocused: false,
  mouseButtons: false,
  mouseWheel: false,
};
