import * as path from 'path';

/**
 * Renderer origin and asset resolution for the packaged app.
 *
 * Why this exists
 * ---------------
 * The production windows used to be loaded with `loadFile()`, which puts the
 * document on the `file://` scheme. That has two consequences that matter for a
 * distributed app:
 *
 * 1. Vite emits **ES modules** (both entries share a code-split chunk, so this
 *    is structural rather than incidental). Chromium always fetches module
 *    scripts in CORS mode, and a `file://` document has an opaque origin, so the
 *    bundle can be refused outright and the window renders blank.
 * 2. `localStorage` is partitioned by origin. On `file://` that origin is tied to
 *    the location of the HTML file, so moving the app — a portable exe copied to
 *    another folder, an update that lands on a different path — can make every
 *    saved crosshair, folder, setting and weapon-slot profile appear to vanish.
 *
 * Serving the renderer from a fixed privileged origin (`app://crshhx`) solves
 * both: module scripts have a real origin to be same-origin with, and storage is
 * keyed to something that never moves.
 *
 * This module is deliberately free of `electron` and DOM imports so the URL →
 * path mapping, the traversal guard and the content types can be unit tested in
 * plain Node. `electron/main.ts` only supplies the request and the dist root.
 */

export const APP_SCHEME = 'app';
export const APP_HOST = 'crshhx';
export const APP_ORIGIN = `${APP_SCHEME}://${APP_HOST}`;

export const STUDIO_PAGE = 'index.html';
export const OVERLAY_PAGE = 'overlay.html';

/** The URL each production window loads. */
export function appUrlFor(page: string): string {
  return `${APP_ORIGIN}/${page.replace(/^\/+/, '')}`;
}

export const STUDIO_URL = appUrlFor(STUDIO_PAGE);
export const OVERLAY_URL = appUrlFor(OVERLAY_PAGE);

/**
 * Privileges for the custom scheme.
 *
 * These MUST be registered before `app` is ready — Electron ignores the call
 * afterwards. `standard` gives the scheme real URL parsing (host, path, relative
 * resolution); `secure` makes it a trustworthy origin, which is what lets module
 * scripts and `localStorage` behave as they do on https; `supportFetchAPI` and
 * `corsEnabled` are what `protocol.handle` responses need; `stream` allows large
 * assets; `codeCache` lets V8 cache compiled bytecode between launches.
 */
export const APP_SCHEME_PRIVILEGES = {
  standard: true,
  secure: true,
  supportFetchAPI: true,
  corsEnabled: true,
  stream: true,
  codeCache: true,
} as const;

/* ------------------------------------------------------------------ *
 * Locating the renderer bundle
 * ------------------------------------------------------------------ */

export interface RendererDistContext {
  /** `app.getAppPath()` — the asar archive when packaged, the repo root in dev. */
  appPath: string;
  /** `app.isPackaged`. */
  isPackaged: boolean;
  /** `__dirname` of the compiled main process. */
  mainDir: string;
}

/**
 * Absolute path of the Vite renderer output.
 *
 * Packaged, both `dist` and `dist-electron` sit inside `app.asar` and Electron's
 * patched `fs` reads through the archive transparently, so `appPath/dist` is
 * correct. Unpackaged, this file compiles to `dist-electron/electron/main.js` and
 * the renderer output is two levels up — the layout that defect #9 got wrong
 * once, silently, because nothing typechecks it and `npm run dev` never loads
 * from disk.
 */
export function resolveRendererDist(context: RendererDistContext): string {
  return context.isPackaged
    ? path.join(context.appPath, 'dist')
    : path.join(context.mainDir, '..', '..', 'dist');
}

/* ------------------------------------------------------------------ *
 * Serving an asset
 * ------------------------------------------------------------------ */

const CONTENT_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.txt': 'text/plain; charset=utf-8',
  '.wasm': 'application/wasm',
};

/** MIME type for a bundled asset. Unknown extensions are served as octet-stream
 *  rather than guessed, so nothing is mislabelled as scriptable. */
export function contentTypeFor(filePath: string): string {
  return CONTENT_TYPES[path.extname(filePath).toLowerCase()] ?? 'application/octet-stream';
}

export type AssetResolution =
  | { ok: true; filePath: string; contentType: string }
  | { ok: false; status: number; reason: string };

/** True when `target` is `root` itself or lives underneath it. */
function isInside(root: string, target: string): boolean {
  if (target === root) return true;
  const relative = path.relative(root, target);
  const escapes = relative === '' || relative.startsWith('..') || path.isAbsolute(relative);
  if (!escapes) return true;
  // Windows paths are case-insensitive, so a differing drive-letter or directory
  // casing must not be mistaken for an escape.
  if (path.sep === '\\') {
    const lowered = path.relative(root.toLowerCase(), target.toLowerCase());
    return lowered !== '' && !lowered.startsWith('..') && !path.isAbsolute(lowered);
  }
  return false;
}

/**
 * Maps a request for the `app://` origin onto a file inside the renderer bundle.
 *
 * Refuses, rather than guesses, in every case it cannot serve honestly:
 * a malformed URL, a different scheme, a different host, a NUL byte, and —
 * most importantly — any path that resolves outside `distRoot`. A custom
 * protocol handler is a file server, and an unguarded one will happily be
 * talked into reading `../../../` for the whole disk.
 */
export function resolveAssetPath(requestUrl: string, distRoot: string): AssetResolution {
  let parsed: URL;
  try {
    parsed = new URL(requestUrl);
  } catch {
    return { ok: false, status: 400, reason: 'That is not a parseable URL.' };
  }

  if (parsed.protocol !== `${APP_SCHEME}:`) {
    return { ok: false, status: 404, reason: `Only the ${APP_SCHEME}: scheme is served here.` };
  }
  if (parsed.hostname !== APP_HOST) {
    return {
      ok: false,
      status: 404,
      reason: `Unknown host “${parsed.hostname}”. Expected “${APP_HOST}”.`,
    };
  }

  let pathname: string;
  try {
    pathname = decodeURIComponent(parsed.pathname);
  } catch {
    return { ok: false, status: 400, reason: 'That path is not valid percent-encoding.' };
  }
  if (pathname.includes('\0')) {
    return { ok: false, status: 400, reason: 'Paths may not contain a NUL byte.' };
  }

  // The bare origin is the studio window.
  if (pathname === '' || pathname === '/') pathname = `/${STUDIO_PAGE}`;

  const root = path.resolve(distRoot);
  const relative = pathname.replace(/^[\\/]+/, '');
  const resolved = path.resolve(root, relative);

  if (!isInside(root, resolved)) {
    return {
      ok: false,
      status: 403,
      reason: 'Refused to serve a path outside the renderer bundle.',
    };
  }

  return { ok: true, filePath: resolved, contentType: contentTypeFor(resolved) };
}
