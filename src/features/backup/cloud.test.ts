import { describe, expect, it } from 'vitest';
import type { Snapshot } from '@/store/useLunaStore';
import type { DailyLog } from '@/types';
import { loadBackup, removeBackup, saveBackup, type CloudStorageApi } from './cloud';

/** Хранилище с ограничениями как у Telegram CloudStorage */
function fakeStorage(failAfter = Infinity) {
  const data = new Map<string, string>();
  let writes = 0;
  const api: CloudStorageApi = {
    setItem(key, value, cb) {
      if (value.length > 4096) return cb?.('VALUE_TOO_LONG');
      if (++writes > failAfter) return cb?.('NETWORK');
      data.set(key, value);
      cb?.(null, true);
    },
    getItem: (key, cb) => cb(null, data.get(key) ?? ''),
    getItems: (keys, cb) => cb(null, Object.fromEntries(keys.map((k) => [k, data.get(k) ?? '']))),
    removeItems(keys, cb) {
      keys.forEach((k) => data.delete(k));
      cb?.(null, true);
    },
  };
  return { api, data, failNext: (n: number) => (failAfter = writes + n) };
}

function snapshot(days: number, name = 'Анна'): Snapshot {
  const logs: Record<string, DailyLog> = {};
  for (let i = 0; i < days; i++) {
    const date = `2026-${String(1 + Math.floor(i / 28)).padStart(2, '0')}-${String(1 + (i % 28)).padStart(2, '0')}`;
    logs[date] = { date, mood: 'good', symptoms: ['fatigue', 'bloating'], customSymptoms: [], notes: 'Заметка про самочувствие '.repeat(3) } as unknown as DailyLog;
  }
  return {
    v: 1,
    profile: { name, cycleLength: 28, periodLength: 5, regularity: 'regular', onboarded: true, createdAt: '2026-01-01T00:00:00.000Z' },
    periodDays: { '2026-11-01': 'medium' },
    logs,
    notifications: { periodReminder: true, symptomReminder: true, tips: false, weeklyReport: true, time: '09:00' },
    prefs: { haptics: true, sounds: true, theme: 'auto' },
  };
}

describe('облачная копия', () => {
  it('большой снимок режется на части и собирается обратно', async () => {
    const { api } = fakeStorage();
    const snap = snapshot(300);
    const meta = await saveBackup(api, snap);
    expect(meta.chunks).toBeGreaterThan(5);
    expect((await loadBackup(api))?.snapshot).toEqual(snap);
  });

  it('новое сохранение переключает поколение и убирает старые части', async () => {
    const { api, data } = fakeStorage();
    await saveBackup(api, snapshot(200));
    const second = await saveBackup(api, snapshot(10, 'Новая'));
    expect(second.gen).toBe(1);
    expect([...data.keys()].filter((k) => k.startsWith('luna_0_'))).toHaveLength(0);
    expect((await loadBackup(api))?.snapshot.profile.name).toBe('Новая');
  });

  it('если запись оборвалась, старая копия остаётся целой', async () => {
    const storage = fakeStorage();
    await saveBackup(storage.api, snapshot(50, 'Старая'));
    storage.failNext(2);
    await expect(saveBackup(storage.api, snapshot(300, 'Новая'))).rejects.toThrow();
    expect((await loadBackup(storage.api))?.snapshot.profile.name).toBe('Старая');
  });

  it('удаление стирает копию', async () => {
    const { api, data } = fakeStorage();
    await saveBackup(api, snapshot(100));
    await removeBackup(api);
    expect(data.size).toBe(0);
    expect(await loadBackup(api)).toBeNull();
  });
});
