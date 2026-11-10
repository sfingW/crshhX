import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { generateAll } from '../../scripts/brand/logo.mjs';
import { CX_VIEWBOX, LOCKUP } from '../src/lib/brandGeometry';

/**
 * The brand is generated, not hand-maintained: scripts/brand/logo.mjs owns the
 * geometry and emits every asset. These tests re-run the generator in memory
 * and compare against the checked-in files, so a hand-edited favicon, a
 * re-exported icon or a drifted geometry module all fail here instead of
 * shipping as two logos that almost match.
 */

const PUBLIC = join(__dirname, '..', 'public');
const generated = generateAll({ write: false });

const read = (rel: string) => readFileSync(join(__dirname, '..', rel.replace(/^website\//, '')));

describe('generated brand assets match the checked-in files', () => {
  const textAssets = [
    'website/public/logo.svg',
    'website/public/logo-light.svg',
    'website/public/logo-mono.svg',
    'website/public/symbol.svg',
    'website/public/symbol-light.svg',
    'website/public/favicon.svg',
    'website/src/lib/brandGeometry.ts',
  ];
  for (const rel of textAssets) {
    it(rel, () => {
      expect(read(rel).toString('utf8')).toBe(generated[rel]);
    });
  }

  const binaryAssets = [
    'website/public/favicon.ico',
    'website/public/apple-touch-icon.png',
    'website/public/og/cover.png',
  ];
  for (const rel of binaryAssets) {
    it(rel, () => {
      expect(read(rel).equals(generated[rel])).toBe(true);
    });
  }
});

describe('the vector assets are clean SVG', () => {
  for (const rel of ['logo.svg', 'logo-light.svg', 'logo-mono.svg', 'symbol.svg', 'symbol-light.svg', 'favicon.svg']) {
    it(rel, () => {
      const svg = readFileSync(join(PUBLIC, rel), 'utf8');
      expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"')).toBe(true);
      // No embedded rasters, no metadata payload: paths and at most a field rect.
      expect(svg).not.toContain('<image');
      expect(svg).not.toContain('base64');
      expect(svg.length).toBeLessThan(4096);
    });
  }

  it('the symbol family shares one viewBox', () => {
    expect(CX_VIEWBOX).toBe('0 0 96 96');
    for (const rel of ['symbol.svg', 'symbol-light.svg', 'favicon.svg']) {
      expect(readFileSync(join(PUBLIC, rel), 'utf8')).toContain('viewBox="0 0 96 96"');
    }
    expect(readFileSync(join(PUBLIC, 'logo.svg'), 'utf8')).toContain(`viewBox="${LOCKUP.viewBox}"`);
  });

  it('the monochrome lockup carries no colour at all', () => {
    const mono = readFileSync(join(PUBLIC, 'logo-mono.svg'), 'utf8');
    expect(mono).toContain('currentColor');
    expect(mono).not.toMatch(/#[0-9a-f]{6}/i);
  });
});

describe('the raster assets are what the head tags promise', () => {
  const pngSize = (buf: Buffer) => ({ width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) });

  it('favicon.ico is a multi-frame icon', () => {
    const ico = readFileSync(join(PUBLIC, 'favicon.ico'));
    expect(ico.readUInt16LE(2)).toBe(1); // type: icon
    expect(ico.readUInt16LE(4)).toBe(3); // 16, 32, 48
  });

  it('apple-touch-icon.png is 180x180', () => {
    expect(pngSize(readFileSync(join(PUBLIC, 'apple-touch-icon.png')))).toEqual({
      width: 180,
      height: 180,
    });
  });

  it('the Open Graph cover is 1200x630', () => {
    expect(pngSize(readFileSync(join(PUBLIC, 'og', 'cover.png')))).toEqual({
      width: 1200,
      height: 630,
    });
  });
});
