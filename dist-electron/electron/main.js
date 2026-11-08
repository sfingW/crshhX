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
const url_1 = require("url");
const fs_1 = require("fs");
const weaponSlotService_1 = require("./services/weaponSlotService");
const displayService_1 = require("./services/displayService");
const backgroundMode_1 = require("./services/backgroundMode");
const trayService_1 = require("./services/trayService");
const windowChrome_1 = require("./services/windowChrome");
const rendererAssets_1 = require("./services/rendererAssets");
const contentSecurity_1 = require("./services/contentSecurity");
const storageMigration_1 = require("./services/storageMigration");
/*
 * Scheme privileges must be declared before `app` is ready — Electron silently
 * ignores the call afterwards, and the failure looks like a blank window rather
 * than an error. See services/rendererAssets.ts for why the production renderer
 * is served from `app://crshhx` instead of `file://`.
 */
electron_1.protocol.registerSchemesAsPrivileged([
    { scheme: rendererAssets_1.APP_SCHEME, privileges: { ...rendererAssets_1.APP_SCHEME_PRIVILEGES } },
]);
/*
 * User data lives under the roaming application-data directory, keyed by app
 * name — never under the install directory and never derived from the executable
 * path. This is what makes a portable exe keep its crosshair library after being
 * moved to another folder or drive, and what stops an update to a new install
 * path from orphaning it. `tests/buildLayout.test.ts` pins the intent.
 */
electron_1.app.setPath('userData', path.join(electron_1.app.getPath('appData'), electron_1.app.getName()));
/*
 * One instance, one overlay. A second launch — a desktop shortcut while the
 * app lives in the tray, or a double-clicked portable exe — must restore the
 * running instance's window instead of starting a competing process with a
 * second overlay window and a second set of global input hooks.
 */
const gotSingleInstanceLock = electron_1.app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
    electron_1.app.quit();
}
else {
    electron_1.app.on('second-instance', () => {
        // Restoring the existing window is the whole point of the lock. Before
        // the app is ready there is nothing to restore yet — the window is on its
        // way anyway.
        backgroundMode?.handleSecondInstance();
    });
}
/** Location of the Vite renderer bundle. Derived, never hardcoded — see
 *  `resolveRendererDist`, which handles the packaged (asar) and dev layouts. */
const RENDERER_DIST = (0, rendererAssets_1.resolveRendererDist)({
    appPath: electron_1.app.getAppPath(),
    isPackaged: electron_1.app.isPackaged,
    mainDir: __dirname,
});
let studioWindow = null;
let overlayWindow = null;
let weaponSlots = null;
let displayMonitor = null;
let trayController = null;
let backgroundMode = null;
/**
 * Target-monitor preference: AUTO_MONITOR (follow the primary display) or an
 * Electron display id. The renderer pushes the persisted value at startup;
 * until then the overlay follows the primary display, which is also the safe
 * fallback for any stale id (see services/displayService.ts).
 */
let monitorPreference = displayService_1.AUTO_MONITOR;
/** "Keep overlays running when the window is closed". Default enabled; the
 *  renderer pushes the persisted value at startup. */
let keepOverlaysOnClose = true;
let isOverlayVisible = true;
let currentConfig = null;
const isDev = process.env.NODE_ENV === 'development';
const DEV_SERVER_URL = 'http://localhost:5173';
/** How long one storage probe may take before the migration gives up on it. A
 *  slow probe must delay startup by a bounded amount, never hang it. */
const MIGRATION_TIMEOUT_MS = 4000;
function send(channel, window, payload) {
    if (window && !window.isDestroyed() && !window.webContents.isDestroyed()) {
        window.webContents.send(channel, payload);
    }
}
function createStudioWindow() {
    // Idempotent: reopening from the tray or a second instance must never create
    // a second studio window (see showStudioWindow).
    if (studioWindow && !studioWindow.isDestroyed())
        return;
    studioWindow = new electron_1.BrowserWindow({
        width: 1320,
        height: 880,
        minWidth: 1024,
        minHeight: 720,
        backgroundColor: '#0a0d14',
        title: 'Crshhx Studio | Precision Crosshair Suite',
        // Frameless: no native title bar, no native menu bar, no native window
        // buttons. The renderer's TopHeader is the ONE application header — it is
        // the drag region and carries the minimise/maximise/close controls, wired
        // through services/windowChrome.ts. Resizing keeps working: Windows gives
        // frameless windows their invisible resize borders.
        frame: false,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            // Deliberately left at Chromium's default. The studio has no work that
            // must continue while the user is in a game, so letting an unfocused
            // studio throttle its timers and rendering is free idle CPU. The overlay
            // is the opposite case and keeps throttling disabled, with a comment
            // saying why.
        },
    });
    if (isDev) {
        studioWindow.loadURL(DEV_SERVER_URL);
    }
    else {
        studioWindow.loadURL(rendererAssets_1.STUDIO_URL);
    }
    // Weapon-slot switching needs to know when the user is inside crshhx itself.
    studioWindow.on('focus', () => weaponSlots?.setStudioFocused(true));
    studioWindow.on('blur', () => weaponSlots?.setStudioFocused(false));
    // The frameless header's maximise/restore icon must follow the real window
    // state — including changes made outside the header (double-clicking the
    // drag region, Win+Up/Down, the taskbar). The renderer seeds itself at
    // startup through the WINDOW_CONTROL_CHANNELS.isMaximized query.
    (0, windowChrome_1.attachMaximizeReporting)(studioWindow, (maximized) => {
        send(windowChrome_1.WINDOW_CONTROL_CHANNELS.maximizeChanged, studioWindow, maximized);
    });
    // The X button hides the studio to the tray while background operation is
    // enabled — the overlay, the global input hooks and weapon-slot switching
    // all keep running. With the setting off, or an explicit quit already
    // underway, the close proceeds and the application exits as it always did.
    studioWindow.on('close', (event) => {
        backgroundMode?.handleStudioClose(event);
    });
    studioWindow.on('closed', () => {
        studioWindow = null;
        weaponSlots?.setStudioFocused(false);
        // Background operation disabled: closing the studio exits the app. With
        // it enabled, the app lives on in the tray and can be reopened from there
        // or by a second launch.
        if (!keepOverlaysOnClose && process.platform !== 'darwin') {
            electron_1.app.quit();
        }
    });
}
/** The display the overlay should occupy right now, per the stored preference. */
function currentTargetDisplay() {
    return displayMonitor ? displayMonitor.resolve(monitorPreference) : null;
}
function createOverlayWindow() {
    // Idempotent: there is exactly one overlay window for the process lifetime.
    if (overlayWindow && !overlayWindow.isDestroyed())
        return;
    // The selected display's own bounds — never offsets computed from the
    // primary — so monitors at negative coordinates (left of / above the
    // primary) and mixed-DPI arrangements are positioned by the OS-reported
    // geometry of the display itself.
    const { width, height, x, y } = currentTargetDisplay()?.bounds ?? electron_1.screen.getPrimaryDisplay().bounds;
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
            // Required. The overlay is unfocused whenever a game is in front, and a
            // throttled overlay would update its crosshair at roughly one frame per
            // second. This is the one window that must never be throttled.
            backgroundThrottling: false,
        },
    });
    // Level 'screen-saver' guarantees top-most rendering over games
    overlayWindow.setAlwaysOnTop(true, 'screen-saver');
    overlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    // Completely pass through all mouse clicks to underlying game window
    overlayWindow.setIgnoreMouseEvents(true, { forward: true });
    if (isDev) {
        overlayWindow.loadURL(`${DEV_SERVER_URL}/overlay.html`);
    }
    else {
        overlayWindow.loadURL(rendererAssets_1.OVERLAY_URL);
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
/**
 * Moves and resizes the overlay so it covers exactly the selected display.
 * Called on creation, on a preference change, and on every display event
 * (added / removed / metrics changed), so a resolution or scaling change
 * repositions the overlay immediately and a disconnected selection falls
 * back to the primary display inside `resolve`.
 */
function positionOverlayWindow() {
    if (!overlayWindow || overlayWindow.isDestroyed())
        return;
    const target = currentTargetDisplay();
    // No display information at all: leave the overlay where it is rather than
    // guess a position.
    if (!target)
        return;
    overlayWindow.setBounds({
        x: target.bounds.x,
        y: target.bounds.y,
        width: target.bounds.width,
        height: target.bounds.height,
    });
}
/**
 * The single owner of overlay visibility. The F10 hotkey, the toggle IPC, the
 * settings push and the tray menu item all come through here, so the overlay,
 * the studio UI and the tray menu can never disagree about the state.
 */
function setOverlayVisible(visible) {
    isOverlayVisible = visible;
    if (overlayWindow && !overlayWindow.isDestroyed()) {
        if (visible) {
            overlayWindow.showInactive();
        }
        else {
            overlayWindow.hide();
        }
        overlayWindow.webContents.send('overlay-visibility-changed', visible);
    }
    send('overlay-visibility-changed', studioWindow, visible);
    trayController?.sync();
}
/** Restores the studio window, creating it only if it is truly gone. */
function showStudioWindow() {
    if (studioWindow && !studioWindow.isDestroyed()) {
        if (!studioWindow.isVisible())
            studioWindow.show();
        studioWindow.focus();
        return;
    }
    createStudioWindow();
}
/**
 * The system tray icon: reopen the studio, toggle overlays, quit. A missing
 * icon file costs the tray, never the application — createTrayController
 * tolerates a null tray (see services/trayService.ts).
 */
function createTray() {
    const iconPath = (0, trayService_1.resolveTrayIconPath)({
        appPath: electron_1.app.getAppPath(),
        isPackaged: electron_1.app.isPackaged,
        resourcesPath: process.resourcesPath,
        platform: process.platform,
    });
    trayController = (0, trayService_1.createTrayController)({
        createTray: () => {
            try {
                const icon = electron_1.nativeImage.createFromPath(iconPath);
                if (icon.isEmpty()) {
                    console.warn(`[crshhx] Tray icon not found at ${iconPath}; running without a tray.`);
                    return null;
                }
                return new electron_1.Tray(icon);
            }
            catch (err) {
                console.warn('[crshhx] Could not create the tray icon:', err);
                return null;
            }
        },
        buildMenu: (template) => electron_1.Menu.buildFromTemplate(template),
        onOpen: () => showStudioWindow(),
        onToggleOverlays: () => setOverlayVisible(!isOverlayVisible),
        onQuit: () => backgroundMode?.quitFromTray(),
        isOverlayVisible: () => isOverlayVisible,
    });
}
function registerHotkeys(toggleKey = 'F10', cycleKey = 'F9') {
    electron_1.globalShortcut.unregisterAll();
    // Overlay visibility toggle
    try {
        electron_1.globalShortcut.register(toggleKey, () => {
            setOverlayVisible(!isOverlayVisible);
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
/* ------------------------------------------------------------------ *
 * Production renderer: served from app://crshhx
 * ------------------------------------------------------------------ */
/**
 * Answers `app://crshhx/...` from the bundled renderer output.
 *
 * Every refusal path is explicit. `resolveAssetPath` rejects other schemes,
 * other hosts, NUL bytes and anything that resolves outside the bundle, so this
 * handler cannot be talked into serving arbitrary files from disk — which is the
 * real risk when an application becomes its own web server.
 */
function registerRendererProtocol() {
    electron_1.protocol.handle(rendererAssets_1.APP_SCHEME, async (request) => {
        const url = new URL(request.url);
        if ((0, storageMigration_1.isStorageProbePath)(url.pathname)) {
            return new Response((0, storageMigration_1.legacyProbeHtml)(), {
                status: 200,
                headers: { 'Content-Type': 'text/html; charset=utf-8' },
            });
        }
        const resolved = (0, rendererAssets_1.resolveAssetPath)(request.url, RENDERER_DIST);
        if (!resolved.ok) {
            console.warn(`[crshhx] Refused ${request.url}: ${resolved.reason}`);
            return new Response(resolved.reason, {
                status: resolved.status,
                headers: { 'Content-Type': 'text/plain; charset=utf-8' },
            });
        }
        if (!(0, fs_1.existsSync)(resolved.filePath)) {
            return new Response('Not found in the renderer bundle.', {
                status: 404,
                headers: { 'Content-Type': 'text/plain; charset=utf-8' },
            });
        }
        try {
            // The documented way to hand a file to the network stack; it streams, and
            // it reads through the asar archive transparently.
            const response = await electron_1.net.fetch((0, url_1.pathToFileURL)(resolved.filePath).toString());
            // net.fetch sets its own content type; ours is derived from the extension
            // so a `.woff2` or a `.map` is never mislabelled.
            const headers = new Headers(response.headers);
            headers.set('Content-Type', resolved.contentType);
            return new Response(response.body, { status: response.status, headers });
        }
        catch (err) {
            // Fall back to a direct read. `fs` is patched for asar too, so this works
            // in the same situations and does not depend on the network stack.
            console.warn(`[crshhx] net.fetch failed for ${resolved.filePath}, reading directly:`, err);
            try {
                const body = (0, fs_1.readFileSync)(resolved.filePath);
                return new Response(new Uint8Array(body), {
                    status: 200,
                    headers: { 'Content-Type': resolved.contentType },
                });
            }
            catch (readErr) {
                console.error(`[crshhx] Could not read ${resolved.filePath}:`, readErr);
                return new Response('Could not read the requested asset.', {
                    status: 500,
                    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
                });
            }
        }
    });
}
/** Applies the Content Security Policy to every response, in both modes. */
function registerContentSecurityPolicy() {
    const policy = (0, contentSecurity_1.contentSecurityPolicy)({ isDev, devServerUrl: DEV_SERVER_URL });
    electron_1.session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
        const headers = { ...details.responseHeaders };
        // Replace rather than append: a duplicate CSP header is enforced as the
        // intersection of both, which is a confusing way to fail.
        for (const key of Object.keys(headers)) {
            if (key.toLowerCase() === contentSecurity_1.CSP_HEADER.toLowerCase())
                delete headers[key];
        }
        headers[contentSecurity_1.CSP_HEADER] = [policy];
        callback({ responseHeaders: headers });
    });
}
/* ------------------------------------------------------------------ *
 * Storage migration: file:// origin -> app://crshhx
 * ------------------------------------------------------------------ */
/**
 * One hidden window, reused across origins.
 *
 * It exists only to touch `localStorage`. Navigating the same window from the
 * legacy `file://` origin to `app://crshhx` is what makes a single window enough:
 * each origin's storage is read while the document is on that origin.
 *
 * It gets a **preload** rather than an injected script, because a string handed to
 * `executeJavaScript` is evaluated inside the document, and the production policy
 * is `script-src 'self'` with no `'unsafe-eval'` — see `electron/probePreload.ts`
 * for why that made the migration's success untestable. It stays sandboxed and
 * without node integration: the preload needs nothing more, and neither document
 * it loads runs any code of its own.
 */
function createProbeWindow() {
    return new electron_1.BrowserWindow({
        show: false,
        webPreferences: {
            preload: path.join(__dirname, 'probePreload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true,
        },
    });
}
/**
 * Channel the probe preload listens on. The same literal is declared in that file;
 * it cannot be imported in either direction, and `tests/buildLayout.test.ts` pins
 * the two together.
 */
const PROBE_CHANNEL = 'crshhx-storage-probe';
let probeRequests = 0;
/**
 * Asks the probe document to read or write storage, and settles the answer.
 *
 * The reply channel is unique per request, so an answer can never be matched to
 * the wrong question, and the listener is removed whatever happens: a probe that
 * times out must not leave a listener behind that a later probe could answer.
 */
function probeRequest(window, request) {
    const replyChannel = `${PROBE_CHANNEL}:reply-${++probeRequests}`;
    return (0, storageMigration_1.settleProbe)(new Promise((resolve, reject) => {
        electron_1.ipcMain.once(replyChannel, (_event, value) => resolve(value));
        try {
            window.webContents.send(PROBE_CHANNEL, { ...request, replyChannel });
        }
        catch (err) {
            reject(err);
        }
    }), MIGRATION_TIMEOUT_MS).finally(() => {
        electron_1.ipcMain.removeAllListeners(replyChannel);
    });
}
/**
 * Carries saved data across the origin change.
 *
 * Runs before any application window is created, and never throws: a migration
 * that fails must degrade to "start clean", not to "crash on launch". It also
 * never deletes the source, so a failed migration is recoverable by hand.
 *
 * Whether the attempt *finished* — and so whether the marker is written and the
 * next launch can skip all of this — is decided in exactly one place,
 * `decideMigration`, so "both probes answered and there was nothing to move"
 * cannot be mistaken for "a probe failed". Confusing those two is what made every
 * launch repeat this function.
 */
async function migrateStorageOrigin() {
    const markerPath = path.join(electron_1.app.getPath('userData'), storageMigration_1.MIGRATION_MARKER_NAME);
    if (!(0, storageMigration_1.shouldRunMigration)({ isDev, markerExists: (0, fs_1.existsSync)(markerPath) })) {
        return isDev
            ? 'Development mode: storage origin unchanged, nothing to migrate.'
            : 'Storage migration already completed on an earlier launch; skipped.';
    }
    const probePath = path.join(electron_1.app.getPath('temp'), `crshhx-migration-${process.pid}.html`);
    let probe = null;
    try {
        probe = createProbeWindow();
        // 1. Read the legacy file:// origin. localStorage there is shared across
        //    file:// pages, so any file on disk will do; it is written to temp
        //    rather than shipped, so it is not reachable through app://.
        (0, fs_1.writeFileSync)(probePath, (0, storageMigration_1.legacyProbeHtml)(), 'utf8');
        await probe.webContents.loadURL((0, url_1.pathToFileURL)(probePath).toString());
        const source = await probeRequest(probe, { op: 'dump', keys: storageMigration_1.MIGRATED_STORAGE_KEYS });
        // 2. Read the destination origin, so nothing newer is overwritten. This
        //    document is served from memory by the app:// handler and runs no
        //    application code, which is what keeps the studio's first-run defaults
        //    out of the keys this migration is about to fill.
        await probe.webContents.loadURL(`${rendererAssets_1.APP_ORIGIN}${storageMigration_1.STORAGE_PROBE_PATH}`);
        const destination = await probeRequest(probe, { op: 'dump', keys: storageMigration_1.MIGRATED_STORAGE_KEYS });
        // This runs at most once per install, so the two origins it heard from are
        // worth a line: on a real machine it is the evidence that the app:// document
        // and its preload worked at all.
        console.log(`[crshhx] storage probe answered from ${String((0, storageMigration_1.probeOrigin)(source))} and ${String((0, storageMigration_1.probeOrigin)(destination))}`);
        const plan = (0, storageMigration_1.planMigration)((0, storageMigration_1.probeData)(source), (0, storageMigration_1.probeData)(destination));
        // 3. Write, only if there is something to move. The window is already on the
        //    destination origin, and the preload re-checks each key before storing it,
        //    because the destination could have changed since it was read.
        const write = (0, storageMigration_1.isMigrationEmpty)(plan)
            ? undefined
            : await probeRequest(probe, { op: 'write', entries: plan.toCopy });
        const decision = (0, storageMigration_1.decideMigration)({ source, destination, plan, write });
        if (decision.writeMarker) {
            (0, fs_1.writeFileSync)(markerPath, (0, storageMigration_1.markerContents)(decision.report, Date.now()), 'utf8');
        }
        return decision.report;
    }
    catch (err) {
        // Deliberately not fatal, and deliberately no marker: the next launch
        // retries instead of silently skipping a migration that never finished.
        console.error('[crshhx] Storage migration failed; existing data was left untouched.', err);
        return `Migration did not complete (${String(err?.message ?? err)}). Nothing under the previous origin was modified.`;
    }
    finally {
        if (probe && !probe.isDestroyed())
            probe.destroy();
        try {
            if ((0, fs_1.existsSync)(probePath))
                (0, fs_1.unlinkSync)(probePath);
        }
        catch {
            /* a leftover temp file is harmless */
        }
    }
}
electron_1.app.whenReady().then(async () => {
    // A second instance that lost the lock has already called app.quit(); it
    // must not go on to create windows.
    if (!gotSingleInstanceLock)
        return;
    registerRendererProtocol();
    registerContentSecurityPolicy();
    // Must precede window creation: the studio persists first-run defaults, which
    // would otherwise claim the keys the migration needs to fill.
    console.log(`[crshhx] ${await migrateStorageOrigin()}`);
    // Must precede window creation: the overlay is positioned from the selected
    // display, and hotplug/metrics events start being observed from here.
    displayMonitor = (0, displayService_1.createDisplayMonitor)(electron_1.screen, (reason) => {
        // A resolution or scaling change moves the overlay immediately; a
        // connect/disconnect also refreshes the studio's dropdown. A disconnected
        // selection falls back to the primary display inside resolve().
        positionOverlayWindow();
        send('displays-changed', studioWindow, displayMonitor?.list() ?? []);
        console.log(`[crshhx] Displays changed (${reason}); overlay on display ${currentTargetDisplay()?.id ?? 'none'}`);
    });
    // Close-to-tray lifecycle. All deps are lazy getters, so this can be built
    // before the tray and windows it references exist.
    backgroundMode = (0, backgroundMode_1.createBackgroundMode)({
        keepOverlaysOnClose: () => keepOverlaysOnClose,
        getStudioWindow: () => studioWindow,
        getOverlayWindow: () => overlayWindow,
        destroyTray: () => {
            trayController?.destroy();
            trayController = null;
        },
        trayActive: () => trayController !== null,
        disposeInputHooks: () => {
            weaponSlots?.dispose();
            weaponSlots = null;
        },
        unregisterShortcuts: () => electron_1.globalShortcut.unregisterAll(),
        quitApp: () => electron_1.app.quit(),
        showStudio: () => showStudioWindow(),
    });
    // Frameless chrome. The application menu exists only for its keyboard
    // accelerators (clipboard, undo, zoom, DevTools) — a frameless window never
    // shows a menu bar, and dropping the menu entirely would break Ctrl+C/V/Z
    // in every text field. The window-control IPC is registered once; handlers
    // resolve the studio window lazily, so tray reopens keep working.
    electron_1.Menu.setApplicationMenu(electron_1.Menu.buildFromTemplate((0, windowChrome_1.buildStudioMenuTemplate)()));
    (0, windowChrome_1.registerWindowControls)({
        onControl: (channel, handler) => {
            electron_1.ipcMain.on(channel, handler);
        },
        onQuery: (channel, handler) => {
            electron_1.ipcMain.handle(channel, handler);
        },
        getWindow: () => studioWindow,
    });
    createOverlayWindow();
    positionOverlayWindow();
    createStudioWindow();
    createTray();
    registerHotkeys();
    createWeaponSlotService();
    electron_1.app.on('activate', () => {
        if (electron_1.BrowserWindow.getAllWindows().length === 0) {
            createOverlayWindow();
            createStudioWindow();
        }
    });
});
electron_1.app.on('before-quit', () => {
    // A real exit is starting (from any source): closes must stop being
    // intercepted, or the quit would hide the window and hang the exit.
    backgroundMode?.handleBeforeQuit();
});
electron_1.app.on('will-quit', () => {
    // Remove the global input hook before the process goes away, destroy the
    // tray icon, and detach the display listeners. All idempotent — the tray
    // Quit path has usually done this already.
    weaponSlots?.dispose();
    weaponSlots = null;
    electron_1.globalShortcut.unregisterAll();
    trayController?.destroy();
    trayController = null;
    displayMonitor?.dispose();
    displayMonitor = null;
});
electron_1.app.on('window-all-closed', () => {
    // Hidden windows are not closed windows; this fires only when everything
    // really went away. Background operation with a live tray is the one case
    // where that must not exit the application.
    if (backgroundMode) {
        backgroundMode.handleWindowAllClosed();
    }
    else if (process.platform !== 'darwin') {
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
        setOverlayVisible(settings.overlayVisible);
    }
    // Target monitor: applied the moment the dropdown changes, so switching
    // displays moves the overlay immediately. The preference itself is persisted
    // by the renderer; the main process only holds it for this run.
    if (typeof settings.selectedMonitor === 'number' &&
        Number.isFinite(settings.selectedMonitor)) {
        const changed = settings.selectedMonitor !== monitorPreference;
        monitorPreference = settings.selectedMonitor;
        if (changed)
            positionOverlayWindow();
    }
    // Close-to-tray behaviour; consumed by the studio close handler.
    if (typeof settings.keepOverlaysOnClose === 'boolean') {
        keepOverlaysOnClose = settings.keepOverlaysOnClose;
    }
    if (settings.toggleOverlayHotkey || settings.cyclePresetHotkey) {
        registerHotkeys(settings.toggleOverlayHotkey, settings.cyclePresetHotkey);
    }
});
electron_1.ipcMain.on('toggle-overlay', () => {
    setOverlayVisible(!isOverlayVisible);
});
/* ------------------------------------------------------------------ *
 * Target Monitor IPC
 * ------------------------------------------------------------------ */
/** Enumerated live from Electron's display APIs on every call — never cached,
 *  never hardcoded. */
electron_1.ipcMain.handle('displays:list', () => {
    const displays = displayMonitor?.list() ?? [];
    const target = displayMonitor?.resolve(monitorPreference) ?? null;
    return { displays, preference: monitorPreference, targetId: target ? target.id : null };
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
