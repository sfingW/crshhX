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
import { LIMITS, V2_DEFAULTS } from '../lib/crosshairSchema';
import { ArmGeometryPanel } from './editor/ArmGeometryPanel';
import { ColorField } from './editor/ColorField';
import { NumberControl, SectionCard } from './editor/controls';

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
                <button
                  type="button"
                  onClick={() => onChange({ length: 4, thickness: 2, gap: 2 })}
                  title="Reset length, thickness and gap"
                  aria-label="Reset length, thickness and gap"
                  className="mb-2 p-1 rounded text-zinc-600 hover:text-zinc-200 hover:bg-panel-subtle transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>

                {/*
                  Ranges come from LIMITS — the same table the schema validator
                  clamps to — so a value the editor can produce can never be a
                  value the validator would reject on reload.
                */}
                <NumberControl
                  label="Length"
                  value={config.length}
                  min={LIMITS.length.min}
                  max={LIMITS.length.max}
                  step={LIMITS.length.step}
                  onChange={(v) => onChange({ length: v })}
                />
                <NumberControl
                  label="Thickness"
                  value={config.thickness}
                  min={LIMITS.thickness.min}
                  max={LIMITS.thickness.max}
                  step={LIMITS.thickness.step}
                  onChange={(v) => onChange({ thickness: v })}
                />
                <div>
                  <NumberControl
                    label="Center Gap"
                    value={config.gap}
                    min={LIMITS.gap.min}
                    max={LIMITS.gap.max}
                    step={LIMITS.gap.step}
                    onChange={(v) => onChange({ gap: v })}
                  />
                  <p className="text-[10px] text-zinc-600 leading-snug pt-1">
                    Negative values pull the arms past the centre until they meet — the solid plus
                    used by many CS2 and Valorant pros.
                  </p>
                </div>
              </div>
            )}

            {/* Arms: directional mask + independent per-direction dimensions */}
            {config.topology !== 'dot' && config.topology !== 'chevron' && (
              <div className="p-3.5 bg-panel-base rounded-xl border border-panel-border">
                <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-400 font-semibold block mb-3">
                  Arm Directions
                </span>
                <ArmGeometryPanel config={config} onChange={onChange} />
              </div>
            )}

            {/* Transform: rotation + overall scale */}
            {config.topology !== 'dot' && (
              <div className="p-3.5 bg-panel-base rounded-xl border border-panel-border space-y-4">
                <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-400 font-semibold block">
                  Transform
                </span>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-300 font-medium">Rotation</span>
                    <div className="flex items-center gap-1 font-mono">
                      <input
                        type="number"
                        min="0"
                        max="360"
                        step="1"
                        value={config.rotation ?? 0}
                        onChange={(e) => onChange({ rotation: Number(e.target.value) })}
                        aria-label="Rotation degrees"
                        className="w-14 bg-panel-subtle border border-panel-border rounded px-1.5 py-0.5 text-right text-zinc-100 font-mono focus:outline-none focus:border-zinc-500"
                      />
                      <span className="text-zinc-500 text-[11px] w-4">°</span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="360"
                    step="1"
                    value={config.rotation ?? 0}
                    onChange={(e) => onChange({ rotation: Number(e.target.value) })}
                    aria-label="Rotation slider"
                    className="w-full"
                  />
                  <p className="text-[10px] text-zinc-600 leading-snug">
                    Turns the arms about the centre — 45° makes a plus into an X. The spread ring
                    stays unrotated because a circle looks the same at any angle.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-300 font-medium">Overall Scale</span>
                    <div className="flex items-center gap-1 font-mono">
                      <input
                        type="number"
                        min="0.25"
                        max="3"
                        step="0.05"
                        value={config.scale ?? 1}
                        onChange={(e) => onChange({ scale: Number(e.target.value) })}
                        aria-label="Overall scale"
                        className="w-14 bg-panel-subtle border border-panel-border rounded px-1.5 py-0.5 text-right text-zinc-100 font-mono focus:outline-none focus:border-zinc-500"
                      />
                      <span className="text-zinc-500 text-[11px] w-4">×</span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="0.25"
                    max="3"
                    step="0.05"
                    value={config.scale ?? 1}
                    onChange={(e) => onChange({ scale: Number(e.target.value) })}
                    aria-label="Overall scale slider"
                    className="w-full"
                  />
                  <p className="text-[10px] text-zinc-600 leading-snug">
                    Scales the finished reticle without changing the pixel dimensions you dialled in
                    above. 1× is the historical size.
                  </p>
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

                  {/* v3 — segmented ring. One segment is the classic full circle. */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-zinc-300">
                      <span>Segments</span>
                      <span className="font-mono text-zinc-200">
                        {(config.circleSegments ?? 1) === 1
                          ? 'full circle'
                          : `${config.circleSegments} arcs`}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="12"
                      step="1"
                      value={config.circleSegments ?? 1}
                      onChange={(e) => onChange({ circleSegments: Number(e.target.value) })}
                      className="w-full"
                    />
                  </div>

                  {(config.circleSegments ?? 1) > 1 && (
                    <>
                      <div className="space-y-1">
                        <div className="flex justify-between text-zinc-300">
                          <span>Arc span</span>
                          <span className="font-mono text-zinc-200">
                            {config.circleArcSpan ?? 360}°
                          </span>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max="359"
                          step="0.5"
                          value={config.circleArcSpan ?? 360}
                          onChange={(e) => onChange({ circleArcSpan: Number(e.target.value) })}
                          className="w-full"
                        />
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-zinc-300">
                          <span>Pattern rotation</span>
                          <span className="font-mono text-zinc-200">
                            {config.circleArcOffset ?? 0}°
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="360"
                          step="1"
                          value={config.circleArcOffset ?? 0}
                          onChange={(e) => onChange({ circleArcOffset: Number(e.target.value) })}
                          className="w-full"
                        />
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= OPTICS & COLOR TAB ================= */}
        {activeTab === 'color' && (
          <div className="space-y-5">
            {/* Reticle colour, with hex / RGB / picker / swatches */}
            <div className="p-3.5 bg-panel-base rounded-xl border border-panel-border space-y-3">
              <ColorField
                label="Reticle Emission Color"
                hint="Arms and, unless overridden, the centre dot"
                value={config.primaryColor}
                onChange={(hex) => onChange({ primaryColor: hex })}
                opacity={config.primaryOpacity}
                onOpacityChange={(o) => onChange({ primaryOpacity: o })}
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
            <SectionCard
              title="Contrast Outline"
              subtitle="Black border drawn around each element for target separation"
              action={
                <input
                  type="checkbox"
                  checked={config.outlineEnabled}
                  onChange={(e) => onChange({ outlineEnabled: e.target.checked })}
                  aria-label="Enable contrast outline"
                  className="w-4 h-4 accent-emerald-500 cursor-pointer"
                />
              }
              onReset={() =>
                onChange({
                  outlineEnabled: false,
                  outlineColor: '#000000',
                  outlineThickness: 1,
                  outlineOpacity: 1,
                })
              }
              inert={!config.outlineEnabled}
            >
              <NumberControl
                label="Outline Stroke Width"
                value={config.outlineThickness}
                min={LIMITS.outlineThickness.min}
                max={6}
                step={LIMITS.outlineThickness.step}
                onChange={(v) => onChange({ outlineThickness: v })}
                disabled={!config.outlineEnabled}
              />
              <NumberControl
                label="Outline Opacity"
                value={Math.round(config.outlineOpacity * 100)}
                min={0}
                max={100}
                step={1}
                unit="%"
                onChange={(v) => onChange({ outlineOpacity: v / 100 })}
                disabled={!config.outlineEnabled}
              />
              <ColorField
                label="Outline Colour"
                value={config.outlineColor}
                onChange={(hex) => onChange({ outlineColor: hex })}
              />
            </SectionCard>

            <SectionCard
              title="Inner Outline"
              subtitle="A border painted inside each element, for a hollow or cored look"
              action={
                <input
                  type="checkbox"
                  checked={!!config.innerOutlineEnabled}
                  onChange={(e) => onChange({ innerOutlineEnabled: e.target.checked })}
                  aria-label="Enable inner outline"
                  className="w-4 h-4 accent-emerald-500 cursor-pointer"
                />
              }
              onReset={() =>
                onChange({
                  innerOutlineEnabled: false,
                  innerOutlineColor: V2_DEFAULTS.innerOutlineColor,
                  innerOutlineThickness: V2_DEFAULTS.innerOutlineThickness,
                  innerOutlineOpacity: V2_DEFAULTS.innerOutlineOpacity,
                })
              }
              inert={!config.innerOutlineEnabled}
            >
              <NumberControl
                label="Inner Stroke Width"
                value={config.innerOutlineThickness ?? V2_DEFAULTS.innerOutlineThickness}
                min={LIMITS.innerOutlineThickness.min}
                max={LIMITS.innerOutlineThickness.max}
                step={LIMITS.innerOutlineThickness.step}
                onChange={(v) => onChange({ innerOutlineThickness: v })}
                disabled={!config.innerOutlineEnabled}
              />
              <NumberControl
                label="Inner Opacity"
                value={Math.round((config.innerOutlineOpacity ?? 1) * 100)}
                min={0}
                max={100}
                step={1}
                unit="%"
                onChange={(v) => onChange({ innerOutlineOpacity: v / 100 })}
                disabled={!config.innerOutlineEnabled}
              />
              <ColorField
                label="Inner Outline Colour"
                value={config.innerOutlineColor ?? V2_DEFAULTS.innerOutlineColor}
                onChange={(hex) => onChange({ innerOutlineColor: hex })}
              />
              <p className="text-[10px] text-zinc-600 leading-snug">
                Arms thinner than twice the stroke width cannot hold an inner border, so it is
                omitted on those rather than drawn inverted.
              </p>
            </SectionCard>
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
