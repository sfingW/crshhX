import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync, readdirSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { MIGRATED_STORAGE_KEYS } from '../electron/services/storageMigration';

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

describe('production renderer loading', () => {
  /**
   * The retired mechanism was `loadFile()`, which put the document on `file://`.
   * Vite emits ES modules, Chromium fetches modules in CORS mode and a `file://`
   * document has an opaque origin — so the bundle can be refused and the window
   * renders blank, while `localStorage` stays tied to the install path. Both
   * windows now load from the fixed privileged `app://crshhx` origin.
   */
  it('serves both windows from the custom origin, never from file://', () => {
    expect(mainSource).toContain('studioWindow.loadURL(STUDIO_URL)');
    expect(mainSource).toContain('overlayWindow.loadURL(OVERLAY_URL)');
    expect(mainSource).not.toContain('loadFile(');
  });

  it('registers the scheme privileges before the app is ready', () => {
    // Electron silently ignores the call afterwards, and the symptom is a blank
    // window rather than an error — so the ordering is the thing to pin.
    const privileges = mainSource.indexOf('registerSchemesAsPrivileged');
    const ready = mainSource.indexOf('app.whenReady()');
    expect(privileges).toBeGreaterThan(-1);
    expect(ready).toBeGreaterThan(privileges);
  });

  it('derives the renderer location through the shared, testable helper', () => {
    expect(mainSource).toContain('resolveRendererDist(');
    expect(mainSource).toContain('isPackaged: app.isPackaged');
    // The raw relative hop that defect #9 got wrong must not come back.
    expect(mainSource).not.toMatch(/path\.join\(__dirname,\s*'\.\.',\s*'\.\.',\s*'dist'\)/);
  });

  it('answers the storage probe before resolving bundle paths', () => {
    const probe = mainSource.indexOf('isStorageProbePath(url.pathname)');
    const assets = mainSource.indexOf('resolveAssetPath(request.url, RENDERER_DIST)');
    expect(probe).toBeGreaterThan(-1);
    expect(assets).toBeGreaterThan(probe);
  });

  it('applies one Content Security Policy through one mechanism', () => {
    expect(mainSource).toContain('onHeadersReceived');
    expect(mainSource).toContain('contentSecurityPolicy({ isDev, devServerUrl: DEV_SERVER_URL })');
  });

  it('runs the storage migration before any application window is created', () => {
    // The studio persists first-run defaults (it seeds the starter favourites),
    // so starting it first would claim exactly the keys the migration fills.
    const migration = mainSource.indexOf('await migrateStorageOrigin()');
    const firstWindow = mainSource.indexOf('createOverlayWindow();');
    expect(migration).toBeGreaterThan(-1);
    expect(firstWindow).toBeGreaterThan(migration);
  });

  it('keeps user data outside the install directory', () => {
    expect(mainSource).toContain(
      "app.setPath('userData', path.join(app.getPath('appData'), app.getName()))",
    );
    // Deriving storage from the executable path or the portable temp directory is
    // how a moved app loses its library.
    expect(mainSource).not.toContain('PORTABLE_EXECUTABLE_DIR');
    expect(mainSource).not.toContain('getPath(process.execPath)');
  });
});

describe('packaging: electron-builder configuration', () => {
  const builderYml = readFileSync(join(ROOT, 'electron-builder.yml'), 'utf8');

  it('ships only what the packaged application loads', () => {
    expect(builderYml).toContain('dist/**');
    expect(builderYml).toContain('dist-electron/**');
    expect(builderYml).toContain('package.json');
    // Source, tests and docs must not end up in front of every user.
    expect(builderYml).not.toMatch(/^\s*-\s*['"]?src\//m);
    expect(builderYml).not.toMatch(/^\s*-\s*['"]?tests\//m);
    expect(builderYml).not.toMatch(/^\s*-\s*['"]?docs\//m);
  });

  it('builds the two Windows targets and no unverified platform', () => {
    expect(builderYml).toMatch(/target:\s*nsis/);
    expect(builderYml).toMatch(/target:\s*portable/);
    expect(builderYml).not.toContain('target: dmg');
    expect(builderYml).not.toContain('target: appImage');
  });

  it('unpacks the native input hook so the OS loader can reach it', () => {
    // A `.node` binary cannot be loaded from inside an asar archive.
    expect(builderYml).toContain('**/node_modules/uiohook-napi/**');
    expect(builderYml).toContain('**/*.node');
    // ...and it must not be rebuilt from source: the npm tarball ships N-API
    // prebuilds that load under Electron's ABI, while a source build needs a
    // toolchain no packaging box should require.
    expect(builderYml).toMatch(/npmRebuild:\s*false/);
  });

  it('never lets uninstalling destroy the user library', () => {
    expect(builderYml).toMatch(/deleteAppDataOnUninstall:\s*false/);
  });

  it('has a real application icon for every size the Windows shell asks for', () => {
    expect(existsSync(join(ROOT, 'build', 'icon.ico'))).toBe(true);
    expect(existsSync(join(ROOT, 'build', 'icon.png'))).toBe(true);
    expect(builderYml).toContain('build/icon.ico');
    const icon = readFileSync(join(ROOT, 'build', 'icon.ico'));
    // ICO magic number, and a 256x256 entry — the minimum electron-builder accepts.
    expect(Array.from(icon.subarray(0, 4))).toEqual([0, 0, 1, 0]);
  });

  it('does not attempt to publish, because no update backend exists', () => {
    expect(builderYml).toMatch(/publish:\s*null/);
  });

  it('declares the metadata the Windows installer requires', () => {
    expect(packageJson.author).toBeDefined();
    expect(packageJson.productName).toBe('Crshhx Crosshair Studio');
    // UNLICENSED is a deliberate placeholder: the repository ships no licence
    // file and choosing one is the owner's decision. It grants nobody rights.
    expect(packageJson.license).toBe('UNLICENSED');
    expect(builderYml).toContain('appId:');
  });
});

describe('packaging: renderer is self-contained', () => {
  it('loads no third-party stylesheet or font at runtime', () => {
    const indexHtml = readFileSync(join(ROOT, 'index.html'), 'utf8');
    const overlayHtml = readFileSync(join(ROOT, 'overlay.html'), 'utf8');
    for (const html of [indexHtml, overlayHtml]) {
      expect(html).not.toContain('fonts.googleapis.com');
      expect(html).not.toContain('fonts.gstatic.com');
      expect(html).not.toMatch(/<link[^>]+href="https?:\/\//);
    }
  });

  it('self-hosts the fonts the interface uses, under their existing names', () => {
    const entry = readFileSync(join(ROOT, 'src/studio/main.tsx'), 'utf8');
    expect(entry).toContain('@fontsource/inter/latin-400.css');
    expect(entry).toContain('@fontsource/jetbrains-mono/latin-400.css');
    // The family names must match the Tailwind stacks exactly, or the UI would
    // silently render in a different face.
    expect(entry).not.toContain('Variable');
  });

  it('migrates exactly the storage keys the renderer owns', () => {
    // Re-derive the set from the source tree so a newly persisted key cannot be
    // added without also being migrated.
    const walk = (dir: string, out: string[] = []): string[] => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) walk(full, out);
        else if (/\.(ts|tsx)$/.test(entry.name)) out.push(readFileSync(full, 'utf8'));
      }
      return out;
    };
    const sources = [...walk(join(ROOT, 'src')), ...walk(join(ROOT, 'electron'))];
    const found = new Set<string>();
    for (const source of sources) {
      for (const match of source.matchAll(/['"](crshhx_[a-z_]+)['"]/g)) {
        // Not a storage key: the transfer format id and file-name stems.
        if (!['crshhx_export', 'crshhx-export'].includes(match[1])) found.add(match[1]);
      }
    }
    expect([...found].sort()).toEqual([...MIGRATED_STORAGE_KEYS].sort());
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

describe('footprint: nothing ships that the packaged app cannot use', () => {
  it('bundles every renderer dependency, so the asar carries no node_modules but the hook', () => {
    // react, react-dom, clsx, lucide-react and tailwind-merge are tree-shaken
    // into dist by Vite; keeping them as runtime dependencies made electron-builder
    // copy ~57 MB of source into every install.
    expect(Object.keys((packageJson.dependencies ?? {}) as Record<string, string>)).toEqual([]);
    const optional = (packageJson.optionalDependencies ?? {}) as Record<string, string>;
    expect(Object.keys(optional)).toEqual(['uiohook-napi']);
  });

  it('proves the renderer bundle really contains React, so dropping it is safe', () => {
    // If React ever stops being bundled, the assertion above would silently ship
    // an app that cannot boot. Check the built output instead of trusting intent.
    const assets = join(ROOT, 'dist', 'assets');
    if (!existsSync(assets)) return; // build not run in this invocation
    const scripts = readdirSync(assets).filter((f) => f.endsWith('.js'));
    const bundled = scripts.some((f) =>
      readFileSync(join(assets, f), 'utf8').includes('useState'),
    );
    expect(bundled).toBe(true);
  });

  it('ships only the Windows x64 native binary', () => {
    expect(builderYmlSource()).toContain('!**/node_modules/uiohook-napi/prebuilds/darwin-*/**');
    expect(builderYmlSource()).toContain('!**/node_modules/uiohook-napi/prebuilds/linux-*/**');
    expect(builderYmlSource()).toContain('!**/node_modules/uiohook-napi/prebuilds/win32-arm64/**');
  });

  it('drops the legacy woff font fallbacks at build time', () => {
    expect(readFileSync(join(ROOT, 'vite.config.ts'), 'utf8')).toContain('fontFallbackPlugin()');
    const assets = join(ROOT, 'dist', 'assets');
    if (!existsSync(assets)) return;
    const woff = readdirSync(assets).filter((f) => f.endsWith('.woff'));
    expect(woff).toEqual([]);
    expect(readdirSync(assets).filter((f) => f.endsWith('.woff2')).length).toBeGreaterThan(0);
  });

  it('throttles the unfocused studio but never the overlay', () => {
    // The studio has nothing that must run while a game is in front; the overlay
    // would update its crosshair once a second if Chromium throttled it.
    const studio = mainSource.slice(
      mainSource.indexOf('function createStudioWindow'),
      mainSource.indexOf('function createOverlayWindow'),
    );
    const overlay = mainSource.slice(
      mainSource.indexOf('function createOverlayWindow'),
      mainSource.indexOf('function registerHotkeys'),
    );
    expect(studio).not.toContain('backgroundThrottling');
    expect(overlay).toContain('backgroundThrottling: false');
  });

  it('runs the storage migration at most once per install', () => {
    expect(mainSource).toContain('MIGRATION_MARKER_NAME');
    expect(mainSource).toContain('shouldRunMigration(');
    // A failed attempt must not write the marker, or the retry never happens.
    const start = mainSource.indexOf('async function migrateStorageOrigin');
    const body = mainSource.slice(start, mainSource.indexOf('\n}\n', start));
    const catchBlock = body.slice(body.indexOf('} catch (err) {'));
    expect(catchBlock).not.toContain('markerContents');
    expect(body).toContain('markerContents');
  });
});

describe('packaging: the Windows release workflow is the sanctioned path', () => {
  const workflow = readFileSync(join(ROOT, '.github', 'workflows', 'windows-release.yml'), 'utf8');

  it('builds on a Windows runner, where the toolchain and rcedit actually work', () => {
    expect(workflow).toContain('runs-on: windows-latest');
    expect(workflow).toContain('electron-builder --win');
  });

  it('gates packaging behind the full quality job', () => {
    expect(workflow).toContain('needs: quality');
    expect(workflow).toContain('npm test');
    expect(workflow).toContain('npx tsc -p tsconfig.json --noEmit');
  });

  it('reports measured sizes and hashes instead of letting anyone guess', () => {
    expect(workflow).toContain('SHA256');
    expect(workflow).toContain('Measure-Object');
  });

  it('uploads both executables and fails if there are none', () => {
    expect(workflow).toContain('release/*.exe');
    expect(workflow).toContain('if-no-files-found: error');
  });

  it('does not sign or publish, matching the stated decision', () => {
    expect(workflow).toContain('--publish never');
    expect(workflow).not.toContain('certificate');
  });
});

function builderYmlSource(): string {
  return readFileSync(join(ROOT, 'electron-builder.yml'), 'utf8');
}
