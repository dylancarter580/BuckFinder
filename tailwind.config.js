/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Dark forest color palette
        forest: {
          50: '#f0f5f0',
          100: '#d9e6d9',
          200: '#b3ccb3',
          300: '#8db38d',
          400: '#669966',
          500: '#4d8c4d',
          600: '#3d733d',
          700: '#2e592e',
          800: '#1f401f',
          900: '#0f260f',
          950: '#081408',
        },
        bark: {
          50: '#f7f4f0',
          100: '#e8dfd4',
          200: '#d4c4aa',
          300: '#bfa980',
          400: '#a68f5b',
          500: '#8c7748',
          600: '#735f3a',
          700: '#59472c',
          800: '#40301f',
          900: '#261a11',
          950: '#140d08',
        },
        moss: {
          400: '#6b8c4a',
          500: '#557336',
          600: '#405926',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'scan-pulse': 'scanPulse 2s ease-in-out infinite',
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
      },
      keyframes: {
        scanPulse: {
          '0%, 100%': { opacity: 0.4 },
          '50%': { opacity: 1 },
        },
        fadeIn: {
          '0%': { opacity: 0 },
          '100%': { opacity: 1 },
        },
        slideUp: {
          '0%': { opacity: 0, transform: 'translateY(20px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
};
