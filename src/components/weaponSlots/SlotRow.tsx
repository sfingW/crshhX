import React from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, Crosshair, Trash2 } from 'lucide-react';
import { ReticleRenderer } from '../ReticleRenderer';
import { KeyCaptureButton, MOUSE_BUTTON_LABELS } from './KeyCaptureButton';
import { formatBinding, mouseButtonIndex } from '../../lib/weaponSlots/keys';
import type { CrosshairConfig } from '../../types/crosshair';
import type { SlotValidation } from '../../lib/weaponSlots/bindingRules';
import type {
  InputTransportCapabilities,
  SlotKeyBinding,
  WeaponSlot,
} from '../../lib/weaponSlots/types';

/** One row of the Weapon Slot Crosshairs table. */

interface SlotRowProps {
  slot: WeaponSlot;
  isActive: boolean;
  validation: SlotValidation;
  /** Resolved preset, or null when unassigned/deleted. */
  preset: CrosshairConfig | null;
  /** True when the stored id no longer exists in the library. */
  presetMissing: boolean;
  capabilities: InputTransportCapabilities;
  /**
   * Feature-level master switch is off. This dims the row and explains that no
   * key will switch yet — it deliberately does *not* disable the controls, so a
   * user can set the whole table up before turning the feature on.
   */
  inactive: boolean;
  isFirst: boolean;
  isLast: boolean;
  onRename: (name: string) => void;
  onCommitBinding: (binding: SlotKeyBinding | null) => void;
  onPickPreset: () => void;
  onClearPreset: () => void;
  onToggleEnabled: () => void;
  onRemove: () => void;
  onMove: (direction: -1 | 1) => void;
  onRecordingChange: (recording: boolean) => void;
}

export function describeMouseBinding(binding: SlotKeyBinding): string {
  const idx = mouseButtonIndex(binding.code);
  if (idx !== null && MOUSE_BUTTON_LABELS[idx]) {
    return `${formatBinding(binding)} · ${MOUSE_BUTTON_LABELS[idx]}`;
  }
  return formatBinding(binding);
}

export const SlotRow: React.FC<SlotRowProps> = ({
  slot,
  isActive,
  validation,
  preset,
  presetMissing,
  capabilities,
  inactive,
  isFirst,
  isLast,
  onRename,
  onCommitBinding,
  onPickPreset,
  onClearPreset,
  onToggleEnabled,
  onRemove,
  onMove,
  onRecordingChange,
}) => {
  const blocking = validation.blocking;
  const dimmed = inactive || !slot.enabled;
  const tooltip = [
    inactive
      ? 'Weapon Slot Crosshairs is switched off — changes are saved, but no key will change the reticle yet.'
      : null,
    ...validation.issues.map((i) => i.message),
  ]
    .filter(Boolean)
    .join('\n');

  return (
    <div
      className={`grid items-center gap-3 px-4 py-3 border-b border-surface-border transition-colors ${
        isActive ? 'bg-brand-accentMuted' : 'hover:bg-surface-card/40'
      } ${dimmed ? 'opacity-55' : ''}`}
      style={{
        gridTemplateColumns: '2.5rem minmax(8rem,1.3fr) minmax(11rem,1.2fr) minmax(13rem,1.7fr) 4.5rem 4.5rem',
        borderLeft: isActive ? '2px solid var(--brand-accent)' : '2px solid transparent',
      }}
      title={tooltip || undefined}
    >
      {/* 1. Slot number */}
      <div className="flex items-center gap-1.5">
        <span
          className="w-6 h-6 rounded flex items-center justify-center font-mono text-[11px] font-bold shrink-0"
          style={{
            backgroundColor: isActive ? 'var(--brand-accent)' : '#202024',
            color: isActive ? '#000' : '#a1a1aa',
          }}
        >
          {slot.index}
        </span>
        {blocking && (
          <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" aria-label="Invalid binding" />
        )}
      </div>

      {/* 2. Editable name */}
      <input
        type="text"
        value={slot.name}
        onChange={(e) => onRename(e.target.value)}
        onBlur={(e) => {
          if (!e.target.value.trim()) onRename(slot.name);
        }}
        aria-label={`Slot ${slot.index} name`}
        placeholder={`Slot ${slot.index}`}
        className="bg-transparent border border-transparent hover:border-surface-borderLight focus:border-surface-borderLight rounded px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:bg-surface-card w-full min-w-0 disabled:cursor-not-allowed"
      />

      {/* 3. Activation key */}
      <KeyCaptureButton
        binding={slot.binding}
        onCommit={onCommitBinding}
        capabilities={capabilities}
        issues={validation.issues.filter(
          (i) => i.code !== 'preset-unassigned' && i.code !== 'preset-missing',
        )}
        onRecordingChange={onRecordingChange}
        ariaLabel={`Activation key for slot ${slot.index} ${slot.name}`}
      />

      {/* 4. Assigned crosshair + preview */}
      <div className="flex items-center gap-2 min-w-0">
        <div
          className="w-11 h-11 rounded border border-surface-border bg-[#0d0e11] flex items-center justify-center shrink-0 overflow-hidden"
          aria-hidden="true"
        >
          {preset ? (
            <ReticleRenderer config={preset} scale={0.42} />
          ) : (
            <Crosshair className="w-4 h-4 text-zinc-700" />
          )}
        </div>

        <div className="flex flex-col gap-1 min-w-0 flex-1">
          <button
            type="button"
            onClick={onPickPreset}
            className={`text-left text-[11px] truncate rounded px-2 py-1 border transition-colors w-full ${
              presetMissing
                ? 'text-rose-300 border-rose-500/40 bg-rose-500/10'
                : preset
                  ? 'text-zinc-200 border-surface-border bg-surface-card hover:bg-surface-cardHover'
                  : 'text-zinc-500 italic border-dashed border-surface-borderLight hover:text-zinc-300'
            } disabled:cursor-not-allowed`}
          >
            {presetMissing
              ? 'Missing — preset was deleted'
              : preset
                ? preset.name
                : 'Unassigned — keeps current crosshair'}
          </button>

          {preset && !presetMissing && (
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-mono text-zinc-600 truncate">{preset.id}</span>
              <button
                type="button"
                onClick={onClearPreset}
                className="text-[9px] font-mono text-zinc-600 hover:text-rose-400 transition-colors shrink-0 disabled:cursor-not-allowed"
              >
                clear
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 5. Enabled toggle */}
      <button
        type="button"
        onClick={onToggleEnabled}
        role="switch"
        aria-checked={slot.enabled}
        aria-label={`Slot ${slot.index} ${slot.enabled ? 'enabled' : 'disabled'}`}
        className="relative w-9 h-5 rounded-full transition-colors shrink-0 justify-self-center disabled:cursor-not-allowed"
        style={{ backgroundColor: slot.enabled ? 'var(--brand-accent)' : '#2c2c31' }}
      >
        <span
          className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all"
          style={{ left: slot.enabled ? '1.125rem' : '0.125rem' }}
        />
      </button>

      {/* 6. Row actions */}
      <div className="flex items-center gap-0.5 justify-self-end">
        <div className="flex flex-col">
          <button
            type="button"
            onClick={() => onMove(-1)}
            disabled={isFirst}
            aria-label={`Move slot ${slot.index} up`}
            className="p-0.5 text-zinc-600 hover:text-zinc-200 disabled:opacity-25 disabled:cursor-not-allowed"
          >
            <ChevronUp className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={() => onMove(1)}
            disabled={isLast}
            aria-label={`Move slot ${slot.index} down`}
            className="p-0.5 text-zinc-600 hover:text-zinc-200 disabled:opacity-25 disabled:cursor-not-allowed"
          >
            <ChevronDown className="w-3 h-3" />
          </button>
        </div>
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove slot ${slot.index}`}
          className="p-1.5 text-zinc-600 hover:text-rose-400 transition-colors disabled:cursor-not-allowed"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
