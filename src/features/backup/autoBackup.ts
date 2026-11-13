import { create } from 'zustand';
import { getTelegram } from '@/app/telegram';
import { getSnapshot, useLunaStore } from '@/store/useLunaStore';
import { readMeta, saveBackup, type CloudStorageApi } from './cloud';

type State = 'unavailable' | 'idle' | 'saving' | 'saved' | 'error';

interface BackupStatus {
  state: State;
  savedAt: string | null;
  set: (patch: Partial<Omit<BackupStatus, 'set'>>) => void;
}

/** Статус облачной копии для экрана «Конфиденциальность» (не сохраняется) */
export const useBackupStatus = create<BackupStatus>((set) => ({
  state: 'unavailable',
  savedAt: null,
  set: (patch) => set(patch),
}));

export function cloudStorage(): CloudStorageApi | null {
  const tg = getTelegram();
  return tg && tg.isVersionAtLeast('6.9') && tg.CloudStorage ? tg.CloudStorage : null;
}

const DEBOUNCE_MS = 2500;

/** Сохраняет копию сразу (например, по кнопке) */
export async function backupNow(): Promise<boolean> {
  const cs = cloudStorage();
  if (!cs || !useLunaStore.getState().profile.onboarded) return false;
  const status = useBackupStatus.getState();
  status.set({ state: 'saving' });
  try {
    const meta = await saveBackup(cs, getSnapshot());
    status.set({ state: 'saved', savedAt: meta.savedAt });
    return true;
  } catch {
    status.set({ state: 'error' });
    return false;
  }
}

/**
 * Автокопия: через пару секунд после любого изменения данных.
 * Пока онбординг не пройден, ничего не пишем — иначе пустое приложение
 * на новом устройстве затёрло бы копию до того, как её предложат восстановить.
 */
export function startAutoBackup(): () => void {
  const cs = cloudStorage();
  if (!cs) return () => undefined;
  const status = useBackupStatus.getState();
  status.set({ state: 'idle' });
  readMeta(cs)
    .then((m) => m && useBackupStatus.getState().set({ savedAt: m.savedAt, state: 'saved' }))
    .catch(() => undefined);

  let timer: ReturnType<typeof setTimeout> | undefined;
  const unsub = useLunaStore.subscribe((s, prev) => {
    const changed =
      s.profile !== prev.profile || s.periodDays !== prev.periodDays || s.logs !== prev.logs || s.intimacy !== prev.intimacy ||
      s.notifications !== prev.notifications || s.prefs !== prev.prefs;
    if (!changed || !s.profile.onboarded) return;
    clearTimeout(timer);
    timer = setTimeout(() => void backupNow(), DEBOUNCE_MS);
  });
  return () => {
    clearTimeout(timer);
    unsub();
  };
}
