import { globalShortcut } from 'electron';
import {
  bindingKey,
  lookupKeyByUiohook,
  lookupModifierCode,
  makeBinding,
  modifiersFromFlags,
  mouseButtonCode,
  toAccelerator,
  toUiohookKeycode,
  WHEEL_DOWN_CODE,
  WHEEL_UP_CODE,
} from '../../src/lib/weaponSlots/keys';
import type {
  InputTransportCapabilities,
  NormalisedInputEvent,
  SlotKeyBinding,
} from '../../src/lib/weaponSlots/types';

/**
 * Global input transports for Weapon Slot Crosshairs.
 *
 * crshhx runs exactly ONE slot-input transport at a time, chosen at start-up in
 * preference order:
 *
 *   1. `PassiveHookTransport` — libuiohook via the optional `uiohook-napi`
 *      native addon. On Windows this installs a `WH_KEYBOARD_LL` hook on its own
 *      thread and *observes* events without removing them from the OS input
 *      stream: the game still receives every key press. It never injects, never
 *      remaps and never calls anything equivalent to `SendInput`. This is the
 *      transport the feature is designed for, and the only one that supports
 *      bare number keys and mouse-wheel/side-button triggers.
 *
 *   2. `AcceleratorTransport` — Electron's `globalShortcut`, the mechanism
 *      crshhx already used for F10/F9. Always available, but it is built on
 *      `RegisterHotKey`/`RegisterEventHotKey`, which **consume** the
 *      combination: the focused application no longer sees it. It is therefore
 *      only permitted to carry bindings that include a modifier (enforced by
 *      `bindingRules.ts`), and the UI says so plainly.
 *
 * Neither transport blocks its callback: handlers do a pure decision and hand
 * the result to the service, which marshals UI work onto Electron's own queues.
 */

export type InputEventHandler = (event: NormalisedInputEvent) => void;

export interface InputTransport {
  readonly id: string;
  readonly capabilities: InputTransportCapabilities;
  /** Installs the listener. Returns false when unavailable on this machine. */
  start(onEvent: InputEventHandler): boolean;
  stop(): void;
  isRunning(): boolean;
  /**
   * Tells the transport which bindings it must listen for. Only meaningful for
   * the accelerator transport; the passive hook sees all input and filters in
   * the policy layer.
   */
  setBindings(bindings: SlotKeyBinding[]): void;
}

/* ------------------------------------------------------------------ *
 * 1. Passive hook (uiohook-napi)
 * ------------------------------------------------------------------ */

interface UiohookKeyboardLike {
  type: number;
  keycode: number;
  altKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
}

interface UiohookMouseLike {
  button: number;
  altKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
}

interface UiohookWheelLike {
  direction: number;
  rotation: number;
  altKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
}

interface UiohookLike {
  start(): void;
  stop(): void;
  on(event: string, listener: (e: never) => void): unknown;
  removeAllListeners?(event?: string): unknown;
}

/** libuiohook event types (see uiohook-napi's `EventType` enum). */
const UIOHOOK_WHEEL_HORIZONTAL = 4;

/**
 * Loads `uiohook-napi` defensively.
 *
 * It is declared in `optionalDependencies` and its prebuilt binaries ship
 * inside the npm tarball (N-API, so they load under Electron's ABI without a
 * rebuild). It can still be absent — `--no-optional` installs, an unsupported
 * platform, or a Linux box without libX11/libXtst. Every one of those must
 * degrade to the accelerator transport instead of crashing crshhx.
 */
function tryLoadUiohook(): UiohookLike | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('uiohook-napi') as { uIOhook?: UiohookLike };
    return mod?.uIOhook ?? null;
  } catch {
    return null;
  }
}

export class PassiveHookTransport implements InputTransport {
  readonly id = 'passive-hook';

  readonly capabilities: InputTransportCapabilities = {
    name: 'Passive Input Hook',
    passiveGlobalKeyboard: true,
    worksWhenUnfocused: true,
    mouseButtons: true,
    mouseWheel: true,
  };

  private hook: UiohookLike | null = null;
  private running = false;
  private listeners: Array<[string, (e: never) => void]> = [];

  start(onEvent: InputEventHandler): boolean {
    if (this.running) return true;

    const hook = tryLoadUiohook();
    if (!hook) return false;

    const emit = (binding: SlotKeyBinding, phase: 'down' | 'up', isRepeat = false) => {
      onEvent({ binding, phase, isRepeat, timestamp: Date.now() });
    };

    const onKeyDown = (raw: never) => {
      const e = raw as unknown as UiohookKeyboardLike;
      const binding = this.keyboardBinding(e);
      // libuiohook does not flag auto-repeat, so the repeat state is
      // reconstructed by KeyRepeatGuard from the down/up pair.
      if (binding) emit(binding, 'down');
    };

    const onKeyUp = (raw: never) => {
      const e = raw as unknown as UiohookKeyboardLike;
      const binding = this.keyboardBinding(e);
      if (binding) emit(binding, 'up');
    };

    const onMouseDown = (raw: never) => {
      const e = raw as unknown as UiohookMouseLike;
      const index = Number(e.button);
      if (!Number.isFinite(index) || index <= 0) return;
      emit(makeBinding(mouseButtonCode(index), modifiersFromFlags(e)), 'down');
    };

    const onMouseUp = (raw: never) => {
      const e = raw as unknown as UiohookMouseLike;
      const index = Number(e.button);
      if (!Number.isFinite(index) || index <= 0) return;
      emit(makeBinding(mouseButtonCode(index), modifiersFromFlags(e)), 'up');
    };

    const onWheel = (raw: never) => {
      const e = raw as unknown as UiohookWheelLike;
      // Only vertical scrolling is meaningful for slot cycling.
      if (e.direction === UIOHOOK_WHEEL_HORIZONTAL) return;
      const up = e.rotation > 0;
      emit(makeBinding(up ? WHEEL_UP_CODE : WHEEL_DOWN_CODE, modifiersFromFlags(e)), 'down');
    };

    try {
      this.attach(hook, 'keydown', onKeyDown);
      this.attach(hook, 'keyup', onKeyUp);
      this.attach(hook, 'mousedown', onMouseDown);
      this.attach(hook, 'mouseup', onMouseUp);
      this.attach(hook, 'wheel', onWheel);
      hook.start();
      this.hook = hook;
      this.running = true;
      return true;
    } catch (err) {
      this.detachAll();
      console.warn('[crshhx] passive input hook failed to start:', err);
      return false;
    }
  }

  stop(): void {
    if (!this.hook) {
      this.running = false;
      return;
    }
    try {
      this.hook.stop();
    } catch (err) {
      console.warn('[crshhx] passive input hook failed to stop cleanly:', err);
    }
    this.detachAll();
    this.hook = null;
    this.running = false;
  }

  isRunning(): boolean {
    return this.running;
  }

  /** The hook observes everything; filtering happens in the policy layer. */
  setBindings(_bindings: SlotKeyBinding[]): void {
    /* no-op by design */
  }

  private attach(hook: UiohookLike, event: string, listener: (e: never) => void): void {
    hook.on(event, listener);
    this.listeners.push([event, listener]);
  }

  private detachAll(): void {
    if (this.hook?.removeAllListeners) {
      for (const [event] of this.listeners) {
        try {
          this.hook.removeAllListeners(event);
        } catch {
          /* best effort */
        }
      }
    }
    this.listeners = [];
  }

  private keyboardBinding(e: UiohookKeyboardLike): SlotKeyBinding | null {
    const asModifier = lookupModifierCode(e.keycode);
    if (asModifier) return makeBinding(asModifier, []);

    const def = lookupKeyByUiohook(e.keycode);
    if (!def) return null;
    return makeBinding(def.code, modifiersFromFlags(e));
  }
}

/* ------------------------------------------------------------------ *
 * 2. Electron globalShortcut (fallback)
 * ------------------------------------------------------------------ */

export class AcceleratorTransport implements InputTransport {
  readonly id = 'accelerator';

  readonly capabilities: InputTransportCapabilities = {
    name: 'OS Hotkeys (fallback)',
    passiveGlobalKeyboard: false,
    worksWhenUnfocused: true,
    mouseButtons: false,
    mouseWheel: false,
    warning:
      'The passive input hook is unavailable on this machine, so crshhx is using OS hotkeys. '
      + 'These capture the combination exclusively — the game will not receive it. '
      + 'Slot keys must include Ctrl or Alt while this transport is active.',
  };

  private registered = new Map<string, string>(); // bindingKey -> accelerator
  private running = false;
  private onEvent: InputEventHandler | null = null;

  start(onEvent: InputEventHandler): boolean {
    this.onEvent = onEvent;
    this.running = true;
    return true;
  }

  stop(): void {
    this.unregisterAll();
    this.running = false;
    this.onEvent = null;
  }

  isRunning(): boolean {
    return this.running;
  }

  setBindings(bindings: SlotKeyBinding[]): void {
    if (!this.running) return;

    const wanted = new Map<string, string>();
    for (const binding of bindings) {
      const accelerator = toAccelerator(binding);
      if (!accelerator) continue; // mouse/wheel cannot be expressed
      wanted.set(bindingKey(binding), accelerator);
    }

    // Drop registrations that are no longer wanted.
    for (const [key, accelerator] of [...this.registered]) {
      if (wanted.has(key)) continue;
      try {
        globalShortcut.unregister(accelerator);
      } catch {
        /* ignore */
      }
      this.registered.delete(key);
    }

    // `globalShortcut` is unavailable if this module is loaded outside a real
    // Electron main process (tests, tooling). Degrade instead of throwing.
    if (!globalShortcut || typeof globalShortcut.register !== 'function') return;

    // Add the new ones.
    for (const binding of bindings) {
      const key = bindingKey(binding);
      const accelerator = wanted.get(key);
      if (!accelerator || this.registered.has(key)) continue;
      try {
        const ok = globalShortcut.register(accelerator, () => {
          // globalShortcut delivers one callback per physical press: no repeat.
          this.onEvent?.({
            binding,
            phase: 'down',
            isRepeat: false,
            timestamp: Date.now(),
          });
          // Synthesise the up-phase so the repeat guard releases the key.
          this.onEvent?.({ binding, phase: 'up', isRepeat: false, timestamp: Date.now() });
        });
        if (ok) this.registered.set(key, accelerator);
        else console.warn(`[crshhx] could not register slot hotkey ${accelerator}`);
      } catch (err) {
        console.warn(`[crshhx] failed to register slot hotkey ${accelerator}:`, err);
      }
    }
  }

  private unregisterAll(): void {
    if (!globalShortcut || typeof globalShortcut.unregister !== 'function') {
      this.registered.clear();
      return;
    }
    for (const accelerator of this.registered.values()) {
      try {
        globalShortcut.unregister(accelerator);
      } catch {
        /* ignore */
      }
    }
    this.registered.clear();
  }
}

/* ------------------------------------------------------------------ *
 * Selection
 * ------------------------------------------------------------------ */

export interface TransportSelection {
  transport: InputTransport;
  /** True when the preferred passive hook could not be used. */
  degraded: boolean;
  reason?: string;
}

/**
 * Chooses and starts the best available transport.
 *
 * Returns the started transport so callers can report honestly in the UI which
 * mode is live. Never throws.
 */
export function startBestTransport(onEvent: InputEventHandler): TransportSelection {
  const passive = new PassiveHookTransport();
  if (passive.start(onEvent)) {
    return { transport: passive, degraded: false };
  }

  const accelerator = new AcceleratorTransport();
  accelerator.start(onEvent);
  return {
    transport: accelerator,
    degraded: true,
    reason:
      'uiohook-napi is not installed or could not start on this system '
      + '(optional dependency; on Linux it also needs libX11/libXtst).',
  };
}
