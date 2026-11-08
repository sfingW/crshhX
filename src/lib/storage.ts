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
import { parseColorInput, pushSwatch } from './colorUtils';

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
      const parsed: unknown = JSON.parse(saved);
      if (!Array.isArray(parsed)) {
        console.warn('Ignoring custom presets: stored value is not a list.');
        return [];
      }
      return parsed.filter(
        (entry): entry is CrosshairConfig => !!entry && typeof entry === 'object',
      );
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

/* ------------------------------------------------------------------ *
 * Colour swatches
 *
 * Recent and saved colours are a single small versioned record in their own key.
 * They are cosmetic state, so a corrupt or missing blob simply yields empty
 * lists rather than an error — but they must still be validated, because they
 * are rendered straight into `style` attributes and into `<input type="color">`.
 * ------------------------------------------------------------------ */

const SWATCH_KEY = 'crshhx_color_swatches';
const SWATCH_VERSION = 1;
const MAX_RECENT = 18;
const MAX_SAVED = 36;

export interface SwatchStore {
  version: number;
  recent: string[];
  saved: string[];
}

function emptySwatches(): SwatchStore {
  return { version: SWATCH_VERSION, recent: [], saved: [] };
}

function sanitizeList(raw: unknown, max: number): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const entry of raw) {
    const hex = parseColorInput(typeof entry === 'string' ? entry : '');
    if (!hex || out.includes(hex)) continue;
    out.push(hex);
    if (out.length >= max) break;
  }
  return out;
}

export function loadSwatches(): SwatchStore {
  try {
    const raw = localStorage.getItem(SWATCH_KEY);
    if (!raw) return emptySwatches();
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return emptySwatches();
    const record = parsed as Record<string, unknown>;
    return {
      version: SWATCH_VERSION,
      recent: sanitizeList(record.recent, MAX_RECENT),
      saved: sanitizeList(record.saved, MAX_SAVED),
    };
  } catch (err) {
    console.error('Failed to read colour swatches:', err);
    return emptySwatches();
  }
}

export function saveSwatches(store: SwatchStore): void {
  try {
    localStorage.setItem(
      SWATCH_KEY,
      JSON.stringify({
        version: SWATCH_VERSION,
        recent: sanitizeList(store.recent, MAX_RECENT),
        saved: sanitizeList(store.saved, MAX_SAVED),
      }),
    );
  } catch (err) {
    console.error('Failed to save colour swatches:', err);
  }
}

/** Records a colour as recently used. Idempotent and length-capped. */
export function rememberRecentColor(hex: string): SwatchStore {
  const store = loadSwatches();
  const next: SwatchStore = { ...store, recent: pushSwatch(store.recent, hex, MAX_RECENT) };
  saveSwatches(next);
  return next;
}

export function saveSwatchColor(hex: string): SwatchStore {
  const store = loadSwatches();
  const next: SwatchStore = { ...store, saved: pushSwatch(store.saved, hex, MAX_SAVED) };
  saveSwatches(next);
  return next;
}

export function removeSwatchColor(hex: string): SwatchStore {
  const store = loadSwatches();
  const next: SwatchStore = {
    ...store,
    saved: store.saved.filter((c) => c !== hex),
  };
  saveSwatches(next);
  return next;
}

/* ------------------------------------------------------------------ *
 * Favourite crosshairs
 *
 * Favourites used to live in component state, seeded from three hard-coded ids,
 * so the star on a card meant nothing after a reload. They are persisted here by
 * preset id — ids are stable across renames, names are not.
 * ------------------------------------------------------------------ */

const FAVORITES_KEY = 'crshhx_favorites';

/** Shown on a first run so the Favourites tab is not empty. Never re-applied
 *  once the user has made a choice, including choosing to have none. */
const SEEDED_FAVORITES = ['pro-1', 'pro-2', 'pro-11'];

export function loadFavoriteIds(): string[] {
  const raw = localStorage.getItem(FAVORITES_KEY);
  if (raw === null) return [...SEEDED_FAVORITES];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const ids = parsed.filter((entry): entry is string => typeof entry === 'string');
    return [...new Set(ids)];
  } catch (err) {
    console.error('Failed to read favourite crosshairs:', err);
    return [];
  }
}

export function saveFavoriteIds(ids: readonly string[]): void {
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify([...new Set(ids)]));
  } catch (err) {
    console.error('Failed to save favourite crosshairs:', err);
  }
}

/** Adds or removes one id and returns the resulting list. */
export function toggleFavoriteId(id: string): string[] {
  const current = loadFavoriteIds();
  const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
  saveFavoriteIds(next);
  return next;
}
