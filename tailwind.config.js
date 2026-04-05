/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        surface: '#f4f7fb',
        ink: '#0b1320',
        line: '#d7e0ea',
        brand: {
          50: '#ebf5ff',
          100: '#d8ebff',
          300: '#77b4ff',
          500: '#1677ff',
          600: '#005fe0',
          700: '#0047ab',
        },
        accent: {
          50: '#ecfdf5',
          100: '#d1fae5',
          500: '#0f9f74',
          700: '#0b6b51',
        },
        slate: {
          25: '#fcfdff',
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        },
        success: '#109868',
        warning: '#d99210',
        danger: '#d9485f',
        info: '#2463eb',
      },
      boxShadow: {
        soft: '0 20px 60px rgba(15, 23, 42, 0.10)',
        panel: '0 24px 80px rgba(9, 17, 28, 0.12)',
        glow: '0 16px 40px rgba(22, 119, 255, 0.20)',
      },
      fontFamily: {
        sans: ['Manrope', 'ui-sans-serif', 'system-ui'],
        display: ['Space Grotesk', 'Manrope', 'ui-sans-serif'],
      },
      backgroundImage: {
        'app-grid':
          'linear-gradient(rgba(255,255,255,0.55) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.55) 1px, transparent 1px), radial-gradient(circle at top left, rgba(22,119,255,0.16), transparent 28%), radial-gradient(circle at right 20%, rgba(15,159,116,0.14), transparent 22%), linear-gradient(180deg, #f9fbff 0%, #eef3f8 100%)',
        'sidebar-glow':
          'radial-gradient(circle at top, rgba(119,180,255,0.22), transparent 26%), linear-gradient(180deg, #07111e 0%, #0f172a 44%, #0b1320 100%)',
      },
      backgroundSize: {
        grid: '32px 32px',
      },
    },
  },
  plugins: [],
};
