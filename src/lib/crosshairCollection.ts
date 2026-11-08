import { CrosshairConfig } from '../types/crosshair';

function makeCrosshair(
  id: string,
  name: string,
  _category: 'pro' | 'tactical' | 'dots' | 'chevrons' | 'circles' | 'boxes' | 'novelty',
  game: 'valorant' | 'cs2' | 'fortnite' | 'apex' | 'universal',
  opts: Partial<CrosshairConfig>
): CrosshairConfig {
  return {
    id,
    name,
    game,
    isBuiltIn: true,
    topology: opts.topology || 'cross',
    length: opts.length ?? 4,
    thickness: opts.thickness ?? 2,
    gap: opts.gap ?? 2,
    hasTopArm: opts.hasTopArm ?? true,
    hasBottomArm: opts.hasBottomArm ?? true,
    hasLeftArm: opts.hasLeftArm ?? true,
    hasRightArm: opts.hasRightArm ?? true,
    primaryColor: opts.primaryColor || '#00ff66',
    primaryOpacity: opts.primaryOpacity ?? 1,
    centerDotEnabled: opts.centerDotEnabled ?? false,
    centerDotSize: opts.centerDotSize ?? 2,
    centerDotShape: opts.centerDotShape || 'square',
    centerDotColor: opts.centerDotColor || opts.primaryColor || '#00ff66',
    centerDotOpacity: opts.centerDotOpacity ?? 1,
    outlineEnabled: opts.outlineEnabled ?? false,
    outlineColor: opts.outlineColor || '#000000',
    outlineThickness: opts.outlineThickness ?? 1,
    outlineOpacity: opts.outlineOpacity ?? 1,
    circleEnabled: opts.circleEnabled ?? false,
    circleRadius: opts.circleRadius ?? 16,
    circleThickness: opts.circleThickness ?? 2,
    circleColor: opts.circleColor || opts.primaryColor || '#00ff66',
    circleOpacity: opts.circleOpacity ?? 0.8,
    glowEnabled: false,
    glowColor: opts.primaryColor || '#00ff66',
    glowBlur: 0,
    offsetX: 0,
    offsetY: 0,
    stretchedMode: 'none',
    stretchCompressionRatio: 0.75,
    dynamicFiring: opts.dynamicFiring ?? false,
    firingBloomExpansion: opts.firingBloomExpansion ?? 5,
    firingDecayMs: 120,
    adsMorphEnabled: opts.adsMorphEnabled ?? false,
    adsTrigger: 'right-click',
    adsStyle: 'shrink',
    adsScale: 0.6,
    ...opts,
  };
}

// Generate the 258+ Crosshair Collection with 100% Original, Trademark-Safe Tactical Names
export function generateCrosshairVault(): CrosshairConfig[] {
  const list: CrosshairConfig[] = [];

  // 1. ESPORTS ROSTER / ARCHETYPES (30 presets - 100% Original Tactical Names)
  const rosterDefs = [
    { name: 'Cyan Duelist (One-Tap)', game: 'valorant', color: '#00ffff', len: 4, thk: 2, gap: 2, outline: true },
    { name: 'Apex Anchor (Micro Green)', game: 'cs2', color: '#00ff00', len: 2, thk: 1, gap: -1, dot: true, dotSz: 2 },
    { name: 'Eagle Eye (Deagle Static)', game: 'cs2', color: '#00ffff', len: 3, thk: 1.5, gap: 1, outline: false },
    { name: 'Viper Fang (Pure Green)', game: 'valorant', color: '#00ff00', len: 4, thk: 2, gap: 0, outline: false },
    { name: 'Phantom Shroud (Universal)', game: 'universal', color: '#00ffff', len: 5, thk: 2, gap: 3, outline: true },
    { name: 'Headshot Machine (1-Tap)', game: 'valorant', color: '#00ffff', len: 0, thk: 0, gap: 0, dot: true, dotSz: 3, outline: true },
    { name: 'Ghost Operator (Clean White)', game: 'valorant', color: '#ffffff', len: 3, thk: 1, gap: 2, outline: false },
    { name: 'Sniper Prodigy (Flick Pin)', game: 'cs2', color: '#00ff66', len: 2, thk: 1, gap: -2, dot: true, outline: true },
    { name: 'The Chosen One (Cyan Dot)', game: 'cs2', color: '#00ffff', len: 2.5, thk: 1, gap: -3, dot: false },
    { name: 'Strat Master (Micro Box)', game: 'valorant', color: '#00ff66', len: 2, thk: 2, gap: 2, dot: true, dotSz: 2 },
    { name: 'Pump Breacher (Shotgun Spread)', game: 'fortnite', color: '#ff3333', len: 3, thk: 2, gap: 8, circle: true, cRad: 18 },
    { name: 'Rapid Box (Tactical White)', game: 'fortnite', color: '#ffffff', len: 3, thk: 2, gap: 2, outline: true },
    { name: 'Box Fight Meta (Yellow Dot)', game: 'fortnite', color: '#ffff00', len: 4, thk: 2, gap: 4, dot: true },
    { name: 'World Cup Solos (Tight White)', game: 'fortnite', color: '#ffffff', len: 3, thk: 1.5, gap: 3, outline: true },
    { name: 'W-Key Striker (Cyan Cross)', game: 'fortnite', color: '#00ffff', len: 4, thk: 2, gap: 2, outline: true },
    { name: 'Apex Predator (Inverted V)', game: 'apex', color: '#ff0055', len: 5, thk: 2, gap: 4, topo: 'chevron' as const },
    { name: 'Movement King (Yellow Point)', game: 'apex', color: '#ffff00', len: 4, thk: 2, gap: 3, dot: true },
    { name: 'Major Champion (White Cross)', game: 'valorant', color: '#ffffff', len: 4, thk: 2, gap: 2, outline: true },
    { name: 'Clutch Anchor (Heavy Green)', game: 'valorant', color: '#00ff00', len: 5, thk: 2.5, gap: 3, outline: true },
    { name: 'Tactical Flex (Cyan Micro)', game: 'valorant', color: '#00ffff', len: 3, thk: 1, gap: 1, outline: false },
    { name: 'Turkish Operator (White Pin)', game: 'valorant', color: '#ffffff', len: 4, thk: 1.5, gap: 1, outline: true },
    { name: 'Entry Specialist (Clean White)', game: 'valorant', color: '#ffffff', len: 3, thk: 2, gap: 2, outline: false },
    { name: 'Crimson Marksman (Chamber)', game: 'valorant', color: '#ff0044', len: 3, thk: 2, gap: 2, outline: true },
    { name: 'Flex Duelist (White Dot)', game: 'valorant', color: '#ffffff', len: 2, thk: 1, gap: 1, dot: true },
    { name: 'Explosive Entry (Cyan Wide)', game: 'valorant', color: '#00ffff', len: 4, thk: 2, gap: 1, outline: false },
    { name: 'Headshot Ratio (Pure Green)', game: 'cs2', color: '#00ff00', len: 2, thk: 1, gap: -3, dot: false },
    { name: 'Lurker Silence (Green Pin)', game: 'cs2', color: '#00ff00', len: 2, thk: 1, gap: -3, outline: false },
    { name: 'Aggro Phenom (Micro Cyan)', game: 'cs2', color: '#00ffff', len: 1.5, thk: 1, gap: -2, dot: true },
    { name: 'Classic MVP (Yellow Cross)', game: 'cs2', color: '#ffff00', len: 3, thk: 1, gap: -2, outline: false },
    { name: 'Spray Pattern (White Outline)', game: 'cs2', color: '#ffffff', len: 2.5, thk: 1.5, gap: -1, outline: true },
  ];

  rosterDefs.forEach((p, idx) => {
    list.push(
      makeCrosshair(`pro-${idx + 1}`, p.name, 'pro', p.game as any, {
        topology: (p.topo as any) || (p.len === 0 ? 'dot' : 'cross'),
        primaryColor: p.color,
        length: p.len,
        thickness: p.thk,
        gap: p.gap,
        outlineEnabled: p.outline || false,
        centerDotEnabled: p.dot || false,
        centerDotSize: p.dotSz || 2,
        circleEnabled: p.circle || false,
        circleRadius: p.cRad || 16,
      })
    );
  });

  // 2. DOTS & PRECISION RETICLES (35 variations)
  const dotColors = ['#ffffff', '#00ff66', '#00ffff', '#ff3333', '#ffff00', '#ff00aa', '#0088ff'];
  dotColors.forEach((color, cIdx) => {
    [1.5, 2, 3, 4, 6].forEach((sz, sIdx) => {
      list.push(
        makeCrosshair(`dot-round-${cIdx}-${sIdx}`, `Subpixel Dot ${sz}px (${color})`, 'dots', 'universal', {
          topology: 'dot',
          length: 0,
          thickness: 0,
          gap: 0,
          centerDotEnabled: true,
          centerDotShape: 'circle',
          centerDotSize: sz,
          centerDotColor: color,
          outlineEnabled: true,
          outlineThickness: 1,
        })
      );
    });
  });

  // Square Pixels
  dotColors.slice(0, 5).forEach((color, cIdx) => {
    [1, 2, 3, 4].forEach((sz, sIdx) => {
      list.push(
        makeCrosshair(`dot-sq-${cIdx}-${sIdx}`, `Quantum Pixel ${sz}x${sz} (${color})`, 'dots', 'universal', {
          topology: 'dot',
          length: 0,
          thickness: 0,
          gap: 0,
          centerDotEnabled: true,
          centerDotShape: 'square',
          centerDotSize: sz,
          centerDotColor: color,
          outlineEnabled: sz >= 2,
          outlineThickness: 1,
        })
      );
    });
  });

  // 3. TACTICAL CROSSES & T-SHAPES (40 variations)
  const tacColors = ['#00ff66', '#00ffff', '#ffffff', '#ffff00', '#ff3366'];
  tacColors.forEach((color, cIdx) => {
    list.push(
      makeCrosshair(`tac-tight-${cIdx}`, `Vanguard Tight ${cIdx + 1}`, 'tactical', 'universal', {
        topology: 'cross',
        length: 3,
        thickness: 1.5,
        gap: 1,
        primaryColor: color,
        outlineEnabled: true,
      })
    );
    list.push(
      makeCrosshair(`tac-wide-${cIdx}`, `Stiletto Wide Gap ${cIdx + 1}`, 'tactical', 'universal', {
        topology: 'cross',
        length: 5,
        thickness: 2,
        gap: 6,
        primaryColor: color,
        outlineEnabled: true,
      })
    );
    list.push(
      makeCrosshair(`tac-tshape-${cIdx}`, `Open Horizon T-Bar ${cIdx + 1}`, 'tactical', 'universal', {
        topology: 't-shape',
        length: 4,
        thickness: 2,
        gap: 2,
        hasTopArm: false,
        primaryColor: color,
        outlineEnabled: true,
      })
    );
    list.push(
      makeCrosshair(`tac-micro-t-${cIdx}`, `Micro Horizon ${cIdx + 1}`, 'tactical', 'universal', {
        topology: 't-shape',
        length: 2.5,
        thickness: 1,
        gap: 1,
        hasTopArm: false,
        primaryColor: color,
        outlineEnabled: false,
      })
    );
    list.push(
      makeCrosshair(`tac-inv-t-${cIdx}`, `Inverted Pillar ${cIdx + 1}`, 'tactical', 'universal', {
        topology: 'cross',
        length: 4,
        thickness: 2,
        gap: 2,
        hasBottomArm: false,
        primaryColor: color,
        outlineEnabled: true,
      })
    );
    list.push(
      makeCrosshair(`tac-horiz-${cIdx}`, `Horizon Axis ${cIdx + 1}`, 'tactical', 'universal', {
        topology: 'cross',
        length: 6,
        thickness: 2,
        gap: 3,
        hasTopArm: false,
        hasBottomArm: false,
        primaryColor: color,
        centerDotEnabled: true,
        centerDotSize: 2,
      })
    );
    list.push(
      makeCrosshair(`tac-vert-${cIdx}`, `Elevation Post ${cIdx + 1}`, 'tactical', 'universal', {
        topology: 'cross',
        length: 6,
        thickness: 2,
        gap: 3,
        hasLeftArm: false,
        hasRightArm: false,
        primaryColor: color,
        centerDotEnabled: true,
        centerDotSize: 2,
      })
    );
    list.push(
      makeCrosshair(`tac-cross-dot-${cIdx}`, `Tactical Dot-Matrix ${cIdx + 1}`, 'tactical', 'universal', {
        topology: 'cross',
        length: 4,
        thickness: 2,
        gap: 3,
        primaryColor: color,
        centerDotEnabled: true,
        centerDotSize: 2,
        outlineEnabled: true,
      })
    );
  });

  // 4. CIRCLES, RINGS & SHOTGUN SPREAD (35 variations)
  const ringColors = ['#ffffff', '#ff3333', '#00ffff', '#00ff66', '#ffff00', '#ff00aa'];
  ringColors.forEach((color, cIdx) => {
    [10, 14, 18, 24].forEach((rad, rIdx) => {
      list.push(
        makeCrosshair(`ring-hollow-${cIdx}-${rIdx}`, `Halo Ring ${rad}px (${color})`, 'circles', 'fortnite', {
          topology: 'circle',
          length: 0,
          thickness: 0,
          gap: 0,
          circleEnabled: true,
          circleRadius: rad,
          circleThickness: 1.5,
          circleColor: color,
          outlineEnabled: true,
        })
      );
    });
    [12, 18, 26].forEach((rad, rIdx) => {
      list.push(
        makeCrosshair(`ring-dot-${cIdx}-${rIdx}`, `Bullseye Halo ${rad}px + Focal Dot`, 'circles', 'fortnite', {
          topology: 'circle',
          length: 0,
          thickness: 0,
          gap: 0,
          circleEnabled: true,
          circleRadius: rad,
          circleThickness: 2,
          circleColor: color,
          centerDotEnabled: true,
          centerDotSize: 3,
          centerDotColor: color,
          outlineEnabled: true,
        })
      );
    });
    list.push(
      makeCrosshair(`shotgun-cross-${cIdx}`, `Shotgun Spread Calibrator ${cIdx + 1}`, 'circles', 'fortnite', {
        topology: 'circle',
        length: 3,
        thickness: 2,
        gap: 16,
        primaryColor: color,
        circleEnabled: true,
        circleRadius: 20,
        circleThickness: 2,
        circleColor: color,
        outlineEnabled: true,
      })
    );
  });

  // 5. CHEVRONS & TRIANGLES (30 variations)
  const chevColors = ['#ff0055', '#00ffff', '#ffff00', '#00ff66', '#ffffff', '#ff8800'];
  chevColors.forEach((color, cIdx) => {
    [4, 6, 8, 10].forEach((len, lIdx) => {
      list.push(
        makeCrosshair(`chev-${cIdx}-${lIdx}`, `Striker Chevron ${len}px (${color})`, 'chevrons', 'apex', {
          topology: 'chevron',
          length: len,
          thickness: 2,
          gap: 2,
          primaryColor: color,
          outlineEnabled: true,
        })
      );
    });
    list.push(
      makeCrosshair(`chev-dot-${cIdx}`, `Arrowhead Pointer + Focal Dot (${color})`, 'chevrons', 'apex', {
        topology: 'chevron',
        length: 6,
        thickness: 2,
        gap: 4,
        primaryColor: color,
        centerDotEnabled: true,
        centerDotSize: 2,
        centerDotColor: color,
        outlineEnabled: true,
      })
    );
  });

  // 6. BOXES, CORNERS & QUADRANTS (30 variations)
  const boxColors = ['#00ffff', '#00ff66', '#ffffff', '#ffff00', '#ff00aa'];
  boxColors.forEach((color, cIdx) => {
    list.push(
      makeCrosshair(`box-quad-${cIdx}`, `Centurion Corner Brackets ${cIdx + 1}`, 'boxes', 'cs2', {
        topology: 'cross',
        length: 2,
        thickness: 2,
        gap: 5,
        primaryColor: color,
        outlineEnabled: true,
      })
    );
    list.push(
      makeCrosshair(`box-hollow-${cIdx}`, `Hollow Prism Box ${cIdx + 1}`, 'boxes', 'universal', {
        topology: 'cross',
        length: 4,
        thickness: 2,
        gap: 4,
        primaryColor: color,
        outlineEnabled: true,
      })
    );
    list.push(
      makeCrosshair(`box-dot-${cIdx}`, `Lock-On Box + Precision Point ${cIdx + 1}`, 'boxes', 'universal', {
        topology: 'cross',
        length: 3,
        thickness: 2,
        gap: 6,
        primaryColor: color,
        centerDotEnabled: true,
        centerDotSize: 2.5,
        centerDotColor: color,
        outlineEnabled: true,
      })
    );
    list.push(
      makeCrosshair(`box-dyn-${cIdx}`, `Recoil Expansion Box ${cIdx + 1}`, 'boxes', 'cs2', {
        topology: 'cross',
        length: 3,
        thickness: 2,
        gap: 4,
        primaryColor: color,
        dynamicFiring: true,
        firingBloomExpansion: 6,
        outlineEnabled: true,
      })
    );
    list.push(
      makeCrosshair(`box-micro-${cIdx}`, `Micro Tactical Frame ${cIdx + 1}`, 'boxes', 'universal', {
        topology: 'cross',
        length: 1.5,
        thickness: 1.5,
        gap: 2,
        primaryColor: color,
        outlineEnabled: false,
      })
    );
    list.push(
      makeCrosshair(`box-heavy-${cIdx}`, `Heavy Contrast Enclosure ${cIdx + 1}`, 'boxes', 'universal', {
        topology: 'cross',
        length: 5,
        thickness: 3,
        gap: 4,
        primaryColor: color,
        outlineEnabled: true,
        outlineThickness: 1.5,
      })
    );
  });

  // 7. NOVELTY, SPECIALTY & BALLISTIC RETICLES (25 variations)
  const noveltyList = [
    { name: 'Sniper Quickscope Eye', topo: 'circle' as const, cRad: 8, col: '#ff0033', dot: true, dotSz: 3 },
    { name: 'X-Factor Marksman', topo: 'chevron' as const, len: 7, col: '#00e5ff', dot: true },
    { name: 'Diamond Precision Pin', topo: 'chevron' as const, len: 5, col: '#ffea00', dot: true },
    { name: 'Biohazard Tactical Sight', topo: 'circle' as const, cRad: 15, len: 4, col: '#39ff14' },
    { name: 'Heavy Magnum Cross', topo: 'cross' as const, len: 6, thk: 3, gap: 1, col: '#00ffff' },
    { name: 'Scout No-Scope Pin', topo: 'dot' as const, dotSz: 4, col: '#ff0000', outline: true },
    { name: 'Vortex Rotor Blades', topo: 't-shape' as const, len: 7, thk: 2, gap: 3, col: '#00ffaa' },
    { name: 'Shotgun Bullseye Ring', topo: 'circle' as const, cRad: 22, col: '#ffffff', dot: true, dotSz: 4 },
    { name: 'Wingman Precision Dot', topo: 'chevron' as const, len: 5, col: '#ff3366', dot: true, dotSz: 2 },
    { name: 'Breacher Pellet Spread', topo: 'circle' as const, cRad: 16, len: 3, thk: 2, gap: 12, col: '#ffffff' },
    { name: 'Headshot Zero-Deviation', topo: 'cross' as const, len: 2, thk: 1.5, gap: 0, col: '#00ff66' },
    { name: 'Vandal Recoil Impulse', topo: 'cross' as const, len: 4, thk: 2, gap: 3, col: '#00ffff', dyn: true },
    { name: 'Ghost Operative Silent Dot', topo: 'dot' as const, dotSz: 2, col: '#ffffff', outline: true },
    { name: 'Hyperion Laser Cross', topo: 'cross' as const, len: 5, thk: 2, gap: 2, col: '#ff007f' },
    { name: 'Cybernetic Focal Ring', topo: 'circle' as const, cRad: 14, col: '#00aaff', dot: true },
    { name: 'Golden Precision Sight', topo: 'cross' as const, len: 3, thk: 2, gap: 1, col: '#ffcc00' },
    { name: 'Tracker Hunting Reticle', topo: 'chevron' as const, len: 8, col: '#ff1100', dot: true },
    { name: 'Minimalist Titanium Needle', topo: 'cross' as const, len: 2, thk: 1, gap: 2, col: '#ffffff' },
    { name: 'Ballistic Grid Sight', topo: 'cross' as const, len: 1, thk: 1, gap: 4, dot: true, col: '#00ff00' },
    { name: 'Orbital Strike Targeter', topo: 'circle' as const, cRad: 28, col: '#ff8800', dot: true },
    { name: 'Retro Arena Cross', topo: 'cross' as const, len: 6, thk: 1, gap: 5, col: '#ffff00' },
    { name: 'Counter-Strike Classic Emerald', topo: 'cross' as const, len: 8, thk: 1.5, gap: 4, col: '#00ff00', dyn: true },
    { name: 'Heavy Railgun Plus', topo: 'cross' as const, len: 5, thk: 2, gap: 0, col: '#ff0000' },
    { name: 'Archer Trajectory Arc', topo: 't-shape' as const, len: 5, thk: 1.5, gap: 2, col: '#00ffff' },
    { name: 'Iron-Sight Point Blank', topo: 'dot' as const, dotSz: 3.5, col: '#ff2200', outline: true },
  ];

  noveltyList.forEach((n, idx) => {
    list.push(
      makeCrosshair(`novelty-${idx + 1}`, n.name, 'novelty', 'universal', {
        topology: n.topo,
        primaryColor: n.col,
        length: n.len ?? 4,
        thickness: n.thk ?? 2,
        gap: n.gap ?? 2,
        circleEnabled: n.topo === 'circle',
        circleRadius: n.cRad ?? 16,
        centerDotEnabled: n.dot ?? false,
        centerDotSize: n.dotSz ?? 2,
        centerDotColor: n.col,
        outlineEnabled: n.outline ?? true,
        dynamicFiring: n.dyn ?? false,
      })
    );
  });

  return list;
}

export const COMPLETE_CROSSHAIR_VAULT = generateCrosshairVault();
