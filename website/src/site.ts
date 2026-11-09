/**
 * Identity and route table for the crshhx website.
 *
 * Everything here is read by both the client bundle and the prerender script, so
 * a route's title, description and navigation entry can never drift apart.
 */

export const SITE = {
  name: 'crshhx',
  productName: 'Crshhx Crosshair Studio',
  /**
   * Set `SITE_URL` in the deploy environment. Until a domain exists this stays
   * empty and the prerender omits `canonical` / `og:url` rather than pointing
   * them at a placeholder — a wrong canonical is worse than none.
   */
  url: (import.meta.env.SITE_URL as string | undefined) ?? '',
  repository: 'https://github.com/sfingW/crshhX',
  /** Content date for the sitemap. Bumped by hand when pages change. */
  updated: '2026-11-08',
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
    path: '/download',
    label: 'Download',
    title: 'Download — crshhx for Windows',
    description:
      'Download crshhx for Windows 10 and 11 (64-bit). The page lists the current release — an installer and a portable executable — with measured sizes, SHA-256 checksums, installation steps and system requirements, straight from the release manifest.',
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
      'Release history for crshhx. Nothing has been published yet; development notes from the repository are listed separately and clearly labelled as unpublished.',
  },
];

/** Header and footer navigation, in display order. */
export const NAV_LINKS: readonly RouteMeta[] = ROUTES;

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
