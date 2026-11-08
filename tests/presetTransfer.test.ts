import { describe, expect, it } from 'vitest';
import {
  APP_VERSION,
  LARGE_IMPORT_THRESHOLD,
  TRANSFER_FORMAT,
  TRANSFER_VERSION,
  allocateId,
  applyImport,
  buildEnvelope,
  exportConfiguration,
  exportPresets,
  parseTransferFile,
  planFromFile,
  planImport,
  serializeEnvelope,
  suggestedFileName,
  type TransferEnvelope,
} from '../src/lib/presetTransfer';
import { CROSSHAIR_SCHEMA_VERSION } from '../src/lib/crosshairSchema';
import { DEFAULT_APP_SETTINGS } from '../src/lib/defaultPresets';
import { createFolder, emptyLibrary, movePreset, setFavourite, setDescription } from '../src/lib/presetOrganizer';
import { WEAPON_SLOTS_SCHEMA_VERSION } from '../src/lib/weaponSlots/defaults';
import { COMPLETE_CROSSHAIR_VAULT } from '../src/lib/crosshairCollection';
import { fakePreset, fiveSlotState, state as makeSlotState } from './helpers';
import type { AppSettings, CrosshairConfig } from '../src/types/crosshair';

/**
 * Import and export.
 *
 * The behaviours that matter are the ones that protect data: a file is refused
 * when crshhx cannot honestly interpret it, nothing is overwritten unless the
 * user asked for that specific entry, every value the schema had to correct is
 * reported, and a full backup puts back exactly what was taken out.
 */

const T0 = 1_700_000_000_000;

const preset = (id: string, name: string, extra: Partial<CrosshairConfig> = {}) =>
  fakePreset(id, name, extra);

function envelopeWith(presets: CrosshairConfig[], overrides: Partial<TransferEnvelope> = {}): TransferEnvelope {
  return {
    format: TRANSFER_FORMAT,
    version: TRANSFER_VERSION,
    kind: 'presets',
    exportedAt: new Date(T0).toISOString(),
    appVersion: APP_VERSION,
    crosshairSchema: CROSSHAIR_SCHEMA_VERSION,
    presets: presets.map((config) => ({ config })),
    ...overrides,
  };
}

/* ------------------------------------------------------------------ *
 * Export
 * ------------------------------------------------------------------ */

describe('export', () => {
  it('writes a self-describing, versioned envelope', () => {
    const envelope = buildEnvelope({ presets: [preset('a', 'Alpha')] }, 'presets', T0);
    expect(envelope).toMatchObject({
      format: TRANSFER_FORMAT,
      version: TRANSFER_VERSION,
      kind: 'presets',
      appVersion: APP_VERSION,
      crosshairSchema: CROSSHAIR_SCHEMA_VERSION,
    });
    expect(envelope.exportedAt).toBe(new Date(T0).toISOString());
    expect(envelope.presets).toHaveLength(1);
  });

  it('serialises to readable, valid JSON', () => {
    const text = exportPresets({ presets: [preset('a', 'Alpha')] }, T0);
    expect(() => JSON.parse(text)).not.toThrow();
    expect(text).toContain('\n  "format"'); // indented, so a user can read it
    expect(JSON.parse(text).format).toBe(TRANSFER_FORMAT);
  });

  // Deliberate reversal of an earlier decision. Repairing on the way out *and*
  // on the way in fixed a broken value twice and told nobody: the exporter's
  // local library still held the bad value while the file silently disagreed
  // with it. The importer is the single validator, and it reports its repairs.
  it('writes values as they are, leaving the importer to repair and report', () => {
    const text = exportPresets({ presets: [preset('a', 'Alpha', { length: 9999 })] }, T0);
    expect(text).toContain('"length": 9999');

    const parsed = parseTransferFile(text);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    // The file carries the user's own value, not a quietly corrected one.
    expect(parsed.envelope.presets[0].config.length).toBe(9999);

    const plan = planImport(parsed.envelope, { presets: [], settings: DEFAULT_APP_SETTINGS });
    expect(plan.entries[0].incoming.length).toBeLessThanOrEqual(50);
    expect(plan.entries[0].repairs).toHaveLength(1);
  });

  it('leaves organisation out for presets the user never touched', () => {
    const text = exportPresets(
      { presets: [preset('a', 'Alpha')], library: emptyLibrary() },
      T0,
    );
    expect(JSON.parse(text).presets[0].meta).toBeUndefined();
  });

  it('carries description, favourite and folder name for organised presets', () => {
    let library = createFolder(emptyLibrary(), 'Rifles', { now: T0 }).state;
    library = setDescription(library, 'a', 'One-tap hold');
    library = setFavourite(library, 'a', true);
    library = movePreset(library, 'a', library.folders[0].id).state;

    const envelope = buildEnvelope({ presets: [preset('a', 'Alpha')], library }, 'presets', T0);
    expect(envelope.presets[0].meta).toMatchObject({
      description: 'One-tap hold',
      favourite: true,
      folder: 'Rifles',
    });
    expect(envelope.folders).toEqual(['Rifles']);
  });

  it('exports folder names, not local ids', () => {
    let library = createFolder(emptyLibrary(), 'Rifles', { now: T0 }).state;
    library = movePreset(library, 'a', library.folders[0].id).state;
    const envelope = buildEnvelope({ presets: [preset('a', 'Alpha')], library }, 'presets', T0);
    const text = serializeEnvelope(envelope);
    expect(text).toContain('Rifles');
    expect(text).not.toContain(library.folders[0].id);
  });

  it('a configuration export includes settings and weapon slots; a preset export does not', () => {
    const source = {
      presets: [preset('a', 'Alpha')],
      settings: DEFAULT_APP_SETTINGS,
      weaponSlots: makeSlotState(),
    };
    const presetsOnly = buildEnvelope(source, 'presets', T0);
    expect(presetsOnly.settings).toBeUndefined();
    expect(presetsOnly.weaponSlots).toBeUndefined();

    const full = buildEnvelope(source, 'configuration', T0);
    expect(full.settings).toEqual(DEFAULT_APP_SETTINGS);
    expect(full.weaponSlots).toBeDefined();
  });

  it('suggests file names with no characters that break on Windows', () => {
    for (const kind of ['presets', 'configuration'] as const) {
      const name = suggestedFileName(kind, T0);
      expect(name).toMatch(/^[A-Za-z0-9._-]+$/);
      expect(name).toMatch(/\.json$/);
      expect(name).toContain('2023-11-14');
    }
    expect(suggestedFileName('configuration', T0)).toContain('backup');
    expect(suggestedFileName('presets', T0)).toContain('crosshairs');
  });

  it('round-trips through text without changing a crosshair', () => {
    const original = preset('custom-1', 'My Anchor', { length: 7, primaryColor: '#ff00aa', rotation: 30 });
    const text = exportPresets({ presets: [original] }, T0);
    const parsed = parseTransferFile(text);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.envelope.presets[0].config).toMatchObject({
      id: 'custom-1',
      name: 'My Anchor',
      length: 7,
      primaryColor: '#ff00aa',
      rotation: 30,
    });
  });
});

/* ------------------------------------------------------------------ *
 * Parse
 * ------------------------------------------------------------------ */

describe('parseTransferFile refuses what it cannot honestly interpret', () => {
  it('rejects text that is not JSON, and says why', () => {
    const result = parseTransferFile('this is not json');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/not valid JSON/);
    expect(result.error).toMatch(/re-export/);
  });

  it('rejects an empty file', () => {
    expect(parseTransferFile('').ok).toBe(false);
  });

  it('rejects JSON that is not an object', () => {
    const result = parseTransferFile('[1,2,3]');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/not a crshhx export object/);
  });

  it('rejects a file with no format marker and reports what it found instead', () => {
    const result = parseTransferFile(JSON.stringify({ version: 1, presets: [] }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/format marker is nothing/);
  });

  it('names a foreign format it does recognise as foreign', () => {
    const result = parseTransferFile(JSON.stringify({ format: 'some-other-app', version: 1 }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/some-other-app/);
  });

  it('rejects a file with no version number', () => {
    const result = parseTransferFile(JSON.stringify({ format: TRANSFER_FORMAT, presets: [] }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/no version number/);
  });

  it('rejects a version that is not a number', () => {
    const result = parseTransferFile(
      JSON.stringify({ format: TRANSFER_FORMAT, version: 'one', presets: [] }),
    );
    expect(result.ok).toBe(false);
  });

  it('refuses a file from a newer crshhx rather than half-applying it', () => {
    const result = parseTransferFile(
      JSON.stringify({ format: TRANSFER_FORMAT, version: TRANSFER_VERSION + 2, presets: [] }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/newer version of crshhx/);
      expect(result.error).toMatch(/Update crshhx/);
    }
  });

  it('accepts an older format version and notes the upgrade', () => {
    const result = parseTransferFile(
      JSON.stringify({
        format: TRANSFER_FORMAT,
        version: TRANSFER_VERSION,
        presets: [{ config: preset('a', 'Alpha') }],
      }),
    );
    expect(result.ok).toBe(true);
  });

  it('notes when the file came from a different app version', () => {
    const result = parseTransferFile(
      serializeEnvelope(envelopeWith([preset('a', 'Alpha')], { appVersion: '0.9.0' })),
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.notes.join(' ')).toMatch(/0\.9\.0/);
  });

  it('warns when the file uses a newer crosshair schema, without refusing it', () => {
    const result = parseTransferFile(
      serializeEnvelope(
        envelopeWith([preset('a', 'Alpha')], { crosshairSchema: CROSSHAIR_SCHEMA_VERSION + 1 }),
      ),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.notes.join(' ')).toMatch(/ignored, not discarded/);
    }
  });

  it('rejects a preset export with no preset list', () => {
    const result = parseTransferFile(JSON.stringify({ format: TRANSFER_FORMAT, version: 1, kind: 'presets' }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/nothing to import/);
  });

  it('accepts a configuration file that carries only settings', () => {
    const result = parseTransferFile(
      JSON.stringify({
        format: TRANSFER_FORMAT,
        version: 1,
        kind: 'configuration',
        settings: { overlayVisible: false },
      }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.envelope.presets).toEqual([]);
      expect(result.notes.join(' ')).toMatch(/no crosshairs, only settings/);
    }
  });

  it('ignores settings and weapon slots in a presets-kind file', () => {
    const text = JSON.stringify({
      format: TRANSFER_FORMAT,
      version: 1,
      kind: 'presets',
      presets: [{ config: preset('a', 'Alpha') }],
      settings: { overlayVisible: false },
      weaponSlots: { enabled: true },
    });
    const result = parseTransferFile(text);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.envelope.settings).toBeUndefined();
      expect(result.envelope.weaponSlots).toBeUndefined();
    }
  });

  it('keeps only string folder names', () => {
    const text = JSON.stringify({
      format: TRANSFER_FORMAT,
      version: 1,
      kind: 'presets',
      presets: [],
      folders: ['Rifles', 7, null, 'Pistols'],
    });
    const result = parseTransferFile(text);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.envelope.folders).toEqual(['Rifles', 'Pistols']);
  });
});

/* ------------------------------------------------------------------ *
 * Planning
 * ------------------------------------------------------------------ */

describe('planImport decides safely', () => {
  it('treats unfamiliar presets as additions', () => {
    const plan = planImport(envelopeWith([preset('new-1', 'Fresh')]), { presets: [] });
    expect(plan.entries).toHaveLength(1);
    expect(plan.entries[0]).toMatchObject({ status: 'new', action: 'add', assignedId: 'new-1' });
    expect(plan.counts).toMatchObject({ total: 1, add: 1, overwrite: 0, skip: 0 });
  });

  it('never overwrites on an id collision — it allocates a new id instead', () => {
    const existing = preset('custom-1', 'Mine', { length: 3 });
    const incoming = preset('custom-1', 'Theirs', { length: 20 });
    const plan = planImport(envelopeWith([incoming]), { presets: [existing] });

    expect(plan.entries[0].status).toBe('id-conflict');
    expect(plan.entries[0].action).toBe('add-with-new-id');
    expect(plan.entries[0].assignedId).toBe('custom-2');
    expect(plan.entries[0].note).toMatch(/Nothing will be overwritten/);
    expect(plan.counts.overwrite).toBe(0);
  });

  it('keeps walking until it finds a free id', () => {
    const existing = [preset('custom-1', 'A'), preset('custom-2', 'B'), preset('custom-3', 'C')];
    const plan = planImport(envelopeWith([preset('custom-1', 'Incoming')]), { presets: existing });
    expect(plan.entries[0].assignedId).toBe('custom-4');
  });

  it('flags a name collision but keeps both, because names are not identity', () => {
    const plan = planImport(envelopeWith([preset('other-id', 'Same Name')]), {
      presets: [preset('local-id', 'Same Name')],
    });
    expect(plan.entries[0].status).toBe('name-conflict');
    expect(plan.entries[0].action).toBe('add');
    expect(plan.entries[0].conflictsWith).toBe('local-id');
    expect(plan.entries[0].note).toMatch(/Both will be kept/);
  });

  it('ignores case when comparing names', () => {
    const plan = planImport(envelopeWith([preset('x', 'same NAME')]), {
      presets: [preset('y', 'Same Name')],
    });
    expect(plan.entries[0].status).toBe('name-conflict');
  });

  it('skips a duplicate id inside the file and keeps the first', () => {
    const plan = planImport(
      envelopeWith([preset('dup', 'First'), preset('dup', 'Second')]),
      { presets: [] },
    );
    expect(plan.entries[0].action).toBe('add');
    expect(plan.entries[1]).toMatchObject({ status: 'duplicate-in-file', action: 'skip' });
    expect(plan.entries[1].note).toMatch(/earlier in this file/);
    expect(plan.counts).toMatchObject({ total: 2, add: 1, skip: 1 });
  });

  it('reports every value the schema had to correct, per crosshair and in total', () => {
    const plan = planImport(
      envelopeWith([preset('a', 'Alpha', { length: 9999, thickness: -4 })]),
      { presets: [] },
    );
    expect(plan.entries[0].repairs.length).toBeGreaterThan(0);
    expect(plan.entries[0].repairs.join(' ')).toMatch(/length/i);
    expect(plan.notes.join(' ')).toMatch(/outside the ranges crshhx supports/);
    expect(plan.entries[0].incoming.length).toBeLessThanOrEqual(50);
    expect(plan.entries[0].incoming.thickness).toBeGreaterThanOrEqual(0);
  });

  it('accepts a bare config with no wrapper, for hand-written files', () => {
    const envelope = envelopeWith([]);
    envelope.presets = [preset('a', 'Alpha') as unknown as never];
    const plan = planImport(envelope, { presets: [] });
    expect(plan.entries).toHaveLength(1);
    expect(plan.entries[0].incoming.name).toBe('Alpha');
  });

  it('warns about an entry that is not an object and carries on', () => {
    const envelope = envelopeWith([preset('a', 'Alpha')]);
    envelope.presets = [42 as unknown as never, ...envelope.presets];
    const plan = planImport(envelope, { presets: [] });
    expect(plan.entries).toHaveLength(1);
    expect(plan.warnings.join(' ')).toMatch(/not an object/);
  });

  it('warns about an entry that has metadata but no crosshair', () => {
    const envelope = envelopeWith([]);
    envelope.presets = [{ meta: { favourite: true } } as unknown as never];
    const plan = planImport(envelope, { presets: [] });
    expect(plan.entries).toHaveLength(0);
    expect(plan.warnings.join(' ')).toMatch(/no config/);
  });

  it('warns when a presets file contains nothing usable at all', () => {
    const plan = planImport(envelopeWith([]), { presets: [] });
    expect(plan.warnings.join(' ')).toMatch(/no usable crosshairs/);
  });

  it('collects folder names from the envelope and from preset metadata, once each', () => {
    const envelope = envelopeWith([preset('a', 'Alpha')], { folders: ['Rifles', 'Rifles', 'Pistols'] });
    envelope.presets[0].meta = {
      description: '',
      favourite: false,
      folder: 'Snipers',
      createdAt: T0,
      modifiedAt: T0,
      lastUsedAt: null,
    };
    const plan = planImport(envelope, { presets: [] });
    expect(plan.folderNames).toEqual(['Rifles', 'Pistols', 'Snipers']);
  });

  it('lists settings differences instead of applying them', () => {
    const envelope = envelopeWith([], {
      kind: 'configuration',
      settings: { ...DEFAULT_APP_SETTINGS, overlayVisible: false, selectedMonitor: 2 },
    });
    const plan = planImport(envelope, { presets: [], settings: DEFAULT_APP_SETTINGS });
    expect(plan.settings.map((s) => s.key)).toEqual(['overlayVisible', 'selectedMonitor']);
    expect(plan.settings[0]).toMatchObject({ current: 'on', incoming: 'off' });
    expect(plan.settings[1]).toMatchObject({ current: '0', incoming: '2' });
  });

  it('says so when the settings already match', () => {
    const envelope = envelopeWith([], { kind: 'configuration', settings: { ...DEFAULT_APP_SETTINGS } });
    const plan = planImport(envelope, { presets: [], settings: DEFAULT_APP_SETTINGS });
    expect(plan.settings).toEqual([]);
    expect(plan.notes.join(' ')).toMatch(/already match/);
  });

  it('ignores settings it does not know about', () => {
    const envelope = envelopeWith([], {
      kind: 'configuration',
      settings: { futureSetting: true } as unknown as Partial<AppSettings>,
    });
    const plan = planImport(envelope, { presets: [], settings: DEFAULT_APP_SETTINGS });
    expect(plan.settings).toEqual([]);
  });

  it('counts the weapon-slot profiles in the file and warns they will replace yours', () => {
    const envelope = envelopeWith([], { kind: 'configuration', weaponSlots: fiveSlotState() });
    const plan = planImport(envelope, { presets: [] });
    expect(plan.weaponSlots.included).toBe(true);
    expect(plan.weaponSlots.profiles).toBeGreaterThan(0);
    expect(plan.weaponSlots.slots).toBeGreaterThan(0);
    expect(plan.notes.join(' ')).toMatch(/replaces your current profiles/);
  });

  it('normalises a corrupt weapon-slot payload instead of importing it raw', () => {
    const envelope = envelopeWith([], {
      kind: 'configuration',
      weaponSlots: { version: WEAPON_SLOTS_SCHEMA_VERSION, profiles: 'not a list' } as unknown as never,
    });
    const plan = planImport(envelope, { presets: [] });
    expect(plan.weaponSlots.included).toBe(true);
    expect(plan.weaponSlots.state).not.toBeNull();
    expect(Array.isArray(plan.weaponSlots.state!.profiles)).toBe(true);
  });

  it('marks a big import so the UI can ask for confirmation', () => {
    const many = Array.from({ length: LARGE_IMPORT_THRESHOLD }, (_, i) => preset(`p${i}`, `P ${i}`));
    expect(planImport(envelopeWith(many), { presets: [] }).isLarge).toBe(true);

    const few = Array.from({ length: LARGE_IMPORT_THRESHOLD - 1 }, (_, i) => preset(`p${i}`, `P ${i}`));
    expect(planImport(envelopeWith(few), { presets: [] }).isLarge).toBe(false);
  });
});

describe('allocateId', () => {
  it('keeps an id that is free', () => {
    expect(allocateId('custom-9', new Set(['a']))).toBe('custom-9');
  });

  it('renumbers a taken id into the app’s own custom-N convention', () => {
    // Trailing digits are treated as the counter, so a colliding import lands
    // next to the others instead of growing ids like custom-9-2-3.
    expect(allocateId('custom-9', new Set(['custom-9']))).toBe('custom-2');
  });

  it('walks past numbers that are already taken', () => {
    expect(allocateId('custom-9', new Set(['custom-9', 'custom-2', 'custom-3']))).toBe('custom-4');
  });

  it('never returns an empty id, even when handed one', () => {
    expect(allocateId('', new Set())).toMatch(/^imported-\d+$/);
  });

  it('finds a gap past the end of a fully occupied range', () => {
    // Every vault id is taken, so an imported copy of one has to land beyond it.
    const taken = new Set(Array.from({ length: 30 }, (_, i) => `pro-${i + 1}`));
    expect(allocateId('pro-11', taken)).toBe('pro-31');
  });

  it('gives up on the walk and falls back to a timestamped id', () => {
    const taken = new Set<string>(['x-1']);
    for (let n = 2; n < 10_000; n++) taken.add(`x-${n}`);
    expect(allocateId('x-1', taken, T0)).toBe(`custom-${T0}`);
  });
});

/* ------------------------------------------------------------------ *
 * Applying
 * ------------------------------------------------------------------ */

describe('applyImport', () => {
  function targets(presets: CrosshairConfig[] = [], settings = DEFAULT_APP_SETTINGS) {
    return { existing: { presets, settings }, library: emptyLibrary(), settings };
  }

  it('adds the presets the plan said to add', () => {
    const plan = planImport(envelopeWith([preset('a', 'Alpha'), preset('b', 'Beta')]), { presets: [] });
    const result = applyImport({ plan, ...targets() });
    expect(result.added).toBe(2);
    expect(result.targets.presets.map((p) => p.id)).toEqual(['a', 'b']);
  });

  it('writes the allocated id for a collision, leaving the original untouched', () => {
    const existing = preset('custom-1', 'Mine', { length: 3 });
    const plan = planImport(envelopeWith([preset('custom-1', 'Theirs', { length: 20 })]), {
      presets: [existing],
    });
    const result = applyImport({ plan, ...targets([existing]) });

    expect(result.targets.presets).toHaveLength(2);
    expect(result.targets.presets[0]).toMatchObject({ id: 'custom-1', name: 'Mine', length: 3 });
    expect(result.targets.presets[1]).toMatchObject({ id: 'custom-2', name: 'Theirs', length: 20 });
    expect(result.overwritten).toBe(0);
  });

  it('overwrites only the entries the user explicitly chose to overwrite', () => {
    const existing = preset('custom-1', 'Mine', { length: 3 });
    const plan = planImport(envelopeWith([preset('custom-1', 'Theirs', { length: 20 })]), {
      presets: [existing],
    });
    plan.entries[0].action = 'overwrite';
    plan.entries[0].assignedId = 'custom-1';

    const result = applyImport({ plan, ...targets([existing]) });
    expect(result.overwritten).toBe(1);
    expect(result.added).toBe(0);
    expect(result.targets.presets).toHaveLength(1);
    expect(result.targets.presets[0]).toMatchObject({ id: 'custom-1', name: 'Theirs', length: 20 });
  });

  it('adds an overwrite target that has since disappeared instead of failing', () => {
    const plan = planImport(envelopeWith([preset('gone', 'Ghost')]), { presets: [] });
    plan.entries[0].action = 'overwrite';
    const result = applyImport({ plan, ...targets() });
    expect(result.added).toBe(1);
    expect(result.notes.join(' ')).toMatch(/added instead of overwritten/);
  });

  it('skips what the plan said to skip', () => {
    const plan = planImport(envelopeWith([preset('dup', 'One'), preset('dup', 'Two')]), {
      presets: [],
    });
    const result = applyImport({ plan, ...targets() });
    expect(result.skipped).toBe(1);
    expect(result.targets.presets).toHaveLength(1);
    expect(result.targets.presets[0].name).toBe('One');
  });

  it('creates the folders the file names', () => {
    const envelope = envelopeWith([preset('a', 'Alpha')], { folders: ['Rifles', 'Pistols'] });
    const plan = planImport(envelope, { presets: [] });
    const result = applyImport({ plan, ...targets() });
    expect(result.targets.library.folders.map((f) => f.name)).toEqual(['Rifles', 'Pistols']);
  });

  it('reuses a folder that already exists instead of making a second one', () => {
    const library = createFolder(emptyLibrary(), 'Rifles', { now: T0 }).state;
    const plan = planImport(envelopeWith([], { folders: ['Rifles'] }), { presets: [] });
    const result = applyImport({ plan, existing: { presets: [] }, library, settings: DEFAULT_APP_SETTINGS });
    expect(result.targets.library.folders).toHaveLength(1);
    expect(result.targets.library.folders[0].id).toBe(library.folders[0].id);
  });

  it('matches an existing folder ignoring case and spacing', () => {
    const library = createFolder(emptyLibrary(), 'Rifles', { now: T0 }).state;
    const plan = planImport(envelopeWith([], { folders: ['  rifles '] }), { presets: [] });
    const result = applyImport({ plan, existing: { presets: [] }, library, settings: DEFAULT_APP_SETTINGS });
    expect(result.targets.library.folders).toHaveLength(1);
  });

  it('files an imported preset into the folder its metadata names', () => {
    const envelope = envelopeWith([preset('a', 'Alpha')], { folders: ['Rifles'] });
    envelope.presets[0].meta = {
      description: 'One-tap hold',
      favourite: true,
      folder: 'Rifles',
      createdAt: T0,
      modifiedAt: T0,
      lastUsedAt: null,
    };
    const plan = planImport(envelope, { presets: [] });
    const result = applyImport({ plan, ...targets() });

    const library = result.targets.library;
    const entry = library.entries['a'];
    expect(entry.favourite).toBe(true);
    expect(entry.description).toBe('One-tap hold');
    expect(library.folders.find((f) => f.id === entry.folderId)?.name).toBe('Rifles');
  });

  it('leaves settings alone unless asked, and says so', () => {
    const envelope = envelopeWith([], {
      kind: 'configuration',
      settings: { ...DEFAULT_APP_SETTINGS, overlayVisible: false },
    });
    const plan = planImport(envelope, { presets: [], settings: DEFAULT_APP_SETTINGS });

    const untouched = applyImport({ plan, ...targets() });
    expect(untouched.targets.settings.overlayVisible).toBe(true);
    expect(untouched.notes.join(' ')).toMatch(/Left your settings alone/);

    const applied = applyImport({ plan, ...targets(), applySettings: true });
    expect(applied.targets.settings.overlayVisible).toBe(false);
    expect(applied.notes.join(' ')).toMatch(/Applied 1 setting change/);
  });

  it('leaves weapon slots alone unless asked', () => {
    const envelope = envelopeWith([], { kind: 'configuration', weaponSlots: fiveSlotState() });
    const plan = planImport(envelope, { presets: [] });

    expect(applyImport({ plan, ...targets() }).targets.weaponSlots).toBeNull();
    const applied = applyImport({ plan, ...targets(), applyWeaponSlots: true });
    expect(applied.targets.weaponSlots).not.toBeNull();
    expect(applied.targets.weaponSlots!.profiles.length).toBeGreaterThan(0);
    expect(applied.notes.join(' ')).toMatch(/Replaced your weapon-slot profiles/);
  });

  it('does not mutate the presets, library or settings it was given', () => {
    const existing = [preset('keep', 'Keep')];
    const library = createFolder(emptyLibrary(), 'Rifles', { now: T0 }).state;
    const settings = { ...DEFAULT_APP_SETTINGS };
    const before = {
      presets: JSON.parse(JSON.stringify(existing)),
      library: JSON.parse(JSON.stringify(library)),
      settings: JSON.parse(JSON.stringify(settings)),
    };

    const plan = planImport(
      envelopeWith([preset('a', 'Alpha')], { folders: ['New'], kind: 'configuration', settings: { overlayVisible: false } }),
      { presets: existing, settings },
    );
    applyImport({ plan, existing: { presets: existing, settings }, library, settings, applySettings: true });

    expect(existing).toEqual(before.presets);
    expect(library).toEqual(before.library);
    expect(settings).toEqual(before.settings);
  });

  it('applying the same plan twice cannot produce two presets with one id', () => {
    const plan = planImport(envelopeWith([preset('a', 'Alpha')]), { presets: [] });
    const first = applyImport({ plan, ...targets() });
    const replanned = planImport(envelopeWith([preset('a', 'Alpha')]), {
      presets: first.targets.presets,
    });
    const second = applyImport({
      plan: replanned,
      existing: { presets: first.targets.presets },
      library: first.targets.library,
      settings: DEFAULT_APP_SETTINGS,
    });
    const ids = second.targets.presets.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

/* ------------------------------------------------------------------ *
 * End to end
 * ------------------------------------------------------------------ */

describe('a full backup round trip', () => {
  it('restores crosshairs, organisation, settings and weapon slots', () => {
    let library = createFolder(emptyLibrary(), 'Rifles', { now: T0 }).state;
    library = setDescription(library, 'custom-1', 'My everyday crosshair');
    library = setFavourite(library, 'custom-1', true);
    library = movePreset(library, 'custom-1', library.folders[0].id).state;

    const presets = [
      preset('custom-1', 'My Anchor', { length: 6, primaryColor: '#00ffcc' }),
      preset('custom-2', 'My Dot', { topology: 'dot', centerDotEnabled: true }),
    ];
    const settings: AppSettings = { ...DEFAULT_APP_SETTINGS, toggleOverlayHotkey: 'F6', selectedMonitor: 1 };
    const slots = fiveSlotState();

    const text = exportConfiguration({ presets, library, settings, weaponSlots: slots }, T0);

    const planned = planFromFile(text, { presets: [], settings: DEFAULT_APP_SETTINGS });
    expect(planned.ok).toBe(true);
    if (!planned.ok) return;
    expect(planned.plan.kind).toBe('configuration');
    expect(planned.plan.counts.add).toBe(2);
    expect(planned.plan.settings.map((s) => s.key)).toEqual(['toggleOverlayHotkey', 'selectedMonitor']);
    expect(planned.plan.weaponSlots.profiles).toBe(slots.profiles.length);

    const result = applyImport({
      plan: planned.plan,
      existing: { presets: [], settings: DEFAULT_APP_SETTINGS },
      library: emptyLibrary(),
      settings: DEFAULT_APP_SETTINGS,
      applySettings: true,
      applyWeaponSlots: true,
      now: T0,
    });

    expect(result.targets.presets.map((p) => p.id)).toEqual(['custom-1', 'custom-2']);
    expect(result.targets.presets[0]).toMatchObject({ length: 6, primaryColor: '#00ffcc' });
    expect(result.targets.presets[1]).toMatchObject({ topology: 'dot' });
    expect(result.targets.settings).toMatchObject({ toggleOverlayHotkey: 'F6', selectedMonitor: 1 });
    expect(result.targets.weaponSlots?.profiles.length).toBe(slots.profiles.length);

    const restoredLibrary = result.targets.library;
    expect(restoredLibrary.folders.map((f) => f.name)).toEqual(['Rifles']);
    expect(restoredLibrary.entries['custom-1']).toMatchObject({
      description: 'My everyday crosshair',
      favourite: true,
    });
    expect(
      restoredLibrary.folders.find((f) => f.id === restoredLibrary.entries['custom-1'].folderId)?.name,
    ).toBe('Rifles');
  });

  it('reports a corrupt file end to end without touching anything', () => {
    const planned = planFromFile('{ truncated', { presets: [preset('a', 'Alpha')] });
    expect(planned.ok).toBe(false);
    if (!planned.ok) expect(planned.error).toMatch(/not valid JSON/);
  });

  it('exports and re-imports every shipped preset without a single repair', () => {
    // The library is the compatibility contract: if exporting and re-importing
    // it changes anything, users would lose their crosshairs to a round trip.
    const text = exportPresets({ presets: COMPLETE_CROSSHAIR_VAULT }, T0);
    const planned = planFromFile(text, { presets: [] });
    expect(planned.ok).toBe(true);
    if (!planned.ok) return;
    expect(planned.plan.counts.total).toBe(COMPLETE_CROSSHAIR_VAULT.length);
    expect(planned.plan.entries.flatMap((e) => e.repairs)).toEqual([]);
  });
});

/* ------------------------------------------------------------------ *
 * Regressions found while wiring the import UI
 * ------------------------------------------------------------------ */

describe('planImport id allocation across a whole file', () => {
  it('never hands one entry an id that a later entry in the same file needs', () => {
    // `custom-1` collides with the local library, so it must be renumbered.
    // Naively walking `custom-2`, `custom-3`… would land on the id the *next*
    // entry in the file is about to claim, and that entry would then be
    // reported as an in-file duplicate and skipped — losing a crosshair the
    // user never chose to lose.
    const envelope = buildEnvelope(
      {
        presets: [
          preset('custom-1', 'First'),
          preset('custom-2', 'Second'),
          preset('custom-3', 'Third'),
        ],
      },
      'presets',
      T0,
    );

    const plan = planImport(envelope, {
      presets: [preset('custom-1', 'Already here')],
      settings: DEFAULT_APP_SETTINGS,
    });

    // All three arrive: `add-with-new-id` is still an add, not a skip.
    expect(plan.counts).toMatchObject({ total: 3, add: 3, overwrite: 0, skip: 0 });
    expect(plan.entries.map((entry) => entry.status)).toEqual(['id-conflict', 'new', 'new']);

    const assigned = plan.entries[0].assignedId!;
    expect(assigned).not.toBe('custom-1');
    // The replacement must not collide with anything local OR anything in the file.
    expect(['custom-2', 'custom-3']).not.toContain(assigned);
    expect(assigned).toBe('custom-4');

    // And every incoming id survives, so nothing is silently dropped.
    const finalIds = plan.entries.map((entry) => entry.assignedId);
    expect(new Set(finalIds).size).toBe(3);
  });

  it('still reports a genuine in-file duplicate as skipped', () => {
    const envelope = buildEnvelope(
      { presets: [preset('custom-1', 'First'), preset('custom-1', 'Second')] },
      'presets',
      T0,
    );
    const plan = planImport(envelope, { presets: [], settings: DEFAULT_APP_SETTINGS });

    expect(plan.entries[1].status).toBe('duplicate-in-file');
    expect(plan.entries[1].action).toBe('skip');
    expect(plan.counts).toMatchObject({ add: 1, skip: 1 });
  });
});

describe('export fidelity', () => {
  it('writes values as the user has them, so the importer can report what it repairs', () => {
    // Repairing on the way out *and* on the way in would fix a broken value
    // twice and tell nobody. The importer is the single validator.
    const text = exportPresets({ presets: [preset('custom-9', 'Broken', { length: 9999 })] }, T0);
    expect(text).toContain('"length": 9999');

    const parsed = parseTransferFile(text);
    expect(parsed.ok).toBe(true);
    const plan = planImport((parsed as { ok: true; envelope: TransferEnvelope }).envelope, {
      presets: [],
      settings: DEFAULT_APP_SETTINGS,
    });

    expect(plan.entries[0].repairs).toHaveLength(1);
    expect(plan.entries[0].repairs[0]).toMatch(/length/);
    expect(plan.notes.join(' ')).toMatch(/outside the ranges crshhx supports/);
  });

  it('exports an ordinary, valid preset unchanged', () => {
    const fine = preset('custom-1', 'Fine', { length: 6 });
    const parsed = parseTransferFile(exportPresets({ presets: [fine] }, T0));
    const plan = planImport((parsed as { ok: true; envelope: TransferEnvelope }).envelope, {
      presets: [],
      settings: DEFAULT_APP_SETTINGS,
    });
    expect(plan.entries[0].repairs).toEqual([]);
    expect(plan.entries[0].incoming.length).toBe(6);
  });
});
