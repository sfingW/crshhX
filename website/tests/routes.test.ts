import { describe, expect, it } from 'vitest';
import {
  HEADER_LINKS,
  MOCK_DISCLOSURE,
  NAV_LINKS,
  NOT_FOUND_PATH,
  ROUTES,
  SITE,
  routeFor,
} from '../src/site';

const EXPECTED_PATHS = [
  '/',
  '/features',
  '/pro-crosshairs',
  '/academy',
  '/download',
  '/docs',
  '/changelog',
];

describe('route table', () => {
  it('covers exactly the seven published routes, in navigation order', () => {
    expect(ROUTES.map((route) => route.path)).toEqual(EXPECTED_PATHS);
  });

  it('gives every route a unique path, label, title and description', () => {
    const unique = (values: string[]) => new Set(values).size === values.length;
    expect(unique(ROUTES.map((route) => route.path))).toBe(true);
    expect(unique(ROUTES.map((route) => route.label))).toBe(true);
    expect(unique(ROUTES.map((route) => route.title))).toBe(true);
    expect(unique(ROUTES.map((route) => route.description))).toBe(true);
  });

  it('writes titles and descriptions that are usable as metadata', () => {
    for (const route of ROUTES) {
      expect(route.title.length).toBeGreaterThan(12);
      expect(route.title.length).toBeLessThanOrEqual(70);
      expect(route.description.length).toBeGreaterThanOrEqual(80);
      expect(route.description.length).toBeLessThanOrEqual(240);
      expect(route.title).toContain('crshhx');
    }
  });

  it('labels every route for navigation', () => {
    expect(ROUTES.map((route) => route.label)).toEqual([
      'Home',
      'Features',
      'Pro Crosshairs',
      'Academy',
      'Download',
      'Documentation',
      'Changelog',
    ]);
  });

  it('drives navigation from the same table it renders', () => {
    expect(NAV_LINKS).toEqual(ROUTES);
    expect(NAV_LINKS.some((route) => route.path === '/download')).toBe(true);
  });

  it('leaves home and download out of the header text links', () => {
    // Home is the brand and Download is the call to action at the end of the
    // bar; repeating either as a text link is noise, and with seven routes the
    // bar has no room for it.
    expect(HEADER_LINKS.map((route) => route.path)).toEqual([
      '/features',
      '/pro-crosshairs',
      '/academy',
      '/docs',
      '/changelog',
    ]);
  });

  it('keeps the not-found path out of the published route table', () => {
    expect(NOT_FOUND_PATH).toBe('/404');
    expect(routeFor(NOT_FOUND_PATH)).toBeUndefined();
    expect(EXPECTED_PATHS).not.toContain(NOT_FOUND_PATH);
  });

  it('looks up routes by path', () => {
    expect(routeFor('/features')?.label).toBe('Features');
    expect(routeFor('/nope')).toBeUndefined();
  });

  it('describes the product and its repository', () => {
    expect(SITE.name).toBe('crshhx');
    expect(SITE.productName.length).toBeGreaterThan(4);
    expect(SITE.repository).toMatch(/^https:\/\/github\.com\/sfingW\/crshhX$/);
    expect(SITE.updated).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('labels every mockup as a mockup', () => {
    const caption = MOCK_DISCLOSURE.toLowerCase();
    expect(caption).toContain('illustrative');
    expect(caption).toContain('not a screenshot');
  });

  it('publishes a real origin so canonical and og:url are emitted', () => {
    // An empty fallback silently dropped canonical, og:url and sitemap.xml from
    // every page in production. The default is the origin that actually serves
    // the site; SITE_URL still wins when a domain is configured.
    expect(typeof SITE.url).toBe('string');
    expect(SITE.url.startsWith('https://')).toBe(true);
    expect(SITE.url.endsWith('/')).toBe(false);
  });

  it('describes the two catalogue pages with counts that come from the product', () => {
    // The titles carry the real numbers, so a search result states what is
    // actually installed rather than a marketing adjective.
    expect(routeFor('/pro-crosshairs')?.title).toContain('42');
    expect(routeFor('/academy')?.title).toContain('tutorials');
    expect(routeFor('/changelog')?.description).not.toContain('Nothing has been published');
  });
});
