import { describe, expect, it } from 'vitest';
import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns';
import { addDaysKey, diffDays, fromKey, toKey } from './date';

describe('ключи дат', () => {
  it('сдвиг через границы месяца, года и 29 февраля', () => {
    expect(addDaysKey('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDaysKey('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDaysKey('2027-01-01', -1)).toBe('2026-12-31');
    expect(addDaysKey('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDaysKey('2026-02-28', 1)).toBe('2026-03-01');
    expect(addDaysKey('2026-11-14', 0)).toBe('2026-11-14');
    expect(addDaysKey('2026-11-14', -365)).toBe('2025-11-14');
  });

  it('разница в днях не зависит от перехода на летнее время', () => {
    expect(diffDays('2026-03-28', '2026-03-30')).toBe(2); // DST в Европе — 29 марта
    expect(diffDays('2026-10-24', '2026-10-26')).toBe(2);
    expect(diffDays('2026-11-14', '2026-11-01')).toBe(-13);
    expect(diffDays('2025-11-14', '2026-11-14')).toBe(365);
  });

  it('совпадает с date-fns на годе подряд дат', () => {
    let k = '2025-12-25';
    for (let i = 0; i < 400; i++) {
      const ref = format(addDays(parseISO(k), 17), 'yyyy-MM-dd');
      expect(addDaysKey(k, 17)).toBe(ref);
      expect(diffDays(k, ref)).toBe(differenceInCalendarDays(parseISO(ref), parseISO(k)));
      k = addDaysKey(k, 1);
    }
  });

  it('toKey/fromKey — местная полночь туда и обратно', () => {
    const d = fromKey('2026-03-29');
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()]).toEqual([2026, 2, 29, 0]);
    expect(toKey(d)).toBe('2026-03-29');
    expect(toKey(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });
});
