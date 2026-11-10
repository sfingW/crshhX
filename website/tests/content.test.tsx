import { SITE } from '../src/site';
import { CATALOGUE } from '../src/catalogue';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ALL_PATHS, KNOWN_PATHS, renderRoute } from './helpers';

const HTML: Record<string, string> = Object.fromEntries(
  KNOWN_PATHS.map((path) => [path, renderRoute(path)]),
);

/** Marketing language this site must never use, whatever the page. */
const BANNED = [
  'anti-cheat safe',
  'anti-cheat friendly',
  'guaranteed to work',
  'guaranteed compatibility',
  'undetected',
  'ban-proof',
  'trusted by',
  'world’s best',
  "world's best",
  '100% free',
  'risk-free',
  'money-back',
  'million users',
  'as seen on',
  'testimonial',
  'award-winning',
  'industry-leading',
  'revolutionary',
  'game-changing',
  'next level',
];

/** Fabricated statistics: counts of people, or performance claims in percent. */
const FABRICATED_STATS = [
  /(\d[\d,.]*)\s*(?:\+)?\s*(users|downloads|players|gamers|installs|members|subscribers)/i,
  /(\d+(?:\.\d+)?)\s*%\s*(faster|better|more|increase|improvement|accuracy)/i,
  /\b\d+\s*(?:five|5)[- ]star\b/i,
  /(over|more than|nearly)\s+\d[\d,.]*\s+(?:people|players|users)/i,
];

/** Every way the site is allowed to deny that a visual is a screenshot. */
const SCREENSHOT_DENIALS = /not a screenshot|not screenshots|none of them is a screenshot/g;

function sourceFiles(dir: string, found: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) sourceFiles(full, found);
    else if (/\.(tsx?|css|html|json)$/.test(entry)) found.push(full);
  }
  return found;
}

describe('server-rendered content', () => {
  it('renders a complete page for every published route', () => {
    for (const path of ALL_PATHS) {
      const html = HTML[path];
      expect(html, path).toContain('<main id="main">');
      expect(html, path).toContain('class="nav"');
      expect(html, path).toContain('class="footer"');
      expect(html.match(/<h1/g)?.length, path).toBe(1);
      expect(html.length, path).toBeGreaterThan(4000);
    }
  });

  it('renders the custom 404 page for unknown paths', () => {
    const html = renderRoute('/this-page-does-not-exist');
    expect(html).toContain('404');
    expect(html).toContain('off-centre');
    expect(html).toContain('href="/"');
    expect(HTML['/404']).toBe(html);
  });

  it('explains the product immediately on the home page', () => {
    const html = HTML['/'];
    // The headline states what crshhx is and what it is not.
    expect(html).toContain('Your crosshair');
    expect(html).toContain('drawn over the game');
    expect(html).toContain('Never inside it.');
    expect(html).toContain('crosshair overlay');
    expect(html).toContain('Download for Windows');
    expect(html).toContain('See what it does');
    expect(html).toContain('href="/download"');
    expect(html).toContain('href="/features"');
    expect(html).toContain('telemetry');
    expect(html).toContain('The reticle follows the weapon');
    // The published build turns the hero CTA into the file itself — no
    // intermediate page between the visitor and the installer.
    expect(html).toContain(
      'href="https://github.com/sfingW/crshhX/releases/download/v1.1.0/crshhx-crosshair-studio-setup-1.1.0.exe"',
    );
    expect(html).toContain('Ready for Windows.');
    // The counts on the rail come from the generated catalogue, not from copy.
    expect(html).toContain(String(CATALOGUE.vault.total));
    expect(html).toContain(String(CATALOGUE.pro.total));
    expect(html).toContain(String(CATALOGUE.academy.total));
  });

  it('uses the split as structure, and only three times', () => {
    // Two worlds is the identity; a split on every band would be a gimmick. The
    // home page is allowed three: the hero, the collections band and the
    // download strip. This is the limit the design document sets, asserted
    // rather than remembered.
    const splits = (HTML['/'].match(/class="split"/g) ?? []).length;
    expect(splits).toBe(3);
    // And every world change is deliberate: the page uses both.
    expect(HTML['/']).toContain('world-studio');
    expect(HTML['/']).toContain('world-field');
  });

  it('covers all six feature areas on the features page', () => {
    const html = HTML['/features'];
    for (const section of ['Editor', 'Presets', 'Transfer', 'Profiles', 'Weapon slots', 'Overlay']) {
      expect(html, section).toContain(section);
    }
    for (const eyebrow of ['01', '02', '03', '04', '05', '06']) {
      expect(html).toContain(eyebrow);
    }
    expect(html).toContain('none of them is a screenshot');
    // Six areas, six different compositions: the parameter list, a contact
    // sheet, a flipped split, three columns, keycaps and a flush dark stage.
    expect(html).toContain('rulelist');
    expect(html).toContain('showcase');
    expect(html).toContain('keycaps');
    expect(html).toContain('band-split flip');
  });

  it('publishes the real Pro Crosshairs catalogue', () => {
    const html = HTML['/pro-crosshairs'];
    expect(html).toContain('Pro Crosshairs');
    const sheet = CATALOGUE.pro.entries.filter((entry) => entry.series !== 'gold');
    const gold = CATALOGUE.pro.entries.filter((entry) => entry.series === 'gold');
    expect((html.match(/class="sheet-item"/g) ?? []).length).toBe(sheet.length);
    // The Gold Series is presented apart from the sheet, with its attribution.
    expect((html.match(/class="gold-card/g) ?? []).length).toBe(gold.length);
    for (const entry of gold) {
      expect(html, entry.name).toContain(entry.name);
      // The built HTML carries the attribution with its apostrophe escaped.
      expect(html, entry.id).toContain(entry.inspiration?.replace("'", '&#x27;'));
    }
    for (const category of CATALOGUE.pro.categories) {
      expect(html, category.label).toContain(category.label);
    }
    // The sentence that makes the page credible is the application's own.
    expect(html).toContain('No player-named crosshairs yet');
    expect(html).toContain('that is deliberate');
    // All three tier labels, including the one with nothing behind it yet.
    expect(html).toContain('Verified player');
    expect(html).toContain('Competitive-inspired');
    expect(html).toContain('crshhx original');
    // Real designs, and the one whose behaviour a static drawing cannot show.
    expect(html).toContain('Storm Tracker');
    expect(html).toContain('Recoil Ascent');
    expect(html).toContain('Bloom Trainer');
    expect(html).toContain('a static drawing cannot show it');
    expect(html).toContain('Preview bench');
  });

  it('publishes the real Academy curriculum', () => {
    const html = HTML['/academy'];
    expect(html).toContain('Crosshair Academy');
    expect((html.match(/class="lesson"/g) ?? []).length).toBe(CATALOGUE.academy.total);
    for (const tutorial of CATALOGUE.academy.tutorials) {
      expect(html, tutorial.title).toContain(tutorial.title);
      expect(html, tutorial.intro).toContain(tutorial.intro);
    }
    // The rules the Academy's own content is written under.
    expect(html).toContain('Illustration — not a screenshot');
    expect(html).toContain('live, editable reticle');
    expect(html).toContain('Completion is tracked locally');
  });

  it('publishes the real download facts on the download page', () => {
    const html = HTML['/download'];
    // The requested call-to-action pair: primary installer, secondary portable.
    expect(html).toContain('Download crshhx');
    expect(html).toContain('Download portable');
    // Release strip and panel structure.
    expect(html).toContain('Download crshhx</h1>');
    expect(html).toContain('Your crosshair studio for Windows.');
    expect(html).toContain('Latest stable release');
    expect(html).toContain('Released 2026-11-08');
    expect(html).toContain('Recommended');
    expect(html).toContain('One-click installation.');
    expect(html).toContain('No installation required.');
    // Hashes live behind the disclosure, with the command that reproduces them.
    expect(html).toContain('Verify download');
    expect(html).toContain('certutil -hashfile');
    // The three-step guide.
    expect(html).toContain('Install in three steps');
    // Both point straight at the GitHub Release assets — the files themselves.
    expect(html).toContain(
      'href="https://github.com/sfingW/crshhX/releases/download/v1.1.0/crshhx-crosshair-studio-setup-1.1.0.exe"',
    );
    expect(html).toContain(
      'href="https://github.com/sfingW/crshhX/releases/download/v1.1.0/crshhx-crosshair-studio-portable-1.1.0.exe"',
    );
    // Measured facts from the release metadata: version, sizes, hashes.
    expect(html).toContain('1.1.0');
    expect(html).toContain('2026-11-08');
    expect(html).toContain('84.7 MB');
    expect(html).toContain('77.7 MB');
    expect(html).toContain('bed1e654a6ce8dc0226c77fd8872da848e2d0a2f3eba6bb7dd104084dccac45d');
    expect(html).toContain('037476deef04f4a56de5a58860dc7c61e80a9c8abab078c183d63a0e8ba842e2');
    // Security guidance for an unsigned build: what warns, why, and what to do.
    expect(html).toContain('SmartScreen');
    expect(html).toContain('Not code-signed');
    expect(html).toContain('More info');
    expect(html).toContain('Run anyway');
    expect(html).toContain('roaming application-data directory');
    // The anti-cheat question is answered without a guarantee.
    expect(html).toContain('can be declared safe with every anti-cheat system');
    expect(html).toContain('this project does not claim it');
    // Structure unchanged.
    expect(html).toContain('System requirements');
    expect(html).toContain('Windows 10 or Windows 11');
    expect(html).toContain('SHA-256');
    expect(html).toContain('Troubleshooting');
    expect(html).toContain('href="/changelog"');
    // Nothing from the pending state may survive, and no fact cell is a dash.
    expect(html).not.toContain('No verified build has been published yet');
    expect(html).not.toContain('coming soon');
    expect(html).not.toContain('disabled');
    expect(html).not.toContain('>—<');
    expect(html).not.toContain('Download now');
  });

  it('documents every promised topic, and flags what is unverified', () => {
    const html = HTML['/docs'];
    for (const id of [
      'getting-started',
      'installation',
      'editor',
      'presets',
      'import-export',
      'profiles',
      'weapon-slots',
      'troubleshooting',
      'faq',
    ]) {
      expect(html, id).toContain(`id="${id}"`);
      expect(html).toContain(`href="#${id}"`);
    }
    expect(html).toContain('Unverified on Windows hardware');
    expect(html).toContain('cannot be guaranteed');
    expect(html.match(/<details class="faq"/g)?.length).toBe(6);
    // The documentation reaches the two catalogue pages, so a reader who wants
    // the presets or the lessons is one click away.
    expect(html).toContain('href="/pro-crosshairs"');
    expect(html).toContain('href="/academy"');
  });

  it('separates development notes from published releases on the changelog', () => {
    const html = HTML['/changelog'];
    // The published release leads, with its measured artifacts as plain chips.
    expect(html).toContain('Published releases');
    expect(html).toContain('1.1.0');
    expect(html).toContain('pill ok">published');
    expect(html).toContain('crshhx-crosshair-studio-setup-1.1.0.exe');
    // The features that shipped in it are named, including the two new pages.
    expect(html).toContain('Pro Crosshairs library');
    expect(html).toContain('Crosshair Academy');
    // Development notes stay in their own section, visibly not a release.
    expect(html).toContain('In development');
    expect(html).toContain('1.0.0');
    expect(html).toContain('development note');
    expect(html).toContain('tl-entry unpublished');
    expect(html).not.toContain('No published release yet');
    expect(html).toContain('Added');
    expect(html).toContain('Improved');
    expect(html).toContain('Fixed');
    // Chips name the files; only the download page links to them.
    expect(html).not.toMatch(/href="[^"]*\.exe/i);
  });

  it('makes no banned marketing claim on any page', () => {
    for (const path of KNOWN_PATHS) {
      const lower = HTML[path].toLowerCase();
      for (const phrase of BANNED) {
        expect(lower, `${path}: ${phrase}`).not.toContain(phrase.toLowerCase());
      }
      for (const pattern of FABRICATED_STATS) {
        expect(HTML[path].match(pattern), `${path}: ${String(pattern)}`).toBeNull();
      }
    }
  });

  it('uses no raster images at all', () => {
    for (const path of KNOWN_PATHS) {
      expect(HTML[path], path).not.toContain('<img');
      expect(HTML[path], path).not.toContain('background-image');
    }
  });

  it('labels every mockup as a mockup and never as a screenshot', () => {
    for (const path of KNOWN_PATHS) {
      const html = HTML[path];
      const lower = html.toLowerCase();
      const mentions = (lower.match(/screenshot/g) ?? []).length;
      const negated = (lower.match(SCREENSHOT_DENIALS) ?? []).length;
      // Every use of the word on every page is a denial. A visual that is not
      // labelled is the failure this guards against.
      expect(mentions, path).toBe(negated);
    }
    for (const path of ['/', '/features', '/pro-crosshairs', '/academy'] as const) {
      expect(HTML[path], path).toMatch(/Illustrative (interface )?preview/);
      expect(HTML[path], path).toContain('mock-caption');
    }
  });

  it('ships no analytics, tracking or third-party origin', () => {
    const root = process.cwd();
    const files = [...sourceFiles(join(root, 'src')), join(root, 'index.html')];
    expect(files.length).toBeGreaterThan(10);
    const tracking =
      /gtag|googletagmanager|google-analytics|plausible|fathom|posthog|segment\.io|hotjar|clarity|matomo|mixpanel|amplitude|sentry|facebook\.net|doubleclick/i;
    for (const file of files) {
      const text = readFileSync(file, 'utf8');
      expect(text.match(tracking), file).toBeNull();
      // Two first-party origins, and nothing else. The repository supplies
      // release assets and issue links; SITE.url is the site's own origin, which
      // canonical / og:url / sitemap.xml need. Neither is a request to a third
      // party — nothing is fetched from either at runtime. Deriving the second
      // from SITE.url means this allowlist cannot drift from the configured
      // origin, and any other host still fails the test. That is what keeps the
      // concept pages' Google Fonts link out of the build.
      for (const origin of text.match(/https?:\/\/[^"'`\s)]+/g) ?? []) {
        const firstParty =
          origin.startsWith('https://github.com/sfingW/crshhX') || origin.startsWith(SITE.url);
        expect(firstParty, `${file}: ${origin}`).toBe(true);
      }
    }
  });

  it('draws reticles from real parameters rather than decoration', () => {
    // Every product visual is vector markup with an accessible label.
    const html = HTML['/'];
    expect(html).toContain('<svg');
    expect(html.match(/aria-label="[^"]*crosshair[^"]*"/gi)?.length ?? 0).toBeGreaterThan(3);
    expect(html).toContain('Cyan Duelist');
    expect(html).toContain('Pump Breacher');
    // The catalogue page draws all forty designs, each with its own label.
    const pro = HTML['/pro-crosshairs'];
    expect(pro.match(/aria-label="[^"]*crosshair"/gi)?.length ?? 0).toBeGreaterThanOrEqual(
      CATALOGUE.pro.total,
    );
  });
});
