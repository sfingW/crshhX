import { AppWindow } from './AppWindow';
import { Reticle, type ReticleSpec } from './Reticle';

/**
 * Eight presets shown across the site. Names, games and parameters are taken
 * from the application's shipped vault, so every reticle drawn here is one the
 * product actually contains.
 */
export const PRESET_SHOWCASE: ReadonlyArray<{
  name: string;
  game: string;
  spec: ReticleSpec;
}> = [
  {
    name: 'Cyan Duelist (One-Tap)',
    game: 'valorant',
    spec: { color: '#00ffff', length: 4, thickness: 2, gap: 2, outline: true },
  },
  {
    name: 'Apex Anchor (Micro Green)',
    game: 'cs2',
    spec: { color: '#00ff00', length: 2, thickness: 1, gap: -1, dot: true, dotSize: 2 },
  },
  {
    name: 'Eagle Eye (Deagle Static)',
    game: 'cs2',
    spec: { color: '#00ffff', length: 3, thickness: 1.5, gap: 1 },
  },
  {
    name: 'Viper Fang (Pure Green)',
    game: 'valorant',
    spec: { color: '#00ff00', length: 4, thickness: 2, gap: 0 },
  },
  {
    name: 'Headshot Machine (1-Tap)',
    game: 'valorant',
    spec: { color: '#00ffff', length: 0, thickness: 0, gap: 0, dot: true, dotSize: 3, outline: true },
  },
  {
    name: 'Pump Breacher (Shotgun Spread)',
    game: 'fortnite',
    spec: { color: '#ff3333', length: 3, thickness: 2, gap: 8, ring: true, ringRadius: 18 },
  },
  {
    name: 'Ghost Operator (Clean White)',
    game: 'valorant',
    spec: { color: '#ffffff', length: 3, thickness: 1, gap: 2 },
  },
  {
    name: 'Sniper Prodigy (Flick Pin)',
    game: 'cs2',
    spec: { color: '#00ff66', length: 2, thickness: 1, gap: -2, dot: true, outline: true },
  },
];

function Control({ label, value, pct }: { label: string; value: string; pct: number }) {
  return (
    <div className="ctl" aria-hidden="true">
      <span>{label}</span>
      <span className="ctl-track">
        <span className="ctl-fill" style={{ width: `${pct * 100}%` }} />
        <span className="ctl-thumb" style={{ left: `${pct * 100}%` }} />
      </span>
      <span className="ctl-value">{value}</span>
    </div>
  );
}

export function DesignerMock() {
  return (
    <AppWindow view="Designer">
      <div className="mock-designer">
        <div className="stage" style={{ minHeight: 250 }}>
          <Reticle spec={PRESET_SHOWCASE[0].spec} size={160} label="Cyan Duelist crosshair preview" />
          <span className="stage-hud">live preview</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Control label="Length" value="4" pct={0.22} />
          <Control label="Thickness" value="2" pct={0.18} />
          <Control label="Gap" value="2" pct={0.12} />
          <Control label="Outline" value="1" pct={0.3} />
          <Control label="Dot" value="off" pct={0} />
          <Control label="Rotation" value="0°" pct={0} />
          <div className="chips">
            <span className="chip">cross</span>
            <span className="chip">4 arms</span>
            <span className="chip">outline on</span>
          </div>
        </div>
      </div>
    </AppWindow>
  );
}

export function LibraryMock() {
  return (
    <AppWindow view="Crosshairs">
      <div className="chips" aria-hidden="true">
        <span className="chip">All games</span>
        <span className="chip">Favourites</span>
        <span className="chip">Folders</span>
        <span className="chip">258 presets</span>
      </div>
      <div className="tiles">
        {PRESET_SHOWCASE.map((preset, index) => (
          <div key={preset.name} className={`tile${index === 0 ? ' is-active' : ''}`}>
            <Reticle spec={preset.spec} size={52} label={`${preset.name} crosshair`} />
            <span className="tile-name">{preset.name}</span>
            <span className="tile-game">{preset.game}</span>
          </div>
        ))}
      </div>
    </AppWindow>
  );
}

const SLOTS: ReadonlyArray<{
  name: string;
  key: string;
  preset: number;
  on: boolean;
}> = [
  { name: 'Shotgun', key: '1', preset: 5, on: true },
  { name: 'Rifle', key: '2', preset: 0, on: true },
  { name: 'SMG', key: '3', preset: 3, on: true },
  { name: 'Sniper', key: '4', preset: 7, on: true },
  { name: 'Utility', key: '5', preset: 1, on: false },
];

export function SlotsMock() {
  return (
    <AppWindow view="Weapon Slots">
      <div className="slots">
        {SLOTS.map((slot, index) => (
          <div key={slot.name} className={`slot-row${index === 1 ? ' is-active' : ''}`}>
            <span className="slot-name">{slot.name}</span>
            <span className="kbd">{slot.key}</span>
            <Reticle spec={PRESET_SHOWCASE[slot.preset].spec} size={30} />
            <span className={`slot-toggle${slot.on ? ' on' : ''}`} aria-hidden="true" />
          </div>
        ))}
      </div>
      <div className="chips" aria-hidden="true">
        <span className="chip">passive input hook</span>
        <span className="chip">game keeps every keypress</span>
      </div>
    </AppWindow>
  );
}

export function OverlayMock() {
  return (
    <AppWindow view="Position">
      <div className="stage" style={{ minHeight: 300 }}>
        <Reticle
          spec={{ ...PRESET_SHOWCASE[0].spec, scale: 1.6 }}
          size={190}
          label="Overlay crosshair, centred on screen"
        />
        <span className="stage-hud">
          overlay · <span className="kbd">F10</span> toggle · <span className="kbd">F9</span> cycle
        </span>
      </div>
    </AppWindow>
  );
}
