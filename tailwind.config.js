/** Цвет из CSS-переменной (значения для светлой и тёмной темы — в src/styles/index.css) */
const v = (name) => 'rgb(var(--' + name + ') / <alpha-value>)';
const scale = (name, steps) => Object.fromEntries(steps.map((s) => [s, v(name + '-' + s)]));

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Меняются вместе с темой
        ink: { DEFAULT: v('ink'), soft: v('ink-soft'), muted: v('ink-muted'), faint: v('ink-faint') },
        plum: scale('plum', [50, 100, 200, 300, 400, 500, 600, 700, 800, 900]),
        rose: scale('rose', [100, 200, 400, 500, 600]),
        sky: scale('sky', [100, 200, 500]),
        amber: scale('amber', [100, 300, 500]),
        emerald: scale('emerald', [50, 700]),
        surface: v('surface'), // фон карточек и полей (белый в светлой теме)
        edge: v('edge'), // светлые обводки
        sheet: v('sheet'), // фон нижних шторок
        // Фирменный фиолетовый — одинаковый в обеих темах (кнопки, тёмные экраны)
        brand: { 400: '#A884D6', 500: '#8A60C4', 600: '#7448B1', 700: '#5E3896', 800: '#472B72', 900: '#2F1D4E' },
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
