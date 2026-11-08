/**
 * Colour utilities.
 *
 * Pure functions only — no DOM, no React, no storage — so the editor, the
 * testing studio and the import validator can all share one definition of what a
 * valid colour is. Persistence for swatches lives in `src/lib/storage.ts`.
 *
 * The canonical colour form throughout crshhx is a lower-case `#rrggbb` string.
 */

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

export interface Hsl {
  h: number; // 0-360
  s: number; // 0-100
  l: number; // 0-100
}

const HEX6 = /^#([0-9a-f]{6})$/;
/** 3-digit shorthand, accepting the upper-case a user pastes from a design tool. */
const HEX3_ANY = /^#([0-9a-fA-F]{3})$/;
const RGB_FN = /^rgba?\(\s*(\d{1,3})\s*[,\s]\s*(\d{1,3})\s*[,\s]\s*(\d{1,3})\s*(?:[,/]\s*[\d.]+\s*)?\)$/i;

/** True only for a canonical `#rrggbb` string. */
export function isCanonicalHex(value: unknown): value is string {
  return typeof value === 'string' && HEX6.test(value);
}

/**
 * Expands `#abc` to `#aabbcc`, lower-casing the result. Returns the input
 * unchanged if it is not 3-digit hex.
 */
export function expandHex(value: string): string {
  const m3 = HEX3_ANY.exec(value);
  if (!m3) return value;
  return `#${m3[1]
    .toLowerCase()
    .split('')
    .map((c) => c + c)
    .join('')}`;
}

/**
 * Tolerant parse of anything a user might type or paste.
 *
 * Accepts `#ff00aa`, `ff00aa`, `#f0a`, `f0a`, `rgb(255, 0, 170)`,
 * `rgba(255 0 170 / 1)` and `RGB(255,0,170)`, in any letter case. Returns
 * `null` rather than guessing when the input is not a colour — callers must not
 * silently fall back to a different colour than the user asked for.
 *
 * CSS colour *names* are deliberately not accepted: the editor's contract is
 * that a crosshair stores a precise hex value, and silently mapping "grey" to
 * one particular grey would be a guess.
 */
export function parseColorInput(raw: string): string | null {
  if (typeof raw !== 'string') return null;
  let value = raw.trim();
  if (!value) return null;

  const fn = RGB_FN.exec(value);
  if (fn) {
    const [r, g, b] = [fn[1], fn[2], fn[3]].map((n) => clampByte(Number(n)));
    return rgbToHex({ r, g, b });
  }

  // Upper-case is extremely common (every design tool copies `#00FFCC`), so
  // case is folded before matching. The canonical form stays lower-case.
  value = value.toLowerCase();
  if (!value.startsWith('#')) value = `#${value}`;
  value = expandHex(value);
  return HEX6.test(value) ? value : null;
}

function clampByte(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(255, Math.max(0, Math.round(n)));
}

export function hexToRgb(hex: string): Rgb | null {
  const m = HEX6.exec(expandHex(hex.toLowerCase()));
  if (!m) return null;
  const int = parseInt(m[1], 16);
  return { r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255 };
}

export function rgbToHex({ r, g, b }: Rgb): string {
  const part = (n: number) => clampByte(n).toString(16).padStart(2, '0');
  return `#${part(r)}${part(g)}${part(b)}`;
}

export function hexToHsl(hex: string): Hsl | null {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  return rgbToHsl(rgb);
}

export function rgbToHsl({ r, g, b }: Rgb): Hsl {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;
  const l = (max + min) / 2;

  let h = 0;
  let s = 0;
  if (delta !== 0) {
    s = delta / (1 - Math.abs(2 * l - 1));
    if (max === rn) h = ((gn - bn) / delta) % 6;
    else if (max === gn) h = (bn - rn) / delta + 2;
    else h = (rn - gn) / delta + 4;
    h *= 60;
    if (h < 0) h += 360;
  }

  return {
    h: Math.round(h * 10) / 10,
    s: Math.round(s * 1000) / 10,
    l: Math.round(l * 1000) / 10,
  };
}

export function hslToHex({ h, s, l }: Hsl): string {
  const sn = clamp(s, 0, 100) / 100;
  const ln = clamp(l, 0, 100) / 100;
  const hn = ((h % 360) + 360) % 360;

  const c = (1 - Math.abs(2 * ln - 1)) * sn;
  const x = c * (1 - Math.abs(((hn / 60) % 2) - 1));
  const m = ln - c / 2;

  let rgb: [number, number, number];
  if (hn < 60) rgb = [c, x, 0];
  else if (hn < 120) rgb = [x, c, 0];
  else if (hn < 180) rgb = [0, c, x];
  else if (hn < 240) rgb = [0, x, c];
  else if (hn < 300) rgb = [x, 0, c];
  else rgb = [c, 0, x];

  return rgbToHex({
    r: (rgb[0] + m) * 255,
    g: (rgb[1] + m) * 255,
    b: (rgb[2] + m) * 255,
  });
}

function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

/* ------------------------------------------------------------------ *
 * Contrast — used by the Testing Studio to judge visibility
 * ------------------------------------------------------------------ */

function channelLuminance(byte: number): number {
  const c = byte / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/** WCAG 2.1 relative luminance, 0 (black) to 1 (white). */
/**
 * WCAG relative luminance, 0 (black) to 1 (white).
 *
 * Returns `null` when the colour cannot be parsed. Treating junk as black would
 * report a maximum 21:1 contrast against white — the opposite of a useful
 * answer for a visibility readout.
 */
export function relativeLuminance(hex: string): number | null {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  return (
    0.2126 * channelLuminance(rgb.r) +
    0.7152 * channelLuminance(rgb.g) +
    0.0722 * channelLuminance(rgb.b)
  );
}

/**
 * WCAG contrast ratio between two colours, 1 (identical) to 21 (black on white).
 *
 * This is the number behind the Testing Studio's visibility readout: a crosshair
 * at 3:1 against a background is legible, at 1.4:1 it will vanish in a smoke.
 */
export function contrastRatio(foreground: string, background: string): number {
  const a = relativeLuminance(foreground);
  const b = relativeLuminance(background);
  if (a === null || b === null) return 1;
  const lighter = Math.max(a, b);
  const darker = Math.min(a, b);
  return Math.round(((lighter + 0.05) / (darker + 0.05)) * 100) / 100;
}

/** A short human verdict on a contrast ratio. */
export function contrastVerdict(ratio: number): {
  label: string;
  tone: 'good' | 'fair' | 'poor';
} {
  if (ratio >= 7) return { label: 'Excellent — clear in almost any scene', tone: 'good' };
  if (ratio >= 4.5) return { label: 'Good — legible against most backgrounds', tone: 'good' };
  if (ratio >= 3) return { label: 'Fair — may wash out in bright or busy scenes', tone: 'fair' };
  if (ratio >= 1.8) return { label: 'Poor — hard to see against similar tones', tone: 'poor' };
  return { label: 'Very poor — likely invisible on this background', tone: 'poor' };
}

/**
 * Blends a colour toward its background by an opacity factor.
 *
 * A crosshair at 60% opacity does not present its own colour to the eye, so the
 * contrast readout must use the composited result rather than the raw hex.
 */
export function compositeOver(foreground: string, background: string, opacity: number): string {
  const fg = hexToRgb(foreground);
  const bg = hexToRgb(background);
  if (!fg || !bg) return foreground;
  const a = clamp(Number.isFinite(opacity) ? opacity : 1, 0, 1);
  return rgbToHex({
    r: fg.r * a + bg.r * (1 - a),
    g: fg.g * a + bg.g * (1 - a),
    b: fg.b * a + bg.b * (1 - a),
  });
}

/** Black or white, whichever is legible on the given colour — for UI chips. */
export function readableTextColor(hex: string): string {
  const luminance = relativeLuminance(hex);
  return luminance !== null && luminance > 0.45 ? '#000000' : '#ffffff';
}

/**
 * A readable label for a colour: the hex plus its common name when it is close
 * enough to one, so a user can say "that's the cyan one" rather than reading
 * digits.
 */
const NAMED: Array<[string, string]> = [
  ['#ffffff', 'White'],
  ['#000000', 'Black'],
  ['#ff0000', 'Red'],
  ['#00ff00', 'Green'],
  ['#0000ff', 'Blue'],
  ['#ffff00', 'Yellow'],
  ['#00ffff', 'Cyan'],
  ['#ff00ff', 'Magenta'],
  ['#ff8800', 'Orange'],
  ['#00ff66', 'Spring green'],
  ['#ff00aa', 'Pink'],
  ['#8800ff', 'Purple'],
  ['#808080', 'Grey'],
];

export function describeColor(hex: string): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;

  let best: { name: string; distance: number } | null = null;
  for (const [candidate, name] of NAMED) {
    const c = hexToRgb(candidate);
    if (!c) continue;
    const distance =
      Math.abs(c.r - rgb.r) + Math.abs(c.g - rgb.g) + Math.abs(c.b - rgb.b);
    if (!best || distance < best.distance) best = { name, distance };
  }

  if (best && best.distance <= 96) return `${best.name} ${hex}`;
  return hex;
}

/** De-duplicates and caps a swatch list, most recent first. */
export function pushSwatch(list: readonly string[], hex: string, max = 18): string[] {
  const canonical = parseColorInput(hex);
  if (!canonical) return [...list];
  return [canonical, ...list.filter((c) => c !== canonical)].slice(0, max);
}
