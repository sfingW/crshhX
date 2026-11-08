import { useCallback, useEffect, useRef, useState } from 'react';
import type { CrosshairConfig } from '../../types/crosshair';

/**
 * Undo / redo history for the crosshair designer.
 *
 * The designer is a *controlled* component: `App` owns the config and the
 * designer reports changes upward as a partial patch. History therefore has to
 * live here rather than in a store, and it has to answer two questions that a
 * naive implementation gets wrong.
 *
 * **1. Which changes are mine?** Selecting a different crosshair from the vault
 * also changes `config`, but it is not an edit and must not be undoable —
 * otherwise Ctrl+Z would appear to "un-select" a preset. Every patch this hook
 * forwards is recorded, and the resulting config is compared against what
 * arrived; anything that did not come from us clears the stack.
 *
 * **2. How do slider drags coalesce?** Dragging a length slider fires dozens of
 * patches. One undo step per event would make undo useless, so consecutive
 * patches touching the *same* fields inside a short window collapse into a
 * single step that returns to where the drag began.
 */

export interface ConfigHistory {
  /** Call this instead of the raw `onChange` for every edit. */
  handleChange: (patch: Partial<CrosshairConfig>) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  /** Drops all history, e.g. when a different crosshair is loaded. */
  reset: () => void;
  undoDepth: number;
  redoDepth: number;
}

interface UseConfigHistoryOptions {
  /** Maximum number of undo steps retained. */
  limit?: number;
  /** Window in which same-field edits collapse into one step. */
  coalesceMs?: number;
}

function shallowEqualConfig(a: CrosshairConfig, b: CrosshairConfig): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of keys) {
    const av = (a as unknown as Record<string, unknown>)[key];
    const bv = (b as unknown as Record<string, unknown>)[key];
    if (av === bv) continue;
    // Per-arm maps are fresh objects on every edit, so compare by value.
    if (isPlainObject(av) && isPlainObject(bv)) {
      const inner = new Set([...Object.keys(av), ...Object.keys(bv)]);
      let same = true;
      for (const k of inner) {
        if ((av as Record<string, unknown>)[k] !== (bv as Record<string, unknown>)[k]) {
          same = false;
          break;
        }
      }
      if (same) continue;
    }
    return false;
  }
  return true;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function useConfigHistory(
  config: CrosshairConfig,
  onChange: (patch: Partial<CrosshairConfig>) => void,
  options: UseConfigHistoryOptions = {},
): ConfigHistory {
  const { limit = 80, coalesceMs = 600 } = options;

  const past = useRef<CrosshairConfig[]>([]);
  const future = useRef<CrosshairConfig[]>([]);
  /** The config we expect to see come back after our own patch. */
  const expected = useRef<CrosshairConfig | null>(null);
  /** The last config we already accounted for, by value. */
  const acknowledged = useRef<CrosshairConfig | null>(null);
  const lastPatchKeys = useRef<string | null>(null);
  const lastPatchAt = useRef(0);

  // Re-render trigger: the stacks live in refs so history updates do not
  // allocate a new array on every slider frame.
  const [, setTick] = useState(0);
  const bump = useCallback(() => setTick((n) => n + 1), []);

  /* An external change (a different crosshair was loaded) clears history. */
  useEffect(() => {
    // Our own patch arriving back from the parent.
    if (expected.current && shallowEqualConfig(config, expected.current)) {
      expected.current = null;
      acknowledged.current = config;
      return;
    }
    expected.current = null;

    // The same document re-created as a new object — a parent re-render, a
    // normalisation pass, a load that produced equal values. Comparing by value
    // rather than reference is what stops this from wiping the undo stack.
    if (acknowledged.current && shallowEqualConfig(config, acknowledged.current)) return;

    acknowledged.current = config;
    if (past.current.length > 0 || future.current.length > 0) {
      past.current = [];
      future.current = [];
      lastPatchKeys.current = null;
      bump();
    }
  }, [config, bump]);

  const handleChange = useCallback(
    (patch: Partial<CrosshairConfig>) => {
      const keys = Object.keys(patch).sort().join(',');
      const now = Date.now();
      const coalesce =
        keys === lastPatchKeys.current && now - lastPatchAt.current < coalesceMs;

      if (!coalesce) {
        past.current = [...past.current.slice(-(limit - 1)), config];
        future.current = [];
      }
      lastPatchKeys.current = keys;
      lastPatchAt.current = now;

      expected.current = { ...config, ...patch };
      onChange(patch);
      bump();
    },
    [config, onChange, limit, coalesceMs, bump],
  );

  const undo = useCallback(() => {
    const previous = past.current[past.current.length - 1];
    if (!previous) return;
    past.current = past.current.slice(0, -1);
    future.current = [...future.current, config];
    lastPatchKeys.current = null; // a new edit after undo starts a fresh group
    expected.current = previous;
    acknowledged.current = null;
    onChange(previous);
    bump();
  }, [config, onChange, bump]);

  const redo = useCallback(() => {
    const next = future.current[future.current.length - 1];
    if (!next) return;
    future.current = future.current.slice(0, -1);
    past.current = [...past.current, config];
    lastPatchKeys.current = null;
    expected.current = next;
    acknowledged.current = null;
    onChange(next);
    bump();
  }, [config, onChange, bump]);

  const reset = useCallback(() => {
    past.current = [];
    future.current = [];
    lastPatchKeys.current = null;
    expected.current = null;
    acknowledged.current = null;
    bump();
  }, [bump]);

  return {
    handleChange,
    undo,
    redo,
    canUndo: past.current.length > 0,
    canRedo: future.current.length > 0,
    reset,
    undoDepth: past.current.length,
    redoDepth: future.current.length,
  };
}
