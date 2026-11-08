# Pro Crosshairs — research notes

Internal research behind the Pro Crosshairs library and Crosshair Academy.
**All sources checked 2026-11-07.** Nothing in the app claims a player uses a
crosshair unless the evidence below supports it — and where the evidence
conflicted, no player name was used at all (see “Verified player crosshairs”).

## 1. Which games let players customise the crosshair

| Game | Native crosshair customisation | Notes |
| --- | --- | --- |
| CS2 | Full (console commands / settings) | `cl_crosshair*` family: style, size, thickness, gap, colour, dot, outline, alpha, T-style. [4][5] |
| Valorant | Full (in-game editor + shareable codes) | Riot provides an extensive built-in crosshair editor. [9] |
| Fortnite | **None for shape or colour** | The reticle is weapon-driven. Settings → Game UI exposes reticle *visibility* and damage feedback only — no shape, size, gap, colour or import codes. Two independent guides agree; one low-quality source claimed colour/size options exist and was discounted as contradicted. [1][3][6] |
| Apex Legends, Overwatch 2 | Built-in customisation exists | Grouped with Valorant as “games with native options” by [6]. |

Consequence for crshhx: an overlay crosshair matters most in games like
Fortnite, where the native reticle cannot be reshaped or recoloured. Where a
game has a strong native editor (CS2, Valorant), the overlay is a preference,
not a necessity — the Academy says so plainly.

## 2. Common competitive design styles (well-corroborated)

All five independent sources agree on the same trend among tracked pros:

- **Static, not dynamic.** “Over 90% of top CS2 pros reject dynamic styles”
  (attributed to Prosettings.net 2025 data). [2] Dynamic bloom hides the
  target mid-fight. [2][4]
- **Small.** Line length ≈ 2–4 units, thickness ≈ 0.5–1 unit in CS2 terms.
  [1][2][3][5]
- **Tight centre.** Gap 0 to negative (−1…−4.5) so the lines nearly meet.
  [1][2][3][4][5]
- **High-contrast colours.** Cyan and green dominate; white with an outline is
  common; yellow is situational. [1][2][4][5][10]
- **Outline on bright maps.** A thin black outline keeps the reticle visible on
  bright surfaces. [4][5]

These trends shape the “Competitive-inspired” tier: small static crosses,
tight gaps, cyan/green/white palettes, outline variants, dot variants.

## 3. Colour visibility evidence

Map-wide visibility test across all 12 Valorant competitive maps (gamegrids.io,
Aug 2026) [10]:

| Colour | Score / 5 | Notes |
| --- | --- | --- |
| Cyan | 4.8 | Best on 11 of 12 maps; weak point: bright coastline sky. |
| Green | 4.2 | Strong indoors/dark; blends into vegetation maps. |
| Pink | 3.8 | Underrated; weak on warm-tone maps. |
| White | 3.4 | Disappears on bright/snow maps without an outline. |
| Red | 3.1 | Confusable with damage/kill UI. |
| Yellow | 2.6 | Dark indoor maps only. |

Corroborated qualitatively by [2] (cyan/green strongest contrast; red blends
with damage UI; white washes out) and [4] (cool colours pop against CS2's warm
environments). Used in Academy tutorial 5 and in the catalogue descriptions.

## 4. Verified player crosshairs — policy decision: **none shipped**

Specific per-player values were cross-checked across aggregators. They
**contradict each other** for every big name tested:

- **s1mple** — senslab.pro and cs2crosshaircode.com (both May 2026): cyan,
  size 1, gap −4.5, thickness 1, no outline, no dot [7][8]; agatasmurf.com
  (Apr 2026): cyan *with dot*, size 2, gap −3, thickness 0 [1]; profilerr.net:
  size 2, thickness 0.5, gap −3 [5-of-first-search]; cs2.eu (Mar 2026):
  *green*, size 2, gap −2, thickness 0.5, outline on [11]. Four different
  answers.
- **ZywOo** — cs2.eu: cyan 1.5/−3/0 [11]; agatasmurf: green 2/−3/0 + code [1];
  a third source shows a cyan “ZywOo-style” config explicitly labelled *style*,
  not actual [3-of-second-search]. Contradictory.
- **donk / NiKo** — white vs green, gap −1 vs −2 vs −3 across [1][11] and a
  “donk-style” config labelled as inspired-only [3]. Contradictory.

Per the product rule — *do not claim a player uses a particular crosshair
unless a reliable source confirms it* — no player-named presets ship. The
Verified tier exists in the UI with an honest empty state explaining exactly
this (see `VERIFIED_TIER_NOTE` in `src/lib/proCrosshairs.ts`). If a player
publishes their own crosshair first-party (stream VOD, own website, official
code), an entry can be added with `sourceNote` + `checkedOn`; a data test
enforces that verified entries carry both.

Also out of scope by rule: mouse sensitivity/eDPI values (senslab lists them
next to crosshairs — they are a different setting and were **not** mixed in).

## 5. Fortnite pro crosshairs

Fortnite has no native crosshair editor (§1), so “Fortnite pro crosshair
settings” cannot exist as in-game configs. What exists: community overlay
methods (TV/monitor game bars, overlay apps) [6]. No reliable source names a
specific Fortnite pro's overlay crosshair, so the Fortnite-inspired category
ships **designs suited to Fortnite-style visuals** (bright skies, saturated
cartoon palettes, fast build fights): high-contrast cyan/white/pink with
outlines, small dots for hip-fire weapons. No player names.

## 6. Overlay apps and anti-cheat — honest safety position

- Vendor sources (centerpointgaming.com — the Crosshair X maker) state
  draw-only overlays that touch no game files/memory are not on Vanguard's
  prohibited list and work alongside VAC. [12][13]
- A third-party explainer reaches the same conclusion for display-only
  overlays. [9]
- **No anti-cheat vendor publishes an explicit guarantee.** Vendor blogs are
  interested parties. crshhx wording (app FAQ, Academy tutorial 10) therefore
  says: display-only overlays are widely used and no game files are touched;
  rules can change; check each game's current policy. crshhx itself draws via
  a click-through Electron window and never reads or writes game memory.

## 7. What the catalogue ships

- **Competitive-inspired (tier `inspired`)** — 35 designs across Fortnite-
  inspired, Tactical, Minimal, Precision, Classic, Dot and Circle categories,
  built on §2–§3 evidence (small, static, tight, cyan/green/white, outline and
  dot variants, honest notes where a colour is a style choice, e.g. red).
- **crshhx originals (tier `original`)** — 5 designs in the Custom category
  exercising v2 features (asymmetric arms, rotation, inner outline, scale,
  firing bloom).
- **Verified (tier `verified`)** — empty by policy (§4), with the empty state
  explaining why.

## Sources

Checked 2026-11-07.

1. agatasmurf.com/cs2-pro-crosshair/ — “CS2 Pro Crosshairs: 20 Best Settings & Codes (2026)” (Apr 2026).
2. kordu.tools/blog/best-crosshair-settings-competitive-fps/ — “Best Crosshair Settings for Competitive FPS Games” (Apr 2026; cites Prosettings.net 2025/2026 and Liquipedia 2024).
3. crosshair.games/guides/fortnite-crosshair-settings-pc-mobile/ — Fortnite has no importable crosshair; Game UI → Reticle visibility only (Aug 2026).
4. boostingmarket.com/blogs/cs2-crosshair-settings-guide/ — CS2 command table, static/small/high-contrast guidance (Aug 2026).
5. csguess.com/blog/best-cs2-crosshairs-used-by-pros-2026 — trend piece: small, thin, static, high-visibility (Jun 2026).
6. izoate.com/blog/how-to-get-custom-crosshair-in-fortnite-on-ps4-playing-on-a-tv/ — Epic provides no colour/shape customisation; overlay/TV methods (Aug 2026).
7. senslab.pro/players/s1mple — s1mple crosshair values (undated capture; conflicts with others).
8. cs2crosshaircode.com/pro/s1mple/ — s1mple values “verified May 21, 2026” (conflicts with 1, 5-of-first-search, 11).
9. cyberpost.co — “Can you get banned for using 3rd party crosshairs in Valorant?” (Jul 2025).
10. gamegrids.io/valorant/blog/valorant-crosshair-color-visibility-score/ — 12-map colour visibility scores (Aug 2026).
11. cs2.eu/news/best-cs2-crosshair-settings-codes-in-2026-pro-player-settings — per-player values (Mar 2026; conflicts with 1, 7, 8).
12. centerpointgaming.com/crosshair-x-valorant.html — vendor claim: Game Bar overlay, Vanguard-compliant (vendor source; treat as interested party).
13. centerpointgaming.com/crosshairs/ — vendor claim: draws only, no game files touched (vendor source).
14. androidexperto.com/how-to-change-your-reticle-in-fortnite/ — claims Fortnite colour/size settings exist; **discounted**, contradicted by 3 and 6.
