import { StrictMode } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

// Self-hosted static fonts: latin subsets, woff2 only (see styles/fonts.css).
import './styles/fonts.css';

import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';
import './styles/pages.css';

import { App } from './App';

const root = document.getElementById('root');

// `BASE_URL` is '/' for a domain root and '/project/' for a path-prefixed host
// such as GitHub Pages. React Router wants it without the trailing slash.
const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || '/';

// Opt into the v7 behaviours now so the upgrade is a version bump, not a
// behaviour change, and so React Router stops warning about them.
const ROUTER_FUTURE = { v7_startTransition: true, v7_relativeSplatPath: true } as const;

if (root) {
  hydrateRoot(
    root,
    <StrictMode>
      <BrowserRouter basename={basename} future={ROUTER_FUTURE}>
        <App />
      </BrowserRouter>
    </StrictMode>,
  );
}
