"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PROBE_CHANNEL = void 0;
const electron_1 = require("electron");
/**
 * Channel the main process sends probe requests on.
 *
 * The same literal appears in `main.ts`. It cannot be shared: this file may only
 * import types (a sandboxed preload cannot `require` a relative module), and
 * `main.ts` must not import *this* file, because doing so would run the preload
 * in the main process. `tests/buildLayout.test.ts` pins the two together.
 */
exports.PROBE_CHANNEL = 'crshhx-storage-probe';
function readKeys(keys) {
    const found = {};
    for (const key of keys) {
        const value = localStorage.getItem(key);
        if (value !== null)
            found[key] = value;
    }
    return found;
}
/**
 * Stores an entry **only where the key is absent**, and reports what it stored.
 *
 * The guard is repeated here rather than trusting the plan alone, because the
 * destination can change between planning and writing — and because "never
 * overwrite" is the rule this whole migration is built on.
 */
function writeAbsent(entries) {
    const written = [];
    for (const key of Object.keys(entries)) {
        if (localStorage.getItem(key) === null) {
            localStorage.setItem(key, entries[key]);
            written.push(key);
        }
    }
    return written;
}
electron_1.ipcRenderer.on(exports.PROBE_CHANNEL, (_event, request) => {
    if (!request || typeof request.replyChannel !== 'string')
        return;
    const reply = (payload) => {
        try {
            electron_1.ipcRenderer.send(request.replyChannel, payload);
        }
        catch {
            /* The window is already gone; the main process times out and retries. */
        }
    };
    try {
        if (request.op === 'dump') {
            reply({ found: readKeys(request.keys ?? []), origin: location.origin });
            return;
        }
        if (request.op === 'write') {
            reply({ written: writeAbsent(request.entries ?? {}), origin: location.origin });
            return;
        }
        reply({ error: `Unknown probe operation "${String(request.op)}".` });
    }
    catch (err) {
        reply({ error: String(err?.message ?? err) });
    }
});
