import { describe, expect, it } from 'vitest';
import type { DateKey, Flow, IntimacyLog, Profile } from '@/types';
import { addDaysKey } from '@/utils/date';
import { buildInsights } from '@/features/insights/rules';
import { buildReport } from '@/features/report/report';
import { intimacyStats, intimacySummary, isUnprotected, normalizeIntimacy, sexDays } from './intimacy';

const entry = (date: DateKey, p: Partial<IntimacyLog> = {}): IntimacyLog => ({ date, sex: true, updatedAt: date, ...p });

const profile: Profile = { name: 'Анна', cycleLength: 28, periodLength: 5, regularity: 'regular', onboarded: true, createdAt: '2026-01-01' };

function periods(starts: DateKey[]): Record<DateKey, Flow> {
  const out: Record<DateKey, Flow> = {};
  for (const s of starts) for (let i = 0; i < 5; i++) out[addDaysKey(s, i)] = 'medium';
  return out;
}

describe('запись о близости', () => {
  it('без близости детали о ней не сохраняются, влечение — остаётся', () => {
    expect(normalizeIntimacy({ date: '2026-11-01', sex: false, protection: 'unprotected', orgasm: true, libido: 'high' })).toEqual({
      date: '2026-11-01',
      sex: false,
      libido: 'high',
    });
  });

  it('пустая запись — удаляется (null)', () => {
    expect(normalizeIntimacy({ date: '2026-11-01', sex: false, orgasm: true })).toBeNull();
  });

  it('прерванный акт и «без защиты» считаются незащищёнными, «не указано» — нет', () => {
    expect(isUnprotected(entry('d', { protection: 'withdrawal' }))).toBe(true);
    expect(isUnprotected(entry('d', { protection: 'unprotected' }))).toBe(true);
    expect(isUnprotected(entry('d', { protection: 'protected' }))).toBe(false);
    expect(isUnprotected(entry('d'))).toBe(false);
  });

  it('подпись: защита, детали и влечение', () => {
    expect(intimacySummary(entry('d', { protection: 'unprotected', orgasm: true }))).toBe('Без защиты · оргазм');
    expect(intimacySummary({ sex: false, libido: 'high' })).toBe('Влечение высокое');
    expect(intimacySummary(entry('d'))).toBe('Была близость');
  });
});

describe('статистика близости', () => {
  const data = {
    '2026-10-01': entry('2026-10-01', { protection: 'protected', orgasm: true }),
    '2026-10-05': entry('2026-10-05', { protection: 'unprotected', pain: true }),
    '2026-10-09': entry('2026-10-09', { protection: 'withdrawal' }),
    '2026-10-10': { date: '2026-10-10', sex: false, libido: 'low', updatedAt: '' } as IntimacyLog,
    '2026-09-01': entry('2026-09-01', { protection: 'unprotected' }),
  };

  it('считает дни, защиту, боль и последний раз без защиты в диапазоне', () => {
    const s = intimacyStats(data, '2026-10-01', '2026-10-31');
    expect(s.days).toBe(3);
    expect(s.protection).toEqual({ protected: 1, unprotected: 1, withdrawal: 1, unknown: 0 });
    expect(s.pain).toBe(1);
    expect(s.orgasm).toBe(1);
    expect(s.libido.low).toBe(1);
    expect(s.lastUnprotected).toBe('2026-10-09');
  });

  it('sexDays — только дни с близостью, по порядку', () => {
    expect(sexDays(data, '2026-09-01', '2026-10-31').map((e) => e.date)).toEqual(['2026-09-01', '2026-10-01', '2026-10-05', '2026-10-09']);
  });
});

describe('инсайты и отчёт с близостью', () => {
  // циклы по 28 дней, последние месячные 1 октября → ждали 29 октября; сегодня 3 ноября — задержка 5 дней
  const pd = periods(['2026-08-06', '2026-09-03', '2026-10-01']);
  const today = '2026-11-03';

  it('при задержке и близости без защиты в этом цикле — подсказка про тест', () => {
    const ins = buildInsights(pd, {}, profile, today, { '2026-10-14': entry('2026-10-14', { protection: 'unprotected' }) });
    const late = ins.find((i) => i.id === 'late-test');
    expect(late?.tone).toBe('attention');
    expect(late?.text).toContain('без защиты');
    expect(ins[0].id).toBe('late-test');
  });

  it('близость с защитой тоже даёт мягкую подсказку, без близости — нет', () => {
    const withProtected = buildInsights(pd, {}, profile, today, { '2026-10-14': entry('2026-10-14', { protection: 'protected' }) });
    expect(withProtected.find((i) => i.id === 'late-test')?.text).toContain('даже с защитой');
    expect(buildInsights(pd, {}, profile, today, {}).some((i) => i.id === 'late-test')).toBe(false);
    // близость в прошлом цикле не считается
    expect(buildInsights(pd, {}, profile, today, { '2026-09-10': entry('2026-09-10', { protection: 'unprotected' }) }).some((i) => i.id === 'late-test')).toBe(false);
  });

  it('повторяющаяся боль при близости — повод сказать врачу', () => {
    const ins = buildInsights(pd, {}, profile, '2026-10-20', {
      '2026-10-10': entry('2026-10-10', { pain: true }),
      '2026-10-15': entry('2026-10-15', { pain: true }),
    });
    expect(ins.some((i) => i.id === 'sex-pain')).toBe(true);
  });

  it('в отчёт близость попадает сводкой за период', () => {
    const r = buildReport(pd, {}, profile, '3m', today, {
      '2026-10-14': entry('2026-10-14', { protection: 'unprotected' }),
      '2026-10-20': entry('2026-10-20', { protection: 'protected', pain: true }),
    });
    expect(r.intimacy).toEqual({ days: 2, unprotected: 1, pain: 1, lastUnprotected: '2026-10-14' });
  });
});
