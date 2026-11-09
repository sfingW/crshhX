import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Reveal } from '../components/Reveal';
import { Callout } from '../components/Blocks';
import { ProBenchMock } from '../components/ProductMock';
import { Reticle } from '../components/Reticle';
import { IconArrow, IconDownload } from '../components/icons';
import { CATALOGUE, categoryLabel } from '../catalogue';
import type { ReleaseManifest } from '../site';
import { latestPublishedEntry, pickArtifact } from '../site';
import data from '../releases.json';

const manifest = data as unknown as ReleaseManifest;
const installer = pickArtifact(latestPublishedEntry(manifest), 'setup');

const ENTRIES = CATALOGUE.pro.entries;
const CATEGORIES = CATALOGUE.pro.categories;
const TIERS = CATALOGUE.pro.tierLabels;

/** How many designs carry each tier label, counted rather than asserted. */
const TIER_COUNTS = (['verified', 'inspired', 'original'] as const).map((tier) => ({
  tier,
  label: TIERS[tier],
  count: ENTRIES.filter((entry) => entry.tier === tier).length,
}));

const BENCH = [
  {
    title: 'Backdrops',
    body: 'Put a design against the scene it has to survive: a precision grid, a bright sky, a dark interior. Visibility is a property of the pairing, not of the colour alone.',
  },
  {
    title: 'Zoom',
    body: 'Magnify a reticle to inspect its geometry, or shrink it to see how much of the screen it really covers at your resolution.',
  },
  {
    title: 'Colour and size overrides',
    body: 'Try a design in your own colour and at your own scale without editing it. The catalogue entry stays exactly as it shipped.',
  },
  {
    title: 'Two-design compare',
    body: 'Hold two reticles on the same backdrop at the same zoom, and choose between them on evidence rather than on memory.',
  },
] as const;

export function ProCrosshairsPage() {
  // A constant initial value keeps the prerendered HTML and the hydrated tree
  // identical, so this page cannot flash or mismatch.
  const [category, setCategory] = useState<string>('all');

  const shown = category === 'all' ? ENTRIES : ENTRIES.filter((entry) => entry.category === category);
  const countFor = (id: string) =>
    id === 'all' ? ENTRIES.length : ENTRIES.filter((entry) => entry.category === id).length;

  return (
    <>
      <section className="band world-field" style={{ paddingBlock: 'clamp(56px,7vw,104px)' }}>
        <div className="container">
          <span className="eyebrow">Collection · built into the application</span>
          <h1>Pro Crosshairs.</h1>
          <p className="section-lead" style={{ maxWidth: '62ch' }}>
            {CATALOGUE.pro.total} curated designs across {CATEGORIES.length} categories,
            installed with crshhx and open in the preview bench. They are ordinary presets in
            the library: load one, edit it, save your own copy. The shipped design is never
            modified.
          </p>
          <div className="rail" style={{ marginTop: 'var(--space-7)' }}>
            {TIER_COUNTS.map((item) => (
              <div className="rail-item" key={item.tier}>
                <span className="rail-v">{item.count}</span>
                <span className="rail-k">{item.label}</span>
              </div>
            ))}
            <div className="rail-item">
              <span className="rail-v">{CATEGORIES.length}</span>
              <span className="rail-k">categories</span>
            </div>
          </div>
        </div>
      </section>

      {/* The most credible thing about this catalogue is what it refuses to
          claim, so it is stated before any design is shown. */}
      <section className="band world-studio" style={{ paddingBlock: 'clamp(40px,5vw,72px)' }}>
        <div className="container container-narrow">
          <Callout title="No player-named crosshairs, and that is deliberate">
            <p>{CATALOGUE.pro.note}</p>
            <p>
              Every design below is labelled with its tier. A “{TIERS.inspired.toLowerCase()}”
              design is built for a kind of play, not copied from a person; a “
              {TIERS.original.toLowerCase()}” design is a crshhx original using the full v2
              engine. Nothing here is presented as a professional player’s settings.
            </p>
          </Callout>
        </div>
      </section>

      <section className="band world-field">
        <div className="container">
          <div className="band-head">
            <span className="band-num">Catalogue</span>
            <h2>Filter by category.</h2>
            <p className="band-lead" role="status">
              Showing {shown.length} of {ENTRIES.length} designs.
            </p>
          </div>

          <div className="cat-tabs" role="group" aria-label="Filter designs by category">
            <button
              type="button"
              className={`cat-tab${category === 'all' ? ' is-active' : ''}`}
              aria-pressed={category === 'all'}
              onClick={() => setCategory('all')}
            >
              All
              <span className="cat-tab-count">{ENTRIES.length}</span>
            </button>
            {CATEGORIES.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`cat-tab${category === item.id ? ' is-active' : ''}`}
                aria-pressed={category === item.id}
                onClick={() => setCategory(item.id)}
              >
                {item.label}
                <span className="cat-tab-count">{countFor(item.id)}</span>
              </button>
            ))}
          </div>

          {/* The selected category's own blurb, from the application's data. A
              title attribute would hide this from keyboard and touch users. */}
          {category !== 'all' ? (
            <p className="cat-blurb">
              {CATEGORIES.find((item) => item.id === category)?.blurb}
            </p>
          ) : null}

          <ul className="sheet">
            {shown.map((entry) => (
              <li className="sheet-item" key={entry.id}>
                <div className="sheet-stage">
                  <Reticle spec={entry.spec} size={92} label={`${entry.name} crosshair`} />
                </div>
                <div>
                  <h3 className="sheet-name">{entry.name}</h3>
                  <p className="sheet-meta">
                    <span className="sheet-tier">{TIERS[entry.tier]}</span>
                    <span>{categoryLabel(entry.category)}</span>
                    <span>{entry.topology}</span>
                  </p>
                </div>
                <p className="sheet-desc">{entry.description}</p>
                {entry.beyond && entry.beyond.length > 0 ? (
                  <p className="sheet-beyond">
                    {`Also uses ${entry.beyond.join(', ')} — a static drawing cannot show it`}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>

          <p className="dl-fineprint">
            Each reticle above is drawn by this site from the parameters the application ships
            for that design — the same schema the overlay renders. They are illustrative
            previews, not a screenshot of the application.
          </p>
        </div>
      </section>

      <section className="band world-studio">
        <div className="container">
          <div className="band-head">
            <span className="band-num">Preview bench</span>
            <h2>Judge a design before you commit to it.</h2>
            <p className="band-lead">
              The bench is part of the Pro Crosshairs view. It exists because a reticle looks
              different on a target range than it does in a match.
            </p>
          </div>
          <div className="band-split">
            <div className="band-cols" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))' }}>
              {BENCH.map((item) => (
                <div className="band-col" key={item.title}>
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                </div>
              ))}
            </div>
            <Reveal>
              <ProBenchMock leftIndex={4} rightIndex={24} />
            </Reveal>
          </div>
        </div>
      </section>

      <section className="band world-field" style={{ paddingBlock: 'clamp(48px,6vw,88px)' }}>
        <div className="container container-narrow">
          <div className="band-head" style={{ marginBottom: 'var(--space-5)' }}>
            <h2>Open the catalogue in crshhx.</h2>
            <p className="band-lead">
              Pro Crosshairs is in the application, under Collection. Load a design, override
              its colour and size in the bench, then save it as your own preset.
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
            <Link className="btn btn-secondary btn-lg" to="/academy">
              Learn how to choose one
              <IconArrow />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
