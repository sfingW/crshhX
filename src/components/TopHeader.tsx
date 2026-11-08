import React from 'react';
import {
  Share2,
  Download,
  Minus,
  Square,
  X,
  Search,
  Palette,
} from 'lucide-react';
import { THEME_ACCENTS, ThemeAccent } from '../lib/theme';
import { ActiveSlotIndicator } from './ActiveSlotIndicator';
import type { WeaponSlotStatus } from '../lib/weaponSlots/types';

interface TopHeaderProps {
  overlayVisible: boolean;
  onToggleOverlay: () => void;
  onOpenShareModal: () => void;
  onOpenImportModal: () => void;
  currentAccent: ThemeAccent;
  onSelectAccent: (accent: ThemeAccent) => void;
  activeSubTab?: string;
  onSelectSubTab?: (tab: string) => void;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  /** Weapon Slot Crosshairs status, shown in the bar. */
  weaponSlotStatus?: WeaponSlotStatus | null;
  weaponSlotPulse?: boolean;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  overlayVisible,
  onToggleOverlay,
  onOpenShareModal,
  onOpenImportModal,
  currentAccent,
  onSelectAccent,
  activeSubTab = 'vault',
  onSelectSubTab,
  searchQuery = '',
  onSearchChange,
  weaponSlotStatus = null,
  weaponSlotPulse = false,
}) => {
  return (
    <header className="h-12 bg-surface-sidebar border-b border-surface-border flex items-center justify-between px-6 select-none shrink-0 text-xs">
      {/* Search & Tabs */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 bg-surface-card px-2.5 py-1 rounded-md border border-surface-border">
          <Search className="w-3.5 h-3.5 text-zinc-500" />
          <input
            type="text"
            placeholder="Search 258+ reticles..."
            value={searchQuery}
            onChange={(e) => onSearchChange?.(e.target.value)}
            className="bg-transparent border-none text-zinc-200 placeholder-zinc-500 text-xs focus:outline-none w-44 font-sans"
          />
        </div>

        {onSelectSubTab && (
          <div className="flex items-center gap-5 text-zinc-400 font-medium">
            <button
              onClick={() => onSelectSubTab('vault')}
              className={`transition-colors py-3 border-b-2 ${
                activeSubTab === 'vault'
                  ? 'text-zinc-100 font-semibold'
                  : 'border-transparent hover:text-zinc-200'
              }`}
              style={{
                borderColor: activeSubTab === 'vault' ? 'var(--brand-accent)' : 'transparent',
              }}
            >
              All Vault
            </button>
            <button
              onClick={() => onSelectSubTab('pros')}
              className={`transition-colors py-3 border-b-2 ${
                activeSubTab === 'pros'
                  ? 'text-zinc-100 font-semibold'
                  : 'border-transparent hover:text-zinc-200'
              }`}
              style={{
                borderColor: activeSubTab === 'pros' ? 'var(--brand-accent)' : 'transparent',
              }}
            >
              Pro Esports Roster
            </button>
            <button
              onClick={() => onSelectSubTab('custom')}
              className={`transition-colors py-3 border-b-2 ${
                activeSubTab === 'custom'
                  ? 'text-zinc-100 font-semibold'
                  : 'border-transparent hover:text-zinc-200'
              }`}
              style={{
                borderColor: activeSubTab === 'custom' ? 'var(--brand-accent)' : 'transparent',
              }}
            >
              Custom
            </button>
          </div>
        )}
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-4">
        {/* Weapon Slot Crosshairs — active slot indicator */}
        <ActiveSlotIndicator status={weaponSlotStatus} pulse={weaponSlotPulse} />

        {/* Theme Accent Palette Selector */}
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-surface-card border border-surface-border">
          <Palette className="w-3 h-3 text-zinc-400 mr-1" />
          {THEME_ACCENTS.map((accent) => (
            <button
              key={accent.id}
              onClick={() => onSelectAccent(accent)}
              title={`Switch accent to ${accent.name}`}
              className={`w-3.5 h-3.5 rounded-full transition-transform ${
                currentAccent.id === accent.id ? 'scale-125 ring-2 ring-white/50' : 'opacity-70 hover:opacity-100'
              }`}
              style={{ backgroundColor: accent.color }}
            />
          ))}
        </div>

        {/* Share Button */}
        <button
          onClick={onOpenShareModal}
          className="flex items-center gap-1.5 text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          <Share2 className="w-3.5 h-3.5" />
          <span>Share</span>
        </button>

        {/* Import Button */}
        <button
          onClick={onOpenImportModal}
          className="flex items-center gap-1.5 text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Import</span>
        </button>

        <div className="h-4 w-[1px] bg-surface-border" />

        {/* HUD Overlay Switch */}
        <button
          onClick={onToggleOverlay}
          className={`flex items-center gap-2 px-3 py-1 rounded-md text-[11px] font-mono font-semibold transition-all ${
            overlayVisible
              ? 'bg-surface-cardHover text-zinc-100 border'
              : 'bg-surface-card text-zinc-500 border border-surface-border hover:text-zinc-300'
          }`}
          style={{
            borderColor: overlayVisible ? 'var(--brand-accent-border)' : undefined,
          }}
        >
          <span
            className="w-2 h-2 rounded-full"
            style={{
              backgroundColor: overlayVisible ? 'var(--brand-accent)' : '#71717a',
              boxShadow: overlayVisible ? '0 0 8px var(--brand-accent)' : 'none',
            }}
          />
          <span>{overlayVisible ? 'HUD ACTIVE' : 'HUD SLEEP'}</span>
          <span className="text-[10px] text-zinc-500 font-normal">[F10]</span>
        </button>

        {/* Window controls */}
        <div className="flex items-center gap-3 text-zinc-500 ml-1">
          <Minus className="w-3.5 h-3.5 hover:text-zinc-300 cursor-pointer" />
          <Square className="w-3 h-3 hover:text-zinc-300 cursor-pointer" />
          <X className="w-3.5 h-3.5 hover:text-zinc-300 cursor-pointer" />
        </div>
      </div>
    </header>
  );
};
