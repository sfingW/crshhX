# The crshhx brand mark

The product's logo is a **CX monogram**: an open hexagonal `C` whose bottom terminal flows
into the leg of a `K`, the two diagonals fused at a vertex inside the `C`'s aperture. Next
to it, the wordmark `crshhx` in monoline geometric lowercase, separated by a mint rule —
the product's own accent, and the only colour in the logo.

Everything is straight edges and one stroke weight (17 units on a 96-unit grid). Curves are
where small logos go to mush; a chamfered hexagon reads at 16px in a browser tab and at 16px
again in a Windows title bar, which are the two places this mark lives most of its life.

## One source of truth

`scripts/brand/logo.mjs` owns the geometry. It is a dependency-free Node module: the point
lists, an SVG emitter, a scanline rasteriser (nonzero winding, per-layer coverage union,
supersampled), and PNG/ICO encoders. `npm run brand:generate` emits **every** brand asset
from it:

| Asset | Path | Notes |
| --- | --- | --- |
| Primary lockup | `website/public/logo.svg` | symbol + mint rule + wordmark, transparent |
| Light lockup | `website/public/logo-light.svg` | ink on light fields |
| Monochrome lockup | `website/public/logo-mono.svg` | `currentColor`, no rule — any context |
| Standalone symbol | `website/public/symbol.svg` | paper mark, transparent |
| Light symbol | `website/public/symbol-light.svg` | ink mark, transparent |
| Favicon | `website/public/favicon.svg`, `favicon.ico` | tile; ico frames 16/32/48 |
| Touch icon | `website/public/apple-touch-icon.png` | 180×180 tile |
| Social card | `website/public/og/cover.png` | 1200×630, lockup + kicker on ink |
| App + tray + exe icon | `build/icon.ico`, `build/icon.png` | frames 16…256; electron-builder embeds the ico |
| Site React geometry | `website/src/lib/brandGeometry.ts` | what `Brand.tsx` renders |
| App React geometry | `src/brand/geometry.ts` | what `src/brand/BrandMark.tsx` renders |

Nothing is drawn twice. `tests/brand.test.ts` and `website/tests/brandAssets.test.ts` re-run
the generator and byte-compare its output against the checked-in files, so a hand-edited
favicon or a re-exported icon fails CI instead of shipping as a second, almost-identical
logo. Edit the geometry in the script, run `brand:generate`, commit the result.

`npm run brand:preview` writes `docs/design/brand/preview.png`, a contact sheet of the mark
at 16/24/32/48/64/96, the tile ladder, and the lockup on dark, on paper, and in monochrome
both ways — the sheet the redesign was judged from.

## Geometry

- Grid: 96 × 96, viewBox `0 0 96 96` for every symbol variant; the lockup extends the same
  grid horizontally (`LOCKUP.viewBox`), so all variants share one coordinate system.
- Stroke weight: 17 units everywhere — C bars, chamfers, K arm, K leg, and (scaled) the
  wordmark's 9.5-unit monoline at lockup size.
- Terminals: cut perpendicular to the stroke, or at 45° at the mitres. No rounded caps on
  the mark; the wordmark's spines are round-capped so its terminals read as ink, not wire.
- Joints: the K leg's root quad overlaps the C's bottom terminal, and the arm overlaps the
  leg at the vertex, so both joints are fused areas rather than touching edges. Overlap is
  what keeps the joints closed at 16px.
- Aperture: the C's top bar stops short of the K arm (11 units of daylight at the narrowest)
  so the mouth never closes into a blob at tab size.

## Simplification rule

At ≤32px inside a tile (favicon, small Windows icon frames), the K collapses to a single
diagonal through the aperture — same angle, same weight, same terminals (`CX_SIMPLE_SHAPES`).
Arm-plus-leg is two strokes of noise at 16px; one diagonal keeps the gesture. The standalone
symbol and every size ≥48px use the full mark. This is the only size-dependent variant, and
it is generated, not maintained.

## Colour

- `#f4f6f5` paper — the mark on dark fields (the site, the tile, the tray).
- `#0b0c0e` ink — the mark on light fields, and the field of the social card.
- `#00e599` mint — the product accent (`--accent` on the site, `--brand-accent` in the app):
  the lockup rule and the tile's corner square. Never a fill, never a glow.
- Monochrome variants drop the rule and the square and carry a single `currentColor`.

No gradients, no shadows, no glows: the mark is flat ink by construction.

## How the direction was chosen

Three refinements of the CX idea were drawn and rasterised through the same pipeline, then
inspected side by side at 16/24/32/48/96px, as tiles, in the lockup, and in monochrome:

1. **Fused bar-leg, arm from the top terminal** — reads as a CK ligature; at 16px the arm and
   leg merge into one wedge attached to the wrong corner.
2. **Detached arm floating in the aperture** — the joint is the whole idea; floating it loses
   the gesture at every size and adds a stray tick at 32px.
3. **Open aperture, K rooted in the bottom terminal, arm and leg fused at one vertex** — the
   C reads first, the K second, and the shared vertex holds at 32px. Chosen, then refined:
   the arm was moved to truly overlap the leg (a kissing joint broke at 16px), the top bar
   was shortened to reopen the aperture, and the ≤32px tile simplification was added.

The reference for the redesign was an angular CX monogram with the K sharing the C's lower
terminal; this mark keeps that structure and re-draws every coordinate on one grid, with
equalised stroke weights and a vertex that survives being small. It is not a trace.

## Superseded

This document supersedes the reticle-derived mark described in `website-redesign.md` (ring,
four arms, centre dot) and the pale-mint `#6fd9c0` favicon that went with it. The site's
layout, type system and token ramp are unchanged by the logo redesign: the mark adopts the
site's tokens, not the other way round.
