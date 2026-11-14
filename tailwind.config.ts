import type { Config } from 'tailwindcss';
export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: '#003057', 700: '#0B3D66', 800: '#022747', 900: '#011a30' },
        gold: { DEFAULT: '#B3A369', light: '#D6CC9E', dark: '#857437' },
        paper: '#F7F6F2',
        teal: { DEFAULT: '#1B8A8F', light: '#CDEBEC' },
        plum: { DEFAULT: '#6B4FA3', light: '#E6DEF5' },
        ink: '#1E2A36',
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config;
