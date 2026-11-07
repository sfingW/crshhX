import React from 'react';
import { CrosshairConfig, AppSettings } from '../types/crosshair';
import {
  ShieldCheck,
  Trophy,
  Power,
  Command,
  Activity,
  Cpu,
  Layers,
} from 'lucide-react';

interface TopNavProps {
  currentConfig: CrosshairConfig;
  appSettings: AppSettings;
  onToggleOverlay: () => void;
  onOpenVault: () => void;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  currentConfig,
  appSettings,
  onToggleOverlay,
  onOpenVault,
}) => {
  return (
    <header className="flex items-center justify-between px-5 py-2.5 bg-panel-base border-b border-panel-border select-none">
      {/* Brand & Kernel Telemetry */}
      <div className="flex items-center gap-4">
        {/* macOS traffic dots styling */}
        <div className="flex items-center gap-1.5 mr-1">
          <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
          <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
          <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
        </div>

        <div className="flex items-center gap-2.5">
          <span className="font-extrabold tracking-tighter text-zinc-100 text-sm font-mono">
            CRSHHX<span className="text-zinc-500 font-normal">/OS</span>
          </span>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono text-zinc-400 bg-panel-subtle border border-panel-border">
            v2.4.1-prod
          </span>
        </div>

        <div className="h-3 w-[1px] bg-panel-border hidden sm:block" />

        {/* Ban-Safety Protocol Badge */}
        <div className="hidden md:flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-950/40 border border-emerald-800/40 text-[10px] font-mono text-emerald-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span>ZERO-INJECTION OS LAYER (VANGUARD/VAC SAFE)</span>
        </div>
      </div>

      {/* Active Profile Info */}
      <div className="hidden lg:flex items-center gap-2 font-mono text-xs bg-panel-subtle px-3 py-1 rounded-lg border border-panel-border">
        <span className="text-zinc-500 text-[10px] uppercase tracking-wider">Active Profile:</span>
        <div className="flex items-center gap-1.5 text-zinc-200 font-medium">
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: currentConfig.primaryColor }}
          />
          <span>{currentConfig.name}</span>
        </div>
      </div>

      {/* Control Actions & Overlay State */}
      <div className="flex items-center gap-2.5">
        {/* Performance Metric */}
        <div className="hidden xl:flex items-center gap-1.5 text-[10px] font-mono text-zinc-400 bg-panel-subtle px-2 py-1 rounded border border-panel-border">
          <Activity className="w-3 h-3 text-emerald-400" />
          <span>360Hz • 24.3MB RAM</span>
        </div>

        {/* Vault Button */}
        <button
          onClick={onOpenVault}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-panel-subtle hover:bg-panel-card text-zinc-200 border border-panel-border text-xs font-medium transition-all"
        >
          <Trophy className="w-3.5 h-3.5 text-amber-400" />
          <span>Reticle Vault</span>
        </button>

        {/* Hotkey Tag */}
        <div
          title={`Global Hotkey: Press ${appSettings.toggleOverlayHotkey} in-game to toggle overlay`}
          className="hidden sm:flex items-center gap-1 px-2 py-1 rounded bg-panel-subtle border border-panel-border text-[10px] font-mono text-zinc-400"
        >
          <span>[{appSettings.toggleOverlayHotkey}]</span>
        </div>

        {/* Primary Overlay Toggle */}
        <button
          onClick={onToggleOverlay}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all ${
            appSettings.overlayVisible
              ? 'bg-emerald-500 text-zinc-950 hover:bg-emerald-400 shadow-glow-sm'
              : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:text-zinc-200'
          }`}
        >
          <Power className="w-3.5 h-3.5" />
          <span>{appSettings.overlayVisible ? 'HUD ACTIVE' : 'HUD INACTIVE'}</span>
        </button>
      </div>
    </header>
  );
};
