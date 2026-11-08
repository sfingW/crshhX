import React from 'react';
import { RotateCcw } from 'lucide-react';
import type { ArmDirection, CrosshairConfig } from '../../types/crosshair';
import { ARM_DIRECTIONS, LIMITS, resolveArmGeometry, uniformArmValues } from '../../lib/crosshairSchema';
import { NumberControl } from './controls';

/**
 * Independent per-direction arm control.
 *
 * The global Length/Thickness above this panel remain the base values — they are
 * what every pre-v2 crosshair uses, and what a symmetric design uses. Turning on
 * "Independent arms" lets each direction carry its own length and thickness, so
 * asymmetric designs are possible (top 8 / bottom 12 / left 8 / right 12 is a
 * common recoil-compensating shape).
 *
 * Turning the mode off does **not** discard the per-direction values; it stops
 * reading them. That way a user can flip back and forth while comparing without
 * losing work.
 */

interface ArmGeometryPanelProps {
  config: CrosshairConfig;
  onChange: (updated: Partial<CrosshairConfig>) => void;
}

const DIRECTION_META: Record<ArmDirection, { label: string; axis: string; field: keyof CrosshairConfig }> = {
  top: { label: 'Top', axis: 'Y−', field: 'hasTopArm' },
  bottom: { label: 'Bottom', axis: 'Y+', field: 'hasBottomArm' },
  left: { label: 'Left', axis: 'X−', field: 'hasLeftArm' },
  right: { label: 'Right', axis: 'X+', field: 'hasRightArm' },
};

export const ArmGeometryPanel: React.FC<ArmGeometryPanelProps> = ({ config, onChange }) => {
  const arms = resolveArmGeometry(config);
  const independent = !!config.asymmetricArms;

  const setArmLength = (dir: ArmDirection, length: number) => {
    onChange({ armLength: { ...(config.armLength ?? uniformArmValues(config.length)), [dir]: length } });
  };

  const setArmThickness = (dir: ArmDirection, thickness: number) => {
    onChange({
      armThickness: { ...(config.armThickness ?? uniformArmValues(config.thickness)), [dir]: thickness },
    });
  };

  /** Seeds the per-direction maps from the current global values. */
  const enableIndependent = () => {
    onChange({
      asymmetricArms: true,
      armLength: config.armLength ?? uniformArmValues(config.length),
      armThickness: config.armThickness ?? uniformArmValues(config.thickness),
    });
  };

  /** Copies one direction's values to the other three. */
  const applyToAll = (dir: ArmDirection) => {
    const spec = arms[dir];
    onChange({
      armLength: uniformArmValues(spec.length),
      armThickness: uniformArmValues(spec.thickness),
    });
  };

  const resetAll = () => {
    onChange({
      armLength: uniformArmValues(config.length),
      armThickness: uniformArmValues(config.thickness),
    });
  };

  return (
    <div className="space-y-3">
      {/* Directional mask — which arms exist at all */}
      <div className="space-y-1.5">
        <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 font-semibold block">
          Directional mask
        </span>
        <div className="grid grid-cols-4 gap-1.5">
          {ARM_DIRECTIONS.map((dir) => {
            const meta = DIRECTION_META[dir];
            const active = Boolean(config[meta.field]);
            return (
              <button
                key={dir}
                type="button"
                onClick={() => onChange({ [meta.field]: !active } as Partial<CrosshairConfig>)}
                aria-pressed={active}
                aria-label={`${meta.label} arm`}
                className={`py-1.5 px-1 rounded-lg text-[10.5px] font-mono transition-all border ${
                  active
                    ? 'bg-zinc-800 text-zinc-100 border-zinc-600 font-semibold'
                    : 'bg-panel-subtle text-zinc-500 border-panel-border hover:text-zinc-300'
                }`}
              >
                {meta.label}
                <span className="block text-[9px] opacity-60">{meta.axis}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Independent dimensions */}
      <div className="pt-3 border-t border-panel-border space-y-2.5">
        <label className="flex items-start justify-between gap-3 cursor-pointer group">
          <span className="min-w-0">
            <span className="text-[12px] font-medium text-zinc-200 block group-hover:text-zinc-100">
              Independent arms
            </span>
            <span className="text-[10.5px] text-zinc-500 block leading-snug mt-0.5">
              Give each direction its own length and thickness to build asymmetric designs.
              While this is off, all four arms use the global values above.
            </span>
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={independent}
            aria-label="Independent arm dimensions"
            onClick={() => (independent ? onChange({ asymmetricArms: false }) : enableIndependent())}
            className="relative w-9 h-5 rounded-full transition-colors shrink-0 mt-0.5"
            style={{ backgroundColor: independent ? 'var(--brand-accent)' : '#2c2c31' }}
          >
            <span
              className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all"
              style={{ left: independent ? '1.125rem' : '0.125rem' }}
            />
          </button>
        </label>

        {independent && (
          <div className="space-y-2.5 pt-1">
            {ARM_DIRECTIONS.map((dir) => {
              const meta = DIRECTION_META[dir];
              const spec = arms[dir];
              return (
                <div
                  key={dir}
                  className="rounded-lg border border-panel-border bg-panel-subtle px-2.5 py-2 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-mono font-semibold text-zinc-300">
                      {meta.label}
                      <span className="text-zinc-600 ml-1.5">{meta.axis}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => applyToAll(dir)}
                      title={`Copy ${meta.label} dimensions to all four arms`}
                      className="text-[10px] text-zinc-500 hover:text-zinc-200 transition-colors"
                    >
                      Apply to all
                    </button>
                  </div>

                  <NumberControl
                    label="Length"
                    value={spec.length}
                    min={LIMITS.length.min}
                    max={LIMITS.length.max}
                    step={LIMITS.length.step}
                    onChange={(v) => setArmLength(dir, v)}
                    disabled={!Boolean(config[meta.field])}
                  />
                  <NumberControl
                    label="Thickness"
                    value={spec.thickness}
                    min={LIMITS.thickness.min}
                    max={LIMITS.thickness.max}
                    step={LIMITS.thickness.step}
                    onChange={(v) => setArmThickness(dir, v)}
                    disabled={!Boolean(config[meta.field])}
                  />
                </div>
              );
            })}

            <button
              type="button"
              onClick={resetAll}
              className="flex items-center gap-1.5 text-[10.5px] text-zinc-500 hover:text-zinc-200 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              Reset all four to the global length and thickness
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
