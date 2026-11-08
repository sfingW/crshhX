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
exports.TRAY_TOOLTIP = void 0;
exports.trayMenuTemplate = trayMenuTemplate;
exports.createTrayController = createTrayController;
exports.resolveTrayIconPath = resolveTrayIconPath;
const path = __importStar(require("path"));
exports.TRAY_TOOLTIP = 'crshhx Crosshair Studio';
/**
 * The menu, as data. Labels are exactly what the feature specifies: open,
 * enable/disable overlays (worded for the current state), quit.
 */
function trayMenuTemplate(deps) {
    return [
        { label: 'Open crshhx', click: deps.onOpen },
        {
            label: deps.isOverlayVisible() ? 'Disable overlays' : 'Enable overlays',
            click: deps.onToggleOverlays,
        },
        { type: 'separator' },
        { label: 'Quit crshhx', click: deps.onQuit },
    ];
}
/**
 * Creates the tray and its menu. Returns null when no tray could be created;
 * the application then simply runs without one (and close-to-tray degrades to
 * "hide with no way back except a second launch", which the single-instance
 * handler still restores).
 */
function createTrayController(deps) {
    const tray = deps.createTray();
    if (!tray)
        return null;
    tray.setToolTip(exports.TRAY_TOOLTIP);
    tray.setContextMenu(deps.buildMenu(trayMenuTemplate(deps)));
    // On Windows a left click fires 'click'; a double click must also reopen
    // rather than do nothing.
    tray.on('click', () => deps.onOpen());
    tray.on('double-click', () => deps.onOpen());
    let destroyed = false;
    return {
        sync() {
            if (destroyed || tray.isDestroyed())
                return;
            tray.setContextMenu(deps.buildMenu(trayMenuTemplate(deps)));
        },
        destroy() {
            if (destroyed)
                return;
            destroyed = true;
            if (!tray.isDestroyed())
                tray.destroy();
        },
    };
}
/**
 * Where the tray icon file lives at runtime.
 *
 * An icon embedded in the .exe cannot be read back by Electron, so the
 * packaging config copies `build/icon.ico` (and the .png fallback) into the
 * resources directory next to the executable — `extraResources` in
 * electron-builder.yml. This resolver mirrors exactly those two destinations;
 * `tests/backgroundMode.test.ts` pins the pair together.
 */
function resolveTrayIconPath(location) {
    const fileName = location.platform === 'win32' ? 'icon.ico' : 'icon.png';
    return location.isPackaged
        ? path.join(location.resourcesPath, fileName)
        : path.join(location.appPath, 'build', fileName);
}
