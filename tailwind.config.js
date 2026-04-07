/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        surface: '#fbf5ee',
        ink: '#181311',
        line: '#e7d7c7',
        brand: {
          50: '#fff2df',
          100: '#ffe1b7',
          300: '#ffc56b',
          500: '#f5a12a',
          600: '#de8710',
          700: '#b96a00',
        },
        accent: {
          50: '#f7efe6',
          100: '#ead9c7',
          500: '#8f4f16',
          700: '#5d2f0d',
        },
        slate: {
          25: '#fffdf9',
          50: '#fbf5ee',
          100: '#f5ecdf',
          200: '#e7d7c7',
          300: '#d6bfa9',
          400: '#a98e75',
          500: '#7d6755',
          600: '#5f4e42',
          700: '#433730',
          800: '#2a221e',
          900: '#181311',
          950: '#0e0a08',
        },
        success: '#2f8f5b',
        warning: '#d27b1f',
        danger: '#c55348',
        info: '#9a5c14',
      },
      boxShadow: {
        soft: '0 20px 60px rgba(74, 46, 18, 0.10)',
        panel: '0 24px 80px rgba(24, 19, 17, 0.14)',
        glow: '0 16px 40px rgba(245, 161, 42, 0.24)',
      },
      fontFamily: {
        sans: ['Manrope', 'ui-sans-serif', 'system-ui'],
        display: ['Cormorant Garamond', 'Manrope', 'ui-sans-serif'],
      },
      backgroundImage: {
        'app-grid':
          'linear-gradient(rgba(255,255,255,0.45) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.45) 1px, transparent 1px), radial-gradient(circle at top left, rgba(245,161,42,0.18), transparent 28%), radial-gradient(circle at right 18%, rgba(143,79,22,0.14), transparent 24%), linear-gradient(180deg, #fffaf4 0%, #f5ecdf 100%)',
        'sidebar-glow':
          'radial-gradient(circle at top, rgba(245,161,42,0.26), transparent 26%), linear-gradient(180deg, #100d0b 0%, #181311 44%, #231b17 100%)',
      },
      backgroundSize: {
        grid: '32px 32px',
      },
    },
  },
  plugins: [],
};
