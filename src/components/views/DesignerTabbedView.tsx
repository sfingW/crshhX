import React, { useState } from 'react';
import { CrosshairConfig, CrosshairTopology } from '../../types/crosshair';
import { ReticleRenderer } from '../ReticleRenderer';
import {
  Sliders,
  Circle,
  Square,
  Sparkles,
  Layers,
  Save,
  Share2,
  Copy,
  Trash2,
  Edit2,
  Check,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react';

interface DesignerTabbedViewProps {
  config: CrosshairConfig;
  onChange: (updated: Partial<CrosshairConfig>) => void;
  onSavePreset: (name: string) => void;
}

export const DesignerTabbedView: React.FC<DesignerTabbedViewProps> = ({
  config,
  onChange,
  onSavePreset,
}) => {
  const [activeTab, setActiveTab] = useState<'lines' | 'center-dot' | 'outline' | 'animations' | 'layer'>('lines');
  const [crosshairTitle, setCrosshairTitle] = useState(config.name);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [zoomLevel, setZoomLevel] = useState<number>(2);
  const [isFiring, setIsFiring] = useState(false);
  const [isAds, setIsAds] = useState(false);

  const handleTitleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsEditingTitle(false);
    onChange({ name: crosshairTitle });
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-surface-base text-zinc-100 overflow-hidden select-none">
      {/* Top Designer Sub-Header */}
      <div className="flex items-center justify-between px-6 py-2.5 bg-surface-sidebar border-b border-surface-border text-xs">
        {/* Title & Edit */}
        <div className="flex items-center gap-3">
          {isEditingTitle ? (
            <form onSubmit={handleTitleSubmit} className="flex items-center gap-2">
              <input
                type="text"
                autoFocus
                value={crosshairTitle}
                onChange={(e) => setCrosshairTitle(e.target.value)}
                onBlur={() => setIsEditingTitle(false)}
                className="bg-surface-card border rounded px-2 py-1 text-zinc-100 text-xs font-semibold focus:outline-none"
                style={{ borderColor: 'var(--brand-accent)' }}
              />
              <button type="submit" style={{ color: 'var(--brand-accent)' }}>
                <Check className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <div className="flex items-center gap-2 cursor-pointer group" onClick={() => setIsEditingTitle(true)}>
              <Edit2 className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-300" />
              <span className="font-bold text-sm text-zinc-100">{config.name}</span>
            </div>
          )}
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-4 text-zinc-400">
          <button
            onClick={() => onSavePreset(config.name)}
            className="flex items-center gap-1.5 hover:text-zinc-100 transition-colors"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save</span>
          </button>

          <button
            onClick={() => {
              navigator.clipboard.writeText(JSON.stringify(config, null, 2));
              alert('Crosshair configuration copied to clipboard!');
            }}
            className="flex items-center gap-1.5 hover:text-zinc-100 transition-colors"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Share</span>
          </button>

          <div className="h-3.5 w-[1px] bg-surface-border" />

          <button
            title="Duplicate Layer"
            onClick={() => onSavePreset(`${config.name} (Copy)`)}
            className="hover:text-zinc-100 transition-colors"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>

          <button
            title="Reset Crosshair"
            onClick={() =>
              onChange({
                length: 4,
                thickness: 2,
                gap: 2,
                primaryColor: '#ffffff',
                hasTopArm: true,
                hasBottomArm: true,
                hasLeftArm: true,
                hasRightArm: true,
              })
            }
            className="hover:text-rose-400 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Sub-Tabs Along the Top (Lines, Center Dot, Outline, Animations, Layer) */}
      <div className="flex items-center px-6 bg-surface-sidebar border-b border-surface-border text-xs gap-6">
        {[
          { id: 'lines', label: 'Lines', icon: Sliders },
          { id: 'center-dot', label: 'Center Dot', icon: Circle },
          { id: 'outline', label: 'Outline', icon: Square },
          { id: 'animations', label: 'Animations', icon: Sparkles },
          { id: 'layer', label: 'Layer', icon: Layers },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 py-2.5 border-b-2 font-medium transition-all ${
                isActive
                  ? 'text-zinc-100 font-semibold'
                  : 'text-zinc-400 border-transparent hover:text-zinc-200'
              }`}
              style={{
                borderColor: isActive ? 'var(--brand-accent)' : 'transparent',
              }}
            >
              <div
                className="w-4 h-4 rounded flex items-center justify-center border"
                style={{
                  borderColor: isActive ? 'var(--brand-accent)' : '#52525b',
                  color: isActive ? 'var(--brand-accent)' : '#71717a',
                }}
              >
                <Icon className="w-2.5 h-2.5" />
              </div>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Workspace (Left: Property Inspector, Right: Live Canvas & Layers) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left / Center: Property Inspector */}
        <div className="flex-1 p-8 overflow-y-auto space-y-6 scrollbar-thin">
          {/* TAB 1: LINES */}
          {activeTab === 'lines' && (
            <div className="space-y-6 max-w-2xl">
              {/* Lines Header with Visible toggle */}
              <div className="flex items-center gap-3 pb-4 border-b border-surface-border">
                <div className="w-10 h-10 rounded-lg bg-surface-card border border-surface-border flex items-center justify-center">
                  <ReticleRenderer config={config} scale={0.8} />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-zinc-100">Lines</h3>
                  <span className="text-[11px] flex items-center gap-1 font-medium" style={{ color: 'var(--brand-accent)' }}>
                    <Check className="w-3 h-3" /> Visible
                  </span>
                </div>
              </div>

              {/* Appearance Section */}
              <div className="space-y-4">
                <span className="text-[11px] uppercase font-mono tracking-wider text-zinc-500 font-semibold block">
                  Appearance
                </span>

                {/* Color Swatch */}
                <div className="flex items-center gap-4">
                  <span className="text-zinc-400 text-xs w-20">Color</span>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-8 h-8 rounded border border-zinc-600 cursor-pointer overflow-hidden relative"
                      style={{ backgroundColor: config.primaryColor }}
                    >
                      <input
                        type="color"
                        value={config.primaryColor}
                        onChange={(e) => onChange({ primaryColor: e.target.value })}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                    </div>
                    <button
                      onClick={() => onChange({ primaryColor: '#ffffff' })}
                      className="text-zinc-400 hover:text-zinc-200 text-xs flex items-center gap-1 px-2 py-1 bg-surface-card rounded border border-surface-border"
                    >
                      <span>✕ Clear</span>
                    </button>
                  </div>
                </div>

                {/* Visible Directional Arrows ↑ ↓ ← → */}
                <div className="flex items-center gap-4">
                  <span className="text-zinc-400 text-xs w-20">Visible</span>
                  <div className="flex items-center gap-1.5">
                    {[
                      { key: 'hasTopArm', icon: ArrowUp },
                      { key: 'hasBottomArm', icon: ArrowDown },
                      { key: 'hasLeftArm', icon: ArrowLeft },
                      { key: 'hasRightArm', icon: ArrowRight },
                    ].map((item) => {
                      const active = config[item.key as keyof CrosshairConfig];
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.key}
                          onClick={() => onChange({ [item.key]: !active })}
                          className={`p-2 rounded border transition-all ${
                            active
                              ? 'bg-surface-card text-zinc-100'
                              : 'bg-surface-sidebar text-zinc-600 border-surface-border'
                          }`}
                          style={{
                            borderColor: active ? 'var(--brand-accent-border)' : undefined,
                            color: active ? 'var(--brand-accent)' : undefined,
                          }}
                        >
                          <Icon className="w-3.5 h-3.5" />
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Shape: Square vs Triangle */}
                <div className="flex items-center gap-4">
                  <span className="text-zinc-400 text-xs w-20">Shape</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onChange({ topology: 'cross' })}
                      className={`p-2 rounded border transition-all ${
                        config.topology === 'cross'
                          ? 'bg-surface-card text-zinc-100'
                          : 'bg-surface-sidebar text-zinc-500 border-surface-border'
                      }`}
                      style={{
                        borderColor: config.topology === 'cross' ? 'var(--brand-accent-border)' : undefined,
                        color: config.topology === 'cross' ? 'var(--brand-accent)' : undefined,
                      }}
                    >
                      <Square className="w-3.5 h-3.5 fill-current" />
                    </button>
                    <button
                      onClick={() => onChange({ topology: 'chevron' })}
                      className={`p-2 rounded border transition-all ${
                        config.topology === 'chevron'
                          ? 'bg-surface-card text-zinc-100'
                          : 'bg-surface-sidebar text-zinc-500 border-surface-border'
                      }`}
                      style={{
                        borderColor: config.topology === 'chevron' ? 'var(--brand-accent-border)' : undefined,
                        color: config.topology === 'chevron' ? 'var(--brand-accent)' : undefined,
                      }}
                    >
                      ▲
                    </button>
                  </div>
                </div>
              </div>

              {/* Line Properties Section */}
              <div className="space-y-4 pt-4 border-t border-surface-border">
                <span className="text-[11px] uppercase font-mono tracking-wider text-zinc-500 font-semibold block">
                  Line Properties
                </span>

                {/* Opacity */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-300">Opacity</span>
                    <input
                      type="number"
                      min="0"
                      max="1"
                      step="0.05"
                      value={config.primaryOpacity}
                      onChange={(e) => onChange({ primaryOpacity: Number(e.target.value) })}
                      className="w-12 bg-surface-sidebar border border-surface-border rounded px-1.5 py-0.5 text-right font-mono text-zinc-100"
                    />
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={config.primaryOpacity}
                    onChange={(e) => onChange({ primaryOpacity: Number(e.target.value) })}
                    className="w-full"
                  />
                </div>

                {/* Length */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-300">Length</span>
                    <input
                      type="number"
                      min="0"
                      max="35"
                      value={config.length}
                      onChange={(e) => onChange({ length: Number(e.target.value) })}
                      className="w-12 bg-surface-sidebar border border-surface-border rounded px-1.5 py-0.5 text-right font-mono text-zinc-100"
                    />
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="35"
                    value={config.length}
                    onChange={(e) => onChange({ length: Number(e.target.value) })}
                    className="w-full"
                  />
                </div>

                {/* Thickness */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-300">Thickness</span>
                    <input
                      type="number"
                      min="1"
                      max="16"
                      step="0.5"
                      value={config.thickness}
                      onChange={(e) => onChange({ thickness: Number(e.target.value) })}
                      className="w-12 bg-surface-sidebar border border-surface-border rounded px-1.5 py-0.5 text-right font-mono text-zinc-100"
                    />
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="16"
                    step="0.5"
                    value={config.thickness}
                    onChange={(e) => onChange({ thickness: Number(e.target.value) })}
                    className="w-full"
                  />
                </div>

                {/* Center Gap */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-300">Offset / Gap</span>
                    <input
                      type="number"
                      min="0"
                      max="35"
                      value={config.gap}
                      onChange={(e) => onChange({ gap: Number(e.target.value) })}
                      className="w-12 bg-surface-sidebar border border-surface-border rounded px-1.5 py-0.5 text-right font-mono text-zinc-100"
                    />
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="35"
                    value={config.gap}
                    onChange={(e) => onChange({ gap: Number(e.target.value) })}
                    className="w-full"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CENTER DOT */}
          {activeTab === 'center-dot' && (
            <div className="space-y-6 max-w-2xl">
              <div className="flex items-center justify-between pb-4 border-b border-surface-border">
                <div>
                  <h3 className="font-bold text-sm text-zinc-100">Center Dot</h3>
                  <p className="text-zinc-400 text-xs">Headshot focal point</p>
                </div>
                <input
                  type="checkbox"
                  checked={config.centerDotEnabled}
                  onChange={(e) => onChange({ centerDotEnabled: e.target.checked })}
                  className="w-4 h-4 cursor-pointer"
                  style={{ accentColor: 'var(--brand-accent)' }}
                />
              </div>

              {config.centerDotEnabled && (
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <span className="text-zinc-400 text-xs w-20">Shape</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => onChange({ centerDotShape: 'square' })}
                        className={`px-3 py-1.5 rounded text-xs border ${
                          config.centerDotShape === 'square'
                            ? 'bg-surface-card text-zinc-100'
                            : 'bg-surface-sidebar text-zinc-500 border-surface-border'
                        }`}
                        style={{
                          borderColor: config.centerDotShape === 'square' ? 'var(--brand-accent-border)' : undefined,
                          color: config.centerDotShape === 'square' ? 'var(--brand-accent)' : undefined,
                        }}
                      >
                        Square
                      </button>
                      <button
                        onClick={() => onChange({ centerDotShape: 'circle' })}
                        className={`px-3 py-1.5 rounded text-xs border ${
                          config.centerDotShape === 'circle'
                            ? 'bg-surface-card text-zinc-100'
                            : 'bg-surface-sidebar text-zinc-500 border-surface-border'
                        }`}
                        style={{
                          borderColor: config.centerDotShape === 'circle' ? 'var(--brand-accent-border)' : undefined,
                          color: config.centerDotShape === 'circle' ? 'var(--brand-accent)' : undefined,
                        }}
                      >
                        Round
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-300">Dot Size</span>
                      <span className="font-mono" style={{ color: 'var(--brand-accent)' }}>
                        {config.centerDotSize} px
                      </span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      step="0.5"
                      value={config.centerDotSize}
                      onChange={(e) => onChange({ centerDotSize: Number(e.target.value) })}
                      className="w-full"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: OUTLINE */}
          {activeTab === 'outline' && (
            <div className="space-y-6 max-w-2xl">
              <div className="flex items-center justify-between pb-4 border-b border-surface-border">
                <div>
                  <h3 className="font-bold text-sm text-zinc-100">Outline</h3>
                  <p className="text-zinc-400 text-xs">Black border for high target contrast</p>
                </div>
                <input
                  type="checkbox"
                  checked={config.outlineEnabled}
                  onChange={(e) => onChange({ outlineEnabled: e.target.checked })}
                  className="w-4 h-4 cursor-pointer"
                  style={{ accentColor: 'var(--brand-accent)' }}
                />
              </div>

              {config.outlineEnabled && (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-300">Thickness</span>
                      <span className="font-mono" style={{ color: 'var(--brand-accent)' }}>
                        {config.outlineThickness} px
                      </span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="4"
                      step="0.5"
                      value={config.outlineThickness}
                      onChange={(e) => onChange({ outlineThickness: Number(e.target.value) })}
                      className="w-full"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: ANIMATIONS & BLOOM */}
          {activeTab === 'animations' && (
            <div className="space-y-6 max-w-2xl">
              <div className="p-4 bg-surface-card rounded-lg border border-surface-border space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-sm text-zinc-100">Recoil Firing Bloom</h4>
                    <p className="text-zinc-400 text-xs">Crosshair spreads on weapon fire</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.dynamicFiring}
                    onChange={(e) => onChange({ dynamicFiring: e.target.checked })}
                    className="w-4 h-4 cursor-pointer"
                    style={{ accentColor: 'var(--brand-accent)' }}
                  />
                </div>

                {config.dynamicFiring && (
                  <div className="space-y-3 pt-3 border-t border-surface-border">
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-zinc-300">Bloom Spread Amount</span>
                        <span className="font-mono" style={{ color: 'var(--brand-accent)' }}>
                          +{config.firingBloomExpansion} px
                        </span>
                      </div>
                      <input
                        type="range"
                        min="2"
                        max="16"
                        value={config.firingBloomExpansion}
                        onChange={(e) => onChange({ firingBloomExpansion: Number(e.target.value) })}
                        className="w-full"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: LAYER */}
          {activeTab === 'layer' && (
            <div className="space-y-6 max-w-2xl">
              <div className="flex items-center justify-between pb-4 border-b border-surface-border">
                <div>
                  <h3 className="font-bold text-sm text-zinc-100">Spread & Ring Layer</h3>
                  <p className="text-zinc-400 text-xs">Shotgun spread or sniper outer ring</p>
                </div>
                <input
                  type="checkbox"
                  checked={config.circleEnabled}
                  onChange={(e) => onChange({ circleEnabled: e.target.checked })}
                  className="w-4 h-4 cursor-pointer"
                  style={{ accentColor: 'var(--brand-accent)' }}
                />
              </div>

              {config.circleEnabled && (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-300">Ring Radius</span>
                      <span className="font-mono" style={{ color: 'var(--brand-accent)' }}>
                        {config.circleRadius} px
                      </span>
                    </div>
                    <input
                      type="range"
                      min="6"
                      max="50"
                      value={config.circleRadius}
                      onChange={(e) => onChange({ circleRadius: Number(e.target.value) })}
                      className="w-full"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Area: Live Target & Layers Stack */}
        <div className="w-80 bg-surface-sidebar border-l border-surface-border flex flex-col shrink-0">
          {/* Top: Live Target Preview Canvas */}
          <div className="p-4 border-b border-surface-border flex flex-col">
            <div className="flex items-center justify-between text-[11px] text-zinc-400 font-mono mb-2">
              <span>TARGET PREVIEW</span>
              <span>{Math.round(zoomLevel * 100)}%</span>
            </div>

            <div
              className="w-full h-56 rounded-lg bg-surface-base border border-surface-border relative flex items-center justify-center overflow-hidden cursor-crosshair select-none"
              onMouseDown={(e) => {
                if (e.button === 0) {
                  setIsFiring(true);
                  setTimeout(() => setIsFiring(false), config.firingDecayMs || 120);
                } else if (e.button === 2) {
                  setIsAds(true);
                }
              }}
              onMouseUp={(e) => {
                if (e.button === 2) setIsAds(false);
              }}
              onContextMenu={(e) => e.preventDefault()}
            >
              {/* Subtle technical cross lines */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                <div className="w-full h-[1px] bg-white/20" />
                <div className="absolute h-full w-[1px] bg-white/20" />
              </div>

              <ReticleRenderer
                config={config}
                scale={zoomLevel}
                isFiring={isFiring}
                isAds={isAds}
              />

              <div className="absolute bottom-2 left-2 text-[9px] font-mono text-zinc-500 pointer-events-none">
                L-Click: Fire Bloom • R-Click: ADS
              </div>
            </div>

            {/* Zoom selector */}
            <div className="flex items-center justify-center gap-1.5 mt-2">
              {[1, 2, 4].map((z) => (
                <button
                  key={z}
                  onClick={() => setZoomLevel(z)}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                    zoomLevel === z ? 'font-bold text-black' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                  style={{
                    backgroundColor: zoomLevel === z ? 'var(--brand-accent)' : undefined,
                  }}
                >
                  {z}x
                </button>
              ))}
            </div>
          </div>

          {/* Bottom: Layers Panel */}
          <div className="flex-1 p-4 flex flex-col overflow-y-auto text-xs">
            <div className="flex items-center justify-between mb-3">
              <span className="font-semibold text-zinc-300 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" style={{ color: 'var(--brand-accent)' }} />
                Layers
              </span>
              <button
                onClick={() => setActiveTab('lines')}
                className="text-[11px] hover:underline"
                style={{ color: 'var(--brand-accent)' }}
              >
                + New Layer
              </button>
            </div>

            {/* Layers List */}
            <div className="space-y-1.5">
              {[
                { id: 'lines', name: 'Layer 0: Primary Lines', active: config.length > 0 },
                { id: 'center-dot', name: 'Layer 1: Center Dot', active: config.centerDotEnabled },
                { id: 'outline', name: 'Layer 2: Outline', active: config.outlineEnabled },
                { id: 'layer', name: 'Layer 3: Spread Ring', active: config.circleEnabled },
              ].map((layer) => (
                <div
                  key={layer.id}
                  onClick={() => setActiveTab(layer.id as any)}
                  className={`flex items-center justify-between p-2 rounded-md border cursor-pointer transition-all ${
                    activeTab === layer.id
                      ? 'bg-surface-card text-zinc-100 font-medium'
                      : 'bg-surface-sidebar border-surface-border text-zinc-400 hover:text-zinc-200'
                  }`}
                  style={{
                    borderColor: activeTab === layer.id ? 'var(--brand-accent-border)' : undefined,
                  }}
                >
                  <span className="text-[11px]">{layer.name}</span>
                  {layer.active ? (
                    <Eye className="w-3 h-3" style={{ color: 'var(--brand-accent)' }} />
                  ) : (
                    <EyeOff className="w-3 h-3 text-zinc-600" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
