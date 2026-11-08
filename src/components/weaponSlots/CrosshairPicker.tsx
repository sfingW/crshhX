import React, { useMemo, useState } from 'react';
import { Search, X, Ban, Crosshair } from 'lucide-react';
import { ReticleRenderer } from '../ReticleRenderer';
import type { SelectablePreset } from '../../lib/weaponSlots/presetIndex';

/**
 * Crosshair picker for a weapon slot.
 *
 * This does **not** own a library. It renders whatever `SelectablePreset[]` the
 * caller passes in — built by `listSelectablePresets()` from the same vault, pro
 * presets and saved customs the rest of crshhx already uses — and it hands back
 * a preset **id**. Selecting a crosshair for a slot never copies, edits or
 * creates a preset.
 */

interface CrosshairPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (presetId: string | null) => void;
  presets: SelectablePreset[];
  currentPresetId: string | null;
  slotLabel: string;
}

export const CrosshairPicker: React.FC<CrosshairPickerProps> = ({
  isOpen,
  onClose,
  onSelect,
  presets,
  currentPresetId,
  slotLabel,
}) => {
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState<string>('All');

  const groups = useMemo(() => {
    const seen: string[] = [];
    for (const p of presets) {
      if (!seen.includes(p.group)) seen.push(p.group);
    }
    return ['All', ...seen];
  }, [presets]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return presets.filter((p) => {
      if (group !== 'All' && p.group !== group) return false;
      if (!q) return true;
      return p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q);
    });
  }, [presets, query, group]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-6"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-4xl max-h-[80vh] flex flex-col bg-surface-sidebar border border-surface-border rounded-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`Choose a crosshair for ${slotLabel}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-surface-border shrink-0">
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
              <Crosshair className="w-4 h-4" style={{ color: 'var(--brand-accent)' }} />
              Assign crosshair
              <span className="text-zinc-500 font-normal font-mono text-xs">→ {slotLabel}</span>
            </h3>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              Picks from your existing library. The slot stores a reference, so editing or
              deleting the preset later is reflected here.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded text-zinc-500 hover:text-zinc-200 hover:bg-surface-card transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search + groups */}
        <div className="px-5 py-3 border-b border-surface-border space-y-2.5 shrink-0">
          <div className="flex items-center gap-2 bg-surface-card px-2.5 py-1.5 rounded-md border border-surface-border">
            <Search className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${presets.length} reticles…`}
              className="bg-transparent border-none text-zinc-200 placeholder-zinc-500 text-xs focus:outline-none w-full"
            />
            {query && (
              <button onClick={() => setQuery('')} aria-label="Clear search" className="text-zinc-500 hover:text-zinc-300">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
            {groups.map((g) => (
              <button
                key={g}
                onClick={() => setGroup(g)}
                className={`px-2.5 py-1 rounded text-[10px] font-mono tracking-wide whitespace-nowrap border transition-all ${
                  group === g
                    ? 'bg-surface-card font-bold'
                    : 'bg-surface-sidebar text-zinc-400 hover:text-zinc-200 border-surface-border'
                }`}
                style={{
                  color: group === g ? 'var(--brand-accent)' : undefined,
                  borderColor: group === g ? 'var(--brand-accent-border)' : undefined,
                }}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-4">
          {filtered.length === 0 ? (
            <div className="text-center text-zinc-500 text-xs py-12">
              No reticles match “{query}”.
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
              {filtered.map((p) => {
                const selected = p.id === currentPresetId;
                return (
                  <button
                    key={p.id}
                    onClick={() => {
                      onSelect(p.id);
                      onClose();
                    }}
                    title={`${p.name}\nid: ${p.id}`}
                    className={`group relative aspect-square rounded-lg border flex flex-col items-center justify-center gap-1 p-1.5 transition-all ${
                      selected ? 'bg-surface-card' : 'bg-surface-sidebar hover:bg-surface-card border-surface-border'
                    }`}
                    style={{
                      borderColor: selected ? 'var(--brand-accent)' : undefined,
                      boxShadow: selected ? '0 0 12px var(--brand-accent-muted)' : undefined,
                    }}
                  >
                    <div className="flex-1 flex items-center justify-center w-full overflow-hidden">
                      <ReticleRenderer config={p.config} scale={0.55} />
                    </div>
                    <span className="text-[9px] leading-tight text-zinc-400 group-hover:text-zinc-200 text-center line-clamp-2 w-full">
                      {p.name}
                    </span>
                    {selected && (
                      <span
                        className="absolute top-1 right-1 text-[8px] font-mono font-bold px-1 rounded"
                        style={{ backgroundColor: 'var(--brand-accent)', color: '#000' }}
                      >
                        IN USE
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-surface-border flex items-center justify-between shrink-0">
          <span className="text-[11px] text-zinc-500 font-mono">
            {filtered.length} shown · {currentPresetId ? `current: ${currentPresetId}` : 'unassigned'}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onSelect(null);
                onClose();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] text-zinc-400 hover:text-rose-300 border border-surface-border hover:border-rose-500/40 transition-all"
            >
              <Ban className="w-3 h-3" />
              Leave unassigned
            </button>
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded text-[11px] text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
