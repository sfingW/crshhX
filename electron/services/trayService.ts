import * as path from 'path';

/**
 * The Windows system tray icon and its context menu.
 *
 * Like every service here, the Electron pieces (`Tray`, `Menu`, `nativeImage`)
 * arrive through injected dependencies instead of module imports, so the menu
 * contents, the click wiring and the disposal order are testable without a
 * real Electron binary.
 *
 * The tray exists so closing the studio window can hide it instead of quitting:
 * reopen, overlay on/off and an *explicit* Quit live in this menu, and Quit is
 * the only path that tears the application down (see backgroundMode.ts).
 */

/** Menu item shape this service builds; a structural subset of Electron's. */
export interface TrayMenuTemplateItem {
  label?: string;
  type?: 'separator';
  click?: () => void;
}

/** The subset of Electron's `Tray` this service uses. */
export interface TrayLike {
  setToolTip(tooltip: string): void;
  setContextMenu(menu: unknown): void;
  on(event: 'click' | 'double-click', listener: () => void): void;
  destroy(): void;
  isDestroyed(): boolean;
}

export interface TrayControllerDeps {
  /**
   * Creates the tray object, or returns null when no usable icon exists —
   * a missing icon must cost the tray, never the application.
   */
  createTray(): TrayLike | null;
  /** Electron's `Menu.buildFromTemplate`. */
  buildMenu(template: TrayMenuTemplateItem[]): unknown;
  onOpen(): void;
  onToggleOverlays(): void;
  onQuit(): void;
  isOverlayVisible(): boolean;
}

export interface TrayController {
  /** Rebuilds the menu so the overlay entry reflects current visibility. */
  sync(): void;
  /** Destroys the tray icon. Idempotent; safe during shutdown races. */
  destroy(): void;
}

export const TRAY_TOOLTIP = 'crshhx Crosshair Studio';

/**
 * The menu, as data. Labels are exactly what the feature specifies: open,
 * enable/disable overlays (worded for the current state), quit.
 */
export function trayMenuTemplate(
  deps: Pick<TrayControllerDeps, 'onOpen' | 'onToggleOverlays' | 'onQuit' | 'isOverlayVisible'>,
): TrayMenuTemplateItem[] {
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
export function createTrayController(deps: TrayControllerDeps): TrayController | null {
  const tray = deps.createTray();
  if (!tray) return null;

  tray.setToolTip(TRAY_TOOLTIP);
  tray.setContextMenu(deps.buildMenu(trayMenuTemplate(deps)));
  // On Windows a left click fires 'click'; a double click must also reopen
  // rather than do nothing.
  tray.on('click', () => deps.onOpen());
  tray.on('double-click', () => deps.onOpen());

  let destroyed = false;

  return {
    sync(): void {
      if (destroyed || tray.isDestroyed()) return;
      tray.setContextMenu(deps.buildMenu(trayMenuTemplate(deps)));
    },
    destroy(): void {
      if (destroyed) return;
      destroyed = true;
      if (!tray.isDestroyed()) tray.destroy();
    },
  };
}

/* ------------------------------------------------------------------ *
 * Tray icon location
 * ------------------------------------------------------------------ */

export interface TrayIconLocation {
  appPath: string;
  isPackaged: boolean;
  resourcesPath: string;
  platform: string;
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
export function resolveTrayIconPath(location: TrayIconLocation): string {
  const fileName = location.platform === 'win32' ? 'icon.ico' : 'icon.png';
  return location.isPackaged
    ? path.join(location.resourcesPath, fileName)
    : path.join(location.appPath, 'build', fileName);
}
