import React, { useState } from 'react';
import type { CrosshairConfig } from '../../types/crosshair';
import type { AcademyVisual, ClickmapPanel, LiveControl } from '../../lib/academy';
import { getPresetIndex } from '../../lib/presetLibrary';
import { ReticleRenderer } from '../ReticleRenderer';
import { BACKDROP_OPTIONS } from '../TargetBackdrops';

/**
 * Academy visuals.
 *
 * Two kinds, never mixed up:
 * - **Real**: live demos and comparisons render through `ReticleRenderer` —
 *   the same component the overlay uses — so what the tutorial shows is what
 *   the app draws.
 * - **Illustration**: diagrams and click-maps are simplified drawings. Every
 *   one of them carries a visible "Illustration — not a screenshot" badge,
 *   because this repo has no screenshots and nothing here pretends to be one.
 */

const PRESET_INDEX = getPresetIndex();

function resolvePreset(id: string): CrosshairConfig | null {
  return PRESET_INDEX[id] ?? null;
}

function backdropStyle(id?: string): React.CSSProperties {
  const backdrop = BACKDROP_OPTIONS.find((b) => b.id === id) ?? BACKDROP_OPTIONS[0];
  return backdrop.backgroundStyle;
}

const ILLUSTRATION_BADGE = 'Illustration — not a screenshot';

function IllustrationFrame({
  caption,
  children,
}: {
  caption?: string;
  children: React.ReactNode;
}) {
  return (
    <figure className="rounded-lg border border-[#26262a] bg-[#141416] p-4 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="px-1.5 py-0.5 rounded text-[9px] font-mono uppercase tracking-wider bg-[#202024] text-zinc-400 border border-[#2b2b30]">
          {ILLUSTRATION_BADGE}
        </span>
      </div>
      {children}
      {caption && (
        <figcaption className="text-[11px] text-zinc-500 font-mono">{caption}</figcaption>
      )}
    </figure>
  );
}

function LiveFrame({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <figure className="rounded-lg border border-[#26262a] bg-[#141416] p-4 space-y-2">
      <span className="px-1.5 py-0.5 rounded text-[9px] font-mono uppercase tracking-wider bg-[#202024] border border-[#2b2b30]" style={{ color: 'var(--brand-accent)' }}>
        {label}
      </span>
      {children}
    </figure>
  );
}

/* ------------------------------------------------------------------ *
 * Diagrams (SVG)
 * ------------------------------------------------------------------ */

function AnatomyDiagram() {
  // A cross drawn to scale-ish with numbered leader lines. Arms: length 34,
  // thickness 8, gap 10, centre dot 6px, outline 2px.
  const c = { x: 150, y: 110 };
  const gap = 10;
  const len = 34;
  const th = 8;
  const arm = (dx: number, dy: number, w: number, h: number) => (
    <g>
      <rect x={dx - 1.5} y={dy - 1.5} width={w + 3} height={h + 3} fill="#000" opacity={0.9} />
      <rect x={dx} y={dy} width={w} height={h} fill="#00ffff" />
    </g>
  );
  const label = (n: number, x: number, y: number, text: string) => (
    <g>
      <circle cx={x} cy={y} r={9} fill="#202024" stroke="#3f3f46" />
      <text x={x} y={y + 3.5} textAnchor="middle" fontSize={10} fill="#e4e4e7" fontFamily="ui-monospace, monospace">
        {n}
      </text>
      <text x={x + 14} y={y + 3.5} fontSize={11} fill="#a1a1aa" fontFamily="ui-monospace, monospace">
        {text}
      </text>
    </g>
  );
  return (
    <IllustrationFrame caption="1 Length · 2 Thickness · 3 Gap · 4 Centre dot · 5 Outline">
      <svg viewBox="0 0 300 220" className="w-full max-w-sm mx-auto" role="img" aria-label="The parts of a crosshair">
        {arm(c.x - th / 2, c.y - gap - len, th, len)}
        {arm(c.x - th / 2, c.y + gap, th, len)}
        {arm(c.x - gap - len, c.y - th / 2, len, th)}
        {arm(c.x + gap, c.y - th / 2, len, th)}
        <circle cx={c.x} cy={c.y} r={3} fill="#000" />
        <circle cx={c.x} cy={c.y} r={2} fill="#00ffff" />
        {/* leader lines */}
        <line x1={c.x + 4} y1={c.y - gap - len / 2} x2={40} y2={40} stroke="#3f3f46" strokeDasharray="2 2" />
        <line x1={c.x} y1={c.y - gap - len / 2} x2={40} y2={70} stroke="#3f3f46" strokeDasharray="2 2" />
        <line x1={c.x - gap / 2} y1={c.y} x2={40} y2={140} stroke="#3f3f46" strokeDasharray="2 2" />
        <line x1={c.x} y1={c.y + 3} x2={40} y2={170} stroke="#3f3f46" strokeDasharray="2 2" />
        <line x1={c.x + gap + len / 2} y1={c.y - th / 2 - 1.5} x2={40} y2={200} stroke="#3f3f46" strokeDasharray="2 2" />
        {label(1, 26, 40, 'Length')}
        {label(2, 26, 70, 'Thickness')}
        {label(3, 26, 140, 'Gap')}
        {label(4, 26, 170, 'Centre dot')}
        {label(5, 26, 200, 'Outline')}
      </svg>
    </IllustrationFrame>
  );
}

const COLOUR_SCORES: Array<{ name: string; hex: string; score: number; note: string }> = [
  { name: 'Cyan', hex: '#00ffff', score: 4.8, note: 'Best on 11 of 12 maps' },
  { name: 'Green', hex: '#00ff00', score: 4.2, note: 'Strong on dark maps' },
  { name: 'Pink', hex: '#ff00aa', score: 3.8, note: 'Underrated' },
  { name: 'White', hex: '#ffffff', score: 3.4, note: 'Needs an outline on bright maps' },
  { name: 'Red', hex: '#ff3333', score: 3.1, note: 'Mixes with damage effects' },
  { name: 'Yellow', hex: '#ffff00', score: 2.6, note: 'Dark maps only' },
];

function ColourScores() {
  return (
    <figure className="rounded-lg border border-[#26262a] bg-[#141416] p-4 space-y-3">
      <div className="space-y-2">
        {COLOUR_SCORES.map((c) => (
          <div key={c.name} className="flex items-center gap-3 text-[11px]">
            <span className="w-14 font-mono text-zinc-300">{c.name}</span>
            <span className="w-3 h-3 rounded-sm border border-[#2b2b30]" style={{ backgroundColor: c.hex }} />
            <div className="flex-1 h-2.5 rounded bg-[#202024] overflow-hidden">
              <div className="h-full rounded" style={{ width: `${(c.score / 5) * 100}%`, backgroundColor: c.hex, opacity: 0.85 }} />
            </div>
            <span className="w-8 text-right font-mono text-zinc-400">{c.score.toFixed(1)}</span>
            <span className="w-52 text-zinc-500 font-mono hidden xl:block">{c.note}</span>
          </div>
        ))}
      </div>
      <figcaption className="text-[10px] text-zinc-500 font-mono">
        Visibility scores out of 5, from a public test across all 12 competitive Valorant maps
        (gamegrids.io, August 2026). Full source list: docs/research/pro-crosshairs.md.
      </figcaption>
    </figure>
  );
}

function MonitorsDiagram() {
  return (
    <IllustrationFrame caption="Screens left of the primary live at negative X. The overlay follows the display you pick.">
      <svg viewBox="0 0 340 150" className="w-full max-w-md mx-auto" role="img" aria-label="Two monitors, one at negative coordinates">
        <rect x={20} y={25} width={130} height={80} rx={4} fill="#18181b" stroke="#3f3f46" />
        <text x={85} y={60} textAnchor="middle" fontSize={11} fill="#a1a1aa" fontFamily="ui-monospace, monospace">Display 2</text>
        <text x={85} y={78} textAnchor="middle" fontSize={10} fill="#71717a" fontFamily="ui-monospace, monospace">x = −1920</text>
        <rect x={170} y={25} width={150} height={80} rx={4} fill="#18181b" stroke="var(--brand-accent, #34d399)" />
        <text x={245} y={60} textAnchor="middle" fontSize={11} fill="#e4e4e7" fontFamily="ui-monospace, monospace">Display 1 · Primary</text>
        <text x={245} y={78} textAnchor="middle" fontSize={10} fill="#71717a" fontFamily="ui-monospace, monospace">x = 0, y = 0</text>
        {/* crosshair on the selected (primary) display */}
        <g stroke="#00ffff" strokeWidth={2}>
          <line x1={245} y1={57} x2={245} y2={63} opacity={0} />
        </g>
        <g transform="translate(245, 92)" stroke="#00ffff" strokeWidth={1.5}>
          <line x1={-6} y1={0} x2={-2} y2={0} />
          <line x1={2} y1={0} x2={6} y2={0} />
          <line x1={0} y1={-6} x2={0} y2={-2} />
          <line x1={0} y1={2} x2={0} y2={6} />
        </g>
        <rect x={170} y={105} width={150} height={6} rx={3} fill="#27272a" />
        <rect x={20} y={105} width={130} height={6} rx={3} fill="#27272a" />
      </svg>
    </IllustrationFrame>
  );
}

function OverlayStackDiagram() {
  return (
    <IllustrationFrame caption="The overlay is a separate, click-through window above the game. The game never sees it.">
      <svg viewBox="0 0 300 170" className="w-full max-w-sm mx-auto" role="img" aria-label="Game window with the crshhx overlay above it">
        <rect x={30} y={70} width={200} height={80} rx={4} fill="#18181b" stroke="#3f3f46" />
        <text x={130} y={115} textAnchor="middle" fontSize={11} fill="#a1a1aa" fontFamily="ui-monospace, monospace">Game window</text>
        <rect x={55} y={45} width={200} height={80} rx={4} fill="#141416" fillOpacity={0.92} stroke="#52525b" strokeDasharray="4 3" />
        <text x={155} y={70} textAnchor="middle" fontSize={10} fill="#71717a" fontFamily="ui-monospace, monospace">crshhx overlay (click-through)</text>
        <g transform="translate(155, 92)" stroke="#00ffff" strokeWidth={2}>
          <line x1={-9} y1={0} x2={-3} y2={0} />
          <line x1={3} y1={0} x2={9} y2={0} />
          <line x1={0} y1={-9} x2={0} y2={-3} />
          <line x1={0} y1={3} x2={0} y2={9} />
        </g>
        <text x={155} y={122} textAnchor="middle" fontSize={10} fill="#a1a1aa" fontFamily="ui-monospace, monospace">your crosshair</text>
      </svg>
    </IllustrationFrame>
  );
}

/* ------------------------------------------------------------------ *
 * Click-map illustrations
 * ------------------------------------------------------------------ */

function Badge({ n }: { n: number }) {
  return (
    <span
      className="inline-flex items-center justify-center w-4 h-4 rounded-full text-[9px] font-mono font-bold shrink-0"
      style={{ backgroundColor: 'var(--brand-accent)', color: '#0a0d14' }}
    >
      {n}
    </span>
  );
}

function SideRail({ activeIndex }: { activeIndex: number }) {
  const items = ['Vault', 'Pro Crosshairs', 'Library', 'Designer', 'Position', 'Keybinds', 'Weapon Slots', 'Academy'];
  return (
    <div className="w-28 shrink-0 border-r border-[#26262a] p-1.5 space-y-1">
      {items.map((label, i) => (
        <div
          key={label}
          className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-mono ${
            i === activeIndex ? 'bg-[#202024] text-zinc-100' : 'text-zinc-500'
          }`}
        >
          {i === activeIndex && <Badge n={1} />}
          {label}
        </div>
      ))}
    </div>
  );
}

function ClickMap({ panel, caption: captionProp }: { panel: ClickmapPanel; caption?: string }) {
  let body: React.ReactNode = null;
  let caption = captionProp ?? '';

  if (panel === 'vault') {
    caption = caption || '1 Sidebar → Crosshair Vault. 2 Click a crosshair card to apply it.';
    body = (
      <div className="flex gap-2">
        <SideRail activeIndex={0} />
        <div className="flex-1 grid grid-cols-4 gap-2 p-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="relative h-12 rounded border border-[#26262a] bg-[#18181b] flex items-center justify-center">
              <span className="w-4 h-4 border-t-2 border-l-2 border-r-2 border-b-2 border-dashed" style={{ borderColor: i === 2 ? '#00ffff' : '#3f3f46', borderRadius: 2 }} />
              {i === 2 && (
                <span className="absolute -top-1.5 -right-1.5">
                  <Badge n={2} />
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  } else if (panel === 'designer') {
    caption = caption || '1 Sidebar → Designer. 2 Tabs switch control groups. 3 The preview is the live crosshair.';
    body = (
      <div className="flex gap-2">
        <SideRail activeIndex={3} />
        <div className="flex-1 p-2 space-y-2">
          <div className="relative flex gap-1.5">
            {['Lines', 'Dot', 'Outline', 'Circle'].map((t, i) => (
              <span key={t} className={`px-2 py-0.5 rounded text-[9px] font-mono ${i === 0 ? 'bg-[#202024] text-zinc-200' : 'text-zinc-500 border border-[#26262a]'}`}>
                {t}
              </span>
            ))}
            <span className="absolute -top-1.5 -right-1.5">
              <Badge n={2} />
            </span>
          </div>
          <div className="relative h-24 rounded border border-[#26262a] bg-[#101012] flex items-center justify-center">
            <span className="w-5 h-5 border-2 border-dashed rounded-sm" style={{ borderColor: '#00ffff' }} />
            <span className="absolute -top-1.5 -right-1.5">
              <Badge n={3} />
            </span>
          </div>
        </div>
      </div>
    );
  } else if (panel === 'monitor') {
    caption = caption || '1 Sidebar → Position & Display Calibration. 2 The Target Monitor dropdown lists every display.';
    body = (
      <div className="flex gap-2">
        <SideRail activeIndex={4} />
        <div className="flex-1 p-2 space-y-2">
          <div className="text-[9px] font-mono text-zinc-500 uppercase">Target Monitor</div>
          <div className="relative h-8 rounded border border-[#26262a] bg-[#18181b] flex items-center px-2 text-[10px] font-mono text-zinc-300">
            Automatic — follow the primary display ▾
            <span className="absolute -top-1.5 -right-1.5">
              <Badge n={2} />
            </span>
          </div>
          <div className="h-3 w-3/4 rounded bg-[#1c1c1f]" />
          <div className="h-3 w-1/2 rounded bg-[#1c1c1f]" />
        </div>
      </div>
    );
  } else if (panel === 'slots') {
    caption = caption || '1 Sidebar → Weapon Slots. 2 Slot key. 3 Crosshair picker for that slot.';
    body = (
      <div className="flex gap-2">
        <SideRail activeIndex={6} />
        <div className="flex-1 p-2 space-y-1.5">
          {[0, 1, 2].map((row) => (
            <div key={row} className="relative flex items-center gap-2 h-8 rounded border border-[#26262a] bg-[#18181b] px-2">
              <span className="relative w-5 h-5 rounded bg-[#202024] border border-[#2b2b30] text-[9px] font-mono text-zinc-300 flex items-center justify-center">
                {row + 1}
                {row === 0 && (
                  <span className="absolute -top-1.5 -right-1.5">
                    <Badge n={2} />
                  </span>
                )}
              </span>
              <span className="flex-1 h-3 rounded bg-[#1c1c1f]" />
              <span className="relative w-16 h-5 rounded border border-[#26262a] bg-[#141416]">
                {row === 0 && (
                  <span className="absolute -top-1.5 -right-1.5">
                    <Badge n={3} />
                  </span>
                )}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  } else {
    // tray
    caption = caption || '1 The crshhx tray icon (open the tray overflow arrow if needed). 2 Right-click for the menu.';
    body = (
      <div className="p-2 space-y-2">
        <div className="h-20 rounded border border-[#26262a] bg-[#18181b]" />
        <div className="relative flex items-center justify-end gap-2 h-8 rounded bg-[#202024] px-2">
          <span className="text-[9px] font-mono text-zinc-500">tray overflow ▴</span>
          <span className="relative w-4 h-4 rounded-sm" style={{ backgroundColor: 'var(--brand-accent)' }}>
            <span className="absolute -top-2 -right-2">
              <Badge n={1} />
            </span>
          </span>
          <span className="absolute bottom-9 right-2 w-40 rounded border border-[#2b2b30] bg-[#18181b] p-1.5 space-y-1">
            <span className="relative block px-1.5 py-0.5 text-[9px] font-mono text-zinc-200 bg-[#202024] rounded">
              Open crshhx
            </span>
            <span className="block px-1.5 py-0.5 text-[9px] font-mono text-zinc-400">Disable overlays</span>
            <span className="block px-1.5 py-0.5 text-[9px] font-mono text-zinc-400">Quit crshhx</span>
            <span className="absolute -top-2 -left-2">
              <Badge n={2} />
            </span>
          </span>
        </div>
      </div>
    );
  }

  return <IllustrationFrame caption={caption}>{body}</IllustrationFrame>;
}

/* ------------------------------------------------------------------ *
 * Real, interactive visuals
 * ------------------------------------------------------------------ */

const LIVE_SWATCHES = ['#00ffff', '#00ff00', '#ffffff', '#ffff00', '#ff00aa', '#ff3333'];

function LiveDemo({ presetId, controls }: { presetId: string; controls: LiveControl[] }) {
  const base = resolvePreset(presetId);
  const [config, setConfig] = useState<CrosshairConfig | null>(base);
  if (!config) {
    return (
      <p className="text-[11px] text-zinc-500 font-mono">
        This demo needs preset “{presetId}”, which is missing.
      </p>
    );
  }
  const patch = (p: Partial<CrosshairConfig>) => setConfig((c) => (c ? { ...c, ...p } : c));

  return (
    <LiveFrame label="Live example — the real crshhx renderer">
      <div className="grid md:grid-cols-2 gap-3">
        <div
          className="h-40 rounded-lg border border-[#26262a] flex items-center justify-center"
          style={backdropStyle('tactical-grid')}
        >
          <ReticleRenderer config={config} scale={3} />
        </div>
        <div className="space-y-2.5">
          {controls.includes('colour') && (
            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase text-zinc-500">Colour</span>
              <div className="flex items-center gap-1.5">
                {LIVE_SWATCHES.map((hex) => (
                  <button
                    key={hex}
                    aria-label={`Colour ${hex}`}
                    onClick={() => patch({ primaryColor: hex, centerDotColor: hex })}
                    className="w-5 h-5 rounded border"
                    style={{
                      backgroundColor: hex,
                      borderColor: config.primaryColor === hex ? 'var(--brand-accent)' : '#2b2b30',
                    }}
                  />
                ))}
                <input
                  type="color"
                  aria-label="Custom colour"
                  value={config.primaryColor}
                  onChange={(e) => patch({ primaryColor: e.target.value, centerDotColor: e.target.value })}
                  className="w-7 h-6 bg-transparent border border-[#2b2b30] rounded cursor-pointer"
                />
              </div>
            </div>
          )}
          {controls.includes('size') && (
            <label className="block space-y-1">
              <span className="text-[10px] font-mono uppercase text-zinc-500">
                Size (length): {config.length}
              </span>
              <input
                type="range" min={0} max={20} step={0.5} value={config.length}
                aria-label="Line length"
                onChange={(e) => patch({ length: Number(e.target.value) })}
                className="w-full accent-emerald-500"
              />
            </label>
          )}
          {controls.includes('thickness') && (
            <label className="block space-y-1">
              <span className="text-[10px] font-mono uppercase text-zinc-500">
                Thickness: {config.thickness}
              </span>
              <input
                type="range" min={0} max={8} step={0.5} value={config.thickness}
                aria-label="Line thickness"
                onChange={(e) => patch({ thickness: Number(e.target.value) })}
                className="w-full accent-emerald-500"
              />
            </label>
          )}
          {controls.includes('gap') && (
            <label className="block space-y-1">
              <span className="text-[10px] font-mono uppercase text-zinc-500">Gap: {config.gap}</span>
              <input
                type="range" min={-10} max={25} step={0.5} value={config.gap}
                aria-label="Centre gap"
                onChange={(e) => patch({ gap: Number(e.target.value) })}
                className="w-full accent-emerald-500"
              />
            </label>
          )}
          {controls.includes('dot') && (
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase text-zinc-500">Centre dot</span>
              <div className="flex items-center gap-2">
                {config.centerDotEnabled && (
                  <input
                    type="range" min={1} max={8} step={0.5} value={config.centerDotSize}
                    aria-label="Dot size"
                    onChange={(e) => patch({ centerDotSize: Number(e.target.value) })}
                    className="w-24 accent-emerald-500"
                  />
                )}
                <input
                  type="checkbox" checked={config.centerDotEnabled}
                  aria-label="Centre dot on"
                  onChange={(e) => patch({ centerDotEnabled: e.target.checked })}
                  className="w-4 h-4 accent-emerald-500 cursor-pointer"
                />
              </div>
            </div>
          )}
          {controls.includes('outline') && (
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase text-zinc-500">Outline</span>
              <input
                type="checkbox" checked={config.outlineEnabled}
                aria-label="Outline on"
                onChange={(e) => patch({ outlineEnabled: e.target.checked })}
                className="w-4 h-4 accent-emerald-500 cursor-pointer"
              />
            </div>
          )}
        </div>
      </div>
    </LiveFrame>
  );
}

function CompareDemo({
  leftId,
  rightId,
  leftLabel,
  rightLabel,
  backdrop,
}: {
  leftId: string;
  rightId: string;
  leftLabel: string;
  rightLabel: string;
  backdrop?: string;
}) {
  const left = resolvePreset(leftId);
  const right = resolvePreset(rightId);
  const [firing, setFiring] = useState(false);
  if (!left || !right) {
    return <p className="text-[11px] text-zinc-500 font-mono">This comparison needs presets that are missing.</p>;
  }
  const tile = (config: CrosshairConfig, label: string) => (
    <div className="flex-1 space-y-1.5">
      <div
        className="h-32 rounded-lg border border-[#26262a] flex items-center justify-center"
        style={backdropStyle(backdrop)}
      >
        <ReticleRenderer config={config} scale={3} isFiring={firing} />
      </div>
      <p className="text-[10px] font-mono text-zinc-400 text-center">{label}</p>
    </div>
  );
  return (
    <LiveFrame label="Live comparison — both drawn by the real renderer">
      <div className="flex gap-3">
        {tile(left, leftLabel)}
        {tile(right, rightLabel)}
      </div>
      <button
        onClick={() => setFiring((f) => !f)}
        aria-pressed={firing}
        className="px-3 py-1.5 rounded text-[11px] font-mono bg-[#202024] hover:bg-[#27272b] border border-[#2b2b30] text-zinc-300"
      >
        {firing ? 'Stop firing preview' : 'Preview firing'}
      </button>
    </LiveFrame>
  );
}

/** Renders one visual spec from the tutorial data. */
export const AcademyVisualView: React.FC<{ visual: AcademyVisual }> = ({ visual }) => {
  switch (visual.kind) {
    case 'anatomy':
      return <AnatomyDiagram />;
    case 'colours':
      return <ColourScores />;
    case 'monitors':
      return <MonitorsDiagram />;
    case 'overlay-stack':
      return <OverlayStackDiagram />;
    case 'clickmap':
      return <ClickMap panel={visual.panel} caption={visual.caption} />;
    case 'live':
      return <LiveDemo presetId={visual.presetId} controls={visual.controls} />;
    case 'compare':
      return (
        <CompareDemo
          leftId={visual.leftId}
          rightId={visual.rightId}
          leftLabel={visual.leftLabel}
          rightLabel={visual.rightLabel}
          backdrop={visual.backdrop}
        />
      );
    default:
      return null;
  }
};

export { ILLUSTRATION_BADGE };
