"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AUTO_MONITOR = void 0;
exports.isAutoMonitor = isAutoMonitor;
exports.findTargetDisplay = findTargetDisplay;
exports.effectiveSelection = effectiveSelection;
exports.isPreferenceDisconnected = isPreferenceDisconnected;
exports.formatDisplayOption = formatDisplayOption;
exports.formatAutoOption = formatAutoOption;
/**
 * Target-monitor selection, shared by the studio UI and the main process.
 *
 * The preference is a single number so it can ride the existing `AppSettings`
 * blob (and the settings file transfer) without a schema of its own:
 * `AUTO_MONITOR` means "follow the OS primary display"; any other value is an
 * Electron display id. Ids are chosen by the operating system, are not
 * sequential and can disappear when a monitor is unplugged — which is why every
 * resolution path here falls back to the primary display instead of failing.
 *
 * This module is deliberately free of DOM and Electron imports: the renderer
 * bundles it, and `electron/services/displayService.ts` compiles it into the
 * main process. One source of truth for both.
 */
/** Preference value meaning "follow the Windows primary display". */
exports.AUTO_MONITOR = -1;
function isAutoMonitor(preference) {
    return !Number.isFinite(preference) || preference === exports.AUTO_MONITOR;
}
/**
 * The display the overlay should occupy for a given preference.
 *
 * - auto (or a non-finite value) → the primary display;
 * - a connected display id → that display;
 * - an id that is no longer connected → the primary display, safely.
 *
 * Returns null only when the OS reports no displays at all; callers must then
 * leave the overlay where it is rather than guess.
 */
function findTargetDisplay(displays, preference) {
    if (displays.length === 0)
        return null;
    // If no display claims to be primary (it happens on some arrangements),
    // the first enumerated display is the only sane stand-in.
    const primary = displays.find((d) => d.isPrimary) ?? displays[0];
    if (isAutoMonitor(preference))
        return primary;
    return displays.find((d) => d.id === preference) ?? primary;
}
/**
 * What the dropdown should show as selected: the stored preference when that
 * display is still connected, otherwise the automatic entry. The stored
 * preference itself is never rewritten here — an unplugged monitor that comes
 * back must be re-selected automatically, so persistence and effective
 * selection are kept apart.
 */
function effectiveSelection(displays, preference) {
    if (isAutoMonitor(preference))
        return exports.AUTO_MONITOR;
    return displays.some((d) => d.id === preference) ? preference : exports.AUTO_MONITOR;
}
/** Whether the stored preference points at a display that is not connected. */
function isPreferenceDisconnected(displays, preference) {
    return (displays.length > 0 &&
        !isAutoMonitor(preference) &&
        !displays.some((d) => d.id === preference));
}
/**
 * Dropdown label for one display, e.g.
 * `Display 1 · 2560×1440 · 144 Hz · 150% · Primary`.
 *
 * Every segment comes from what the OS reported — the label is included only
 * when the platform provides one, and an unreported refresh rate (0) is shown
 * as unknown rather than invented.
 */
function formatDisplayOption(display) {
    const name = display.label
        ? `Display ${display.index + 1} — ${display.label}`
        : `Display ${display.index + 1}`;
    const resolution = `${display.bounds.width}×${display.bounds.height}`;
    const refresh = display.refreshRate > 0 ? `${display.refreshRate} Hz` : 'refresh n/a';
    const scale = `${Math.round(display.scaleFactor * 100)}%`;
    const parts = [name, resolution, refresh, scale];
    if (display.isPrimary)
        parts.push('Primary');
    return parts.join(' · ');
}
/** Dropdown label for the automatic entry. */
function formatAutoOption() {
    return 'Automatic — follow the primary display';
}
