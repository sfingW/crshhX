import { useCallback, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import { PRESET_SHOWCASE } from './ProductMock';
import { Reticle } from './Reticle';

/**
 * An interactive demonstration of the editor's parameter space.
 *
 * Every control here maps one-to-one onto a control in the application's
 * editor (arm length, thickness, gap, outline, centre dot, rotation, spread
 * ring and colour), and the preset buttons load the same parameter sets the
 * shipped vault uses. Nothing is simulated beyond the drawing: the reticle is
 * the site's own SVG renderer at true proportion.
 *
 * Hydration-safe: the initial state is a constant, and pointer parallax writes
 * CSS custom properties directly instead of re-rendering.
 */
interface PgState {
  length: number;
  thickness: number;
  gap: number;
  outline: number;
  dot: number;
  rotation: number;
  ring: boolean;
  color: string;
}

const stateFromPreset = (index: number): PgState => {
  const spec = PRESET_SHOWCASE[index].spec;
  return {
    length: spec.length ?? 4,
    thickness: spec.thickness ?? 2,
    gap: spec.gap ?? 2,
    outline: spec.outline ? 1 : 0,
    dot: spec.dot ? (spec.dotSize ?? 2) : 0,
    rotation: spec.rotation ?? 0,
    ring: Boolean(spec.ring),
    color: spec.color,
  };
};

const SWATCHES = ['#00ffff', '#00ff00', '#ffffff', '#ff5ea8', '#ffc24d', '#ff5c5c'] as const;

type SliderKey = 'length' | 'thickness' | 'gap' | 'outline' | 'dot' | 'rotation';

const SLIDERS: ReadonlyArray<{
  key: SliderKey;
  label: string;
  min: number;
  max: number;
  step: number;
  fmt: (value: number) => string;
}> = [
  { key: 'length', label: 'Length', min: 0, max: 12, step: 0.5, fmt: (v) => v.toFixed(1) },
  { key: 'thickness', label: 'Thickness', min: 0, max: 6, step: 0.5, fmt: (v) => v.toFixed(1) },
  { key: 'gap', label: 'Gap', min: -4, max: 12, step: 0.5, fmt: (v) => v.toFixed(1) },
  { key: 'outline', label: 'Outline', min: 0, max: 6, step: 1, fmt: (v) => (v ? String(v) : 'off') },
  { key: 'dot', label: 'Dot', min: 0, max: 6, step: 1, fmt: (v) => (v ? String(v) : 'off') },
  { key: 'rotation', label: 'Rotation', min: 0, max: 360, step: 15, fmt: (v) => `${v}°` },
];

export function Playground() {
  const [preset, setPreset] = useState(0);
  const [state, setState] = useState<PgState>(() => stateFromPreset(0));
  const stageRef = useRef<HTMLDivElement | null>(null);

  const set = <K extends keyof PgState>(key: K, value: PgState[K]) => {
    setState((current) => ({ ...current, [key]: value }));
    setPreset(-1);
  };

  const loadPreset = (index: number) => {
    setPreset(index);
    setState(stateFromPreset(index));
  };

  const onPointerMove = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const node = stageRef.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const dx = ((event.clientX - rect.left) / rect.width - 0.5) * 10;
    const dy = ((event.clientY - rect.top) / rect.height - 0.5) * 10;
    node.style.setProperty('--px', `${dx.toFixed(1)}px`);
    node.style.setProperty('--py', `${dy.toFixed(1)}px`);
  }, []);

  const onPointerLeave = useCallback(() => {
    const node = stageRef.current;
    if (!node) return;
    node.style.setProperty('--px', '0px');
    node.style.setProperty('--py', '0px');
  }, []);

  const readout = [
    `len ${state.length.toFixed(1)}   thk ${state.thickness.toFixed(1)}   gap ${state.gap.toFixed(1)}`,
    `outline ${state.outline || 'off'}     dot ${state.dot || 'off'}     ring ${state.ring ? 'on' : 'off'}`,
    `rot ${state.rotation}°    ${state.color}`,
  ].join('\n');

  return (
    <figure className="pg">
      <div className="pg-head">
        <span>crosshair playground</span>
        <span className="pg-mode">interactive</span>
      </div>

      <div
        className="pg-stage"
        ref={stageRef}
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
      >
        <div className="pg-reticle">
          <Reticle
            spec={{
              color: state.color,
              length: state.length,
              thickness: state.thickness,
              gap: state.gap,
              outline: state.outline > 0,
              outlineThickness: state.outline > 0 ? state.outline : undefined,
              dot: state.dot > 0,
              dotSize: state.dot > 0 ? state.dot : undefined,
              ring: state.ring,
              rotation: state.rotation,
            }}
            size={170}
            label="Live crosshair preview"
          />
        </div>
      </div>

      <div className="pg-grid">
        {SLIDERS.map((slider) => {
          const value = state[slider.key];
          const pct = ((value - slider.min) / (slider.max - slider.min)) * 100;
          return (
            <label className="pg-ctl" key={slider.key}>
              <span className="pg-ctl-head">
                <span>{slider.label}</span>
                <output>{slider.fmt(value)}</output>
              </span>
              <input
                className="pg-range"
                type="range"
                min={slider.min}
                max={slider.max}
                step={slider.step}
                value={value}
                aria-label={slider.label}
                style={{ '--fill': `${pct}%` } as CSSProperties}
                onChange={(event) => set(slider.key, Number(event.target.value))}
              />
            </label>
          );
        })}
      </div>

      <div className="pg-foot">
        <div className="pg-swatches" role="group" aria-label="Crosshair colour">
          {SWATCHES.map((color) => (
            <button
              key={color}
              type="button"
              className={`pg-swatch${state.color === color ? ' is-active' : ''}`}
              style={{ background: color }}
              aria-label={`Set colour ${color}`}
              aria-pressed={state.color === color}
              onClick={() => set('color', color)}
            />
          ))}
        </div>
        <button
          type="button"
          className={`chip pg-toggle${state.ring ? ' is-on' : ''}`}
          aria-pressed={state.ring}
          onClick={() => set('ring', !state.ring)}
        >
          spread ring
        </button>
      </div>

      <code className="pg-readout" aria-label="Current crosshair parameters">
        {readout}
      </code>

      <div className="pg-presets" role="group" aria-label="Load a built-in preset">
        {PRESET_SHOWCASE.map((item, index) => (
          <button
            key={item.name}
            type="button"
            className={`pg-preset${preset === index ? ' is-active' : ''}`}
            onClick={() => loadPreset(index)}
          >
            <Reticle spec={item.spec} size={22} label={`${item.name} crosshair`} />
            {item.name}
          </button>
        ))}
      </div>

      <figcaption className="mock-caption">
        Interactive demonstration of the editor's parameters — not a screenshot of the
        application.
      </figcaption>
    </figure>
  );
}
