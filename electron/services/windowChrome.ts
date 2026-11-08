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

/** IPC channels shared by main, preload and the renderer. */
export const WINDOW_CONTROL_CHANNELS = {
  minimize: 'window:minimize',
  toggleMaximize: 'window:toggle-maximize',
  close: 'window:close',
  /** Query: current maximised state, answered with a boolean. */
  isMaximized: 'window:is-maximized',
  /** Event: pushed to the renderer whenever the maximised state changes. */
  maximizeChanged: 'window:maximize-changed',
} as const;

/** The subset of BrowserWindow the controls touch. */
export interface WindowChromeTarget {
  minimize(): void;
  maximize(): void;
  unmaximize(): void;
  isMaximized(): boolean;
  close(): void;
  isDestroyed(): boolean;
}

export interface WindowControlDeps {
  /** ipcMain.on registration for fire-and-forget control messages. */
  onControl: (channel: string, handler: () => void) => void;
  /** ipcMain.handle registration for the maximised-state query. */
  onQuery: (channel: string, handler: () => boolean) => void;
  /** Lazy getter: the studio window may be recreated (tray reopen). */
  getWindow: () => WindowChromeTarget | null;
}

/**
 * Wires the header buttons. Registered once per process; the window itself is
 * resolved lazily so a closed-and-reopened studio keeps working.
 */
export function registerWindowControls(deps: WindowControlDeps): void {
  deps.onControl(WINDOW_CONTROL_CHANNELS.minimize, () => {
    const win = deps.getWindow();
    if (win && !win.isDestroyed()) win.minimize();
  });

  deps.onControl(WINDOW_CONTROL_CHANNELS.toggleMaximize, () => {
    const win = deps.getWindow();
    if (!win || win.isDestroyed()) return;
    if (win.isMaximized()) {
      win.unmaximize();
    } else {
      win.maximize();
    }
  });

  // Deliberately win.close(): this raises the window's 'close' event, which
  // the background-mode service intercepts for close-to-tray. Calling
  // destroy() or app.quit() here would bypass the user's setting.
  deps.onControl(WINDOW_CONTROL_CHANNELS.close, () => {
    const win = deps.getWindow();
    if (win && !win.isDestroyed()) win.close();
  });

  deps.onQuery(WINDOW_CONTROL_CHANNELS.isMaximized, () => {
    const win = deps.getWindow();
    return Boolean(win && !win.isDestroyed() && win.isMaximized());
  });
}

/** Source of the two maximised-state window events. */
export interface MaximizeEventSource {
  on(event: 'maximize' | 'unmaximize', listener: () => void): unknown;
  isMaximized(): boolean;
}

/**
 * Keeps the header's maximise/restore icon honest: every transition is pushed
 * to the renderer, and the caller seeds the renderer with the current state
 * when it (re)loads — a window maximised while hidden must not show the wrong
 * icon when restored from the tray.
 */
export function attachMaximizeReporting(
  source: MaximizeEventSource,
  emit: (maximized: boolean) => void,
): void {
  source.on('maximize', () => emit(true));
  source.on('unmaximize', () => emit(false));
}

/**
 * The studio application menu: accelerators only, never displayed.
 *
 * Typed structurally rather than with Electron's MenuItemConstructorOptions so
 * this module stays import-free at runtime (the sandboxed test environment
 * cannot load `electron`, even for types it would erase).
 */
export interface MenuTemplateEntry {
  label: string;
  submenu: ReadonlyArray<{ role?: string; type?: 'separator' }>;
}

export function buildStudioMenuTemplate(): MenuTemplateEntry[] {
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
