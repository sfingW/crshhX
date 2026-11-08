import { Link } from 'react-router-dom';
import { Callout, SectionHead } from '../components/Blocks';
import type { ReleaseEntry, ReleaseManifest } from '../site';
import data from '../releases.json';

const manifest = data as unknown as ReleaseManifest;

const GROUPS: ReadonlyArray<{ key: 'added' | 'improved' | 'fixed'; label: string }> = [
  { key: 'added', label: 'Added' },
  { key: 'improved', label: 'Improved' },
  { key: 'fixed', label: 'Fixed' },
];

function Entry({ entry }: { entry: ReleaseEntry }) {
  const published = entry.status === 'published';

  return (
    <div className={`tl-entry${published ? '' : ' unpublished'}`}>
      <div className="tl-head">
        <span className="tl-version">v{entry.version}</span>
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
            <h3 className={`tl-group-title${key === 'fixed' ? ' fixes' : ''}`}>{label}</h3>
            <ul className="tl-list">
              {lines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
        );
      })}

      {entry.artifacts && entry.artifacts.length > 0 ? (
        <div className="chips" style={{ marginTop: 24 }}>
          {entry.artifacts.map((artifact) => (
            <span key={artifact.file} className="chip">
              {artifact.file}
              {typeof artifact.size === 'number' ? ` · ${(artifact.size / 1048576).toFixed(1)} MB` : ''}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function ChangelogPage() {
  const { published, development } = manifest;
  const unpublished = published.length === 0;

  return (
    <>
      <section className="section" style={{ paddingTop: 'clamp(56px, 7vw, 96px)' }}>
        <div className="container">
          <SectionHead
            level={1}
            eyebrow="Changelog"
            title="Release history"
            lead="This page is rendered from a release manifest in the repository, so it can only describe releases that exist. An entry is either published, with a download behind it, or labelled as a development note."
          />
          {unpublished ? (
            <Callout tone="warn" title="No published release yet">
              <p>
                crshhx has not shipped a verified Windows build, so there is no released version
                to list. What follows are development notes for v1.0.0: changes already in the
                codebase and covered by its test suite, not a downloadable product. They are kept
                in their own section rather than presented as a release.
              </p>
            </Callout>
          ) : null}
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container" style={{ maxWidth: 860 }}>
          {published.length > 0 ? (
            <>
              <h2 className="section-title" style={{ marginBottom: 32 }}>
                Published releases
              </h2>
              <div className="tl">
                {published.map((entry) => (
                  <Entry key={`${entry.version}-${entry.date}`} entry={entry} />
                ))}
              </div>
            </>
          ) : null}

          {development.length > 0 ? (
            <>
              <h2 className="section-title" style={{ marginBottom: 32 }}>
                In development
              </h2>
              <div className="tl">
                {development.map((entry) => (
                  <Entry key={`${entry.version}-${entry.date}`} entry={entry} />
                ))}
              </div>
            </>
          ) : null}

          <div style={{ marginTop: 48 }}>
            <Callout title="How this page is maintained">
              <p>
                Entries come from <code>website/src/releases.json</code>. The release workflow
                prints the version, date, byte size and SHA-256 of every artifact it produces;
                that measured output is transcribed into the manifest, which renders here and on
                the <Link to="/download">download page</Link>. Nothing is written in advance, so
                a version cannot appear before it exists, and the build fails if a page links to
                an executable the manifest does not list.
              </p>
            </Callout>
          </div>
        </div>
      </section>
    </>
  );
}
