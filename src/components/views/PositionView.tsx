import React, { useEffect, useState } from 'react';
import { AppSettings, CrosshairConfig, StretchedResolutionMode } from '../../types/crosshair';
import type { DisplaysSnapshot } from '../../types/electron';
import {
  AUTO_MONITOR,
  effectiveSelection,
  formatAutoOption,
  formatDisplayOption,
  isPreferenceDisconnected,
} from '../../lib/monitors';
import { RotateCcw, Minus, Plus } from 'lucide-react';

interface PositionViewProps {
  config: CrosshairConfig;
  onChange: (updated: Partial<CrosshairConfig>) => void;
  onResetCenter: () => void;
  settings: AppSettings;
  onUpdateSettings: (patch: Partial<AppSettings>) => void;
}

/**
 * Target Monitor section.
 *
 * The list is enumerated live by the main process from Electron's display APIs
 * on mount and refreshed whenever a display is connected, disconnected or
 * changes metrics — nothing about monitors is hardcoded. When the stored
 * preference points at a display that is no longer connected, the dropdown
 * shows "Automatic" and says so; the preference itself stays stored, so
 * replugging the monitor restores the selection.
 */
const TargetMonitorSection: React.FC<{
  settings: AppSettings;
  onUpdateSettings: (patch: Partial<AppSettings>) => void;
}> = ({ settings, onUpdateSettings }) => {
  const [snapshot, setSnapshot] = useState<DisplaysSnapshot | null>(null);
  const desktopApi = window.electronAPI;

  useEffect(() => {
    let cancelled = false;
    const refresh = () => {
      desktopApi
        ?.listDisplays?.()
        .then((next) => {
          if (!cancelled && next) setSnapshot(next);
        })
        .catch(() => undefined);
    };
    refresh();
    const off = desktopApi?.onDisplaysChanged?.(() => refresh());
    return () => {
      cancelled = true;
      off?.();
    };
  }, [desktopApi]);

  const displays = snapshot?.displays ?? [];
  const selection = effectiveSelection(displays, settings.selectedMonitor);
  const disconnected = isPreferenceDisconnected(displays, settings.selectedMonitor);
  const target = displays.find((d) => d.id === snapshot?.targetId) ?? null;

  return (
    <div className="bg-[#18181b] border border-[#26262a] rounded-lg p-5 space-y-4">
      <div>
        <h3 className="font-bold text-sm text-zinc-200">Target Monitor</h3>
        <p className="text-zinc-400 text-xs mt-0.5">
          Which display the crosshair overlay is centered on. Automatic follows the Windows
          primary display, wherever it is.
        </p>
      </div>

      {desktopApi?.listDisplays ? (
        <>
          <select
            value={selection}
            onChange={(e) => onUpdateSettings({ selectedMonitor: Number(e.target.value) })}
            aria-label="Target monitor"
            className="w-full bg-[#141416] border border-[#26262a] rounded-lg px-3 py-2.5 text-sm text-zinc-200 font-mono focus:outline-none focus:border-zinc-500"
          >
            <option value={AUTO_MONITOR}>{formatAutoOption()}</option>
            {displays.map((display) => (
              <option key={display.id} value={display.id}>
                {formatDisplayOption(display)}
              </option>
            ))}
          </select>

          <div className="text-[11px] text-zinc-500 font-mono">
            {displays.length === 0
              ? 'No displays reported yet.'
              : `${displays.length} display${displays.length === 1 ? '' : 's'} detected${
                  target ? ` · overlay on Display ${target.index + 1}` : ''
                }`}
          </div>

          {disconnected && (
            <p className="text-[11px] text-amber-400">
              The selected display is not connected — the overlay follows the primary display
              until it returns. Your choice is remembered.
            </p>
          )}
        </>
      ) : (
        <p className="text-xs text-zinc-500">
          Display detection runs in the desktop app; connected monitors are listed here.
        </p>
      )}
    </div>
  );
};

export const PositionView: React.FC<PositionViewProps> = ({
  config,
  onChange,
  onResetCenter,
  settings,
  onUpdateSettings,
}) => {
  return (
    <div className="flex-1 p-8 bg-[#121214] text-zinc-100 overflow-y-auto select-none">
      <div className="max-w-3xl space-y-8">
        <div>
          <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
            Position & Display Calibration
          </h2>
          <p className="text-zinc-400 text-xs mt-1">
            Fine-tune subpixel offsets and apply 4:3 stretched resolution compensation matrices.
          </p>
        </div>

        {/* Target Monitor Card */}
        <TargetMonitorSection settings={settings} onUpdateSettings={onUpdateSettings} />

        {/* 4:3 Stretched Resolution Card */}
        <div className="bg-[#18181b] border border-[#26262a] rounded-lg p-5 space-y-4">
          <div>
            <h3 className="font-bold text-sm text-zinc-200">Stretched Resolution Engine (CS2 / Fortnite)</h3>
            <p className="text-zinc-400 text-xs mt-0.5">
              Pre-compresses horizontal coordinates so circles and squares don't distort when your GPU stretches the screen.
            </p>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {[
              { id: 'none', label: '16:9 Native', ratio: 1.0 },
              { id: '4:3', label: '4:3 Stretched', ratio: 0.75 },
              { id: '16:10', label: '16:10 Stretched', ratio: 0.90 },
              { id: '5:4', label: '5:4 Stretched', ratio: 0.703 },
            ].map((m) => (
              <button
                key={m.id}
                onClick={() =>
                  onChange({
                    stretchedMode: m.id as StretchedResolutionMode,
                    stretchCompressionRatio: m.ratio,
                  })
                }
                className={`p-3 rounded-lg border text-xs font-mono transition-all text-center ${
                  config.stretchedMode === m.id
                    ? 'bg-surface-card'
                    : 'bg-surface-card text-zinc-400 border-surface-border hover:text-zinc-200'
                }`}
                style={{
                  borderColor: config.stretchedMode === m.id ? 'var(--brand-accent)' : undefined,
                  color: config.stretchedMode === m.id ? 'var(--brand-accent)' : undefined,
                }}
              >
                <div className="font-bold">{m.label}</div>
                <div className="text-[10px] text-zinc-500 mt-0.5">λ = {m.ratio.toFixed(2)}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Subpixel Nudge Card */}
        <div className="bg-[#18181b] border border-[#26262a] rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-zinc-200">Subpixel Screen Nudge</h3>
              <p className="text-zinc-400 text-xs mt-0.5">Adjust reticle center by 1-pixel increments</p>
            </div>
            <button
              onClick={onResetCenter}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#202024] hover:bg-[#27272b] border border-[#2b2b30] rounded text-xs text-zinc-300 font-mono"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Center (0,0)
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2">
            {/* X Offset */}
            <div className="p-4 bg-[#141416] border border-[#222226] rounded-lg flex items-center justify-between">
              <span className="font-mono text-zinc-400 font-medium">X OFFSET</span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => onChange({ offsetX: config.offsetX - 1 })}
                  className="p-1.5 bg-[#202024] hover:bg-[#27272b] rounded text-zinc-300"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="w-14 text-center font-mono font-bold" style={{ color: 'var(--brand-accent)' }}>
                  {config.offsetX >= 0 ? `+${config.offsetX}` : config.offsetX} px
                </span>
                <button
                  onClick={() => onChange({ offsetX: config.offsetX + 1 })}
                  className="p-1.5 bg-[#202024] hover:bg-[#27272b] rounded text-zinc-300"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Y Offset */}
            <div className="p-4 bg-[#141416] border border-[#222226] rounded-lg flex items-center justify-between">
              <span className="font-mono text-zinc-400 font-medium">Y OFFSET</span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => onChange({ offsetY: config.offsetY - 1 })}
                  className="p-1.5 bg-[#202024] hover:bg-[#27272b] rounded text-zinc-300"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="w-14 text-center font-mono font-bold" style={{ color: 'var(--brand-accent)' }}>
                  {config.offsetY >= 0 ? `+${config.offsetY}` : config.offsetY} px
                </span>
                <button
                  onClick={() => onChange({ offsetY: config.offsetY + 1 })}
                  className="p-1.5 bg-[#202024] hover:bg-[#27272b] rounded text-zinc-300"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Background Operation Card */}
        <div className="bg-[#18181b] border border-[#26262a] rounded-lg p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-sm text-zinc-200">
                Keep overlays running when the window is closed
              </h3>
              <p className="text-zinc-400 text-xs mt-0.5 max-w-xl">
                Closing the studio hides it to the system tray instead of exiting. Overlays,
                global hotkeys and weapon-slot switching stay active; reopen from the tray
                icon. Quit crshhx from the tray menu to stop everything — overlays only live
                while the application process does.
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings.keepOverlaysOnClose}
              onChange={(e) => onUpdateSettings({ keepOverlaysOnClose: e.target.checked })}
              aria-label="Keep overlays running when the window is closed"
              className="w-4 h-4 accent-emerald-500 cursor-pointer shrink-0"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
