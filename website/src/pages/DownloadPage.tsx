import { Link } from 'react-router-dom';
import { Callout, SectionHead } from '../components/Blocks';
import { Reveal } from '../components/Reveal';
import { IconArrow, IconDownload, IconFolders } from '../components/icons';

/**
 * The download system reads from `src/releases.json`. Until a verified Windows
 * build exists, `latest` is null and this page renders the Coming Soon state:
 * no link, no fabricated size, no invented date. Populating the manifest is the
 * only change needed to switch the page to live downloads.
 */
export function DownloadPage() {
  return (
    <>
      <section className="section" style={{ paddingTop: 'clamp(56px, 7vw, 96px)' }}>
        <div className="container">
          <SectionHead
            level={1}
            eyebrow="Download"
            title="crshhx for Windows"
            lead="Two distributions will be offered: a guided NSIS installer and a single portable executable. Both store your library in your roaming profile, so moving or updating the application never touches your crosshairs."
          />
          <Callout tone="warn" title="No verified build has been published yet">
            <p>
              The application is complete and covered by automated tests, but the Windows
              executables have not been produced and verified. This page therefore shows no
              download links and no file sizes — inventing either would be worse than waiting.
              When the release pipeline publishes its first artifacts, this page will list the
              version, release date, byte size and SHA-256 of each file, taken from the same
              manifest the build prints.
            </p>
          </Callout>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <h2 className="section-title" style={{ marginBottom: 32 }}>
            Distributions
          </h2>
          <div className="dl-grid">
            <Reveal as="div">
              <article className="dl-card" style={{ height: '100%' }}>
                <div className="dl-card-head">
                  <h3 className="dl-card-title">Installer</h3>
                  <span className="pill pending">coming soon</span>
                </div>
                <p className="dim" style={{ fontSize: '0.9375rem' }}>
                  A guided NSIS setup. You choose the install directory; your data is kept
                  outside it, and uninstalling never deletes your library.
                </p>
                <dl className="dl-meta">
                  <dt>Version</dt>
                  <dd>—</dd>
                  <dt>Released</dt>
                  <dd>—</dd>
                  <dt>Size</dt>
                  <dd>—</dd>
                  <dt>SHA-256</dt>
                  <dd>—</dd>
                </dl>
                <button type="button" className="btn btn-primary" disabled aria-disabled="true">
                  <IconDownload />
                  Download installer
                </button>
                <p className="dl-note">
                  The button activates when a verified <code>.exe</code> exists to point at.
                </p>
              </article>
            </Reveal>

            <Reveal as="div">
              <article className="dl-card" style={{ height: '100%' }}>
                <div className="dl-card-head">
                  <h3 className="dl-card-title">Portable</h3>
                  <span className="pill pending">coming soon</span>
                </div>
                <p className="dim" style={{ fontSize: '0.9375rem' }}>
                  One self-contained executable. Keep it on a drive or a USB stick; your
                  library still lives in your roaming profile and follows you between folders.
                </p>
                <dl className="dl-meta">
                  <dt>Version</dt>
                  <dd>—</dd>
                  <dt>Released</dt>
                  <dd>—</dd>
                  <dt>Size</dt>
                  <dd>—</dd>
                  <dt>SHA-256</dt>
                  <dd>—</dd>
                </dl>
                <button type="button" className="btn btn-secondary" disabled aria-disabled="true">
                  <IconDownload />
                  Download portable
                </button>
                <p className="dl-note">
                  Signed builds are a separate decision and are not part of the first release.
                </p>
              </article>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <h2 className="section-title" style={{ marginBottom: 32 }}>
            System requirements
          </h2>
          <table className="table">
            <thead>
              <tr>
                <th>Component</th>
                <th>Requirement</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Operating system</td>
                <td>Windows 10 or Windows 11</td>
                <td>64-bit editions; the published targets are x64.</td>
              </tr>
              <tr>
                <td>Application payload</td>
                <td>≈1.3 MB measured</td>
                <td>
                  Renderer, main process and native input hook. The Electron runtime is added
                  by the installer; its size is published with the first build rather than
                  guessed here.
                </td>
              </tr>
              <tr>
                <td>User data</td>
                <td>Roaming application-data directory</td>
                <td>
                  Presets, folders, settings and slot profiles. Kept on uninstall and on
                  update.
                </td>
              </tr>
              <tr>
                <td>Network</td>
                <td>Not required</td>
                <td>Fonts and assets are bundled. No account, no telemetry, no cloud sync.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="section">
        <div className="container" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 48 }}>
          <div>
            <h2 className="section-title" style={{ marginBottom: 32 }}>
              Installing
            </h2>
            <div className="dl-steps">
              <div className="dl-step">
                <span className="dl-step-num">1</span>
                <div>
                  <h3>Installer</h3>
                  <p>
                    Run the setup executable, choose a directory, and launch crshhx from the
                    Start menu shortcut it creates.
                  </p>
                </div>
              </div>
              <div className="dl-step">
                <span className="dl-step-num">2</span>
                <div>
                  <h3>Portable</h3>
                  <p>
                    Place the executable anywhere you like and run it. No registry entries, no
                    install directory.
                  </p>
                </div>
              </div>
              <div className="dl-step">
                <span className="dl-step-num">3</span>
                <div>
                  <h3>First launch</h3>
                  <p>
                    The overlay appears centred on your primary monitor and the studio opens
                    beside it. If an older installation exists, its saved data is carried over
                    before any window is created.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div>
            <h2 className="section-title" style={{ marginBottom: 32 }}>
              If something is wrong
            </h2>
            <div className="dl-steps">
              <div className="dl-step">
                <span className="dl-step-num">?</span>
                <div>
                  <h3>The overlay is not visible</h3>
                  <p>
                    Press F10 to toggle it, and check the monitor selection in the studio. In
                    games that use exclusive fullscreen, switch the game to borderless or
                    windowed fullscreen.
                  </p>
                </div>
              </div>
              <div className="dl-step">
                <span className="dl-step-num">?</span>
                <div>
                  <h3>Slot keys do not switch</h3>
                  <p>
                    Look at the transport banner in the Weapon Slots page. If the passive hook
                    could not start, crshhx names the reason and explains the fallback
                    transport, which requires a modifier with single-digit keys.
                  </p>
                </div>
              </div>
              <div className="dl-step">
                <span className="dl-step-num">?</span>
                <div>
                  <h3>Everything else</h3>
                  <p>
                    The documentation has a troubleshooting section and a list of frequently
                    asked questions, and the repository accepts issue reports.
                  </p>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 24 }}>
              <Link className="btn btn-secondary btn-sm" to="/docs#troubleshooting">
                Troubleshooting
                <IconArrow />
              </Link>
              <Link className="btn btn-secondary btn-sm" to="/changelog">
                Release notes
                <IconFolders />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
