import type { DailyLog, DateKey } from '@/types';
import { addDaysKey } from '@/utils/date';

/** Серии, которые отмечаем отдельно (без давления — просто тёплые слова) */
export const MILESTONES = [3, 7, 14, 30, 60, 100] as const;

export interface Streak {
  /** Сколько дней подряд есть запись самочувствия */
  days: number;
  /** Отмечено ли сегодня (если нет — серия ещё жива до конца дня) */
  includesToday: boolean;
}

/**
 * Текущая серия дней подряд с записью самочувствия.
 * Если сегодня ещё не отмечено, считаем от вчера: серия не «сгорает»
 * утром, пока день не закончился. Пропуск дня просто обнуляет счёт —
 * никаких штрафов и напоминаний о «потерянной» серии.
 */
export function currentStreak(logs: Record<DateKey, DailyLog>, today: DateKey): Streak {
  const includesToday = !!logs[today];
  let day = includesToday ? today : addDaysKey(today, -1);
  let days = 0;
  while (logs[day]) {
    days++;
    day = addDaysKey(day, -1);
  }
  return { days, includesToday };
}

/** Достигнута ли круглая серия именно сегодня — для праздничной фразы */
export function milestoneToday(streak: Streak): number | null {
  if (!streak.includesToday) return null;
  return (MILESTONES as readonly number[]).includes(streak.days) ? streak.days : null;
}
