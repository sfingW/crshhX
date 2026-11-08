import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { CrosshairConfig } from '../../types/crosshair';
import { COMPLETE_CROSSHAIR_VAULT } from '../../lib/crosshairCollection';
import { loadCustomPresets, loadFavoriteIds, toggleFavoriteId } from '../../lib/storage';
import { ReticleRenderer } from '../ReticleRenderer';
import {
  Bookmark,
  Sparkles,
  Trophy,
  Zap,
  Shield,
  Target,
  Shuffle,
  SearchX,
  FolderOpen,
} from 'lucide-react';

interface CrosshairsViewProps {
  currentConfig: CrosshairConfig;
  onSelectCrosshair: (config: CrosshairConfig) => void;
  onOpenDesignerWithConfig: (config: CrosshairConfig) => void;
  searchQuery: string;
  activeSubTab: string;
}

/**
 * The crosshair library browser.
 *
 * Two things were broken here and are now real:
 *
 * - **Favourites persisted.** They used to be component state seeded with three
 *   hard-coded ids, so starring a crosshair did nothing past a reload and the
 *   Favourites tab always showed the same three. They are now stored by preset
 *   id (ids survive renames; names do not).
 * - **Saved crosshairs appear.** The grid only ever read the built-in vault, so
 *   a preset the user saved in the designer was written to storage and then
 *   never shown again anywhere. User presets are listed first, in their own
 *   category.
 */
export const CrosshairsView: React.FC<CrosshairsViewProps> = ({
  currentConfig,
  onSelectCrosshair,
  onOpenDesignerWithConfig,
  searchQuery,
  activeSubTab,
}) => {
  // Land on the user's own work when they have any — otherwise arriving here
  // after saving a preset in the designer shows a page that does not contain it.
  const [activeCategory, setActiveCategory] = useState<string>(() =>
    loadCustomPresets().length > 0 ? 'mine' : 'top-pro',
  );
  const [favorites, setFavorites] = useState<string[]>(() => loadFavoriteIds());
  // Bumped when the window regains focus, so a preset saved in the designer (or
  // in a second window) shows up without a manual reload.
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const onFocus = () => setRevision((n) => n + 1);
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  const customPresets = useMemo(() => loadCustomPresets(), [revision]);

  /** User presets first — they are the ones the user actually made. */
  const library = useMemo<CrosshairConfig[]>(
    () => [...customPresets, ...COMPLETE_CROSSHAIR_VAULT],
    [customPresets],
  );

  const favoriteSet = useMemo(() => new Set(favorites), [favorites]);
  const isCustom = useCallback((id: string) => id.startsWith('custom-'), []);

  const toggleFavorite = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setFavorites(toggleFavoriteId(id));
  };

  const CATEGORIES = [
    { id: 'mine', label: `MY SAVED (${customPresets.length})`, icon: FolderOpen },
    { id: 'top-pro', label: 'PRO ROSTER', icon: Trophy },
    { id: 'tactical', label: 'TACTICAL CROSSES', icon: Shield },
    { id: 'dots', label: 'PRECISION DOTS', icon: Target },
    { id: 'circles', label: 'RINGS & SHOTGUN', icon: Zap },
    { id: 'chevrons', label: 'CHEVRONS & BOXES', icon: Sparkles },
    { id: 'novelty', label: 'SPECIALTY & NOVELTY', icon: Sparkles },
    { id: 'all', label: `ALL (${library.length})`, icon: Shuffle },
  ];

  const filteredCrosshairs = library.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (activeSubTab === 'pros') return item.id.startsWith('pro-');
    if (activeSubTab === 'saved') return favoriteSet.has(item.id);

    if (activeCategory === 'all') return true;
    if (activeCategory === 'mine') return isCustom(item.id);
    if (activeCategory === 'top-pro') return item.id.startsWith('pro-');
    if (activeCategory === 'tactical') return item.id.startsWith('tac-');
    if (activeCategory === 'dots') return item.id.startsWith('dot-');
    if (activeCategory === 'circles')
      return item.id.startsWith('ring-') || item.id.startsWith('shotgun-');
    if (activeCategory === 'chevrons')
      return item.id.startsWith('chev-') || item.id.startsWith('box-');
    if (activeCategory === 'novelty') return item.id.startsWith('novelty-');
    return true;
  });

  /** Why the grid is empty — a blank page is not an explanation. */
  const emptyState = (() => {
    if (filteredCrosshairs.length > 0) return null;
    if (searchQuery.trim()) {
      return {
        icon: SearchX,
        title: `Nothing matches “${searchQuery}”`,
        body: 'Search matches the crosshair name. Try a shorter term, or clear the search box above.',
      };
    }
    if (activeSubTab === 'saved') {
      return {
        icon: Bookmark,
        title: 'No favourites yet',
        body: 'Use the bookmark icon on any crosshair to keep it here. Favourites are stored on this computer and survive a restart.',
      };
    }
    if (activeCategory === 'mine') {
      return {
        icon: FolderOpen,
        title: 'No saved crosshairs yet',
        body: 'Open any crosshair in the designer and press Save. Your own designs appear here, above the built-in library.',
      };
    }
    return {
      icon: SearchX,
      title: 'Nothing in this category',
      body: 'Try another category, or choose All to see the whole library.',
    };
  })();

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
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                aria-pressed={isActive}
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
        <div className="flex items-center justify-between text-zinc-500 text-xs mt-2 gap-4">
          <span className="truncate">
            {customPresets.length > 0
              ? `${customPresets.length} of your own crosshairs, plus the curated esports library.`
              : 'Curated esports reticle database with calibrated subpixel dimensions.'}
          </span>
          <span className="font-mono text-[11px] shrink-0">
            Showing <strong className="text-zinc-300">{filteredCrosshairs.length}</strong> of{' '}
            {library.length}
          </span>
        </div>
      </div>

      {/* Grid of Crosshair Cards */}
      <div className="flex-1 px-8 py-2 overflow-y-auto scrollbar-thin">
        {emptyState ? (
          <div className="h-full min-h-[240px] flex flex-col items-center justify-center text-center px-6">
            <emptyState.icon className="w-7 h-7 text-zinc-700 mb-3" />
            <p className="text-sm font-medium text-zinc-300">{emptyState.title}</p>
            <p className="text-xs text-zinc-500 max-w-sm mt-1.5 leading-relaxed">
              {emptyState.body}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 pb-8">
            {filteredCrosshairs.map((item) => {
              const isSelected = currentConfig.id === item.id;
              const isFavorite = favoriteSet.has(item.id);
              const custom = isCustom(item.id);

              // Determine tag label
              let tag = 'TAC';
              if (custom) tag = 'MINE';
              else if (item.id.startsWith('pro-')) tag = 'PRO';
              else if (item.id.startsWith('dot-')) tag = 'DOT';
              else if (item.id.startsWith('ring-') || item.id.startsWith('shotgun-')) tag = 'RING';
              else if (item.id.startsWith('chev-')) tag = 'CHEV';
              else if (item.id.startsWith('box-')) tag = 'BOX';
              else if (item.id.startsWith('novelty-')) tag = 'SPEC';

              return (
                <div
                  key={item.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`${item.name}${isSelected ? ' (active)' : ''} — select, or press Enter twice to open in the designer`}
                  aria-pressed={isSelected}
                  onClick={() => onSelectCrosshair(item)}
                  onDoubleClick={() => onOpenDesignerWithConfig(item)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectCrosshair(item);
                    }
                  }}
                  className={`group relative aspect-square bg-surface-sidebar rounded-lg border cursor-pointer flex flex-col items-center justify-between p-2.5 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-0 ${
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
                      type="button"
                      onClick={(e) => toggleFavorite(e, item.id)}
                      aria-label={
                        isFavorite
                          ? `Remove ${item.name} from favourites`
                          : `Add ${item.name} to favourites`
                      }
                      aria-pressed={isFavorite}
                      className="text-zinc-600 hover:text-zinc-300 transition-colors p-0.5"
                    >
                      <Bookmark
                        className="w-3.5 h-3.5"
                        style={{
                          fill: isFavorite ? 'var(--brand-accent)' : 'none',
                          color: isFavorite ? 'var(--brand-accent)' : '#71717a',
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
                        isSelected
                          ? 'font-bold'
                          : 'text-zinc-400 group-hover:text-zinc-200 font-medium'
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
        )}
      </div>
    </div>
  );
};
