import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join, resolve } from 'path';

import { APP_VERSION } from '../src/lib/presetTransfer';

/**
 * Release-version consistency.
 *
 * v1.1.0 shipped with three different answers to "what version is this?".
 * package.json said 1.1.0. package-lock.json's root entry still said 1.0.0,
 * because it had not been touched since the repository's first commit. And
 * every export file the application wrote was stamped `appVersion: 1.0.0`, so
 * a library exported from the released build reported itself as coming from a
 * version that had never been published.
 *
 * None of that failed anything — no typecheck, no test, no build, no packaging
 * run — because nothing asked. The installer was still named correctly, and
 * only by luck of design: electron-builder interpolates `${version}` from
 * package.json rather than carrying its own copy.
 *
 * These tests ask. They pin the sources to *each other* instead of to a
 * literal, so bumping to 1.3.0 needs no edit here: the version is allowed to
 * move, a disagreement between the places that record it is not.
 */

const ROOT = resolve(__dirname, '..');

function readJson(relative: string): Record<string, any> {
  return JSON.parse(readFileSync(join(ROOT, relative), 'utf8'));
}

const packageJson = readJson('package.json');
const lock = readJson('package-lock.json');
const builderYml = readFileSync(join(ROOT, 'electron-builder.yml'), 'utf8');
const websiteReleases = readJson('website/src/releases.json');

/** The version every artefact, tag and metadata field is derived from. */
const version = String(packageJson.version);

/** Numeric semver compare, without a dependency: -1, 0 or 1. */
function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i += 1) {
    if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) < (pb[i] ?? 0) ? -1 : 1;
  }
  return 0;
}

describe('release version: one answer, everywhere it is recorded', () => {
  it('is a plain x.y.z release, because it becomes a git tag and two filenames', () => {
    // A prerelease or build suffix would land in `v${tag}`, in the artefact
    // names and in the download URL, none of which are quoted for anything but
    // a plain release version.
    expect(version).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('agrees with the lockfile root that npm ci installs from', () => {
    expect(String(lock.name)).toBe(String(packageJson.name));
    expect(String(lock.version)).toBe(version);
    expect(String(lock.packages[''].version)).toBe(version);
  });

  it('agrees with the provenance stamp written into every export file', () => {
    expect(APP_VERSION).toBe(version);
  });
});

describe('release version: what it feeds', () => {
  it('names both Windows artefacts by interpolation, never by a literal', () => {
    expect(builderYml).toContain('artifactName: crshhx-crosshair-studio-setup-${version}.exe');
    expect(builderYml).toContain('artifactName: crshhx-crosshair-studio-portable-${version}.exe');
    // No version number appears anywhere in the packaging configuration: a
    // literal here would keep shipping the old filename after every bump, and
    // the website's download links would point at a file that does not exist.
    expect(builderYml).not.toMatch(/\d+\.\d+\.\d+/);
  });

  it('has release notes, so a version cannot be bumped without writing them', () => {
    const notes = join(ROOT, 'docs', 'release-notes', `v${version}.md`);
    expect(
      existsSync(notes),
      `docs/release-notes/v${version}.md is missing: write the release notes for ${version} before bumping to it`,
    ).toBe(true);
  });

  it('quotes its own version in those notes, so the document cannot describe another release', () => {
    const text = readFileSync(join(ROOT, 'docs', 'release-notes', `v${version}.md`), 'utf8');
    expect(text).toContain(version);
  });
});

describe('release version: the website may lag, but never lead', () => {
  /**
   * The download page is generated from `website/src/releases.json`, and it is
   * updated only once a release is actually published with measured sizes and
   * SHA-256 digests. So during release preparation it is *expected* to name the
   * previous version — advertising an artefact nobody can download yet is the
   * failure mode this guards, not the lag itself.
   */
  it('never advertises a version the application has not reached', () => {
    const latest = String(websiteReleases.latest);
    expect(latest).toMatch(/^\d+\.\d+\.\d+$/);
    expect(
      compareVersions(latest, version),
      `website advertises ${latest} but the application is ${version}: publish the release before updating the site`,
    ).toBeLessThanOrEqual(0);
  });

  it('only lists artefacts whose filenames carry the version they claim', () => {
    for (const entry of websiteReleases.published as Array<Record<string, any>>) {
      for (const artifact of entry.artifacts as Array<Record<string, any>>) {
        expect(String(artifact.file)).toContain(String(entry.version));
        expect(String(artifact.url)).toContain(`/v${entry.version}/`);
        // Sizes and digests are measured from the built executables, never
        // estimated: a wrong digest is worse than none, because it trains
        // people to ignore the one.
        expect(Number(artifact.size)).toBeGreaterThan(1_000_000);
        expect(String(artifact.sha256)).toMatch(/^[0-9a-f]{64}$/);
      }
    }
  });
});
