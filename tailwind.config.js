/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./overlay.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          accent: 'var(--brand-accent, #00e599)',
          accentHover: 'var(--brand-accent-hover, #05f1a5)',
          accentMuted: 'var(--brand-accent-muted, rgba(0, 229, 153, 0.12))',
          accentBorder: 'var(--brand-accent-border, rgba(0, 229, 153, 0.3))',
        },
        surface: {
          base: '#111215',
          sidebar: '#16171b',
          card: '#1b1c22',
          cardHover: '#22232b',
          border: '#262832',
          borderLight: '#323542',
        },
        /**
         * Panel ramp used by the editor, designer and import surfaces.
         *
         * These classes were already used in ~100 places across ReticleControls,
         * LivePreview, CodeImportExport and TopNav but were never defined, so
         * every "card" rendered with no background and no border. Defining the
         * ramp once — as a deliberate light-to-dark progression over the same
         * surface scale — fixes all of them without touching any JSX.
         */
        panel: {
          elevated: '#22232b', // outer container
          base: '#1b1c22',     // section cards
          card: '#1b1c22',
          subtle: '#16171b',   // input wells
          border: '#262832',
        }
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Display"', '"Segoe UI"', 'Roboto', 'Inter', 'sans-serif'],
        mono: ['"SF Mono"', '"JetBrains Mono"', '"Fira Code"', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
};
