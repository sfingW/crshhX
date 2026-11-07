export type CrosshairTopology = 'cross' | 'dot' | 'circle' | 't-shape' | 'chevron' | 'custom-image';

export type StretchedResolutionMode = 'none' | '4:3' | '16:10' | '5:4' | 'custom';

export type AdsMorphStyle = 'shrink' | 'dot-only' | 'fade';

export interface CrosshairConfig {
  id: string;
  name: string;
  game: 'valorant' | 'cs2' | 'fortnite' | 'apex' | 'universal';
  isBuiltIn?: boolean;

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
