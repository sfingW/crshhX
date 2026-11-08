import type {
  AdsMorphStyle,
  ArmDirection,
  ArmSpec,
  CrosshairConfig,
  CrosshairTopology,
  StretchedResolutionMode,
} from '../types/crosshair';

/**
 * Crosshair configuration schema.
 *
 * One module owns three jobs that must never drift apart:
 *
 *  1. **Normalisation** — every config that enters the app (from storage, from
 *     an imported file, from a built-in preset, or from another machine) is
 *     passed through `normalizeCrosshairConfig`. Unknown, missing or
 *     out-of-range values are repaired and *recorded*, never silently dropped.
 *  2. **Resolution** — `resolveArmGeometry` is the single source of truth for
 *     "how long and how thick is each arm". The renderer, the editor and the
 *     tests all ask it, so a per-arm override can never disagree with what is
 *     drawn.
 *  3. **Limits** — the range table below drives both clamping and the UI's
 *     slider bounds, so a control can never offer a value the renderer rejects.
 *
 * This module is deliberately free of DOM, React and Electron imports so it can
 * run in plain Node tests and be reused by the import validator.
 */

/** Bumped whenever the persisted shape gains a field. See `migrateConfig`. */
export const CROSSHAIR_SCHEMA_VERSION = 2;

export const ARM_DIRECTIONS: readonly ArmDirection[] = ['top', 'bottom', 'left', 'right'];

/** Inclusive numeric ranges. Mirrored by the editor's slider bounds. */
/**
 * Inclusive numeric ranges. Mirrored by the editor's slider bounds.
 *
 * The lower bounds are derived from the **shipped library**, not from taste:
 * 107 of the 266 bundled presets use a `gap` below zero (arms that overlap the
 * centre to form a solid plus — a standard CS2/Valorant style) or a `thickness`
 * of zero. Clamping those would silently redraw a third of the vault, so the
 * ranges must admit them.
 *
 * Observed across all shipped presets: length 0–10, thickness 0–3, gap −3–16,
 * dot size 1–6, outline 1–1.5, ring radius 8–28, glow 0–5, adsScale 0.4–0.7.
 * The maxima below leave deliberate headroom for user designs.
 */
export const LIMITS = {
  length: { min: 0, max: 50, step: 0.5 },
  thickness: { min: 0, max: 20, step: 0.5 },
  gap: { min: -20, max: 50, step: 0.5 },
  centerDotSize: { min: 0, max: 20, step: 0.5 },
  outlineThickness: { min: 0, max: 6, step: 0.5 },
  innerOutlineThickness: { min: 0, max: 4, step: 0.25 },
  circleRadius: { min: 0, max: 100, step: 0.5 },
  circleThickness: { min: 0.5, max: 10, step: 0.5 },
  glowBlur: { min: 0, max: 20, step: 0.5 },
  offset: { min: -200, max: 200, step: 0.5 },
  opacity: { min: 0, max: 1, step: 0.01 },
  rotation: { min: 0, max: 360, step: 1 },
  scale: { min: 0.25, max: 3, step: 0.05 },
  adsScale: { min: 0.1, max: 1, step: 0.05 },
  firingBloomExpansion: { min: 0, max: 30, step: 0.5 },
  firingDecayMs: { min: 0, max: 2000, step: 10 },
  stretchCompressionRatio: { min: 0.3, max: 1, step: 0.001 },
  nameLength: { min: 1, max: 64 },
  descriptionLength: { min: 0, max: 280 },
} as const;

const TOPOLOGIES: readonly CrosshairTopology[] = [
  'cross',
  'dot',
  'circle',
  't-shape',
  'chevron',
  'custom-image',
];

/**
 * Topologies the renderer can actually draw.
 *
 * `custom-image` has been declared in the type since the first commit but no
 * code has ever rendered it, and no shipped preset uses it. Rather than offer a
 * control that produces an invisible crosshair, the editor does not list it and
 * normalisation flags it. It stays in the union so an old saved config is not
 * destroyed by loading it.
 */
export const RENDERABLE_TOPOLOGIES: readonly CrosshairTopology[] = [
  'cross',
  'dot',
  'circle',
  't-shape',
  'chevron',
];

const STRETCH_MODES: readonly StretchedResolutionMode[] = [
  'none',
  '4:3',
  '16:10',
  '5:4',
  'custom',
];

const ADS_STYLES: readonly AdsMorphStyle[] = ['shrink', 'dot-only', 'fade'];

/** Neutral values for every field added in schema v2. */
export const V2_DEFAULTS = {
  asymmetricArms: false,
  rotation: 0,
  scale: 1,
  innerOutlineEnabled: false,
  innerOutlineColor: '#000000',
  innerOutlineThickness: 1,
  innerOutlineOpacity: 1,
} as const;

/** A fresh per-arm map with all four directions set to `value`. */
export function uniformArmValues(value: number): Record<ArmDirection, number> {
  return { top: value, bottom: value, left: value, right: value };
}

/* ------------------------------------------------------------------ *
 * Primitive coercion
 * ------------------------------------------------------------------ */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

/**
 * Rounds to the step so stored values never carry float noise.
 *
 * `Math.round(0.7 / 0.05) * 0.05` is `0.7000000000000001`, not `0.7`. Left
 * alone, that drift breaks equality checks ("has this config been edited?"),
 * makes serialised files differ from what the user set, and accumulates across
 * repeated load/save cycles. Rounding to the number of decimals the step implies
 * removes it.
 */
function quantize(value: number, step: number): number {
  if (!Number.isFinite(step) || step <= 0) return value;
  const decimals = Math.max(0, Math.ceil(-Math.log10(step)));
  return Number((Math.round(value / step) * step).toFixed(decimals));
}

function num(
  raw: unknown,
  fallback: number,
  range: { min: number; max: number; step: number },
  repairs: string[],
  label: string,
): number {
  if (raw === undefined || raw === null) return fallback;
  const n = typeof raw === 'string' ? Number(raw) : (raw as number);
  if (typeof n !== 'number' || !Number.isFinite(n)) {
    repairs.push(`${label}: "${String(raw)}" is not a number — used ${fallback}.`);
    return fallback;
  }
  const clamped = clamp(n, range.min, range.max);
  if (clamped !== n) {
    repairs.push(`${label}: ${n} is outside ${range.min}–${range.max} — clamped to ${clamped}.`);
  }
  // Quantizing after clamping can nudge a value back over the max (e.g. 50 with
  // step 0.5 is exact, but 0.999 with step 0.5 is not), so clamp once more.
  return clamp(quantize(clamped, range.step), range.min, range.max);
}

function bool(raw: unknown, fallback: boolean, repairs: string[], label: string): boolean {
  if (raw === undefined || raw === null) return fallback;
  if (typeof raw === 'boolean') return raw;
  if (raw === 'true' || raw === 1) return true;
  if (raw === 'false' || raw === 0) return false;
  repairs.push(`${label}: "${String(raw)}" is not a boolean — used ${fallback}.`);
  return fallback;
}

/** Accepts `#rgb`, `#rrggbb` (either case, with or without the hash) and repairs anything else. */
export function normalizeColor(raw: unknown, fallback: string, repairs: string[], label: string): string {
  if (raw === undefined || raw === null) return fallback;
  if (typeof raw !== 'string') {
    repairs.push(`${label}: colour was not a string — used ${fallback}.`);
    return fallback;
  }
  let value = raw.trim();
  if (!value.startsWith('#')) value = `#${value}`;
  const bare = value.slice(1);

  // Canonical form is always `#rrggbb` lower-case, so two configs that specify
  // the same colour compare equal and serialise identically. Expanding `#abc`
  // is lossless, so it is not reported as a repair.
  if (/^[0-9a-f]{6}$/i.test(bare)) return `#${bare.toLowerCase()}`;
  if (/^[0-9a-f]{3}$/i.test(bare)) {
    return `#${bare
      .split('')
      .map((c) => c + c)
      .join('')
      .toLowerCase()}`;
  }
  repairs.push(`${label}: "${raw}" is not a valid hex colour — used ${fallback}.`);
  return fallback;
}

function oneOf<T extends string>(
  raw: unknown,
  allowed: readonly T[],
  fallback: T,
  repairs: string[],
  label: string,
): T {
  if (raw === undefined || raw === null) return fallback;
  if (typeof raw === 'string' && (allowed as readonly string[]).includes(raw)) return raw as T;
  repairs.push(`${label}: "${String(raw)}" is not one of ${allowed.join(', ')} — used ${fallback}.`);
  return fallback;
}

function text(
  raw: unknown,
  fallback: string,
  max: number,
  repairs: string[],
  label: string,
): string {
  if (raw === undefined || raw === null) return fallback;
  if (typeof raw !== 'string') {
    repairs.push(`${label}: was not a string — used "${fallback}".`);
    return fallback;
  }
  const trimmed = raw.trim();
  if (trimmed.length > max) {
    repairs.push(`${label}: longer than ${max} characters — truncated.`);
    return trimmed.slice(0, max);
  }
  return trimmed || fallback;
}

/* ------------------------------------------------------------------ *
 * Per-arm maps
 * ------------------------------------------------------------------ */

function normalizeArmMap(
  raw: unknown,
  fallbackValue: number,
  range: { min: number; max: number; step: number },
  repairs: string[],
  label: string,
): Record<ArmDirection, number> {
  const source = isRecord(raw) ? raw : {};
  if (raw !== undefined && raw !== null && !isRecord(raw)) {
    repairs.push(`${label}: was not an object — all four directions reset to ${fallbackValue}.`);
  }
  const out = {} as Record<ArmDirection, number>;
  for (const dir of ARM_DIRECTIONS) {
    out[dir] = num(source[dir], fallbackValue, range, repairs, `${label}.${dir}`);
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * Normalisation
 * ------------------------------------------------------------------ */

export interface NormalizeResult {
  config: CrosshairConfig;
  repairs: string[];
}

/**
 * Validates and completes a crosshair configuration.
 *
 * Accepts anything — a parsed JSON blob, a partial object, a legacy v1 config,
 * or outright garbage — and always returns a config the renderer can draw.
 * Every repair is reported so the UI can tell the user what happened instead of
 * quietly changing their crosshair.
 *
 * Normalisation is **idempotent** and **visually neutral for v1 configs**: the
 * v2 defaults are all no-ops (symmetric arms, no rotation, scale 1, no inner
 * outline), so loading an existing saved crosshair never changes how it looks.
 */
export function normalizeCrosshairConfig(raw: unknown, context = 'crosshair'): NormalizeResult {
  const repairs: string[] = [];

  if (!isRecord(raw)) {
    repairs.push(`${context}: not an object — replaced with the default crosshair.`);
    return { config: { ...createBaseConfig(context) }, repairs };
  }

  const id =
    typeof raw.id === 'string' && raw.id.trim()
      ? raw.id.trim()
      : (repairs.push(`${context}: missing id — generated one.`), `imported-${Date.now()}`);

  const topology = oneOf(raw.topology, TOPOLOGIES, 'cross', repairs, `${context}.topology`);
  if (topology === 'custom-image') {
    repairs.push(
      `${context}: topology "custom-image" is declared but has never been rendered by crshhx; the crosshair will draw as a plain cross.`,
    );
  }

  const length = num(raw.length, 6, LIMITS.length, repairs, `${context}.length`);
  const thickness = num(raw.thickness, 2, LIMITS.thickness, repairs, `${context}.thickness`);

  const config: CrosshairConfig = {
    id,
    name: text(raw.name, 'Untitled', LIMITS.nameLength.max, repairs, `${context}.name`),
    game: oneOf(
      raw.game,
      ['valorant', 'cs2', 'fortnite', 'apex', 'universal'] as const,
      'universal',
      repairs,
      `${context}.game`,
    ),
    isBuiltIn: bool(raw.isBuiltIn, false, repairs, `${context}.isBuiltIn`),
    topology,

    length,
    thickness,
    gap: num(raw.gap, 2, LIMITS.gap, repairs, `${context}.gap`),
    hasTopArm: bool(raw.hasTopArm, true, repairs, `${context}.hasTopArm`),
    hasBottomArm: bool(raw.hasBottomArm, true, repairs, `${context}.hasBottomArm`),
    hasLeftArm: bool(raw.hasLeftArm, true, repairs, `${context}.hasLeftArm`),
    hasRightArm: bool(raw.hasRightArm, true, repairs, `${context}.hasRightArm`),

    // v2 — independent per-direction geometry.
    asymmetricArms: bool(
      raw.asymmetricArms,
      V2_DEFAULTS.asymmetricArms,
      repairs,
      `${context}.asymmetricArms`,
    ),
    armLength: normalizeArmMap(raw.armLength, length, LIMITS.length, repairs, `${context}.armLength`),
    armThickness: normalizeArmMap(
      raw.armThickness,
      thickness,
      LIMITS.thickness,
      repairs,
      `${context}.armThickness`,
    ),

    // v2 — whole-reticle transform.
    rotation: num(raw.rotation, V2_DEFAULTS.rotation, LIMITS.rotation, repairs, `${context}.rotation`),
    scale: num(raw.scale, V2_DEFAULTS.scale, LIMITS.scale, repairs, `${context}.scale`),

    primaryColor: normalizeColor(raw.primaryColor, '#00ffcc', repairs, `${context}.primaryColor`),
    primaryOpacity: num(
      raw.primaryOpacity,
      1,
      LIMITS.opacity,
      repairs,
      `${context}.primaryOpacity`,
    ),

    centerDotEnabled: bool(raw.centerDotEnabled, false, repairs, `${context}.centerDotEnabled`),
    centerDotSize: num(raw.centerDotSize, 2, LIMITS.centerDotSize, repairs, `${context}.centerDotSize`),
    centerDotShape: oneOf(
      raw.centerDotShape,
      ['square', 'circle'] as const,
      'square',
      repairs,
      `${context}.centerDotShape`,
    ),
    centerDotColor: normalizeColor(
      raw.centerDotColor,
      '#000000',
      repairs,
      `${context}.centerDotColor`,
    ),
    centerDotOpacity: num(
      raw.centerDotOpacity,
      1,
      LIMITS.opacity,
      repairs,
      `${context}.centerDotOpacity`,
    ),

    outlineEnabled: bool(raw.outlineEnabled, false, repairs, `${context}.outlineEnabled`),
    outlineColor: normalizeColor(raw.outlineColor, '#000000', repairs, `${context}.outlineColor`),
    outlineThickness: num(
      raw.outlineThickness,
      1,
      LIMITS.outlineThickness,
      repairs,
      `${context}.outlineThickness`,
    ),
    outlineOpacity: num(
      raw.outlineOpacity,
      1,
      LIMITS.opacity,
      repairs,
      `${context}.outlineOpacity`,
    ),

    // v2 — inner outline, drawn inset inside each element.
    innerOutlineEnabled: bool(
      raw.innerOutlineEnabled,
      V2_DEFAULTS.innerOutlineEnabled,
      repairs,
      `${context}.innerOutlineEnabled`,
    ),
    innerOutlineColor: normalizeColor(
      raw.innerOutlineColor,
      V2_DEFAULTS.innerOutlineColor,
      repairs,
      `${context}.innerOutlineColor`,
    ),
    innerOutlineThickness: num(
      raw.innerOutlineThickness,
      V2_DEFAULTS.innerOutlineThickness,
      LIMITS.innerOutlineThickness,
      repairs,
      `${context}.innerOutlineThickness`,
    ),
    innerOutlineOpacity: num(
      raw.innerOutlineOpacity,
      V2_DEFAULTS.innerOutlineOpacity,
      LIMITS.opacity,
      repairs,
      `${context}.innerOutlineOpacity`,
    ),

    circleEnabled: bool(raw.circleEnabled, false, repairs, `${context}.circleEnabled`),
    circleRadius: num(raw.circleRadius, 16, LIMITS.circleRadius, repairs, `${context}.circleRadius`),
    circleThickness: num(
      raw.circleThickness,
      2,
      LIMITS.circleThickness,
      repairs,
      `${context}.circleThickness`,
    ),
    circleColor: normalizeColor(raw.circleColor, '#00ffcc', repairs, `${context}.circleColor`),
    circleOpacity: num(
      raw.circleOpacity,
      0.8,
      LIMITS.opacity,
      repairs,
      `${context}.circleOpacity`,
    ),

    glowEnabled: bool(raw.glowEnabled, false, repairs, `${context}.glowEnabled`),
    glowColor: normalizeColor(raw.glowColor, '#00ffcc', repairs, `${context}.glowColor`),
    glowBlur: num(raw.glowBlur, 4, LIMITS.glowBlur, repairs, `${context}.glowBlur`),

    offsetX: num(raw.offsetX, 0, LIMITS.offset, repairs, `${context}.offsetX`),
    offsetY: num(raw.offsetY, 0, LIMITS.offset, repairs, `${context}.offsetY`),

    stretchedMode: oneOf(
      raw.stretchedMode,
      STRETCH_MODES,
      'none',
      repairs,
      `${context}.stretchedMode`,
    ),
    stretchCompressionRatio: num(
      raw.stretchCompressionRatio,
      0.75,
      LIMITS.stretchCompressionRatio,
      repairs,
      `${context}.stretchCompressionRatio`,
    ),

    dynamicFiring: bool(raw.dynamicFiring, false, repairs, `${context}.dynamicFiring`),
    firingBloomExpansion: num(
      raw.firingBloomExpansion,
      5,
      LIMITS.firingBloomExpansion,
      repairs,
      `${context}.firingBloomExpansion`,
    ),
    firingDecayMs: num(
      raw.firingDecayMs,
      120,
      LIMITS.firingDecayMs,
      repairs,
      `${context}.firingDecayMs`,
    ),

    adsMorphEnabled: bool(raw.adsMorphEnabled, false, repairs, `${context}.adsMorphEnabled`),
    adsTrigger: oneOf(
      raw.adsTrigger,
      ['right-click', 'hotkey'] as const,
      'right-click',
      repairs,
      `${context}.adsTrigger`,
    ),
    adsStyle: oneOf(raw.adsStyle, ADS_STYLES, 'shrink', repairs, `${context}.adsStyle`),
    adsScale: num(raw.adsScale, 0.7, LIMITS.adsScale, repairs, `${context}.adsScale`),

    schemaVersion: CROSSHAIR_SCHEMA_VERSION,
  };

  // Only carry the optional image fields forward when they are actually usable.
  if (typeof raw.customImageUrl === 'string' && raw.customImageUrl.trim()) {
    config.customImageUrl = raw.customImageUrl.trim();
  }
  if (raw.customImageScale !== undefined) {
    config.customImageScale = num(
      raw.customImageScale,
      1,
      LIMITS.scale,
      repairs,
      `${context}.customImageScale`,
    );
  }

  return { config, repairs };
}

/** The minimal valid config, used when a blob is beyond repair. */
function createBaseConfig(context: string): CrosshairConfig {
  const { config } = normalizeCrosshairConfig(
    { id: `${context}-fallback`, name: 'Recovered crosshair' },
    context,
  );
  return config;
}

/**
 * Normalises a whole list, dropping entries that are not objects at all.
 * Used for imported libraries and for loading saved presets.
 */
export function normalizeCrosshairList(
  raw: unknown,
  context = 'presets',
): { configs: CrosshairConfig[]; repairs: string[] } {
  const repairs: string[] = [];
  if (!Array.isArray(raw)) {
    repairs.push(`${context}: expected an array — nothing was imported.`);
    return { configs: [], repairs };
  }

  const configs: CrosshairConfig[] = [];
  raw.forEach((entry, i) => {
    if (!isRecord(entry)) {
      repairs.push(`${context}[${i}]: not an object — skipped.`);
      return;
    }
    const result = normalizeCrosshairConfig(entry, `${context}[${i}]`);
    repairs.push(...result.repairs);
    configs.push(result.config);
  });

  return { configs, repairs };
}

/* ------------------------------------------------------------------ *
 * Resolution — the single source of truth for what gets drawn
 * ------------------------------------------------------------------ */

/**
 * Effective geometry for each arm.
 *
 * When `asymmetricArms` is off, all four directions use the global
 * `length`/`thickness` — which is exactly how every pre-v2 config behaved. When
 * it is on, each direction uses its own values, so a user can build e.g.
 * top 8 / bottom 12 / left 8 / right 12.
 */
export function resolveArmGeometry(config: CrosshairConfig): Record<ArmDirection, ArmSpec> {
  const out = {} as Record<ArmDirection, ArmSpec>;
  for (const dir of ARM_DIRECTIONS) {
    out[dir] = config.asymmetricArms
      ? {
          length: config.armLength?.[dir] ?? config.length,
          thickness: config.armThickness?.[dir] ?? config.thickness,
        }
      : { length: config.length, thickness: config.thickness };
  }
  return out;
}

/** Overall multiplier applied to the whole reticle. Neutral when unset. */
export function effectiveScale(config: CrosshairConfig): number {
  const scale = config.scale ?? V2_DEFAULTS.scale;
  return Number.isFinite(scale) && scale > 0 ? scale : V2_DEFAULTS.scale;
}

/** Whole-reticle rotation in degrees, wrapped to 0–360. */
export function effectiveRotation(config: CrosshairConfig): number {
  const rotation = config.rotation ?? V2_DEFAULTS.rotation;
  if (!Number.isFinite(rotation)) return 0;
  return ((rotation % 360) + 360) % 360;
}

/** Horizontal compression implied by the stretched-resolution mode. */
export function stretchRatioX(config: CrosshairConfig): number {
  switch (config.stretchedMode) {
    case '4:3':
      return 0.75;
    case '16:10':
      return 0.9;
    case '5:4':
      return 0.703;
    case 'custom':
      return config.stretchCompressionRatio || 0.75;
    default:
      return 1;
  }
}

/** True when a config would draw nothing at all — useful before saving. */
export function isConfigEmpty(config: CrosshairConfig): boolean {
  const arms = resolveArmGeometry(config);
  const anyArm =
    (config.hasTopArm && arms.top.length > 0) ||
    (config.hasBottomArm && arms.bottom.length > 0) ||
    (config.hasLeftArm && arms.left.length > 0) ||
    (config.hasRightArm && arms.right.length > 0);
  const anyDot = config.centerDotEnabled && config.centerDotSize > 0;
  const anyRing = config.circleEnabled && config.circleRadius > 0;
  return !anyArm && !anyDot && !anyRing;
}
