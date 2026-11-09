import { useEffect, useState } from 'react';
import { CircleCheck, CircleAlert, Info } from 'lucide-react';
import type { CyclePoint } from '@/features/analytics/stats';
import { daysWord, fmt, plural } from '@/utils/date';
import { t } from '@/i18n';
import { cn } from '@/utils/cn';
import { haptic } from '@/utils/feedback';

interface Props {
  title: string;
  /** Пояснение по кнопке «i» */
  info: string;
  points: CyclePoint[];
  average: number | null;
  /** Подпись под выбранным столбиком: «Цикл с 1 окт.» */
  itemLabel: string;
  badge?: { ok: boolean; label: string } | null;
  caption?: string;
}

const AREA_H = 120;

/** Карточка со столбчатой диаграммой длительностей (циклов или месячных) */
export function LengthBars({ title, info, points, average, itemLabel, badge, caption }: Props) {
  const [active, setActive] = useState(points.length - 1);
  const [showInfo, setShowInfo] = useState(false);
  const [grown, setGrown] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setGrown(true));
    return () => cancelAnimationFrame(id);
  }, []);
  useEffect(() => setActive(points.length - 1), [points.length]);

  const vals = points.map((p) => p.length);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  // Нижняя граница шкалы подстраивается под данные, чтобы разница 27 и 30 дней была заметна
  const floor = Math.max(0, min - Math.max(6, max - min));
  const top = Math.max(max, average ?? 0);
  const hi = top + Math.max(1, (top - floor) * 0.18);
  const pct = (v: number) => (Math.max(v - floor, 0.6) / (hi - floor)) * 100;
  const a = points[active] ?? points[points.length - 1];

  return (
    <div className="glass p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[15px] font-semibold text-ink">{title}</h3>
        <button
          onClick={() => setShowInfo((v) => !v)}
          className={cn('tap -mr-1 rounded-full p-1', showInfo ? 'text-plum-600' : 'text-ink-faint')}
          aria-label={t.analytics.about}
          aria-expanded={showInfo}
        >
          <Info size={20} />
        </button>
      </div>
      {showInfo && <p className="mt-1.5 animate-fadeIn text-[12.5px] leading-snug text-ink-muted">{info}</p>}

      {/* Столбики */}
      <div className="relative mt-3" style={{ height: AREA_H }}>
        {average != null && (
          <div className="pointer-events-none absolute inset-x-0 z-10" style={{ bottom: `${pct(average)}%` }}>
            <div className="border-t-[1.5px] border-dashed border-plum-400/80" />
            <span className="absolute -top-[19px] right-0 rounded-md bg-surface/85 px-1.5 text-[11.5px] font-medium leading-[17px] text-plum-700">
              {t.analytics.avgShort} {daysWord(average)}
            </span>
          </div>
        )}
        <div className="flex h-full items-end gap-1.5">
          {points.map((p, i) => (
            <button
              key={p.start}
              onClick={() => {
                if (i !== active) haptic.select();
                setActive(i);
              }}
              className="flex h-full min-w-0 flex-1 items-end justify-center"
              aria-label={`${itemLabel} ${fmt(p.start, 'd MMMM')}: ${daysWord(p.length)}`}
              aria-pressed={i === active}
            >
              <span
                className={cn(
                  'block w-full max-w-[28px] rounded-t-[9px] rounded-b-[4px] transition-[height,background-color] duration-500 ease-out',
                  i === active ? 'bg-gradient-to-b from-plum-400 to-plum-600 shadow-soft' : 'bg-gradient-to-b from-plum-200 to-plum-300/80',
                )}
                style={{ height: grown ? `${pct(p.length)}%` : '4%' }}
              />
            </button>
          ))}
        </div>
      </div>
      {/* Значения под столбиками */}
      <div className="mt-1.5 flex gap-1.5">
        {points.map((p, i) => (
          <span
            key={p.start}
            className={cn('min-w-0 flex-1 text-center text-[12px] tabular-nums', i === active ? 'font-bold text-plum-700' : 'text-ink-muted')}
          >
            {p.length}
          </span>
        ))}
      </div>

      {/* Выбранный столбик */}
      <div className="mt-2 text-center text-[12px] text-ink-muted">
        {itemLabel} {fmt(a.start, 'd MMMM yyyy')} — <span className="font-semibold text-ink">{daysWord(a.length)}</span>
      </div>

      {/* Итог: диапазон и регулярность */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 border-t border-plum-100 pt-3">
        <div className="text-ink">
          <span className="text-[20px] font-bold tabular-nums">{min === max ? min : `${min}–${max}`}</span>{' '}
          <span className="text-[13px] text-ink-muted">{plural(max, t.common.days)}</span>
        </div>
        {badge && (
          <span
            className={cn(
              'flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-semibold uppercase tracking-wide',
              badge.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-100 text-amber-500',
            )}
          >
            {badge.ok ? <CircleCheck size={14} /> : <CircleAlert size={14} />}
            {badge.label}
          </span>
        )}
      </div>
      {caption && <p className="mt-2 text-[11.5px] text-ink-faint">{caption}</p>}
    </div>
  );
}
