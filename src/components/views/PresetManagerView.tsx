import React, { useMemo, useState } from 'react';
import {
  Download,
  FolderPlus,
  Pencil,
  Star,
  Trash2,
  Upload,
  Copy,
  Check,
  FolderOpen,
  Search,
  Crosshair as CrosshairIcon,
  AlertTriangle,
} from 'lucide-react';
import type { CrosshairConfig } from '../../types/crosshair';
import {
  MAX_FOLDER_NAME,
  SORT_OPTIONS,
  createFolder,
  decorate,
  deleteFolder,
  folderCounts,
  movePreset,
  renameFolder,
  searchViews,
  setSort,
  sortViews,
  toggleFavourite,
  type PresetLibraryState,
  type PresetSort,
  type PresetView,
} from '../../lib/presetOrganizer';
import { ReticleRenderer } from '../ReticleRenderer';

/**
 * Preset manager.
 *
 * A private, local library: folders, favourites, descriptions and timestamps for
 * any crosshair — built-in or the user's own — plus rename, duplicate, delete and
 * file import/export.
 *
 * Two things are deliberately visible at all times, because losing track of them
 * is how a tool like this destroys work:
 *
 * - **What uses this crosshair.** A weapon-slot profile that points at a deleted
 *   preset shows up later as "missing". The row says which profiles reference it
 *   before the delete is confirmed.
 * - **What cannot be deleted.** Built-in presets are module constants; they can be
 *   organised, favourited, described, duplicated and exported, but not renamed or
 *   deleted. Those actions are disabled with an explanation rather than hidden.
 */

interface PresetManagerViewProps {
  /** Everything selectable: vault, pro presets and the user's own. */
  presets: readonly CrosshairConfig[];
  /** Ids the user may rename or delete — their own saved presets. */
  editableIds: ReadonlySet<string>;
  library: PresetLibraryState;
  onLibraryChange: (next: PresetLibraryState) => void;
  currentConfigId: string;
  /** Preset id -> names of the weapon-slot profiles that reference it. */
  usage?: Record<string, string[]>;
  onApply: (config: CrosshairConfig) => void;
  onEdit: (config: CrosshairConfig) => void;
  onRename: (id: string, name: string) => void;
  onDuplicate: (config: CrosshairConfig) => void;
  onDelete: (id: string) => void;
  onExportPresets: (configs: readonly CrosshairConfig[], library: PresetLibraryState) => void;
  onExportConfiguration: () => void;
  onImportFile: () => void;
}

type Selection = 'all' | 'favorites' | 'unfiled' | { folderId: string };

function selectionKey(selection: Selection): string {
  return typeof selection === 'string' ? selection : `folder:${selection.folderId}`;
}

/* ------------------------------------------------------------------ *
 * A small prompt/confirm dialog, used for every destructive or naming
 * action so the app has one confirmation style rather than five.
 * ------------------------------------------------------------------ */

interface DialogProps {
  title: string;
  /** When set, the dialog asks for text; otherwise it is a yes/no confirm. */
  field?: { label: string; initial: string; maxLength?: number; placeholder?: string };
  body?: React.ReactNode;
  confirmLabel: string;
  /** Renders in the destructive style. */
  danger?: boolean;
  onConfirm: (value: string) => void;
  onCancel: () => void;
}

const Dialog: React.FC<DialogProps> = ({
  title,
  field,
  body,
  confirmLabel,
  danger = false,
  onConfirm,
  onCancel,
}) => {
  const [value, setValue] = useState(field?.initial ?? '');
  const [error, setError] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (field) {
      const trimmed = value.trim();
      if (!trimmed) {
        setError('This cannot be empty.');
        return;
      }
      if (trimmed === field.initial) {
        onCancel();
        return;
      }
    }
    onConfirm(value.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <form
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onSubmit={submit}
        className="w-full max-w-sm rounded-xl border border-surface-border bg-surface-sidebar p-4 space-y-3 shadow-2xl"
      >
        <h2 className="text-sm font-semibold text-zinc-100">{title}</h2>

        {body}

        {field && (
          <label className="block space-y-1">
            <span className="text-[11px] text-zinc-400 block">{field.label}</span>
            <input
              autoFocus
              type="text"
              value={value}
              maxLength={field.maxLength ?? MAX_FOLDER_NAME}
              placeholder={field.placeholder}
              onChange={(e) => {
                setValue(e.target.value);
                setError(null);
              }}
              aria-label={field.label}
              className="w-full bg-surface-base border border-surface-border rounded px-2 py-1.5 text-xs text-zinc-100 focus:outline-none"
              style={{ borderColor: error ? '#f43f5e' : undefined }}
            />
            <span className="text-[10px] font-mono text-zinc-600 block text-right">
              {value.length}/{field.maxLength ?? MAX_FOLDER_NAME}
            </span>
          </label>
        )}

        {error && (
          <p className="text-[11px] text-rose-400 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            {error}
          </p>
        )}

        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 rounded-md text-xs text-zinc-400 hover:text-zinc-100 hover:bg-surface-card transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className={`px-3 py-1.5 rounded-md text-xs font-medium text-white transition-colors ${
              danger ? 'bg-rose-600 hover:bg-rose-500' : 'bg-emerald-600 hover:bg-emerald-500'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </form>
    </div>
  );
};

/* ------------------------------------------------------------------ */

export const PresetManagerView: React.FC<PresetManagerViewProps> = ({
  presets,
  editableIds,
  library,
  onLibraryChange,
  currentConfigId,
  usage = {},
  onApply,
  onEdit,
  onRename,
  onDuplicate,
  onDelete,
  onExportPresets,
  onExportConfiguration,
  onImportFile,
}) => {
  const [selection, setSelection] = useState<Selection>('all');
  const [query, setQuery] = useState('');
  const [dialog, setDialog] = useState<React.ReactNode>(null);

  const allViews = useMemo(() => decorate(presets, library), [presets, library]);
  const counts = useMemo(() => folderCounts(allViews), [allViews]);
  const favouriteCount = useMemo(
    () => allViews.filter((v) => v.entry.favourite).length,
    [allViews],
  );

  const inScope = useMemo(() => {
    if (selection === 'all') return allViews;
    if (selection === 'favorites') return allViews.filter((v) => v.entry.favourite);
    if (selection === 'unfiled') return allViews.filter((v) => v.entry.folderId === null);
    return allViews.filter((v) => v.entry.folderId === (selection as { folderId: string }).folderId);
  }, [selection, allViews]);

  const visible = useMemo(
    () => sortViews(searchViews(inScope, query), library.sort),
    [inScope, query, library.sort],
  );

  const mutate = (next: PresetLibraryState) => onLibraryChange(next);

  /* ---- folder actions ---- */

  const askNewFolder = () =>
    setDialog(
      <Dialog
        title="New folder"
        field={{ label: 'Folder name', initial: '', placeholder: 'Rifles' }}
        confirmLabel="Create folder"
        onCancel={() => setDialog(null)}
        onConfirm={(name) => {
          const result = createFolder(library, name);
          if (!result.ok) {
            // Re-open with the error shown rather than dropping the attempt.
            setDialog(
              <Dialog
                title="New folder"
                field={{ label: 'Folder name', initial: name, placeholder: 'Rifles' }}
                body={<p className="text-[11px] text-rose-400">{result.error}</p>}
                confirmLabel="Create folder"
                onCancel={() => setDialog(null)}
                onConfirm={() => setDialog(null)}
              />,
            );
            return;
          }
          setDialog(null);
          if (result.folderId) setSelection({ folderId: result.folderId });
          mutate(result.state);
        }}
      />,
    );

  const askRenameFolder = (folderId: string, currentName: string) =>
    setDialog(
      <Dialog
        title="Rename folder"
        field={{ label: 'Folder name', initial: currentName }}
        confirmLabel="Rename"
        onCancel={() => setDialog(null)}
        onConfirm={(name) => {
          const result = renameFolder(library, folderId, name);
          setDialog(null);
          if (result.ok) mutate(result.state);
        }}
      />,
    );

  const askDeleteFolder = (folderId: string, name: string) => {
    const inside = counts.get(folderId) ?? 0;
    setDialog(
      <Dialog
        title={`Delete folder “${name}”?`}
        danger
        confirmLabel="Delete folder"
        body={
          <p className="text-[11.5px] text-zinc-400 leading-relaxed">
            {inside > 0 ? (
              <>
                The <strong className="text-zinc-200">{inside}</strong> crosshair
                {inside === 1 ? '' : 's'} in this folder{' '}
                <strong className="text-zinc-200">
                  will not be deleted
                </strong>{' '}
                — they move out of folders and stay in your library.
              </>
            ) : (
              <>This folder is empty.</>
            )}
          </p>
        }
        onCancel={() => setDialog(null)}
        onConfirm={() => {
          const result = deleteFolder(library, folderId);
          setDialog(null);
          if (result.ok) {
            if (selectionKey(selection) === `folder:${folderId}`) setSelection('all');
            mutate(result.state);
          }
        }}
      />,
    );
  };

  /* ---- preset actions ---- */

  const askRenamePreset = (view: PresetView) =>
    setDialog(
      <Dialog
        title="Rename crosshair"
        field={{ label: 'Name', initial: view.preset.name, maxLength: 60 }}
        confirmLabel="Rename"
        onCancel={() => setDialog(null)}
        onConfirm={(name) => {
          setDialog(null);
          onRename(view.preset.id, name);
        }}
      />,
    );

  const askDeletePreset = (view: PresetView) => {
    const usedBy = usage[view.preset.id] ?? [];
    setDialog(
      <Dialog
        title={`Delete “${view.preset.name}”?`}
        danger
        confirmLabel="Delete crosshair"
        body={
          <div className="space-y-2">
            <p className="text-[11.5px] text-zinc-400 leading-relaxed">
              This removes your saved copy. Built-in crosshairs cannot be deleted.
            </p>
            {usedBy.length > 0 && (
              <p className="text-[11.5px] text-amber-400 leading-relaxed flex items-start gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" />
                <span>
                  Used by {usedBy.length} weapon-slot profile
                  {usedBy.length === 1 ? '' : 's'}: {usedBy.join(', ')}. Those slots will show as
                  missing until you assign another crosshair.
                </span>
              </p>
            )}
          </div>
        }
        onCancel={() => setDialog(null)}
        onConfirm={() => {
          setDialog(null);
          onDelete(view.preset.id);
        }}
      />,
    );
  };

  const navItems: Array<{ key: string; label: string; count: number; icon: React.ReactNode; select: Selection }> = [
    {
      key: 'all',
      label: 'All crosshairs',
      count: allViews.length,
      icon: <CrosshairIcon className="w-3.5 h-3.5" />,
      select: 'all',
    },
    {
      key: 'favorites',
      label: 'Favourites',
      count: favouriteCount,
      icon: <Star className="w-3.5 h-3.5" />,
      select: 'favorites',
    },
    {
      key: 'unfiled',
      label: 'Not in a folder',
      count: counts.get(null) ?? 0,
      icon: <FolderOpen className="w-3.5 h-3.5" />,
      select: 'unfiled',
    },
  ];

  return (
    <div className="flex-1 flex h-full bg-surface-base text-zinc-100 overflow-hidden">
      {/* Folder rail */}
      <aside className="w-56 shrink-0 border-r border-surface-border bg-surface-sidebar flex flex-col overflow-y-auto scrollbar-thin">
        <div className="p-3 space-y-0.5">
          <span className="px-1 text-[10px] uppercase font-mono tracking-wider text-zinc-500 font-semibold block mb-1.5">
            Library
          </span>
          {navItems.map((item) => {
            const active = selectionKey(selection) === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setSelection(item.select)}
                aria-pressed={active}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[11.5px] transition-all ${
                  active
                    ? 'bg-surface-card text-zinc-100 font-medium'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-surface-card'
                }`}
                style={{ color: active ? 'var(--brand-accent)' : undefined }}
              >
                {item.icon}
                <span className="flex-1 text-left truncate">{item.label}</span>
                <span className="font-mono text-[10px] text-zinc-600">{item.count}</span>
              </button>
            );
          })}
        </div>

        <div className="p-3 pt-0 space-y-0.5 flex-1">
          <div className="flex items-center justify-between px-1 mb-1.5">
            <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 font-semibold">
              Folders
            </span>
            <button
              type="button"
              onClick={askNewFolder}
              aria-label="New folder"
              title="New folder"
              className="p-0.5 rounded text-zinc-500 hover:text-zinc-100 hover:bg-surface-card transition-colors"
            >
              <FolderPlus className="w-3.5 h-3.5" />
            </button>
          </div>

          {library.folders.length === 0 ? (
            <p className="px-2 text-[10.5px] text-zinc-600 leading-snug">
              No folders yet. Use <span className="text-zinc-500">New folder</span> to group
              crosshairs by game, weapon or playstyle.
            </p>
          ) : (
            library.folders.map((folder) => {
              const active =
                typeof selection === 'object' && (selection as { folderId: string }).folderId === folder.id;
              return (
                <div key={folder.id} className="group flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setSelection({ folderId: folder.id })}
                    aria-pressed={active}
                    aria-label={`Folder ${folder.name}`}
                    className={`flex-1 min-w-0 flex items-center gap-2 px-2 py-1.5 rounded-md text-[11.5px] transition-all ${
                      active
                        ? 'bg-surface-card text-zinc-100 font-medium'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-surface-card'
                    }`}
                    style={{ color: active ? 'var(--brand-accent)' : undefined }}
                  >
                    <span className="truncate flex-1 text-left">{folder.name}</span>
                    <span className="font-mono text-[10px] text-zinc-600">
                      {counts.get(folder.id) ?? 0}
                    </span>
                  </button>
                  <span className="opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity flex items-center">
                    <button
                      type="button"
                      onClick={() => askRenameFolder(folder.id, folder.name)}
                      aria-label={`Rename folder ${folder.name}`}
                      className="p-1 rounded text-zinc-600 hover:text-zinc-200 transition-colors"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => askDeleteFolder(folder.id, folder.name)}
                      aria-label={`Delete folder ${folder.name}`}
                      className="p-1 rounded text-zinc-600 hover:text-rose-400 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </span>
                </div>
              );
            })
          )}
        </div>
      </aside>

      {/* List */}
      <main className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-surface-border bg-surface-sidebar">
          <div className="relative flex-1 max-w-xs">
            <Search className="w-3.5 h-3.5 text-zinc-600 absolute left-2 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, description, folder…"
              aria-label="Search presets"
              className="w-full bg-surface-base border border-surface-border rounded-md pl-7 pr-2 py-1.5 text-[11.5px] text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
            />
          </div>

          <label className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase font-mono text-zinc-500">Sort</span>
            <select
              value={library.sort}
              onChange={(e) => mutate(setSort(library, e.target.value as PresetSort))}
              aria-label="Sort presets by"
              className="bg-surface-base border border-surface-border rounded-md px-2 py-1.5 text-[11.5px] text-zinc-200 focus:outline-none"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <div className="flex-1" />

          <button
            type="button"
            onClick={() => onExportPresets(visible.map((v) => v.preset), library)}
            title={`Export the ${visible.length} crosshair${visible.length === 1 ? '' : 's'} currently listed`}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-surface-border bg-surface-card text-[11px] text-zinc-300 hover:text-zinc-100 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Export list
          </button>
          <button
            type="button"
            onClick={onExportConfiguration}
            title="Export everything: crosshairs, folders, settings and weapon slots"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-surface-border bg-surface-card text-[11px] text-zinc-300 hover:text-zinc-100 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Full backup
          </button>
          <button
            type="button"
            onClick={onImportFile}
            title="Import a crshhx file: many crosshairs, folders, settings and weapon slots"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-medium text-black transition-colors"
            style={{ backgroundColor: 'var(--brand-accent)' }}
          >
            <Upload className="w-3.5 h-3.5" />
            Import file
          </button>
        </div>

        {/* There is another, deliberately different import in the top bar, so
            both say what they are for. Pasting a Valorant or CS2 code applies
            one crosshair to the editor; this one brings in a file. */}
        <p className="px-4 pt-2 text-[10px] text-zinc-600 leading-relaxed">
          Export and import work on crshhx files — many crosshairs at once, with their folders, and
          optionally your settings and weapon-slot profiles. To paste a single Valorant or CS2
          crosshair code instead, use Share in the top bar.
        </p>

        {/* Rows */}
        <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-3">
          {visible.length === 0 ? (
            <div className="h-full min-h-[200px] flex flex-col items-center justify-center text-center px-6">
              <Search className="w-6 h-6 text-zinc-700 mb-3" />
              <p className="text-sm font-medium text-zinc-300">
                {query.trim() ? `Nothing matches “${query.trim()}”` : 'Nothing here yet'}
              </p>
              <p className="text-xs text-zinc-500 max-w-sm mt-1.5 leading-relaxed">
                {query.trim()
                  ? 'Search covers the name, the description you wrote, the folder and the game.'
                  : selection === 'favorites'
                    ? 'Star a crosshair to keep it here.'
                    : 'This folder is empty. Use “Move to folder” on any crosshair to file it.'}
              </p>
            </div>
          ) : (
            <ul className="space-y-1.5">
              {visible.map((view) => {
                const editable = editableIds.has(view.preset.id);
                const isActive = view.preset.id === currentConfigId;
                const usedBy = usage[view.preset.id] ?? [];
                return (
                  <li
                    key={view.preset.id}
                    aria-label={`Preset ${view.preset.name}`}
                    className={`flex items-center gap-3 rounded-lg border px-3 py-2 transition-colors ${
                      isActive
                        ? 'bg-surface-card'
                        : 'bg-surface-sidebar border-surface-border hover:border-zinc-600'
                    }`}
                    style={{ borderColor: isActive ? 'var(--brand-accent)' : undefined }}
                  >
                    {/* Thumbnail */}
                    <div
                      className="w-11 h-11 shrink-0 rounded-md border border-surface-border bg-[#1b1c22] flex items-center justify-center overflow-hidden"
                      aria-hidden="true"
                    >
                      <ReticleRenderer config={view.preset} scale={0.9} />
                    </div>

                    {/* Identity */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium text-zinc-100 truncate">
                          {view.preset.name}
                        </span>
                        {isActive && (
                          <span
                            className="text-[9px] font-mono uppercase px-1 py-px rounded shrink-0 text-black font-bold"
                            style={{ backgroundColor: 'var(--brand-accent)' }}
                          >
                            Active
                          </span>
                        )}
                        {!editable && (
                          <span className="text-[9px] font-mono uppercase px-1 py-px rounded bg-surface-base border border-surface-border text-zinc-600 shrink-0">
                            Built-in
                          </span>
                        )}
                        {view.folderName && (
                          <span className="text-[9.5px] font-mono px-1 py-px rounded bg-surface-base border border-surface-border text-zinc-500 truncate shrink-0 max-w-[8rem]">
                            {view.folderName}
                          </span>
                        )}
                      </div>
                      <p className="text-[10.5px] text-zinc-500 truncate mt-0.5">
                        {view.entry.description ||
                          `${view.preset.game} · ${view.preset.topology} · length ${view.preset.length}px · gap ${view.preset.gap}px`}
                      </p>
                      {usedBy.length > 0 && (
                        <p className="text-[10px] text-zinc-600 truncate">
                          Used by {usedBy.length} profile{usedBy.length === 1 ? '' : 's'}:{' '}
                          {usedBy.join(', ')}
                        </p>
                      )}
                    </div>

                    {/* Move to folder */}
                    <select
                      value={view.entry.folderId ?? ''}
                      onChange={(e) =>
                        mutate(movePreset(library, view.preset.id, e.target.value || null).state)
                      }
                      aria-label={`Move ${view.preset.name} to folder`}
                      className="bg-surface-base border border-surface-border rounded px-1.5 py-1 text-[10.5px] text-zinc-400 focus:outline-none max-w-[7.5rem] shrink-0"
                    >
                      <option value="">No folder</option>
                      {library.folders.map((folder) => (
                        <option key={folder.id} value={folder.id}>
                          {folder.name}
                        </option>
                      ))}
                    </select>

                    {/* Actions */}
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => onApply(view.preset)}
                        aria-label={`Apply ${view.preset.name}`}
                        title="Apply to the overlay"
                        className="p-1.5 rounded text-zinc-500 hover:text-zinc-100 hover:bg-surface-card transition-colors"
                      >
                        {isActive ? <Check className="w-3.5 h-3.5" /> : <CrosshairIcon className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => onEdit(view.preset)}
                        aria-label={`Edit ${view.preset.name} in the designer`}
                        title="Open in the designer"
                        className="p-1.5 rounded text-zinc-500 hover:text-zinc-100 hover:bg-surface-card transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => mutate(toggleFavourite(library, view.preset.id))}
                        aria-label={
                          view.entry.favourite
                            ? `Remove ${view.preset.name} from favourites`
                            : `Add ${view.preset.name} to favourites`
                        }
                        aria-pressed={view.entry.favourite}
                        title="Favourite"
                        className="p-1.5 rounded transition-colors hover:bg-surface-card"
                        style={{ color: view.entry.favourite ? 'var(--brand-accent)' : '#71717a' }}
                      >
                        <Star
                          className="w-3.5 h-3.5"
                          style={{ fill: view.entry.favourite ? 'var(--brand-accent)' : 'none' }}
                        />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDuplicate(view.preset)}
                        aria-label={`Duplicate ${view.preset.name}`}
                        title={
                          editable
                            ? 'Save a copy you can edit'
                            : 'Built-in crosshairs cannot be changed, so this saves an editable copy'
                        }
                        className="p-1.5 rounded text-zinc-500 hover:text-zinc-100 hover:bg-surface-card transition-colors"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => askRenamePreset(view)}
                        disabled={!editable}
                        aria-label={`Rename ${view.preset.name}`}
                        title={editable ? 'Rename' : 'Built-in crosshairs cannot be renamed — duplicate one first'}
                        className="p-1.5 rounded text-zinc-500 hover:text-zinc-100 hover:bg-surface-card transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed"
                      >
                        <span className="text-[10px] font-mono font-bold">Aa</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => askDeletePreset(view)}
                        disabled={!editable}
                        aria-label={`Delete ${view.preset.name}`}
                        title={editable ? 'Delete' : 'Built-in crosshairs cannot be deleted'}
                        className="p-1.5 rounded text-zinc-500 hover:text-rose-400 hover:bg-surface-card transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onExportPresets([view.preset], library)}
                        aria-label={`Export ${view.preset.name}`}
                        title="Export this crosshair to a file"
                        className="p-1.5 rounded text-zinc-500 hover:text-zinc-100 hover:bg-surface-card transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Status line: the user should always be able to tell what they are looking at */}
        <div className="px-4 py-2 border-t border-surface-border bg-surface-sidebar flex items-center justify-between text-[10.5px] font-mono text-zinc-500">
          <span>
            Showing <strong className="text-zinc-300">{visible.length}</strong> of {allViews.length}{' '}
            crosshairs
            {typeof selection === 'object'
              ? ` in “${library.folders.find((f) => f.id === (selection as { folderId: string }).folderId)?.name}”`
              : selection === 'favorites'
                ? ' marked as favourite'
                : selection === 'unfiled'
                  ? ' not in a folder'
                  : ''}
          </span>
          <span>{editableIds.size} editable · stored only on this computer</span>
        </div>
      </main>

      {dialog}
    </div>
  );
};
