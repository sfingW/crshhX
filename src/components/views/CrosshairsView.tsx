import React, { useState } from 'react';
import { CrosshairConfig } from '../../types/crosshair';
import { COMPLETE_CROSSHAIR_VAULT } from '../../lib/crosshairCollection';
import { ReticleRenderer } from '../ReticleRenderer';
import { Bookmark, Sparkles, Trophy, Zap, Shield, Target, Shuffle } from 'lucide-react';

interface CrosshairsViewProps {
  currentConfig: CrosshairConfig;
  onSelectCrosshair: (config: CrosshairConfig) => void;
  onOpenDesignerWithConfig: (config: CrosshairConfig) => void;
  searchQuery: string;
  activeSubTab: string;
}

export const CrosshairsView: React.FC<CrosshairsViewProps> = ({
  currentConfig,
  onSelectCrosshair,
  onOpenDesignerWithConfig,
  searchQuery,
  activeSubTab,
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('top-pro');
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set(['pro-1', 'pro-2', 'pro-11']));

  const toggleBookmark = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setBookmarkedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const CATEGORIES = [
    { id: 'top-pro', label: 'PRO ROSTER', icon: Trophy },
    { id: 'tactical', label: 'TACTICAL CROSSES', icon: Shield },
    { id: 'dots', label: 'PRECISION DOTS', icon: Target },
    { id: 'circles', label: 'RINGS & SHOTGUN', icon: Zap },
    { id: 'chevrons', label: 'CHEVRONS & BOXES', icon: Sparkles },
    { id: 'novelty', label: 'SPECIALTY & NOVELTY', icon: Sparkles },
    { id: 'all', label: `ALL (${COMPLETE_CROSSHAIR_VAULT.length})`, icon: Shuffle },
  ];

  const filteredCrosshairs = COMPLETE_CROSSHAIR_VAULT.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (activeSubTab === 'pros') return item.id.startsWith('pro-');
    if (activeSubTab === 'saved') return bookmarkedIds.has(item.id);

    if (activeCategory === 'all') return true;
    if (activeCategory === 'top-pro') return item.id.startsWith('pro-');
    if (activeCategory === 'tactical') return item.id.startsWith('tac-');
    if (activeCategory === 'dots') return item.id.startsWith('dot-');
    if (activeCategory === 'circles') return item.id.startsWith('ring-') || item.id.startsWith('shotgun-');
    if (activeCategory === 'chevrons') return item.id.startsWith('chev-') || item.id.startsWith('box-');
    if (activeCategory === 'novelty') return item.id.startsWith('novelty-');
    return true;
  });

  return (
    <div className="flex-1 flex flex-col h-full bg-surface-base text-zinc-100 overflow-hidden">
      {/* Category Pills Bar */}
      <div className="px-8 pt-5 pb-3">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-2">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] font-mono tracking-wider transition-all whitespace-nowrap border ${
                  isActive
                    ? 'bg-surface-card font-bold shadow-sm'
                    : 'bg-surface-sidebar text-zinc-400 hover:text-zinc-200 hover:bg-surface-card border-surface-border'
                }`}
                style={{
                  color: isActive ? 'var(--brand-accent)' : undefined,
                  borderColor: isActive ? 'var(--brand-accent-border)' : undefined,
                }}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Subtitle */}
        <div className="flex items-center justify-between text-zinc-500 text-xs mt-2">
          <span>Curated esports reticle database with calibrated subpixel dimensions.</span>
          <span className="font-mono text-[11px]">
            Showing <strong className="text-zinc-300">{filteredCrosshairs.length}</strong> of {COMPLETE_CROSSHAIR_VAULT.length}
          </span>
        </div>
      </div>

      {/* Grid of Crosshair Cards */}
      <div className="flex-1 px-8 py-2 overflow-y-auto scrollbar-thin">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 pb-8">
          {filteredCrosshairs.map((item) => {
            const isSelected = currentConfig.id === item.id;
            const isBookmarked = bookmarkedIds.has(item.id);

            // Determine tag label
            let tag = 'TAC';
            if (item.id.startsWith('pro-')) tag = 'PRO';
            else if (item.id.startsWith('dot-')) tag = 'DOT';
            else if (item.id.startsWith('ring-') || item.id.startsWith('shotgun-')) tag = 'RING';
            else if (item.id.startsWith('chev-')) tag = 'CHEV';
            else if (item.id.startsWith('box-')) tag = 'BOX';
            else if (item.id.startsWith('novelty-')) tag = 'SPEC';

            return (
              <div
                key={item.id}
                onClick={() => onSelectCrosshair(item)}
                onDoubleClick={() => onOpenDesignerWithConfig(item)}
                className={`group relative aspect-square bg-surface-sidebar rounded-lg border cursor-pointer flex flex-col items-center justify-between p-2.5 transition-all ${
                  isSelected
                    ? 'bg-surface-card'
                    : 'border-surface-border hover:border-zinc-500 hover:bg-surface-card'
                }`}
                style={{
                  borderColor: isSelected ? 'var(--brand-accent)' : undefined,
                  boxShadow: isSelected ? '0 0 15px var(--brand-accent-muted)' : undefined,
                }}
              >
                {/* Top Row: Category tag and Bookmark */}
                <div className="w-full flex items-center justify-between">
                  <span className="text-[9px] font-mono uppercase px-1 py-0.5 rounded bg-surface-base text-zinc-500 border border-surface-border">
                    {tag}
                  </span>
                  <button
                    onClick={(e) => toggleBookmark(e, item.id)}
                    className="text-zinc-600 hover:text-zinc-300 transition-colors p-0.5"
                  >
                    <Bookmark
                      className="w-3.5 h-3.5"
                      style={{
                        fill: isBookmarked ? 'var(--brand-accent)' : 'none',
                        color: isBookmarked ? 'var(--brand-accent)' : '#71717a',
                      }}
                    />
                  </button>
                </div>

                {/* Rendered Crosshair Graphic */}
                <div className="flex-1 flex items-center justify-center pointer-events-none scale-125">
                  <ReticleRenderer config={item} scale={1.2} />
                </div>

                {/* Subtle Name label */}
                <div className="w-full text-center px-1 truncate">
                  <span
                    className={`text-[11px] truncate block ${
                      isSelected ? 'font-bold' : 'text-zinc-400 group-hover:text-zinc-200 font-medium'
                    }`}
                    style={{
                      color: isSelected ? 'var(--brand-accent)' : undefined,
                    }}
                  >
                    {item.name}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
