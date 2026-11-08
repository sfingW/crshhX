// @vitest-environment jsdom
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { resolve } from 'path';

import {
  APP_HOST,
  APP_ORIGIN,
  APP_SCHEME,
  APP_SCHEME_PRIVILEGES,
  OVERLAY_PAGE,
  OVERLAY_URL,
  STUDIO_PAGE,
  STUDIO_URL,
  appUrlFor,
  contentTypeFor,
  resolveAssetPath,
  resolveRendererDist,
} from '../electron/services/rendererAssets';
import {
  CSP_HEADER,
  allowsInlineScripts,
  contentSecurityPolicy,
} from '../electron/services/contentSecurity';
import { dropWoffFallbacks, fontFallbackPlugin, isFontSourceStylesheet } from '../vite/fontFallbacks';
import {
  MIGRATED_STORAGE_KEYS,
  STORAGE_PROBE_PATH,
  decideMigration,
  describeMigration,
  isMigrationEmpty,
  isStorageProbePath,
  legacyProbeHtml,
  markerContents,
  planMigration,
  probeData,
  probeFailure,
  probeOrigin,
  probeWrittenKeys,
  settleProbe,
  shouldRunMigration,
} from '../electron/services/storageMigration';
import type { ProbeOutcome, ProbeReply, ProbeRequest } from '../electron/services/storageMigration';

/**
 * Production runtime: the custom renderer origin, the CSP and the storage
 * migration.
 *
 * None of this can be exercised on Windows from this sandbox, so it is exercised
 * as far as it can be in plain Node and jsdom: the URL → path mapping, the
 * traversal guard, the content types, the policy strings, and — for the
 * migration — the real probe preload driven through a stubbed IPC channel against
 * a real `localStorage`, plus every branch of the decision that writes the
 * completion marker. Executing the code that ships is the only way to prove it
 * behaves rather than merely parses.
 */

const ROOT = resolve(__dirname, '..');
const DIST = resolve(ROOT, 'dist');

/* ------------------------------------------------------------------ *
 * rendererAssets
 * ------------------------------------------------------------------ */

describe('renderer origin', () => {
  it('is a fixed privileged origin, not a filesystem path', () => {
    expect(STUDIO_URL).toBe(`${APP_ORIGIN}/${STUDIO_PAGE}`);
    expect(OVERLAY_URL).toBe(`${APP_ORIGIN}/${OVERLAY_PAGE}`);
    expect(appUrlFor('/index.html')).toBe(STUDIO_URL);
  });

  it('requests the privileges a real origin needs', () => {
    // `standard` gives URL parsing and relative resolution; `secure` is what makes
    // module scripts and localStorage behave as they do on https.
    expect(APP_SCHEME_PRIVILEGES.standard).toBe(true);
    expect(APP_SCHEME_PRIVILEGES.secure).toBe(true);
    expect(APP_SCHEME_PRIVILEGES.supportFetchAPI).toBe(true);
  });

  it('locates the renderer bundle in both layouts', () => {
    expect(
      resolveRendererDist({
        appPath: '/opt/app/resources/app.asar',
        isPackaged: true,
        mainDir: '/opt/app/resources/app.asar/dist-electron/electron',
      }),
    ).toBe(resolve('/opt/app/resources/app.asar/dist'));

    // Unpackaged, this file compiles to dist-electron/electron/main.js and the
    // Vite output is two levels up — the relationship defect #9 got wrong once.
    expect(
      resolveRendererDist({
        appPath: ROOT,
        isPackaged: false,
        mainDir: resolve(ROOT, 'dist-electron/electron'),
      }),
    ).toBe(DIST);
  });

  it('never points the packaged layout at the dev-server directory', () => {
    const packaged = resolveRendererDist({
      appPath: '/x/app.asar',
      isPackaged: true,
      mainDir: '/x/app.asar/dist-electron/electron',
    });
    expect(packaged.startsWith('/x/app.asar/')).toBe(true);
    expect(packaged).not.toContain('..');
  });
});

describe('resolveAssetPath', () => {
  it('serves the studio at the bare origin', () => {
    const resolved = resolveAssetPath(APP_ORIGIN, DIST);
    expect(resolved).toEqual({
      ok: true,
      filePath: resolve(DIST, 'index.html'),
      contentType: 'text/html; charset=utf-8',
    });
  });

  it('serves each page and asset with the right content type', () => {
    const overlay = resolveAssetPath(OVERLAY_URL, DIST);
    expect(overlay.ok && overlay.filePath).toBe(resolve(DIST, 'overlay.html'));

    const css = resolveAssetPath(`${APP_ORIGIN}/assets/app.css`, DIST);
    expect(css.ok && css.contentType).toBe('text/css; charset=utf-8');

    const js = resolveAssetPath(`${APP_ORIGIN}/assets/chunk.js`, DIST);
    expect(js.ok && js.contentType).toBe('text/javascript; charset=utf-8');

    const font = resolveAssetPath(`${APP_ORIGIN}/assets/inter-latin-400-normal.woff2`, DIST);
    expect(font.ok && font.contentType).toBe('font/woff2');
  });

  it('ignores the query string a bundler appends for cache busting', () => {
    const resolved = resolveAssetPath(`${APP_ORIGIN}/overlay.html?v=123`, DIST);
    expect(resolved.ok && resolved.filePath).toBe(resolve(DIST, 'overlay.html'));
  });

  it('neutralises traversal, both the obvious kind and the encoded kind', () => {
    // The WHATWG URL parser collapses dot segments before the handler ever sees
    // them, so a plain `..` walk lands back inside the bundle...
    const plain = resolveAssetPath(`${APP_ORIGIN}/../../../etc/passwd`, DIST);
    expect(plain.ok).toBe(true);
    if (plain.ok) expect(plain.filePath.startsWith(DIST)).toBe(true);

    // ...while percent-encoded traversal survives parsing and must be refused
    // here. This is the vector that actually reaches the guard.
    const encoded = resolveAssetPath(`${APP_ORIGIN}/%2e%2e%2f%2e%2e%2fetc%2fpasswd`, DIST);
    expect(encoded.ok).toBe(false);
    if (!encoded.ok) expect(encoded.status).toBe(403);

    // A double slash lands inside and is served normally.
    const inside = resolveAssetPath(`${APP_ORIGIN}//assets/x.js`, DIST);
    expect(inside.ok).toBe(true);
  });

  it('refuses NUL bytes and unreadable percent-encoding', () => {
    const nul = resolveAssetPath(`${APP_ORIGIN}/assets/a%00.js`, DIST);
    expect(nul.ok).toBe(false);
    if (!nul.ok) expect(nul.status).toBe(400);

    const bad = resolveAssetPath(`${APP_ORIGIN}/assets/%zz.js`, DIST);
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.status).toBe(400);
  });

  it('refuses other schemes and other hosts rather than guessing', () => {
    expect(resolveAssetPath('http://example.com/index.html', DIST).ok).toBe(false);
    expect(resolveAssetPath(`${APP_SCHEME}://elsewhere/index.html`, DIST).ok).toBe(false);
    expect(resolveAssetPath('file:///etc/passwd', DIST).ok).toBe(false);
    expect(resolveAssetPath('not a url at all', DIST).ok).toBe(false);
  });

  it('labels unknown extensions as octet-stream instead of guessing', () => {
    expect(contentTypeFor('/x/y.unknownext')).toBe('application/octet-stream');
  });
});

/* ------------------------------------------------------------------ *
 * contentSecurity
 * ------------------------------------------------------------------ */

describe('content security policy', () => {
  const production = contentSecurityPolicy({ isDev: false });
  const development = contentSecurityPolicy({ isDev: true, devServerUrl: 'http://localhost:5173' });

  it('names the header Electron receives', () => {
    expect(CSP_HEADER).toBe('Content-Security-Policy');
  });

  it('forbids inline and evaluated script in production', () => {
    // The guarantee the policy exists for: an injected <script> cannot run.
    expect(allowsInlineScripts(production)).toBe(false);
    expect(production).toContain("script-src 'self'");
    expect(production).not.toContain("'unsafe-eval'");
  });

  it('still permits the inline styles the renderer actually uses', () => {
    // React sets inline style attributes throughout the studio and overlay.html
    // carries an inline <style> block. This is required, not a shortcut, and is
    // why it is asserted rather than left implicit.
    expect(production).toMatch(/style-src 'self' 'unsafe-inline'/);
  });

  it('serves fonts from the app origin only, because they are bundled', () => {
    expect(production).toMatch(/font-src 'self' data:/);
    expect(production).not.toContain('fonts.googleapis.com');
    expect(production).not.toContain('https://');
  });

  it('locks down plugins, base tags and framing', () => {
    expect(production).toContain("object-src 'none'");
    expect(production).toContain("base-uri 'none'");
    expect(production).toContain("frame-ancestors 'none'");
  });

  it('lets development do what development needs, and says it is laxer', () => {
    // Vite injects an inline react-refresh preamble and opens an HMR websocket.
    expect(allowsInlineScripts(development)).toBe(true);
    expect(development).toContain('ws:');
    expect(development).toContain('http://localhost:5173');
  });

  it('does not let either mode reach the network for ordinary resources', () => {
    expect(production).toMatch(/connect-src 'self'/);
  });
});

/* ------------------------------------------------------------------ *
 * storageMigration — planning
 * ------------------------------------------------------------------ */

describe('storage migration planning', () => {
  it('copies only keys the destination does not already have', () => {
    const plan = planMigration(
      { crshhx_custom_presets: 'OLD', crshhx_app_settings: 'OLD2' },
      { crshhx_custom_presets: 'NEW' },
    );
    expect(plan.toCopy).toEqual({ crshhx_app_settings: 'OLD2' });
    expect(plan.alreadyPresent).toEqual(['crshhx_custom_presets']);
  });

  it('never overwrites, even when the source looks richer', () => {
    const plan = planMigration(
      { crshhx_custom_presets: 'OLD-BUT-LONGER' },
      { crshhx_custom_presets: 'NEW' },
    );
    expect(plan.toCopy).toEqual({});
    expect(describeMigration(plan)).toMatch(/already holds your data/);
  });

  it('is a no-op for a fresh install', () => {
    const plan = planMigration({}, {});
    expect(plan.toCopy).toEqual({});
    expect(plan.absentInSource).toEqual(MIGRATED_STORAGE_KEYS);
    expect(describeMigration(plan)).toMatch(/clean library/);
  });

  it('ignores keys that are not ours, in either direction', () => {
    const plan = planMigration({ some_other_app: 'x', crshhx_preset_library: 'L' }, {});
    expect(Object.keys(plan.toCopy)).toEqual(['crshhx_preset_library']);
  });

  it('covers every storage key the renderer owns', () => {
    // If a new persisted key is added without being listed here, its data would
    // silently fail to cross the origin change. tests/buildLayout.test.ts
    // re-derives this list from the source tree to keep it honest.
    expect(MIGRATED_STORAGE_KEYS).toContain('crshhx_theme_accent');
    expect(MIGRATED_STORAGE_KEYS).toContain('crshhx_favorites');
    expect(MIGRATED_STORAGE_KEYS).toContain('crshhx_weapon_slots');
    expect(MIGRATED_STORAGE_KEYS).toContain('crshhx_weapon_slots_runtime');
  });

  it('says plainly that nothing was deleted', () => {
    const plan = planMigration({ crshhx_preset_library: 'L' }, {});
    expect(describeMigration(plan)).toMatch(/Nothing was deleted/);
  });
});

/* ------------------------------------------------------------------ *
 * storageMigration — the probe preload, executed for real
 * ------------------------------------------------------------------ */

/**
 * The preload is imported once with `electron` stubbed, so the IPC listener it
 * registers can be driven directly against a real `localStorage`.
 *
 * That is the point of moving off `executeJavaScript`: the code that touches
 * storage is now a module a test can execute, instead of a string that had to be
 * evaluated to be believed — and whose evaluation the production CSP might refuse
 * outright.
 */
describe('storage migration probe preload', () => {
  const sent: Array<{ channel: string; payload: ProbeReply }> = [];
  let listener: ((event: unknown, request: ProbeRequest) => void) | null = null;

  beforeAll(async () => {
    vi.doMock('electron', () => ({
      ipcRenderer: {
        on: (channel: string, fn: (event: unknown, request: ProbeRequest) => void) => {
          expect(channel).toBe('crshhx-storage-probe');
          listener = fn;
        },
        send: (channel: string, payload: ProbeReply) => {
          sent.push({ channel, payload });
        },
      },
    }));
    await import('../electron/probePreload');
  });

  function prime(entries: Record<string, string>, foreign: string[] = ['unrelated_thing']) {
    window.localStorage.clear();
    for (const [key, value] of Object.entries(entries)) {
      window.localStorage.setItem(key, value);
    }
    for (const key of foreign) window.localStorage.setItem(key, 'not ours');
  }

  /** Sends one request to the preload and returns the single answer it gave. */
  function ask(request: Omit<ProbeRequest, 'replyChannel'>, replyChannel = 'reply-1'): ProbeReply {
    sent.length = 0;
    if (!listener) throw new Error('the preload never registered its listener');
    listener(null, { ...request, replyChannel });
    expect(sent).toHaveLength(1);
    expect(sent[0].channel).toBe(replyChannel);
    return sent[0].payload;
  }

  it('dumps exactly the keys it was asked for, out of the origin it runs in', () => {
    prime({ crshhx_custom_presets: '[{"id":"custom-1"}]', crshhx_theme_accent: '#00e599' });

    const reply = ask({ op: 'dump', keys: MIGRATED_STORAGE_KEYS });

    expect(reply.found).toEqual({
      crshhx_custom_presets: '[{"id":"custom-1"}]',
      crshhx_theme_accent: '#00e599',
    });
    // Foreign keys must not travel across origins.
    expect(reply.found).not.toHaveProperty('unrelated_thing');
    expect(reply.origin).toBe(window.location.origin);
  });

  it('reports an unreadable origin as an error, never as an empty one', () => {
    prime({ crshhx_preset_library: 'L' });
    const real = Storage.prototype.getItem;
    Storage.prototype.getItem = () => {
      throw new Error('denied');
    };
    let reply: ProbeReply;
    try {
      reply = ask({ op: 'dump', keys: MIGRATED_STORAGE_KEYS });
    } finally {
      Storage.prototype.getItem = real;
    }

    expect(reply.found).toBeUndefined();
    expect(reply.error).toMatch(/denied/);
    // The distinction the marker decision depends on: an origin that cannot be
    // read is retried, an origin that is genuinely empty completes the migration.
    expect(probeFailure({ status: 'ok', value: reply })).toMatch(/denied/);
    expect(probeFailure({ status: 'ok', value: { found: {} } })).toBeNull();
    expect(probeData({ status: 'ok', value: reply })).toEqual({});
  });

  it('writes only absent keys and reports which ones it stored', () => {
    prime({ crshhx_app_settings: 'NEWER' });

    const reply = ask({
      op: 'write',
      entries: { crshhx_app_settings: 'OLDER', crshhx_preset_library: 'LIB' },
    });

    expect(reply.written).toEqual(['crshhx_preset_library']);
    // The newer value survived untouched.
    expect(window.localStorage.getItem('crshhx_app_settings')).toBe('NEWER');
    expect(window.localStorage.getItem('crshhx_preset_library')).toBe('LIB');
  });

  it('round-trips large, awkward values intact', () => {
    prime({});
    const awkward = JSON.stringify({
      quote: '"',
      newline: '\n',
      tag: '</script>',
      unicode: '✓ 日本',
      big: 'x'.repeat(200_000),
    });

    ask({ op: 'write', entries: { crshhx_custom_presets: awkward } });
    expect(window.localStorage.getItem('crshhx_custom_presets')).toBe(awkward);

    const back = ask({ op: 'dump', keys: MIGRATED_STORAGE_KEYS });
    expect(back.found?.crshhx_custom_presets).toBe(awkward);
  });

  it('reports a refused write as a failure instead of claiming it copied nothing', () => {
    prime({});
    const real = Storage.prototype.setItem;
    Storage.prototype.setItem = () => {
      throw new Error('quota');
    };
    let reply: ProbeReply;
    try {
      reply = ask({ op: 'write', entries: { crshhx_preset_library: 'L' } });
    } finally {
      Storage.prototype.setItem = real;
    }

    expect(reply.written).toBeUndefined();
    expect(reply.error).toMatch(/quota/);
    // The old injected script answered `'[]'` here, which read as "copied nothing,
    // migration complete" and would have written the marker over a failed copy.
    expect(probeWrittenKeys({ status: 'ok', value: reply })).toEqual([]);
    expect(probeFailure({ status: 'ok', value: reply })).toMatch(/quota/);
    expect(window.localStorage.getItem('crshhx_preset_library')).toBeNull();
  });

  it('answers an unknown operation with an error rather than silence', () => {
    prime({});
    const reply = ask({ op: 'destroy-everything' } as unknown as Omit<ProbeRequest, 'replyChannel'>);
    expect(reply.error).toMatch(/Unknown probe operation/);
    expect(probeFailure({ status: 'ok', value: reply })).toBeTruthy();
  });

  it('ignores a request it has no way to answer', () => {
    prime({});
    sent.length = 0;
    if (!listener) throw new Error('the preload never registered its listener');
    listener(null, {} as ProbeRequest);
    expect(sent).toEqual([]);
  });
});

/* ------------------------------------------------------------------ *
 * storageMigration — whether the attempt finished
 * ------------------------------------------------------------------ */

/** Probe outcomes, spelled out once so each case below reads as a sentence. */
const answered = (value: unknown): ProbeOutcome => ({ status: 'ok', value });
const timedOut: ProbeOutcome = { status: 'timeout', ms: 4000 };
const threw = (message: string): ProbeOutcome => ({ status: 'error', message });

describe('migration completion', () => {
  it('writes the marker when keys were copied', () => {
    const decision = decideMigration({
      source: answered({ found: { crshhx_preset_library: 'LIB' } }),
      destination: answered({ found: {} }),
      plan: planMigration({ crshhx_preset_library: 'LIB' }, {}),
      write: answered({ written: ['crshhx_preset_library'] }),
    });

    expect(decision.writeMarker).toBe(true);
    expect(decision.report).toMatch(/Moved 1 saved item/);
    expect(decision.report).toMatch(/Wrote 1 key\./);
    expect(decision.report).toMatch(/Nothing was deleted/);
  });

  it('writes the marker when both probes answered and there was nothing to copy', () => {
    // The regression this test exists for. A fresh install has nothing under the
    // old origin; returning early without a marker made every later launch repeat
    // the hidden window and both probes, forever.
    const plan = planMigration({}, {});
    expect(isMigrationEmpty(plan)).toBe(true);

    const decision = decideMigration({
      source: answered({ found: {} }),
      destination: answered({ found: {} }),
      plan,
    });

    expect(decision.writeMarker).toBe(true);
    expect(decision.report).toMatch(/clean library/);
  });

  it('writes the marker when the current origin already superseded the old one', () => {
    const decision = decideMigration({
      source: answered({ found: { crshhx_app_settings: 'OLD' } }),
      destination: answered({ found: { crshhx_app_settings: 'NEW' } }),
      plan: planMigration({ crshhx_app_settings: 'OLD' }, { crshhx_app_settings: 'NEW' }),
    });

    expect(decision.writeMarker).toBe(true);
    expect(decision.report).toMatch(/already holds your data/);
  });

  it('does not write the marker when the legacy probe timed out', () => {
    const decision = decideMigration({
      source: timedOut,
      destination: answered({ found: {} }),
      plan: planMigration({}, {}),
    });

    expect(decision.writeMarker).toBe(false);
    expect(decision.report).toMatch(/did not answer within 4000 ms/);
    expect(decision.report).toMatch(/nothing under the previous storage origin was modified/);
    expect(decision.report).toMatch(/next launch will try again/);
  });

  it('does not write the marker when the destination probe threw', () => {
    const decision = decideMigration({
      source: answered({ found: { crshhx_preset_library: 'LIB' } }),
      destination: threw('EvalError: refused by the page policy'),
      plan: planMigration({ crshhx_preset_library: 'LIB' }, {}),
    });

    expect(decision.writeMarker).toBe(false);
    expect(decision.report).toMatch(/current storage origin reported an error/);
    expect(decision.report).toMatch(/EvalError/);
  });

  it('does not write the marker when the probe document reported an error', () => {
    const decision = decideMigration({
      source: answered({ error: 'denied' }),
      destination: answered({ found: {} }),
      plan: planMigration({}, {}),
    });

    expect(decision.writeMarker).toBe(false);
    expect(decision.report).toMatch(/probe document reported an error \(denied\)/);
  });

  it('does not write the marker when the copy never confirmed', () => {
    const decision = decideMigration({
      source: answered({ found: { crshhx_preset_library: 'LIB' } }),
      destination: answered({ found: {} }),
      plan: planMigration({ crshhx_preset_library: 'LIB' }, {}),
      write: timedOut,
    });

    expect(decision.writeMarker).toBe(false);
    // Retrying is safe and the report has to say so: a partial copy is not a
    // broken one, because a key is only ever written where it is absent.
    expect(decision.report).toMatch(/Re-running is safe/);
    expect(decision.report).toMatch(/next launch will try again/);
  });

  it('does not write the marker when a non-empty plan was never written', () => {
    const decision = decideMigration({
      source: answered({ found: { crshhx_preset_library: 'LIB' } }),
      destination: answered({ found: {} }),
      plan: planMigration({ crshhx_preset_library: 'LIB' }, {}),
    });

    expect(decision.writeMarker).toBe(false);
    expect(decision.report).toMatch(/never attempted/);
  });

  it('reports what was actually stored when the destination moved mid-copy', () => {
    const decision = decideMigration({
      source: answered({
        found: { crshhx_preset_library: 'LIB', crshhx_theme_accent: '#fff' },
      }),
      destination: answered({ found: {} }),
      plan: planMigration(
        { crshhx_preset_library: 'LIB', crshhx_theme_accent: '#fff' },
        {},
      ),
      write: answered({ written: ['crshhx_preset_library'] }),
    });

    expect(decision.writeMarker).toBe(true);
    expect(decision.report).toMatch(/Moved 2 saved items/);
    expect(decision.report).toMatch(/Wrote 1 key\./);
  });
});

describe('probe settling', () => {
  it('keeps a successful answer', async () => {
    const outcome = await settleProbe(
      Promise.resolve({ found: { crshhx_theme_accent: '#fff' } }),
      1000,
    );
    expect(outcome.status).toBe('ok');
    expect(probeData(outcome)).toEqual({ crshhx_theme_accent: '#fff' });
  });

  it('turns a rejection into an error outcome instead of throwing', async () => {
    const outcome = await settleProbe(Promise.reject(new Error('window is gone')), 1000);
    expect(outcome).toEqual({ status: 'error', message: 'window is gone' });
    expect(probeFailure(outcome)).toMatch(/window is gone/);
  });

  it('turns a probe that never answers into a timeout', async () => {
    const outcome = await settleProbe(new Promise(() => {}), 5);
    expect(outcome).toEqual({ status: 'timeout', ms: 5 });
  });

  it('does not leave its timer running behind the app startup', async () => {
    vi.useFakeTimers();
    try {
      const baseline = vi.getTimerCount();

      const pending = settleProbe(new Promise(() => {}), 4000);
      expect(vi.getTimerCount()).toBe(baseline + 1);
      vi.advanceTimersByTime(4000);
      expect((await pending).status).toBe('timeout');
      expect(vi.getTimerCount()).toBe(baseline);

      let release: (value: unknown) => void = () => {};
      const answeredFirst = settleProbe(
        new Promise((resolve) => {
          release = resolve;
        }),
        4000,
      );
      expect(vi.getTimerCount()).toBe(baseline + 1);
      release({ found: {} });
      expect((await answeredFirst).status).toBe('ok');
      expect(vi.getTimerCount()).toBe(baseline);
    } finally {
      vi.useRealTimers();
    }
  });

  it('normalises whatever shape arrives over IPC', () => {
    expect(probeData({ status: 'ok', value: { found: { a: 'x', b: 2, c: null } } })).toEqual({
      a: 'x',
    });
    // A JSON string is accepted too, so the answer survives either serialisation.
    expect(probeData({ status: 'ok', value: '{"found":{"a":"x"}}' })).toEqual({ a: 'x' });
    expect(probeData({ status: 'ok', value: null })).toEqual({});
    expect(probeData({ status: 'ok', value: ['a'] })).toEqual({});
    expect(probeData({ status: 'ok', value: 'not json' })).toEqual({});
    expect(probeData(timedOut)).toEqual({});
    expect(probeWrittenKeys({ status: 'ok', value: { written: ['a', 3] } })).toEqual(['a']);
    expect(probeWrittenKeys(timedOut)).toEqual([]);
    expect(probeOrigin({ status: 'ok', value: { origin: 'app://crshhx' } })).toBe('app://crshhx');
    expect(probeOrigin(threw('x'))).toBeUndefined();
  });
});

describe('storage probe document', () => {
  it('renders nothing and runs no script of its own', () => {
    const html = legacyProbeHtml();
    expect(html).not.toContain('<script');
    expect(html).not.toContain('onclick');
    expect(html).toContain('<body>');
  });

  it('lives on a dedicated route the bundle does not contain', () => {
    expect(isStorageProbePath(STORAGE_PROBE_PATH)).toBe(true);
    expect(isStorageProbePath('/index.html')).toBe(false);
    expect(STORAGE_PROBE_PATH.startsWith('/')).toBe(true);
  });
});

/* ------------------------------------------------------------------ *
 * Startup and footprint optimisations
 * ------------------------------------------------------------------ */

describe('migration runs once per install', () => {
  it('skips development and any launch after a completed attempt', () => {
    expect(shouldRunMigration({ isDev: true, markerExists: false })).toBe(false);
    expect(shouldRunMigration({ isDev: false, markerExists: true })).toBe(false);
    expect(shouldRunMigration({ isDev: false, markerExists: false })).toBe(true);
  });

  it('records a quotable report in the marker', () => {
    const contents = markerContents('Moved 3 saved items.', 1_700_000_000_000);
    const parsed = JSON.parse(contents);
    expect(parsed.report).toBe('Moved 3 saved items.');
    expect(parsed.completedAt).toBe(new Date(1_700_000_000_000).toISOString());
  });

  it('means a fresh install probes once, not once per launch', () => {
    // The whole chain, for the case almost every install hits: both probes answer,
    // the old origin is empty, so the attempt is *finished* — the marker is
    // written with the report it produced, and the next launch skips the probe.
    const first = decideMigration({
      source: { status: 'ok', value: { found: {} } },
      destination: { status: 'ok', value: { found: {} } },
      plan: planMigration({}, {}),
    });
    expect(first.writeMarker).toBe(true);

    const marker = JSON.parse(markerContents(first.report, 1_700_000_000_000));
    expect(marker.report).toMatch(/clean library/);
    expect(shouldRunMigration({ isDev: false, markerExists: true })).toBe(false);
  });

  it('means a failed probe is retried rather than marked complete', () => {
    const attempt = decideMigration({
      source: { status: 'timeout', ms: 4000 },
      destination: { status: 'ok', value: { found: {} } },
      plan: planMigration({}, {}),
    });
    expect(attempt.writeMarker).toBe(false);
    expect(shouldRunMigration({ isDev: false, markerExists: false })).toBe(true);
  });
});

describe('font fallback stripping', () => {
  const source =
    "@font-face{font-family:Inter;src:url(./files/a.woff2) format('woff2'), url(./files/a.woff) format('woff');}";

  it('removes the legacy woff clause and keeps woff2', () => {
    const next = dropWoffFallbacks(source);
    expect(next).toContain("format('woff2')");
    expect(next).not.toContain('.woff)');
    expect(next).not.toContain("format('woff')");
  });

  it('leaves non-fontsource stylesheets alone', () => {
    expect(isFontSourceStylesheet('/x/node_modules/@fontsource/inter/latin-400.css')).toBe(true);
    expect(isFontSourceStylesheet('/x/src/index.css')).toBe(false);
    expect(fontFallbackPlugin().transform(source, '/x/src/index.css')).toBeNull();
    const out = fontFallbackPlugin().transform(
      source,
      '/x/node_modules/@fontsource/inter/latin-400.css',
    );
    expect(out?.code).not.toContain("format('woff')");
  });

  it('does not touch a rule that has no woff fallback', () => {
    const woff2Only = "@font-face{src:url(./a.woff2) format('woff2');}";
    expect(fontFallbackPlugin().transform(woff2Only, '/n/@fontsource/x/400.css')).toBeNull();
  });
});
