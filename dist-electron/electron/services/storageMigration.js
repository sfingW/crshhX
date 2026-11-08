"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.STORAGE_PROBE_PATH = exports.MIGRATION_MARKER_NAME = exports.MIGRATED_STORAGE_KEYS = void 0;
exports.planMigration = planMigration;
exports.isMigrationEmpty = isMigrationEmpty;
exports.describeMigration = describeMigration;
exports.shouldRunMigration = shouldRunMigration;
exports.markerContents = markerContents;
exports.settleProbe = settleProbe;
exports.probeData = probeData;
exports.probeWrittenKeys = probeWrittenKeys;
exports.probeOrigin = probeOrigin;
exports.probeFailure = probeFailure;
exports.decideMigration = decideMigration;
exports.isStorageProbePath = isStorageProbePath;
exports.legacyProbeHtml = legacyProbeHtml;
const migration_1 = require("../../src/lib/weaponSlots/migration");
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
exports.MIGRATED_STORAGE_KEYS = [
    'crshhx_current_config',
    'crshhx_app_settings',
    'crshhx_custom_presets',
    'crshhx_color_swatches',
    /** Legacy. Still migrated on purpose: the library reads it and folds it in. */
    'crshhx_favorites',
    'crshhx_preset_library',
    'crshhx_theme_accent',
    migration_1.WEAPON_SLOTS_STORAGE_KEY,
    migration_1.WEAPON_SLOTS_RUNTIME_KEY,
];
/**
 * Decides what moves. Source and destination are plain maps of the keys that
 * were actually found, so neither side has to exist.
 */
function planMigration(source, destination) {
    const toCopy = {};
    const alreadyPresent = [];
    const absentInSource = [];
    for (const key of exports.MIGRATED_STORAGE_KEYS) {
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
function isMigrationEmpty(plan) {
    return Object.keys(plan.toCopy).length === 0;
}
/** One honest line for the log and for the migration report. */
function describeMigration(plan) {
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
        parts.push(`Left ${plan.alreadyPresent.length} alone because the current origin already had a newer copy.`);
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
exports.MIGRATION_MARKER_NAME = 'storage-migration-v1.done';
function shouldRunMigration(context) {
    // Dev loads from the Vite server, whose origin this change never touched.
    return !context.isDev && !context.markerExists;
}
/** What goes in the marker: enough for a support request to quote, nothing more. */
function markerContents(report, now) {
    return JSON.stringify({ completedAt: new Date(now).toISOString(), report }, null, 2);
}
/**
 * Settles a probe into an outcome: a rejection becomes `error`, a probe that
 * outlives `ms` becomes `timeout`, and the pending timer is cleared instead of
 * being left running behind the app's startup.
 */
function settleProbe(work, ms) {
    let timer;
    return Promise.race([
        work.then((value) => ({ status: 'ok', value }), (err) => ({
            status: 'error',
            message: String(err?.message ?? err),
        })),
        new Promise((resolve) => {
            timer = setTimeout(() => resolve({ status: 'timeout', ms }), ms);
        }),
    ]).then((outcome) => {
        if (timer)
            clearTimeout(timer);
        return outcome;
    });
}
function tryParseJson(raw) {
    try {
        return JSON.parse(raw);
    }
    catch {
        return null;
    }
}
function stringRecord(raw) {
    const out = {};
    for (const [key, value] of Object.entries(raw)) {
        if (typeof value === 'string')
            out[key] = value;
    }
    return out;
}
/**
 * Normalises whatever came back over IPC into the reply shape.
 *
 * Only the expected fields survive, and only string values inside `found`, so a
 * malformed answer degrades to "nothing reported" rather than reaching the plan.
 */
function asProbeReply(raw) {
    const value = typeof raw === 'string' ? tryParseJson(raw) : raw;
    if (!value || typeof value !== 'object' || Array.isArray(value))
        return {};
    const reply = value;
    const out = {};
    if (reply.found && typeof reply.found === 'object' && !Array.isArray(reply.found)) {
        out.found = stringRecord(reply.found);
    }
    if (Array.isArray(reply.written)) {
        out.written = reply.written.filter((key) => typeof key === 'string');
    }
    if (typeof reply.origin === 'string')
        out.origin = reply.origin;
    if (typeof reply.error === 'string')
        out.error = reply.error;
    return out;
}
/** The keys the probe found. Anything but a successful answer reads as none. */
function probeData(outcome) {
    return outcome.status === 'ok' ? asProbeReply(outcome.value).found ?? {} : {};
}
/** The keys the probe stored. Anything but a successful answer reads as none. */
function probeWrittenKeys(outcome) {
    return outcome.status === 'ok' ? asProbeReply(outcome.value).written ?? [] : [];
}
/** Where the answer came from, for the log line. */
function probeOrigin(outcome) {
    return outcome.status === 'ok' ? asProbeReply(outcome.value).origin : undefined;
}
/** Why a probe cannot be acted on, or `null` when it can. */
function probeFailure(outcome) {
    if (outcome.status === 'timeout')
        return `did not answer within ${outcome.ms} ms`;
    if (outcome.status === 'error')
        return `reported an error (${outcome.message})`;
    const error = asProbeReply(outcome.value).error;
    return error ? `the probe document reported an error (${error})` : null;
}
const RETRY_NOTE = 'nothing under the previous storage origin was modified or deleted, and the next launch will try again.';
function notCompleted(reason) {
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
function decideMigration(context) {
    const sourceFailure = probeFailure(context.source);
    if (sourceFailure)
        return notCompleted(`the previous storage origin ${sourceFailure}`);
    const destinationFailure = probeFailure(context.destination);
    if (destinationFailure)
        return notCompleted(`the current storage origin ${destinationFailure}`);
    if (isMigrationEmpty(context.plan)) {
        return { writeMarker: true, report: describeMigration(context.plan) };
    }
    if (!context.write)
        return notCompleted('the copy was never attempted');
    const writeFailure = probeFailure(context.write);
    if (writeFailure) {
        return {
            writeMarker: false,
            report: `Migration did not complete: the copy into the current storage origin ${writeFailure}. ` +
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
exports.STORAGE_PROBE_PATH = '/__storage-probe.html';
function isStorageProbePath(pathname) {
    return pathname === exports.STORAGE_PROBE_PATH;
}
function legacyProbeHtml() {
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
