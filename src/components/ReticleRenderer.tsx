import React from 'react';
import type { ArmDirection, CrosshairConfig } from '../types/crosshair';
import {
  V2_DEFAULTS,
  effectiveRotation,
  effectiveScale,
  resolveArmGeometry,
  stretchRatioX,
} from '../lib/crosshairSchema';

interface ReticleRendererProps {
  config: CrosshairConfig;
  isFiring?: boolean;
  isAds?: boolean;
  scale?: number; // Optional scaling factor (for thumbnail or UI preview)
  className?: string;
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * The one rendering path for a crshhx reticle.
 *
 * Every surface in the app — the overlay, the designer preview, the vault
 * thumbnails, the testing studio and the weapon-slot picker — draws through this
 * component, so what you design is what the overlay shows. It is deliberately
 * plain SVG: no canvas, no image decoding, no per-frame allocation beyond the
 * elements it draws.
 *
 * Geometry is read through `resolveArmGeometry()` / `effectiveScale()` /
 * `effectiveRotation()` from the schema module rather than off the config
 * directly, so the editor and the renderer cannot drift apart.
 */

/** Unit vector from the centre outward for each arm. */
const ARM_AXIS: Record<ArmDirection, { horizontal: boolean; positive: boolean }> = {
  top: { horizontal: false, positive: false },
  bottom: { horizontal: false, positive: true },
  left: { horizontal: true, positive: false },
  right: { horizontal: true, positive: true },
};

/** The filled body of one arm, extending from `gap` to `gap + length`. */
function armRect(
  dir: ArmDirection,
  length: number,
  thickness: number,
  gap: number,
  center: number,
): Rect {
  const { horizontal, positive } = ARM_AXIS[dir];
  const along = Math.max(0, length);
  const cross = Math.max(0, thickness);

  if (horizontal) {
    return {
      x: positive ? center + gap : center - gap - along,
      y: center - cross / 2,
      w: along,
      h: cross,
    };
  }
  return {
    x: center - cross / 2,
    y: positive ? center + gap : center - gap - along,
    w: cross,
    h: along,
  };
}

/** Grows a rect outward by `t` on every side — the outer outline. */
function outset(r: Rect, t: number): Rect {
  if (t <= 0) return r;
  return { x: r.x - t, y: r.y - t, w: r.w + t * 2, h: r.h + t * 2 };
}

/**
 * Shrinks a rect by `t` and returns the path an inset stroke should follow.
 * Stroking this with width `t` paints a border that sits entirely *inside* the
 * original shape — the inner outline.
 */
function insetStroke(r: Rect, t: number): Rect | null {
  if (t <= 0) return null;
  const w = r.w - t;
  const h = r.h - t;
  if (w <= 0 || h <= 0) return null; // too thin to hold an inner border
  return { x: r.x + t / 2, y: r.y + t / 2, w, h };
}

export const ReticleRenderer: React.FC<ReticleRendererProps> = ({
  config,
  isFiring = false,
  isAds = false,
  scale = 1,
  className = '',
}) => {
  // Stretched resolution horizontal compression
  const ratioX = stretchRatioX(config);

  // Dynamic Firing Bloom
  const effectiveBloom = isFiring && config.dynamicFiring ? config.firingBloomExpansion : 0;
  const currentGap = Math.max(0, config.gap + effectiveBloom);

  // ADS state modifiers
  let adsScale = 1;
  let showArms = true;
  let armsOpacity = config.primaryOpacity;

  if (isAds && config.adsMorphEnabled) {
    if (config.adsStyle === 'dot-only') {
      showArms = false;
    } else if (config.adsStyle === 'shrink') {
      adsScale = config.adsScale || 0.6;
    } else if (config.adsStyle === 'fade') {
      armsOpacity = config.primaryOpacity * 0.2;
    }
  }

  const arms = resolveArmGeometry(config);
  const outlineThick = config.outlineEnabled ? config.outlineThickness : 0;
  const innerThick = config.innerOutlineEnabled
    ? config.innerOutlineThickness ?? V2_DEFAULTS.innerOutlineThickness
    : 0;

  // Center Dot dimensions
  const dotSize = config.centerDotSize;
  const showCenterDot =
    config.centerDotEnabled ||
    (isAds && config.adsMorphEnabled && config.adsStyle === 'dot-only');

  const rotation = effectiveRotation(config);
  const configScale = effectiveScale(config);

  // Rotation is about the centre, so it preserves each arm's distance from the
  // centre — the bounding box does not need to grow to accommodate it.
  const maxArmLength = Math.max(
    arms.top.length,
    arms.bottom.length,
    arms.left.length,
    arms.right.length,
  );
  const maxArmThickness = Math.max(
    arms.top.thickness,
    arms.bottom.thickness,
    arms.left.thickness,
    arms.right.thickness,
  );

  const maxRadius = Math.max(
    currentGap + maxArmLength * adsScale * configScale + maxArmThickness / 2 + outlineThick + 10,
    config.circleEnabled
      ? (config.circleRadius + config.circleThickness) * configScale + outlineThick + 10
      : 0,
    dotSize * configScale + outlineThick + 5,
    30,
  );
  const viewSize = Math.ceil(maxRadius * 2 + 10);
  const center = viewSize / 2;

  // Glow filter IDs live in a document-wide registry, so two reticles rendered
  // at once (thumbnails, the comparison view) must not share one. `useId` is
  // unique per mounted instance; the colons it emits are not valid in a CSS
  // url() reference, so they are stripped.
  const instanceId = React.useId().replace(/:/g, '');
  const glowFilterId = `glow-${instanceId}`;

  const armElements = (['top', 'bottom', 'left', 'right'] as const).map((dir) => {
    const enabled =
      dir === 'top'
        ? config.hasTopArm
        : dir === 'bottom'
          ? config.hasBottomArm
          : dir === 'left'
            ? config.hasLeftArm
            : config.hasRightArm;
    if (!enabled) return null;

    const spec = arms[dir];
    const length = spec.length * adsScale;
    if (length <= 0) return null;

    const body = armRect(dir, length, spec.thickness, currentGap, center);
    const outer = outset(body, outlineThick);
    const inner = insetStroke(body, innerThick);

    return (
      <g key={dir}>
        {outlineThick > 0 && (
          <rect
            x={outer.x}
            y={outer.y}
            width={outer.w}
            height={outer.h}
            fill={config.outlineColor}
            fillOpacity={config.outlineOpacity}
          />
        )}
        <rect
          x={body.x}
          y={body.y}
          width={body.w}
          height={body.h}
          fill={config.primaryColor}
          fillOpacity={armsOpacity}
        />
        {inner && (
          <rect
            x={inner.x}
            y={inner.y}
            width={inner.w}
            height={inner.h}
            fill="none"
            stroke={config.innerOutlineColor}
            strokeWidth={innerThick}
            strokeOpacity={config.innerOutlineOpacity}
          />
        )}
      </g>
    );
  });

  return (
    <div
      className={`relative inline-flex items-center justify-center pointer-events-none select-none ${className}`}
      style={{
        transform: `translate(${config.offsetX}px, ${config.offsetY}px) scale(${scale * configScale})`,
        transition: 'transform 0.05s ease-out',
      }}
    >
      <svg
        width={viewSize}
        height={viewSize}
        viewBox={`0 0 ${viewSize} ${viewSize}`}
        className="overflow-visible"
        style={{
          transform: `scale(${ratioX}, 1)`,
          transformOrigin: 'center center',
        }}
      >
        <defs>
          {config.glowEnabled && (
            <filter id={glowFilterId} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation={config.glowBlur / 2} result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          )}
        </defs>

        <g filter={config.glowEnabled ? `url(#${glowFilterId})` : undefined}>
          {/* SPREAD CIRCLE / SHOTGUN RING — rotation-invariant, drawn unrotated */}
          {config.circleEnabled && (
            <g>
              {outlineThick > 0 && (
                <circle
                  cx={center}
                  cy={center}
                  r={config.circleRadius}
                  fill="none"
                  stroke={config.outlineColor}
                  strokeWidth={config.circleThickness + outlineThick * 2}
                  strokeOpacity={config.outlineOpacity}
                />
              )}
              <circle
                cx={center}
                cy={center}
                r={config.circleRadius}
                fill="none"
                stroke={config.circleColor}
                strokeWidth={config.circleThickness}
                strokeOpacity={config.circleOpacity}
              />
              {innerThick > 0 && config.circleRadius * 2 - innerThick > 0 && (
                <circle
                  cx={center}
                  cy={center}
                  r={Math.max(0, config.circleRadius - (config.circleThickness + innerThick) / 2)}
                  fill="none"
                  stroke={config.innerOutlineColor}
                  strokeWidth={innerThick}
                  strokeOpacity={config.innerOutlineOpacity}
                />
              )}
            </g>
          )}

          {/* Rotating group: arms, chevron and the centre dot turn together. */}
          <g transform={rotation !== 0 ? `rotate(${rotation} ${center} ${center})` : undefined}>
            {/* CHEVRON TOPOLOGY */}
            {config.topology === 'chevron' && showArms && (
              <g>
                {(() => {
                  const span = arms.left.length * adsScale;
                  const drop = arms.bottom.length * adsScale;
                  const points = `
                    ${center - (currentGap + span)},${center + drop}
                    ${center},${center - currentGap}
                    ${center + (currentGap + span)},${center + drop}
                  `;
                  return (
                    <>
                      {outlineThick > 0 && (
                        <polyline
                          points={points}
                          fill="none"
                          stroke={config.outlineColor}
                          strokeWidth={arms.bottom.thickness + outlineThick * 2}
                          strokeOpacity={config.outlineOpacity}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      )}
                      <polyline
                        points={points}
                        fill="none"
                        stroke={config.primaryColor}
                        strokeWidth={arms.bottom.thickness}
                        strokeOpacity={armsOpacity}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </>
                  );
                })()}
              </g>
            )}

            {/* STANDARD ARMS (CROSS, T-SHAPE, CIRCLE-CROSS) */}
            {config.topology !== 'dot' &&
              config.topology !== 'chevron' &&
              showArms &&
              maxArmLength > 0 &&
              armElements}

            {/* CENTER DOT */}
            {showCenterDot && (
              <g>
                {config.centerDotShape === 'circle' ? (
                  <>
                    {outlineThick > 0 && (
                      <circle
                        cx={center}
                        cy={center}
                        r={dotSize / 2 + outlineThick}
                        fill={config.outlineColor}
                        fillOpacity={config.outlineOpacity}
                      />
                    )}
                    <circle
                      cx={center}
                      cy={center}
                      r={dotSize / 2}
                      fill={config.centerDotColor || config.primaryColor}
                      fillOpacity={config.centerDotOpacity}
                    />
                    {innerThick > 0 && dotSize - innerThick > 0 && (
                      <circle
                        cx={center}
                        cy={center}
                        r={Math.max(0, dotSize / 2 - innerThick / 2)}
                        fill="none"
                        stroke={config.innerOutlineColor}
                        strokeWidth={innerThick}
                        strokeOpacity={config.innerOutlineOpacity}
                      />
                    )}
                  </>
                ) : (
                  <>
                    {outlineThick > 0 && (
                      <rect
                        x={center - (dotSize + outlineThick * 2) / 2}
                        y={center - (dotSize + outlineThick * 2) / 2}
                        width={dotSize + outlineThick * 2}
                        height={dotSize + outlineThick * 2}
                        fill={config.outlineColor}
                        fillOpacity={config.outlineOpacity}
                      />
                    )}
                    <rect
                      x={center - dotSize / 2}
                      y={center - dotSize / 2}
                      width={dotSize}
                      height={dotSize}
                      fill={config.centerDotColor || config.primaryColor}
                      fillOpacity={config.centerDotOpacity}
                    />
                    {(() => {
                      const inner = insetStroke(
                        {
                          x: center - dotSize / 2,
                          y: center - dotSize / 2,
                          w: dotSize,
                          h: dotSize,
                        },
                        innerThick,
                      );
                      return inner ? (
                        <rect
                          x={inner.x}
                          y={inner.y}
                          width={inner.w}
                          height={inner.h}
                          fill="none"
                          stroke={config.innerOutlineColor}
                          strokeWidth={innerThick}
                          strokeOpacity={config.innerOutlineOpacity}
                        />
                      ) : null;
                    })()}
                  </>
                )}
              </g>
            )}
          </g>
        </g>
      </svg>
    </div>
  );
};
