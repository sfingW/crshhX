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
