import type { ArmDirection, CrosshairConfig } from '../types/crosshair';
import { ARM_DIRECTIONS, effectiveRotation, effectiveScale, resolveArmGeometry } from './crosshairSchema';

/**
 * Comparison of two crosshair variations.
 *
 * The designer can pin the current crosshair as "A" and keep editing "B". Two
 * reticles side by side answer "which one looks better"; this answers "what
 * actually changed", which is the part that is hard to see when the difference
 * is a 0.5px thickness or a colour shifted by a few points.
 *
 * Derived values are compared rather than raw fields: an asymmetric crosshair
 * and a symmetric one with the same four arm lengths are the same shape, and
 * saying otherwise would be misleading.
 */

export interface ConfigDifference {
  /** Stable key, e.g. `armLength.top`. */
  key: string;
  /** Human label, e.g. `Top arm length`. */
  label: string;
  a: string;
  b: string;
  /** Grouping used to keep the list scannable. */
  group: 'Arms' | 'Centre dot' | 'Outline' | 'Ring' | 'Colour' | 'Transform' | 'Behaviour' | 'Style';
}

const px = (n: number) => `${trim(n)} px`;
const deg = (n: number) => `${trim(n)}°`;
const pct = (n: number) => `${trim(Math.round(n * 1000) / 10)}%`;
const onOff = (b: boolean) => (b ? 'on' : 'off');

function trim(n: number): string {
  if (!Number.isFinite(n)) return '—';
  return String(Math.round(n * 100) / 100);
}

const ARM_LABEL: Record<ArmDirection, string> = {
  top: 'Top',
  bottom: 'Bottom',
  left: 'Left',
  right: 'Right',
};

/**
 * Every meaningful difference between two configs, in a stable order.
 *
 * `id`, `name` and `game` are deliberately excluded: comparing a copy against
 * its original would otherwise list the name as a difference and bury the one
 * pixel change the user actually cared about.
 */
export function diffConfigs(a: CrosshairConfig, b: CrosshairConfig): ConfigDifference[] {
  const out: ConfigDifference[] = [];
  const add = (
    key: string,
    label: string,
    group: ConfigDifference['group'],
    va: string,
    vb: string,
  ) => {
    if (va !== vb) out.push({ key, label, group, a: va, b: vb });
  };

  add('topology', 'Style', 'Style', a.topology, b.topology);

  /* Arms — resolved, so symmetric and equivalent-asymmetric read as equal. */
  const armsA = resolveArmGeometry(a);
  const armsB = resolveArmGeometry(b);
  for (const dir of ARM_DIRECTIONS) {
    const label = ARM_LABEL[dir];
    add(`hasArm.${dir}`, `${label} arm`, 'Arms', onOff(hasArm(a, dir)), onOff(hasArm(b, dir)));
    add(`armLength.${dir}`, `${label} arm length`, 'Arms', px(armsA[dir].length), px(armsB[dir].length));
    add(
      `armThickness.${dir}`,
      `${label} arm thickness`,
      'Arms',
      px(armsA[dir].thickness),
      px(armsB[dir].thickness),
    );
  }
  add('gap', 'Centre gap', 'Arms', px(a.gap), px(b.gap));

  /* Centre dot */
  add('centerDotEnabled', 'Centre dot', 'Centre dot', onOff(a.centerDotEnabled), onOff(b.centerDotEnabled));
  add('centerDotSize', 'Centre dot size', 'Centre dot', px(a.centerDotSize), px(b.centerDotSize));
  add('centerDotShape', 'Centre dot shape', 'Centre dot', a.centerDotShape, b.centerDotShape);
  add('centerDotColor', 'Centre dot colour', 'Centre dot', a.centerDotColor, b.centerDotColor);
  add('centerDotOpacity', 'Centre dot opacity', 'Centre dot', pct(a.centerDotOpacity), pct(b.centerDotOpacity));

  /* Outlines */
  add('outlineEnabled', 'Outer outline', 'Outline', onOff(a.outlineEnabled), onOff(b.outlineEnabled));
  add('outlineThickness', 'Outer outline width', 'Outline', px(a.outlineThickness), px(b.outlineThickness));
  add('outlineColor', 'Outer outline colour', 'Outline', a.outlineColor, b.outlineColor);
  add('outlineOpacity', 'Outer outline opacity', 'Outline', pct(a.outlineOpacity), pct(b.outlineOpacity));
  add('innerOutlineEnabled', 'Inner outline', 'Outline', onOff(!!a.innerOutlineEnabled), onOff(!!b.innerOutlineEnabled));
  add(
    'innerOutlineThickness',
    'Inner outline width',
    'Outline',
    px(a.innerOutlineThickness ?? 1),
    px(b.innerOutlineThickness ?? 1),
  );
  add(
    'innerOutlineColor',
    'Inner outline colour',
    'Outline',
    a.innerOutlineColor ?? '#000000',
    b.innerOutlineColor ?? '#000000',
  );

  /* Ring */
  add('circleEnabled', 'Spread ring', 'Ring', onOff(a.circleEnabled), onOff(b.circleEnabled));
  add('circleRadius', 'Spread ring radius', 'Ring', px(a.circleRadius), px(b.circleRadius));
  add('circleThickness', 'Spread ring width', 'Ring', px(a.circleThickness), px(b.circleThickness));
  add('circleColor', 'Spread ring colour', 'Ring', a.circleColor, b.circleColor);

  /* Colour and glow */
  add('primaryColor', 'Reticle colour', 'Colour', a.primaryColor, b.primaryColor);
  add('primaryOpacity', 'Reticle opacity', 'Colour', pct(a.primaryOpacity), pct(b.primaryOpacity));
  add('glowEnabled', 'Glow', 'Colour', onOff(a.glowEnabled), onOff(b.glowEnabled));
  add('glowBlur', 'Glow blur', 'Colour', px(a.glowBlur), px(b.glowBlur));
  add('glowColor', 'Glow colour', 'Colour', a.glowColor, b.glowColor);

  /* Transform */
  add('rotation', 'Rotation', 'Transform', deg(effectiveRotation(a)), deg(effectiveRotation(b)));
  add('scale', 'Scale', 'Transform', `${trim(effectiveScale(a))}×`, `${trim(effectiveScale(b))}×`);
  add('offsetX', 'Horizontal offset', 'Transform', px(a.offsetX), px(b.offsetX));
  add('offsetY', 'Vertical offset', 'Transform', px(a.offsetY), px(b.offsetY));
  add('stretchedMode', 'Stretched resolution', 'Transform', a.stretchedMode, b.stretchedMode);

  /* Behaviour */
  add('dynamicFiring', 'Recoil bloom', 'Behaviour', onOff(a.dynamicFiring), onOff(b.dynamicFiring));
  add(
    'firingBloomExpansion',
    'Bloom expansion',
    'Behaviour',
    px(a.firingBloomExpansion),
    px(b.firingBloomExpansion),
  );
  add('adsMorphEnabled', 'ADS morph', 'Behaviour', onOff(a.adsMorphEnabled), onOff(b.adsMorphEnabled));
  add('adsStyle', 'ADS style', 'Behaviour', a.adsStyle, b.adsStyle);
  add('adsScale', 'ADS scale', 'Behaviour', `${trim(a.adsScale)}×`, `${trim(b.adsScale)}×`);

  return out;
}

function hasArm(config: CrosshairConfig, dir: ArmDirection): boolean {
  switch (dir) {
    case 'top':
      return config.hasTopArm;
    case 'bottom':
      return config.hasBottomArm;
    case 'left':
      return config.hasLeftArm;
    case 'right':
      return config.hasRightArm;
  }
}

/** Differences grouped for display, in a fixed group order. */
export function groupDifferences(
  differences: readonly ConfigDifference[],
): Array<{ group: ConfigDifference['group']; items: ConfigDifference[] }> {
  const order: ConfigDifference['group'][] = [
    'Style',
    'Arms',
    'Centre dot',
    'Outline',
    'Ring',
    'Colour',
    'Transform',
    'Behaviour',
  ];
  return order
    .map((group) => ({ group, items: differences.filter((d) => d.group === group) }))
    .filter((entry) => entry.items.length > 0);
}
