// @vitest-environment jsdom
import React, { useState } from 'react';
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ColorField } from '../src/components/editor/ColorField';
import { ArmGeometryPanel } from '../src/components/editor/ArmGeometryPanel';
import { useConfigHistory } from '../src/components/editor/useConfigHistory';
import { DesignerTabbedView } from '../src/components/views/DesignerTabbedView';
import { DEFAULT_CONFIG } from '../src/lib/defaultPresets';
import { BACKDROP_OPTIONS } from '../src/components/TargetBackdrops';
import { LIMITS, resolveArmGeometry } from '../src/lib/crosshairSchema';
import { loadSwatches } from '../src/lib/storage';
import type { CrosshairConfig } from '../src/types/crosshair';

/**
 * Advanced editor component tests.
 *
 * The point of these is the part a user actually touches: does typing a hex
 * value reach the config, does undo give back the previous crosshair rather than
 * the previous keystroke, does turning on independent arms really write four
 * separate dimensions, and does the designer still render the *same* component
 * the overlay renders.
 *
 * Nothing here asserts pixels. jsdom proves behaviour and wiring; visual layout
 * is explicitly listed as unverified in docs/testing.md.
 */

const base = (overrides: Partial<CrosshairConfig> = {}): CrosshairConfig => ({
  ...DEFAULT_CONFIG,
  ...overrides,
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  localStorage.clear();
});

/* ------------------------------------------------------------------ *
 * Harnesses
 * ------------------------------------------------------------------ */

/** Holds config state the way App.tsx does, so a patch merge is exercised. */
function ColorHarness({
  initial = '#00ffcc',
  opacity,
  onCommit,
}: {
  initial?: string;
  opacity?: number;
  onCommit?: (patch: Partial<CrosshairConfig>) => void;
}) {
  const [color, setColor] = useState(initial);
  const [alpha, setAlpha] = useState(opacity ?? 1);
  return (
    <ColorField
      label="Reticle Color"
      value={color}
      onChange={(hex) => {
        setColor(hex);
        onCommit?.({ primaryColor: hex });
      }}
      opacity={opacity === undefined ? undefined : alpha}
      onOpacityChange={opacity === undefined ? undefined : (o) => setAlpha(o)}
    />
  );
}

function ArmHarness({
  initial,
  onCommit,
}: {
  initial?: Partial<CrosshairConfig>;
  onCommit?: (patch: Partial<CrosshairConfig>) => void;
}) {
  const [config, setConfig] = useState(base(initial));
  return (
    <div>
      <ArmGeometryPanel
        config={config}
        onChange={(patch) => {
          setConfig((c) => ({ ...c, ...patch }));
          onCommit?.(patch);
        }}
      />
      <output data-testid="arms">{JSON.stringify(resolveArmGeometry(config))}</output>
      <output data-testid="config">{JSON.stringify(config)}</output>
    </div>
  );
}

function readArms(): Record<string, { length: number; thickness: number }> {
  return JSON.parse(screen.getByTestId('arms').textContent ?? '{}');
}

/** The A and B cells of one row of the comparison table. */
function diffRow(label: string): { a: string; b: string } {
  const cells = screen.getByText(label).closest('tr')!.querySelectorAll('td');
  return { a: cells[1].textContent ?? '', b: cells[2].textContent ?? '' };
}

function readConfig(): CrosshairConfig {
  return JSON.parse(screen.getByTestId('config').textContent ?? '{}');
}

/* ------------------------------------------------------------------ *
 * Undo / redo history
 * ------------------------------------------------------------------ */

describe('useConfigHistory', () => {
  function setup(initial = base(), options?: { limit?: number; coalesceMs?: number }) {
    return renderHook(() => {
      const [config, setConfig] = useState(initial);
      const history = useConfigHistory(config, (patch) => setConfig((c) => ({ ...c, ...patch })), options);
      return { config, history, setConfig };
    });
  }

  it('starts with nothing to undo or redo', () => {
    const { result } = setup();
    expect(result.current.history.canUndo).toBe(false);
    expect(result.current.history.canRedo).toBe(false);
    expect(result.current.history.undoDepth).toBe(0);
  });

  it('forwards the patch so the parent config actually changes', () => {
    const { result } = setup();
    act(() => result.current.history.handleChange({ length: 9 }));
    expect(result.current.config.length).toBe(9);
    expect(result.current.history.canUndo).toBe(true);
  });

  it('undo restores the previous value, redo re-applies it', () => {
    const { result } = setup(base({ length: 4 }));
    act(() => result.current.history.handleChange({ length: 12 }));
    expect(result.current.config.length).toBe(12);

    act(() => result.current.history.undo());
    expect(result.current.config.length).toBe(4);
    expect(result.current.history.canRedo).toBe(true);

    act(() => result.current.history.redo());
    expect(result.current.config.length).toBe(12);
    expect(result.current.history.canRedo).toBe(false);
  });

  it('walks back through several distinct edits in order', () => {
    const { result } = setup(base({ length: 4, thickness: 2, gap: 2 }));
    act(() => result.current.history.handleChange({ length: 5 }));
    act(() => result.current.history.handleChange({ thickness: 3 }));
    act(() => result.current.history.handleChange({ gap: 6 }));
    expect(result.current.history.undoDepth).toBe(3);

    act(() => result.current.history.undo());
    expect(result.current.config).toMatchObject({ length: 5, thickness: 3, gap: 2 });
    act(() => result.current.history.undo());
    expect(result.current.config).toMatchObject({ length: 5, thickness: 2, gap: 2 });
    act(() => result.current.history.undo());
    expect(result.current.config).toMatchObject({ length: 4, thickness: 2, gap: 2 });
    expect(result.current.history.canUndo).toBe(false);
  });

  it('undoing a whole-config patch (a reset) restores every field at once', () => {
    const { result } = setup(base({ length: 11, primaryColor: '#ff00aa' }));
    act(() =>
      result.current.history.handleChange({ ...DEFAULT_CONFIG, length: 4, primaryColor: '#ffffff' }),
    );
    expect(result.current.config).toMatchObject({ length: 4, primaryColor: '#ffffff' });

    act(() => result.current.history.undo());
    expect(result.current.config).toMatchObject({ length: 11, primaryColor: '#ff00aa' });
  });

  it('a new edit after an undo discards the redo branch', () => {
    const { result } = setup(base({ length: 4 }));
    act(() => result.current.history.handleChange({ length: 8 }));
    act(() => result.current.history.undo());
    expect(result.current.history.canRedo).toBe(true);

    act(() => result.current.history.handleChange({ length: 20 }));
    expect(result.current.history.canRedo).toBe(false);
    expect(result.current.config.length).toBe(20);
  });

  it('collapses a slider drag on one field into a single undo step', () => {
    const { result } = setup(base({ length: 4 }));
    // One pointer drag produces many patches for the same field.
    for (const length of [5, 6, 7, 8, 9]) {
      act(() => result.current.history.handleChange({ length }));
    }
    expect(result.current.config.length).toBe(9);
    expect(result.current.history.undoDepth).toBe(1);

    act(() => result.current.history.undo());
    expect(result.current.config.length).toBe(4);
  });

  it('does not collapse edits that touch different fields', () => {
    const { result } = setup();
    act(() => result.current.history.handleChange({ length: 5 }));
    act(() => result.current.history.handleChange({ thickness: 5 }));
    expect(result.current.history.undoDepth).toBe(2);
  });

  it('starts a new group once the coalescing window has passed', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    const { result } = setup(base({ length: 4 }));

    act(() => result.current.history.handleChange({ length: 5 }));
    act(() => result.current.history.handleChange({ length: 6 }));
    expect(result.current.history.undoDepth).toBe(1);

    act(() => {
      vi.advanceTimersByTime(1200);
    });
    act(() => result.current.history.handleChange({ length: 7 }));
    expect(result.current.history.undoDepth).toBe(2);
  });

  it('treats an externally loaded crosshair as a new document, not an edit', () => {
    const { result } = setup(base({ id: 'a', length: 4 }));
    act(() => result.current.history.handleChange({ length: 9 }));
    expect(result.current.history.canUndo).toBe(true);

    // The user picked a different crosshair from the vault.
    act(() => result.current.setConfig(base({ id: 'b', length: 6, primaryColor: '#ff0000' })));
    expect(result.current.config.id).toBe('b');
    expect(result.current.history.canUndo).toBe(false);
    expect(result.current.history.canRedo).toBe(false);
  });

  it('does not clear history when the change came from the editor itself', () => {
    const { result } = setup(base({ length: 4 }));
    act(() => result.current.history.handleChange({ length: 9 }));
    expect(result.current.history.canUndo).toBe(true);

    // Re-rendering with the same resulting config must not look external.
    act(() => result.current.setConfig(base({ length: 9 })));
    expect(result.current.history.canUndo).toBe(true);
  });

  it('recognises its own change even when per-arm maps are new objects', () => {
    const { result } = setup(base({ length: 4 }));
    act(() =>
      result.current.history.handleChange({
        asymmetricArms: true,
        armLength: { top: 4, bottom: 4, left: 4, right: 4 },
      }),
    );
    expect(result.current.history.canUndo).toBe(true);

    act(() =>
      result.current.setConfig(
        base({
          length: 4,
          asymmetricArms: true,
          armLength: { top: 4, bottom: 4, left: 4, right: 4 },
        }),
      ),
    );
    expect(result.current.history.canUndo).toBe(true);
  });

  it('caps the retained history at the configured limit', () => {
    const { result } = setup(base(), { limit: 5, coalesceMs: 0 });
    for (let i = 1; i <= 12; i++) {
      act(() => result.current.history.handleChange({ length: i }));
    }
    expect(result.current.history.undoDepth).toBe(5);
  });

  it('reset() drops all history', () => {
    const { result } = setup();
    act(() => result.current.history.handleChange({ length: 9 }));
    act(() => result.current.history.reset());
    expect(result.current.history.canUndo).toBe(false);
    expect(result.current.history.canRedo).toBe(false);
  });

  it('undo and redo are no-ops when there is nothing to do', () => {
    const { result } = setup(base({ length: 4 }));
    act(() => result.current.history.undo());
    act(() => result.current.history.redo());
    expect(result.current.config.length).toBe(4);
  });
});

/* ------------------------------------------------------------------ *
 * ColorField
 * ------------------------------------------------------------------ */

describe('ColorField', () => {
  it('shows the label and the current hex value', () => {
    render(<ColorHarness initial="#00ffcc" />);
    expect(screen.getByText('Reticle Color')).toBeTruthy();
    expect(screen.getByLabelText('Reticle Color hex value')).toHaveProperty('value', '00ffcc');
  });

  it('commits a typed hex on blur', () => {
    const onCommit = vi.fn();
    render(<ColorHarness onCommit={onCommit} />);
    const input = screen.getByLabelText('Reticle Color hex value');
    fireEvent.change(input, { target: { value: 'ff00aa' } });
    expect(onCommit).not.toHaveBeenCalled(); // not while typing
    fireEvent.blur(input);
    expect(onCommit).toHaveBeenLastCalledWith({ primaryColor: '#ff00aa' });
  });

  it('commits on Enter and accepts a leading hash', () => {
    const onCommit = vi.fn();
    render(<ColorHarness onCommit={onCommit} />);
    const input = screen.getByLabelText('Reticle Color hex value');
    fireEvent.change(input, { target: { value: '#ff3333' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onCommit).toHaveBeenLastCalledWith({ primaryColor: '#ff3333' });
  });

  it('accepts upper-case hex from a design tool and canonicalises it', () => {
    const onCommit = vi.fn();
    render(<ColorHarness onCommit={onCommit} />);
    const input = screen.getByLabelText('Reticle Color hex value');
    fireEvent.change(input, { target: { value: '00FFCC' } });
    fireEvent.blur(input);
    expect(onCommit).toHaveBeenLastCalledWith({ primaryColor: '#00ffcc' });
  });

  it('accepts shorthand hex and expands it', () => {
    const onCommit = vi.fn();
    render(<ColorHarness onCommit={onCommit} />);
    const input = screen.getByLabelText('Reticle Color hex value');
    fireEvent.change(input, { target: { value: 'f0a' } });
    fireEvent.blur(input);
    expect(onCommit).toHaveBeenLastCalledWith({ primaryColor: '#ff00aa' });
  });

  it('accepts a pasted rgb() string', () => {
    const onCommit = vi.fn();
    render(<ColorHarness onCommit={onCommit} />);
    const input = screen.getByLabelText('Reticle Color hex value');
    fireEvent.change(input, { target: { value: 'rgb(255, 51, 51)' } });
    fireEvent.blur(input);
    expect(onCommit).toHaveBeenLastCalledWith({ primaryColor: '#ff3333' });
  });

  it('rejects nonsense with a helpful message and leaves the config alone', () => {
    const onCommit = vi.fn();
    render(<ColorHarness initial="#00ffcc" onCommit={onCommit} />);
    const input = screen.getByLabelText('Reticle Color hex value');
    fireEvent.change(input, { target: { value: 'banana' } });
    fireEvent.blur(input);

    expect(onCommit).not.toHaveBeenCalled();
    expect(screen.getByText(/Not a colour/i)).toBeTruthy();
    expect(screen.getByText(/rgb\(0, 255, 204\)/i)).toBeTruthy();
  });

  it('Escape abandons the draft and restores the committed value', () => {
    render(<ColorHarness initial="#00ffcc" />);
    const input = screen.getByLabelText('Reticle Color hex value');
    fireEvent.change(input, { target: { value: 'banana' } });
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(input).toHaveProperty('value', '00ffcc');
  });

  it('clears the error once the user starts typing again', () => {
    render(<ColorHarness />);
    const input = screen.getByLabelText('Reticle Color hex value');
    fireEvent.change(input, { target: { value: 'zz' } });
    fireEvent.blur(input);
    expect(screen.getByText(/Not a colour/i)).toBeTruthy();
    fireEvent.change(input, { target: { value: 'ff' } });
    expect(screen.queryByText(/Not a colour/i)).toBeNull();
  });

  it('the system picker commits and records the colour as recent', () => {
    render(<ColorHarness />);
    fireEvent.change(screen.getByLabelText('Reticle Color colour picker'), {
      target: { value: '#ff8800' },
    });
    expect(loadSwatches().recent).toContain('#ff8800');
  });

  it('hides the advanced controls until they are asked for', () => {
    render(<ColorHarness />);
    expect(screen.queryByText('RGB channels')).toBeNull();
    expect(screen.queryByText('Colour presets')).toBeNull();

    fireEvent.click(screen.getByLabelText('Show advanced colour controls for Reticle Color'));
    expect(screen.getByText('RGB channels')).toBeTruthy();
    expect(screen.getByText('Colour presets')).toBeTruthy();
    expect(screen.getByLabelText('Hide advanced colour controls for Reticle Color')).toBeTruthy();
  });

  it('edits the three RGB channels and reports the value in hex and HSL', () => {
    const onCommit = vi.fn();
    render(<ColorHarness initial="#000000" onCommit={onCommit} />);
    fireEvent.click(screen.getByLabelText('Show advanced colour controls for Reticle Color'));

    fireEvent.change(screen.getByLabelText('Reticle Color R channel'), { target: { value: '255' } });
    expect(onCommit).toHaveBeenLastCalledWith({ primaryColor: '#ff0000' });
    fireEvent.change(screen.getByLabelText('Reticle Color G channel'), { target: { value: '128' } });
    expect(onCommit).toHaveBeenLastCalledWith({ primaryColor: '#ff8000' });

    expect(screen.getByText(/hsl\(/)).toBeTruthy();
    expect(screen.getByText(/Red #ff0000|Orange/)).toBeTruthy();
  });

  it('clamps an out-of-range RGB channel instead of wrapping', () => {
    const onCommit = vi.fn();
    render(<ColorHarness initial="#000000" onCommit={onCommit} />);
    fireEvent.click(screen.getByLabelText('Show advanced colour controls for Reticle Color'));
    fireEvent.change(screen.getByLabelText('Reticle Color R channel'), { target: { value: '999' } });
    expect(onCommit).toHaveBeenLastCalledWith({ primaryColor: '#ff0000' });
  });

  it('clicking a colour preset commits it', () => {
    const onCommit = vi.fn();
    render(<ColorHarness onCommit={onCommit} />);
    fireEvent.click(screen.getByLabelText('Show advanced colour controls for Reticle Color'));
    fireEvent.click(screen.getByLabelText('Yellow (#ffff00)'));
    expect(onCommit).toHaveBeenLastCalledWith({ primaryColor: '#ffff00' });
  });

  it('marks the preset that matches the current colour', () => {
    render(<ColorHarness initial="#ffff00" />);
    fireEvent.click(screen.getByLabelText('Show advanced colour controls for Reticle Color'));
    expect(screen.getByLabelText('Yellow (#ffff00)').getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByLabelText('Cyan (#00ffff)').getAttribute('aria-pressed')).toBe('false');
  });

  it('saves the current colour and keeps it across a remount', () => {
    const { unmount } = render(<ColorHarness initial="#12ab34" />);
    fireEvent.click(screen.getByLabelText('Show advanced colour controls for Reticle Color'));
    expect(screen.getByText(/Nothing saved yet/i)).toBeTruthy();

    fireEvent.click(screen.getByLabelText('Save #12ab34 to your colours'));
    expect(loadSwatches().saved).toEqual(['#12ab34']);
    unmount();

    // A different field, in a different part of the editor, sees the same list.
    render(<ColorHarness initial="#ffffff" />);
    fireEvent.click(screen.getByLabelText('Show advanced colour controls for Reticle Color'));
    expect(screen.getByLabelText('Saved colour #12ab34')).toBeTruthy();
  });

  it('reuses a saved colour and can remove it', () => {
    const onCommit = vi.fn();
    render(<ColorHarness initial="#ffffff" onCommit={onCommit} />);
    fireEvent.click(screen.getByLabelText('Show advanced colour controls for Reticle Color'));
    fireEvent.click(screen.getByLabelText('Save #ffffff to your colours'));

    fireEvent.change(screen.getByLabelText('Reticle Color colour picker'), {
      target: { value: '#000000' },
    });
    fireEvent.click(screen.getByLabelText('Saved colour #ffffff'));
    expect(onCommit).toHaveBeenLastCalledWith({ primaryColor: '#ffffff' });

    fireEvent.click(screen.getByLabelText('Remove saved colour #ffffff'));
    expect(loadSwatches().saved).toEqual([]);
  });

  it('shows recently used colours and lets one be reused', () => {
    const onCommit = vi.fn();
    render(<ColorHarness initial="#ffffff" onCommit={onCommit} />);
    fireEvent.click(screen.getByLabelText('Show advanced colour controls for Reticle Color'));
    expect(screen.queryByText('Recent')).toBeNull();

    fireEvent.change(screen.getByLabelText('Reticle Color colour picker'), {
      target: { value: '#00ffcc' },
    });
    expect(screen.getByText('Recent')).toBeTruthy();
    fireEvent.click(screen.getByLabelText('Recent colour #00ffcc'));
    expect(onCommit).toHaveBeenLastCalledWith({ primaryColor: '#00ffcc' });
  });

  it('adjusts opacity from the slider and the percent box together', () => {
    render(<ColorHarness opacity={1} />);
    const slider = screen.getByLabelText('Reticle Color opacity');
    const box = screen.getByLabelText('Reticle Color opacity percent');

    fireEvent.change(slider, { target: { value: '55' } });
    expect(box).toHaveProperty('value', '55');

    fireEvent.change(box, { target: { value: '20' } });
    expect(slider).toHaveProperty('value', '20');
  });

  it('clamps opacity to 0–100%', () => {
    render(<ColorHarness opacity={1} />);
    fireEvent.change(screen.getByLabelText('Reticle Color opacity percent'), {
      target: { value: '400' },
    });
    expect(screen.getByLabelText('Reticle Color opacity')).toHaveProperty('value', '100');
  });

  it('omits the opacity control when the caller does not supply one', () => {
    render(<ColorHarness />);
    expect(screen.queryByLabelText('Reticle Color opacity')).toBeNull();
  });

  it('follows an external value change, such as undo', () => {
    const { rerender } = render(<ColorField label="C" value="#00ffcc" onChange={() => {}} />);
    expect(screen.getByLabelText('C hex value')).toHaveProperty('value', '00ffcc');
    rerender(<ColorField label="C" value="#ff00aa" onChange={() => {}} />);
    expect(screen.getByLabelText('C hex value')).toHaveProperty('value', 'ff00aa');
  });
});

/* ------------------------------------------------------------------ *
 * ArmGeometryPanel — independent per-direction dimensions
 * ------------------------------------------------------------------ */

describe('ArmGeometryPanel', () => {
  it('lists all four directions with their screen axes', () => {
    render(<ArmHarness />);
    for (const label of ['Top', 'Bottom', 'Left', 'Right']) {
      expect(screen.getByRole('button', { name: `${label} arm` })).toBeTruthy();
    }
    expect(screen.getByText('Y−')).toBeTruthy();
    expect(screen.getByText('X+')).toBeTruthy();
  });

  it('toggles a direction off and on', () => {
    render(<ArmHarness />);
    const top = screen.getByRole('button', { name: 'Top arm' });
    expect(top.getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(top);
    expect(readConfig().hasTopArm).toBe(false);
    expect(top.getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(top);
    expect(readConfig().hasTopArm).toBe(true);
  });

  it('starts in symmetric mode: every arm uses the global length and thickness', () => {
    render(<ArmHarness initial={{ length: 6, thickness: 2 }} />);
    const arms = readArms();
    for (const dir of ['top', 'bottom', 'left', 'right']) {
      expect(arms[dir]).toEqual({ length: 6, thickness: 2 });
    }
    expect(screen.getByRole('switch', { name: 'Independent arm dimensions' }).getAttribute('aria-checked')).toBe('false');
  });

  it('does not expose per-arm inputs until independent mode is on', () => {
    render(<ArmHarness />);
    expect(screen.queryByLabelText('Length')).toBeNull();
    fireEvent.click(screen.getByRole('switch', { name: 'Independent arm dimensions' }));
    expect(screen.getAllByLabelText('Length')).toHaveLength(4);
  });

  it('seeds the per-arm values from the globals when enabled, so nothing jumps', () => {
    render(<ArmHarness initial={{ length: 7, thickness: 3 }} />);
    fireEvent.click(screen.getByRole('switch', { name: 'Independent arm dimensions' }));
    const config = readConfig();
    expect(config.armLength).toEqual({ top: 7, bottom: 7, left: 7, right: 7 });
    expect(config.armThickness).toEqual({ top: 3, bottom: 3, left: 3, right: 3 });
    for (const dir of ['top', 'bottom', 'left', 'right']) {
      expect(readArms()[dir]).toEqual({ length: 7, thickness: 3 });
    }
  });

  it('builds the asymmetric shape from the brief: top 8, bottom 12, left 8, right 12', () => {
    render(<ArmHarness initial={{ length: 8, thickness: 2 }} />);
    fireEvent.click(screen.getByRole('switch', { name: 'Independent arm dimensions' }));

    const lengths = screen.getAllByLabelText('Length');
    // Order follows ARM_DIRECTIONS: top, bottom, left, right.
    fireEvent.change(lengths[0], { target: { value: '8' } });
    fireEvent.change(lengths[1], { target: { value: '12' } });
    fireEvent.change(lengths[2], { target: { value: '8' } });
    fireEvent.change(lengths[3], { target: { value: '12' } });

    const arms = readArms();
    expect(arms.top).toEqual({ length: 8, thickness: 2 });
    expect(arms.bottom).toEqual({ length: 12, thickness: 2 });
    expect(arms.left).toEqual({ length: 8, thickness: 2 });
    expect(arms.right).toEqual({ length: 12, thickness: 2 });
  });

  it('changes one direction without disturbing the others', () => {
    render(<ArmHarness initial={{ asymmetricArms: true, length: 5, thickness: 2 }} />);
    fireEvent.change(screen.getAllByLabelText('Thickness')[2], { target: { value: '6' } });
    const arms = readArms();
    expect(arms.left.thickness).toBe(6);
    expect(arms.top.thickness).toBe(2);
    expect(arms.bottom.thickness).toBe(2);
    expect(arms.right.thickness).toBe(2);
  });

  it('"Apply to all" copies one direction to the other three', () => {
    render(<ArmHarness initial={{ asymmetricArms: true, length: 5, thickness: 2 }} />);
    fireEvent.change(screen.getAllByLabelText('Length')[1], { target: { value: '14' } });
    // One "Apply to all" per direction, in ARM_DIRECTIONS order.
    fireEvent.click(screen.getAllByText('Apply to all')[1]);
    const arms = readArms();
    expect(arms.top.length).toBe(14);
    expect(arms.left.length).toBe(14);
    expect(arms.right.length).toBe(14);
    expect(arms.bottom.length).toBe(14);
  });

  it('resets all four directions back to the global values', () => {
    render(
      <ArmHarness
        initial={{ asymmetricArms: true, length: 5, thickness: 2, armLength: { top: 20, bottom: 1, left: 9, right: 3 } }}
      />,
    );
    fireEvent.click(screen.getByText(/Reset all four to the global length and thickness/));
    const arms = readArms();
    for (const dir of ['top', 'bottom', 'left', 'right']) {
      expect(arms[dir].length).toBe(5);
    }
  });

  it('turning independent mode off keeps the stored values but stops using them', () => {
    render(
      <ArmHarness
        initial={{ asymmetricArms: true, length: 5, thickness: 2, armLength: { top: 20, bottom: 1, left: 9, right: 3 } }}
      />,
    );
    expect(readArms().top.length).toBe(20);

    fireEvent.click(screen.getByRole('switch', { name: 'Independent arm dimensions' }));
    const config = readConfig();
    expect(config.asymmetricArms).toBe(false);
    expect(config.armLength).toEqual({ top: 20, bottom: 1, left: 9, right: 3 }); // not discarded

    // Everything falls back to the global length while the mode is off.
    for (const dir of ['top', 'bottom', 'left', 'right']) {
      expect(readArms()[dir].length).toBe(5);
    }

    // ...and flipping it back on restores the work.
    fireEvent.click(screen.getByRole('switch', { name: 'Independent arm dimensions' }));
    expect(readArms().top.length).toBe(20);
    expect(readArms().bottom.length).toBe(1);
  });

  it('disables the dimensions of a direction that is switched off', () => {
    render(<ArmHarness initial={{ asymmetricArms: true, hasTopArm: false }} />);
    // Dimming alone would leave these editable by keyboard, so the inputs
    // themselves must be disabled.
    expect(screen.getAllByLabelText('Length')[0]).toHaveProperty('disabled', true);
    expect(screen.getAllByLabelText('Length slider')[0]).toHaveProperty('disabled', true);
    expect(screen.getAllByLabelText('Thickness')[0]).toHaveProperty('disabled', true);
    // A direction that is on stays editable.
    expect(screen.getAllByLabelText('Length')[1]).toHaveProperty('disabled', false);
  });
});

/* ------------------------------------------------------------------ *
 * DesignerTabbedView — the shell users actually see
 * ------------------------------------------------------------------ */

describe('DesignerTabbedView', () => {
  let writeText: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
      writable: true,
    });
  });

  function renderDesigner(
    initial = base(),
    handlers: { onChange?: (p: Partial<CrosshairConfig>) => void; onSavePreset?: (n: string) => void } = {},
  ) {
    const emitted: Array<Partial<CrosshairConfig>> = [];
    function Host() {
      const [config, setConfig] = useState(initial);
      return (
        <DesignerTabbedView
          config={config}
          onChange={(patch) => {
            emitted.push(patch);
            handlers.onChange?.(patch);
            setConfig((c) => ({ ...c, ...patch }));
          }}
          onSavePreset={handlers.onSavePreset ?? (() => {})}
        />
      );
    }
    const view = render(<Host />);
    return { ...view, emitted };
  }

  it('renders the crosshair name, the inspector and the live preview', () => {
    renderDesigner(base({ name: 'Viper Fang' }));
    expect(screen.getByText('Viper Fang')).toBeTruthy();
    expect(screen.getByText('Live preview')).toBeTruthy();
    // The inspector is the real ReticleControls, not a second copy of the sliders.
    expect(screen.getByText('Arm Parameters')).toBeTruthy();
  });

  it('the preview renders an SVG reticle through the shared renderer', () => {
    const { container } = renderDesigner();
    const stage = screen.getByText('Live preview').closest('div')?.parentElement;
    expect(stage?.querySelector('svg')).toBeTruthy();
    expect(container.querySelectorAll('svg').length).toBeGreaterThan(1);
  });

  it('undo and redo buttons start disabled and enable after an edit', () => {
    renderDesigner();
    const undo = screen.getByLabelText('Undo');
    const redo = screen.getByLabelText('Redo');
    expect(undo.hasAttribute('disabled')).toBe(true);
    expect(redo.hasAttribute('disabled')).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: /Top line/ }));
    expect(undo.hasAttribute('disabled')).toBe(false);
  });

  it('the undo button restores the previous state', () => {
    const { emitted } = renderDesigner(base({ length: 4 }));
    fireEvent.click(screen.getByRole('button', { name: /Top line/ }));
    expect(emitted.at(-1)).toMatchObject({ hasTopArm: false });

    fireEvent.click(screen.getByLabelText('Undo'));
    expect(emitted.at(-1)).toMatchObject({ hasTopArm: true });

    fireEvent.click(screen.getByLabelText('Redo'));
    expect(emitted.at(-1)).toMatchObject({ hasTopArm: false });
  });

  it('Ctrl+Z undoes and Ctrl+Shift+Z redoes', () => {
    const { emitted } = renderDesigner();
    fireEvent.click(screen.getByRole('button', { name: /Centre dot/ }));
    const before = emitted.length;

    fireEvent.keyDown(window, { key: 'z', ctrlKey: true });
    expect(emitted.length).toBe(before + 1);

    fireEvent.keyDown(window, { key: 'z', ctrlKey: true, shiftKey: true });
    expect(emitted.length).toBe(before + 2);
  });

  it('Ctrl+Y also redoes, matching the Windows convention', () => {
    const { emitted } = renderDesigner();
    fireEvent.click(screen.getByRole('button', { name: /Glow/ }));
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true });
    const afterUndo = emitted.length;
    fireEvent.keyDown(window, { key: 'y', ctrlKey: true });
    expect(emitted.length).toBe(afterUndo + 1);
  });

  it('a bare Z without a modifier does not undo', () => {
    const { emitted } = renderDesigner();
    fireEvent.click(screen.getByRole('button', { name: /Glow/ }));
    const before = emitted.length;
    fireEvent.keyDown(window, { key: 'z' });
    expect(emitted.length).toBe(before);
  });

  it('Ctrl+Z inside a text field does native undo, not crosshair undo', () => {
    const { emitted } = renderDesigner();
    fireEvent.click(screen.getByRole('button', { name: /Glow/ }));
    const before = emitted.length;

    // The most common place a user is typing: the crosshair name.
    fireEvent.click(screen.getByLabelText('Rename crosshair'));
    const nameField = screen.getByLabelText('Crosshair name');
    fireEvent.keyDown(nameField, { key: 'z', ctrlKey: true });
    expect(emitted.length).toBe(before);

    // And the hex field, once the colour tab is open.
    fireEvent.click(screen.getByRole('button', { name: /Optics|Color/i }));
    fireEvent.keyDown(screen.getByLabelText('Reticle Emission Color hex value'), {
      key: 'z',
      ctrlKey: true,
    });
    expect(emitted.length).toBe(before);
  });

  it('lists every component the renderer can switch, with the live count', () => {
    renderDesigner(
      base({
        hasTopArm: true,
        hasBottomArm: true,
        hasLeftArm: false,
        hasRightArm: false,
        centerDotEnabled: true,
        outlineEnabled: false,
        circleEnabled: false,
        glowEnabled: false,
      }),
    );
    expect(screen.getByText('Components')).toBeTruthy();
    expect(screen.getByText('3/9 on')).toBeTruthy();
    for (const label of [
      'Top line',
      'Bottom line',
      'Left line',
      'Right line',
      'Centre dot',
      'Outer outline',
      'Inner outline',
      'Spread ring',
      'Glow',
    ]) {
      expect(screen.getByRole('button', { name: new RegExp(label) })).toBeTruthy();
    }
  });

  it('component rows write the real config field', () => {
    const { emitted } = renderDesigner();
    fireEvent.click(screen.getByRole('button', { name: /Inner outline/ }));
    expect(emitted.at(-1)).toMatchObject({ innerOutlineEnabled: true });
    fireEvent.click(screen.getByRole('button', { name: /Spread ring/ }));
    expect(emitted.at(-1)).toMatchObject({ circleEnabled: !DEFAULT_CONFIG.circleEnabled });
  });

  it('disables a component row that cannot apply to the current style', () => {
    renderDesigner(base({ topology: 'dot' }));
    const outline = screen.getByRole('button', { name: /Outer outline/ });
    expect(outline.hasAttribute('disabled')).toBe(true);
    expect(outline.getAttribute('title')).toMatch(/does not apply to the dot style/);
  });

  it('reset asks for confirmation before touching anything', () => {
    const { emitted } = renderDesigner(base({ length: 11 }));
    fireEvent.click(screen.getByLabelText('Reset all parameters'));
    expect(emitted).toHaveLength(0);
    expect(screen.getByRole('alertdialog')).toBeTruthy();
    expect(screen.getByText(/Reset every parameter/)).toBeTruthy();
    expect(screen.getByText(/crshhx default crosshair/)).toBeTruthy();
  });

  it('reset can be cancelled', () => {
    const { emitted } = renderDesigner();
    fireEvent.click(screen.getByLabelText('Reset all parameters'));
    fireEvent.click(screen.getByLabelText('Cancel reset'));
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(emitted).toHaveLength(0);
  });

  it('reset restores defaults but keeps the id, name and game', () => {
    const { emitted } = renderDesigner(
      base({ id: 'custom-1', name: 'My Crosshair', game: 'valorant', length: 11, thickness: 9 }),
    );
    fireEvent.click(screen.getByLabelText('Reset all parameters'));
    fireEvent.click(screen.getByText('Reset parameters'));

    const patch = emitted.at(-1) as CrosshairConfig;
    expect(patch.id).toBe('custom-1');
    expect(patch.name).toBe('My Crosshair');
    expect(patch.game).toBe('valorant');
    expect(patch.length).toBe(DEFAULT_CONFIG.length);
    expect(patch.thickness).toBe(DEFAULT_CONFIG.thickness);
  });

  it('a reset also clears the schema-v2 fields, not just the original ones', () => {
    const { emitted } = renderDesigner(
      base({
        length: 11,
        rotation: 45,
        scale: 2,
        asymmetricArms: true,
        armLength: { top: 20, bottom: 1, left: 9, right: 3 },
        innerOutlineEnabled: true,
        innerOutlineThickness: 3,
      }),
    );
    fireEvent.click(screen.getByLabelText('Reset all parameters'));
    fireEvent.click(screen.getByText('Reset parameters'));

    const patch = emitted.at(-1) as CrosshairConfig;
    expect(patch.rotation).toBe(0);
    expect(patch.scale).toBe(1);
    expect(patch.asymmetricArms).toBe(false);
    expect(patch.innerOutlineEnabled).toBe(false);
    expect(patch.innerOutlineThickness).toBe(DEFAULT_CONFIG.innerOutlineThickness);
    // The per-arm maps are cleared rather than left behind to reappear later.
    expect('armLength' in patch).toBe(true);
    expect(patch.armLength).toBeUndefined();
  });

  it('a reset is undoable', () => {
    const { emitted } = renderDesigner(base({ length: 11 }));
    fireEvent.click(screen.getByLabelText('Reset all parameters'));
    fireEvent.click(screen.getByText('Reset parameters'));
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true });
    expect(emitted.at(-1)).toMatchObject({ length: 11 });
  });

  it('Save passes the current name and Duplicate adds a copy suffix', () => {
    const onSavePreset = vi.fn();
    renderDesigner(base({ name: 'Anchor' }), { onSavePreset });

    fireEvent.click(screen.getByText('Save'));
    expect(onSavePreset).toHaveBeenLastCalledWith('Anchor');

    fireEvent.click(screen.getByLabelText('Save a copy as a new preset'));
    expect(onSavePreset).toHaveBeenLastCalledWith('Anchor (Copy)');
  });

  it('Copy JSON puts the config on the clipboard and confirms without a dialog', async () => {
    const alert = vi.spyOn(window, 'alert').mockImplementation(() => {});
    renderDesigner(base({ name: 'Anchor' }));
    fireEvent.click(screen.getByText('Copy JSON'));

    expect(writeText).toHaveBeenCalledOnce();
    const copied = JSON.parse(writeText.mock.calls[0][0] as string);
    expect(copied.name).toBe('Anchor');
    expect(await screen.findByText('Copied')).toBeTruthy();
    expect(alert).not.toHaveBeenCalled();
    alert.mockRestore();
  });

  it('falls back to a prompt when clipboard access is denied', async () => {
    writeText.mockRejectedValueOnce(new Error('denied'));
    const prompt = vi.spyOn(window, 'prompt').mockReturnValue(null);
    renderDesigner();
    fireEvent.click(screen.getByText('Copy JSON'));
    await waitFor(() => expect(prompt).toHaveBeenCalledOnce());
    prompt.mockRestore();
  });

  it('renaming commits through history so it can be undone', () => {
    const { emitted } = renderDesigner(base({ name: 'Old Name' }));
    fireEvent.click(screen.getByLabelText('Rename crosshair'));
    const field = screen.getByLabelText('Crosshair name');
    fireEvent.change(field, { target: { value: 'New Name' } });
    fireEvent.submit(field.closest('form')!);
    expect(emitted.at(-1)).toMatchObject({ name: 'New Name' });

    fireEvent.keyDown(window, { key: 'z', ctrlKey: true });
    expect(emitted.at(-1)).toMatchObject({ name: 'Old Name' });
  });

  it('a blank rename is rejected and the old name stays', () => {
    const { emitted } = renderDesigner(base({ name: 'Anchor' }));
    fireEvent.click(screen.getByLabelText('Rename crosshair'));
    const field = screen.getByLabelText('Crosshair name');
    fireEvent.change(field, { target: { value: '   ' } });
    fireEvent.submit(field.closest('form')!);

    expect(emitted).toHaveLength(0);
    // The editor closed without applying it, and the header still shows the
    // real name rather than a blank one.
    expect(screen.queryByLabelText('Crosshair name')).toBeNull();
    expect(screen.getByText('Anchor')).toBeTruthy();
  });

  it('a rename to the same name is not recorded as an edit', () => {
    const { emitted } = renderDesigner(base({ name: 'Anchor' }));
    fireEvent.click(screen.getByLabelText('Rename crosshair'));
    fireEvent.submit(screen.getByLabelText('Crosshair name').closest('form')!);
    expect(emitted).toHaveLength(0);
  });

  it('zoom buttons select a preview magnification', () => {
    renderDesigner();
    expect(screen.getByLabelText('Zoom 2 times').getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(screen.getByLabelText('Zoom 8 times'));
    expect(screen.getByLabelText('Zoom 8 times').getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByLabelText('Zoom 2 times').getAttribute('aria-pressed')).toBe('false');
  });

  it('every shipped preview background can be selected', () => {
    renderDesigner();
    expect(BACKDROP_OPTIONS.length).toBeGreaterThanOrEqual(5);
    const buttons = BACKDROP_OPTIONS.map((option) => screen.getByRole('button', { name: option.name }));

    // The first backdrop is selected on arrival.
    expect(buttons[0].getAttribute('aria-pressed')).toBe('true');

    fireEvent.click(buttons[2]);
    expect(buttons[2].getAttribute('aria-pressed')).toBe('true');
    expect(buttons[0].getAttribute('aria-pressed')).toBe('false');
    expect(buttons[2].getAttribute('title')).toMatch(BACKDROP_OPTIONS[2].category);
  });

  it('simulating a shot and ADS leaves nothing stuck when the pointer leaves', () => {
    const { container } = renderDesigner();
    const stage = container.querySelector('.cursor-crosshair') as HTMLElement;
    expect(stage).toBeTruthy();

    fireEvent.mouseDown(stage, { button: 0 });
    fireEvent.mouseDown(stage, { button: 2 });
    fireEvent.mouseLeave(stage);
    // No assertion on internal flags is possible from outside; what matters is
    // that the stage survives and still renders the reticle.
    expect(stage.querySelector('svg')).toBeTruthy();
  });

  it('the inspector edits reach the config', () => {
    const { emitted } = renderDesigner(base({ length: 4 }));
    fireEvent.change(screen.getByLabelText('Length'), { target: { value: '13' } });
    expect(emitted.at(-1)).toMatchObject({ length: 13 });
    fireEvent.change(screen.getByLabelText('Center Gap'), { target: { value: '-3' } });
    expect(emitted.at(-1)).toMatchObject({ gap: -3 });
  });

  it('the inspector offers a reset for just the arm parameters', () => {
    const { emitted } = renderDesigner(base({ length: 11, thickness: 7, gap: 9 }));
    fireEvent.click(screen.getByLabelText('Reset length, thickness and gap'));
    expect(emitted.at(-1)).toMatchObject({ length: 4, thickness: 2, gap: 2 });
  });

  it('the inspector cannot offer a value the schema validator would reject', () => {
    renderDesigner();
    // The sliders are driven by the same LIMITS table used to validate on load.
    const length = screen.getByLabelText('Length slider');
    expect(length).toHaveProperty('min', String(LIMITS.length.min));
    expect(length).toHaveProperty('max', String(LIMITS.length.max));
    const gap = screen.getByLabelText('Center Gap slider');
    expect(gap).toHaveProperty('min', String(LIMITS.gap.min));
  });

  it('rotation and scale are editable and reach the config', () => {
    const { emitted } = renderDesigner();
    fireEvent.change(screen.getByLabelText('Rotation degrees'), { target: { value: '45' } });
    expect(emitted.at(-1)).toMatchObject({ rotation: 45 });
    fireEvent.change(screen.getByLabelText('Overall scale'), { target: { value: '1.5' } });
    expect(emitted.at(-1)).toMatchObject({ scale: 1.5 });
  });

  it('the inner outline section is present in the colour tab', () => {
    renderDesigner();
    fireEvent.click(screen.getByRole('button', { name: /Optics|Color/i }));
    expect(screen.getByText('Inner Outline')).toBeTruthy();
    expect(screen.getByLabelText('Enable inner outline')).toBeTruthy();
  });

  it('offers comparison and pins the current crosshair as A', () => {
    renderDesigner(base({ name: 'Anchor', length: 6 }));
    expect(screen.queryByText('A · pinned')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /Compare/ }));
    expect(screen.getByText('Comparing A and B')).toBeTruthy();
    expect(screen.getByText('A · pinned')).toBeTruthy();
    expect(screen.getByText('B · editing')).toBeTruthy();
    expect(screen.getByText(/A and B are identical/)).toBeTruthy();
  });

  it('lists what changed in B once the user edits it', () => {
    renderDesigner(base({ length: 6 }));
    fireEvent.click(screen.getByRole('button', { name: /Compare/ }));

    fireEvent.change(screen.getByLabelText('Length'), { target: { value: '12' } });
    expect(screen.getByText(/4 differences/)).toBeTruthy();
    expect(screen.getByText('Arms')).toBeTruthy();
    expect(diffRow('Top arm length')).toEqual({ a: '6 px', b: '12 px' });
    expect(diffRow('Right arm length')).toEqual({ a: '6 px', b: '12 px' });
    // A field that did not change is not listed.
    expect(screen.queryByText('Centre gap')).toBeNull();
  });

  it('"Set A to current" re-baselines the comparison', () => {
    renderDesigner(base({ length: 6 }));
    fireEvent.click(screen.getByRole('button', { name: /Compare/ }));
    fireEvent.change(screen.getByLabelText('Length'), { target: { value: '12' } });
    expect(screen.getByText(/4 differences/)).toBeTruthy();

    fireEvent.click(screen.getByText('Set A to current'));
    expect(screen.getByText(/A and B are identical/)).toBeTruthy();
  });

  it('"Revert to A" restores the pinned values through history', () => {
    const { emitted } = renderDesigner(base({ length: 6 }));
    fireEvent.click(screen.getByRole('button', { name: /Compare/ }));
    fireEvent.change(screen.getByLabelText('Length'), { target: { value: '12' } });

    fireEvent.click(screen.getByText('Revert to A'));
    expect(emitted.at(-1)).toMatchObject({ length: 6 });

    // ...and the revert is itself undoable, because it is an edit.
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true });
    expect(emitted.at(-1)).toMatchObject({ length: 12 });
  });

  it('stops comparing and returns to the single live preview', () => {
    renderDesigner();
    fireEvent.click(screen.getByRole('button', { name: /Compare/ }));
    fireEvent.click(screen.getByLabelText('Stop comparing'));
    expect(screen.queryByText('Comparing A and B')).toBeNull();
    expect(screen.getByText('Live preview')).toBeTruthy();
  });

  it('drops the pinned variation when a different crosshair is loaded', () => {
    const { rerender } = render(
      <DesignerTabbedView config={base({ id: 'a', name: 'First' })} onChange={() => {}} onSavePreset={() => {}} />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Compare/ }));
    expect(screen.getByText('Comparing A and B')).toBeTruthy();

    rerender(
      <DesignerTabbedView
        config={base({ id: 'b', name: 'Second' })}
        onChange={() => {}}
        onSavePreset={() => {}}
      />,
    );
    expect(screen.queryByText('Comparing A and B')).toBeNull();
    expect(screen.getByText('Live preview')).toBeTruthy();
  });

  it('keeps the pinned variation when the same crosshair is merely edited', () => {
    function Host() {
      const [config, setConfig] = useState(base({ id: 'a', length: 6 }));
      return (
        <DesignerTabbedView
          config={config}
          onChange={(patch) => setConfig((c) => ({ ...c, ...patch }))}
          onSavePreset={() => {}}
        />
      );
    }
    render(<Host />);
    fireEvent.click(screen.getByRole('button', { name: /Compare/ }));
    fireEvent.change(screen.getByLabelText('Length'), { target: { value: '20' } });
    expect(screen.getByText('Comparing A and B')).toBeTruthy();
    expect(diffRow('Top arm length')).toEqual({ a: '6 px', b: '20 px' });
  });

  it('follows an externally loaded crosshair without offering to undo the load', () => {
    const { rerender } = render(
      <DesignerTabbedView config={base({ name: 'First' })} onChange={() => {}} onSavePreset={() => {}} />,
    );
    expect(screen.getByText('First')).toBeTruthy();

    rerender(
      <DesignerTabbedView
        config={base({ id: 'other', name: 'Second', length: 20 })}
        onChange={() => {}}
        onSavePreset={() => {}}
      />,
    );
    expect(screen.getByText('Second')).toBeTruthy();
    expect(screen.getByLabelText('Undo').hasAttribute('disabled')).toBe(true);
  });
});
