import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom/server';
import { App } from '../src/App';

/** Renders a route exactly the way `scripts/prerender.mjs` does. */
export function renderRoute(path: string): string {
  return renderToString(
    <StaticRouter location={path} future={{ v7_relativeSplatPath: true }}>
      <App />
    </StaticRouter>,
  );
}

export function hrefsIn(html: string): string[] {
  return [...html.matchAll(/href="([^"]*)"/g)].map((match) => match[1]);
}

/** Every route the site publishes, plus the not-found path the prerender emits. */
export const ALL_PATHS = [
  '/',
  '/features',
  '/pro-crosshairs',
  '/academy',
  '/download',
  '/docs',
  '/changelog',
] as const;

export const KNOWN_PATHS = [...ALL_PATHS, '/404'] as const;
