// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { TopHeader } from '../src/components/TopHeader';

/**
 * The frameless header: one set of window controls, wired to the preload API,
 * with the right icon for the maximised state — and nothing rendered at all
 * when there is no Electron window to control (plain browser builds).
 */

function mockApi(maximized = false) {
  const calls: string[] = [];
  let maximizedChanged: ((value: boolean) => void) | null = null;
  window.electronAPI = {
    windowMinimize: () => calls.push('minimize'),
    windowToggleMaximize: () => calls.push('toggleMaximize'),
    windowClose: () => calls.push('close'),
    isWindowMaximized: () => Promise.resolve(maximized),
    onWindowMaximizedChanged: (callback: (value: boolean) => void) => {
      maximizedChanged = callback;
      return () => {
        maximizedChanged = null;
      };
    },
  } as unknown as typeof window.electronAPI;
  return {
    calls,
    pushMaximized(value: boolean) {
      maximizedChanged?.(value);
    },
  };
}

function renderHeader() {
  return render(
    <TopHeader
      overlayVisible
      onToggleOverlay={() => undefined}
      onOpenShareModal={() => undefined}
      onOpenImportModal={() => undefined}
      currentAccent={{ id: 'cyan', name: 'Cyan', color: '#22d3ee' } as never}
      onSelectAccent={() => undefined}
    />,
  );
}

afterEach(() => {
  cleanup();
  delete (window as { electronAPI?: unknown }).electronAPI;
});

describe('TopHeader window controls', () => {
  it('renders no window controls outside Electron', () => {
    renderHeader();
    expect(screen.queryByLabelText('Minimize window')).toBeNull();
    expect(screen.queryByLabelText('Close window')).toBeNull();
  });

  it('renders exactly one set of controls and wires them to the API', async () => {
    const api = mockApi();
    renderHeader();

    // The promise from isWindowMaximized resolves on a microtask.
    await act(async () => {
      await Promise.resolve();
    });

    const minimize = screen.getByLabelText('Minimize window');
    const toggle = screen.getByLabelText('Maximize window');
    const close = screen.getByLabelText('Close window');
    expect(screen.getAllByLabelText(/window$/)).toHaveLength(3);

    fireEvent.click(minimize);
    fireEvent.click(toggle);
    fireEvent.click(close);
    expect(api.calls).toEqual(['minimize', 'toggleMaximize', 'close']);
  });

  it('follows maximise/restore transitions from the main process', async () => {
    const api = mockApi();
    renderHeader();
    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByLabelText('Maximize window')).toBeTruthy();

    // Any transition — double-click on the drag region, Win+Up, taskbar —
    // arrives through the subscription and flips the button.
    act(() => api.pushMaximized(true));
    expect(screen.getByLabelText('Restore window')).toBeTruthy();
    expect(screen.queryByLabelText('Maximize window')).toBeNull();

    act(() => api.pushMaximized(false));
    expect(screen.getByLabelText('Maximize window')).toBeTruthy();
  });

  it('seeds the icon from the initial maximised state', async () => {
    mockApi(true);
    renderHeader();
    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.getByLabelText('Restore window')).toBeTruthy();
  });

  it('keeps the existing header features alongside the controls', async () => {
    mockApi();
    renderHeader();
    await act(async () => {
      await Promise.resolve();
    });
    // Nothing else moved: overlay switch, share and import are still here.
    expect(screen.getByText('HUD ACTIVE')).toBeTruthy();
    expect(screen.getByText('Share')).toBeTruthy();
    expect(screen.getByText('Import')).toBeTruthy();
  });
});
