import { useEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { Footer } from './components/Footer';
import { Nav } from './components/Nav';
import { AcademyPage } from './pages/AcademyPage';
import { ChangelogPage } from './pages/ChangelogPage';
import { DocsPage } from './pages/DocsPage';
import { DownloadPage } from './pages/DownloadPage';
import { FeaturesPage } from './pages/FeaturesPage';
import { HomePage } from './pages/HomePage';
import { NotFoundPage } from './pages/NotFoundPage';
import { ProCrosshairsPage } from './pages/ProCrosshairsPage';
import { routeFor } from './site';

const NOT_FOUND_TITLE = 'Page not found — crshhx';

/**
 * The prerender already wrote the correct title and description into each
 * route's HTML, so this only has to keep them in step as the user navigates
 * client-side. It runs in an effect, never during render, so server and client
 * markup stay identical.
 */
function useDocumentMeta(pathname: string) {
  useEffect(() => {
    const meta = routeFor(pathname);
    document.title = meta ? meta.title : NOT_FOUND_TITLE;
    const description = document.querySelector('meta[name="description"]');
    if (description && meta) description.setAttribute('content', meta.description);
  }, [pathname]);
}

function useScrollRestoration(pathname: string, hash: string) {
  useEffect(() => {
    if (hash) {
      const target = document.getElementById(hash.slice(1));
      if (target) {
        target.scrollIntoView({ block: 'start' });
        return;
      }
    }
    window.scrollTo({ top: 0, left: 0 });
  }, [pathname, hash]);
}

export function App() {
  const { pathname, hash } = useLocation();
  useDocumentMeta(pathname);
  useScrollRestoration(pathname, hash);

  return (
    <>
      <a className="skip" href="#main">
        Skip to content
      </a>
      <Nav />
      <main id="main">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/features" element={<FeaturesPage />} />
          <Route path="/pro-crosshairs" element={<ProCrosshairsPage />} />
          <Route path="/academy" element={<AcademyPage />} />
          <Route path="/download" element={<DownloadPage />} />
          <Route path="/docs" element={<DocsPage />} />
          <Route path="/changelog" element={<ChangelogPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      <Footer />
    </>
  );
}
