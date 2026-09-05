/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['"Source Sans 3"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      colors: {
        background: '#FAFAF8',
        foreground: '#1A1A1A',
        muted: {
          DEFAULT: '#F5F3F0',
          foreground: '#6B6B6B',
        },
        accent: {
          DEFAULT: '#B8860B',
          secondary: '#D4A84B',
          foreground: '#FFFFFF',
          muted: 'rgba(184, 134, 11, 0.06)',
        },
        border: {
          DEFAULT: '#E8E4DF',
          accent: '#B8860B',
          hover: '#D4CECA',
        },
        card: {
          DEFAULT: '#FFFFFF',
          foreground: '#1A1A1A',
        },
        ring: '#B8860B',
        sentinel: {
          50: '#f0fdf4',
          100: '#dcfce7',
          500: '#22c55e',
          600: '#16a34a',
          900: '#14532d',
        },
        razor: {
          blue: '#0C2340',
          accent: '#3395FF',
          dark: '#07162c',
        },
      },
      boxShadow: {
        'sm': '0 1px 2px rgba(26, 26, 26, 0.04)',
        'md': '0 4px 12px rgba(26, 26, 26, 0.06)',
        'lg': '0 8px 24px rgba(26, 26, 26, 0.08)',
        'accent': '0 4px 16px rgba(184, 134, 11, 0.20)',
      },
      maxWidth: {
        '5xl': '64rem',
      },
    },
  },
  plugins: [],
}
