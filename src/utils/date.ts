import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import type { DateKey } from '@/types';

/*
 * Ключи дат — простая арифметика вместо parseISO/format: эти функции вызываются
 * сотнями в движке цикла и календаре, а разбор строк date-fns в десятки раз медленнее.
 * Сдвиги и разницы считаются в UTC-днях, поэтому часовой пояс и переход на летнее
 * время на результат не влияют.
 */
const DAY_MS = 86_400_000;
const pad2 = (n: number) => (n < 10 ? '0' : '') + n;
const key = (y: number, m0: number, d: number): DateKey => `${String(y).padStart(4, '0')}-${pad2(m0 + 1)}-${pad2(d)}`;
const utcDay = (k: DateKey) => Date.UTC(+k.slice(0, 4), +k.slice(5, 7) - 1, +k.slice(8, 10)) / DAY_MS;

/** Локальная дата → ключ YYYY-MM-DD */
export const toKey = (d: Date): DateKey => key(d.getFullYear(), d.getMonth(), d.getDate());
/** Ключ → полночь этого дня по местному времени */
export const fromKey = (k: DateKey): Date => new Date(+k.slice(0, 4), +k.slice(5, 7) - 1, +k.slice(8, 10));
export const todayKey = (): DateKey => toKey(new Date());
export const addDaysKey = (k: DateKey, n: number): DateKey => {
  const d = new Date((utcDay(k) + n) * DAY_MS);
  return key(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
};
/** Сколько календарных дней от a до b (b - a) */
export const diffDays = (a: DateKey, b: DateKey): number => utcDay(b) - utcDay(a);

/** Первый день недели в календаре (как Date.getDay(): 0 = воскресенье) — в Израиле неделя начинается с воскресенья */
export const WEEK_STARTS_ON = 0 as const;

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
