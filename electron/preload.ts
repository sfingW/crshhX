import { contextBridge, ipcRenderer } from 'electron';
import type { CrosshairConfig, AppSettings } from '../src/types/crosshair';
import type { WeaponSlotsRuntime } from '../src/lib/weaponSlots/types';
import type { WeaponSlotSwitchedPayload } from '../src/types/electron';

/** Registers a listener and returns a disposer, so React effects can clean up. */
function subscribe<T>(channel: string, callback: (payload: T) => void): () => void {
  const listener = (_event: Electron.IpcRendererEvent, payload: T) => callback(payload);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}

contextBridge.exposeInMainWorld('electronAPI', {
  updateCrosshair: (config: CrosshairConfig) => {
    ipcRenderer.send('update-crosshair', config);
  },

  updateAppSettings: (settings: AppSettings) => {
    ipcRenderer.send('update-settings', settings);
  },

  toggleOverlay: () => {
    ipcRenderer.send('toggle-overlay');
  },

  onCrosshairUpdated: (callback: (config: CrosshairConfig) => void) => {
    ipcRenderer.on('crosshair-updated', (_event, config) => callback(config));
  },

  onOverlayVisibilityChanged: (callback: (visible: boolean) => void) => {
    ipcRenderer.on('overlay-visibility-changed', (_event, visible) => callback(visible));
  },

  onFiringTrigger: (callback: () => void) => {
    ipcRenderer.on('firing-trigger', () => callback());
  },

  onAdsChanged: (callback: (active: boolean) => void) => {
    ipcRenderer.on('ads-changed', (_event, active) => callback(active));
  },

  /* ---------------- Weapon Slot Crosshairs ---------------- */

  /** Pushes the resolved runtime snapshot to the main process. */
  applyWeaponSlotsRuntime: (runtime: WeaponSlotsRuntime) => {
    ipcRenderer.send('weapon-slots:apply-runtime', runtime);
  },

  /** Tells the switcher that a key-capture field is (or is not) listening. */
  setWeaponSlotRecording: (recording: boolean) => {
    ipcRenderer.send('weapon-slots:set-recording', recording);
  },

  /** Restores the active-slot indicator after a renderer reload. */
  restoreWeaponSlotActive: (info: {
    slotId?: string | null;
    slotName?: string | null;
    slotIndex?: number | null;
    presetId?: string | null;
    profileId?: string | null;
    profileName?: string | null;
  }) => {
    ipcRenderer.send('weapon-slots:restore-active', info);
  },

  getWeaponSlotStatus: () => ipcRenderer.invoke('weapon-slots:get-status'),

  onWeaponSlotSwitched: (callback: (payload: WeaponSlotSwitchedPayload) => void) =>
    subscribe<WeaponSlotSwitchedPayload>('weapon-slot-switched', callback),

  onWeaponSlotStatus: (callback: (status: unknown) => void) =>
    subscribe<unknown>('weapon-slot-status', callback),
});
