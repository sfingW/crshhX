export type CrosshairTopology = 'cross' | 'dot' | 'circle' | 't-shape' | 'chevron' | 'custom-image';

export type StretchedResolutionMode = 'none' | '4:3' | '16:10' | '5:4' | 'custom';

export type AdsMorphStyle = 'shrink' | 'dot-only' | 'fade';

/** The four arms of a cross reticle. */
export type ArmDirection = 'top' | 'bottom' | 'left' | 'right';

/** Length and thickness of one arm, in overlay pixels. */
export interface ArmSpec {
  length: number;
  thickness: number;
}

export interface CrosshairConfig {
  id: string;
  name: string;
  game: 'valorant' | 'cs2' | 'fortnite' | 'apex' | 'universal';
  isBuiltIn?: boolean;

  /**
   * Schema version this config was written with. Absent on every pre-v2 blob,
   * which is how `normalizeCrosshairConfig` recognises legacy data.
   */
  schemaVersion?: number;

  // Topology
  topology: CrosshairTopology;

  // Arms (Lines)
  length: number;           // 1 to 50
  thickness: number;        // 1 to 20
  gap: number;              // 0 to 50
  hasTopArm: boolean;
  hasBottomArm: boolean;
  hasLeftArm: boolean;
  hasRightArm: boolean;

  /* ------------------------------------------------------------------ *
   * v2 — independent per-direction geometry
   *
   * Optional so every config saved before v2 stays valid. When
   * `asymmetricArms` is false the global `length`/`thickness` above are used
   * for all four arms, which is exactly the pre-v2 behaviour. Turn it on to
   * give each direction its own values (e.g. top 8, bottom 12, left 8,
   * right 12) and build asymmetric designs.
   *
   * Always read these through `resolveArmGeometry()` rather than directly, so
   * the renderer and the editor can never disagree.
   * ------------------------------------------------------------------ */
  asymmetricArms?: boolean;
  armLength?: Record<ArmDirection, number>;
  armThickness?: Record<ArmDirection, number>;

  // v2 — whole-reticle transform
  /** Degrees, clockwise. Applied to the arms; a dot or ring is rotation-invariant. */
  rotation?: number;
  /** Overall size multiplier. 1 keeps the historical pixel-exact dimensions. */
  scale?: number;

  /* v2 — inner outline, drawn inset *inside* each element. Distinct from the
   * outer outline above, which is drawn as a larger shape behind it. */
  innerOutlineEnabled?: boolean;
  innerOutlineColor?: string;
  innerOutlineThickness?: number;
  innerOutlineOpacity?: number;

  // Primary Color
  primaryColor: string;     // Hex (#00ffcc)
  primaryOpacity: number;   // 0 to 1

  // Center Dot
  centerDotEnabled: boolean;
  centerDotSize: number;    // 1 to 20
  centerDotShape: 'square' | 'circle';
  centerDotColor: string;
  centerDotOpacity: number;

  // Outlines / Borders
  outlineEnabled: boolean;
  outlineColor: string;     // Hex (#000000)
  outlineThickness: number; // 1 to 6
  outlineOpacity: number;   // 0 to 1

  // Ring / Circle (Spread indicator / Shotgun ring)
  circleEnabled: boolean;
  circleRadius: number;     // 2 to 100
  circleThickness: number;  // 1 to 10
  circleColor: string;
  circleOpacity: number;

  // Glow / Bloom
  glowEnabled: boolean;
  glowColor: string;
  glowBlur: number;         // 1 to 20

  // Calibration & Position Offset
  offsetX: number;          // -200 to 200 px
  offsetY: number;          // -200 to 200 px

  // Stretched Resolution Compensation
  stretchedMode: StretchedResolutionMode;
  stretchCompressionRatio: number; // e.g. 0.75 for 4:3 stretched on 16:9

  // Dynamic Firing & Recoil Bloom
  dynamicFiring: boolean;
  firingBloomExpansion: number; // additional gap on click (e.g. 6px)
  firingDecayMs: number;        // recoil reset time (e.g. 120ms)

  // ADS Morphing (Aim Down Sights)
  adsMorphEnabled: boolean;
  adsTrigger: 'right-click' | 'hotkey';
  adsStyle: AdsMorphStyle;
  adsScale: number;             // e.g. 0.5 (shrink by 50%)

  // Custom Image URL / Data
  customImageUrl?: string;
  customImageScale?: number;
}

export interface AppSettings {
  overlayVisible: boolean;
  toggleOverlayHotkey: string; // e.g. 'F10'
  cyclePresetHotkey: string;   // e.g. 'F9'
  centerLockHotkey: string;    // e.g. 'F8'
  selectedMonitor: number;
  runAtStartup: boolean;
  suspendedWhenMinimized: boolean;
}
