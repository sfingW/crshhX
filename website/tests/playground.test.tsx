import { StrictMode, act } from 'react';
import { hydrateRoot, type Root } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../src/App';
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

  it('explores the six feature panels through an accessible tablist', async () => {
    const { container } = await hydrate('/features');
    const tabs = [...container.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
    const panels = [...container.querySelectorAll<HTMLElement>('[role="tabpanel"]')];
    expect(tabs).toHaveLength(6);
    expect(panels).toHaveLength(6);
    expect(tabs[0]?.getAttribute('aria-selected')).toBe('true');
    expect(panels.filter((panel) => !panel.hasAttribute('hidden'))).toHaveLength(1);

    await act(async () => {
      tabs[3]?.click();
    });

    expect(problems).toEqual([]);
    expect(tabs[3]?.getAttribute('aria-selected')).toBe('true');
    expect(tabs[0]?.getAttribute('aria-selected')).toBe('false');
    expect(panels[3]?.hasAttribute('hidden')).toBe(false);
    expect(panels[0]?.hasAttribute('hidden')).toBe(true);
    expect(panels[3]?.textContent).toContain('Game profiles');
    // Every panel stays in the document for crawlers and no-JS readers.
    expect(panels.every((panel) => panel.textContent && panel.textContent.length > 200)).toBe(
      true,
    );
  });
});
