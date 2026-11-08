"use strict";
/**
 * Content Security Policy for the studio and overlay windows.
 *
 * Delivered as a response header rather than a `<meta>` tag: a meta tag cannot
 * express `frame-ancestors`, `report-uri` or `sandbox`, and it is applied after
 * the document has already begun parsing.
 *
 * What the current renderer actually needs
 * ----------------------------------------
 * - `style-src 'unsafe-inline'` is **required**, not a shortcut. React sets
 *   inline `style={{…}}` attributes throughout the studio (brand-colour accents,
 *   dynamic widths, computed text colours) and `overlay.html` carries an inline
 *   `<style>` block for its transparent full-screen root. Inline style
 *   *attributes* are governed by `style-src-attr`/`style-src` and cannot be
 *   allowed by a hash or nonce.
 * - `script-src 'self'` with **no** `'unsafe-inline'` and **no** `'unsafe-eval'`
 *   in production. Vite emits external module scripts and the production React
 *   build does not eval. This is the directive that makes the policy worth
 *   having: an injected script tag cannot run.
 * - `font-src 'self'` because the fonts are bundled (see the self-hosted
 *   `@fontsource` imports in `src/studio/main.tsx`). Nothing is fetched from the
 *   network at startup any more.
 * - `connect-src 'self'` — the renderer makes no network requests. IPC to the
 *   main process goes through the preload bridge and is not governed by CSP.
 * - `object-src`, `base-uri` and `frame-ancestors` are locked down: no plugins,
 *   no `<base>` hijacking of relative URLs, and the windows cannot be framed.
 *
 * Development is deliberately laxer and says so: Vite injects an inline
 * react-refresh preamble and talks to an HMR websocket, neither of which can
 * work under the production policy.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CSP_HEADER = void 0;
exports.cspDirectives = cspDirectives;
exports.contentSecurityPolicy = contentSecurityPolicy;
exports.allowsInlineScripts = allowsInlineScripts;
exports.CSP_HEADER = 'Content-Security-Policy';
/** Directive list, in a stable order so the header is comparable in tests. */
function cspDirectives(options) {
    const { isDev } = options;
    const devOrigin = options.devServerUrl ?? 'http://localhost:5173';
    if (isDev) {
        return [
            ['default-src', ["'self'", devOrigin]],
            // Vite's react-refresh preamble is an inline module script.
            ['script-src', ["'self'", devOrigin, "'unsafe-inline'", "'unsafe-eval'"]],
            ['style-src', ["'self'", devOrigin, "'unsafe-inline'"]],
            ['img-src', ["'self'", devOrigin, 'data:', 'blob:']],
            ['font-src', ["'self'", devOrigin, 'data:']],
            // HMR websocket, plus Vite's own module requests.
            ['connect-src', ["'self'", devOrigin, 'ws:', 'wss:']],
            ['worker-src', ["'self'", devOrigin, 'blob:']],
            ['object-src', ["'none'"]],
            ['base-uri', ["'self'"]],
            ['form-action', ["'self'"]],
            ['frame-ancestors', ["'none'"]],
        ];
    }
    return [
        ['default-src', ["'self'"]],
        ['script-src', ["'self'"]],
        ['style-src', ["'self'", "'unsafe-inline'"]],
        ['img-src', ["'self'", 'data:', 'blob:']],
        ['font-src', ["'self'", 'data:']],
        ['connect-src', ["'self'"]],
        ['worker-src', ["'self'", 'blob:']],
        ['object-src', ["'none'"]],
        ['base-uri', ["'none'"]],
        ['form-action', ["'self'"]],
        ['frame-ancestors', ["'none'"]],
    ];
}
/** The header value for the current mode. */
function contentSecurityPolicy(options) {
    return cspDirectives(options)
        .map(([name, values]) => `${name} ${values.join(' ')}`)
        .join('; ');
}
/**
 * True when a policy would let an injected inline script execute. Used by the
 * test suite to pin the production guarantee down, so loosening `script-src`
 * later fails loudly instead of quietly removing the protection.
 */
function allowsInlineScripts(policy) {
    const directive = policy
        .split(';')
        .map((part) => part.trim())
        .find((part) => part.startsWith('script-src '));
    if (!directive)
        return false; // no script-src means default-src governs
    return directive.includes("'unsafe-inline'") || directive.includes("'unsafe-eval'");
}
