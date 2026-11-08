import React from 'react';
import { CrosshairConfig, StretchedResolutionMode } from '../../types/crosshair';
import { RotateCcw, Minus, Plus } from 'lucide-react';

interface PositionViewProps {
  config: CrosshairConfig;
  onChange: (updated: Partial<CrosshairConfig>) => void;
  onResetCenter: () => void;
}

export const PositionView: React.FC<PositionViewProps> = ({
  config,
  onChange,
  onResetCenter,
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
      </div>
    </div>
  );
};
