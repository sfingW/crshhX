import React from 'react';
import {
  Crosshair,
  Sliders,
  Move,
  Keyboard,
  ShieldCheck,
  Star,
  Activity,
  Layers,
  Sparkles,
} from 'lucide-react';

export type ActiveNavView = 'vault' | 'favorites' | 'designer' | 'calibration' | 'keybinds' | 'system';

interface SidebarProps {
  activeView: ActiveNavView;
  onSelectView: (view: ActiveNavView) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeView, onSelectView }) => {
  return (
    <aside className="w-56 bg-surface-sidebar border-r border-surface-border flex flex-col justify-between shrink-0 select-none text-zinc-300">
      {/* Brand Header */}
      <div>
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-border">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-zinc-100 text-sm font-mono tracking-tight">
              CRSHHX
            </span>
            <span
              className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold"
              style={{
                backgroundColor: 'var(--brand-accent-muted)',
                color: 'var(--brand-accent)',
                border: '1px solid var(--brand-accent-border)',
              }}
            >
              PRO
            </span>
          </div>
          <span className="text-[10px] font-mono text-zinc-500">v2.4</span>
        </div>

        {/* Navigation Sections */}
        <div className="p-3 space-y-5 text-xs">
          {/* Collection Section */}
          <div className="space-y-1">
            <span className="px-3 text-[10px] uppercase font-mono tracking-wider text-zinc-500 font-semibold block">
              Collection
            </span>
            <button
              onClick={() => onSelectView('vault')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md font-medium transition-all ${
                activeView === 'vault'
                  ? 'bg-surface-card font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-surface-cardHover'
              }`}
              style={{
                color: activeView === 'vault' ? 'var(--brand-accent)' : undefined,
              }}
            >
              <Crosshair className="w-4 h-4" />
              <span>Crosshair Vault</span>
            </button>

            <button
              onClick={() => onSelectView('favorites')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md font-medium transition-all ${
                activeView === 'favorites'
                  ? 'bg-surface-card font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-surface-cardHover'
              }`}
              style={{
                color: activeView === 'favorites' ? 'var(--brand-accent)' : undefined,
              }}
            >
              <Star className="w-4 h-4" />
              <span>Saved & Favorites</span>
            </button>
          </div>

          {/* Studio Section */}
          <div className="space-y-1">
            <span className="px-3 text-[10px] uppercase font-mono tracking-wider text-zinc-500 font-semibold block">
              Studio
            </span>
            <button
              onClick={() => onSelectView('designer')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md font-medium transition-all ${
                activeView === 'designer'
                  ? 'bg-surface-card font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-surface-cardHover'
              }`}
              style={{
                color: activeView === 'designer' ? 'var(--brand-accent)' : undefined,
              }}
            >
              <Sliders className="w-4 h-4" />
              <span>Reticle Designer</span>
            </button>

            <button
              onClick={() => onSelectView('calibration')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md font-medium transition-all ${
                activeView === 'calibration'
                  ? 'bg-surface-card font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-surface-cardHover'
              }`}
              style={{
                color: activeView === 'calibration' ? 'var(--brand-accent)' : undefined,
              }}
            >
              <Move className="w-4 h-4" />
              <span>4:3 & Position</span>
            </button>
          </div>

          {/* Controls Section */}
          <div className="space-y-1">
            <span className="px-3 text-[10px] uppercase font-mono tracking-wider text-zinc-500 font-semibold block">
              Controls
            </span>
            <button
              onClick={() => onSelectView('keybinds')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md font-medium transition-all ${
                activeView === 'keybinds'
                  ? 'bg-surface-card font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-surface-cardHover'
              }`}
              style={{
                color: activeView === 'keybinds' ? 'var(--brand-accent)' : undefined,
              }}
            >
              <Keyboard className="w-4 h-4" />
              <span>Keybinds & ADS</span>
            </button>
          </div>

          {/* System Section */}
          <div className="space-y-1">
            <span className="px-3 text-[10px] uppercase font-mono tracking-wider text-zinc-500 font-semibold block">
              System
            </span>
            <button
              onClick={() => onSelectView('system')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md font-medium transition-all ${
                activeView === 'system'
                  ? 'bg-surface-card font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-surface-cardHover'
              }`}
              style={{
                color: activeView === 'system' ? 'var(--brand-accent)' : undefined,
              }}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Ban-Safety Audit</span>
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Telemetry Chip */}
      <div className="p-4 border-t border-surface-border text-[10px] font-mono text-zinc-500 flex items-center justify-between">
        <span>ZERO DETOUR</span>
        <span className="flex items-center gap-1.5" style={{ color: 'var(--brand-accent)' }}>
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: 'var(--brand-accent)' }} />
          OS HOOK
        </span>
      </div>
    </aside>
  );
};
