import { describe, expect, it } from 'vitest';
import type { Snapshot } from '@/store/useLunaStore';
import type { DateKey, Flow } from '@/types';
import { addDaysKey } from '@/utils/date';
import { buildPlan, serverSnapshot } from './plan';

function snap(starts: DateKey[]): Snapshot {
  const periodDays: Record<DateKey, Flow> = {};
  for (const s of starts) for (let i = 0; i < 5; i++) periodDays[addDaysKey(s, i)] = 'medium';
  return {
    v: 1,
    profile: { name: 'Анна', cycleLength: 28, periodLength: 5, regularity: 'regular', onboarded: true, createdAt: '2026-01-01', photo: 'data:image/jpeg;base64,AAAA' },
    periodDays,
    logs: { '2026-11-08': { date: '2026-11-08' } as never, '2026-11-09': { date: '2026-11-09' } as never },
    notifications: { periodReminder: true, symptomReminder: false, tips: true, weeklyReport: true, time: '20:30' },
    prefs: { haptics: true, sounds: true, theme: 'auto' },
  };
}

describe('план напоминаний для сервера', () => {
  it('содержит прогноз, ПМС за 5 дней до месячных и настройки', () => {
    const p = buildPlan(snap(['2026-09-06', '2026-10-04', '2026-11-01']), '2026-11-10');
    expect(p.lastStart).toBe('2026-11-01');
    expect(p.nextStart).toBe('2026-11-29');
    expect(p.pmsStart).toBe('2026-11-24');
    expect(p.lastLogDate).toBe('2026-11-09');
    expect(p.time).toBe('20:30');
    expect(p.settings.symptomReminder).toBe(false);
    expect(p.name).toBe('Анна');
  });

  it('без отмеченных месячных — прогноза нет, но напоминания о самочувствии возможны', () => {
    const p = buildPlan(snap([]), '2026-11-10');
    expect(p.nextStart).toBeNull();
    expect(p.pmsStart).toBeNull();
  });

  it('фото профиля на сервер не уходит', () => {
    expect('photo' in serverSnapshot(snap([])).profile).toBe(false);
  });

  it('записи о близости на сервер не уходят', () => {
    const s = { ...snap([]), intimacy: { '2026-11-08': { date: '2026-11-08', sex: true, protection: 'unprotected' as const, updatedAt: '' } } };
    const out = serverSnapshot(s);
    expect('intimacy' in out).toBe(false);
    expect(JSON.stringify(out)).not.toContain('unprotected');
  });
});
