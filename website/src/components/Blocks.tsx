import type { ReactNode } from 'react';
import { IconAlert } from './icons';

/**
 * Shared blocks.
 *
 * `SectionHead` was removed in the Field & Studio redesign: every page now sets
 * its own head, because a shared head component was one of the reasons every
 * section looked the same. What is genuinely shared is the callout — a note that
 * has to be read, ruled on the left rather than boxed.
 */

export function Callout({
  title,
  tone = 'info',
  children,
}: {
  title?: string;
  tone?: 'info' | 'warn';
  children: ReactNode;
}) {
  return (
    <aside className={`callout${tone === 'warn' ? ' warn' : ''}`}>
      {title ? (
        <p className="callout-title">
          {tone === 'warn' ? <IconAlert /> : null}
          {title}
        </p>
      ) : null}
      <div>{children}</div>
    </aside>
  );
}
