/**
 * Связь с сервером LUNA (тот же адрес, что и приложение): синхронизация плана
 * напоминаний, статус бота, партнёр. Работает только внутри Telegram — сервер
 * доверяет лишь подписи Telegram (initData).
 */
import { create } from 'zustand';
import { getTelegram } from '@/app/telegram';
import { getSnapshot, useLunaStore } from '@/store/useLunaStore';
import { todayKey } from '@/utils/date';
import { buildPlan, serverSnapshot } from './plan';

export interface ServerMe {
  allowed: boolean;
  pending: boolean;
  started: boolean;
  bot: string | null;
  partner: { linked: boolean; name: string | null; invite: string | null };
}

type State = 'off' | 'loading' | 'ok' | 'pending' | 'error';

interface ServerStatus {
  state: State;
  me: ServerMe | null;
  set: (patch: Partial<Omit<ServerStatus, 'set'>>) => void;
}

export const useServer = create<ServerStatus>((set) => ({ state: 'off', me: null, set: (patch) => set(patch) }));

export function serverAvailable(): boolean {
  return !!getTelegram()?.initData;
}

async function api<T>(method: string, path: string, body?: unknown): Promise<T> {
  const tg = getTelegram();
  if (!tg) throw new Error('not in telegram');
  const res = await fetch(`./api/${path}`, {
    method,
    headers: { Authorization: `tma ${tg.initData}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}`) as Error & { status: number };
    err.status = res.status;
    throw err;
  }
  return res.json() as Promise<T>;
}

export async function refreshMe(): Promise<ServerMe | null> {
  if (!serverAvailable()) return null;
  try {
    const me = await api<ServerMe>('GET', 'me');
    useServer.getState().set({ me, state: me.allowed ? 'ok' : me.pending ? 'pending' : 'ok' });
    return me;
  } catch {
    useServer.getState().set({ state: 'error' });
    return null;
  }
}

export async function syncNow(): Promise<boolean> {
  if (!serverAvailable()) return false;
  const snap = getSnapshot();
  if (!snap.profile.onboarded) return false;
  try {
    await api('POST', 'sync', { snapshot: serverSnapshot(snap), plan: buildPlan(snap, todayKey()) });
    if (useServer.getState().state !== 'ok') useServer.getState().set({ state: 'ok' });
    return true;
  } catch (e) {
    useServer.getState().set({ state: (e as { status?: number }).status === 403 ? 'pending' : 'error' });
    return false;
  }
}

export const sendTest = () => api<{ ok: boolean }>('POST', 'test');
export const markStarted = () => api('POST', 'started');
export const createInvite = () => api<{ invite: string }>('POST', 'partner/invite');
export const removePartner = () => api('DELETE', 'partner');
export const deleteServerData = () => api('DELETE', 'data');

const DEBOUNCE_MS = 3000;

/** Синхронизация при запуске и через пару секунд после изменений (только в Telegram) */
export function startAutoSync(): () => void {
  if (!serverAvailable()) return () => undefined;
  useServer.getState().set({ state: 'loading' });
  void syncNow().then(() => refreshMe());

  let timer: ReturnType<typeof setTimeout> | undefined;
  const unsub = useLunaStore.subscribe((s, prev) => {
    const changed = s.profile !== prev.profile || s.periodDays !== prev.periodDays || s.logs !== prev.logs || s.notifications !== prev.notifications;
    if (!changed || !s.profile.onboarded) return;
    clearTimeout(timer);
    timer = setTimeout(() => void syncNow(), DEBOUNCE_MS);
  });
  // Даты в плане (например, «записала ли сегодня») меняются со временем — обновим при возврате в приложение
  const onVisible = () => document.visibilityState === 'visible' && void syncNow();
  document.addEventListener('visibilitychange', onVisible);
  return () => {
    clearTimeout(timer);
    unsub();
    document.removeEventListener('visibilitychange', onVisible);
  };
}
