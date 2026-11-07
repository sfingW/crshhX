import React, { useState } from 'react';
import { AppSettings, CrosshairConfig } from '../../types/crosshair';
import {
  Keyboard,
  Gamepad2,
  HelpCircle,
  Plus,
  Trash2,
  Check,
  Mouse,
  Radio,
} from 'lucide-react';

interface KeybindsViewProps {
  appSettings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  currentConfig: CrosshairConfig;
}

export const KeybindsView: React.FC<KeybindsViewProps> = ({
  appSettings,
  onUpdateSettings,
  currentConfig,
}) => {
  const [globalToggleKey, setGlobalToggleKey] = useState(appSettings.toggleOverlayHotkey || 'F10');
  const [isListeningGlobal, setIsListeningGlobal] = useState(false);

  const [profileBinds, setProfileBinds] = useState([
    { id: 'bind-1', name: 'Cyan Duelist (One-Tap)', key: '1', controller: 'LS + LB' },
    { id: 'bind-2', name: 'Pump Breacher (Shotgun Spread)', key: '3', controller: 'LS + RB' },
    { id: 'bind-3', name: 'Apex Anchor (Micro Green)', key: '2', controller: 'Unbound' },
  ]);

  const handleGlobalKeyCapture = (e: React.KeyboardEvent) => {
    e.preventDefault();
    setGlobalToggleKey(e.key.toUpperCase());
    onUpdateSettings({ toggleOverlayHotkey: e.key.toUpperCase() });
    setIsListeningGlobal(false);
  };

  return (
    <div className="flex-1 p-8 bg-[#121214] text-zinc-100 overflow-y-auto select-none">
      <div className="max-w-4xl space-y-8">
        {/* Header (Matching Screenshot 3) */}
        <div>
          <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
            Configure Keybinds
            <HelpCircle className="w-4 h-4 text-zinc-500" />
          </h2>
          <p className="text-zinc-400 text-xs mt-1">
            If you need to toggle the visibility of the crosshair or select one based off an input press (keyboard, mouse, controller), you can do so here.
          </p>
        </div>

        {/* Global Keybinds Table */}
        <div className="bg-[#18181b] border border-[#26262a] rounded-lg overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-12 px-6 py-3 bg-[#161618] border-b border-[#26262a] text-xs font-semibold text-zinc-400">
            <div className="col-span-5">Keybind</div>
            <div className="col-span-4 flex items-center gap-1.5">
              <Keyboard className="w-4 h-4" />
              <span>Keyboard & Mouse</span>
            </div>
            <div className="col-span-3 flex items-center gap-1.5">
              <Gamepad2 className="w-4 h-4" />
              <span>Controller</span>
            </div>
          </div>

          {/* Rows */}
          <div className="divide-y divide-[#26262a] text-xs">
            {/* Row 1: Global Toggle */}
            <div className="grid grid-cols-12 px-6 py-4 items-center">
              <div className="col-span-5 flex items-center gap-3">
                <span className="font-semibold text-zinc-200">Global Toggle</span>
                <button
                  onClick={() => onUpdateSettings({ overlayVisible: !appSettings.overlayVisible })}
                  className="px-2 py-0.5 rounded text-[10px] font-mono font-bold"
                  style={{
                    backgroundColor: appSettings.overlayVisible ? 'var(--brand-accent)' : '#27272a',
                    color: appSettings.overlayVisible ? '#000000' : '#a1a1aa',
                  }}
                >
                  {appSettings.overlayVisible ? 'ON' : 'OFF'}
                </button>
              </div>

              <div className="col-span-4">
                {isListeningGlobal ? (
                  <span className="font-mono text-xs animate-pulse" style={{ color: 'var(--brand-accent)' }}>Press any key...</span>
                ) : (
                  <button
                    onClick={() => setIsListeningGlobal(true)}
                    onKeyDown={handleGlobalKeyCapture}
                    className="px-3 py-1 bg-[#202024] hover:bg-[#27272b] border border-[#2c2c31] rounded font-mono text-zinc-200 text-xs"
                  >
                    {globalToggleKey}
                  </button>
                )}
              </div>

              <div className="col-span-3 font-mono text-zinc-500">
                Unbound
              </div>
            </div>

            {/* Row 2: Aim / ADS */}
            <div className="grid grid-cols-12 px-6 py-4 items-center">
              <div className="col-span-5">
                <span className="font-semibold text-zinc-200">Aim (ADS Morph)</span>
              </div>
              <div className="col-span-4">
                <span className="px-3 py-1 bg-[#202024] border border-[#2c2c31] rounded font-mono text-zinc-200 text-xs">
                  RMB (Hold)
                </span>
              </div>
              <div className="col-span-3 font-mono text-zinc-400">
                LT
              </div>
            </div>

            {/* Row 3: Fire Bloom */}
            <div className="grid grid-cols-12 px-6 py-4 items-center">
              <div className="col-span-5">
                <span className="font-semibold text-zinc-200">Fire (Recoil Bloom)</span>
              </div>
              <div className="col-span-4">
                <span className="px-3 py-1 bg-[#202024] border border-[#2c2c31] rounded font-mono text-zinc-200 text-xs">
                  LMB
                </span>
              </div>
              <div className="col-span-3 font-mono text-zinc-400">
                RT
              </div>
            </div>
          </div>
        </div>

        {/* Section: Crosshairs Quick-Switch Keybinds */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-zinc-200">In-Game Profile Hotkeys</h3>
            <button
              onClick={() => {
                setProfileBinds((prev) => [
                  ...prev,
                  { id: `bind-${Date.now()}`, name: currentConfig.name, key: '4', controller: 'Unbound' },
                ]);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#202024] hover:bg-[#26262a] border border-[#2c2c31] rounded text-xs text-zinc-200 font-medium"
            >
              <Plus className="w-3.5 h-3.5" style={{ color: 'var(--brand-accent)' }} />
              <span>Bind Current Crosshair</span>
            </button>
          </div>

          <div className="bg-[#18181b] border border-[#26262a] rounded-lg divide-y divide-[#26262a] text-xs">
            {profileBinds.map((b) => (
              <div key={b.id} className="flex items-center justify-between px-6 py-3.5">
                <div className="font-medium text-zinc-200">{b.name}</div>
                <div className="flex items-center gap-4">
                  <span className="px-3 py-1 bg-[#202024] border border-[#2c2c31] rounded font-mono text-zinc-200">
                    Key: {b.key}
                  </span>
                  <span className="font-mono text-zinc-500 text-[11px]">{b.controller}</span>
                  <button
                    onClick={() => setProfileBinds((prev) => prev.filter((item) => item.id !== b.id))}
                    className="text-zinc-600 hover:text-rose-400 p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
