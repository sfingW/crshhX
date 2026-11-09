import { Link } from 'react-router-dom';
import { Callout } from '../components/Blocks';
import type { ReleaseEntry, ReleaseManifest } from '../site';
import { SITE } from '../site';
import data from '../releases.json';

const manifest = data as unknown as ReleaseManifest;

const GROUPS: ReadonlyArray<{ key: 'added' | 'improved' | 'fixed'; label: string }> = [
  { key: 'added', label: 'Added' },
  { key: 'improved', label: 'Improved' },
  { key: 'fixed', label: 'Fixed' },
];

/**
 * One release. A published entry carries its artifacts as plain text — the
 * download page is the only place that links to an executable, so a changelog
 * can never become a second, stale set of download links.
 */
function Entry({ entry }: { entry: ReleaseEntry }) {
  const published = entry.status === 'published';
  const releaseUrl = published ? `${SITE.repository}/releases/tag/v${entry.version}` : null;

  return (
    <article className={`tl-entry${published ? '' : ' unpublished'}`}>
      <div className="tl-head">
        <h3 className="tl-version">v{entry.version}</h3>
        <time className="tl-date" dateTime={entry.date}>
          {entry.date}
        </time>
        {published ? (
          <span className="pill ok">published</span>
        ) : entry.status === 'unreleased' ? (
          <span className="pill pending">unreleased</span>
        ) : (
          <span className="pill">development note</span>
        )}
      </div>

      {entry.summary ? <p className="tl-summary">{entry.summary}</p> : null}

      {GROUPS.map(({ key, label }) => {
        const lines = entry[key] ?? [];
        if (lines.length === 0) return null;
        return (
          <div key={key}>
            <h4 className={`tl-group-title${key === 'fixed' ? ' fixes' : ''}`}>{label}</h4>
            <ul className="tl-list">
              {lines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
        );
      })}

      {entry.artifacts && entry.artifacts.length > 0 ? (
        <div className="chips">
          {entry.artifacts.map((artifact) => (
            <span key={artifact.file} className="chip">
              {artifact.file}
              {typeof artifact.size === 'number' ? ` · ${(artifact.size / 1048576).toFixed(1)} MB` : ''}
            </span>
          ))}
        </div>
      ) : null}

      {releaseUrl ? (
        <p style={{ marginTop: 'var(--space-4)' }}>
          <a href={releaseUrl} rel="noopener noreferrer" className="mono">
            Release page on GitHub →
          </a>
        </p>
      ) : null}
    </article>
  );
}

export function ChangelogPage() {
  const { published, development } = manifest;
  const nothingPublished = published.length === 0;

  return (
    <>
      <section className="band world-field" style={{ paddingBlock: 'clamp(56px,7vw,104px) var(--space-7)' }}>
        <div className="container">
          <span className="eyebrow">Changelog</span>
          <h1>Release history.</h1>
          <p className="section-lead" style={{ maxWidth: '62ch' }}>
            This page is rendered from a release manifest in the repository, so it can only
            describe releases that exist. An entry is either published, with a download behind
            it, or labelled as a development note.
          </p>
        </div>
      </section>

      {nothingPublished ? (
        <section className="band world-field" style={{ paddingTop: 0 }}>
          <div className="container container-narrow">
            <Callout tone="warn" title="No published release yet">
              <p>
                crshhx has not shipped a verified Windows build, so there is no released version
                to list. What follows are development notes: changes already in the codebase and
                covered by its test suite, not a downloadable product. They are kept in their own
                section rather than presented as a release.
              </p>
            </Callout>
          </div>
        </section>
      ) : null}

      {published.length > 0 ? (
        <section className="band world-studio">
          <div className="container container-narrow">
            <div className="band-head">
              <span className="band-num">Published</span>
              <h2>Published releases</h2>
              <p className="band-lead">
                Each of these has a verified Windows build behind it, with measured sizes and
                SHA-256 checksums on the download page.
              </p>
            </div>
            <div className="tl">
              {published.map((entry) => (
                <Entry key={`${entry.version}-${entry.date}`} entry={entry} />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {development.length > 0 ? (
        <section className="band world-field">
          <div className="container container-narrow">
            <div className="band-head">
              <span className="band-num">Repository</span>
              <h2>In development</h2>
              <p className="band-lead">
                Notes from the repository that are not a downloadable build. They are listed
                separately and labelled, so a version cannot look shipped before it is.
              </p>
            </div>
            <div className="tl">
              {development.map((entry) => (
                <Entry key={`${entry.version}-${entry.date}`} entry={entry} />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section
        className={`band ${development.length > 0 ? 'world-studio' : 'world-field'}`}
        style={{ paddingBlock: 'clamp(48px,6vw,88px)' }}
      >
        <div className="container container-narrow">
          <Callout title="How this page is maintained">
            <p>
              Entries come from <code>website/src/releases.json</code>. The release workflow
              prints the version, date, byte size and SHA-256 of every artifact it produces; that
              measured output is transcribed into the manifest, which renders here and on the{' '}
              <Link to="/download">download page</Link>. Nothing is written in advance, so a
              version cannot appear before it exists, and the build fails if a page links to an
              executable the manifest does not list.
            </p>
          </Callout>
        </div>
      </section>
    </>
  );
}
