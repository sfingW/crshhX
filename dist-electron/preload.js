"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld('electronAPI', {
    updateCrosshair: (config) => {
        electron_1.ipcRenderer.send('update-crosshair', config);
    },
    updateAppSettings: (settings) => {
        electron_1.ipcRenderer.send('update-settings', settings);
    },
    toggleOverlay: () => {
        electron_1.ipcRenderer.send('toggle-overlay');
    },
    onCrosshairUpdated: (callback) => {
        electron_1.ipcRenderer.on('crosshair-updated', (_event, config) => callback(config));
    },
    onOverlayVisibilityChanged: (callback) => {
        electron_1.ipcRenderer.on('overlay-visibility-changed', (_event, visible) => callback(visible));
    },
    onFiringTrigger: (callback) => {
        electron_1.ipcRenderer.on('firing-trigger', () => callback());
    },
    onAdsChanged: (callback) => {
        electron_1.ipcRenderer.on('ads-changed', (_event, active) => callback(active));
    },
});
