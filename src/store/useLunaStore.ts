/**
 * Единый слой данных приложения.
 *
 * ВРЕМЕННО: данные хранятся в localStorage браузера. Все экраны работают
 * только через эти действия, поэтому при подключении backend (FastAPI)
 * меняется только этот файл — экраны трогать не нужно.
 */
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { DailyLog, DateKey, Flow, NotificationSettings, Preferences, Profile, Regularity } from '@/types';
import { addDaysKey, todayKey, userTimezone } from '@/utils/date';

interface OnboardingInput {
  name: string;
  lastPeriodStart: DateKey | null;
  cycleLength: number | null;
  periodLength: number | null;
  regularity: Regularity | null;
}

export type LogInput = Omit<DailyLog, 'timezone' | 'createdAt' | 'updatedAt'>;

/** Все данные пользователя — для резервной копии и экспорта */
export interface Snapshot {
  v: 1;
  profile: Profile;
  periodDays: Record<DateKey, Flow>;
  logs: Record<DateKey, DailyLog>;
  notifications: NotificationSettings;
  prefs: Preferences;
}

interface LunaState {
  profile: Profile;
  periodDays: Record<DateKey, Flow>;
  logs: Record<DateKey, DailyLog>;
  notifications: NotificationSettings;
  prefs: Preferences;

  completeOnboarding: (input: OnboardingInput) => void;
  updateProfile: (patch: Partial<Omit<Profile, 'onboarded' | 'createdAt'>>) => void;
  setPeriodDay: (date: DateKey, flow: Flow | null) => void;
  saveLog: (log: LogInput) => void;
  deleteLog: (date: DateKey) => void;
  updateNotifications: (patch: Partial<NotificationSettings>) => void;
  updatePrefs: (patch: Partial<Preferences>) => void;
  resetAll: () => void;
  importSnapshot: (snap: Snapshot) => void;
  seedDemo: () => void;
}

const initialProfile = (): Profile => ({
  name: '',
  cycleLength: null,
  periodLength: null,
  regularity: null,
  onboarded: false,
  createdAt: new Date().toISOString(),
});

const initialNotifications: NotificationSettings = {
  periodReminder: true,
  symptomReminder: true,
  tips: false,
  weeklyReport: true,
  time: '09:00',
};

const initialPrefs: Preferences = { haptics: true, sounds: true, theme: 'auto' };

const isEmptyLog = (l: LogInput) =>
  !l.mood && !l.energy && !l.pain && !l.appetite && l.sleepHours == null && !l.sleepQuality &&
  !l.symptoms.length && !l.customSymptoms.length && !l.notes?.trim();

export const useLunaStore = create<LunaState>()(
  persist(
    (set, get) => ({
      profile: initialProfile(),
      periodDays: {},
      logs: {},
      notifications: initialNotifications,
      prefs: initialPrefs,

      completeOnboarding: (input) => {
        const periodDays: Record<DateKey, Flow> = { ...get().periodDays };
        if (input.lastPeriodStart) {
          const len = input.periodLength ?? 5;
          const today = todayKey();
          for (let i = 0; i < len; i++) {
            const d = addDaysKey(input.lastPeriodStart, i);
            if (d > today) break;
            periodDays[d] = 'medium';
          }
        }
        set({
          periodDays,
          profile: {
            ...get().profile,
            name: input.name.trim(),
            cycleLength: input.cycleLength,
            periodLength: input.periodLength,
            regularity: input.regularity,
            onboarded: true,
          },
        });
      },

      updateProfile: (patch) => set({ profile: { ...get().profile, ...patch } }),

      setPeriodDay: (date, flow) => {
        const periodDays = { ...get().periodDays };
        if (flow) periodDays[date] = flow;
        else delete periodDays[date];
        set({ periodDays });
      },

      saveLog: (input) => {
        const logs = { ...get().logs };
        if (isEmptyLog(input)) {
          delete logs[input.date];
        } else {
          const now = new Date().toISOString();
          logs[input.date] = {
            ...input,
            notes: input.notes?.trim() || undefined,
            timezone: userTimezone(),
            createdAt: logs[input.date]?.createdAt ?? now,
            updatedAt: now,
          };
        }
        set({ logs });
      },

      deleteLog: (date) => {
        const logs = { ...get().logs };
        delete logs[date];
        set({ logs });
      },

      updateNotifications: (patch) => set({ notifications: { ...get().notifications, ...patch } }),
      updatePrefs: (patch) => set({ prefs: { ...get().prefs, ...patch } }),

      resetAll: () =>
        set({ profile: initialProfile(), periodDays: {}, logs: {}, notifications: initialNotifications, prefs: initialPrefs }),

      importSnapshot: (snap) =>
        set({
          profile: { ...initialProfile(), ...snap.profile },
          periodDays: snap.periodDays ?? {},
          logs: snap.logs ?? {},
          notifications: { ...initialNotifications, ...snap.notifications },
          prefs: { ...initialPrefs, ...snap.prefs },
        }),

      seedDemo: () => set(buildDemo(get().profile.name || 'Анна')),
    }),
    {
      name: 'luna-store-v1',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ profile: s.profile, periodDays: s.periodDays, logs: s.logs, notifications: s.notifications, prefs: s.prefs }),
    },
  ),
);

/** Демо-данные для локального просмотра (только dev-режим) */
function buildDemo(name: string): Pick<LunaState, 'profile' | 'periodDays' | 'logs'> {
  const today = todayKey();
  const lengths = [29, 27, 28, 30, 28, 27, 29, 28];
  // последний цикл начался 11 дней назад → сегодня 12-й день
  const starts: DateKey[] = [addDaysKey(today, -11)];
  for (let i = lengths.length - 1; i >= 0; i--) starts.unshift(addDaysKey(starts[0], -lengths[i]));

  const flows: Flow[] = ['medium', 'heavy', 'medium', 'light', 'spotting'];
  const periodDays: Record<DateKey, Flow> = {};
  const logs: Record<DateKey, DailyLog> = {};
  const tz = userTimezone();
  const mk = (date: DateKey, p: Partial<DailyLog>): DailyLog => ({
    date, symptoms: [], customSymptoms: [], timezone: tz, createdAt: date, updatedAt: date, ...p,
  });

  starts.forEach((s, ci) => {
    flows.forEach((f, i) => {
      const d = addDaysKey(s, i);
      if (d <= today) periodDays[d] = f;
    });
    const d1 = addDaysKey(s, 0);
    if (d1 <= today) logs[d1] = mk(d1, { pain: ci % 3 === 0 ? 'moderate' : 'mild', energy: 'low', mood: 'sensitive', symptoms: ['cramps', 'fatigue'], sleepHours: 7, sleepQuality: 'ok' });
    const next = starts[ci + 1];
    if (!next) return;
    // перед месячными — усталость, отёки, раздражение
    for (let k = 1; k <= 3; k++) {
      const d = addDaysKey(next, -k);
      logs[d] = mk(d, {
        mood: k === 1 ? 'irritable' : 'anxious',
        energy: 'low',
        symptoms: k === 2 ? ['fatigue', 'swelling', 'headache'] : ['fatigue', 'swelling'],
        sleepHours: 6,
        sleepQuality: 'bad',
        appetite: 'high',
      });
    }
    // фолликулярная фаза — хорошее самочувствие
    const f = addDaysKey(s, 8);
    if (f <= today) logs[f] = mk(f, { mood: 'good', energy: 'high', pain: 'none', sleepHours: 8, sleepQuality: 'good' });
  });

  return {
    profile: { ...initialProfile(), name, cycleLength: 28, periodLength: 5, regularity: 'regular', onboarded: true },
    periodDays,
    logs,
  };
}

export function getSnapshot(): Snapshot {
  const { profile, periodDays, logs, notifications, prefs } = useLunaStore.getState();
  return { v: 1, profile, periodDays, logs, notifications, prefs };
}
