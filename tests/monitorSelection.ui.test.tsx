// @vitest-environment jsdom
import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PositionView } from '../src/components/views/PositionView';
import { DEFAULT_APP_SETTINGS, DEFAULT_CONFIG } from '../src/lib/defaultPresets';
import { loadAppSettings, saveAppSettings } from '../src/lib/storage';
import { AUTO_MONITOR } from '../src/lib/monitors';
import type { AppSettings } from '../src/types/crosshair';
import type { DisplayInfo, ElectronAPI } from '../src/types/electron';

/**
 * Target Monitor UI and the close-to-tray setting.
 *
 * The desktop bridge is mocked at the exact surface PositionView uses:
 * `listDisplays` (live enumeration) and `onDisplaysChanged` (hotplug refresh).
 * jsdom proves the wiring — labels, selection, persistence — not pixels.
 */

const PRIMARY: DisplayInfo = {
  id: 11,
  index: 0,
  bounds: { x: 0, y: 0, width: 2560, height: 1440 },
  scaleFactor: 1,
  refreshRate: 144,
  isPrimary: true,
};

const SECOND: DisplayInfo = {
  id: 22,
  index: 1,
  label: 'Dell U2419D',
  bounds: { x: -1920, y: 0, width: 1920, height: 1080 },
  scaleFactor: 1.5,
  refreshRate: 60,
  isPrimary: false,
};

interface MockBridge {
  listCalls: number;
  setDisplays: (displays: DisplayInfo[]) => void;
  fireDisplaysChanged: () => void;
  unsubscribe: ReturnType<typeof vi.fn>;
}

function installElectronApi(displays: DisplayInfo[] = [PRIMARY, SECOND]): MockBridge {
  let current = displays;
  let changedCallback: ((next: DisplayInfo[]) => void) | null = null;
  const unsubscribe = vi.fn();
  const bridge: MockBridge = {
    listCalls: 0,
    setDisplays: (next) => {
      current = next;
    },
    fireDisplaysChanged: () => changedCallback?.(current),
    unsubscribe,
  };
  const api = {
    listDisplays: () => {
      bridge.listCalls += 1;
      const target =
        current.find((d) => d.isPrimary) ?? current[0] ?? null;
      return Promise.resolve({
        displays: current,
        preference: AUTO_MONITOR,
        targetId: target ? target.id : null,
      });
    },
    onDisplaysChanged: (callback: (next: DisplayInfo[]) => void) => {
      changedCallback = callback;
      return unsubscribe;
    },
  } as unknown as ElectronAPI;
  window.electronAPI = api;
  return bridge;
}

function renderView(
  settings: AppSettings = DEFAULT_APP_SETTINGS,
  onUpdateSettings = vi.fn(),
) {
  const onChange = vi.fn();
  const onResetCenter = vi.fn();
  render(
    <PositionView
      config={DEFAULT_CONFIG}
      onChange={onChange}
      onResetCenter={onResetCenter}
      settings={settings}
      onUpdateSettings={onUpdateSettings}
    />,
  );
  return { onChange, onResetCenter, onUpdateSettings };
}

afterEach(() => {
  cleanup();
  localStorage.clear();
  window.electronAPI = undefined;
});

describe('Target Monitor dropdown', () => {
  it('lists the automatic entry and every detected display with resolution, refresh and primary marker', async () => {
    installElectronApi();
    renderView();

    const select = await screen.findByLabelText('Target monitor');
    const options = Array.from(select.querySelectorAll('option'));
    expect(options).toHaveLength(3);
    expect(options[0].textContent).toContain('Automatic');
    expect(options[0].textContent).toContain('primary display');
    expect(options[0]).toHaveProperty('value', String(AUTO_MONITOR));

    expect(options[1].textContent).toContain('Display 1');
    expect(options[1].textContent).toContain('2560×1440');
    expect(options[1].textContent).toContain('144 Hz');
    expect(options[1].textContent).toContain('Primary');
    expect(options[1]).toHaveProperty('value', '11');

    expect(options[2].textContent).toContain('Display 2 — Dell U2419D');
    expect(options[2].textContent).toContain('1920×1080');
    expect(options[2].textContent).toContain('60 Hz');
    expect(options[2].textContent).not.toContain('Primary');
  });

  it('selects the automatic entry by default', async () => {
    installElectronApi();
    renderView();
    const select = (await screen.findByLabelText('Target monitor')) as HTMLSelectElement;
    expect(select.value).toBe(String(AUTO_MONITOR));
  });

  it('selecting a display reports its id through the settings update', async () => {
    installElectronApi();
    const { onUpdateSettings } = renderView();
    const select = await screen.findByLabelText('Target monitor');
    fireEvent.change(select, { target: { value: '22' } });
    expect(onUpdateSettings).toHaveBeenCalledWith({ selectedMonitor: 22 });
  });

  it('refreshes the list when a display is connected or disconnected', async () => {
    const bridge = installElectronApi([PRIMARY]);
    renderView();
    const select = (await screen.findByLabelText('Target monitor')) as HTMLSelectElement;
    await waitFor(() => expect(select.querySelectorAll('option')).toHaveLength(2));
    expect(bridge.listCalls).toBe(1);

    // A monitor is plugged in; the main process pushes displays-changed and
    // the view re-enumerates.
    bridge.setDisplays([PRIMARY, SECOND]);
    await act(async () => {
      bridge.fireDisplaysChanged();
    });
    await waitFor(() => expect(select.querySelectorAll('option')).toHaveLength(3));
    expect(bridge.listCalls).toBe(2);
  });

  it('unsubscribes from display events on unmount', async () => {
    const bridge = installElectronApi();
    renderView();
    await screen.findByLabelText('Target monitor');
    cleanup();
    expect(bridge.unsubscribe).toHaveBeenCalled();
  });

  it('falls back to Automatic in the UI — with an honest note — while the chosen display is disconnected', async () => {
    installElectronApi([PRIMARY]);
    renderView({ ...DEFAULT_APP_SETTINGS, selectedMonitor: 999 });
    const select = (await screen.findByLabelText('Target monitor')) as HTMLSelectElement;
    await waitFor(() => expect(select.value).toBe(String(AUTO_MONITOR)));
    expect(screen.getByText(/not connected/i)).toBeTruthy();
    expect(screen.getByText(/remembered/i)).toBeTruthy();
  });

  it('shows a desktop-app note instead of a dead dropdown without the Electron bridge', () => {
    // No installElectronApi(): window.electronAPI stays undefined, exactly as
    // in a plain browser.
    renderView();
    expect(screen.queryByLabelText('Target monitor')).toBeNull();
    expect(screen.getByText(/desktop app/i)).toBeTruthy();
  });
});

describe('keep-overlays setting', () => {
  it('renders enabled by default and reports the toggle through settings', () => {
    installElectronApi();
    const { onUpdateSettings } = renderView();
    const checkbox = screen.getByLabelText(
      'Keep overlays running when the window is closed',
    ) as HTMLInputElement;
    expect(checkbox.checked).toBe(true);
    fireEvent.click(checkbox);
    expect(onUpdateSettings).toHaveBeenCalledWith({ keepOverlaysOnClose: false });
  });

  it('renders the persisted disabled state', () => {
    installElectronApi();
    renderView({ ...DEFAULT_APP_SETTINGS, keepOverlaysOnClose: false });
    const checkbox = screen.getByLabelText(
      'Keep overlays running when the window is closed',
    ) as HTMLInputElement;
    expect(checkbox.checked).toBe(false);
  });

  it('does not promise overlays survive the process', () => {
    installElectronApi();
    renderView();
    expect(
      screen.getByText(/only live while the application process does/i),
    ).toBeTruthy();
  });
});

describe('persistence', () => {
  it('round-trips the monitor preference and the close-to-tray setting', () => {
    const api = { updateAppSettings: vi.fn() } as unknown as ElectronAPI;
    window.electronAPI = api;

    saveAppSettings({
      ...DEFAULT_APP_SETTINGS,
      selectedMonitor: 22,
      keepOverlaysOnClose: false,
    });
    const loaded = loadAppSettings();
    expect(loaded.selectedMonitor).toBe(22);
    expect(loaded.keepOverlaysOnClose).toBe(false);
    // Saving pushes to the main process, which is how the overlay moves and
    // the close handler learns the setting.
    expect(api.updateAppSettings).toHaveBeenCalledWith(
      expect.objectContaining({ selectedMonitor: 22, keepOverlaysOnClose: false }),
    );
  });

  it('gives settings saved before this feature the new defaults', () => {
    localStorage.setItem(
      'crshhx_app_settings',
      JSON.stringify({
        overlayVisible: true,
        toggleOverlayHotkey: 'F10',
        cyclePresetHotkey: 'F9',
        centerLockHotkey: 'F8',
        selectedMonitor: 0,
        runAtStartup: false,
        suspendedWhenMinimized: true,
      }),
    );
    const loaded = loadAppSettings();
    expect(loaded.keepOverlaysOnClose).toBe(true);
    expect(loaded.selectedMonitor).toBe(0);
  });
});
