import { Link } from 'react-router-dom';
import { NAV_LINKS, SITE } from '../site';
import { BrandMark } from './Brand';

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
              A crosshair overlay and editor for Windows. Everything is stored on your
              machine: no account, no telemetry, no cloud dependency.
            </p>
          </div>

          <nav aria-label="Product">
            <h2 className="footer-col-title">Product</h2>
            {NAV_LINKS.filter((route) => route.path !== '/docs').map((route) => (
              <Link key={route.path} className="footer-link" to={route.path}>
                {route.label}
              </Link>
            ))}
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
            <a className="footer-link" href={SITE.repository} rel="noopener noreferrer">
              Source repository
            </a>
          </nav>
        </div>

        <div className="footer-base">
          <span>
            © {year} {SITE.productName}. Windows 10 and 11, 64-bit.
          </span>
          <span className="pill pending">v1.0.0 in development — not yet released</span>
        </div>
      </div>
    </footer>
  );
}
