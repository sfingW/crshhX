import { describe, expect, it } from 'vitest';

import {
  PRO_CROSSHAIRS,
  PRO_CROSSHAIR_CATEGORIES,
  PRO_CROSSHAIR_ENTRIES,
  PRO_CROSSHAIR_META,
  TIER_LABELS,
  VERIFIED_TIER_NOTE,
  specFacts,
} from '../src/lib/proCrosshairs';
import { COMPLETE_CROSSHAIR_VAULT } from '../src/lib/crosshairCollection';
import { PRO_PRESETS } from '../src/lib/defaultPresets';
import { LIMITS, normalizeCrosshairConfig } from '../src/lib/crosshairSchema';
import { getPresetIndex } from '../src/lib/presetLibrary';
import { listSelectablePresets } from '../src/lib/weaponSlots/presetIndex';

/**
 * Pro Crosshairs catalogue integrity.
 *
 * The catalogue joins the ONE preset index every feature reads from, so a bad
 * entry here would surface in the overlay, the editor and weapon slots alike.
 * These tests hold the line: schema validity, id uniqueness, honest metadata
 * and the no-player-names rule from docs/research/pro-crosshairs.md.
 */

const ALL_IDS = [
  ...COMPLETE_CROSSHAIR_VAULT.map((c) => c.id),
  ...PRO_PRESETS.map((c) => c.id),
];

describe('catalogue shape', () => {
  it('covers every required category with entries', () => {
    const required = ['fortnite', 'tactical', 'minimal', 'precision', 'classic', 'dot', 'circle', 'custom'];
    expect(PRO_CROSSHAIR_CATEGORIES.map((c) => c.id).sort()).toEqual([...required].sort());
    for (const category of required) {
      const count = PRO_CROSSHAIR_ENTRIES.filter((e) => e.meta.category === category).length;
      expect(count, `category ${category} is empty`).toBeGreaterThan(0);
    }
  });

  it('ships 40 designs and keeps entries and configs in lockstep', () => {
    expect(PRO_CROSSHAIRS.length).toBe(40);
    expect(PRO_CROSSHAIR_ENTRIES.length).toBe(PRO_CROSSHAIRS.length);
    expect(PRO_CROSSHAIR_ENTRIES.map((e) => e.config.id)).toEqual(PRO_CROSSHAIRS.map((c) => c.id));
    for (const entry of PRO_CROSSHAIR_ENTRIES) {
      expect(PRO_CROSSHAIR_META[entry.config.id]).toBe(entry.meta);
      expect(entry.meta.id).toBe(entry.config.id);
    }
  });

  it('uses unique ids that collide with nothing already in the library', () => {
    const ids = PRO_CROSSHAIRS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(ALL_IDS, `${id} collides with an existing preset`).not.toContain(id);
      expect(id.startsWith('pc-')).toBe(true);
    }
  });
});

describe('schema validity', () => {
  it('every design normalises with zero repairs', () => {
    for (const config of PRO_CROSSHAIRS) {
      const { repairs } = normalizeCrosshairConfig(config, config.id);
      expect(repairs, `${config.id}: ${repairs.join(' | ')}`).toEqual([]);
    }
  });

  it('keeps names and descriptions inside the schema limits', () => {
    for (const entry of PRO_CROSSHAIR_ENTRIES) {
      expect(entry.config.name.length).toBeLessThanOrEqual(LIMITS.nameLength.max);
      expect(entry.meta.description.length).toBeGreaterThan(0);
      expect(entry.meta.description.length).toBeLessThanOrEqual(LIMITS.descriptionLength.max);
    }
  });

  it('reports its facts straight from the config', () => {
    const breach = PRO_CROSSHAIRS.find((c) => c.id === 'pc-tac-breach');
    expect(breach).toBeDefined();
    const facts = specFacts(breach!);
    expect(facts).toHaveLength(6);
    expect(facts[0]).toMatch(/^Colour #/);
    expect(facts.join(' ')).toContain('Outline 1.5px');
    expect(facts.join(' ')).toContain('Dot off');
  });
});

describe('honesty rules', () => {
  // The research (docs/research/pro-crosshairs.md, checked 2026-11-07) found
  // aggregators contradicting each other for every famous player, so no
  // player-named presets ship. These tests keep it that way.
  const PLAYER_NAMES = [
    's1mple', 'simple', 'zywoo', 'donk', 'niko', 'm0nesy', 'monesy', 'tenz',
    'shroud', 'tfue', 'bugha', 'electronic', 'device', 'kennys', 'aceu', 'clix',
    'mongraal', 'benjyfishy', 'mr_savage', 'ayahko',
  ];

  it('ships no verified-tier entries without first-party sourcing', () => {
    const verified = PRO_CROSSHAIR_ENTRIES.filter((e) => e.meta.tier === 'verified');
    for (const entry of verified) {
      expect(entry.meta.sourceNote, `${entry.config.id}: verified needs a source`).toBeTruthy();
      expect(entry.meta.checkedOn, `${entry.config.id}: verified needs a checked date`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('uses no professional player names anywhere in the catalogue', () => {
    const haystack = JSON.stringify({
      configs: PRO_CROSSHAIRS.map((c) => ({ id: c.id, name: c.name })),
      meta: PRO_CROSSHAIR_META,
      categories: PRO_CROSSHAIR_CATEGORIES,
      tiers: TIER_LABELS,
      note: VERIFIED_TIER_NOTE,
    }).toLowerCase();
    for (const name of PLAYER_NAMES) {
      // Word boundaries: "s1mple"/"simple" must not match inside ordinary
      // words like "simplest".
      const leaked = new RegExp(`\\b${name}\\b`).test(haystack);
      expect(leaked, `player name "${name}" leaked into the catalogue`).toBe(false);
    }
  });

  it('labels every entry with a known tier', () => {
    for (const entry of PRO_CROSSHAIR_ENTRIES) {
      expect(['verified', 'inspired', 'original']).toContain(entry.meta.tier);
      expect(TIER_LABELS[entry.meta.tier]).toBeTruthy();
    }
    // The Custom category is the originals; everything else is inspired until
    // a verified entry can meet the sourcing bar.
    for (const entry of PRO_CROSSHAIR_ENTRIES) {
      if (entry.meta.category === 'custom') expect(entry.meta.tier).toBe('original');
    }
  });

  it('explains the empty verified tier honestly', () => {
    expect(VERIFIED_TIER_NOTE.toLowerCase()).toContain('verified');
    expect(VERIFIED_TIER_NOTE.toLowerCase()).toContain('deliberate');
  });
});

describe('integration with the existing preset system', () => {
  it('joins the single preset index and resolves by id', () => {
    const index = getPresetIndex();
    for (const config of PRO_CROSSHAIRS) {
      expect(index[config.id]).toBeDefined();
      expect(index[config.id].name).toBe(config.name);
    }
  });

  it('appears as its own group in the slot picker', () => {
    const list = listSelectablePresets(getPresetIndex());
    const proGroup = list.filter((l) => l.group === 'Pro Crosshairs');
    expect(proGroup.length).toBe(PRO_CROSSHAIRS.length);
    expect(proGroup.every((l) => l.id.startsWith('pc-'))).toBe(true);
    // Existing groups are untouched.
    expect(list.some((l) => l.group === 'Pro Roster')).toBe(true);
  });
});
