import { CrosshairConfig, AppSettings } from './crosshair';
import {
  WeaponSlotsRuntime,
  WeaponSlotStatus,
  WeaponSlotSwitchedPayload,
} from '../lib/weaponSlots/types';

export interface ElectronAPI {
  updateCrosshair: (config: CrosshairConfig) => void;
  updateAppSettings: (settings: AppSettings) => void;
  toggleOverlay: () => void;
  onCrosshairUpdated: (callback: (config: CrosshairConfig) => void) => void;
  onOverlayVisibilityChanged: (callback: (visible: boolean) => void) => void;
  onFiringTrigger?: (callback: () => void) => void;
  onAdsChanged?: (callback: (active: boolean) => void) => void;

  /** Weapon Slot Crosshairs. */
  applyWeaponSlotsRuntime?: (runtime: WeaponSlotsRuntime) => void;
  setWeaponSlotRecording?: (recording: boolean) => void;
  restoreWeaponSlotActive?: (info: Partial<WeaponSlotStatus['activeSlot']>) => void;
  getWeaponSlotStatus?: () => Promise<WeaponSlotStatus | null>;
  /** Returns an unsubscribe function. */
  onWeaponSlotSwitched?: (callback: (payload: WeaponSlotSwitchedPayload) => void) => () => void;
  onWeaponSlotStatus?: (callback: (status: WeaponSlotStatus) => void) => () => void;
}

export type { WeaponSlotSwitchedPayload };

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
