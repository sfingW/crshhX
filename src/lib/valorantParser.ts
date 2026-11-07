import { CrosshairConfig } from '../types/crosshair';

const VALORANT_COLORS: Record<number, string> = {
  0: '#ffffff',
  1: '#00ff00',
  2: '#7fff00',
  3: '#adff2f',
  4: '#ffff00',
  5: '#00ffff',
  6: '#ff00ff',
  7: '#ff0000',
};

/**
 * Parses a Valorant crosshair profile code into a CrosshairConfig
 * Example code: 0;P;c;5;h;0;d;1;z;3;0t;1;0l;2;0o;2;0a;1;0f;0;1b;0
 */
export function parseValorantCode(code: string, baseConfig: CrosshairConfig): CrosshairConfig | null {
  try {
    const trimmed = code.trim();
    if (!trimmed.startsWith('0;')) {
      return null;
    }

    const tokens = trimmed.split(';');
    const updated: CrosshairConfig = { ...baseConfig, id: `val-${Date.now()}`, name: 'Imported Valorant' };

    let i = 0;
    while (i < tokens.length) {
      const key = tokens[i];
      const val = tokens[i + 1];

      switch (key) {
        case 'c': {
          const colorIdx = parseInt(val, 10);
          if (VALORANT_COLORS[colorIdx]) {
            updated.primaryColor = VALORANT_COLORS[colorIdx];
          }
          break;
        }
        case 'u': {
          // Custom hex color (without # usually in 6 or 8 digits)
          if (val) {
            updated.primaryColor = val.startsWith('#') ? val : `#${val.slice(0, 6)}`;
          }
          break;
        }
        case 'h': {
          updated.outlineEnabled = val === '1';
          break;
        }
        case 't': {
          updated.outlineThickness = Math.max(1, Math.min(6, parseFloat(val) || 1));
          break;
        }
        case 'o': {
          updated.outlineOpacity = Math.max(0, Math.min(1, parseFloat(val) || 1));
          break;
        }
        case 'd': {
          updated.centerDotEnabled = val === '1';
          break;
        }
        case 'z': {
          updated.centerDotSize = Math.max(1, Math.min(10, parseFloat(val) || 2));
          break;
        }
        case 'a': {
          updated.centerDotOpacity = Math.max(0, Math.min(1, parseFloat(val) || 1));
          break;
        }
        // Inner lines
        case '0t': {
          updated.thickness = Math.max(1, Math.min(20, parseFloat(val) || 1));
          break;
        }
        case '0l': {
          updated.length = Math.max(0, Math.min(50, parseFloat(val) || 0));
          break;
        }
        case '0o': {
          updated.gap = Math.max(0, Math.min(50, parseFloat(val) || 0));
          break;
        }
        case '0a': {
          updated.primaryOpacity = Math.max(0, Math.min(1, parseFloat(val) || 1));
          break;
        }
        case '0f': {
          updated.dynamicFiring = val === '1';
          break;
        }
        case '0b': {
          // 0b;0 means inner lines disabled
          if (val === '0') {
            updated.length = 0;
          }
          break;
        }
      }
      i += 2;
    }

    // Set topology based on length and dot
    if (updated.length === 0 && updated.centerDotEnabled) {
      updated.topology = 'dot';
    } else {
      updated.topology = 'cross';
    }

    return updated;
  } catch (err) {
    console.error('Failed to parse Valorant code:', err);
    return null;
  }
}

/**
 * Generates a Valorant share code string from a CrosshairConfig
 */
export function exportValorantCode(config: CrosshairConfig): string {
  // Find nearest color index or use custom hex
  let colorIndex = 8;
  const hex = config.primaryColor.toLowerCase();
  for (const [idx, val] of Object.entries(VALORANT_COLORS)) {
    if (val.toLowerCase() === hex) {
      colorIndex = parseInt(idx, 10);
      break;
    }
  }

  const parts: string[] = ['0', 'P'];
  if (colorIndex !== 8) {
    parts.push('c', colorIndex.toString());
  } else {
    parts.push('c', '8', 'u', hex.replace('#', ''));
  }

  // Outlines
  if (config.outlineEnabled) {
    parts.push('h', '1', 't', Math.round(config.outlineThickness).toString(), 'o', config.outlineOpacity.toFixed(1));
  } else {
    parts.push('h', '0');
  }

  // Center Dot
  if (config.centerDotEnabled) {
    parts.push('d', '1', 'z', Math.round(config.centerDotSize).toString(), 'a', config.centerDotOpacity.toFixed(1));
  } else {
    parts.push('d', '0');
  }

  // Inner lines
  if (config.topology === 'dot') {
    parts.push('0b', '0');
  } else {
    parts.push(
      '0t', Math.round(config.thickness).toString(),
      '0l', Math.round(config.length).toString(),
      '0o', Math.round(config.gap).toString(),
      '0a', config.primaryOpacity.toFixed(1)
    );
    if (config.dynamicFiring) {
      parts.push('0f', '1');
    }
  }

  // Disable outer lines by default
  parts.push('1b', '0');

  return parts.join(';');
}
