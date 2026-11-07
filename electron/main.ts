import { app, BrowserWindow, ipcMain, globalShortcut, screen } from 'electron';
import * as path from 'path';

let studioWindow: BrowserWindow | null = null;
let overlayWindow: BrowserWindow | null = null;

let isOverlayVisible = true;
let currentConfig: any = null;
const isDev = process.env.NODE_ENV === 'development';

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
    studioWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  studioWindow.on('closed', () => {
    studioWindow = null;
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
    overlayWindow.loadFile(path.join(__dirname, '../dist/overlay.html'));
  }

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

app.whenReady().then(() => {
  createOverlayWindow();
  createStudioWindow();
  registerHotkeys();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createOverlayWindow();
      createStudioWindow();
    }
  });
});

app.on('will-quit', () => {
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
