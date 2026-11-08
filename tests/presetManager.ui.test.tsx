// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PresetManagerView } from '../src/components/views/PresetManagerView';
import { ImportPreviewModal } from '../src/components/modals/ImportPreviewModal';
import {
  createFolder,
  emptyLibrary,
  movePreset,
  setFavourite,
  type PresetLibraryState,
} from '../src/lib/presetOrganizer';
import {
  LARGE_IMPORT_THRESHOLD,
  planImport,
  buildEnvelope,
  type ImportPlan,
  type TransferEnvelope,
} from '../src/lib/presetTransfer';
import { DEFAULT_APP_SETTINGS } from '../src/lib/defaultPresets';
import { fakePreset } from './helpers';
import type { CrosshairConfig } from '../src/types/crosshair';

/**
 * Preset manager and import preview.
 *
 * The manager is the only place a user can delete a crosshair, and the import
 * modal is the only gate between a file on disk and their library. Both are
 * tested through what they actually do: which handler fires with which argument,
 * what a confirmation says before a destructive action, and what stays disabled.
 */

const T0 = 1_700_000_000_000;

// The extra parameter must be forwarded: silently dropping it makes a test that
// means to build a broken preset look like it built a valid one.
const builtIn = (id: string, name: string, extra: Partial<CrosshairConfig> = {}) =>
  fakePreset(id, name, { isBuiltIn: true, ...extra });
const mine = (id: string, name: string, extra: Partial<CrosshairConfig> = {}) =>
  fakePreset(id, name, { isBuiltIn: false, ...extra });

afterEach(() => cleanup());

/* ------------------------------------------------------------------ *
 * PresetManagerView
 * ------------------------------------------------------------------ */

function renderManager(options: {
  presets?: CrosshairConfig[];
  editableIds?: string[];
  library?: PresetLibraryState;
  currentConfigId?: string;
  usage?: Record<string, string[]>;
} = {}) {
  const presets = options.presets ?? [
    mine('custom-1', 'My Anchor'),
    builtIn('pro-1', 'Cyan Duelist'),
    builtIn('pro-2', 'Apex Anchor'),
  ];
  const handlers = {
    onLibraryChange: vi.fn(),
    onApply: vi.fn(),
    onEdit: vi.fn(),
    onRename: vi.fn(),
    onDuplicate: vi.fn(),
    onDelete: vi.fn(),
    onExportPresets: vi.fn(),
    onExportConfiguration: vi.fn(),
    onImportFile: vi.fn(),
  };
  const view = render(
    <PresetManagerView
      presets={presets}
      editableIds={new Set(options.editableIds ?? ['custom-1'])}
      library={options.library ?? emptyLibrary()}
      currentConfigId={options.currentConfigId ?? 'custom-1'}
      usage={options.usage}
      {...handlers}
    />,
  );
  return { ...view, ...handlers, presets };
}

const rowOf = (name: string) => screen.getByLabelText(`Preset ${name}`);

describe('PresetManagerView listing', () => {
  it('lists every crosshair it is given, with a count', () => {
    renderManager();
    expect(rowOf('My Anchor')).toBeTruthy();
    expect(rowOf('Cyan Duelist')).toBeTruthy();
    expect(screen.getByText(/Showing/).parentElement!.textContent).toContain('3 of 3');
  });

  it('marks the crosshair that is currently applied', () => {
    renderManager({ currentConfigId: 'custom-1' });
    expect(within(rowOf('My Anchor')).getByText('Active')).toBeTruthy();
    expect(within(rowOf('Cyan Duelist')).queryByText('Active')).toBeNull();
  });

  it('labels presets the user does not own', () => {
    renderManager();
    expect(within(rowOf('Cyan Duelist')).getByText('Built-in')).toBeTruthy();
    expect(within(rowOf('My Anchor')).queryByText('Built-in')).toBeNull();
  });

  it('disables rename and delete for built-ins, and says why', () => {
    renderManager();
    const rename = within(rowOf('Cyan Duelist')).getByLabelText('Rename Cyan Duelist');
    const del = within(rowOf('Cyan Duelist')).getByLabelText('Delete Cyan Duelist');
    expect(rename.hasAttribute('disabled')).toBe(true);
    expect(del.hasAttribute('disabled')).toBe(true);
    expect(del.getAttribute('title')).toMatch(/cannot be deleted/);

    // The user's own preset stays editable.
    expect(within(rowOf('My Anchor')).getByLabelText('Delete My Anchor').hasAttribute('disabled')).toBe(false);
  });

  it('still lets a built-in be duplicated, because that is how you edit one', () => {
    const { onDuplicate } = renderManager();
    const duplicate = within(rowOf('Cyan Duelist')).getByLabelText('Duplicate Cyan Duelist');
    expect(duplicate.hasAttribute('disabled')).toBe(false);
    expect(duplicate.getAttribute('title')).toMatch(/saves an editable copy/);
    fireEvent.click(duplicate);
    expect(onDuplicate).toHaveBeenCalledWith(expect.objectContaining({ id: 'pro-1' }));
  });

  it('reports how many are editable and that nothing leaves the machine', () => {
    renderManager();
    expect(screen.getByText(/1 editable · stored only on this computer/)).toBeTruthy();
  });
});

describe('PresetManagerView actions', () => {
  it('applies, edits, duplicates and exports a single crosshair', () => {
    const handlers = renderManager();
    const row = rowOf('Cyan Duelist');

    fireEvent.click(within(row).getByLabelText('Apply Cyan Duelist'));
    expect(handlers.onApply).toHaveBeenCalledWith(expect.objectContaining({ id: 'pro-1' }));

    fireEvent.click(within(row).getByLabelText('Edit Cyan Duelist in the designer'));
    expect(handlers.onEdit).toHaveBeenCalledWith(expect.objectContaining({ id: 'pro-1' }));

    fireEvent.click(within(row).getByLabelText('Export Cyan Duelist'));
    expect(handlers.onExportPresets).toHaveBeenCalledWith(
      [expect.objectContaining({ id: 'pro-1' })],
      expect.anything(),
    );
  });

  it('renames a preset the user owns, through a dialog', () => {
    const { onRename } = renderManager();
    fireEvent.click(within(rowOf('My Anchor')).getByLabelText('Rename My Anchor'));

    const dialog = screen.getByRole('dialog', { name: 'Rename crosshair' });
    expect(within(dialog).getByLabelText('Name')).toHaveProperty('value', 'My Anchor');
    fireEvent.change(within(dialog).getByLabelText('Name'), { target: { value: 'Renamed' } });
    fireEvent.click(within(dialog).getByText('Rename'));

    expect(onRename).toHaveBeenCalledWith('custom-1', 'Renamed');
  });

  it('cancelling a rename changes nothing', () => {
    const { onRename } = renderManager();
    fireEvent.click(within(rowOf('My Anchor')).getByLabelText('Rename My Anchor'));
    fireEvent.click(within(screen.getByRole('dialog')).getByText('Cancel'));
    expect(onRename).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('refuses to rename to an empty name', () => {
    const { onRename } = renderManager();
    fireEvent.click(within(rowOf('My Anchor')).getByLabelText('Rename My Anchor'));
    const dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Name'), { target: { value: '   ' } });
    fireEvent.click(within(dialog).getByText('Rename'));
    expect(within(dialog).getByText('This cannot be empty.')).toBeTruthy();
    expect(onRename).not.toHaveBeenCalled();
  });

  it('asks before deleting, and deletes only after confirmation', () => {
    const { onDelete } = renderManager();
    fireEvent.click(within(rowOf('My Anchor')).getByLabelText('Delete My Anchor'));
    expect(onDelete).not.toHaveBeenCalled();

    const dialog = screen.getByRole('dialog', { name: 'Delete “My Anchor”?' });
    fireEvent.click(within(dialog).getByText('Delete crosshair'));
    expect(onDelete).toHaveBeenCalledWith('custom-1');
  });

  it('warns which weapon-slot profiles will break if a used preset is deleted', () => {
    renderManager({ usage: { 'custom-1': ['Fortnite', 'CS2'] } });
    expect(within(rowOf('My Anchor')).getByText(/Used by 2 profiles/)).toBeTruthy();

    fireEvent.click(within(rowOf('My Anchor')).getByLabelText('Delete My Anchor'));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(/Fortnite, CS2/)).toBeTruthy();
    expect(within(dialog).getByText(/show as missing/)).toBeTruthy();
  });

  it('toggles a favourite', () => {
    const { onLibraryChange } = renderManager();
    fireEvent.click(within(rowOf('Cyan Duelist')).getByLabelText('Add Cyan Duelist to favourites'));
    expect(onLibraryChange).toHaveBeenCalled();
    expect(onLibraryChange.mock.calls[0][0].entries['pro-1'].favourite).toBe(true);
  });

  it('moves a preset into a folder', () => {
    const library = createFolder(emptyLibrary(), 'Rifles', { now: T0 }).state;
    const { onLibraryChange } = renderManager({ library });
    const select = within(rowOf('My Anchor')).getByLabelText('Move My Anchor to folder');
    expect(select).toHaveProperty('value', '');

    fireEvent.change(select, { target: { value: library.folders[0].id } });
    expect(onLibraryChange).toHaveBeenCalled();
    expect(onLibraryChange.mock.calls[0][0].entries['custom-1'].folderId).toBe(library.folders[0].id);
  });

  it('exports the whole configuration', () => {
    const { onExportConfiguration } = renderManager();
    fireEvent.click(screen.getByText('Full backup'));
    expect(onExportConfiguration).toHaveBeenCalledOnce();
  });

  it('exports exactly what is currently listed', () => {
    const { onExportPresets } = renderManager();
    fireEvent.change(screen.getByLabelText('Search presets'), { target: { value: 'Cyan' } });
    fireEvent.click(screen.getByText('Export list'));
    const [configs] = onExportPresets.mock.calls[0];
    expect(configs).toHaveLength(1);
    expect(configs[0].name).toBe('Cyan Duelist');
  });

  it('opens the file picker for import', () => {
    const { onImportFile } = renderManager();
    fireEvent.click(screen.getByText('Import file'));
    expect(onImportFile).toHaveBeenCalledOnce();
  });
});

describe('PresetManagerView folders', () => {
  it('shows the three built-in scopes with live counts', () => {
    let library = createFolder(emptyLibrary(), 'Rifles', { now: T0 }).state;
    library = setFavourite(library, 'pro-1', true);
    library = movePreset(library, 'custom-1', library.folders[0].id).state;
    renderManager({ library });

    expect(screen.getByRole('button', { name: /All crosshairs/ }).textContent).toContain('3');
    expect(screen.getByRole('button', { name: /Favourites/ }).textContent).toContain('1');
    expect(screen.getByRole('button', { name: /Not in a folder/ }).textContent).toContain('2');
    expect(screen.getByRole('button', { name: 'Folder Rifles' }).textContent).toContain('1');
  });

  it('filters to a folder when it is selected', () => {
    let library = createFolder(emptyLibrary(), 'Rifles', { now: T0 }).state;
    library = movePreset(library, 'custom-1', library.folders[0].id).state;
    renderManager({ library });

    fireEvent.click(screen.getByRole('button', { name: 'Folder Rifles' }));
    expect(rowOf('My Anchor')).toBeTruthy();
    expect(screen.queryByLabelText('Preset Cyan Duelist')).toBeNull();
    expect(screen.getByText(/1 in “Rifles”|in “Rifles”/)).toBeTruthy();
  });

  it('creates a folder', () => {
    const { onLibraryChange } = renderManager();
    fireEvent.click(screen.getByLabelText('New folder'));
    const dialog = screen.getByRole('dialog', { name: 'New folder' });
    fireEvent.change(within(dialog).getByLabelText('Folder name'), { target: { value: '  Pistols  ' } });
    fireEvent.click(within(dialog).getByText('Create folder'));

    expect(onLibraryChange).toHaveBeenCalled();
    const next = onLibraryChange.mock.calls[0][0] as PresetLibraryState;
    expect(next.folders.map((f) => f.name)).toEqual(['Pistols']);
  });

  it('shows the reason inside the dialog when a folder name is taken', () => {
    const library = createFolder(emptyLibrary(), 'Rifles', { now: T0 }).state;
    const { onLibraryChange } = renderManager({ library });
    fireEvent.click(screen.getByLabelText('New folder'));
    const dialog = screen.getByRole('dialog', { name: 'New folder' });
    fireEvent.change(within(dialog).getByLabelText('Folder name'), { target: { value: 'rifles' } });
    fireEvent.click(within(dialog).getByText('Create folder'));

    expect(onLibraryChange).not.toHaveBeenCalled();
    expect(screen.getByText(/already exists/)).toBeTruthy();
    // The dialog stays open with what the user typed, rather than discarding it.
    expect(screen.getByRole('dialog', { name: 'New folder' })).toBeTruthy();
  });

  it('renames a folder', () => {
    const library = createFolder(emptyLibrary(), 'Rifles', { now: T0 }).state;
    const { onLibraryChange } = renderManager({ library });
    fireEvent.click(screen.getByLabelText('Rename folder Rifles'));
    const dialog = screen.getByRole('dialog', { name: 'Rename folder' });
    fireEvent.change(within(dialog).getByLabelText('Folder name'), { target: { value: 'Assault Rifles' } });
    fireEvent.click(within(dialog).getByText('Rename'));

    const next = onLibraryChange.mock.calls[0][0] as PresetLibraryState;
    expect(next.folders[0].name).toBe('Assault Rifles');
  });

  it('promises not to delete the crosshairs inside a folder being removed', () => {
    let library = createFolder(emptyLibrary(), 'Rifles', { now: T0 }).state;
    library = movePreset(library, 'custom-1', library.folders[0].id).state;
    library = movePreset(library, 'pro-1', library.folders[0].id).state;
    const { onLibraryChange } = renderManager({ library });

    fireEvent.click(screen.getByLabelText('Delete folder Rifles'));
    const dialog = screen.getByRole('dialog', { name: 'Delete folder “Rifles”?' });
    expect(within(dialog).getByText(/will not be deleted/)).toBeTruthy();
    expect(within(dialog).getByText('2')).toBeTruthy();

    fireEvent.click(within(dialog).getByText('Delete folder'));
    const next = onLibraryChange.mock.calls[0][0] as PresetLibraryState;
    expect(next.folders).toEqual([]);
    // The presets themselves were never in the library's hands, but their
    // entries survive with no folder rather than being dropped.
    expect(next.entries['custom-1'].folderId).toBeNull();
    expect(next.entries['pro-1'].folderId).toBeNull();
  });

  it('explains an empty folder list', () => {
    renderManager();
    expect(screen.getByText(/No folders yet/)).toBeTruthy();
  });

  it('returns to All when the folder being viewed is deleted', () => {
    let library = createFolder(emptyLibrary(), 'Rifles', { now: T0 }).state;
    library = movePreset(library, 'custom-1', library.folders[0].id).state;
    renderManager({ library });
    fireEvent.click(screen.getByRole('button', { name: 'Folder Rifles' }));
    fireEvent.click(screen.getByLabelText('Delete folder Rifles'));
    fireEvent.click(within(screen.getByRole('dialog')).getByText('Delete folder'));
    expect(screen.getByRole('button', { name: /All crosshairs/ }).getAttribute('aria-pressed')).toBe('true');
  });
});

describe('PresetManagerView search, sort and empty states', () => {
  it('searches and reports the count', () => {
    renderManager();
    fireEvent.change(screen.getByLabelText('Search presets'), { target: { value: 'apex' } });
    expect(rowOf('Apex Anchor')).toBeTruthy();
    expect(screen.queryByLabelText('Preset My Anchor')).toBeNull();
  });

  it('shows an empty state that quotes the search term', () => {
    renderManager();
    fireEvent.change(screen.getByLabelText('Search presets'), { target: { value: 'zzz' } });
    expect(screen.getByText(/Nothing matches “zzz”/)).toBeTruthy();
    expect(screen.getByText(/Search covers the name/)).toBeTruthy();
  });

  it('explains an empty favourites scope', () => {
    renderManager();
    fireEvent.click(screen.getByRole('button', { name: /Favourites/ }));
    expect(screen.getByText('Nothing here yet')).toBeTruthy();
    expect(screen.getByText(/Star a crosshair to keep it here/)).toBeTruthy();
  });

  it('changes the sort order through the library', () => {
    const { onLibraryChange } = renderManager();
    fireEvent.change(screen.getByLabelText('Sort presets by'), { target: { value: 'recent' } });
    expect((onLibraryChange.mock.calls[0][0] as PresetLibraryState).sort).toBe('recent');
  });

  it('offers exactly the sort orders the organiser supports', () => {
    renderManager();
    const options = within(screen.getByLabelText('Sort presets by')).getAllByRole('option');
    expect(options.map((o) => o.textContent)).toEqual([
      'Name',
      'Date created',
      'Date modified',
      'Recently used',
    ]);
  });
});

/* ------------------------------------------------------------------ *
 * ImportPreviewModal
 * ------------------------------------------------------------------ */

function planFor(
  incoming: CrosshairConfig[],
  existing: CrosshairConfig[] = [],
  overrides: Partial<TransferEnvelope> = {},
): ImportPlan {
  const envelope = { ...buildEnvelope({ presets: incoming }, 'presets', T0), ...overrides };
  return planImport(envelope, { presets: existing, settings: DEFAULT_APP_SETTINGS });
}

function renderModal(props: { plan?: ImportPlan | null; error?: string | null }) {
  const onConfirm = vi.fn();
  const onClose = vi.fn();
  const view = render(
    <ImportPreviewModal
      fileName="crshhx-crosshairs.json"
      sizeLabel="4.2 KB"
      plan={props.plan === undefined ? null : props.plan}
      error={props.error ?? null}
      onClose={onClose}
      onConfirm={onConfirm}
    />,
  );
  return { ...view, onConfirm, onClose };
}

describe('ImportPreviewModal', () => {
  it('renders nothing at all until there is a plan or an error', () => {
    const { container } = renderModal({ plan: null });
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });

  it('shows a parse error, says nothing changed, and offers no import', () => {
    renderModal({ error: 'This file is not valid JSON.' });
    const dialog = screen.getByRole('dialog', { name: 'This file could not be imported' });
    expect(within(dialog).getByText('This file is not valid JSON.')).toBeTruthy();
    expect(within(dialog).getByText(/Nothing was changed/)).toBeTruthy();
    expect(within(dialog).queryByText(/Import \d/)).toBeNull();
  });

  it('closes on request', () => {
    const { onClose } = renderModal({ error: 'nope' });
    fireEvent.click(screen.getByLabelText('Close'));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('summarises a clean import before anything is written', () => {
    const plan = planFor([mine('custom-9', 'Fresh One'), mine('custom-8', 'Fresh Two')]);
    renderModal({ plan });
    const dialog = screen.getByRole('dialog', { name: 'Import crosshairs' });

    expect(within(dialog).getByText('crshhx-crosshairs.json · 4.2 KB')).toBeTruthy();
    expect(within(dialog).getByText('Will be added').parentElement!.textContent).toContain('2');
    expect(within(dialog).getByText(/Replace an existing one/i).parentElement!.textContent).toContain('0');
    expect(within(dialog).getByText('Fresh One')).toBeTruthy();
    expect(within(dialog).getByText(/new · id custom-9/)).toBeTruthy();
  });

  it('defaults an id collision to keeping both, and says nothing is overwritten', () => {
    const plan = planFor([mine('custom-1', 'Theirs')], [mine('custom-1', 'Mine')]);
    renderModal({ plan });
    const dialog = screen.getByRole('dialog');

    expect(within(dialog).getByText(/id custom-1 already in your library/)).toBeTruthy();
    expect(within(dialog).getByText(/Nothing will be overwritten/)).toBeTruthy();
    expect(within(dialog).getByLabelText('What to do with Theirs')).toHaveProperty('value', 'add-with-new-id');
    expect(within(dialog).getByText('Import 1 crosshair')).toBeTruthy();
  });

  it('lets the user choose to replace, and the button then says so', () => {
    const plan = planFor([mine('custom-1', 'Theirs')], [mine('custom-1', 'Mine')]);
    const { onConfirm } = renderModal({ plan });
    const dialog = screen.getByRole('dialog');

    fireEvent.change(within(dialog).getByLabelText('What to do with Theirs'), {
      target: { value: 'overwrite' },
    });
    expect(within(dialog).getByText('Import 1 and replace 1')).toBeTruthy();

    fireEvent.click(within(dialog).getByText('Import 1 and replace 1'));
    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ overwrites: [0], skips: [], applySettings: false, applyWeaponSlots: false }),
    );
  });

  it('lets the user skip an entry entirely', () => {
    const plan = planFor([mine('custom-1', 'Theirs'), mine('custom-2', 'Other')], [
      mine('custom-1', 'Mine'),
    ]);
    const { onConfirm } = renderModal({ plan });
    const dialog = screen.getByRole('dialog');

    fireEvent.change(within(dialog).getByLabelText('What to do with Theirs'), {
      target: { value: 'skip' },
    });
    expect(within(dialog).getByText('Import 1 crosshair')).toBeTruthy();
    fireEvent.click(within(dialog).getByText('Import 1 crosshair'));
    expect(onConfirm).toHaveBeenCalledWith(expect.objectContaining({ overwrites: [], skips: [0] }));
  });

  it('shows the corrections the schema had to make, per crosshair', () => {
    const plan = planFor([mine('custom-9', 'Broken', { length: 9999 })]);
    renderModal({ plan });
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(/outside the ranges crshhx supports/)).toBeTruthy();

    const details = within(dialog).getByText(/1 value corrected/);
    fireEvent.click(details);
    expect(within(dialog).getByText(/length/i)).toBeTruthy();
  });

  it('requires an explicit tick before a large import', () => {
    const many = Array.from({ length: LARGE_IMPORT_THRESHOLD }, (_, i) => mine(`p${i}`, `Preset ${i}`));
    renderModal({ plan: planFor(many) });
    const dialog = screen.getByRole('dialog');

    const button = within(dialog).getByText(`Import ${LARGE_IMPORT_THRESHOLD} crosshairs`);
    expect(button.hasAttribute('disabled')).toBe(true);
    expect(within(dialog).getByText(/Tick this to confirm/)).toBeTruthy();

    fireEvent.click(within(dialog).getByRole('checkbox', { name: /Tick this to confirm/i }));
    expect(button.hasAttribute('disabled')).toBe(false);
  });

  it('does not require a tick for a small import', () => {
    renderModal({ plan: planFor([mine('custom-9', 'One')]) });
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).queryByText(/Tick this to confirm/)).toBeNull();
    expect(within(dialog).getByText('Import 1 crosshair').hasAttribute('disabled')).toBe(false);
  });

  it('lists settings differences and leaves them off unless asked', () => {
    const plan = planFor([], [], {
      kind: 'configuration',
      settings: { ...DEFAULT_APP_SETTINGS, overlayVisible: false, selectedMonitor: 2 },
    });
    const { onConfirm } = renderModal({ plan });
    const dialog = screen.getByRole('dialog', { name: 'Restore a full backup' });

    const overlayRow = within(dialog).getByText('Overlay visible').closest('div')!;
    expect(overlayRow.textContent).toBe('Overlay visibleon → off');
    expect(within(dialog).getByText('Selected monitor')).toBeTruthy();
    // The default preference is AUTO_MONITOR (-1): follow the primary display.
    expect(within(dialog).getByText('Selected monitor').closest('div')!.textContent).toBe(
      'Selected monitor-1 → 2',
    );

    fireEvent.click(within(dialog).getByText(/Import 0 crosshairs/));
    expect(onConfirm).toHaveBeenCalledWith(expect.objectContaining({ applySettings: false }));
  });

  it('applies settings only when the box is ticked', () => {
    const plan = planFor([], [], {
      kind: 'configuration',
      settings: { ...DEFAULT_APP_SETTINGS, overlayVisible: false },
    });
    const { onConfirm } = renderModal({ plan });
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('checkbox', { name: /Also apply the 1 setting change/i }));
    fireEvent.click(within(dialog).getByText(/Import 0 crosshairs/));
    expect(onConfirm).toHaveBeenCalledWith(expect.objectContaining({ applySettings: true }));
  });

  it('offers weapon-slot profiles as a separate, opt-in choice', () => {
    const plan = planFor([], [], {
      kind: 'configuration',
      weaponSlots: {
        version: 1,
        enabled: true,
        profiles: [
          {
            id: 'p1',
            name: 'Fortnite',
            matchProcessNames: [],
            restrictToMatchedProcesses: false,
            slots: [
              { id: 's1', index: 1, name: 'Shotgun', binding: null, presetId: 'pro-11', enabled: true },
            ],
          },
        ],
        activeProfileId: 'p1',
      } as never,
    });
    const { onConfirm } = renderModal({ plan });
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(/replace my weapon-slot profiles with the 1 in this file/)).toBeTruthy();
    expect(within(dialog).getByText(/(1 slots)/)).toBeTruthy();

    fireEvent.click(within(dialog).getByRole('checkbox', { name: /replace my weapon-slot profiles/i }));
    fireEvent.click(within(dialog).getByText(/Import 0 crosshairs/));
    expect(onConfirm).toHaveBeenCalledWith(expect.objectContaining({ applyWeaponSlots: true }));
  });

  it('disables the button when there is genuinely nothing to import', () => {
    const plan = planFor([], []);
    renderModal({ plan });
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(/nothing to import/i)).toBeTruthy();
    expect(within(dialog).getByText('Import 0 crosshairs').hasAttribute('disabled')).toBe(true);
  });

  it('flags a name collision as kept alongside, not replaced', () => {
    const plan = planFor([mine('other-id', 'Same Name')], [mine('local-id', 'Same Name')]);
    renderModal({ plan });
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(/you already have one called this/)).toBeTruthy();
    expect(within(dialog).getByText(/Both will be kept/)).toBeTruthy();
    expect(within(dialog).getByText('kept alongside')).toBeTruthy();
  });
});
