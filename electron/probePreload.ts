import { ipcRenderer } from 'electron';
import type { ProbeReply, ProbeRequest } from './services/storageMigration';

/**
 * The storage-migration probe's preload.
 *
 * Why this file exists
 * --------------------
 * The migration used to read and write `localStorage` by handing a string of
 * generated JavaScript to `webContents.executeJavaScript`. Whether evaluated code
 * runs at all depends on the document's Content Security Policy, and this app
 * ships `script-src 'self'` with no `'unsafe-eval'` — so the migration's success
 * depended on a Chromium behaviour nobody could check from a Linux sandbox, and
 * the failure mode was a migration that silently never finished.
 *
 * A preload runs in an isolated world that Electron installs before the document
 * loads; the document's policy does not gate it, and the answer travels over IPC,
 * which is not a CSP-governed fetch. Nothing here evaluates anything, and no
 * stored value is ever interpolated into source code.
 *
 * Constraints this file has to respect
 * ------------------------------------
 * - The probe window is sandboxed. A sandboxed preload can only `require`
 *   `electron` and a handful of built-ins, so the policy module is imported for
 *   **types only** (`import type` is erased at compile time) and the two loops
 *   below are written out here instead of shared. They are deliberately dumb:
 *   which keys to read, and which entries to write, are decided by the main
 *   process in `services/storageMigration.ts`.
 * - `tsconfig.node.json` compiles Electron-side code without the DOM library, so
 *   the one global touched here is declared rather than imported. Do not add
 *   `"lib": ["DOM"]` to that config to fix this: it would hand DOM types to the
 *   main process too, where they do not exist.
 * - Every failure is reported back rather than thrown, so a probe that cannot do
 *   its job becomes a decision the main process can make honestly ("retry on the
 *   next launch") instead of a hung startup.
 */

declare const localStorage: {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

/** Reported with every answer so the log can say which origin answered. */
declare const location: { origin: string };

/**
 * Channel the main process sends probe requests on.
 *
 * The same literal appears in `main.ts`. It cannot be shared: this file may only
 * import types (a sandboxed preload cannot `require` a relative module), and
 * `main.ts` must not import *this* file, because doing so would run the preload
 * in the main process. `tests/buildLayout.test.ts` pins the two together.
 */
export const PROBE_CHANNEL = 'crshhx-storage-probe';

function readKeys(keys: readonly string[]): Record<string, string> {
  const found: Record<string, string> = {};
  for (const key of keys) {
    const value = localStorage.getItem(key);
    if (value !== null) found[key] = value;
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
function writeAbsent(entries: Record<string, string>): string[] {
  const written: string[] = [];
  for (const key of Object.keys(entries)) {
    if (localStorage.getItem(key) === null) {
      localStorage.setItem(key, entries[key]);
      written.push(key);
    }
  }
  return written;
}

ipcRenderer.on(PROBE_CHANNEL, (_event, request: ProbeRequest) => {
  if (!request || typeof request.replyChannel !== 'string') return;

  const reply = (payload: ProbeReply) => {
    try {
      ipcRenderer.send(request.replyChannel, payload);
    } catch {
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
  } catch (err) {
    reply({ error: String((err as Error)?.message ?? err) });
  }
});
