import type { CrosshairConfig } from '../../types/crosshair';

/**
 * Weapon Slot Crosshairs — shared domain types.
 *
 * These types are deliberately free of any Electron, DOM or React dependency so
 * that the same modules can be compiled for the Electron main process
 * (CommonJS, no DOM lib), consumed by the React renderer and exercised by the
 * headless test suite.
 */

export type KeyModifier = 'ctrl' | 'alt' | 'shift' | 'meta';

/**
 * Physical input devices a slot can be triggered by.
 *
 * `mouse` and `wheel` are only available when a *passive* global input hook is
 * running. See `InputTransportCapabilities`.
 */
export type InputKind = 'key' | 'mouse' | 'wheel';

/**
 * A canonical, keyboard-layout independent description of one input binding.
 *
 * `code` uses DOM `KeyboardEvent.code` style identifiers (`Digit1`, `KeyQ`,
 * `F5`, `Numpad3`, `ArrowUp`) plus crshhx specific mouse/wheel codes
 * (`MouseButton4`, `WheelUp`). Using physical codes rather than characters
 * keeps bindings stable across AZERTY/QWERTZ layouts.
 */
export interface SlotKeyBinding {
  code: string;
  modifiers: KeyModifier[];
  kind: InputKind;
}

export type BindingValidationCode =
  | 'empty'
  | 'unknown-key'
  | 'reserved'
  | 'conflict-slot'
  | 'conflict-app'
  | 'modifier-required'
  | 'unsupported-by-transport'
  | 'typing-critical'
  /** Slot has no crosshair at all — pressing the key is a deliberate no-op. */
  | 'preset-unassigned'
  /** Slot points at a preset id that no longer exists in the library. */
  | 'preset-missing';

export interface BindingIssue {
  code: BindingValidationCode;
  /** Stable, non-localised identifier used by tests and tooltips. */
  message: string;
  /** True when the binding must not be accepted at all. */
  blocking: boolean;
}

/** One configurable weapon slot. */
export interface WeaponSlot {
  /** Stable identifier — never reused, never derived from the display name. */
  id: string;
  /** 1-based position shown to the user. Kept explicit so slots stay ordered. */
  index: number;
  /** User editable label, e.g. "Shotgun". */
  name: string;
  /** Activation input. `null` means the slot exists but is unbound. */
  binding: SlotKeyBinding | null;
  /**
   * Identifier of the crosshair preset in the existing crshhx library.
   * `null` means unassigned. We store the *id*, never the name, so renaming or
   * reordering the library cannot silently re-point a slot.
   */
  presetId: string | null;
  enabled: boolean;
}

/**
 * A named collection of slots, optionally scoped to a game/application.
 *
 * `matchProcessNames` is a list of foreground executable names (lower-cased,
 * without path) that should activate this profile automatically. An empty list
 * means "manual selection only". The `isDefault` profile is the fallback when
 * no other profile matches.
 */
export interface WeaponSlotProfile {
  id: string;
  name: string;
  /** Lower-cased executable names, e.g. `fortniteclient-win64-shipping.exe`. */
  matchProcessNames: string[];
  /**
   * When true, this profile's slots only fire while one of
   * `matchProcessNames` is the foreground application. When false (default) the
   * names are used for automatic profile *selection* only and never block a
   * switch. Requires a foreground-app provider; see `foregroundApp.ts`.
   */
  restrictToMatchedProcesses: boolean;
  isDefault: boolean;
  slots: WeaponSlot[];
}

/** Everything the switching engine needs, persisted as one unit. */
export interface WeaponSlotsState {
  /** Schema version used by the migration layer. */
  version: number;
  /** Master switch for the whole feature. */
  enabled: boolean;
  profiles: WeaponSlotProfile[];
  /** Id of the profile selected by the user (manual selection). */
  activeProfileId: string;
  /**
   * When true, crshhx watches the foreground application and switches
   * `activeProfileId` automatically. Requires a foreground-app provider.
   */
  autoSelectProfileByForegroundApp: boolean;
  /**
   * Behaviour when a triggered slot has no usable crosshair.
   * `keep-current` (default) leaves the overlay untouched.
   */
  unassignedSlotBehaviour: 'keep-current';
  /**
   * When true, slot keys are ignored while a crshhx window has keyboard focus.
   * Defaults to false so a user can press a freshly bound key inside the Studio
   * and immediately watch the overlay respond — the quickest way to verify a
   * binding without launching a game.
   */
  suppressWhileStudioFocused: boolean;
}

/** Snapshot of the presets a state refers to, resolved by the renderer. */
export type PresetIndex = Record<string, CrosshairConfig>;

/** Runtime payload handed to the main process. Fully serialisable. */
export interface WeaponSlotsRuntime {
  state: WeaponSlotsState;
  presetIndex: PresetIndex;
  /** Accelerators crshhx actually registers for its own features (overlay toggle, preset cycle). */
  reservedBindings: SlotKeyBinding[];
  /** Capabilities of the transport that is actually running. */
  capabilities: InputTransportCapabilities;
}

export interface InputTransportCapabilities {
  /** Human readable transport name, surfaced in the UI. */
  name: string;
  /** True when the transport observes keys without removing them from the OS input stream. */
  passiveGlobalKeyboard: boolean;
  /** True when global keys are received while another app has focus. */
  worksWhenUnfocused: boolean;
  mouseButtons: boolean;
  mouseWheel: boolean;
  /** Present when the transport degraded; shown verbatim in the UI. */
  warning?: string;
}

/** Normalised input event delivered by any transport. */
export interface NormalisedInputEvent {
  binding: SlotKeyBinding;
  /** key-down / button-down / wheel-rollover. */
  phase: 'down' | 'up';
  /** True when the OS reports this as an auto-repeat of a held key. */
  isRepeat: boolean;
  /** Monotonic timestamp in milliseconds. */
  timestamp: number;
}

export type SwitchIgnoreReason =
  | 'feature-disabled'
  | 'overlay-hidden'
  | 'recording-binding'
  | 'no-matching-slot'
  | 'slot-disabled'
  | 'slot-unbound'
  | 'preset-unassigned'
  | 'preset-missing'
  | 'modifier-mismatch'
  | 'key-repeat'
  | 'input-kind-unsupported'
  | 'foreground-not-allowed'
  | 'studio-focused'
  | 'already-active';

export type SwitchDecision =
  | {
      kind: 'apply';
      slotId: string;
      slotName: string;
      slotIndex: number;
      profileId: string;
      presetId: string;
      config: CrosshairConfig;
      /** True when the overlay already shows exactly this preset. */
      unchanged: boolean;
    }
  | { kind: 'ignore'; reason: SwitchIgnoreReason; detail?: string };

export interface SwitchEnvironment {
  overlayRunning: boolean;
  isRecordingBinding: boolean;
  studioFocused: boolean;
  /** Foreground executable name, lower-cased. `null` when unknown. */
  foregroundProcessName: string | null;
  /**
   * False when no foreground-app provider is running (unsupported platform or
   * the provider failed to start). Restrictions then fail *open* rather than
   * silently killing the feature.
   */
  foregroundTrackingAvailable: boolean;
}

/* ------------------------------------------------------------------ *
 * Runtime status surfaced to the UI (status bar, diagnostics panel)
 * ------------------------------------------------------------------ */

/** Which slot is currently driving the overlay. */
export interface ActiveSlotInfo {
  slotId: string | null;
  slotName: string | null;
  slotIndex: number | null;
  presetId: string | null;
  profileId: string | null;
  profileName: string | null;
  switchedAt: number;
}

export interface WeaponSlotStatus {
  enabled: boolean;
  transport: InputTransportCapabilities;
  /** True when the passive hook was unavailable and crshhx fell back. */
  degraded: boolean;
  degradeReason: string | null;
  activeProfileId: string | null;
  activeProfileName: string | null;
  activeSlot: ActiveSlotInfo;
  foregroundTrackingAvailable: boolean;
  foregroundProcessName: string | null;
  /** Last ignored trigger, so the UI can explain why nothing happened. */
  lastIgnore: { reason: string; detail: string | null; at: number } | null;
  slotCount: number;
}

/** Emitted to the studio after an accepted switch. */
export interface WeaponSlotSwitchedPayload {
  slotId: string;
  slotName: string;
  slotIndex: number;
  presetId: string;
  profileId: string;
  profileName: string | null;
  config: CrosshairConfig;
  /** True when the overlay already showed this exact preset. */
  unchanged: boolean;
  at: number;
}
