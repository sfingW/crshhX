/**
 * Identity and route table for the crshhx website.
 *
 * Everything here is read by both the client bundle and the prerender script, so
 * a route's title, description and navigation entry can never drift apart.
 */

/**
 * Public origin.
 *
 * `SITE_URL` in the deploy environment still wins, so a purchased domain or a
 * path-prefixed host needs no code change. It falls back to the origin that is
 * actually serving this site in production, which was verified by fetching it
 * rather than assumed: https://crshhx.pages.dev
 *
 * This used to fall back to an empty string, on the reasoning that a wrong
 * canonical is worse than none. That reasoning was right while no origin
 * existed, but the site has been live at this origin since v1.1.0, and the
 * empty fallback was silently dropping `canonical`, `og:url` and `sitemap.xml`
 * from every page in production. The build said so — `origin=(unset —
 * canonical and og:url omitted)` — and nothing caught it, because no CI job
 * ran the website build. Defaulting it here fixes the metadata without needing
 * access to the host's dashboard.
 *
 * If a real domain is purchased, set `SITE_URL` and this default is overridden.
 * If the Pages project is ever renamed, this string has to change with it.
 */
const DEFAULT_ORIGIN = 'https://crshhx.pages.dev';
const ORIGIN_FROM_ENV = ((import.meta.env.SITE_URL as string | undefined) ?? '').replace(
  /\/+$/,
  '',
);

export const SITE = {
  name: 'crshhx',
  productName: 'Crshhx Crosshair Studio',
  url: ORIGIN_FROM_ENV || DEFAULT_ORIGIN,
  repository: 'https://github.com/sfingW/crshhX',
  /** Content date for the sitemap. Bumped by hand when pages change. */
  updated: '2026-11-09',
} as const;

export interface RouteMeta {
  path: string;
  /** Short label used in navigation. */
  label: string;
  title: string;
  description: string;
}

export const ROUTES: readonly RouteMeta[] = [
  {
    path: '/',
    label: 'Home',
    title: 'crshhx — crosshair overlay and editor for Windows',
    description:
      'crshhx is a local-first Windows application for designing, organising and switching gaming crosshairs: a live overlay, a per-arm editor, preset libraries and weapon-slot keybinds. No account, no telemetry.',
  },
  {
    path: '/features',
    label: 'Features',
    title: 'Features — crshhx crosshair studio for Windows',
    description:
      'What crshhx actually does: a per-arm crosshair editor with undo and A/B compare, preset folders and favourites, versioned import and export, game profiles, weapon-slot switching and overlay controls.',
  },
  {
    path: '/pro-crosshairs',
    label: 'Pro Crosshairs',
    title: 'Pro Crosshairs — 42 curated designs in crshhx',
    description:
      'The 42 curated crosshair designs built into crshhx, across 8 categories plus a two-design Gold Series, with an interactive preview bench. No design is attributed to a named player unless that player published it themselves.',
  },
  {
    path: '/academy',
    label: 'Academy',
    title: 'Crosshair Academy — the tutorials inside crshhx',
    description:
      'The 10 tutorials built into crshhx, from first launch to weapon-slot switching, each with live editable demos and clearly labelled illustrations. Read the curriculum before you install.',
  },
  {
    path: '/download',
    label: 'Download',
    title: 'Download — crshhx for Windows',
    description:
      'Download crshhx for Windows 10 and 11 (64-bit). The current release as an installer and a portable executable, with measured sizes, SHA-256 checksums, installation steps and system requirements — straight from the release manifest.',
  },
  {
    path: '/docs',
    label: 'Documentation',
    title: 'Documentation — crshhx crosshair studio',
    description:
      'Documentation for crshhx: installation, the crosshair editor, preset management, importing and exporting, game profiles, weapon-slot switching, troubleshooting and frequently asked questions.',
  },
  {
    path: '/changelog',
    label: 'Changelog',
    title: 'Changelog — crshhx release history',
    description:
      'Release history for crshhx, rendered from the repository’s release manifest: v1.1.0 published for Windows with measured file sizes and SHA-256 checksums, and earlier development notes listed separately and labelled as unpublished.',
  },
];

/** Header and footer navigation, in display order. */
export const NAV_LINKS: readonly RouteMeta[] = ROUTES;

/**
 * The routes shown as text links in the header. Home is the brand, and Download
 * is the call to action at the end of the bar, so neither is repeated as a link.
 */
export const HEADER_LINKS: readonly RouteMeta[] = ROUTES.filter(
  (route) => route.path !== '/' && route.path !== '/download',
);

export const NOT_FOUND_PATH = '/404';

/**
 * Caption shown with every interface mockup. The site ships no application
 * screenshots yet, and a mockup must never be presented as one.
 */
export const MOCK_DISCLOSURE =
  'Illustrative interface preview, rendered from the application’s real parameters — not a screenshot.';

export function routeFor(path: string): RouteMeta | undefined {
  return ROUTES.find((route) => route.path === path);
}

/* ---------------------------------------------------------------- releases */

/** One downloadable file produced by the release workflow. */
export interface ReleaseArtifact {
  /** Exact published filename, e.g. `crshhx-Setup-1.0.0.exe`. */
  file: string;
  /** Absolute URL. Only present once the artifact has been verified. */
  url?: string;
  /** Measured byte size reported by the release workflow. */
  size?: number;
  /** Lowercase hex SHA-256 printed by the release workflow. */
  sha256?: string;
}

export interface ReleaseEntry {
  version: string;
  /** ISO date, e.g. `2026-11-08`. */
  date: string;
  /**
   * `published` means an artifact exists and is downloadable. `unreleased` and
   * `development` mean the changes are in the repository only.
   */
  status: 'published' | 'unreleased' | 'development';
  summary?: string;
  added?: string[];
  improved?: string[];
  fixed?: string[];
  artifacts?: ReleaseArtifact[];
}

export interface ReleaseManifest {
  /** `released` only when a verified build is public; otherwise `unreleased`. */
  channel: 'released' | 'unreleased';
  /** Version currently downloadable, or null while nothing has shipped. */
  latest: string | null;
  published: ReleaseEntry[];
  /** Repository changes that are not part of any downloadable build. */
  development: ReleaseEntry[];
}

/* ------------------------------------------------------- release lookups */

/**
 * The entry `latest` names, but only when it is genuinely published. Pages use
 * this to decide between honest "coming soon" copy and real download links —
 * a null here means nothing is downloadable, anywhere on the site.
 */
export function latestPublishedEntry(manifest: ReleaseManifest): ReleaseEntry | null {
  if (manifest.channel !== 'released' || !manifest.latest) return null;
  const entry = manifest.published.find((candidate) => candidate.version === manifest.latest);
  return entry && entry.status === 'published' ? entry : null;
}

/** Finds the artifact for one distribution by the shape of its filename. */
export function pickArtifact(
  entry: ReleaseEntry | null,
  kind: 'setup' | 'portable',
): ReleaseArtifact | null {
  if (!entry) return null;
  const pattern = kind === 'setup' ? /setup/i : /portable/i;
  return entry.artifacts?.find((artifact) => pattern.test(artifact.file)) ?? null;
}

/** True only when the file itself is published and verified with a URL. */
export function isDownloadable(artifact: ReleaseArtifact | null): boolean {
  return Boolean(artifact?.url);
}
