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
    expect(html).toContain('Your crosshair');
    expect(html).toContain('crosshair overlay');
    expect(html).toContain('Download for Windows');
    expect(html).toContain('Explore features');
    expect(html).toContain('href="/download"');
    expect(html).toContain('href="/features"');
    expect(html).toContain('How it works');
    expect(html).toContain('No telemetry');
    // The published build turns the hero CTA into the file itself — no
    // intermediate page between the visitor and the installer.
    expect(html).toContain(
      'href="https://github.com/sfingW/crshhX/releases/download/v1.1.0/crshhx-crosshair-studio-setup-1.1.0.exe"',
    );
    expect(html).toContain('is ready for Windows');
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
    // The unsigned-build warning is stated plainly.
    expect(html).toContain('SmartScreen');
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
    expect(html).not.toContain('<dd>—</dd>');
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
  });

  it('separates development notes from published releases on the changelog', () => {
    const html = HTML['/changelog'];
    // The published release leads, with its measured artifacts as plain chips.
    expect(html).toContain('Published releases');
    expect(html).toContain('1.1.0');
    expect(html).toContain('pill ok">published');
    expect(html).toContain('crshhx-crosshair-studio-setup-1.1.0.exe');
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
    for (const path of ['/', '/features'] as const) {
      const lower = HTML[path].toLowerCase();
      expect(lower).toContain('not a screenshot');
      const mentions = (lower.match(/screenshot/g) ?? []).length;
      const negated =
        (lower.match(/not a screenshot|none of them is a screenshot/g) ?? []).length;
      expect(mentions, path).toBe(negated);
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
      for (const origin of text.match(/https?:\/\/[^"'`\s)]+/g) ?? []) {
        expect(origin, `${file}: ${origin}`).toMatch(/^https:\/\/github\.com\/sfingW\/crshhX/);
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
  });
});
