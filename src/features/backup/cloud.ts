/**
 * Резервная копия данных в Telegram CloudStorage (Bot API 6.9+).
 *
 * Ограничения хранилища: до 1024 ключей, значение до 4096 символов.
 * Поэтому снимок данных режется на части. Пишем в два «поколения»:
 * новое поколение записывается рядом со старым, потом переключается
 * указатель (meta), и только после этого старое удаляется. Если запись
 * оборвалась на середине — старая копия остаётся целой.
 */
import type { Snapshot } from '@/store/useLunaStore';

export interface CloudStorageApi {
  setItem(key: string, value: string, cb?: (err: string | null, ok?: boolean) => void): void;
  getItem(key: string, cb: (err: string | null, value?: string) => void): void;
  getItems(keys: string[], cb: (err: string | null, values?: Record<string, string>) => void): void;
  removeItems(keys: string[], cb?: (err: string | null, ok?: boolean) => void): void;
}

export interface BackupMeta {
  v: 1;
  gen: 0 | 1;
  chunks: number;
  savedAt: string;
  logs: number;
}

const META = 'luna_meta';
const CHUNK = 4000;
const chunkKey = (gen: number, i: number) => `luna_${gen}_${i}`;

const call = <T>(fn: (cb: (err: string | null, v?: T) => void) => void) =>
  new Promise<T | undefined>((resolve, reject) => fn((err, v) => (err ? reject(new Error(err)) : resolve(v))));

export async function readMeta(cs: CloudStorageApi): Promise<BackupMeta | null> {
  const raw = await call<string>((cb) => cs.getItem(META, cb));
  if (!raw) return null;
  try {
    const m = JSON.parse(raw) as BackupMeta;
    return m.v === 1 && m.chunks > 0 ? m : null;
  } catch {
    return null;
  }
}

export async function saveBackup(cs: CloudStorageApi, snap: Snapshot): Promise<BackupMeta> {
  const json = JSON.stringify(snap);
  const prev = await readMeta(cs);
  const gen: 0 | 1 = prev?.gen === 0 ? 1 : 0;
  const parts: string[] = [];
  for (let i = 0; i < json.length; i += CHUNK) parts.push(json.slice(i, i + CHUNK));
  if (parts.length > 500) throw new Error('backup too large');

  await Promise.all(parts.map((p, i) => call<boolean>((cb) => cs.setItem(chunkKey(gen, i), p, cb))));
  const meta: BackupMeta = { v: 1, gen, chunks: parts.length, savedAt: new Date().toISOString(), logs: Object.keys(snap.logs).length };
  await call<boolean>((cb) => cs.setItem(META, JSON.stringify(meta), cb));

  if (prev) {
    const stale = Array.from({ length: prev.chunks }, (_, i) => chunkKey(prev.gen, i));
    await call<boolean>((cb) => cs.removeItems(stale, cb)).catch(() => undefined);
  }
  return meta;
}

export async function loadBackup(cs: CloudStorageApi): Promise<{ meta: BackupMeta; snapshot: Snapshot } | null> {
  const meta = await readMeta(cs);
  if (!meta) return null;
  const keys = Array.from({ length: meta.chunks }, (_, i) => chunkKey(meta.gen, i));
  const values = (await call<Record<string, string>>((cb) => cs.getItems(keys, cb))) ?? {};
  const json = keys.map((k) => values[k] ?? '').join('');
  try {
    const snapshot = JSON.parse(json) as Snapshot;
    if (!snapshot || typeof snapshot !== 'object' || !snapshot.profile) return null;
    return { meta, snapshot };
  } catch {
    return null;
  }
}

export async function removeBackup(cs: CloudStorageApi): Promise<void> {
  const meta = await readMeta(cs);
  const keys = [META];
  if (meta) for (let g = 0; g < 2; g++) for (let i = 0; i < meta.chunks + 50; i++) keys.push(chunkKey(g, i));
  await call<boolean>((cb) => cs.removeItems(keys, cb));
}
