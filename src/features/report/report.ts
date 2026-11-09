/**
 * Данные «Отчёта для врача» — чистая функция над записями.
 * Одинаково используется для экрана предпросмотра и для PDF.
 */
import type { DailyLog, DateKey, Flow, Mood, Profile } from '@/types';
import { computeAnalytics, type RangeKey } from '@/features/analytics/stats';
import { getPeriods, MAX_CYCLE, MIN_CYCLE, predict } from '@/features/cycle/engine';
import { diffDays } from '@/utils/date';

export type ReportRange = Extract<RangeKey, '3m' | '6m' | '1y'>;

export interface ReportCycleRow {
  start: DateKey;
  /** null — месячные ещё идут */
  periodLength: number | null;
  /** null — следующий цикл ещё не начался (или длина неправдоподобна) */
  cycleLength: number | null;
  maxFlow: Flow;
}

export interface ReportData {
  name: string;
  generatedAt: DateKey;
  from: DateKey;
  to: DateKey;
  summary: {
    avgCycle: number | null;
    minCycle: number | null;
    maxCycle: number | null;
    regular: boolean | null;
    avgPeriod: number | null;
    cycles: number;
    lastPeriodStart: DateKey | null;
    next: { start: DateKey; end: DateKey; late: number } | null;
  };
  rows: ReportCycleRow[];
  symptoms: { key: string; custom: boolean; count: number }[];
  moods: { key: Mood; count: number }[];
  pain: { moderate: number; severe: number };
  notes: { date: DateKey; text: string }[];
  logsCount: number;
}

const FLOW_RANK: Record<Flow, number> = { spotting: 0, light: 1, medium: 2, heavy: 3 };

export function buildReport(
  periodDays: Record<DateKey, Flow>,
  logs: Record<DateKey, DailyLog>,
  profile: Profile,
  range: ReportRange,
  today: DateKey,
): ReportData {
  const a = computeAnalytics(periodDays, logs, range, today);
  const inRange = (k: DateKey) => k >= a.from && k <= today;
  const periods = getPeriods(periodDays).filter((p) => p.start <= today);

  const rows: ReportCycleRow[] = [];
  periods.forEach((p, i) => {
    if (!inRange(p.start)) return;
    const next = periods[i + 1];
    const len = next ? diffDays(p.start, next.start) : null;
    let maxFlow: Flow = 'spotting';
    for (const [d, f] of Object.entries(periodDays)) {
      if (d >= p.start && d <= p.end && FLOW_RANK[f] > FLOW_RANK[maxFlow]) maxFlow = f;
    }
    rows.push({
      start: p.start,
      periodLength: diffDays(p.end, today) > 1 ? p.length : null,
      cycleLength: len != null && len >= MIN_CYCLE && len <= MAX_CYCLE ? len : null,
      maxFlow,
    });
  });
  rows.reverse(); // свежие сверху

  let moderate = 0;
  let severe = 0;
  const notes: { date: DateKey; text: string }[] = [];
  for (const log of Object.values(logs)) {
    if (!inRange(log.date)) continue;
    if (log.pain === 'moderate') moderate++;
    if (log.pain === 'severe') severe++;
    if (log.notes?.trim()) notes.push({ date: log.date, text: log.notes.trim() });
  }
  notes.sort((x, y) => (x.date < y.date ? 1 : -1));

  const p = predict(periodDays, profile, today);
  return {
    name: profile.name,
    generatedAt: today,
    from: a.from,
    to: today,
    summary: {
      avgCycle: a.avgCycle,
      minCycle: a.minCycle,
      maxCycle: a.maxCycle,
      regular: a.regular,
      avgPeriod: a.avgPeriod,
      cycles: a.cyclePoints.length,
      lastPeriodStart: periods.length ? periods[periods.length - 1].start : null,
      next: p ? { start: p.rangeStart, end: p.rangeEnd, late: p.isLate ? p.lateBy : 0 } : null,
    },
    rows,
    symptoms: a.symptomFreq,
    moods: a.moodFreq,
    pain: { moderate, severe },
    notes,
    logsCount: a.logsCount,
  };
}
