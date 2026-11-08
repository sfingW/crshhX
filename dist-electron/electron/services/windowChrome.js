"use strict";
/**
 * Window chrome for the studio window.
 *
 * The studio is frameless: Windows draws no title bar, no menu bar and no
 * native window buttons. The renderer's own header (src/components/TopHeader.tsx)
 * is the single application header — it carries the drag region and the
 * minimise / maximise / close controls, which arrive here over IPC.
 *
 * Two rules shaped this module:
 *
 * 1. Nothing is duplicated. The default Electron menu (File / Edit / View /
 *    Window / Help) is replaced with a menu that exists purely for its
 *    keyboard accelerators — a frameless window never renders a menu bar, but
 *    removing the menu outright would silently break Ctrl+C / Ctrl+V / Ctrl+Z
 *    in every text field of the designer. Nothing useful is lost: quit lives
 *    in the tray, and window roles map onto the same IPC the header buttons
 *    use.
 *
 * 2. Close goes through BrowserWindow.close(), never app.quit() or
 *    webContents.destroy(). The studio window's own 'close' handler belongs to
 *    the background-mode service, which decides whether closing hides to the
 *    tray or exits. The custom X button must respect that decision exactly
 *    like the native one did.
 *
 * Everything is dependency-injected so the logic is testable without
 * Electron (see tests/windowChrome.test.ts).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.WINDOW_CONTROL_CHANNELS = void 0;
exports.registerWindowControls = registerWindowControls;
exports.attachMaximizeReporting = attachMaximizeReporting;
exports.buildStudioMenuTemplate = buildStudioMenuTemplate;
/** IPC channels shared by main, preload and the renderer. */
exports.WINDOW_CONTROL_CHANNELS = {
    minimize: 'window:minimize',
    toggleMaximize: 'window:toggle-maximize',
    close: 'window:close',
    /** Query: current maximised state, answered with a boolean. */
    isMaximized: 'window:is-maximized',
    /** Event: pushed to the renderer whenever the maximised state changes. */
    maximizeChanged: 'window:maximize-changed',
};
/**
 * Wires the header buttons. Registered once per process; the window itself is
 * resolved lazily so a closed-and-reopened studio keeps working.
 */
function registerWindowControls(deps) {
    deps.onControl(exports.WINDOW_CONTROL_CHANNELS.minimize, () => {
        const win = deps.getWindow();
        if (win && !win.isDestroyed())
            win.minimize();
    });
    deps.onControl(exports.WINDOW_CONTROL_CHANNELS.toggleMaximize, () => {
        const win = deps.getWindow();
        if (!win || win.isDestroyed())
            return;
        if (win.isMaximized()) {
            win.unmaximize();
        }
        else {
            win.maximize();
        }
    });
    // Deliberately win.close(): this raises the window's 'close' event, which
    // the background-mode service intercepts for close-to-tray. Calling
    // destroy() or app.quit() here would bypass the user's setting.
    deps.onControl(exports.WINDOW_CONTROL_CHANNELS.close, () => {
        const win = deps.getWindow();
        if (win && !win.isDestroyed())
            win.close();
    });
    deps.onQuery(exports.WINDOW_CONTROL_CHANNELS.isMaximized, () => {
        const win = deps.getWindow();
        return Boolean(win && !win.isDestroyed() && win.isMaximized());
    });
}
/**
 * Keeps the header's maximise/restore icon honest: every transition is pushed
 * to the renderer, and the caller seeds the renderer with the current state
 * when it (re)loads — a window maximised while hidden must not show the wrong
 * icon when restored from the tray.
 */
function attachMaximizeReporting(source, emit) {
    source.on('maximize', () => emit(true));
    source.on('unmaximize', () => emit(false));
}
function buildStudioMenuTemplate() {
    return [
        {
            label: 'Edit',
            submenu: [
                { role: 'undo' },
                { role: 'redo' },
                { type: 'separator' },
                { role: 'cut' },
                { role: 'copy' },
                { role: 'paste' },
                { role: 'selectAll' },
            ],
        },
        {
            label: 'View',
            submenu: [
                { role: 'reload' },
                { role: 'forceReload' },
                { role: 'toggleDevTools' },
                { type: 'separator' },
                { role: 'resetZoom' },
                { role: 'zoomIn' },
                { role: 'zoomOut' },
            ],
        },
        {
            label: 'Window',
            submenu: [{ role: 'minimize' }, { role: 'close' }],
        },
    ];
}
