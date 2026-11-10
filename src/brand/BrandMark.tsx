import React from 'react';
import { CX_SHAPES, CX_VIEWBOX } from './geometry';

/**
 * The CX monogram for in-app surfaces (sidebar header), rendered from the same
 * generated geometry as the website lockup and every static asset — see
 * scripts/brand/logo.mjs, the single source of truth for the brand.
 *
 * Inherits `currentColor`: the sidebar paints it in the product accent so the
 * mark sits in the same voice as the PRO badge and the accent tokens.
 */
export const BrandMark: React.FC<{ size?: number }> = ({ size = 18 }) => {
  const d = CX_SHAPES.map(
    (quad) => quad.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x} ${y}`).join(' ') + ' Z',
  ).join(' ');
  return (
    <svg
      width={size}
      height={size}
      viewBox={CX_VIEWBOX}
      aria-hidden="true"
      focusable="false"
      style={{ flex: 'none', display: 'block' }}
    >
      <path d={d} fill="currentColor" />
    </svg>
  );
};
