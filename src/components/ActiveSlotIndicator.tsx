import React from 'react';
import { Crosshair, Zap } from 'lucide-react';
import type { WeaponSlotStatus } from '../lib/weaponSlots/types';

/**
 * Active-slot indicator for the crshhx status bar.
 *
 * Deliberately small and static: it must confirm a switch happened without ever
 * becoming a distraction during a match. No toasts, no animation beyond a brief
 * accent pulse, and nothing that can steal focus from the game.
 */

interface ActiveSlotIndicatorProps {
  status: WeaponSlotStatus | null;
  /** True for a moment after a switch, to give brief visual confirmation. */
  pulse: boolean;
}

export const ActiveSlotIndicator: React.FC<ActiveSlotIndicatorProps> = ({ status, pulse }) => {
  const enabled = !!status?.enabled;
  const slot = status?.activeSlot ?? null;
  const hasSlot = !!slot?.slotId;

  const label = !enabled
    ? 'Slots off'
    : hasSlot
      ? `Active slot: ${slot!.slotIndex} — ${slot!.slotName}`
      : 'No slot active';

  return (
    <div
      className="flex items-center gap-2 px-2.5 py-1 rounded-md border text-[11px] font-mono transition-all max-w-[19rem]"
      style={{
        backgroundColor: hasSlot && enabled ? 'var(--brand-accent-muted)' : '#1b1c22',
        borderColor:
          hasSlot && enabled
            ? 'var(--brand-accent-border)'
            : '#262832',
        color: hasSlot && enabled ? 'var(--brand-accent)' : '#71717a',
        boxShadow: pulse && hasSlot ? '0 0 10px var(--brand-accent-muted)' : 'none',
      }}
      title={
        status
          ? [
              label,
              `Profile: ${status.activeProfileName ?? '—'}`,
              `Input: ${status.transport.name}${status.degraded ? ' (fallback)' : ''}`,
              slot?.presetId ? `Crosshair: ${slot.presetId}` : 'Crosshair: —',
              status.lastIgnore?.detail ? `Last key ignored: ${status.lastIgnore.detail}` : '',
            ]
              .filter(Boolean)
              .join('\n')
          : 'Weapon Slot Crosshairs'
      }
    >
      {hasSlot && enabled ? (
        <Crosshair className="w-3.5 h-3.5 shrink-0" />
      ) : (
        <Zap className="w-3.5 h-3.5 shrink-0" />
      )}
      <span className="truncate">{label}</span>
    </div>
  );
};
