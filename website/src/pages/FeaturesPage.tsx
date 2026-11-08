import { useState, type KeyboardEvent, type ReactNode } from 'react';
import { Reveal } from '../components/Reveal';
import { SectionHead } from '../components/Blocks';
import { Reticle } from '../components/Reticle';
import {
  DesignerMock,
  LibraryMock,
  OverlayMock,
  PRESET_SHOWCASE,
  SlotsMock,
} from '../components/ProductMock';

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
          <div className="chips">
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
    <div className="hud" style={{ padding: 20, marginBottom: 20 }}>
      <div className="stage" style={{ minHeight: 190 }}>
        <span className="demo-bloom">
          <Reticle
            spec={PRESET_SHOWCASE[0].spec}
            size={120}
            label="Dynamic firing bloom demonstration"
          />
        </span>
        <span className="stage-hud">dynamic firing bloom · looped demonstration</span>
      </div>
    </div>
  );
}

interface Section {
  tab: string;
  eyebrow: string;
  title: string;
  body: string;
  points: ReadonlyArray<[string, string]>;
  visual: ReactNode;
}

const SECTIONS: ReadonlyArray<Section> = [
  {
    tab: 'Editor',
    eyebrow: '01 · Editor',
    title: 'A crosshair editor with real geometry',
    body: 'The editor works on the same schema the overlay renders: arm lengths and thickness per direction, gap, whole-reticle rotation and scale, an outline drawn behind each element and an inner outline drawn inside it. Colours come with contrast verdicts, because a reticle you cannot see is a defect, not a preference.',
    points: [
      ['Undo that means undo.', 'A coalesced history over the whole config, so a slider drag is one step, not forty.'],
      ['A/B compare.', 'Hold a snapshot and diff it against your working copy, parameter by parameter.'],
      ['Live preview.', 'Every control updates the reticle immediately, on a target backdrop, at true proportion.'],
    ],
    visual: <DesignerMock />,
  },
  {
    tab: 'Preset library',
    eyebrow: '02 · Presets',
    title: 'A library, not a list',
    body: '258 built-in presets across Valorant, CS2, Fortnite and Apex, plus everything you make. Folders, favourites, descriptions and timestamps live in a sidecar keyed by preset id, so organising a built-in never modifies it and your own presets stay byte-compatible with weapon slots.',
    points: [
      ['Search and sort.', 'By name, game, recency or favourite, with counts that stay correct as the library changes.'],
      ['Protected built-ins.', 'Shipped presets cannot be overwritten or deleted by an import or an edit.'],
      ['One favourites store.', 'Starring a crosshair anywhere stars it everywhere; the legacy key is migrated on first read.'],
    ],
    visual: <LibraryMock />,
  },
  {
    tab: 'Import & export',
    eyebrow: '03 · Transfer',
    title: 'Import and export with a preview gate',
    body: 'Exports are a versioned transfer file that carries your values exactly as they are. Imports are planned before they are applied: you see every entry, every conflict and every repair, and choose per entry whether to keep yours, replace it or skip.',
    points: [
      ['Nothing overwritten by default.', 'A conflicting entry is kept unless you explicitly set it to replace yours.'],
      ['Large imports ask twice.', 'More than 25 crosshairs requires an explicit acknowledgement before anything is written.'],
      ['Repairs are reported.', 'Out-of-range values are normalised on the way in and listed, never silently changed on the way out.'],
    ],
    visual: <ImportPreviewMock />,
  },
  {
    tab: 'Game profiles',
    eyebrow: '04 · Profiles',
    title: 'Profiles per game',
    body: 'Crosshairs are tagged for a game or marked universal. A profile can switch automatically when its game comes to the foreground, and can be restricted so switching only happens while a matched process is in front.',
    points: [
      ['Foreground auto-select.', 'Optional; with it off, no process polling runs at all.'],
      ['Fail-closed restriction.', 'If process tracking is unavailable, a restricted profile stops switching rather than firing in the wrong game.'],
      ['Manual always wins.', 'Selecting a profile by hand overrides auto-selection until the game changes again.'],
    ],
    visual: <ProfilesMock />,
  },
  {
    tab: 'Weapon slots',
    eyebrow: '05 · Weapon slots',
    title: 'Switching that keeps up with the fight',
    body: 'Bind a crosshair to each weapon slot and record the key that selects it. The passive input hook observes your keyboard without consuming a single event, so the game sees exactly what it would have seen without crshhx.',
    points: [
      ['Defaults that make sense.', 'Shotgun on 1, rifle on 2, SMG on 3, sniper on 4, utility on 5 — all rebindable.'],
      ['Conflict detection.', 'Assigning a key another slot already uses is refused, naming the slot in question.'],
      ['Visible degradation.', 'If the hook cannot start, the interface says so and explains the fallback transport.'],
    ],
    visual: <SlotsMock />,
  },
  {
    tab: 'Overlay',
    eyebrow: '06 · Overlay',
    title: 'An overlay built to be forgotten',
    body: 'A dedicated topmost window, centred on the monitor you choose, drawing nothing but the reticle. It compensates for stretched resolutions, morphs when you aim down sights and expands with firing bloom if you want it to.',
    points: [
      ['F10 and F9.', 'Toggle the overlay and cycle presets without leaving the game.'],
      ['Stretched compensation.', '4:3, 16:10, 5:4 or a custom ratio, so the reticle stays square on stretched setups.'],
      ['ADS and bloom.', 'Shrink, dot-only or fade on aim; configurable expansion and decay on fire.'],
    ],
    visual: (
      <>
        <BloomDemo />
        <OverlayMock />
      </>
    ),
  },
];

export function FeaturesPage() {
  const [active, setActive] = useState(0);

  const onTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = SECTIONS.length - 1;
    let next: number | null = null;
    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
      next = index === last ? 0 : index + 1;
    } else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
      next = index === 0 ? last : index - 1;
    } else if (event.key === 'Home') {
      next = 0;
    } else if (event.key === 'End') {
      next = last;
    }
    if (next === null) return;
    event.preventDefault();
    setActive(next);
    document.getElementById(`xtab-${next}`)?.focus();
  };

  return (
    <>
      <section className="section" style={{ paddingTop: 'clamp(56px, 7vw, 96px)' }}>
        <div className="container">
          <SectionHead
            level={1}
            eyebrow="Features"
            title="What the application actually does"
            lead="Six areas, described the way the product behaves. Pick a panel to explore it. Every visual on this page is an illustrative rendering built from the application's real parameters; none of them is a screenshot."
          />
        </div>
      </section>

      <section className="section explorer-section">
        <div className="container explorer">
          <div role="tablist" aria-orientation="vertical" aria-label="Feature areas" className="explorer-tabs">
            {SECTIONS.map((section, index) => (
              <button
                key={section.eyebrow}
                id={`xtab-${index}`}
                role="tab"
                type="button"
                className={`xtab${index === active ? ' is-active' : ''}`}
                aria-selected={index === active}
                aria-controls={`xpanel-${index}`}
                tabIndex={index === active ? 0 : -1}
                onClick={() => setActive(index)}
                onKeyDown={(event) => onTabKeyDown(event, index)}
              >
                <span className="xtab-num">{String(index + 1).padStart(2, '0')}</span>
                <span className="xtab-label">{section.tab}</span>
              </button>
            ))}
          </div>

          <div>
            {SECTIONS.map((section, index) => (
              <div
                key={section.eyebrow}
                id={`xpanel-${index}`}
                role="tabpanel"
                aria-labelledby={`xtab-${index}`}
                hidden={index !== active}
                className="xpanel"
              >
                <span className="eyebrow">{section.eyebrow}</span>
                <h2>{section.title}</h2>
                <p style={{ marginTop: 16, color: 'var(--text-dim)' }}>{section.body}</p>
                <ul className="feature-list">
                  {section.points.map(([strong, rest]) => (
                    <li key={strong}>
                      <strong>{strong}</strong> {rest}
                    </li>
                  ))}
                </ul>
                <div className="feature-visual">
                  <Reveal>{section.visual}</Reveal>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
