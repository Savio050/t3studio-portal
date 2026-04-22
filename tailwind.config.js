/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        // Apple-inspired system font stack (falls back to Inter)
        sans: [
          '-apple-system', 'BlinkMacSystemFont', '"SF Pro Text"', '"SF Pro Display"',
          '"Helvetica Neue"', 'Helvetica', 'Inter', 'Arial', 'sans-serif',
        ],
        display: [
          '"SF Pro Display"', '-apple-system', 'BlinkMacSystemFont',
          '"Helvetica Neue"', 'Inter', 'sans-serif',
        ],
      },
      colors: {
        // Apple-inspired neutral palette
        canvas: '#fbfbfd',       // page background (warm off-white)
        surface: '#ffffff',      // cards
        elevated: '#f5f5f7',     // sections / subtle contrast
        hairline: '#d2d2d7',     // default border
        muted: {
          50:  '#fbfbfd',
          100: '#f5f5f7',
          200: '#e8e8ed',
          300: '#d2d2d7',
          400: '#a1a1a6',
          500: '#86868b',
          600: '#6e6e73',
          700: '#424245',
          800: '#2c2c2e',
          900: '#1d1d1f',
        },
        ink: {
          DEFAULT: '#1d1d1f',    // headings, primary text
          soft: '#424245',       // body
          muted: '#6e6e73',      // secondary
          faint: '#86868b',      // tertiary
        },
        accent: {
          DEFAULT: '#0071e3',    // Apple system blue
          hover: '#0077ed',
          soft: '#e8f2ff',
          ink: '#0050a1',
        },
        ok:    { DEFAULT: '#28cd41', soft: '#e8faed', ink: '#0f7a22' },
        warn:  { DEFAULT: '#ff9500', soft: '#fff4e5', ink: '#8a4e00' },
        err:   { DEFAULT: '#ff3b30', soft: '#ffecea', ink: '#9f1d16' },
        info:  { DEFAULT: '#5ac8fa', soft: '#e5f6ff', ink: '#0a6a8f' },
        brand: { DEFAULT: '#af52de', soft: '#f5e9ff', ink: '#5c1d82' },
      },
      boxShadow: {
        'hairline': '0 0 0 1px rgba(0,0,0,0.06)',
        'apple-sm': '0 1px 2px rgba(0,0,0,0.04), 0 0 0 1px rgba(0,0,0,0.04)',
        'apple':    '0 4px 16px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)',
        'apple-md': '0 10px 30px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)',
        'apple-lg': '0 20px 60px rgba(0,0,0,0.10), 0 0 0 1px rgba(0,0,0,0.04)',
        'apple-xl': '0 30px 80px rgba(0,0,0,0.14)',
        'focus':    '0 0 0 4px rgba(0,113,227,0.18)',
      },
      borderRadius: {
        'apple': '12px',
        'apple-lg': '16px',
        'apple-xl': '20px',
        'apple-2xl': '24px',
        'pill': '980px',
      },
      letterSpacing: {
        'apple-tight':  '-0.022em',
        'apple-snug':   '-0.015em',
        'apple-normal': '-0.01em',
      },
      animation: {
        'fade-in':  'fadeIn 0.25s cubic-bezier(0.2, 0.9, 0.3, 1.1)',
        'slide-up': 'slideUp 0.35s cubic-bezier(0.2, 0.9, 0.3, 1.1)',
        'pop':      'pop 0.3s cubic-bezier(0.2, 0.9, 0.3, 1.1)',
      },
      keyframes: {
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(10px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        pop: { '0%': { opacity: '0', transform: 'scale(0.96)' }, '100%': { opacity: '1', transform: 'scale(1)' } },
      },
      transitionTimingFunction: {
        'apple': 'cubic-bezier(0.2, 0.9, 0.3, 1.1)',
      },
    },
  },
  plugins: [],
}
