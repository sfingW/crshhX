"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
/** Registers a listener and returns a disposer, so React effects can clean up. */
function subscribe(channel, callback) {
    const listener = (_event, payload) => callback(payload);
    electron_1.ipcRenderer.on(channel, listener);
    return () => electron_1.ipcRenderer.removeListener(channel, listener);
}
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
    /* ---------------- Weapon Slot Crosshairs ---------------- */
    /** Pushes the resolved runtime snapshot to the main process. */
    applyWeaponSlotsRuntime: (runtime) => {
        electron_1.ipcRenderer.send('weapon-slots:apply-runtime', runtime);
    },
    /** Tells the switcher that a key-capture field is (or is not) listening. */
    setWeaponSlotRecording: (recording) => {
        electron_1.ipcRenderer.send('weapon-slots:set-recording', recording);
    },
    /** Restores the active-slot indicator after a renderer reload. */
    restoreWeaponSlotActive: (info) => {
        electron_1.ipcRenderer.send('weapon-slots:restore-active', info);
    },
    getWeaponSlotStatus: () => electron_1.ipcRenderer.invoke('weapon-slots:get-status'),
    onWeaponSlotSwitched: (callback) => subscribe('weapon-slot-switched', callback),
    onWeaponSlotStatus: (callback) => subscribe('weapon-slot-status', callback),
});
