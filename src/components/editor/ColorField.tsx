import React, { useEffect, useMemo, useState } from 'react';
import { Check, ChevronDown, Plus, Trash2, X } from 'lucide-react';
import {
  describeColor,
  hexToHsl,
  hexToRgb,
  parseColorInput,
  readableTextColor,
  rgbToHex,
} from '../../lib/colorUtils';
import {
  loadSwatches,
  rememberRecentColor,
  removeSwatchColor,
  saveSwatchColor,
  type SwatchStore,
} from '../../lib/storage';

/**
 * Colour field for the crosshair editor.
 *
 * The requirement is that a user can reproduce a *precise* colour rather than
 * picking the nearest swatch, so this offers four routes to the same value: a
 * system colour picker, a hex field, three RGB channels, and a remembered
 * swatch. All of them commit the same canonical `#rrggbb` string.
 *
 * Advanced controls are behind progressive disclosure — the collapsed state is
 * just a chip and a hex field, which keeps the editor calm for someone who only
 * wants "make it green".
 */

export interface ColorPreset {
  label: string;
  hex: string;
}

interface ColorFieldProps {
  label: string;
  /** Canonical `#rrggbb`. */
  value: string;
  onChange: (hex: string) => void;
  /** 0–1. When omitted the opacity row is not rendered. */
  opacity?: number;
  onOpacityChange?: (opacity: number) => void;
  presets?: ColorPreset[];
  /** Extra hint shown under the label, e.g. what the colour applies to. */
  hint?: string;
}

export const DEFAULT_COLOR_PRESETS: ColorPreset[] = [
  { label: 'Cyan', hex: '#00ffff' },
  { label: 'Green', hex: '#00ff66' },
  { label: 'Yellow', hex: '#ffff00' },
  { label: 'White', hex: '#ffffff' },
  { label: 'Magenta', hex: '#ff00aa' },
  { label: 'Red', hex: '#ff3333' },
  { label: 'Orange', hex: '#ff8800' },
  { label: 'Black', hex: '#000000' },
];

export const ColorField: React.FC<ColorFieldProps> = ({
  label,
  value,
  onChange,
  opacity,
  onOpacityChange,
  presets = DEFAULT_COLOR_PRESETS,
  hint,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [draft, setDraft] = useState(value);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [swatches, setSwatches] = useState<SwatchStore>(() => loadSwatches());

  // Keep the text field in step with external changes (undo, preset load,
  // switching crosshair) without fighting the user mid-typing.
  useEffect(() => {
    setDraft(value);
    setDraftError(null);
  }, [value]);

  const rgb = useMemo(() => hexToRgb(value), [value]);
  const hsl = useMemo(() => hexToHsl(value), [value]);

  /** Commits a colour and records it as recently used. */
  const commit = (hex: string) => {
    const canonical = parseColorInput(hex);
    if (!canonical) return;
    setSwatches(rememberRecentColor(canonical));
    setDraft(canonical);
    setDraftError(null);
    onChange(canonical);
  };

  const submitDraft = () => {
    const canonical = parseColorInput(draft);
    if (!canonical) {
      setDraftError('Not a colour. Try #00ffcc, 00ffcc or rgb(0, 255, 204).');
      return;
    }
    commit(canonical);
  };

  const setChannel = (channel: 'r' | 'g' | 'b', raw: number) => {
    if (!rgb) return;
    const next = { ...rgb, [channel]: Math.min(255, Math.max(0, Math.round(raw) || 0)) };
    // Channel edits are continuous, so they update the value immediately but
    // only land in "recent" when the field loses focus.
    onChange(rgbToHex(next));
    setDraft(rgbToHex(next));
  };

  const saveCurrentToSwatches = () => {
    setSwatches(saveSwatchColor(value));
  };

  const forgetSwatch = (hex: string) => {
    setSwatches(removeSwatchColor(hex));
  };

  return (
    <div className="space-y-2">
      {/* Collapsed row: label, chip, hex field */}
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <span className="text-zinc-300 font-medium text-[12px] block truncate">{label}</span>
          {hint && <span className="text-zinc-600 text-[10px] block truncate">{hint}</span>}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* System picker, layered over the chip so the chip *is* the control */}
          <span className="relative w-7 h-7 rounded border border-panel-border overflow-hidden shrink-0">
            <span
              className="absolute inset-0"
              style={{
                backgroundColor: value,
                opacity: opacity === undefined ? 1 : Math.max(0.08, opacity),
              }}
            />
            {/* Checkerboard so a low-opacity or black colour is still visible */}
            <span
              className="absolute inset-0 -z-10"
              style={{
                backgroundImage:
                  'linear-gradient(45deg,#2a2a2e 25%,transparent 25%),linear-gradient(-45deg,#2a2a2e 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#2a2a2e 75%),linear-gradient(-45deg,transparent 75%,#2a2a2e 75%)',
                backgroundSize: '8px 8px',
                backgroundPosition: '0 0,0 4px,4px -4px,-4px 0',
              }}
            />
            <input
              type="color"
              value={/^[0-9a-f]{6}$/i.test(value.slice(1)) ? value : '#000000'}
              onChange={(e) => commit(e.target.value)}
              aria-label={`${label} colour picker`}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </span>

          <div className="flex items-center bg-panel-subtle border border-panel-border rounded overflow-hidden focus-within:border-zinc-500">
            <span className="pl-1.5 text-zinc-600 font-mono text-[11px] select-none">#</span>
            <input
              type="text"
              value={draft.replace(/^#/, '')}
              onChange={(e) => {
                setDraft(e.target.value);
                setDraftError(null);
              }}
              onBlur={submitDraft}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitDraft();
                if (e.key === 'Escape') {
                  setDraft(value);
                  setDraftError(null);
                }
              }}
              spellCheck={false}
              maxLength={7}
              aria-label={`${label} hex value`}
              className="w-[68px] bg-transparent px-1 py-1 text-[11px] font-mono text-zinc-100 uppercase focus:outline-none"
            />
          </div>

          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            aria-label={`${expanded ? 'Hide' : 'Show'} advanced colour controls for ${label}`}
            className="p-1 rounded text-zinc-500 hover:text-zinc-200 hover:bg-panel-base transition-colors"
          >
            <ChevronDown
              className="w-3.5 h-3.5 transition-transform"
              style={{ transform: expanded ? 'rotate(180deg)' : undefined }}
            />
          </button>
        </div>
      </div>

      {draftError && (
        <p className="text-[10px] text-rose-400 leading-snug flex items-start gap-1">
          <X className="w-3 h-3 shrink-0 mt-px" />
          {draftError}
        </p>
      )}

      {/* Opacity */}
      {opacity !== undefined && onOpacityChange && (
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-zinc-400 text-[11px]">Opacity</span>
            <div className="flex items-center gap-1 font-mono">
              <input
                type="number"
                min={0}
                max={100}
                step={1}
                value={Math.round(opacity * 100)}
                onChange={(e) =>
                  onOpacityChange(Math.min(1, Math.max(0, Number(e.target.value) / 100)))
                }
                aria-label={`${label} opacity percent`}
                className="w-11 bg-panel-subtle border border-panel-border rounded px-1.5 py-0.5 text-right text-zinc-100 font-mono text-[11px] focus:outline-none focus:border-zinc-500"
              />
              <span className="text-zinc-500 text-[11px]">%</span>
            </div>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={Math.round(opacity * 100)}
            onChange={(e) => onOpacityChange(Number(e.target.value) / 100)}
            aria-label={`${label} opacity`}
            className="w-full"
          />
        </div>
      )}

      {/* Progressive disclosure */}
      {expanded && (
        <div className="space-y-3 pt-2.5 border-t border-panel-border">
          {/* RGB channels */}
          <div className="space-y-1.5">
            <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 font-semibold block">
              RGB channels
            </span>
            <div className="grid grid-cols-3 gap-1.5">
              {(['r', 'g', 'b'] as const).map((channel) => (
                <label key={channel} className="space-y-0.5">
                  <span className="text-[10px] font-mono text-zinc-500 uppercase block">
                    {channel}
                  </span>
                  <input
                    type="number"
                    min={0}
                    max={255}
                    step={1}
                    value={rgb ? rgb[channel] : 0}
                    onChange={(e) => setChannel(channel, Number(e.target.value))}
                    onBlur={() => setSwatches(rememberRecentColor(value))}
                    aria-label={`${label} ${channel.toUpperCase()} channel`}
                    className="w-full bg-panel-subtle border border-panel-border rounded px-1.5 py-1 text-right text-zinc-100 font-mono text-[11px] focus:outline-none focus:border-zinc-500"
                  />
                </label>
              ))}
            </div>
            {hsl && (
              <p className="text-[10px] font-mono text-zinc-600">
                hsl({Math.round(hsl.h)}°, {Math.round(hsl.s)}%, {Math.round(hsl.l)}%) ·{' '}
                {describeColor(value)}
              </p>
            )}
          </div>

          {/* Presets */}
          <div className="space-y-1.5">
            <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 font-semibold block">
              Colour presets
            </span>
            <div className="flex flex-wrap gap-1">
              {presets.map((preset) => {
                const selected = preset.hex.toLowerCase() === value.toLowerCase();
                return (
                  <button
                    key={preset.hex}
                    type="button"
                    onClick={() => commit(preset.hex)}
                    title={preset.label}
                    aria-label={`${preset.label} (${preset.hex})`}
                    aria-pressed={selected}
                    className="relative w-6 h-6 rounded border transition-all hover:scale-110"
                    style={{
                      backgroundColor: preset.hex,
                      borderColor: selected ? 'var(--brand-accent)' : '#2c2c31',
                    }}
                  >
                    {selected && (
                      <Check
                        className="w-3 h-3 absolute inset-0 m-auto"
                        style={{ color: readableTextColor(preset.hex) }}
                        strokeWidth={3}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Recent */}
          {swatches.recent.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 font-semibold block">
                Recent
              </span>
              <div className="flex flex-wrap gap-1">
                {swatches.recent.map((hex) => (
                  <button
                    key={`recent-${hex}`}
                    type="button"
                    onClick={() => commit(hex)}
                    title={hex}
                    aria-label={`Recent colour ${hex}`}
                    className="w-5 h-5 rounded border transition-all hover:scale-110"
                    style={{
                      backgroundColor: hex,
                      borderColor: hex === value ? 'var(--brand-accent)' : '#2c2c31',
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Saved */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 font-semibold">
                Saved colours
              </span>
              <button
                type="button"
                onClick={saveCurrentToSwatches}
                aria-label={`Save ${value} to your colours`}
                className="flex items-center gap-1 text-[10px] text-zinc-400 hover:text-zinc-100 transition-colors"
              >
                <Plus className="w-3 h-3" />
                Save this
              </button>
            </div>

            {swatches.saved.length === 0 ? (
              <p className="text-[10px] text-zinc-600 leading-snug">
                Nothing saved yet. Use <span className="text-zinc-400">Save this</span> to keep a
                colour you match often — saved colours persist across sessions.
              </p>
            ) : (
              <div className="flex flex-wrap gap-1">
                {swatches.saved.map((hex) => (
                  <span key={`saved-${hex}`} className="relative group">
                    <button
                      type="button"
                      onClick={() => commit(hex)}
                      title={hex}
                      aria-label={`Saved colour ${hex}`}
                      className="w-5 h-5 rounded border transition-all hover:scale-110 block"
                      style={{
                        backgroundColor: hex,
                        borderColor: hex === value ? 'var(--brand-accent)' : '#2c2c31',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => forgetSwatch(hex)}
                      aria-label={`Remove saved colour ${hex}`}
                      className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-panel-elevated border border-panel-border text-zinc-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                    >
                      <Trash2 className="w-2 h-2" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
