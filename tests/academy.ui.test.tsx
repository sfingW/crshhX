// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { AcademyView } from '../src/components/views/AcademyView';
import { ACADEMY_TUTORIALS } from '../src/lib/academy';
import { loadAcademyProgress } from '../src/lib/storage';
import { ILLUSTRATION_BADGE } from '../src/components/academy/AcademyVisuals';

/**
 * Crosshair Academy: the ten tutorials, their visuals, the honesty labels and
 * persisted completion state.
 */

afterEach(() => {
  cleanup();
  localStorage.clear();
});

function openList() {
  render(<AcademyView />);
}

function openTutorial(title: RegExp | string) {
  fireEvent.click(screen.getByRole('button', { name: title }));
}

describe('tutorial list', () => {
  it('lists all ten tutorials in order with a progress counter', () => {
    openList();
    expect(screen.getByText('Crosshair Academy')).toBeTruthy();
    expect(screen.getByText('0 of 10 completed')).toBeTruthy();
    const buttons = ACADEMY_TUTORIALS.map((t) =>
      screen.getByRole('button', { name: new RegExp(`Open tutorial .*${t.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`) }),
    );
    expect(buttons).toHaveLength(10);
    expect(screen.getByText('Getting started with crshhx')).toBeTruthy();
    expect(screen.getByText('Fixing common problems')).toBeTruthy();
  });

  it('opens a tutorial and renders its intro and numbered steps', () => {
    openList();
    openTutorial(/Open tutorial 1:/);
    expect(screen.getByText('Meet the overlay')).toBeTruthy();
    expect(screen.getByText(/a few minutes/i)).toBeTruthy();
    expect(screen.getByText('Tutorial 1 of 10')).toBeTruthy();
    // Every step title is on screen.
    for (const step of ACADEMY_TUTORIALS[0].steps) {
      expect(screen.getByText(step.title)).toBeTruthy();
    }
  });

  it('returns to the list', () => {
    openList();
    openTutorial(/Open tutorial 1:/);
    fireEvent.click(screen.getByText('All tutorials'));
    expect(screen.getByText('0 of 10 completed')).toBeTruthy();
  });
});

describe('honest visuals', () => {
  it('labels every illustration as an illustration — never as a screenshot', () => {
    openList();
    openTutorial(/Open tutorial 1:/);
    // Tutorial 1 has an overlay-stack diagram and a vault click-map.
    const badges = screen.getAllByText(ILLUSTRATION_BADGE);
    expect(badges.length).toBe(2);
  });

  it('marks live demos as the real renderer', () => {
    openList();
    openTutorial(/Open tutorial 2:/);
    expect(screen.getByText(/Live example — the real crshhx renderer/)).toBeTruthy();
  });

  it('shows the colour scores with their source named', () => {
    openList();
    openTutorial(/Open tutorial 5:/);
    expect(screen.getByText('Cyan')).toBeTruthy();
    expect(screen.getByText('4.8')).toBeTruthy();
    expect(screen.getByText(/gamegrids\.io, August 2026/)).toBeTruthy();
    expect(screen.getByText(/docs\/research\/pro-crosshairs\.md/)).toBeTruthy();
  });

  it('names no players anywhere in the academy copy', () => {
    const banned = ['s1mple', 'zywoo', 'donk', 'niko', 'tenz', 'shroud', 'tfue', 'bugha', 'clix'];
    const haystack = JSON.stringify(ACADEMY_TUTORIALS).toLowerCase();
    for (const name of banned) {
      expect(haystack, `player name "${name}" in academy copy`).not.toContain(name);
    }
  });
});

describe('interactive elements', () => {
  it('drives the live demo controls and updates the readout', () => {
    openList();
    openTutorial(/Open tutorial 2:/);
    const length = screen.getByLabelText('Line length') as HTMLInputElement;
    expect(length.value).toBe('3'); // Hairline Cyan starts at length 3
    fireEvent.change(length, { target: { value: '10' } });
    expect(screen.getByText(/Size \(length\): 10/)).toBeTruthy();

    fireEvent.click(screen.getByLabelText('Centre dot on'));
    expect((screen.getByLabelText('Centre dot on') as HTMLInputElement).checked).toBe(true);

    fireEvent.click(screen.getByLabelText('Colour #ff00aa'));
    // No crash; the swatch selection is reflected in the colour input value.
    expect((screen.getByLabelText('Custom colour') as HTMLInputElement).value).toBe('#ff00aa');
  });

  it('previews firing on the static-vs-dynamic comparison', () => {
    openList();
    openTutorial(/Open tutorial 3:/);
    const button = screen.getByRole('button', { name: 'Preview firing' });
    expect(button.getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(button);
    expect(screen.getByRole('button', { name: 'Stop firing preview' }).getAttribute('aria-pressed')).toBe('true');
  });
});

describe('progress', () => {
  it('marks a tutorial complete, persists it, and counts it', () => {
    openList();
    openTutorial(/Open tutorial 1:/);
    const box = screen.getByLabelText('Mark "Getting started with crshhx" complete') as HTMLInputElement;
    expect(box.checked).toBe(false);
    fireEvent.click(box);
    expect(box.checked).toBe(true);
    expect(screen.getByText('Completed')).toBeTruthy();

    const saved = loadAcademyProgress();
    expect(Object.keys(saved)).toEqual(['start']);
    expect(saved.start).toMatch(/^\d{4}-\d{2}-\d{2}T/);

    // Back to the list: the counter moved and the tick shows.
    fireEvent.click(screen.getByText('All tutorials'));
    expect(screen.getByText('1 of 10 completed')).toBeTruthy();
  });

  it('un-completes a tutorial again', () => {
    openList();
    openTutorial(/Open tutorial 1:/);
    const box = screen.getByLabelText('Mark "Getting started with crshhx" complete');
    fireEvent.click(box);
    fireEvent.click(box);
    expect(loadAcademyProgress()).toEqual({});
  });

  it('restores progress from storage on mount', () => {
    localStorage.setItem(
      'crshhx_academy_progress',
      JSON.stringify({ start: '2026-11-07T10:00:00.000Z' }),
    );
    openList();
    expect(screen.getByText('1 of 10 completed')).toBeTruthy();
  });

  it('links to the next tutorial and ends honestly on the last one', () => {
    openList();
    openTutorial(/Open tutorial 1:/);
    const next = screen.getByRole('button', { name: /Next: Understanding crosshair settings/ });
    fireEvent.click(next);
    expect(screen.getByText('Tutorial 2 of 10')).toBeTruthy();

    // Jump to the last tutorial via the list.
    fireEvent.click(screen.getByText('All tutorials'));
    openTutorial(/Open tutorial 10:/);
    expect(screen.getByText('That is the last tutorial. Well done.')).toBeTruthy();
  });
});
