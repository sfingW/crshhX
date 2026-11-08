import React from 'react';
import { ArrowRightLeft, Pin, Undo2, X } from 'lucide-react';
import type { CrosshairConfig } from '../../types/crosshair';
import type { BackdropOption } from '../TargetBackdrops';
import { ReticleRenderer } from '../ReticleRenderer';
import { diffConfigs, groupDifferences } from '../../lib/configDiff';

/**
 * Preview stage and A/B comparison.
 *
 * The stage is the single place a crosshair is drawn inside the designer, and it
 * draws it with `ReticleRenderer` — the same component the overlay window uses.
 * There is deliberately no second, prettier preview path: a preview that does
 * not match the overlay is worse than no preview.
 *
 * Comparison pins the current crosshair as "A" and keeps editing "B", showing
 * both on the same background at the same magnification, plus a list of what
 * actually differs. Two reticles side by side answer "which looks better"; the
 * list answers "what did I change", which is invisible when the difference is a
 * half-pixel of thickness.
 */

interface PreviewStageProps {
  config: CrosshairConfig;
  scale: number;
  backdrop: BackdropOption;
  isFiring?: boolean;
  isAds?: boolean;
  /** Corner label, used to tell A from B. */
  label?: string;
  /** Enables click-to-fire and right-click-to-ADS simulation. */
  interactive?: boolean;
  onFireStart?: () => void;
  onAdsChange?: (active: boolean) => void;
  className?: string;
}

export const PreviewStage: React.FC<PreviewStageProps> = ({
  config,
  scale,
  backdrop,
  isFiring = false,
  isAds = false,
  label,
  interactive = false,
  onFireStart,
  onAdsChange,
  className = 'h-56',
}) => (
  <div
    className={`w-full ${className} rounded-lg border border-surface-border relative flex items-center justify-center overflow-hidden ${
      interactive ? 'cursor-crosshair' : ''
    } select-none`}
    style={backdrop.backgroundStyle}
    onMouseDown={
      interactive
        ? (e) => {
            if (e.button === 0) onFireStart?.();
            else if (e.button === 2) onAdsChange?.(true);
          }
        : undefined
    }
    onMouseUp={interactive ? (e) => e.button === 2 && onAdsChange?.(false) : undefined}
    onMouseLeave={interactive ? () => onAdsChange?.(false) : undefined}
    onContextMenu={interactive ? (e) => e.preventDefault() : undefined}
  >
    {backdrop.showGridLines && (
      <div
        className="absolute inset-0 pointer-events-none opacity-25"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,.35) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.35) 1px,transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />
    )}
    {backdrop.showFovRings && (
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        {[64, 128, 192].map((size) => (
          <div
            key={size}
            className="absolute rounded-full border border-white/15"
            style={{ width: size, height: size }}
          />
        ))}
      </div>
    )}

    <ReticleRenderer config={config} scale={scale} isFiring={isFiring} isAds={isAds} />

    {label && (
      <div className="absolute top-2 left-2 text-[9px] font-mono uppercase tracking-wider text-zinc-300 pointer-events-none mix-blend-difference">
        {label}
      </div>
    )}
    {interactive && (
      <div className="absolute bottom-2 left-2 text-[9px] font-mono text-zinc-400 pointer-events-none mix-blend-difference">
        L-Click: fire bloom · R-Click: ADS
      </div>
    )}
  </div>
);

/* ------------------------------------------------------------------ */

interface ComparePanelProps {
  /** The pinned "A" variation. */
  pinned: CrosshairConfig;
  /** The live "B" variation. */
  current: CrosshairConfig;
  scale: number;
  backdrop: BackdropOption;
  /** Re-pins A to the current values. */
  onUpdatePin: () => void;
  /** Applies A back onto the working crosshair. */
  onRestorePinned: () => void;
  onClear: () => void;
}

export const ComparePanel: React.FC<ComparePanelProps> = ({
  pinned,
  current,
  scale,
  backdrop,
  onUpdatePin,
  onRestorePinned,
  onClear,
}) => {
  const differences = diffConfigs(pinned, current);
  const grouped = groupDifferences(differences);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 font-semibold">
          Comparing A and B
        </span>
        <button
          type="button"
          onClick={onClear}
          aria-label="Stop comparing"
          className="p-1 rounded text-zinc-500 hover:text-zinc-200 hover:bg-surface-card transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <PreviewStage config={pinned} scale={scale} backdrop={backdrop} label="A · pinned" className="h-32" />
        <PreviewStage config={current} scale={scale} backdrop={backdrop} label="B · editing" className="h-32" />
      </div>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={onUpdatePin}
          className="flex items-center gap-1.5 px-2 py-1 rounded border border-surface-border bg-surface-card text-[10.5px] text-zinc-300 hover:text-zinc-100 transition-colors"
        >
          <ArrowRightLeft className="w-3 h-3" />
          Set A to current
        </button>
        <button
          type="button"
          onClick={onRestorePinned}
          className="flex items-center gap-1.5 px-2 py-1 rounded border border-surface-border bg-surface-card text-[10.5px] text-zinc-300 hover:text-zinc-100 transition-colors"
        >
          <Undo2 className="w-3 h-3" />
          Revert to A
        </button>
      </div>

      {differences.length === 0 ? (
        <p className="text-[10.5px] text-zinc-500 leading-snug">
          A and B are identical. Change anything in the inspector and the differences will be listed
          here.
        </p>
      ) : (
        <div className="space-y-2">
          <p className="text-[10px] font-mono text-zinc-600">
            {differences.length} difference{differences.length === 1 ? '' : 's'}
          </p>
          {grouped.map(({ group, items }) => (
            <div key={group}>
              <span className="text-[9.5px] uppercase font-mono tracking-wider text-zinc-600 block mb-1">
                {group}
              </span>
              <table className="w-full text-[10.5px]">
                <tbody>
                  {items.map((item) => (
                    <tr key={item.key} className="border-t border-surface-border/60">
                      <td className="py-1 pr-2 text-zinc-400 align-top">{item.label}</td>
                      <td className="py-1 pr-2 font-mono text-zinc-500 align-top whitespace-nowrap">
                        {item.a}
                      </td>
                      <td className="py-1 font-mono text-zinc-200 align-top whitespace-nowrap">
                        {item.b}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/** The button shown in the preview header when nothing is pinned yet. */
export const PinCompareButton: React.FC<{ onPin: () => void }> = ({ onPin }) => (
  <button
    type="button"
    onClick={onPin}
    title="Pin this crosshair as A and keep editing as B"
    className="flex items-center gap-1.5 px-2 py-0.5 rounded border border-surface-border text-[10px] font-mono text-zinc-400 hover:text-zinc-100 hover:bg-surface-card transition-colors"
  >
    <Pin className="w-3 h-3" />
    Compare
  </button>
);
