import { Link } from 'react-router-dom';
import { Callout } from '../components/Blocks';
import type { ReleaseManifest } from '../site';
import { latestPublishedEntry, pickArtifact } from '../site';
import data from '../releases.json';

const manifest = data as unknown as ReleaseManifest;
const latestEntry = latestPublishedEntry(manifest);
const installer = pickArtifact(latestEntry, 'setup');

const TOC = [
  { id: 'getting-started', label: 'Getting started' },
  { id: 'installation', label: 'Installation' },
  { id: 'editor', label: 'Creating a crosshair' },
  { id: 'presets', label: 'Managing presets' },
  { id: 'import-export', label: 'Import and export' },
  { id: 'profiles', label: 'Game profiles' },
  { id: 'weapon-slots', label: 'Weapon-slot switching' },
  { id: 'troubleshooting', label: 'Troubleshooting' },
  { id: 'faq', label: 'FAQ' },
];

const CONTROLS: ReadonlyArray<[string, string]> = [
  [
    'Length & thickness',
    'Size of each arm. Asymmetric mode sets each arm individually, and every arm can be enabled or disabled on its own.',
  ],
  ['Gap', 'Distance from the centre point to the inner end of each arm.'],
  [
    'Rotation & scale',
    'Rotate the whole reticle clockwise in degrees, or scale it uniformly.',
  ],
  [
    'Outline',
    'A contrast outline drawn behind each element (thickness 1–6) and an inner outline drawn inside it, each with its own colour.',
  ],
  [
    'Colour',
    'Named swatches and a manual picker, with contrast verdicts against the target backdrop so a low-visibility colour is flagged as you choose it.',
  ],
  ['Centre dot', 'Optional, square or circular, with its own size and colour.'],
  ['Spread ring', 'A circle around the reticle with adjustable radius and thickness.'],
  ['Glow', 'An optional bloom behind the reticle (blur 1–20).'],
  ['Offset', 'Move the reticle away from the exact centre of the overlay.'],
];

const SLOT_DEFAULTS: ReadonlyArray<[string, string]> = [
  ['Shotgun', '1'],
  ['Rifle', '2'],
  ['SMG', '3'],
  ['Sniper', '4'],
  ['Utility', '5'],
];

const FAQ: ReadonlyArray<{ q: string; a: string }> = [
  {
    q: 'Does crshhx modify games or read their memory?',
    a: 'No. It draws its own overlay window and observes keyboard and mouse input passively. It does not inject into, patch or read any game process.',
  },
  {
    q: 'Is it safe with anti-cheat systems?',
    a: 'That cannot be guaranteed by this project. crshhx does not touch game processes and consumes no input, but whether a given anti-cheat accepts any third-party overlay or input observer is the vendor’s decision and can change at any time. Check the rules of each game you play.',
  },
  {
    q: 'Does it work with every game?',
    a: 'Compatibility cannot be promised for every title. Games that use exclusive fullscreen, that block topmost windows or that intercept input themselves can behave differently, and none of those cases has been validated on shipped Windows hardware.',
  },
  {
    q: 'Do I need an internet connection?',
    a: 'Only to download the application. After that it runs entirely offline: fonts and assets are bundled and nothing is synced.',
  },
  {
    q: 'Does it work with a controller?',
    a: 'No. Slot switching responds to keyboard and mouse input; gamepad support is not implemented.',
  },
  {
    q: 'Will my library survive an update?',
    a: 'Yes. Data lives outside the install directory, and the migration path confirms a copy before it records itself as complete. A migration that cannot be confirmed is retried on the next launch.',
  },
];

export function DocsPage() {
  return (
    <>
      <section
        className="band world-studio"
        style={{ paddingBlock: 'clamp(56px,7vw,104px) var(--space-7)' }}
      >
        <div className="container">
          <span className="eyebrow">Documentation</span>
          <h1>How crshhx works.</h1>
          <p className="section-lead" style={{ maxWidth: '64ch' }}>
            Everything below describes the application as it is built in this repository. Where
            behaviour could not be confirmed on shipped Windows hardware it is labelled as such
            rather than presented as fact.
          </p>
        </div>
      </section>

      <section className="band world-studio" style={{ paddingTop: 0 }}>
        <div className="container docs-layout">
          <nav className="toc" aria-label="Documentation sections">
            {TOC.map((item) => (
              <a key={item.id} href={`#${item.id}`}>
                {item.label}
              </a>
            ))}
          </nav>

          <div>
            <article className="doc-section" id="getting-started">
              <h2>Getting started</h2>
              <p>
                crshhx is a crosshair overlay for Windows with an editor behind it. Launching it
                starts two windows: the overlay, which draws only your reticle and sits above
                your games, and the studio, where you design, organise and switch crosshairs.
              </p>
              <p>
                On first launch a small set of built-in presets is seeded so the studio opens
                with something usable. From there the workflow is: design in the editor, save to
                the library, then either select the crosshair in the overlay or assign it to a
                weapon slot.
              </p>
              <ul>
                <li>
                  <strong>No account.</strong> There is nothing to sign into and no server to
                  talk to.
                </li>
                <li>
                  <strong>No telemetry.</strong> The application does not report usage, crashes
                  or identifiers anywhere.
                </li>
                <li>
                  <strong>Offline.</strong> Fonts and assets are bundled with the application, so
                  everything keeps working with no network connection.
                </li>
              </ul>
            </article>

            <article className="doc-section" id="installation">
              <h2>Installation</h2>
              {installer?.url ? (
                <Callout tone="info" title={`Version ${latestEntry?.version} is published`}>
                  <p>
                    Download it from the <Link to="/download">download page</Link> — the button
                    saves the installer executable directly. The build is not code-signed, so
                    Windows SmartScreen may warn on first run: choose “More info”, then “Run
                    anyway”. Your library lives in your roaming application-data directory, so
                    updating or uninstalling never deletes it.
                  </p>
                </Callout>
              ) : (
                <Callout tone="warn" title="Status">
                  <p>
                    No verified Windows build has been published yet, so there is nothing to
                    install at this moment. The <Link to="/download">download page</Link> is the
                    source of truth for availability and will show a version, date, size and
                    SHA-256 once the release pipeline has produced and verified artifacts.
                  </p>
                </Callout>
              )}
              <h3>Installer build</h3>
              <p>
                A one-click NSIS setup: double-click the downloaded file and it installs with no
                prompts, creating desktop and Start menu shortcuts. Your library is written to
                your roaming application-data directory rather than the install directory, so
                reinstalling, moving or upgrading the application never disturbs your data.
                Uninstalling removes the application and leaves your data behind.
              </p>
              <h3>Portable build</h3>
              <p>
                A single executable that can live anywhere, including removable storage. It uses
                the same roaming data directory as the installer build, so the two distributions
                share one library.
              </p>
              <h3>Upgrading</h3>
              <p>
                Saved data is migrated before any window is created. Migration is recorded as
                complete only when it either copies your data successfully or confirms there was
                nothing to copy; a probe that times out or errors is left unmarked so it is
                retried on the next launch. Existing settings, presets and slot profiles carry
                across an upgrade.
              </p>
            </article>

            <article className="doc-section" id="editor">
              <h2>Creating a crosshair</h2>
              <p>
                The editor works directly on the overlay's own configuration, so what you see is
                what gets drawn. A crosshair has a shape — cross, dot, circle or T-shape — and a set
                of parameters for that shape.
              </p>
              <div
                className="table-scroll"
                tabIndex={0}
                role="region"
                aria-label="Editor controls and what each one does, scrollable"
              >
                <table className="table">
                  <thead>
                    <tr>
                      <th>Control</th>
                      <th>What it does</th>
                    </tr>
                  </thead>
                  <tbody>
                    {CONTROLS.map(([control, detail]) => (
                      <tr key={control}>
                        <td>{control}</td>
                        <td>{detail}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p>
                Changes are tracked in an undo history that coalesces continuous adjustments, so
                dragging a slider is one undo step rather than dozens. The compare panel holds a
                snapshot and diffs it against your working copy parameter by parameter.
              </p>
            </article>

            <article className="doc-section" id="presets">
              <h2>Managing presets</h2>
              <p>
                The library holds the built-in vault plus everything you save. Each preset
                carries a name, an optional game tag, an optional description and its full
                crosshair configuration.
              </p>
              <ul>
                <li>
                  <strong>Folders and favourites.</strong> Stored in a sidecar keyed by preset
                  identifier, so organising a built-in never modifies the built-in itself.
                </li>
                <li>
                  <strong>Search and sort.</strong> Filter by name, game, recency or favourite
                  status; counts stay correct as the library changes.
                </li>
                <li>
                  <strong>Protected built-ins.</strong> Shipped presets cannot be overwritten or
                  deleted through the editor or through an import.
                </li>
                <li>
                  <strong>One favourites store.</strong> Starring a crosshair anywhere stars it
                  everywhere; a legacy key from an earlier build is migrated on first read.
                </li>
              </ul>
            </article>

            <article className="doc-section" id="import-export">
              <h2>Import and export</h2>
              <p>
                Export writes a versioned transfer file containing your presets as they are.
                Import never applies anything before you have seen the plan: the preview lists
                every entry, marks conflicts with presets you already have, and reports any value
                that had to be repaired to fall inside its allowed range.
              </p>
              <ul>
                <li>
                  <strong>Per-entry decisions.</strong> For a conflicting entry you choose keep
                  mine, replace mine or skip. Replace is never the default.
                </li>
                <li>
                  <strong>A gate for large imports.</strong> Bringing in more than 25 crosshairs
                  requires an explicit acknowledgement first.
                </li>
                <li>
                  <strong>Shared files.</strong> A file from another person is imported through
                  the same preview with the same rules; there is no cloud or account involved.
                </li>
              </ul>
            </article>

            <article className="doc-section" id="profiles">
              <h2>Game profiles</h2>
              <p>
                Every crosshair can be tagged for Valorant, CS2, Fortnite, Apex or marked
                universal. Profiles group those tags and can switch automatically when their game
                comes to the foreground.
              </p>
              <ul>
                <li>
                  <strong>Automatic switching is optional.</strong> With it disabled, no process
                  polling runs at all.
                </li>
                <li>
                  <strong>Restricted profiles fail closed.</strong> A profile set to switch only
                  while a matched process is in front stops switching if process tracking becomes
                  unavailable, rather than activating in the wrong game.
                </li>
                <li>
                  <strong>Manual selection wins.</strong> Choosing a profile by hand overrides
                  auto-selection until the foreground game changes again.
                </li>
              </ul>
              <p>
                Automatic switching matches on the foreground process name, so a game renamed or
                launched through an unusual wrapper may not match.
              </p>
            </article>

            <article className="doc-section" id="weapon-slots">
              <h2>Weapon-slot switching</h2>
              <p>
                Assign a crosshair to each slot and record the key that selects that weapon. The
                defaults are:
              </p>
              <div
                className="table-scroll"
                tabIndex={0}
                role="region"
                aria-label="Weapon-slot default keys, scrollable"
              >
                <table className="table">
                  <thead>
                    <tr>
                      <th>Slot</th>
                      <th>Key</th>
                    </tr>
                  </thead>
                  <tbody>
                    {SLOT_DEFAULTS.map(([slot, key]) => (
                      <tr key={slot}>
                        <td>{slot}</td>
                        <td>
                          <span className="kbd">{key}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p>
                Every binding is rebindable and can use modifiers. Input is observed passively:
                crshhx watches for the recorded key and lets the event continue to the game, so
                your controls behave exactly as they would with crshhx closed.
              </p>
              <ul>
                <li>
                  <strong>Conflicts are refused.</strong> Assigning a key another slot already
                  uses is rejected, and the interface names the conflicting slot.
                </li>
                <li>
                  <strong>Typing-critical keys.</strong> Keys that would disrupt typing while the
                  studio has focus are handled by an explicit policy rather than by chance.
                </li>
                <li>
                  <strong>Visible degradation.</strong> If the passive hook cannot start, the
                  Weapon Slots page says so and explains the fallback transport, which requires a
                  modifier in front of a single-digit key.
                </li>
              </ul>
              <Callout tone="warn" title="Unverified on Windows hardware">
                <p>
                  The passive hook path and its exact key codes are not yet validated on a
                  shipped Windows build, and the overlay has not been observed inside a running
                  game. Both are first-build verification items and are tracked as such.
                </p>
              </Callout>
            </article>

            <article className="doc-section" id="troubleshooting">
              <h2>Troubleshooting</h2>
              <ul>
                <li>
                  <strong>The overlay is not visible.</strong> Press <span className="kbd">F10</span>{' '}
                  to toggle it, then check the monitor selection and offset in the studio. In
                  games using exclusive fullscreen, switch the game to borderless or windowed
                  fullscreen.
                </li>
                <li>
                  <strong>Slot keys do nothing.</strong> Open Weapon Slots and read the transport
                  banner. If the passive hook did not start, the fallback transport needs a
                  modifier with single-digit keys.
                </li>
                <li>
                  <strong>A profile did not switch automatically.</strong> Confirm automatic
                  switching is enabled, and that the profile is not restricted or that the game's
                  process name matches it.
                </li>
                <li>
                  <strong>An import did not apply what you expected.</strong> Re-open the preview:
                  conflicts default to keeping your version, and large imports require an
                  explicit acknowledgement.
                </li>
                <li>
                  <strong>Your data after an upgrade.</strong> Settings live in your roaming
                  application-data directory and are migrated before any window opens; a
                  migration that cannot be confirmed is retried on the next launch.
                </li>
              </ul>
            </article>

            <article className="doc-section" id="faq">
              <h2>FAQ</h2>
              {FAQ.map((item) => (
                <details className="faq" key={item.q}>
                  <summary>{item.q}</summary>
                  <div className="faq-body">{item.a}</div>
                </details>
              ))}
            </article>

            <div className="doc-related">
              <h2 className="doc-related-title">Elsewhere on this site</h2>
              <Link to="/pro-crosshairs">Pro Crosshairs — the 42 curated designs</Link>
              <Link to="/academy">Crosshair Academy — the 10 tutorials</Link>
              <Link to="/features">Features — every area, with rendered visuals</Link>
              <Link to="/changelog">Changelog — what each release changed</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
