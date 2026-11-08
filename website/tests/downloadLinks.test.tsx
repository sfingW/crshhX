import { describe, expect, it, vi } from 'vitest';

/**
 * The download page must turn into DIRECT file links the moment the manifest
 * carries verified artifacts: clicking the button downloads the .exe itself —
 * no zip detour, no release page to hunt through. This suite mocks a published
 * manifest; the real (unreleased) manifest's honest empty state is pinned by
 * hydration.test.tsx.
 */

const publishedManifest = {
  channel: 'released',
  latest: '1.0.0',
  published: [
    {
      version: '1.0.0',
      date: '2026-11-08',
      status: 'published',
      summary: 'First verified Windows build.',
      artifacts: [
        {
          file: 'crshhx-crosshair-studio-setup-1.0.0.exe',
          url: 'https://github.com/sfingW/crshhX/releases/download/v1.0.0/crshhx-crosshair-studio-setup-1.0.0.exe',
          size: 92274688,
          sha256: 'a'.repeat(64),
        },
        {
          file: 'crshhx-crosshair-studio-portable-1.0.0.exe',
          url: 'https://github.com/sfingW/crshhX/releases/download/v1.0.0/crshhx-crosshair-studio-portable-1.0.0.exe',
          size: 93323264,
          sha256: 'b'.repeat(64),
        },
      ],
    },
  ],
  development: [],
};

vi.mock('../src/releases.json', () => ({ default: publishedManifest }));

const { renderRoute } = await import('./helpers');

describe('download page with a published manifest', () => {
  const html = renderRoute('/download');

  it('links the buttons straight at the exe files, with a download attribute', () => {
    const anchors = [...html.matchAll(/<a[^>]*class="btn btn-(?:primary|secondary)"[^>]*>/g)].map(
      (match) => match[0],
    );
    const installer = anchors.find((tag) => tag.includes('studio-setup-1.0.0.exe'));
    const portable = anchors.find((tag) => tag.includes('studio-portable-1.0.0.exe'));
    expect(installer).toBeTruthy();
    expect(portable).toBeTruthy();
    for (const anchor of [installer, portable]) {
      expect(anchor).toContain('download="crshhx-crosshair-studio');
      expect(anchor).toContain('https://github.com/sfingW/crshhX/releases/download/');
    }
  });

  it('drops the disabled placeholders entirely', () => {
    expect(html).not.toContain('disabled');
    expect(html).not.toContain('coming soon');
    expect(html).not.toContain('No verified build has been published yet');
  });

  it('shows the measured facts from the manifest, nothing invented', () => {
    expect(html).toContain('1.0.0');
    expect(html).toContain('2026-11-08');
    expect(html).toContain('88.0 MB');
    expect(html).toContain('89.0 MB');
    expect(html).toContain('a'.repeat(64));
    expect(html).toContain('b'.repeat(64));
    expect(html).toContain('available');
  });

  it('explains the one-click install instead of the retired wizard', () => {
    expect(html).toContain('Installing takes one double-click');
    expect(html).not.toContain('guided');
    expect(html).not.toContain('choose a directory');
    expect(html).not.toContain('You pick the install directory');
  });

  it('leads with the requested call-to-action pair', () => {
    // Primary button: direct installer download.
    expect(html).toMatch(
      /<a[^>]*class="btn btn-primary"[^>]*href="[^"]*studio-setup-1\.0\.0\.exe"[^>]*>/,
    );
    expect(html).toContain('Download for Windows');
    // Smaller secondary link: direct portable download.
    expect(html).toMatch(/<a[^>]*class="dl-portable-link"[^>]*studio-portable-1\.0\.0\.exe/);
    expect(html).toContain('Download portable version');
    // The unsigned-build warning is always part of the live state.
    expect(html).toContain('SmartScreen');
  });
});
