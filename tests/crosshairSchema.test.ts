import { describe, expect, it } from 'vitest';
import {
  ARM_DIRECTIONS,
  CROSSHAIR_SCHEMA_VERSION,
  LIMITS,
  RENDERABLE_TOPOLOGIES,
  V2_DEFAULTS,
  clamp,
  effectiveRotation,
  effectiveScale,
  isConfigEmpty,
  normalizeColor,
  normalizeCrosshairConfig,
  normalizeCrosshairList,
  resolveArmGeometry,
  stretchRatioX,
  uniformArmValues,
} from '../src/lib/crosshairSchema';
import { DEFAULT_CONFIG, PRO_PRESETS } from '../src/lib/defaultPresets';
import { COMPLETE_CROSSHAIR_VAULT } from '../src/lib/crosshairCollection';
import type { CrosshairConfig } from '../src/types/crosshair';

/**
 * Schema normalisation and geometry resolution.
 *
 * The overriding requirement is that **loading an existing saved crosshair must
 * not change how it looks**. Every v2 default is therefore a no-op, and the
 * tests below pin that down against the real shipped presets rather than a
 * synthetic fixture.
 */

/** A v1-era blob: every field the type had before schema v2, and nothing more. */
function v1Config(overrides: Partial<CrosshairConfig> = {}): Record<string, unknown> {
  return {
    id: 'legacy-1',
    name: 'Legacy',
    game: 'cs2',
    isBuiltIn: false,
    topology: 'cross',
    length: 6,
    thickness: 2,
    gap: 2,
    hasTopArm: true,
    hasBottomArm: true,
    hasLeftArm: true,
    hasRightArm: true,
    primaryColor: '#00FFCC',
    primaryOpacity: 1,
    centerDotEnabled: false,
    centerDotSize: 2,
    centerDotShape: 'square',
    centerDotColor: '#000000',
    centerDotOpacity: 1,
    outlineEnabled: true,
    outlineColor: '#000000',
    outlineThickness: 1,
    outlineOpacity: 1,
    circleEnabled: false,
    circleRadius: 16,
    circleThickness: 2,
    circleColor: '#00ffcc',
    circleOpacity: 0.8,
    glowEnabled: false,
    glowColor: '#00ffcc',
    glowBlur: 4,
    offsetX: 0,
    offsetY: 0,
    stretchedMode: 'none',
    stretchCompressionRatio: 0.75,
    dynamicFiring: true,
    firingBloomExpansion: 5,
    firingDecayMs: 120,
    adsMorphEnabled: true,
    adsTrigger: 'right-click',
    adsStyle: 'shrink',
    adsScale: 0.7,
    ...overrides,
  };
}

describe('schema: version and limits', () => {
  it('publishes a version so persisted blobs can be migrated', () => {
    expect(CROSSHAIR_SCHEMA_VERSION).toBe(2);
  });

  it('stamps the current version on normalised output', () => {
    const { config } = normalizeCrosshairConfig(v1Config());
    expect(config.schemaVersion).toBe(CROSSHAIR_SCHEMA_VERSION);
  });

  it('defines a sane inclusive range for every numeric control', () => {
    for (const [key, range] of Object.entries(LIMITS)) {
      expect(range.min, `${key}.min`).toBeLessThanOrEqual(range.max);
      expect(Number.isFinite(range.min), `${key}.min finite`).toBe(true);
      expect(Number.isFinite(range.max), `${key}.max finite`).toBe(true);
    }
  });

  it('keeps v2 defaults visually neutral', () => {
    expect(V2_DEFAULTS.asymmetricArms).toBe(false);
    expect(V2_DEFAULTS.rotation).toBe(0);
    expect(V2_DEFAULTS.scale).toBe(1);
    expect(V2_DEFAULTS.innerOutlineEnabled).toBe(false);
  });

  it('does not offer the topology the renderer cannot draw', () => {
    expect(RENDERABLE_TOPOLOGIES).not.toContain('custom-image');
  });
});

describe('schema: backward compatibility with v1 configs', () => {
  it('preserves every v1 field value exactly', () => {
    const source = v1Config();
    const { config, repairs } = normalizeCrosshairConfig(source);
    expect(repairs).toEqual([]);

    for (const key of Object.keys(source) as Array<keyof typeof source>) {
      const expected = source[key];
      const actual = config[key as keyof CrosshairConfig];
      // Colours are lower-cased on the way in; everything else is untouched.
      if (key === 'primaryColor') {
        expect(actual).toBe(String(expected).toLowerCase());
      } else {
        expect(actual, `${String(key)} must survive normalisation`).toEqual(expected);
      }
    }
  });

  it('normalises every shipped pro preset without a single repair', () => {
    for (const preset of PRO_PRESETS) {
      const { repairs } = normalizeCrosshairConfig(preset, preset.id);
      expect(repairs, `${preset.id} should need no repair`).toEqual([]);
    }
  });

  it('normalises the whole vault without repairs', () => {
    expect(COMPLETE_CROSSHAIR_VAULT.length).toBeGreaterThan(0);
    for (const preset of COMPLETE_CROSSHAIR_VAULT) {
      const { repairs } = normalizeCrosshairConfig(preset, preset.id);
      expect(repairs, `${preset.id} should need no repair`).toEqual([]);
    }
  });

  /**
   * The website publishes this exact figure ("258 built-in presets"), and it is
   * the kind of claim that goes stale silently: nothing else in the repository
   * depends on the vault's length, so adding a family of presets would not fail
   * a single test while the marketing pages kept quoting the old number.
   *
   * Confirmed by execution rather than by reading, because the vault is built
   * combinatorially inside generateCrosshairVault() and cannot be counted by
   * eye. If this fails the count really has changed, so update the website copy
   * in the same commit. See docs/design/website-redesign.md section 5.
   */
  it('keeps the built-in vault at the count the website publishes', () => {
    expect(COMPLETE_CROSSHAIR_VAULT.length).toBe(258);
    expect(COMPLETE_CROSSHAIR_VAULT.every((preset) => preset.isBuiltIn)).toBe(true);
    expect(new Set(COMPLETE_CROSSHAIR_VAULT.map((preset) => preset.id)).size).toBe(
      COMPLETE_CROSSHAIR_VAULT.length,
    );
  });

  it('leaves DEFAULT_CONFIG unchanged apart from the version stamp', () => {
    const { config, repairs } = normalizeCrosshairConfig(DEFAULT_CONFIG);
    expect(repairs).toEqual([]);
    expect(config.length).toBe(DEFAULT_CONFIG.length);
    expect(config.thickness).toBe(DEFAULT_CONFIG.thickness);
    expect(config.gap).toBe(DEFAULT_CONFIG.gap);
    expect(config.primaryColor).toBe(DEFAULT_CONFIG.primaryColor.toLowerCase());
  });

  it('is idempotent — normalising twice changes nothing', () => {
    const once = normalizeCrosshairConfig(v1Config()).config;
    const twice = normalizeCrosshairConfig(once);
    expect(twice.repairs).toEqual([]);
    expect(twice.config).toEqual(once);
  });

  it('keeps a v1 config symmetric, so its geometry is unchanged', () => {
    const { config } = normalizeCrosshairConfig(v1Config({ length: 9, thickness: 3 }));
    const arms = resolveArmGeometry(config);
    for (const dir of ARM_DIRECTIONS) {
      expect(arms[dir]).toEqual({ length: 9, thickness: 3 });
    }
  });
});

describe('schema: repair of invalid data', () => {
  it('clamps out-of-range numbers and reports it', () => {
    const { config, repairs } = normalizeCrosshairConfig(
      v1Config({ length: 9999, thickness: -4, gap: 1e6, offsetX: -50000 }),
    );
    expect(config.length).toBe(LIMITS.length.max);
    expect(config.thickness).toBe(LIMITS.thickness.min);
    expect(config.gap).toBe(LIMITS.gap.max);
    expect(config.offsetX).toBe(LIMITS.offset.min);
    expect(repairs.some((r) => r.includes('length'))).toBe(true);
    expect(repairs.some((r) => r.includes('clamped'))).toBe(true);
  });

  it('clamps the new v2 ranges too', () => {
    const { config } = normalizeCrosshairConfig(
      v1Config({ rotation: 9999, scale: -2, innerOutlineThickness: 99 }),
    );
    expect(config.rotation).toBe(LIMITS.rotation.max);
    expect(config.scale).toBe(LIMITS.scale.min);
    expect(config.innerOutlineThickness).toBe(LIMITS.innerOutlineThickness.max);
  });

  it('replaces a non-finite number with the default instead of poisoning the SVG', () => {
    const { config, repairs } = normalizeCrosshairConfig(
      v1Config({ length: Number.NaN, thickness: Number.POSITIVE_INFINITY }),
    );
    expect(Number.isFinite(config.length)).toBe(true);
    expect(Number.isFinite(config.thickness)).toBe(true);
    expect(repairs.length).toBeGreaterThan(0);
  });

  it('accepts a numeric string from a hand-edited file', () => {
    const { config } = normalizeCrosshairConfig(v1Config({ length: '12' }));
    expect(config.length).toBe(12);
  });

  it('repairs a malformed colour rather than emitting an invalid SVG attribute', () => {
    for (const bad of ['notacolour', 'rgb(1,2,3)', '', 12345, null]) {
      const { config } = normalizeCrosshairConfig(v1Config({ primaryColor: bad as never }));
      expect(config.primaryColor).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it('accepts a colour with no hash, and upper case', () => {
    const { config } = normalizeCrosshairConfig(v1Config({ primaryColor: 'FF00AA' }));
    expect(config.primaryColor).toBe('#ff00aa');
  });

  it('repairs an unknown topology and an unknown enum value', () => {
    const { config, repairs } = normalizeCrosshairConfig(
      v1Config({ topology: 'hexagram', adsStyle: 'explode', stretchedMode: '21:9' }),
    );
    expect(config.topology).toBe('cross');
    expect(config.adsStyle).toBe('shrink');
    expect(config.stretchedMode).toBe('none');
    expect(repairs.filter((r) => r.includes('is not one of'))).toHaveLength(3);
  });

  it('flags custom-image as declared-but-never-rendered instead of pretending', () => {
    const { config, repairs } = normalizeCrosshairConfig(v1Config({ topology: 'custom-image' }));
    // The value is preserved so an old save is not destroyed…
    expect(config.topology).toBe('custom-image');
    // …but the user is told it will not draw.
    expect(repairs.some((r) => r.includes('never been rendered'))).toBe(true);
  });

  it('generates an id when one is missing', () => {
    const { config, repairs } = normalizeCrosshairConfig(v1Config({ id: '   ' }));
    expect(config.id).toMatch(/^imported-/);
    expect(repairs.some((r) => r.includes('missing id'))).toBe(true);
  });

  it('truncates an over-long name and rejects a blank one', () => {
    const long = normalizeCrosshairConfig(v1Config({ name: 'x'.repeat(500) })).config;
    expect(long.name).toHaveLength(LIMITS.nameLength.max);

    const blank = normalizeCrosshairConfig(v1Config({ name: '   ' }));
    expect(blank.config.name).toBe('Untitled');
    expect(blank.repairs.length).toBe(0); // falling back to a default is not a repair
  });

  it('survives outright garbage without throwing', () => {
    for (const bad of [null, undefined, 42, 'crosshair', [], true, NaN]) {
      const { config, repairs } = normalizeCrosshairConfig(bad);
      expect(config, `input ${String(bad)}`).toBeDefined();
      expect(typeof config.id).toBe('string');
      expect(repairs.length).toBeGreaterThan(0);
    }
  });

  it('repairs a per-arm map that is not an object', () => {
    const { config, repairs } = normalizeCrosshairConfig(
      v1Config({ asymmetricArms: true, armLength: 'nonsense', armThickness: 7 }),
    );
    expect(config.armLength).toEqual(uniformArmValues(config.length));
    expect(config.armThickness).toEqual(uniformArmValues(config.thickness));
    expect(repairs.some((r) => r.includes('armLength'))).toBe(true);
  });

  it('fills missing directions in a partial per-arm map from the global value', () => {
    const { config } = normalizeCrosshairConfig(
      v1Config({ length: 10, asymmetricArms: true, armLength: { top: 4, right: 16 } }),
    );
    expect(config.armLength).toEqual({ top: 4, bottom: 10, left: 10, right: 16 });
  });
});

describe('schema: colour helper', () => {
  it('expands three-digit hex', () => {
    expect(normalizeColor('#abc', '#000000', [], 'c')).toBe('#aabbcc');
    expect(normalizeColor('abc', '#000000', [], 'c')).toBe('#aabbcc');
  });

  it('lower-cases and keeps valid six-digit hex', () => {
    expect(normalizeColor('#00FFCC', '#000000', [], 'c')).toBe('#00ffcc');
  });

  it('reports the fallback it used', () => {
    const repairs: string[] = [];
    expect(normalizeColor('nope', '#ff0000', repairs, 'primary')).toBe('#ff0000');
    expect(repairs[0]).toContain('primary');
    expect(repairs[0]).toContain('nope');
  });
});

describe('schema: clamp', () => {
  it('clamps both ends and passes through in-range values', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(11, 0, 10)).toBe(10);
  });

  it('treats a non-finite value as the minimum rather than propagating NaN', () => {
    expect(clamp(Number.NaN, 1, 10)).toBe(1);
    expect(clamp(Number.POSITIVE_INFINITY, 1, 10)).toBe(1);
  });
});

describe('geometry resolution: asymmetric arms', () => {
  it('gives each direction its own length and thickness when enabled', () => {
    const { config } = normalizeCrosshairConfig(
      v1Config({
        asymmetricArms: true,
        length: 6,
        thickness: 2,
        armLength: { top: 8, bottom: 12, left: 8, right: 12 },
        armThickness: { top: 1, bottom: 3, left: 1, right: 3 },
      }),
    );
    expect(resolveArmGeometry(config)).toEqual({
      top: { length: 8, thickness: 1 },
      bottom: { length: 12, thickness: 3 },
      left: { length: 8, thickness: 1 },
      right: { length: 12, thickness: 3 },
    });
  });

  it('ignores per-arm values while asymmetric mode is off', () => {
    // The overrides stay in the config (so turning the mode on later restores
    // them) but must not affect what is drawn.
    const { config } = normalizeCrosshairConfig(
      v1Config({
        asymmetricArms: false,
        length: 6,
        thickness: 2,
        armLength: { top: 8, bottom: 12, left: 8, right: 12 },
      }),
    );
    const arms = resolveArmGeometry(config);
    for (const dir of ARM_DIRECTIONS) expect(arms[dir]).toEqual({ length: 6, thickness: 2 });
  });

  it('falls back to the global value when an override is absent', () => {
    const config = { ...normalizeCrosshairConfig(v1Config()).config, asymmetricArms: true };
    const arms = resolveArmGeometry(config);
    for (const dir of ARM_DIRECTIONS) {
      expect(arms[dir]).toEqual({ length: config.length, thickness: config.thickness });
    }
  });
});

describe('geometry resolution: transform', () => {
  it('is neutral for a config that never set scale or rotation', () => {
    const { config } = normalizeCrosshairConfig(v1Config());
    expect(effectiveScale(config)).toBe(1);
    expect(effectiveRotation(config)).toBe(0);
  });

  it('wraps rotation into 0–360', () => {
    const base = normalizeCrosshairConfig(v1Config()).config;
    expect(effectiveRotation({ ...base, rotation: 370 })).toBe(10);
    expect(effectiveRotation({ ...base, rotation: -90 })).toBe(270);
    expect(effectiveRotation({ ...base, rotation: 720 })).toBe(0);
  });

  it('refuses a scale that would collapse or invert the reticle', () => {
    const base = normalizeCrosshairConfig(v1Config()).config;
    expect(effectiveScale({ ...base, scale: 0 })).toBe(1);
    expect(effectiveScale({ ...base, scale: Number.NaN })).toBe(1);
    expect(effectiveScale({ ...base, scale: 2.5 })).toBe(2.5);
  });

  it('reproduces the historical stretch ratios exactly', () => {
    const base = normalizeCrosshairConfig(v1Config()).config;
    expect(stretchRatioX({ ...base, stretchedMode: 'none' })).toBe(1);
    expect(stretchRatioX({ ...base, stretchedMode: '4:3' })).toBe(0.75);
    expect(stretchRatioX({ ...base, stretchedMode: '16:10' })).toBe(0.9);
    expect(stretchRatioX({ ...base, stretchedMode: '5:4' })).toBe(0.703);
    expect(
      stretchRatioX({ ...base, stretchedMode: 'custom', stretchCompressionRatio: 0.6 }),
    ).toBe(0.6);
  });

  it('falls back to 0.75 for a custom mode with no usable ratio', () => {
    const base = normalizeCrosshairConfig(v1Config()).config;
    expect(stretchRatioX({ ...base, stretchedMode: 'custom', stretchCompressionRatio: 0 })).toBe(
      0.75,
    );
  });
});

describe('schema: emptiness detection', () => {
  it('reports a crosshair that would draw nothing', () => {
    const { config } = normalizeCrosshairConfig(
      v1Config({
        length: 0,
        hasTopArm: false,
        hasBottomArm: false,
        hasLeftArm: false,
        hasRightArm: false,
        centerDotEnabled: false,
        circleEnabled: false,
      }),
    );
    expect(isConfigEmpty(config)).toBe(true);
  });

  it('is not empty when only a dot is enabled', () => {
    const { config } = normalizeCrosshairConfig(
      v1Config({ length: 0, centerDotEnabled: true, centerDotSize: 3 }),
    );
    expect(isConfigEmpty(config)).toBe(false);
  });

  it('is not empty when only a ring is enabled', () => {
    const { config } = normalizeCrosshairConfig(
      v1Config({ length: 0, circleEnabled: true, circleRadius: 20 }),
    );
    expect(isConfigEmpty(config)).toBe(false);
  });

  it('treats arms of zero length as nothing, even when enabled', () => {
    const { config } = normalizeCrosshairConfig(v1Config({ length: 0 }));
    expect(isConfigEmpty(config)).toBe(true);
  });
});

describe('schema: list normalisation', () => {
  it('normalises an array and reports per-entry repairs', () => {
    const { configs, repairs } = normalizeCrosshairList([
      v1Config({ id: 'a' }),
      v1Config({ id: 'b', length: 999 }),
    ]);
    expect(configs).toHaveLength(2);
    expect(configs[1].length).toBe(LIMITS.length.max);
    expect(repairs.some((r) => r.includes('presets[1]'))).toBe(true);
  });

  it('skips entries that are not objects at all', () => {
    const { configs, repairs } = normalizeCrosshairList([v1Config(), null, 7, 'x', []]);
    expect(configs).toHaveLength(1);
    expect(repairs.filter((r) => r.includes('skipped'))).toHaveLength(4);
  });

  it('tolerates a non-array payload', () => {
    const { configs, repairs } = normalizeCrosshairList({ nope: true });
    expect(configs).toEqual([]);
    expect(repairs[0]).toContain('expected an array');
  });

  it('tolerates undefined', () => {
    expect(normalizeCrosshairList(undefined).configs).toEqual([]);
  });
});
