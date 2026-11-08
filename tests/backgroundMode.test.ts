import { describe, expect, it, vi } from 'vitest';
import * as path from 'path';

import { createBackgroundMode } from '../electron/services/backgroundMode';
import type {
  BackgroundModeDeps,
  CloseEventLike,
  LifecycleWindowLike,
} from '../electron/services/backgroundMode';
import {
  TRAY_TOOLTIP,
  createTrayController,
  resolveTrayIconPath,
  trayMenuTemplate,
} from '../electron/services/trayService';
import type { TrayLike, TrayMenuTemplateItem } from '../electron/services/trayService';

/**
 * Background Overlay Mode: close-to-tray, the tray menu and the one real exit.
 *
 * Every Electron piece arrives through the dependency objects, so the whole
 * lifecycle state machine runs in plain Node here.
 */

function fakeWindow(log: string[], name: string): LifecycleWindowLike {
  let destroyed = false;
  return {
    isDestroyed: () => destroyed,
    hide: () => log.push(`${name}.hide`),
    show: () => log.push(`${name}.show`),
    focus: () => log.push(`${name}.focus`),
    close: () => {
      log.push(`${name}.close`);
      destroyed = true;
    },
  };
}

function fakeCloseEvent(): { event: CloseEventLike; wasPrevented: () => boolean } {
  let prevented = false;
  return {
    event: {
      preventDefault: () => {
        prevented = true;
      },
    },
    wasPrevented: () => prevented,
  };
}

function makeDeps(overrides: Partial<BackgroundModeDeps> = {}) {
  // One shared log for window operations and dependency operations, so a test
  // can assert the complete order of a teardown in a single array.
  const calls: string[] = [];
  const studio = fakeWindow(calls, 'studio');
  const overlay = fakeWindow(calls, 'overlay');
  const deps: BackgroundModeDeps = {
    keepOverlaysOnClose: () => true,
    getStudioWindow: () => studio,
    getOverlayWindow: () => overlay,
    destroyTray: () => calls.push('destroyTray'),
    trayActive: () => true,
    disposeInputHooks: () => calls.push('disposeInputHooks'),
    unregisterShortcuts: () => calls.push('unregisterShortcuts'),
    quitApp: () => calls.push('quitApp'),
    showStudio: () => calls.push('showStudio'),
    ...overrides,
  };
  return { calls, deps, studio, overlay };
}

/* ------------------------------------------------------------------ *
 * Closing the main window
 * ------------------------------------------------------------------ */

describe('studio close button', () => {
  it('hides the window instead of exiting while background operation is on', () => {
    const calls: string[] = [];
    const studio = fakeWindow(calls, 'studio');
    const mode = createBackgroundMode(makeDeps({ getStudioWindow: () => studio }).deps);

    const { event, wasPrevented } = fakeCloseEvent();
    expect(mode.handleStudioClose(event)).toBe(true);
    expect(wasPrevented()).toBe(true);
    expect(calls).toEqual(['studio.hide']);
    expect(mode.isQuitting()).toBe(false);
  });

  it('keeps the overlay window and the input hooks alive while hidden', () => {
    const calls: string[] = [];
    const studio = fakeWindow(calls, 'studio');
    const overlay = fakeWindow(calls, 'overlay');
    const mode = createBackgroundMode(
      makeDeps({ getStudioWindow: () => studio, getOverlayWindow: () => overlay }).deps,
    );

    mode.handleStudioClose(fakeCloseEvent().event);
    // Nothing but the hide happened: no overlay close, no hook disposal,
    // no shortcut teardown, no quit. Global input and dynamic crosshair
    // switching are untouched by hiding the studio.
    expect(calls).toEqual(['studio.hide']);
  });

  it('performs a normal exit when the setting is disabled', () => {
    const calls: string[] = [];
    const studio = fakeWindow(calls, 'studio');
    const mode = createBackgroundMode(
      makeDeps({ keepOverlaysOnClose: () => false, getStudioWindow: () => studio }).deps,
    );

    const { event, wasPrevented } = fakeCloseEvent();
    expect(mode.handleStudioClose(event)).toBe(false);
    expect(wasPrevented()).toBe(false);
    expect(calls).toEqual([]); // the close proceeds; the window exits normally
  });

  it('does not intercept closes once a quit is underway', () => {
    const mode = createBackgroundMode(makeDeps().deps);
    mode.markQuitting();
    const { event, wasPrevented } = fakeCloseEvent();
    expect(mode.handleStudioClose(event)).toBe(false);
    expect(wasPrevented()).toBe(false);

    const mode2 = createBackgroundMode(makeDeps().deps);
    mode2.handleBeforeQuit();
    expect(mode2.isQuitting()).toBe(true);
    expect(mode2.handleStudioClose(fakeCloseEvent().event)).toBe(false);
  });
});

describe('window-all-closed', () => {
  it('does not exit while running in the background with a live tray', () => {
    const { calls, deps } = makeDeps();
    const mode = createBackgroundMode(deps);
    mode.handleWindowAllClosed();
    expect(calls).not.toContain('quitApp');
  });

  it('exits when background operation is disabled', () => {
    const { calls, deps } = makeDeps({ keepOverlaysOnClose: () => false });
    createBackgroundMode(deps).handleWindowAllClosed();
    expect(calls).toContain('quitApp');
  });

  it('exits when no tray exists to reopen from', () => {
    const { calls, deps } = makeDeps({ trayActive: () => false });
    createBackgroundMode(deps).handleWindowAllClosed();
    expect(calls).toContain('quitApp');
  });

  it('exits when a quit is already underway', () => {
    const { calls, deps } = makeDeps();
    const mode = createBackgroundMode(deps);
    mode.markQuitting();
    mode.handleWindowAllClosed();
    expect(calls).toContain('quitApp');
  });
});

describe('second instance', () => {
  it('restores the existing window instead of starting a second process', () => {
    const { calls, deps } = makeDeps();
    createBackgroundMode(deps).handleSecondInstance();
    expect(calls).toEqual(['showStudio']);
  });
});

/* ------------------------------------------------------------------ *
 * The explicit Quit path
 * ------------------------------------------------------------------ */

describe('quitFromTray', () => {
  it('tears down in the contracted order: tray, hooks, shortcuts, overlay, studio, exit', () => {
    const { calls, deps } = makeDeps();
    const mode = createBackgroundMode(deps);

    mode.quitFromTray();

    expect(calls).toEqual([
      'destroyTray',
      'disposeInputHooks',
      'unregisterShortcuts',
      'overlay.close',
      'studio.close',
      'quitApp',
    ]);
    expect(mode.isQuitting()).toBe(true);
  });

  it('is idempotent — a second Quit does not race the first', () => {
    const { calls, deps } = makeDeps();
    const mode = createBackgroundMode(deps);
    mode.quitFromTray();
    const afterFirst = [...calls];
    mode.quitFromTray();
    expect(calls).toEqual(afterFirst);
  });

  it('survives already-gone windows', () => {
    const { calls, deps } = makeDeps({
      getStudioWindow: () => null,
      getOverlayWindow: () => null,
    });
    const mode = createBackgroundMode(deps);
    expect(() => mode.quitFromTray()).not.toThrow();
    expect(calls).toEqual([
      'destroyTray',
      'disposeInputHooks',
      'unregisterShortcuts',
      'quitApp',
    ]);
  });

  it('leaves destroyed windows alone', () => {
    const { calls, deps, studio } = makeDeps({ getOverlayWindow: () => null });
    studio.close(); // marks it destroyed
    calls.length = 0;
    const mode = createBackgroundMode(deps);
    mode.quitFromTray();
    expect(calls).not.toContain('studio.close');
    expect(calls).toContain('quitApp');
  });
});

/* ------------------------------------------------------------------ *
 * System tray
 * ------------------------------------------------------------------ */

function makeFakeTray(log: string[]) {
  const menus: TrayMenuTemplateItem[][] = [];
  const handlers: Record<string, Array<() => void>> = {};
  let destroyed = false;
  const tray: TrayLike = {
    setToolTip: (tooltip) => log.push(`tooltip:${tooltip}`),
    setContextMenu: (menu) => menus.push(menu as TrayMenuTemplateItem[]),
    on: (event, listener) => {
      (handlers[event] ??= []).push(listener);
    },
    destroy: () => {
      destroyed = true;
      log.push('tray.destroy');
    },
    isDestroyed: () => destroyed,
  };
  return { tray, menus, handlers, isDestroyed: () => destroyed };
}

function makeTrayDeps(fake: ReturnType<typeof makeFakeTray>, log: string[], visible: () => boolean) {
  return {
    createTray: () => fake.tray,
    // Identity builder: what setContextMenu receives is the template itself,
    // so tests can inspect labels and fire clicks directly.
    buildMenu: (template: TrayMenuTemplateItem[]) => template,
    onOpen: () => log.push('open'),
    onToggleOverlays: () => log.push('toggle'),
    onQuit: () => log.push('quit'),
    isOverlayVisible: visible,
  };
}

describe('tray controller', () => {
  it('builds the contracted menu while overlays are visible', () => {
    const log: string[] = [];
    const fake = makeFakeTray(log);
    const controller = createTrayController(makeTrayDeps(fake, log, () => true));
    expect(controller).not.toBeNull();

    expect(log).toContain(`tooltip:${TRAY_TOOLTIP}`);
    expect(fake.menus).toHaveLength(1);
    const [menu] = fake.menus;
    expect(menu.map((item) => item.label ?? item.type)).toEqual([
      'Open crshhx',
      'Disable overlays',
      'separator',
      'Quit crshhx',
    ]);
  });

  it('offers "Enable overlays" while they are hidden', () => {
    const log: string[] = [];
    const fake = makeFakeTray(log);
    createTrayController(makeTrayDeps(fake, log, () => false));
    expect(fake.menus[0][1].label).toBe('Enable overlays');
  });

  it('routes every menu entry to its action', () => {
    const log: string[] = [];
    const fake = makeFakeTray(log);
    createTrayController(makeTrayDeps(fake, log, () => true));
    const [menu] = fake.menus;
    menu[0].click?.();
    menu[1].click?.();
    menu[3].click?.();
    expect(log).toEqual([`tooltip:${TRAY_TOOLTIP}`, 'open', 'toggle', 'quit']);
  });

  it('reopens the studio on a tray click and on a double click', () => {
    const log: string[] = [];
    const fake = makeFakeTray(log);
    createTrayController(makeTrayDeps(fake, log, () => true));
    for (const listener of fake.handlers['click'] ?? []) listener();
    for (const listener of fake.handlers['double-click'] ?? []) listener();
    expect(log.filter((entry) => entry === 'open')).toHaveLength(2);
  });

  it('sync() rebuilds the menu so the overlay entry tracks reality', () => {
    const log: string[] = [];
    const fake = makeFakeTray(log);
    let visible = true;
    const controller = createTrayController(makeTrayDeps(fake, log, () => visible));
    visible = false;
    controller?.sync();
    expect(fake.menus).toHaveLength(2);
    expect(fake.menus[1][1].label).toBe('Enable overlays');
  });

  it('destroy() removes the icon once, and sync afterwards is a no-op', () => {
    const log: string[] = [];
    const fake = makeFakeTray(log);
    const controller = createTrayController(makeTrayDeps(fake, log, () => true));
    controller?.destroy();
    controller?.destroy(); // shutdown paths may overlap
    expect(log.filter((entry) => entry === 'tray.destroy')).toHaveLength(1);
    expect(fake.isDestroyed()).toBe(true);
    controller?.sync();
    expect(fake.menus).toHaveLength(1); // no menu built after destruction
  });

  it('runs without a tray when no icon could be created — the app must not die for a missing png', () => {
    const log: string[] = [];
    const fake = makeFakeTray(log);
    const deps = makeTrayDeps(fake, log, () => true);
    const controller = createTrayController({ ...deps, createTray: () => null });
    expect(controller).toBeNull();
    expect(log).toEqual([]);
  });

  it('exposes the menu as data for the pinned labels', () => {
    const template = trayMenuTemplate({
      onOpen: vi.fn(),
      onToggleOverlays: vi.fn(),
      onQuit: vi.fn(),
      isOverlayVisible: () => false,
    });
    expect(template.map((item) => item.label ?? item.type)).toEqual([
      'Open crshhx',
      'Enable overlays',
      'separator',
      'Quit crshhx',
    ]);
  });
});

/* ------------------------------------------------------------------ *
 * Tray icon location — mirrors extraResources in electron-builder.yml
 * ------------------------------------------------------------------ */

describe('resolveTrayIconPath', () => {
  it('finds the packaged icon in the resources directory on Windows', () => {
    expect(
      resolveTrayIconPath({
        appPath: '/ignored',
        isPackaged: true,
        resourcesPath: 'C:\\Program Files\\crshhx\\resources',
        platform: 'win32',
      }),
    ).toBe(path.join('C:\\Program Files\\crshhx\\resources', 'icon.ico'));
  });

  it('finds the build-resources icon in development', () => {
    expect(
      resolveTrayIconPath({
        appPath: '/repo',
        isPackaged: false,
        resourcesPath: '',
        platform: 'win32',
      }),
    ).toBe(path.join('/repo', 'build', 'icon.ico'));
  });

  it('prefers the png off Windows, where ico is not the tray format', () => {
    expect(
      resolveTrayIconPath({ appPath: '/repo', isPackaged: false, resourcesPath: '', platform: 'linux' }),
    ).toBe(path.join('/repo', 'build', 'icon.png'));
  });
});
