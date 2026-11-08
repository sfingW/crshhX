import { StrictMode } from 'react';
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom/server';
import { App } from './App';
import releases from './releases.json';
import type { ReleaseManifest } from './site';

/**
 * Server entry used by `scripts/prerender.mjs`. It exports the route table and
 * site identity alongside `render` so the prerender script has one source of
 * truth instead of a second copy that could drift.
 *
 * No styles or fonts are imported here: the client bundle owns those, and the
 * prerender only needs markup.
 */
const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || '/';

/** Must match the client entry, or prerender and hydration would disagree. */
const ROUTER_FUTURE = { v7_relativeSplatPath: true } as const;

export function render(path: string): string {
  return renderToString(
    <StrictMode>
      <StaticRouter location={path} basename={basename} future={ROUTER_FUTURE}>
        <App />
      </StaticRouter>
    </StrictMode>,
  );
}

export { NOT_FOUND_PATH, ROUTES, SITE } from './site';
export const RELEASES = releases as unknown as ReleaseManifest;
