import React, { useMemo, useState } from 'react';
import { Check, Pencil, Star, Trophy } from 'lucide-react';
import type { CrosshairConfig } from '../../types/crosshair';
import {
  PRO_CROSSHAIR_CATEGORIES,
  PRO_CROSSHAIR_ENTRIES,
  TIER_LABELS,
  VERIFIED_TIER_NOTE,
  specFacts,
  type ProCategoryId,
  type ProCrosshairEntry,
  type ProTier,
} from '../../lib/proCrosshairs';
import { ReticleRenderer } from '../ReticleRenderer';
import { BACKDROP_OPTIONS } from '../TargetBackdrops';

/**
 * Pro Crosshairs — the curated catalogue and its preview bench.
 *
 * Everything here is the existing preset system: entries are ordinary
 * `CrosshairConfig` objects from `src/lib/proCrosshairs.ts`, Apply goes through
 * the same handler the vault uses, Edit hands the config to the Designer, and
 * favourites are the preset-library's own favourite flag, so a star set here
 * shows up everywhere else.
 *
 * The preview renders through `ReticleRenderer` — the component the overlay
 * itself uses — so the preview cannot drift from what the game will show.
 */

interface ProCrosshairsViewProps {
  currentConfigId: string;
  favouriteIds: string[];
  onApply: (config: CrosshairConfig) => void;
  onEdit: (config: CrosshairConfig) => void;
  onToggleFavourite: (id: string) => void;
}

type CategoryFilter = ProCategoryId | 'all';
type TierFilter = ProTier | 'all';

const SOLID_BACKDROPS: Array<{ id: string; name: string; color: string }> = [
  { id: 'solid-dark', name: 'Dark', color: '#101012' },
  { id: 'solid-white', name: 'White', color: '#f4f4f5' },
  { id: 'solid-sand', name: 'Sand', color: '#c2b280' },
  { id: 'solid-grass', name: 'Grass', color: '#5b7a3a' },
  { id: 'solid-sky', name: 'Sky', color: '#8ec9e8' },
];

const COLOUR_OVERRIDES = ['#00ffff', '#00ff00', '#ffffff', '#ffff00', '#ff00aa', '#ff3333'];

const TIER_STYLES: Record<ProTier, React.CSSProperties & { label: string }> = {
  verified: { label: TIER_LABELS.verified, backgroundColor: 'var(--brand-accent)', color: '#0a0d14' },
  inspired: { label: TIER_LABELS.inspired, backgroundColor: '#202024', color: '#a1a1aa', border: '1px solid #2b2b30' },
  original: { label: TIER_LABELS.original, backgroundColor: 'transparent', color: 'var(--brand-accent)', border: '1px solid var(--brand-accent)' },
};

function TierBadge({ tier }: { tier: ProTier }) {
  const { label, ...style } = TIER_STYLES[tier];
  return (
    <span
      className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider"
      style={style}
      title={
        tier === 'verified'
          ? 'Confirmed by a first-party source — see docs/research/pro-crosshairs.md'
          : tier === 'inspired'
            ? 'Built from researched competitive trends. Not attributed to any player.'
            : 'An original crshhx design.'
      }
    >
      {label}
    </span>
  );
}

function backdropStyleFor(backdropId: string, customColor: string | null): React.CSSProperties {
  if (backdropId === 'custom' && customColor) return { backgroundColor: customColor };
  const solid = SOLID_BACKDROPS.find((b) => b.id === backdropId);
  if (solid) return { backgroundColor: solid.color };
  const backdrop = BACKDROP_OPTIONS.find((b) => b.id === backdropId);
  return backdrop ? backdrop.backgroundStyle : { backgroundColor: '#101012' };
}

export const ProCrosshairsView: React.FC<ProCrosshairsViewProps> = ({
  currentConfigId,
  favouriteIds,
  onApply,
  onEdit,
  onToggleFavourite,
}) => {
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [tier, setTier] = useState<TierFilter>('all');
  const [selectedId, setSelectedId] = useState<string>(PRO_CROSSHAIR_ENTRIES[0].config.id);

  /* Preview bench state — all local, all instant. */
  const [backdropId, setBackdropId] = useState<string>('tactical-grid');
  const [customBackdrop, setCustomBackdrop] = useState<string>('#334155');
  const [zoom, setZoom] = useState<number>(3);
  const [colourOverride, setColourOverride] = useState<string | null>(null);
  const [lengthOverride, setLengthOverride] = useState<number | null>(null);
  const [compareMode, setCompareMode] = useState<boolean>(false);
  const [compareId, setCompareId] = useState<string>(PRO_CROSSHAIR_ENTRIES[1].config.id);

  const favourites = useMemo(() => new Set(favouriteIds), [favouriteIds]);

  const entries = useMemo(
    () =>
      PRO_CROSSHAIR_ENTRIES.filter(
        (entry) =>
          (category === 'all' || entry.meta.category === category) &&
          (tier === 'all' || entry.meta.tier === tier),
      ),
    [category, tier],
  );

  const selected: ProCrosshairEntry =
    PRO_CROSSHAIR_ENTRIES.find((e) => e.config.id === selectedId) ?? PRO_CROSSHAIR_ENTRIES[0];
  const compareEntry: ProCrosshairEntry =
    PRO_CROSSHAIR_ENTRIES.find((e) => e.config.id === compareId) ?? PRO_CROSSHAIR_ENTRIES[1];

  /** The previewed config: the preset plus any bench overrides. */
  const previewConfig = (entry: ProCrosshairEntry, withOverrides: boolean): CrosshairConfig => {
    const base = entry.config;
    if (!withOverrides) return base;
    return {
      ...base,
      primaryColor: colourOverride ?? base.primaryColor,
      centerDotColor: colourOverride ?? base.centerDotColor,
      length: lengthOverride ?? base.length,
    };
  };

  const applySelected = () => {
    onApply(previewConfig(selected, true));
  };

  const benchTile = (entry: ProCrosshairEntry, withOverrides: boolean) => (
    <div
      className="flex-1 h-56 rounded-lg border border-[#26262a] flex items-center justify-center overflow-hidden"
      style={backdropStyleFor(backdropId, customBackdrop)}
      aria-label={`Preview of ${entry.config.name}`}
    >
      <ReticleRenderer config={previewConfig(entry, withOverrides)} scale={zoom} />
    </div>
  );

  return (
    <div className="flex-1 p-8 bg-[#121214] text-zinc-100 overflow-y-auto select-none">
      <div className="max-w-6xl space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Trophy className="w-5 h-5" style={{ color: 'var(--brand-accent)' }} />
            Pro Crosshairs
          </h2>
          <p className="text-zinc-400 text-xs max-w-2xl">
            {PRO_CROSSHAIR_ENTRIES.length} curated designs. The standard sheet is researched from
            competitive play; Gold Series entries are labelled fan recreations.
            Every preview is drawn by the real overlay renderer, and every design is yours to
            tweak after applying.
          </p>
          {/* Tier legend — the honesty contract, visible without hunting for it. */}
          <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono">
            <TierBadge tier="verified" />
            <span className="text-zinc-500">confirmed by the player's own publication</span>
            <TierBadge tier="inspired" />
            <span className="text-zinc-500">built from researched trends, no player names</span>
            <TierBadge tier="original" />
            <span className="text-zinc-500">crshhx originals</span>
          </div>
        </div>

        <div className="flex flex-col xl:flex-row gap-6 items-start">
          {/* Library column */}
          <div className="flex-1 w-full space-y-4">
            {/* Category filter */}
            <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Pro Crosshair categories">
              <button
                role="tab"
                aria-selected={category === 'all'}
                onClick={() => setCategory('all')}
                className={`px-2.5 py-1 rounded text-[11px] font-mono border transition-colors ${
                  category === 'all'
                    ? 'text-zinc-100'
                    : 'text-zinc-500 border-[#26262a] hover:text-zinc-300'
                }`}
                style={category === 'all' ? { borderColor: 'var(--brand-accent)', color: 'var(--brand-accent)' } : undefined}
              >
                All ({PRO_CROSSHAIR_ENTRIES.length})
              </button>
              {PRO_CROSSHAIR_CATEGORIES.map((c) => {
                const count = PRO_CROSSHAIR_ENTRIES.filter((e) => e.meta.category === c.id).length;
                const active = category === c.id;
                return (
                  <button
                    key={c.id}
                    role="tab"
                    aria-selected={active}
                    title={c.blurb}
                    onClick={() => setCategory(c.id)}
                    className={`px-2.5 py-1 rounded text-[11px] font-mono border transition-colors ${
                      active ? '' : 'text-zinc-500 border-[#26262a] hover:text-zinc-300'
                    }`}
                    style={active ? { borderColor: 'var(--brand-accent)', color: 'var(--brand-accent)' } : undefined}
                  >
                    {c.label} ({count})
                  </button>
                );
              })}
            </div>

            {/* Tier filter */}
            <div className="flex flex-wrap gap-1.5 items-center" aria-label="Filter by tier">
              <span className="text-[10px] font-mono uppercase text-zinc-600 mr-1">Tier</span>
              {(['all', 'verified', 'inspired', 'original'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTier(t)}
                  aria-pressed={tier === t}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono border transition-colors ${
                    tier === t ? 'text-zinc-100 border-zinc-500' : 'text-zinc-500 border-[#26262a] hover:text-zinc-300'
                  }`}
                >
                  {t === 'all' ? 'All tiers' : TIER_LABELS[t]}
                </button>
              ))}
            </div>

            {entries.length === 0 && (
              <div className="rounded-lg border border-[#26262a] bg-[#18181b] p-6 space-y-2">
                <p className="text-sm text-zinc-300 font-semibold">Nothing here — on purpose.</p>
                <p className="text-xs text-zinc-400 leading-relaxed max-w-xl">{VERIFIED_TIER_NOTE}</p>
              </div>
            )}

            {/* Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {entries.map((entry) => {
                const isFav = favourites.has(entry.config.id);
                const isActive = entry.config.id === selectedId;
                const isCurrent = entry.config.id === currentConfigId;
                return (
                  <div
                    key={entry.config.id}
                    className={`rounded-lg border bg-[#18181b] p-4 space-y-3 transition-colors ${
                      isActive ? '' : 'border-[#26262a]'
                    }`}
                    style={isActive ? { borderColor: 'var(--brand-accent)' } : undefined}
                  >
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => setSelectedId(entry.config.id)}
                        aria-label={`Preview ${entry.config.name}`}
                        className="w-16 h-16 rounded-md border border-[#26262a] bg-[#101012] flex items-center justify-center shrink-0"
                      >
                        <ReticleRenderer config={entry.config} scale={1.6} />
                      </button>
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-sm text-zinc-200 truncate">{entry.config.name}</h3>
                          {isCurrent && (
                            <span className="px-1 py-0.5 rounded text-[8px] font-mono uppercase text-zinc-400 border border-[#2b2b30]">
                              In use
                            </span>
                          )}
                          {entry.meta.series === 'gold' && (
                            <span className="px-1 py-0.5 rounded text-[8px] font-mono uppercase text-[#d8b25c] border border-[#8a6f35]">
                              Gold
                            </span>
                          )}
                        </div>
                        <TierBadge tier={entry.meta.tier} />
                        <p className="text-[11px] text-zinc-400 leading-snug">{entry.meta.description}</p>
                        {entry.meta.inspiration && (
                          <p className="text-[10px] text-zinc-500 leading-snug">{entry.meta.inspiration}</p>
                        )}
                      </div>
                      <button
                        onClick={() => onToggleFavourite(entry.config.id)}
                        aria-label={isFav ? `Remove ${entry.config.name} from favourites` : `Add ${entry.config.name} to favourites`}
                        aria-pressed={isFav}
                        className="p-1 text-zinc-500 hover:text-zinc-200 shrink-0"
                      >
                        <Star
                          className="w-4 h-4"
                          style={isFav ? { color: 'var(--brand-accent)', fill: 'var(--brand-accent)' } : undefined}
                        />
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {specFacts(entry.config).map((fact) => (
                        <span key={fact} className="px-1.5 py-0.5 rounded bg-[#141416] border border-[#222226] text-[9px] font-mono text-zinc-500">
                          {fact}
                        </span>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => onApply(entry.config)}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-mono font-bold transition-colors"
                        style={{ backgroundColor: 'var(--brand-accent)', color: '#0a0d14' }}
                      >
                        {isCurrent ? <Check className="w-3.5 h-3.5" /> : null}
                        Apply
                      </button>
                      <button
                        onClick={() => onEdit(entry.config)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-mono text-zinc-400 hover:text-zinc-200 border border-[#26262a]"
                      >
                        <Pencil className="w-3 h-3" />
                        Edit
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Preview bench */}
          <div className="w-full xl:w-[400px] xl:sticky xl:top-0 space-y-4 rounded-lg border border-[#26262a] bg-[#18181b] p-5">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-zinc-200">Preview bench</h3>
              <label className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-500 cursor-pointer">
                <input
                  type="checkbox"
                  checked={compareMode}
                  onChange={(e) => setCompareMode(e.target.checked)}
                  aria-label="Compare two designs"
                  className="w-3.5 h-3.5 accent-emerald-500 cursor-pointer"
                />
                Compare
              </label>
            </div>

            <div className={`flex gap-2 ${compareMode ? '' : ''}`}>
              {benchTile(selected, true)}
              {compareMode && benchTile(compareEntry, false)}
            </div>

            {compareMode && (
              <label className="block space-y-1">
                <span className="text-[10px] font-mono uppercase text-zinc-500">Compare with</span>
                <select
                  value={compareId}
                  onChange={(e) => setCompareId(e.target.value)}
                  aria-label="Comparison design"
                  className="w-full bg-[#141416] border border-[#26262a] rounded px-2 py-1.5 text-[11px] font-mono text-zinc-300 focus:outline-none"
                >
                  {PRO_CROSSHAIR_ENTRIES.map((e) => (
                    <option key={e.config.id} value={e.config.id}>
                      {e.config.name}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {/* Background */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-mono uppercase text-zinc-500">Background</span>
              <div className="flex flex-wrap gap-1.5">
                {BACKDROP_OPTIONS.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => setBackdropId(b.id)}
                    aria-pressed={backdropId === b.id}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                      backdropId === b.id ? 'text-zinc-100 border-zinc-500' : 'text-zinc-500 border-[#26262a]'
                    }`}
                  >
                    {b.name}
                  </button>
                ))}
                {SOLID_BACKDROPS.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => setBackdropId(b.id)}
                    aria-pressed={backdropId === b.id}
                    title={b.name}
                    aria-label={`Solid background ${b.name}`}
                    className="w-5 h-5 rounded border"
                    style={{
                      backgroundColor: b.color,
                      borderColor: backdropId === b.id ? 'var(--brand-accent)' : '#2b2b30',
                    }}
                  />
                ))}
                <input
                  type="color"
                  value={customBackdrop}
                  onChange={(e) => {
                    setCustomBackdrop(e.target.value);
                    setBackdropId('custom');
                  }}
                  aria-label="Custom background colour"
                  className="w-7 h-5 bg-transparent border border-[#2b2b30] rounded cursor-pointer"
                />
              </div>
            </div>

            {/* Zoom */}
            <label className="block space-y-1">
              <span className="text-[10px] font-mono uppercase text-zinc-500">Zoom: {zoom.toFixed(1)}×</span>
              <input
                type="range" min={0.5} max={6} step={0.5} value={zoom}
                aria-label="Preview zoom"
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full accent-emerald-500"
              />
            </label>

            {/* Colour override */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-mono uppercase text-zinc-500">
                Crosshair colour {colourOverride ? '(overridden)' : ''}
              </span>
              <div className="flex items-center gap-1.5">
                {COLOUR_OVERRIDES.map((hex) => (
                  <button
                    key={hex}
                    onClick={() => setColourOverride(hex)}
                    aria-label={`Preview colour ${hex}`}
                    className="w-5 h-5 rounded border"
                    style={{
                      backgroundColor: hex,
                      borderColor: colourOverride === hex ? 'var(--brand-accent)' : '#2b2b30',
                    }}
                  />
                ))}
                {colourOverride && (
                  <button
                    onClick={() => setColourOverride(null)}
                    className="px-1.5 py-0.5 rounded text-[9px] font-mono text-zinc-400 border border-[#26262a] hover:text-zinc-200"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>

            {/* Size override */}
            <label className="block space-y-1">
              <span className="text-[10px] font-mono uppercase text-zinc-500">
                Size {lengthOverride !== null ? `(overridden: ${lengthOverride})` : `(${selected.config.length})`}
              </span>
              <input
                type="range" min={0} max={20} step={0.5}
                value={lengthOverride ?? selected.config.length}
                aria-label="Preview size"
                onChange={(e) => setLengthOverride(Number(e.target.value))}
                className="w-full accent-emerald-500"
              />
            </label>

            <div className="text-[10px] font-mono text-zinc-500 leading-relaxed">
              Now previewing: <span className="text-zinc-300">{selected.config.name}</span>
              {colourOverride || lengthOverride !== null ? ' with bench tweaks' : ''}
            </div>

            <div className="flex gap-2">
              <button
                onClick={applySelected}
                className="flex-1 px-3 py-2 rounded text-[11px] font-mono font-bold"
                style={{ backgroundColor: 'var(--brand-accent)', color: '#0a0d14' }}
              >
                Apply to current profile
              </button>
              <button
                onClick={() => {
                  setColourOverride(null);
                  setLengthOverride(null);
                }}
                className="px-3 py-2 rounded text-[11px] font-mono text-zinc-400 hover:text-zinc-200 border border-[#26262a]"
              >
                Reset tweaks
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
