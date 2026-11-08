/**
 * Prerenders every route of the crshhx website to real HTML.
 *
 * Run after `build:client` and `build:server`. It reads the built `index.html`
 * shell, renders each route with the server entry and writes one static file per
 * route, plus `404.html` and (when a public origin is configured) `sitemap.xml`.
 *
 * The script is deliberately strict: an empty render, a download link that does
 * not exist yet, or a route missing from the manifest all fail the build. The
 * site should never publish something unverified just because the build ran.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const root = resolve(scriptDir, '..');
const distDir = join(root, 'dist');
const serverEntry = join(root, 'dist-server', 'entry-server.js');

const base = process.env.SITE_BASE ?? '/';
const baseNoSlash = base.replace(/\/$/, '');

function escapeAttr(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

async function main() {
  const template = await readFile(join(distDir, 'index.html'), 'utf8');
  const server = await import(serverEntry);
  const { render, ROUTES, SITE, NOT_FOUND_PATH, RELEASES } = server;

  if (!Array.isArray(ROUTES) || ROUTES.length === 0) {
    throw new Error('prerender: no routes exported from the server entry');
  }

  const siteUrl = String(SITE.url ?? '').replace(/\/$/, '');
  const ogImage = `${siteUrl}${baseNoSlash}/og/cover.png`;

  const pages = ROUTES.map((route) => ({
    path: route.path,
    title: route.title,
    description: route.description,
    file: route.path === '/' ? 'index.html' : `${route.path.slice(1)}/index.html`,
    robots: null,
  }));

  pages.push({
    path: NOT_FOUND_PATH,
    title: 'Page not found — crshhx',
    description: 'That address does not exist on the crshhx website.',
    file: '404.html',
    robots: 'noindex',
  });

  const report = [];

  for (const page of pages) {
    const appHtml = render(page.path);

    if (!appHtml.includes('<main id="main">') || appHtml.length < 900) {
      throw new Error(
        `prerender: ${page.path} rendered ${appHtml.length} bytes and looks empty`,
      );
    }

    const head = [
      `<meta property="og:title" content="${escapeAttr(page.title)}" />`,
      `<meta property="og:description" content="${escapeAttr(page.description)}" />`,
      `<meta name="twitter:title" content="${escapeAttr(page.title)}" />`,
      `<meta name="twitter:description" content="${escapeAttr(page.description)}" />`,
    ];

    if (page.robots) head.push(`<meta name="robots" content="${page.robots}" />`);

    if (siteUrl) {
      const canonical =
        page.path === '/' ? `${siteUrl}${baseNoSlash}/` : `${siteUrl}${baseNoSlash}${page.path}`;
      head.push(`<link rel="canonical" href="${escapeAttr(canonical)}" />`);
      head.push(`<meta property="og:url" content="${escapeAttr(canonical)}" />`);
    }

    const html = template
      .replace('<!--TITLE-->', escapeAttr(page.title))
      .replace('<!--DESCRIPTION-->', escapeAttr(page.description))
      .replace('<!--OG_IMAGE-->', escapeAttr(ogImage))
      .replace('<!--HEAD-->', head.join('\n    '))
      .replace('<div id="root"></div>', `<div id="root">${appHtml}</div>`);

    for (const marker of ['<!--TITLE-->', '<!--DESCRIPTION-->', '<!--HEAD-->', '<!--OG_IMAGE-->']) {
      if (html.includes(marker)) throw new Error(`prerender: ${page.path} still contains ${marker}`);
    }

    // A download URL may only appear once a verified artifact exists.
    if (!RELEASES.latest && /href="[^"]*\.exe/i.test(html)) {
      throw new Error(`prerender: ${page.path} links to an executable while the manifest has no release`);
    }

    const target = join(distDir, page.file);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, html, 'utf8');
    report.push([page.path, page.file, Buffer.byteLength(html, 'utf8')]);
  }

  if (siteUrl) {
    const urls = ROUTES.map((route) => {
      const loc =
        route.path === '/' ? `${siteUrl}${baseNoSlash}/` : `${siteUrl}${baseNoSlash}${route.path}`;
      const priority = route.path === '/' ? '1.0' : route.path === '/download' ? '0.9' : '0.7';
      return `  <url>\n    <loc>${escapeAttr(loc)}</loc>\n    <lastmod>${SITE.updated}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
    }).join('\n');
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
    await writeFile(join(distDir, 'sitemap.xml'), sitemap, 'utf8');
  }

  console.log(`prerender: channel=${RELEASES.channel} latest=${RELEASES.latest ?? 'none'}`);
  console.log(`prerender: base=${base} origin=${siteUrl || '(unset — canonical and og:url omitted)'}`);
  for (const [path, file, bytes] of report) {
    console.log(`  ${path.padEnd(12)} ${file.padEnd(24)} ${(bytes / 1024).toFixed(1)} KB`);
  }
  console.log(
    siteUrl
      ? 'prerender: sitemap.xml written'
      : 'prerender: sitemap.xml skipped (set SITE_URL at deploy time to emit one)',
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
