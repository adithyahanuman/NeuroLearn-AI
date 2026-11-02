/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: {
          DEFAULT: '#F6F3EC',
          2: '#EFEADF',
        },
        surface: '#FFFFFF',
        ink: {
          DEFAULT: '#121212',
          soft: '#2A2A2A',
        },
        muted: '#6B665C',
        line: '#E3DED2',
        lagoon: {
          DEFAULT: '#1D6B66',
          light: '#7FB7A4',
          subtle: '#E8F3F1',
        },
        amber: {
          DEFAULT: '#D99A1E',
          subtle: '#FDF7EB',
        },
        terracotta: {
          DEFAULT: '#C8452F',
          subtle: '#FBECE9',
        },
        sunrise: {
          from: '#F2B84B',
          to: '#E2674A',
        },
      },
      fontFamily: {
        display: ['"Instrument Serif"', 'serif'],
        sans: ['"Geist"', 'sans-serif'],
        mono: ['"Geist Mono"', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(18, 18, 18, 0.04)',
        hover: '0 4px 12px rgba(18, 18, 18, 0.06)',
      },
      borderRadius: {
        card: '14px',
        input: '10px',
      },
    },
  },
  plugins: [],
}
