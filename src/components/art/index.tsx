/**
 * ЗАГЛУШКИ иллюстраций на SVG. Позже заменяются на сгенерированные
 * картинки (public/art/*.png) — достаточно поменять содержимое компонентов.
 */
import { useId, useMemo, type CSSProperties } from 'react';
import { cn } from '@/utils/cn';

/** Контурная иконка лотоса — для кольца прогресса */
export function LotusIcon({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinejoin="round" strokeLinecap="round" className={className}>
      <path d="M16 6c-2.6 3-3.4 7.4 0 12.5 3.4-5.1 2.6-9.5 0-12.5Z" />
      <path d="M16 18.5c-1.6-3.6-4.6-6.1-8.3-6.6.2 3.9 3.4 6.6 8.3 6.6Z" />
      <path d="M16 18.5c1.6-3.6 4.6-6.1 8.3-6.6-.2 3.9-3.4 6.6-8.3 6.6Z" />
      <path d="M16 18.5c-3.2.8-7.4.1-10.5-2.6 1.6 3.9 5.6 5.4 10.5 2.6Z" />
      <path d="M16 18.5c3.2.8 7.4.1 10.5-2.6-1.6 3.9-5.6 5.4-10.5 2.6Z" />
      <path d="M8 23c5 1.8 11 1.8 16 0" />
    </svg>
  );
}

/** Светящийся лотос — экран «Ты молодец». Сгенерирован на чёрном; чёрное переведено в прозрачность (яркость → альфа) */
export function LotusArt({ className }: { className?: string }) {
  return <img src="./art/success-lotus.webp" alt="" draggable={false} className={cn('pointer-events-none select-none', className)} />;
}

/** Розовый цветок — декор карточек */
export function FlowerArt({ className }: { className?: string }) {
  return <img src="./art/flower.webp" alt="" draggable={false} className={cn('pointer-events-none select-none object-contain', className)} />;
}

/** Иллюстрации пустых состояний и знакомства (вырезаны из зелёного фона) */
const ART = { moon: './art/empty-moon.webp', seedling: './art/empty-seedling.webp', hello: './art/setup-hello.webp' } as const;

export function Illustration({ name, className }: { name: keyof typeof ART; className?: string }) {
  return <img src={ART[name]} alt="" draggable={false} className={cn('pointer-events-none select-none object-contain', className)} />;
}

/** Мерцающие звёзды поверх тёмного фона */
export function StarField({ count = 18, className }: { count?: number; className?: string }) {
  const stars = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        x: (i * 37.3) % 100,
        y: (i * 23.7) % 60,
        s: 6 + ((i * 7) % 8),
        d: (i * 0.37) % 3,
      })),
    [count],
  );
  return (
    <div className={cn('pointer-events-none absolute inset-0', className)}>
      {stars.map((st, i) => (
        <svg
          key={i}
          viewBox="0 0 10 10"
          width={st.s}
          height={st.s}
          className="absolute animate-twinkle"
          style={{ left: `${st.x}%`, top: `${st.y}%`, animationDelay: `${st.d}s` }}
        >
          <path d="M5 0 L5.8 4.2 L10 5 L5.8 5.8 L5 10 L4.2 5.8 L0 5 L4.2 4.2 Z" fill="#FFF6FF" />
        </svg>
      ))}
    </div>
  );
}

/** Аватар: заглушка с первой буквой имени */
export function Avatar({ name, size = 44 }: { name: string; size?: number }) {
  const letter = (name.trim()[0] ?? '♡').toUpperCase();
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-rose-200 via-plum-200 to-plum-400 font-serif font-semibold text-white shadow-soft ring-2 ring-surface"
      style={{ width: size, height: size, fontSize: size * 0.45 }}
    >
      {letter}
    </div>
  );
}

/**
 * Луна, фаза которой следует за циклом: новолуние в начале месячных,
 * полнолуние в середине цикла, затем убывает. progress — доля цикла 0..1.
 */
export function MoonPhase({ progress, size = 48, className }: { progress: number; size?: number; className?: string }) {
  const p = ((progress % 1) + 1) % 1;
  const theta = 2 * Math.PI * p;
  const waxing = p < 0.5;
  const rx = Math.abs(Math.cos(theta)) * 40;
  const crescent = Math.cos(theta) > 0; // тонкий серп, а не «горбатая» луна
  const lit = `M50,10 A40,40 0 0 1 50,90 A${rx.toFixed(2)},40 0 0 ${crescent ? 0 : 1} 50,10 Z`;
  const id = `moon${useId().replace(/:/g, '')}`;

  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={cn('drop-shadow-[0_0_12px_rgba(214,170,240,0.9)]', className)} aria-hidden>
      <defs>
        <radialGradient id={`${id}-lit`} cx="40%" cy="35%" r="75%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="60%" stopColor="#FBE8F7" />
          <stop offset="100%" stopColor="#EBC3EC" />
        </radialGradient>
        <clipPath id={`${id}-clip`}>
          <path d={lit} transform={waxing ? undefined : 'translate(100 0) scale(-1 1)'} />
        </clipPath>
      </defs>
      {/* Тёмная часть диска */}
      <circle cx="50" cy="50" r="40" fill="rgb(var(--moon-dark))" />
      <circle cx="50" cy="50" r="40" fill="none" stroke="#C9AEE8" strokeWidth="1.2" />
      {/* Освещённая часть + мягкие «кратеры» */}
      <g clipPath={`url(#${id}-clip)`}>
        <circle cx="50" cy="50" r="40" fill={`url(#${id}-lit)`} />
        <circle cx="38" cy="38" r="6" fill="#EBC9EC" opacity="0.45" />
        <circle cx="60" cy="60" r="8.5" fill="#EBC9EC" opacity="0.35" />
        <circle cx="62" cy="33" r="3.5" fill="#EBC9EC" opacity="0.4" />
        <circle cx="35" cy="64" r="4" fill="#EBC9EC" opacity="0.35" />
      </g>
    </svg>
  );
}

/** Разлетающиеся искорки — праздничный момент (экран «Ты молодец») */
export function SparkleBurst({ count = 22, className }: { count?: number; className?: string }) {
  const parts = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
        const dist = 90 + Math.random() * 90;
        return {
          dx: Math.cos(angle) * dist,
          dy: Math.sin(angle) * dist - 30,
          rot: Math.round(Math.random() * 180),
          size: 6 + Math.random() * 9,
          delay: 0.15 + Math.random() * 0.35,
          color: ['#FFFFFF', '#FBD3EE', '#F5C98A', '#E0CFF3'][i % 4],
          star: i % 3 !== 0,
        };
      }),
    [count],
  );
  return (
    <div className={cn('pointer-events-none absolute', className)} aria-hidden>
      {parts.map((p, i) => (
        <span
          key={i}
          className="absolute left-0 top-0 animate-burst"
          style={{ '--dx': `${p.dx}px`, '--dy': `${p.dy}px`, '--rot': `${p.rot}deg`, animationDelay: `${p.delay}s` } as CSSProperties}
        >
          {p.star ? (
            <svg width={p.size} height={p.size} viewBox="0 0 10 10" fill={p.color}>
              <path d="M5 0 L6.1 3.9 L10 5 L6.1 6.1 L5 10 L3.9 6.1 L0 5 L3.9 3.9 Z" />
            </svg>
          ) : (
            <span className="block rounded-full" style={{ width: p.size * 0.6, height: p.size * 0.6, background: p.color }} />
          )}
        </span>
      ))}
    </div>
  );
}
