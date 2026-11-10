import { describe, expect, it } from 'vitest';
import { CATALOGUE } from '../src/catalogue';

/**
 * The catalogue is generated from the desktop application, so these assertions
 * are really about the website's copy: every number on the Pro Crosshairs and
 * Academy pages is read from this file, and a page cannot claim a design, a
 * category or a lesson that is not here.
 *
 * The ranges asserted are sanity ranges, not the schema's documented ones.
 * `src/types/crosshair.ts` comments length as "1 to 50" and gap as "0 to 50",
 * but the shipped catalogue legitimately contains dot-only designs with length 0
 * and overlapping arms with a negative gap, so a tighter bound would fail on
 * real product data rather than on a website defect.
 */
const HEX = /^#[0-9a-fA-F]{6}$/;
const VISUAL_KINDS = new Set([
  'anatomy',
  'colours',
  'monitors',
  'overlay-stack',
  'live',
  'compare',
  'clickmap',
]);

describe('generated catalogue — vault', () => {
  it('counts the built-in vault and says all of it is built in', () => {
    expect(CATALOGUE.vault.total).toBe(258);
    expect(CATALOGUE.vault.allBuiltIn).toBe(true);
  });

  it('has game and topology counts that add up to the total', () => {
    const sum = (record: Record<string, number>) =>
      Object.values(record).reduce((total, value) => total + value, 0);
    expect(sum(CATALOGUE.vault.byGame)).toBe(CATALOGUE.vault.total);
    expect(sum(CATALOGUE.vault.byTopology)).toBe(CATALOGUE.vault.total);
    expect(Object.keys(CATALOGUE.vault.byGame).sort()).toEqual(
      ['apex', 'cs2', 'fortnite', 'universal', 'valorant'],
    );
  });
});

describe('generated catalogue — pro crosshairs', () => {
  const { pro } = CATALOGUE;

  it('carries every design the application ships, with unique ids', () => {
    expect(pro.entries).toHaveLength(pro.total);
    expect(pro.total).toBe(42);
    const ids = pro.entries.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every((id) => id.startsWith('pc-'))).toBe(true);
  });

  it('fills every standard category evenly', () => {
    const standard = pro.categories.filter((category) => category.id !== 'gold');
    expect(standard).toHaveLength(8);
    for (const category of standard) {
      const count = pro.entries.filter((entry) => entry.category === category.id).length;
      expect(count, category.id).toBe(5);
      expect(category.label.length, category.id).toBeGreaterThan(2);
      expect(category.blurb.length, category.id).toBeGreaterThan(8);
    }
  });

  it('keeps the Gold Series apart, attributed and labelled', () => {
    const gold = pro.entries.filter((entry) => entry.series === 'gold');
    expect(gold).toHaveLength(2);
    expect(pro.categories.map((category) => category.id)).toContain('gold');
    for (const entry of gold) {
      expect(entry.category).toBe('gold');
      expect(entry.tier).toBe('inspired');
      expect(entry.inspiration).toContain('Not an official preset');
      expect(entry.inspiration).toContain('no endorsement implied');
    }
  });

  it('labels every design with a tier the application defines', () => {
    const tiers = Object.keys(pro.tierLabels);
    expect(tiers).toEqual(['verified', 'inspired', 'original']);
    for (const entry of pro.entries) {
      expect(tiers, entry.id).toContain(entry.tier);
    }
    // No design is attributed to a named player, and the page says why.
    expect(pro.entries.filter((entry) => entry.tier === 'verified')).toHaveLength(0);
    expect(pro.note).toContain('No player-named crosshairs yet');
  });

  it('gives every design a name, a description and drawable parameters', () => {
    for (const entry of pro.entries) {
      expect(entry.name.length, entry.id).toBeGreaterThan(2);
      expect(entry.description.length, entry.id).toBeGreaterThan(20);
      const { spec } = entry;
      expect(HEX.test(spec.color ?? ''), entry.id).toBe(true);
      expect(Number.isFinite(spec.length), entry.id).toBe(true);
      expect(Number.isFinite(spec.thickness), entry.id).toBe(true);
      expect(Number.isFinite(spec.gap), entry.id).toBe(true);
      expect((spec.length ?? 0) >= 0 && (spec.length ?? 0) <= 50, entry.id).toBe(true);
      expect((spec.thickness ?? 0) >= 0 && (spec.thickness ?? 0) <= 20, entry.id).toBe(true);
      if (spec.outlineColor) expect(HEX.test(spec.outlineColor), entry.id).toBe(true);
      if (spec.dotColor) expect(HEX.test(spec.dotColor), entry.id).toBe(true);
      if (spec.ringColor) expect(HEX.test(spec.ringColor), entry.id).toBe(true);
      if (spec.rotation !== undefined) {
        expect(spec.rotation, entry.id).toBeGreaterThanOrEqual(0);
        expect(spec.rotation, entry.id).toBeLessThan(360);
      }
    }
  });

  it('names the effects a static drawing cannot show', () => {
    const withEffects = pro.entries.filter((entry) => (entry.beyond?.length ?? 0) > 0);
    expect(withEffects.length).toBeGreaterThan(0);
    for (const entry of withEffects) {
      for (const effect of entry.beyond ?? []) {
        expect(
          ['glow', 'firing bloom', 'ADS morph', 'position offset'].includes(effect) ||
            effect.startsWith('stretched '),
          `${entry.id}: ${effect}`,
        ).toBe(true);
      }
    }
  });
});

describe('generated catalogue — academy', () => {
  const { academy } = CATALOGUE;

  it('carries the whole curriculum in the application’s order', () => {
    expect(academy.tutorials).toHaveLength(academy.total);
    expect(academy.total).toBe(10);
    expect(academy.order).toEqual(academy.tutorials.map((tutorial) => tutorial.id));
  });

  it('chains every lesson to the next one', () => {
    academy.tutorials.forEach((tutorial, index) => {
      const expected = index === academy.tutorials.length - 1 ? null : academy.tutorials[index + 1].id;
      expect(tutorial.next, tutorial.id).toBe(expected);
    });
  });

  it('gives every lesson a title, an intro and real steps', () => {
    for (const tutorial of academy.tutorials) {
      expect(tutorial.title.length, tutorial.id).toBeGreaterThan(6);
      expect(tutorial.intro.length, tutorial.id).toBeGreaterThan(20);
      expect(tutorial.steps.length, tutorial.id).toBeGreaterThan(0);
      for (const step of tutorial.steps) {
        // Some shipped steps are short headings ("Gap", "Outline"), so assert
        // that every step is a real string rather than that it is prose.
        expect(step.trim().length, tutorial.id).toBeGreaterThan(1);
      }
      for (const kind of tutorial.visuals) {
        expect(VISUAL_KINDS.has(kind), `${tutorial.id}: ${kind}`).toBe(true);
      }
    }
  });
});
