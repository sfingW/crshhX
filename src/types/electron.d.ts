import { CrosshairConfig, AppSettings } from './crosshair';
import {
  WeaponSlotsRuntime,
  WeaponSlotStatus,
  WeaponSlotSwitchedPayload,
} from '../lib/weaponSlots/types';

/* ---------------- Target Monitor ---------------- */

/** Rectangle in screen coordinates; x/y may be negative on multi-monitor setups. */
export interface DisplayBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Serializable description of one connected display, produced by the main
 * process from Electron's display APIs. Values are what the OS reported —
 * nothing is hardcoded or inferred.
 */
export interface DisplayInfo {
  /** Electron display id. Stable for the session; can vanish on unplug. */
  id: number;
  /** Position in the OS display list, 0-based ("Display 1" is index 0). */
  index: number;
  /** OS-provided monitor name where the platform exposes one; otherwise absent. */
  label?: string;
  /** Full display bounds; used verbatim to position the overlay window. */
  bounds: DisplayBounds;
  /** Bounds minus the taskbar/dock, when reported. */
  workArea?: DisplayBounds;
  /** DPI scale factor (1 = 100%, 1.5 = 150%, …). */
  scaleFactor: number;
  /** Refresh rate in Hz; 0 when the platform does not report one. */
  refreshRate: number;
  rotation?: number;
  isPrimary: boolean;
  isInternal?: boolean;
}

/** Answer to `displays:list`: what is connected, what was chosen, where the overlay is. */
export interface DisplaysSnapshot {
  displays: DisplayInfo[];
  /** The persisted preference: AUTO_MONITOR (-1) or a display id. */
  preference: number;
  /** Id of the display the overlay currently occupies, if any. */
  targetId: number | null;
}

export interface ElectronAPI {
  updateCrosshair: (config: CrosshairConfig) => void;
  updateAppSettings: (settings: AppSettings) => void;
  toggleOverlay: () => void;
  onCrosshairUpdated: (callback: (config: CrosshairConfig) => void) => void;
  onOverlayVisibilityChanged: (callback: (visible: boolean) => void) => void;
  onFiringTrigger?: (callback: () => void) => void;
  onAdsChanged?: (callback: (active: boolean) => void) => void;

  /** Target Monitor: connected displays, the stored preference and the current target. */
  listDisplays?: () => Promise<DisplaysSnapshot | null>;
  /** Fires when a display is connected, disconnected or changes metrics. Returns an unsubscribe function. */
  onDisplaysChanged?: (callback: (displays: DisplayInfo[]) => void) => () => void;

  /** Weapon Slot Crosshairs. */
  applyWeaponSlotsRuntime?: (runtime: WeaponSlotsRuntime) => void;
  setWeaponSlotRecording?: (recording: boolean) => void;
  restoreWeaponSlotActive?: (info: Partial<WeaponSlotStatus['activeSlot']>) => void;
  getWeaponSlotStatus?: () => Promise<WeaponSlotStatus | null>;
  /** Returns an unsubscribe function. */
  onWeaponSlotSwitched?: (callback: (payload: WeaponSlotSwitchedPayload) => void) => () => void;
  onWeaponSlotStatus?: (callback: (status: WeaponSlotStatus) => void) => () => void;

  /** Frameless window chrome: the TopHeader's minimise/maximise/close controls. */
  windowMinimize?: () => void;
  windowToggleMaximize?: () => void;
  /** Goes through the window's close event, so close-to-tray still applies. */
  windowClose?: () => void;
  isWindowMaximized?: () => Promise<boolean>;
  /** Returns an unsubscribe function. */
  onWindowMaximizedChanged?: (callback: (maximized: boolean) => void) => () => void;
}

export type { WeaponSlotSwitchedPayload };

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
