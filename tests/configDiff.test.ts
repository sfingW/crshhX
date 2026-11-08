import { describe, expect, it } from 'vitest';
import { diffConfigs, groupDifferences } from '../src/lib/configDiff';
import { DEFAULT_CONFIG } from '../src/lib/defaultPresets';
import type { CrosshairConfig } from '../src/types/crosshair';

/**
 * Variation comparison.
 *
 * The rule that matters: comparing a crosshair with itself reports *nothing*,
 * and comparing two crosshairs reports derived values rather than raw fields —
 * so a symmetric crosshair and an equivalent asymmetric one are recognised as
 * the same shape instead of producing four spurious rows.
 */

const base = (overrides: Partial<CrosshairConfig> = {}): CrosshairConfig => ({
  ...DEFAULT_CONFIG,
  ...overrides,
});

describe('diffConfigs', () => {
  it('reports no differences between identical configs', () => {
    expect(diffConfigs(base(), base())).toEqual([]);
  });

  it('is stable across object identity', () => {
    const a = base();
    expect(diffConfigs(a, { ...a })).toEqual([]);
  });

  it('ignores identity fields so a copy compared with its original is clean', () => {
    const a = base({ id: 'custom-1', name: 'Anchor' });
    const b = base({ id: 'custom-2', name: 'Anchor (Copy)', game: 'cs2' });
    expect(diffConfigs(a, b)).toEqual([]);
  });

  it('reports a single length change with units and a readable label', () => {
    const diff = diffConfigs(base({ length: 6 }), base({ length: 12 }));
    expect(diff).toHaveLength(4); // all four arms share the global length
    expect(diff[0]).toMatchObject({
      key: 'armLength.top',
      label: 'Top arm length',
      group: 'Arms',
      a: '6 px',
      b: '12 px',
    });
  });

  it('treats an asymmetric config equal to its symmetric equivalent as identical', () => {
    const symmetric = base({ length: 8, thickness: 2 });
    const asymmetric = base({
      length: 99, // ignored while the maps are present
      asymmetricArms: true,
      armLength: { top: 8, bottom: 8, left: 8, right: 8 },
      armThickness: { top: 2, bottom: 2, left: 2, right: 2 },
    });
    expect(diffConfigs(symmetric, asymmetric)).toEqual([]);
  });

  it('reports only the arms that actually differ when one direction changes', () => {
    const a = base({ length: 8 });
    const b = base({
      length: 8,
      asymmetricArms: true,
      armLength: { top: 8, bottom: 14, left: 8, right: 8 },
      armThickness: { top: 2, bottom: 2, left: 2, right: 2 },
    });
    const diff = diffConfigs(a, b);
    expect(diff.map((d) => d.key)).toEqual(['armLength.bottom']);
    expect(diff[0]).toMatchObject({ label: 'Bottom arm length', a: '8 px', b: '14 px' });
  });

  it('reports a hidden arm as a difference', () => {
    const diff = diffConfigs(base({ hasTopArm: true }), base({ hasTopArm: false }));
    expect(diff).toHaveLength(1);
    expect(diff[0]).toMatchObject({ key: 'hasArm.top', label: 'Top arm', a: 'on', b: 'off' });
  });

  it('formats colours, percentages, degrees and multipliers distinctly', () => {
    expect(diffConfigs(base({ primaryColor: '#00ffcc' }), base({ primaryColor: '#ff00aa' }))[0]).toMatchObject({
      label: 'Reticle colour',
      a: '#00ffcc',
      b: '#ff00aa',
    });
    expect(diffConfigs(base({ primaryOpacity: 1 }), base({ primaryOpacity: 0.55 }))[0]).toMatchObject({
      a: '100%',
      b: '55%',
    });
    expect(diffConfigs(base({ rotation: 0 }), base({ rotation: 45 }))[0]).toMatchObject({
      label: 'Rotation',
      a: '0°',
      b: '45°',
    });
    expect(diffConfigs(base({ scale: 1 }), base({ scale: 1.5 }))[0]).toMatchObject({
      label: 'Scale',
      a: '1×',
      b: '1.5×',
    });
  });

  it('treats an absent v2 field as its default rather than as a difference', () => {
    const old = base();
    delete (old as Partial<CrosshairConfig>).innerOutlineThickness;
    const explicit = base({ innerOutlineThickness: DEFAULT_CONFIG.innerOutlineThickness });
    expect(diffConfigs(old, explicit)).toEqual([]);
  });

  it('reports rotation and scale through their effective values', () => {
    // An unset rotation and an explicit 0 are the same crosshair.
    const unset = base();
    delete (unset as Partial<CrosshairConfig>).rotation;
    expect(diffConfigs(unset, base({ rotation: 0 }))).toEqual([]);
  });

  it('reports behaviour differences such as ADS morphing', () => {
    const diff = diffConfigs(base({ adsMorphEnabled: false }), base({ adsMorphEnabled: true, adsScale: 0.5 }));
    expect(diff.map((d) => d.key)).toEqual(['adsMorphEnabled', 'adsScale']);
  });

  it('reports an inner outline being switched on, including its defaults', () => {
    const diff = diffConfigs(
      base({ innerOutlineEnabled: false }),
      base({ innerOutlineEnabled: true, innerOutlineColor: '#ffffff', innerOutlineThickness: 2 }),
    );
    expect(diff.map((d) => d.key)).toEqual([
      'innerOutlineEnabled',
      'innerOutlineThickness',
      'innerOutlineColor',
    ]);
  });
});

describe('groupDifferences', () => {
  it('returns nothing for an empty diff', () => {
    expect(groupDifferences([])).toEqual([]);
  });

  it('groups in a fixed order and omits empty groups', () => {
    const diff = diffConfigs(
      base({ length: 6, primaryColor: '#ffffff' }),
      base({ length: 12, primaryColor: '#000000' }),
    );
    const grouped = groupDifferences(diff);
    expect(grouped.map((g) => g.group)).toEqual(['Arms', 'Colour']);
    expect(grouped[0].items).toHaveLength(4);
    expect(grouped[1].items).toHaveLength(1);
  });

  it('keeps every difference exactly once', () => {
    const diff = diffConfigs(
      base({ length: 6, rotation: 0, centerDotEnabled: false, outlineEnabled: false }),
      base({ length: 9, rotation: 30, centerDotEnabled: true, outlineEnabled: true }),
    );
    const grouped = groupDifferences(diff);
    const flattened = grouped.flatMap((g) => g.items.map((i) => i.key));
    expect(flattened).toHaveLength(diff.length);
    expect(new Set(flattened).size).toBe(flattened.length);
  });
});
