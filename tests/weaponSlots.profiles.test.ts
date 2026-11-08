import { describe, expect, it } from 'vitest';
import {
  foregroundDenialReason,
  isForegroundAllowed,
  normalizeProcessName,
  profileMatchesProcess,
  selectProfile,
} from '../src/lib/weaponSlots/profileMatching';
import { createDefaultState, DEFAULT_PROFILE_ID } from '../src/lib/weaponSlots/defaults';
import { makeBinding } from '../src/lib/weaponSlots/keys';
import { profile, slot, state } from './helpers';

/**
 * Game-specific configurations: profile selection and foreground filtering.
 *
 * This is deliberately *not* game detection. crshhx compares the foreground
 * executable name against names the user typed in, and nothing more.
 */

const fortnite = () =>
  profile({
    id: 'profile-fortnite',
    name: 'Fortnite',
    isDefault: false,
    matchProcessNames: ['fortniteclient-win64-shipping.exe'],
    slots: [slot({ index: 1, binding: makeBinding('Digit1'), presetId: 'fn-1' })],
  });

const cs2 = () =>
  profile({
    id: 'profile-cs2',
    name: 'CS2',
    isDefault: false,
    matchProcessNames: ['cs2.exe'],
    slots: [slot({ index: 1, binding: makeBinding('Digit1'), presetId: 'cs-1' })],
  });

function twoGameState(auto: boolean, activeId = DEFAULT_PROFILE_ID) {
  const def = profile({
    id: DEFAULT_PROFILE_ID,
    slots: [slot({ index: 1, binding: makeBinding('Digit1'), presetId: 'def-1' })],
  });
  return state({
    enabled: true,
    autoSelectProfileByForegroundApp: auto,
    activeProfileId: activeId,
    profiles: [def, fortnite(), cs2()],
  });
}

describe('process name normalisation', () => {
  it('lower-cases and strips a full Windows path', () => {
    expect(normalizeProcessName('C:\\Games\\CS2.exe')).toBe('cs2.exe');
  });

  it('strips a POSIX path', () => {
    expect(normalizeProcessName('/usr/games/cs2')).toBe('cs2');
  });

  it('trims whitespace', () => {
    expect(normalizeProcessName('  cs2.exe  ')).toBe('cs2.exe');
  });

  it('maps empty and non-string input to null', () => {
    expect(normalizeProcessName('')).toBeNull();
    expect(normalizeProcessName('   ')).toBeNull();
    expect(normalizeProcessName(null)).toBeNull();
    expect(normalizeProcessName(undefined)).toBeNull();
    expect(normalizeProcessName(42 as unknown as string)).toBeNull();
  });
});

describe('profile matching', () => {
  it('matches an exact executable name regardless of case', () => {
    expect(profileMatchesProcess(fortnite(), 'FortniteClient-Win64-Shipping.exe')).toBe(true);
    expect(profileMatchesProcess(fortnite(), 'fortniteclient-win64-shipping.exe')).toBe(true);
  });

  it('matches a full path for the foreground process', () => {
    expect(
      profileMatchesProcess(cs2(), 'C:\\Program Files\\Steam\\steamapps\\common\\cs2\\game\\bin\\cs2.exe'),
    ).toBe(true);
  });

  it('matches a user-entered prefix so they do not need the full suffix', () => {
    const loose = profile({ matchProcessNames: ['fortniteclient'] });
    expect(profileMatchesProcess(loose, 'fortniteclient-win64-shipping.exe')).toBe(true);
  });

  it('does not match a different game', () => {
    expect(profileMatchesProcess(fortnite(), 'cs2.exe')).toBe(false);
    expect(profileMatchesProcess(cs2(), 'valorant.exe')).toBe(false);
  });

  it('never matches a profile with no process names', () => {
    expect(profileMatchesProcess(profile({ matchProcessNames: [] }), 'cs2.exe')).toBe(false);
  });

  it('does not match when the foreground app is unknown', () => {
    expect(profileMatchesProcess(fortnite(), null)).toBe(false);
  });

  it('matches any one of several names', () => {
    const multi = profile({ matchProcessNames: ['cs2.exe', 'hl2.exe'] });
    expect(profileMatchesProcess(multi, 'hl2.exe')).toBe(true);
    expect(profileMatchesProcess(multi, 'cs2.exe')).toBe(true);
    expect(profileMatchesProcess(multi, 'other.exe')).toBe(false);
  });
});

describe('profile selection', () => {
  it('prefers the manually selected profile when auto-select is off', () => {
    const st = twoGameState(false, 'profile-cs2');
    expect(selectProfile(st, 'fortniteclient-win64-shipping.exe').profile?.id).toBe('profile-cs2');
    expect(selectProfile(st, 'fortniteclient-win64-shipping.exe').matchedByProcess).toBe(false);
  });

  it('ignores the foreground app entirely when auto-select is off', () => {
    const st = twoGameState(false);
    expect(selectProfile(st, 'cs2.exe').profile?.id).toBe(DEFAULT_PROFILE_ID);
  });

  it('picks the matching game profile when auto-select is on', () => {
    const st = twoGameState(true);
    const selection = selectProfile(st, 'cs2.exe');
    expect(selection.profile?.id).toBe('profile-cs2');
    expect(selection.matchedByProcess).toBe(true);
  });

  it('switches selection as the foreground app changes', () => {
    const st = twoGameState(true);
    expect(selectProfile(st, 'fortniteclient-win64-shipping.exe').profile?.name).toBe('Fortnite');
    expect(selectProfile(st, 'cs2.exe').profile?.name).toBe('CS2');
    expect(selectProfile(st, 'discord.exe').profile?.name).toBe('Default');
  });

  it('falls back to the active profile when nothing matches', () => {
    const st = twoGameState(true, 'profile-fortnite');
    expect(selectProfile(st, 'notepad.exe').profile?.id).toBe('profile-fortnite');
  });

  it('falls back to the default profile when the active id is stale', () => {
    const st = { ...twoGameState(true), activeProfileId: 'deleted-profile' };
    expect(selectProfile(st, 'notepad.exe').profile?.id).toBe(DEFAULT_PROFILE_ID);
  });

  it('falls back to the first profile when none is flagged default', () => {
    const st = state({
      enabled: true,
      activeProfileId: 'missing',
      profiles: [
        profile({ id: 'a', name: 'A', isDefault: false, slots: [] }),
        profile({ id: 'b', name: 'B', isDefault: false, slots: [] }),
      ],
    });
    expect(selectProfile(st, null).profile?.id).toBe('a');
  });

  it('returns a null profile rather than throwing on an empty config', () => {
    expect(selectProfile(state({ profiles: [] }), 'cs2.exe').profile).toBeNull();
  });

  it('never auto-selects a profile with no process names', () => {
    const st = state({
      enabled: true,
      autoSelectProfileByForegroundApp: true,
      profiles: [
        profile({ id: DEFAULT_PROFILE_ID, slots: [] }),
        profile({ id: 'x', name: 'X', isDefault: false, matchProcessNames: [], slots: [] }),
      ],
    });
    expect(selectProfile(st, 'anything.exe').profile?.id).toBe(DEFAULT_PROFILE_ID);
  });
});

describe('foreground restriction', () => {
  const restricted = { ...fortnite(), restrictToMatchedProcesses: true };

  it('is inert for a profile that did not opt in', () => {
    expect(isForegroundAllowed(fortnite(), 'notepad.exe', true)).toBe(true);
    expect(isForegroundAllowed(fortnite(), null, false)).toBe(true);
  });

  it('allows the matching game', () => {
    expect(
      isForegroundAllowed(restricted, 'FortniteClient-Win64-Shipping.exe', true),
    ).toBe(true);
  });

  it('blocks a different game', () => {
    expect(isForegroundAllowed(restricted, 'cs2.exe', true)).toBe(false);
  });

  it('blocks when the foreground app is unknown but tracking works', () => {
    expect(isForegroundAllowed(restricted, null, true)).toBe(false);
  });

  it('blocks when tracking is unavailable, honouring the explicit opt-in', () => {
    expect(isForegroundAllowed(restricted, null, false)).toBe(false);
    expect(isForegroundAllowed(restricted, 'fortniteclient-win64-shipping.exe', false)).toBe(false);
  });

  it('is inert when the restriction has no process names to check against', () => {
    const empty = { ...profile({ matchProcessNames: [] }), restrictToMatchedProcesses: true };
    expect(isForegroundAllowed(empty, 'anything.exe', true)).toBe(true);
  });

  it('explains the denial when tracking is unavailable', () => {
    const reason = foregroundDenialReason(restricted, null, false);
    expect(reason).toMatch(/cannot read the foreground application/i);
    expect(reason).toMatch(/fortniteclient-win64-shipping\.exe/i);
  });

  it('names the current foreground app in the denial', () => {
    const reason = foregroundDenialReason(restricted, 'notepad.exe', true);
    expect(reason).toMatch(/current: notepad\.exe/);
  });

  it('returns null when the switch is allowed', () => {
    expect(
      foregroundDenialReason(restricted, 'fortniteclient-win64-shipping.exe', true),
    ).toBeNull();
  });
});

describe('the shipped default profile makes no game assumptions', () => {
  it('has no process names and no restriction', () => {
    const def = createDefaultState().profiles[0];
    expect(def.matchProcessNames).toEqual([]);
    expect(def.restrictToMatchedProcesses).toBe(false);
    expect(def.isDefault).toBe(true);
  });

  it('is selected when no game profile matches', () => {
    const st = { ...twoGameState(true), activeProfileId: DEFAULT_PROFILE_ID };
    expect(selectProfile(st, 'somegame.exe').profile?.isDefault).toBe(true);
  });
});
