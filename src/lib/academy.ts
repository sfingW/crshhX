/**
 * Crosshair Academy — tutorial content as data.
 *
 * Writing rules for this file (they are load-bearing, not decoration):
 * - Simple English. Short sentences. No jargon without an explanation.
 * - Every step does one thing.
 * - Visuals are either REAL components of this app (live demos, comparisons —
 *   the actual `ReticleRenderer` the overlay uses) or clearly labelled
 *   illustrations. There are no screenshots of the app in this repo, and
 *   nothing here pretends otherwise: the click-map and diagram visuals render
 *   with a visible "Illustration — not a screenshot" caption.
 * - No claim about a game or a player that docs/research/pro-crosshairs.md
 *   does not support.
 */

/** Controls offered by a live, editable reticle demo. */
export type LiveControl = 'colour' | 'size' | 'thickness' | 'gap' | 'dot' | 'outline';

/** Simplified UI panels used by click-map illustrations. */
export type ClickmapPanel = 'vault' | 'designer' | 'monitor' | 'slots' | 'tray';

export type AcademyVisual =
  /** Numbered anatomy of a crosshair (SVG diagram). */
  | { kind: 'anatomy' }
  /** Colour visibility scores with the source named (SVG diagram). */
  | { kind: 'colours' }
  /** Two-monitor arrangement, including one at negative coordinates. */
  | { kind: 'monitors' }
  /** Game window with the crshhx overlay above it. */
  | { kind: 'overlay-stack' }
  /** Real app controls, editing a real crosshair config. */
  | { kind: 'live'; presetId: string; controls: LiveControl[] }
  /** Two real crosshairs side by side, on the same backdrop. */
  | {
      kind: 'compare';
      leftId: string;
      rightId: string;
      leftLabel: string;
      rightLabel: string;
      /** Backdrop id from TargetBackdrops; defaults to the precision grid. */
      backdrop?: string;
    }
  /** Labelled illustration of where to click. Not a screenshot. */
  | { kind: 'clickmap'; panel: ClickmapPanel; caption: string };

export interface AcademyStep {
  title: string;
  text: string;
  visual?: AcademyVisual;
  tip?: string;
}

export interface Tutorial {
  id: string;
  title: string;
  intro: string;
  steps: AcademyStep[];
  /** Id of the next tutorial, or null on the last one. */
  next: string | null;
}

export const ACADEMY_TUTORIALS: Tutorial[] = [
  {
    id: 'start',
    title: 'Getting started with crshhx',
    intro:
      'crshhx puts your own crosshair on top of your game. This tour gets you set up in a few minutes.',
    steps: [
      {
        title: 'Meet the overlay',
        text: 'When crshhx starts, a small invisible window appears. It is called the overlay. The overlay draws your crosshair and floats above your game. Clicks pass straight through it, so the game never notices it.',
        visual: { kind: 'overlay-stack' },
      },
      {
        title: 'Pick your first crosshair',
        text: 'Open Crosshair Vault in the sidebar. Click any crosshair to try it. The overlay updates straight away — no saving, no restart.',
        visual: {
          kind: 'clickmap',
          panel: 'vault',
          caption: 'Sidebar → Crosshair Vault, then click a card to apply it.',
        },
        tip: 'Prefer a curated shortlist? Try the Pro Crosshairs section.',
      },
      {
        title: 'Check it in your game',
        text: 'Start your game. Your crosshair should sit at the centre of the screen. If you cannot see it, press F10. That key shows or hides the overlay.',
      },
      {
        title: 'Learn the two hotkeys',
        text: 'F10 shows or hides the overlay. F9 jumps to your next saved crosshair. You can change both keys in the Keybinds view.',
      },
    ],
    next: 'settings',
  },
  {
    id: 'settings',
    title: 'Understanding crosshair settings',
    intro:
      'Every crosshair is built from a few simple numbers. Once you know what they mean, you can tune any design.',
    steps: [
      {
        title: 'The five parts',
        text: 'A cross has four lines (arms) and a centre. The numbers below control them. One picture beats ten paragraphs:',
        visual: { kind: 'anatomy' },
      },
      {
        title: 'Length and thickness',
        text: 'Length is how long each line is. Thickness is how wide each line is. Short, thin lines hide less of the enemy.',
      },
      {
        title: 'Gap',
        text: 'The gap is the empty space in the middle. A small or negative gap makes the lines almost touch. A big gap keeps the centre clear.',
      },
      {
        title: 'Centre dot',
        text: 'The dot marks the exact centre of your screen. Some players use a dot with no lines at all.',
      },
      {
        title: 'Outline',
        text: 'The outline is a thin dark edge around each line. It helps your crosshair stand out on bright backgrounds.',
      },
      {
        title: 'Try it yourself',
        text: 'Move these controls and watch the crosshair change. This is the real renderer — the overlay draws exactly this.',
        visual: {
          kind: 'live',
          presetId: 'pc-min-hairline',
          controls: ['colour', 'size', 'thickness', 'gap', 'dot', 'outline'],
        },
      },
    ],
    next: 'choosing',
  },
  {
    id: 'choosing',
    title: 'Choosing a crosshair',
    intro:
      'There is no single best crosshair. But research on competitive play shows clear patterns about what works.',
    steps: [
      {
        title: 'Keep it static',
        text: 'A static crosshair never changes size when you move or shoot. It always shows the true centre. Most competitive players use static designs. Growing ("dynamic") crosshairs look cool but hide your target exactly when you shoot.',
        visual: {
          kind: 'compare',
          leftId: 'pc-min-hairline',
          rightId: 'pc-cus-bloom',
          leftLabel: 'Static — always still',
          rightLabel: 'Dynamic — grows when firing',
          backdrop: 'tactical-grid',
        },
      },
      {
        title: 'Keep it small',
        text: 'A small crosshair covers less of the enemy. You cannot shoot what your own crosshair hides. Start small and only grow it if you keep losing track of it.',
      },
      {
        title: 'Match your game',
        text: 'Fortnite does not let you change its built-in crosshair colour or shape, so an overlay helps most there. CS2 and Valorant have full built-in editors — there, an overlay is a personal choice, not a need.',
      },
      {
        title: 'Test, then commit',
        text: 'Apply a few designs from Pro Crosshairs. Play one match with each. Keep the one you stop noticing — that is the sign of a good crosshair.',
        tip: 'Use the preview pane to compare two designs side by side before you play.',
      },
    ],
    next: 'custom',
  },
  {
    id: 'custom',
    title: 'Making a custom crosshair',
    intro: 'The Designer is where you build your own design. Everything updates live.',
    steps: [
      {
        title: 'Open the Designer',
        text: 'Click Designer in the sidebar. The crosshair you see is the one your overlay is drawing right now.',
        visual: {
          kind: 'clickmap',
          panel: 'designer',
          caption: 'Sidebar → Designer. Tabs at the top switch between control groups.',
        },
      },
      {
        title: 'Change one thing at a time',
        text: 'Adjust the length, then look at it. Then the gap. Small changes are easy to judge. Big changes are hard to undo in your head.',
        visual: {
          kind: 'live',
          presetId: 'pc-cla-arcade',
          controls: ['size', 'thickness', 'gap'],
        },
      },
      {
        title: 'Add a dot or an outline',
        text: 'A centre dot marks the exact pixel. An outline keeps the design visible on bright walls. Try each on and off.',
        visual: {
          kind: 'live',
          presetId: 'pc-tac-breach',
          controls: ['dot', 'outline'],
        },
      },
      {
        title: 'Save it',
        text: 'When you like it, save it as a preset. Saved presets appear in your library. You can assign them to weapon slots and game profiles like any other crosshair.',
        tip: 'Start faster: click Edit on any Pro Crosshair card, then tweak it.',
      },
    ],
    next: 'colours',
  },
  {
    id: 'colours',
    title: 'Choosing colours that are easy to see',
    intro: 'The best colour is the one you can see in your game. Here is what testing shows.',
    steps: [
      {
        title: 'The map test',
        text: 'One public test rated six colours on all 12 competitive Valorant maps, scoring visibility out of 5. Cyan won on 11 of the 12 maps.',
        visual: { kind: 'colours' },
      },
      {
        title: 'Why cyan wins',
        text: 'Most map surfaces are brown, grey or dark green. Cyan sits far away from all of them in brightness and tone, so it stands out almost everywhere.',
      },
      {
        title: 'Careful with white and red',
        text: 'White vanishes on bright and snowy maps unless you add an outline. Red can be confused with damage numbers and the kill feed.',
        visual: {
          kind: 'compare',
          leftId: 'pc-min-feather',
          rightId: 'pc-fn-skyward',
          leftLabel: 'White, no outline — washes out on bright scenes',
          rightLabel: 'White with outline — stays visible',
          backdrop: 'smoke-washout',
        },
      },
      {
        title: 'Match the palette of your game',
        text: 'Bright, cartoon-style games suit strong colours like pink or yellow. Dark, military games suit green or cyan. Test your colour on the maps you actually play.',
        visual: {
          kind: 'live',
          presetId: 'pc-min-hairline',
          controls: ['colour'],
        },
      },
    ],
    next: 'monitors',
  },
  {
    id: 'monitors',
    title: 'Setting up different monitor displays',
    intro: 'More than one screen? Tell crshhx which display should carry your crosshair.',
    steps: [
      {
        title: 'Open Target Monitor',
        text: 'In the sidebar, open Position & Display Calibration. The Target Monitor card lists every display Windows reports — nothing is guessed or hardcoded.',
        visual: {
          kind: 'clickmap',
          panel: 'monitor',
          caption: 'Sidebar → Position & Display Calibration → Target Monitor card.',
        },
      },
      {
        title: 'Read the list',
        text: 'Each entry shows the display number, its name when Windows provides one, resolution, refresh rate, scaling and which display is primary. Example: "Display 2 — Dell U2419D · 1920×1080 · 60 Hz · 150%".',
      },
      {
        title: 'Choose one',
        text: 'Pick a display and the overlay moves there immediately. Or pick "Automatic" to always follow the Windows primary display.',
        visual: { kind: 'monitors' },
        tip: 'A screen to the left of your primary has negative coordinates. crshhx handles that — the overlay lands where the display really is.',
      },
      {
        title: 'Unplugged? No problem',
        text: 'If your chosen display is disconnected, the overlay falls back to the primary display. Your choice is remembered, so it returns when the monitor is plugged back in.',
      },
    ],
    next: 'profiles',
  },
  {
    id: 'profiles',
    title: 'Creating game profiles',
    intro: 'A game profile holds a set of crosshair choices for one game. Each game gets its own setup.',
    steps: [
      {
        title: 'Open Weapon Slots',
        text: 'Profiles live inside the Weapon Slots view. Open it from the sidebar.',
        visual: {
          kind: 'clickmap',
          panel: 'slots',
          caption: 'Sidebar → Weapon Slots. Profiles are listed at the top.',
        },
      },
      {
        title: 'Create a profile',
        text: 'Add a profile and name it after your game — for example "Fortnite" or "CS2". Each profile has its own five slots.',
      },
      {
        title: 'Let crshhx switch for you',
        text: 'When the app sees that game in the foreground, it loads that profile automatically. You can also switch profiles by hand.',
      },
      {
        title: 'One library, many profiles',
        text: 'Every profile picks crosshairs from the same library, including Pro Crosshairs. Save a design once and use it everywhere.',
      },
    ],
    next: 'slots',
  },
  {
    id: 'slots',
    title: 'Setting up weapon-slot switching',
    intro:
      'Weapon slots change your crosshair with one key press — for example, one design for rifles and another for snipers.',
    steps: [
      {
        title: 'The five slots',
        text: 'crshhx has five slots. By default they sit on keys 1 to 5, which match the weapon slots many games already use. You can rebind every slot to any key.',
      },
      {
        title: 'Assign a crosshair to each slot',
        text: 'Pick a crosshair from your library for each slot. Anything works: vault presets, Pro Crosshairs, or designs you saved yourself.',
        visual: {
          kind: 'clickmap',
          panel: 'slots',
          caption: 'Each slot row: key on the left, crosshair picker on the right.',
        },
      },
      {
        title: 'Switch while you play',
        text: 'Press a slot key and the overlay changes instantly. Switching works even when crshhx is hidden in the background.',
      },
      {
        title: 'Remember the two hotkeys',
        text: 'F9 cycles through your saved crosshairs. F10 shows or hides the overlay. Slot keys and these hotkeys all work in game.',
        tip: 'When you record a new slot key, reserved keys like F10 are refused, so you cannot break your toggle by accident.',
      },
    ],
    next: 'background',
  },
  {
    id: 'background',
    title: 'Using background overlay mode',
    intro: 'crshhx can keep running when you close its window. Your crosshair keeps working.',
    steps: [
      {
        title: 'Closing hides, it does not quit',
        text: 'Click the window X and crshhx hides instead of exiting. The overlay, the hotkeys and weapon-slot switching all keep running.',
        visual: { kind: 'overlay-stack' },
      },
      {
        title: 'Find the tray icon',
        text: 'Look for the crshhx icon in the Windows system tray, near the clock. Click it to reopen the window. You may need to open the tray overflow arrow first.',
        visual: {
          kind: 'clickmap',
          panel: 'tray',
          caption: 'System tray → crshhx icon. Left click opens the app.',
        },
      },
      {
        title: 'Use the tray menu',
        text: 'Right-click the tray icon for the menu: Open crshhx, Enable or disable overlays, and Quit crshhx.',
      },
      {
        title: 'Prefer a real close?',
        text: 'Turn off "Keep overlays running when the window is closed" in Position & Display Calibration. Then the X button quits the app like a normal window.',
      },
      {
        title: 'The honest note',
        text: 'Overlays only live while the app runs. Quit from the tray and everything stops cleanly — hooks are released and windows are closed. Nothing survives the process, and crshhx never claims otherwise.',
        tip: 'Hidden does not mean busy. A hidden studio window uses almost no CPU.',
      },
    ],
    next: 'fixes',
  },
  {
    id: 'fixes',
    title: 'Fixing common problems',
    intro: 'Most problems take less than a minute to fix. Start at the top and work down.',
    steps: [
      {
        title: 'The crosshair is not showing',
        text: 'Press F10 — the overlay may be hidden. Then check Target Monitor in Position & Display Calibration: the overlay may be sitting on another screen.',
      },
      {
        title: 'It shows in crshhx but not in the game',
        text: 'Set the game to borderless or windowed fullscreen. Some exclusive-fullscreen modes draw over everything, overlays included.',
      },
      {
        title: 'The crosshair is off-centre',
        text: 'Use Subpixel Screen Nudge in Position & Display Calibration to move it one pixel at a time. Playing a stretched resolution like 4:3? Set the matching Stretched Resolution mode on the same screen.',
      },
      {
        title: 'Slot switching does nothing',
        text: 'Open Weapon Slots and check the input transport status — it tells you what is working on your system. Also make sure the game does not use the same key for something else, and rebind the slot if it does.',
      },
      {
        title: 'Windows warned about the app',
        text: 'crshhx is not code-signed yet, so Windows SmartScreen may show a warning on first run. Choose "More info", then "Run anyway". Code signing is planned but separate.',
      },
      {
        title: 'Still stuck?',
        text: 'Re-read the tutorial for the feature that misbehaves. The Designer always shows exactly what the overlay is drawing — if it looks right there, the setting is right.',
      },
    ],
    next: null,
  },
];

/** Ordered ids, for "next step" links and the progress counter. */
export const ACADEMY_ORDER: string[] = ACADEMY_TUTORIALS.map((t) => t.id);

export function getTutorial(id: string): Tutorial | null {
  return ACADEMY_TUTORIALS.find((t) => t.id === id) ?? null;
}
