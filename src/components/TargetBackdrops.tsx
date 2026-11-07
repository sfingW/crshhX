import React from 'react';

export interface BackdropOption {
  id: string;
  name: string;
  category: 'Calibration' | 'Competitive' | 'Stress Test';
  backgroundStyle: React.CSSProperties;
  showTargetDummy?: boolean;
  showGridLines?: boolean;
  showFovRings?: boolean;
}

export const BACKDROP_OPTIONS: BackdropOption[] = [
  {
    id: 'tactical-grid',
    name: 'Precision Grid',
    category: 'Calibration',
    backgroundStyle: {
      backgroundColor: '#0c0e12',
      backgroundImage: `
        radial-gradient(circle at center, rgba(16, 185, 129, 0.05) 0%, transparent 65%),
        linear-gradient(to right, rgba(255, 255, 255, 0.04) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(255, 255, 255, 0.04) 1px, transparent 1px)
      `,
      backgroundSize: '100% 100%, 40px 40px, 40px 40px',
    },
    showTargetDummy: true,
    showGridLines: true,
    showFovRings: true,
  },
  {
    id: 'cs2-dust2',
    name: 'CS2: Dust II Long',
    category: 'Competitive',
    backgroundStyle: {
      backgroundColor: '#736148',
      backgroundImage: `
        linear-gradient(180deg, rgba(62, 79, 102, 0.6) 0%, rgba(135, 114, 82, 0.7) 45%, rgba(68, 54, 38, 0.9) 100%),
        radial-gradient(ellipse at 50% 30%, rgba(255, 235, 190, 0.25) 0%, transparent 60%)
      `,
    },
    showTargetDummy: true,
  },
  {
    id: 'val-ascent',
    name: 'Valorant: Ascent Mid',
    category: 'Competitive',
    backgroundStyle: {
      backgroundColor: '#405264',
      backgroundImage: `
        linear-gradient(180deg, rgba(45, 68, 94, 0.8) 0%, rgba(105, 124, 140, 0.5) 45%, rgba(56, 48, 42, 0.9) 100%),
        radial-gradient(circle at 50% 40%, rgba(200, 225, 255, 0.15) 0%, transparent 70%)
      `,
    },
    showTargetDummy: true,
  },
  {
    id: 'smoke-washout',
    name: 'Smoke Grenade Washout',
    category: 'Stress Test',
    backgroundStyle: {
      backgroundColor: '#2b3038',
      backgroundImage: `
        radial-gradient(circle at center, rgba(140, 150, 165, 0.6) 0%, rgba(45, 50, 60, 0.85) 60%, #15181e 100%)
      `,
    },
    showTargetDummy: true,
  },
  {
    id: 'deep-shadow',
    name: 'Dark Corner (0 Lux)',
    category: 'Stress Test',
    backgroundStyle: {
      backgroundColor: '#07080a',
      backgroundImage: `
        radial-gradient(circle at center, #101217 0%, #050608 100%)
      `,
    },
    showTargetDummy: true,
  },
];
