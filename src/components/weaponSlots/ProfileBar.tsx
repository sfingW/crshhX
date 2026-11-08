import React, { useState } from 'react';
import { Copy, Gamepad2, Plus, Trash2, X } from 'lucide-react';
import type { WeaponSlotProfile } from '../../lib/weaponSlots/types';

/**
 * Profile selector for game-specific weapon-slot configurations.
 *
 * A profile is a named slot table that can optionally be tied to one or more
 * executables. crshhx does not detect games by any privileged means — it either
 * uses the profile you click, or, if you enable automatic selection, compares
 * the ordinary foreground-window executable name against the names you typed in.
 */

interface ProfileBarProps {
  profiles: WeaponSlotProfile[];
  activeProfileId: string;
  /** Profile actually driving the overlay right now (may differ under auto-select). */
  liveProfileId: string | null;
  liveProfileName: string | null;
  autoSelect: boolean;
  foregroundProcessName: string | null;
  foregroundTrackingAvailable: boolean;
  onSelect: (profileId: string) => void;
  onAdd: (template: 'blank' | 'fortnite' | 'cs2') => void;
  onRename: (profileId: string, name: string) => void;
  onDuplicate: (profileId: string) => void;
  onRemove: (profileId: string) => void;
  onSetProcessNames: (profileId: string, names: string[]) => void;
  onToggleRestrict: (profileId: string, restrict: boolean) => void;
}

export const ProfileBar: React.FC<ProfileBarProps> = ({
  profiles,
  activeProfileId,
  liveProfileId,
  liveProfileName,
  autoSelect,
  foregroundProcessName,
  foregroundTrackingAvailable,
  onSelect,
  onAdd,
  onRename,
  onDuplicate,
  onRemove,
  onSetProcessNames,
  onToggleRestrict,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');
  const [configOpenId, setConfigOpenId] = useState<string | null>(null);
  const [processDraft, setProcessDraft] = useState('');

  const active = profiles.find((p) => p.id === activeProfileId);

  const beginRename = (p: WeaponSlotProfile) => {
    setEditingId(p.id);
    setDraftName(p.name);
  };

  const commitRename = (p: WeaponSlotProfile) => {
    if (draftName.trim() && draftName.trim() !== p.name) onRename(p.id, draftName.trim());
    setEditingId(null);
  };

  const openConfig = (p: WeaponSlotProfile) => {
    setConfigOpenId(configOpenId === p.id ? null : p.id);
    setProcessDraft(p.matchProcessNames.join(', '));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 font-semibold mr-1">
          Profiles
        </span>

        {profiles.map((p) => {
          const isActive = p.id === activeProfileId;
          const isLive = p.id === liveProfileId;
          const isEditing = editingId === p.id;

          return (
            <div key={p.id} className="relative">
              {isEditing ? (
                <input
                  autoFocus
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  onBlur={() => commitRename(p)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitRename(p);
                    if (e.key === 'Escape') setEditingId(null);
                  }}
                  aria-label="Profile name"
                  className="px-2.5 py-1 rounded text-[11px] bg-surface-card border text-zinc-100 focus:outline-none w-32"
                  style={{ borderColor: 'var(--brand-accent)' }}
                />
              ) : (
                <button
                  type="button"
                  onClick={() => onSelect(p.id)}
                  onDoubleClick={() => beginRename(p)}
                  title={
                    p.matchProcessNames.length
                      ? `${p.name} — apps: ${p.matchProcessNames.join(', ')}\nDouble-click to rename`
                      : `${p.name}\nDouble-click to rename`
                  }
                  className={`group flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] border transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-surface-card font-semibold'
                      : 'bg-surface-sidebar text-zinc-400 hover:text-zinc-200 border-surface-border'
                  }`}
                  style={{
                    color: isActive ? 'var(--brand-accent)' : undefined,
                    borderColor: isActive ? 'var(--brand-accent-border)' : undefined,
                  }}
                >
                  {p.matchProcessNames.length > 0 && <Gamepad2 className="w-3 h-3" />}
                  <span>{p.name}</span>
                  {p.isDefault && (
                    <span className="text-[8px] font-mono text-zinc-600 uppercase">default</span>
                  )}
                  {isLive && autoSelect && !isActive && (
                    <span
                      className="text-[8px] font-mono px-1 rounded"
                      style={{ backgroundColor: 'var(--brand-accent)', color: '#000' }}
                    >
                      LIVE
                    </span>
                  )}
                </button>
              )}
            </div>
          );
        })}

        <div className="flex items-center gap-1 ml-1">
          <button
            type="button"
            onClick={() => onAdd('blank')}
            className="flex items-center gap-1 px-2 py-1 rounded text-[11px] text-zinc-400 hover:text-zinc-100 border border-surface-border hover:border-zinc-600 transition-all"
          >
            <Plus className="w-3 h-3" />
            <span>Profile</span>
          </button>
          <button
            type="button"
            onClick={() => onAdd('fortnite')}
            className="px-2 py-1 rounded text-[10px] font-mono text-zinc-500 hover:text-zinc-200 border border-surface-border transition-all"
            title="Add a ready-made Fortnite profile"
          >
            + Fortnite
          </button>
          <button
            type="button"
            onClick={() => onAdd('cs2')}
            className="px-2 py-1 rounded text-[10px] font-mono text-zinc-500 hover:text-zinc-200 border border-surface-border transition-all"
            title="Add a ready-made CS2 profile"
          >
            + CS2
          </button>
        </div>
      </div>

      {/* Active profile toolbar */}
      {active && (
        <div className="flex items-center gap-2 text-[10px] text-zinc-500 pl-1 flex-wrap">
          <button
            type="button"
            onClick={() => active && beginRename(active)}
            className="hover:text-zinc-200 transition-colors"
          >
            Rename
          </button>
          <span className="text-zinc-700">·</span>
          <button
            type="button"
            onClick={() => onDuplicate(active.id)}
            className="flex items-center gap-1 hover:text-zinc-200 transition-colors"
          >
            <Copy className="w-2.5 h-2.5" />
            Duplicate
          </button>
          <span className="text-zinc-700">·</span>
          <button
            type="button"
            onClick={() => openConfig(active)}
            className="flex items-center gap-1 hover:text-zinc-200 transition-colors"
          >
            <Gamepad2 className="w-2.5 h-2.5" />
            Game association
            {active.matchProcessNames.length > 0 && (
              <span className="font-mono text-zinc-400">({active.matchProcessNames.length})</span>
            )}
          </button>
          {!active.isDefault && (
            <>
              <span className="text-zinc-700">·</span>
              <button
                type="button"
                onClick={() => onRemove(active.id)}
                className="flex items-center gap-1 hover:text-rose-400 transition-colors"
              >
                <Trash2 className="w-2.5 h-2.5" />
                Delete
              </button>
            </>
          )}

          {autoSelect && (
            <>
              <span className="text-zinc-700">·</span>
              <span className="font-mono">
                {foregroundTrackingAvailable
                  ? `foreground: ${foregroundProcessName ?? 'unknown'}`
                  : 'foreground tracking unavailable'}
                {liveProfileName ? ` → ${liveProfileName}` : ''}
              </span>
            </>
          )}
        </div>
      )}

      {/* Game association editor */}
      {configOpenId && active && configOpenId === active.id && (
        <div className="mx-1 p-3 rounded-lg border border-surface-border bg-surface-card space-y-2.5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[11px] font-semibold text-zinc-200">
                Game association — {active.name}
              </div>
              <p className="text-[10px] text-zinc-500 leading-relaxed mt-0.5 max-w-2xl">
                Type the executable names this profile belongs to, comma separated
                (e.g. <span className="font-mono text-zinc-400">fortniteclient-win64-shipping.exe</span>).
                A partial name also matches. crshhx compares these against the ordinary
                foreground-window executable — it never reads game memory or injects anything.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setConfigOpenId(null)}
              aria-label="Close game association"
              className="p-1 text-zinc-500 hover:text-zinc-200 shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <input
            type="text"
            value={processDraft}
            onChange={(e) => setProcessDraft(e.target.value)}
            placeholder="cs2.exe, hl2.exe"
            aria-label="Executable names"
            className="w-full px-2.5 py-1.5 rounded text-[11px] font-mono bg-surface-base border border-surface-border text-zinc-200 placeholder-zinc-600 focus:outline-none"
            style={{ borderColor: 'var(--brand-accent-border)' }}
          />

          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={active.restrictToMatchedProcesses}
              onChange={(e) => onToggleRestrict(active.id, e.target.checked)}
              className="mt-0.5 accent-[var(--brand-accent)]"
            />
            <span className="text-[10px] text-zinc-400 leading-relaxed">
              <span className="text-zinc-200 font-medium">Only switch while one of these apps is in the foreground.</span>
              {' '}Strictly enforced: if crshhx cannot read the foreground application, this profile
              will not switch at all rather than switching in the wrong game.
            </span>
          </label>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setConfigOpenId(null)}
              className="px-2.5 py-1 rounded text-[10px] text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                onSetProcessNames(active.id, processDraft.split(','));
                setConfigOpenId(null);
              }}
              className="px-2.5 py-1 rounded text-[10px] font-semibold transition-colors"
              style={{ backgroundColor: 'var(--brand-accent)', color: '#000' }}
            >
              Save association
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
