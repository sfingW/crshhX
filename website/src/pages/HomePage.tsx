import { Link } from 'react-router-dom';
import { Reveal } from '../components/Reveal';
import { SectionHead } from '../components/Blocks';
import { Playground } from '../components/Playground';
import { SlotsMock } from '../components/ProductMock';
import {
  IconArrow,
  IconDownload,
  IconEditor,
  IconFolders,
  IconKeyboard,
  IconMonitor,
  IconTarget,
  IconTransfer,
} from '../components/icons';

const HIGHLIGHTS = [
  {
    icon: IconEditor,
    title: 'A real editor, not a picker',
    body: 'Per-arm length and thickness, whole-reticle rotation and scale, an inner outline, colour tools with contrast verdicts, undo history and an A/B compare panel.',
  },
  {
    icon: IconFolders,
    title: 'A library you can organise',
    body: '258 built-in presets plus your own, in folders with favourites, descriptions, search and sort. Built-ins can be organised without ever being modified.',
  },
  {
    icon: IconTransfer,
    title: 'Import and export you can inspect',
    body: 'A versioned transfer file with a two-step preview. Nothing is overwritten unless you set that entry to replace it, and repairs are listed before anything is applied.',
  },
  {
    icon: IconTarget,
    title: 'Profiles per game',
    body: 'Crosshairs tagged for Valorant, CS2, Fortnite, Apex or universal use, with optional automatic switching when a matched game comes to the foreground.',
  },
  {
    icon: IconKeyboard,
    title: 'Weapon-slot switching',
    body: 'Record a key per slot — the defaults are 1 to 5 — and the reticle changes with the weapon. Input is observed passively, so the game still receives every press.',
  },
  {
    icon: IconMonitor,
    title: 'An overlay that behaves',
    body: 'A dedicated topmost window with F10 to toggle and F9 to cycle presets, stretched-resolution compensation, ADS morphing and dynamic firing bloom.',
  },
];

/** Profile tags the application's schema actually defines. */
const GAME_TAGS = ['valorant', 'cs2', 'fortnite', 'apex', 'universal'];

/** Numbers that can be checked in this repository right now. */
const LEDGER = [
  { num: '258', label: 'built-in presets in the shipped vault' },
  { num: '5', label: 'weapon slots, every keybind re-recordable' },
  { num: '2', label: 'planned distributions: installer and portable' },
  { num: '0', label: 'accounts, telemetry or network calls after install' },
];

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
            <span className="eyebrow">Crosshair overlay · Windows 10 &amp; 11</span>
            <h1 className="hero-title">
              Your crosshair, <em>exactly</em> where you put it.
            </h1>
            <p className="hero-sub">
              crshhx draws a crosshair overlay on top of any game and gives you a full editor
              behind it: per-arm geometry, a preset library, game profiles and weapon-slot
              keybinds. Everything is stored on your machine.
            </p>
            <div className="hero-cta">
              <Link className="btn btn-primary" to="/download">
                <IconDownload />
                Download for Windows
              </Link>
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

      <section className="strip-section">
        <div className="container">
          <div className="strip" role="list" aria-label="Profile tags supported by the schema">
            {GAME_TAGS.map((tag) => (
              <span className="strip-item" role="listitem" key={tag}>
                {tag}
              </span>
            ))}
          </div>
          <div className="led-row">
            {LEDGER.map((item) => (
              <div className="led" key={item.num + item.label}>
                <span className="led-num">{item.num}</span>
                <span className="led-label">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <SectionHead
            eyebrow="01 · What it does"
            title="One tool for the whole crosshair workflow"
            lead="Design a reticle, keep it organised, move it between machines, and have it change with your weapon — without touching the game itself."
          />
          <div className="card-grid">
            {HIGHLIGHTS.map((item) => (
              <Reveal key={item.title} as="div">
                <article className="card" style={{ height: '100%' }}>
                  <span className="card-icon">
                    <item.icon />
                  </span>
                  <h3 className="card-title">{item.title}</h3>
                  <p className="card-body">{item.body}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container feature-grid">
          <div className="feature-copy">
            <span className="eyebrow">02 · Weapon slots</span>
            <h2>The reticle follows the weapon</h2>
            <p>
              Assign a crosshair to each slot and record the key that switches to it. crshhx
              observes your keyboard passively and swaps the overlay in place; the game keeps
              receiving every keypress, exactly as if crshhx were not running.
            </p>
            <ul className="feature-list">
              <li>
                <strong>Recorded keybinds.</strong> Any key or modifier combination, with
                conflicts between slots detected as you assign them.
              </li>
              <li>
                <strong>Typing-safe.</strong> Keys that matter while typing are handled by
                policy, not by accident.
              </li>
              <li>
                <strong>Honest fallback.</strong> If the passive hook cannot start on a
                machine, crshhx says so and switches to a modifier-based transport instead of
                failing silently.
              </li>
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
          <SectionHead centered eyebrow="03 · How it works" title="Three steps, all local" />
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
                cycle presets with F9, or let weapon slots do the switching for you.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container" style={{ maxWidth: 860 }}>
          <SectionHead
            eyebrow="04 · Before you install"
            title="The questions everyone asks first"
            lead="Honest answers on safety, compatibility and your data — the full list lives in the documentation."
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
          <div className="cta-band">
            <h2>Ready when the first build is.</h2>
            <p>
              crshhx is in release-candidate development: the application is complete and
              covered by its test suite. Its Windows executables appear on the download page
              only after the release workflow has produced and verified them — never before.
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
        </div>
      </section>
    </>
  );
}
