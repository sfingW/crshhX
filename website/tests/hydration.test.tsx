import { StrictMode, act } from 'react';
import { hydrateRoot, type Root } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../src/App';
import { routeFor } from '../src/site';
import { renderRoute } from './helpers';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * The site ships prerendered HTML, so a hydration mismatch is a real defect:
 * it means the browser throws away markup and flashes content. These tests
 * render on the "server", hydrate in jsdom, and fail on any console output
 * React produces while doing it.
 */
describe('hydration', () => {
  let root: Root | null = null;
  const problems: string[] = [];

  beforeEach(() => {
    problems.length = 0;
    vi.spyOn(console, 'error').mockImplementation((message: unknown) => {
      problems.push(`console.error: ${String(message)}`);
    });
    vi.spyOn(console, 'warn').mockImplementation((message: unknown) => {
      problems.push(`console.warn: ${String(message)}`);
    });
    document.body.innerHTML = '';
    // Mirror the prerendered shell so the metadata effect has something to update.
    document.head.innerHTML = '<title></title><meta name="description" content="" />';
    // jsdom implements neither, and both are legitimate browser calls.
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    Element.prototype.scrollIntoView = vi.fn();
    window.history.pushState({}, '', '/');
  });

  afterEach(() => {
    if (root) act(() => root?.unmount());
    root = null;
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  async function hydrate(path: string) {
    // The router reads the location at hydration time, exactly as a browser
    // would when it requests a prerendered file.
    window.history.pushState({}, '', path);
    document.body.innerHTML = `<div id="root">${renderRoute(path)}</div>`;
    const container = document.getElementById('root');
    if (!container) throw new Error('no root element');
    const prerendered = container.innerHTML;
    await act(async () => {
      root = hydrateRoot(
        container,
        <StrictMode>
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <App />
          </BrowserRouter>
        </StrictMode>,
      );
    });
    return { container, prerendered };
  }

  it('hydrates the prerendered home page without changing its markup', async () => {
    const { container, prerendered } = await hydrate('/');
    expect(problems).toEqual([]);

    const headline = container.querySelector('h1');
    expect(headline?.textContent).toContain('Your crosshair');
    expect(container.querySelectorAll('h1')).toHaveLength(1);

    // The Field & Studio headline. The third line is the claim that matters —
    // an overlay, not an injection — and it is pinned because it is the sentence
    // the whole page is built around.
    // The three lines are separated by <br /> elements, which is where an
    // assistive technology pauses; jsdom concatenates the text nodes with no
    // space, so assert the lines rather than the joined string.
    expect(headline?.textContent).toContain('Your crosshair,');
    expect(headline?.textContent).toContain('drawn over the game.');
    expect(headline?.querySelector('.dim-line')?.textContent).toBe('Never inside it.');

    // React must reuse the server markup rather than throw it away, so the
    // hydrated tree has the same elements the prerender produced. The rail is
    // the four counted facts under the hero; the numbers come from the generated
    // catalogue, so they cannot disagree with the application.
    const prerenderedRows = (prerendered.match(/class="rail-item"/g) ?? []).length;
    expect(container.querySelectorAll('.rail-item').length).toBe(prerenderedRows);
    expect(prerenderedRows).toBe(4);
    const prerenderedSvgs = (prerendered.match(/<svg/g) ?? []).length;
    expect(container.querySelectorAll('svg').length).toBe(prerenderedSvgs);

    expect(container.querySelector('.nav')).not.toBeNull();
    expect(container.querySelector('.footer')).not.toBeNull();
    expect(container.querySelectorAll('.reveal').length).toBeGreaterThanOrEqual(2);
    expect(document.title).toBe(routeFor('/')?.title);
  });

  it('hydrates every other route cleanly', async () => {
    for (const path of [
      '/features',
      '/pro-crosshairs',
      '/academy',
      '/download',
      '/docs',
      '/changelog',
    ] as const) {
      problems.length = 0;
      const { container } = await hydrate(path);
      expect(problems, path).toEqual([]);
      expect(container.querySelectorAll('h1'), path).toHaveLength(1);
      expect(document.title, path).toBe(routeFor(path)?.title);
      act(() => root?.unmount());
      root = null;
    }
  });

  it('renders the 404 page for an unknown path', async () => {
    problems.length = 0;
    const { container } = await hydrate('/404');
    expect(problems).toEqual([]);
    expect(container.textContent).toContain('off-centre');
    expect(document.title).toBe('Page not found — crshhx');
  });

  it('navigates client-side and updates the document metadata', async () => {
    const { container } = await hydrate('/');
    const link = container.querySelector<HTMLAnchorElement>('a[href="/features"]');
    expect(link).not.toBeNull();

    await act(async () => {
      link?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    });

    expect(problems).toEqual([]);
    expect(window.location.pathname).toBe('/features');
    expect(container.querySelector('h1')?.textContent).toBe(
      'What the application actually does.',
    );
    expect(container.querySelectorAll('h1')).toHaveLength(1);
    expect(document.title).toBe(routeFor('/features')?.title);
    expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toBe(
      routeFor('/features')?.description,
    );
    expect(container.querySelector('.nav-link.active')?.textContent).toBe('Features');
  });

  it('opens the mobile navigation and closes it when a link is used', async () => {
    const { container } = await hydrate('/');
    const burger = container.querySelector<HTMLButtonElement>('.nav-burger');
    expect(burger).not.toBeNull();
    expect(container.querySelector('.nav-menu')).toBeNull();
    expect(burger?.getAttribute('aria-expanded')).toBe('false');

    await act(async () => {
      burger?.click();
    });
    expect(container.querySelector('.nav-menu')).not.toBeNull();
    expect(burger?.getAttribute('aria-expanded')).toBe('true');
    expect(container.querySelectorAll('.nav-menu-link').length).toBe(7);

    const docsLink = container.querySelector<HTMLAnchorElement>('.nav-menu a[href="/docs"]');
    await act(async () => {
      docsLink?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    });

    expect(problems).toEqual([]);
    expect(window.location.pathname).toBe('/docs');
    expect(container.querySelector('.nav-menu')).toBeNull();
    expect(container.querySelector('h1')?.textContent).toBe('How crshhx works.');
  });

  it('turns the download call to action into direct executable links once shipped', async () => {
    const { container } = await hydrate('/download');

    // No disabled placeholders survive a published release.
    expect(container.querySelectorAll('.dl-panel button[disabled]')).toHaveLength(0);
    expect(container.textContent).not.toContain('No verified build has been published yet');

    // One direct file link per panel, each with a download attribute so the
    // click saves the .exe itself.
    const exeLinks = [...container.querySelectorAll<HTMLAnchorElement>('a[href$=".exe"]')];
    expect(exeLinks.length).toBe(2);
    for (const link of exeLinks) {
      expect(link.getAttribute('href')).toContain(
        'https://github.com/sfingW/crshhX/releases/download/v1.1.0/',
      );
      expect(link.hasAttribute('download')).toBe(true);
    }

    const installer = exeLinks.find((link) => link.textContent?.includes('Download crshhx'));
    expect(installer?.getAttribute('href')).toContain('crshhx-crosshair-studio-setup-1.1.0.exe');
    const portable = exeLinks.find((link) => link.textContent?.includes('Download portable'));
    expect(portable?.getAttribute('href')).toContain('crshhx-crosshair-studio-portable-1.1.0.exe');

    // The hashes sit behind closed disclosures — present, not cluttering.
    const verify = container.querySelectorAll('details.dl-verify');
    expect(verify.length).toBe(2);
    for (const details of verify) {
      expect(details.hasAttribute('open')).toBe(false);
      expect(details.querySelector('summary')?.textContent).toBe('Verify download');
      expect(details.textContent).toContain('Copy');
    }
    expect(problems).toEqual([]);
  });
});
