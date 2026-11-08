// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ProCrosshairsView } from '../src/components/views/ProCrosshairsView';
import {
  PRO_CROSSHAIR_ENTRIES,
  VERIFIED_TIER_NOTE,
} from '../src/lib/proCrosshairs';
import type { CrosshairConfig } from '../src/types/crosshair';

/**
 * Pro Crosshairs view: library navigation, honest tier labelling, favourites,
 * and the preview bench (background, zoom, colour override, compare, apply).
 */

function renderView(overrides: Partial<React.ComponentProps<typeof ProCrosshairsView>> = {}) {
  const props = {
    currentConfigId: 'preset-cyan-duelist',
    favouriteIds: ['pc-dot-solo'],
    onApply: vi.fn(),
    onEdit: vi.fn(),
    onToggleFavourite: vi.fn(),
    ...overrides,
  };
  render(<ProCrosshairsView {...props} />);
  return props;
}

function cardOf(name: string): HTMLElement {
  // The card title is a heading; the preview bench mentions names in plain
  // spans, so the heading role is the unambiguous handle.
  const heading = screen.getByRole('heading', { name });
  return heading.closest('div.rounded-lg') as HTMLElement;
}

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe('library', () => {
  it('shows the catalogue, the category filters and the tier legend', () => {
    renderView();
    expect(screen.getByText('Pro Crosshairs')).toBeTruthy();
    expect(screen.getByText(/40 curated designs, researched from competitive play/)).toBeTruthy();
    // Every category chip with its count.
    expect(screen.getByRole('tab', { name: /All \(40\)/ })).toBeTruthy();
    expect(screen.getByRole('tab', { name: /Fortnite-inspired \(5\)/ })).toBeTruthy();
    expect(screen.getByRole('tab', { name: /Custom designs \(5\)/ })).toBeTruthy();
    // The legend states what each tier means — the honesty contract is on screen.
    expect(screen.getByText("confirmed by the player's own publication")).toBeTruthy();
    expect(screen.getByText(/built from researched trends, no player names/i)).toBeTruthy();
  });

  it('renders one card per design with name, tier, description, facts, Apply, Edit and favourite', () => {
    renderView();
    expect(screen.getAllByText('Apply')).toHaveLength(40);
    const card = cardOf('Storm Tracker');
    expect(within(card).getByText('Competitive-inspired')).toBeTruthy();
    expect(within(card).getByText(/bright cyan cross with a black outline/i)).toBeTruthy();
    expect(within(card).getByText('Colour #00ffff')).toBeTruthy();
    expect(within(card).getByText('Outline 1px')).toBeTruthy();
    expect(within(card).getByText('Dot off')).toBeTruthy();
    expect(within(card).getByRole('button', { name: /Apply/i })).toBeTruthy();
    expect(within(card).getByRole('button', { name: /Edit/i })).toBeTruthy();
    expect(within(card).getByRole('button', { name: /favourites/i })).toBeTruthy();
  });

  it('filters by category', () => {
    renderView();
    fireEvent.click(screen.getByRole('tab', { name: /Dot \(5\)/ }));
    expect(screen.getAllByText('Apply')).toHaveLength(5);
    // The card is gone; the preview bench still shows its own selection.
    expect(screen.queryByRole('heading', { name: 'Storm Tracker' })).toBeNull();
  });

  it('filters by tier and explains the empty verified tier instead of faking entries', () => {
    renderView();
    fireEvent.click(screen.getByRole('button', { name: 'Verified player' }));
    expect(screen.queryAllByText('Apply')).toHaveLength(0);
    expect(screen.getByText('Nothing here — on purpose.')).toBeTruthy();
    expect(screen.getByText(VERIFIED_TIER_NOTE)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'crshhx original' }));
    expect(screen.getAllByText('Apply')).toHaveLength(5);
  });

  it('marks favourites from the shared preset-library state', () => {
    const { onToggleFavourite } = renderView();
    const solo = cardOf('Solo Dot Cyan');
    const star = within(solo).getByRole('button', { name: /Remove Solo Dot Cyan from favourites/ });
    expect(star.getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(star);
    expect(onToggleFavourite).toHaveBeenCalledWith('pc-dot-solo');

    const other = cardOf('Hairline Cyan');
    fireEvent.click(within(other).getByRole('button', { name: /Add Hairline Cyan to favourites/ }));
    expect(onToggleFavourite).toHaveBeenLastCalledWith('pc-min-hairline');
  });

  it('applies the exact preset config and hands edits to the designer', () => {
    const { onApply, onEdit } = renderView();
    const card = cardOf('Pixel Pinpoint');
    fireEvent.click(within(card).getByRole('button', { name: /Apply/i }));
    const applied = onApply.mock.calls[0][0] as CrosshairConfig;
    expect(applied.id).toBe('pc-pre-pinpoint');
    expect(applied.topology).toBe('dot');

    fireEvent.click(within(card).getByRole('button', { name: /Edit/i }));
    expect((onEdit.mock.calls[0][0] as CrosshairConfig).id).toBe('pc-pre-pinpoint');
  });

  it('flags the crosshair currently in use', () => {
    renderView({ currentConfigId: 'pc-cla-arcade' });
    expect(within(cardOf('Arcade Green')).getByText('In use')).toBeTruthy();
  });
});

describe('preview bench', () => {
  it('previews the selected design and follows card selection', () => {
    renderView();
    expect(screen.getByText(/Now previewing/)).toBeTruthy();
    expect(screen.getByText('Storm Tracker', { selector: '.text-zinc-300' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Preview Halo Ring' }));
    expect(screen.getByText('Halo Ring', { selector: '.text-zinc-300' })).toBeTruthy();
  });

  it('changes background, including solid colours and a custom picker', () => {
    renderView();
    expect(screen.getByRole('button', { name: 'Solid background White' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Solid background White' }));
    expect(screen.getByLabelText('Custom background colour')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Custom background colour'), {
      target: { value: '#123456' },
    });
    // No crash and the tile keeps rendering; the bench shows the choice.
    expect(screen.getByLabelText('Preview of Storm Tracker')).toBeTruthy();
  });

  it('zooms and reports the zoom factor', () => {
    renderView();
    const zoom = screen.getByLabelText('Preview zoom') as HTMLInputElement;
    expect(screen.getByText('Zoom: 3.0×')).toBeTruthy();
    fireEvent.change(zoom, { target: { value: '5' } });
    expect(screen.getByText('Zoom: 5.0×')).toBeTruthy();
  });

  it('overrides the crosshair colour and applies the tweaked config', () => {
    const { onApply } = renderView();
    fireEvent.click(screen.getByLabelText('Preview colour #ff00aa'));
    expect(screen.getByText(/Crosshair colour \(overridden\)/i)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Apply to current profile' }));
    const applied = onApply.mock.calls[0][0] as CrosshairConfig;
    expect(applied.id).toBe('pc-fn-storm-tracker');
    expect(applied.primaryColor).toBe('#ff00aa');

    // Resetting restores the catalogue colour.
    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
    fireEvent.click(screen.getByRole('button', { name: 'Apply to current profile' }));
    expect((onApply.mock.calls[1][0] as CrosshairConfig).primaryColor).toBe('#00ffff');
  });

  it('overrides the size from the bench', () => {
    const { onApply } = renderView();
    fireEvent.change(screen.getByLabelText('Preview size'), { target: { value: '9' } });
    expect(screen.getByText(/Size \(overridden: 9\)/i)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Apply to current profile' }));
    expect((onApply.mock.calls[0][0] as CrosshairConfig).length).toBe(9);
  });

  it('compares two designs side by side', () => {
    renderView();
    fireEvent.click(screen.getByLabelText('Compare two designs'));
    const picker = screen.getByLabelText('Comparison design') as HTMLSelectElement;
    expect(picker).toBeTruthy();
    // Second tile appeared.
    expect(screen.getByLabelText('Preview of Build Brawl Dot')).toBeTruthy();
    fireEvent.change(picker, { target: { value: 'pc-cus-canted' } });
    expect(screen.getByLabelText('Preview of Canted 45')).toBeTruthy();
  });
});
