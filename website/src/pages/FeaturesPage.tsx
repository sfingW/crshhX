import { Link } from 'react-router-dom';
import { Reveal } from '../components/Reveal';
import { Reticle } from '../components/Reticle';
import {
  DesignerMock,
  LibraryMock,
  OverlayMock,
  KeybindsMock,
  PRESET_SHOWCASE,
  SlotsMock,
} from '../components/ProductMock';
import { IconArrow } from '../components/icons';
import { CATALOGUE } from '../catalogue';

function ImportPreviewMock() {
  const rows = [
    { name: 'Cyan Duelist (One-Tap)', state: 'New — will be added', tone: 'ok' },
    { name: 'Viper Fang (Pure Green)', state: 'Exists — keep mine', tone: 'dim' },
    { name: 'Pump Breacher (Spread)', state: 'Exists — replace mine', tone: 'warn' },
  ];
  return (
    <figure style={{ margin: 0 }}>
      <div className="mock">
        <div className="mock-bar">
          <span className="mock-title">Import preview — crshhx-presets v2</span>
        </div>
        <div className="mock-main" style={{ padding: 20 }}>
          <div className="chips">
            <span className="chip">12 entries</span>
            <span className="chip">1 conflict</span>
            <span className="chip">0 repairs</span>
          </div>
          <div className="slots" style={{ marginTop: 4 }}>
            {rows.map((row) => (
              <div key={row.name} className="slot-row" style={{ gridTemplateColumns: '1fr auto' }}>
                <span className="slot-name">{row.name}</span>
                <span className={row.tone === 'ok' ? 'pill ok' : row.tone === 'warn' ? 'pill pending' : 'pill'}>
                  {row.state}
                </span>
              </div>
            ))}
          </div>
          <div className="chips" style={{ marginTop: 12, marginBottom: 0 }}>
            <span className="chip">Apply 11 changes</span>
            <span className="chip">Cancel</span>
          </div>
        </div>
      </div>
      <figcaption className="mock-caption">
        Illustrative preview of the import dialog — not a screenshot.
      </figcaption>
    </figure>
  );
}

function ProfilesMock() {
  const games = ['valorant', 'cs2', 'fortnite', 'apex', 'universal'];
  return (
    <figure style={{ margin: 0 }}>
      <div className="mock">
        <div className="mock-bar">
          <span className="mock-title">Game profiles</span>
        </div>
        <div className="mock-main" style={{ padding: 20 }}>
          <div className="chips">
            {games.map((game) => (
              <span key={game} className="chip">
                {game}
              </span>
            ))}
          </div>
          <div className="slots" style={{ marginTop: 4 }}>
            <div className="slot-row is-active" style={{ gridTemplateColumns: '1fr auto' }}>
              <span className="slot-name">Valorant profile — 14 presets</span>
              <span className="pill ok">active</span>
            </div>
            <div className="slot-row" style={{ gridTemplateColumns: '1fr auto' }}>
              <span className="slot-name">Auto-select when the game is in front</span>
              <span className="slot-toggle on" aria-hidden="true" />
            </div>
            <div className="slot-row" style={{ gridTemplateColumns: '1fr auto' }}>
              <span className="slot-name">Restrict switching to matched processes</span>
              <span className="slot-toggle" aria-hidden="true" />
            </div>
          </div>
        </div>
      </div>
      <figcaption className="mock-caption">
        Illustrative interface preview — not a screenshot.
      </figcaption>
    </figure>
  );
}

function BloomDemo() {
  return (
    <div className="stage" style={{ minHeight: 190 }}>
      <span className="demo-bloom">
        <Reticle
          spec={PRESET_SHOWCASE[0].spec}
          size={120}
          label="Dynamic firing bloom demonstration"
        />
      </span>
      <span className="stage-label">dynamic firing bloom · looped demonstration</span>
    </div>
  );
}

/** The six areas, in the order the application's own navigation groups them. */
const AREAS = [
  { id: 'editor', num: '01', label: 'Editor' },
  { id: 'presets', num: '02', label: 'Presets' },
  { id: 'transfer', num: '03', label: 'Transfer' },
  { id: 'profiles', num: '04', label: 'Profiles' },
  { id: 'slots', num: '05', label: 'Weapon slots' },
  { id: 'overlay', num: '06', label: 'Overlay' },
] as const;

const EDITOR_PARAMS: ReadonlyArray<[string, string]> = [
  ['Arms', 'Per-arm presence, plus independent length and thickness when asymmetric arms are on.'],
  ['Geometry', 'Length, thickness and gap — including negative gaps, which overlap the arms.'],
  ['Outline', 'An outer outline drawn behind each element, and an inner one inset inside it.'],
  ['Centre dot', 'Square or round, its own size, colour and opacity.'],
  ['Ring', 'A spread ring with its own radius, thickness, colour and opacity.'],
  ['Transform', 'Whole-reticle rotation in degrees and an overall scale multiplier.'],
  ['Colour', 'Colour tools report contrast against the target backdrop while you pick.'],
  ['History', 'Undo coalesces a slider drag into one step; compare diffs a held snapshot.'],
];

const LIBRARY_FACTS: ReadonlyArray<[string, string]> = [
  ['Sidecar metadata', 'Folders, favourites, descriptions and timestamps are stored beside a preset, keyed by its id, so organising a built-in never modifies it.'],
  ['Search and sort', 'By name, game, recency or favourite, with counts that stay correct as filters change.'],
  ['Protected built-ins', 'A shipped preset cannot be overwritten or deleted — not by an edit, and not by an import.'],
  ['One favourites store', 'Favourites live in a single store; the legacy key is migrated on first read.'],
];

const TRANSFER_FACTS: ReadonlyArray<[string, string]> = [
  ['Export', 'Writes a versioned crshhx-presets v2 file containing your values exactly as they are.'],
  ['Plan before apply', 'Import lists every entry, conflict and repair first, and writes nothing until you approve.'],
  ['Per-entry choice', 'Each entry is kept, replaced or skipped individually; conflicts default to keeping yours.'],
  ['Large imports', 'More than 25 crosshairs requires an acknowledgement before anything is written.'],
  ['Normalisation', 'Out-of-range values are corrected on the way in and listed in the preview.'],
];

const SLOT_FACTS: ReadonlyArray<[string, string]> = [
  ['Defaults', 'Shotgun on 1, rifle on 2, SMG on 3, sniper on 4, utility on 5 — every one rebindable.'],
  ['Conflicts', 'A key already bound to another slot is refused, and the conflict is named in the interface.'],
  ['Passive hook', 'The keyboard is observed without consuming events, so the game sees every keypress.'],
  ['Fallback', 'If the hook cannot start, the page states the reason and names the fallback transport, which requires a modifier with single-digit keys.'],
];

const OVERLAY_FACTS: ReadonlyArray<[string, string]> = [
  ['Topmost window', 'A dedicated window centred on the monitor you choose, drawing nothing but the reticle.'],
  ['Hotkeys', 'F10 toggles the overlay and F9 cycles presets without leaving the game.'],
  ['ADS morphing', 'Shrink, dot-only or fade, triggered by right-click or a hotkey, at a scale you set.'],
  ['Firing bloom', 'The gap expands on shot and decays over a configurable interval.'],
  ['Stretched resolution', 'Compensation for 4:3, 16:10, 5:4 and custom ratios keeps the reticle square.'],
  ['Target monitor', 'The choice survives restarts, and the overlay repositions on hotplug, resolution and scaling changes.'],
];

function RuleList({ rows }: { rows: ReadonlyArray<readonly [string, string]> }) {
  return (
    <div className="rulelist">
      {rows.map(([term, value]) => (
        <div className="rulelist-row" key={term}>
          <span className="rulelist-k">{term}</span>
          <span>{value}</span>
        </div>
      ))}
    </div>
  );
}

export function FeaturesPage() {
  return (
    <>
      <section className="band world-field" style={{ paddingBlock: 'clamp(56px,7vw,104px)' }}>
        <div className="container">
          <span className="eyebrow">Features</span>
          <h1>What the application actually does.</h1>
          <p className="section-lead" style={{ maxWidth: '64ch' }}>
            Six areas, described as they behave rather than as they sound. Every visual on this
            page is rendered from the application’s real parameters by this site’s own renderer;
            none of them is a screenshot.
          </p>

          {/* A jump index rather than tabs: the areas are read in sequence, and
              each one has a composition of its own. */}
          <nav aria-label="Feature areas" className="rulelist" style={{ marginTop: 'var(--space-7)' }}>
            {AREAS.map((area) => (
              <a className="rulelist-row area-link" href={`#${area.id}`} key={area.id}>
                <span className="rulelist-k">{area.num}</span>
                <span>{area.label}</span>
              </a>
            ))}
          </nav>
        </div>
      </section>

      {/* 01 — Editor: copy and a ruled parameter list beside the designer. */}
      <section className="band world-field" id="editor">
        <div className="container">
          <div className="band-head">
            <span className="band-num">01 / Editor</span>
            <h2>The editor draws what the overlay draws.</h2>
            <p className="band-lead">
              It works on the overlay’s own schema, so there is no preview approximation: the
              reticle you compose is the reticle the game sees.
            </p>
          </div>
          <div className="band-split">
            <div className="band-copy">
              <RuleList rows={EDITOR_PARAMS} />
              <p className="faint mono" style={{ marginTop: 'var(--space-4)' }}>
                Try it on the home page — the demonstration there is interactive.
              </p>
            </div>
            <Reveal>
              <DesignerMock />
            </Reveal>
          </div>
        </div>
      </section>

      {/* 02 — Presets: a contact sheet of real designs, then the library rules. */}
      <section className="band world-studio" id="presets">
        <div className="container">
          <div className="band-head">
            <span className="band-num">02 / Presets</span>
            <h2>{CATALOGUE.vault.total} built in, and room for yours.</h2>
            <p className="band-lead">
              Presets carry a game tag or a universal one. Eight of the shipped designs, drawn
              from their real parameters, beside the rules the library is built on.
            </p>
          </div>
          <div className="showcase" style={{ marginBottom: 'var(--space-7)' }}>
            {PRESET_SHOWCASE.map((preset) => (
              <div className="showcase-item" key={preset.name}>
                <Reticle spec={preset.spec} size={58} label={`${preset.name} crosshair`} />
                <span className="showcase-name">{preset.name}</span>
                <span className="showcase-game">{preset.game}</span>
              </div>
            ))}
          </div>
          <div className="band-split">
            <RuleList rows={LIBRARY_FACTS} />
            <Reveal>
              <LibraryMock />
            </Reveal>
          </div>
        </div>
      </section>

      {/* 03 — Transfer: the preview on the left this time, so the page does not
             repeat one composition down its length. */}
      <section className="band world-field" id="transfer">
        <div className="container">
          <div className="band-head">
            <span className="band-num">03 / Transfer</span>
            <h2>Import plans before it applies.</h2>
            <p className="band-lead">
              Moving a library between machines should not be a gamble about what gets
              overwritten. It is not: the plan is shown, and you approve it entry by entry.
            </p>
          </div>
          <div className="band-split flip">
            <div className="band-copy">
              <RuleList rows={TRANSFER_FACTS} />
            </div>
            <Reveal>
              <ImportPreviewMock />
            </Reveal>
          </div>
        </div>
      </section>

      {/* 04 — Profiles: three columns of behaviour, then the profile surface. */}
      <section className="band world-studio" id="profiles">
        <div className="container">
          <div className="band-head">
            <span className="band-num">04 / Profiles</span>
            <h2>One setup per game.</h2>
            <p className="band-lead">
              A profile holds a set of choices for one game, and can switch itself when that
              game comes to the front.
            </p>
          </div>
          <div className="band-cols" style={{ marginBottom: 'var(--space-7)' }}>
            <div className="band-col">
              <h3>Automatic is optional</h3>
              <p>With auto-selection off, no process polling runs at all. With it on, a profile activates when its game reaches the foreground.</p>
            </div>
            <div className="band-col">
              <h3>Restricted means restricted</h3>
              <p>A restricted profile switches only while a matched process is in front, and stops switching rather than guessing if tracking becomes unavailable.</p>
            </div>
            <div className="band-col">
              <h3>Manual wins until it changes</h3>
              <p>Selecting a profile by hand overrides auto-selection, and holds until the foreground game changes again.</p>
            </div>
          </div>
          <div className="band-split flip">
            <Reveal>
              <ProfilesMock />
            </Reveal>
            <div className="band-copy">
              <p>
                Tags are how a preset belongs to a profile: valorant, cs2, fortnite, apex, or
                universal for a design that works anywhere. The full catalogue of{' '}
                {CATALOGUE.pro.total} curated designs is tagged the same way.
              </p>
              <Link className="btn btn-secondary btn-sm" to="/pro-crosshairs">
                Browse Pro Crosshairs
                <IconArrow />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 05 — Weapon slots: keys first, as keycaps, then the binding surface. */}
      <section className="band world-field" id="slots">
        <div className="container">
          <div className="band-head">
            <span className="band-num">05 / Weapon slots</span>
            <h2>The reticle follows the weapon.</h2>
            <p className="band-lead">
              Each slot holds a design and a recorded key. The hook that watches for it is
              passive, which is the whole point: the game keeps every keypress.
            </p>
          </div>
          <div className="keycaps" style={{ marginBottom: 'var(--space-6)' }}>
            {[
              ['1', 'Shotgun'],
              ['2', 'Rifle'],
              ['3', 'SMG'],
              ['4', 'Sniper'],
              ['5', 'Utility'],
            ].map(([key, label]) => (
              <span className="keycap" key={key}>
                <span className="kbd">{key}</span>
                {label}
              </span>
            ))}
          </div>
          <div className="band-split">
            <div className="band-copy">
              <RuleList rows={SLOT_FACTS} />
            </div>
            <Reveal>
              <SlotsMock />
            </Reveal>
          </div>
        </div>
      </section>

      {/* 06 — Overlay: a flush dark band, because this is the part that sits on
             the game. The bloom demonstration loops; it is the one animation on
             the page that shows a behaviour rather than decorating a section. */}
      <section className="band world-field" id="overlay" style={{ background: 'var(--field-2)' }}>
        <div className="container">
          <div className="band-head">
            <span className="band-num">06 / Overlay</span>
            <h2>A window that draws one thing.</h2>
            <p className="band-lead">
              Topmost, click-through where it should be, and centred on the monitor you chose.
            </p>
          </div>
          <div className="band-split" style={{ gridTemplateColumns: 'minmax(0,7fr) minmax(0,5fr)' }}>
            <div>
              <Reveal>
                <OverlayMock />
              </Reveal>
              <div style={{ height: 'var(--space-4)' }} />
              <BloomDemo />
            </div>
            <div className="band-copy">
              <RuleList rows={OVERLAY_FACTS} />
              <div style={{ marginTop: 'var(--space-5)' }}>
                <Reveal>
                  <KeybindsMock />
                </Reveal>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="band world-studio" style={{ paddingBlock: 'clamp(48px,6vw,88px)' }}>
        <div className="container container-narrow">
          <div className="band-head" style={{ marginBottom: 'var(--space-5)' }}>
            <h2>Read the details, or install it.</h2>
            <p className="band-lead">
              The documentation covers every setting on this page, including the ones that only
              matter when something goes wrong.
            </p>
          </div>
          <div className="hero-cta">
            <Link className="btn btn-primary btn-lg" to="/download">
              Download for Windows
              <IconArrow />
            </Link>
            <Link className="btn btn-secondary btn-lg" to="/docs">
              Open the documentation
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
