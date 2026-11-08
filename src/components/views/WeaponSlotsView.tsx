import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Gamepad2,
  Info,
  Keyboard,
  Plus,
  RotateCcw,
  Zap,
} from 'lucide-react';
import { CrosshairPicker } from '../weaponSlots/CrosshairPicker';
import { ProfileBar } from '../weaponSlots/ProfileBar';
import { SlotRow } from '../weaponSlots/SlotRow';
import {
  addProfile,
  addSlot,
  addTemplateProfile,
  assignPreset,
  clearPreset,
  duplicateProfile,
  getActiveProfile,
  moveSlot,
  removeProfile,
  removeSlot,
  renameProfile,
  renameSlot,
  resetProfileSlots,
  restoreDefaultSlots,
  setActiveProfile,
  setAutoSelectByForeground,
  setFeatureEnabled,
  setProfileProcessNames,
  setSlotBinding,
  setSlotEnabled,
  setSuppressWhileStudioFocused,
} from '../../lib/weaponSlots/slotStore';
import { MAX_SLOTS_PER_PROFILE, validateState } from '../../lib/weaponSlots/bindingRules';
import { UNKNOWN_TRANSPORT_CAPABILITIES } from '../../lib/presetLibrary';
import { resolvePreset, type SelectablePreset } from '../../lib/weaponSlots/presetIndex';
import { reservedBindingsFromSettings } from '../../lib/weaponSlots/migration';
import type { AppSettings } from '../../types/crosshair';
import type {
  InputTransportCapabilities,
  PresetIndex,
  SlotKeyBinding,
  WeaponSlotsState,
  WeaponSlotStatus,
} from '../../lib/weaponSlots/types';

/**
 * Weapon Slot Crosshairs — the settings section.
 *
 * Everything here is a thin presentation over the pure store and rules modules:
 * the view calls a store function, hands the resulting state back up, and the
 * parent persists it and pushes it to the main process. No switching logic and
 * no preset storage lives in this file.
 */

interface WeaponSlotsViewProps {
  state: WeaponSlotsState;
  presetIndex: PresetIndex;
  selectablePresets: SelectablePreset[];
  appSettings: AppSettings;
  status: WeaponSlotStatus | null;
  /** Repairs performed while loading, surfaced once so nothing is silent. */
  loadRepairs: string[];
  onChange: (next: WeaponSlotsState) => void;
  onRecordingChange: (recording: boolean) => void;
  onDismissRepairs: () => void;
}

export const WeaponSlotsView: React.FC<WeaponSlotsViewProps> = ({
  state,
  presetIndex,
  selectablePresets,
  appSettings,
  status,
  loadRepairs,
  onChange,
  onRecordingChange,
  onDismissRepairs,
}) => {
  const [pickerSlotId, setPickerSlotId] = useState<string | null>( null);

  /**
   * Until the main process reports which input transport is actually running,
   * assume the most restrictive one. That is deliberately conservative: it is
   * better to show a warning for a moment than to tell the user a bare number
   * key is safe and then have the game stop receiving it.
   */
  const capabilities: InputTransportCapabilities = status?.transport ?? UNKNOWN_TRANSPORT_CAPABILITIES;
  const transportKnown = !!status;

  const knownPresetIds = useMemo(
    () => new Set(Object.keys(presetIndex)),
    [presetIndex],
  );

  const validation = useMemo(
    () =>
      validateState(state, {
        capabilities,
        reservedBindings: reservedBindingsFromSettings(appSettings),
        knownPresetIds,
      }),
    [state, capabilities, appSettings, knownPresetIds],
  );

  const profile = getActiveProfile(state);
  const slots = profile?.slots ?? [];
  const pickerSlot = slots.find((s) => s.id === pickerSlotId) ?? null;

  const counts = useMemo(() => {
    const rows = slots.map((s) => validation[s.id]).filter(Boolean);
    return {
      ready: rows.filter((r) => r.canSwitch).length,
      invalid: rows.filter((r) => r.blocking).length,
      unassigned: rows.filter((r) => !r.unbound && r.unassigned).length,
      unbound: rows.filter((r) => r.unbound).length,
    };
  }, [slots, validation]);

  /** Applies a store result, surfacing failures rather than swallowing them. */
  const apply = (result: { ok: boolean; state?: WeaponSlotsState; error?: string }) => {
    if (result.ok && result.state) {
      onChange(result.state);
      return true;
    }
    if (!result.ok && result.error) window.alert(result.error);
    return false;
  };

  // `activeSlot` is an object whose *fields* are nullable, but this crosses a
  // process boundary — an older or mismatched main process could still send
  // null, and a white screen is worse than a missing highlight.
  const liveSlotId = status?.activeSlot?.slotId ?? null;

  return (
    <div className="flex-1 p-8 bg-surface-base text-zinc-100 overflow-y-auto scrollbar-thin select-none">
      <div className="max-w-6xl space-y-6">
        {/* ---------------- Header ---------------- */}
        <div className="flex items-start justify-between gap-6">
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
              <Zap className="w-5 h-5" style={{ color: 'var(--brand-accent)' }} />
              Weapon Slot Crosshairs
            </h2>
            <p className="text-zinc-400 text-xs mt-1.5 leading-relaxed max-w-2xl">
              Bind a saved crosshair to each of your weapon slots. Press the key you
              assigned and the HUD reticle swaps instantly — no restart, no overlay
              reload. crshhx responds to <span className="text-zinc-200">your</span> key
              press; it never tries to detect which weapon a game has equipped.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right">
              <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
                {transportKnown
                  ? `${counts.ready}/${slots.length} ready`
                  : 'checking input…'}
              </div>
              {transportKnown && counts.invalid > 0 && (
                <div className="text-[10px] font-mono text-rose-400">
                  {counts.invalid} invalid
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => onChange(setFeatureEnabled(state, !state.enabled))}
              role="switch"
              aria-checked={state.enabled}
              aria-label="Enable Weapon Slot Crosshairs"
              className="relative w-12 h-6 rounded-full transition-colors"
              style={{ backgroundColor: state.enabled ? 'var(--brand-accent)' : '#2c2c31' }}
            >
              <span
                className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all"
                style={{ left: state.enabled ? '1.625rem' : '0.125rem' }}
              />
            </button>
          </div>
        </div>

        {/* ---------------- Transport status ---------------- */}
        <div
          className="flex items-start gap-2.5 px-3.5 py-2.5 rounded-lg border text-[11px] leading-relaxed"
          style={{
            backgroundColor: status?.degraded ? 'rgba(245,158,11,0.07)' : 'rgba(16,185,129,0.06)',
            borderColor: status?.degraded ? 'rgba(245,158,11,0.3)' : 'rgba(16,185,129,0.25)',
          }}
        >
          {status?.degraded ? (
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          )}
          <div className="min-w-0">
            <div className="font-semibold text-zinc-200">
              Input: {capabilities.name}
              {status?.degraded && <span className="text-amber-400"> (fallback)</span>}
            </div>
            <p className="text-zinc-400 mt-0.5">
              {capabilities.passiveGlobalKeyboard
                ? 'Keys are observed passively — every key press still reaches the game, so you can bind plain number keys.'
                : capabilities.warning ??
                  'Slot keys must include Ctrl or Alt while this transport is active.'}
            </p>
            {status?.degraded && status.degradeReason && (
              <p className="text-zinc-500 font-mono text-[10px] mt-1">{status.degradeReason}</p>
            )}
            <div className="flex items-center gap-3 mt-1.5 text-[10px] font-mono text-zinc-500">
              <span>
                mouse buttons:{' '}
                <span className={capabilities.mouseButtons ? 'text-emerald-400' : 'text-zinc-600'}>
                  {capabilities.mouseButtons ? 'yes' : 'no'}
                </span>
              </span>
              <span>
                wheel:{' '}
                <span className={capabilities.mouseWheel ? 'text-emerald-400' : 'text-zinc-600'}>
                  {capabilities.mouseWheel ? 'yes' : 'no'}
                </span>
              </span>
              <span className="text-zinc-600">controller: no</span>
            </div>
          </div>
        </div>

        {/* ---------------- Load repairs ---------------- */}
        {loadRepairs.length > 0 && (
          <div className="px-3.5 py-2.5 rounded-lg border border-amber-500/25 bg-amber-500/[0.06] text-[11px]">
            <div className="flex items-center justify-between gap-3">
              <span className="font-semibold text-amber-300 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5" />
                {loadRepairs.length} setting{loadRepairs.length === 1 ? '' : 's'} repaired on load
              </span>
              <button
                type="button"
                onClick={onDismissRepairs}
                className="text-[10px] text-zinc-500 hover:text-zinc-200 transition-colors"
              >
                Dismiss
              </button>
            </div>
            <ul className="mt-1.5 space-y-0.5 text-zinc-400 max-h-28 overflow-y-auto scrollbar-thin">
              {loadRepairs.map((r, i) => (
                <li key={i} className="font-mono text-[10px] leading-relaxed">
                  · {r}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ---------------- Profiles ---------------- */}
        <ProfileBar
          profiles={state.profiles}
          activeProfileId={state.activeProfileId}
          liveProfileId={status?.activeProfileId ?? null}
          liveProfileName={status?.activeProfileName ?? null}
          autoSelect={state.autoSelectProfileByForegroundApp}
          foregroundProcessName={status?.foregroundProcessName ?? null}
          foregroundTrackingAvailable={status?.foregroundTrackingAvailable ?? false}
          onSelect={(id) => apply(setActiveProfile(state, id))}
          onAdd={(template) =>
            apply(
              template === 'blank'
                ? addProfile(state, `Profile ${state.profiles.length + 1}`)
                : addTemplateProfile(state, template),
            )
          }
          onRename={(id, name) => apply(renameProfile(state, id, name))}
          onDuplicate={(id) => apply(duplicateProfile(state, id))}
          onRemove={(id) => apply(removeProfile(state, id))}
          onSetProcessNames={(id, names) => apply(setProfileProcessNames(state, id, names))}
          onToggleRestrict={(id, restrict) =>
            onChange({
              ...state,
              profiles: state.profiles.map((p) =>
                p.id === id ? { ...p, restrictToMatchedProcesses: restrict } : p,
              ),
            })
          }
        />

        {/* ---------------- Options ---------------- */}
        <div className="flex items-center gap-5 flex-wrap px-1 text-[11px] text-zinc-400">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={state.autoSelectProfileByForegroundApp}
              onChange={(e) => onChange(setAutoSelectByForeground(state, e.target.checked))}
              className="accent-[var(--brand-accent)]"
            />
            <span className="flex items-center gap-1.5">
              <Gamepad2 className="w-3 h-3" />
              Auto-select profile by foreground app
            </span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={state.suppressWhileStudioFocused}
              onChange={(e) => onChange(setSuppressWhileStudioFocused(state, e.target.checked))}
              className="accent-[var(--brand-accent)]"
            />
            <span>Pause switching while crshhx Studio is focused</span>
          </label>

          {!state.enabled && (
            <span className="text-[10px] text-amber-400/90">
              Switching is off — you can still configure slots; turn the switch on to use them.
            </span>
          )}

          {!state.suppressWhileStudioFocused && (
            <span className="text-[10px] text-zinc-600">
              Slot keys work here too, so you can test a binding without launching a game.
            </span>
          )}
        </div>

        {/* ---------------- Slot table ---------------- */}
        <div className="bg-surface-sidebar border border-surface-border rounded-lg overflow-hidden">
          <div
            className="grid items-center gap-3 px-4 py-2.5 bg-[#161618] border-b border-surface-border text-[10px] font-semibold text-zinc-500 uppercase tracking-wider font-mono"
            style={{
              gridTemplateColumns: '2.5rem minmax(8rem,1.3fr) minmax(11rem,1.2fr) minmax(13rem,1.7fr) 4.5rem 4.5rem',
            }}
          >
            <div>#</div>
            <div>Name</div>
            <div className="flex items-center gap-1">
              <Keyboard className="w-3 h-3" />
              Key
            </div>
            <div>Crosshair</div>
            <div className="justify-self-center">On</div>
            <div className="justify-self-end">Actions</div>
          </div>

          {slots.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <p className="text-xs text-zinc-500">
                This profile has no slots yet.
              </p>
              <div className="flex items-center justify-center gap-2 mt-3">
                <button
                  type="button"
                  onClick={() => profile && apply(addSlot(state, profile.id))}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-semibold"
                  style={{ backgroundColor: 'var(--brand-accent)', color: '#000' }}
                >
                  <Plus className="w-3 h-3" />
                  Add a slot
                </button>
                <button
                  type="button"
                  onClick={() => onChange(restoreDefaultSlots(state))}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] text-zinc-400 hover:text-zinc-100 border border-surface-border transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  Restore the five defaults
                </button>
              </div>
            </div>
          ) : (
            <div>
              {slots.map((s, i) => {
                const resolution = resolvePreset(presetIndex, s.presetId);
                return (
                  <SlotRow
                    key={s.id}
                    slot={s}
                    isActive={liveSlotId === s.id}
                    validation={
                      validation[s.id] ?? {
                        slotId: s.id,
                        issues: [],
                        blocking: false,
                        canSwitch: false,
                        unassigned: !s.presetId,
                        unbound: !s.binding,
                      }
                    }
                    preset={resolution.status === 'ok' ? resolution.config : null}
                    presetMissing={resolution.status === 'missing'}
                    capabilities={capabilities}
                    inactive={!state.enabled}
                    isFirst={i === 0}
                    isLast={i === slots.length - 1}
                    onRename={(name) => profile && apply(renameSlot(state, profile.id, s.id, name))}
                    onCommitBinding={(binding: SlotKeyBinding | null) =>
                      profile && apply(setSlotBinding(state, profile.id, s.id, binding))
                    }
                    onPickPreset={() => setPickerSlotId(s.id)}
                    onClearPreset={() => profile && apply(clearPreset(state, profile.id, s.id))}
                    onToggleEnabled={() =>
                      profile && apply(setSlotEnabled(state, profile.id, s.id, !s.enabled))
                    }
                    onRemove={() => profile && apply(removeSlot(state, profile.id, s.id))}
                    onMove={(direction) => profile && apply(moveSlot(state, profile.id, s.id, direction))}
                    onRecordingChange={onRecordingChange}
                  />
                );
              })}
            </div>
          )}

          {/* Table footer */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-[#161618] border-t border-surface-border">
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={!profile || slots.length >= MAX_SLOTS_PER_PROFILE}
                onClick={() => profile && apply(addSlot(state, profile.id))}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] text-zinc-300 border border-surface-border hover:border-zinc-600 hover:bg-surface-card transition-all disabled:opacity-35 disabled:cursor-not-allowed"
              >
                <Plus className="w-3 h-3" style={{ color: 'var(--brand-accent)' }} />
                Add slot
              </button>
              <button
                type="button"
                disabled={!profile}
                onClick={() => {
                  if (!profile) return;
                  if (
                    window.confirm(
                      `Reset the "${profile.name}" slot table to the five shipped defaults?\n\nOther profiles and your other settings are kept.`,
                    )
                  ) {
                    apply(resetProfileSlots(state, profile.id));
                  }
                }}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] text-zinc-500 hover:text-zinc-200 border border-transparent hover:border-surface-border transition-all disabled:opacity-35 disabled:cursor-not-allowed"
              >
                <RotateCcw className="w-3 h-3" />
                Restore defaults
              </button>
              <span className="text-[10px] font-mono text-zinc-600">
                {slots.length}/{MAX_SLOTS_PER_PROFILE}
              </span>
            </div>

            {status?.lastIgnore && (
              <span className="text-[10px] text-amber-400/90 truncate max-w-[28rem]" title={status.lastIgnore.detail ?? undefined}>
                Last key did nothing: {status.lastIgnore.detail ?? status.lastIgnore.reason}
              </span>
            )}
          </div>
        </div>

        {/* ---------------- Behaviour notes ---------------- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px]">
          <div className="p-3.5 rounded-lg bg-surface-sidebar border border-surface-border space-y-1">
            <div className="font-semibold text-zinc-200 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5" style={{ color: 'var(--brand-accent)' }} />
              Unassigned slots
            </div>
            <p className="text-zinc-500 leading-relaxed">
              A slot with no crosshair — or one whose crosshair was deleted — leaves the
              HUD exactly as it is. crshhx never resets you to a default reticle and never
              silently picks a different one.
            </p>
          </div>

          <div className="p-3.5 rounded-lg bg-surface-sidebar border border-surface-border space-y-1">
            <div className="font-semibold text-zinc-200 flex items-center gap-1.5">
              <Keyboard className="w-3.5 h-3.5" style={{ color: 'var(--brand-accent)' }} />
              Key conflicts
            </div>
            <p className="text-zinc-500 leading-relaxed">
              The same key cannot drive two slots in one profile, and cannot be one of
              crshhx&apos;s own hotkeys (
              <span className="font-mono text-zinc-400">
                {reservedBindingsFromSettings(appSettings).map((b) => b.code).join(', ') || 'none'}
              </span>
              ). Different profiles may reuse the same keys.
            </p>
          </div>

          <div className="p-3.5 rounded-lg bg-surface-sidebar border border-surface-border space-y-1">
            <div className="font-semibold text-zinc-200 flex items-center gap-1.5">
              <Gamepad2 className="w-3.5 h-3.5" style={{ color: 'var(--brand-accent)' }} />
              Supported inputs
            </div>
            <p className="text-zinc-500 leading-relaxed">
              Keyboard always. Mouse wheel and side buttons when the passive hook is
              running. Controller input is not supported — see the documentation for why.
            </p>
          </div>
        </div>
      </div>

      <CrosshairPicker
        isOpen={!!pickerSlot}
        onClose={() => setPickerSlotId(null)}
        presets={selectablePresets}
        currentPresetId={pickerSlot?.presetId ?? null}
        slotLabel={pickerSlot ? `Slot ${pickerSlot.index} · ${pickerSlot.name}` : ''}
        onSelect={(presetId) => {
          if (!pickerSlot || !profile) return;
          apply(assignPreset(state, profile.id, pickerSlot.id, presetId));
        }}
      />
    </div>
  );
};
