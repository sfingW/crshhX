import { Link } from 'react-router-dom';
import { Reveal } from '../components/Reveal';
import { SectionHead } from '../components/Blocks';
import { Playground } from '../components/Playground';
import { SlotsMock } from '../components/ProductMock';
import { IconArrow, IconDownload } from '../components/icons';
import type { ReleaseManifest } from '../site';
import { latestPublishedEntry, pickArtifact } from '../site';
import data from '../releases.json';

const manifest = data as unknown as ReleaseManifest;
const latestEntry = latestPublishedEntry(manifest);
const installer = pickArtifact(latestEntry, 'setup');

const SPEC = [
  [
    'Editor',
    'Per-arm length and thickness, gap, rotation, scale, outer and inner outlines, centre dot, spread ring and glow. Colour tools report contrast as you pick; every change is undoable and can be diffed against a held snapshot.',
  ],
  [
    'Library',
    'Folders, favourites, descriptions, search and sort across the built-in vault and your own presets. Organisation metadata lives beside the presets, so built-ins can be filed but never modified.',
  ],
  [
    'Transfer',
    'Export writes a versioned file with your values as they are. Import lists every entry, conflict and repair in a preview, and applies only what you approve, entry by entry.',
  ],
  [
    'Profiles',
    'Crosshairs carry a game tag or a universal one. A profile can switch when its game reaches the foreground; restricted profiles stop switching rather than guess.',
  ],
  [
    'Weapon slots',
    'Record the key that selects each weapon and bind a crosshair to it. The keyboard is observed passively, so the game receives every keypress exactly as it would without crshhx.',
  ],
  [
    'Overlay',
    'A topmost window that draws nothing but the reticle: F10 to toggle, F9 to cycle, compensation for stretched resolutions, ADS morphing and firing bloom with configurable decay.',
  ],
] as const;

const FACTS = [
  '258 built-in presets',
  '5 weapon slots, rebindable',
  'installer and portable builds',
  'no account, no telemetry',
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
  {
    q: 'Will my crosshairs survive an update?',
    a: 'Yes. Your data lives outside the install directory, and the storage migration confirms a copy before it records itself as complete. A migration that cannot be confirmed is retried on the next launch instead of being marked done.',
  },
];

export function HomePage() {
  return (
    <>
      <section className="hero">
        <div className="container hero-inner">
          <div>
            <span className="eyebrow">Windows 10 &amp; 11 · 64-bit</span>
            <h1 className="hero-title">Your crosshair, exactly where you put it.</h1>
            <p className="hero-sub">
              crshhx draws a crosshair overlay above any game on Windows. Behind it sit an
              editor for the reticle, a library for your presets, profiles per game and
              keybinds that switch the crosshair with your weapon. All of it stays on your
              machine.
            </p>
            <div className="hero-cta">
              {installer?.url ? (
                <a className="btn btn-primary" href={installer.url} download={installer.file}>
                  <IconDownload />
                  Download for Windows
                </a>
              ) : (
                <Link className="btn btn-primary" to="/download">
                  <IconDownload />
                  Download for Windows
                </Link>
              )}
              <Link className="btn btn-secondary" to="/features">
                Explore features
                <IconArrow />
              </Link>
            </div>
            <p className="hero-meta">
              <span>64-bit installer &amp; portable</span>
              <span>No account</span>
              <span>No telemetry</span>
              <span>Works offline</span>
            </p>
          </div>
          <Reveal>
            <Playground />
          </Reveal>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0, paddingBottom: 0 }}>
        <div className="container">
          <p className="factline">
            {FACTS.map((fact) => (
              <span key={fact}>{fact}</span>
            ))}
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <SectionHead
            eyebrow="What it does"
            title="Six parts, one application"
            lead="Everything below exists in the current codebase and is covered by its test suite."
          />
          <div className="spec-index">
            {SPEC.map(([name, description], index) => (
              <div className="spec-row" key={name}>
                <span className="spec-name" data-index={String(index + 1).padStart(2, '0')}>
                  {name}
                </span>
                <span className="spec-desc">{description}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container feature-grid">
          <div className="feature-copy">
            <span className="eyebrow">Weapon slots</span>
            <h2>The reticle follows the weapon</h2>
            <p>
              Assign a crosshair to each slot and record the key that switches to it. crshhx
              watches for that key and swaps the overlay in place, without consuming the
              event.
            </p>
            <ul className="feature-list">
              <li>Any key or modifier combination per slot, with conflicts detected as you assign them.</li>
              <li>Keys that matter while typing are handled by an explicit policy, not by chance.</li>
              <li>If the passive hook cannot start, the interface says so and names the fallback transport.</li>
            </ul>
          </div>
          <div className="feature-visual">
            <Reveal>
              <SlotsMock />
            </Reveal>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <SectionHead centered eyebrow="How it works" title="Install, design, play" />
          <div className="steps">
            <div className="step">
              <span className="step-num">01</span>
              <h3 className="step-title">Install</h3>
              <p className="step-body">
                Run the Windows installer, or keep the portable executable in any folder. Your
                library lives in your roaming profile, not in the install directory.
              </p>
            </div>
            <div className="step">
              <span className="step-num">02</span>
              <h3 className="step-title">Design</h3>
              <p className="step-body">
                Start from a built-in preset or from zero. The editor shows the reticle live,
                and every change is reversible through the undo history.
              </p>
            </div>
            <div className="step">
              <span className="step-num">03</span>
              <h3 className="step-title">Play</h3>
              <p className="step-body">
                The overlay stays centred on your monitor while you play. Toggle it with F10,
                cycle presets with F9, or let weapon slots do the switching.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container" style={{ maxWidth: 860 }}>
          <SectionHead
            eyebrow="Before you install"
            title="Questions worth answering first"
            lead="The complete list lives in the documentation."
          />
          {FAQ.map((item) => (
            <details className="faq" key={item.q}>
              <summary>{item.q}</summary>
              <div className="faq-body">{item.a}</div>
            </details>
          ))}
          <div style={{ marginTop: 24 }}>
            <Link className="btn btn-secondary btn-sm" to="/docs#faq">
              All questions, answered in the docs
              <IconArrow />
            </Link>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          {installer?.url ? (
            <div className="cta-band">
              <h2>Version {latestEntry?.version} is ready for Windows.</h2>
              <p>
                One double-click installs it — no prompts, no folders to choose. Prefer not to
                install? The portable executable runs from anywhere, and your crosshair library
                lives in your roaming profile either way.
              </p>
              <div className="cta-actions">
                <a className="btn btn-primary" href={installer.url} download={installer.file}>
                  <IconDownload />
                  Download for Windows
                </a>
                <Link className="btn btn-secondary" to="/download">
                  Sizes, hashes and the portable build
                  <IconArrow />
                </Link>
              </div>
            </div>
          ) : (
            <div className="cta-band">
              <h2>Nothing to download yet.</h2>
              <p>
                The application is complete and covered by its test suite. The Windows
                executables will appear on the download page only after the release workflow
                has produced and verified them, with sizes and hashes published alongside.
              </p>
              <div className="cta-actions">
                <Link className="btn btn-primary" to="/download">
                  <IconDownload />
                  Check download status
                </Link>
                <Link className="btn btn-secondary" to="/docs">
                  Read the documentation
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
