/// <reference types="vitest/config" />
import { existsSync, createReadStream } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * The website builds to plain static files: no server, no database, no runtime
 * environment. `scripts/prerender.mjs` renders every route to real HTML after the
 * client build, so crawlers and link previews see content without JavaScript,
 * while the browser still hydrates into a single-page app.
 *
 * `SITE_BASE` exists for hosts that serve from a path prefix (for example a
 * GitHub Pages project site). The default assumes a domain root, which is what
 * Netlify, Cloudflare Pages and a custom domain all give you.
 */
const base = process.env.SITE_BASE ?? '/';

/** Public origin. Left empty until a domain exists: canonical and og:url are
 * then omitted rather than pointing at a placeholder. */
const siteUrl = process.env.SITE_URL ?? '';

const distDir = fileURLToPath(new URL('./dist', import.meta.url));

/**
 * Makes `vite preview` behave like real static hosting: `/features` serves
 * `dist/features/index.html`, and unknown paths answer with the prerendered
 * 404 page and a 404 status — exactly what Netlify, Cloudflare Pages or
 * GitHub Pages will do. Without this the preview hides misconfiguration
 * behind the SPA fallback.
 */
function staticHostSimulation() {
  return {
    name: 'static-host-simulation',
    configurePreviewServer(server: {
      middlewares: {
        use: (fn: (req: IncomingMessage, res: ServerResponse, next: () => void) => void) => void;
      };
    }) {
      server.middlewares.use((req, res, next) => {
        const raw = (req.url ?? '/').split('?')[0].split('#')[0];
        if (raw === '/' || raw.includes('.')) return next();
        const clean = raw.replace(/\/+$/, '') || '/';
        if (existsSync(join(distDir, clean, 'index.html'))) {
          req.url = `${clean}/index.html`;
          return next();
        }
        res.statusCode = 404;
        res.setHeader('content-type', 'text/html; charset=utf-8');
        res.setHeader('cache-control', 'no-store');
        createReadStream(join(distDir, '404.html')).pipe(res);
      });
    },
  };
}

export default defineConfig({
  base,
  define: { 'import.meta.env.SITE_URL': JSON.stringify(siteUrl) },
  resolve: {
    // `styles/fonts.css` references the woff2 files inside the @fontsource
    // packages through this alias; plain relative paths into node_modules are
    // left untouched by Vite's css url resolver for some packages.
    alias: {
      '@fonts': fileURLToPath(new URL('./node_modules/@fontsource', import.meta.url)),
    },
  },
  plugins: [react(), staticHostSimulation()],
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    cssMinify: true,
    // The site is content, not an app shell: one small JS entry and one CSS file
    // are the whole critical path.
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5199,
    allowedHosts: true,
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
    allowedHosts: true,
  },
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    css: false,
  },
});
