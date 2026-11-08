import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { dirname, join, resolve } from 'path';

/**
 * Build-layout integrity.
 *
 * The Electron main process is compiled by `tsconfig.node.json` while the
 * renderer is bundled by Vite into a different directory. `electron/main.ts`
 * therefore has to reach across from its *compiled* location to the renderer
 * output. Getting that wrong does not fail any typecheck and does not break
 * `npm run dev` (dev loads from the Vite server) — it silently breaks the
 * packaged app, which loads `index.html` from disk.
 *
 * These tests pin the relationship down so a change to either build's output
 * directory cannot quietly orphan the production windows.
 */

const ROOT = resolve(__dirname, '..');

function readJson(relative: string): Record<string, unknown> {
  return JSON.parse(readFileSync(join(ROOT, relative), 'utf8'));
}

const packageJson = readJson('package.json');
const nodeTsConfig = readJson('tsconfig.node.json');
const mainSource = readFileSync(join(ROOT, 'electron/main.ts'), 'utf8');

const compilerOptions = nodeTsConfig.compilerOptions as { outDir: string; rootDir?: string };
const outDir = compilerOptions.outDir;
const rootDir = compilerOptions.rootDir ?? '.';

describe('build layout: package entry point', () => {
  it('points at where tsc actually emits electron/main.ts', () => {
    const expected = join(outDir, 'electron/main.js').split('\\').join('/');
    expect(String(packageJson.main).split('\\').join('/')).toBe(expected);
  });

  it('emits the preload next to main, which is where main looks for it', () => {
    const mainDir = dirname(String(packageJson.main));
    // main.ts resolves the preload relative to its own __dirname.
    expect(mainSource).toContain("path.join(__dirname, 'preload.js')");
    expect(mainDir).toBe(join(outDir, 'electron').split('\\').join('/'));
  });
});

describe('build layout: renderer path from the compiled main process', () => {
  /** Extracts the `path.join(__dirname, ...)` segments used for RENDERER_DIST. */
  function rendererDistSegments(): string[] {
    const match = /RENDERER_DIST\s*=\s*path\.join\(\s*__dirname\s*,([^)]*)\)/.exec(mainSource);
    if (!match) throw new Error('Could not find RENDERER_DIST in electron/main.ts');
    return [...match[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
  }

  it('resolves to the Vite output directory', () => {
    const segments = rendererDistSegments();
    const compiledMainDir = resolve(ROOT, dirname(String(packageJson.main)));
    const resolved = resolve(compiledMainDir, ...segments);

    // vite.config.ts writes the renderer bundle to <root>/dist.
    expect(resolved).toBe(resolve(ROOT, 'dist'));
  });

  it('does not point back inside the compiled main-process output', () => {
    const segments = rendererDistSegments();
    const compiledMainDir = resolve(ROOT, dirname(String(packageJson.main)));
    const resolved = resolve(compiledMainDir, ...segments);
    expect(resolved.startsWith(resolve(ROOT, outDir))).toBe(false);
  });

  it('uses RENDERER_DIST for both windows rather than hardcoding a relative hop', () => {
    const loadFileCalls = [...mainSource.matchAll(/loadFile\(([^)]*)\)/g)].map((m) => m[1]);
    expect(loadFileCalls.length).toBeGreaterThanOrEqual(2);
    for (const call of loadFileCalls) {
      expect(call).toContain('RENDERER_DIST');
      expect(call).not.toContain("'../dist");
    }
  });

  it('loads index.html for the studio and overlay.html for the HUD', () => {
    expect(mainSource).toContain("path.join(RENDERER_DIST, 'index.html')");
    expect(mainSource).toContain("path.join(RENDERER_DIST, 'overlay.html')");
  });
});

describe('build layout: both html entry points exist in the repo', () => {
  it('has the studio and overlay sources Vite bundles', () => {
    expect(existsSync(join(ROOT, 'index.html'))).toBe(true);
    expect(existsSync(join(ROOT, 'overlay.html'))).toBe(true);
  });

  it('declares both as Vite rollup inputs', () => {
    const viteConfig = readFileSync(join(ROOT, 'vite.config.ts'), 'utf8');
    expect(viteConfig).toContain('index.html');
    expect(viteConfig).toContain('overlay.html');
    expect(viteConfig).toMatch(/outDir:\s*'dist'/);
  });
});

describe('build layout: shared core is compiled for the main process', () => {
  it('includes the weapon-slot core in the node tsconfig', () => {
    const include = nodeTsConfig.include as string[];
    expect(include).toContain('electron/**/*');
    expect(include).toContain('src/lib/weaponSlots/**/*');
  });

  it('pins rootDir so the emitted tree stays predictable', () => {
    expect(rootDir).toBe('.');
  });

  it('keeps the shared core free of Electron imports', () => {
    // The whole point of the split: `src/lib/weaponSlots` must stay runnable in
    // the renderer and in plain Node tests.
    const files = [
      'types.ts', 'keys.ts', 'bindingRules.ts', 'defaults.ts', 'presetIndex.ts',
      'profileMatching.ts', 'slotStore.ts', 'switchPolicy.ts', 'migration.ts', 'index.ts',
    ];
    for (const file of files) {
      const src = readFileSync(join(ROOT, 'src/lib/weaponSlots', file), 'utf8');
      expect(src, `${file} must not import electron`).not.toMatch(/from\s+'electron'/);
      expect(src, `${file} must not import react`).not.toMatch(/from\s+'react'/);
      expect(src, `${file} must not require child_process`).not.toMatch(/child_process/);
    }
  });
});

describe('build layout: optional native dependency is declared safely', () => {
  it('ships the passive hook as optional, never required', () => {
    const optional = (packageJson.optionalDependencies ?? {}) as Record<string, string>;
    const deps = (packageJson.dependencies ?? {}) as Record<string, string>;
    expect(optional['uiohook-napi']).toBeDefined();
    expect(deps['uiohook-napi']).toBeUndefined();
  });

  it('loads the native hook behind a try/catch so its absence cannot crash crshhx', () => {
    const src = readFileSync(join(ROOT, 'electron/services/inputTransport.ts'), 'utf8');
    expect(src).toMatch(/try\s*\{[\s\S]*?require\('uiohook-napi'\)[\s\S]*?\}\s*catch/);
  });

  it('never injects or replays input through the hook', () => {
    // uiohook exposes keyTap/keyToggle, which synthesise input. crshhx must not
    // use them: injecting keys into a game is exactly what an anti-cheat looks for.
    const src = readFileSync(join(ROOT, 'electron/services/inputTransport.ts'), 'utf8');
    expect(src).not.toMatch(/\.keyTap\(/);
    expect(src).not.toMatch(/\.keyToggle\(/);
  });
});
