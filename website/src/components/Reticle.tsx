/**
 * A crosshair renderer for the website.
 *
 * It mirrors the fields of the application's own crosshair schema
 * (`src/types/crosshair.ts` in the desktop repository): arm lengths and
 * thickness, per-arm presence and per-arm geometry, gap, centre dot (square or
 * round, with its own colour), outer and inner outlines, spread ring, rotation,
 * scale and opacity. It is a separate, deliberately small implementation — the
 * website must not import the desktop application — but every value it draws is
 * a value the application understands, and the Pro Crosshairs catalogue is
 * generated from the application's own data by `scripts/extract-catalogue.mjs`.
 *
 * Effects that cannot be shown in a static drawing — glow, firing bloom, ADS
 * morphing, stretched-resolution compensation and position offset — are not
 * approximated here. Pages record them in words instead, so a drawing never
 * implies it is the whole design.
 */

export type ArmDirection = 'top' | 'bottom' | 'left' | 'right';

export interface ReticleSpec {
  color: string;
  /** Overlay pixels, as in the application. */
  length?: number;
  thickness?: number;
  gap?: number;
  /** Omit for all four arms, which is the application's default. */
  arms?: Partial<Record<ArmDirection, boolean>>;
  /** Independent per-direction geometry, when the design is asymmetric. */
  armGeometry?: Partial<Record<ArmDirection, { length: number; thickness: number }>>;
  dot?: boolean;
  dotSize?: number;
  dotShape?: 'square' | 'circle';
  dotColor?: string;
  dotOpacity?: number;
  outline?: boolean;
  outlineColor?: string;
  outlineThickness?: number;
  outlineOpacity?: number;
  /** Inset inside each element, as the application draws it. */
  innerOutline?: { color?: string; thickness?: number; opacity?: number };
  ring?: boolean;
  ringRadius?: number;
  ringThickness?: number;
  ringColor?: string;
  ringOpacity?: number;
  /** Degrees clockwise. */
  rotation?: number;
  scale?: number;
  opacity?: number;
}

const VIEW = 120;
const C = VIEW / 2;
/** Overlay pixels → SVG units, so proportions match the product. */
const PX = 3.1;
const DIRS: readonly ArmDirection[] = ['top', 'right', 'bottom', 'left'];

interface ArmBox {
  x: number;
  y: number;
  w: number;
  h: number;
  r: number;
}

function armBox(
  dir: ArmDirection,
  length: number,
  thickness: number,
  gap: number,
  grow: number,
): ArmBox {
  const len = length * PX + grow * 2;
  const thk = thickness * PX + grow * 2;
  const off = gap * PX - grow;
  const r = thk / 2;
  switch (dir) {
    case 'top':
      return { x: C - thk / 2, y: C - off - len, w: thk, h: len, r };
    case 'bottom':
      return { x: C - thk / 2, y: C + off, w: thk, h: len, r };
    case 'left':
      return { x: C - off - len, y: C - thk / 2, w: len, h: thk, r };
    case 'right':
      return { x: C + off, y: C - thk / 2, w: len, h: thk, r };
  }
}

/**
 * One arm set: the four arms plus the centre dot, drawn at a given inset.
 * `grow` enlarges for an outer outline, `shrink` insets for an inner one, and
 * both are zero for the element itself.
 */
function armSet(
  dirs: readonly ArmDirection[],
  spec: ReticleSpec,
  length: number,
  thickness: number,
  gap: number,
  offset: number,
  dotRadius: number,
) {
  return (
    <>
      {dirs.map((dir) => {
        const per = spec.armGeometry?.[dir];
        const box = armBox(
          dir,
          per ? per.length : length,
          per ? per.thickness : thickness,
          gap,
          offset,
        );
        // A zero-length or zero-thickness arm is legal in the schema (a dot-only
        // design), so the drawn box is clamped rather than allowed to go
        // negative and produce invalid SVG.
        const w = Math.max(box.w, 0.1);
        const h = Math.max(box.h, 0.1);
        const rx = Math.max(0, Math.min(box.r, w / 2, h / 2));
        return <rect key={dir} x={box.x} y={box.y} width={w} height={h} rx={rx} />;
      })}
      {spec.dot ? (
        spec.dotShape === 'square' ? (
          <rect
            x={C - Math.max(dotRadius + offset, 0.05)}
            y={C - Math.max(dotRadius + offset, 0.05)}
            width={Math.max((dotRadius + offset) * 2, 0.1)}
            height={Math.max((dotRadius + offset) * 2, 0.1)}
          />
        ) : (
          <circle cx={C} cy={C} r={Math.max(dotRadius + offset, 0.05)} />
        )
      ) : null}
    </>
  );
}

export function Reticle({
  spec,
  size = 96,
  label,
}: {
  spec: ReticleSpec;
  size?: number;
  /** Accessible name; omit for purely decorative reticles. */
  label?: string;
}) {
  const length = spec.length ?? 4;
  const thickness = spec.thickness ?? 2;
  const gap = spec.gap ?? 2;
  const arms = spec.arms ?? {};
  const dirs = DIRS.filter((dir) => arms[dir] !== false);
  const dotSize = spec.dotSize ?? 2;
  const dotRadius = (dotSize * PX) / 2;
  const outlineThickness = spec.outlineThickness ?? 1;
  const inner = spec.innerOutline;
  const innerThickness = inner?.thickness ?? 1;
  const rotation = spec.rotation ?? 0;
  const scale = spec.scale ?? 1;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${VIEW} ${VIEW}`}
      role={label ? 'img' : undefined}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      style={{ overflow: 'visible' }}
    >
      <g
        transform={`rotate(${rotation} ${C} ${C}) translate(${C} ${C}) scale(${scale}) translate(${-C} ${-C})`}
      >
        {spec.ring ? (
          <circle
            cx={C}
            cy={C}
            r={(spec.ringRadius ?? 18) * PX}
            fill="none"
            stroke={spec.ringColor ?? spec.color}
            strokeWidth={(spec.ringThickness ?? 1.5) * PX}
            opacity={spec.ringOpacity ?? 1}
          />
        ) : null}

        {/* Outer outline: the same shapes, grown, drawn behind. */}
        {spec.outline ? (
          <g fill={spec.outlineColor ?? '#000000'} opacity={spec.outlineOpacity ?? 1}>
            {armSet(dirs, spec, length, thickness, gap, outlineThickness * PX, dotRadius)}
          </g>
        ) : null}

        <g fill={spec.color} opacity={spec.opacity ?? 1}>
          {armSet(dirs, spec, length, thickness, gap, 0, dotRadius)}
        </g>

        {/* The centre dot may carry its own colour and opacity. */}
        {spec.dot && (spec.dotColor || spec.dotOpacity !== undefined) ? (
          <g fill={spec.dotColor ?? spec.color} opacity={spec.dotOpacity ?? 1}>
            {armSet([], { ...spec, dot: true }, length, thickness, gap, 0, dotRadius)}
          </g>
        ) : null}

        {/* Inner outline: the same shapes, inset, drawn on top. */}
        {inner ? (
          <g fill={inner.color ?? '#000000'} opacity={inner.opacity ?? 1}>
            {armSet(dirs, spec, length, thickness, gap, -innerThickness * PX, dotRadius)}
          </g>
        ) : null}
      </g>
    </svg>
  );
}
