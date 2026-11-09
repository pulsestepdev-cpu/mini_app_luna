import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';
import type { DateKey } from '@/types';

export const toKey = (d: Date): DateKey => format(d, 'yyyy-MM-dd');
export const fromKey = (k: DateKey): Date => parseISO(k);
export const todayKey = (): DateKey => toKey(new Date());
export const addDaysKey = (k: DateKey, n: number): DateKey => toKey(addDays(fromKey(k), n));
/** Сколько календарных дней от a до b (b - a) */
export const diffDays = (a: DateKey, b: DateKey): number =>
  differenceInCalendarDays(fromKey(b), fromKey(a));

export const fmt = (k: DateKey, pattern: string): string => format(fromKey(k), pattern, { locale: ru });
/** «24 апреля» */
export const fmtDayMonth = (k: DateKey) => fmt(k, 'd MMMM');
/** «24–28 апреля» или «30 апреля – 2 мая» */
export function fmtRange(a: DateKey, b: DateKey): string {
  if (a === b) return fmtDayMonth(a);
  const sameMonth = fmt(a, 'yyyy-MM') === fmt(b, 'yyyy-MM');
  return sameMonth ? `${fmt(a, 'd')}–${fmtDayMonth(b)}` : `${fmtDayMonth(a)} – ${fmtDayMonth(b)}`;
}

export const userTimezone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
};

/** Русское склонение: plural(5, ['день','дня','дней']) */
export function plural(n: number, forms: [string, string, string]): string {
  const a = Math.abs(n) % 100;
  const b = a % 10;
  if (a > 10 && a < 20) return forms[2];
  if (b > 1 && b < 5) return forms[1];
  if (b === 1) return forms[0];
  return forms[2];
}
export const daysWord = (n: number) => `${n} ${plural(n, ['день', 'дня', 'дней'])}`;
