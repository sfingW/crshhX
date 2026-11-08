import { describe, expect, it } from 'vitest';
import {
  buildPresetIndex,
  cloneForApply,
  findMissingAssignments,
  listSelectablePresets,
  projectIndex,
  pruneMissingAssignments,
  referencedPresetIds,
  resolvePreset,
} from '../src/lib/weaponSlots/presetIndex';
import { getPresetIndex } from '../src/lib/presetLibrary';
import { COMPLETE_CROSSHAIR_VAULT } from '../src/lib/crosshairCollection';
import { PRO_PRESETS } from '../src/lib/defaultPresets';
import {
  createCs2Profile,
  createDefaultProfile,
  createFortniteProfile,
} from '../src/lib/weaponSlots/defaults';
import { decideSwitch } from '../src/lib/weaponSlots/switchPolicy';
import { makeBinding } from '../src/lib/weaponSlots/keys';
import {
  PASSIVE_CAPABILITIES,
  down,
  env,
  fakePreset,
  makeIndex,
  profile,
  slot,
  state,
} from './helpers';
import type { CrosshairConfig } from '../src/types/crosshair';

/**
 * Preset resolution — the guarantee that a slot always points at a real,
 * stable library entry, and that a deleted entry becomes visibly unassigned
 * rather than silently turning into some other reticle.
 */

describe('preset index: one library, no duplicates', () => {
  it('indexes the generated vault, the built-in pro presets and custom saves', () => {
    const customs = [fakePreset('custom-a', 'Custom A')];
    const index = getPresetIndex(customs);

    expect(index[COMPLETE_CROSSHAIR_VAULT[0].id]).toBeDefined();
    expect(index[PRO_PRESETS[0].id]).toBeDefined();
    expect(index['custom-a']).toBeDefined();
    expect(Object.keys(index).length).toBeGreaterThanOrEqual(
      COMPLETE_CROSSHAIR_VAULT.length + PRO_PRESETS.length + 1,
    );
  });

  it('is keyed by stable id, never by display name', () => {
    const index = getPresetIndex();
    for (const [id, preset] of Object.entries(index)) {
      expect(preset.id).toBe(id);
    }
  });

  it('lets a later source shadow an earlier id instead of crashing', () => {
    const index = buildPresetIndex([
      [fakePreset('dup', 'Built-in')],
      [fakePreset('dup', 'Custom override')],
    ]);
    expect(index['dup'].name).toBe('Custom override');
  });

  it('ignores malformed preset sources', () => {
    const junk = [null, undefined, {}, 'nope', 42] as unknown as CrosshairConfig[][];
    expect(() => buildPresetIndex(junk)).not.toThrow();
    expect(Object.keys(buildPresetIndex(junk))).toHaveLength(0);
  });

  it('ignores malformed entries inside an otherwise valid source', () => {
    const mixed = [
      [null, undefined, {}, { id: '' }, { id: 42 }, fakePreset('valid', 'Valid')] as unknown as CrosshairConfig[],
    ];
    const index = buildPresetIndex(mixed);
    expect(Object.keys(index)).toEqual(['valid']);
  });

  it('survives one corrupt source alongside good ones', () => {
    const index = buildPresetIndex([
      null as unknown as CrosshairConfig[],
      [fakePreset('good-1', 'Good One')],
    ]);
    expect(Object.keys(index)).toEqual(['good-1']);
  });
});

describe('preset resolution', () => {
  const index = makeIndex(fakePreset('p1', 'One'), fakePreset('p2', 'Two'));

  it('resolves an existing preset', () => {
    const result = resolvePreset(index, 'p1');
    expect(result.status).toBe('ok');
    if (result.status === 'ok') expect(result.config.name).toBe('One');
  });

  it('reports a null reference as unassigned', () => {
    expect(resolvePreset(index, null).status).toBe('unassigned');
    expect(resolvePreset(index, undefined).status).toBe('unassigned');
    expect(resolvePreset(index, '').status).toBe('unassigned');
  });

  it('reports a deleted preset as missing, echoing the id', () => {
    const result = resolvePreset(index, 'gone');
    expect(result.status).toBe('missing');
    if (result.status === 'missing') expect(result.presetId).toBe('gone');
  });

  it('returns a copy so the library entry cannot be mutated', () => {
    const result = resolvePreset(index, 'p1');
    if (result.status !== 'ok') throw new Error('expected ok');
    const copy = cloneForApply(result.config);
    copy.name = 'CORRUPTED';
    copy.gap = 1234;
    expect(index['p1'].name).toBe('One');
    expect(index['p1'].gap).not.toBe(1234);
  });
});

describe('preset references: missing assignments', () => {
  const st = state({
    profiles: [
      profile({
        id: 'a',
        name: 'Profile A',
        slots: [
          slot({ index: 1, name: 'Good', presetId: 'p1' }),
          slot({ index: 2, name: 'Gone', presetId: 'deleted-preset' }),
          slot({ index: 3, name: 'Empty', presetId: null }),
        ],
      }),
    ],
  });
  const index = makeIndex(fakePreset('p1'));

  it('finds only the dangling reference, not the unassigned slot', () => {
    const missing = findMissingAssignments(st, index);
    expect(missing).toHaveLength(1);
    expect(missing[0].slotName).toBe('Gone');
    expect(missing[0].presetId).toBe('deleted-preset');
    expect(missing[0].profileName).toBe('Profile A');
  });

  it('clears the dangling reference and keeps everything else', () => {
    const { state: repaired } = pruneMissingAssignments(st, index);
    const slots = repaired.profiles[0].slots;
    expect(slots[0].presetId).toBe('p1');
    expect(slots[1].presetId).toBeNull();
    expect(slots[2].presetId).toBeNull();
    expect(slots.map((s) => s.name)).toEqual(['Good', 'Gone', 'Empty']);
    expect(slots[1].id).toBe(st.profiles[0].slots[1].id);
  });

  it('returns the same state object when nothing is dangling', () => {
    const clean = state({
      profiles: [profile({ slots: [slot({ index: 1, presetId: 'p1' })] })],
    });
    const { state: result, pruned } = pruneMissingAssignments(clean, index);
    expect(pruned).toHaveLength(0);
    expect(result).toBe(clean);
  });
});

describe('preset references: runtime projection', () => {
  it('collects only the ids actually referenced', () => {
    const st = state({
      profiles: [
        profile({
          slots: [
            slot({ index: 1, presetId: 'p1' }),
            slot({ index: 2, presetId: 'p2' }),
            slot({ index: 3, presetId: null }),
            slot({ index: 4, presetId: 'p1' }),
          ],
        }),
      ],
    });
    expect(referencedPresetIds(st).sort()).toEqual(['p1', 'p2']);
  });

  it('keeps the IPC payload small by dropping unreferenced presets', () => {
    const index = getPresetIndex();
    const st = state({
      profiles: [profile({ slots: [slot({ index: 1, presetId: 'pro-11' })] })],
    });
    const projected = projectIndex(index, st);
    expect(Object.keys(projected)).toEqual(['pro-11']);
    expect(Object.keys(index).length).toBeGreaterThan(250);
  });
});

describe('preset picker: reuses the existing library', () => {
  it('groups presets for the selector without inventing new ones', () => {
    const index = getPresetIndex([fakePreset('custom-x', 'My Save')]);
    const list = listSelectablePresets(index);
    expect(list).toHaveLength(Object.keys(index).length);

    const groups = new Set(list.map((l) => l.group));
    expect(groups.has('Saved (Custom)')).toBe(true);
    expect(groups.has('Pro Roster')).toBe(true);
    expect(list.find((l) => l.id === 'custom-x')?.group).toBe('Saved (Custom)');
    expect(list.find((l) => l.id === 'pro-11')?.group).toBe('Pro Roster');
  });

  it('never lists a preset that is not in the index', () => {
    const index = makeIndex(fakePreset('only-one', 'Only One'));
    expect(listSelectablePresets(index).map((l) => l.id)).toEqual(['only-one']);
  });
});

describe('shipped defaults reference presets that really exist', () => {
  const index = getPresetIndex();

  it('every default slot resolves in the live library', () => {
    const slots = createDefaultProfile().slots;
    expect(slots).toHaveLength(5);
    for (const s of slots) {
      expect(s.presetId, `slot "${s.name}" has no preset`).toBeTruthy();
      const resolved = resolvePreset(index, s.presetId);
      expect(resolved.status, `slot "${s.name}" -> ${s.presetId}`).toBe('ok');
    }
  });

  it('the default slot archetypes map to sensible reticles', () => {
    const slots = createDefaultProfile().slots;
    const names = slots.map((s) => resolvePreset(index, s.presetId));
    const resolvedNames = names.map((n) => (n.status === 'ok' ? n.config.name : ''));
    expect(resolvedNames[0]).toMatch(/shotgun/i);
    expect(resolvedNames[3]).toMatch(/sniper/i);
  });

  it('every Fortnite template slot resolves', () => {
    for (const s of createFortniteProfile().slots) {
      expect(resolvePreset(index, s.presetId).status, `fortnite slot ${s.name}`).toBe('ok');
    }
  });

  it('every CS2 template slot resolves', () => {
    for (const s of createCs2Profile().slots) {
      expect(resolvePreset(index, s.presetId).status, `cs2 slot ${s.name}`).toBe('ok');
    }
  });

  it('the default profile validates with no missing references', () => {
    const { pruned } = pruneMissingAssignments(
      state({ profiles: [createDefaultProfile()] }),
      index,
    );
    expect(pruned).toHaveLength(0);
  });
});

describe('switching never creates or alters presets', () => {
  it('leaves the library index unchanged after a full sweep of slots', () => {
    const presets = [1, 2, 3, 4, 5].map((n) => fakePreset(`p${n}`, `Preset ${n}`, { gap: n }));
    const index = makeIndex(...presets);
    const before = JSON.stringify(index);

    const st = state({
      enabled: true,
      profiles: [
        profile({
          slots: presets.map((p, i) =>
            slot({ index: i + 1, binding: makeBinding(`Digit${i + 1}`), presetId: p.id })),
        }),
      ],
    });

    for (let n = 1; n <= 5; n += 1) {
      const decision = decideSwitch({
        event: down(`Digit${n}`),
        state: st,
        presetIndex: index,
        environment: env(),
        capabilities: PASSIVE_CAPABILITIES,
      });
      expect(decision.kind).toBe('apply');
      if (decision.kind === 'apply') {
        // The renderer/overlay is free to mutate what it received.
        decision.config.gap = -999;
        decision.config.name = 'WRECKED';
      }
    }

    expect(JSON.stringify(index)).toBe(before);
    expect(Object.keys(index)).toHaveLength(5);
  });

  it('returns a distinct object each time so overlay state cannot leak back', () => {
    const index = makeIndex(fakePreset('p1', 'One', { gap: 3 }));
    const st = state({
      enabled: true,
      profiles: [profile({ slots: [slot({ index: 1, binding: makeBinding('Digit1'), presetId: 'p1' })] })],
    });

    const first = decideSwitch({
      event: down('Digit1'), state: st, presetIndex: index,
      environment: env(), capabilities: PASSIVE_CAPABILITIES,
    });
    const second = decideSwitch({
      event: down('Digit1'), state: st, presetIndex: index,
      environment: env(), capabilities: PASSIVE_CAPABILITIES,
    });
    if (first.kind !== 'apply' || second.kind !== 'apply') throw new Error('expected apply');
    expect(first.config).not.toBe(second.config);
    expect(first.config).not.toBe(index['p1']);
    expect(first.config).toEqual(index['p1']);
  });
});
