// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CrosshairsView } from '../src/components/views/CrosshairsView';
import { COMPLETE_CROSSHAIR_VAULT } from '../src/lib/crosshairCollection';
import { DEFAULT_CONFIG } from '../src/lib/defaultPresets';
import {
  loadCustomPresets,
  loadFavoriteIds,
  saveCustomPresets,
  saveFavoriteIds,
  toggleFavoriteId,
} from '../src/lib/storage';
import type { CrosshairConfig } from '../src/types/crosshair';

/**
 * Crosshair library browser.
 *
 * This view had two features that looked real but were not: starring a
 * crosshair was component state seeded from three hard-coded ids, and presets
 * the user saved in the designer were never listed anywhere. Both are asserted
 * here end to end, through `localStorage`, including across a remount — the
 * situation that exposed them in the first place.
 */

/** Preset names contain parentheses — never interpolate one into a RegExp raw. */
const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * The card for a given crosshair.
 *
 * Scoped to the card's own accessible name: the bookmark button inside it also
 * carries the crosshair name, so matching on the name alone finds two elements.
 */
const cardOf = (name: string) =>
  screen.getByRole('button', { name: new RegExp(`${escapeRegExp(name)}.*— select`) });

const customPreset = (id: string, name: string, extra: Partial<CrosshairConfig> = {}): CrosshairConfig => ({
  ...DEFAULT_CONFIG,
  id,
  name,
  isBuiltIn: false,
  ...extra,
});

function renderView(props: {
  searchQuery?: string;
  activeSubTab?: string;
  currentConfig?: CrosshairConfig;
  onSelectCrosshair?: (c: CrosshairConfig) => void;
  onOpenDesignerWithConfig?: (c: CrosshairConfig) => void;
} = {}) {
  const onSelectCrosshair = props.onSelectCrosshair ?? vi.fn();
  const onOpenDesignerWithConfig = props.onOpenDesignerWithConfig ?? vi.fn();
  const view = render(
    <CrosshairsView
      currentConfig={props.currentConfig ?? DEFAULT_CONFIG}
      onSelectCrosshair={onSelectCrosshair}
      onOpenDesignerWithConfig={onOpenDesignerWithConfig}
      searchQuery={props.searchQuery ?? ''}
      activeSubTab={props.activeSubTab ?? 'library'}
    />,
  );
  return { ...view, onSelectCrosshair, onOpenDesignerWithConfig };
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe('favourite persistence', () => {
  it('seeds three favourites on a first run so the tab is not empty', () => {
    expect(loadFavoriteIds()).toEqual(['pro-1', 'pro-2', 'pro-11']);
  });

  it('a starred crosshair is still starred after the view is remounted', () => {
    const target = COMPLETE_CROSSHAIR_VAULT.find((c) => c.id === 'pro-5')!;
    const { unmount } = renderView();
    expect(screen.getByLabelText(`Add ${target.name} to favourites`)).toBeTruthy();

    fireEvent.click(screen.getByLabelText(`Add ${target.name} to favourites`));
    expect(loadFavoriteIds()).toContain('pro-5');
    unmount();

    renderView();
    expect(screen.getByLabelText(`Remove ${target.name} from favourites`)).toBeTruthy();
  });

  it('un-starring is persisted too', () => {
    saveFavoriteIds(['pro-1']);
    renderView({ activeSubTab: 'saved' });
    const name = COMPLETE_CROSSHAIR_VAULT.find((c) => c.id === 'pro-1')!.name;
    fireEvent.click(screen.getByLabelText(`Remove ${name} from favourites`));
    expect(loadFavoriteIds()).toEqual([]);
  });

  it('the seed does not come back once the user has chosen to have no favourites', () => {
    saveFavoriteIds([]);
    expect(loadFavoriteIds()).toEqual([]);
    renderView();
    // Re-opening the view must not silently re-add the three defaults.
    expect(loadFavoriteIds()).toEqual([]);
  });

  it('the Favourites tab lists exactly the starred crosshairs', () => {
    saveFavoriteIds(['pro-3']);
    renderView({ activeSubTab: 'saved' });
    const cards = screen.getAllByRole('button', { name: /select, or press Enter twice/i });
    expect(cards).toHaveLength(1);
    expect(cards[0].getAttribute('aria-label')).toContain(
      COMPLETE_CROSSHAIR_VAULT.find((c) => c.id === 'pro-3')!.name,
    );
  });

  it('explains itself when there are no favourites rather than showing a blank grid', () => {
    saveFavoriteIds([]);
    renderView({ activeSubTab: 'saved' });
    expect(screen.getByText('No favourites yet')).toBeTruthy();
    expect(screen.getByText(/survive a restart/i)).toBeTruthy();
  });

  it('toggleFavoriteId adds, then removes, then adds again', () => {
    saveFavoriteIds([]);
    expect(toggleFavoriteId('pro-9')).toEqual(['pro-9']);
    expect(toggleFavoriteId('pro-9')).toEqual([]);
    expect(toggleFavoriteId('pro-9')).toEqual(['pro-9']);
  });

  it('saveFavoriteIds de-duplicates', () => {
    saveFavoriteIds(['pro-1', 'pro-1', 'pro-2']);
    expect(loadFavoriteIds()).toEqual(['pro-1', 'pro-2']);
  });

  it('survives a corrupt favourites blob', () => {
    localStorage.setItem('crshhx_favorites', '{not json');
    expect(loadFavoriteIds()).toEqual([]);

    localStorage.setItem('crshhx_favorites', JSON.stringify({ nope: true }));
    expect(loadFavoriteIds()).toEqual([]);

    localStorage.setItem('crshhx_favorites', JSON.stringify(['pro-1', 7, null, 'pro-1']));
    expect(loadFavoriteIds()).toEqual(['pro-1']);
  });
});

describe('saved custom presets appear in the library', () => {
  it('lists a preset the user saved, which the vault alone never showed', () => {
    saveCustomPresets([customPreset('custom-1', 'My Anchor')]);
    renderView();

    // The view lands on MY SAVED when the user has work of their own, so a
    // preset saved a moment ago is actually on screen.
    expect(screen.getByRole('button', { name: /MY SAVED \(1\)/ }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByText('My Anchor')).toBeTruthy();
    expect(screen.getByText('MINE')).toBeTruthy();
  });

  it('shows the count of user presets in the category pill', () => {
    saveCustomPresets([
      customPreset('custom-1', 'One'),
      customPreset('custom-2', 'Two'),
    ]);
    renderView();
    expect(screen.getByRole('button', { name: /MY SAVED \(2\)/ })).toBeTruthy();
  });

  it('the MY SAVED category filters to user presets only', () => {
    saveCustomPresets([customPreset('custom-1', 'My Anchor')]);
    renderView();
    fireEvent.click(screen.getByRole('button', { name: /MY SAVED \(1\)/ }));

    const cards = screen.getAllByRole('button', { name: /select, or press Enter twice/i });
    expect(cards).toHaveLength(1);
    expect(cards[0].getAttribute('aria-label')).toContain('My Anchor');
  });

  it('includes user presets in the ALL count', () => {
    saveCustomPresets([customPreset('custom-1', 'My Anchor')]);
    renderView();
    expect(screen.getByRole('button', { name: new RegExp(`ALL \\(${COMPLETE_CROSSHAIR_VAULT.length + 1}\\)`) })).toBeTruthy();
  });

  it('a saved preset can be selected and opened in the designer like any other', () => {
    const saved = customPreset('custom-7', 'My Anchor');
    saveCustomPresets([saved]);
    const { onSelectCrosshair, onOpenDesignerWithConfig } = renderView();

    // The card's accessible name is unique; the bookmark inside it is not.
    const card = cardOf('My Anchor');
    fireEvent.click(card);
    expect(onSelectCrosshair).toHaveBeenCalledWith(expect.objectContaining({ id: 'custom-7' }));

    fireEvent.doubleClick(card);
    expect(onOpenDesignerWithConfig).toHaveBeenCalledWith(expect.objectContaining({ id: 'custom-7' }));
  });

  it('explains how to get presets into MY SAVED when it is empty', () => {
    renderView();
    fireEvent.click(screen.getByRole('button', { name: /MY SAVED \(0\)/ }));
    expect(screen.getByText('No saved crosshairs yet')).toBeTruthy();
    expect(screen.getByText(/press Save/i)).toBeTruthy();
  });

  it('survives a corrupt custom-preset blob without crashing the grid', () => {
    localStorage.setItem('crshhx_custom_presets', '{"not":"an array"}');
    expect(loadCustomPresets()).toEqual([]);

    const { container } = renderView();
    expect(container.querySelectorAll('[role="button"]').length).toBeGreaterThan(0);
  });

  it('drops non-object entries from a partly corrupt list instead of rendering them', () => {
    localStorage.setItem('crshhx_custom_presets', JSON.stringify([null, 42, 'junk', customPreset('custom-1', 'Good')]));
    const loaded = loadCustomPresets();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].id).toBe('custom-1');

    renderView();
    expect(screen.getByText('Good')).toBeTruthy();
  });
});

describe('browsing', () => {
  it('marks the active crosshair', () => {
    // Note DEFAULT_CONFIG is a pro preset whose id is not in the vault, so the
    // active card has to be picked from the vault itself.
    const active = COMPLETE_CROSSHAIR_VAULT[0];
    renderView({ currentConfig: active });
    const card = cardOf(active.name);
    expect(card.getAttribute('aria-pressed')).toBe('true');
  });

  it('selects on click and opens the designer on double click', () => {
    const target = COMPLETE_CROSSHAIR_VAULT.find((c) => c.id.startsWith('pro-'))!;
    const { onSelectCrosshair, onOpenDesignerWithConfig } = renderView();
    const card = cardOf(target.name);

    fireEvent.click(card);
    expect(onSelectCrosshair).toHaveBeenCalledWith(expect.objectContaining({ id: target.id }));

    fireEvent.doubleClick(card);
    expect(onOpenDesignerWithConfig).toHaveBeenCalledWith(expect.objectContaining({ id: target.id }));
  });

  it('selects from the keyboard, since the card is not a real button', () => {
    const target = COMPLETE_CROSSHAIR_VAULT.find((c) => c.id.startsWith('pro-'))!;
    const { onSelectCrosshair } = renderView();
    const card = cardOf(target.name);

    expect(card.getAttribute('tabindex')).toBe('0');
    fireEvent.keyDown(card, { key: 'Enter' });
    expect(onSelectCrosshair).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(card, { key: ' ' });
    expect(onSelectCrosshair).toHaveBeenCalledTimes(2);

    fireEvent.keyDown(card, { key: 'a' });
    expect(onSelectCrosshair).toHaveBeenCalledTimes(2);
  });

  it('search matches on the name and reports how many are shown', () => {
    const target = COMPLETE_CROSSHAIR_VAULT[0];
    renderView({ searchQuery: target.name });
    const shown = screen.getByText(/Showing/).parentElement!.textContent!;
    expect(shown).toContain('1');
    expect(screen.getByText(target.name)).toBeTruthy();
  });

  it('search matches part of a name', () => {
    const target = COMPLETE_CROSSHAIR_VAULT[0];
    renderView({ searchQuery: target.name.slice(0, 5).toLowerCase() });
    expect(screen.getByText(target.name)).toBeTruthy();
  });

  it('shows a useful empty state that quotes the search term', () => {
    renderView({ searchQuery: 'zzz-no-such-crosshair' });
    expect(screen.getByText(/Nothing matches/)).toBeTruthy();
    expect(screen.getByText(/zzz-no-such-crosshair/)).toBeTruthy();
    expect(screen.getByText(/clear the search box/i)).toBeTruthy();
  });

  it('each bookmark button names the crosshair it belongs to', () => {
    saveFavoriteIds([]);
    const target = COMPLETE_CROSSHAIR_VAULT.find((c) => c.id.startsWith('pro-'))!;
    renderView();
    expect(screen.getByLabelText(`Add ${target.name} to favourites`)).toBeTruthy();
  });

  it('an already-favourited crosshair offers to remove it', () => {
    saveFavoriteIds(['pro-1']);
    renderView();
    const name = COMPLETE_CROSSHAIR_VAULT.find((c) => c.id === 'pro-1')!.name;
    const button = screen.getByLabelText(`Remove ${name} from favourites`);
    expect(button.getAttribute('aria-pressed')).toBe('true');
  });

  it('stops a bookmark click from also selecting the crosshair', () => {
    saveFavoriteIds([]);
    const target = COMPLETE_CROSSHAIR_VAULT.find((c) => c.id.startsWith('pro-'))!;
    const { onSelectCrosshair } = renderView();
    fireEvent.click(screen.getByLabelText(`Add ${target.name} to favourites`));
    expect(onSelectCrosshair).not.toHaveBeenCalled();
    expect(loadFavoriteIds()).toContain(target.id);
  });

  it('the PRO tab shows only the pro roster', () => {
    renderView({ activeSubTab: 'pros' });
    const cards = screen.getAllByRole('button', { name: /select, or press Enter twice/i });
    expect(cards.length).toBeGreaterThan(0);
    expect(cards.length).toBe(COMPLETE_CROSSHAIR_VAULT.filter((c) => c.id.startsWith('pro-')).length);
  });
});
