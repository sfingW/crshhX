import { describe, expect, it } from 'vitest';
import data from '../src/releases.json';
import type { ReleaseEntry, ReleaseManifest } from '../src/site';

const manifest = data as unknown as ReleaseManifest;

const everyEntry = (): ReleaseEntry[] => [...manifest.published, ...manifest.development];

describe('release manifest', () => {
  it('declares its channel and current version', () => {
    expect(['released', 'unreleased']).toContain(manifest.channel);
    expect(Array.isArray(manifest.published)).toBe(true);
    expect(Array.isArray(manifest.development)).toBe(true);
  });

  it('does not claim a release that does not exist', () => {
    if (manifest.channel === 'unreleased') {
      expect(manifest.latest).toBeNull();
      expect(manifest.published).toHaveLength(0);
    } else {
      expect(manifest.latest).toBeTruthy();
      expect(manifest.published.length).toBeGreaterThan(0);
      expect(manifest.published[manifest.published.length - 1].version).toBe(manifest.latest);
    }
  });

  it('gives every entry a version, an ISO date and a status', () => {
    expect(everyEntry().length).toBeGreaterThan(0);
    for (const entry of everyEntry()) {
      expect(entry.version).toMatch(/^\d+\.\d+\.\d+(-[\w.]+)?$/);
      expect(entry.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Number.isNaN(Date.parse(entry.date))).toBe(false);
      expect(['published', 'unreleased', 'development']).toContain(entry.status);
    }
  });

  it('only marks an entry published when a real artifact backs it', () => {
    for (const entry of everyEntry()) {
      if (entry.status === 'published') {
        expect(entry.artifacts?.length ?? 0).toBeGreaterThan(0);
        for (const artifact of entry.artifacts ?? []) {
          expect(artifact.file).toMatch(/\.exe$/);
          expect(artifact.url).toMatch(/^https:\/\//);
          expect(artifact.sha256).toMatch(/^[0-9a-f]{64}$/);
          expect(artifact.size).toBeGreaterThan(1024);
        }
      } else {
        expect(manifest.published).not.toContain(entry);
      }
    }
  });

  it('never attaches a download URL while nothing has shipped', () => {
    if (manifest.latest === null) {
      for (const entry of everyEntry()) {
        expect(entry.artifacts ?? []).toHaveLength(0);
      }
      expect(JSON.stringify(manifest)).not.toMatch(/\.exe/);
      expect(JSON.stringify(manifest)).not.toMatch(/https:\/\/[^"]*download/i);
    }
  });

  it('separates development notes from published releases', () => {
    for (const entry of manifest.development) {
      expect(entry.status).not.toBe('published');
    }
    for (const entry of manifest.published) {
      expect(manifest.development).not.toContain(entry);
    }
  });

  it('describes what changed in each entry', () => {
    for (const entry of everyEntry()) {
      const lines = [...(entry.added ?? []), ...(entry.improved ?? []), ...(entry.fixed ?? [])];
      expect(lines.length).toBeGreaterThan(0);
      for (const line of lines) {
        expect(line.length).toBeGreaterThan(20);
        expect(line.endsWith('.')).toBe(true);
      }
    }
  });

  it('does not promise anti-cheat safety or universal compatibility in release notes', () => {
    const text = JSON.stringify(manifest).toLowerCase();
    for (const banned of [
      'anti-cheat safe',
      'anti-cheat friendly',
      'guaranteed',
      'works with every game',
      'undetected',
      'ban-proof',
    ]) {
      expect(text).not.toContain(banned);
    }
  });
});
