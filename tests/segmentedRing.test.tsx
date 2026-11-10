// @vitest-environment jsdom
import React from 'react';
import { render } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

import { ReticleRenderer, arcPath, ringArcs } from '../src/components/ReticleRenderer';
import {
  LIMITS,
  V3_DEFAULTS,
  normalizeCrosshairConfig,
} from '../src/lib/crosshairSchema';
import { PRO_CROSSHAIR_ENTRIES } from '../src/lib/proCrosshairs';
import type { CrosshairConfig } from '../src/types/crosshair';

/**
 * The v3 segmented ring: geometry, schema compatibility with every config that
 * predates it, and the two Gold Series designs that introduced it.
 *
 * Arc endpoints are checked against trigonometry written out here, not against
 * the renderer's own helper, so a mistake in `arcPath` cannot hide itself.
 */

const ARC_CROWN = PRO_CROSSHAIR_ENTRIES.find((e) => e.config.id === 'pc-gold-arc-crown')!;
const COMPACT_MARK = PRO_CROSSHAIR_ENTRIES.find((e) => e.config.id === 'pc-gold-compact-mark')!;

function baseConfig(overrides: Partial<CrosshairConfig> = {}): CrosshairConfig {
  return {
    id: 'test-ring',
    name: 'Ring',
    game: 'universal',
    topology: 'circle',
    length: 4,
    thickness: 2,
    gap: 2,
    hasTopArm: false,
    hasBottomArm: false,
    hasLeftArm: false,
    hasRightArm: false,
    primaryColor: '#00ffcc',
    primaryOpacity: 1,
    centerDotEnabled: false,
    centerDotSize: 2,
    centerDotShape: 'square',
    centerDotColor: '#00ffcc',
    centerDotOpacity: 1,
    outlineEnabled: false,
    outlineColor: '#000000',
    outlineThickness: 1,
    outlineOpacity: 1,
    circleEnabled: true,
    circleRadius: 28,
    circleThickness: 4,
    circleColor: '#dc583e',
    circleOpacity: 1,
    glowEnabled: false,
    glowColor: '#00ffcc',
    glowBlur: 0,
    offsetX: 0,
    offsetY: 0,
    stretchedMode: 'none',
    stretchCompressionRatio: 0.75,
    dynamicFiring: false,
    firingBloomExpansion: 5,
    firingDecayMs: 120,
    adsMorphEnabled: false,
    adsTrigger: 'right-click',
    adsStyle: 'shrink',
    adsScale: 0.6,
    ...overrides,
  };
}

/** Endpoints of every arc path in a rendered reticle, as [startDeg,endDeg]. */
function arcAngles(container: HTMLElement, radius: number, centre: number): number[][] {
  const paths = Array.from(container.querySelectorAll('path[stroke-linecap="butt"]'));
  return paths
    .filter((p) => p.getAttribute('d')?.includes(`A ${radius} ${radius}`))
    .map((p) => {
      const m = /^M ([\d.-]+) ([\d.-]+) A [\d.-]+ [\d.-]+ 0 [01] 0 ([\d.-]+) ([\d.-]+)$/.exec(
        p.getAttribute('d')!,
      );
      expect(m, `unparsable arc path: ${p.getAttribute('d')}`).not.toBeNull();
      const [, x0, y0, x1, y1] = m!.map(Number);
      const angle = (x: number, y: number) => {
        const deg = (Math.atan2(-(y - centre), x - centre) * 180) / Math.PI;
        // Path coordinates carry three decimals, so angles carry ~0.001 degrees
        // of honest rounding; compare at two decimals.
        return Math.round((((deg % 360) + 360) % 360) * 100) / 100;
      };
      return [angle(x0, y0), angle(x1, y1)];
    });
}

describe('ringArcs', () => {
  it('is the historical full circle when nothing is set', () => {
    expect(ringArcs({})).toEqual([[0, 360]]);
    expect(ringArcs({ circleSegments: 1 })).toEqual([[0, 360]]);
    expect(ringArcs({ circleSegments: 4, circleArcSpan: 360 })).toEqual([[0, 360]]);
  });

  it('spaces segments evenly and centres them on the offset', () => {
    expect(ringArcs({ circleSegments: 4, circleArcSpan: 40, circleArcOffset: 45 })).toEqual([
      [25, 65],
      [115, 155],
      [205, 245],
      [295, 335],
    ]);
  });

  it('turns the pattern with the reticle rotation', () => {
    expect(ringArcs({ circleSegments: 4, circleArcSpan: 40, circleArcOffset: 45 }, 90)).toEqual([
      [115, 155],
      [205, 245],
      [295, 335],
      [385, 425],
    ]);
  });

  it('arcPath keeps both endpoints on the circle and takes the short way', () => {
    const d = arcPath(50, 50, 20, 0, 90);
    expect(d).toBe('M 70 50 A 20 20 0 0 0 50 30');
    const wide = arcPath(50, 50, 20, 0, 270);
    expect(wide).toContain('0 1 0'); // large-arc flag set past 180 degrees
  });
});

describe('schema v3 compatibility', () => {
  it('writes neutral segment fields onto a pre-v3 blob without repairs', () => {
    const { config, repairs } = normalizeCrosshairConfig(baseConfig());
    expect(repairs).toEqual([]);
    expect(config.circleSegments).toBe(V3_DEFAULTS.circleSegments);
    expect(config.circleArcSpan).toBe(V3_DEFAULTS.circleArcSpan);
    expect(config.circleArcOffset).toBe(V3_DEFAULTS.circleArcOffset);
  });

  it('clamps segment fields into the published ranges', () => {
    const { config, repairs } = normalizeCrosshairConfig(
      baseConfig({ circleSegments: 99, circleArcSpan: 400, circleArcOffset: -10 }),
    );
    expect(config.circleSegments).toBe(LIMITS.circleSegments.max);
    expect(config.circleArcSpan).toBe(LIMITS.circleArcSpan.max);
    expect(config.circleArcOffset).toBe(LIMITS.circleArcOffset.min);
    expect(repairs).toHaveLength(3);
  });

  it('accepts the Gold Series configs with no repairs', () => {
    for (const entry of [ARC_CROWN, COMPACT_MARK]) {
      const { repairs } = normalizeCrosshairConfig(entry.config);
      expect(repairs, `${entry.config.id}: ${repairs.join('; ')}`).toEqual([]);
    }
  });
});

describe('renderer', () => {
  it('draws four butt-capped arcs and the green point for Arc Crown', () => {
    const { container } = render(<ReticleRenderer config={ARC_CROWN.config} />);
    const body = Array.from(container.querySelectorAll('path[stroke="#dc583e"]'));
    expect(body).toHaveLength(4);
    for (const p of body) expect(p.getAttribute('stroke-linecap')).toBe('butt');
    const angles = arcAngles(container, 28, 47).sort((a, b) => a[0] - b[0]);
    expect(angles).toEqual([
      [25, 65],
      [115, 155],
      [205, 245],
      [295, 335],
    ]);
    const dot = container.querySelector('circle[fill="#28f953"]');
    expect(dot).not.toBeNull();
    expect(dot!.getAttribute('r')).toBe('3.5');
    // No complete circle stands in for the segments.
    expect(container.querySelectorAll('circle[r="28"]')).toHaveLength(0);
  });

  it('still draws a complete circle for legacy ring configs', () => {
    const { container } = render(<ReticleRenderer config={baseConfig()} />);
    expect(container.querySelectorAll('circle[r="28"]')).toHaveLength(1);
    expect(container.querySelectorAll('path[stroke-linecap="butt"]')).toHaveLength(0);
  });

  it('keeps arc geometry in config units at every scale', () => {
    const at = (scale: number) => {
      const { container } = render(<ReticleRenderer config={ARC_CROWN.config} scale={scale} />);
      return Array.from(container.querySelectorAll('path[stroke="#dc583e"]')).map((p) =>
        p.getAttribute('d'),
      );
    };
    const one = at(1);
    for (const scale of [1.25, 1.5, 2]) {
      expect(at(scale), `scale ${scale} moved the arcs`).toEqual(one);
    }
  });

  it('outlines each segment when an outline is enabled', () => {
    const { container } = render(
      <ReticleRenderer
        config={baseConfig({
          circleSegments: 4,
          circleArcSpan: 40,
          circleArcOffset: 45,
          outlineEnabled: true,
          outlineThickness: 1,
        })}
      />,
    );
    expect(container.querySelectorAll('path[stroke="#000000"]')).toHaveLength(4);
    expect(container.querySelectorAll('path[stroke="#dc583e"]')).toHaveLength(4);
  });
});

describe('Gold Series metadata', () => {
  it('labels both designs as gold, inspired, and unambiguously unofficial', () => {
    for (const entry of [ARC_CROWN, COMPACT_MARK]) {
      expect(entry.meta.series).toBe('gold');
      expect(entry.meta.category).toBe('gold');
      expect(entry.meta.tier).toBe('inspired');
      expect(entry.meta.inspiration).toContain('Not an official preset');
      expect(entry.meta.inspiration).toContain('no endorsement implied');
    }
  });

  it('matches the measured references: four 40-degree arcs, hollow compact cross', () => {
    const crown = ARC_CROWN.config;
    expect(crown.circleSegments).toBe(4);
    expect(crown.circleArcSpan).toBe(40);
    expect(crown.circleArcOffset).toBe(45);
    expect(crown.circleColor).toBe('#dc583e');
    expect(crown.centerDotColor).toBe('#28f953');
    const mark = COMPACT_MARK.config;
    expect(mark.primaryColor).toBe('#6af469');
    expect(mark.length).toBe(12);
    expect(mark.thickness).toBe(4);
    expect(mark.gap).toBe(5);
    expect(mark.outlineEnabled).toBe(false);
    expect(mark.centerDotEnabled).toBe(false);
  });
});

describe('rendered previews', () => {
  it('writes the two Gold Series SVGs from the real renderer', () => {
    const outDir = path.join(process.cwd(), 'docs', 'design', 'gold-series');
    fs.mkdirSync(outDir, { recursive: true });
    for (const [entry, file] of [
      [ARC_CROWN, 'arc-crown.svg'],
      [COMPACT_MARK, 'compact-mark.svg'],
    ] as const) {
      // The renderer's root is a layout <div>; lift the <svg> element out of it
      // and give it the namespace a standalone .svg file needs.
      const markup = renderToStaticMarkup(<ReticleRenderer config={entry.config} />);
      const start = markup.indexOf('<svg');
      expect(start).toBeGreaterThan(-1);
      const svg = markup
        .slice(start, markup.lastIndexOf('</svg>') + 6)
        .replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
      fs.writeFileSync(path.join(outDir, file), svg, 'utf-8');
    }
    const crown = fs.readFileSync(path.join(outDir, 'arc-crown.svg'), 'utf-8');
    expect((crown.match(/stroke="#dc583e"/g) ?? [])).toHaveLength(4);
    expect(crown).toContain('#28f953');
    const mark = fs.readFileSync(path.join(outDir, 'compact-mark.svg'), 'utf-8');
    expect((mark.match(/fill="#6af469"/g) ?? []).length).toBeGreaterThanOrEqual(4);
  });
});
