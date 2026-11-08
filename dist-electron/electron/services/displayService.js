"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AUTO_MONITOR = void 0;
exports.describeDisplay = describeDisplay;
exports.describeDisplays = describeDisplays;
exports.createDisplayMonitor = createDisplayMonitor;
const monitors_1 = require("../../src/lib/monitors");
Object.defineProperty(exports, "AUTO_MONITOR", { enumerable: true, get: function () { return monitors_1.AUTO_MONITOR; } });
/** Converts one Electron display into its serializable description. */
function describeDisplay(display, index, primaryId) {
    const info = {
        id: display.id,
        index,
        bounds: { ...display.bounds },
        scaleFactor: Number.isFinite(display.scaleFactor) && display.scaleFactor > 0
            ? display.scaleFactor
            : 1,
        // 0 means "not reported" everywhere downstream; the UI says so instead of
        // guessing a rate.
        refreshRate: typeof display.displayFrequency === 'number' && Number.isFinite(display.displayFrequency)
            ? display.displayFrequency
            : 0,
        isPrimary: display.id === primaryId,
    };
    // An empty label is no label: the UI shows "Display N" rather than a blank
    // name, and a name is never invented.
    if (typeof display.label === 'string' && display.label.length > 0) {
        info.label = display.label;
    }
    if (display.workArea)
        info.workArea = { ...display.workArea };
    if (typeof display.rotation === 'number')
        info.rotation = display.rotation;
    if (typeof display.internal === 'boolean')
        info.isInternal = display.internal;
    return info;
}
/** Snapshot of every connected display, in OS enumeration order. */
function describeDisplays(screen) {
    const primary = screen.getPrimaryDisplay();
    return screen.getAllDisplays().map((display, index) => describeDisplay(display, index, primary.id));
}
/**
 * Subscribes to `display-added`, `display-removed` and
 * `display-metrics-changed` exactly once, and reports each event through
 * `onChange` so the caller can reposition the overlay and refresh the studio's
 * dropdown. Disposing removes all three listeners; a disposed monitor never
 * fires again, so hotplug churn cannot accumulate handlers.
 */
function createDisplayMonitor(screen, onChange) {
    const EVENTS = [
        'display-added',
        'display-removed',
        'display-metrics-changed',
    ];
    let disposed = false;
    const listeners = new Map();
    for (const event of EVENTS) {
        const listener = () => {
            if (!disposed)
                onChange(event);
        };
        listeners.set(event, listener);
        screen.on(event, listener);
    }
    return {
        list() {
            return describeDisplays(screen);
        },
        resolve(preference) {
            return (0, monitors_1.findTargetDisplay)(describeDisplays(screen), preference);
        },
        dispose() {
            if (disposed)
                return;
            disposed = true;
            for (const [event, listener] of listeners) {
                screen.removeListener(event, listener);
            }
            listeners.clear();
        },
    };
}
