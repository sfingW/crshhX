export interface ThemeAccent {
  id: string;
  name: string;
  color: string;
  hover: string;
  muted: string;
  border: string;
}

export const THEME_ACCENTS: ThemeAccent[] = [
  {
    id: 'jade',
    name: 'Hyper Jade',
    color: '#00e599',
    hover: '#05f1a5',
    muted: 'rgba(0, 229, 153, 0.12)',
    border: 'rgba(0, 229, 153, 0.35)',
  },
  {
    id: 'cyan',
    name: 'Ice Cyan',
    color: '#00d2ff',
    hover: '#33dcff',
    muted: 'rgba(0, 210, 255, 0.12)',
    border: 'rgba(0, 210, 255, 0.35)',
  },
  {
    id: 'violet',
    name: 'Laser Violet',
    color: '#8b5cf6',
    hover: '#a78bfa',
    muted: 'rgba(139, 92, 246, 0.12)',
    border: 'rgba(139, 92, 246, 0.35)',
  },
  {
    id: 'crimson',
    name: 'Crimson Rose',
    color: '#f43f5e',
    hover: '#fb7185',
    muted: 'rgba(244, 63, 94, 0.12)',
    border: 'rgba(244, 63, 94, 0.35)',
  },
  {
    id: 'amber',
    name: 'Solar Amber',
    color: '#f59e0b',
    hover: '#fbbf24',
    muted: 'rgba(245, 158, 11, 0.12)',
    border: 'rgba(245, 158, 11, 0.35)',
  },
];

export function applyThemeAccent(accent: ThemeAccent) {
  const root = document.documentElement;
  root.style.setProperty('--brand-accent', accent.color);
  root.style.setProperty('--brand-accent-hover', accent.hover);
  root.style.setProperty('--brand-accent-muted', accent.muted);
  root.style.setProperty('--brand-accent-border', accent.border);
  try {
    localStorage.setItem('crshhx_theme_accent', accent.id);
  } catch {}
}

export function loadSavedThemeAccent(): ThemeAccent {
  try {
    const savedId = localStorage.getItem('crshhx_theme_accent');
    const found = THEME_ACCENTS.find((a) => a.id === savedId);
    if (found) return found;
  } catch {}
  return THEME_ACCENTS[0]; // Default: Hyper Jade
}
