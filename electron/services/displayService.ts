import type { DisplayInfo } from '../../src/types/electron';
import { AUTO_MONITOR, findTargetDisplay } from '../../src/lib/monitors';

/**
 * Display enumeration and change monitoring for the overlay window.
 *
 * Everything here is fed by Electron's `screen` module through the
 * structural `ScreenLike` interface rather than importing `electron` directly,
 * which keeps the whole service testable in plain Node (the suite has no real
 * Electron binary) and keeps exactly one place that knows how displays are
 * enumerated.
 *
 * Two rules the whole feature rests on:
 * - Nothing about monitors is ever hardcoded. Ids, bounds, scale factors and
 *   refresh rates are whatever the OS reports this moment.
 * - Resolution always falls back, never fails: a stale preference (unplugged
 *   monitor) behaves like "follow the primary display" until it reconnects,
 *   and the stored preference itself is never rewritten by the main process.
 */

export interface DisplayBoundsLike {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** The subset of Electron's `Display` this service reads. */
export interface DisplayLike {
  id: number;
  label?: string;
  bounds: DisplayBoundsLike;
  workArea?: DisplayBoundsLike;
  scaleFactor: number;
  /**
   * Electron reports the refresh rate in Hz under this name. Treated as
   * optional: a platform that does not report one yields "unknown" downstream
   * rather than an invented number.
   */
  displayFrequency?: number;
  rotation?: number;
  internal?: boolean;
}

export type DisplayEventName =
  | 'display-added'
  | 'display-removed'
  | 'display-metrics-changed';

/** The subset of Electron's `screen` module this service uses. */
export interface ScreenLike {
  getAllDisplays(): DisplayLike[];
  getPrimaryDisplay(): DisplayLike;
  on(event: DisplayEventName, listener: DisplayEventListener): void;
  removeListener(event: DisplayEventName, listener: DisplayEventListener): void;
}

export type DisplayEventListener = (event: unknown, display: DisplayLike) => void;

export { AUTO_MONITOR };

/** Converts one Electron display into its serializable description. */
export function describeDisplay(
  display: DisplayLike,
  index: number,
  primaryId: number,
): DisplayInfo {
  const info: DisplayInfo = {
    id: display.id,
    index,
    bounds: { ...display.bounds },
    scaleFactor: Number.isFinite(display.scaleFactor) && display.scaleFactor > 0
      ? display.scaleFactor
      : 1,
    // 0 means "not reported" everywhere downstream; the UI says so instead of
    // guessing a rate.
    refreshRate:
      typeof display.displayFrequency === 'number' && Number.isFinite(display.displayFrequency)
        ? display.displayFrequency
        : 0,
    isPrimary: display.id === primaryId,
  };
  // An empty label is no label: the UI shows "Display N" rather than a blank
  // name, and a name is never invented.
  if (typeof display.label === 'string' && display.label.length > 0) {
    info.label = display.label;
  }
  if (display.workArea) info.workArea = { ...display.workArea };
  if (typeof display.rotation === 'number') info.rotation = display.rotation;
  if (typeof display.internal === 'boolean') info.isInternal = display.internal;
  return info;
}

/** Snapshot of every connected display, in OS enumeration order. */
export function describeDisplays(screen: ScreenLike): DisplayInfo[] {
  const primary = screen.getPrimaryDisplay();
  return screen.getAllDisplays().map((display, index) =>
    describeDisplay(display, index, primary.id),
  );
}

export interface DisplayMonitor {
  /** Currently connected displays. */
  list(): DisplayInfo[];
  /**
   * The display the overlay should occupy for a preference, or null when the
   * OS reports no displays at all (callers must leave the overlay alone then).
   */
  resolve(preference: number): DisplayInfo | null;
  /** Detaches every Electron listener. Safe to call more than once. */
  dispose(): void;
}

/**
 * Subscribes to `display-added`, `display-removed` and
 * `display-metrics-changed` exactly once, and reports each event through
 * `onChange` so the caller can reposition the overlay and refresh the studio's
 * dropdown. Disposing removes all three listeners; a disposed monitor never
 * fires again, so hotplug churn cannot accumulate handlers.
 */
export function createDisplayMonitor(
  screen: ScreenLike,
  onChange: (reason: DisplayEventName) => void,
): DisplayMonitor {
  const EVENTS: readonly DisplayEventName[] = [
    'display-added',
    'display-removed',
    'display-metrics-changed',
  ];

  let disposed = false;
  const listeners = new Map<DisplayEventName, DisplayEventListener>();

  for (const event of EVENTS) {
    const listener: DisplayEventListener = () => {
      if (!disposed) onChange(event);
    };
    listeners.set(event, listener);
    screen.on(event, listener);
  }

  return {
    list(): DisplayInfo[] {
      return describeDisplays(screen);
    },
    resolve(preference: number): DisplayInfo | null {
      return findTargetDisplay(describeDisplays(screen), preference);
    },
    dispose(): void {
      if (disposed) return;
      disposed = true;
      for (const [event, listener] of listeners) {
        screen.removeListener(event, listener);
      }
      listeners.clear();
    },
  };
}
