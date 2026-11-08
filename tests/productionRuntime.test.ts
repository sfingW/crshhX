// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
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
  describeMigration,
  dumpScript,
  injectScript,
  isStorageProbePath,
  legacyProbeHtml,
  markerContents,
  planMigration,
  shouldRunMigration,
} from '../electron/services/storageMigration';

/**
 * Production runtime: the custom renderer origin, the CSP and the storage
 * migration.
 *
 * None of this can be exercised on Windows from this sandbox, so it is exercised
 * as far as it can be in plain Node and jsdom: the URL → path mapping, the
 * traversal guard, the content types, the policy strings, and — for the
 * migration — the actual scripts, run against a real `localStorage`, which is
 * the only way to prove they behave rather than merely parse.
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
 * storageMigration — the injected scripts, executed for real
 * ------------------------------------------------------------------ */

describe('storage migration scripts', () => {
  function prime(entries: Record<string, string>, foreign: string[] = ['unrelated_thing']) {
    window.localStorage.clear();
    for (const [key, value] of Object.entries(entries)) {
      window.localStorage.setItem(key, value);
    }
    for (const key of foreign) window.localStorage.setItem(key, 'not ours');
  }

  it('dumps exactly our keys out of the origin it runs in', () => {
    prime({ crshhx_custom_presets: '[{"id":"custom-1"}]', crshhx_theme_accent: '#00e599' });

    const raw: string = eval(dumpScript());
    const dumped = JSON.parse(raw);

    expect(dumped).toEqual({
      crshhx_custom_presets: '[{"id":"custom-1"}]',
      crshhx_theme_accent: '#00e599',
    });
    // Foreign keys must not travel across origins.
    expect(dumped).not.toHaveProperty('unrelated_thing');
  });

  it('reports an empty object when storage is unreadable', () => {
    prime({});
    const real = Storage.prototype.getItem;
    Storage.prototype.getItem = () => {
      throw new Error('denied');
    };
    try {
      expect(eval(dumpScript())).toBe('{}');
    } finally {
      Storage.prototype.getItem = real;
    }
  });

  it('writes only absent keys and reports which ones', () => {
    prime({ crshhx_app_settings: 'NEWER' });

    const written: string = eval(
      injectScript({ crshhx_app_settings: 'OLDER', crshhx_preset_library: 'LIB' }),
    );

    expect(JSON.parse(written)).toEqual(['crshhx_preset_library']);
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

    eval(injectScript({ crshhx_custom_presets: awkward }));
    expect(window.localStorage.getItem('crshhx_custom_presets')).toBe(awkward);

    const back = JSON.parse(eval(dumpScript()));
    expect(back.crshhx_custom_presets).toBe(awkward);
  });

  it('survives a localStorage that refuses writes', () => {
    prime({});
    const real = Storage.prototype.setItem;
    Storage.prototype.setItem = () => {
      throw new Error('quota');
    };
    try {
      expect(eval(injectScript({ crshhx_preset_library: 'L' }))).toBe('[]');
    } finally {
      Storage.prototype.setItem = real;
    }
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
