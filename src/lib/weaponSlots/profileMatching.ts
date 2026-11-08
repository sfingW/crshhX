import { getActiveProfile } from './slotStore';
import type { WeaponSlotProfile, WeaponSlotsState } from './types';

/**
 * Profile selection and foreground-application filtering.
 *
 * crshhx does **not** detect which game is running by inspecting processes in a
 * privileged way, and it never reads game memory. When automatic profile
 * selection is enabled it simply asks the OS which executable is in the
 * foreground — the same information any window manager exposes — and compares
 * that name against a list the user typed in themselves.
 *
 * Everything here is pure so it can be tested without a windowing system.
 */

export function normalizeProcessName(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed) return null;
  const base = trimmed.replace(/\\/g, '/').split('/').pop();
  return base && base.length > 0 ? base : null;
}

/** True when `processName` is listed in the profile's match list. */
export function profileMatchesProcess(
  profile: WeaponSlotProfile,
  processName: string | null,
): boolean {
  if (profile.matchProcessNames.length === 0) return false;
  const normalized = normalizeProcessName(processName);
  if (!normalized) return false;
  return profile.matchProcessNames.some((candidate) => {
    const c = normalizeProcessName(candidate);
    if (!c) return false;
    // Exact exe match, or a prefix match so "fortniteclient" also works when
    // the user does not know the full "-win64-shipping.exe" suffix.
    return c === normalized || normalized.startsWith(c) || c.startsWith(normalized);
  });
}

export interface ProfileSelection {
  profile: WeaponSlotProfile | null;
  /** True when the choice came from a foreground-process match. */
  matchedByProcess: boolean;
}

/**
 * Chooses which profile is live right now.
 *
 * Precedence:
 *   1. automatic selection is on AND a non-default profile lists the
 *      foreground executable  -> that profile
 *   2. the manually selected `activeProfileId`
 *   3. the profile flagged `isDefault`
 *   4. the first profile
 */
export function selectProfile(
  state: WeaponSlotsState,
  foregroundProcessName: string | null,
): ProfileSelection {
  if (state.autoSelectProfileByForegroundApp) {
    const normalized = normalizeProcessName(foregroundProcessName);
    if (normalized) {
      const match = state.profiles.find(
        (p) => p.matchProcessNames.length > 0 && profileMatchesProcess(p, normalized),
      );
      if (match) return { profile: match, matchedByProcess: true };
    }
  }

  return { profile: getActiveProfile(state), matchedByProcess: false };
}

/**
 * Foreground restriction check for the *selected* profile.
 *
 * A profile only blocks switching when the user explicitly opted into
 * `restrictToMatchedProcesses`. That opt-in is honoured strictly: if crshhx
 * cannot determine the foreground application — no provider on this platform,
 * or the provider failed to start — the switch is **refused** rather than
 * allowed. Failing open would silently break a restriction the user asked for
 * and could change the reticle in the wrong game; failing closed is merely
 * inert, and the UI reports `foregroundTrackingAvailable: false` so the reason
 * is never a mystery.
 */
export function isForegroundAllowed(
  profile: WeaponSlotProfile,
  foregroundProcessName: string | null,
  trackingAvailable = true,
): boolean {
  if (!profile.restrictToMatchedProcesses) return true;
  if (profile.matchProcessNames.length === 0) return true;
  if (!trackingAvailable) return false;
  if (!normalizeProcessName(foregroundProcessName)) return false;
  return profileMatchesProcess(profile, foregroundProcessName);
}

/** Why a restriction refused the switch — used for the UI explanation. */
export function foregroundDenialReason(
  profile: WeaponSlotProfile,
  foregroundProcessName: string | null,
  trackingAvailable: boolean,
): string | null {
  if (isForegroundAllowed(profile, foregroundProcessName, trackingAvailable)) return null;
  if (!trackingAvailable) {
    return (
      `Profile "${profile.name}" only switches while ${profile.matchProcessNames.join(', ')} is in the `
      + 'foreground, but crshhx cannot read the foreground application on this system. '
      + 'Turn off the restriction or switch profiles manually.'
    );
  }
  return (
    `Profile "${profile.name}" only switches while ${profile.matchProcessNames.join(', ')} is in the foreground`
    + (foregroundProcessName ? ` (current: ${foregroundProcessName}).` : '.')
  );
}
