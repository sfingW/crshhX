import { WEAPON_SLOTS_RUNTIME_KEY, WEAPON_SLOTS_STORAGE_KEY } from '../../src/lib/weaponSlots/migration';

/**
 * Moving user data from the old `file://` origin to `app://crshhx`.
 *
 * The renderer used to be loaded with `loadFile()`, so its `localStorage` was
 * partitioned under the `file://` origin. Switching the windows to a custom
 * privileged scheme changes that origin, and an origin change means the browser
 * storage goes with it: without a migration, every saved crosshair, folder,
 * favourite, description, colour swatch, app setting, theme accent and
 * weapon-slot profile would appear to have been erased on first launch of a
 * packaged build.
 *
 * Nothing here is allowed to lose data, so the rules are deliberately blunt:
 *
 * - A key is copied **only if the destination does not already have it**. The new
 *   origin may already hold newer data — a user who launched once, saved
 *   something, then relaunched must never have older values written over it.
 * - A missing, unreadable or empty source is a **no-op**, not an error. A fresh
 *   install has nothing to migrate and must not be told otherwise.
 * - Migration never deletes the source. If it goes wrong, the old data is still
 *   sitting under `file://` and can be recovered by hand.
 *
 * The decision logic is pure so it can be executed against a real `localStorage`
 * in jsdom. The Electron plumbing that drives it (a hidden window on the legacy
 * origin) lives in `main.ts`, and the other end of that window's probe lives in
 * `electron/probePreload.ts`.
 */

/**
 * Every key crshhx persists, by name.
 *
 * Kept explicit rather than enumerated at runtime because `localStorage` cannot
 * be trusted to contain only ours, and a stray key copied across origins would
 * be indistinguishable from a real one. `tests/buildLayout.test.ts` re-derives
 * this list from the source tree so a newly added key cannot be forgotten here.
 */
export const MIGRATED_STORAGE_KEYS: readonly string[] = [
  'crshhx_current_config',
  'crshhx_app_settings',
  'crshhx_custom_presets',
  'crshhx_color_swatches',
  /** Legacy. Still migrated on purpose: the library reads it and folds it in. */
  'crshhx_favorites',
  'crshhx_preset_library',
  'crshhx_theme_accent',
  WEAPON_SLOTS_STORAGE_KEY,
  WEAPON_SLOTS_RUNTIME_KEY,
];

export interface MigrationPlan {
  /** Keys to write into the new origin. */
  toCopy: Record<string, string>;
  /** Keys the new origin already had — left untouched. */
  alreadyPresent: string[];
  /** Keys the old origin did not have. */
  absentInSource: string[];
}

/**
 * Decides what moves. Source and destination are plain maps of the keys that
 * were actually found, so neither side has to exist.
 */
export function planMigration(
  source: Record<string, string | null>,
  destination: Record<string, string | null>,
): MigrationPlan {
  const toCopy: Record<string, string> = {};
  const alreadyPresent: string[] = [];
  const absentInSource: string[] = [];

  for (const key of MIGRATED_STORAGE_KEYS) {
    const from = source[key];
    const to = destination[key];
    if (from === null || from === undefined) {
      absentInSource.push(key);
      continue;
    }
    if (to !== null && to !== undefined) {
      // Never overwrite. Whatever is in the new origin is by definition what the
      // user has used most recently.
      alreadyPresent.push(key);
      continue;
    }
    toCopy[key] = from;
  }

  return { toCopy, alreadyPresent, absentInSource };
}

export function isMigrationEmpty(plan: MigrationPlan): boolean {
  return Object.keys(plan.toCopy).length === 0;
}

/** One honest line for the log and for the migration report. */
export function describeMigration(plan: MigrationPlan): string {
  const copied = Object.keys(plan.toCopy);
  if (copied.length === 0) {
    return plan.alreadyPresent.length > 0
      ? 'Nothing to migrate from the previous storage origin: the current one already holds your data.'
      : 'No saved data was found under the previous storage origin. Starting with a clean library.';
  }
  const parts = [
    `Moved ${copied.length} saved item${copied.length === 1 ? '' : 's'} from the previous storage origin.`,
  ];
  if (plan.alreadyPresent.length > 0) {
    parts.push(
      `Left ${plan.alreadyPresent.length} alone because the current origin already had a newer copy.`,
    );
  }
  parts.push('Nothing was deleted.');
  return parts.join(' ');
}

/* ------------------------------------------------------------------ *
 * When to run at all
 * ------------------------------------------------------------------ */

/**
 * Name of the marker file written into userData once a migration attempt has
 * completed.
 *
 * Without it, every launch pays for a hidden window and two storage probes even
 * though the work can only ever be needed once. Startup time on a utility that
 * people launch before a game matters; a stat() on one small file does not.
 *
 * "Completed" includes **completed with nothing to do**. That case is the common
 * one — no distributed build ever used the `file://` origin, so almost every
 * install finds an empty source — and returning early without a marker made
 * every later launch repeat the whole probe. `decideMigration` is the single
 * place that distinguishes "finished, mark it" from "failed, retry", so the
 * marker can only be written on a finished attempt.
 *
 * A crash, a timeout or a probe that reports an error leaves the marker absent,
 * so the next launch retries rather than silently skipping.
 */
export const MIGRATION_MARKER_NAME = 'storage-migration-v1.done';

export function shouldRunMigration(context: {
  isDev: boolean;
  markerExists: boolean;
}): boolean {
  // Dev loads from the Vite server, whose origin this change never touched.
  return !context.isDev && !context.markerExists;
}

/** What goes in the marker: enough for a support request to quote, nothing more. */
export function markerContents(report: string, now: number): string {
  return JSON.stringify({ completedAt: new Date(now).toISOString(), report }, null, 2);
}

/* ------------------------------------------------------------------ *
 * The probe protocol
 * ------------------------------------------------------------------ */

/**
 * How the hidden window is asked to touch `localStorage`.
 *
 * This replaced two functions that built JavaScript **source** out of stored
 * strings and handed it to `webContents.executeJavaScript`. Evaluating a script
 * inside a document has a problem this project cannot test its way around:
 * whether it runs at all depends on that document's Content Security Policy, and
 * the production policy is `script-src 'self'` with no `'unsafe-eval'`. A preload
 * script is not governed by the document's policy — Electron installs it in an
 * isolated world — and IPC is not a CSP-governed fetch, as
 * `services/contentSecurity.ts` already notes. So the migration now behaves the
 * same way whichever side of that question Electron falls on, and no stored value
 * is ever interpolated into source code.
 *
 * `electron/probePreload.ts` implements the other end. It imports these types and
 * nothing else: a sandboxed preload cannot `require` a relative module, so the two
 * short loops that read and write storage live there (and are tested there, with a
 * stubbed `ipcRenderer` and a real `localStorage`), while every decision about
 * *what* moves, and whether the attempt counts as finished, stays here.
 */
export interface ProbeRequest {
  /** Where the answer must be sent. Unique per request. */
  replyChannel: string;
  op: 'dump' | 'write';
  /** For `dump`: which keys to read. Always `MIGRATED_STORAGE_KEYS`. */
  keys?: readonly string[];
  /** For `write`: entries to store where the key is absent. */
  entries?: Record<string, string>;
}

export interface ProbeReply {
  /** `dump`: the keys that were present. */
  found?: Record<string, string>;
  /** `write`: the keys that were actually stored. */
  written?: string[];
  /** Where the answer came from. Logged, never trusted for a decision. */
  origin?: string;
  /** Set when the probe document could not do what was asked. */
  error?: string;
}

/**
 * What the main process learns from one probe.
 *
 * Deliberately a three-way result rather than a value-or-null: "the probe
 * answered and storage was empty" and "the probe never answered" must not look
 * the same, because only one of them is allowed to write the marker.
 */
export type ProbeOutcome =
  | { status: 'ok'; value: unknown }
  | { status: 'timeout'; ms: number }
  | { status: 'error'; message: string };

/**
 * Settles a probe into an outcome: a rejection becomes `error`, a probe that
 * outlives `ms` becomes `timeout`, and the pending timer is cleared instead of
 * being left running behind the app's startup.
 */
export function settleProbe(work: Promise<unknown>, ms: number): Promise<ProbeOutcome> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return Promise.race([
    work.then(
      (value): ProbeOutcome => ({ status: 'ok', value }),
      (err: unknown): ProbeOutcome => ({
        status: 'error',
        message: String((err as Error)?.message ?? err),
      }),
    ),
    new Promise<ProbeOutcome>((resolve) => {
      timer = setTimeout(() => resolve({ status: 'timeout', ms }), ms);
    }),
  ]).then((outcome) => {
    if (timer) clearTimeout(timer);
    return outcome;
  });
}

function tryParseJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function stringRecord(raw: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === 'string') out[key] = value;
  }
  return out;
}

/**
 * Normalises whatever came back over IPC into the reply shape.
 *
 * Only the expected fields survive, and only string values inside `found`, so a
 * malformed answer degrades to "nothing reported" rather than reaching the plan.
 */
function asProbeReply(raw: unknown): ProbeReply {
  const value = typeof raw === 'string' ? tryParseJson(raw) : raw;
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};

  const reply = value as Record<string, unknown>;
  const out: ProbeReply = {};
  if (reply.found && typeof reply.found === 'object' && !Array.isArray(reply.found)) {
    out.found = stringRecord(reply.found as Record<string, unknown>);
  }
  if (Array.isArray(reply.written)) {
    out.written = reply.written.filter((key): key is string => typeof key === 'string');
  }
  if (typeof reply.origin === 'string') out.origin = reply.origin;
  if (typeof reply.error === 'string') out.error = reply.error;
  return out;
}

/** The keys the probe found. Anything but a successful answer reads as none. */
export function probeData(outcome: ProbeOutcome): Record<string, string> {
  return outcome.status === 'ok' ? asProbeReply(outcome.value).found ?? {} : {};
}

/** The keys the probe stored. Anything but a successful answer reads as none. */
export function probeWrittenKeys(outcome: ProbeOutcome): string[] {
  return outcome.status === 'ok' ? asProbeReply(outcome.value).written ?? [] : [];
}

/** Where the answer came from, for the log line. */
export function probeOrigin(outcome: ProbeOutcome): string | undefined {
  return outcome.status === 'ok' ? asProbeReply(outcome.value).origin : undefined;
}

/** Why a probe cannot be acted on, or `null` when it can. */
export function probeFailure(outcome: ProbeOutcome): string | null {
  if (outcome.status === 'timeout') return `did not answer within ${outcome.ms} ms`;
  if (outcome.status === 'error') return `reported an error (${outcome.message})`;
  const error = asProbeReply(outcome.value).error;
  return error ? `the probe document reported an error (${error})` : null;
}

/* ------------------------------------------------------------------ *
 * Whether the attempt counts as finished
 * ------------------------------------------------------------------ */

export interface MigrationDecision {
  /** True only when the attempt finished, so the marker may be written. */
  writeMarker: boolean;
  /** One honest line: the marker's report when finished, the reason when not. */
  report: string;
}

const RETRY_NOTE =
  'nothing under the previous storage origin was modified or deleted, and the next launch will try again.';

function notCompleted(reason: string): MigrationDecision {
  return { writeMarker: false, report: `Migration did not complete: ${reason}; ${RETRY_NOTE}` };
}

/**
 * The single decision point for the marker.
 *
 * Three cases matter, and only the middle one used to be wrong:
 *
 * 1. both probes answered and keys were copied  -> finished, write the marker;
 * 2. both probes answered and nothing needed to move -> **also finished**;
 * 3. either probe timed out, threw, or reported an error -> not finished, no
 *    marker, retry on the next launch.
 *
 * Case 2 is the normal one for every install of the first release, so getting it
 * wrong meant paying for a hidden window and two probes on every launch forever.
 */
export function decideMigration(context: {
  source: ProbeOutcome;
  destination: ProbeOutcome;
  plan: MigrationPlan;
  /** Present only when the plan had something to copy. */
  write?: ProbeOutcome;
}): MigrationDecision {
  const sourceFailure = probeFailure(context.source);
  if (sourceFailure) return notCompleted(`the previous storage origin ${sourceFailure}`);

  const destinationFailure = probeFailure(context.destination);
  if (destinationFailure) return notCompleted(`the current storage origin ${destinationFailure}`);

  if (isMigrationEmpty(context.plan)) {
    return { writeMarker: true, report: describeMigration(context.plan) };
  }

  if (!context.write) return notCompleted('the copy was never attempted');

  const writeFailure = probeFailure(context.write);
  if (writeFailure) {
    return {
      writeMarker: false,
      report:
        `Migration did not complete: the copy into the current storage origin ${writeFailure}. ` +
        `Re-running is safe, because a key is only ever written where it is absent; ${RETRY_NOTE}`,
    };
  }

  const written = probeWrittenKeys(context.write);
  return {
    writeMarker: true,
    report: `${describeMigration(context.plan)} Wrote ${written.length} key${written.length === 1 ? '' : 's'}.`,
  };
}


/**
 * The document loaded on the legacy `file://` origin purely to read its storage.
 *
 * It must be a real file on disk, because a `data:` URL has an opaque origin and
 * would see none of the old data. It is written to a temp directory at run time
 * rather than shipped inside the bundle, so it cannot be reached through the
 * `app://` handler and never becomes part of the renderer surface.
 */
/**
 * Route the `app://` handler answers from memory instead of from disk.
 *
 * The write half of the migration has to happen on the **new** origin, and it has
 * to happen before the studio window boots — the app persists defaults on a first
 * run (it seeds the starter favourites), so if it starts empty it would occupy
 * exactly the keys the migration needs to fill. A hidden same-origin document
 * gives somewhere to write from without letting the application code run first.
 *
 * It serves no scripts and renders nothing, so it adds no renderer surface.
 */
export const STORAGE_PROBE_PATH = '/__storage-probe.html';

export function isStorageProbePath(pathname: string): boolean {
  return pathname === STORAGE_PROBE_PATH;
}

export function legacyProbeHtml(): string {
  return [
    '<!DOCTYPE html>',
    '<html><head><meta charset="utf-8">',
    '<title>crshhx storage migration</title>',
    '</head><body>',
    '<!-- Loaded on the legacy file:// origin so its localStorage can be read.',
    '     It renders nothing and runs no application code. -->',
    '</body></html>',
  ].join('\n');
}
