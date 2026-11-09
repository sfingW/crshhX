import { Link } from 'react-router-dom';
import { SITE } from '../site';
import type { ReleaseManifest } from '../site';
import { latestPublishedEntry } from '../site';
import data from '../releases.json';
import { CATALOGUE } from '../catalogue';
import { BrandMark } from './Brand';

const manifest = data as unknown as ReleaseManifest;
const latestEntry = latestPublishedEntry(manifest);

export function Footer() {
  const year = Number(SITE.updated.slice(0, 4));

  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <span className="brand">
              <BrandMark />
              <span>{SITE.name}</span>
            </span>
            <p className="footer-blurb">
              A crosshair overlay and editor for Windows, built around one boundary: the game
              is dark, the editor is precise, and the reticle sits between them. Everything is
              stored on your machine — no account, no telemetry, no cloud dependency.
            </p>
          </div>

          <nav aria-label="Product">
            <h2 className="footer-col-title">Product</h2>
            <Link className="footer-link" to="/features">
              Features
            </Link>
            <Link className="footer-link" to="/pro-crosshairs">
              Pro Crosshairs
            </Link>
            <Link className="footer-link" to="/academy">
              Crosshair Academy
            </Link>
            <Link className="footer-link" to="/download">
              Download
            </Link>
          </nav>

          <nav aria-label="Resources">
            <h2 className="footer-col-title">Resources</h2>
            <Link className="footer-link" to="/docs">
              Documentation
            </Link>
            <Link className="footer-link" to="/docs#troubleshooting">
              Troubleshooting
            </Link>
            <Link className="footer-link" to="/docs#faq">
              Frequently asked questions
            </Link>
            <Link className="footer-link" to="/changelog">
              Changelog
            </Link>
            <a className="footer-link" href={SITE.repository} rel="noopener noreferrer">
              Source repository
            </a>
          </nav>
        </div>

        <div className="footer-base">
          <span>
            © {year} {SITE.productName}. Windows 10 and 11, 64-bit. {CATALOGUE.vault.total}{' '}
            built-in presets, {CATALOGUE.pro.total} curated designs, {CATALOGUE.academy.total}{' '}
            tutorials.
          </span>
          {latestEntry ? (
            <span className="pill ok">{`v${latestEntry.version} — released ${latestEntry.date}`}</span>
          ) : (
            <span className="pill pending">v1.0.0 in development — not yet released</span>
          )}
        </div>
      </div>
    </footer>
  );
}
