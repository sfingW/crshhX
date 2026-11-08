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
  points: ReadonlyArray<string>;
  visual: ReactNode;
}

const SECTIONS: ReadonlyArray<Section> = [
  {
    tab: 'Editor',
    eyebrow: '01 · Editor',
    title: 'Crosshair editor',
    body: 'The editor works on the overlay’s own schema, so what you see is what gets drawn: per-arm length and thickness, gap, rotation, scale, outer and inner outlines, centre dot, spread ring and glow.',
    points: [
      'Undo history coalesces continuous adjustments, so a slider drag is one step.',
      'The compare panel diffs a held snapshot against the working copy, parameter by parameter.',
      'Colour tools report contrast against the target backdrop while you pick.',
    ],
    visual: <DesignerMock />,
  },
  {
    tab: 'Preset library',
    eyebrow: '02 · Presets',
    title: 'Presets and library',
    body: '258 built-in presets across Valorant, CS2, Fortnite and Apex, plus everything you save. Folders, favourites, descriptions and timestamps live in a sidecar keyed by preset id, so organising a built-in never modifies it.',
    points: [
      'Search and sort by name, game, recency or favourite, with counts that stay correct.',
      'Shipped presets cannot be overwritten or deleted, by edits or by imports.',
      'Favourites are a single store; the legacy key is migrated on first read.',
    ],
    visual: <LibraryMock />,
  },
  {
    tab: 'Import & export',
    eyebrow: '03 · Transfer',
    title: 'Import and export',
    body: 'Export writes a versioned transfer file with your values as they are. Import plans before it applies: entries, conflicts and repairs are listed first, and each entry is kept, replaced or skipped by your choice.',
    points: [
      'Conflicts default to keeping your preset; replace is an explicit per-entry choice.',
      'Imports above 25 crosshairs require an acknowledgement before anything is written.',
      'Out-of-range values are normalised on the way in and listed in the preview.',
    ],
    visual: <ImportPreviewMock />,
  },
  {
    tab: 'Game profiles',
    eyebrow: '04 · Profiles',
    title: 'Game profiles',
    body: 'Crosshairs carry a game tag or a universal one. A profile can switch automatically when its game reaches the foreground, and can be restricted to switch only while a matched process is in front.',
    points: [
      'Automatic switching is optional; with it off, no process polling runs at all.',
      'Restricted profiles stop switching if process tracking becomes unavailable.',
      'Selecting a profile by hand overrides auto-selection until the game changes again.',
    ],
    visual: <ProfilesMock />,
  },
  {
    tab: 'Weapon slots',
    eyebrow: '05 · Weapon slots',
    title: 'Weapon-slot switching',
    body: 'Each slot holds a crosshair and a recorded key. The passive hook observes the keyboard without consuming a single event, so the game sees exactly what it would see without crshhx.',
    points: [
      'Defaults: shotgun on 1, rifle on 2, SMG on 3, sniper on 4, utility on 5. All rebindable.',
      'A key already used by another slot is refused, and the conflict is named.',
      'If the hook cannot start, the page states the reason and explains the fallback transport.',
    ],
    visual: <SlotsMock />,
  },
  {
    tab: 'Overlay',
    eyebrow: '06 · Overlay',
    title: 'Overlay window',
    body: 'A dedicated topmost window, centred on the monitor you choose, drawing nothing but the reticle.',
    points: [
      'F10 toggles the overlay and F9 cycles presets without leaving the game.',
      'Stretched compensation for 4:3, 16:10, 5:4 and custom ratios keeps the reticle square.',
      'ADS morphing (shrink, dot-only, fade) and firing bloom with configurable decay.',
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
            lead="Six areas of the application, described as they behave. Every visual on this page is rendered from the application's real parameters; none of them is a screenshot."
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
                  {section.points.map((point) => (
                    <li key={point}>{point}</li>
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
