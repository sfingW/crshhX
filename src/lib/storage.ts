import { CrosshairConfig, AppSettings } from '../types/crosshair';
import { DEFAULT_CONFIG, DEFAULT_APP_SETTINGS, PRO_PRESETS } from './defaultPresets';

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
