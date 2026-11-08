import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { NAV_LINKS } from '../site';
import { BrandMark } from './Brand';
import { IconClose, IconDownload, IconMenu } from './icons';

const HEADER_LINKS = NAV_LINKS.filter((route) => route.path !== '/download');

export function Nav() {
  const [open, setOpen] = useState(false);
  const [progress, setProgress] = useState(0);
  const { pathname } = useLocation();

  useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  return (
    <header className="nav">
      <span
        className="nav-progress"
        style={{ transform: `scaleX(${progress})` }}
        aria-hidden="true"
      />
      <div className="container nav-inner">
        <Link
          className="brand"
          to="/"
          onClick={() => setOpen(false)}
          aria-label="crshhx — home"
        >
          <BrandMark />
          <span>crshhx</span>
          <span className="brand-suffix">for Windows</span>
        </Link>

        <nav className="nav-links" aria-label="Primary">
          {HEADER_LINKS.map((route) => (
            <NavLink
              key={route.path}
              className="nav-link"
              to={route.path}
              end={route.path === '/'}
              onClick={() => setOpen(false)}
            >
              {route.label}
            </NavLink>
          ))}
          <Link
            className="btn btn-primary btn-sm nav-cta"
            to="/download"
            aria-current={pathname === '/download' ? 'page' : undefined}
            onClick={() => setOpen(false)}
          >
            <IconDownload />
            Download
          </Link>
        </nav>

        <button
          type="button"
          className="nav-burger"
          aria-expanded={open}
          aria-controls="site-menu"
          aria-label={open ? 'Close navigation' : 'Open navigation'}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <IconClose /> : <IconMenu />}
        </button>
      </div>

      {open ? (
        <nav id="site-menu" className="nav-menu" aria-label="Primary, mobile">
          {NAV_LINKS.map((route) => (
            <NavLink
              key={route.path}
              className="nav-menu-link"
              to={route.path}
              end={route.path === '/'}
              onClick={() => setOpen(false)}
            >
              {route.label}
            </NavLink>
          ))}
          <Link className="btn btn-primary" to="/download" onClick={() => setOpen(false)}>
            <IconDownload />
            Download for Windows
          </Link>
        </nav>
      ) : null}
    </header>
  );
}
