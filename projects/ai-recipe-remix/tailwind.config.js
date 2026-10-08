import defaultTheme from 'tailwindcss/defaultTheme.js';

/**
 * Warm "kitchen paper" theme. Text/background pairs are checked for WCAG AA
 * contrast in test/palette.test.js. Note: white text on the brand tomato
 * (#d9472b) is only 4.3:1, so filled buttons use the slightly deeper tomato-600.
 *
 * @type {import('tailwindcss').Config}
 */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        cream: { DEFAULT: '#fbf7f0', 100: '#f6efe3', 200: '#efe4d3' },
        paper: '#fffdf9',
        ink: { DEFAULT: '#1f1a14', muted: '#5e5345', soft: '#6b5f50' },
        line: { DEFAULT: '#eadfce', strong: '#a08d74' },
        tomato: {
          50: '#fdf0ec',
          100: '#fadcd3',
          200: '#f4b8a8',
          DEFAULT: '#d9472b',
          600: '#c43c22',
          700: '#a8321b',
        },
        herb: { 50: '#eef6f0', 100: '#d7eadc', DEFAULT: '#3f7d4e', 700: '#2f6b3e' },
        honey: { 50: '#fdf3dc', 200: '#f0d9a0', 800: '#6b4a06' },
      },
      fontFamily: {
        display: ['"Fraunces Variable"', 'Georgia', 'Cambria', '"Times New Roman"', 'serif'],
        sans: ['"Inter Variable"', ...defaultTheme.fontFamily.sans],
      },
      boxShadow: {
        soft: '0 1px 2px rgb(31 26 20 / 0.04), 0 12px 32px -18px rgb(31 26 20 / 0.22)',
        lift: '0 2px 6px rgb(31 26 20 / 0.06), 0 22px 44px -22px rgb(31 26 20 / 0.32)',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '150% 0' },
          '100%': { backgroundPosition: '-50% 0' },
        },
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'none' },
        },
        flash: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgb(217 71 43 / 0)' },
          '35%': { boxShadow: '0 0 0 4px rgb(217 71 43 / 0.35)' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.6s ease-in-out infinite',
        'fade-up': 'fade-up 360ms ease-out both',
        flash: 'flash 900ms ease-out',
      },
    },
  },
  plugins: [],
};
