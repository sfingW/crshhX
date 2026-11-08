import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Keyboard, X } from 'lucide-react';
import {
  formatBinding,
  isModifierCode,
  makeBinding,
  modifiersFromFlags,
  mouseButtonCode,
} from '../../lib/weaponSlots/keys';
import type {
  BindingIssue,
  InputTransportCapabilities,
  SlotKeyBinding,
} from '../../lib/weaponSlots/types';

/**
 * Key capture field for Weapon Slot Crosshairs.
 *
 * Click it, press a key, done. It replaces the previous non-functional capture
 * button in crshhx, which relied on an `onKeyDown` handler attached to a
 * `<button>` — that only fired if the button happened to hold DOM focus, so
 * recording silently did nothing most of the time.
 *
 * This one listens on `window` in the capture phase for as long as recording is
 * active, so it works regardless of focus, and it calls `preventDefault()` so
 * the captured key does not also activate a control or scroll the page.
 *
 * While recording, the parent tells the Electron main process to suspend slot
 * switching — otherwise pressing "1" to bind slot 1 would also fire slot 1.
 */

interface KeyCaptureButtonProps {
  binding: SlotKeyBinding | null;
  onCommit: (binding: SlotKeyBinding | null) => void;
  capabilities: InputTransportCapabilities;
  issues?: BindingIssue[];
  onRecordingChange?: (recording: boolean) => void;
  disabled?: boolean;
  ariaLabel?: string;
}

/**
 * DOM `MouseEvent.button` → libuiohook button index.
 *
 * DOM:  0 left, 1 middle, 2 right, 3 back, 4 forward
 * hook: 1 left, 2 right, 3 middle, 4 back, 5 forward
 *
 * Only the non-primary buttons are offered, since binding a left click would
 * make every shot change the reticle.
 */
const DOM_BUTTON_TO_HOOK_INDEX: Record<number, number> = {
  1: 3, // middle
  3: 4, // side / back
  4: 5, // side / forward
};

export const MOUSE_BUTTON_LABELS: Record<number, string> = {
  3: 'Middle',
  4: 'Side (Back)',
  5: 'Side (Forward)',
};

export const KeyCaptureButton: React.FC<KeyCaptureButtonProps> = ({
  binding,
  onCommit,
  capabilities,
  issues = [],
  onRecordingChange,
  disabled = false,
  ariaLabel,
}) => {
  const [recording, setRecording] = useState(false);
  const recordingRef = useRef(false);

  const blockingIssue = issues.find((i) => i.blocking);
  /**
   * Non-blocking notices that belong *under the key field*: that no key is
   * assigned yet, or that the chosen key is a plain typing key. Preset problems
   * are deliberately excluded — they are explained by the crosshair cell.
   */
  const infoIssue = issues.find(
    (i) => !i.blocking && (i.code === 'typing-critical' || i.code === 'empty'),
  );

  const stop = useCallback(
    (commit?: SlotKeyBinding | null) => {
      if (!recordingRef.current) return;
      recordingRef.current = false;
      setRecording(false);
      onRecordingChange?.(false);
      if (commit !== undefined) onCommit(commit);
    },
    [onCommit, onRecordingChange],
  );

  const start = useCallback(() => {
    if (disabled || recordingRef.current) return;
    recordingRef.current = true;
    setRecording(true);
    onRecordingChange?.(true);
  }, [disabled, onRecordingChange]);

  useEffect(() => {
    if (!recording) return;

    const onKeyDown = (e: KeyboardEvent) => {
      // Own the press: it must not reach a text field or activate a button.
      e.preventDefault();
      e.stopPropagation();

      if (e.code === 'Escape') {
        stop();
        return;
      }
      // A modifier on its own is not a binding — wait for the real key.
      if (isModifierCode(e.code)) return;

      const next = makeBinding(
        e.code,
        modifiersFromFlags({
          ctrlKey: e.ctrlKey,
          altKey: e.altKey,
          shiftKey: e.shiftKey,
          metaKey: e.metaKey,
        }),
      );
      stop(next);
    };

    const onKeyUp = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const onMouseDown = (e: MouseEvent) => {
      if (!capabilities.mouseButtons) return;
      const hookIndex = DOM_BUTTON_TO_HOOK_INDEX[e.button];
      if (hookIndex === undefined) return;
      e.preventDefault();
      e.stopPropagation();
      stop(
        makeBinding(mouseButtonCode(hookIndex), modifiersFromFlags({
          ctrlKey: e.ctrlKey, altKey: e.altKey, shiftKey: e.shiftKey, metaKey: e.metaKey,
        })),
      );
    };

    const onWheel = (e: WheelEvent) => {
      if (!capabilities.mouseWheel) return;
      e.preventDefault();
      e.stopPropagation();
      if (e.deltaY === 0) return;
      stop(
        makeBinding(e.deltaY < 0 ? 'WheelUp' : 'WheelDown', modifiersFromFlags({
          ctrlKey: e.ctrlKey, altKey: e.altKey, shiftKey: e.shiftKey, metaKey: e.metaKey,
        })),
      );
    };

    const onBlur = () => stop();

    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('keyup', onKeyUp, true);
    window.addEventListener('mousedown', onMouseDown, true);
    window.addEventListener('wheel', onWheel, { capture: true, passive: false });
    window.addEventListener('blur', onBlur);

    return () => {
      window.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('keyup', onKeyUp, true);
      window.removeEventListener('mousedown', onMouseDown, true);
      window.removeEventListener('wheel', onWheel, true);
      window.removeEventListener('blur', onBlur);
    };
  }, [recording, capabilities.mouseButtons, capabilities.mouseWheel, stop]);

  // Never leave the switcher suspended if this component unmounts mid-capture.
  useEffect(() => () => {
    if (recordingRef.current) onRecordingChange?.(false);
  }, [onRecordingChange]);

  const label = recording ? 'Press a key…' : formatBinding(binding);

  return (
    <div className="flex flex-col gap-1 min-w-0">
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => (recording ? stop() : start())}
          disabled={disabled}
          aria-label={ariaLabel ?? 'Record activation key'}
          aria-pressed={recording}
          title={
            recording
              ? 'Press the key you want, or Escape to cancel'
              : 'Click, then press the key you want'
          }
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded border font-mono text-[11px] whitespace-nowrap transition-all ${
            disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
          } ${
            recording
              ? 'bg-brand-accentMuted animate-pulse'
              : blockingIssue
                ? 'bg-rose-500/10 hover:bg-rose-500/15'
                : 'bg-surface-card hover:bg-surface-cardHover'
          }`}
          style={{
            borderColor: recording
              ? 'var(--brand-accent)'
              : blockingIssue
                ? 'rgba(244,63,94,0.45)'
                : '#2c2c31',
            color: recording ? 'var(--brand-accent)' : blockingIssue ? '#fda4af' : '#e4e4e7',
          }}
        >
          <Keyboard className="w-3 h-3 shrink-0" />
          <span className={binding || recording ? '' : 'text-zinc-500 italic'}>{label}</span>
        </button>

        {(recording || binding) && !disabled && (
          <button
            type="button"
            onClick={() => (recording ? stop() : onCommit(null))}
            title={recording ? 'Cancel' : 'Clear this key'}
            aria-label={recording ? 'Cancel key capture' : 'Clear key'}
            className="p-1 rounded text-zinc-500 hover:text-rose-400 hover:bg-surface-card transition-colors shrink-0"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {blockingIssue && (
        <span className="text-[10px] leading-snug text-rose-400">
          {blockingIssue.message}
        </span>
      )}
      {!blockingIssue && infoIssue && (
        <span className="text-[10px] leading-snug text-zinc-500">{infoIssue.message}</span>
      )}
    </div>
  );
};
