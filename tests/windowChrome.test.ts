import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import {
  WINDOW_CONTROL_CHANNELS,
  attachMaximizeReporting,
  buildStudioMenuTemplate,
  registerWindowControls,
} from '../electron/services/windowChrome';
import type { WindowChromeTarget } from '../electron/services/windowChrome';

/** A recording stand-in for the studio BrowserWindow. */
function fakeWindow(initial: { maximized?: boolean; destroyed?: boolean } = {}) {
  const calls: string[] = [];
  let maximized = initial.maximized ?? false;
  const win: WindowChromeTarget = {
    minimize: () => calls.push('minimize'),
    maximize: () => {
      calls.push('maximize');
      maximized = true;
    },
    unmaximize: () => {
      calls.push('unmaximize');
      maximized = false;
    },
    isMaximized: () => maximized,
    close: () => calls.push('close'),
    isDestroyed: () => initial.destroyed ?? false,
  };
  return { win, calls };
}

function harness(getWindow: () => WindowChromeTarget | null) {
  const controls = new Map<string, () => void>();
  const queries = new Map<string, () => boolean>();
  registerWindowControls({
    onControl: (channel, handler) => controls.set(channel, handler),
    onQuery: (channel, handler) => queries.set(channel, handler),
    getWindow,
  });
  return { controls, queries };
}

describe('frameless window chrome', () => {
  it('registers exactly the three header controls and one state query', () => {
    const { controls, queries } = harness(() => null);
    expect([...controls.keys()].sort()).toEqual([
      WINDOW_CONTROL_CHANNELS.close,
      WINDOW_CONTROL_CHANNELS.minimize,
      WINDOW_CONTROL_CHANNELS.toggleMaximize,
    ]);
    expect([...queries.keys()]).toEqual([WINDOW_CONTROL_CHANNELS.isMaximized]);
  });

  it('minimises, toggles maximise/restore and closes the live window', () => {
    const { win, calls } = fakeWindow();
    const { controls } = harness(() => win);

    controls.get(WINDOW_CONTROL_CHANNELS.minimize)!();
    expect(calls).toEqual(['minimize']);

    controls.get(WINDOW_CONTROL_CHANNELS.toggleMaximize)!();
    expect(calls).toEqual(['minimize', 'maximize']);

    // Second toggle restores instead of maximising again.
    controls.get(WINDOW_CONTROL_CHANNELS.toggleMaximize)!();
    expect(calls).toEqual(['minimize', 'maximize', 'unmaximize']);

    controls.get(WINDOW_CONTROL_CHANNELS.close)!();
    expect(calls).toEqual(['minimize', 'maximize', 'unmaximize', 'close']);
  });

  it('routes close through BrowserWindow.close so close-to-tray still decides', () => {
    // The service must never destroy the window or quit the app directly:
    // backgroundMode owns the 'close' event, and that only fires for close().
    const { win, calls } = fakeWindow();
    const { controls } = harness(() => win);
    controls.get(WINDOW_CONTROL_CHANNELS.close)!();
    expect(calls).toEqual(['close']);
    expect('destroy' in win).toBe(false);
  });

  it('answers the maximised-state query from the live window', () => {
    const { win } = fakeWindow({ maximized: true });
    const { queries } = harness(() => win);
    expect(queries.get(WINDOW_CONTROL_CHANNELS.isMaximized)!()).toBe(true);
  });

  it('is inert while no window exists or the window is destroyed', () => {
    const nullish = harness(() => null);
    for (const handler of nullish.controls.values()) expect(() => handler()).not.toThrow();
    expect(nullish.queries.get(WINDOW_CONTROL_CHANNELS.isMaximized)!()).toBe(false);

    const destroyed = fakeWindow({ destroyed: true });
    const { controls, queries } = harness(() => destroyed.win);
    for (const handler of controls.values()) expect(() => handler()).not.toThrow();
    expect(destroyed.calls).toEqual([]);
    expect(queries.get(WINDOW_CONTROL_CHANNELS.isMaximized)!()).toBe(false);
  });

  it('forwards every maximise/restore transition to the renderer', () => {
    const listeners = new Map<string, () => void>();
    const emitted: boolean[] = [];
    attachMaximizeReporting(
      {
        on: (event, listener) => {
          listeners.set(event, listener);
        },
        isMaximized: () => false,
      },
      (maximized) => emitted.push(maximized),
    );
    listeners.get('maximize')!();
    listeners.get('unmaximize')!();
    expect(emitted).toEqual([true, false]);
  });

  it('keeps clipboard, undo, zoom and DevTools accelerators in the menu', () => {
    const template = buildStudioMenuTemplate();
    const roles = template.flatMap((menu) => menu.submenu.map((item) => item.role));
    // Removing the visible menu bar must not remove text-editing accelerators.
    for (const role of ['undo', 'redo', 'cut', 'copy', 'paste', 'selectAll']) {
      expect(roles).toContain(role);
    }
    for (const role of ['reload', 'toggleDevTools', 'resetZoom', 'zoomIn', 'zoomOut']) {
      expect(roles).toContain(role);
    }
    expect(roles).toContain('minimize');
    expect(roles).toContain('close');
  });

  it('ships no File and no Help menu — the duplicated bar is gone', () => {
    const labels = buildStudioMenuTemplate().map((menu) => menu.label);
    expect(labels).not.toContain('File');
    expect(labels).not.toContain('Help');
    expect(labels).toEqual(['Edit', 'View', 'Window']);
  });

  it('pins the studio window to the frameless single-header setup', () => {
    const main = readFileSync('electron/main.ts', 'utf8');
    // The studio window must stay frameless, and the menu must be the
    // accelerators-only template rather than Electron's visible default.
    expect(main).toContain('frame: false');
    expect(main).toContain('buildStudioMenuTemplate');
    expect(main).toContain('Menu.setApplicationMenu');
    expect(main).toContain('registerWindowControls');
    expect(main).toContain('attachMaximizeReporting');
  });

  it('keeps preload and service channel names in lockstep', () => {
    const preload = readFileSync('electron/preload.ts', 'utf8');
    for (const channel of Object.values(WINDOW_CONTROL_CHANNELS)) {
      expect(preload, `preload must use channel "${channel}"`).toContain(`'${channel}'`);
    }
    // The renderer-facing API surface the header depends on.
    const types = readFileSync('src/types/electron.d.ts', 'utf8');
    for (const member of [
      'windowMinimize',
      'windowToggleMaximize',
      'windowClose',
      'isWindowMaximized',
      'onWindowMaximizedChanged',
    ]) {
      expect(types, `electron.d.ts must declare ${member}`).toContain(member);
      expect(preload, `preload must expose ${member}`).toContain(member);
    }
  });

  it('renders the header controls only where a window exists to control', () => {
    const header = readFileSync('src/components/TopHeader.tsx', 'utf8');
    // No dead icons in a plain browser: the control cluster is conditional.
    expect(header).toContain('canControlWindow');
    expect(header).toContain('windowMinimize');
    expect(header).toContain('windowClose');
    expect(header).toContain('Restore window');
    // The header is the drag region; interactive elements opt back out via CSS.
    expect(header).toContain('titlebar-drag');
    const css = readFileSync('src/studio/index.css', 'utf8');
    expect(css).toContain('-webkit-app-region: drag');
    expect(css).toContain('-webkit-app-region: no-drag');
  });
});
