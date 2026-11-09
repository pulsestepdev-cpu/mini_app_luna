import { subMonths } from 'date-fns';
import type { DailyLog, DateKey, Flow, Mood } from '@/types';
import { fromKey, diffDays, toKey } from '@/utils/date';
import { MAX_CYCLE, MIN_CYCLE, getPeriods } from '@/features/cycle/engine';

export type RangeKey = '1m' | '3m' | '6m' | '1y';
const MONTHS: Record<RangeKey, number> = { '1m': 1, '3m': 3, '6m': 6, '1y': 12 };

export interface CyclePoint {
  start: DateKey;
  length: number;
}

/** Цикл считаем регулярным, если самый короткий и самый длинный различаются не больше чем на столько дней (FIGO) */
export const REGULAR_SPREAD = 7;
/** Минимум циклов, чтобы судить о регулярности */
export const REGULAR_MIN_CYCLES = 3;

export interface AnalyticsData {
  from: DateKey;
  cyclePoints: CyclePoint[];
  /** Длительность завершённых менструаций (start — первый день) */
  periodPoints: CyclePoint[];
  /** null — данных слишком мало для вывода */
  regular: boolean | null;
  minPeriod: number | null;
  maxPeriod: number | null;
  periodsCount: number;
  avgCycle: number | null;
  minCycle: number | null;
  maxCycle: number | null;
  avgPeriod: number | null;
  symptomFreq: { key: string; count: number; custom: boolean }[];
  moodFreq: { key: Mood; count: number }[];
  logsCount: number;
}

export function computeAnalytics(
  periodDays: Record<DateKey, Flow>,
  logs: Record<DateKey, DailyLog>,
  range: RangeKey,
  today: DateKey,
): AnalyticsData {
  const from = toKey(subMonths(fromKey(today), MONTHS[range]));
  const inRange = (k: DateKey) => k >= from && k <= today;
  const periods = getPeriods(periodDays).filter((p) => p.start <= today);

  const cyclePoints: CyclePoint[] = [];
  for (let i = 1; i < periods.length; i++) {
    const length = diffDays(periods[i - 1].start, periods[i].start);
    if (length >= MIN_CYCLE && length <= MAX_CYCLE && inRange(periods[i - 1].start)) {
      cyclePoints.push({ start: periods[i - 1].start, length });
    }
  }
  const lens = cyclePoints.map((c) => c.length);
  const periodsInRange = periods.filter((p) => inRange(p.start));
  // Идущую сейчас менструацию не учитываем в средней длительности
  const finished = periodsInRange.filter((p) => diffDays(p.end, today) > 1);

  const symptomCount = new Map<string, { count: number; custom: boolean }>();
  const moodCount = new Map<Mood, number>();
  let logsCount = 0;
  for (const log of Object.values(logs)) {
    if (!inRange(log.date)) continue;
    logsCount++;
    for (const s of log.symptoms) symptomCount.set(s, { count: (symptomCount.get(s)?.count ?? 0) + 1, custom: false });
    for (const s of log.customSymptoms) symptomCount.set(s, { count: (symptomCount.get(s)?.count ?? 0) + 1, custom: true });
    if (log.mood) moodCount.set(log.mood, (moodCount.get(log.mood) ?? 0) + 1);
  }

  const periodLens = finished.map((p) => p.length);

  return {
    from,
    cyclePoints,
    periodPoints: finished.map((p) => ({ start: p.start, length: p.length })),
    regular: lens.length >= REGULAR_MIN_CYCLES ? Math.max(...lens) - Math.min(...lens) <= REGULAR_SPREAD : null,
    minPeriod: periodLens.length ? Math.min(...periodLens) : null,
    maxPeriod: periodLens.length ? Math.max(...periodLens) : null,
    periodsCount: periodsInRange.length,
    avgCycle: lens.length ? Math.round(lens.reduce((a, b) => a + b, 0) / lens.length) : null,
    minCycle: lens.length ? Math.min(...lens) : null,
    maxCycle: lens.length ? Math.max(...lens) : null,
    avgPeriod: finished.length
      ? Math.round((finished.reduce((a, p) => a + p.length, 0) / finished.length) * 10) / 10
      : null,
    symptomFreq: [...symptomCount.entries()].map(([key, v]) => ({ key, ...v })).sort((a, b) => b.count - a.count),
    moodFreq: [...moodCount.entries()].map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count),
    logsCount,
  };
}
