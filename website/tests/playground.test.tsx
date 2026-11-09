import { StrictMode, act } from 'react';
import { hydrateRoot, type Root } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../src/App';
import { CATALOGUE } from '../src/catalogue';
import { renderRoute } from './helpers';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/** React controls range inputs, so the value must go through the native setter. */
function setRange(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
  if (!setter) throw new Error('HTMLInputElement.value setter missing');
  setter.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

describe('interactive surfaces', () => {
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
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    Element.prototype.scrollIntoView = vi.fn();
    document.head.innerHTML = '<title></title><meta name="description" content="" />';
    document.body.innerHTML = '';
    window.history.pushState({}, '', '/');
  });

  afterEach(() => {
    if (root) act(() => root?.unmount());
    root = null;
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  async function hydrate(path: string) {
    window.history.pushState({}, '', path);
    document.body.innerHTML = `<div id="root">${renderRoute(path)}</div>`;
    const container = document.getElementById('root');
    if (!container) throw new Error('no root element');
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
    return { container };
  }

  it('prerenders the playground deterministically', () => {
    const first = renderRoute('/');
    expect(first).toBe(renderRoute('/'));
    expect(first).toContain('crosshair playground');
    expect(first).toContain('pg-range');
    expect(first).toContain('len 4.0');
    expect(first).toContain('Cyan Duelist');
  });

  it('updates the readout when a slider moves', async () => {
    const { container } = await hydrate('/');
    const length = container.querySelector<HTMLInputElement>('input[aria-label="Length"]');
    expect(length).not.toBeNull();

    await act(async () => {
      if (length) setRange(length, '9');
    });

    expect(problems).toEqual([]);
    expect(container.querySelector('.pg-readout')?.textContent).toContain('len 9.0');
    expect(container.querySelector('.pg-ctl-head output')?.textContent).toBe('9.0');
    // Manual adjustment detaches the preset highlight.
    expect(container.querySelectorAll('.pg-preset.is-active')).toHaveLength(0);
  });

  it('loads a built-in preset into the playground', async () => {
    const { container } = await hydrate('/');
    const chip = [...container.querySelectorAll<HTMLButtonElement>('.pg-preset')].find((button) =>
      button.textContent?.includes('Pump Breacher'),
    );
    expect(chip).not.toBeUndefined();

    await act(async () => {
      chip?.click();
    });

    expect(problems).toEqual([]);
    const readout = container.querySelector('.pg-readout')?.textContent ?? '';
    expect(readout).toContain('#ff3333');
    expect(readout).toContain('ring on');
    expect(readout).toContain('gap 8.0');
    expect(chip?.className).toContain('is-active');
  });

  it('changes colour from the swatches and toggles the ring', async () => {
    const { container } = await hydrate('/');
    const swatch = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Set colour #ff5ea8"]',
    );
    expect(swatch).not.toBeNull();
    await act(async () => {
      swatch?.click();
    });
    expect(container.querySelector('.pg-readout')?.textContent).toContain('#ff5ea8');
    expect(swatch?.getAttribute('aria-pressed')).toBe('true');

    const ring = container.querySelector<HTMLButtonElement>('.pg-toggle');
    expect(ring?.getAttribute('aria-pressed')).toBe('false');
    await act(async () => {
      ring?.click();
    });
    expect(container.querySelector('.pg-readout')?.textContent).toContain('ring on');
    expect(problems).toEqual([]);
  });

  it('keeps all six feature areas in the document, each reachable by anchor', async () => {
    const { container } = await hydrate('/features');
    for (const id of ['editor', 'presets', 'transfer', 'profiles', 'slots', 'overlay']) {
      expect(container.querySelector(`#${id}`), id).not.toBeNull();
    }
    const links = [
      ...container.querySelectorAll<HTMLAnchorElement>('nav[aria-label="Feature areas"] a'),
    ];
    expect(links).toHaveLength(6);

    // The redesign replaced the tablist with a sequence of sections that each
    // have their own composition. That is a deliberate trade: a tablist hides
    // five of the six areas from a crawler and from a reader without script, and
    // it was the reason the page repeated one layout six times.
    expect(container.querySelectorAll('[role="tab"]')).toHaveLength(0);
    expect(container.querySelectorAll('[role="tabpanel"]')).toHaveLength(0);
    for (const id of ['editor', 'presets', 'transfer', 'profiles', 'slots', 'overlay']) {
      const section = container.querySelector(`#${id}`);
      expect((section?.textContent ?? '').length, id).toBeGreaterThan(200);
    }
    expect(problems).toEqual([]);
  });

  it('filters the Pro Crosshairs catalogue without a page reload', async () => {
    const { container } = await hydrate('/pro-crosshairs');
    const items = () => container.querySelectorAll('.sheet-item').length;

    // All forty designs are in the prerendered document before any script runs.
    expect(items()).toBe(CATALOGUE.pro.total);

    const buttons = [...container.querySelectorAll<HTMLButtonElement>('.cat-tab')];
    expect(buttons).toHaveLength(CATALOGUE.pro.categories.length + 1);

    const precision = buttons.find((button) => button.textContent?.startsWith('Precision'));
    expect(precision).toBeTruthy();
    await act(async () => {
      precision?.click();
    });

    expect(problems).toEqual([]);
    expect(items()).toBe(5);
    expect(precision?.getAttribute('aria-pressed')).toBe('true');
    expect(buttons[0]?.getAttribute('aria-pressed')).toBe('false');
    expect(container.querySelector('[role="status"]')?.textContent).toContain('Showing 5 of 40');
    // The category's own blurb replaces a title attribute, so keyboard and touch
    // users get it too.
    expect(container.querySelector('.cat-blurb')?.textContent).toContain(
      'Dots and tight crosses',
    );

    await act(async () => {
      buttons[0]?.click();
    });
    expect(items()).toBe(CATALOGUE.pro.total);
    expect(container.querySelector('.cat-blurb')).toBeNull();
    expect(problems).toEqual([]);
  });

  it('renders every Academy step in the document, closed but present', async () => {
    const { container } = await hydrate('/academy');
    const lessons = [...container.querySelectorAll<HTMLDetailsElement>('details.lesson')];
    expect(lessons).toHaveLength(CATALOGUE.academy.total);
    expect(lessons.every((lesson) => !lesson.open)).toBe(true);

    const renderedSteps = container.querySelectorAll('.lesson-steps li').length;
    const expectedSteps = CATALOGUE.academy.tutorials.reduce(
      (total, tutorial) => total + tutorial.steps.length,
      0,
    );
    expect(renderedSteps).toBe(expectedSteps);
    expect(container.textContent).toContain('Getting started with crshhx');
    expect(container.textContent).toContain('Fixing common problems');
    expect(problems).toEqual([]);
  });
});
