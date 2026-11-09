import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Callout, SectionHead } from '../components/Blocks';
import { IconArrow, IconDownload, IconFolders } from '../components/icons';
import type { ReleaseArtifact, ReleaseManifest } from '../site';
import { isDownloadable, latestPublishedEntry, pickArtifact } from '../site';
import data from '../releases.json';

const manifest = data as unknown as ReleaseManifest;

/**
 * The download page reads from `src/releases.json`. While nothing is
 * published it renders the honest Coming Soon state — no links, no sizes, no
 * invented dates. Once the manifest names a release with verified artifacts,
 * the same layout serves direct file links: clicking a button downloads the
 * `.exe` itself, not a page about it and not a zip of something else.
 */

/** Size in MB, measured — never estimated. Empty until the manifest has it. */
function sizeLabel(artifact: ReleaseArtifact | null): string {
  return typeof artifact?.size === 'number' ? `${(artifact.size / 1048576).toFixed(1)} MB` : '';
}

/**
 * The download call to action. A published artifact renders as a real anchor
 * pointing straight at the file (with the `download` attribute, so the click
 * saves it). Anything else renders as a disabled button — never a link to
 * something that does not exist.
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

/**
 * Copy-to-clipboard for the hash. Markup is static (SSR-safe); the clipboard
 * is only touched on click, and a denied or missing API simply does nothing —
 * the hash stays selectable as text either way.
 */
function CopyHashButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="dl-copy"
      aria-label="Copy SHA-256 to clipboard"
      onClick={() => {
        if (!navigator.clipboard?.writeText) return;
        navigator.clipboard
          .writeText(value)
          .then(() => {
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1600);
          })
          .catch(() => undefined);
      }}
    >
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

/**
 * The full SHA-256 lives behind a small disclosure instead of cluttering the
 * panel: expanded on demand, with the exact Windows command that reproduces
 * it. Only rendered when the manifest carries a real hash.
 */
function VerifyDisclosure({ artifact }: { artifact: ReleaseArtifact }) {
  if (!artifact.sha256) return null;
  return (
    <details className="dl-verify">
      <summary>Verify download</summary>
      <div className="dl-verify-body">
        <div className="dl-verify-row">
          <code className="dl-verify-hash">{artifact.sha256}</code>
          <CopyHashButton value={artifact.sha256} />
        </div>
        <p className="dl-verify-hint">
          Check it on Windows: <code>{`certutil -hashfile ${artifact.file} SHA256`}</code>
        </p>
      </div>
    </details>
  );
}

export function DownloadPage() {
  const latestEntry = latestPublishedEntry(manifest);
  const installer = pickArtifact(latestEntry, 'setup');
  const portable = pickArtifact(latestEntry, 'portable');
  const installerLive = isDownloadable(installer);
  const portableLive = isDownloadable(portable);
  const anythingLive = installerLive || portableLive;

  return (
    <>
      {/* Introduction ---------------------------------------------------- */}
      <section className="section" style={{ paddingTop: 'clamp(56px, 7vw, 96px)' }}>
        <div className="container">
          <SectionHead
            level={1}
            eyebrow="Download"
            title="Download crshhx"
            lead="Your crosshair studio for Windows."
          />
          {latestEntry ? (
            <p className="dl-release-strip">
              <span className="dl-release-version">{`v${latestEntry.version}`}</span>
              <span>Windows 10 &amp; 11 · 64-bit</span>
              <span>{`Released ${latestEntry.date}`}</span>
              <span className="pill ok">Latest stable release</span>
            </p>
          ) : null}
          {!anythingLive ? (
            <Callout tone="warn" title="No verified build has been published yet">
              <p>
                The application is complete and covered by automated tests, but the Windows
                executables have not been produced and verified. This page therefore shows no
                download links and no file sizes — inventing either would be worse than
                waiting. When the release pipeline publishes its first artifacts, the buttons
                below turn into direct file links.
              </p>
            </Callout>
          ) : null}
        </div>
      </section>

      {/* Download options ------------------------------------------------ */}
      <section className="section" style={{ paddingTop: anythingLive ? 0 : undefined }}>
        <div className="container">
          <div className="dl-options">
            <article className={`dl-panel${installerLive ? ' recommended' : ''}`}>
              <div className="dl-panel-head">
                <h2 className="dl-panel-title">Windows Installer</h2>
                {installerLive ? (
                  <span className="pill ok">Recommended</span>
                ) : (
                  <span className="pill pending">coming soon</span>
                )}
              </div>
              <p className="dl-panel-desc">
                One-click installation. It adds a Start menu shortcut, and your library is
                kept outside the install folder.
              </p>
              <p className="dl-panel-facts">
                <span>{sizeLabel(installer) || '—'}</span>
                <span>{installerLive && latestEntry ? `Version ${latestEntry.version}` : 'Version —'}</span>
              </p>
              <DownloadButton artifact={installer} label="Download crshhx" primary />
              {installerLive && installer ? <VerifyDisclosure artifact={installer} /> : null}
            </article>

            <article className="dl-panel">
              <div className="dl-panel-head">
                <h2 className="dl-panel-title">Portable Version</h2>
                {portableLive ? (
                  <span className="pill ok">available</span>
                ) : (
                  <span className="pill pending">coming soon</span>
                )}
              </div>
              <p className="dl-panel-desc">
                No installation required. Keep it on a drive or a USB stick; your library
                lives in your roaming profile and follows you.
              </p>
              <p className="dl-panel-facts">
                <span>{sizeLabel(portable) || '—'}</span>
                <span>{portableLive && latestEntry ? `Version ${latestEntry.version}` : 'Version —'}</span>
              </p>
              <DownloadButton artifact={portable} label="Download portable" primary={false} />
              {portableLive && portable ? <VerifyDisclosure artifact={portable} /> : null}
            </article>
          </div>

          <p className="dl-fineprint">
            The application is not code-signed, so Windows SmartScreen may warn on first run:
            choose “More info”, then “Run anyway”. Updating or uninstalling never deletes your
            crosshair library.
          </p>
        </div>
      </section>

      {/* Install guide ---------------------------------------------------- */}
      <section className="section">
        <div className="container">
          <h2 className="section-title" style={{ marginBottom: 32 }}>
            Install in three steps
          </h2>
          <ol className="dl-guide">
            <li className="dl-guide-step">
              <span className="dl-guide-num" aria-hidden="true">1</span>
              <div>
                <h3>Download the installer</h3>
                <p>Save the .exe with the button above.</p>
              </div>
            </li>
            <li className="dl-guide-step">
              <span className="dl-guide-num" aria-hidden="true">2</span>
              <div>
                <h3>Open the downloaded file</h3>
                <p>Double-click it. It installs with no prompts.</p>
              </div>
            </li>
            <li className="dl-guide-step">
              <span className="dl-guide-num" aria-hidden="true">3</span>
              <div>
                <h3>Launch crshhx</h3>
                <p>Open it from the Start menu and create your crosshair.</p>
              </div>
            </li>
          </ol>
        </div>
      </section>

      {/* System requirements ---------------------------------------------- */}
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

      {/* Troubleshooting --------------------------------------------------- */}
      <section className="section">
        <div className="container" style={{ maxWidth: 760 }}>
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
      </section>
    </>
  );
}
