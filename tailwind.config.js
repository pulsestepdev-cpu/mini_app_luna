/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: '#2B2140', soft: '#4A3F5E', muted: '#857A96', faint: '#B4AAC2' },
        plum: { 50: '#F7F2FC', 100: '#EFE5F9', 200: '#E0CFF3', 300: '#C9AEE8', 400: '#A884D6', 500: '#8A60C4', 600: '#7448B1', 700: '#5E3896', 800: '#472B72', 900: '#2F1D4E' },
        rose: { 100: '#FCE8EF', 200: '#F8D2E0', 400: '#EE8AAA', 500: '#E2618A', 600: '#C9446F' },
        sky: { 100: '#E3EEFB', 200: '#CADDF6', 500: '#6E97D6' },
        amber: { 100: '#FDF0DC', 300: '#F5C98A', 500: '#E9A23B' },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        serif: ['"Cormorant Garamond"', 'Georgia', 'serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(80, 50, 130, 0.04), 0 8px 24px -8px rgba(110, 70, 170, 0.18)',
        soft: '0 4px 14px -4px rgba(110, 70, 170, 0.25)',
        button: '0 8px 20px -6px rgba(116, 72, 177, 0.55)',
      },
      borderRadius: { '2.5xl': '1.25rem', '4xl': '2rem' },
      keyframes: {
        twinkle: { '0%,100%': { opacity: '0.25' }, '50%': { opacity: '1' } },
        floaty: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-6px)' } },
        fadeUp: { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        sheetUp: { from: { transform: 'translateY(100%)' }, to: { transform: 'translateY(0)' } },
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        burst: {
          '0%': { transform: 'translate(-50%, -50%) scale(0.3)', opacity: '0' },
          '15%': { opacity: '1' },
          '100%': { transform: 'translate(calc(-50% + var(--dx)), calc(-50% + var(--dy))) scale(1) rotate(var(--rot))', opacity: '0' },
        },
        pop: { '0%': { transform: 'scale(0.6)', opacity: '0' }, '60%': { transform: 'scale(1.06)', opacity: '1' }, '100%': { transform: 'scale(1)' } },
      },
      animation: {
        twinkle: 'twinkle 3s ease-in-out infinite',
        floaty: 'floaty 6s ease-in-out infinite',
        fadeUp: 'fadeUp .35s ease-out both',
        sheetUp: 'sheetUp .28s cubic-bezier(.2,.8,.2,1) both',
        fadeIn: 'fadeIn .2s ease-out both',
        burst: 'burst 1.6s cubic-bezier(.15,.7,.3,1) both',
        pop: 'pop .6s cubic-bezier(.2,.8,.2,1) both',
      },
    },
  },
  plugins: [],
};
