import { beforeEach, describe, expect, it } from 'vitest';
import {
  compositeOver,
  contrastRatio,
  contrastVerdict,
  describeColor,
  expandHex,
  hexToHsl,
  hexToRgb,
  hslToHex,
  isCanonicalHex,
  parseColorInput,
  pushSwatch,
  readableTextColor,
  relativeLuminance,
  rgbToHex,
} from '../src/lib/colorUtils';
import {
  loadSwatches,
  rememberRecentColor,
  removeSwatchColor,
  saveSwatchColor,
  saveSwatches,
} from '../src/lib/storage';

/**
 * Colour utilities and swatch persistence.
 *
 * These are the foundation of the editor's colour field, so the contract that
 * matters most is: *whatever a user types, the config only ever receives a
 * canonical `#rrggbb` string.* The renderer puts that value straight into an SVG
 * `fill`, and a malformed fill silently renders as black.
 */

describe('hex canonicalisation', () => {
  it('recognises only lower-case six-digit hex as canonical', () => {
    expect(isCanonicalHex('#00ffcc')).toBe(true);
    expect(isCanonicalHex('#00FFCC')).toBe(false);
    expect(isCanonicalHex('#0fc')).toBe(false);
    expect(isCanonicalHex('00ffcc')).toBe(false);
    expect(isCanonicalHex('')).toBe(false);
    expect(isCanonicalHex(null)).toBe(false);
    expect(isCanonicalHex(42)).toBe(false);
  });

  it('expands three-digit hex without changing the colour', () => {
    expect(expandHex('#f0a')).toBe('#ff00aa');
    expect(expandHex('#fff')).toBe('#ffffff');
    expect(expandHex('#000')).toBe('#000000');
    expect(expandHex('#00ffcc')).toBe('#00ffcc');
  });
});

describe('parseColorInput accepts the formats users actually type', () => {
  const cases: Array<[string, string]> = [
    ['#00ffcc', '#00ffcc'],
    ['00ffcc', '#00ffcc'],
    ['#0FC', '#00ffcc'],
    ['0fc', '#00ffcc'],
    ['#00FFCC', '#00ffcc'],
    ['  #00ffcc  ', '#00ffcc'],
    ['rgb(0, 255, 204)', '#00ffcc'],
    ['rgb(0,255,204)', '#00ffcc'],
    ['rgba(0, 255, 204, 0.5)', '#00ffcc'],
    ['rgb(0 255 204 / 0.5)', '#00ffcc'],
    ['RGB(0, 255, 204)', '#00ffcc'],
  ];

  it.each(cases)('parses %j into %j', (input, expected) => {
    expect(parseColorInput(input)).toBe(expected);
  });

  it('rejects things that are not colours', () => {
    for (const bad of ['', '   ', '#gggggg', '#12345', 'not-a-colour', 'rgb(0,0)', '#00ffcc00']) {
      expect(parseColorInput(bad), `expected ${JSON.stringify(bad)} to be rejected`).toBeNull();
    }
  });

  it('clamps a too-large rgb channel instead of producing invalid hex', () => {
    expect(parseColorInput('rgb(300, 0, 0)')).toBe('#ff0000');
    expect(parseColorInput('rgb(255, 255, 999)')).toBe('#ffffff');
  });

  it('rejects structurally broken rgb() rather than guessing', () => {
    expect(parseColorInput('rgb(999, -40, 204)')).toBeNull();
  });

  it('does not accept CSS colour names — the editor stores precise hex only', () => {
    expect(parseColorInput('white')).toBeNull();
    expect(parseColorInput('transparent')).toBeNull();
  });
});

describe('hex / rgb conversion', () => {
  it('converts both ways', () => {
    expect(hexToRgb('#00ffcc')).toEqual({ r: 0, g: 255, b: 204 });
    expect(rgbToHex({ r: 0, g: 255, b: 204 })).toBe('#00ffcc');
    expect(hexToRgb('#000000')).toEqual({ r: 0, g: 0, b: 0 });
    expect(rgbToHex({ r: 255, g: 255, b: 255 })).toBe('#ffffff');
  });

  it('returns null for malformed hex rather than NaN channels', () => {
    expect(hexToRgb('nope')).toBeNull();
    expect(hexToRgb('#12345')).toBeNull();
  });

  it('clamps rgb input to the byte range', () => {
    expect(rgbToHex({ r: 400, g: -20, b: 128 })).toBe('#ff0080');
  });

  it('round-trips every colour used by the shipped preset library', () => {
    for (const hex of ['#00ffff', '#00ff66', '#ffff00', '#ffffff', '#ff00aa', '#ff3333', '#000000']) {
      const rgb = hexToRgb(hex);
      expect(rgb).not.toBeNull();
      expect(rgbToHex(rgb!)).toBe(hex);
    }
  });
});

describe('hex / hsl conversion', () => {
  it('reports the obvious hues', () => {
    expect(hexToHsl('#ff0000')).toMatchObject({ h: 0, s: 100, l: 50 });
    expect(hexToHsl('#00ff00')).toMatchObject({ h: 120, s: 100, l: 50 });
    expect(hexToHsl('#0000ff')).toMatchObject({ h: 240, s: 100, l: 50 });
    expect(hexToHsl('#ffffff')).toMatchObject({ s: 0, l: 100 });
    expect(hexToHsl('#000000')).toMatchObject({ s: 0, l: 0 });
  });

  it('round-trips hsl back to hex within a byte of tolerance', () => {
    for (const hex of ['#00ffcc', '#ff00aa', '#3366cc', '#808080']) {
      const back = hexToRgb(hslToHex(hexToHsl(hex)!))!;
      const original = hexToRgb(hex)!;
      expect(Math.abs(back.r - original.r)).toBeLessThanOrEqual(1);
      expect(Math.abs(back.g - original.g)).toBeLessThanOrEqual(1);
      expect(Math.abs(back.b - original.b)).toBeLessThanOrEqual(1);
    }
  });

  it('returns null for malformed input', () => {
    expect(hexToHsl('bogus')).toBeNull();
  });
});

describe('WCAG contrast', () => {
  it('gives 21:1 for black on white and 1:1 for identical colours', () => {
    expect(contrastRatio('#ffffff', '#000000')).toBe(21);
    expect(contrastRatio('#000000', '#ffffff')).toBe(21);
    expect(contrastRatio('#00ffcc', '#00ffcc')).toBe(1);
  });

  it('is symmetric — order of the two colours does not matter', () => {
    expect(contrastRatio('#00ffcc', '#1b1c22')).toBe(contrastRatio('#1b1c22', '#00ffcc'));
  });

  it('measures luminance at the extremes', () => {
    expect(relativeLuminance('#000000')).toBe(0);
    expect(relativeLuminance('#ffffff')).toBe(1);
  });

  it('falls back to a neutral ratio for unparseable input', () => {
    expect(contrastRatio('nope', '#ffffff')).toBe(1);
  });

  it('grades ratios against the WCAG thresholds', () => {
    expect(contrastVerdict(21).tone).toBe('good');
    expect(contrastVerdict(7).tone).toBe('good');
    expect(contrastVerdict(4.5).tone).toBe('good');
    expect(contrastVerdict(3).tone).toBe('fair');
    expect(contrastVerdict(1.8).tone).toBe('poor');
    expect(contrastVerdict(1).tone).toBe('poor');
    expect(contrastVerdict(1).label).toMatch(/invisible/i);
  });

  it('shows why a crosshair can vanish: white on a bright background', () => {
    expect(contrastRatio('#ffffff', '#f5f5f5')).toBeLessThan(1.5);
    expect(contrastVerdict(contrastRatio('#ffffff', '#f5f5f5')).tone).toBe('poor');
    expect(contrastRatio('#000000', '#f5f5f5')).toBeGreaterThan(15);
  });
});

describe('opacity compositing', () => {
  it('blends halfway to the background at 50% opacity', () => {
    expect(compositeOver('#ffffff', '#000000', 0.5)).toBe('#808080');
  });

  it('returns the foreground unchanged at full opacity and the background at zero', () => {
    expect(compositeOver('#00ffcc', '#101010', 1)).toBe('#00ffcc');
    expect(compositeOver('#00ffcc', '#101010', 0)).toBe('#101010');
  });

  it('clamps nonsense opacity instead of extrapolating', () => {
    expect(compositeOver('#ffffff', '#000000', 5)).toBe('#ffffff');
    expect(compositeOver('#ffffff', '#000000', -3)).toBe('#000000');
    expect(compositeOver('#ffffff', '#000000', NaN)).toBe('#ffffff');
  });

  it('passes the foreground through when either colour is malformed', () => {
    expect(compositeOver('nope', '#000000', 0.5)).toBe('nope');
  });

  it('reduces the measured contrast, which is the point of the helper', () => {
    const full = contrastRatio('#00ffcc', '#000000');
    const faded = contrastRatio(compositeOver('#00ffcc', '#000000', 0.4), '#000000');
    expect(faded).toBeLessThan(full);
  });
});

describe('readableTextColor picks legible chip text', () => {
  it('uses black on light colours and white on dark ones', () => {
    expect(readableTextColor('#ffffff')).toBe('#000000');
    expect(readableTextColor('#ffff00')).toBe('#000000');
    expect(readableTextColor('#00ffcc')).toBe('#000000');
    expect(readableTextColor('#000000')).toBe('#ffffff');
    expect(readableTextColor('#8800ff')).toBe('#ffffff');
    expect(readableTextColor('#ff00aa')).toBe('#ffffff');
  });

  it('returns white when the colour cannot be parsed', () => {
    expect(readableTextColor('garbage')).toBe('#ffffff');
  });
});

describe('describeColor names a colour in plain English', () => {
  it('names exact and near-exact matches', () => {
    expect(describeColor('#ff0000')).toBe('Red #ff0000');
    expect(describeColor('#00ffff')).toBe('Cyan #00ffff');
    expect(describeColor('#fe0102')).toBe('Red #fe0102');
  });

  it('falls back to the bare hex when nothing is close enough', () => {
    expect(describeColor('#123456')).toBe('#123456');
  });

  it('returns the input untouched when it is not a colour', () => {
    expect(describeColor('nope')).toBe('nope');
  });
});

describe('pushSwatch keeps a most-recent-first, de-duplicated, capped list', () => {
  it('prepends a new colour', () => {
    expect(pushSwatch(['#ffffff'], '#000000')).toEqual(['#000000', '#ffffff']);
  });

  it('moves an existing colour to the front instead of duplicating it', () => {
    expect(pushSwatch(['#ffffff', '#000000', '#ff0000'], '#000000')).toEqual([
      '#000000',
      '#ffffff',
      '#ff0000',
    ]);
  });

  it('canonicalises before comparing, so #FFF and #ffffff are the same entry', () => {
    expect(pushSwatch(['#ffffff'], '#FFF')).toEqual(['#ffffff']);
  });

  it('caps the list and drops the oldest', () => {
    const list = ['#000001', '#000002', '#000003'];
    expect(pushSwatch(list, '#000004', 3)).toEqual(['#000004', '#000001', '#000002']);
  });

  it('ignores input that is not a colour and leaves the list untouched', () => {
    const list = ['#ffffff'];
    expect(pushSwatch(list, 'garbage')).toEqual(list);
    expect(pushSwatch(list, 'garbage')).not.toBe(list); // a copy, never a mutation
  });

  it('never mutates the incoming array', () => {
    const list = ['#ffffff'];
    pushSwatch(list, '#000000');
    expect(list).toEqual(['#ffffff']);
  });
});

describe('swatch persistence', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('starts empty', () => {
    expect(loadSwatches()).toEqual({ version: 1, recent: [], saved: [] });
  });

  it('records recent colours most-recent-first and de-duplicated', () => {
    rememberRecentColor('#ff0000');
    rememberRecentColor('#00ff00');
    rememberRecentColor('#ff0000');
    expect(loadSwatches().recent).toEqual(['#ff0000', '#00ff00']);
  });

  it('keeps recent and saved lists independent', () => {
    rememberRecentColor('#ff0000');
    saveSwatchColor('#00ff00');
    const store = loadSwatches();
    expect(store.recent).toEqual(['#ff0000']);
    expect(store.saved).toEqual(['#00ff00']);
  });

  it('removes a saved colour', () => {
    saveSwatchColor('#ff0000');
    saveSwatchColor('#00ff00');
    removeSwatchColor('#ff0000');
    expect(loadSwatches().saved).toEqual(['#00ff00']);
  });

  it('canonicalises what the user typed before storing it', () => {
    rememberRecentColor('#FFF');
    expect(loadSwatches().recent).toEqual(['#ffffff']);
  });

  it('drops colours that cannot be parsed', () => {
    rememberRecentColor('garbage');
    expect(loadSwatches().recent).toEqual([]);
  });

  it('caps the recent list at 18 entries', () => {
    for (let i = 0; i < 30; i++) {
      rememberRecentColor(rgbToHex({ r: i, g: 0, b: 0 }));
    }
    expect(loadSwatches().recent).toHaveLength(18);
  });

  it('caps the saved list at 36 entries', () => {
    const list = Array.from({ length: 50 }, (_, i) => rgbToHex({ r: i, g: 1, b: 2 }));
    saveSwatches({ version: 1, recent: [], saved: list });
    expect(loadSwatches().saved).toHaveLength(36);
  });

  it('recovers from a corrupt blob rather than throwing', () => {
    localStorage.setItem('crshhx_color_swatches', '{not json');
    expect(loadSwatches()).toEqual({ version: 1, recent: [], saved: [] });
  });

  it('recovers from a blob of the wrong shape', () => {
    localStorage.setItem('crshhx_color_swatches', JSON.stringify([1, 2, 3]));
    expect(loadSwatches()).toEqual({ version: 1, recent: [], saved: [] });

    localStorage.setItem(
      'crshhx_color_swatches',
      JSON.stringify({ recent: 'nope', saved: [{ evil: true }, null, '#ff0000'] }),
    );
    expect(loadSwatches()).toEqual({ version: 1, recent: [], saved: ['#ff0000'] });
  });

  it('stamps the current schema version even when reading an older record', () => {
    localStorage.setItem(
      'crshhx_color_swatches',
      JSON.stringify({ version: 0, recent: ['#ff0000'], saved: [] }),
    );
    expect(loadSwatches().version).toBe(1);
    expect(loadSwatches().recent).toEqual(['#ff0000']);
  });

  it('does not touch the other crshhx keys', () => {
    localStorage.setItem('crshhx_current_config', '{"keep":true}');
    rememberRecentColor('#ff0000');
    expect(localStorage.getItem('crshhx_current_config')).toBe('{"keep":true}');
  });
});
