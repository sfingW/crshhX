"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AcceleratorTransport = exports.PassiveHookTransport = void 0;
exports.startBestTransport = startBestTransport;
const electron_1 = require("electron");
const keys_1 = require("../../src/lib/weaponSlots/keys");
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
function tryLoadUiohook() {
    try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const mod = require('uiohook-napi');
        return mod?.uIOhook ?? null;
    }
    catch {
        return null;
    }
}
class PassiveHookTransport {
    id = 'passive-hook';
    capabilities = {
        name: 'Passive Input Hook',
        passiveGlobalKeyboard: true,
        worksWhenUnfocused: true,
        mouseButtons: true,
        mouseWheel: true,
    };
    hook = null;
    running = false;
    listeners = [];
    start(onEvent) {
        if (this.running)
            return true;
        const hook = tryLoadUiohook();
        if (!hook)
            return false;
        const emit = (binding, phase, isRepeat = false) => {
            onEvent({ binding, phase, isRepeat, timestamp: Date.now() });
        };
        const onKeyDown = (raw) => {
            const e = raw;
            const binding = this.keyboardBinding(e);
            // libuiohook does not flag auto-repeat, so the repeat state is
            // reconstructed by KeyRepeatGuard from the down/up pair.
            if (binding)
                emit(binding, 'down');
        };
        const onKeyUp = (raw) => {
            const e = raw;
            const binding = this.keyboardBinding(e);
            if (binding)
                emit(binding, 'up');
        };
        const onMouseDown = (raw) => {
            const e = raw;
            const index = Number(e.button);
            if (!Number.isFinite(index) || index <= 0)
                return;
            emit((0, keys_1.makeBinding)((0, keys_1.mouseButtonCode)(index), (0, keys_1.modifiersFromFlags)(e)), 'down');
        };
        const onMouseUp = (raw) => {
            const e = raw;
            const index = Number(e.button);
            if (!Number.isFinite(index) || index <= 0)
                return;
            emit((0, keys_1.makeBinding)((0, keys_1.mouseButtonCode)(index), (0, keys_1.modifiersFromFlags)(e)), 'up');
        };
        const onWheel = (raw) => {
            const e = raw;
            // Only vertical scrolling is meaningful for slot cycling.
            if (e.direction === UIOHOOK_WHEEL_HORIZONTAL)
                return;
            const up = e.rotation > 0;
            emit((0, keys_1.makeBinding)(up ? keys_1.WHEEL_UP_CODE : keys_1.WHEEL_DOWN_CODE, (0, keys_1.modifiersFromFlags)(e)), 'down');
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
        }
        catch (err) {
            this.detachAll();
            console.warn('[crshhx] passive input hook failed to start:', err);
            return false;
        }
    }
    stop() {
        if (!this.hook) {
            this.running = false;
            return;
        }
        try {
            this.hook.stop();
        }
        catch (err) {
            console.warn('[crshhx] passive input hook failed to stop cleanly:', err);
        }
        this.detachAll();
        this.hook = null;
        this.running = false;
    }
    isRunning() {
        return this.running;
    }
    /** The hook observes everything; filtering happens in the policy layer. */
    setBindings(_bindings) {
        /* no-op by design */
    }
    attach(hook, event, listener) {
        hook.on(event, listener);
        this.listeners.push([event, listener]);
    }
    detachAll() {
        if (this.hook?.removeAllListeners) {
            for (const [event] of this.listeners) {
                try {
                    this.hook.removeAllListeners(event);
                }
                catch {
                    /* best effort */
                }
            }
        }
        this.listeners = [];
    }
    keyboardBinding(e) {
        const asModifier = (0, keys_1.lookupModifierCode)(e.keycode);
        if (asModifier)
            return (0, keys_1.makeBinding)(asModifier, []);
        const def = (0, keys_1.lookupKeyByUiohook)(e.keycode);
        if (!def)
            return null;
        return (0, keys_1.makeBinding)(def.code, (0, keys_1.modifiersFromFlags)(e));
    }
}
exports.PassiveHookTransport = PassiveHookTransport;
/* ------------------------------------------------------------------ *
 * 2. Electron globalShortcut (fallback)
 * ------------------------------------------------------------------ */
class AcceleratorTransport {
    id = 'accelerator';
    capabilities = {
        name: 'OS Hotkeys (fallback)',
        passiveGlobalKeyboard: false,
        worksWhenUnfocused: true,
        mouseButtons: false,
        mouseWheel: false,
        warning: 'The passive input hook is unavailable on this machine, so crshhx is using OS hotkeys. '
            + 'These capture the combination exclusively — the game will not receive it. '
            + 'Slot keys must include Ctrl or Alt while this transport is active.',
    };
    registered = new Map(); // bindingKey -> accelerator
    running = false;
    onEvent = null;
    start(onEvent) {
        this.onEvent = onEvent;
        this.running = true;
        return true;
    }
    stop() {
        this.unregisterAll();
        this.running = false;
        this.onEvent = null;
    }
    isRunning() {
        return this.running;
    }
    setBindings(bindings) {
        if (!this.running)
            return;
        const wanted = new Map();
        for (const binding of bindings) {
            const accelerator = (0, keys_1.toAccelerator)(binding);
            if (!accelerator)
                continue; // mouse/wheel cannot be expressed
            wanted.set((0, keys_1.bindingKey)(binding), accelerator);
        }
        // Drop registrations that are no longer wanted.
        for (const [key, accelerator] of [...this.registered]) {
            if (wanted.has(key))
                continue;
            try {
                electron_1.globalShortcut.unregister(accelerator);
            }
            catch {
                /* ignore */
            }
            this.registered.delete(key);
        }
        // `globalShortcut` is unavailable if this module is loaded outside a real
        // Electron main process (tests, tooling). Degrade instead of throwing.
        if (!electron_1.globalShortcut || typeof electron_1.globalShortcut.register !== 'function')
            return;
        // Add the new ones.
        for (const binding of bindings) {
            const key = (0, keys_1.bindingKey)(binding);
            const accelerator = wanted.get(key);
            if (!accelerator || this.registered.has(key))
                continue;
            try {
                const ok = electron_1.globalShortcut.register(accelerator, () => {
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
                if (ok)
                    this.registered.set(key, accelerator);
                else
                    console.warn(`[crshhx] could not register slot hotkey ${accelerator}`);
            }
            catch (err) {
                console.warn(`[crshhx] failed to register slot hotkey ${accelerator}:`, err);
            }
        }
    }
    unregisterAll() {
        if (!electron_1.globalShortcut || typeof electron_1.globalShortcut.unregister !== 'function') {
            this.registered.clear();
            return;
        }
        for (const accelerator of this.registered.values()) {
            try {
                electron_1.globalShortcut.unregister(accelerator);
            }
            catch {
                /* ignore */
            }
        }
        this.registered.clear();
    }
}
exports.AcceleratorTransport = AcceleratorTransport;
/**
 * Chooses and starts the best available transport.
 *
 * Returns the started transport so callers can report honestly in the UI which
 * mode is live. Never throws.
 */
function startBestTransport(onEvent) {
    const passive = new PassiveHookTransport();
    if (passive.start(onEvent)) {
        return { transport: passive, degraded: false };
    }
    const accelerator = new AcceleratorTransport();
    accelerator.start(onEvent);
    return {
        transport: accelerator,
        degraded: true,
        reason: 'uiohook-napi is not installed or could not start on this system '
            + '(optional dependency; on Linux it also needs libX11/libXtst).',
    };
}
