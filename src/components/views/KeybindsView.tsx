import React, { useMemo } from 'react';
import { AppSettings, CrosshairConfig } from '../../types/crosshair';
import {
  Keyboard,
  Gamepad2,
  HelpCircle,
  ArrowRight,
  Zap,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { KeyCaptureButton } from '../weaponSlots/KeyCaptureButton';
import { parseLegacyBinding, toAccelerator } from '../../lib/weaponSlots/keys';
import { validateBinding } from '../../lib/weaponSlots/bindingRules';
import type {
  BindingIssue,
  InputTransportCapabilities,
  SlotKeyBinding,
  WeaponSlotProfile,
  WeaponSlotStatus,
} from '../../lib/weaponSlots/types';

/**
 * Keybinds & ADS.
 *
 * This view owns crshhx's *application-level* hotkeys (overlay toggle, preset
 * cycle). Weapon-slot switching lives in its own section — the previous
 * "In-Game Profile Hotkeys" list on this page was decorative: it held three
 * hardcoded rows in local React state, was never persisted and never switched
 * anything. It now points at the real feature instead of pretending to be it.
 */

interface KeybindsViewProps {
  appSettings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  currentConfig: CrosshairConfig;
  weaponSlotStatus?: WeaponSlotStatus | null;
  onOpenWeaponSlots?: () => void;
}

/**
 * Application hotkeys are registered with Electron's `globalShortcut`, which is
 * built on RegisterHotKey and therefore *consumes* the combination. Describing
 * the capability honestly here makes the recorder warn about bare typing keys.
 */
const APP_HOTKEY_CAPABILITIES: InputTransportCapabilities = {
  name: 'OS Hotkeys',
  passiveGlobalKeyboard: false,
  worksWhenUnfocused: true,
  mouseButtons: false,
  mouseWheel: false,
};

/**
 * An empty profile stands in for the "no siblings" case when validating an
 * application hotkey: app-level keys are not part of any weapon-slot profile,
 * so there is nothing for them to conflict with except each other.
 */
const APP_HOTKEY_PROFILE: WeaponSlotProfile = {
  id: '__app_hotkeys__',
  name: 'Application',
  matchProcessNames: [],
  restrictToMatchedProcesses: false,
  isDefault: false,
  slots: [],
};

export const KeybindsView: React.FC<KeybindsViewProps> = ({
  appSettings,
  onUpdateSettings,
  currentConfig,
  weaponSlotStatus = null,
  onOpenWeaponSlots,
}) => {
  const toggleBinding = useMemo(
    () => parseLegacyBinding(appSettings.toggleOverlayHotkey),
    [appSettings.toggleOverlayHotkey],
  );

  /**
   * Everything except the toggle itself is reserved while editing it.
   *
   * `centerLockHotkey` is excluded for the same reason it is excluded from the
   * weapon-slot reservations: crshhx declares the setting but never registers
   * it, so it cannot collide with anything.
   */
  const reservedForToggle = useMemo(
    () =>
      [appSettings.cyclePresetHotkey]
        .map((raw) => parseLegacyBinding(raw))
        .filter((b): b is NonNullable<typeof b> => !!b),
    [appSettings.cyclePresetHotkey],
  );

  const toggleIssues: BindingIssue[] = useMemo(() => {
    if (!toggleBinding) return [];
    const issues = validateBinding(
      toggleBinding,
      { capabilities: APP_HOTKEY_CAPABILITIES, reservedBindings: reservedForToggle },
      APP_HOTKEY_PROFILE,
      '__app_toggle__',
    );
    const accelerator = toAccelerator(toggleBinding);
    if (!accelerator) {
      issues.push({
        code: 'unsupported-by-transport',
        message: 'The overlay toggle must be a keyboard key — mouse and wheel inputs cannot be registered here.',
        blocking: true,
      });
    }
    return issues;
  }, [toggleBinding, reservedForToggle]);

  const commitToggle = (binding: SlotKeyBinding | null) => {
    if (!binding) {
      // Never leave the user with no way to toggle the HUD back on.
      window.alert('The overlay toggle cannot be unbound — pick another key instead.');
      return;
    }
    const accelerator = toAccelerator(binding);
    if (!accelerator) return;

    const blocking = validateBinding(
      binding,
      { capabilities: APP_HOTKEY_CAPABILITIES, reservedBindings: reservedForToggle },
      APP_HOTKEY_PROFILE,
      '__app_toggle__',
    ).filter((i) => i.blocking);

    if (blocking.length > 0 && !window.confirm(`${blocking[0].message}\n\nUse it anyway?`)) {
      return;
    }
    onUpdateSettings({ toggleOverlayHotkey: accelerator });
  };

  const slotsReady = weaponSlotStatus?.slotCount ?? 0;
  const slotsLive = !!weaponSlotStatus?.enabled;
  const activeSlot = weaponSlotStatus?.activeSlot ?? null;

  return (
    <div className="flex-1 p-8 bg-[#121214] text-zinc-100 overflow-y-auto select-none">
      <div className="max-w-4xl space-y-8">
        {/* Header */}
        <div>
          <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
            Configure Keybinds
            <HelpCircle className="w-4 h-4 text-zinc-500" />
          </h2>
          <p className="text-zinc-400 text-xs mt-1">
            Application-level hotkeys for the HUD itself. Per-weapon crosshair switching
            is configured in <span className="text-zinc-200">Weapon Slots</span>.
          </p>
        </div>

        {/* Global Keybinds Table */}
        <div className="bg-[#18181b] border border-[#26262a] rounded-lg overflow-hidden">
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

          <div className="divide-y divide-[#26262a] text-xs">
            {/* Row 1: Global Toggle — now a real, persisted capture field */}
            <div className="grid grid-cols-12 px-6 py-4 items-start">
              <div className="col-span-5 flex items-center gap-3 pt-1">
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
                <KeyCaptureButton
                  binding={toggleBinding}
                  onCommit={commitToggle}
                  capabilities={APP_HOTKEY_CAPABILITIES}
                  issues={toggleIssues}
                  ariaLabel="Overlay toggle hotkey"
                />
              </div>

              <div className="col-span-3 font-mono text-zinc-500 pt-1">Unbound</div>
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
              <div className="col-span-3 font-mono text-zinc-400">LT</div>
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
              <div className="col-span-3 font-mono text-zinc-400">RT</div>
            </div>
          </div>
        </div>

        <p className="text-[11px] text-zinc-500 leading-relaxed flex items-start gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500/80 shrink-0 mt-0.5" />
          <span>
            These application hotkeys are registered with the operating system, which
            captures the combination exclusively — the focused game will not also receive
            it. Use function keys or a modifier combination. Weapon-slot keys work
            differently: see below.
          </span>
        </p>

        {/* Real pointer to Weapon Slot Crosshairs */}
        <div className="bg-[#18181b] border border-[#26262a] rounded-lg p-5 space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h3 className="font-bold text-sm text-zinc-100 flex items-center gap-2">
                <Zap className="w-4 h-4" style={{ color: 'var(--brand-accent)' }} />
                Weapon Slot Crosshairs
              </h3>
              <p className="text-zinc-400 text-xs mt-1.5 leading-relaxed max-w-xl">
                Assign a different saved crosshair to each weapon slot and switch between
                them by pressing the key you bound. Slot keys are observed passively, so
                the game still receives every press — you can bind plain number keys.
              </p>
            </div>

            <button
              onClick={onOpenWeaponSlots}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold whitespace-nowrap transition-opacity hover:opacity-90 shrink-0"
              style={{ backgroundColor: 'var(--brand-accent)', color: '#000' }}
            >
              Configure
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-4 flex-wrap text-[11px] font-mono pt-1 border-t border-[#26262a]">
            <span className="flex items-center gap-1.5 pt-2">
              {slotsLive ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-3.5 h-3.5 text-zinc-500" />
              )}
              <span className={slotsLive ? 'text-emerald-400' : 'text-zinc-500'}>
                {slotsLive ? 'Enabled' : 'Disabled'}
              </span>
            </span>
            <span className="text-zinc-500 pt-2">
              profile: <span className="text-zinc-300">{weaponSlotStatus?.activeProfileName ?? '—'}</span>
            </span>
            <span className="text-zinc-500 pt-2">
              slots: <span className="text-zinc-300">{slotsReady}</span>
            </span>
            <span className="text-zinc-500 pt-2">
              input: <span className="text-zinc-300">{weaponSlotStatus?.transport.name ?? '—'}</span>
            </span>
            {activeSlot?.slotId && (
              <span className="pt-2" style={{ color: 'var(--brand-accent)' }}>
                active: slot {activeSlot.slotIndex} — {activeSlot.slotName}
              </span>
            )}
          </div>

          <p className="text-[10px] text-zinc-600 leading-relaxed">
            Currently editing <span className="font-mono text-zinc-500">{currentConfig.name}</span>.
            Switching a slot changes the HUD reticle without editing or saving over any preset.
          </p>
        </div>
      </div>
    </div>
  );
};
