import { beforeEach, describe, expect, it } from 'vitest';
import {
  MAX_DESCRIPTION,
  MAX_FOLDER_NAME,
  MAX_FOLDERS,
  PRESET_LIBRARY_SCHEMA_VERSION,
  createFolder,
  decorate,
  deleteFolder,
  emptyLibrary,
  entryFor,
  folderCounts,
  markModified,
  markUsed,
  movePreset,
  newFolderId,
  normalizeLibrary,
  pruneOrphans,
  renameFolder,
  searchViews,
  setDescription,
  setFavourite,
  setSort,
  sortViews,
  toggleFavourite,
  viewsInFolder,
  type PresetLibraryState,
  type PresetView,
} from '../src/lib/presetOrganizer';
import { loadPresetLibrary, savePresetLibrary } from '../src/lib/storage';
import { fakePreset } from './helpers';

/**
 * Preset organisation.
 *
 * The property that matters most is that organisation is *about* presets and
 * never owns them: deleting a folder must not delete a crosshair, a corrupt
 * library must not take the app down, and a preset with no entry at all must
 * still be listed. Built-in presets cannot be mutated, which is the whole reason
 * this is a sidecar keyed by id.
 */

const T0 = 1_700_000_000_000;

function libraryWith(...folderNames: string[]): PresetLibraryState {
  let state = emptyLibrary();
  for (const name of folderNames) {
    state = createFolder(state, name, { now: T0 }).state;
  }
  return state;
}

function views(state: PresetLibraryState, ids: string[] = ['a', 'b', 'c']): PresetView[] {
  return decorate(ids.map((id) => fakePreset(id, `Preset ${id.toUpperCase()}`)), state, T0);
}

beforeEach(() => {
  localStorage.clear();
});

describe('emptyLibrary and ids', () => {
  it('starts versioned, empty and sorted by name', () => {
    expect(emptyLibrary()).toEqual({
      version: PRESET_LIBRARY_SCHEMA_VERSION,
      folders: [],
      entries: {},
      sort: 'name',
    });
  });

  it('generates distinct folder ids', () => {
    const ids = new Set(Array.from({ length: 500 }, () => newFolderId(T0)));
    expect(ids.size).toBe(500);
  });

  it('returns a fresh object every time so callers cannot share state', () => {
    expect(emptyLibrary()).not.toBe(emptyLibrary());
  });
});

describe('normalizeLibrary never throws and never loses the whole store', () => {
  it('treats a missing value as a fresh library with no repairs', () => {
    expect(normalizeLibrary(null).state).toEqual(emptyLibrary());
    expect(normalizeLibrary(undefined).repairs).toEqual([]);
  });

  it('recovers from a value that is not an object', () => {
    for (const bad of [42, 'nope', [1, 2], true]) {
      const { state, repairs } = normalizeLibrary(bad);
      expect(state).toEqual(emptyLibrary());
      expect(repairs).toHaveLength(1);
      expect(repairs[0]).toMatch(/not an object/i);
    }
  });

  it('flags a library written by a newer crshhx instead of refusing it', () => {
    const { state, repairs } = normalizeLibrary({
      version: PRESET_LIBRARY_SCHEMA_VERSION + 1,
      folders: [{ id: 'f1', name: 'Kept', createdAt: T0 }],
      entries: {},
    });
    expect(state.folders).toHaveLength(1);
    expect(repairs[0]).toMatch(/newer version of crshhx/);
  });

  it('accepts a library from the current version with no repairs', () => {
    const source = libraryWith('Rifles', 'Pistols');
    const { state, repairs } = normalizeLibrary(JSON.parse(JSON.stringify(source)));
    expect(repairs).toEqual([]);
    expect(state.folders.map((f) => f.name)).toEqual(['Rifles', 'Pistols']);
  });

  it('ignores a folders value that is not a list', () => {
    const { state, repairs } = normalizeLibrary({ folders: { nope: true } });
    expect(state.folders).toEqual([]);
    expect(repairs[0]).toMatch(/not a list/i);
  });

  it('drops a folder with no id but keeps the others', () => {
    const { state, repairs } = normalizeLibrary({
      folders: [{ name: 'No id' }, { id: 'f2', name: 'Kept' }],
    });
    expect(state.folders.map((f) => f.name)).toEqual(['Kept']);
    expect(repairs[0]).toMatch(/no id/i);
  });

  it('drops a duplicate folder id rather than keeping two', () => {
    const { state, repairs } = normalizeLibrary({
      folders: [
        { id: 'f1', name: 'First' },
        { id: 'f1', name: 'Second' },
      ],
    });
    expect(state.folders).toHaveLength(1);
    expect(repairs[0]).toMatch(/duplicate folder id/i);
  });

  it('renames a second folder that shares a name, case-insensitively', () => {
    const { state, repairs } = normalizeLibrary({
      folders: [
        { id: 'f1', name: 'Rifles' },
        { id: 'f2', name: 'rifles' },
      ],
    });
    expect(state.folders.map((f) => f.name)).toEqual(['Rifles', 'Rifles (2)']);
    expect(repairs[0]).toMatch(/both called/i);
  });

  it('names an anonymous folder instead of discarding it', () => {
    const { state, repairs } = normalizeLibrary({ folders: [{ id: 'f1', name: '   ' }] });
    expect(state.folders[0].name).toBe('Unnamed folder');
    expect(repairs[0]).toMatch(/no name/i);
  });

  it('truncates an over-long folder name', () => {
    const { state } = normalizeLibrary({ folders: [{ id: 'f1', name: 'x'.repeat(200) }] });
    expect(state.folders[0].name).toHaveLength(MAX_FOLDER_NAME);
  });

  it('caps the number of folders and says so', () => {
    const folders = Array.from({ length: MAX_FOLDERS + 10 }, (_, i) => ({
      id: `f${i}`,
      name: `Folder ${i}`,
    }));
    const { state, repairs } = normalizeLibrary({ folders });
    expect(state.folders).toHaveLength(MAX_FOLDERS);
    expect(repairs.some((r) => /Kept the first/.test(r))).toBe(true);
  });

  it('moves an entry out of a folder that does not exist', () => {
    const { state, repairs } = normalizeLibrary({
      folders: [{ id: 'f1', name: 'Real' }],
      entries: {
        'preset-a': { folderId: 'f1', favourite: true },
        'preset-b': { folderId: 'ghost', favourite: false },
      },
    });
    expect(state.entries['preset-a'].folderId).toBe('f1');
    expect(state.entries['preset-b'].folderId).toBeNull();
    expect(repairs[0]).toMatch(/folder that does not exist/);
  });

  it('drops a non-object entry but keeps its neighbours', () => {
    const { state, repairs } = normalizeLibrary({
      entries: { 'preset-a': 'junk', 'preset-b': { favourite: true } },
    });
    expect(Object.keys(state.entries)).toEqual(['preset-b']);
    expect(repairs[0]).toMatch(/not an object/i);
  });

  it('coerces entry fields rather than trusting them', () => {
    const { state } = normalizeLibrary({
      entries: {
        'p': {
          favourite: 'yes',
          description: 42,
          createdAt: 'not a number',
          modifiedAt: -5,
          lastUsedAt: 'yesterday',
          folderId: 7,
        },
      },
    });
    const entry = state.entries['p'];
    expect(entry.favourite).toBe(false); // only a real true counts
    expect(entry.description).toBe('');
    expect(entry.createdAt).toBeGreaterThan(0);
    expect(entry.modifiedAt).toBeGreaterThan(0);
    expect(entry.lastUsedAt).toBeNull();
    expect(entry.folderId).toBeNull();
  });

  it('truncates a long description', () => {
    const { state } = normalizeLibrary({
      entries: { p: { description: 'd'.repeat(MAX_DESCRIPTION + 100) } },
    });
    expect(state.entries.p.description).toHaveLength(MAX_DESCRIPTION);
  });

  it('keeps a real lastUsedAt timestamp', () => {
    const { state } = normalizeLibrary({ entries: { p: { lastUsedAt: T0 } } });
    expect(state.entries.p.lastUsedAt).toBe(T0);
  });

  it('falls back to name for an unknown sort order', () => {
    const { state, repairs } = normalizeLibrary({ sort: 'sideways' });
    expect(state.sort).toBe('name');
    expect(repairs[0]).toMatch(/Unknown sort order/);
  });

  it('accepts every sort order it offers', () => {
    for (const sort of ['name', 'created', 'modified', 'recent']) {
      expect(normalizeLibrary({ sort }).state.sort).toBe(sort);
    }
  });

  it('is idempotent', () => {
    const once = normalizeLibrary({
      folders: [{ id: 'f1', name: 'Rifles' }],
      entries: { p: { folderId: 'f1', favourite: true, createdAt: T0 } },
      sort: 'modified',
    }).state;
    const twice = normalizeLibrary(JSON.parse(JSON.stringify(once))).state;
    expect(twice).toEqual(once);
  });
});

describe('folders', () => {
  it('creates a folder with a trimmed name', () => {
    const result = createFolder(emptyLibrary(), '  Rifles  ', { now: T0 });
    expect(result.ok).toBe(true);
    expect(result.state.folders).toEqual([{ id: result.folderId, name: 'Rifles', createdAt: T0 }]);
  });

  it('refuses an empty name with a message a user can act on', () => {
    const result = createFolder(emptyLibrary(), '   ');
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/name/i);
    expect(result.state.folders).toEqual([]);
  });

  it('refuses a duplicate name, ignoring case, and leaves the state alone', () => {
    const state = libraryWith('Rifles');
    const result = createFolder(state, 'rifles');
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/already exists/);
    expect(result.state).toBe(state);
  });

  it('refuses past the folder limit', () => {
    let state = emptyLibrary();
    for (let i = 0; i < MAX_FOLDERS; i++) state = createFolder(state, `F${i}`, { now: T0 }).state;
    const result = createFolder(state, 'One too many');
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/limit of 64/);
  });

  it('renames a folder and keeps its contents', () => {
    const state = libraryWith('Rifles');
    const folderId = state.folders[0].id;
    const withPreset = movePreset(state, 'preset-a', folderId).state;

    const result = renameFolder(withPreset, folderId, 'Assault Rifles');
    expect(result.ok).toBe(true);
    expect(result.state.folders[0].name).toBe('Assault Rifles');
    expect(result.state.entries['preset-a'].folderId).toBe(folderId);
  });

  it('refuses to rename a folder that is gone', () => {
    const result = renameFolder(emptyLibrary(), 'ghost', 'Anything');
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/no longer exists/);
  });

  it('refuses a rename onto another folder’s name', () => {
    const state = libraryWith('Rifles', 'Pistols');
    const result = renameFolder(state, state.folders[1].id, 'RIFLES');
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/already exists/);
  });

  it('treats a rename to the same name as a no-op', () => {
    const state = libraryWith('Rifles');
    const result = renameFolder(state, state.folders[0].id, 'Rifles');
    expect(result.ok).toBe(true);
    expect(result.state).toBe(state);
  });

  it('deleting a folder moves its crosshairs out instead of deleting them', () => {
    const state = libraryWith('Rifles', 'Pistols');
    const rifles = state.folders[0].id;
    let next = movePreset(state, 'preset-a', rifles).state;
    next = movePreset(next, 'preset-b', rifles).state;
    next = setFavourite(next, 'preset-a', true);

    const result = deleteFolder(next, rifles);
    expect(result.ok).toBe(true);
    expect(result.state.folders.map((f) => f.name)).toEqual(['Pistols']);
    // The organisation survives — only the folder is gone.
    expect(result.state.entries['preset-a']).toMatchObject({ folderId: null, favourite: true });
    expect(result.state.entries['preset-b'].folderId).toBeNull();
  });

  it('refuses to delete a folder that is gone', () => {
    expect(deleteFolder(emptyLibrary(), 'ghost').ok).toBe(false);
  });
});

describe('entries', () => {
  it('a preset with no entry gets sensible defaults without being written down', () => {
    const state = emptyLibrary();
    expect(entryFor(state, 'anything', T0)).toEqual({
      folderId: null,
      favourite: false,
      description: '',
      createdAt: T0,
      modifiedAt: T0,
      lastUsedAt: null,
    });
    expect(state.entries).toEqual({}); // nothing persisted for an untouched preset
  });

  it('moves a preset into a folder and back out', () => {
    const state = libraryWith('Rifles');
    const folderId = state.folders[0].id;

    const inFolder = movePreset(state, 'preset-a', folderId);
    expect(inFolder.ok).toBe(true);
    expect(inFolder.state.entries['preset-a'].folderId).toBe(folderId);

    const out = movePreset(inFolder.state, 'preset-a', null);
    expect(out.state.entries['preset-a'].folderId).toBeNull();
  });

  it('refuses to move a preset into a folder that does not exist', () => {
    const result = movePreset(emptyLibrary(), 'preset-a', 'ghost');
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/no longer exists/);
    expect(result.state.entries).toEqual({});
  });

  it('sets and toggles favourites', () => {
    let state = setFavourite(emptyLibrary(), 'p', true);
    expect(state.entries.p.favourite).toBe(true);
    state = toggleFavourite(state, 'p');
    expect(state.entries.p.favourite).toBe(false);
    state = toggleFavourite(state, 'p');
    expect(state.entries.p.favourite).toBe(true);
  });

  it('setting a favourite does not disturb the rest of the entry', () => {
    const state = libraryWith('Rifles');
    const moved = movePreset(state, 'p', state.folders[0].id).state;
    const withDescription = setDescription(moved, 'p', 'One-tap hold');
    const favourited = setFavourite(withDescription, 'p', true);
    expect(favourited.entries.p).toMatchObject({
      folderId: state.folders[0].id,
      description: 'One-tap hold',
      favourite: true,
    });
  });

  it('truncates a description', () => {
    const state = setDescription(emptyLibrary(), 'p', 'x'.repeat(MAX_DESCRIPTION + 50));
    expect(state.entries.p.description).toHaveLength(MAX_DESCRIPTION);
  });

  it('records modification and use separately', () => {
    let state = emptyLibrary();
    state = markModified(state, 'p', T0 + 1000);
    expect(state.entries.p).toMatchObject({ createdAt: T0 + 1000, modifiedAt: T0 + 1000, lastUsedAt: null });

    state = markUsed(state, 'p', T0 + 5000);
    expect(state.entries.p.modifiedAt).toBe(T0 + 1000); // using is not editing
    expect(state.entries.p.lastUsedAt).toBe(T0 + 5000);
  });

  it('preserves createdAt when a preset is edited', () => {
    let state = markModified(emptyLibrary(), 'p', T0);
    state = markModified(state, 'p', T0 + 9999);
    expect(state.entries.p.createdAt).toBe(T0);
    expect(state.entries.p.modifiedAt).toBe(T0 + 9999);
  });

  it('sets a valid sort order and ignores an invalid one', () => {
    expect(setSort(emptyLibrary(), 'recent').sort).toBe('recent');
    expect(setSort(emptyLibrary(), 'bogus' as never).sort).toBe('name');
  });

  it('prunes entries whose preset is gone and reports what it removed', () => {
    let state = setFavourite(emptyLibrary(), 'alive', true);
    state = setFavourite(state, 'dead', true);
    const { state: pruned, removed } = pruneOrphans(state, ['alive', 'other']);
    expect(removed).toEqual(['dead']);
    expect(Object.keys(pruned.entries)).toEqual(['alive']);
  });

  it('pruning returns the same state object when there was nothing to remove', () => {
    const state = setFavourite(emptyLibrary(), 'alive', true);
    expect(pruneOrphans(state, ['alive']).state).toBe(state);
  });

  it('never mutates the state it was given', () => {
    const state = libraryWith('Rifles');
    const snapshot = JSON.parse(JSON.stringify(state));
    movePreset(state, 'p', state.folders[0].id);
    setFavourite(state, 'p', true);
    deleteFolder(state, state.folders[0].id);
    renameFolder(state, state.folders[0].id, 'Other');
    expect(state).toEqual(snapshot);
  });
});

describe('decorate joins presets with their organisation', () => {
  it('lists a preset that has no entry at all', () => {
    const result = decorate([fakePreset('a', 'Alpha')], emptyLibrary(), T0);
    expect(result).toHaveLength(1);
    expect(result[0].preset.name).toBe('Alpha');
    expect(result[0].entry.favourite).toBe(false);
    expect(result[0].folderName).toBeNull();
  });

  it('resolves the folder name', () => {
    const state = libraryWith('Rifles');
    const moved = movePreset(state, 'a', state.folders[0].id).state;
    const result = decorate([fakePreset('a', 'Alpha')], moved, T0);
    expect(result[0].folderName).toBe('Rifles');
  });

  it('reports no folder name when the entry points at a folder that vanished', () => {
    const state: PresetLibraryState = {
      ...emptyLibrary(),
      entries: { a: { ...entryFor(emptyLibrary(), 'a', T0), folderId: 'ghost' } },
    };
    expect(decorate([fakePreset('a', 'Alpha')], state, T0)[0].folderName).toBeNull();
  });
});

describe('searchViews', () => {
  const state = libraryWith('Rifles');
  const prepared = (() => {
    let s = setDescription(state, 'a', 'One-tap hold for Ascent');
    s = movePreset(s, 'a', s.folders[0].id).state;
    s = setFavourite(s, 'b', true);
    return s;
  })();
  const list = views(prepared);

  it('an empty query matches everything', () => {
    expect(searchViews(list, '')).toHaveLength(3);
    expect(searchViews(list, '   ')).toHaveLength(3);
  });

  it('matches part of a name, ignoring case', () => {
    expect(searchViews(list, 'preset b').map((v) => v.preset.id)).toEqual(['b']);
    expect(searchViews(list, 'PRESET B').map((v) => v.preset.id)).toEqual(['b']);
  });

  it('is substring-based across every field it indexes, not whole-word', () => {
    // The fixtures are all Valorant presets, and the game is indexed too.
    expect(searchViews(list, 'valor')).toHaveLength(3);
    expect(searchViews(list, 'cs2')).toHaveLength(0);
    // Pinned deliberately: narrowing search to whole words would make "rif"
    // stop finding "Rifles", which is the more common expectation.
    expect(searchViews(list, 'rif')).toHaveLength(1);
  });

  it('matches the description', () => {
    expect(searchViews(list, 'one-tap').map((v) => v.preset.id)).toEqual(['a']);
    expect(searchViews(list, 'ascent').map((v) => v.preset.id)).toEqual(['a']);
  });

  it('matches the folder name', () => {
    expect(searchViews(list, 'rifles').map((v) => v.preset.id)).toEqual(['a']);
  });

  it('matches "favourite" as a word, so the tab can be searched', () => {
    expect(searchViews(list, 'favourite').map((v) => v.preset.id)).toEqual(['b']);
  });

  it('requires every term, so search narrows rather than widens', () => {
    expect(searchViews(list, 'preset b')).toHaveLength(1);
    expect(searchViews(list, 'preset zzz')).toHaveLength(0);
    expect(searchViews(list, 'preset one-tap').map((v) => v.preset.id)).toEqual(['a']);
    // A term from the description plus a term from the folder name.
    expect(searchViews(list, 'ascent rifles').map((v) => v.preset.id)).toEqual(['a']);
  });

  it('does not mutate the list it was given', () => {
    const before = [...list];
    searchViews(list, 'preset');
    expect(list).toEqual(before);
  });
});

describe('sortViews', () => {
  function build(): PresetView[] {
    let state = emptyLibrary();
    state = {
      ...state,
      entries: {
        slow: { folderId: null, favourite: false, description: '', createdAt: T0, modifiedAt: T0, lastUsedAt: T0 + 1 },
        mid: { folderId: null, favourite: false, description: '', createdAt: T0 + 2, modifiedAt: T0 + 5, lastUsedAt: T0 + 9 },
        fresh: { folderId: null, favourite: false, description: '', createdAt: T0 + 3, modifiedAt: T0 + 4, lastUsedAt: null },
        star: { folderId: null, favourite: true, description: '', createdAt: T0 + 1, modifiedAt: T0 + 1, lastUsedAt: T0 + 2 },
      },
    };
    return decorate(
      [
        fakePreset('slow', 'Zulu'),
        fakePreset('mid', 'Mike'),
        fakePreset('fresh', 'Alpha'),
        fakePreset('star', 'Bravo'),
      ],
      state,
      T0,
    );
  }

  it('sorts by name alphabetically, favourites first', () => {
    // Bravo is the favourited one, so it leads even though it is not first
    // alphabetically.
    expect(sortViews(build(), 'name').map((v) => v.preset.name)).toEqual([
      'Bravo',
      'Alpha',
      'Mike',
      'Zulu',
    ]);
  });

  it('sorts purely by name when nothing is favourited', () => {
    const list = build().map((v) => ({ ...v, entry: { ...v.entry, favourite: false } }));
    expect(sortViews(list, 'name').map((v) => v.preset.name)).toEqual([
      'Alpha',
      'Bravo',
      'Mike',
      'Zulu',
    ]);
  });

  it('puts favourites first regardless of the chosen order', () => {
    for (const sort of ['name', 'created', 'modified', 'recent'] as const) {
      expect(sortViews(build(), sort)[0].preset.id).toBe('star');
    }
  });

  it('sorts by newest created first', () => {
    expect(sortViews(build(), 'created').map((v) => v.preset.id)).toEqual([
      'star',
      'fresh',
      'mid',
      'slow',
    ]);
  });

  it('sorts by newest modified first', () => {
    expect(sortViews(build(), 'modified').map((v) => v.preset.id)).toEqual([
      'star',
      'mid',
      'fresh',
      'slow',
    ]);
  });

  it('sorts by recently used, with never-used last rather than oldest', () => {
    expect(sortViews(build(), 'recent').map((v) => v.preset.id)).toEqual([
      'star',
      'mid',
      'slow',
      'fresh',
    ]);
  });

  it('breaks ties by name so the order is stable between renders', () => {
    const tied = decorate(
      [fakePreset('b', 'Beta'), fakePreset('a', 'Apple')],
      {
        ...emptyLibrary(),
        entries: {
          a: { folderId: null, favourite: false, description: '', createdAt: T0, modifiedAt: T0, lastUsedAt: T0 },
          b: { folderId: null, favourite: false, description: '', createdAt: T0, modifiedAt: T0, lastUsedAt: T0 },
        },
      },
      T0,
    );
    expect(sortViews(tied, 'recent').map((v) => v.preset.id)).toEqual(['a', 'b']);
  });

  it('orders numeric names the way a person would read them', () => {
    const numbered = decorate(
      [fakePreset('p10', 'Slot 10'), fakePreset('p2', 'Slot 2'), fakePreset('p1', 'Slot 1')],
      emptyLibrary(),
      T0,
    );
    expect(sortViews(numbered, 'name').map((v) => v.preset.name)).toEqual([
      'Slot 1',
      'Slot 2',
      'Slot 10',
    ]);
  });

  it('does not mutate the list it was given', () => {
    const list = build();
    const before = list.map((v) => v.preset.id);
    sortViews(list, 'name');
    expect(list.map((v) => v.preset.id)).toEqual(before);
  });
});

describe('viewsInFolder and folderCounts', () => {
  it('selects one folder, and null selects the unfoldered ones', () => {
    const state = libraryWith('Rifles', 'Pistols');
    let next = movePreset(state, 'a', state.folders[0].id).state;
    next = movePreset(next, 'b', state.folders[1].id).state;
    const list = views(next);

    expect(viewsInFolder(list, state.folders[0].id).map((v) => v.preset.id)).toEqual(['a']);
    expect(viewsInFolder(list, null).map((v) => v.preset.id)).toEqual(['c']);
  });

  it('counts what is in each folder and leaves empty folders absent', () => {
    const state = libraryWith('Empty');
    const counts = folderCounts(views(state));
    // An empty folder has no entry, so a caller reads it as `?? 0`; the
    // unfoldered group is always present because presets start there.
    expect(counts.get(state.folders[0].id) ?? 0).toBe(0);
    expect(counts.get(null)).toBe(3);
  });
});

describe('persistence round trip', () => {
  it('saves and loads the library unchanged', () => {
    const state = libraryWith('Rifles');
    const withData = setFavourite(movePreset(state, 'p', state.folders[0].id).state, 'p', true);
    savePresetLibrary(withData);
    const { state: loaded, repairs } = loadPresetLibrary();
    expect(repairs).toEqual([]);
    expect(loaded).toEqual(withData);
  });

  it('starts empty when nothing has been saved', () => {
    expect(loadPresetLibrary()).toEqual({ state: emptyLibrary(), repairs: [] });
  });

  it('recovers from a corrupt blob and says the crosshairs are safe', () => {
    localStorage.setItem('crshhx_preset_library', '{not json');
    const { state, repairs } = loadPresetLibrary();
    expect(state).toEqual(emptyLibrary());
    expect(repairs[0]).toMatch(/crosshairs are untouched/i);
  });

  it('normalises a hand-edited or older file rather than trusting it', () => {
    localStorage.setItem(
      'crshhx_preset_library',
      JSON.stringify({
        version: 1,
        folders: [{ id: 'f1', name: 'Rifles' }],
        entries: { p: { folderId: 'ghost', favourite: 'yes' } },
        sort: 'sideways',
      }),
    );
    const { state, repairs } = loadPresetLibrary();
    expect(state.folders).toHaveLength(1);
    expect(state.entries.p.folderId).toBeNull();
    expect(state.entries.p.favourite).toBe(false);
    expect(state.sort).toBe('name');
    expect(repairs.length).toBe(2);
  });

  it('does not disturb the other crshhx keys', () => {
    localStorage.setItem('crshhx_current_config', '{"keep":true}');
    savePresetLibrary(libraryWith('Rifles'));
    expect(localStorage.getItem('crshhx_current_config')).toBe('{"keep":true}');
  });
});
