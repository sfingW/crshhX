"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.createBackgroundMode = createBackgroundMode;
function createBackgroundMode(deps) {
    let quitting = false;
    return {
        isQuitting: () => quitting,
        markQuitting: () => {
            quitting = true;
        },
        handleBeforeQuit: () => {
            quitting = true;
        },
        handleStudioClose(event) {
            // While quitting, or with background operation switched off, the close
            // proceeds and the application exits normally — the pre-existing
            // behaviour, kept for exactly those two cases.
            if (quitting || !deps.keepOverlaysOnClose())
                return false;
            event.preventDefault();
            const studio = deps.getStudioWindow();
            if (studio && !studio.isDestroyed())
                studio.hide();
            return true;
        },
        handleWindowAllClosed() {
            // Hidden windows are not closed windows, so this fires only when
            // everything really went away. Running in the background with a live
            // tray is the one case where that must not exit the application.
            if (!quitting && deps.keepOverlaysOnClose() && deps.trayActive())
                return;
            if (process.platform !== 'darwin')
                deps.quitApp();
        },
        handleSecondInstance() {
            deps.showStudio();
        },
        quitFromTray() {
            if (quitting)
                return; // an exit is already underway; do not race it
            quitting = true;
            // Fixed order, per the feature contract: mark quitting, destroy the
            // tray, dispose the global input listeners, close the overlays, then
            // terminate. Hooks are gone before any window closes, so no keystroke
            // can be processed half-torn-down.
            deps.destroyTray();
            deps.disposeInputHooks();
            deps.unregisterShortcuts();
            const overlay = deps.getOverlayWindow();
            if (overlay && !overlay.isDestroyed())
                overlay.close();
            const studio = deps.getStudioWindow();
            if (studio && !studio.isDestroyed())
                studio.close();
            deps.quitApp();
        },
    };
}
