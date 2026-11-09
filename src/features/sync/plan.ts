/**
 * «План» для сервера напоминаний. Прогноз считает этот же движок, что и календарь,
 * поэтому бот и приложение никогда не расходятся. Сервер только рассылает сообщения
 * по датам из плана — в часовом поясе пользователя.
 */
import type { Snapshot } from '@/store/useLunaStore';
import type { DateKey } from '@/types';
import { predict, projectCycles } from '@/features/cycle/engine';
import { userTimezone } from '@/utils/date';

export interface ReminderPlan {
  v: 1;
  tz: string;
  time: string;
  name: string;
  settings: { periodReminder: boolean; symptomReminder: boolean; tips: boolean; weeklyReport: boolean };
  lastStart: DateKey | null;
  nextStart: DateKey | null;
  rangeStart: DateKey | null;
  rangeEnd: DateKey | null;
  pmsStart: DateKey | null;
  lastLogDate: DateKey | null;
}

export function buildPlan(s: Snapshot, today: DateKey): ReminderPlan {
  const p = predict(s.periodDays, s.profile, today);
  const proj = p ? projectCycles(p, today, 1)[0] : null;
  const logDates = Object.keys(s.logs).sort();
  const n = s.notifications;
  return {
    v: 1,
    tz: userTimezone(),
    time: n.time,
    name: s.profile.name,
    settings: { periodReminder: n.periodReminder, symptomReminder: n.symptomReminder, tips: n.tips, weeklyReport: n.weeklyReport },
    lastStart: p?.lastStart ?? null,
    nextStart: p?.nextStart ?? null,
    rangeStart: p?.rangeStart ?? null,
    rangeEnd: p?.rangeEnd ?? null,
    pmsStart: proj?.pmsStart ?? null,
    lastLogDate: logDates.length ? logDates[logDates.length - 1] : null,
  };
}

/** Что уходит на сервер: без фото профиля и настроек интерфейса — только то, что нужно для напоминаний и отчётов */
export function serverSnapshot(s: Snapshot) {
  const { photo: _photo, ...profile } = s.profile;
  return { profile, periodDays: s.periodDays, logs: s.logs, notifications: s.notifications };
}
