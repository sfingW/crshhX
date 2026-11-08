import { describe, expect, it, vi } from 'vitest';

import {
  AUTO_MONITOR,
  createDisplayMonitor,
  describeDisplay,
  describeDisplays,
} from '../electron/services/displayService';
import type {
  DisplayEventName,
  DisplayEventListener,
  DisplayLike,
  ScreenLike,
} from '../electron/services/displayService';
import {
  effectiveSelection,
  findTargetDisplay,
  formatAutoOption,
  formatDisplayOption,
  isAutoMonitor,
  isPreferenceDisconnected,
} from '../src/lib/monitors';
import { DEFAULT_APP_SETTINGS } from '../src/lib/defaultPresets';

/**
 * Target Monitor: display enumeration, preference resolution and hotplug.
 *
 * The service never sees a real Electron `screen` — it receives the structural
 * `ScreenLike` interface, so the fake below is a complete stand-in: displays,
 * a primary, and an event registry the tests fire by hand.
 */

function fakeDisplay(overrides: Partial<DisplayLike> = {}): DisplayLike {
  return {
    id: 1,
    bounds: { x: 0, y: 0, width: 2560, height: 1440 },
    scaleFactor: 1,
    displayFrequency: 144,
    ...overrides,
  };
}

class FakeScreen implements ScreenLike {
  private listeners = new Map<DisplayEventName, Set<DisplayEventListener>>();

  constructor(
    public displays: DisplayLike[],
    public primary: DisplayLike,
  ) {}

  getAllDisplays(): DisplayLike[] {
    return this.displays;
  }

  getPrimaryDisplay(): DisplayLike {
    return this.primary;
  }

  on(event: DisplayEventName, listener: DisplayEventListener): void {
    const set = this.listeners.get(event) ?? new Set();
    set.add(listener);
    this.listeners.set(event, set);
  }

  removeListener(event: DisplayEventName, listener: DisplayEventListener): void {
    this.listeners.get(event)?.delete(listener);
  }

  /** Test helper: fire an event the way Electron would. */
  fire(event: DisplayEventName, display: DisplayLike): void {
    for (const listener of this.listeners.get(event) ?? []) {
      listener({}, display);
    }
  }

  listenerCount(event: DisplayEventName): number {
    return this.listeners.get(event)?.size ?? 0;
  }
}

/* ------------------------------------------------------------------ *
 * Enumeration
 * ------------------------------------------------------------------ */

describe('describeDisplay', () => {
  it('reports only what the OS reported', () => {
    const info = describeDisplay(
      fakeDisplay({
        id: 7,
        label: 'Dell U2419D',
        bounds: { x: -1920, y: 0, width: 1920, height: 1080 },
        workArea: { x: -1920, y: 0, width: 1920, height: 1040 },
        scaleFactor: 1.5,
        displayFrequency: 60,
        rotation: 0,
        internal: false,
      }),
      1,
      99,
    );
    expect(info).toMatchObject({
      id: 7,
      index: 1,
      label: 'Dell U2419D',
      bounds: { x: -1920, y: 0, width: 1920, height: 1080 },
      workArea: { x: -1920, y: 0, width: 1920, height: 1040 },
      scaleFactor: 1.5,
      refreshRate: 60,
      rotation: 0,
      isPrimary: false,
      isInternal: false,
    });
  });

  it('keeps negative coordinates verbatim — monitors left of primary are real', () => {
    const info = describeDisplay(fakeDisplay({ bounds: { x: -2560, y: -100, width: 2560, height: 1440 } }), 0, 1);
    expect(info.bounds).toEqual({ x: -2560, y: -100, width: 2560, height: 1440 });
  });

  it('treats an empty label as no label rather than inventing a name', () => {
    expect(describeDisplay(fakeDisplay({ label: '' }), 0, 1).label).toBeUndefined();
    expect(describeDisplay(fakeDisplay({ label: 'LG TV' }), 0, 1).label).toBe('LG TV');
  });

  it('keeps refreshRate 0 (unreported) as 0 and repairs a nonsense scale factor', () => {
    const info = describeDisplay(fakeDisplay({ displayFrequency: 0, scaleFactor: Number.NaN }), 0, 1);
    expect(info.refreshRate).toBe(0);
    expect(info.scaleFactor).toBe(1);
  });

  it('treats a display that reports no frequency at all as unknown', () => {
    const { displayFrequency: _omitted, ...noFrequency } = fakeDisplay();
    expect(describeDisplay(noFrequency, 0, 1).refreshRate).toBe(0);
  });

  it('marks exactly the primary display as primary', () => {
    expect(describeDisplay(fakeDisplay({ id: 5 }), 0, 5).isPrimary).toBe(true);
    expect(describeDisplay(fakeDisplay({ id: 5 }), 0, 6).isPrimary).toBe(false);
  });
});

describe('describeDisplays', () => {
  it('enumerates in OS order with indexes and the primary flag', () => {
    const a = fakeDisplay({ id: 10 });
    const b = fakeDisplay({ id: 20, bounds: { x: 2560, y: 0, width: 1920, height: 1080 }, displayFrequency: 60 });
    const screen = new FakeScreen([a, b], b);
    const list = describeDisplays(screen);
    expect(list.map((d) => [d.id, d.index, d.isPrimary])).toEqual([
      [10, 0, false],
      [20, 1, true],
    ]);
  });
});

/* ------------------------------------------------------------------ *
 * Preference resolution
 * ------------------------------------------------------------------ */

const DISPLAYS = [
  { id: 10, index: 0, bounds: { x: 0, y: 0, width: 2560, height: 1440 }, scaleFactor: 1, refreshRate: 144, isPrimary: true },
  { id: 20, index: 1, bounds: { x: -1920, y: 0, width: 1920, height: 1080 }, scaleFactor: 1.5, refreshRate: 60, isPrimary: false },
];

describe('findTargetDisplay', () => {
  it('follows the primary display for the automatic preference', () => {
    expect(findTargetDisplay(DISPLAYS, AUTO_MONITOR)?.id).toBe(10);
    expect(findTargetDisplay(DISPLAYS, Number.NaN)?.id).toBe(10);
  });

  it('selects the display with the stored id, negative bounds and all', () => {
    const target = findTargetDisplay(DISPLAYS, 20);
    expect(target?.id).toBe(20);
    expect(target?.bounds.x).toBe(-1920);
  });

  it('falls back safely to the primary display for a disconnected id', () => {
    expect(findTargetDisplay(DISPLAYS, 999)?.id).toBe(10);
  });

  it('returns null only when the OS reports no displays at all', () => {
    expect(findTargetDisplay([], AUTO_MONITOR)).toBeNull();
    expect(findTargetDisplay([], 20)).toBeNull();
  });

  it('uses the first display when none claims to be primary', () => {
    const orphaned = DISPLAYS.map((d) => ({ ...d, isPrimary: false }));
    expect(findTargetDisplay(orphaned, AUTO_MONITOR)?.id).toBe(10);
  });
});

describe('effectiveSelection / isPreferenceDisconnected', () => {
  it('shows the stored preference while its display is connected', () => {
    expect(effectiveSelection(DISPLAYS, 20)).toBe(20);
    expect(isPreferenceDisconnected(DISPLAYS, 20)).toBe(false);
  });

  it('shows Automatic — but only in the UI — while the display is gone', () => {
    expect(effectiveSelection(DISPLAYS, 999)).toBe(AUTO_MONITOR);
    expect(isPreferenceDisconnected(DISPLAYS, 999)).toBe(true);
  });

  it('never treats the automatic preference as disconnected', () => {
    expect(effectiveSelection(DISPLAYS, AUTO_MONITOR)).toBe(AUTO_MONITOR);
    expect(isPreferenceDisconnected(DISPLAYS, AUTO_MONITOR)).toBe(false);
    expect(isPreferenceDisconnected([], 999)).toBe(false);
  });

  it('recognises the automatic value', () => {
    expect(isAutoMonitor(AUTO_MONITOR)).toBe(true);
    expect(isAutoMonitor(0)).toBe(false);
    expect(isAutoMonitor(20)).toBe(false);
  });
});

describe('dropdown labels', () => {
  it('names a display with its number, resolution, refresh, scale and primary marker', () => {
    expect(formatDisplayOption(DISPLAYS[0])).toBe('Display 1 · 2560×1440 · 144 Hz · 100% · Primary');
    expect(formatDisplayOption(DISPLAYS[1])).toBe(
      'Display 2 · 1920×1080 · 60 Hz · 150%',
    );
  });

  it('includes the OS-provided name when there is one', () => {
    expect(formatDisplayOption({ ...DISPLAYS[1], label: 'Dell U2419D' })).toContain(
      'Display 2 — Dell U2419D',
    );
  });

  it('says refresh is unknown instead of inventing a rate', () => {
    expect(formatDisplayOption({ ...DISPLAYS[1], refreshRate: 0 })).toContain('refresh n/a');
  });

  it('offers the automatic entry in terms of the primary display', () => {
    const label = formatAutoOption();
    expect(label.toLowerCase()).toContain('automatic');
    expect(label.toLowerCase()).toContain('primary');
  });
});

describe('settings defaults', () => {
  it('default to automatic monitor and close-to-tray enabled', () => {
    // defaultPresets.ts keeps the literal -1 dependency-free; this pins it to
    // the shared constant.
    expect(AUTO_MONITOR).toBe(-1);
    expect(DEFAULT_APP_SETTINGS.selectedMonitor).toBe(AUTO_MONITOR);
    expect(DEFAULT_APP_SETTINGS.keepOverlaysOnClose).toBe(true);
  });
});

/* ------------------------------------------------------------------ *
 * Hotplug: added / removed / metrics changed
 * ------------------------------------------------------------------ */

describe('createDisplayMonitor', () => {
  it('subscribes to exactly the three Electron display events', () => {
    const screen = new FakeScreen([fakeDisplay({ id: 10 })], fakeDisplay({ id: 10 }));
    const monitor = createDisplayMonitor(screen, () => undefined);
    expect(screen.listenerCount('display-added')).toBe(1);
    expect(screen.listenerCount('display-removed')).toBe(1);
    expect(screen.listenerCount('display-metrics-changed')).toBe(1);
    monitor.dispose();
  });

  it('reports a monitor addition and the new display becomes selectable', () => {
    const primary = fakeDisplay({ id: 10 });
    const screen = new FakeScreen([primary], primary);
    const onChange = vi.fn();
    const monitor = createDisplayMonitor(screen, onChange);

    const added = fakeDisplay({ id: 20, bounds: { x: 2560, y: 0, width: 1920, height: 1080 } });
    screen.displays.push(added);
    screen.fire('display-added', added);

    expect(onChange).toHaveBeenCalledWith('display-added');
    expect(monitor.list().map((d) => d.id)).toEqual([10, 20]);
    expect(monitor.resolve(20)?.id).toBe(20);
    monitor.dispose();
  });

  it('falls back to the primary display when the selected monitor is removed', () => {
    const primary = fakeDisplay({ id: 10 });
    const second = fakeDisplay({ id: 20, bounds: { x: -1920, y: 0, width: 1920, height: 1080 } });
    const screen = new FakeScreen([primary, second], primary);
    const onChange = vi.fn();
    const monitor = createDisplayMonitor(screen, onChange);

    expect(monitor.resolve(20)?.id).toBe(20);

    screen.displays = [primary];
    screen.fire('display-removed', second);

    expect(onChange).toHaveBeenCalledWith('display-removed');
    // The preference still says 20 — resolution now safely lands on primary.
    expect(monitor.resolve(20)?.id).toBe(10);
    monitor.dispose();
  });

  it('reports a resolution change and resolves to the new bounds', () => {
    const primary = fakeDisplay({ id: 10 });
    const screen = new FakeScreen([primary], primary);
    const onChange = vi.fn();
    const monitor = createDisplayMonitor(screen, onChange);

    primary.bounds = { x: 0, y: 0, width: 1920, height: 1080 };
    primary.displayFrequency = 60;
    screen.fire('display-metrics-changed', primary);

    expect(onChange).toHaveBeenCalledWith('display-metrics-changed');
    const target = monitor.resolve(AUTO_MONITOR);
    expect(target?.bounds).toEqual({ x: 0, y: 0, width: 1920, height: 1080 });
    expect(target?.refreshRate).toBe(60);
    monitor.dispose();
  });

  it('detaches every listener on dispose and never fires afterwards', () => {
    const primary = fakeDisplay({ id: 10 });
    const screen = new FakeScreen([primary], primary);
    const onChange = vi.fn();
    const monitor = createDisplayMonitor(screen, onChange);

    monitor.dispose();
    expect(screen.listenerCount('display-added')).toBe(0);
    expect(screen.listenerCount('display-removed')).toBe(0);
    expect(screen.listenerCount('display-metrics-changed')).toBe(0);

    screen.fire('display-added', primary);
    screen.fire('display-removed', primary);
    screen.fire('display-metrics-changed', primary);
    expect(onChange).not.toHaveBeenCalled();

    // Disposing twice is safe — shutdown paths may overlap.
    expect(() => monitor.dispose()).not.toThrow();
  });
});
