import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Callout } from '../components/Blocks';
import { IconArrow, IconDownload, IconFolders } from '../components/icons';
import type { ReleaseArtifact, ReleaseManifest } from '../site';
import { SITE, isDownloadable, latestPublishedEntry, pickArtifact } from '../site';
import data from '../releases.json';

const manifest = data as unknown as ReleaseManifest;

/**
 * The download page reads from `src/releases.json`. While nothing is published
 * it renders the honest pending state — no links, no sizes, no invented dates.
 * Once the manifest names a release with verified artifacts, the same layout
 * serves direct file links: clicking a button downloads the `.exe` itself, not a
 * page about it and not a zip of something else.
 *
 * This page carries more than a download button on purpose. crshhx ships an
 * unsigned Windows executable, so the visitor has a real decision to make and
 * needs the size, the checksum, the SmartScreen explanation and the requirements
 * at the point of decision, not three pages away.
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
 * Copy-to-clipboard for the hash. Markup is static (SSR-safe); the clipboard is
 * only touched on click, and a denied or missing API simply does nothing — the
 * hash stays selectable as text either way.
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
 * panel: expanded on demand, with the exact Windows command that reproduces it.
 * Only rendered when the manifest carries a real hash.
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

const SECURITY_FACTS: ReadonlyArray<readonly [string, string]> = [
  ['Not code-signed', 'Signing a Windows executable requires a paid certificate and an identity check. crshhx does not have one, so Windows treats the build as unfamiliar software and says so.'],
  ['What SmartScreen shows', 'A blue dialog saying Windows protected your PC, with a “More info” link. Choosing it reveals a “Run anyway” button. Nothing has been blocked permanently and nothing has been changed on your system.'],
  ['How to check the file yourself', 'Every build on this page publishes its SHA-256. Run the certutil command below the hash and compare the output character for character — the same values are printed on the GitHub release.'],
  ['What the application touches', 'It draws its own topmost overlay window and observes keyboard and mouse input passively. It does not inject into, patch or read any game process, and it makes no network requests at runtime.'],
  ['Anti-cheat', 'No overlay tool can be declared safe with every anti-cheat system, and this project does not claim it. Whether a vendor accepts a third-party overlay or input observer is that vendor’s decision and can change at any time.'],
  ['Your data', 'Presets, folders, favourites, profiles and slot bindings live in your roaming application-data directory — outside the install folder, kept on update and kept on uninstall.'],
];

export function DownloadPage() {
  const latestEntry = latestPublishedEntry(manifest);
  const installer = pickArtifact(latestEntry, 'setup');
  const portable = pickArtifact(latestEntry, 'portable');
  const installerLive = isDownloadable(installer);
  const portableLive = isDownloadable(portable);
  const anythingLive = installerLive || portableLive;
  const releaseUrl = latestEntry ? `${SITE.repository}/releases/tag/v${latestEntry.version}` : null;

  return (
    <>
      {/* Introduction ---------------------------------------------------- */}
      <section className="band world-field" style={{ paddingBlock: 'clamp(56px,7vw,104px) var(--space-7)' }}>
        <div className="container">
          <span className="eyebrow">Download</span>
          <h1>Download crshhx</h1>
          <p className="section-lead" style={{ maxWidth: '58ch' }}>
            Your crosshair studio for Windows.
          </p>
          {latestEntry ? (
            <p className="dl-release-strip">
              <span className="dl-release-version">{`v${latestEntry.version}`}</span>
              <span>Windows 10 &amp; 11 · 64-bit</span>
              <span>{`Released ${latestEntry.date}`}</span>
              <span className="pill ok">Latest stable release</span>
            </p>
          ) : null}
          {!anythingLive ? (
            <div style={{ marginTop: 'var(--space-6)' }}>
              <Callout tone="warn" title="No verified build has been published yet">
                <p>
                  The application is complete and covered by automated tests, but the Windows
                  executables have not been produced and verified. This page therefore shows no
                  download links and no file sizes — inventing either would be worse than
                  waiting. When the release pipeline publishes its first artifacts, the buttons
                  below turn into direct file links.
                </p>
              </Callout>
            </div>
          ) : null}
        </div>
      </section>

      {/* Download options: the installer on the field, the portable build in
          the studio — the same split the home page uses, because it is the same
          choice. --------------------------------------------------------- */}
      <section className="band world-field" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="dl-split">
            <article className="dl-panel dl-panel-field world-field">
              <div className="dl-panel-head">
                <h2 className="dl-panel-title">Windows Installer</h2>
                {installerLive ? (
                  <span className="pill ok">Recommended</span>
                ) : (
                  <span className="pill pending">coming soon</span>
                )}
              </div>
              <p className="dl-panel-desc">
                One-click installation. It adds a Start menu shortcut, and your library is kept
                outside the install folder.
              </p>
              <p className="dl-panel-facts">
                <span>{sizeLabel(installer) || '—'}</span>
                <span>{installerLive && latestEntry ? `Version ${latestEntry.version}` : 'Version —'}</span>
              </p>
              <DownloadButton artifact={installer} label="Download crshhx" primary />
              {installer?.file ? <p className="dl-filename">{installer.file}</p> : null}
              {installerLive && installer ? <VerifyDisclosure artifact={installer} /> : null}
            </article>

            <article className="dl-panel dl-panel-studio world-studio">
              <div className="dl-panel-head">
                <h2 className="dl-panel-title">Portable Version</h2>
                {portableLive ? (
                  <span className="pill ok">available</span>
                ) : (
                  <span className="pill pending">coming soon</span>
                )}
              </div>
              <p className="dl-panel-desc">
                No installation required. Keep it on a drive or a USB stick; your library lives
                in your roaming profile and follows you.
              </p>
              <p className="dl-panel-facts">
                <span>{sizeLabel(portable) || '—'}</span>
                <span>{portableLive && latestEntry ? `Version ${latestEntry.version}` : 'Version —'}</span>
              </p>
              <DownloadButton artifact={portable} label="Download portable" primary={false} />
              {portable?.file ? <p className="dl-filename">{portable.file}</p> : null}
              {portableLive && portable ? <VerifyDisclosure artifact={portable} /> : null}
            </article>
          </div>

          {latestEntry?.summary ? (
            <p className="dl-fineprint">
              {latestEntry.summary}{' '}
              {releaseUrl ? (
                <a href={releaseUrl} rel="noopener noreferrer">
                  Full release notes on GitHub
                </a>
              ) : (
                <Link to="/changelog">Full release notes</Link>
              )}
              .
            </p>
          ) : null}
        </div>
      </section>

      {/* Security: the part an unsigned build has to explain properly. ---- */}
      <section className="band world-studio">
        <div className="container">
          <div className="band-head">
            <span className="band-num">Security</span>
            <h2>Windows will warn you. Here is why, and what to do.</h2>
            <p className="band-lead">
              This is not a defect in the build and not something to work around quietly. It is
              what an unsigned executable looks like to Windows, and you are entitled to the
              whole explanation before you run it.
            </p>
          </div>
          <div className="band-split">
            <div className="rulelist">
              {SECURITY_FACTS.map(([term, value]) => (
                <div className="rulelist-row" key={term}>
                  <span className="rulelist-k">{term}</span>
                  <span>{value}</span>
                </div>
              ))}
            </div>
            <div className="band-copy">
              <Callout tone="warn" title="SmartScreen, step by step">
                <p>
                  Double-click the downloaded file. When the blue “Windows protected your PC”
                  dialog appears, choose <strong>More info</strong>, then <strong>Run anyway</strong>.
                  The installer then runs with no prompts.
                </p>
                {anythingLive ? (
                  <p>
                    Prefer to check the file first? Expand <strong>Verify download</strong> on the
                    panel above, copy the SHA-256, and run the <code>certutil</code> command it
                    gives you. The output should match exactly.
                  </p>
                ) : null}
              </Callout>
              <p className="mono faint">
                Both builds are published on the project’s GitHub release page with the same
                sizes and checksums shown here.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Install guide ---------------------------------------------------- */}
      <section className="band world-field">
        <div className="container">
          <div className="band-head">
            <span className="band-num">Install</span>
            <h2>Install in three steps</h2>
          </div>
          <ol className="dl-guide">
            <li className="dl-guide-step">
              <span className="dl-guide-num" aria-hidden="true">01</span>
              <div>
                <h3>Download the installer</h3>
                <p>
                  Save the .exe with the button above. The portable build needs no installation
                  at all — put it in any folder and run it.
                </p>
              </div>
            </li>
            <li className="dl-guide-step">
              <span className="dl-guide-num" aria-hidden="true">02</span>
              <div>
                <h3>Open the downloaded file</h3>
                <p>
                  Double-click it. If SmartScreen appears, choose “More info”, then “Run anyway”.
                  It installs with no prompts and no directory to choose.
                </p>
              </div>
            </li>
            <li className="dl-guide-step">
              <span className="dl-guide-num" aria-hidden="true">03</span>
              <div>
                <h3>Launch crshhx</h3>
                <p>
                  Open it from the Start menu. The Crosshair Academy’s first lesson takes you
                  from there to a reticle on screen.
                </p>
              </div>
            </li>
          </ol>
          <div style={{ marginTop: 'var(--space-6)' }}>
            <Link className="btn btn-secondary btn-sm" to="/academy">
              Open the getting-started lesson
              <IconArrow />
            </Link>
          </div>
        </div>
      </section>

      {/* System requirements ---------------------------------------------- */}
      <section className="band world-studio">
        <div className="container">
          <div className="band-head">
            <span className="band-num">Requirements</span>
            <h2>System requirements</h2>
          </div>
          <div
            className="table-scroll"
            tabIndex={0}
            role="region"
            aria-label="System requirements, scrollable"
          >
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Component</th>
                  <th scope="col">Requirement</th>
                  <th scope="col">Notes</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Operating system</td>
                  <td>Windows 10 or Windows 11</td>
                  <td>64-bit editions; the published targets are x64.</td>
                </tr>
                <tr>
                  <td>Installer size</td>
                  <td className="num">{sizeLabel(installer) || 'Not published'}</td>
                  <td>Measured from the published artifact, not estimated.</td>
                </tr>
                <tr>
                  <td>Portable size</td>
                  <td className="num">{sizeLabel(portable) || 'Not published'}</td>
                  <td>No installation; runs from any folder or removable drive.</td>
                </tr>
                <tr>
                  <td>Application payload</td>
                  <td className="num">≈1.3 MB</td>
                  <td>
                    Renderer, main process and native input hook. The Electron runtime accounts for
                    the rest of the published file size.
                  </td>
                </tr>
                <tr>
                  <td>Integrity check</td>
                  <td>SHA-256 published per file</td>
                  <td>
                    Verify with <code>certutil -hashfile &lt;file&gt; SHA256</code> behind each
                    panel above.
                  </td>
                </tr>
                <tr>
                  <td>User data</td>
                  <td>Roaming application-data directory</td>
                  <td>Presets, folders, settings and slot profiles. Kept on uninstall and on update.</td>
                </tr>
                <tr>
                  <td>Network</td>
                  <td>Not required</td>
                  <td>Fonts and assets are bundled. No account, no telemetry, no cloud sync.</td>
                </tr>
                <tr>
                  <td>Code signing</td>
                  <td>None</td>
                  <td>Expect the SmartScreen warning described above on first run.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Troubleshooting --------------------------------------------------- */}
      <section className="band world-field">
        <div className="container container-narrow">
          <div className="band-head">
            <span className="band-num">Troubleshooting</span>
            <h2>If something is wrong</h2>
            <p className="band-lead">
              The three problems people actually meet first, and the shortest path through each.
            </p>
          </div>
          <div className="dl-steps">
            <div className="dl-step">
              <span className="dl-step-num">01</span>
              <div>
                <h3>The overlay is not visible</h3>
                <p>
                  Press F10 to toggle it, and check the target monitor in 4:3 &amp; Position. In
                  games that use exclusive fullscreen, switch the game to borderless or windowed
                  fullscreen.
                </p>
              </div>
            </div>
            <div className="dl-step">
              <span className="dl-step-num">02</span>
              <div>
                <h3>Slot keys do not switch</h3>
                <p>
                  Look at the transport banner in Weapon Slots. If the passive hook could not
                  start, crshhx names the reason and explains the fallback transport, which
                  requires a modifier with single-digit keys.
                </p>
              </div>
            </div>
            <div className="dl-step">
              <span className="dl-step-num">03</span>
              <div>
                <h3>The window closed and nothing happened</h3>
                <p>
                  Closing the window hides crshhx to the system tray by default, and the overlay
                  keeps running. Quitting is explicit, from the tray menu.
                </p>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 'var(--space-6)' }}>
            <Link className="btn btn-secondary btn-sm" to="/docs#troubleshooting">
              Full Troubleshooting guide
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
