import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { fontFallbackPlugin } from './vite/fontFallbacks';

export default defineConfig({
  plugins: [react(), fontFallbackPlugin()],
  base: './',
  build: {
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),
        overlay: resolve(__dirname, 'overlay.html'),
      },
    },
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    strictPort: true,
    /*
     * Dev-server only — none of this affects the packaged app, which loads
     * built files from disk through Electron.
     *
     * Binding to all interfaces lets the studio be opened from another machine
     * or a proxied preview environment. Vite's Host-header check is relaxed to
     * match, so the page still loads when it is served under a hostname other
     * than localhost. Treat the dev server as trusted-network only.
     */
    host: true,
    allowedHosts: true,
  },
});
