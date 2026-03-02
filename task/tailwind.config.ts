import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#100A21',
        panel: '#1D1438',
        card: '#291A4C',
        accent: '#B78CFF',
        accent2: '#8D63FF'
      }
    }
  },
  darkMode: 'class',
  plugins: []
};

export default config;
