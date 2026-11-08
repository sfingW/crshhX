/**
 * Close-to-tray lifecycle: what "the X button" means, and what quitting costs.
 *
 * The studio window closing is no longer the application exiting. With
 * background operation enabled (the default), a close hides the window while
 * the overlay, the global input hooks and weapon-slot switching keep running;
 * the only real exit is the explicit Quit path below, which tears everything
 * down in a fixed order.
 *
 * Everything Electron-specific arrives through `BackgroundModeDeps`, so the
 * whole state machine — hide vs exit, second instances, quit ordering — is
 * testable in plain Node.
 */

/** The subset of `BrowserWindow` this service touches. */
export interface LifecycleWindowLike {
  isDestroyed(): boolean;
  hide(): void;
  show(): void;
  focus(): void;
  close(): void;
}

/** The subset of Electron's close `Event` this service touches. */
export interface CloseEventLike {
  preventDefault(): void;
}

export interface BackgroundModeDeps {
  /** Current value of the "keep overlays running when closed" setting. */
  keepOverlaysOnClose(): boolean;
  getStudioWindow(): LifecycleWindowLike | null;
  getOverlayWindow(): LifecycleWindowLike | null;
  /** Destroys the tray icon (idempotent). */
  destroyTray(): void;
  /** Whether a tray icon currently exists. */
  trayActive(): boolean;
  /** Disposes the global input hooks (uiohook transport and friends). */
  disposeInputHooks(): void;
  /** Unregisters global shortcuts (accelerator transport). */
  unregisterShortcuts(): void;
  /** `app.quit()`. */
  quitApp(): void;
  /** Restores the studio window, creating it only if it is really gone. */
  showStudio(): void;
}

export interface BackgroundMode {
  isQuitting(): boolean;
  markQuitting(): void;
  /** `before-quit`: a real exit is starting, so closes must stop being intercepted. */
  handleBeforeQuit(): void;
  /**
   * Studio `close` event. Returns true when the close was converted into a
   * hide; false when it was allowed to proceed to an exit.
   */
  handleStudioClose(event: CloseEventLike): boolean;
  /** `window-all-closed`: exit unless deliberately running in the background. */
  handleWindowAllClosed(): void;
  /** A second launch happened; the existing window comes back. */
  handleSecondInstance(): void;
  /** The tray's explicit Quit. The only full teardown path. */
  quitFromTray(): void;
}

export function createBackgroundMode(deps: BackgroundModeDeps): BackgroundMode {
  let quitting = false;

  return {
    isQuitting: () => quitting,

    markQuitting: () => {
      quitting = true;
    },

    handleBeforeQuit: () => {
      quitting = true;
    },

    handleStudioClose(event: CloseEventLike): boolean {
      // While quitting, or with background operation switched off, the close
      // proceeds and the application exits normally — the pre-existing
      // behaviour, kept for exactly those two cases.
      if (quitting || !deps.keepOverlaysOnClose()) return false;
      event.preventDefault();
      const studio = deps.getStudioWindow();
      if (studio && !studio.isDestroyed()) studio.hide();
      return true;
    },

    handleWindowAllClosed(): void {
      // Hidden windows are not closed windows, so this fires only when
      // everything really went away. Running in the background with a live
      // tray is the one case where that must not exit the application.
      if (!quitting && deps.keepOverlaysOnClose() && deps.trayActive()) return;
      if (process.platform !== 'darwin') deps.quitApp();
    },

    handleSecondInstance(): void {
      deps.showStudio();
    },

    quitFromTray(): void {
      if (quitting) return; // an exit is already underway; do not race it
      quitting = true;
      // Fixed order, per the feature contract: mark quitting, destroy the
      // tray, dispose the global input listeners, close the overlays, then
      // terminate. Hooks are gone before any window closes, so no keystroke
      // can be processed half-torn-down.
      deps.destroyTray();
      deps.disposeInputHooks();
      deps.unregisterShortcuts();
      const overlay = deps.getOverlayWindow();
      if (overlay && !overlay.isDestroyed()) overlay.close();
      const studio = deps.getStudioWindow();
      if (studio && !studio.isDestroyed()) studio.close();
      deps.quitApp();
    },
  };
}
