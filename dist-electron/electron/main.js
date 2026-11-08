"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path = __importStar(require("path"));
const weaponSlotService_1 = require("./services/weaponSlotService");
/**
 * Location of the Vite renderer bundle.
 *
 * After compilation this file lives at `dist-electron/electron/main.js`, so the
 * renderer output at `<repo>/dist` is two levels up. Deriving it once here keeps
 * the production `loadFile` paths correct if the build layout ever moves again.
 */
const RENDERER_DIST = path.join(__dirname, '..', '..', 'dist');
let studioWindow = null;
let overlayWindow = null;
let weaponSlots = null;
let isOverlayVisible = true;
let currentConfig = null;
const isDev = process.env.NODE_ENV === 'development';
function send(channel, window, payload) {
    if (window && !window.isDestroyed() && !window.webContents.isDestroyed()) {
        window.webContents.send(channel, payload);
    }
}
function createStudioWindow() {
    studioWindow = new electron_1.BrowserWindow({
        width: 1320,
        height: 880,
        minWidth: 1024,
        minHeight: 720,
        backgroundColor: '#0a0d14',
        title: 'Crshhx Studio | Precision Crosshair Suite',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            backgroundThrottling: false,
        },
    });
    if (isDev) {
        studioWindow.loadURL('http://localhost:5173');
    }
    else {
        studioWindow.loadFile(path.join(RENDERER_DIST, 'index.html'));
    }
    // Weapon-slot switching needs to know when the user is inside crshhx itself.
    studioWindow.on('focus', () => weaponSlots?.setStudioFocused(true));
    studioWindow.on('blur', () => weaponSlots?.setStudioFocused(false));
    studioWindow.on('closed', () => {
        studioWindow = null;
        weaponSlots?.setStudioFocused(false);
        // If studio is closed, we can keep overlay running or close if user quits
        if (process.platform !== 'darwin') {
            electron_1.app.quit();
        }
    });
}
function createOverlayWindow() {
    const primaryDisplay = electron_1.screen.getPrimaryDisplay();
    const { width, height, x, y } = primaryDisplay.bounds;
    overlayWindow = new electron_1.BrowserWindow({
        x,
        y,
        width,
        height,
        transparent: true,
        frame: false,
        hasShadow: false,
        alwaysOnTop: true,
        focusable: false,
        skipTaskbar: true,
        resizable: false,
        enableLargerThanScreen: true,
        backgroundColor: '#00000000',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            backgroundThrottling: false,
        },
    });
    // Level 'screen-saver' guarantees top-most rendering over games
    overlayWindow.setAlwaysOnTop(true, 'screen-saver');
    overlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    // Completely pass through all mouse clicks to underlying game window
    overlayWindow.setIgnoreMouseEvents(true, { forward: true });
    if (isDev) {
        overlayWindow.loadURL('http://localhost:5173/overlay.html');
    }
    else {
        overlayWindow.loadFile(path.join(RENDERER_DIST, 'overlay.html'));
    }
    // A reload/refresh must not lose the crosshair the active slot selected.
    overlayWindow.webContents.on('did-finish-load', () => {
        if (currentConfig)
            send('crosshair-updated', overlayWindow, currentConfig);
    });
    overlayWindow.on('closed', () => {
        overlayWindow = null;
    });
}
function registerHotkeys(toggleKey = 'F10', cycleKey = 'F9') {
    electron_1.globalShortcut.unregisterAll();
    // Overlay visibility toggle
    try {
        electron_1.globalShortcut.register(toggleKey, () => {
            isOverlayVisible = !isOverlayVisible;
            if (overlayWindow) {
                if (isOverlayVisible) {
                    overlayWindow.showInactive();
                }
                else {
                    overlayWindow.hide();
                }
                overlayWindow.webContents.send('overlay-visibility-changed', isOverlayVisible);
            }
            if (studioWindow) {
                studioWindow.webContents.send('overlay-visibility-changed', isOverlayVisible);
            }
        });
    }
    catch (err) {
        console.warn(`Failed to register hotkey ${toggleKey}:`, err);
    }
    // Next preset cycle
    try {
        electron_1.globalShortcut.register(cycleKey, () => {
            if (studioWindow) {
                studioWindow.webContents.send('cycle-preset-triggered');
            }
        });
    }
    catch (err) {
        console.warn(`Failed to register hotkey ${cycleKey}:`, err);
    }
}
function createWeaponSlotService() {
    weaponSlots = new weaponSlotService_1.WeaponSlotSwitchService({
        getOverlayWindow: () => overlayWindow,
        getStudioWindow: () => studioWindow,
        isOverlayVisible: () => isOverlayVisible,
        sendToStudio: (channel, payload) => send(channel, studioWindow, payload),
        sendToOverlay: (channel, payload) => {
            // Remember what the overlay is showing so a reload of the overlay window
            // (or a display change) restores the slot-selected crosshair rather than
            // silently reverting to the designer's working copy.
            if (channel === 'crosshair-updated')
                currentConfig = payload;
            send(channel, overlayWindow, payload);
        },
    });
    weaponSlots.start();
}
electron_1.app.whenReady().then(() => {
    createOverlayWindow();
    createStudioWindow();
    registerHotkeys();
    createWeaponSlotService();
    electron_1.app.on('activate', () => {
        if (electron_1.BrowserWindow.getAllWindows().length === 0) {
            createOverlayWindow();
            createStudioWindow();
        }
    });
});
electron_1.app.on('will-quit', () => {
    // Remove the global input hook before the process goes away.
    weaponSlots?.dispose();
    weaponSlots = null;
    electron_1.globalShortcut.unregisterAll();
});
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        electron_1.app.quit();
    }
});
// IPC Communications
electron_1.ipcMain.on('update-crosshair', (_event, config) => {
    currentConfig = config;
    if (overlayWindow && !overlayWindow.isDestroyed()) {
        overlayWindow.webContents.send('crosshair-updated', config);
    }
});
electron_1.ipcMain.on('update-settings', (_event, settings) => {
    if (typeof settings.overlayVisible === 'boolean') {
        isOverlayVisible = settings.overlayVisible;
        if (overlayWindow && !overlayWindow.isDestroyed()) {
            if (isOverlayVisible) {
                overlayWindow.showInactive();
            }
            else {
                overlayWindow.hide();
            }
            overlayWindow.webContents.send('overlay-visibility-changed', isOverlayVisible);
        }
    }
    if (settings.toggleOverlayHotkey || settings.cyclePresetHotkey) {
        registerHotkeys(settings.toggleOverlayHotkey, settings.cyclePresetHotkey);
    }
});
electron_1.ipcMain.on('toggle-overlay', () => {
    isOverlayVisible = !isOverlayVisible;
    if (overlayWindow && !overlayWindow.isDestroyed()) {
        if (isOverlayVisible) {
            overlayWindow.showInactive();
        }
        else {
            overlayWindow.hide();
        }
        overlayWindow.webContents.send('overlay-visibility-changed', isOverlayVisible);
    }
});
/* ------------------------------------------------------------------ *
 * Weapon Slot Crosshairs IPC
 * ------------------------------------------------------------------ */
// The renderer owns persistence and the preset library; it pushes a resolved
// runtime snapshot whenever either changes. This is not a hot path — it happens
// on settings edits, never on a key press.
electron_1.ipcMain.on('weapon-slots:apply-runtime', (_event, runtime) => {
    if (!runtime || typeof runtime !== 'object')
        return;
    weaponSlots?.applyRuntime(runtime);
});
// While a key-capture field is listening, the press belongs to the recorder and
// must never trigger a switch.
electron_1.ipcMain.on('weapon-slots:set-recording', (_event, recording) => {
    weaponSlots?.setRecording(!!recording);
});
electron_1.ipcMain.on('weapon-slots:restore-active', (_event, info) => {
    if (info && typeof info === 'object')
        weaponSlots?.restoreActiveSlot(info);
});
electron_1.ipcMain.handle('weapon-slots:get-status', () => weaponSlots?.getStatus() ?? null);
