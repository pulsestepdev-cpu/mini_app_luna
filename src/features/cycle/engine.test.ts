import { describe, expect, it } from 'vitest';
import type { DateKey, Flow } from '@/types';
import { addDaysKey } from '@/utils/date';
import { buildDayMarks, computeStats, cycleLengths, getPeriods, median, predict } from './engine';

const profile = { cycleLength: null, periodLength: null, regularity: null };

/** Создаёт отмеченные дни месячных: starts — даты начала, len — длительность */
function periods(starts: DateKey[], len = 5): Record<DateKey, Flow> {
  const out: Record<DateKey, Flow> = {};
  for (const s of starts) for (let i = 0; i < len; i++) out[addDaysKey(s, i)] = 'medium';
  return out;
}

describe('median', () => {
  it('нечётное и чётное количество', () => {
    expect(median([30, 28, 29])).toBe(29);
    expect(median([28, 30])).toBe(29);
  });
});

describe('getPeriods', () => {
  it('группирует соседние дни и допускает пропуск в 1 день', () => {
    const p = getPeriods({ '2026-01-01': 'heavy', '2026-01-02': 'medium', '2026-01-04': 'light', '2026-01-29': 'medium' });
    expect(p).toHaveLength(2);
    expect(p[0]).toEqual({ start: '2026-01-01', end: '2026-01-04', length: 4 });
    expect(p[1].start).toBe('2026-01-29');
  });
});

describe('cycleLengths', () => {
  it('отбрасывает неправдоподобные циклы', () => {
    const p = getPeriods(periods(['2026-01-01', '2026-01-29', '2026-02-07', '2026-05-30']));
    // 28 — ок; 9 — слишком коротко; 112 — слишком длинно (пропуск)
    expect(cycleLengths(p)).toEqual([28]);
  });
});

describe('computeStats', () => {
  it('без истории использует значение из профиля и низкую уверенность', () => {
    const s = computeStats(getPeriods(periods(['2026-03-01'])), { ...profile, cycleLength: 31 }, '2026-03-10');
    expect(s.median).toBe(31);
    expect(s.usedDefault).toBe(true);
    expect(s.confidence).toBe('low');
  });

  it('стабильные циклы → высокая уверенность', () => {
    const s = computeStats(
      getPeriods(periods(['2026-01-01', '2026-01-29', '2026-02-26', '2026-03-27', '2026-04-24'])),
      profile,
      '2026-05-01',
    );
    expect(s.lengths).toEqual([28, 28, 29, 28]);
    expect(s.median).toBe(28);
    expect(s.confidence).toBe('high');
    expect(s.irregular).toBe(false);
    expect(s.periodLength).toBe(5);
  });

  it('большой разброс → нерегулярный цикл и низкая уверенность', () => {
    const s = computeStats(
      getPeriods(periods(['2026-01-01', '2026-01-23', '2026-03-01', '2026-03-25'])),
      profile,
      '2026-04-01',
    );
    expect(s.irregular).toBe(true);
    expect(s.confidence).toBe('low');
  });
});

describe('predict', () => {
  it('нет данных → null', () => {
    expect(predict({}, profile, '2026-04-12')).toBeNull();
  });

  it('день цикла, фаза и следующая дата', () => {
    const p = predict(periods(['2026-03-04', '2026-04-01']), profile, '2026-04-12')!;
    expect(p.cycleDay).toBe(12);
    expect(p.cycleLength).toBe(28);
    expect(p.nextStart).toBe('2026-04-29');
    expect(p.daysUntilNext).toBe(17);
    expect(p.ovulation).toBe('2026-04-15');
    expect(p.phase).toBe('follicular');
    // диапазон: мало циклов → ±3 дня
    expect(p.rangeStart).toBe('2026-04-26');
    expect(p.rangeEnd).toBe('2026-05-02');
  });

  it('фазы: менструация, овуляторная, лютеиновая', () => {
    const d = periods(['2026-03-04', '2026-04-01']);
    expect(predict(d, profile, '2026-04-03')!.phase).toBe('menstrual');
    expect(predict(d, profile, '2026-04-15')!.phase).toBe('ovulatory');
    expect(predict(d, profile, '2026-04-22')!.phase).toBe('luteal');
  });

  it('задержка', () => {
    const p = predict(periods(['2026-03-04', '2026-04-01']), profile, '2026-05-02')!;
    expect(p.isLate).toBe(true);
    expect(p.lateBy).toBe(3);
    expect(p.daysUntilNext).toBe(0);
  });

  it('будущие отметки не влияют на прогноз', () => {
    const d = { ...periods(['2026-04-01']), '2026-06-01': 'medium' as Flow };
    expect(predict(d, profile, '2026-04-12')!.lastStart).toBe('2026-04-01');
  });
});

describe('buildDayMarks', () => {
  it('факт и прогноз размечаются раздельно', () => {
    const d = periods(['2026-03-04', '2026-04-01']);
    const m = buildDayMarks(d, profile, '2026-04-12', '2026-04-01', '2026-05-31');
    expect(m['2026-04-02'].period).toBe('medium');
    expect(m['2026-04-02'].predictedPeriod).toBeUndefined();
    expect(m['2026-04-29'].predictedPeriod).toBe(true);
    expect(m['2026-04-15'].ovulation).toBe(true);
    expect(m['2026-04-10'].fertile).toBe(true);
    expect(m['2026-04-26'].pms).toBe(true);
    // прошлые дни не помечаются как прогноз месячных
    expect(Object.entries(m).some(([k, v]) => v.predictedPeriod && k < '2026-04-12')).toBe(false);
  });

  it('при задержке прогноз месячных начинается с сегодня', () => {
    const d = periods(['2026-03-04', '2026-04-01']);
    const m = buildDayMarks(d, profile, '2026-05-02', '2026-05-01', '2026-05-31');
    expect(m['2026-05-02'].predictedPeriod).toBe(true);
    expect(m['2026-05-01']?.predictedPeriod).toBeUndefined();
  });
});
