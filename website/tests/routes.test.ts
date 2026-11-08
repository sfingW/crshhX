import { describe, expect, it } from 'vitest';
import { MOCK_DISCLOSURE, NAV_LINKS, NOT_FOUND_PATH, ROUTES, SITE, routeFor } from '../src/site';

const EXPECTED_PATHS = ['/', '/features', '/download', '/docs', '/changelog'];

describe('route table', () => {
  it('covers exactly the five published routes, in navigation order', () => {
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
      'Download',
      'Documentation',
      'Changelog',
    ]);
  });

  it('drives navigation from the same table it renders', () => {
    expect(NAV_LINKS).toEqual(ROUTES);
    expect(NAV_LINKS.some((route) => route.path === '/download')).toBe(true);
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

  it('omits a public origin until one exists', () => {
    // With no SITE_URL at build time the prerender must skip canonical/og:url
    // rather than publish a placeholder origin.
    expect(typeof SITE.url).toBe('string');
    expect(SITE.url.endsWith('/')).toBe(false);
  });
});
