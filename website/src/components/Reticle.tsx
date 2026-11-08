/**
 * A crosshair renderer for the website.
 *
 * It mirrors the fields of the application's own crosshair schema
 * (`src/types/crosshair.ts` in the desktop repository): arm lengths and
 * thickness, per-arm presence, gap, centre dot, outline, ring, rotation and
 * scale. It is a separate, deliberately small implementation — the website must
 * not import the desktop application — but every value shown on this site is a
 * value the application actually understands.
 */

export interface ReticleSpec {
  color: string;
  /** Overlay pixels, as in the application. */
  length?: number;
  thickness?: number;
  gap?: number;
  arms?: { top?: boolean; bottom?: boolean; left?: boolean; right?: boolean };
  dot?: boolean;
  dotSize?: number;
  outline?: boolean;
  outlineColor?: string;
  outlineThickness?: number;
  ring?: boolean;
  ringRadius?: number;
  ringThickness?: number;
  /** Degrees clockwise. */
  rotation?: number;
  scale?: number;
  opacity?: number;
}

const VIEW = 120;
const C = VIEW / 2;
/** Overlay pixels → SVG units, so proportions match the product. */
const PX = 3.1;

function armRect(
  dir: 'top' | 'bottom' | 'left' | 'right',
  spec: Required<Pick<ReticleSpec, 'length' | 'thickness' | 'gap'>>,
  grow: number,
) {
  const len = spec.length * PX + grow * 2;
  const thk = spec.thickness * PX + grow * 2;
  const gap = spec.gap * PX - grow;
  const r = thk / 2;
  switch (dir) {
    case 'top':
      return { x: C - thk / 2, y: C - gap - len, w: thk, h: len, r };
    case 'bottom':
      return { x: C - thk / 2, y: C + gap, w: thk, h: len, r };
    case 'left':
      return { x: C - gap - len, y: C - thk / 2, w: len, h: thk, r };
    case 'right':
      return { x: C + gap, y: C - thk / 2, w: len, h: thk, r };
  }
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
  const arms = spec.arms ?? { top: true, bottom: true, left: true, right: true };
  const dotSize = spec.dotSize ?? 2;
  const outlineThickness = spec.outlineThickness ?? 1;
  const resolved: Required<Pick<ReticleSpec, 'length' | 'thickness' | 'gap'>> = {
    length,
    thickness,
    gap,
  };

  const dirs = (['top', 'right', 'bottom', 'left'] as const).filter((d) => arms[d] !== false);
  const outlineGrow = outlineThickness * PX;
  const rotation = spec.rotation ?? 0;
  const scale = spec.scale ?? 1;

  const shapes = (color: string, grow: number) => (
    <g fill={color}>
      {dirs.map((dir) => {
        const r = armRect(dir, resolved, grow);
        return <rect key={dir} x={r.x} y={r.y} width={r.w} height={r.h} rx={r.r} />;
      })}
      {spec.dot ? (
        <circle cx={C} cy={C} r={(dotSize * PX) / 2 + grow} />
      ) : null}
    </g>
  );

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
        opacity={spec.opacity ?? 1}
      >
        {spec.ring ? (
          <circle
            cx={C}
            cy={C}
            r={(spec.ringRadius ?? 18) * PX}
            fill="none"
            stroke={spec.color}
            strokeWidth={(spec.ringThickness ?? 1.5) * PX}
          />
        ) : null}
        {spec.outline ? shapes(spec.outlineColor ?? '#000000', outlineGrow) : null}
        {shapes(spec.color, 0)}
      </g>
    </svg>
  );
}
