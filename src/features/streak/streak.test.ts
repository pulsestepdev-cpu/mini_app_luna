import { describe, expect, it } from 'vitest';
import type { DailyLog, DateKey } from '@/types';
import { addDaysKey } from '@/utils/date';
import { currentStreak, milestoneToday } from './streak';

const TODAY: DateKey = '2026-11-09';
const log = (date: DateKey) => ({ date }) as DailyLog;
function logs(...offsets: number[]): Record<DateKey, DailyLog> {
  const out: Record<DateKey, DailyLog> = {};
  for (const o of offsets) {
    const d = addDaysKey(TODAY, -o);
    out[d] = log(d);
  }
  return out;
}

describe('мягкая серия', () => {
  it('считает дни подряд, включая сегодня', () => {
    expect(currentStreak(logs(0, 1, 2, 3), TODAY)).toEqual({ days: 4, includesToday: true });
  });

  it('если сегодня ещё не отмечено — серия жива со вчерашнего дня', () => {
    expect(currentStreak(logs(1, 2, 3), TODAY)).toEqual({ days: 3, includesToday: false });
  });

  it('пропуск дня обнуляет счёт', () => {
    expect(currentStreak(logs(0, 2, 3, 4), TODAY).days).toBe(1);
    expect(currentStreak(logs(2, 3), TODAY).days).toBe(0);
  });

  it('круглая серия празднуется только в день достижения', () => {
    expect(milestoneToday(currentStreak(logs(0, 1, 2, 3, 4, 5, 6), TODAY))).toBe(7);
    expect(milestoneToday(currentStreak(logs(1, 2, 3, 4, 5, 6, 7), TODAY))).toBeNull();
    expect(milestoneToday(currentStreak(logs(0, 1, 2, 3, 4), TODAY))).toBeNull();
  });
});
