/**
 * Cycle Engine — чистые функции расчёта цикла.
 *
 * Подход консервативный (ТЗ, раздел 7): медиана и диапазон последних циклов,
 * без машинного обучения. Все прогнозы — приблизительные, у каждого есть
 * диапазон дат и уровень уверенности. Овуляция и фертильное окно —
 * оценка, а не метод контрацепции.
 */
import type { Confidence, DateKey, Flow, Phase, Profile, Regularity } from '@/types';
import { addDaysKey, diffDays } from '@/utils/date';

export const ALGORITHM_VERSION = 'stat-median-1.0';

export const DEFAULT_CYCLE = 28;
export const DEFAULT_PERIOD = 5;
/** Циклы вне этих границ считаем ошибкой ввода/пропуском и не учитываем */
export const MIN_CYCLE = 18;
export const MAX_CYCLE = 50;
/** Сколько последних циклов учитывать в прогнозе */
export const WINDOW = 6;
const LUTEAL = 14;
const PMS_DAYS = 5;

export interface Period {
  start: DateKey;
  end: DateKey;
  length: number;
}

export interface CycleStats {
  /** Длины завершённых корректных циклов, от старых к новым */
  lengths: number[];
  median: number;
  min: number;
  max: number;
  periodLength: number;
  /** На скольких циклах основан расчёт */
  basedOn: number;
  usedDefault: boolean;
  confidence: Confidence;
  irregular: boolean;
}

export interface CycleProjection {
  start: DateKey;
  nextStart: DateKey;
  ovulation: DateKey;
  fertileStart: DateKey;
  fertileEnd: DateKey;
  pmsStart: DateKey;
}

export interface Prediction {
  lastStart: DateKey;
  cycleDay: number;
  cycleLength: number;
  phase: Phase;
  inPeriod: boolean;
  nextStart: DateKey;
  rangeStart: DateKey;
  rangeEnd: DateKey;
  daysUntilNext: number;
  isLate: boolean;
  lateBy: number;
  ovulation: DateKey;
  fertileStart: DateKey;
  fertileEnd: DateKey;
  stats: CycleStats;
  algorithmVersion: string;
}

export function median(values: number[]): number {
  if (!values.length) return NaN;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2);
}

/** Группирует отмеченные дни менструации в периоды (пропуск в 1 день допускается) */
export function getPeriods(periodDays: Record<DateKey, Flow>): Period[] {
  const keys = Object.keys(periodDays).sort();
  const periods: Period[] = [];
  for (const k of keys) {
    const last = periods[periods.length - 1];
    if (last && diffDays(last.end, k) <= 2) {
      last.end = k;
      last.length = diffDays(last.start, k) + 1;
    } else {
      periods.push({ start: k, end: k, length: 1 });
    }
  }
  return periods;
}

/** Длины циклов между соседними началами, отфильтрованные по правдоподобию */
export function cycleLengths(periods: Period[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < periods.length; i++) {
    const len = diffDays(periods[i - 1].start, periods[i].start);
    if (len >= MIN_CYCLE && len <= MAX_CYCLE) out.push(len);
  }
  return out;
}

export function computeStats(
  periods: Period[],
  profile: Pick<Profile, 'cycleLength' | 'periodLength' | 'regularity'>,
  today: DateKey,
): CycleStats {
  const all = cycleLengths(periods);
  const lengths = all.slice(-WINDOW);
  const basedOn = lengths.length;

  // Длительность менструации: завершённые периоды (не идущий сейчас)
  const finished = periods.filter((p) => diffDays(p.end, today) > 1 && p.length >= 2);
  const periodLength = finished.length
    ? Math.round(finished.slice(-WINDOW).reduce((s, p) => s + p.length, 0) / Math.min(finished.length, WINDOW))
    : profile.periodLength ?? DEFAULT_PERIOD;

  if (basedOn === 0) {
    const base = profile.cycleLength ?? DEFAULT_CYCLE;
    return {
      lengths,
      median: base,
      min: base,
      max: base,
      periodLength,
      basedOn,
      usedDefault: true,
      confidence: 'low',
      irregular: profile.regularity === 'irregular',
    };
  }

  const min = Math.min(...lengths);
  const max = Math.max(...lengths);
  const spread = max - min;
  const irregular = basedOn >= 3 ? spread > 7 : profile.regularity === 'irregular';
  let confidence: Confidence = 'low';
  if (basedOn >= 3 && spread <= 7) confidence = 'high';
  else if (basedOn >= 1) confidence = 'medium';
  if (irregular) confidence = 'low';

  return {
    lengths,
    median: median(lengths),
    min,
    max,
    periodLength,
    basedOn,
    usedDefault: false,
    confidence,
    irregular,
  };
}

/** Половина ширины диапазона прогноза в днях */
export function uncertainty(stats: CycleStats, regularity: Regularity | null): number {
  if (stats.basedOn === 0) return regularity === 'irregular' ? 5 : 3;
  const half = Math.ceil((stats.max - stats.min) / 2);
  const base = stats.basedOn < 3 ? 3 : 2;
  return Math.min(Math.max(base, half), 10);
}

function projectionFor(start: DateKey, nextStart: DateKey, periodLength: number): CycleProjection {
  // Овуляция ≈ за 14 дней до следующих месячных, но не раньше окончания менструации
  let ovulation = addDaysKey(nextStart, -LUTEAL);
  const earliest = addDaysKey(start, periodLength + 1);
  if (diffDays(earliest, ovulation) < 0) ovulation = earliest;
  return {
    start,
    nextStart,
    ovulation,
    fertileStart: addDaysKey(ovulation, -5),
    fertileEnd: addDaysKey(ovulation, 1),
    pmsStart: addDaysKey(nextStart, -PMS_DAYS),
  };
}

export function phaseFor(day: DateKey, proj: CycleProjection, periodEnd: DateKey | null): Phase {
  if (periodEnd && diffDays(day, periodEnd) >= 0 && diffDays(proj.start, day) >= 0) return 'menstrual';
  const toOv = diffDays(day, proj.ovulation);
  if (Math.abs(toOv) <= 1) return 'ovulatory';
  return toOv > 1 ? 'follicular' : 'luteal';
}

export function predict(
  periodDays: Record<DateKey, Flow>,
  profile: Pick<Profile, 'cycleLength' | 'periodLength' | 'regularity'>,
  today: DateKey,
): Prediction | null {
  const periods = getPeriods(periodDays).filter((p) => diffDays(p.start, today) >= 0);
  if (!periods.length) return null;

  const stats = computeStats(periods, profile, today);
  const last = periods[periods.length - 1];
  const nextStart = addDaysKey(last.start, stats.median);
  const half = uncertainty(stats, profile.regularity);
  const proj = projectionFor(last.start, nextStart, stats.periodLength);

  const cycleDay = diffDays(last.start, today) + 1;
  const daysUntilNext = diffDays(today, nextStart);
  const isLate = daysUntilNext < 0;
  // Текущая менструация: последний отмеченный день — сегодня или вчера
  const inPeriod = diffDays(last.end, today) <= 1 && cycleDay <= Math.max(stats.periodLength, last.length) + 1;
  const phase: Phase = inPeriod ? 'menstrual' : isLate ? 'luteal' : phaseFor(today, proj, last.end);

  return {
    lastStart: last.start,
    cycleDay,
    cycleLength: stats.median,
    phase,
    inPeriod,
    nextStart,
    rangeStart: addDaysKey(nextStart, -half),
    rangeEnd: addDaysKey(nextStart, half),
    daysUntilNext: Math.max(daysUntilNext, 0),
    isLate,
    lateBy: isLate ? -daysUntilNext : 0,
    ovulation: proj.ovulation,
    fertileStart: proj.fertileStart,
    fertileEnd: proj.fertileEnd,
    stats,
    algorithmVersion: ALGORITHM_VERSION,
  };
}

/** Текущий и несколько будущих циклов для календаря */
export function projectCycles(pred: Prediction, today: DateKey, count = 6): CycleProjection[] {
  const len = pred.stats.median;
  const out: CycleProjection[] = [];
  out.push(projectionFor(pred.lastStart, pred.nextStart, pred.stats.periodLength));
  // При задержке следующий прогноз отсчитываем от сегодняшнего дня
  let start = pred.isLate ? today : pred.nextStart;
  for (let i = 0; i < count; i++) {
    const next = addDaysKey(start, len);
    out.push(projectionFor(start, next, pred.stats.periodLength));
    start = next;
  }
  return out;
}

export interface DayMarks {
  period?: Flow;
  predictedPeriod?: boolean;
  fertile?: boolean;
  ovulation?: boolean;
  pms?: boolean;
}

/** Разметка дней календаря: факт отдельно от прогноза */
export function buildDayMarks(
  periodDays: Record<DateKey, Flow>,
  profile: Pick<Profile, 'cycleLength' | 'periodLength' | 'regularity'>,
  today: DateKey,
  from: DateKey,
  to: DateKey,
): Record<DateKey, DayMarks> {
  const marks: Record<DateKey, DayMarks> = {};
  const set = (k: DateKey, patch: DayMarks) => {
    if (diffDays(from, k) < 0 || diffDays(k, to) < 0) return;
    marks[k] = { ...marks[k], ...patch };
  };

  for (const [k, flow] of Object.entries(periodDays)) set(k, { period: flow });

  const pred = predict(periodDays, profile, today);
  if (!pred) return marks;

  const projections = projectCycles(pred, today);
  projections.forEach((p, idx) => {
    const isCurrent = idx === 0;
    for (let d = p.fertileStart; diffDays(d, p.fertileEnd) >= 0; d = addDaysKey(d, 1)) {
      if (!periodDays[d]) set(d, { fertile: true });
    }
    if (!periodDays[p.ovulation]) set(p.ovulation, { ovulation: true });
    // ПМС и прогноз месячных показываем только для будущих дней
    for (let d = p.pmsStart; diffDays(d, p.nextStart) > 0; d = addDaysKey(d, 1)) {
      if (diffDays(today, d) >= 0 && !periodDays[d]) set(d, { pms: true });
    }
    // Прогноз следующих месячных. При задержке он строится ниже — с сегодняшнего дня
    if (isCurrent && pred.isLate) return;
    for (let i = 0; i < pred.stats.periodLength; i++) {
      const d = addDaysKey(p.nextStart, i);
      if (diffDays(today, d) >= 0 && !periodDays[d]) set(d, { predictedPeriod: true });
    }
  });

  if (pred.isLate) {
    for (let i = 0; i < pred.stats.periodLength; i++) {
      const d = addDaysKey(today, i);
      if (!periodDays[d]) set(d, { predictedPeriod: true });
    }
  }
  return marks;
}

/** Фаза для произвольной прошедшей даты по фактическим данным (для аналитики) */
export function phaseOnDate(periods: Period[], day: DateKey, stats: CycleStats): Phase | null {
  let idx = -1;
  for (let i = 0; i < periods.length; i++) if (diffDays(periods[i].start, day) >= 0) idx = i;
  if (idx < 0) return null;
  const cur = periods[idx];
  const next = periods[idx + 1]?.start ?? addDaysKey(cur.start, stats.median);
  if (diffDays(cur.start, next) > MAX_CYCLE) return null;
  const proj = projectionFor(cur.start, next, stats.periodLength);
  return phaseFor(day, proj, cur.end);
}
