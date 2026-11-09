import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { APP_NAV } from '../src/components/AppWindow';

/**
 * The window mockups on this site list the application's navigation. A label
 * there that the application does not have is an invented feature, so this test
 * reads the desktop app's own sidebar and requires every label the website shows
 * to appear in it.
 *
 * It reads across the website/application boundary deliberately, and only in a
 * test: nothing in `src/` imports the desktop application. The check is
 * one-directional on purpose — the app may add a view without breaking the
 * website build, but the website may never claim one the app lacks.
 */
const SIDEBAR = readFileSync(
  join(process.cwd(), '..', 'src', 'components', 'Sidebar.tsx'),
  'utf8',
);

describe('product mockups mirror the real application navigation', () => {
  const labels = APP_NAV.flatMap((group) => group.views.map((view) => view.name));
  const groups = APP_NAV.map((group) => group.group);

  it('lists ten views in five groups', () => {
    expect(labels).toHaveLength(10);
    expect(groups).toEqual(['Collection', 'Studio', 'Controls', 'Learn', 'System']);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it('names only views the application actually has', () => {
    for (const label of labels) {
      expect(SIDEBAR, label).toContain(`<span>${label}</span>`);
    }
  });

  it('uses the application’s own group headings', () => {
    for (const group of groups) {
      expect(SIDEBAR, group).toContain(group);
    }
  });

  it('includes the two catalogue views the website has pages for', () => {
    expect(labels).toContain('Pro Crosshairs');
    expect(labels).toContain('Crosshair Academy');
  });
});
