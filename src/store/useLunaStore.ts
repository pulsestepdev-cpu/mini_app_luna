/**
 * Единый слой данных приложения.
 *
 * ВРЕМЕННО: данные хранятся в localStorage браузера. Все экраны работают
 * только через эти действия, поэтому при подключении backend (FastAPI)
 * меняется только этот файл — экраны трогать не нужно.
 */
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { DailyLog, DateKey, Flow, IntimacyLog, NotificationSettings, Preferences, Profile, Regularity } from '@/types';
import { normalizeIntimacy, type IntimacyInput } from '@/features/intimacy/intimacy';
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
  /** Нет в копиях, сделанных до появления раздела «Близость» */
  intimacy?: Record<DateKey, IntimacyLog>;
  notifications: NotificationSettings;
  prefs: Preferences;
}

interface LunaState {
  profile: Profile;
  periodDays: Record<DateKey, Flow>;
  logs: Record<DateKey, DailyLog>;
  intimacy: Record<DateKey, IntimacyLog>;
  notifications: NotificationSettings;
  prefs: Preferences;

  completeOnboarding: (input: OnboardingInput) => void;
  updateProfile: (patch: Partial<Omit<Profile, 'onboarded' | 'createdAt'>>) => void;
  setPeriodDay: (date: DateKey, flow: Flow | null) => void;
  saveLog: (log: LogInput) => void;
  deleteLog: (date: DateKey) => void;
  /** Запись о близости за день; пустая (или null) — удаляет запись */
  setIntimacy: (date: DateKey, entry: IntimacyInput | null) => void;
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

/** Что хранится в localStorage (и в резервной копии) */
export type PersistedData = Pick<LunaState, 'profile' | 'periodDays' | 'logs' | 'intimacy' | 'notifications' | 'prefs'>;

/**
 * Версия формата данных в localStorage. Если формат меняется несовместимо —
 * увеличь её и добавь шаг в migrateData (например, `if (from < 2) …`).
 * Новые необязательные поля версии не требуют: их достроит withDefaults.
 */
export const STORE_VERSION = 1;

/**
 * Достраивает сохранённые данные до текущего формата: недостающие разделы
 * и новые поля внутри профиля/настроек получают значения по умолчанию.
 * Используется и при запуске, и при восстановлении копии.
 */
export function withDefaults(saved: Partial<PersistedData> | null | undefined): PersistedData {
  const s = saved ?? {};
  return {
    profile: { ...initialProfile(), ...s.profile },
    periodDays: s.periodDays ?? {},
    logs: s.logs ?? {},
    intimacy: s.intimacy ?? {},
    notifications: { ...initialNotifications, ...s.notifications },
    prefs: { ...initialPrefs, ...s.prefs },
  };
}

/**
 * Перевод данных из старой (или более новой — после отката) версии формата.
 * Важно, что функция есть всегда: без неё zustand при смене версии молча
 * загрузил бы пустое состояние, а следующая запись затёрла бы данные.
 */
export function migrateData(saved: unknown, _from: number): PersistedData {
  // Шагов миграции пока нет — формат с версии 1 менялся только добавлением полей.
  return withDefaults(saved as Partial<PersistedData>);
}

const isEmptyLog = (l: LogInput) =>
  !l.mood && !l.energy && !l.pain && !l.appetite && l.sleepHours == null && !l.sleepQuality &&
  !l.symptoms.length && !l.customSymptoms.length && !l.notes?.trim();

export const useLunaStore = create<LunaState>()(
  persist(
    (set, get) => ({
      profile: initialProfile(),
      periodDays: {},
      logs: {},
      intimacy: {},
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

      setIntimacy: (date, entry) => {
        const intimacy = { ...get().intimacy };
        const clean = entry && normalizeIntimacy({ ...entry, date });
        if (clean) intimacy[date] = { ...clean, updatedAt: new Date().toISOString() };
        else delete intimacy[date];
        set({ intimacy });
      },

      updateNotifications: (patch) => set({ notifications: { ...get().notifications, ...patch } }),
      updatePrefs: (patch) => set({ prefs: { ...get().prefs, ...patch } }),

      resetAll: () =>
        set({ profile: initialProfile(), periodDays: {}, logs: {}, intimacy: {}, notifications: initialNotifications, prefs: initialPrefs }),

      importSnapshot: (snap) => set(withDefaults(snap)),

      seedDemo: () => set(buildDemo(get().profile.name || 'Анна')),
    }),
    {
      name: 'luna-store-v1',
      version: STORE_VERSION,
      storage: createJSONStorage(() => localStorage),
      migrate: migrateData,
      // По умолчанию zustand сливает только верхний уровень — новые поля в profile/prefs у старых данных были бы undefined
      merge: (saved, current) => (saved ? { ...current, ...withDefaults(saved as Partial<PersistedData>) } : current),
      partialize: (s) => ({ profile: s.profile, periodDays: s.periodDays, logs: s.logs, intimacy: s.intimacy, notifications: s.notifications, prefs: s.prefs }),
    },
  ),
);

/** Демо-данные для локального просмотра (только dev-режим) */
function buildDemo(name: string): Pick<LunaState, 'profile' | 'periodDays' | 'logs' | 'intimacy'> {
  const today = todayKey();
  const lengths = [29, 27, 28, 30, 28, 27, 29, 28];
  // последний цикл начался 11 дней назад → сегодня 12-й день
  const starts: DateKey[] = [addDaysKey(today, -11)];
  for (let i = lengths.length - 1; i >= 0; i--) starts.unshift(addDaysKey(starts[0], -lengths[i]));

  const flows: Flow[] = ['medium', 'heavy', 'medium', 'light', 'spotting'];
  const periodDays: Record<DateKey, Flow> = {};
  const logs: Record<DateKey, DailyLog> = {};
  const intimacy: Record<DateKey, IntimacyLog> = {};
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
    // близость: пара раз за цикл, влечение выше в середине цикла
    const sexAt: [number, IntimacyLog['protection'], Partial<IntimacyLog>][] = [
      [9, 'protected', { orgasm: true, libido: 'high' }],
      [13, ci % 2 ? 'unprotected' : 'protected', { orgasm: ci % 3 !== 0, libido: 'high' }],
      [21, 'protected', {}],
    ];
    for (const [off, protection, extra] of sexAt) {
      const d = addDaysKey(s, off);
      if (d <= today && (!next || d < next)) intimacy[d] = { date: d, sex: true, protection, ...extra, updatedAt: d };
    }
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
    intimacy,
  };
}

export function getSnapshot(): Snapshot {
  const { profile, periodDays, logs, intimacy, notifications, prefs } = useLunaStore.getState();
  return { v: 1, profile, periodDays, logs, intimacy, notifications, prefs };
}
