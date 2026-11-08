import React, { useState } from 'react';
import { ChevronDown, RotateCcw } from 'lucide-react';

/**
 * Shared editor controls.
 *
 * The existing `ReticleControls` hand-rolls the same "label + number box +
 * slider" block about fifteen times, with small inconsistencies between copies
 * (different widths, some with units, some without, none with a reset). New
 * controls are built from these primitives so the editor stays visually
 * consistent as it grows, and so a change to the pattern only has to be made
 * once.
 *
 * `disabled` dims the control *and* sets it on the underlying inputs: styling
 * alone would leave a hidden arm's length editable by keyboard.
 *
 * Styling deliberately matches the tokens already in use across the designer:
 * `panel-base` cards, `panel-subtle` input wells, `panel-border` hairlines,
 * monospace numerics at 10–12px.
 */

/* ------------------------------------------------------------------ *
 * SectionCard
 * ------------------------------------------------------------------ */

interface SectionCardProps {
  title: string;
  /** One-line explanation under the title. */
  subtitle?: string;
  children: React.ReactNode;
  /** Rendered top-right — typically an enable checkbox. */
  action?: React.ReactNode;
  /** Restores this section's values. Omit to hide the reset button. */
  onReset?: () => void;
  /** Allows the body to be collapsed. Off by default. */
  collapsible?: boolean;
  defaultOpen?: boolean;
  /** Dims the body without disabling it, e.g. when a section does not apply. */
  inert?: boolean;
}

export const SectionCard: React.FC<SectionCardProps> = ({
  title,
  subtitle,
  children,
  action,
  onReset,
  collapsible = false,
  defaultOpen = true,
  inert = false,
}) => {
  const [open, setOpen] = useState(defaultOpen);
  const expanded = !collapsible || open;

  return (
    <section className="bg-panel-base rounded-xl border border-panel-border overflow-hidden">
      <header className="flex items-center justify-between gap-2 px-3.5 pt-3 pb-2.5">
        <div className="min-w-0 flex-1">
          {collapsible ? (
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              className="flex items-center gap-1.5 text-left group min-w-0"
            >
              <ChevronDown
                className="w-3.5 h-3.5 text-zinc-500 shrink-0 transition-transform"
                style={{ transform: open ? undefined : 'rotate(-90deg)' }}
              />
              <span className="min-w-0">
                <span className="font-semibold text-zinc-200 text-[12px] block truncate group-hover:text-zinc-100">
                  {title}
                </span>
                {subtitle && (
                  <span className="text-[11px] text-zinc-400 block truncate leading-snug">
                    {subtitle}
                  </span>
                )}
              </span>
            </button>
          ) : (
            <span className="min-w-0">
              <span className="font-semibold text-zinc-200 text-[12px] block truncate">{title}</span>
              {subtitle && (
                <span className="text-[11px] text-zinc-400 block truncate leading-snug">
                  {subtitle}
                </span>
              )}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {onReset && (
            <button
              type="button"
              onClick={onReset}
              title={`Reset ${title}`}
              aria-label={`Reset ${title}`}
              className="p-1 rounded text-zinc-600 hover:text-zinc-200 hover:bg-panel-subtle transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          )}
          {action}
        </div>
      </header>

      {expanded && (
        <div
          className={`px-3.5 pb-3.5 space-y-3 border-t border-panel-border pt-3 ${
            inert ? 'opacity-50' : ''
          }`}
        >
          {children}
        </div>
      )}
    </section>
  );
};

/* ------------------------------------------------------------------ *
 * NumberControl — label + numeric box + slider
 * ------------------------------------------------------------------ */

interface NumberControlProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (value: number) => void;
  disabled?: boolean;
  /** Hides the slider, leaving only the numeric box. */
  sliderless?: boolean;
}

export const NumberControl: React.FC<NumberControlProps> = ({
  label,
  value,
  min,
  max,
  step = 1,
  unit = 'px',
  onChange,
  disabled = false,
  sliderless = false,
}) => {
  const safe = Number.isFinite(value) ? value : min;
  const decimals = step < 1 ? String(step).split('.')[1]?.length ?? 1 : 0;

  const commit = (raw: number) => {
    if (!Number.isFinite(raw)) return;
    onChange(Math.min(max, Math.max(min, raw)));
  };

  return (
    <div className={`space-y-1.5 ${disabled ? 'opacity-45 pointer-events-none' : ''}`}>
      <div className="flex items-center justify-between gap-2">
        <label className="text-zinc-300 text-[12px] font-medium truncate">{label}</label>
        <div className="flex items-center gap-1 font-mono shrink-0">
          <input
            type="number"
            min={min}
            max={max}
            step={step}
            value={Number(safe.toFixed(decimals))}
            onChange={(e) => commit(Number(e.target.value))}
            aria-label={label}
            disabled={disabled}
            className="w-14 bg-panel-subtle border border-panel-border rounded px-1.5 py-0.5 text-right text-zinc-100 font-mono text-[11px] focus:outline-none focus:border-zinc-500"
          />
          {unit && <span className="text-zinc-500 text-[11px] w-4">{unit}</span>}
        </div>
      </div>

      {!sliderless && (
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={safe}
          onChange={(e) => commit(Number(e.target.value))}
          aria-label={`${label} slider`}
          disabled={disabled}
          className="w-full"
        />
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ *
 * ToggleRow — a labelled switch with an explanation
 * ------------------------------------------------------------------ */

interface ToggleRowProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  subtitle?: string;
  ariaLabel?: string;
}

export const ToggleRow: React.FC<ToggleRowProps> = ({
  label,
  checked,
  onChange,
  subtitle,
  ariaLabel,
}) => (
  <label className="flex items-start justify-between gap-3 cursor-pointer group">
    <span className="min-w-0">
      <span className="text-[12px] font-medium text-zinc-200 block group-hover:text-zinc-100">
        {label}
      </span>
      {subtitle && (
        <span className="text-[11px] text-zinc-400 block leading-snug mt-0.5">{subtitle}</span>
      )}
    </span>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel ?? label}
      onClick={() => onChange(!checked)}
      className="relative w-9 h-5 rounded-full transition-colors shrink-0 mt-0.5"
      style={{ backgroundColor: checked ? 'var(--brand-accent)' : '#2c2c31' }}
    >
      <span
        className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all"
        style={{ left: checked ? '1.125rem' : '0.125rem' }}
      />
    </button>
  </label>
);

/* ------------------------------------------------------------------ *
 * SegmentedChoice — a small exclusive-option row
 * ------------------------------------------------------------------ */

interface SegmentedChoiceProps<T extends string> {
  label: string;
  value: T;
  options: Array<{ value: T; label: string; title?: string }>;
  onChange: (value: T) => void;
}

export function SegmentedChoice<T extends string>({
  label,
  value,
  options,
  onChange,
}: SegmentedChoiceProps<T>) {
  return (
    <div className="space-y-1.5">
      <span className="text-zinc-300 text-[12px] font-medium block">{label}</span>
      <div
        className="grid gap-1"
        style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
        role="group"
        aria-label={label}
      >
        {options.map((option) => {
          const active = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              title={option.title}
              aria-pressed={active}
              className={`py-1.5 px-1 rounded-lg text-[11px] font-mono transition-all border truncate ${
                active
                  ? 'bg-zinc-800 text-zinc-100 border-zinc-600 font-semibold'
                  : 'bg-panel-subtle text-zinc-500 border-panel-border hover:text-zinc-300'
              }`}
              style={active ? { borderColor: 'var(--brand-accent-border)' } : undefined}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
