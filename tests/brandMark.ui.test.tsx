// @vitest-environment jsdom
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { BrandMark } from '../src/brand/BrandMark';
import { CX_SHAPES, CX_VIEWBOX } from '../src/brand/geometry';

/**
 * The in-app mark is the same geometry as everything else: seven fused quads on
 * the 96 grid, drawn as one path so the sidebar shows exactly what the favicon,
 * the tray icon and the website nav show.
 */
describe('BrandMark', () => {
  it('renders the monogram as a single path in the shared viewBox', () => {
    const html = renderToStaticMarkup(<BrandMark size={18} />);
    expect(html).toContain(`viewBox="${CX_VIEWBOX}"`);
    const paths = html.match(/<path /g) ?? [];
    expect(paths.length).toBe(1);
    const d = html.match(/ d="([^"]+)"/)?.[1] ?? '';
    expect((d.match(/M/g) ?? []).length).toBe(CX_SHAPES.length);
  });

  it('inherits currentColor so accent and mono contexts both work', () => {
    const html = renderToStaticMarkup(<BrandMark />);
    expect(html).toContain('fill="currentColor"');
  });

  it('is decorative by default: the sidebar label carries the name', () => {
    const html = renderToStaticMarkup(<BrandMark />);
    expect(html).toContain('aria-hidden="true"');
  });
});
