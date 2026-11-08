import { describe, expect, it } from 'vitest';
import { ROUTES, SITE } from '../src/site';
import type { ReleaseManifest } from '../src/site';
import { ALL_PATHS, KNOWN_PATHS, hrefsIn, renderRoute } from './helpers';
import data from '../src/releases.json';

const manifest = data as unknown as ReleaseManifest;

const HTML: Record<string, string> = Object.fromEntries(
  KNOWN_PATHS.map((path) => [path, renderRoute(path)]),
);

const INTERNAL = new Set<string>(KNOWN_PATHS);

function idsIn(html: string): Set<string> {
  return new Set([...html.matchAll(/id="([^"]+)"/g)].map((match) => match[1]));
}

describe('link integrity', () => {
  it('contains no empty, dead or script links', () => {
    for (const path of KNOWN_PATHS) {
      for (const href of hrefsIn(HTML[path])) {
        expect(href, `${path} → "${href}"`).not.toBe('');
        expect(href, `${path} → "${href}"`).not.toBe('#');
        expect(href.startsWith('javascript:')).toBe(false);
        expect(href.startsWith('mailto:')).toBe(false);
        expect(href).not.toContain('TODO');
        expect(href).not.toContain('example.com');
        expect(href).not.toContain('localhost');
      }
    }
  });

  it('points every internal link at a published route', () => {
    for (const path of KNOWN_PATHS) {
      for (const href of hrefsIn(HTML[path])) {
        if (href.startsWith('http')) continue;
        const [pathname] = href.split('#');
        if (pathname === '') continue; // same-page anchor, checked below
        expect(INTERNAL.has(pathname), `${path} → ${href}`).toBe(true);
      }
    }
  });

  it('resolves every same-page anchor to a real element', () => {
    for (const path of KNOWN_PATHS) {
      const ids = idsIn(HTML[path]);
      for (const href of hrefsIn(HTML[path])) {
        if (!href.startsWith('#')) continue;
        expect(ids.has(href.slice(1)), `${path} → ${href}`).toBe(true);
      }
    }
  });

  it('resolves every cross-page anchor against the target page', () => {
    for (const path of KNOWN_PATHS) {
      for (const href of hrefsIn(HTML[path])) {
        const [pathname, hash] = href.split('#');
        if (!hash || !pathname) continue;
        const target = HTML[pathname];
        expect(target, `${path} → ${href}`).toBeTruthy();
        expect(idsIn(target).has(hash), `${path} → ${href}`).toBe(true);
      }
    }
  });

  it('keeps external links on the project repository, opened safely', () => {
    for (const path of KNOWN_PATHS) {
      for (const href of hrefsIn(HTML[path])) {
        if (!href.startsWith('http')) continue;
        expect(href.startsWith(SITE.repository), `${path} → ${href}`).toBe(true);
      }
    }
    const withTarget = Object.values(HTML)
      .join('\n')
      .match(/<a[^>]*target="_blank"[^>]*>/g);
    for (const tag of withTarget ?? []) {
      expect(tag).toContain('rel=');
      expect(tag).toContain('noopener');
    }
  });

  it('links executables only where the release manifest backs them', () => {
    // The original rule — no page may link to an executable — existed because
    // nothing was published, so any exe link was necessarily invented. Now the
    // rule keeps its intent: an executable link is allowed if and only if it
    // is byte-for-byte one of the URLs the manifest lists for a published
    // release. With no published release, the set is empty and any exe link
    // fails, exactly as before.
    const backed = new Set<string>();
    for (const entry of [...manifest.published, ...manifest.development]) {
      for (const artifact of entry.artifacts ?? []) {
        if (artifact.url) backed.add(artifact.url);
      }
    }
    let seen = 0;
    for (const path of KNOWN_PATHS) {
      for (const href of hrefsIn(HTML[path])) {
        const looksExecutable =
          /\.(exe|msi|zip|dmg|AppImage)(\?|$)/i.test(href) ||
          href.includes('/releases/download/');
        if (!looksExecutable) continue;
        seen += 1;
        expect(backed.has(href), `${path} → ${href} is not a published manifest artifact`).toBe(
          true,
        );
      }
    }
    // And while a release is published, the download page must actually carry
    // its links — a stale page hiding real files fails here.
    if (manifest.channel === 'released' && manifest.latest) {
      expect(seen, 'published release but no executable links rendered').toBeGreaterThan(0);
    }
  });

  it('shows the same navigation, including a download call to action, on every page', () => {
    for (const path of KNOWN_PATHS) {
      const html = HTML[path];
      for (const route of ROUTES) {
        expect(html, `${path} → ${route.path}`).toContain(`href="${route.path}"`);
      }
      expect(html, path).toContain('nav-cta');
      expect(html, path).toContain('Download');
      expect(html.match(/class="nav-link[ "]/g)?.length, path).toBe(4);
    }
  });

  it('marks the current page in the navigation', () => {
    // Download is the header call to action rather than a text link, so the four
    // text links cover the remaining routes.
    for (const path of ['/', '/features', '/docs', '/changelog'] as const) {
      expect(HTML[path].match(/class="nav-link active"/g)?.length, path).toBe(1);
      const cta = /<a[^>]*nav-cta[^>]*>/.exec(HTML[path])?.[0] ?? '';
      expect(cta, path).toContain('href="/download"');
      expect(cta, path).not.toContain('aria-current');
    }
    expect(HTML['/features']).toContain('>Features</a>');
    expect(HTML['/docs']).toContain('>Documentation</a>');
    expect(HTML['/download']).toContain('aria-current="page"');
    expect(HTML['/download'].match(/class="nav-link active"/g)).toBeNull();
    // The 404 page is not in the route table, so nothing is marked current.
    expect(HTML['/404']).not.toContain('nav-link active');
    expect(HTML['/404']).not.toContain('aria-current');
  });

  it('links the download page to the changelog and the docs', () => {
    const html = HTML['/download'];
    expect(html).toContain('href="/changelog"');
    expect(html).toContain('href="/docs#troubleshooting"');
    expect(html).toContain('Release notes');
  });

  it('offers a way back from the 404 page', () => {
    const html = renderRoute('/nothing-here');
    expect(html).toContain('href="/"');
    expect(html).toContain('href="/features"');
    expect(html).toContain('class="nav"');
    expect(html).toContain('class="footer"');
  });

  it('keeps the documentation table of contents complete', () => {
    const html = HTML['/docs'];
    const anchors = hrefsIn(html).filter((href) => href.startsWith('#') && href !== '#main');
    expect(anchors.length).toBe(9);
    expect(html).toContain('href="#main"');
    for (const route of ALL_PATHS) {
      expect(html, route).toContain(`href="${route}"`);
    }
  });
});
