import type { ReactNode } from 'react';
import { MOCK_DISCLOSURE, SITE } from '../site';
import {
  IconCrosshair,
  IconEditor,
  IconFolders,
  IconKeyboard,
  IconMonitor,
  IconTarget,
  WinGlyphs,
} from './icons';

export type MockView =
  | 'Crosshairs'
  | 'Designer'
  | 'Preset Manager'
  | 'Weapon Slots'
  | 'Keybinds'
  | 'Position';

const VIEW_ICONS: Record<MockView, (props: { title?: string }) => ReactNode> = {
  Crosshairs: IconCrosshair,
  Designer: IconEditor,
  'Preset Manager': IconFolders,
  'Weapon Slots': IconTarget,
  Keybinds: IconKeyboard,
  Position: IconMonitor,
};

const VIEWS = Object.keys(VIEW_ICONS) as MockView[];

/**
 * The window chrome shared by every product visual. The sidebar lists the
 * application's real views, so the mockups describe the product as it is
 * structured rather than inventing screens.
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
            {VIEWS.map((name) => {
              const Icon = VIEW_ICONS[name];
              return (
                <span
                  key={name}
                  className={`mock-side-item${name === view ? ' is-active' : ''}`}
                >
                  <Icon />
                  {name}
                </span>
              );
            })}
          </div>
          <div className="mock-main">{children}</div>
        </div>
      </div>
      <figcaption className="mock-caption">{caption}</figcaption>
    </figure>
  );
}
