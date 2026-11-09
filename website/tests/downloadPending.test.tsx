import { describe, expect, it, vi } from 'vitest';

/**
 * The redesigned page must keep its honest pending state: with an unreleased
 * manifest there are no links, no sizes and no invented dates — just disabled
 * buttons and the explanation. The live state is covered by
 * downloadLinks.test.tsx and by the real-manifest suites.
 */

vi.mock('../src/releases.json', () => ({
  default: {
    channel: 'unreleased',
    latest: null,
    published: [],
    development: [
      {
        version: '1.0.0',
        date: '2026-11-08',
        status: 'development',
        summary: 'Development note.',
      },
    ],
  },
}));

const { renderRoute } = await import('./helpers');

describe('download page with nothing published', () => {
  const html = renderRoute('/download');

  it('keeps both buttons disabled and renders no executable links', () => {
    expect(html.match(/disabled=""/g)?.length).toBe(2);
    expect(html).not.toMatch(/href="[^"]*\.exe/i);
    expect(html).not.toContain('releases/download/');
  });

  it('says plainly that nothing has shipped', () => {
    expect(html).toContain('No verified build has been published yet');
    expect(html.match(/coming soon/g)?.length).toBe(2);
    // No release strip, no facts, no verify disclosures.
    expect(html).not.toContain('Latest stable release');
    expect(html).not.toContain('dl-release-strip');
    expect(html).not.toContain('Verify download');
    // Every fact slot is honest: size dashes and "Version —" on both panels.
    expect(html.match(/>—</g)?.length).toBe(2);
    expect(html.match(/Version —/g)?.length).toBe(2);
  });

  it('keeps the structure the live state will fill in', () => {
    expect(html).toContain('Download crshhx</h1>');
    expect(html).toContain('Windows Installer');
    expect(html).toContain('Portable Version');
    expect(html).toContain('Install in three steps');
    expect(html).toContain('System requirements');
  });
});
