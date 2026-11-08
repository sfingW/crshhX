import React from 'react';
import ReactDOM from 'react-dom/client';

/*
 * Self-hosted webfonts.
 *
 * These used to come from fonts.googleapis.com via a <link> in index.html, which
 * meant the studio waited on the network to render correctly and quietly fell
 * back to a system font when offline — a packaged app has no business depending
 * on a third-party CDN to draw its own UI.
 *
 * The packages register exactly the same family names the Tailwind stacks already
 * reference ('Inter' and 'JetBrains Mono'), at exactly the weights the previous
 * Google Fonts URL requested, with the same `font-display: swap` and the same
 * unicode-range subsetting. Nothing about how the UI looks changes.
 *
 * Only the latin and latin-ext subsets are bundled; the other scripts Google
 * served were never reachable from this interface and would have added weight for
 * nothing. The overlay window renders a reticle and no text, so it imports none
 * of this.
 */
import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-500.css';
import '@fontsource/inter/latin-600.css';
import '@fontsource/inter/latin-700.css';
import '@fontsource/inter/latin-800.css';
import '@fontsource/inter/latin-ext-400.css';
import '@fontsource/inter/latin-ext-500.css';
import '@fontsource/inter/latin-ext-600.css';
import '@fontsource/inter/latin-ext-700.css';
import '@fontsource/inter/latin-ext-800.css';
import '@fontsource/jetbrains-mono/latin-400.css';
import '@fontsource/jetbrains-mono/latin-600.css';
import '@fontsource/jetbrains-mono/latin-700.css';
import '@fontsource/jetbrains-mono/latin-ext-400.css';
import '@fontsource/jetbrains-mono/latin-ext-600.css';
import '@fontsource/jetbrains-mono/latin-ext-700.css';

import { App } from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
