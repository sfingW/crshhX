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
 * The decision logic and the injected scripts are pure so they can be executed
 * against a real `localStorage` in jsdom. The Electron plumbing that drives them
 * (a hidden window on the legacy origin) lives in `main.ts`.
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
 * Without it, every launch pays for two hidden windows and two storage probes
 * even though the work can only ever be needed once. Startup time on a utility
 * that people launch before a game matters; a stat() on one small file does not.
 * The marker is written only when the attempt *completes* — a crash or timeout
 * leaves it absent so the next launch retries rather than silently skipping.
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
 * Scripts run inside the hidden windows
 * ------------------------------------------------------------------ */

/**
 * Reads our keys out of whichever origin this script runs in.
 *
 * Returns a JSON string rather than an object so the result crosses
 * `executeJavaScript` as a plain value, with no ambiguity about how Electron
 * chose to serialise it. Any failure yields `'{}'` — a probe that cannot read
 * storage must look like "nothing to migrate", never like a crash.
 */
export function dumpScript(keys: readonly string[] = MIGRATED_STORAGE_KEYS): string {
  return `(function () {
  try {
    var wanted = ${JSON.stringify([...keys])};
    var found = {};
    for (var i = 0; i < wanted.length; i++) {
      var value = window.localStorage.getItem(wanted[i]);
      if (value !== null) found[wanted[i]] = value;
    }
    return JSON.stringify(found);
  } catch (err) {
    return '{}';
  }
})()`;
}

/**
 * Writes the migrated entries into the new origin, **only** where the key is
 * absent. The guard is repeated here rather than trusting `planMigration` alone,
 * because the destination can change between planning and injection — the studio
 * window may have already booted and saved something.
 */
export function injectScript(entries: Record<string, string>): string {
  return `(function () {
  try {
    var entries = ${JSON.stringify(entries)};
    var keys = Object.keys(entries);
    var written = [];
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      if (window.localStorage.getItem(key) === null) {
        window.localStorage.setItem(key, entries[key]);
        written.push(key);
      }
    }
    return JSON.stringify(written);
  } catch (err) {
    return '[]';
  }
})()`;
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
