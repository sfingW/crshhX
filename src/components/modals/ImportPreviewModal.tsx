import React, { useMemo, useState } from 'react';
import { AlertTriangle, FileWarning, Info, ShieldCheck } from 'lucide-react';
import type { EntryAction, ImportPlan } from '../../lib/presetTransfer';
import { LARGE_IMPORT_THRESHOLD } from '../../lib/presetTransfer';

/**
 * Import preview.
 *
 * This is the confirmation step between "the file parsed" and "anything was
 * written". It exists because the failure it prevents is unrecoverable: a file
 * quietly replacing crosshairs the user cared about.
 *
 * What it always shows before importing: how many will be added, which ones
 * collide with something already in the library and what will happen to each,
 * every value crshhx had to correct, and — for a full backup — the exact
 * settings and weapon-slot profiles that would change. Settings and weapon slots
 * are opt-in checkboxes; crosshairs never overwrite by default.
 */

export interface ImportChoices {
  /** Indexes of entries the user chose to overwrite. */
  overwrites: number[];
  /** Indexes of entries the user chose to skip. */
  skips: number[];
  applySettings: boolean;
  applyWeaponSlots: boolean;
}

interface ImportPreviewModalProps {
  fileName: string;
  sizeLabel?: string;
  plan: ImportPlan | null;
  /** Set when the file could not be parsed at all. */
  error: string | null;
  onClose: () => void;
  onConfirm: (choices: ImportChoices) => void;
}

export const ImportPreviewModal: React.FC<ImportPreviewModalProps> = ({
  fileName,
  sizeLabel,
  plan,
  error,
  onClose,
  onConfirm,
}) => {
  const [overrides, setOverrides] = useState<Record<number, EntryAction>>({});
  const [applySettings, setApplySettings] = useState(false);
  const [applyWeaponSlots, setApplyWeaponSlots] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);

  /** The plan's safe defaults, with the user's explicit choices on top. */
  const entries = useMemo(
    () => (plan?.entries ?? []).map((entry) => ({ ...entry, action: overrides[entry.index] ?? entry.action })),
    [plan, overrides],
  );

  const counts = useMemo(() => {
    let add = 0;
    let overwrite = 0;
    let skip = 0;
    for (const entry of entries) {
      if (entry.action === 'skip') skip++;
      else if (entry.action === 'overwrite') overwrite++;
      else add++;
    }
    return { add, overwrite, skip };
  }, [entries]);

  if (error) {
    return (
      <Shell title="This file could not be imported" onClose={onClose}>
        <div className="flex items-start gap-2.5 rounded-lg border border-rose-900/60 bg-rose-950/30 p-3">
          <FileWarning className="w-4 h-4 text-rose-400 shrink-0 mt-px" />
          <p className="text-[11.5px] text-rose-200 leading-relaxed">{error}</p>
        </div>
        <p className="text-[11px] text-zinc-500 leading-relaxed">
          Nothing was changed. Your existing crosshairs, folders and settings are untouched.
        </p>
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-md text-xs font-medium text-zinc-200 bg-surface-card border border-surface-border hover:text-white transition-colors"
          >
            Close
          </button>
        </div>
      </Shell>
    );
  }

  if (!plan) return null;

  const blocking = counts.add + counts.overwrite === 0 && plan.settings.length === 0 && !plan.weaponSlots.included;
  const needsAcknowledgement = counts.add >= LARGE_IMPORT_THRESHOLD;

  const confirm = () => {
    onConfirm({
      overwrites: entries.filter((e) => e.action === 'overwrite').map((e) => e.index),
      skips: entries.filter((e) => e.action === 'skip').map((e) => e.index),
      applySettings,
      applyWeaponSlots,
    });
  };

  return (
    <Shell
      title={plan.kind === 'configuration' ? 'Restore a full backup' : 'Import crosshairs'}
      onClose={onClose}
      wide
    >
      <div className="flex items-center justify-between gap-3 text-[11px] text-zinc-500 font-mono">
        <span className="truncate">{fileName}{sizeLabel ? ` · ${sizeLabel}` : ''}</span>
        <span className="shrink-0">
          {plan.exportedAt ? `exported ${new Date(plan.exportedAt).toLocaleString()}` : 'export date unknown'}
        </span>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-2">
        <Stat label="Will be added" value={counts.add} tone="good" />
        <Stat label="Will replace an existing one" value={counts.overwrite} tone={counts.overwrite ? 'warn' : 'neutral'} />
        <Stat label="Skipped" value={counts.skip} tone="neutral" />
      </div>

      {plan.warnings.length > 0 && (
        <NoteList tone="warn" icon={<AlertTriangle className="w-3.5 h-3.5" />} items={plan.warnings} title="Problems" />
      )}
      {plan.notes.length > 0 && (
        <NoteList tone="info" icon={<Info className="w-3.5 h-3.5" />} items={plan.notes} title="Notes" />
      )}

      {/* Entries */}
      {entries.length > 0 && (
        <div className="space-y-1.5">
          <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 font-semibold">
            Crosshairs in this file
          </span>
          <div className="max-h-56 overflow-y-auto scrollbar-thin rounded-lg border border-surface-border divide-y divide-surface-border/60">
            {entries.map((entry) => {
              const conflicting = entry.status === 'id-conflict' || entry.status === 'name-conflict';
              return (
                <div key={entry.index} className="px-2.5 py-2 bg-surface-sidebar">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-[11.5px] text-zinc-200 block truncate">
                        {entry.incoming.name}
                      </span>
                      <span className="text-[10px] font-mono text-zinc-600 block truncate">
                        {entry.status === 'id-conflict'
                          ? `id ${entry.incoming.id} already in your library`
                          : entry.status === 'name-conflict'
                            ? `you already have one called this`
                            : entry.status === 'duplicate-in-file'
                              ? `listed twice in this file`
                              : `new · id ${entry.assignedId ?? entry.incoming.id}`}
                      </span>
                    </div>

                    {entry.status === 'id-conflict' ? (
                      <select
                        value={entry.action}
                        onChange={(e) =>
                          setOverrides((prev) => ({ ...prev, [entry.index]: e.target.value as EntryAction }))
                        }
                        aria-label={`What to do with ${entry.incoming.name}`}
                        className="bg-surface-base border border-surface-border rounded px-1.5 py-1 text-[10.5px] text-zinc-300 focus:outline-none shrink-0"
                      >
                        <option value="add-with-new-id">Keep both</option>
                        <option value="overwrite">Replace mine</option>
                        <option value="skip">Do not import</option>
                      </select>
                    ) : (
                      <span className="text-[10px] font-mono text-zinc-500 shrink-0">
                        {entry.action === 'skip' ? 'skipped' : conflicting ? 'kept alongside' : 'added'}
                      </span>
                    )}
                  </div>

                  {entry.note && (
                    <p className="text-[10px] text-amber-400/90 leading-snug mt-1">{entry.note}</p>
                  )}
                  {entry.repairs.length > 0 && (
                    <details className="mt-1">
                      <summary className="text-[10px] text-zinc-500 cursor-pointer hover:text-zinc-300">
                        {entry.repairs.length} value{entry.repairs.length === 1 ? '' : 's'} corrected
                      </summary>
                      <ul className="mt-1 space-y-0.5 pl-3 list-disc">
                        {entry.repairs.map((repair, i) => (
                          <li key={i} className="text-[10px] text-zinc-500 leading-snug">
                            {repair}
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Settings */}
      {plan.settings.length > 0 && (
        <div className="space-y-1.5">
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={applySettings}
              onChange={(e) => setApplySettings(e.target.checked)}
              className="mt-0.5 w-3.5 h-3.5 accent-emerald-500"
            />
            <span className="text-[11.5px] text-zinc-300">
              Also apply the {plan.settings.length} setting change
              {plan.settings.length === 1 ? '' : 's'} from this file
            </span>
          </label>
          <div className="rounded-lg border border-surface-border overflow-hidden">
            {plan.settings.map((difference) => (
              <div
                key={difference.key}
                className="flex items-center justify-between gap-2 px-2.5 py-1.5 bg-surface-sidebar text-[11px] border-b border-surface-border/60 last:border-0"
              >
                <span className="text-zinc-400 truncate">{difference.label}</span>
                <span className="font-mono text-zinc-500 shrink-0">
                  {difference.current} <span className="text-zinc-700">→</span>{' '}
                  <span className="text-zinc-200">{difference.incoming}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Weapon slots */}
      {plan.weaponSlots.included && (
        <label className="flex items-start gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={applyWeaponSlots}
            onChange={(e) => setApplyWeaponSlots(e.target.checked)}
            className="mt-0.5 w-3.5 h-3.5 accent-emerald-500"
          />
          <span className="text-[11.5px] text-zinc-300 leading-snug">
            Also replace my weapon-slot profiles with the {plan.weaponSlots.profiles} in this file
            ({plan.weaponSlots.slots} slots)
            {plan.weaponSlots.repairs.length > 0 && (
              <span className="block text-[10px] text-amber-400/90 mt-0.5">
                {plan.weaponSlots.repairs.length} binding
                {plan.weaponSlots.repairs.length === 1 ? '' : 's'} needed correcting.
              </span>
            )}
          </span>
        </label>
      )}

      {/* Large-import acknowledgement */}
      {needsAcknowledgement && (
        <label className="flex items-start gap-2 cursor-pointer rounded-lg border border-amber-900/60 bg-amber-950/20 p-2.5">
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={(e) => setAcknowledged(e.target.checked)}
            className="mt-0.5 w-3.5 h-3.5 accent-amber-500"
          />
          <span className="text-[11px] text-amber-200 leading-snug">
            This file adds {counts.add} crosshairs. Tick this to confirm you want all of them — a
            large import is not undoable.
          </span>
        </label>
      )}

      {blocking && (
        <p className="text-[11px] text-zinc-500 flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5" />
          There is nothing to import from this file.
        </p>
      )}

      <div className="flex items-center justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onClose}
          className="px-3 py-1.5 rounded-md text-xs text-zinc-400 hover:text-zinc-100 hover:bg-surface-card transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={confirm}
          disabled={blocking || (needsAcknowledgement && !acknowledged)}
          className="px-3 py-1.5 rounded-md text-xs font-medium text-black transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ backgroundColor: 'var(--brand-accent)' }}
        >
          {counts.overwrite > 0
            ? `Import ${counts.add + counts.overwrite} and replace ${counts.overwrite}`
            : `Import ${counts.add} crosshair${counts.add === 1 ? '' : 's'}`}
        </button>
      </div>
    </Shell>
  );
};

/* ------------------------------------------------------------------ */

const Shell: React.FC<{
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}> = ({ title, onClose, children, wide = false }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className={`w-full ${wide ? 'max-w-lg' : 'max-w-md'} max-h-[85vh] overflow-y-auto scrollbar-thin rounded-xl border border-surface-border bg-surface-sidebar p-4 space-y-3 shadow-2xl`}
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-zinc-100">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="p-1 rounded text-zinc-500 hover:text-zinc-100 hover:bg-surface-card transition-colors"
        >
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
      {children}
    </div>
  </div>
);

const Stat: React.FC<{ label: string; value: number; tone: 'good' | 'warn' | 'neutral' }> = ({
  label,
  value,
  tone,
}) => (
  <div className="rounded-lg border border-surface-border bg-surface-card px-2.5 py-2">
    <span
      className="text-lg font-mono font-semibold block leading-none"
      style={{
        color:
          tone === 'good'
            ? 'var(--brand-accent)'
            : tone === 'warn'
              ? '#fbbf24'
              : value > 0
                ? '#e4e4e7'
                : '#71717a',
      }}
    >
      {value}
    </span>
    <span className="text-[10px] text-zinc-500 leading-tight block mt-1">{label}</span>
  </div>
);

const NoteList: React.FC<{
  title: string;
  items: string[];
  tone: 'warn' | 'info';
  icon: React.ReactNode;
}> = ({ title, items, tone, icon }) => (
  <div
    className={`rounded-lg border p-2.5 space-y-1 ${
      tone === 'warn' ? 'border-amber-900/60 bg-amber-950/20' : 'border-surface-border bg-surface-card'
    }`}
  >
    <span
      className={`text-[10px] uppercase font-mono tracking-wider font-semibold flex items-center gap-1.5 ${
        tone === 'warn' ? 'text-amber-400' : 'text-zinc-500'
      }`}
    >
      {icon}
      {title}
    </span>
    <ul className="space-y-0.5 pl-5 list-disc">
      {items.map((item, i) => (
        <li
          key={i}
          className={`text-[10.5px] leading-snug ${tone === 'warn' ? 'text-amber-200/90' : 'text-zinc-400'}`}
        >
          {item}
        </li>
      ))}
    </ul>
  </div>
);
