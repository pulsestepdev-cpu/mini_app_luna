/**
 * Инсайты на правилах (без ИИ). Каждый вывод указывает, на скольких
 * данных он основан. Формулировки — наблюдения, не диагнозы.
 */
import type { DailyLog, DateKey, Flow, Mood, Profile } from '@/types';
import { addDaysKey, daysWord, diffDays, plural, todayKey } from '@/utils/date';
import { computeStats, getPeriods, median, phaseOnDate, predict } from '@/features/cycle/engine';
import { articleForPhase } from '@/content/articles';
import { t } from '@/i18n';

export type InsightTone = 'positive' | 'attention' | 'tip' | 'info';

export interface Insight {
  id: string;
  tone: InsightTone;
  title: string;
  text: string;
  basis?: string;
  articleSlug?: string;
}

const NEGATIVE_MOODS: Mood[] = ['sad', 'irritable', 'anxious', 'sensitive'];
const symptomLabel = (k: string) => (t.options.symptoms as Record<string, string>)[k] ?? k;
const moodLabel = (k: string) => (t.options.mood as Record<string, string>)[k] ?? k;
const basisOf = (n: number, forms: [string, string, string]) => `На основе ${n} ${plural(n, forms)}`;
const CYCLES: [string, string, string] = ['цикла', 'циклов', 'циклов'];
const RECORDS: [string, string, string] = ['записи', 'записей', 'записей'];

export function buildInsights(
  periodDays: Record<DateKey, Flow>,
  logs: Record<DateKey, DailyLog>,
  profile: Profile,
  today: DateKey = todayKey(),
): Insight[] {
  const out: Insight[] = [];
  const periods = getPeriods(periodDays).filter((p) => p.start <= today);
  const stats = computeStats(periods, profile, today);
  const n = stats.basedOn;
  const allLogs = Object.values(logs).filter((l) => l.date <= today);

  // 1. Стабильность цикла
  if (n >= 3 && stats.max - stats.min <= 4) {
    out.push({
      id: 'stable',
      tone: 'positive',
      title: 'Стабильный цикл',
      text: `Твой цикл стабилен: длина ${stats.min}–${stats.max} дней, в среднем ${stats.median}. Отличная работа! ♡`,
      basis: basisOf(n, CYCLES),
    });
  } else if (n >= 3 && stats.max - stats.min > 7) {
    out.push({
      id: 'variable',
      tone: 'attention',
      title: 'Длина цикла меняется',
      text: `Разница между самым коротким и самым длинным циклом — ${daysWord(stats.max - stats.min)}. Так бывает из-за стресса, болезни или перелётов. Если это повторяется — стоит обсудить с врачом.`,
      basis: basisOf(n, CYCLES),
      articleSlug: 'normal-cycle',
    });
  }

  // 2. Последний цикл заметно отличается от предыдущих
  if (n >= 3) {
    const last = stats.lengths[stats.lengths.length - 1];
    const delta = last - median(stats.lengths.slice(0, -1));
    if (Math.abs(delta) >= 5) {
      out.push({
        id: 'last-deviation',
        tone: 'info',
        title: delta > 0 ? 'Последний цикл длиннее обычного' : 'Последний цикл короче обычного',
        text: `Последний цикл длился ${daysWord(last)} — на ${daysWord(Math.abs(delta))} ${delta > 0 ? 'дольше' : 'меньше'}, чем обычно.`,
        basis: basisOf(n, CYCLES),
      });
    }
  }

  // 3. Симптомы и настроение, повторяющиеся перед месячными (в 2+ циклах и в половине циклов)
  if (periods.length >= 3) {
    const perCycle = new Map<string, number>();
    for (let i = 1; i < periods.length; i++) {
      const seen = new Set<string>();
      for (let k = 1; k <= 5; k++) {
        const log = logs[addDaysKey(periods[i].start, -k)];
        log?.symptoms.forEach((s) => seen.add(s));
        if (log?.mood && NEGATIVE_MOODS.includes(log.mood)) seen.add(`mood:${log.mood}`);
      }
      seen.forEach((s) => perCycle.set(s, (perCycle.get(s) ?? 0) + 1));
    }
    const cycles = periods.length - 1;
    const recurring = [...perCycle.entries()]
      .filter(([, c]) => c >= 2 && c / cycles >= 0.5)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([k]) => (k.startsWith('mood:') ? moodLabel(k.slice(5)) : symptomLabel(k)).toLowerCase());
    if (recurring.length) {
      out.push({
        id: 'pms-pattern',
        tone: 'attention',
        title: 'Повторяется перед месячными',
        text: `За несколько дней до месячных ты часто отмечаешь: ${recurring.join(', ')}. Похоже на проявления ПМС — в эти дни стоит запланировать больше отдыха.`,
        basis: basisOf(cycles, CYCLES),
        articleSlug: 'pms-help',
      });
    }
  }

  // 4. Длительность менструации
  const finished = periods.filter((p) => diffDays(p.end, today) > 1);
  if (finished.length >= 2 && stats.periodLength > 7) {
    out.push({
      id: 'long-period',
      tone: 'attention',
      title: 'Долгие месячные',
      text: `В среднем месячные длятся ${daysWord(stats.periodLength)}. Если они обычно дольше 7 дней — об этом стоит рассказать врачу.`,
      basis: basisOf(finished.length, ['менструации', 'менструаций', 'менструаций']),
      articleSlug: 'when-to-see-doctor',
    });
  }

  // 5. Сильная боль
  const severe = allLogs.filter((l) => l.pain === 'severe').length;
  if (severe >= 2) {
    out.push({
      id: 'severe-pain',
      tone: 'attention',
      title: 'Сильная боль',
      text: `Ты ${severe} ${plural(severe, ['раз', 'раза', 'раз'])} отмечала сильную боль. Сильная боль, которая мешает обычной жизни, — повод показаться гинекологу.`,
      articleSlug: 'period-pain',
    });
  }

  // 6. Сон и настроение
  const badSleep = allLogs.filter((l) => l.sleepQuality === 'bad' || (l.sleepHours != null && l.sleepHours < 6.5));
  if (badSleep.length >= 3) {
    const neg = badSleep.filter((l) => l.mood && NEGATIVE_MOODS.includes(l.mood)).length;
    if (neg / badSleep.length >= 0.6) {
      out.push({
        id: 'sleep-mood',
        tone: 'tip',
        title: 'Сон влияет на настроение',
        text: `В дни с плохим сном ты чаще отмечаешь тревожность или раздражение (${neg} из ${badSleep.length}). Попробуй ложиться в одно и то же время.`,
        basis: basisOf(badSleep.length, RECORDS),
        articleSlug: 'sleep-and-cycle',
      });
    }
  }

  // 7. Энергия по фазам
  if (n >= 2) {
    const high = allLogs.filter((l) => l.energy === 'high');
    if (high.length >= 3) {
      const foll = high.filter((l) => phaseOnDate(periods, l.date, stats) === 'follicular').length;
      if (foll / high.length >= 0.6) {
        out.push({
          id: 'energy-follicular',
          tone: 'positive',
          title: 'Пик энергии',
          text: 'Высокую энергию ты чаще всего отмечаешь в фолликулярной фазе — после месячных. Хорошее время для активных планов.',
          basis: basisOf(high.length, RECORDS),
          articleSlug: 'energy-phases',
        });
      }
    }
  }

  // 8. Рекомендация под текущую фазу
  const pred = predict(periodDays, profile, today);
  if (pred) {
    const a = articleForPhase(pred.phase);
    out.push({
      id: 'phase-tip',
      tone: 'tip',
      title: a.title,
      text: `Сейчас ${t.phases[pred.phase].toLowerCase()} фаза. ${a.description}`,
      articleSlug: a.slug,
    });
  }

  return out;
}
