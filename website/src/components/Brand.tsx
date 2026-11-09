import { SITE } from '../site';

/**
 * The mark is drawn from the application icon: an ink field, a pale ring and a
 * four-arm reticle with a centre dot. The site drops the field and keeps the
 * ring and reticle, so the wordmark reads at 26px in the header and at 256px as
 * an app tile.
 *
 * The colours are the application's own accent, `--brand-accent: #00e599` from
 * `src/studio/index.css`, and its brighter hover value. The previous mark used a
 * paler mint that appears nowhere in the product.
 */
export function BrandMark({ size = 26 }: { size?: number }) {
  return (
    <svg
      className="brand-mark"
      width={size}
      height={size}
      viewBox="0 0 48 48"
      role="img"
      aria-label={`${SITE.name} logo`}
    >
      <circle cx="24" cy="24" r="21" fill="none" stroke="#4cf0bc" strokeWidth="2" opacity="0.5" />
      <g fill="#00e599">
        <rect x="21" y="7" width="6" height="12" rx="3" />
        <rect x="21" y="29" width="6" height="12" rx="3" />
        <rect x="7" y="21" width="12" height="6" rx="3" />
        <rect x="29" y="21" width="12" height="6" rx="3" />
        <circle cx="24" cy="24" r="3.4" />
      </g>
    </svg>
  );
}

export function BrandLockup() {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
      <BrandMark />
      <span>{SITE.name}</span>
      <span className="brand-suffix">for Windows</span>
    </span>
  );
}
