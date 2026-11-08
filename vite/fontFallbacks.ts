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

const WOFF_FALLBACK = /,\s*url\([^)]*\.woff\)\s*format\(['"]woff['"]\)/g;

export function isFontSourceStylesheet(id: string): boolean {
  return id.includes('@fontsource') && id.endsWith('.css');
}

/** Strips legacy woff fallbacks, leaving the woff2 source intact. */
export function dropWoffFallbacks(css: string): string {
  return css.replace(WOFF_FALLBACK, '');
}

/** The Vite plugin. Kept in its own module so the behaviour is unit-testable. */
export function fontFallbackPlugin() {
  return {
    name: 'crshhx-drop-woff-fallbacks',
    enforce: 'pre' as const,
    transform(code: string, id: string): { code: string; map: null } | null {
      if (!isFontSourceStylesheet(id)) return null;
      const next = dropWoffFallbacks(code);
      return next === code ? null : { code: next, map: null };
    },
  };
}
