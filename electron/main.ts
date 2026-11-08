import { app, BrowserWindow, ipcMain, globalShortcut, screen } from 'electron';
import * as path from 'path';
import { WeaponSlotSwitchService } from './services/weaponSlotService';
import type { WeaponSlotsRuntime } from '../src/lib/weaponSlots/types';

/**
 * Location of the Vite renderer bundle.
 *
 * After compilation this file lives at `dist-electron/electron/main.js`, so the
 * renderer output at `<repo>/dist` is two levels up. Deriving it once here keeps
 * the production `loadFile` paths correct if the build layout ever moves again.
 */
const RENDERER_DIST = path.join(__dirname, '..', '..', 'dist');

let studioWindow: BrowserWindow | null = null;
let overlayWindow: BrowserWindow | null = null;
let weaponSlots: WeaponSlotSwitchService | null = null;

let isOverlayVisible = true;
let currentConfig: any = null;
const isDev = process.env.NODE_ENV === 'development';

function send(channel: string, window: BrowserWindow | null, payload?: unknown) {
  if (window && !window.isDestroyed() && !window.webContents.isDestroyed()) {
    window.webContents.send(channel, payload);
  }
}

function createStudioWindow() {
  studioWindow = new BrowserWindow({
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
  } else {
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
      app.quit();
    }
  });
}

function createOverlayWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height, x, y } = primaryDisplay.bounds;

  overlayWindow = new BrowserWindow({
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
  } else {
    overlayWindow.loadFile(path.join(RENDERER_DIST, 'overlay.html'));
  }

  // A reload/refresh must not lose the crosshair the active slot selected.
  overlayWindow.webContents.on('did-finish-load', () => {
    if (currentConfig) send('crosshair-updated', overlayWindow, currentConfig);
  });

  overlayWindow.on('closed', () => {
    overlayWindow = null;
  });
}

function registerHotkeys(toggleKey = 'F10', cycleKey = 'F9') {
  globalShortcut.unregisterAll();

  // Overlay visibility toggle
  try {
    globalShortcut.register(toggleKey, () => {
      isOverlayVisible = !isOverlayVisible;
      if (overlayWindow) {
        if (isOverlayVisible) {
          overlayWindow.showInactive();
        } else {
          overlayWindow.hide();
        }
        overlayWindow.webContents.send('overlay-visibility-changed', isOverlayVisible);
      }
      if (studioWindow) {
        studioWindow.webContents.send('overlay-visibility-changed', isOverlayVisible);
      }
    });
  } catch (err) {
    console.warn(`Failed to register hotkey ${toggleKey}:`, err);
  }

  // Next preset cycle
  try {
    globalShortcut.register(cycleKey, () => {
      if (studioWindow) {
        studioWindow.webContents.send('cycle-preset-triggered');
      }
    });
  } catch (err) {
    console.warn(`Failed to register hotkey ${cycleKey}:`, err);
  }
}

function createWeaponSlotService() {
  weaponSlots = new WeaponSlotSwitchService({
    getOverlayWindow: () => overlayWindow,
    getStudioWindow: () => studioWindow,
    isOverlayVisible: () => isOverlayVisible,
    sendToStudio: (channel, payload) => send(channel, studioWindow, payload),
    sendToOverlay: (channel, payload) => {
      // Remember what the overlay is showing so a reload of the overlay window
      // (or a display change) restores the slot-selected crosshair rather than
      // silently reverting to the designer's working copy.
      if (channel === 'crosshair-updated') currentConfig = payload;
      send(channel, overlayWindow, payload);
    },
  });
  weaponSlots.start();
}

app.whenReady().then(() => {
  createOverlayWindow();
  createStudioWindow();
  registerHotkeys();
  createWeaponSlotService();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createOverlayWindow();
      createStudioWindow();
    }
  });
});

app.on('will-quit', () => {
  // Remove the global input hook before the process goes away.
  weaponSlots?.dispose();
  weaponSlots = null;
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Communications
ipcMain.on('update-crosshair', (_event, config) => {
  currentConfig = config;
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.webContents.send('crosshair-updated', config);
  }
});

ipcMain.on('update-settings', (_event, settings) => {
  if (typeof settings.overlayVisible === 'boolean') {
    isOverlayVisible = settings.overlayVisible;
    if (overlayWindow && !overlayWindow.isDestroyed()) {
      if (isOverlayVisible) {
        overlayWindow.showInactive();
      } else {
        overlayWindow.hide();
      }
      overlayWindow.webContents.send('overlay-visibility-changed', isOverlayVisible);
    }
  }

  if (settings.toggleOverlayHotkey || settings.cyclePresetHotkey) {
    registerHotkeys(settings.toggleOverlayHotkey, settings.cyclePresetHotkey);
  }
});

ipcMain.on('toggle-overlay', () => {
  isOverlayVisible = !isOverlayVisible;
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    if (isOverlayVisible) {
      overlayWindow.showInactive();
    } else {
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
ipcMain.on('weapon-slots:apply-runtime', (_event, runtime: WeaponSlotsRuntime) => {
  if (!runtime || typeof runtime !== 'object') return;
  weaponSlots?.applyRuntime(runtime);
});

// While a key-capture field is listening, the press belongs to the recorder and
// must never trigger a switch.
ipcMain.on('weapon-slots:set-recording', (_event, recording: boolean) => {
  weaponSlots?.setRecording(!!recording);
});

ipcMain.on('weapon-slots:restore-active', (_event, info) => {
  if (info && typeof info === 'object') weaponSlots?.restoreActiveSlot(info);
});

ipcMain.handle('weapon-slots:get-status', () => weaponSlots?.getStatus() ?? null);
