import { Link } from 'react-router-dom';
import { Callout, SectionHead } from '../components/Blocks';
import { Reveal } from '../components/Reveal';
import { IconArrow, IconDownload, IconFolders } from '../components/icons';
import type { ReleaseArtifact, ReleaseEntry, ReleaseManifest } from '../site';
import data from '../releases.json';

const manifest = data as unknown as ReleaseManifest;

/**
 * The download system reads from `src/releases.json`. Until a verified Windows
 * build exists, `latest` is null and this page renders the Coming Soon state:
 * no link, no fabricated size, no invented date. The moment the manifest names
 * a published release with real artifacts, the same cards turn into direct
 * file links — clicking the button downloads the `.exe` itself, not a page
 * about it and not a zip of something else.
 */

/** Finds the artifact for one distribution by the shape of its filename. */
function pickArtifact(
  entry: ReleaseEntry | undefined,
  kind: 'setup' | 'portable',
): ReleaseArtifact | null {
  if (!entry) return null;
  const pattern = kind === 'setup' ? /setup/i : /portable/i;
  return entry.artifacts?.find((artifact) => pattern.test(artifact.file)) ?? null;
}

/** True only when the file itself is published and verified with a URL. */
function isDownloadable(artifact: ReleaseArtifact | null): boolean {
  return Boolean(artifact?.url);
}

/**
 * The download call to action. A published artifact renders as a real anchor
 * pointing straight at the file (with the `download` attribute, so the click
 * saves it). Anything else renders as the disabled button the page has always
 * shown — never a link to something that does not exist.
 */
function DownloadButton({
  artifact,
  label,
  primary,
}: {
  artifact: ReleaseArtifact | null;
  label: string;
  primary: boolean;
}) {
  const className = primary ? 'btn btn-primary' : 'btn btn-secondary';
  if (artifact?.url) {
    return (
      <a className={className} href={artifact.url} download={artifact.file} rel="noopener">
        <IconDownload />
        {label}
      </a>
    );
  }
  return (
    <button type="button" className={className} disabled aria-disabled="true">
      <IconDownload />
      {label}
    </button>
  );
}

/** Version / date / size / hash rows — dashes until real measurements exist. */
function MetaList({
  entry,
  artifact,
}: {
  entry: ReleaseEntry | undefined;
  artifact: ReleaseArtifact | null;
}) {
  const live = isDownloadable(artifact);
  return (
    <dl className="dl-meta">
      <dt>Version</dt>
      <dd>{live && entry ? entry.version : '—'}</dd>
      <dt>Released</dt>
      <dd>{live && entry ? entry.date : '—'}</dd>
      <dt>Size</dt>
      <dd>
        {live && typeof artifact?.size === 'number'
          ? `${(artifact.size / 1048576).toFixed(1)} MB`
          : '—'}
      </dd>
      <dt>SHA-256</dt>
      <dd>{live && artifact?.sha256 ? artifact.sha256 : '—'}</dd>
    </dl>
  );
}

export function DownloadPage() {
  const latestEntry = manifest.latest
    ? manifest.published.find((entry) => entry.version === manifest.latest)
    : undefined;
  const installer = pickArtifact(latestEntry, 'setup');
  const portable = pickArtifact(latestEntry, 'portable');
  const anythingLive = isDownloadable(installer) || isDownloadable(portable);

  return (
    <>
      <section className="section" style={{ paddingTop: 'clamp(56px, 7vw, 96px)' }}>
        <div className="container">
          <SectionHead
            level={1}
            eyebrow="Download"
            title="crshhx for Windows"
            lead="Two distributions: a one-click installer and a single portable executable. Both store your library in your roaming profile, so moving or updating the application never touches your crosshairs."
          />
          {anythingLive ? (
            <Callout tone="info" title="Installing takes one double-click">
              <p>
                Download the installer, run it, and crshhx installs like any other app — no
                questions, no folders to choose. Your crosshair library is stored outside the
                install folder, so updating or uninstalling never deletes it.
              </p>
            </Callout>
          ) : (
            <Callout tone="warn" title="No verified build has been published yet">
              <p>
                The application is complete and covered by automated tests, but the Windows
                executables have not been produced and verified. This page therefore shows no
                download links and no file sizes — inventing either would be worse than waiting.
                When the release pipeline publishes its first artifacts, the buttons below turn
                into direct file links and list the version, release date, byte size and SHA-256
                of each file, taken from the same manifest the build prints.
              </p>
            </Callout>
          )}
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
                  {isDownloadable(installer) ? (
                    <span className="pill ok">available</span>
                  ) : (
                    <span className="pill pending">coming soon</span>
                  )}
                </div>
                <p className="dim" style={{ fontSize: '0.9375rem' }}>
                  A one-click setup. Download it, double-click it, and it installs with no
                  prompts and adds a Start menu shortcut. Your data is kept outside the install
                  folder, and uninstalling never deletes your library.
                </p>
                <MetaList entry={latestEntry} artifact={installer} />
                <DownloadButton artifact={installer} label="Download installer" primary />
                <p className="dl-note">
                  {isDownloadable(installer)
                    ? 'Clicking the button downloads the .exe file directly.'
                    : 'The button activates when a verified .exe exists to point at.'}
                </p>
              </article>
            </Reveal>

            <Reveal as="div">
              <article className="dl-card" style={{ height: '100%' }}>
                <div className="dl-card-head">
                  <h3 className="dl-card-title">Portable</h3>
                  {isDownloadable(portable) ? (
                    <span className="pill ok">available</span>
                  ) : (
                    <span className="pill pending">coming soon</span>
                  )}
                </div>
                <p className="dim" style={{ fontSize: '0.9375rem' }}>
                  One self-contained executable. Keep it on a drive or a USB stick; your
                  library still lives in your roaming profile and follows you between folders.
                </p>
                <MetaList entry={latestEntry} artifact={portable} />
                <DownloadButton artifact={portable} label="Download portable" primary={false} />
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
                    Double-click the downloaded setup file. It installs with no prompts and
                    creates a Start menu shortcut, then you launch crshhx like any other app.
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
