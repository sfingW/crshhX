import type { ReactNode } from 'react';
import { IconAlert } from './icons';

export function SectionHead({
  eyebrow,
  title,
  lead,
  centered = false,
  level = 2,
}: {
  eyebrow: string;
  title: string;
  lead?: string;
  centered?: boolean;
  /** Interior pages open with their only `h1`; sections inside a page stay `h2`. */
  level?: 1 | 2;
}) {
  const Heading = level === 1 ? 'h1' : 'h2';
  return (
    <div className={`section-head${centered ? ' centered' : ''}`}>
      <span className="eyebrow">{eyebrow}</span>
      <Heading className="section-title">{title}</Heading>
      {lead ? <p className="section-lead">{lead}</p> : null}
    </div>
  );
}

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
