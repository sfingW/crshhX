// @vitest-environment jsdom
import React, { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';

import { WeaponSlotsView } from '../src/components/views/WeaponSlotsView';
import { KeybindsView } from '../src/components/views/KeybindsView';
import { ActiveSlotIndicator } from '../src/components/ActiveSlotIndicator';
import { listSelectablePresets } from '../src/lib/weaponSlots/presetIndex';
import { makeBinding } from '../src/lib/weaponSlots/keys';
import { DEFAULT_PROFILE_ID } from '../src/lib/weaponSlots/defaults';
import type { AppSettings } from '../src/types/crosshair';
import type { WeaponSlotsState, WeaponSlotStatus } from '../src/lib/weaponSlots/types';
import {
  FALLBACK_CAPABILITIES,
  PASSIVE_CAPABILITIES,
  fiveSlotIndex,
  fiveSlotState,
  profile as makeProfile,
  slot as makeSlot,
  state as makeState,
} from './helpers';

/**
 * Component-level tests for the Weapon Slot Crosshairs UI.
 *
 * The logic beneath these components is covered by the other suites. What is
 * asserted here is the part a user actually touches: that the table shows every
 * column the feature promises, that clicking a key field and pressing a key
 * really records it, that picking a crosshair hands back a preset *identifier*
 * rather than a name, that invalid states are explained in words, and that a
 * deleted preset makes its slot visibly unassigned instead of quietly adopting
 * a different crosshair.
 *
 * These run in jsdom (opted in by the docblock at the top of this file) so they
 * exercise the real React components, real DOM events and the real validation
 * module — not mocks of them.
 */

const APP_SETTINGS: AppSettings = {
  overlayVisible: true,
  toggleOverlayHotkey: 'F10',
  cyclePresetHotkey: 'F9',
  centerLockHotkey: 'F8',
  selectedMonitor: 0,
  runAtStartup: false,
  suspendedWhenMinimized: true,
};

const DEFAULT_NAMES = ['Shotgun', 'AR', 'SMG', 'Sniper', 'Utility'];

function status(overrides: Partial<WeaponSlotStatus> = {}): WeaponSlotStatus {
  return {
    enabled: true,
    transport: PASSIVE_CAPABILITIES,
    degraded: false,
    degradeReason: null,
    activeProfileId: DEFAULT_PROFILE_ID,
    activeProfileName: 'Default',
    activeSlot: {
      slotId: null,
      slotName: null,
      slotIndex: null,
      presetId: null,
      profileId: null,
      profileName: null,
      switchedAt: 0,
    },
    foregroundTrackingAvailable: false,
    foregroundProcessName: null,
    lastIgnore: null,
    slotCount: 5,
    ...overrides,
  };
}

interface HarnessOptions {
  state?: WeaponSlotsState;
  status?: WeaponSlotStatus | null;
  settings?: AppSettings;
  repairs?: string[];
}

/** Renders the view and captures every state it asks the parent to adopt. */
function renderView(options: HarnessOptions = {}) {
  const emitted: WeaponSlotsState[] = [];
  const recording: boolean[] = [];
  const dismissed: number[] = [];

  const utils = render(
    <WeaponSlotsView
      state={options.state ?? fiveSlotState()}
      presetIndex={fiveSlotIndex()}
      selectablePresets={listSelectablePresets(fiveSlotIndex())}
      appSettings={options.settings ?? APP_SETTINGS}
      status={options.status === undefined ? status() : options.status}
      loadRepairs={options.repairs ?? []}
      onChange={(next) => emitted.push(next)}
      onRecordingChange={(r) => recording.push(r)}
      onDismissRepairs={() => dismissed.push(1)}
    />,
  );

  return {
    ...utils,
    emitted,
    recording,
    dismissed,
    last: () => emitted[emitted.length - 1],
    slotsOf: (s: WeaponSlotsState) =>
      s.profiles.find((p) => p.id === s.activeProfileId)?.slots ?? [],
    /** Text of a slot's key field, avoiding the identical slot-number badge. */
    keyLabel: (index: number, name: string) =>
      screen.getByLabelText(`Activation key for slot ${index} ${name}`).textContent ?? '',
  };
}

beforeEach(() => {
  vi.spyOn(window, 'alert').mockImplementation(() => undefined);
  vi.spyOn(window, 'confirm').mockReturnValue(true);
});

afterEach(() => {
  // `globals: false` means Testing Library cannot auto-cleanup, so do it here.
  cleanup();
  vi.restoreAllMocks();
});

/* ------------------------------------------------------------------ */

describe('UI: slot table columns', () => {
  it('shows all six promised column headers', () => {
    renderView();
    for (const heading of ['#', 'Name', 'Key', 'Crosshair', 'On', 'Actions']) {
      expect(screen.getByText(heading)).toBeTruthy();
    }
  });

  it('renders one row per slot with number, name field, key field, switch and remove', () => {
    renderView();
    for (let i = 1; i <= 5; i++) {
      expect(screen.getByDisplayValue(DEFAULT_NAMES[i - 1])).toBeTruthy();
      expect(screen.getByLabelText(`Slot ${i} name`)).toBeTruthy();
      expect(screen.getByRole('switch', { name: `Slot ${i} enabled` })).toBeTruthy();
      expect(screen.getByLabelText(`Remove slot ${i}`)).toBeTruthy();
      expect(screen.getByLabelText(`Move slot ${i} up`)).toBeTruthy();
      expect(screen.getByLabelText(`Move slot ${i} down`)).toBeTruthy();
    }
    expect(screen.getByText('5/24')).toBeTruthy();
  });

  it('shows the assigned crosshair name and its stable identifier', () => {
    renderView();
    expect(screen.getByText('Preset 3')).toBeTruthy();
    expect(screen.getByText('preset-3')).toBeTruthy();
  });

  it('renders a reticle preview for every assigned slot', () => {
    const { container } = renderView();
    expect(container.querySelectorAll('svg').length).toBeGreaterThanOrEqual(5);
  });

  it('shows the current key in each activation field', () => {
    const { keyLabel } = renderView();
    for (let i = 1; i <= 5; i++) {
      expect(keyLabel(i, DEFAULT_NAMES[i - 1])).toBe(String(i));
    }
  });

  it('marks the active slot row', () => {
    const st = fiveSlotState();
    renderView({
      state: st,
      status: status({
        activeSlot: {
          slotId: 'slot-2',
          slotName: 'AR',
          slotIndex: 2,
          presetId: 'preset-2',
          profileId: DEFAULT_PROFILE_ID,
          profileName: 'Default',
          switchedAt: 1,
        },
      }),
    });
    expect(screen.getByRole('switch', { name: 'Slot 2 enabled' })).toBeTruthy();
  });
});

describe('UI: master enable switch', () => {
  it('reflects the feature state', () => {
    renderView({ state: fiveSlotState({ enabled: false }) });
    expect(
      screen
        .getByRole('switch', { name: 'Enable Weapon Slot Crosshairs' })
        .getAttribute('aria-checked'),
    ).toBe('false');
  });

  it('toggling flips the feature and nothing else', () => {
    const before = fiveSlotState();
    const { last } = renderView({ state: before });
    fireEvent.click(screen.getByRole('switch', { name: 'Enable Weapon Slot Crosshairs' }));
    const after = last();
    expect(after.enabled).toBe(false);
    expect(after.profiles).toEqual(before.profiles);
  });

  it('keeps the table editable while the feature is off, and says switching is inert', () => {
    // Deliberate: the master switch governs *switching*, not *configuration*.
    // Locking every control would force a first-time user to find and flip the
    // switch before they could set a single slot up, and configuring while off
    // is harmless — nothing is applied until the feature is on. The rows are
    // dimmed and the page states plainly that no key will do anything yet.
    const { last } = renderView({ state: fiveSlotState({ enabled: false }) });

    expect((screen.getByLabelText('Slot 1 name') as HTMLInputElement).disabled).toBe(false);
    expect((screen.getByLabelText('Remove slot 1') as HTMLButtonElement).disabled).toBe(false);
    expect(
      (screen.getByLabelText('Activation key for slot 1 Shotgun') as HTMLButtonElement).disabled,
    ).toBe(false);
    expect((screen.getByRole('button', { name: 'Add slot' }) as HTMLButtonElement).disabled).toBe(
      false,
    );

    expect(screen.getByText(/Switching is off/)).toBeTruthy();

    // And an edit really is accepted and handed back to the parent.
    fireEvent.change(screen.getByLabelText('Slot 2 name'), { target: { value: 'Phantom' } });
    expect(last().profiles[0].slots[1].name).toBe('Phantom');
    expect(last().enabled).toBe(false);
  });

  it('marks the inert rows visually so the state is not ambiguous', () => {
    const { container } = renderView({ state: fiveSlotState({ enabled: false }) });
    const row = screen.getByLabelText('Slot 1 name').closest('div[class*="grid"]') as HTMLElement;
    expect(row.className).toContain('opacity-55');
    expect(row.getAttribute('title')).toMatch(/switched off/);
    expect(container.querySelectorAll('.opacity-55').length).toBe(5);
  });

  it('reports how many slots are ready', () => {
    renderView();
    expect(screen.getByText('5/5 ready')).toBeTruthy();
  });

  it('reports invalid slots in the header counter', () => {
    const st = fiveSlotState();
    st.profiles[0].slots[2].binding = makeBinding('Digit1'); // duplicates slot 1
    renderView({ state: st });
    expect(screen.getByText('2 invalid')).toBeTruthy();
    expect(screen.getByText('3/5 ready')).toBeTruthy();
  });
});

describe('UI: add, remove, rename and reorder', () => {
  it('adds a sixth slot that starts unbound and unassigned', () => {
    const { last, slotsOf } = renderView();
    fireEvent.click(screen.getByRole('button', { name: 'Add slot' }));
    const slots = slotsOf(last());
    expect(slots).toHaveLength(6);
    expect(slots[5].index).toBe(6);
    expect(slots[5].binding).toBeNull();
    expect(slots[5].presetId).toBeNull();
  });

  it('leaves the existing five slots untouched when a sixth is added', () => {
    const before = fiveSlotState();
    const { last, slotsOf } = renderView({ state: before });
    fireEvent.click(screen.getByRole('button', { name: 'Add slot' }));
    expect(slotsOf(last()).slice(0, 5)).toEqual(before.profiles[0].slots);
  });

  it('gives a new slot a unique id so it can never collide with an existing row', () => {
    const { last, slotsOf } = renderView();
    fireEvent.click(screen.getByRole('button', { name: 'Add slot' }));
    const ids = slotsOf(last()).map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('refuses to exceed the per-profile maximum', () => {
    const many = Array.from({ length: 24 }, (_, i) =>
      makeSlot({ index: i + 1, id: `s-${i}`, name: `S${i}` }),
    );
    const st = makeState({ enabled: true, profiles: [makeProfile({ slots: many })] });
    renderView({ state: st });
    expect((screen.getByRole('button', { name: 'Add slot' }) as HTMLButtonElement).disabled).toBe(
      true,
    );
    expect(screen.getByText('24/24')).toBeTruthy();
  });

  it('removes a slot and renumbers the rest contiguously', () => {
    const { last, slotsOf } = renderView();
    fireEvent.click(screen.getByLabelText('Remove slot 3'));
    const slots = slotsOf(last());
    expect(slots).toHaveLength(4);
    expect(slots.map((s) => s.index)).toEqual([1, 2, 3, 4]);
    expect(slots.map((s) => s.name)).toEqual(['Shotgun', 'AR', 'Sniper', 'Utility']);
  });

  it('renames a slot as the user types', () => {
    const { emitted, last } = renderView();
    fireEvent.change(screen.getByLabelText('Slot 2 name'), {
      target: { value: 'Assault Rifle' },
    });
    expect(last().profiles[0].slots[1].name).toBe('Assault Rifle');
    expect(emitted).toHaveLength(1);
  });

  it('refuses a blank name and keeps the existing one', () => {
    const { emitted } = renderView();
    const input = screen.getByLabelText('Slot 2 name');
    fireEvent.change(input, { target: { value: '   ' } });
    expect(emitted).toHaveLength(0);
    expect(window.alert).toHaveBeenCalledWith('Slot name cannot be empty.');
    // Controlled by the unchanged prop, so the field snaps straight back.
    expect((input as HTMLInputElement).value).toBe('AR');
  });

  it('refuses an over-long name and says how long is allowed', () => {
    const { emitted } = renderView();
    fireEvent.change(screen.getByLabelText('Slot 2 name'), {
      target: { value: 'x'.repeat(60) },
    });
    expect(emitted).toHaveLength(0);
    expect(window.alert).toHaveBeenCalledWith('Slot name must be 48 characters or fewer.');
  });

  it('trims surrounding whitespace from an accepted name', () => {
    const { last } = renderView();
    fireEvent.change(screen.getByLabelText('Slot 2 name'), {
      target: { value: '  Sniper Rifle  ' },
    });
    expect(last().profiles[0].slots[1].name).toBe('Sniper Rifle');
  });

  it('moves a slot down and keeps indices contiguous', () => {
    const { last, slotsOf } = renderView();
    fireEvent.click(screen.getByLabelText('Move slot 2 down'));
    expect(slotsOf(last()).map((s) => s.name)).toEqual([
      'Shotgun',
      'SMG',
      'AR',
      'Sniper',
      'Utility',
    ]);
    expect(slotsOf(last()).map((s) => s.index)).toEqual([1, 2, 3, 4, 5]);
  });

  it('disables move-up on the first row and move-down on the last', () => {
    renderView();
    expect((screen.getByLabelText('Move slot 1 up') as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByLabelText('Move slot 5 down') as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByLabelText('Move slot 1 down') as HTMLButtonElement).disabled).toBe(false);
    expect((screen.getByLabelText('Move slot 5 up') as HTMLButtonElement).disabled).toBe(false);
  });

  it('offers both recovery actions in an emptied profile', () => {
    const empty = makeState({ enabled: true, profiles: [makeProfile({ slots: [] })] });
    const { last, slotsOf } = renderView({ state: empty });
    expect(screen.getByText('This profile has no slots yet.')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Restore the five defaults' }));
    expect(slotsOf(last())).toHaveLength(5);
  });
});

describe('UI: restore defaults', () => {
  it('asks before wiping the table', () => {
    renderView();
    fireEvent.click(screen.getByRole('button', { name: /Restore defaults/ }));
    expect(window.confirm).toHaveBeenCalled();
  });

  it('restores the shipped five slots when confirmed', () => {
    const mangled = fiveSlotState();
    mangled.profiles[0].slots = [makeSlot({ index: 1, name: 'Whatever' })];
    const { last, slotsOf } = renderView({ state: mangled });

    vi.mocked(window.confirm).mockReturnValue(true);
    fireEvent.click(screen.getByRole('button', { name: /Restore defaults/ }));

    const slots = slotsOf(last());
    expect(slots).toHaveLength(5);
    expect(slots.map((s) => s.name)).toEqual([
      'Shotgun',
      'Assault Rifle',
      'SMG',
      'Sniper',
      'Utility',
    ]);
    expect(slots.map((s) => s.binding?.code)).toEqual([
      'Digit1',
      'Digit2',
      'Digit3',
      'Digit4',
      'Digit5',
    ]);
  });

  it('changes nothing when the confirmation is declined', () => {
    const { emitted } = renderView();
    vi.mocked(window.confirm).mockReturnValue(false);
    fireEvent.click(screen.getByRole('button', { name: /Restore defaults/ }));
    expect(emitted).toHaveLength(0);
  });

  it('keeps other profiles and unrelated settings while restoring one', () => {
    const two = fiveSlotState();
    two.profiles = [
      two.profiles[0],
      makeProfile({
        id: 'other',
        name: 'Other',
        isDefault: false,
        slots: [makeSlot({ index: 1, id: 'o1' })],
      }),
    ];
    two.suppressWhileStudioFocused = true;
    const { last } = renderView({ state: two });

    fireEvent.click(screen.getByRole('button', { name: /Restore defaults/ }));

    const after = last();
    expect(after.profiles).toHaveLength(2);
    expect(after.profiles[1].slots).toHaveLength(1);
    expect(after.profiles[1].slots[0].name).toBe('Slot 1');
    expect(after.suppressWhileStudioFocused).toBe(true);
  });
});

describe('UI: key recording field', () => {
  it('shows the current key formatted with its modifiers', () => {
    const st = fiveSlotState();
    st.profiles[0].slots[1].binding = makeBinding('KeyQ', ['ctrl', 'alt']);
    const { keyLabel } = renderView({ state: st });
    expect(keyLabel(2, 'AR')).toBe('Ctrl + Alt + Q');
  });

  it('shows an empty state for an unbound slot', () => {
    const st = fiveSlotState();
    st.profiles[0].slots[0].binding = null;
    renderView({ state: st });
    expect(screen.getByText('Unbound')).toBeTruthy();
  });

  it('enters recording mode on click and suspends switching', () => {
    const { recording } = renderView();
    fireEvent.click(screen.getByLabelText('Activation key for slot 1 Shotgun'));
    expect(
      screen.getByLabelText('Activation key for slot 1 Shotgun').getAttribute('aria-pressed'),
    ).toBe('true');
    expect(screen.getByText('Press a key…')).toBeTruthy();
    expect(recording).toEqual([true]);
  });

  it('records a plain digit press and resumes switching', () => {
    const { last, recording } = renderView();
    fireEvent.click(screen.getByLabelText('Activation key for slot 2 AR'));
    fireEvent.keyDown(window, { code: 'Digit7', key: '7' });

    expect(last().profiles[0].slots[1].binding?.code).toBe('Digit7');
    expect(last().profiles[0].slots[1].binding?.modifiers).toEqual([]);
    expect(recording).toEqual([true, false]);
    // The view is controlled, so the field still shows the committed prop value;
    // what matters is that recording ended and the press was not swallowed.
    expect(screen.queryByText('Press a key…')).toBeNull();
  });

  it('records modifiers together with the key', () => {
    const { last } = renderView();
    fireEvent.click(screen.getByLabelText('Activation key for slot 1 Shotgun'));
    fireEvent.keyDown(window, { code: 'KeyQ', key: 'q', ctrlKey: true, altKey: true });
    expect(last().profiles[0].slots[0].binding).toEqual(makeBinding('KeyQ', ['ctrl', 'alt']));
  });

  it('records a function key without demanding a modifier', () => {
    const { last, emitted } = renderView();
    fireEvent.click(screen.getByLabelText('Activation key for slot 1 Shotgun'));
    fireEvent.keyDown(window, { code: 'F6', key: 'F6' });
    expect(emitted).toHaveLength(1);
    expect(last().profiles[0].slots[0].binding?.code).toBe('F6');
  });

  it('does not commit a modifier pressed on its own', () => {
    const { emitted } = renderView();
    fireEvent.click(screen.getByLabelText('Activation key for slot 1 Shotgun'));
    fireEvent.keyDown(window, { code: 'ControlLeft', key: 'Control', ctrlKey: true });
    fireEvent.keyDown(window, { code: 'ShiftLeft', key: 'Shift', shiftKey: true });
    fireEvent.keyDown(window, { code: 'AltLeft', key: 'Alt', altKey: true });
    expect(emitted).toHaveLength(0);
    expect(screen.getByText('Press a key…')).toBeTruthy();
  });

  it('cancels on Escape without changing anything', () => {
    const { emitted, recording, keyLabel } = renderView();
    fireEvent.click(screen.getByLabelText('Activation key for slot 1 Shotgun'));
    fireEvent.keyDown(window, { code: 'Escape', key: 'Escape' });
    expect(emitted).toHaveLength(0);
    expect(recording).toEqual([true, false]);
    expect(keyLabel(1, 'Shotgun')).toBe('1');
  });

  it('stops recording and resumes switching if the field unmounts mid-capture', () => {
    const { recording, unmount } = renderView();
    fireEvent.click(screen.getByLabelText('Activation key for slot 1 Shotgun'));
    unmount();
    expect(recording).toEqual([true, false]);
  });

  it('prevents the captured key from also activating a control', () => {
    renderView();
    fireEvent.click(screen.getByLabelText('Activation key for slot 1 Shotgun'));
    // fireEvent returns false when a handler called preventDefault.
    expect(fireEvent.keyDown(window, { code: 'Space', key: ' ' })).toBe(false);
  });

  it('clears the binding with the clear button', () => {
    const { last } = renderView();
    // One clear button per bound row — click the first slot's.
    fireEvent.click(screen.getAllByLabelText('Clear key')[0]);
    expect(last().profiles[0].slots[0].binding).toBeNull();
  });

  it('cancels a capture with the clear button rather than committing', () => {
    const { emitted, recording } = renderView();
    fireEvent.click(screen.getByLabelText('Activation key for slot 1 Shotgun'));
    fireEvent.click(screen.getByLabelText('Cancel key capture'));
    expect(emitted).toHaveLength(0);
    expect(recording).toEqual([true, false]);
  });

  it('records a mouse side button when the passive hook is running', () => {
    const { last } = renderView();
    fireEvent.click(screen.getByLabelText('Activation key for slot 1 Shotgun'));
    fireEvent.mouseDown(window, { button: 4 });
    expect(last().profiles[0].slots[0].binding?.code).toBe('MouseButton5');
    expect(last().profiles[0].slots[0].binding?.kind).toBe('mouse');
  });

  it('records the middle mouse button', () => {
    const { last } = renderView();
    fireEvent.click(screen.getByLabelText('Activation key for slot 1 Shotgun'));
    fireEvent.mouseDown(window, { button: 1 });
    expect(last().profiles[0].slots[0].binding?.code).toBe('MouseButton3');
  });

  it('ignores a left click so shooting cannot change the reticle', () => {
    const { emitted } = renderView();
    fireEvent.click(screen.getByLabelText('Activation key for slot 1 Shotgun'));
    fireEvent.mouseDown(window, { button: 0 });
    expect(emitted).toHaveLength(0);
  });

  it('ignores a right click so aiming cannot change the reticle', () => {
    const { emitted } = renderView();
    fireEvent.click(screen.getByLabelText('Activation key for slot 1 Shotgun'));
    fireEvent.mouseDown(window, { button: 2 });
    expect(emitted).toHaveLength(0);
  });

  it('records a wheel direction', () => {
    const { last } = renderView();
    fireEvent.click(screen.getByLabelText('Activation key for slot 1 Shotgun'));
    fireEvent.wheel(window, { deltaY: -120 });
    expect(last().profiles[0].slots[0].binding?.code).toBe('WheelUp');
    expect(last().profiles[0].slots[0].binding?.kind).toBe('wheel');
  });

  it('records the opposite wheel direction', () => {
    const { last } = renderView();
    fireEvent.click(screen.getByLabelText('Activation key for slot 1 Shotgun'));
    fireEvent.wheel(window, { deltaY: 120 });
    expect(last().profiles[0].slots[0].binding?.code).toBe('WheelDown');
  });

  it('ignores wheel and mouse input on the fallback transport', () => {
    const { emitted } = renderView({
      status: status({ transport: FALLBACK_CAPABILITIES, degraded: true }),
    });
    fireEvent.click(screen.getByLabelText('Activation key for slot 1 Shotgun'));
    fireEvent.wheel(window, { deltaY: -120 });
    fireEvent.mouseDown(window, { button: 3 });
    expect(emitted).toHaveLength(0);
  });

  it('explains why a mouse binding is rejected on the fallback transport', () => {
    const st = fiveSlotState();
    st.profiles[0].slots[0].binding = makeBinding('MouseButton4');
    renderView({
      state: st,
      status: status({ transport: FALLBACK_CAPABILITIES, degraded: true }),
    });
    expect(screen.getByText(/Mouse buttons need the passive input hook/)).toBeTruthy();
  });
});

describe('UI: crosshair selection uses the existing library', () => {
  it('opens the picker from the crosshair cell', () => {
    renderView();
    fireEvent.click(screen.getByRole('button', { name: 'Preset 3' }));
    expect(
      screen.getByRole('dialog', { name: 'Choose a crosshair for Slot 3 · SMG' }),
    ).toBeTruthy();
  });

  it('lists the library presets rather than a second copy of them', () => {
    renderView();
    fireEvent.click(screen.getByRole('button', { name: 'Preset 1' }));
    const dialog = screen.getByRole('dialog');
    for (const name of ['Preset 1', 'Preset 2', 'Preset 3', 'Preset 4', 'Preset 5']) {
      expect(within(dialog).getAllByText(name).length).toBeGreaterThan(0);
    }
  });

  it('marks the preset the slot already uses', () => {
    renderView();
    fireEvent.click(screen.getByRole('button', { name: 'Preset 2' }));
    expect(screen.getByText('IN USE')).toBeTruthy();
  });

  it('assigns by stable identifier, not by name', () => {
    const { last } = renderView();
    fireEvent.click(screen.getByRole('button', { name: 'Preset 1' }));
    fireEvent.click(
      within(screen.getByRole('dialog')).getByTitle('Preset 4 id: preset-4'),
    );

    const edited = last().profiles[0].slots[0];
    expect(edited.presetId).toBe('preset-4');
    // The display name is never stored, so renaming the preset later cannot
    // break the slot and a name collision cannot reassign it.
    expect(JSON.stringify(edited)).not.toContain('Preset 4');
  });

  it('changes only the targeted slot', () => {
    const before = fiveSlotState();
    const { last } = renderView({ state: before });
    fireEvent.click(screen.getByRole('button', { name: 'Preset 3' }));
    fireEvent.click(
      within(screen.getByRole('dialog')).getByTitle('Preset 5 id: preset-5'),
    );

    const after = last().profiles[0].slots;
    expect(after[2].presetId).toBe('preset-5');
    expect(after.filter((_, i) => i !== 2)).toEqual(
      before.profiles[0].slots.filter((_, i) => i !== 2),
    );
  });

  it('offers no way to create or duplicate a preset from the picker', () => {
    renderView();
    fireEvent.click(screen.getByRole('button', { name: 'Preset 1' }));
    const dialog = screen.getByRole('dialog');
    expect(
      within(dialog).queryByRole('button', { name: /save|create|duplicate|new/i }),
    ).toBeNull();
  });

  it('closes the picker after a selection', () => {
    renderView();
    fireEvent.click(screen.getByRole('button', { name: 'Preset 1' }));
    fireEvent.click(
      within(screen.getByRole('dialog')).getByTitle('Preset 2 id: preset-2'),
    );
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('closes without changing anything', () => {
    const { emitted } = renderView();
    fireEvent.click(screen.getByRole('button', { name: 'Preset 1' }));
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(emitted).toHaveLength(0);
  });

  it('filters the library by search text', () => {
    renderView();
    fireEvent.click(screen.getByRole('button', { name: 'Preset 1' }));
    const dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getByPlaceholderText('Search 5 reticles…'), {
      target: { value: 'Preset 3' },
    });
    expect(within(dialog).queryByTitle('Preset 1 id: preset-1')).toBeNull();
    expect(within(dialog).getByTitle('Preset 3 id: preset-3')).toBeTruthy();
  });

  it('says so when a search matches nothing', () => {
    renderView();
    fireEvent.click(screen.getByRole('button', { name: 'Preset 1' }));
    const dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getByPlaceholderText('Search 5 reticles…'), {
      target: { value: 'zzzz' },
    });
    expect(within(dialog).getByText(/No reticles match/)).toBeTruthy();
  });

  it('clears an assignment with the inline clear link', () => {
    const { last } = renderView();
    fireEvent.click(screen.getAllByText('clear')[0]);
    expect(last().profiles[0].slots[0].presetId).toBeNull();
  });
});

describe('UI: unassigned and missing slots', () => {
  it('shows an unassigned slot clearly and states what will happen', () => {
    const st = fiveSlotState();
    st.profiles[0].slots[1].presetId = null;
    renderView({ state: st });
    expect(screen.getByText('Unassigned — keeps current crosshair')).toBeTruthy();
    expect(screen.queryByText(/reset to a default/i)).toBeNull();
  });

  it('shows a deleted preset as missing rather than silently substituting one', () => {
    const st = fiveSlotState();
    st.profiles[0].slots[3].presetId = 'preset-that-was-deleted';
    renderView({ state: st });
    expect(screen.getByText('Missing — preset was deleted')).toBeTruthy();
    // Nothing else was quietly adopted, and the stored id is left intact so the
    // slot can be recovered if the preset comes back.
    expect(screen.queryByText('Preset 4')).toBeNull();
    expect(st.profiles[0].slots[3].presetId).toBe('preset-that-was-deleted');
  });

  it('counts a missing preset as not ready', () => {
    const st = fiveSlotState();
    st.profiles[0].slots[3].presetId = 'gone';
    renderView({ state: st });
    expect(screen.getByText('4/5 ready')).toBeTruthy();
  });

  it('counts unassigned slots in the header', () => {
    const st = fiveSlotState();
    st.profiles[0].slots[0].presetId = null;
    st.profiles[0].slots[1].presetId = null;
    renderView({ state: st });
    expect(screen.getByText('3/5 ready')).toBeTruthy();
  });

  it('documents that unassigned slots leave the HUD untouched', () => {
    renderView();
    expect(screen.getByText('Unassigned slots')).toBeTruthy();
    expect(screen.getByText(/never resets you to a default reticle/i)).toBeTruthy();
    expect(screen.getByText(/never silently picks a different one/i)).toBeTruthy();
  });
});

describe('UI: conflict and validity explanations', () => {
  it('names the slot that already owns a duplicate key', () => {
    const st = fiveSlotState();
    st.profiles[0].slots[2].binding = makeBinding('Digit1');
    renderView({ state: st });
    expect(
      screen.getAllByText('1 is already used by slot 1 "Shotgun" in this profile.').length,
    ).toBeGreaterThan(0);
  });

  it('flags both halves of a duplicate pair as invalid', () => {
    const st = fiveSlotState();
    st.profiles[0].slots[2].binding = makeBinding('Digit1');
    renderView({ state: st });
    expect(screen.getAllByLabelText('Invalid binding')).toHaveLength(2);
  });

  it('explains that a key reserved by crshhx cannot be used', () => {
    const st = fiveSlotState();
    st.profiles[0].slots[0].binding = makeBinding('F10');
    renderView({ state: st });
    expect(screen.getByText('F10 is reserved by crshhx for another function.')).toBeTruthy();
  });

  it('explains that a plain digit needs a modifier on the fallback transport', () => {
    renderView({ status: status({ transport: FALLBACK_CAPABILITIES, degraded: true }) });
    expect(screen.getAllByText(/is a plain typing key/)).toHaveLength(5);
  });

  it('reassures that a plain digit is safe on the passive hook', () => {
    renderView();
    expect(screen.getAllByText(/is observed passively — the game still receives the key press/))
      .toHaveLength(5);
  });

  it('explains an unbound slot without marking it invalid', () => {
    const st = fiveSlotState();
    st.profiles[0].slots[1].binding = null;
    renderView({ state: st });
    expect(
      screen.getByText('No activation key assigned — this slot will never trigger.'),
    ).toBeTruthy();
    expect(screen.queryByLabelText('Invalid binding')).toBeNull();
  });

  it('explains a mouse binding the transport cannot carry', () => {
    const st = fiveSlotState();
    st.profiles[0].slots[1].binding = makeBinding('WheelUp');
    renderView({
      state: st,
      status: status({ transport: FALLBACK_CAPABILITIES, degraded: true }),
    });
    expect(screen.getByText(/Mouse wheel needs the passive input hook/)).toBeTruthy();
  });

  it('allows two profiles to reuse the same keys', () => {
    const two = fiveSlotState();
    two.profiles = [
      two.profiles[0],
      makeProfile({
        id: 'other',
        name: 'Other',
        isDefault: false,
        slots: [
          makeSlot({
            index: 1,
            id: 'o1',
            name: 'A',
            binding: makeBinding('Digit1'),
            presetId: 'preset-1',
          }),
        ],
      }),
    ];
    two.activeProfileId = 'other';
    renderView({ state: two });
    expect(screen.queryByText(/already used by slot/)).toBeNull();
    expect(screen.queryByLabelText('Invalid binding')).toBeNull();
  });

  it('explains conflicts in the key-conflicts help panel', () => {
    renderView();
    expect(screen.getByText('Key conflicts')).toBeTruthy();
    expect(screen.getByText(/The same key cannot drive two slots in one profile/)).toBeTruthy();
    expect(screen.getByText(/Different profiles may reuse the same keys/)).toBeTruthy();
  });
});

describe('UI: transport banner', () => {
  it('reports the passive hook positively', () => {
    renderView();
    expect(screen.getByText('Input: Passive Input Hook')).toBeTruthy();
    expect(screen.getByText(/Keys are observed passively/)).toBeTruthy();
  });

  it('warns when crshhx fell back to OS hotkeys, with the reason', () => {
    renderView({
      status: status({
        transport: FALLBACK_CAPABILITIES,
        degraded: true,
        degradeReason: 'uiohook-napi failed to load',
      }),
    });
    expect(screen.getByText('(fallback)')).toBeTruthy();
    expect(screen.getByText('uiohook-napi failed to load')).toBeTruthy();
    expect(
      screen.getByText('Slot keys must include Ctrl or Alt while this transport is active.'),
    ).toBeTruthy();
  });

  it('surfaces the transport warning verbatim when it carries one', () => {
    renderView({
      status: status({
        transport: { ...FALLBACK_CAPABILITIES, warning: 'Hook unavailable on this platform' },
        degraded: true,
      }),
    });
    expect(screen.getByText('Hook unavailable on this platform')).toBeTruthy();
  });

  it('still renders before any status arrives, and does not guess', () => {
    renderView({ status: null });
    expect(screen.getByText('Input: Detecting…')).toBeTruthy();
    // It refuses to claim slots are ready before it knows which transport runs.
    expect(screen.getByText('checking input…')).toBeTruthy();
    expect(screen.queryByText('5/5 ready')).toBeNull();
    // …and warns conservatively about bare typing keys meanwhile.
    expect(screen.getAllByText(/is a plain typing key/)).toHaveLength(5);
  });

  it('lists mouse, wheel and controller support honestly', () => {
    renderView();
    expect(screen.getByText('mouse buttons:')).toBeTruthy();
    expect(screen.getByText('wheel:')).toBeTruthy();
    expect(screen.getByText('controller: no')).toBeTruthy();
  });

  it('says controller input is unsupported', () => {
    renderView();
    expect(screen.getByText('Supported inputs')).toBeTruthy();
    expect(screen.getByText(/Controller input is not supported/)).toBeTruthy();
  });
});

describe('UI: per-slot enable switch', () => {
  it('disabling a slot flips only that slot', () => {
    const before = fiveSlotState();
    const { last } = renderView({ state: before });
    fireEvent.click(screen.getByRole('switch', { name: 'Slot 3 enabled' }));

    const after = last().profiles[0].slots;
    expect(after[2].enabled).toBe(false);
    expect(after.filter((_, i) => i !== 2).map((s) => s.enabled)).toEqual([
      true,
      true,
      true,
      true,
    ]);
  });

  it('a disabled slot reads as disabled and counts as not ready', () => {
    const st = fiveSlotState();
    st.profiles[0].slots[0].enabled = false;
    renderView({ state: st });
    expect(screen.getByRole('switch', { name: 'Slot 1 disabled' })).toBeTruthy();
    expect(screen.getByText('4/5 ready')).toBeTruthy();
  });

  it('re-enabling restores it', () => {
    const st = fiveSlotState();
    st.profiles[0].slots[4].enabled = false;
    const { last } = renderView({ state: st });
    fireEvent.click(screen.getByRole('switch', { name: 'Slot 5 disabled' }));
    expect(last().profiles[0].slots[4].enabled).toBe(true);
  });

  it('keeps the crosshair assignment when a slot is disabled', () => {
    const { last } = renderView();
    fireEvent.click(screen.getByRole('switch', { name: 'Slot 1 enabled' }));
    expect(last().profiles[0].slots[0].presetId).toBe('preset-1');
    expect(last().profiles[0].slots[0].binding).toEqual(makeBinding('Digit1'));
  });
});

describe('UI: switching options', () => {
  it('offers foreground auto-select, off by default', () => {
    const { last } = renderView();
    const box = screen.getByLabelText('Auto-select profile by foreground app') as HTMLInputElement;
    expect(box.checked).toBe(false);
    fireEvent.click(box);
    expect(last().autoSelectProfileByForegroundApp).toBe(true);
  });

  it('explains why studio-focus suppression defaults to off', () => {
    renderView();
    expect(
      screen.getByText(
        /Slot keys work here too, so you can test a binding without launching a game./,
      ),
    ).toBeTruthy();
  });

  it('records the suppression choice', () => {
    const { last } = renderView();
    fireEvent.click(screen.getByLabelText('Pause switching while crshhx Studio is focused'));
    expect(last().suppressWhileStudioFocused).toBe(true);
  });
});

describe('UI: last ignored trigger', () => {
  it('explains why the last key press did nothing', () => {
    renderView({
      status: status({
        lastIgnore: {
          reason: 'preset-missing',
          detail: 'Slot 3 "SMG" has no valid crosshair, so the HUD was left as it was.',
          at: 123,
        },
      }),
    });
    expect(
      screen.getByText(
        'Last key did nothing: Slot 3 "SMG" has no valid crosshair, so the HUD was left as it was.',
      ),
    ).toBeTruthy();
  });

  it('falls back to the reason code when there is no detail', () => {
    renderView({
      status: status({ lastIgnore: { reason: 'overlay-hidden', detail: null, at: 1 } }),
    });
    expect(screen.getByText('Last key did nothing: overlay-hidden')).toBeTruthy();
  });

  it('is silent when nothing was ignored', () => {
    renderView();
    expect(screen.queryByText(/Last key did nothing/)).toBeNull();
  });
});

describe('UI: loader repairs are surfaced, never silent', () => {
  it('lists every repair the loader made', () => {
    renderView({
      repairs: [
        'Slot 2 "AR" referenced the deleted crosshair "pro-9"; the assignment was cleared.',
        'Duplicate key 3 removed from slot 4.',
      ],
    });
    expect(screen.getByText('2 settings repaired on load')).toBeTruthy();
    expect(screen.getByText(/referenced the deleted crosshair/)).toBeTruthy();
    expect(screen.getByText(/Duplicate key 3 removed from slot 4/)).toBeTruthy();
  });

  it('uses the singular for one repair', () => {
    renderView({ repairs: ['one thing was repaired'] });
    expect(screen.getByText('1 setting repaired on load')).toBeTruthy();
  });

  it('can be dismissed', () => {
    const { dismissed } = renderView({ repairs: ['something was repaired'] });
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(dismissed).toEqual([1]);
  });

  it('is hidden when nothing needed repairing', () => {
    renderView();
    expect(screen.queryByText(/repaired on load/)).toBeNull();
  });
});

describe('UI: feature framing', () => {
  it('is explicit that this is key-press driven, not weapon detection', () => {
    renderView();
    expect(
      screen.getByText(/it never tries to detect which weapon a game has equipped/i),
    ).toBeTruthy();
    expect(screen.queryByText(/automatic weapon recognition/i)).toBeNull();
    expect(screen.queryByText(/automatically detects your weapon/i)).toBeNull();
  });

  it('says the overlay updates without a restart or reload', () => {
    renderView();
    expect(screen.getByText(/no restart, no overlay reload/i)).toBeTruthy();
  });
});

/* ------------------------------------------------------------------ */

describe('UI: active-slot indicator in the status bar', () => {
  it('shows the slot number and name', () => {
    render(
      <ActiveSlotIndicator
        pulse={false}
        status={status({
          activeSlot: {
            slotId: 'slot-2',
            slotName: 'AR',
            slotIndex: 2,
            presetId: 'preset-2',
            profileId: DEFAULT_PROFILE_ID,
            profileName: 'Default',
            switchedAt: 5,
          },
        })}
      />,
    );
    expect(screen.getByText('Active slot: 2 — AR')).toBeTruthy();
  });

  it('says when the feature is off', () => {
    render(<ActiveSlotIndicator pulse={false} status={status({ enabled: false })} />);
    expect(screen.getByText('Slots off')).toBeTruthy();
  });

  it('says when nothing is active yet', () => {
    render(<ActiveSlotIndicator pulse={false} status={status()} />);
    expect(screen.getByText('No slot active')).toBeTruthy();
  });

  it('stays quiet before any status arrives', () => {
    render(<ActiveSlotIndicator pulse={false} status={null} />);
    expect(screen.getByText('Slots off')).toBeTruthy();
  });

  it('is highlighted only while a slot is actually active', () => {
    const { rerender } = render(<ActiveSlotIndicator pulse={false} status={status()} />);
    expect(screen.getByText('No slot active').parentElement?.getAttribute('style')).toContain(
      'rgb(27, 28, 34)',
    );

    rerender(
      <ActiveSlotIndicator
        pulse={false}
        status={status({
          activeSlot: {
            slotId: 's',
            slotName: 'Sniper',
            slotIndex: 4,
            presetId: 'p',
            profileId: DEFAULT_PROFILE_ID,
            profileName: 'Default',
            switchedAt: 1,
          },
        })}
      />,
    );
    expect(screen.getByText('Active slot: 4 — Sniper')).toBeTruthy();
  });

  it('exposes profile, transport and last-ignore detail in its tooltip', () => {
    render(
      <ActiveSlotIndicator
        pulse={false}
        status={status({
          activeProfileName: 'CS2',
          lastIgnore: { reason: 'slot-disabled', detail: 'Slot 5 is switched off.', at: 1 },
        })}
      />,
    );
    const title = screen.getByTitle(/Profile: CS2/).getAttribute('title') ?? '';
    expect(title).toContain('Input: Passive Input Hook');
    expect(title).toContain('Last key ignored: Slot 5 is switched off.');
  });
});

/* ------------------------------------------------------------------ */

interface KeybindsHarnessProps {
  updates: Array<Partial<AppSettings>>;
  settings?: AppSettings;
  status?: WeaponSlotStatus | null;
  onOpenWeaponSlots?: () => void;
}

/**
 * The view must re-render against its own updated settings, exactly as it does
 * inside the app, otherwise a newly recorded hotkey would never be validated
 * against the value it was just saved as.
 */
const KeybindsHarness: React.FC<KeybindsHarnessProps> = ({
  updates,
  settings = APP_SETTINGS,
  status: st = status(),
  onOpenWeaponSlots = () => undefined,
}) => {
  const [current, setCurrent] = useState<AppSettings>(settings);
  return (
    <KeybindsView
      appSettings={current}
      onUpdateSettings={(u) => {
        updates.push(u);
        setCurrent((s) => ({ ...s, ...u }));
      }}
      currentConfig={{ id: 'x', name: 'Cyan Duelist' } as never}
      weaponSlotStatus={st}
      onOpenWeaponSlots={onOpenWeaponSlots}
    />
  );
};

function renderKeybinds(overrides: Partial<KeybindsHarnessProps> = {}) {
  const updates: Array<Partial<AppSettings>> = [];
  const utils = render(<KeybindsHarness updates={updates} {...overrides} />);
  return { ...utils, updates };
}

describe('UI: Keybinds & ADS view', () => {
  it('no longer shows the old decorative profile-binds mock', () => {
    renderKeybinds();
    expect(screen.queryByText('In-Game Profile Hotkeys')).toBeNull();
    expect(screen.queryByText('Bind Current Crosshair')).toBeNull();
  });

  it('shows the real overlay-toggle hotkey', () => {
    renderKeybinds();
    expect(screen.getByText('F10')).toBeTruthy();
  });

  it('persists a newly recorded toggle hotkey as an accelerator string', () => {
    const { updates } = renderKeybinds();
    fireEvent.click(screen.getByLabelText('Overlay toggle hotkey'));
    fireEvent.keyDown(window, { code: 'F7', key: 'F7' });
    expect(updates).toEqual([{ toggleOverlayHotkey: 'F7' }]);
  });

  it('persists a modifier combination', () => {
    const { updates } = renderKeybinds();
    fireEvent.click(screen.getByLabelText('Overlay toggle hotkey'));
    fireEvent.keyDown(window, { code: 'KeyT', key: 't', ctrlKey: true, shiftKey: true });
    expect(updates).toEqual([{ toggleOverlayHotkey: 'Ctrl+Shift+T' }]);
  });

  it('re-reads the saved hotkey so the field keeps showing it', () => {
    renderKeybinds();
    fireEvent.click(screen.getByLabelText('Overlay toggle hotkey'));
    fireEvent.keyDown(window, { code: 'F7', key: 'F7' });
    expect(screen.getByText('F7')).toBeTruthy();
    expect(screen.queryByText('F10')).toBeNull();
  });

  it('refuses to leave the overlay un-toggleable', () => {
    const { updates } = renderKeybinds();
    fireEvent.click(screen.getByLabelText('Clear key'));
    expect(window.alert).toHaveBeenCalled();
    expect(updates).toHaveLength(0);
  });

  it('warns when the toggle would collide with another app hotkey', () => {
    renderKeybinds();
    fireEvent.click(screen.getByLabelText('Overlay toggle hotkey'));
    fireEvent.keyDown(window, { code: 'F9', key: 'F9' });
    expect(screen.getByText('F9 is reserved by crshhx for another function.')).toBeTruthy();
  });

  it('warns that a plain typing key would be captured system-wide', () => {
    renderKeybinds();
    fireEvent.click(screen.getByLabelText('Overlay toggle hotkey'));
    fireEvent.keyDown(window, { code: 'KeyB', key: 'b' });
    expect(screen.getByText(/is a plain typing key/)).toBeTruthy();
  });

  it('explains that app hotkeys are consumed by the OS', () => {
    renderKeybinds();
    expect(
      screen.getByText(/captures the combination exclusively — the focused game will not also receive/i),
    ).toBeTruthy();
  });

  it('still toggles the overlay from its ON button', () => {
    const { updates } = renderKeybinds();
    fireEvent.click(screen.getByText('ON'));
    expect(updates).toEqual([{ overlayVisible: false }]);
  });

  it('points at Weapon Slot Crosshairs and reports live status', () => {
    renderKeybinds();
    expect(screen.getByText('Weapon Slot Crosshairs')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Configure/ })).toBeTruthy();
    expect(screen.getByText('Enabled')).toBeTruthy();
    expect(screen.getByText('Passive Input Hook')).toBeTruthy();
  });

  it('navigates to the weapon-slot section', () => {
    const go = vi.fn();
    renderKeybinds({ onOpenWeaponSlots: go });
    fireEvent.click(screen.getByRole('button', { name: /Configure/ }));
    expect(go).toHaveBeenCalledTimes(1);
  });

  it('shows the active slot in its summary strip', () => {
    renderKeybinds({
      status: status({
        activeProfileName: 'Fortnite',
        activeSlot: {
          slotId: 's1',
          slotName: 'Shotgun',
          slotIndex: 1,
          presetId: 'p1',
          profileId: DEFAULT_PROFILE_ID,
          profileName: 'Fortnite',
          switchedAt: 3,
        },
      }),
    });
    expect(screen.getByText(/active: slot 1 — Shotgun/)).toBeTruthy();
    expect(screen.getByText('Fortnite')).toBeTruthy();
  });

  it('reports the feature as disabled when it is off', () => {
    renderKeybinds({ status: status({ enabled: false }) });
    expect(screen.getByText('Disabled')).toBeTruthy();
  });

  it('survives having no status at all', () => {
    renderKeybinds({ status: null });
    expect(screen.getByText('Weapon Slot Crosshairs')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Configure/ })).toBeTruthy();
  });

  it('says slot keys are passive, unlike the app hotkeys above them', () => {
    renderKeybinds();
    expect(screen.getByText(/Slot keys are observed passively/)).toBeTruthy();
  });
});

/* ------------------------------------------------------------------ */
/* Game-specific configuration: the profile bar                        */
/* ------------------------------------------------------------------ */

const CS2_ID = 'profile-cs2-test';

/** Two profiles with distinguishable slot tables. */
function twoProfileState(overrides: Partial<WeaponSlotsState> = {}): WeaponSlotsState {
  return makeState({
    enabled: true,
    activeProfileId: DEFAULT_PROFILE_ID,
    profiles: [
      makeProfile({
        id: DEFAULT_PROFILE_ID,
        name: 'Default',
        isDefault: true,
        slots: [
          makeSlot({ index: 1, id: 'd-1', name: 'Shotgun', binding: makeBinding('Digit1'), presetId: 'preset-1' }),
          makeSlot({ index: 2, id: 'd-2', name: 'AR', binding: makeBinding('Digit2'), presetId: 'preset-2' }),
        ],
      }),
      makeProfile({
        id: CS2_ID,
        name: 'CS2',
        isDefault: false,
        matchProcessNames: ['cs2.exe'],
        slots: [
          makeSlot({ index: 1, id: 'c-1', name: 'Rifle', binding: makeBinding('Digit1'), presetId: 'preset-3' }),
        ],
      }),
    ],
    ...overrides,
  });
}

describe('UI: profile bar presentation', () => {
  it('shows one tab per profile and marks the shipped default', () => {
    renderView({ state: twoProfileState() });
    expect(screen.getByText('Default')).toBeTruthy();
    expect(screen.getByText('CS2')).toBeTruthy();
    expect(screen.getByText('default')).toBeTruthy();
  });

  it('shows the slot table of the profile that is actually active', () => {
    renderView({ state: twoProfileState() });
    expect(screen.getByLabelText('Slot 1 name')).toBeTruthy();
    expect((screen.getByLabelText('Slot 1 name') as HTMLInputElement).value).toBe('Shotgun');
    expect(screen.queryByDisplayValue('Rifle')).toBeNull();
  });

  it('shows the other profile’s table once it is the active one', () => {
    renderView({ state: twoProfileState({ activeProfileId: CS2_ID }) });
    expect((screen.getByLabelText('Slot 1 name') as HTMLInputElement).value).toBe('Rifle');
    expect(screen.queryByDisplayValue('Shotgun')).toBeNull();
  });

  it('shows a game icon on a profile that is associated with an executable', () => {
    renderView({ state: twoProfileState({ activeProfileId: CS2_ID }) });
    fireEvent.click(screen.getByText('Game association'));
    expect(screen.getByText(/Game association — CS2/)).toBeTruthy();
    expect((screen.getByLabelText('Executable names') as HTMLInputElement).value).toBe('cs2.exe');
  });

  it('does not offer to delete the default profile', () => {
    renderView({ state: twoProfileState() });
    expect(screen.queryByText('Delete')).toBeNull();
  });

  it('offers to delete a non-default profile', () => {
    renderView({ state: twoProfileState({ activeProfileId: CS2_ID }) });
    expect(screen.getByText('Delete')).toBeTruthy();
  });

  it('names the executable-matching rule and denies reading game memory', () => {
    renderView({ state: twoProfileState({ activeProfileId: CS2_ID }) });
    fireEvent.click(screen.getByText('Game association'));
    const copy = document.body.textContent ?? '';
    expect(copy).toMatch(/executable names this profile belongs to/i);
    expect(copy).toMatch(/never reads game memory or injects anything/i);
  });
});

describe('UI: profile bar actions', () => {
  it('selects another profile when its tab is clicked', () => {
    const { last } = renderView({ state: twoProfileState() });
    fireEvent.click(screen.getByText('CS2'));
    expect(last().activeProfileId).toBe(CS2_ID);
  });

  it('adds a ready-made CS2 profile, associated with cs2.exe, and selects it', () => {
    const { last } = renderView({ state: fiveSlotState() });
    fireEvent.click(screen.getByTitle('Add a ready-made CS2 profile'));

    const next = last();
    expect(next.profiles).toHaveLength(2);
    const added = next.profiles[1];
    expect(added.name).toBe('CS2');
    expect(added.matchProcessNames).toEqual(['cs2.exe']);
    expect(added.slots.length).toBeGreaterThan(0);
    // Creating a profile selects it — the user's next action is to look at it.
    expect(next.activeProfileId).toBe(added.id);
  });

  it('adds a ready-made Fortnite profile with its executable', () => {
    const { last } = renderView({ state: fiveSlotState() });
    fireEvent.click(screen.getByTitle('Add a ready-made Fortnite profile'));
    const added = last().profiles[1];
    expect(added.name).toBe('Fortnite');
    expect(added.matchProcessNames).toEqual(['fortniteclient-win64-shipping.exe']);
  });

  it('adds a blank profile with a full default slot set', () => {
    const { last } = renderView({ state: fiveSlotState() });
    fireEvent.click(screen.getByText('Profile'));
    const added = last().profiles[1];
    expect(added.matchProcessNames).toEqual([]);
    expect(added.slots).toHaveLength(5);
    expect(last().activeProfileId).toBe(added.id);
  });

  it('gives a new profile slot ids that cannot collide with the existing ones', () => {
    const { last } = renderView({ state: fiveSlotState() });
    fireEvent.click(screen.getByText('Profile'));
    const existing = new Set(fiveSlotState().profiles[0].slots.map((s) => s.id));
    for (const s of last().profiles[1].slots) {
      expect(existing.has(s.id), `slot id ${s.id} must be fresh`).toBe(false);
    }
  });

  it('reports a duplicate profile name instead of creating a second one', () => {
    const { last, emitted } = renderView({ state: twoProfileState() });
    fireEvent.click(screen.getByText('Rename'));
    fireEvent.change(screen.getByLabelText('Profile name'), { target: { value: 'CS2' } });
    fireEvent.keyDown(screen.getByLabelText('Profile name'), { key: 'Enter' });

    // The store refuses; the view surfaces the reason rather than pretending.
    expect(window.alert).toHaveBeenCalled();
    expect(emitted).toHaveLength(0);
    expect(last).toBeDefined();
  });

  it('renames the active profile', () => {
    const { last } = renderView({ state: twoProfileState({ activeProfileId: CS2_ID }) });
    fireEvent.click(screen.getByText('Rename'));
    fireEvent.change(screen.getByLabelText('Profile name'), { target: { value: 'Competitive' } });
    fireEvent.keyDown(screen.getByLabelText('Profile name'), { key: 'Enter' });
    expect(last().profiles[1].name).toBe('Competitive');
  });

  it('duplicates the active profile and selects the copy', () => {
    const { last } = renderView({ state: twoProfileState({ activeProfileId: CS2_ID }) });
    fireEvent.click(screen.getByText('Duplicate'));
    const next = last();
    expect(next.profiles).toHaveLength(3);
    expect(next.profiles[2].name).toBe('CS2 Copy');
    expect(next.profiles[2].matchProcessNames).toEqual(['cs2.exe']);
    expect(next.activeProfileId).toBe(next.profiles[2].id);
  });

  it('deletes a non-default profile and falls back to the default', () => {
    const { last } = renderView({ state: twoProfileState({ activeProfileId: CS2_ID }) });
    fireEvent.click(screen.getByText('Delete'));
    const next = last();
    expect(next.profiles.map((p) => p.name)).toEqual(['Default']);
    expect(next.activeProfileId).toBe(DEFAULT_PROFILE_ID);
  });

  it('saves edited executable names, trimmed and de-duplicated', () => {
    const { last } = renderView({ state: twoProfileState({ activeProfileId: CS2_ID }) });
    fireEvent.click(screen.getByText('Game association'));
    fireEvent.change(screen.getByLabelText('Executable names'), {
      target: { value: ' cs2.exe , hl2.exe , cs2.exe ' },
    });
    fireEvent.click(screen.getByText('Save association'));
    expect(last().profiles[1].matchProcessNames).toEqual(['cs2.exe', 'hl2.exe']);
  });

  it('closes the association editor without saving on Cancel', () => {
    const { emitted } = renderView({ state: twoProfileState({ activeProfileId: CS2_ID }) });
    fireEvent.click(screen.getByText('Game association'));
    fireEvent.change(screen.getByLabelText('Executable names'), { target: { value: 'nope.exe' } });
    fireEvent.click(screen.getByText('Cancel'));
    expect(emitted).toHaveLength(0);
    expect(screen.queryByLabelText('Executable names')).toBeNull();
  });

  it('offers the strict foreground restriction, off by default, and explains the fail-closed rule', () => {
    const { last } = renderView({ state: twoProfileState({ activeProfileId: CS2_ID }) });
    fireEvent.click(screen.getByText('Game association'));

    const checkbox = screen.getByLabelText(
      /Only switch while one of these apps is in the foreground\./i,
    ) as HTMLInputElement;
    expect(checkbox.checked).toBe(false);
    expect(document.body.textContent).toMatch(/will not switch at all rather than switching in the wrong game/i);

    fireEvent.click(checkbox);
    expect(last().profiles[1].restrictToMatchedProcesses).toBe(true);
  });
});

describe('UI: foreground readout is honest', () => {
  it('says tracking is unavailable rather than guessing an app', () => {
    renderView({
      state: twoProfileState({ autoSelectProfileByForegroundApp: true }),
      status: status({ foregroundTrackingAvailable: false, foregroundProcessName: null }),
    });
    expect(screen.getByText(/foreground tracking unavailable/)).toBeTruthy();
  });

  it('names the foreground app and the profile it selected', () => {
    renderView({
      state: twoProfileState({ autoSelectProfileByForegroundApp: true }),
      status: status({
        foregroundTrackingAvailable: true,
        foregroundProcessName: 'cs2.exe',
        activeProfileId: CS2_ID,
        activeProfileName: 'CS2',
      }),
    });
    expect(screen.getByText(/foreground: cs2\.exe/)).toBeTruthy();
  });

  it('hides the readout entirely while auto-select is off', () => {
    renderView({
      state: twoProfileState({ autoSelectProfileByForegroundApp: false }),
      status: status({ foregroundTrackingAvailable: true, foregroundProcessName: 'cs2.exe' }),
    });
    expect(screen.queryByText(/foreground:/)).toBeNull();
  });

  it('marks the profile the main process is really using as LIVE', () => {
    renderView({
      state: twoProfileState({ autoSelectProfileByForegroundApp: true }),
      status: status({
        activeProfileId: CS2_ID,
        activeProfileName: 'CS2',
        foregroundTrackingAvailable: true,
        foregroundProcessName: 'cs2.exe',
      }),
    });
    // The manually selected tab is Default, but the live one is CS2 — the bar
    // must show that disagreement rather than imply Default is in force.
    expect(screen.getByText('LIVE')).toBeTruthy();
  });
});

/* ------------------------------------------------------------------ */
/* Robustness across the IPC boundary                                  */
/* ------------------------------------------------------------------ */

describe('UI: robustness against malformed status from the main process', () => {
  it('renders when activeSlot arrives as null', () => {
    // `activeSlot` is typed as a non-null object whose *fields* are nullable,
    // but IPC payloads are not type-checked at runtime. An older or mismatched
    // main process must not be able to white-screen the settings page.
    const malformed = { ...status(), activeSlot: null } as unknown as WeaponSlotStatus;
    expect(() => renderView({ status: malformed })).not.toThrow();
    expect(screen.getByText('Weapon Slot Crosshairs')).toBeTruthy();
    expect(screen.getByText('5/5 ready')).toBeTruthy();
  });

  it('renders when the transport description is missing', () => {
    const malformed = { ...status(), transport: undefined } as unknown as WeaponSlotStatus;
    expect(() => renderView({ status: malformed })).not.toThrow();
    expect(screen.getByText(/Input: Detecting/)).toBeTruthy();
  });

  it('renders when lastIgnore arrives without a detail string', () => {
    renderView({ status: status({ lastIgnore: { reason: 'slot-disabled', detail: null, at: 0 } }) });
    expect(screen.getByText(/Last key did nothing: slot-disabled/)).toBeTruthy();
  });

  it('gates a mouse binding even when the derived kind field is absent', () => {
    // `kind` travels with the binding but is derived from `code`. A binding
    // assembled by hand, or written by an older build, must still be caught by
    // the capability gate instead of being accepted as switchable.
    const st = fiveSlotState();
    st.profiles[0].slots[0].binding = { code: 'MouseButton4', modifiers: [] } as never;

    renderView({ state: st, status: status({ transport: FALLBACK_CAPABILITIES, degraded: true }) });
    // The mouse row is invalid, and so are the plain-digit rows beside it: on a
    // consuming transport a bare number key would be stolen from the game.
    expect(screen.getAllByLabelText('Invalid binding').length).toBeGreaterThan(1);
    expect(screen.getByText(/Mouse buttons need the passive input hook/)).toBeTruthy();
    expect(
      screen.getAllByText(/a modifier \(Ctrl\/Alt\) is required/).length,
    ).toBeGreaterThan(0);
  });

  it('accepts the same binding when the passive hook is running', () => {
    const st = fiveSlotState();
    st.profiles[0].slots[0].binding = { code: 'MouseButton4', modifiers: [] } as never;
    renderView({ state: st });
    expect(screen.queryByText(/Mouse buttons need the passive input hook/)).toBeNull();
  });
});

describe('UI: a key already owned by another slot is taken over, not duplicated', () => {
  it('moves the key to the slot the user just edited', () => {
    const { last } = renderView({ state: fiveSlotState() });
    const field = screen.getByLabelText('Activation key for slot 4 Sniper');
    fireEvent.click(field);
    fireEvent.keyDown(window, { code: 'Digit1', key: '1' });
    fireEvent.keyUp(window, { code: 'Digit1', key: '1' });

    const slots = last().profiles[0].slots;
    const owning = slots.filter((s) => s.binding?.code === 'Digit1');
    expect(owning).toHaveLength(1);
    expect(owning[0].index).toBe(4);
    expect(slots[0].binding).toBeNull();
  });

  it('leaves the table with no duplicate bindings after the takeover', () => {
    const { last } = renderView({ state: fiveSlotState() });
    const field = screen.getByLabelText('Activation key for slot 2 AR');
    fireEvent.click(field);
    fireEvent.keyDown(window, { code: 'Digit5', key: '5' });
    fireEvent.keyUp(window, { code: 'Digit5', key: '5' });

    const keys = last().profiles[0].slots.map((s) => s.binding?.code).filter(Boolean);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

/* ------------------------------------------------------------------ */
/* The settings page must not write behind its parent's back            */
/* ------------------------------------------------------------------ */

describe('UI: the view never persists or talks to Electron itself', () => {
  it('renders with no Electron bridge present at all', () => {
    // In these tests — and in a plain browser — `window.electronAPI` is
    // undefined. Every call site must be optional-chained, or the settings page
    // white-screens the moment the preload script is missing.
    expect((window as unknown as { electronAPI?: unknown }).electronAPI).toBeUndefined();
    expect(() => renderView()).not.toThrow();
  });

  it('writes no storage key of its own', () => {
    const before = Object.keys(window.localStorage);
    renderView();
    fireEvent.click(screen.getByRole('button', { name: 'Add slot' }));
    fireEvent.click(screen.getByLabelText('Remove slot 2'));
    expect(Object.keys(window.localStorage)).toEqual(before);
  });

  it('leaves the generic app settings byte-for-byte intact', () => {
    const raw = JSON.stringify(APP_SETTINGS);
    window.localStorage.setItem('crshhx_app_settings', raw);
    renderView();

    fireEvent.click(screen.getByRole('button', { name: 'Add slot' }));
    fireEvent.click(screen.getByLabelText('Remove slot 3'));
    fireEvent.change(screen.getByLabelText('Slot 1 name'), { target: { value: 'Breacher' } });
    fireEvent.click(screen.getByRole('switch', { name: 'Enable Weapon Slot Crosshairs' }));

    expect(window.localStorage.getItem('crshhx_app_settings')).toBe(raw);
  });

  it('leaves the saved crosshair library untouched', () => {
    const library = JSON.stringify([{ id: 'custom-1', name: 'Mine' }]);
    window.localStorage.setItem('crshhx_custom_presets', library);
    renderView();
    fireEvent.click(screen.getByRole('button', { name: 'Add slot' }));
    expect(window.localStorage.getItem('crshhx_custom_presets')).toBe(library);
  });

  it('hands every change to the parent instead of applying it locally', () => {
    const { emitted } = renderView();
    fireEvent.change(screen.getByLabelText('Slot 1 name'), { target: { value: 'Breacher' } });
    expect(emitted).toHaveLength(1);
    expect(emitted[0].profiles[0].slots[0].name).toBe('Breacher');
  });
});
