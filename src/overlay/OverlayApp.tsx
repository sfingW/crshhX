import React, { useState, useEffect, useRef } from 'react';
import { CrosshairConfig } from '../types/crosshair';
import { loadCurrentConfig } from '../lib/storage';
import { ReticleRenderer } from '../components/ReticleRenderer';

export const OverlayApp: React.FC = () => {
  const [config, setConfig] = useState<CrosshairConfig>(loadCurrentConfig);
  const [visible, setVisible] = useState(true);
  const [isFiring, setIsFiring] = useState(false);
  const [isAds, setIsAds] = useState(false);
  const firingTimerRef = useRef<number | null>(null);

  useEffect(() => {
    // 1. Listen for Electron IPC events if available
    if (window.electronAPI) {
      window.electronAPI.onCrosshairUpdated((newConfig) => {
        setConfig(newConfig);
      });

      window.electronAPI.onOverlayVisibilityChanged((isVisible) => {
        setVisible(isVisible);
      });

      window.electronAPI.onFiringTrigger?.(() => {
        setIsFiring(true);
        if (firingTimerRef.current) clearTimeout(firingTimerRef.current);
        firingTimerRef.current = window.setTimeout(() => {
          setIsFiring(false);
        }, config.firingDecayMs || 120);
      });

      window.electronAPI.onAdsChanged?.((active) => {
        setIsAds(active);
      });
    }

    // 2. Storage event listener (syncs across browser tabs or windows)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'crshhx_current_config' && e.newValue) {
        try {
          setConfig(JSON.parse(e.newValue));
        } catch {}
      }
      if (e.key === 'crshhx_app_settings' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed && typeof parsed.overlayVisible === 'boolean') {
            setVisible(parsed.overlayVisible);
          }
        } catch {}
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [config.firingDecayMs]);

  if (!visible) {
    return null;
  }

  return (
    <div className="w-screen h-screen flex items-center justify-center pointer-events-none select-none bg-transparent overflow-hidden">
      <ReticleRenderer
        config={config}
        isFiring={isFiring}
        isAds={isAds}
        scale={1}
      />
    </div>
  );
};
