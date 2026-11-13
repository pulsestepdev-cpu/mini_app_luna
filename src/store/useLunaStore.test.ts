import { afterEach, describe, expect, it, vi } from 'vitest';

/** localStorage в памяти — тесты идут в Node */
class MemoryStorage {
  private m = new Map<string, string>();
  get length() {
    return this.m.size;
  }
  key(i: number) {
    return [...this.m.keys()][i] ?? null;
  }
  getItem(k: string) {
    return this.m.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.m.set(k, String(v));
  }
  removeItem(k: string) {
    this.m.delete(k);
  }
  clear() {
    this.m.clear();
  }
}

/** Загружает хранилище «с нуля» поверх заданного содержимого localStorage */
async function loadStoreWith(saved: unknown) {
  const ls = new MemoryStorage();
  ls.setItem('luna-store-v1', JSON.stringify(saved));
  vi.stubGlobal('localStorage', ls);
  vi.resetModules();
  const mod = await import('./useLunaStore');
  return { state: mod.useLunaStore.getState(), ls, mod };
}

const profile = { name: 'Анна', cycleLength: 28, periodLength: 5, regularity: 'regular', onboarded: true, createdAt: '2026-01-01T00:00:00Z' };

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('загрузка сохранённых данных', () => {
  it('данные другой версии формата не теряются, а достраиваются', async () => {
    const { state, ls } = await loadStoreWith({
      version: 0,
      state: {
        profile,
        periodDays: { '2026-11-01': 'medium' },
        logs: { '2026-11-02': { date: '2026-11-02', symptoms: ['cramps'], customSymptoms: [] } },
        notifications: { periodReminder: false, time: '21:00' },
        prefs: { theme: 'dark' },
      },
    });
    expect(state.profile.name).toBe('Анна');
    expect(state.profile.onboarded).toBe(true);
    expect(state.periodDays['2026-11-01']).toBe('medium');
    expect(state.logs['2026-11-02'].symptoms).toEqual(['cramps']);
    expect(state.intimacy).toEqual({});
    expect(state.prefs).toMatchObject({ theme: 'dark', haptics: true, sounds: true });
    expect(state.notifications).toMatchObject({ periodReminder: false, time: '21:00', weeklyReport: true });
    // переведённые данные сразу сохраняются в новом формате
    expect(JSON.parse(ls.getItem('luna-store-v1')!).state.profile.name).toBe('Анна');
  });

  it('новые поля в профиле и настройках получают значения по умолчанию', async () => {
    const { state, mod } = await loadStoreWith({
      version: 1,
      state: { profile, periodDays: {}, logs: {}, notifications: { time: '08:00' }, prefs: { theme: 'light' } },
    });
    expect(mod.STORE_VERSION).toBe(1);
    expect(state.prefs.haptics).toBe(true);
    expect(state.notifications.periodReminder).toBe(true);
    expect(state.notifications.time).toBe('08:00');
  });

  it('пустое хранилище — начальное состояние', async () => {
    vi.stubGlobal('localStorage', new MemoryStorage());
    vi.resetModules();
    const { useLunaStore } = await import('./useLunaStore');
    expect(useLunaStore.getState().profile.onboarded).toBe(false);
    expect(useLunaStore.getState().intimacy).toEqual({});
  });

  it('восстановление старой копии без раздела «Близость»', async () => {
    const { mod } = await loadStoreWith({ version: 1, state: {} });
    mod.useLunaStore.getState().importSnapshot({ v: 1, profile, periodDays: {}, logs: {}, notifications: {}, prefs: {} } as never);
    const s = mod.useLunaStore.getState();
    expect(s.profile.name).toBe('Анна');
    expect(s.intimacy).toEqual({});
    expect(s.notifications.time).toBe('09:00');
  });
});
