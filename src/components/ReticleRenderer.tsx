import React from 'react';
import { CrosshairConfig } from '../types/crosshair';

interface ReticleRendererProps {
  config: CrosshairConfig;
  isFiring?: boolean;
  isAds?: boolean;
  scale?: number; // Optional scaling factor (for thumbnail or UI preview)
  className?: string;
}

export const ReticleRenderer: React.FC<ReticleRendererProps> = ({
  config,
  isFiring = false,
  isAds = false,
  scale = 1,
  className = '',
}) => {
  // Stretched resolution horizontal compression
  let stretchRatioX = 1;
  if (config.stretchedMode === '4:3') {
    stretchRatioX = 0.75;
  } else if (config.stretchedMode === '16:10') {
    stretchRatioX = 0.90;
  } else if (config.stretchedMode === '5:4') {
    stretchRatioX = 0.703;
  } else if (config.stretchedMode === 'custom') {
    stretchRatioX = config.stretchCompressionRatio || 0.75;
  }

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

  const armLength = (config.length * adsScale);
  const armThickness = config.thickness;
  const outlineThick = config.outlineEnabled ? config.outlineThickness : 0;

  // Center Dot dimensions
  const dotSize = config.centerDotSize;
  const showCenterDot = config.centerDotEnabled || (isAds && config.adsMorphEnabled && config.adsStyle === 'dot-only');

  // Canvas bounds size
  const maxRadius = Math.max(
    currentGap + armLength + outlineThick + 10,
    config.circleEnabled ? config.circleRadius + config.circleThickness + outlineThick + 10 : 0,
    dotSize + outlineThick + 5,
    30
  );
  const viewSize = Math.ceil(maxRadius * 2 + 10);
  const center = viewSize / 2;

  // Glow filter ID
  const glowFilterId = `glow-${config.id}`;

  return (
    <div
      className={`relative inline-flex items-center justify-center pointer-events-none select-none ${className}`}
      style={{
        transform: `translate(${config.offsetX}px, ${config.offsetY}px) scale(${scale})`,
        transition: 'transform 0.05s ease-out',
      }}
    >
      <svg
        width={viewSize}
        height={viewSize}
        viewBox={`0 0 ${viewSize} ${viewSize}`}
        className="overflow-visible"
        style={{
          transform: `scale(${stretchRatioX}, 1)`,
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
          {/* SPREAD CIRCLE / SHOTGUN RING */}
          {config.circleEnabled && (
            <g>
              {config.outlineEnabled && (
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
            </g>
          )}

          {/* CHEVRON TOPOLOGY */}
          {config.topology === 'chevron' && showArms && (
            <g>
              {config.outlineEnabled && (
                <polyline
                  points={`
                    ${center - (currentGap + armLength)},${center + armLength}
                    ${center},${center - currentGap}
                    ${center + (currentGap + armLength)},${center + armLength}
                  `}
                  fill="none"
                  stroke={config.outlineColor}
                  strokeWidth={armThickness + outlineThick * 2}
                  strokeOpacity={config.outlineOpacity}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
              <polyline
                points={`
                  ${center - (currentGap + armLength)},${center + armLength}
                  ${center},${center - currentGap}
                  ${center + (currentGap + armLength)},${center + armLength}
                `}
                fill="none"
                stroke={config.primaryColor}
                strokeWidth={armThickness}
                strokeOpacity={armsOpacity}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </g>
          )}

          {/* STANDARD ARMS (CROSS, T-SHAPE, CIRCLE-CROSS) */}
          {config.topology !== 'dot' && config.topology !== 'chevron' && showArms && armLength > 0 && (
            <g>
              {/* TOP ARM */}
              {config.hasTopArm && config.topology !== 't-shape' && (
                <g>
                  {config.outlineEnabled && (
                    <rect
                      x={center - (armThickness + outlineThick * 2) / 2}
                      y={center - currentGap - armLength - outlineThick}
                      width={armThickness + outlineThick * 2}
                      height={armLength + outlineThick * 2}
                      fill={config.outlineColor}
                      fillOpacity={config.outlineOpacity}
                    />
                  )}
                  <rect
                    x={center - armThickness / 2}
                    y={center - currentGap - armLength}
                    width={armThickness}
                    height={armLength}
                    fill={config.primaryColor}
                    fillOpacity={armsOpacity}
                  />
                </g>
              )}

              {/* BOTTOM ARM */}
              {config.hasBottomArm && (
                <g>
                  {config.outlineEnabled && (
                    <rect
                      x={center - (armThickness + outlineThick * 2) / 2}
                      y={center + currentGap - outlineThick}
                      width={armThickness + outlineThick * 2}
                      height={armLength + outlineThick * 2}
                      fill={config.outlineColor}
                      fillOpacity={config.outlineOpacity}
                    />
                  )}
                  <rect
                    x={center - armThickness / 2}
                    y={center + currentGap}
                    width={armThickness}
                    height={armLength}
                    fill={config.primaryColor}
                    fillOpacity={armsOpacity}
                  />
                </g>
              )}

              {/* LEFT ARM */}
              {config.hasLeftArm && (
                <g>
                  {config.outlineEnabled && (
                    <rect
                      x={center - currentGap - armLength - outlineThick}
                      y={center - (armThickness + outlineThick * 2) / 2}
                      width={armLength + outlineThick * 2}
                      height={armThickness + outlineThick * 2}
                      fill={config.outlineColor}
                      fillOpacity={config.outlineOpacity}
                    />
                  )}
                  <rect
                    x={center - currentGap - armLength}
                    y={center - armThickness / 2}
                    width={armLength}
                    height={armThickness}
                    fill={config.primaryColor}
                    fillOpacity={armsOpacity}
                  />
                </g>
              )}

              {/* RIGHT ARM */}
              {config.hasRightArm && (
                <g>
                  {config.outlineEnabled && (
                    <rect
                      x={center + currentGap - outlineThick}
                      y={center - (armThickness + outlineThick * 2) / 2}
                      width={armLength + outlineThick * 2}
                      height={armThickness + outlineThick * 2}
                      fill={config.outlineColor}
                      fillOpacity={config.outlineOpacity}
                    />
                  )}
                  <rect
                    x={center + currentGap}
                    y={center - armThickness / 2}
                    width={armLength}
                    height={armThickness}
                    fill={config.primaryColor}
                    fillOpacity={armsOpacity}
                  />
                </g>
              )}
            </g>
          )}

          {/* CENTER DOT */}
          {showCenterDot && (
            <g>
              {config.centerDotShape === 'circle' ? (
                <>
                  {config.outlineEnabled && (
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
                </>
              ) : (
                <>
                  {config.outlineEnabled && (
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
                </>
              )}
            </g>
          )}
        </g>
      </svg>
    </div>
  );
};
