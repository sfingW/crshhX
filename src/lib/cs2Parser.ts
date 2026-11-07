import { CrosshairConfig } from '../types/crosshair';

/**
 * Parses CS2 console commands into a CrosshairConfig
 * Handles single or multiple commands separated by semicolons, newlines, or spaces
 */
export function parseCS2Commands(text: string, baseConfig: CrosshairConfig): CrosshairConfig | null {
  try {
    const lines = text.split(/[\r\n;]+/);
    const updated: CrosshairConfig = { ...baseConfig, id: `cs2-${Date.now()}`, name: 'Imported CS2' };
    let parsedAny = false;

    let r = 0, g = 255, b = 100, customColor = false;

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      const tokens = line.split(/\s+/);
      const cmd = tokens[0].toLowerCase();
      const val = parseFloat(tokens[1]);

      if (isNaN(val) && !['cl_crosshaircolor_r', 'cl_crosshaircolor_g', 'cl_crosshaircolor_b'].includes(cmd)) {
        continue;
      }

      parsedAny = true;

      switch (cmd) {
        case 'cl_crosshairsize':
          updated.length = Math.max(0, Math.min(50, val));
          break;
        case 'cl_crosshairthickness':
          updated.thickness = Math.max(0.5, Math.min(20, val));
          break;
        case 'cl_crosshairgap':
          updated.gap = Math.max(0, Math.min(50, Math.max(0, val + 5))); // CS2 allows negative gaps
          break;
        case 'cl_crosshairdot':
          updated.centerDotEnabled = val === 1;
          break;
        case 'cl_crosshair_drawoutline':
          updated.outlineEnabled = val === 1;
          break;
        case 'cl_crosshair_outlinethickness':
          updated.outlineThickness = Math.max(1, Math.min(6, val));
          break;
        case 'cl_crosshairalpha':
          updated.primaryOpacity = Math.max(0, Math.min(1, val / 255));
          break;
        case 'cl_crosshair_t':
          if (val === 1) {
            updated.topology = 't-shape';
            updated.hasTopArm = false;
          }
          break;
        case 'cl_crosshairstyle':
          updated.dynamicFiring = val === 2 || val === 3;
          break;
        case 'cl_crosshaircolor_r':
          r = Math.max(0, Math.min(255, val));
          customColor = true;
          break;
        case 'cl_crosshaircolor_g':
          g = Math.max(0, Math.min(255, val));
          customColor = true;
          break;
        case 'cl_crosshaircolor_b':
          b = Math.max(0, Math.min(255, val));
          customColor = true;
          break;
        case 'cl_crosshaircolor':
          if (val === 1) updated.primaryColor = '#00ff66';
          else if (val === 2) updated.primaryColor = '#ffff00';
          else if (val === 3) updated.primaryColor = '#0088ff';
          else if (val === 4) updated.primaryColor = '#00ffff';
          else if (val === 5) customColor = true;
          break;
      }
    }

    if (customColor) {
      const toHex = (c: number) => c.toString(16).padStart(2, '0');
      updated.primaryColor = `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    }

    return parsedAny ? updated : null;
  } catch (err) {
    console.error('Failed to parse CS2 commands:', err);
    return null;
  }
}

/**
 * Exports CrosshairConfig to CS2 console commands
 */
export function exportCS2Commands(config: CrosshairConfig): string {
  // Convert hex to RGB
  const hex = config.primaryColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16) || 0;
  const g = parseInt(hex.substring(2, 4), 16) || 255;
  const b = parseInt(hex.substring(4, 6), 16) || 200;

  const commands: string[] = [
    `cl_crosshairstyle ${config.dynamicFiring ? 2 : 4}`,
    `cl_crosshairsize ${config.length}`,
    `cl_crosshairthickness ${config.thickness}`,
    `cl_crosshairgap ${config.gap - 3}`,
    `cl_crosshairdot ${config.centerDotEnabled ? 1 : 0}`,
    `cl_crosshair_drawoutline ${config.outlineEnabled ? 1 : 0}`,
    `cl_crosshair_outlinethickness ${Math.round(config.outlineThickness)}`,
    `cl_crosshairalpha ${Math.round(config.primaryOpacity * 255)}`,
    `cl_crosshaircolor 5`,
    `cl_crosshaircolor_r ${r}`,
    `cl_crosshaircolor_g ${g}`,
    `cl_crosshaircolor_b ${b}`,
    `cl_crosshair_t ${config.topology === 't-shape' || !config.hasTopArm ? 1 : 0}`,
  ];

  return commands.join('; ');
}
