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
let studioWindow = null;
let overlayWindow = null;
let isOverlayVisible = true;
let currentConfig = null;
const isDev = process.env.NODE_ENV === 'development';
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
        studioWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }
    studioWindow.on('closed', () => {
        studioWindow = null;
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
        overlayWindow.loadFile(path.join(__dirname, '../dist/overlay.html'));
    }
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
electron_1.app.whenReady().then(() => {
    createOverlayWindow();
    createStudioWindow();
    registerHotkeys();
    electron_1.app.on('activate', () => {
        if (electron_1.BrowserWindow.getAllWindows().length === 0) {
            createOverlayWindow();
            createStudioWindow();
        }
    });
});
electron_1.app.on('will-quit', () => {
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
