import React, { useState } from 'react';
import { CrosshairConfig, CrosshairTopology, StretchedResolutionMode, AdsMorphStyle } from '../types/crosshair';
import {
  Sliders,
  Palette,
  Zap,
  Maximize2,
  RotateCcw,
  Minus,
  Plus,
} from 'lucide-react';

interface ReticleControlsProps {
  config: CrosshairConfig;
  onChange: (updated: Partial<CrosshairConfig>) => void;
  onResetCenter: () => void;
}

export const ReticleControls: React.FC<ReticleControlsProps> = ({
  config,
  onChange,
  onResetCenter,
}) => {
  const [activeTab, setActiveTab] = useState<'geometry' | 'color' | 'dynamics' | 'stretched'>('geometry');

  const QUICK_PALETTE = [
    { label: 'Cyan', hex: '#00ffff' },
    { label: 'Green', hex: '#00ff66' },
    { label: 'Yellow', hex: '#ffff00' },
    { label: 'White', hex: '#ffffff' },
    { label: 'Magenta', hex: '#ff00aa' },
    { label: 'Red', hex: '#ff3333' },
  ];

  return (
    <div className="flex flex-col h-full bg-panel-elevated border border-panel-border rounded-xl overflow-hidden shadow-xl">
      {/* Segmented Tab Header */}
      <div className="flex items-center p-2 bg-panel-base border-b border-panel-border gap-1">
        {[
          { id: 'geometry', label: 'Geometry', icon: Sliders },
          { id: 'color', label: 'Optics & Color', icon: Palette },
          { id: 'dynamics', label: 'Dynamics & ADS', icon: Zap },
          { id: 'stretched', label: '4:3 & Nudge', icon: Maximize2 },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? 'bg-zinc-800 text-zinc-100 border border-zinc-700 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-panel-subtle'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Controls Body */}
      <div className="flex-1 p-5 overflow-y-auto space-y-5 scrollbar-thin text-xs">
        {/* ================= GEOMETRY TAB ================= */}
        {activeTab === 'geometry' && (
          <div className="space-y-5">
            {/* Reticle Style Selector */}
            <div className="space-y-2">
              <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-400 font-semibold">
                Reticle Topology
              </span>
              <div className="grid grid-cols-5 gap-1.5 bg-panel-base p-1 rounded-lg border border-panel-border">
                {[
                  { id: 'cross', label: 'Cross' },
                  { id: 't-shape', label: 'T-Shape' },
                  { id: 'dot', label: 'Dot' },
                  { id: 'circle', label: 'Ring' },
                  { id: 'chevron', label: 'Chevron' },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => onChange({ topology: item.id as CrosshairTopology })}
                    className={`py-1.5 text-center rounded-md font-medium text-[11px] transition-all ${
                      config.topology === item.id
                        ? 'bg-zinc-100 text-zinc-950 font-bold shadow-sm'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-panel-subtle'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Arm Dimensions */}
            {config.topology !== 'dot' && (
              <div className="p-3.5 bg-panel-base rounded-xl border border-panel-border space-y-4">
                <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-400 font-semibold block">
                  Arm Parameters
                </span>

                {/* Length */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-300 font-medium">Length</span>
                    <div className="flex items-center gap-1 font-mono">
                      <input
                        type="number"
                        min="0"
                        max="40"
                        value={config.length}
                        onChange={(e) => onChange({ length: Number(e.target.value) })}
                        className="w-12 bg-panel-subtle border border-panel-border rounded px-1.5 py-0.5 text-right text-zinc-100 font-mono focus:outline-none focus:border-zinc-500"
                      />
                      <span className="text-zinc-500 text-[11px]">px</span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="40"
                    value={config.length}
                    onChange={(e) => onChange({ length: Number(e.target.value) })}
                    className="w-full"
                  />
                </div>

                {/* Thickness */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-300 font-medium">Thickness</span>
                    <div className="flex items-center gap-1 font-mono">
                      <input
                        type="number"
                        min="1"
                        max="16"
                        step="0.5"
                        value={config.thickness}
                        onChange={(e) => onChange({ thickness: Number(e.target.value) })}
                        className="w-12 bg-panel-subtle border border-panel-border rounded px-1.5 py-0.5 text-right text-zinc-100 font-mono focus:outline-none focus:border-zinc-500"
                      />
                      <span className="text-zinc-500 text-[11px]">px</span>
                    </div>
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

                {/* Gap */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-300 font-medium">Center Gap</span>
                    <div className="flex items-center gap-1 font-mono">
                      <input
                        type="number"
                        min="0"
                        max="40"
                        value={config.gap}
                        onChange={(e) => onChange({ gap: Number(e.target.value) })}
                        className="w-12 bg-panel-subtle border border-panel-border rounded px-1.5 py-0.5 text-right text-zinc-100 font-mono focus:outline-none focus:border-zinc-500"
                      />
                      <span className="text-zinc-500 text-[11px]">px</span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="40"
                    value={config.gap}
                    onChange={(e) => onChange({ gap: Number(e.target.value) })}
                    className="w-full"
                  />
                </div>
              </div>
            )}

            {/* Individual Arm Mask */}
            {config.topology !== 'dot' && config.topology !== 'chevron' && (
              <div className="p-3.5 bg-panel-base rounded-xl border border-panel-border space-y-2">
                <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-400 font-semibold block">
                  Directional Masking
                </span>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { key: 'hasTopArm', label: 'Top [Y-]' },
                    { key: 'hasBottomArm', label: 'Bottom [Y+]' },
                    { key: 'hasLeftArm', label: 'Left [X-]' },
                    { key: 'hasRightArm', label: 'Right [X+]' },
                  ].map((arm) => {
                    const active = config[arm.key as keyof CrosshairConfig];
                    return (
                      <button
                        key={arm.key}
                        onClick={() => onChange({ [arm.key]: !active })}
                        className={`py-1.5 px-2 rounded-lg text-[11px] font-mono transition-all border ${
                          active
                            ? 'bg-zinc-800 text-zinc-100 border-zinc-600 font-semibold'
                            : 'bg-panel-subtle text-zinc-500 border-panel-border hover:text-zinc-300'
                        }`}
                      >
                        {arm.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Circular Spread Ring */}
            <div className="p-3.5 bg-panel-base rounded-xl border border-panel-border space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-semibold text-zinc-200 block">Shotgun / Spread Ring</span>
                  <span className="text-[11px] text-zinc-400">Radial spread guide ring</span>
                </div>
                <input
                  type="checkbox"
                  checked={config.circleEnabled}
                  onChange={(e) => onChange({ circleEnabled: e.target.checked })}
                  className="w-4 h-4 accent-emerald-500 cursor-pointer"
                />
              </div>

              {config.circleEnabled && (
                <div className="pt-2 border-t border-panel-border space-y-3">
                  <div className="space-y-1">
                    <div className="flex justify-between text-zinc-300">
                      <span>Radius</span>
                      <span className="font-mono text-zinc-200">{config.circleRadius} px</span>
                    </div>
                    <input
                      type="range"
                      min="4"
                      max="60"
                      value={config.circleRadius}
                      onChange={(e) => onChange({ circleRadius: Number(e.target.value) })}
                      className="w-full"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= OPTICS & COLOR TAB ================= */}
        {activeTab === 'color' && (
          <div className="space-y-5">
            {/* Color Pipeline */}
            <div className="p-3.5 bg-panel-base rounded-xl border border-panel-border space-y-3">
              <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-400 font-semibold block">
                Reticle Emission Color
              </span>

              <div className="flex items-center gap-3">
                <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-zinc-700 shrink-0">
                  <input
                    type="color"
                    value={config.primaryColor}
                    onChange={(e) => onChange({ primaryColor: e.target.value })}
                    className="absolute inset-0 w-full h-full cursor-pointer scale-150"
                  />
                </div>
                <input
                  type="text"
                  value={config.primaryColor}
                  onChange={(e) => onChange({ primaryColor: e.target.value })}
                  className="flex-1 bg-panel-subtle border border-panel-border rounded-lg px-3 py-1.5 font-mono text-zinc-100 uppercase focus:outline-none focus:border-zinc-500"
                />
              </div>

              {/* Quick Swatches */}
              <div className="grid grid-cols-6 gap-1.5 pt-1">
                {QUICK_PALETTE.map((c) => (
                  <button
                    key={c.hex}
                    onClick={() => onChange({ primaryColor: c.hex })}
                    className="h-7 rounded-md border border-zinc-800 transition-transform hover:scale-105"
                    style={{ backgroundColor: c.hex }}
                    title={c.label}
                  />
                ))}
              </div>
            </div>

            {/* Opacity */}
            <div className="p-3.5 bg-panel-base rounded-xl border border-panel-border space-y-2">
              <div className="flex justify-between text-zinc-300">
                <span className="font-medium">Alpha Opacity</span>
                <span className="font-mono text-zinc-200">{Math.round(config.primaryOpacity * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={config.primaryOpacity}
                onChange={(e) => onChange({ primaryOpacity: Number(e.target.value) })}
                className="w-full"
              />
            </div>

            {/* Center Dot */}
            <div className="p-3.5 bg-panel-base rounded-xl border border-panel-border space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-semibold text-zinc-200 block">Center Point Dot</span>
                  <span className="text-[11px] text-zinc-400">Direct headshot focal point</span>
                </div>
                <input
                  type="checkbox"
                  checked={config.centerDotEnabled}
                  onChange={(e) => onChange({ centerDotEnabled: e.target.checked })}
                  className="w-4 h-4 accent-emerald-500 cursor-pointer"
                />
              </div>

              {config.centerDotEnabled && (
                <div className="pt-2 border-t border-panel-border space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => onChange({ centerDotShape: 'square' })}
                      className={`py-1.5 text-center rounded-lg text-xs font-mono border transition-all ${
                        config.centerDotShape === 'square'
                          ? 'bg-zinc-800 text-zinc-100 border-zinc-600'
                          : 'bg-panel-subtle text-zinc-400 border-panel-border'
                      }`}
                    >
                      Square Pixel
                    </button>
                    <button
                      onClick={() => onChange({ centerDotShape: 'circle' })}
                      className={`py-1.5 text-center rounded-lg text-xs font-mono border transition-all ${
                        config.centerDotShape === 'circle'
                          ? 'bg-zinc-800 text-zinc-100 border-zinc-600'
                          : 'bg-panel-subtle text-zinc-400 border-panel-border'
                      }`}
                    >
                      Subpixel Radial
                    </button>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-zinc-300">
                      <span>Dot Diameter</span>
                      <span className="font-mono text-zinc-200">{config.centerDotSize} px</span>
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

            {/* High-Contrast Outlines */}
            <div className="p-3.5 bg-panel-base rounded-xl border border-panel-border space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-semibold text-zinc-200 block">Contrast Outline</span>
                  <span className="text-[11px] text-zinc-400">Black border for target separation</span>
                </div>
                <input
                  type="checkbox"
                  checked={config.outlineEnabled}
                  onChange={(e) => onChange({ outlineEnabled: e.target.checked })}
                  className="w-4 h-4 accent-emerald-500 cursor-pointer"
                />
              </div>

              {config.outlineEnabled && (
                <div className="pt-2 border-t border-panel-border space-y-2">
                  <div className="flex justify-between text-zinc-300">
                    <span>Outline Stroke Width</span>
                    <span className="font-mono text-zinc-200">{config.outlineThickness} px</span>
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
              )}
            </div>
          </div>
        )}

        {/* ================= DYNAMICS TAB ================= */}
        {activeTab === 'dynamics' && (
          <div className="space-y-5">
            {/* Recoil Bloom */}
            <div className="p-4 bg-panel-base rounded-xl border border-panel-border space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-semibold text-zinc-200 block">Firing Recoil Bloom</span>
                  <span className="text-[11px] text-zinc-400">Dynamic spread impulse on primary fire</span>
                </div>
                <input
                  type="checkbox"
                  checked={config.dynamicFiring}
                  onChange={(e) => onChange({ dynamicFiring: e.target.checked })}
                  className="w-4 h-4 accent-emerald-500 cursor-pointer"
                />
              </div>

              {config.dynamicFiring && (
                <div className="pt-3 border-t border-panel-border space-y-3">
                  <div className="space-y-1">
                    <div className="flex justify-between text-zinc-300">
                      <span>Bloom Expansion Delta</span>
                      <span className="font-mono text-emerald-400">+{config.firingBloomExpansion} px</span>
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

                  <div className="space-y-1">
                    <div className="flex justify-between text-zinc-300">
                      <span>Recovery Decay Latency</span>
                      <span className="font-mono text-zinc-200">{config.firingDecayMs} ms</span>
                    </div>
                    <input
                      type="range"
                      min="60"
                      max="300"
                      step="10"
                      value={config.firingDecayMs}
                      onChange={(e) => onChange({ firingDecayMs: Number(e.target.value) })}
                      className="w-full"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* ADS Morphing */}
            <div className="p-4 bg-panel-base rounded-xl border border-panel-border space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-semibold text-zinc-200 block">Aim-Down-Sights (ADS) Morph</span>
                  <span className="text-[11px] text-zinc-400">Alternate state triggered on right-click hold</span>
                </div>
                <input
                  type="checkbox"
                  checked={config.adsMorphEnabled}
                  onChange={(e) => onChange({ adsMorphEnabled: e.target.checked })}
                  className="w-4 h-4 accent-emerald-500 cursor-pointer"
                />
              </div>

              {config.adsMorphEnabled && (
                <div className="pt-3 border-t border-panel-border space-y-3">
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: 'shrink', label: 'Tight Shrink' },
                      { id: 'dot-only', label: 'Dot Only' },
                      { id: 'fade', label: 'Ghost Fade' },
                    ].map((item) => (
                      <button
                        key={item.id}
                        onClick={() => onChange({ adsStyle: item.id as AdsMorphStyle })}
                        className={`py-1.5 px-2 rounded-lg text-xs font-medium border transition-all ${
                          config.adsStyle === item.id
                            ? 'bg-zinc-800 text-zinc-100 border-zinc-600'
                            : 'bg-panel-subtle text-zinc-400 border-panel-border'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= 4:3 & NUDGE TAB ================= */}
        {activeTab === 'stretched' && (
          <div className="space-y-5">
            {/* Stretched Resolution Compensation Matrix */}
            <div className="p-4 bg-panel-base rounded-xl border border-panel-border space-y-3">
              <div>
                <span className="font-semibold text-zinc-200 block">Stretched Resolution Engine</span>
                <span className="text-[11px] text-zinc-400">
                  Pre-compresses horizontal coordinates by factor λ so that GPU scaling does not distort circles into ellipses.
                </span>
              </div>

              <div className="grid grid-cols-4 gap-1.5 pt-1">
                {[
                  { id: 'none', label: '16:9 Native', ratio: 1.0 },
                  { id: '4:3', label: '4:3 Stretch', ratio: 0.75 },
                  { id: '16:10', label: '16:10 Stretch', ratio: 0.90 },
                  { id: '5:4', label: '5:4 Stretch', ratio: 0.703 },
                ].map((mode) => (
                  <button
                    key={mode.id}
                    onClick={() =>
                      onChange({
                        stretchedMode: mode.id as StretchedResolutionMode,
                        stretchCompressionRatio: mode.ratio,
                      })
                    }
                    className={`py-2 px-1 text-center rounded-lg text-xs font-mono border transition-all ${
                      config.stretchedMode === mode.id
                        ? 'bg-zinc-800 text-zinc-100 border-zinc-500 font-bold'
                        : 'bg-panel-subtle text-zinc-400 border-panel-border hover:text-zinc-200'
                    }`}
                  >
                    <div>{mode.label}</div>
                    <div className="text-[10px] text-zinc-500">λ={mode.ratio.toFixed(2)}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Subpixel Nudge Steppers */}
            <div className="p-4 bg-panel-base rounded-xl border border-panel-border space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-semibold text-zinc-200 block">Subpixel Coordinate Calibration</span>
                  <span className="text-[11px] text-zinc-400">Physical screen center calibration</span>
                </div>
                <button
                  onClick={onResetCenter}
                  className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-zinc-100 px-2 py-1 rounded bg-panel-subtle border border-panel-border font-mono"
                >
                  <RotateCcw className="w-3 h-3" />
                  Origin (0,0)
                </button>
              </div>

              {/* Stepper Grid */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                {/* X Axis */}
                <div className="p-2.5 bg-panel-subtle rounded-lg border border-panel-border flex items-center justify-between">
                  <span className="font-mono text-zinc-400 font-semibold">X-AXIS</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onChange({ offsetX: config.offsetX - 1 })}
                      className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-12 text-center font-mono font-bold text-emerald-400">
                      {config.offsetX >= 0 ? `+${config.offsetX}` : config.offsetX}px
                    </span>
                    <button
                      onClick={() => onChange({ offsetX: config.offsetX + 1 })}
                      className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Y Axis */}
                <div className="p-2.5 bg-panel-subtle rounded-lg border border-panel-border flex items-center justify-between">
                  <span className="font-mono text-zinc-400 font-semibold">Y-AXIS</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onChange({ offsetY: config.offsetY - 1 })}
                      className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-12 text-center font-mono font-bold text-emerald-400">
                      {config.offsetY >= 0 ? `+${config.offsetY}` : config.offsetY}px
                    </span>
                    <button
                      onClick={() => onChange({ offsetY: config.offsetY + 1 })}
                      className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
