import type { ReactNode } from 'react';
import { MOCK_DISCLOSURE, SITE } from '../site';
import {
  IconBook,
  IconCrosshair,
  IconEditor,
  IconFolders,
  IconKeyboard,
  IconMove,
  IconShield,
  IconStar,
  IconTarget,
  IconTrophy,
  WinGlyphs,
} from './icons';

/**
 * The application's real navigation, in its real groups, with its real labels.
 *
 * These are read off `src/components/Sidebar.tsx` in the desktop repository.
 * Listing views the application does not have would be an invented feature, and
 * listing them under names the application does not use would make every mockup
 * on this site a small lie — so the mockup sidebar is a transcription, and a
 * test compares it against this list.
 */
export const APP_NAV: ReadonlyArray<{
  group: string;
  views: ReadonlyArray<{ name: MockView; icon: (props: { title?: string }) => ReactNode }>;
}> = [
  {
    group: 'Collection',
    views: [
      { name: 'Crosshair Vault', icon: IconCrosshair },
      { name: 'Saved & Favorites', icon: IconStar },
      { name: 'Preset Manager', icon: IconFolders },
      { name: 'Pro Crosshairs', icon: IconTrophy },
    ],
  },
  {
    group: 'Studio',
    views: [
      { name: 'Reticle Designer', icon: IconEditor },
      { name: '4:3 & Position', icon: IconMove },
    ],
  },
  {
    group: 'Controls',
    views: [
      { name: 'Keybinds & ADS', icon: IconKeyboard },
      { name: 'Weapon Slots', icon: IconTarget },
    ],
  },
  {
    group: 'Learn',
    views: [{ name: 'Crosshair Academy', icon: IconBook }],
  },
  {
    group: 'System',
    views: [{ name: 'Ban-Safety Audit', icon: IconShield }],
  },
];

export type MockView =
  | 'Crosshair Vault'
  | 'Saved & Favorites'
  | 'Preset Manager'
  | 'Pro Crosshairs'
  | 'Reticle Designer'
  | '4:3 & Position'
  | 'Keybinds & ADS'
  | 'Weapon Slots'
  | 'Crosshair Academy'
  | 'Ban-Safety Audit';

/**
 * The window chrome shared by every product visual.
 *
 * A plate is dark in both of the site's worlds, because the application is
 * dark: the light "studio" world is the site's own editorial surface and never
 * claims to be the product. Every mockup is captioned as an illustrative
 * preview rendered from real parameters, never as a screenshot.
 */
export function AppWindow({
  view,
  children,
  caption = MOCK_DISCLOSURE,
}: {
  view: MockView;
  children: ReactNode;
  caption?: string;
}) {
  return (
    <figure style={{ margin: 0 }}>
      <div className="mock">
        <div className="mock-bar">
          <WinGlyphs />
          <span className="mock-title">{SITE.productName}</span>
        </div>
        <div className="mock-body">
          <div className="mock-side" aria-hidden="true">
            {APP_NAV.map((section) => (
              <div className="mock-side-group" key={section.group}>
                <span className="mock-side-label">{section.group}</span>
                {section.views.map(({ name, icon: Icon }) => (
                  <span
                    key={name}
                    className={`mock-side-item${name === view ? ' is-active' : ''}`}
                  >
                    <Icon />
                    {name}
                  </span>
                ))}
              </div>
            ))}
          </div>
          <div className="mock-main">{children}</div>
        </div>
      </div>
      <figcaption className="mock-caption">{caption}</figcaption>
    </figure>
  );
}
