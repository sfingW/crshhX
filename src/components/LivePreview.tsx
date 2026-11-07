import React, { useState, useEffect, useRef } from 'react';
import { CrosshairConfig } from '../types/crosshair';
import { ReticleRenderer } from './ReticleRenderer';
import { BACKDROP_OPTIONS, BackdropOption } from './TargetBackdrops';
import {
  Focus,
  Maximize2,
  Grid,
  User,
  Activity,
  Layers,
  ChevronRight,
  ZoomIn,
} from 'lucide-react';

interface LivePreviewProps {
  config: CrosshairConfig;
  onChangeConfig: (newConfig: CrosshairConfig) => void;
}

export const LivePreview: React.FC<LivePreviewProps> = ({ config, onChangeConfig }) => {
  const [selectedBackdrop, setSelectedBackdrop] = useState<BackdropOption>(BACKDROP_OPTIONS[0]);
  const [zoomLevel, setZoomLevel] = useState<number>(2); // 1x, 2x, 4x, 8x
  const [isFiring, setIsFiring] = useState(false);
  const [isAds, setIsAds] = useState(false);
  const [showTargetDummy, setShowTargetDummy] = useState(true);
  const [showGridAxes, setShowGridAxes] = useState(true);
  const firingTimerRef = useRef<number | null>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    if (e.button === 0) {
      // Left click = recoil bloom trigger
      setIsFiring(true);
      if (firingTimerRef.current) clearTimeout(firingTimerRef.current);
      firingTimerRef.current = window.setTimeout(() => {
        setIsFiring(false);
      }, config.firingDecayMs || 120);
    } else if (e.button === 2) {
      // Right click = ADS toggle/hold
      setIsAds(true);
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (e.button === 2) {
      setIsAds(false);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  useEffect(() => {
    return () => {
      if (firingTimerRef.current) clearTimeout(firingTimerRef.current);
    };
  }, []);

  return (
    <div className="flex flex-col h-full bg-panel-elevated border border-panel-border rounded-xl overflow-hidden shadow-2xl">
      {/* Viewport Control Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-panel-base border-b border-panel-border text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold text-zinc-200 tracking-tight font-mono uppercase text-[11px]">
              Viewport 01: Reticle Calibration
            </span>
          </div>
          <span className="text-zinc-600">/</span>
          <div className="text-[11px] font-mono text-zinc-400">
            {config.stretchedMode !== 'none' ? (
              <span className="text-amber-400 font-medium">
                {config.stretchedMode} STRETCHED (λ={config.stretchCompressionRatio.toFixed(3)})
              </span>
            ) : (
              <span>16:9 NATIVE (1.000)</span>
            )}
          </div>
        </div>

        {/* Viewport Actions */}
        <div className="flex items-center gap-2">
          {/* Zoom Segmented Control */}
          <div className="flex items-center bg-panel-subtle p-0.5 rounded-lg border border-panel-border">
            {[1, 2, 4, 8].map((lvl) => (
              <button
                key={lvl}
                onClick={() => setZoomLevel(lvl)}
                className={`px-2 py-0.5 rounded text-[10px] font-mono transition-all ${
                  zoomLevel === lvl
                    ? 'bg-zinc-100 text-zinc-950 font-bold shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {lvl}x
              </button>
            ))}
          </div>

          <div className="w-[1px] h-4 bg-panel-border" />

          {/* Target Silhouette Toggle */}
          <button
            onClick={() => setShowTargetDummy(!showTargetDummy)}
            title="Toggle Headshot Target Dummy"
            className={`p-1.5 rounded-lg border transition-all ${
              showTargetDummy
                ? 'bg-zinc-800 border-zinc-600 text-zinc-100'
                : 'bg-panel-subtle border-panel-border text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <User className="w-3.5 h-3.5" />
          </button>

          {/* Grid Axes Toggle */}
          <button
            onClick={() => setShowGridAxes(!showGridAxes)}
            title="Toggle Subpixel Calibration Grid"
            className={`p-1.5 rounded-lg border transition-all ${
              showGridAxes
                ? 'bg-zinc-800 border-zinc-600 text-zinc-100'
                : 'bg-panel-subtle border-panel-border text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Interactive Viewport Canvas */}
      <div
        className="relative flex-1 flex items-center justify-center overflow-hidden cursor-crosshair select-none transition-colors duration-200"
        style={selectedBackdrop.backgroundStyle}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onContextMenu={handleContextMenu}
      >
        {/* Subtle Engineering Vignette */}
        <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_80px_rgba(0,0,0,0.6)]" />

        {/* Headshot Target Silhouette (Tactical Dummy) */}
        {showTargetDummy && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-30">
            <svg
              width="260"
              height="340"
              viewBox="0 0 260 340"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="text-white"
            >
              {/* Head Outline */}
              <circle
                cx="130"
                cy="170"
                r="36"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeDasharray="4 4"
              />
              {/* Center Headshot Box */}
              <rect
                x="118"
                y="158"
                width="24"
                height="24"
                stroke="#10b981"
                strokeWidth="1"
                strokeOpacity="0.8"
                fill="#10b981"
                fillOpacity="0.05"
              />
              {/* Neck & Shoulders */}
              <path
                d="M 115 204 L 115 225 L 50 250 L 30 340 M 145 204 L 145 225 L 210 250 L 230 340"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeDasharray="6 6"
              />
              {/* Distance Height Indicator */}
              <line x1="20" y1="170" x2="35" y2="170" stroke="currentColor" strokeWidth="1" />
              <text x="40" y="173" fill="currentColor" fontSize="9" fontFamily="monospace" opacity="0.6">
                EYE LEVEL / 1.75m
              </text>
            </svg>
          </div>
        )}

        {/* Subpixel Alignment Axes & Ticks */}
        {showGridAxes && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            {/* Horizontal axis */}
            <div className="w-full h-[1px] bg-white/10" />
            {/* Vertical axis */}
            <div className="absolute h-full w-[1px] bg-white/10" />

            {/* Angular FOV spread rings */}
            <div className="absolute w-24 h-24 rounded-full border border-dashed border-white/15" />
            <div className="absolute w-56 h-56 rounded-full border border-dotted border-white/10" />

            {/* Subpixel Micro Ticks */}
            <div className="absolute flex gap-10 text-[9px] font-mono text-white/30 tracking-widest uppercase">
              <span>-50px</span>
              <span>-25px</span>
              <span className="w-8 text-center text-emerald-400">0</span>
              <span>+25px</span>
              <span>+50px</span>
            </div>
          </div>
        )}

        {/* The Exact Crosshair Reticle */}
        <ReticleRenderer
          config={config}
          isFiring={isFiring}
          isAds={isAds}
          scale={zoomLevel}
        />

        {/* Real-time Telemetry Overlay (Bottom Left) */}
        <div className="absolute bottom-3 left-3 pointer-events-none flex items-center gap-3 bg-zinc-950/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-zinc-800 text-[10px] font-mono text-zinc-300">
          <div className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${isFiring ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'}`} />
            <span>STATE: {isFiring ? 'RECOIL BLOOM' : isAds ? 'ADS MORPHED' : 'STEADY'}</span>
          </div>
          <span className="text-zinc-600">|</span>
          <span className="text-zinc-400">L-CLICK: Bloom Test • R-CLICK: ADS Hold</span>
        </div>

        {/* Subpixel Offset & Calibration Telemetry (Top Right) */}
        <div className="absolute top-3 right-3 pointer-events-none flex flex-col items-end gap-1 font-mono text-[10px]">
          <div className="bg-zinc-950/85 backdrop-blur-md px-2.5 py-1 rounded-md border border-zinc-800 text-zinc-300">
            OFFSET: <span className="text-emerald-400">X={config.offsetX >= 0 ? `+${config.offsetX}` : config.offsetX}px</span>,{' '}
            <span className="text-emerald-400">Y={config.offsetY >= 0 ? `+${config.offsetY}` : config.offsetY}px</span>
          </div>
        </div>
      </div>

      {/* Target Scene Switcher Bar */}
      <div className="px-4 py-2 bg-panel-base border-t border-panel-border flex items-center justify-between">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
          <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 font-semibold shrink-0 mr-1">
            Environment:
          </span>
          {BACKDROP_OPTIONS.map((bg) => (
            <button
              key={bg.id}
              onClick={() => setSelectedBackdrop(bg)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all shrink-0 ${
                selectedBackdrop.id === bg.id
                  ? 'bg-zinc-800 text-zinc-100 border border-zinc-600 shadow-sm'
                  : 'bg-panel-subtle text-zinc-400 hover:text-zinc-200 hover:bg-panel-card border border-panel-border'
              }`}
            >
              {bg.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
