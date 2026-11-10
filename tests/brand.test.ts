import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { generateAll } from '../scripts/brand/logo.mjs';
import { CX_SHAPES, CX_SIMPLE_SHAPES } from '../src/brand/geometry';

/**
 * One geometry, every surface. scripts/brand/logo.mjs generates the website's
 * static assets, both React geometry modules and the Windows application icon
 * from a single point list; this test re-runs it and fails on any drift, so the
 * exe icon, the tray icon, the favicon and the nav mark cannot become four
 * slightly different logos over time.
 */

const ROOT = join(__dirname, '..');
const generated = generateAll({ write: false });

describe('generated brand outputs match the repository', () => {
  for (const rel of ['src/brand/geometry.ts', 'website/src/lib/brandGeometry.ts']) {
    it(rel, () => {
      expect(readFileSync(join(ROOT, rel), 'utf8')).toBe(generated[rel]);
    });
  }

  for (const rel of ['build/icon.ico', 'build/icon.png']) {
    it(rel, () => {
      expect(readFileSync(join(ROOT, rel)).equals(generated[rel])).toBe(true);
    });
  }
});

describe('the Windows application icon', () => {
  const ico = readFileSync(join(ROOT, 'build', 'icon.ico'));

  it('carries the full frame ladder electron-builder needs', () => {
    expect(ico.readUInt16LE(2)).toBe(1);
    const count = ico.readUInt16LE(4);
    expect(count).toBe(7);
    const sizes: number[] = [];
    for (let i = 0; i < count; i += 1) {
      const at = 6 + i * 16;
      const w = ico[at] === 0 ? 256 : ico[at];
      sizes.push(w);
    }
    expect(sizes).toEqual([16, 24, 32, 48, 64, 128, 256]);
  });

  it('is PNG-framed (Vista onwards), not BMP', () => {
    const first = ico.readUInt32LE(6 + 12);
    const png = ico.subarray(first, first + 8);
    expect([...png]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  });

  it('build/icon.png is a 512px tile', () => {
    const png = readFileSync(join(ROOT, 'build', 'icon.png'));
    expect(png.readUInt32BE(16)).toBe(512);
    expect(png.readUInt32BE(20)).toBe(512);
  });
});

describe('the monogram geometry', () => {
  it('stays inside the 96-unit grid', () => {
    for (const quad of [...CX_SHAPES, ...CX_SIMPLE_SHAPES]) {
      for (const [x, y] of quad) {
        expect(x).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThanOrEqual(96);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(y).toBeLessThanOrEqual(96);
      }
    }
  });

  it('keeps every quad convex, so the scanline and the browser agree', () => {
    for (const quad of CX_SHAPES) {
      let sign = 0;
      for (let i = 0; i < 4; i += 1) {
        const [x0, y0] = quad[i];
        const [x1, y1] = quad[(i + 1) % 4];
        const [x2, y2] = quad[(i + 2) % 4];
        const cross = (x1 - x0) * (y2 - y1) - (y1 - y0) * (x2 - x1);
        if (cross !== 0) {
          if (sign === 0) sign = Math.sign(cross);
          expect(Math.sign(cross)).toBe(sign);
        }
      }
    }
  });

  it('simplification is a subset family: same C, one diagonal instead of the K', () => {
    expect(CX_SIMPLE_SHAPES.slice(0, 5)).toEqual(CX_SHAPES.slice(0, 5));
    expect(CX_SIMPLE_SHAPES.length).toBe(6);
    expect(CX_SHAPES.length).toBe(7);
  });
});
