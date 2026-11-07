import { CrosshairConfig, AppSettings } from './crosshair';

export interface ElectronAPI {
  updateCrosshair: (config: CrosshairConfig) => void;
  updateAppSettings: (settings: AppSettings) => void;
  toggleOverlay: () => void;
  onCrosshairUpdated: (callback: (config: CrosshairConfig) => void) => void;
  onOverlayVisibilityChanged: (callback: (visible: boolean) => void) => void;
  onFiringTrigger?: (callback: () => void) => void;
  onAdsChanged?: (callback: (active: boolean) => void) => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
