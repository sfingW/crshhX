import { SITE } from '../site';
import {
  CX_SHAPES,
  CX_VIEWBOX,
  LOCKUP,
  WORD_GLYPHS,
  WORD_STROKE,
  WORD_TRACKING,
} from '../lib/brandGeometry';

/**
 * The brand, rendered from the generated geometry in `src/lib/brandGeometry.ts`
 * — the same constants the static assets in `public/` are rasterised and
 * exported from by `scripts/brand/logo.mjs`. One source, every surface: the nav
 * and footer cannot drift from the favicon, the app icon or the OG card.
 *
 * The monogram is a CX: an open hexagonal C whose bottom terminal flows into
 * the leg of a K, the two diagonals fused at a vertex inside the aperture. All
 * straight edges, one stroke weight, so it stays crisp at 16px. The wordmark is
 * monoline geometric lowercase; the mint rule between them is the product's own
 * accent and the only colour in the logo — monochrome contexts drop it.
 */

const quadPath = (quad: readonly (readonly [number, number])[]) =>
  quad.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x} ${y}`).join(' ') + ' Z';

const MARK_PATHS = CX_SHAPES.map(quadPath).join(' ');

function wordmarkPaths(originX: number) {
  let x = originX;
  const paths: { d: string; x: number }[] = [];
  for (const glyph of WORD_GLYPHS) {
    paths.push({ d: glyph.d, x });
    x += glyph.advance + WORD_TRACKING;
  }
  return paths;
}

/** The standalone CX symbol. Inherits `currentColor`, so it works on any field. */
export function BrandMark({ size = 26 }: { size?: number }) {
  return (
    <svg
      className="brand-mark"
      width={size}
      height={size}
      viewBox={CX_VIEWBOX}
      role="img"
      aria-label={`${SITE.name} logo`}
    >
      <path d={MARK_PATHS} fill="currentColor" />
    </svg>
  );
}

/**
 * The primary lockup: symbol, mint rule, wordmark. The wordmark is drawn, not
 * typeset, so the logo reads identically everywhere — the site's display face
 * still carries every heading around it.
 */
export function BrandLockup({
  height = 26,
  labeled = false,
}: {
  height?: number;
  labeled?: boolean;
}) {
  const width = Math.round(((LOCKUP.width / 96) * height) * 100) / 100;
  const rule = LOCKUP.rule;
  return (
    <svg
      className="brand-mark"
      width={width}
      height={height}
      viewBox={LOCKUP.viewBox}
      role="img"
      aria-label={labeled ? SITE.name : undefined}
      aria-hidden={labeled ? undefined : true}
    >
      <path d={MARK_PATHS} fill="currentColor" />
      <path
        d={`M${rule.x} ${rule.y1} L${rule.x} ${rule.y2}`}
        stroke="var(--accent, #00e599)"
        strokeWidth={rule.width}
        fill="none"
      />
      {wordmarkPaths(LOCKUP.word.x).map((glyph) => (
        <path
          key={glyph.x}
          d={glyph.d}
          transform={`translate(${glyph.x} ${LOCKUP.word.y})`}
          fill="none"
          stroke="currentColor"
          strokeWidth={WORD_STROKE}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </svg>
  );
}
