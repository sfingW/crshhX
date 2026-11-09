import type { CrosshairConfig } from '../types/crosshair';

/**
 * Pro Crosshairs — a curated catalogue layered on the existing preset system.
 *
 * These are ordinary `CrosshairConfig` objects with the same ids-for-life
 * contract as the vault: they join `getPresetIndex` as one more source, so the
 * editor, the overlay, game profiles and weapon-slot switching all see them
 * with no second preset store anywhere.
 *
 * Honesty rules baked into the data (see docs/research/pro-crosshairs.md,
 * checked 2026-11-07):
 * - No player names. Aggregator sources contradict each other for every
 *   famous pro, so nothing here claims to be what a specific player uses.
 * - The `verified` tier exists but ships empty until a first-party source
 *   (the player's own publication) confirms exact values; entries would need
 *   `sourceNote` and `checkedOn`, which a data test enforces.
 * - Descriptions state what a design is for, and where a colour is a style
 *   choice with measured visibility trade-offs, they say so.
 */

export type ProTier = 'verified' | 'inspired' | 'original';

export type ProCategoryId =
  | 'fortnite'
  | 'tactical'
  | 'minimal'
  | 'precision'
  | 'classic'
  | 'dot'
  | 'circle'
  | 'custom'
  | 'gold';

export interface ProCrosshairMeta {
  id: string;
  category: ProCategoryId;
  tier: ProTier;
  /** Plain English, at most LIMITS.descriptionLength characters. */
  description: string;
  /** Required for tier 'verified': who confirms it, and the exact source. */
  sourceNote?: string;
  /** Required for tier 'verified': when the source was checked (YYYY-MM-DD). */
  checkedOn?: string;
  /**
   * Gold Series: the design gets the premium presentation on the website and
   * sits outside the standard sheet. Requires `inspiration`.
   */
  series?: 'gold';
  /**
   * Attribution for fan recreations: what the design was recreated from, and
   * an explicit statement that it is not official. Required when `series`
   * is set; a data test enforces it.
   */
  inspiration?: string;
}

export const PRO_CROSSHAIR_CATEGORIES: Array<{
  id: ProCategoryId;
  label: string;
  blurb: string;
}> = [
  { id: 'fortnite', label: 'Fortnite-inspired', blurb: 'High contrast for bright skies and busy builds.' },
  { id: 'tactical', label: 'Tactical', blurb: 'Calm, functional reticles for competitive shooters.' },
  { id: 'minimal', label: 'Minimal', blurb: 'As little on screen as possible.' },
  { id: 'precision', label: 'Precision', blurb: 'Dots and tight crosses for exact aim.' },
  { id: 'classic', label: 'Classic', blurb: 'The traditional plus signs that started it all.' },
  { id: 'dot', label: 'Dot', blurb: 'One point, zero clutter.' },
  { id: 'circle', label: 'Circle', blurb: 'Rings for spread and tracking.' },
  { id: 'custom', label: 'Custom designs', blurb: 'crshhx originals using the full v2 engine.' },
  {
    id: 'gold',
    label: 'Gold Series',
    blurb: 'Two fan recreations in a premium presentation, apart from the standard sheet.',
  },
];

export const TIER_LABELS: Record<ProTier, string> = {
  verified: 'Verified player',
  inspired: 'Competitive-inspired',
  original: 'crshhx original',
};

/** Shown in the Verified filter while that tier is empty — on purpose. */
export const VERIFIED_TIER_NOTE =
  'No player-named crosshairs yet — and that is deliberate. Public setting sites disagree about what famous players actually use, so we only list a crosshair as verified when the player has published it themselves. Everything else here is labelled as inspired or original.';

/* ------------------------------------------------------------------ *
 * Factory — fills every CrosshairConfig field so each entry is a
 * complete, schema-valid config. Values mirror the vault's defaults.
 * ------------------------------------------------------------------ */

function pc(
  id: string,
  name: string,
  game: CrosshairConfig['game'],
  opts: Partial<CrosshairConfig>,
): CrosshairConfig {
  const base = opts.primaryColor ?? '#00ffcc';
  return {
    id,
    name,
    game,
    isBuiltIn: true,
    topology: 'cross',
    length: 4,
    thickness: 2,
    gap: 2,
    hasTopArm: true,
    hasBottomArm: true,
    hasLeftArm: true,
    hasRightArm: true,
    primaryColor: base,
    primaryOpacity: 1,
    centerDotEnabled: false,
    centerDotSize: 2,
    centerDotShape: 'square',
    centerDotColor: base,
    centerDotOpacity: 1,
    outlineEnabled: false,
    outlineColor: '#000000',
    outlineThickness: 1,
    outlineOpacity: 1,
    circleEnabled: false,
    circleRadius: 16,
    circleThickness: 2,
    circleColor: base,
    circleOpacity: 0.8,
    glowEnabled: false,
    glowColor: base,
    glowBlur: 0,
    offsetX: 0,
    offsetY: 0,
    stretchedMode: 'none',
    stretchCompressionRatio: 0.75,
    dynamicFiring: false,
    firingBloomExpansion: 5,
    firingDecayMs: 120,
    adsMorphEnabled: false,
    adsTrigger: 'right-click',
    adsStyle: 'shrink',
    adsScale: 0.6,
    ...opts,
  };
}

interface ProDef {
  config: CrosshairConfig;
  category: ProCategoryId;
  tier: ProTier;
  description: string;
  series?: 'gold';
  inspiration?: string;
}

const DEFS: ProDef[] = [
  /* ---------------- Fortnite-inspired ---------------- */
  {
    config: pc('pc-fn-storm-tracker', 'Storm Tracker', 'fortnite', {
      primaryColor: '#00ffff', length: 4, thickness: 2, gap: 2,
      outlineEnabled: true, outlineThickness: 1,
    }),
    category: 'fortnite', tier: 'inspired',
    description: 'A bright cyan cross with a black outline. Easy to see against sky and buildings.',
  },
  {
    config: pc('pc-fn-build-brawl', 'Build Brawl Dot', 'fortnite', {
      primaryColor: '#ffff00', length: 2, thickness: 2, gap: 3,
      centerDotEnabled: true, centerDotSize: 2, centerDotShape: 'circle',
    }),
    category: 'fortnite', tier: 'inspired',
    description: 'A small yellow cross with a centre dot. Stays out of the way in fast build fights.',
  },
  {
    config: pc('pc-fn-skyward', 'Skyward White', 'fortnite', {
      primaryColor: '#ffffff', length: 3, thickness: 1.5, gap: 2,
      outlineEnabled: true, outlineThickness: 1,
    }),
    category: 'fortnite', tier: 'inspired',
    description: 'A clean white cross with a thin outline. Reads well on both dark and bright scenes.',
  },
  {
    config: pc('pc-fn-teal-rush', 'Teal Rush', 'fortnite', {
      primaryColor: '#00ffcc', length: 4, thickness: 2, gap: 2,
      outlineEnabled: true, outlineThickness: 1,
    }),
    category: 'fortnite', tier: 'inspired',
    description: 'A teal cross that contrasts with the warm colours of cartoon-style worlds.',
  },
  {
    config: pc('pc-fn-pink-pop', 'Pink Pop', 'fortnite', {
      primaryColor: '#ff00aa', length: 4, thickness: 2, gap: 3,
      outlineEnabled: true, outlineThickness: 1,
    }),
    category: 'fortnite', tier: 'inspired',
    description: 'A pink cross. Map testing rated pink as surprisingly visible on bright maps.',
  },

  /* ---------------- Tactical ---------------- */
  {
    config: pc('pc-tac-operator', 'Operator Green', 'universal', {
      primaryColor: '#00ff66', length: 5, thickness: 2, gap: 3,
      outlineEnabled: true, outlineThickness: 1,
    }),
    category: 'tactical', tier: 'inspired',
    description: 'A calm green cross with room in the centre. Good for tracking at mid range.',
  },
  {
    config: pc('pc-tac-breach', 'Breach White', 'cs2', {
      primaryColor: '#ffffff', length: 4, thickness: 2, gap: 2,
      outlineEnabled: true, outlineThickness: 1.5,
    }),
    category: 'tactical', tier: 'inspired',
    description: 'A solid white cross with a black outline. Stays visible on smoke and bright walls.',
  },
  {
    config: pc('pc-tac-sentinel', 'Sentinel T', 'valorant', {
      topology: 't-shape', primaryColor: '#00ffff', length: 4, thickness: 2, gap: 1,
    }),
    category: 'tactical', tier: 'inspired',
    description: 'A T-shaped cyan reticle. The open top keeps your view of the enemy clear.',
  },
  {
    config: pc('pc-tac-chevron', 'Night Chevron', 'apex', {
      topology: 'chevron', primaryColor: '#00ff66', length: 5, thickness: 2, gap: 4,
    }),
    category: 'tactical', tier: 'inspired',
    description: 'A downward green arrow. Points at your target without covering it.',
  },
  {
    config: pc('pc-tac-squad', 'Squad Micro', 'universal', {
      primaryColor: '#ffffff', length: 2, thickness: 1, gap: 1,
      centerDotEnabled: true, centerDotSize: 1.5, centerDotShape: 'circle',
    }),
    category: 'tactical', tier: 'inspired',
    description: 'A tiny white cross with a dot. Leaves almost nothing between you and the target.',
  },

  /* ---------------- Minimal ---------------- */
  {
    config: pc('pc-min-hairline', 'Hairline Cyan', 'universal', {
      primaryColor: '#00ffff', length: 3, thickness: 1, gap: 2,
    }),
    category: 'minimal', tier: 'inspired',
    description: 'One-pixel cyan lines. The quietest cross that is still easy to find.',
  },
  {
    config: pc('pc-min-feather', 'Feather White', 'universal', {
      primaryColor: '#ffffff', length: 3, thickness: 1, gap: 2,
    }),
    category: 'minimal', tier: 'inspired',
    description: 'Thin white lines for dark, quiet scenes.',
  },
  {
    config: pc('pc-min-ghost', 'Ghost Gap', 'universal', {
      primaryColor: '#00ff66', length: 2, thickness: 1, gap: 6,
    }),
    category: 'minimal', tier: 'inspired',
    description: 'A wide, airy green cross. The big gap keeps the centre of your screen clean.',
  },
  {
    config: pc('pc-min-whisper', 'Whisper Dot', 'universal', {
      primaryColor: '#ffffff', length: 1.5, thickness: 1, gap: 2,
      centerDotEnabled: true, centerDotSize: 1.5, centerDotShape: 'circle',
    }),
    category: 'minimal', tier: 'inspired',
    description: 'Nearly nothing: four short white lines and a small dot.',
  },
  {
    config: pc('pc-min-frame', 'Thin Frame', 'universal', {
      primaryColor: '#00ffff', length: 6, thickness: 0.5, gap: 4,
    }),
    category: 'minimal', tier: 'inspired',
    description: 'A light cyan frame around the centre. Helpful if you lose your crosshair mid-fight.',
  },

  /* ---------------- Precision ---------------- */
  {
    config: pc('pc-pre-pinpoint', 'Pixel Pinpoint', 'valorant', {
      topology: 'dot', primaryColor: '#00ffff', length: 0, thickness: 0, gap: 0,
      centerDotEnabled: true, centerDotSize: 2, centerDotShape: 'circle',
      outlineEnabled: true, outlineThickness: 1,
    }),
    category: 'precision', tier: 'inspired',
    description: 'A single cyan pixel with an outline. Maximum precision, minimum coverage.',
  },
  {
    config: pc('pc-pre-longshot', 'Long Shot Focus', 'cs2', {
      primaryColor: '#00ffff', length: 2, thickness: 1, gap: -2,
    }),
    category: 'precision', tier: 'inspired',
    description: 'A tight cyan cross for long-range shots. The lines almost touch in the middle.',
  },
  {
    config: pc('pc-pre-headline', 'Headline Dot', 'cs2', {
      topology: 'dot', primaryColor: '#00ff00', length: 0, thickness: 0, gap: 0,
      centerDotEnabled: true, centerDotSize: 3, centerDotShape: 'square',
      outlineEnabled: true, outlineThickness: 1,
    }),
    category: 'precision', tier: 'inspired',
    description: 'A small green square dot. Shows exactly where the bullet goes.',
  },
  {
    config: pc('pc-pre-flick', 'Flick Point', 'universal', {
      primaryColor: '#ffffff', length: 1, thickness: 1, gap: 1,
      centerDotEnabled: true, centerDotSize: 2, centerDotShape: 'circle',
    }),
    category: 'precision', tier: 'inspired',
    description: 'A white dot with four tiny ticks. Built for fast flick shots.',
  },
  {
    config: pc('pc-pre-surgeon', 'Surgeon Cross', 'valorant', {
      primaryColor: '#ffffff', length: 2.5, thickness: 1, gap: 0,
      outlineEnabled: true, outlineThickness: 1,
    }),
    category: 'precision', tier: 'inspired',
    description: 'A precise white cross with an outline. Nothing extra, nothing missing.',
  },

  /* ---------------- Classic ---------------- */
  {
    config: pc('pc-cla-arcade', 'Arcade Green', 'universal', {
      primaryColor: '#00ff00', length: 5, thickness: 2, gap: 0,
    }),
    category: 'classic', tier: 'inspired',
    description: 'The classic green plus sign. The look that started it all.',
  },
  {
    config: pc('pc-cla-retro', 'Retro White Plus', 'universal', {
      primaryColor: '#ffffff', length: 6, thickness: 2, gap: 1,
    }),
    category: 'classic', tier: 'inspired',
    description: 'A bigger white cross, like old arena shooters used.',
  },
  {
    config: pc('pc-cla-heritage', 'Heritage Cyan', 'universal', {
      primaryColor: '#00ffff', length: 5, thickness: 2, gap: 1,
      outlineEnabled: true, outlineThickness: 1,
    }),
    category: 'classic', tier: 'inspired',
    description: 'A cyan classic with an outline. Old shape, modern colour.',
  },
  {
    config: pc('pc-cla-old-school', 'Old School Yellow', 'universal', {
      primaryColor: '#ffff00', length: 5, thickness: 2, gap: 0,
    }),
    category: 'classic', tier: 'inspired',
    description: 'A yellow cross from the era of low-resolution monitors. Best on dark maps.',
  },
  {
    config: pc('pc-cla-legacy', 'Legacy Red', 'universal', {
      primaryColor: '#ff3333', length: 5, thickness: 2, gap: 1,
    }),
    category: 'classic', tier: 'inspired',
    description: 'A red classic. Style first: red can blend with damage effects, so test it in your game.',
  },

  /* ---------------- Dot ---------------- */
  {
    config: pc('pc-dot-solo', 'Solo Dot Cyan', 'universal', {
      topology: 'dot', primaryColor: '#00ffff', length: 0, thickness: 0, gap: 0,
      centerDotEnabled: true, centerDotSize: 2, centerDotShape: 'circle',
    }),
    category: 'dot', tier: 'inspired',
    description: 'One cyan dot. The simplest aim point there is.',
  },
  {
    config: pc('pc-dot-box', 'Box Dot White', 'universal', {
      topology: 'dot', primaryColor: '#ffffff', length: 0, thickness: 0, gap: 0,
      centerDotEnabled: true, centerDotSize: 2, centerDotShape: 'square',
      outlineEnabled: true, outlineThickness: 1,
    }),
    category: 'dot', tier: 'inspired',
    description: 'A tiny white square with an outline. Crisp on almost every background.',
  },
  {
    config: pc('pc-dot-heavy', 'Heavy Dot Green', 'universal', {
      topology: 'dot', primaryColor: '#00ff00', length: 0, thickness: 0, gap: 0,
      centerDotEnabled: true, centerDotSize: 4, centerDotShape: 'circle',
    }),
    category: 'dot', tier: 'inspired',
    description: 'A bigger green dot for players who lose small dots mid-fight.',
  },
  {
    config: pc('pc-dot-micro', 'Micro Dot Pink', 'universal', {
      topology: 'dot', primaryColor: '#ff00aa', length: 0, thickness: 0, gap: 0,
      centerDotEnabled: true, centerDotSize: 1.5, centerDotShape: 'circle',
    }),
    category: 'dot', tier: 'inspired',
    description: 'A pink micro dot. Small, sharp and unusual enough to spot instantly.',
  },
  {
    config: pc('pc-dot-halo', 'Halo Dot', 'universal', {
      topology: 'dot', primaryColor: '#ffffff', length: 0, thickness: 0, gap: 0,
      centerDotEnabled: true, centerDotSize: 3, centerDotShape: 'circle',
      outlineEnabled: true, outlineThickness: 1.5,
    }),
    category: 'dot', tier: 'inspired',
    description: 'A white dot with a black halo. Stays visible even on white smoke.',
  },

  /* ---------------- Circle ---------------- */
  {
    config: pc('pc-cir-spread', 'Spread Ring', 'fortnite', {
      topology: 'circle', primaryColor: '#ff3333', length: 0, thickness: 0, gap: 0,
      circleEnabled: true, circleRadius: 18, circleThickness: 2, circleOpacity: 0.9,
    }),
    category: 'circle', tier: 'inspired',
    description: 'A red ring showing rough shotgun spread. Useful for close-range weapons.',
  },
  {
    config: pc('pc-cir-halo', 'Halo Ring', 'universal', {
      topology: 'circle', primaryColor: '#00ffff', length: 0, thickness: 0, gap: 0,
      circleEnabled: true, circleRadius: 12, circleThickness: 1,
      centerDotEnabled: true, centerDotSize: 2, centerDotShape: 'circle',
    }),
    category: 'circle', tier: 'inspired',
    description: 'A thin cyan ring with a centre dot. A clean reference for tracking.',
  },
  {
    config: pc('pc-cir-target', 'Target Ring', 'universal', {
      primaryColor: '#00ff66', length: 2, thickness: 1.5, gap: 8,
      circleEnabled: true, circleRadius: 20, circleThickness: 2,
    }),
    category: 'circle', tier: 'inspired',
    description: 'A green ring with four short ticks, like a target sight.',
  },
  {
    config: pc('pc-cir-wide', 'Wide Ring White', 'universal', {
      topology: 'circle', primaryColor: '#ffffff', length: 0, thickness: 0, gap: 0,
      circleEnabled: true, circleRadius: 30, circleThickness: 1.5, circleOpacity: 0.6,
    }),
    category: 'circle', tier: 'inspired',
    description: 'A large, soft white ring. Helps with tracking without hiding the enemy.',
  },
  {
    config: pc('pc-cir-arena', 'Arena Ring', 'universal', {
      topology: 'circle', primaryColor: '#ffff00', length: 0, thickness: 0, gap: 0,
      circleEnabled: true, circleRadius: 16, circleThickness: 2,
      centerDotEnabled: true, centerDotSize: 2, centerDotShape: 'square',
    }),
    category: 'circle', tier: 'inspired',
    description: 'A yellow mid-size ring with a dot. A retro look that still works.',
  },

  /* ---------------- Custom designs (crshhx originals) ---------------- */
  {
    config: pc('pc-cus-ascent', 'Recoil Ascent', 'universal', {
      primaryColor: '#00ffff', length: 4, thickness: 2, gap: 2,
      asymmetricArms: true,
      armLength: { top: 3, bottom: 8, left: 5, right: 5 },
      armThickness: { top: 2, bottom: 2, left: 2, right: 2 },
    }),
    category: 'custom', tier: 'original',
    description: 'A longer bottom arm shows where recoil pulls your aim. A crshhx original.',
  },
  {
    config: pc('pc-cus-canted', 'Canted 45', 'universal', {
      primaryColor: '#ff00aa', length: 5, thickness: 2, gap: 2, rotation: 45,
    }),
    category: 'custom', tier: 'original',
    description: 'A cross turned 45 degrees into an X. Original design, pure style.',
  },
  {
    config: pc('pc-cus-dual', 'Dual Line', 'universal', {
      primaryColor: '#ffffff', length: 5, thickness: 3, gap: 2,
      innerOutlineEnabled: true, innerOutlineColor: '#000000', innerOutlineThickness: 1,
    }),
    category: 'custom', tier: 'original',
    description: 'White lines with a thin dark line inside. Reads like two crosshairs in one.',
  },
  {
    config: pc('pc-cus-mini', 'Half Scale', 'universal', {
      primaryColor: '#00ff66', length: 6, thickness: 2, gap: 3, scale: 0.5,
    }),
    category: 'custom', tier: 'original',
    description: 'A normal cross shrunk to half size with one setting. Shows what scale does.',
  },
  {
    config: pc('pc-cus-bloom', 'Bloom Trainer', 'universal', {
      primaryColor: '#ffff00', length: 4, thickness: 2, gap: 2,
      dynamicFiring: true, firingBloomExpansion: 8, firingDecayMs: 200,
    }),
    category: 'custom', tier: 'original',
    description: 'Grows when you fire and shrinks back. Trains you to pace your shots.',
  },

  /* ---------------- Gold Series ----------------
   *
   * A deliberate, narrow exception to the "no player names" rule above, and
   * the difference is in what is claimed: the vault never says what a named
   * player uses, and these two do not either. They say they are fan
   * recreations drawn from public reference imagery — measured geometry, not
   * published settings — and every surface that shows them repeats that they
   * are not official and imply no endorsement.
   */
  {
    config: pc('pc-gold-arc-crown', 'Arc Crown', 'universal', {
      topology: 'circle',
      hasTopArm: false, hasBottomArm: false, hasLeftArm: false, hasRightArm: false,
      circleEnabled: true, circleRadius: 28, circleThickness: 4,
      circleColor: '#dc583e', circleOpacity: 1,
      circleSegments: 4, circleArcSpan: 40, circleArcOffset: 45,
      centerDotEnabled: true, centerDotSize: 7, centerDotShape: 'circle',
      centerDotColor: '#28f953',
    }),
    category: 'gold', tier: 'inspired', series: 'gold',
    inspiration:
      "Fan recreation from public reference imagery of MrSavage's crosshair. Not an official preset; no endorsement implied.",
    description:
      'Four vermilion arcs crowning a bright green point. The open cardinals keep the centre of the screen clean for tracking.',
  },
  {
    config: pc('pc-gold-compact-mark', 'Compact Mark', 'universal', {
      primaryColor: '#6af469', length: 12, thickness: 4, gap: 5,
    }),
    category: 'gold', tier: 'inspired', series: 'gold',
    inspiration:
      "Fan recreation from public reference imagery of MrSavage's crosshair. Not an official preset; no endorsement implied.",
    description:
      'A compact green cross with a hollow centre: the four inner edges form the aiming point. No outline, no dot.',
  },
];

/** Every Pro Crosshair config, ready for `getPresetIndex` and the overlay. */
export const PRO_CROSSHAIRS: CrosshairConfig[] = DEFS.map((d) => d.config);

/** Metadata by preset id. */
export const PRO_CROSSHAIR_META: Record<string, ProCrosshairMeta> = Object.fromEntries(
  DEFS.map((d) => [
    d.config.id,
    {
      id: d.config.id,
      category: d.category,
      tier: d.tier,
      description: d.description,
      ...(d.tier === 'verified'
        ? { sourceNote: 'see docs/research/pro-crosshairs.md', checkedOn: '2026-11-07' }
        : {}),
      ...(d.series ? { series: d.series, inspiration: d.inspiration } : {}),
    } satisfies ProCrosshairMeta,
  ]),
);

/** The catalogue with metadata attached, for the Pro Crosshairs view. */
export interface ProCrosshairEntry {
  config: CrosshairConfig;
  meta: ProCrosshairMeta;
}

export const PRO_CROSSHAIR_ENTRIES: ProCrosshairEntry[] = DEFS.map((d) => ({
  config: d.config,
  meta: PRO_CROSSHAIR_META[d.config.id],
}));

/**
 * The fact line shown on each card: colour, size, thickness, gap, outline and
 * dot — read from the config itself, so the card can never disagree with the
 * preview it sits next to.
 */
export function specFacts(config: CrosshairConfig): string[] {
  return [
    `Colour ${config.primaryColor}`,
    `Size ${config.length}`,
    `Thickness ${config.thickness}`,
    `Gap ${config.gap}`,
    config.outlineEnabled ? `Outline ${config.outlineThickness}px` : 'Outline off',
    config.centerDotEnabled ? `Dot ${config.centerDotSize}px` : 'Dot off',
  ];
}
