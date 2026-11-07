import { contextBridge, ipcRenderer } from 'electron';
import type { CrosshairConfig, AppSettings } from '../src/types/crosshair';

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
});
