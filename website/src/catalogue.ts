/**
 * The typed boundary over `catalogue.json`.
 *
 * The JSON is generated from the desktop application by
 * `scripts/extract-catalogue.mjs`; it is never edited by hand, and CI fails if
 * the committed copy differs from what the application now exports. TypeScript
 * infers widened types from a JSON module (`string` rather than a union), so the
 * shapes are declared here and asserted once, at the boundary, rather than
 * scattered through the pages.
 */
import type { ReticleSpec } from './components/Reticle';
import raw from './catalogue.json';

/** Which built-in collection a design belongs to. */
export type ProTier = 'verified' | 'inspired' | 'original';

export interface ProCategory {
  id: string;
  label: string;
  blurb: string;
}

export interface ProEntry {
  id: string;
  name: string;
  category: string;
  tier: ProTier;
  description: string;
  topology: string;
  game: string;
  /**
   * Gold Series: premium presentation, shown apart from the standard sheet.
   */
  series?: 'gold';
  /**
   * Attribution for fan recreations: what the design was recreated from, and
   * that it is not official. Rendered wherever the design is shown.
   */
  inspiration?: string;
  /**
   * Effects the design uses that a static drawing cannot show — glow, firing
   * bloom, ADS morphing, stretched compensation, position offset. Absent when
   * the drawing is the whole design. Pages state these in words so a rendered
   * reticle never implies it is everything the preset does.
   */
  beyond?: string[];
  spec: ReticleSpec;
}

export interface Tutorial {
  id: string;
  title: string;
  intro: string;
  /** Id of the next tutorial, or null on the last one. */
  next: string | null;
  /** Step titles, in order. */
  steps: string[];
  /** The visual kinds the app renders for this tutorial's steps. */
  visuals: string[];
}

export interface Catalogue {
  source: string[];
  vault: {
    total: number;
    allBuiltIn: boolean;
    byGame: Record<string, number>;
    byTopology: Record<string, number>;
  };
  pro: {
    total: number;
    /**
     * Why no crosshair in the catalogue is attributed to a named player. This
     * is the application's own wording, and it is the most credible sentence on
     * the page: it says what the project refused to claim.
     */
    note: string;
    tierLabels: Record<ProTier, string>;
    categories: ProCategory[];
    entries: ProEntry[];
  };
  academy: {
    total: number;
    order: string[];
    tutorials: Tutorial[];
  };
}

export const CATALOGUE = raw as unknown as Catalogue;

/** Human label for a category id, falling back to the id itself. */
export function categoryLabel(id: string): string {
  return CATALOGUE.pro.categories.find((category) => category.id === id)?.label ?? id;
}
