import { Link } from 'react-router-dom';
import { Reticle } from '../components/Reticle';

export function NotFoundPage() {
  return (
    <section className="band world-field nf">
      <div className="container">
        <div className="nf-reticle">
          <Reticle
            spec={{ color: '#3d434c', length: 6, thickness: 2, gap: 10, dot: true, dotSize: 3 }}
            size={120}
          />
        </div>
        <p className="nf-code" aria-hidden="true">
          404
        </p>
        <h1>This page is off-centre.</h1>
        <p>
          The address you followed does not exist on this site. The crosshair, at least, is still
          exactly where it should be.
        </p>
        <div className="hero-cta">
          <Link className="btn btn-primary" to="/">
            Back to the home page
          </Link>
          <Link className="btn btn-secondary" to="/features">
            See what crshhx does
          </Link>
        </div>
      </div>
    </section>
  );
}
