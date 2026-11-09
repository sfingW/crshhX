/**
 * Extracts real product data from the desktop application into a JSON file the
 * website can render.
 *
 * Why this exists: the website must show the application's actual catalogue —
 * the Pro Crosshairs library, the Crosshair Academy curriculum and the built-in
 * vault counts — but it must not *import* the desktop application. `Reticle.tsx`
 * states that boundary and it is a good one: the app's modules pull in React
 * components, Electron APIs and dependencies the site has no business shipping.
 *
 * So the data is extracted at author time instead. The values in
 * `src/catalogue.json` are not typed by hand and are not approximations: they
 * are the application's own exported constants, bundled with esbuild and read
 * back out. `npm run extract -- --check` (run in CI) regenerates the file and
 * fails if it differs from what is committed, so the site cannot drift from the
 * product it describes.
 *
 * Usage:
 *   node scripts/extract-catalogue.mjs           write src/catalogue.json
 *   node scripts/extract-catalogue.mjs --check   fail if it would change
 */
import { build } from 'esbuild';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const websiteRoot = resolve(scriptDir, '..');
/** The desktop application, one directory up from `website/`. */
const appRoot = resolve(websiteRoot, '..');
const outFile = join(websiteRoot, 'src', 'catalogue.json');

const check = process.argv.includes('--check');

/** Bundles one application module so its exports can be read in Node. */
async function loadAppModule(relativePath, exportName) {
  const entry = join(appRoot, relativePath);
  const bundle = join(tmpdir(), `crshhx-catalogue-${exportName}-${process.pid}.mjs`);
  await build({
    entryPoints: [entry],
    bundle: true,
    format: 'esm',
    platform: 'node',
    target: 'node20',
    outfile: bundle,
    logLevel: 'silent',
    // The application is a React/Electron codebase; these modules are pure data,
    // but their import graph can still mention packages the website does not
    // have. They are never executed for the constants read here.
    external: ['react', 'react-dom', 'electron', 'lucide-react'],
  });
  const module = await import(pathToFileURL(bundle).href);
  if (!(exportName in module)) {
    throw new Error(`extract: ${relativePath} does not export ${exportName}`);
  }
  return module;
}

/* --------------------------------------------------------------- vault ---- */

/**
 * The built-in vault is generated combinatorially, so it cannot be counted by
 * reading the source — the number has to come from executing it. This is the
 * same method that established the published figure, now pinned here so the
 * website can render it instead of typing it.
 */
async function vaultFacts() {
  const { COMPLETE_CROSSHAIR_VAULT } = await loadAppModule(
    'src/lib/crosshairCollection.ts',
    'COMPLETE_CROSSHAIR_VAULT',
  );
  const byGame = {};
  const byTopology = {};
  for (const preset of COMPLETE_CROSSHAIR_VAULT) {
    byGame[preset.game] = (byGame[preset.game] ?? 0) + 1;
    byTopology[preset.topology] = (byTopology[preset.topology] ?? 0) + 1;
  }
  return {
    total: COMPLETE_CROSSHAIR_VAULT.length,
    allBuiltIn: COMPLETE_CROSSHAIR_VAULT.every((preset) => preset.isBuiltIn === true),
    byGame,
    byTopology,
  };
}

/* ------------------------------------------------------- pro crosshairs ---- */

/**
 * Maps an application `CrosshairConfig` onto the fields the website's own
 * renderer draws. Every field here is read from the real config; nothing is
 * defaulted to make a design look better. Features the site renderer does not
 * draw (glow, position offset, stretched compensation, ADS and firing
 * behaviour) are dynamic or composited effects, and the catalogue records
 * whether an entry uses them so the page can say so rather than imply a static
 * drawing is the whole design.
 */
function toSpec(config) {
  const spec = {
    color: config.primaryColor,
    length: config.length,
    thickness: config.thickness,
    gap: config.gap,
  };
  // All four arms is the renderer's default, so it is only written when an
  // entry actually drops one. Same for `beyond`: an empty list means the static
  // drawing is the whole design.
  const allArms =
    config.hasTopArm && config.hasBottomArm && config.hasLeftArm && config.hasRightArm;
  if (!allArms) {
    spec.arms = {
      top: config.hasTopArm,
      bottom: config.hasBottomArm,
      left: config.hasLeftArm,
      right: config.hasRightArm,
    };
  }
  if (config.primaryOpacity !== 1) spec.opacity = config.primaryOpacity;
  if (config.asymmetricArms && config.armLength && config.armThickness) {
    spec.armGeometry = Object.fromEntries(
      ['top', 'bottom', 'left', 'right'].map((dir) => [
        dir,
        { length: config.armLength[dir], thickness: config.armThickness[dir] },
      ]),
    );
  }
  if (config.rotation) spec.rotation = config.rotation;
  if (config.scale && config.scale !== 1) spec.scale = config.scale;
  if (config.centerDotEnabled) {
    spec.dot = true;
    spec.dotSize = config.centerDotSize;
    if (config.centerDotShape !== 'circle') spec.dotShape = config.centerDotShape;
    if (config.centerDotColor !== config.primaryColor) spec.dotColor = config.centerDotColor;
    if (config.centerDotOpacity !== 1) spec.dotOpacity = config.centerDotOpacity;
  }
  if (config.outlineEnabled) {
    spec.outline = true;
    spec.outlineColor = config.outlineColor;
    spec.outlineThickness = config.outlineThickness;
    if (config.outlineOpacity !== 1) spec.outlineOpacity = config.outlineOpacity;
  }
  if (config.innerOutlineEnabled) {
    spec.innerOutline = {
      color: config.innerOutlineColor,
      thickness: config.innerOutlineThickness,
      opacity: config.innerOutlineOpacity ?? 1,
    };
  }
  if (config.circleEnabled) {
    spec.ring = true;
    spec.ringRadius = config.circleRadius;
    spec.ringThickness = config.circleThickness;
    if (config.circleColor !== config.primaryColor) spec.ringColor = config.circleColor;
    if (config.circleOpacity !== 1) spec.ringOpacity = config.circleOpacity;
    // v3 — a segmented ring is a static shape, so the preview draws it; only
    // written when the design actually segments, keeping old entries byte-identical.
    if ((config.circleSegments ?? 1) > 1) {
      spec.ringSegments = config.circleSegments;
      spec.ringArcSpan = config.circleArcSpan;
      spec.ringArcOffset = config.circleArcOffset;
    }
  }
  /** Effects a static drawing cannot show. Recorded, never silently dropped. */
  const beyond = [];
  if (config.glowEnabled) beyond.push('glow');
  if (config.dynamicFiring) beyond.push('firing bloom');
  if (config.adsMorphEnabled) beyond.push('ADS morph');
  if (config.stretchedMode !== 'none') beyond.push(`stretched ${config.stretchedMode}`);
  if (config.offsetX || config.offsetY) beyond.push('position offset');
  return { spec, beyond, topology: config.topology, game: config.game };
}

async function proFacts() {
  const module = await loadAppModule('src/lib/proCrosshairs.ts', 'PRO_CROSSHAIR_ENTRIES');
  const entries = module.PRO_CROSSHAIR_ENTRIES;
  const list = Object.values(entries).map((entry) => {
    const { spec, beyond, topology, game } = toSpec(entry.config);
    return {
      id: entry.config.id,
      name: entry.config.name,
      category: entry.meta.category,
      tier: entry.meta.tier,
      description: entry.meta.description,
      topology,
      game,
      ...(entry.meta.series ? { series: entry.meta.series } : {}),
      ...(entry.meta.inspiration ? { inspiration: entry.meta.inspiration } : {}),
      ...(beyond.length > 0 ? { beyond } : {}),
      spec,
    };
  });
  return {
    total: list.length,
    note: module.VERIFIED_TIER_NOTE,
    tierLabels: module.TIER_LABELS,
    categories: module.PRO_CROSSHAIR_CATEGORIES,
    entries: list,
  };
}

/* ------------------------------------------------------------- academy ---- */

async function academyFacts() {
  const module = await loadAppModule('src/lib/academy.ts', 'ACADEMY_TUTORIALS');
  const tutorials = module.ACADEMY_TUTORIALS.map((tutorial) => ({
    id: tutorial.id,
    title: tutorial.title,
    intro: tutorial.intro,
    next: tutorial.next,
    steps: tutorial.steps.map((step) => step.title),
    /** Which steps carry a visual, and what kind. Names the app's own kinds. */
    visuals: tutorial.steps
      .map((step) => step.visual?.kind)
      .filter((kind) => Boolean(kind)),
  }));
  return { total: tutorials.length, order: module.ACADEMY_ORDER, tutorials };
}

/* ---------------------------------------------------------------- main ---- */

const catalogue = {
  $comment:
    'Generated by scripts/extract-catalogue.mjs from the desktop application. Do not edit by hand: `npm run extract` rewrites it, and CI fails if the committed copy differs from the application it describes.',
  source: [
    'src/lib/crosshairCollection.ts',
    'src/lib/proCrosshairs.ts',
    'src/lib/academy.ts',
  ],
  vault: await vaultFacts(),
  pro: await proFacts(),
  academy: await academyFacts(),
};

const json = `${JSON.stringify(catalogue, null, 2)}\n`;

if (check) {
  let existing = null;
  try {
    existing = await readFile(outFile, 'utf8');
  } catch {
    existing = null;
  }
  if (existing !== json) {
    console.error(
      'extract: src/catalogue.json is out of date with the desktop application.\n' +
        '       Run `npm run extract` in website/ and commit the result.',
    );
    process.exit(1);
  }
  console.log(
    `extract: catalogue matches the application (vault ${catalogue.vault.total}, ` +
      `pro ${catalogue.pro.total}, academy ${catalogue.academy.total})`,
  );
} else {
  await writeFile(outFile, json, 'utf8');
  console.log(
    `extract: wrote src/catalogue.json — vault ${catalogue.vault.total}, ` +
      `pro ${catalogue.pro.total} across ${catalogue.pro.categories.length} categories, ` +
      `academy ${catalogue.academy.total} tutorials (${Buffer.byteLength(json)} B)`,
  );
}
