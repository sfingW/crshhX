/**
 * Verifies the built site in `dist/` before it can be deployed.
 *
 * `prerender.mjs` checks each page as it writes it. This script checks the
 * artifact as a whole, and it exists because of a specific failure: the website
 * had no CI job at all, so a build that printed `origin=(unset — canonical and
 * og:url omitted)` shipped to production without anybody noticing, and a
 * typecheck error in `vite.config.ts` never blocked a merge.
 *
 * Everything asserted here is either measured or computed. Nothing is a guess,
 * and nothing is allowed to be approximate: the release manifest is the source
 * of truth for downloads, the byte budgets come from a real baseline, and the
 * contrast ratios are calculated from the values in the built CSS.
 *
 * Fails the build (exit 1) on the first problem, listing everything it found.
 */
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const problems = [];
const notes = [];

function check(condition, message) {
  if (!condition) problems.push(message);
}

/* ------------------------------------------------------------------ routes */

const RELEASES = JSON.parse(readFileSync(join(root, 'src', 'releases.json'), 'utf8'));
// The origin the build actually used: SITE_URL wins (that is what vite.config.ts
// and site.ts read), then an explicit override, then the verified production host.
const origin = (
  process.env.SITE_URL || process.env.EXPECT_ORIGIN || 'https://crshhx.pages.dev'
).replace(/\/+$/, '');

const ROUTES = [
  { path: '/', file: 'index.html', canonical: `${origin}/` },
  { path: '/features', file: 'features/index.html', canonical: `${origin}/features` },
  { path: '/download', file: 'download/index.html', canonical: `${origin}/download` },
  { path: '/docs', file: 'docs/index.html', canonical: `${origin}/docs` },
  { path: '/changelog', file: 'changelog/index.html', canonical: `${origin}/changelog` },
];
const NOT_FOUND = { file: '404.html' };

const html = new Map();
for (const route of [...ROUTES, NOT_FOUND]) {
  const full = join(dist, route.file);
  if (!existsSync(full)) {
    problems.push(`missing route file: ${route.file}`);
    continue;
  }
  const text = readFileSync(full, 'utf8');
  html.set(route.file, text);

  check(text.length >= 900, `${route.file} is only ${text.length} bytes — looks empty`);
  check(text.includes('<main id="main">'), `${route.file} has no <main id="main">`);
  check(
    (text.match(/<h1/g) ?? []).length === 1,
    `${route.file} has ${(text.match(/<h1/g) ?? []).length} <h1> elements, expected exactly 1`,
  );
  check(
    (text.match(/<title>/g) ?? []).length === 1,
    `${route.file} has ${(text.match(/<title>/g) ?? []).length} <title> elements, expected exactly 1`,
  );
  for (const marker of ['<!--TITLE-->', '<!--DESCRIPTION-->', '<!--HEAD-->', '<!--OG_IMAGE-->']) {
    check(!text.includes(marker), `${route.file} still contains the marker ${marker}`);
  }
}

/* --------------------------------------------------------------- SEO metadata */

for (const route of ROUTES) {
  const text = html.get(route.file);
  if (!text) continue;
  check(
    text.includes(`<link rel="canonical" href="${route.canonical}"`),
    `${route.file} is missing canonical ${route.canonical}`,
  );
  check(
    text.includes(`<meta property="og:url" content="${route.canonical}"`),
    `${route.file} is missing og:url ${route.canonical}`,
  );
  check(
    /<meta name="description" content="[^"]{80,240}"/.test(text),
    `${route.file} has no meta description between 80 and 240 characters`,
  );
  check(
    /<meta property="og:image" content="[^"]+\/og\/cover\.png"/.test(text),
    `${route.file} has no og:image`,
  );
}

const notFoundHtml = html.get(NOT_FOUND.file);
if (notFoundHtml) {
  check(
    notFoundHtml.includes('<meta name="robots" content="noindex"'),
    '404.html is not marked noindex',
  );
}

const sitemapPath = join(dist, 'sitemap.xml');
check(existsSync(sitemapPath), 'sitemap.xml was not emitted — SITE_URL is unset');
if (existsSync(sitemapPath)) {
  const sitemap = readFileSync(sitemapPath, 'utf8');
  for (const route of ROUTES) {
    check(sitemap.includes(`<loc>${route.canonical}</loc>`), `sitemap.xml is missing ${route.canonical}`);
  }
  check(!sitemap.includes('<loc></loc>'), 'sitemap.xml contains an empty <loc>');
}

/* ------------------------------------------------------- download integrity */

const latest = RELEASES.latest
  ? RELEASES.published.find((entry) => entry.version === RELEASES.latest)
  : null;
const artifacts = latest?.artifacts ?? [];

// Every .exe link anywhere in the build must come from the manifest. This is
// the same guarantee prerender.mjs enforces per page, re-checked across dist.
const allowed = new Set(artifacts.map((a) => a.url));
for (const [file, text] of html) {
  for (const href of text.matchAll(/href="([^"]*\.exe)"/gi)) {
    check(
      allowed.has(href[1]),
      `${file} links to an executable that is not in the release manifest: ${href[1]}`,
    );
  }
}

const downloadHtml = html.get('download/index.html') ?? '';
for (const artifact of artifacts) {
  check(
    downloadHtml.includes(artifact.url),
    `download page is missing the manifest URL for ${artifact.file}`,
  );
  check(
    downloadHtml.includes(artifact.sha256),
    `download page is missing the SHA-256 for ${artifact.file}`,
  );
  const mb = `${(artifact.size / 1048576).toFixed(1)} MB`;
  check(downloadHtml.includes(mb), `download page is missing the size "${mb}" for ${artifact.file}`);
  check(
    downloadHtml.includes(artifact.file),
    `download page is missing the filename ${artifact.file}`,
  );
}

if (!RELEASES.latest) {
  check(
    !/\.exe/i.test(downloadHtml),
    'manifest has no release, but the download page mentions an executable',
  );
}
notes.push(
  `manifest: channel=${RELEASES.channel} latest=${RELEASES.latest ?? 'none'} artifacts=${artifacts.length}`,
);

/* ------------------------------------------------------------ hygiene, size */

const assetsDir = join(dist, 'assets');
const assetFiles = existsSync(assetsDir) ? readdirSync(assetsDir) : [];
const read = (name) => readFileSync(join(assetsDir, name));

const jsFiles = assetFiles.filter((f) => f.endsWith('.js'));
const cssFiles = assetFiles.filter((f) => f.endsWith('.css'));
const fontFiles = assetFiles.filter((f) => f.endsWith('.woff2'));

check(jsFiles.length >= 1, 'no JavaScript bundle in dist/assets');
check(cssFiles.length >= 1, 'no CSS bundle in dist/assets');

const gz = (buf) => gzipSync(buf, { level: 9 }).length;

// Baseline measured at 4ecedfc, before the redesign: JS 96,426 B gz,
// CSS 6,907 B gz, fonts 119,708 B raw. The JS budget is deliberately tight —
// the site ships three runtime dependencies and the redesign must not add
// weight. The CSS budget leaves room for the new design system while still
// failing on a runaway.
const BUDGET = { js: 102_000, css: 12_000, fonts: 132_000 };

const jsGz = jsFiles.reduce((total, f) => total + gz(read(f)), 0);
const cssGz = cssFiles.reduce((total, f) => total + gz(read(f)), 0);
const fontsRaw = fontFiles.reduce((total, f) => total + statSync(join(assetsDir, f)).size, 0);

check(jsGz <= BUDGET.js, `JavaScript is ${jsGz} B gzipped, budget ${BUDGET.js} B`);
check(cssGz <= BUDGET.css, `CSS is ${cssGz} B gzipped, budget ${BUDGET.css} B`);
check(
  fontsRaw <= BUDGET.fonts,
  `self-hosted fonts are ${fontsRaw} B, budget ${BUDGET.fonts} B`,
);
notes.push(
  `budget: js ${jsGz}/${BUDGET.js} B gz · css ${cssGz}/${BUDGET.css} B gz · fonts ${fontsRaw}/${BUDGET.fonts} B`,
);

const allCss = cssFiles.map((f) => read(f).toString('utf8')).join('\n');
const allHtml = [...html.values()].join('\n');

// Decoration the redesign explicitly removes. Asserting their absence stops a
// future change from quietly reintroducing them.
for (const banned of ['--grid-line', 'grad-accent']) {
  check(!allCss.includes(banned), `built CSS still contains ${banned}`);
}

// No analytics, no tracking, no third-party requests of any kind.
const origins = new Set(
  [...allHtml.matchAll(/https:\/\/([a-z0-9.-]+)/gi)].map((m) => m[1].toLowerCase()),
);
const ALLOWED_ORIGINS = new Set(['github.com', 'crshhx.pages.dev']);
for (const host of origins) {
  const ok = [...ALLOWED_ORIGINS].some(
    (allowed) => host === allowed || host.endsWith(`.${allowed}`),
  );
  check(ok, `build references a third-party origin: https://${host}`);
}
notes.push(`origins referenced: ${[...origins].sort().join(', ') || '(none)'}`);

/* ------------------------------------------------- contrast, computed not claimed */

const token = (name) => {
  const match = allCss.match(new RegExp(`${name.replace(/[-]/g, '\\-')}\\s*:\\s*(#[0-9a-fA-F]{6})`));
  return match ? match[1] : null;
};
const channel = (c) => {
  const v = c / 255;
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
const luminance = (hex) => {
  const n = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16));
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
};
const ratio = (a, b) => {
  const l1 = luminance(a);
  const l2 = luminance(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
};

// Pairs that carry real text. 4.5:1 is WCAG AA for normal-size text, which is
// what every one of these is used for --text-faint included, since it appears
// at 11px.
const CONTRAST_PAIRS = [
  ['--text', '--ink-0'],
  ['--text', '--ink-2'],
  ['--text-dim', '--ink-0'],
  ['--text-dim', '--ink-2'],
  ['--text-faint', '--ink-0'],
  ['--text-faint', '--ink-2'],
  ['--text-faint', '--ink-3'],
  ['--brand', '--ink-0'],
  ['--on-brand', '--brand'],
];
let contrastChecked = 0;
for (const [fgName, bgName] of CONTRAST_PAIRS) {
  const fg = token(fgName);
  const bg = token(bgName);
  if (!fg || !bg) {
    notes.push(`contrast: skipped ${fgName}/${bgName} (token not found in built CSS)`);
    continue;
  }
  const r = ratio(fg, bg);
  contrastChecked += 1;
  check(
    r >= 4.5,
    `contrast ${fgName} ${fg} on ${bgName} ${bg} = ${r.toFixed(2)}:1, needs >= 4.50:1`,
  );
}
notes.push(`contrast: ${contrastChecked} text pairs verified >= 4.50:1`);

/* ------------------------------------------------------------------- report */

for (const note of notes) console.log(`verify: ${note}`);
console.log(`verify: ${html.size} pages, ${assetFiles.length} assets`);

if (problems.length > 0) {
  console.error(`\nverify: ${problems.length} problem(s) in dist/`);
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}
console.log('verify: dist/ passed every check');
