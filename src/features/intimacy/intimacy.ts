/**
 * Близость — чистые функции над записями. Записи хранятся отдельно от
 * самочувствия (`logs`): не влияют на серию дней, не уходят на сервер
 * и партнёру, а в отчёт для врача попадают только по явному выбору.
 */
import type { DateKey, IntimacyLog, Libido, Protection } from '@/types';
import { t } from '@/i18n';

export type IntimacyInput = Omit<IntimacyLog, 'updatedAt'>;

export const PROTECTIONS: Protection[] = ['protected', 'unprotected', 'withdrawal'];
export const LIBIDOS: Libido[] = ['low', 'medium', 'high'];

/**
 * Приводит запись к единому виду: если близости не было — без деталей о ней.
 * null — записывать нечего (запись за день удаляется).
 */
export function normalizeIntimacy(e: IntimacyInput): IntimacyInput | null {
  const out: IntimacyInput = { date: e.date, sex: !!e.sex };
  if (out.sex) {
    if (e.protection) out.protection = e.protection;
    if (e.orgasm) out.orgasm = true;
    if (e.pain) out.pain = true;
  }
  if (e.libido) out.libido = e.libido;
  return out.sex || out.libido ? out : null;
}

/** Близость, после которой возможна беременность: без защиты или прерванный акт */
export const isUnprotected = (e: Pick<IntimacyLog, 'sex' | 'protection'>): boolean =>
  e.sex && (e.protection === 'unprotected' || e.protection === 'withdrawal');

/** Дни с близостью в диапазоне [from, to], по возрастанию дат */
export function sexDays(intimacy: Record<DateKey, IntimacyLog>, from: DateKey, to: DateKey): IntimacyLog[] {
  return Object.values(intimacy)
    .filter((e) => e.sex && e.date >= from && e.date <= to)
    .sort((a, b) => (a.date < b.date ? -1 : 1));
}

/** Короткая подпись записи: «Без защиты · оргазм», «Влечение: высокое» */
export function intimacySummary(e: Pick<IntimacyLog, 'sex' | 'protection' | 'orgasm' | 'pain' | 'libido'>): string {
  const ti = t.intimacy;
  const parts: string[] = [];
  if (e.sex) {
    parts.push(e.protection ? ti.protection[e.protection] : ti.had);
    if (e.orgasm) parts.push(ti.orgasm);
    if (e.pain) parts.push(ti.pain);
  }
  if (e.libido) parts.push(`${ti.libido} ${ti.libidoLevel[e.libido]}`);
  const s = parts.join(' · ').toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export interface IntimacyStats {
  /** Дней с близостью */
  days: number;
  protection: Record<Protection | 'unknown', number>;
  orgasm: number;
  pain: number;
  libido: Record<Libido, number>;
  /** Последняя близость без защиты / с прерванным актом */
  lastUnprotected: DateKey | null;
}

export function intimacyStats(intimacy: Record<DateKey, IntimacyLog>, from: DateKey, to: DateKey): IntimacyStats {
  const s: IntimacyStats = {
    days: 0,
    protection: { protected: 0, unprotected: 0, withdrawal: 0, unknown: 0 },
    orgasm: 0,
    pain: 0,
    libido: { low: 0, medium: 0, high: 0 },
    lastUnprotected: null,
  };
  for (const e of Object.values(intimacy)) {
    if (e.date < from || e.date > to) continue;
    if (e.libido) s.libido[e.libido]++;
    if (!e.sex) continue;
    s.days++;
    s.protection[e.protection ?? 'unknown']++;
    if (e.orgasm) s.orgasm++;
    if (e.pain) s.pain++;
    if (isUnprotected(e) && (!s.lastUnprotected || e.date > s.lastUnprotected)) s.lastUnprotected = e.date;
  }
  return s;
}
