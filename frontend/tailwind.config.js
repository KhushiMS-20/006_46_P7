/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        navy: {
          900: '#070D1E',
          800: '#0B1528',
          700: '#112240',
          600: '#1D3557',
          500: '#2A4A7F',
        },
        cyan: {
          400: '#38BDF8',
          500: '#0EA5E9',
          accent: '#06D6A0',
        },
        atm: {
          blue: '#1E3A8A',
          teal: '#0D9488',
          gold: '#F59E0B',
          red: '#EF4444',
          green: '#10B981',
          purple: '#8B5CF6'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Courier New', 'monospace'],
      }
    },
  },
  plugins: [],
}
