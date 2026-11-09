interface IconProps {
  /** Decorative by default; pass a title to make it announced. */
  title?: string;
}

function base(title: string | undefined) {
  return {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.6,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': title ? undefined : true,
    role: title ? 'img' : undefined,
  };
}

export function IconCrosshair({ title }: IconProps) {
  return (
    <svg {...base(title)}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 3.5v5M12 15.5v5M3.5 12h5M15.5 12h5" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconEditor({ title }: IconProps) {
  return (
    <svg {...base(title)}>
      <path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3Z" />
      <path d="M13.5 6.5l3 3" />
    </svg>
  );
}

export function IconFolders({ title }: IconProps) {
  return (
    <svg {...base(title)}>
      <path d="M3 7.5V6a1.5 1.5 0 0 1 1.5-1.5H9l2 2.5h8.5A1.5 1.5 0 0 1 21 8.5V18a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18V7.5Z" />
      <path d="M3 11h18" />
    </svg>
  );
}

export function IconTransfer({ title }: IconProps) {
  return (
    <svg {...base(title)}>
      <path d="M4 8h13l-3-3M20 16H7l3 3" />
    </svg>
  );
}

export function IconTarget({ title }: IconProps) {
  return (
    <svg {...base(title)}>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="12" cy="12" r="0.8" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconKeyboard({ title }: IconProps) {
  return (
    <svg {...base(title)}>
      <rect x="3" y="7" width="18" height="11" rx="2" />
      <path d="M7 11h.01M11 11h.01M15 11h.01M8 14.5h8" />
    </svg>
  );
}

export function IconMonitor({ title }: IconProps) {
  return (
    <svg {...base(title)}>
      <rect x="3" y="4.5" width="18" height="12" rx="1.8" />
      <path d="M9.5 20h5M12 16.5V20" />
    </svg>
  );
}

export function IconDownload({ title }: IconProps) {
  return (
    <svg {...base(title)}>
      <path d="M12 4v10m0 0 4-4m-4 4-4-4M4.5 19h15" />
    </svg>
  );
}

export function IconArrow({ title }: IconProps) {
  return (
    <svg {...base(title)}>
      <path d="M5 12h14m0 0-5-5m5 5-5 5" />
    </svg>
  );
}

export function IconMenu({ title }: IconProps) {
  return (
    <svg {...base(title)}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

export function IconClose({ title }: IconProps) {
  return (
    <svg {...base(title)}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export function IconAlert({ title }: IconProps) {
  return (
    <svg {...base(title)}>
      <path d="M12 4.5 21 19.5H3L12 4.5Z" />
      <path d="M12 10v4M12 16.8v.2" />
    </svg>
  );
}

export function IconDoc({ title }: IconProps) {
  return (
    <svg {...base(title)}>
      <path d="M6 3.5h8l4 4V20.5H6V3.5Z" />
      <path d="M14 3.5v4h4M9 12h6M9 15.5h6" />
    </svg>
  );
}

/** Window-control glyphs for the product mockups (Windows-style, minimal). */
export function WinGlyphs() {
  return (
    <span className="mock-win" aria-hidden="true">
      <svg viewBox="0 0 10 10"><path d="M1 5h8" fill="none" stroke="currentColor" strokeWidth="1.2" /></svg>
      <svg viewBox="0 0 10 10"><rect x="1.2" y="1.2" width="7.6" height="7.6" fill="none" stroke="currentColor" strokeWidth="1.2" /></svg>
      <svg viewBox="0 0 10 10"><path d="M2 2l6 6M8 2l-6 6" fill="none" stroke="currentColor" strokeWidth="1.2" /></svg>
    </span>
  );
}

/** Favourites, as the application's Saved & Favorites view. */
export function IconStar({ title }: IconProps) {
  return (
    <svg {...base(title)}>
      <path d="M12 4.5l2.3 4.9 5.2.7-3.8 3.7.9 5.2-4.6-2.6-4.6 2.6.9-5.2L4.5 10l5.2-.7L12 4.5Z" />
    </svg>
  );
}

/** The Pro Crosshairs catalogue. */
export function IconTrophy({ title }: IconProps) {
  return (
    <svg {...base(title)}>
      <path d="M8 4.5h8v4a4 4 0 0 1-8 0v-4Z" />
      <path d="M8 6H5.5v1.5A3 3 0 0 0 8 10.4M16 6h2.5v1.5A3 3 0 0 1 16 10.4" />
      <path d="M12 12.5v3.5M9 19.5h6M10 16h4l.7 3.5h-5.4L10 16Z" />
    </svg>
  );
}

/** The Crosshair Academy. */
export function IconBook({ title }: IconProps) {
  return (
    <svg {...base(title)}>
      <path d="M4 5.5h6a2 2 0 0 1 2 2v11a2 2 0 0 0-2-2H4v-11Z" />
      <path d="M20 5.5h-6a2 2 0 0 0-2 2v11a2 2 0 0 1 2-2h6v-11Z" />
    </svg>
  );
}

/** Monitor placement and stretched-resolution compensation. */
export function IconMove({ title }: IconProps) {
  return (
    <svg {...base(title)}>
      <path d="M12 3.5v17M3.5 12h17" />
      <path d="M12 3.5 9.8 6M12 3.5 14.2 6M12 20.5 9.8 18M12 20.5l2.2-2.5M3.5 12 6 9.8M3.5 12 6 14.2M20.5 12 18 9.8M20.5 12 18 14.2" />
    </svg>
  );
}

/** The Ban-Safety Audit view: what the overlay does and does not touch. */
export function IconShield({ title }: IconProps) {
  return (
    <svg {...base(title)}>
      <path d="M12 3.5 19 6v5.5c0 4-3 7.2-7 9-4-1.8-7-5-7-9V6l7-2.5Z" />
      <path d="M9.2 12.2 11.3 14.3 15 10.6" />
    </svg>
  );
}
