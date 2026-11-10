/**
 * The crshhx brand geometry: one source of truth for every logo asset.
 *
 * Everything the product shows — the website mark, the favicon, the Apple touch
 * icon, the Open Graph cover, the Windows application and tray icons — is
 * derived from the point lists below. Nothing is drawn twice, so the variants
 * cannot drift apart, and `tests/brandAssets.test.ts` re-runs this file and
 * diffs its output against the checked-in assets to keep it that way.
 *
 * The monogram is a CX: an open hexagonal C whose lower terminal flows into the
 * leg of a K, the two diagonals meeting at a vertex that sits in the C's
 * aperture. Every edge is straight; every terminal is cut perpendicular to its
 * stroke or at 45°, so the mark stays crisp where curves would mush together —
 * 16px in a browser tab, 16px again in a Windows title bar.
 *
 * Run:  npm run brand:generate
 *
 * No dependencies beyond Node's own zlib: the rasteriser, the PNG encoder and
 * the ICO container below are deliberately small and readable, because a brand
 * pipeline nobody can audit is a brand pipeline nobody can fix.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

/* ------------------------------------------------------------------ palette */

export const INK = '#0b0c0e';        // the site's field, and the light logo's ink
export const PAPER = '#f4f6f5';      // near-white: the mark on dark fields
export const MINT = '#00e599';       // the product accent, src/studio/index.css
export const TILE = '#101317';       // application-icon field, a step off black

/* ----------------------------------------------------------------- monogram */

/**
 * The symbol on a 96 x 96 grid, as filled quadrilaterals. Each stroke is one
 * convex quad; same-colour overlaps read as a single fused shape, which is how
 * the C's mitres and the K's vertex stay seamless without boolean geometry.
 *
 * Thickness is 17 units throughout — one weight for every stroke, which is the
 * whole reason the mark survives being small.
 */
export const CX_SHAPES = [
  // C — top bar, held short of the aperture so the mouth stays open at 16px
  [[30, 15], [46, 15], [46, 32], [30, 32]],
  // C — top-left chamfer
  [[30, 15], [30, 32], [19, 43], [7, 31]],
  // C — left bar
  [[7, 31], [24, 31], [24, 65], [7, 65]],
  // C — bottom-left chamfer
  [[7, 53], [19, 53], [30, 64], [30, 81]],
  // C — bottom bar: its terminal is also the K leg's root
  [[30, 64], [54, 64], [54, 81], [30, 81]],
  // K — leg, rising out of the C's bottom terminal into the aperture
  [[45, 62], [57, 50], [89, 82], [77, 94]],
  // K — arm, overlapping the leg at the vertex so the joint is fused, not kissed
  [[45, 44], [57, 56], [89, 24], [77, 12]],
];

/**
 * The tiny-size simplification: the K collapses to a single diagonal through the
 * aperture, still on the same 45° and the same 17-unit weight. Used for the
 * favicon and the smallest Windows icon frames, where arm-plus-leg is noise.
 */
export const CX_SIMPLE_SHAPES = [
  [[30, 15], [46, 15], [46, 32], [30, 32]],
  [[30, 15], [30, 32], [19, 43], [7, 31]],
  [[7, 31], [24, 31], [24, 65], [7, 65]],
  [[7, 53], [19, 53], [30, 64], [30, 81]],
  [[30, 64], [54, 64], [54, 81], [30, 81]],
  [[45, 66], [57, 54], [89, 22], [77, 10]],
];

/** The symbol's drawing box. Every variant shares it. */
export const CX_VIEWBOX = '0 0 96 96';

/* ----------------------------------------------------------------- wordmark */

/**
 * Lowercase `crshhx` as monoline spines: cubics and lines, stroked at WORD_STROKE.
 * x-height 44, baseline y=44, ascenders to y=-14. Geometric and a little
 * austere on purpose — the wordmark should sit quietly beside the mark, not
 * compete with it.
 */
export const WORD_STROKE = 9.5;

export const WORD_GLYPHS = [
  { advance: 34, d: 'M 29 8 C 22 -1 7 3 7 22 C 7 41 22 45 29 36' },          // c
  { advance: 26, d: 'M 9 -14 L 9 44 M 9 16 C 11 3 20 -1 26 3' },            // r
  { advance: 30, d: 'M 25 7 C 19 -1 7 1 7 11 C 7 22 25 20 25 31 C 25 43 12 45 6 37' }, // s
  { advance: 34, d: 'M 9 -14 L 9 44 M 9 17 C 13 3 29 2 29 19 L 29 44' },     // h
  { advance: 34, d: 'M 9 -14 L 9 44 M 9 17 C 13 3 29 2 29 19 L 29 44' },     // h
  { advance: 34, d: 'M 7 0 L 29 44 M 29 0 L 7 44' },                        // x
];

export const WORD_TRACKING = 3.5;

/** Width of the whole wordmark at stroke width WORD_STROKE. */
export function wordmarkWidth() {
  const last = WORD_GLYPHS[WORD_GLYPHS.length - 1];
  return (
    WORD_GLYPHS.slice(0, -1).reduce((total, g) => total + g.advance + WORD_TRACKING, 0) +
    last.advance
  );
}

/* ------------------------------------------------------------------ layouts */

/**
 * The primary lockup: symbol, a mint rule, the wordmark. The rule is the only
 * accent inside the logo — the same mint the product already uses — and it is
 * the one element the monochrome variants drop.
 */
export const LOCKUP_RULE_GAP = 26;

export function lockupGeometry() {
  const word = wordmarkWidth();
  const ruleX = 96 + LOCKUP_RULE_GAP;
  const wordX = ruleX + LOCKUP_RULE_GAP;
  // The wordmark's optical centre: x-height band 0..44, shifted so its middle
  // meets the symbol's middle (48).
  const wordY = 48 - 22;
  return {
    viewBox: `0 0 ${wordX + word} 96`,
    rule: { x: ruleX, y1: 14, y2: 82, width: 2.5 },
    word: { x: wordX, y: wordY },
    width: wordX + word,
  };
}

/* ------------------------------------------------------------- svg emission */

const fmt = (n) => (Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0+$/, '').replace(/\.$/, ''));

function shapePaths(shapes, fill) {
  return shapes
    .map(
      (pts) =>
        `  <path d="${pts.map(([x, y], i) => `${i ? 'L' : 'M'}${fmt(x)} ${fmt(y)}`).join(' ')} Z" fill="${fill}"/>`,
    )
    .join('\n');
}

function wordPaths(offset, stroke, color) {
  let x = offset.x;
  const out = [];
  for (const glyph of WORD_GLYPHS) {
    out.push(
      `  <path d="${glyph.d}" transform="translate(${fmt(x)} ${fmt(offset.y)})" fill="none" stroke="${color}" stroke-width="${fmt(stroke)}" stroke-linecap="round" stroke-linejoin="round"/>`,
    );
    x += glyph.advance + WORD_TRACKING;
  }
  return out.join('\n');
}

/** Standalone symbol, transparent background. */
export function symbolSvg({ color = PAPER } = {}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${CX_VIEWBOX}" role="img" aria-label="crshhx">
${shapePaths(CX_SHAPES, color)}
</svg>
`;
}

/** Primary lockup: symbol + mint rule + wordmark, transparent background. */
export function lockupSvg({ mark = PAPER, word = PAPER, rule = MINT } = {}) {
  const g = lockupGeometry();
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${g.viewBox}" role="img" aria-label="crshhx">
${shapePaths(CX_SHAPES, mark)}
  <path d="M${fmt(g.rule.x)} ${fmt(g.rule.y1)} L${fmt(g.rule.x)} ${fmt(g.rule.y2)}" stroke="${rule}" stroke-width="${fmt(g.rule.width)}" fill="none"/>
${wordPaths(g.word, WORD_STROKE, word)}
</svg>
`;
}

/** Monochrome lockup: one currentColor, no accent, for any context. */
export function lockupMonoSvg() {
  const g = lockupGeometry();
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${g.viewBox}" role="img" aria-label="crshhx">
${shapePaths(CX_SHAPES, 'currentColor')}
${wordPaths(g.word, WORD_STROKE, 'currentColor')}
</svg>
`;
}

/**
 * The favicon and application-icon tile: the symbol on a dark rounded square.
 * At tab size the tile is what keeps the mark from dissolving into whatever
 * colour the browser chrome happens to be.
 */
export function tileSvg({ field = TILE, color = PAPER, accent = MINT } = {}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" role="img" aria-label="crshhx">
  <rect width="96" height="96" rx="22" fill="${field}"/>
  <g transform="translate(12 12) scale(0.75)">
${shapePaths(CX_SHAPES, color)
  .split('\n')
  .map((line) => `  ${line}`)
  .join('\n')}
  </g>
  <rect x="72" y="72" width="10" height="10" rx="2" fill="${accent}"/>
</svg>
`;
}

/* --------------------------------------------------------------- rasterising */

function flattenCubic(p0, p1, p2, p3, out, depth = 0) {
  // Graphics Gems flatness test: the control-point deviations u and v bound the
  // distance between the curve and its chord. Below epsilon in grid units the
  // chord is indistinguishable from the curve at any size we render.
  const eps = 16 * 0.12;
  const ux = 3 * p1[0] - 2 * p0[0] - p3[0];
  const uy = 3 * p1[1] - 2 * p0[1] - p3[1];
  const vx = 3 * p2[0] - p0[0] - 2 * p3[0];
  const vy = 3 * p2[1] - p0[1] - 2 * p3[1];
  const flat = Math.max(Math.abs(ux), Math.abs(uy), Math.abs(vx), Math.abs(vy)) <= eps;
  if (flat || depth > 6) {
    out.push(p3);
    return;
  }
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const p12 = mid(p1, p2);
  const q1 = mid(p0, p1);
  const q2 = mid(q1, p12);
  const r2 = mid(p2, p3);
  const r1 = mid(p12, r2);
  const q3 = mid(q2, r1);
  flattenCubic(p0, q1, q2, q3, out, depth + 1);
  flattenCubic(q3, r1, r2, p3, out, depth + 1);
}

/** Parse the tiny subset of path syntax the wordmark uses: M, L, C. */
export function spinePolylines(d) {
  const tokens = d.match(/[MLC]|-?\d*\.?\d+/g);
  const polys = [];
  let current = null;
  let i = 0;
  const num = () => Number(tokens[i++]);
  while (i < tokens.length) {
    const cmd = tokens[i++];
    if (cmd === 'M') {
      current = [[num(), num()]];
      polys.push(current);
    } else if (cmd === 'L') {
      current.push([num(), num()]);
    } else if (cmd === 'C') {
      const p0 = current[current.length - 1];
      const p1 = [num(), num()];
      const p2 = [num(), num()];
      const p3 = [num(), num()];
      flattenCubic(p0, p1, p2, p3, current);
    }
  }
  return polys;
}

export function circlePoly(cx, cy, r, steps = 20) {
  const pts = [];
  for (let k = 0; k < steps; k += 1) {
    const a = (k / steps) * Math.PI * 2;
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return pts;
}

/** A stroked polyline as filled quads plus round caps and joins. */
export function strokeToPolys(poly, width) {
  // Caps are 3% fatter than the stroke half-width on purpose: a cap circle of
  // exactly r is tangent to the segment quads' sides, and tangent edges produce
  // float ties in the scanline sort — hairline slivers inside the stroke. A
  // transversal crossing has no ties; the 3% bulge is invisible at every size.
  const r = (width / 2) * 1.03;
  const polys = [];
  for (let k = 0; k + 1 < poly.length; k += 1) {
    const [x0, y0] = poly[k];
    const [x1, y1] = poly[k + 1];
    const dx = x1 - x0;
    const dy = y1 - y0;
    const len = Math.hypot(dx, dy) || 1;
    const nx = (-dy / len) * r;
    const ny = (dx / len) * r;
    polys.push([
      [x0 + nx, y0 + ny],
      [x1 + nx, y1 + ny],
      [x1 - nx, y1 - ny],
      [x0 - nx, y0 - ny],
    ]);
    polys.push(circlePoly(x1, y1, r, 24));
  }
  polys.push(circlePoly(poly[0][0], poly[0][1], r, 24));
  return polys;
}

/**
 * Scanline fill, nonzero winding, over every polygon at once so overlapping
 * strokes fuse. Supersampled, then box-filtered down: enough antialiasing to
 * judge a mark honestly at 16px without pretending to be a renderer.
 */
/**
 * Scanline rasteriser. Each entry is `{ polys, color }`: the polygons are all
 * filled in one winding pass, so overlapping strokes fuse exactly as the
 * renderer would fuse them, and the alpha is coverage against the colour rather
 * than a blend of blends.
 */
export function rasterize(layers, { width, height, scale = 3 }) {
  const W = width * scale;
  const H = height * scale;
  const px = new Float64Array(W * H * 4);

  for (const layer of layers) {
    const color = hexToRgba(layer.color);
    const edges = [];
    for (const rawPoly of layer.polys) {
      // Normalise winding: overlapping polygons in one layer must agree, or
      // nonzero-winding cancels them out exactly where strokes fuse.
      let area = 0;
      for (let k = 0; k < rawPoly.length; k += 1) {
        const [xa, ya] = rawPoly[k];
        const [xb, yb] = rawPoly[(k + 1) % rawPoly.length];
        area += xa * yb - xb * ya;
      }
      const poly = area < 0 ? [...rawPoly].reverse() : rawPoly;
      for (let k = 0; k < poly.length; k += 1) {
        const a = [poly[k][0] * scale, poly[k][1] * scale];
        const b = [poly[(k + 1) % poly.length][0] * scale, poly[(k + 1) % poly.length][1] * scale];
        if (a[1] === b[1]) continue;
        edges.push(
          a[1] < b[1]
            ? { y0: a[1], y1: b[1], x0: a[0], x1: b[0], w: 1 }
            : { y0: b[1], y1: a[1], x0: b[0], x1: a[0], w: -1 },
        );
      }
    }
    if (edges.length === 0) continue;
    edges.sort((p, q) => p.y0 - q.y0);

    // One coverage pass per layer: overlapping polygons in a layer are the SAME
    // ink, so their coverage unions (max per subpixel) instead of compositing
    // twice — sequential compositing leaves grey seams where caps cross quads.
    const cov = new Float32Array(W * H);
    let cursor = 0;
    const active = [];
    for (let y = 0; y < H; y += 1) {
      const yc = y + 0.5;
      while (cursor < edges.length && edges[cursor].y0 <= yc) active.push(edges[cursor++]);
      for (let k = active.length - 1; k >= 0; k -= 1) if (active[k].y1 <= yc) active.splice(k, 1);
      if (active.length === 0) continue;

      const xs = [];
      for (const e of active) {
        const t = (yc - e.y0) / (e.y1 - e.y0);
        xs.push([e.x0 + (e.x1 - e.x0) * t, e.w]);
      }
      xs.sort((p, q) => p[0] - q[0]);
      let winding = 0;
      for (let k = 0; k + 1 < xs.length; k += 1) {
        winding += xs[k][1];
        if (winding === 0) continue;
        const from = Math.max(0, Math.floor(xs[k][0]));
        const to = Math.min(W - 1, Math.ceil(xs[k + 1][0]));
        for (let x = from; x <= to; x += 1) {
          const cover = Math.min(1, Math.min(x + 1, xs[k + 1][0]) - Math.max(x, xs[k][0]));
          if (cover <= 0) continue;
          const i = y * W + x;
          if (cover > cov[i]) cov[i] = cover;
        }
      }
    }
    for (let i = 0; i < W * H; i += 1) {
      const a = cov[i];
      if (a <= 0) continue;
      const k = i * 4;
      px[k] = color[0] * a + px[k] * (1 - a);
      px[k + 1] = color[1] * a + px[k + 1] * (1 - a);
      px[k + 2] = color[2] * a + px[k + 2] * (1 - a);
      px[k + 3] = 255 * a + px[k + 3] * (1 - a);
    }
  }

  // Box-filter down.
  const out = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      for (let sy = 0; sy < scale; sy += 1) {
        for (let sx = 0; sx < scale; sx += 1) {
          const k = ((y * scale + sy) * W + (x * scale + sx)) * 4;
          r += px[k];
          g += px[k + 1];
          b += px[k + 2];
          a += px[k + 3];
        }
      }
      const n = scale * scale;
      const alpha = a / n;
      const o = (y * width + x) * 4;
      // The scanline pass accumulates premultiplied colour; PNG carries
      // straight alpha, so divide it back out (clamped) at the boundary.
      const un = alpha > 0 ? (v) => Math.min(255, (v / n) * (255 / alpha)) : () => 0;
      out[o] = Math.round(un(r));
      out[o + 1] = Math.round(un(g));
      out[o + 2] = Math.round(un(b));
      out[o + 3] = Math.round(alpha);
    }
  }
  return { data: out, width, height };
}

const rect = ([x, y, w, h]) => [
  [x, y],
  [x + w, y],
  [x + w, y + h],
  [x, y + h],
];

/** Scale a polygon set by a factor and offset. */
export function transform(pts, scale, dx = 0, dy = 0) {
  return pts.map(([x, y]) => [x * scale + dx, y * scale + dy]);
}

function hexToRgba(hex) {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), 255];
}

function blank(width, height, bg) {
  const data = Buffer.alloc(width * height * 4);
  const c = bg ? hexToRgba(bg) : [0, 0, 0, 0];
  for (let k = 0; k < width * height; k += 1) {
    data[k * 4] = c[0];
    data[k * 4 + 1] = c[1];
    data[k * 4 + 2] = c[2];
    data[k * 4 + 3] = c[3];
  }
  return { data, width, height };
}

/** Composite src over dst in place (straight-alpha source over opaque dst). */
function over(dst, src) {
  for (let k = 0; k < dst.data.length; k += 4) {
    const a = src.data[k + 3] / 255;
    dst.data[k] = Math.round(src.data[k] * a + dst.data[k] * (1 - a));
    dst.data[k + 1] = Math.round(src.data[k + 1] * a + dst.data[k + 1] * (1 - a));
    dst.data[k + 2] = Math.round(src.data[k + 2] * a + dst.data[k + 2] * (1 - a));
    dst.data[k + 3] = Math.round(255 * a + dst.data[k + 3] * (1 - a));
  }
  return dst;
}

/* ------------------------------------------------------------------ encoders */

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = -1;
  for (let k = 0; k < buf.length; k += 1) c = CRC_TABLE[(c ^ buf[k]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

export function pngEncode({ data, width, height }) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (width * 4 + 1)] = 0; // filter: none
    data.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** An ICO whose frames are PNG payloads — Vista onwards, which is every Windows this product targets. */
export function icoEncode(pngs) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(pngs.length, 4);
  const entries = [];
  let offset = 6 + 16 * pngs.length;
  for (const { size, png } of pngs) {
    const e = Buffer.alloc(16);
    e[0] = size >= 256 ? 0 : size;
    e[1] = size >= 256 ? 0 : size;
    e.writeUInt16LE(1, 4); // planes
    e.writeUInt16LE(32, 6); // bpp
    e.writeUInt32LE(png.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += png.length;
    entries.push(e);
  }
  return Buffer.concat([header, ...entries, ...pngs.map((p) => p.png)]);
}

/* ------------------------------------------------------------- asset recipes */

export function symbolRaster(size, { color = PAPER, bg = null, shapes = CX_SHAPES } = {}) {
  const layers = [];
  if (bg) layers.push({ polys: [rect([0, 0, size, size])], color: bg });
  layers.push({ polys: shapes.map((pts) => transform(pts, size / 96)), color });
  return rasterize(layers, { width: size, height: size });
}

export function tileLayers(size, { field = TILE, color = PAPER, accent = MINT, radius = 0.229, pad = 0.125, shapes = CX_SHAPES } = {}) {
  // Rounded square as a polygon: four corner arcs joined by straight edges.
  const r = radius * size;
  const pts = [];
  const corner = (cx, cy, a0, a1) => {
    for (let k = 0; k <= 10; k += 1) {
      const a = a0 + ((a1 - a0) * k) / 10;
      pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
  };
  corner(r, r, Math.PI, Math.PI * 1.5);
  corner(size - r, r, Math.PI * 1.5, Math.PI * 2);
  corner(size - r, size - r, 0, Math.PI * 0.5);
  corner(r, size - r, Math.PI * 0.5, Math.PI);

  const inset = size * pad;
  const inner = size - inset * 2;
  const dot = size * 0.104;
  return [
    { polys: [pts], color: field },
    { polys: shapes.map((p) => transform(p, inner / 96, inset, inset)), color },
    { polys: [rect([size - inset - dot, size - inset - dot, dot, dot])], color: accent },
  ];
}

export function tileRaster(size, opts) {
  return rasterize(tileLayers(size, opts), { width: size, height: size });
}

function lockupLayers({ unit, mark, word, rule }) {
  const g = lockupGeometry();
  const layers = [{ polys: CX_SHAPES.map((p) => transform(p, unit)), color: mark }];
  if (rule) {
    layers.push({
      polys: [
        rect([
          g.rule.x * unit - (g.rule.width * unit) / 2,
          g.rule.y1 * unit,
          g.rule.width * unit,
          (g.rule.y2 - g.rule.y1) * unit,
        ]),
      ],
      color: rule,
    });
  }
  const wordPolys = [];
  let gx = g.word.x;
  for (const glyph of WORD_GLYPHS) {
    for (const poly of spinePolylines(glyph.d)) {
      wordPolys.push(...strokeToPolys(transform(poly, unit, gx * unit, g.word.y * unit), WORD_STROKE * unit));
    }
    gx += glyph.advance + WORD_TRACKING;
  }
  layers.push({ polys: wordPolys, color: word });
  return layers;
}

export function lockupRaster({ height, mark = PAPER, word = PAPER, rule = MINT, bg = null, scale = 3 }) {
  const unit = height / 96; // the symbol sets the optical height
  const width = Math.round(lockupGeometry().width * unit);
  const layers = bg ? [{ polys: [rect([0, 0, width, height])], color: bg }, ...lockupLayers({ unit, mark, word, rule })] : lockupLayers({ unit, mark, word, rule });
  return rasterize(layers, { width, height, scale });
}

function ogCover() {
  const width = 1200;
  const height = 630;
  const lockHeight = 132;
  const unit = lockHeight / 96;
  const lockWidth = lockupGeometry().width * unit;
  const lx = Math.round((width - lockWidth) / 2);
  const ly = Math.round((height - lockHeight) / 2) + 24;

  const layers = [{ polys: [rect([0, 0, width, height])], color: INK }];
  // Mint kicker rule above the lockup: the only other element on the card.
  layers.push({ polys: [rect([width / 2 - 34, ly - 78, 68, 5])], color: MINT });
  layers.push(...lockupLayers({ unit, mark: PAPER, word: PAPER, rule: MINT }).map((l) => ({
    ...l,
    polys: l.polys.map((p) => p.map(([x, y]) => [x + lx, y + ly])),
  })));
  // Baseline rule and the product line, so the card reads as ours at a glance.
  layers.push({ polys: [rect([lx, ly + lockHeight + 46, lockWidth, 1])], color: '#2a3138' });
  return rasterize(layers, { width, height, scale: 3 });
}

/* --------------------------------------------------------------------- write */

export function generateAll({ outRoot = ROOT, write = true } = {}) {
  const files = {};
  const put = (rel, content) => {
    files[rel] = content;
    if (write) {
      const path = join(outRoot, rel);
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, content);
    }
  };

  // --- vector assets
  put('website/public/logo.svg', lockupSvg({}));
  put('website/public/logo-light.svg', lockupSvg({ mark: INK, word: INK, rule: MINT }));
  put('website/public/logo-mono.svg', lockupMonoSvg());
  put('website/public/symbol.svg', symbolSvg({ color: PAPER }));
  put('website/public/symbol-light.svg', symbolSvg({ color: INK }));
  put('website/public/favicon.svg', tileSvg({}));

  // --- raster assets
  put(
    'website/public/favicon.ico',
    icoEncode(
      [16, 32, 48].map((s) => ({
        size: s,
        png: pngEncode(tileRaster(s, { shapes: s <= 32 ? CX_SIMPLE_SHAPES : CX_SHAPES })),
      })),
    ),
  );
  put('website/public/apple-touch-icon.png', pngEncode(tileRaster(180)));
  put('website/public/og/cover.png', pngEncode(ogCover()));
  put(
    'build/icon.ico',
    icoEncode(
      [16, 24, 32, 48, 64, 128, 256].map((s) => ({
        size: s,
        png: pngEncode(tileRaster(s, { shapes: s <= 32 ? CX_SIMPLE_SHAPES : CX_SHAPES })),
      })),
    ),
  );
  put('build/icon.png', pngEncode(tileRaster(512)));

  // --- the generated geometry modules both React trees render from, so the
  //     inline SVGs and the static files cannot drift apart. Same content, two
  //     import roots; tests/brand.test.ts and website/tests/brandAssets.test.ts
  //     re-run this generator and fail on any difference.
  const geometryTs = `/**
 * GENERATED by scripts/brand/logo.mjs — do not edit by hand.
 * Run \`npm run brand:generate\` and commit the result instead; the brand tests
 * re-run the generator and fail if these constants drift from the assets.
 *
 * The CX monogram: filled quadrilaterals on a 96 x 96 grid, one 17-unit stroke
 * weight throughout. The wordmark: monoline spines stroked at WORD_STROKE.
 */

/** Quadrilateral point. */
export type Quad = readonly [
  readonly [number, number],
  readonly [number, number],
  readonly [number, number],
  readonly [number, number],
];

/** The CX monogram as filled quadrilaterals on a 96 x 96 grid. */
export const CX_SHAPES: readonly Quad[] = ${JSON.stringify(CX_SHAPES)} as const;

/** Tiny-size simplification (favicon, small icon frames): the K becomes one diagonal. */
export const CX_SIMPLE_SHAPES: readonly Quad[] = ${JSON.stringify(CX_SIMPLE_SHAPES)} as const;

export const CX_VIEWBOX = ${JSON.stringify(CX_VIEWBOX)};

/** Wordmark spines: cubic/line path data plus each glyph's advance. */
export const WORD_GLYPHS: readonly { advance: number; d: string }[] = ${JSON.stringify(WORD_GLYPHS)} as const;

export const WORD_STROKE = ${WORD_STROKE};
export const WORD_TRACKING = ${WORD_TRACKING};

/** Primary-lockup layout: rule position and wordmark origin, in grid units. */
export const LOCKUP = ${JSON.stringify(lockupGeometry())} as const;

/** Brand palette, mirrored from the product tokens. */
export const BRAND_COLORS = {
  ink: ${JSON.stringify(INK)},
  paper: ${JSON.stringify(PAPER)},
  mint: ${JSON.stringify(MINT)},
  tile: ${JSON.stringify(TILE)},
} as const;
`;
  put('website/src/lib/brandGeometry.ts', geometryTs);
  put('src/brand/geometry.ts', geometryTs);

  return files;
}

/* ------------------------------------------------------------------- preview */

export { blank, over, rect, at, lockupLayers };

/** Translate every polygon of a layer set. */
function at(layers, dx, dy) {
  return layers.map((l) => ({ ...l, polys: l.polys.map((p) => p.map(([x, y]) => [x + dx, y + dy])) }));
}

/**
 * A contact sheet for visual inspection, built from the same layer pipeline the
 * assets use: symbol at tab/nav/tile sizes, the application tile, the lockup on
 * dark, on paper, and in monochrome both ways.
 */
export function previewSheet() {
  const width = 860;
  const rowH = 116;
  const height = 6 * rowH + 24;
  const layers = [{ polys: [rect([0, 0, width, height])], color: '#0b0c0e' }];

  // Row 1 — the symbol and the tile at the sizes that matter.
  for (const [size, x] of [[16, 24], [32, 64], [64, 120]]) {
    layers.push(...at([{ polys: CX_SHAPES.map((p) => transform(p, size / 96)), color: PAPER }], x, 24 + (96 - size) / 2));
  }
  for (const [size, x] of [[16, 240], [32, 280], [64, 336], [96, 432]]) {
    layers.push(...at(tileLayers(size, { shapes: size <= 32 ? CX_SIMPLE_SHAPES : CX_SHAPES }), x, 24 + (96 - size) / 2));
  }

  // Row 2 — the primary lockup on the field.
  layers.push(...at(lockupLayers({ unit: 76 / 96, mark: PAPER, word: PAPER, rule: MINT }), 24, rowH + 22));

  // Row 3 — the light version on the site's paper.
  layers.push({ polys: [rect([0, 2 * rowH, width, rowH])], color: PAPER });
  layers.push(...at(lockupLayers({ unit: 68 / 96, mark: INK, word: INK, rule: MINT }), 24, 2 * rowH + 26));

  // Row 4 — monochrome ink on white.
  layers.push({ polys: [rect([0, 3 * rowH, width, rowH])], color: '#ffffff' });
  layers.push(...at(lockupLayers({ unit: 68 / 96, mark: '#111111', word: '#111111', rule: '#111111' }), 24, 3 * rowH + 26));

  // Row 5 — monochrome reversed on the field.
  layers.push(...at(lockupLayers({ unit: 68 / 96, mark: PAPER, word: PAPER, rule: PAPER }), 24, 4 * rowH + 26));

  // Row 6 — the symbol alone and the tile ladder down to 16px.
  layers.push(...at([{ polys: CX_SHAPES.map((p) => transform(p, 1)), color: PAPER }], 24, 5 * rowH + 14));
  for (const [size, x] of [[64, 160], [48, 248], [32, 320], [24, 376], [16, 424]]) {
    layers.push(...at(tileLayers(size, { shapes: size <= 32 ? CX_SIMPLE_SHAPES : CX_SHAPES }), x, 5 * rowH + 14 + (96 - size) / 2));
  }

  return rasterize(layers, { width, height, scale: 2 });
}

const invoked = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (invoked) {
  const args = process.argv.slice(2);
  if (args.includes('--preview')) {
    mkdirSync(join(ROOT, 'docs', 'design', 'brand'), { recursive: true });
    writeFileSync(join(ROOT, 'docs', 'design', 'brand', 'preview.png'), pngEncode(previewSheet()));
    console.log('wrote docs/design/brand/preview.png');
  } else {
    const files = generateAll({});
    console.log(`wrote ${Object.keys(files).length} brand assets`);
  }
}
