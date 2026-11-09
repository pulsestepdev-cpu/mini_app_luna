import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { addMonths, endOfMonth, endOfWeek, startOfMonth, startOfWeek } from 'date-fns';
import { CalendarCheck, ChevronLeft, ChevronRight, Droplet, Flower2 } from 'lucide-react';
import { t } from '@/i18n';
import { useLunaStore } from '@/store/useLunaStore';
import { useCycle } from '@/features/cycle/useCycle';
import { buildDayMarks, type DayMarks } from '@/features/cycle/engine';
import type { DateKey, Flow } from '@/types';
import { addDaysKey, daysWord, diffDays, fmt, fmtRange, toKey } from '@/utils/date';
import { cn } from '@/utils/cn';
import { haptic } from '@/utils/feedback';
import { Button, Card, Chip, PageHeader, Sheet, Toggle } from '@/components/ui';
import { LogSummary } from '@/components/LogSummary';

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function CalendarPage() {
  const { prediction: p, today, periodDays, profile } = useCycle();
  const logs = useLunaStore((s) => s.logs);
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selected, setSelected] = useState<DateKey | null>(null);

  const gridStart = toKey(startOfWeek(month, { weekStartsOn: 1 }));
  const gridEnd = toKey(endOfWeek(endOfMonth(month), { weekStartsOn: 1 }));
  const days = useMemo(() => {
    const out: DateKey[] = [];
    for (let d = gridStart; d <= gridEnd; d = addDaysKey(d, 1)) out.push(d);
    return out;
  }, [gridStart, gridEnd]);
  const marks = useMemo(
    () => buildDayMarks(periodDays, profile, today, gridStart, gridEnd),
    [periodDays, profile, today, gridStart, gridEnd],
  );
  const monthKey = toKey(month).slice(0, 7);

  return (
    <div>
      <PageHeader
        title={t.calendar.title}
        right={
          <button onClick={() => setMonth(startOfMonth(new Date()))} className="tap rounded-full p-2 text-ink-soft" aria-label={t.calendar.today}>
            <CalendarCheck size={22} />
          </button>
        }
      />
      <div className="px-5">
        <Card className="px-3 pb-3 pt-4">
          {/* Переключение месяца */}
          <div className="mb-3 flex items-center justify-between px-1">
            <button onClick={() => { haptic.select(); setMonth(addMonths(month, -1)); }} className="tap rounded-full p-1.5 text-ink-soft" aria-label="Предыдущий месяц">
              <ChevronLeft size={22} />
            </button>
            <div className="text-[16px] font-semibold">{capitalize(fmt(toKey(month), 'LLLL yyyy'))}</div>
            <button onClick={() => { haptic.select(); setMonth(addMonths(month, 1)); }} className="tap rounded-full p-1.5 text-ink-soft" aria-label="Следующий месяц">
              <ChevronRight size={22} />
            </button>
          </div>

          <div className="grid grid-cols-7 text-center text-[12px] text-ink-muted">
            {t.calendar.weekdays.map((w) => (
              <div key={w} className="pb-2">
                {w}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-y-1">
            {days.map((d) => (
              <DayCell
                key={d}
                date={d}
                marks={marks[d]}
                inMonth={d.startsWith(monthKey)}
                isToday={d === today}
                hasLog={!!logs[d]}
                onClick={() => setSelected(d)}
              />
            ))}
          </div>

          {/* Легенда */}
          <div className="mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11.5px] text-ink-muted">
            <Legend className="bg-rose-400">{t.calendar.legendPeriod}</Legend>
            <Legend className="border border-dashed border-rose-400 bg-rose-100">{t.calendar.legendPredicted}</Legend>
            <Legend className="bg-sky-500">{t.calendar.legendFertile}</Legend>
            <Legend className="bg-amber-300">{t.calendar.legendPms}</Legend>
          </div>
        </Card>

        {/* Прогноз */}
        <h2 className="h-section mb-2.5 mt-5 px-1">{t.calendar.forecast}</h2>
        {p ? (
          <div className="space-y-3">
            <Card className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-rose-100 text-rose-500">
                <Droplet size={20} fill="currentColor" fillOpacity={0.3} />
              </span>
              <div className="flex-1">
                <div className="text-[14px] text-ink-soft">{t.calendar.nextPeriod}</div>
                <div className="text-[15px] font-semibold">
                  {p.isLate ? `${t.home.late} ${daysWord(p.lateBy)}` : `${t.home.inDays}${daysWord(p.daysUntilNext)}`}
                </div>
                <div className="text-[12.5px] text-ink-muted">({fmtRange(p.rangeStart, p.rangeEnd)})</div>
              </div>
            </Card>
            <Card className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-sky-100 text-sky-500">
                <Flower2 size={20} />
              </span>
              <div className="flex-1">
                <div className="text-[14px] text-ink-soft">{t.calendar.ovulation}</div>
                <div className="text-[15px] font-semibold">
                  {t.calendar.ovulationApprox} {fmtRange(addDaysKey(p.ovulation, -1), addDaysKey(p.ovulation, 1))}
                </div>
              </div>
            </Card>
            <p className="px-2 text-[11.5px] leading-snug text-ink-faint">{t.calendar.fertileWarning}</p>
          </div>
        ) : (
          <Card className="text-center text-[14px] text-ink-muted">{t.calendar.noForecast}</Card>
        )}
      </div>

      <DaySheet date={selected} marks={selected ? marks[selected] : undefined} onClose={() => setSelected(null)} />
    </div>
  );
}

function Legend({ className, children }: { className: string; children: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn('h-2.5 w-2.5 rounded-full', className)} />
      {children}
    </span>
  );
}

function DayCell({ date, marks, inMonth, isToday, hasLog, onClick }: { date: DateKey; marks?: DayMarks; inMonth: boolean; isToday: boolean; hasLog: boolean; onClick: () => void }) {
  const m = marks ?? {};
  let bg = '';
  if (m.period) bg = 'bg-rose-200 text-rose-600 font-semibold';
  else if (m.predictedPeriod) bg = 'border border-dashed border-rose-400 bg-rose-100/60 text-rose-600';
  else if (m.ovulation) bg = 'bg-sky-200 text-sky-500 font-semibold ring-1 ring-sky-500/40';
  else if (m.fertile) bg = 'bg-sky-100 text-sky-500';
  else if (m.pms) bg = 'bg-amber-100 text-amber-500';

  return (
    <button onClick={() => { haptic.tap('soft'); onClick(); }} className={cn('tap flex flex-col items-center py-0.5', !inMonth && 'opacity-35')}>
      <span
        className={cn(
          'flex h-9 w-9 items-center justify-center rounded-full text-[14px]',
          bg,
          isToday && 'bg-gradient-to-b from-plum-500 to-plum-700 font-bold text-white shadow-soft ring-0 border-0',
        )}
      >
        {Number(date.slice(8))}
      </span>
      <span className={cn('mt-0.5 h-1 w-1 rounded-full', hasLog ? 'bg-plum-500' : 'bg-transparent')} />
    </button>
  );
}

const FLOWS: Flow[] = ['spotting', 'light', 'medium', 'heavy'];

function DaySheet({ date, marks, onClose }: { date: DateKey | null; marks?: DayMarks; onClose: () => void }) {
  const nav = useNavigate();
  const today = useCycle().today;
  const flow = useLunaStore((s) => (date ? s.periodDays[date] : undefined));
  const log = useLunaStore((s) => (date ? s.logs[date] : undefined));
  const setPeriodDay = useLunaStore((s) => s.setPeriodDay);
  if (!date) return null;
  const future = diffDays(today, date) > 0;
  const m = marks ?? {};

  const notes: string[] = [];
  if (m.predictedPeriod) notes.push(t.calendar.predictedPeriod);
  if (m.ovulation) notes.push(t.calendar.ovulationDay);
  else if (m.fertile) notes.push(t.calendar.fertileDay);
  if (m.pms) notes.push(t.calendar.pmsDay);

  return (
    <Sheet open onClose={onClose} title={capitalize(fmt(date, 'd MMMM, EEEE'))}>
      {notes.length > 0 && (
        <div className="mb-4 space-y-1.5">
          {notes.map((n) => (
            <div key={n} className="rounded-xl bg-plum-50 px-3 py-2 text-[13.5px] text-ink-soft">
              {n}
            </div>
          ))}
        </div>
      )}

      {future ? (
        <p className="mb-2 text-[14px] text-ink-muted">{t.calendar.futureDay}</p>
      ) : (
        <>
          <div className="glass-strong mb-4 p-4">
            <div className="flex items-center justify-between">
              <span className="text-[15px] font-medium">{t.calendar.dayPeriod}</span>
              <Toggle checked={!!flow} onChange={(v) => setPeriodDay(date, v ? 'medium' : null)} label={t.calendar.dayPeriod} />
            </div>
            {flow && (
              <div className="mt-3">
                <div className="mb-2 text-[12.5px] text-ink-muted">{t.calendar.flow}</div>
                <div className="flex flex-wrap gap-2">
                  {FLOWS.map((f) => (
                    <Chip key={f} active={flow === f} onClick={() => setPeriodDay(date, f)} className="px-3 py-2 text-[13px]">
                      {t.options.flow[f]}
                    </Chip>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="mb-2 text-[13px] font-semibold text-ink-soft">{t.calendar.dayLog}</div>
          {log ? <LogSummary log={log} /> : <p className="text-[14px] text-ink-muted">{t.calendar.noLog}</p>}
          <Button variant={log ? 'soft' : 'primary'} className="mt-4" onClick={() => nav(`/checkin?date=${date}`)}>
            {log ? t.calendar.editLog : t.calendar.addLog}
          </Button>
        </>
      )}
    </Sheet>
  );
}

