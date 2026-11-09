import { Link } from 'react-router-dom';
import { Reveal } from '../components/Reveal';
import { Callout } from '../components/Blocks';
import { Playground } from '../components/Playground';
import {
  AcademyMock,
  KeybindsMock,
  OverlayMock,
  PRESET_SHOWCASE,
  ProBenchMock,
  SlotsMock,
} from '../components/ProductMock';
import { Reticle } from '../components/Reticle';
import { IconArrow, IconDownload } from '../components/icons';
import { CATALOGUE } from '../catalogue';
import type { ReleaseArtifact, ReleaseManifest } from '../site';
import { latestPublishedEntry, pickArtifact } from '../site';
import data from '../releases.json';

const manifest = data as unknown as ReleaseManifest;
const latestEntry = latestPublishedEntry(manifest);
const installer = pickArtifact(latestEntry, 'setup');
const portable = pickArtifact(latestEntry, 'portable');

/** Measured, never estimated. Empty until the manifest carries a size. */
function sizeLabel(artifact: ReleaseArtifact | null): string {
  return typeof artifact?.size === 'number' ? `${(artifact.size / 1048576).toFixed(1)} MB` : '';
}

/**
 * Four counts of things that exist in the shipped application. They come from
 * the generated catalogue rather than being typed into copy, so a number on this
 * page cannot disagree with the product.
 */
const RAIL = [
  {
    value: String(CATALOGUE.vault.total),
    label: 'built-in presets',
    note: 'Cross, dot, circle, chevron and T-shape designs, tagged by game.',
  },
  {
    value: String(CATALOGUE.pro.total),
    label: 'curated designs',
    note: `Across ${CATALOGUE.pro.categories.length} categories, with a preview bench.`,
  },
  {
    value: String(CATALOGUE.academy.total),
    label: 'tutorials',
    note: 'Live demos and labelled illustrations, inside the application.',
  },
  {
    value: '0',
    label: 'telemetry',
    note: 'No account, no analytics, no cloud sync. It works offline.',
  },
] as const;

/** What the studio guarantees, on the light world: these are editorial facts. */
const GUARANTEES = [
  {
    title: 'Your library stays yours',
    body: 'Presets, folders, favourites, profiles and slot bindings live in your roaming application-data directory — kept on update and on uninstall.',
  },
  {
    title: 'Built-ins cannot be broken',
    body: 'Organisation metadata is stored in a sidecar keyed by preset id, so filing or renaming a shipped design never modifies it, and an import cannot overwrite one.',
  },
  {
    title: 'Import plans before it applies',
    body: 'Every entry, conflict and repair is listed first, and each one is kept, replaced or skipped by your choice. Nothing is written until you approve it.',
  },
  {
    title: 'Profiles stop rather than guess',
    body: 'A profile can switch when its game reaches the foreground. A restricted profile stops switching when process tracking is unavailable, instead of guessing.',
  },
] as const;

const SLOT_KEYS = [
  { key: '1', label: 'Shotgun' },
  { key: '2', label: 'Rifle' },
  { key: '3', label: 'SMG' },
  { key: '4', label: 'Sniper' },
  { key: '5', label: 'Utility' },
  { key: 'F10', label: 'Toggle overlay' },
  { key: 'F9', label: 'Cycle preset' },
] as const;

const FAQ = [
  {
    q: 'Does crshhx modify games or read their memory?',
    a: 'No. It draws its own overlay window and observes keyboard and mouse input passively. It does not inject into, patch or read any game process.',
  },
  {
    q: 'Is it safe with anti-cheat systems?',
    a: 'That cannot be guaranteed by this project. crshhx does not touch game processes and consumes no input, but whether a given anti-cheat accepts any third-party overlay or input observer is the vendor’s decision and can change at any time. Check the rules of each game you play.',
  },
  {
    q: 'Do I need an internet connection or an account?',
    a: 'Neither. Fonts and assets are bundled, your library lives on your machine, and there is nothing to sign into. The application works fully offline after install.',
  },
] as const;

const TOPOLOGIES = Object.entries(CATALOGUE.vault.byTopology).sort((a, b) => b[1] - a[1]);

export function HomePage() {
  return (
    <>
      {/* The seam: the game on one side, the editor on the other, and the
          reticle on the boundary between them. */}
      <section className="seam-hero">
        <div className="split">
          <div className="split-half split-field world-field">
            <div className="split-inner">
              <span className="eyebrow">Crshhx Crosshair Studio · Windows</span>
              <h1 className="hero-title">
                Your crosshair,
                <br />
                drawn over the game.
                <br />
                <span className="dim-line">Never inside it.</span>
              </h1>
              <p className="hero-sub">
                A topmost overlay window that draws nothing but the reticle — and behind it an
                editor for per-arm geometry, a library of {CATALOGUE.vault.total} built-in
                presets, profiles per game and keybinds that switch your crosshair with your
                weapon.
              </p>
              <div className="hero-cta">
                {installer?.url ? (
                  <a className="btn btn-primary btn-lg" href={installer.url} download={installer.file}>
                    <IconDownload />
                    Download for Windows
                  </a>
                ) : (
                  <Link className="btn btn-primary btn-lg" to="/download">
                    <IconDownload />
                    Download for Windows
                  </Link>
                )}
                <Link className="btn btn-secondary btn-lg" to="/features">
                  See what it does
                  <IconArrow />
                </Link>
              </div>
              <p className="hero-req">
                {latestEntry ? <span>{`v${latestEntry.version}`}</span> : null}
                <span>Windows 10 &amp; 11 · 64-bit</span>
                {sizeLabel(installer) ? <span>{`${sizeLabel(installer)} installer`}</span> : null}
                {sizeLabel(portable) ? <span>{`${sizeLabel(portable)} portable`}</span> : null}
                <span>No account</span>
              </p>
            </div>
          </div>

          <div className="split-half split-studio world-studio">
            <div className="split-inner">
              <span className="eyebrow">The studio — what you control</span>
              <h2 className="hero-studio-title">
                Per-arm geometry,
                <br />
                not a colour picker.
              </h2>
              <p className="hero-sub">
                Length, thickness, gap, outline, centre dot and rotation — each editable, each
                drawn live at the proportion the overlay uses. Move a slider; the reticle on
                the left is the same design.
              </p>
              <Reveal>
                <Playground />
              </Reveal>
            </div>
          </div>
        </div>

        <div className="seam-reticle">
          <Reticle
            spec={{ ...PRESET_SHOWCASE[0].spec, scale: 1.35 }}
            size={150}
            label="Crosshair drawn on the boundary between the game and the editor"
          />
          <span className="seam-caption">rendered at true proportion — not a screenshot</span>
        </div>
      </section>

      {/* Four counts, separated by space. No borders, no cards, no icons. */}
      <section className="band world-field" style={{ paddingBlock: 'clamp(40px,5vw,64px)' }}>
        <div className="container">
          <div className="rail">
            {RAIL.map((item) => (
              <div className="rail-item" key={item.label}>
                <span className="rail-v">{item.value}</span>
                <span className="rail-k">{item.label}</span>
                <span className="rail-note">{item.note}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="band world-field">
        <div className="container">
          <div className="band-head">
            <span className="band-num">01 / Weapon slots</span>
            <h2>The reticle follows the weapon.</h2>
            <p className="band-lead">
              Record the key that selects each weapon and bind a design to it. The keyboard is
              observed passively, so the game receives every keypress exactly as it would
              without crshhx.
            </p>
          </div>
          <div className="band-split">
            <div className="band-copy">
              <ul className="feature-list" style={{ borderTop: 0 }}>
                <li>Defaults: shotgun on 1, rifle on 2, SMG on 3, sniper on 4, utility on 5 — all rebindable.</li>
                <li>A key already used by another slot is refused, and the conflict is named.</li>
                <li>If the passive hook cannot start, the interface says so and names the fallback transport.</li>
              </ul>
              <div className="keycaps">
                {SLOT_KEYS.map((slot) => (
                  <span className="keycap" key={slot.key}>
                    <span className="kbd">{slot.key}</span>
                    {slot.label}
                  </span>
                ))}
              </div>
            </div>
            <Reveal>
              <SlotsMock />
            </Reveal>
          </div>
        </div>
      </section>

      <section className="band world-studio">
        <div className="container">
          <div className="band-head">
            <span className="band-num">02 / Studio</span>
            <h2>Everything stays on your machine.</h2>
            <p className="band-lead">
              There is no account to create and nothing to sync. These are the guarantees that
              follow from that, and each one is a behaviour the application is tested on.
            </p>
          </div>
          <div className="band-cols">
            {GUARANTEES.map((item) => (
              <div className="band-col" key={item.title}>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Split two: the catalogue is product, so it sits on the field. The
          policy about attribution is editorial, so it sits in the studio. */}
      <section className="band world-field" style={{ paddingBlock: 0 }}>
        <div className="split">
          <div className="split-half split-field" style={{ paddingBlock: 'var(--section-y)' }}>
            <div className="split-inner">
              <Reveal>
                <ProBenchMock />
              </Reveal>
              <div style={{ height: 'var(--space-4)' }} />
              <Reveal>
                <AcademyMock />
              </Reveal>
            </div>
          </div>
          <div
            className="split-half split-studio world-studio"
            style={{ paddingBlock: 'var(--section-y)' }}
          >
            <div className="split-inner">
              <span className="band-num">03 / Built in</span>
              <h2 className="hero-studio-title">Two collections, already installed.</h2>
              <p className="hero-sub">
                {CATALOGUE.pro.total} curated designs across {CATALOGUE.pro.categories.length}{' '}
                categories, with a preview bench for backdrops, zoom, colour and size overrides
                and a two-design compare. Plus {CATALOGUE.academy.total} tutorials that run
                inside the application, with live editable demos.
              </p>
              <Callout title="Why no crosshair is named after a player">
                <p>{CATALOGUE.pro.note}</p>
              </Callout>
              <div className="hero-cta">
                <Link className="btn btn-primary" to="/pro-crosshairs">
                  Browse the catalogue
                  <IconArrow />
                </Link>
                <Link className="btn btn-secondary" to="/academy">
                  Read the curriculum
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="band world-field">
        <div className="container">
          <div className="band-head">
            <span className="band-num">04 / Overlay</span>
            <h2>A window that draws one thing.</h2>
            <p className="band-lead">
              The overlay is a dedicated topmost window, centred on the monitor you choose. It
              reacts to what you do in the game without touching it.
            </p>
          </div>
          <div className="band-split flip">
            <div className="band-copy">
              <ul className="feature-list" style={{ borderTop: 0 }}>
                <li>ADS morphing in three styles — shrink, dot-only and fade — triggered by right-click or a hotkey.</li>
                <li>Firing bloom expands the gap on shot and decays over a configurable interval.</li>
                <li>Stretched compensation for 4:3, 16:10, 5:4 and custom ratios keeps the reticle square.</li>
                <li>Target monitor selection survives restarts and follows hotplug, resolution and scaling changes.</li>
              </ul>
              <div className="keycaps">
                <span className="keycap">
                  <span className="kbd">F10</span>
                  Toggle
                </span>
                <span className="keycap">
                  <span className="kbd">F9</span>
                  Cycle preset
                </span>
                <span className="keycap">
                  <span className="kbd">RMB</span>
                  ADS morph
                </span>
              </div>
            </div>
            <div>
              <Reveal>
                <KeybindsMock />
              </Reveal>
              <div style={{ height: 'var(--space-4)' }} />
              <Reveal>
                <OverlayMock />
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      <section className="band world-field band-flush" style={{ paddingBlock: 'clamp(48px,6vw,88px)' }}>
        <div className="container">
          <div className="band-head">
            <span className="band-num">05 / Vault</span>
            <h2>{CATALOGUE.vault.total} designs, filed not fused.</h2>
            <p className="band-lead">
              Eight of them, drawn here from the parameters the application ships.{' '}
              {TOPOLOGIES.map(([topology, count], index) => (
                <span key={topology}>
                  {index > 0 ? ' · ' : ''}
                  {count} {topology}
                </span>
              ))}
              .
            </p>
          </div>
          <div className="showcase">
            {PRESET_SHOWCASE.map((preset) => (
              <div className="showcase-item" key={preset.name}>
                <Reticle spec={preset.spec} size={62} label={`${preset.name} crosshair`} />
                <span className="showcase-name">{preset.name}</span>
                <span className="showcase-game">{preset.game}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="band world-studio">
        <div className="container container-narrow">
          <div className="band-head">
            <span className="band-num">06 / Before you install</span>
            <h2>Questions worth answering first.</h2>
          </div>
          {FAQ.map((item) => (
            <details className="faq" key={item.q}>
              <summary>{item.q}</summary>
              <div className="faq-body">{item.a}</div>
            </details>
          ))}
          <div style={{ marginTop: 'var(--space-5)' }}>
            <Link className="btn btn-secondary btn-sm" to="/docs#faq">
              All questions, answered in the documentation
              <IconArrow />
            </Link>
          </div>
        </div>
      </section>

      {/* Split three: the installer on the field, the portable build in the
          studio — the same choice the application gives you, drawn the same way
          the page has been drawn all the way down. */}
      <section className="band world-field" style={{ paddingBlock: 0 }}>
        <div className="split">
          <div className="split-half split-field" style={{ paddingBlock: 'var(--section-y)' }}>
            <div className="split-inner">
              <span className="eyebrow">
                {latestEntry ? `Version ${latestEntry.version} — released ${latestEntry.date}` : 'Download'}
              </span>
              <h2>
                {latestEntry
                  ? 'Ready for Windows.'
                  : 'No verified build has been published yet.'}
              </h2>
              <p className="hero-sub">
                One double-click installs it, with no prompts and no folders to choose. Your
                library is kept outside the install folder, so updating never touches it.
              </p>
              <div className="hero-cta">
                {installer?.url ? (
                  <a className="btn btn-primary btn-lg" href={installer.url} download={installer.file}>
                    <IconDownload />
                    Download installer{sizeLabel(installer) ? ` · ${sizeLabel(installer)}` : ''}
                  </a>
                ) : (
                  <Link className="btn btn-secondary btn-lg" to="/download">
                    Check download status
                  </Link>
                )}
              </div>
              <p className="hero-req">
                <span>Windows 10 &amp; 11 · 64-bit</span>
                <span>Not code-signed — SmartScreen may warn</span>
              </p>
            </div>
          </div>
          <div
            className="split-half split-studio world-studio"
            style={{ paddingBlock: 'var(--section-y)' }}
          >
            <div className="split-inner">
              <span className="eyebrow eyebrow-plain">No installation</span>
              <h2 className="hero-studio-title">Or take the portable build.</h2>
              <p className="hero-sub">
                Run it from a folder, a drive or a USB stick. Your library lives in your
                roaming profile either way, so both builds read the same presets.
              </p>
              <div className="hero-cta">
                {portable?.url ? (
                  <a className="btn btn-primary btn-lg" href={portable.url} download={portable.file}>
                    <IconDownload />
                    Download portable{sizeLabel(portable) ? ` · ${sizeLabel(portable)}` : ''}
                  </a>
                ) : (
                  <Link className="btn btn-secondary btn-lg" to="/download">
                    Check download status
                  </Link>
                )}
              </div>
              <p className="hero-req">
                <Link to="/download" style={{ color: 'inherit' }}>
                  Sizes, SHA-256 checksums and the install guide
                </Link>
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
