"use strict";
/**
 * Drops the `.woff` fallback from `@fontsource` `@font-face` rules.
 *
 * `@fontsource` emits every weight twice: once as `.woff2` and once as legacy
 * `.woff`, because a web page must survive ancient browsers. This application
 * renders in a known Chromium (the one Electron ships), which has supported
 * woff2 since long before this project existed. The fallbacks were measured at
 * 520 KB of the 1.5 MB renderer bundle — a third of it — downloaded, unpacked
 * into the installer and never read.
 *
 * The transform is deliberately narrow: it only touches CSS coming out of
 * `@fontsource`, and only removes the trailing `, url(...) format('woff')`
 * clause, never the woff2 source.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.isFontSourceStylesheet = isFontSourceStylesheet;
exports.dropWoffFallbacks = dropWoffFallbacks;
exports.fontFallbackPlugin = fontFallbackPlugin;
const WOFF_FALLBACK = /,\s*url\([^)]*\.woff\)\s*format\(['"]woff['"]\)/g;
function isFontSourceStylesheet(id) {
    return id.includes('@fontsource') && id.endsWith('.css');
}
/** Strips legacy woff fallbacks, leaving the woff2 source intact. */
function dropWoffFallbacks(css) {
    return css.replace(WOFF_FALLBACK, '');
}
/** The Vite plugin. Kept in its own module so the behaviour is unit-testable. */
function fontFallbackPlugin() {
    return {
        name: 'crshhx-drop-woff-fallbacks',
        enforce: 'pre',
        transform(code, id) {
            if (!isFontSourceStylesheet(id))
                return null;
            const next = dropWoffFallbacks(code);
            return next === code ? null : { code: next, map: null };
        },
    };
}
