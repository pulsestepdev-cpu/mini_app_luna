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

/** Светящийся лотос — экран «Ты молодец» */
export function LotusArt({ className }: { className?: string }) {
  const petal = 'M100 128 C 82 102, 82 62, 100 26 C 118 62, 118 102, 100 128 Z';
  const back = [-62, -40, 40, 62];
  const mid = [-22, 22];
  return (
    <svg viewBox="0 0 200 170" overflow="visible" className={cn('overflow-visible drop-shadow-[0_0_30px_rgba(255,190,240,0.6)]', className)}>
      <defs>
        <radialGradient id="lotus-glow" cx="50%" cy="65%" r="50%">
          <stop offset="0%" stopColor="#FFE6FA" stopOpacity="0.95" />
          <stop offset="45%" stopColor="#F2B8EA" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#B88BE8" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="petal-back" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFF4FD" />
          <stop offset="100%" stopColor="#D9A6EE" />
        </linearGradient>
        <linearGradient id="petal-front" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="60%" stopColor="#F7C9EE" />
          <stop offset="100%" stopColor="#E59AD9" />
        </linearGradient>
      </defs>
      <ellipse cx="100" cy="105" rx="100" ry="58" fill="url(#lotus-glow)" />
      {back.map((a) => (
        <path key={a} d={petal} fill="url(#petal-back)" opacity="0.75" transform={`rotate(${a} 100 128)`} stroke="#FFF" strokeOpacity="0.6" strokeWidth="0.8" />
      ))}
      {mid.map((a) => (
        <path key={a} d={petal} fill="url(#petal-front)" opacity="0.92" transform={`rotate(${a} 100 128)`} stroke="#FFF" strokeOpacity="0.8" strokeWidth="0.8" />
      ))}
      <path d={petal} fill="url(#petal-front)" stroke="#FFF" strokeWidth="1" />
      <path d="M100 40 L100 118" stroke="#FFF" strokeOpacity="0.6" strokeWidth="1" />
      <ellipse cx="100" cy="132" rx="60" ry="7" fill="#F6D2F3" opacity="0.55" />
    </svg>
  );
}

/** Розовый цветок — декор карточек */
export function FlowerArt({ className }: { className?: string }) {
  const angles = [0, 60, 120, 180, 240, 300];
  return (
    <svg viewBox="0 0 120 120" className={className}>
      <defs>
        <radialGradient id="fl-petal" cx="50%" cy="90%" r="90%">
          <stop offset="0%" stopColor="#E56FA3" />
          <stop offset="55%" stopColor="#F4A9CB" />
          <stop offset="100%" stopColor="#FDE3EF" />
        </radialGradient>
        <radialGradient id="fl-center" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFE49A" />
          <stop offset="100%" stopColor="#F2B04E" />
        </radialGradient>
      </defs>
      <path d="M58 70 C 54 92, 48 104, 40 118" stroke="#9C7BB8" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <path d="M50 96 C 36 90, 30 96, 26 104 C 36 106, 44 104, 50 96 Z" fill="#B79AD3" opacity="0.8" />
      <g transform="translate(60 52)">
        {angles.map((a) => (
          <ellipse key={a} cx="0" cy="-20" rx="13" ry="22" fill="url(#fl-petal)" transform={`rotate(${a})`} opacity="0.95" stroke="#FFF" strokeOpacity="0.5" />
        ))}
        {angles.map((a) => (
          <ellipse key={`i${a}`} cx="0" cy="-11" rx="7" ry="12" fill="#F9C2DB" transform={`rotate(${a + 30})`} />
        ))}
        <circle r="7" fill="url(#fl-center)" />
      </g>
    </svg>
  );
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
      className="flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-rose-200 via-plum-200 to-plum-400 font-serif font-semibold text-white shadow-soft ring-2 ring-white"
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
      <circle cx="50" cy="50" r="40" fill="#D9C6EF" />
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
