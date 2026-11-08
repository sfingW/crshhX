import { CrosshairConfig, AppSettings } from '../types/crosshair';
import { DEFAULT_CONFIG, DEFAULT_APP_SETTINGS, PRO_PRESETS } from './defaultPresets';
import {
  WEAPON_SLOTS_RUNTIME_KEY,
  WEAPON_SLOTS_STORAGE_KEY,
  defaultRuntimeState,
  loadState,
  normalizeRuntimeState,
  serializeState,
  type MigrationReport,
  type WeaponSlotsRuntimeState,
} from './weaponSlots/migration';
import type { PresetIndex, WeaponSlotsState } from './weaponSlots/types';

const STORAGE_KEYS = {
  CURRENT_CONFIG: 'crshhx_current_config',
  CUSTOM_PRESETS: 'crshhx_custom_presets',
  APP_SETTINGS: 'crshhx_app_settings',
};

export function loadCurrentConfig(): CrosshairConfig {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.CURRENT_CONFIG);
    if (saved) {
      return { ...DEFAULT_CONFIG, ...JSON.parse(saved) };
    }
  } catch (err) {
    console.error('Failed to load current config from storage:', err);
  }
  return DEFAULT_CONFIG;
}

export function saveCurrentConfig(config: CrosshairConfig): void {
  try {
    localStorage.setItem(STORAGE_KEYS.CURRENT_CONFIG, JSON.stringify(config));
    // Also notify Electron if running in desktop app
    if (window.electronAPI) {
      window.electronAPI.updateCrosshair(config);
    }
  } catch (err) {
    console.error('Failed to save current config to storage:', err);
  }
}

export function loadCustomPresets(): CrosshairConfig[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.CUSTOM_PRESETS);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (err) {
    console.error('Failed to load custom presets from storage:', err);
  }
  return [];
}

export function saveCustomPresets(presets: CrosshairConfig[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.CUSTOM_PRESETS, JSON.stringify(presets));
  } catch (err) {
    console.error('Failed to save custom presets:', err);
  }
}

export function loadAppSettings(): AppSettings {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.APP_SETTINGS);
    if (saved) {
      return { ...DEFAULT_APP_SETTINGS, ...JSON.parse(saved) };
    }
  } catch (err) {
    console.error('Failed to load app settings:', err);
  }
  return DEFAULT_APP_SETTINGS;
}

export function saveAppSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(STORAGE_KEYS.APP_SETTINGS, JSON.stringify(settings));
    if (window.electronAPI) {
      window.electronAPI.updateAppSettings(settings);
    }
  } catch (err) {
    console.error('Failed to save app settings:', err);
  }
}

export function getAllPresets(): CrosshairConfig[] {
  const custom = loadCustomPresets();
  return [...PRO_PRESETS, ...custom];
}

/* ------------------------------------------------------------------ *
 * Weapon Slot Crosshairs persistence
 *
 * Slots live in their own storage keys. The pre-existing `crshhx_app_settings`
 * and `crshhx_custom_presets` blobs are never rewritten by this feature, so an
 * upgrading user keeps their overlay hotkeys, monitor choice and saved reticles
 * exactly as they were.
 * ------------------------------------------------------------------ */

export interface WeaponSlotsLoadResult {
  state: WeaponSlotsState;
  report: MigrationReport;
  prunedPresetIds: string[];
}

/** Loads, migrates and repairs the weapon-slot configuration. */
export function loadWeaponSlotsState(presetIndex: PresetIndex): WeaponSlotsLoadResult {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(WEAPON_SLOTS_STORAGE_KEY);
  } catch (err) {
    console.error('Failed to read weapon-slot settings:', err);
  }
  return loadState(raw, presetIndex);
}

export function saveWeaponSlotsState(state: WeaponSlotsState): void {
  try {
    localStorage.setItem(WEAPON_SLOTS_STORAGE_KEY, serializeState(state));
  } catch (err) {
    console.error('Failed to save weapon-slot settings:', err);
  }
}

export function loadWeaponSlotsRuntimeState(): WeaponSlotsRuntimeState {
  try {
    const raw = localStorage.getItem(WEAPON_SLOTS_RUNTIME_KEY);
    return normalizeRuntimeState(raw ? JSON.parse(raw) : null);
  } catch (err) {
    console.error('Failed to read weapon-slot runtime state:', err);
    return defaultRuntimeState();
  }
}

export function saveWeaponSlotsRuntimeState(runtime: WeaponSlotsRuntimeState): void {
  try {
    localStorage.setItem(WEAPON_SLOTS_RUNTIME_KEY, JSON.stringify(runtime));
  } catch (err) {
    console.error('Failed to save weapon-slot runtime state:', err);
  }
}

/**
 * Debounced writer for the "which slot is live" record.
 *
 * Switching itself never touches disk — the overlay is updated straight over
 * IPC from the main process. This only remembers the selection so a restart can
 * restore the indicator, and it coalesces rapid slot changes into one write.
 */
export function createDebouncedRuntimeSaver(delayMs = 600): {
  save: (runtime: WeaponSlotsRuntimeState) => void;
  flush: () => void;
  cancel: () => void;
} {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pending: WeaponSlotsRuntimeState | null = null;

  const flush = () => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    if (pending) {
      saveWeaponSlotsRuntimeState(pending);
      pending = null;
    }
  };

  return {
    save: (runtime) => {
      pending = runtime;
      if (timer !== null) clearTimeout(timer);
      timer = setTimeout(flush, delayMs);
    },
    flush,
    cancel: () => {
      if (timer !== null) clearTimeout(timer);
      timer = null;
      pending = null;
    },
  };
}
