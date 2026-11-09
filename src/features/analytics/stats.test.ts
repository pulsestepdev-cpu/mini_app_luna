import { describe, expect, it } from 'vitest';
import type { DateKey, Flow } from '@/types';
import { addDaysKey } from '@/utils/date';
import { computeAnalytics } from './stats';

const TODAY: DateKey = '2026-11-09';

/** Месячные с заданных дат, каждые длиной `len` дней */
function periods(starts: DateKey[], len = 5): Record<DateKey, Flow> {
  const out: Record<DateKey, Flow> = {};
  for (const s of starts) for (let i = 0; i < len; i++) out[addDaysKey(s, i)] = 'medium';
  return out;
}

describe('computeAnalytics — диаграммы', () => {
  it('регулярный цикл: разброс не больше 7 дней', () => {
    const pd = periods(['2026-07-01', '2026-07-29', '2026-08-27', '2026-09-23', '2026-10-21']);
    const a = computeAnalytics(pd, {}, '6m', TODAY);
    expect(a.cyclePoints.map((c) => c.length)).toEqual([28, 29, 27, 28]);
    expect(a.regular).toBe(true);
  });

  it('нерегулярный цикл: разброс больше 7 дней', () => {
    const pd = periods(['2026-06-01', '2026-06-25', '2026-08-01', '2026-08-28']);
    const a = computeAnalytics(pd, {}, '6m', TODAY);
    expect(a.cyclePoints.map((c) => c.length)).toEqual([24, 37, 27]);
    expect(a.regular).toBe(false);
  });

  it('меньше трёх циклов — о регулярности не судим', () => {
    const a = computeAnalytics(periods(['2026-09-01', '2026-09-29', '2026-10-27']), {}, '6m', TODAY);
    expect(a.cyclePoints).toHaveLength(2);
    expect(a.regular).toBeNull();
  });

  it('длительность месячных: только завершившиеся', () => {
    const pd = { ...periods(['2026-09-01'], 4), ...periods(['2026-09-29'], 6), ...periods(['2026-11-08'], 2) };
    const a = computeAnalytics(pd, {}, '6m', TODAY);
    expect(a.periodPoints.map((p) => p.length)).toEqual([4, 6]);
    expect(a.minPeriod).toBe(4);
    expect(a.maxPeriod).toBe(6);
  });
});
