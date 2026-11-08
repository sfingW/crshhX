// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';

import { ReticleRenderer } from '../src/components/ReticleRenderer';
import { normalizeCrosshairConfig } from '../src/lib/crosshairSchema';
import { DEFAULT_CONFIG } from '../src/lib/defaultPresets';
import type { CrosshairConfig } from '../src/types/crosshair';

/**
 * Renderer geometry.
 *
 * The v2 renderer added per-arm dimensions, rotation, overall scale and an inner
 * outline to a component that every shipped preset is drawn by. The most
 * important assertion in this file is therefore a **negative** one: for a config
 * that never used a v2 field, the emitted SVG must be numerically identical to
 * what the v1 renderer produced. Those expected numbers below are the v1
 * formulas, written out by hand, not copied from the new implementation.
 */

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

function config(overrides: Partial<CrosshairConfig> = {}): CrosshairConfig {
  return normalizeCrosshairConfig({ ...DEFAULT_CONFIG, ...overrides }).config;
}

/** A known-good v1 cross: 6px arms, 2px thick, 2px gap, 1px black outline. */
function v1Cross(overrides: Partial<CrosshairConfig> = {}): CrosshairConfig {
  return config({
    id: 'v1-cross',
    topology: 'cross',
    length: 6,
    thickness: 2,
    gap: 2,
    hasTopArm: true,
    hasBottomArm: true,
    hasLeftArm: true,
    hasRightArm: true,
    centerDotEnabled: false,
    outlineEnabled: true,
    outlineColor: '#000000',
    outlineThickness: 1,
    outlineOpacity: 1,
    circleEnabled: false,
    glowEnabled: false,
    offsetX: 0,
    offsetY: 0,
    stretchedMode: 'none',
    dynamicFiring: false,
    adsMorphEnabled: false,
    ...overrides,
  });
}

function draw(cfg: CrosshairConfig, props: Partial<React.ComponentProps<typeof ReticleRenderer>> = {}) {
  const { container } = render(<ReticleRenderer config={cfg} {...props} />);
  const svg = container.querySelector('svg')!;
  const wrapper = container.firstElementChild as HTMLElement;

  const rects: Box[] = Array.from(svg.querySelectorAll('rect')).map((r) => ({
    x: Number(r.getAttribute('x')),
    y: Number(r.getAttribute('y')),
    w: Number(r.getAttribute('width')),
    h: Number(r.getAttribute('height')),
  }));

  return {
    container,
    svg,
    wrapper,
    rects,
    filledRects: rects.filter((_, i) => {
      const el = svg.querySelectorAll('rect')[i];
      return el.getAttribute('fill') !== 'none';
    }),
    strokedRects: Array.from(svg.querySelectorAll('rect'))
      .filter((r) => r.getAttribute('fill') === 'none')
      .map((r) => ({
        x: Number(r.getAttribute('x')),
        y: Number(r.getAttribute('y')),
        w: Number(r.getAttribute('width')),
        h: Number(r.getAttribute('h') ?? r.getAttribute('height')),
        stroke: r.getAttribute('stroke'),
        strokeWidth: Number(r.getAttribute('stroke-width')),
      })),
    circles: Array.from(svg.querySelectorAll('circle')).map((c) => ({
      r: Number(c.getAttribute('r')),
      fill: c.getAttribute('fill'),
      stroke: c.getAttribute('stroke'),
    })),
    polylines: Array.from(svg.querySelectorAll('polyline')),
    viewSize: Number(svg.getAttribute('width')),
    center: Number(svg.getAttribute('width')) / 2,
    style: wrapper.getAttribute('style') ?? '',
    svgStyle: svg.getAttribute('style') ?? '',
    rotatedGroups: Array.from(svg.querySelectorAll('g')).filter((g) =>
      (g.getAttribute('transform') ?? '').includes('rotate'),
    ),
  };
}

afterEach(() => cleanup());

describe('renderer: v1 geometry is unchanged', () => {
  it('uses the historical viewBox for a small cross', () => {
    // v1: maxRadius = max(gap+len+outline+10, 0, dot+outline+5, 30) = 30
    //     viewSize  = ceil(30*2 + 10) = 70, centre = 35
    const { viewSize, center } = draw(v1Cross());
    expect(viewSize).toBe(70);
    expect(center).toBe(35);
  });

  it('draws the top arm exactly where the v1 formulas put it', () => {
    const { rects } = draw(v1Cross());
    // outline: x = c-(t+2o)/2, y = c-gap-len-o, w = t+2o, h = len+2o
    expect(rects[0]).toEqual({ x: 33, y: 26, w: 4, h: 8 });
    // body:    x = c-t/2,      y = c-gap-len,   w = t,    h = len
    expect(rects[1]).toEqual({ x: 34, y: 27, w: 2, h: 6 });
  });

  it('draws the bottom arm exactly where the v1 formulas put it', () => {
    const { rects } = draw(v1Cross());
    expect(rects[2]).toEqual({ x: 33, y: 36, w: 4, h: 8 });
    expect(rects[3]).toEqual({ x: 34, y: 37, w: 2, h: 6 });
  });

  it('draws the left arm exactly where the v1 formulas put it', () => {
    const { rects } = draw(v1Cross());
    expect(rects[4]).toEqual({ x: 26, y: 33, w: 8, h: 4 });
    expect(rects[5]).toEqual({ x: 27, y: 34, w: 6, h: 2 });
  });

  it('draws the right arm exactly where the v1 formulas put it', () => {
    const { rects } = draw(v1Cross());
    expect(rects[6]).toEqual({ x: 36, y: 33, w: 8, h: 4 });
    expect(rects[7]).toEqual({ x: 37, y: 34, w: 6, h: 2 });
  });

  it('emits exactly eight rects for an outlined four-arm cross and no more', () => {
    const { rects } = draw(v1Cross());
    expect(rects).toHaveLength(8);
  });

  it('emits no outline rects when the outline is off', () => {
    const { rects } = draw(v1Cross({ outlineEnabled: false }));
    expect(rects).toHaveLength(4);
    expect(rects[0]).toEqual({ x: 34, y: 27, w: 2, h: 6 });
  });

  it('applies no rotation transform when rotation is unset', () => {
    const { rotatedGroups } = draw(v1Cross());
    expect(rotatedGroups).toHaveLength(0);
  });

  it('applies no extra scale when scale is unset', () => {
    const { style } = draw(v1Cross());
    expect(style).toContain('scale(1)');
    expect(style).toContain('translate(0px, 0px)');
  });

  it('does not compress horizontally when stretch mode is none', () => {
    const { svgStyle } = draw(v1Cross());
    expect(svgStyle).toContain('scale(1, 1)');
  });

  it('emits no inner-outline strokes when the feature is off', () => {
    const { strokedRects } = draw(v1Cross());
    expect(strokedRects).toHaveLength(0);
  });
});

describe('renderer: independent per-arm geometry', () => {
  it('draws four different arm lengths from one config', () => {
    const { rects } = draw(
      v1Cross({
        asymmetricArms: true,
        outlineEnabled: false,
        armLength: { top: 8, bottom: 12, left: 4, right: 16 },
      }),
    );
    // Without an outline there are exactly four body rects, in T/B/L/R order.
    expect(rects).toHaveLength(4);
    expect(rects[0].h).toBe(8); // top length is a height
    expect(rects[1].h).toBe(12); // bottom
    expect(rects[2].w).toBe(4); // left length is a width
    expect(rects[3].w).toBe(16); // right
  });

  it('keeps every arm anchored at the same gap despite differing lengths', () => {
    const c = 35;
    const gap = 2;
    const { rects } = draw(
      v1Cross({
        asymmetricArms: true,
        outlineEnabled: false,
        armLength: { top: 8, bottom: 12, left: 4, right: 16 },
      }),
    );
    expect(rects[0].y).toBe(c - gap - 8);
    expect(rects[1].y).toBe(c + gap);
    expect(rects[2].x).toBe(c - gap - 4);
    expect(rects[3].x).toBe(c + gap);
  });

  it('draws four different arm thicknesses from one config', () => {
    const { rects } = draw(
      v1Cross({
        asymmetricArms: true,
        outlineEnabled: false,
        armThickness: { top: 1, bottom: 3, left: 5, right: 7 },
      }),
    );
    expect(rects[0].w).toBe(1); // top thickness is a width
    expect(rects[1].w).toBe(3);
    expect(rects[2].h).toBe(5); // left thickness is a height
    expect(rects[3].h).toBe(7);
  });

  it('sizes the outline around each arm individually', () => {
    const { rects } = draw(
      v1Cross({
        asymmetricArms: true,
        outlineThickness: 1,
        armLength: { top: 10, bottom: 10, left: 10, right: 10 },
        armThickness: { top: 2, bottom: 6, left: 2, right: 6 },
      }),
    );
    // top outline: thickness 2 + 2*1 = 4 wide; bottom outline: 6 + 2 = 8 wide.
    expect(rects[0].w).toBe(4);
    expect(rects[2].w).toBe(8);
  });

  it('grows the viewBox to contain the longest arm', () => {
    const small = draw(v1Cross({ length: 4 }));
    const large = draw(v1Cross({ length: 48 }));
    expect(large.viewSize).toBeGreaterThan(small.viewSize);
  });

  it('omits a disabled arm but keeps the others', () => {
    const { rects } = draw(v1Cross({ hasTopArm: false, outlineEnabled: false }));
    expect(rects).toHaveLength(3);
    // The remaining first rect is the bottom arm.
    expect(rects[0].y).toBeGreaterThan(35);
  });

  it('draws no arms at all for the dot topology', () => {
    const { rects, circles } = draw(
      v1Cross({ topology: 'dot', centerDotEnabled: true, centerDotShape: 'circle', centerDotSize: 4 }),
    );
    expect(rects).toHaveLength(0);
    expect(circles.length).toBeGreaterThan(0);
  });

  it('draws a chevron as a polyline rather than four rects', () => {
    const { polylines, rects } = draw(v1Cross({ topology: 'chevron' }));
    expect(polylines.length).toBeGreaterThan(0);
    expect(rects).toHaveLength(0);
  });
});

describe('renderer: rotation', () => {
  it('rotates the arms about the centre of the viewBox', () => {
    const { rotatedGroups } = draw(v1Cross({ rotation: 45 }));
    expect(rotatedGroups).toHaveLength(1);
    expect(rotatedGroups[0].getAttribute('transform')).toBe('rotate(45 35 35)');
  });

  it('leaves the spread ring out of the rotated group', () => {
    // A ring is rotation-invariant, so rotating it would be wasted work — and
    // more importantly the ring must stay concentric with the screen, not the
    // reticle's arbitrary rotation.
    const { svg, rotatedGroups } = draw(v1Cross({ rotation: 30, circleEnabled: true, circleRadius: 20 }));
    const rotated = rotatedGroups[0];
    const circlesInside = rotated.querySelectorAll('circle');
    expect(circlesInside).toHaveLength(0);
    expect(svg.querySelectorAll('circle').length).toBeGreaterThan(0);
  });

  it('turns a plus into a cross at 45 degrees without moving the centre', () => {
    const before = draw(v1Cross({ rotation: 0 }));
    const after = draw(v1Cross({ rotation: 45 }));
    expect(after.rects).toEqual(before.rects); // same shapes, only transformed
    expect(after.viewSize).toBe(before.viewSize);
  });
});

describe('renderer: overall scale', () => {
  it('multiplies into the preview scale on the wrapper', () => {
    const { style } = draw(v1Cross({ scale: 2 }), { scale: 1.5 });
    expect(style).toContain('scale(3)');
  });

  it('is neutral at 1', () => {
    const { style } = draw(v1Cross({ scale: 1 }), { scale: 2 });
    expect(style).toContain('scale(2)');
  });

  it('still applies the pixel offset', () => {
    const { style } = draw(v1Cross({ offsetX: 12, offsetY: -7, scale: 2 }));
    expect(style).toContain('translate(12px, -7px)');
  });
});

describe('renderer: inner outline', () => {
  it('paints an inset stroke inside each arm', () => {
    const { strokedRects } = draw(
      v1Cross({ innerOutlineEnabled: true, innerOutlineColor: '#ff0000', innerOutlineThickness: 1 }),
    );
    expect(strokedRects).toHaveLength(4);
    for (const r of strokedRects) {
      expect(r.stroke).toBe('#ff0000');
      expect(r.strokeWidth).toBe(1);
    }
  });

  it('sits strictly inside the arm body', () => {
    const { rects, strokedRects } = draw(
      v1Cross({ innerOutlineEnabled: true, innerOutlineThickness: 1 }),
    );
    const topBody = rects[1]; // { x: 34, y: 27, w: 2, h: 6 }
    const topInner = strokedRects[0];
    expect(topInner.x).toBeGreaterThan(topBody.x);
    expect(topInner.y).toBeGreaterThan(topBody.y);
    expect(topInner.x + topInner.w).toBeLessThan(topBody.x + topBody.w);
    expect(topInner.y + topInner.h).toBeLessThan(topBody.y + topBody.h);
  });

  it('omits the inner outline on an arm too thin to hold one', () => {
    // A 2px arm cannot contain a 4px inset border; drawing it would produce a
    // rect with negative size, which SVG renders unpredictably.
    const { strokedRects } = draw(
      v1Cross({
        thickness: 2,
        innerOutlineEnabled: true,
        innerOutlineThickness: 4,
        asymmetricArms: true,
        armThickness: { top: 2, bottom: 8, left: 2, right: 8 },
      }),
    );
    expect(strokedRects).toHaveLength(2);
    for (const r of strokedRects) {
      expect(r.w).toBeGreaterThan(0);
      expect(r.h).toBeGreaterThan(0);
    }
  });

  it('coexists with the outer outline', () => {
    const { rects, strokedRects } = draw(
      v1Cross({
        outlineEnabled: true,
        innerOutlineEnabled: true,
        innerOutlineThickness: 1,
      }),
    );
    expect(rects).toHaveLength(12); // 4 arms × (outer + body + inner)
    expect(strokedRects).toHaveLength(4);
  });

  it('draws an inner outline on a square centre dot', () => {
    const { strokedRects } = draw(
      v1Cross({
        centerDotEnabled: true,
        centerDotShape: 'square',
        centerDotSize: 8,
        innerOutlineEnabled: true,
        innerOutlineThickness: 1,
      }),
    );
    // four arms + the dot
    expect(strokedRects).toHaveLength(5);
  });
});

describe('renderer: existing dynamic behaviour still works', () => {
  it('expands the gap while firing when recoil bloom is on', () => {
    const idle = draw(v1Cross({ dynamicFiring: true, firingBloomExpansion: 6, outlineEnabled: false }));
    const firing = draw(
      v1Cross({ dynamicFiring: true, firingBloomExpansion: 6, outlineEnabled: false }),
      { isFiring: true },
    );
    // gap 2 -> 8 pushes the bottom arm down by 6
    expect(firing.rects[1].y - idle.rects[1].y).toBe(6);
  });

  it('does not bloom while firing when recoil is off', () => {
    const idle = draw(v1Cross({ dynamicFiring: false, outlineEnabled: false }));
    const firing = draw(v1Cross({ dynamicFiring: false, outlineEnabled: false }), { isFiring: true });
    expect(firing.rects).toEqual(idle.rects);
  });

  it('shrinks the arms when ADS morph is set to shrink', () => {
    const hip = draw(v1Cross({ adsMorphEnabled: true, adsStyle: 'shrink', adsScale: 0.5, outlineEnabled: false }));
    const ads = draw(
      v1Cross({ adsMorphEnabled: true, adsStyle: 'shrink', adsScale: 0.5, outlineEnabled: false }),
      { isAds: true },
    );
    expect(ads.rects[0].h).toBe(hip.rects[0].h * 0.5);
  });

  it('hides the arms and shows only the dot for dot-only ADS', () => {
    const { rects, circles } = draw(
      v1Cross({
        adsMorphEnabled: true,
        adsStyle: 'dot-only',
        centerDotEnabled: false,
        centerDotShape: 'circle',
        centerDotSize: 3,
        outlineEnabled: false,
      }),
      { isAds: true },
    );
    expect(rects).toHaveLength(0);
    expect(circles.length).toBe(1);
  });

  it('compresses horizontally for 4:3 stretched', () => {
    const { svgStyle } = draw(v1Cross({ stretchedMode: '4:3' }));
    expect(svgStyle).toContain('scale(0.75, 1)');
  });

  it('emits a glow filter only when glow is enabled', () => {
    expect(draw(v1Cross({ glowEnabled: false })).svg.querySelector('filter')).toBeNull();
    expect(draw(v1Cross({ glowEnabled: true })).svg.querySelector('filter')).toBeTruthy();
  });

  it('gives two simultaneously rendered reticles distinct filter ids', () => {
    // Both share the config id; without an instance-unique id the second
    // reticle would bind to the first one's filter.
    const a = draw(v1Cross({ glowEnabled: true, glowBlur: 4 }));
    const b = draw(v1Cross({ glowEnabled: true, glowBlur: 4 }));
    const idA = a.svg.querySelector('filter')!.getAttribute('id');
    const idB = b.svg.querySelector('filter')!.getAttribute('id');
    expect(idA).toBeTruthy();
    expect(idA).not.toBe(idB);
    expect(a.svg.innerHTML).toContain(`url(#${idA})`);
  });
});

describe('renderer: it never emits invalid SVG numbers', () => {
  it('produces finite, non-negative dimensions for an extreme config', () => {
    const { rects, viewSize } = draw(
      v1Cross({
        asymmetricArms: true,
        length: 50,
        thickness: 20,
        gap: 50,
        armLength: { top: 50, bottom: 50, left: 50, right: 50 },
        armThickness: { top: 20, bottom: 20, left: 20, right: 20 },
        outlineEnabled: true,
        outlineThickness: 6,
        innerOutlineEnabled: true,
        innerOutlineThickness: 4,
        scale: 3,
        rotation: 360,
        circleEnabled: true,
        circleRadius: 100,
      }),
    );
    expect(Number.isFinite(viewSize)).toBe(true);
    for (const r of rects) {
      for (const v of Object.values(r)) {
        expect(Number.isFinite(v)).toBe(true);
        expect(v).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('draws nothing broken when every arm is disabled', () => {
    const { rects } = draw(
      v1Cross({
        hasTopArm: false,
        hasBottomArm: false,
        hasLeftArm: false,
        hasRightArm: false,
      }),
    );
    expect(rects).toHaveLength(0);
  });
});
