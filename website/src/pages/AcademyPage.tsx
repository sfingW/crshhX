import { Link } from 'react-router-dom';
import { Reveal } from '../components/Reveal';
import { AcademyMock } from '../components/ProductMock';
import { IconArrow, IconDownload } from '../components/icons';
import { CATALOGUE } from '../catalogue';
import type { ReleaseManifest } from '../site';
import { latestPublishedEntry, pickArtifact } from '../site';
import data from '../releases.json';

const manifest = data as unknown as ReleaseManifest;
const installer = pickArtifact(latestPublishedEntry(manifest), 'setup');

const TUTORIALS = CATALOGUE.academy.tutorials;
const TOTAL_STEPS = TUTORIALS.reduce((total, tutorial) => total + tutorial.steps.length, 0);

/**
 * The visual kinds the Academy renders, described the way the application's own
 * content module describes them. A lesson's chips are the kinds it actually
 * uses, read from the generated catalogue.
 */
const VISUAL_LABELS: Record<string, string> = {
  anatomy: 'numbered anatomy diagram',
  colours: 'colour visibility scores, source named',
  monitors: 'monitor arrangement diagram',
  'overlay-stack': 'game window with the overlay above it',
  live: 'live, editable reticle',
  compare: 'two real designs side by side',
  clickmap: 'labelled click map',
};

const PRINCIPLES = [
  {
    title: 'Demos are the real renderer',
    body: 'A live demo in the Academy is the same reticle renderer the overlay uses, editing a real crosshair configuration. It is not a picture of a result and not an animation of an idea.',
  },
  {
    title: 'Illustrations say so',
    body: 'Where the Academy draws a diagram or a click map, it is captioned “Illustration — not a screenshot”. Nothing in it is presented as the application’s own interface when it is not.',
  },
  {
    title: 'Claims are sourced or dropped',
    body: 'The Academy makes no claim about a game or a player that the project’s own research notes cannot support. Where public sources disagree, the design is labelled as inspired rather than attributed.',
  },
  {
    title: 'Completion is tracked locally',
    body: 'Which lessons you have finished is stored with the rest of your data, in your roaming application-data directory. It is not reported anywhere, because nothing is.',
  },
] as const;

export function AcademyPage() {
  return (
    <>
      <section className="band world-studio" style={{ paddingBlock: 'clamp(56px,7vw,104px)' }}>
        <div className="container">
          <span className="eyebrow">Learn · built into the application</span>
          <h1>Crosshair Academy.</h1>
          <p className="section-lead" style={{ maxWidth: '62ch' }}>
            {CATALOGUE.academy.total} tutorials, {TOTAL_STEPS} steps between them, running
            inside crshhx. Each step does one thing, the language is plain, and the visuals are
            either the application’s own renderer or an illustration that says it is one.
          </p>
          <div className="rail" style={{ marginTop: 'var(--space-7)' }}>
            <div className="rail-item">
              <span className="rail-v">{CATALOGUE.academy.total}</span>
              <span className="rail-k">tutorials</span>
            </div>
            <div className="rail-item">
              <span className="rail-v">{TOTAL_STEPS}</span>
              <span className="rail-k">steps</span>
            </div>
            <div className="rail-item">
              <span className="rail-v">1</span>
              <span className="rail-k">thing per step</span>
            </div>
            <div className="rail-item">
              <span className="rail-v">0</span>
              <span className="rail-k">data leaves your machine</span>
            </div>
          </div>
        </div>
      </section>

      <section className="band world-studio" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="band-head">
            <span className="band-num">Curriculum</span>
            <h2>In the order the application teaches it.</h2>
            <p className="band-lead">
              Open any lesson to see its steps. This is the curriculum as shipped — the titles
              and the order are the application’s own, not a summary written for this page.
            </p>
          </div>

          <div className="curriculum">
            {TUTORIALS.map((tutorial, index) => {
              const visuals = [...new Set(tutorial.visuals)];
              return (
                <details className="lesson" key={tutorial.id}>
                  <summary>
                    <span className="lesson-num">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span>
                      <span className="lesson-title">{tutorial.title}</span>
                      <span className="lesson-intro">{tutorial.intro}</span>
                    </span>
                    <span className="lesson-meta">
                      {tutorial.steps.length} steps
                      {visuals.length > 0 ? ` · ${visuals.length} visual${visuals.length > 1 ? 's' : ''}` : ''}
                    </span>
                  </summary>
                  <div className="lesson-body">
                    <ol className="lesson-steps">
                      {tutorial.steps.map((step, stepIndex) => (
                        <li key={step}>
                          <span>{String(stepIndex + 1).padStart(2, '0')}</span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ol>
                    {visuals.length > 0 ? (
                      <div className="lesson-visuals">
                        {visuals.map((kind) => (
                          <span className="pill" key={kind}>
                            {VISUAL_LABELS[kind] ?? kind}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </details>
              );
            })}
          </div>
        </div>
      </section>

      <section className="band world-field">
        <div className="container">
          <div className="band-head">
            <span className="band-num">How it is built</span>
            <h2>The visuals are the product, or they say they are not.</h2>
            <p className="band-lead">
              A tutorial that shows you a fake interface teaches you the wrong clicks. These are
              the rules the Academy’s content is written under.
            </p>
          </div>
          <div className="band-split">
            <div className="band-cols" style={{ gridTemplateColumns: '1fr' }}>
              {PRINCIPLES.map((item) => (
                <div className="band-col" key={item.title}>
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                </div>
              ))}
            </div>
            <Reveal>
              <AcademyMock />
            </Reveal>
          </div>
        </div>
      </section>

      <section className="band world-field" style={{ paddingBlock: 'clamp(48px,6vw,88px)' }}>
        <div className="container container-narrow">
          <div className="band-head" style={{ marginBottom: 'var(--space-5)' }}>
            <h2>Start with the first lesson.</h2>
            <p className="band-lead">
              The Academy opens inside crshhx, under Learn. “Getting started with crshhx” takes
              you from install to a crosshair on screen; “Fixing common problems” is the last
              lesson and the shortest path back to a working overlay.
            </p>
          </div>
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
            <Link className="btn btn-secondary btn-lg" to="/docs">
              Read the documentation
              <IconArrow />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
