import { useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarRange, ChevronRight, Droplet, FileText, Heart, Hourglass, Repeat, ShieldOff, Sparkles } from 'lucide-react';
import { t } from '@/i18n';
import { useLunaStore } from '@/store/useLunaStore';
import { computeAnalytics, type RangeKey } from '@/features/analytics/stats';
import { plural, todayKey } from '@/utils/date';
import { Card, EmptyState, PageHeader, Segmented, SectionTitle } from '@/components/ui';
import { LengthBars } from '@/components/LengthBars';
import { Illustration } from '@/components/art';
import { intimacyStats, LIBIDOS, PROTECTIONS } from '@/features/intimacy/intimacy';

const RANGES: RangeKey[] = ['1m', '3m', '6m', '1y'];

export function AnalyticsPage() {
  const nav = useNavigate();
  const periodDays = useLunaStore((s) => s.periodDays);
  const logs = useLunaStore((s) => s.logs);
  const [range, setRange] = useState<RangeKey>('6m');
  const today = todayKey();
  const a = useMemo(() => computeAnalytics(periodDays, logs, range, today), [periodDays, logs, range, today]);
  const intimacy = useLunaStore((s) => s.intimacy);
  const intimacyOn = useLunaStore((s) => s.prefs.intimacy !== false);
  const is = useMemo(() => intimacyStats(intimacy, a.from, today), [intimacy, a.from, today]);
  const ti = t.intimacy;
  const protectionRows = [...PROTECTIONS, 'unknown' as const]
    .map((k) => ({ k, label: k === 'unknown' ? ti.unknown : ti.protection[k], count: is.protection[k] }))
    .filter((r) => r.count > 0);
  const libidoRows = LIBIDOS.map((k) => ({ k, label: ti.libidoLevel[k], count: is.libido[k] })).filter((r) => r.count > 0);
  const showIntimacy = intimacyOn && (is.days > 0 || libidoRows.length > 0);
  const tA = t.analytics;
  const symptomLabel = (k: string, custom: boolean) => (custom ? k : (t.options.symptoms as Record<string, string>)[k] ?? k);
  const maxSym = a.symptomFreq[0]?.count ?? 1;
  const maxMood = a.moodFreq[0]?.count ?? 1;

  return (
    <div>
      <PageHeader title={tA.title} />
      <div className="px-5">
        <Segmented value={range} onChange={setRange} options={RANGES.map((r) => ({ value: r, label: tA.periods[r] }))} />

        {/* Инсайты */}
        <Card className="mt-4 flex items-center gap-3" onClick={() => nav('/insights')}>
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-500">
            <Sparkles size={20} />
          </span>
          <div className="flex-1">
            <div className="text-[15px] font-semibold">{tA.insights}</div>
            <div className="text-[12.5px] text-ink-muted">{tA.insightsSub}</div>
          </div>
          <ChevronRight size={18} className="text-ink-faint" />
        </Card>

        {/* Отчёт для врача */}
        <Card className="mt-3 flex items-center gap-3" onClick={() => nav('/report')}>
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-plum-100 text-plum-600">
            <FileText size={20} />
          </span>
          <div className="flex-1">
            <div className="text-[15px] font-semibold">{t.report.title}</div>
            <div className="text-[12.5px] text-ink-muted">PDF для приёма у гинеколога</div>
          </div>
          <ChevronRight size={18} className="text-ink-faint" />
        </Card>

        {/* Столбчатые диаграммы */}
        <SectionTitle>{tA.cycles}</SectionTitle>
        {a.cyclePoints.length >= 2 ? (
          <LengthBars
            title={tA.cycleLength}
            info={tA.cycleLengthInfo}
            points={a.cyclePoints}
            average={a.avgCycle}
            itemLabel={tA.cycleItem}
            badge={a.regular == null ? null : { ok: a.regular, label: a.regular ? tA.regular : tA.irregular }}
            caption={`${tA.basedOn} ${a.cyclePoints.length} ${plural(a.cyclePoints.length, tA.cyclesWord)}`}
          />
        ) : (
          <EmptyState art={<Illustration name="moon" className="h-28 w-28" />} title={tA.notEnough} text={range === '1y' ? tA.notEnoughText : `${tA.notEnoughText} Попробуй выбрать период побольше.`} />
        )}
        {a.periodPoints.length >= 2 && (
          <div className="mt-3">
            <LengthBars
              title={tA.periodLength}
              info={tA.periodLengthInfo}
              points={a.periodPoints}
              average={a.avgPeriod != null ? Math.round(a.avgPeriod) : null}
              itemLabel={tA.periodItem}
            />
          </div>
        )}

        {/* Статистика */}
        <SectionTitle>{tA.stats}</SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          <Stat icon={<Droplet size={18} />} tone="rose" value={String(a.periodsCount)} label={tA.periodsCount} />
          <Stat icon={<CalendarRange size={18} />} tone="plum" value={a.avgCycle != null ? `${a.avgCycle} дн.` : '—'} label={tA.avgCycle} />
          <Stat icon={<Hourglass size={18} />} tone="amber" value={a.avgPeriod != null ? `${a.avgPeriod} дн.` : '—'} label={tA.avgPeriod} />
          <Stat icon={<Repeat size={18} />} tone="sky" value={a.minCycle != null ? `${a.minCycle}–${a.maxCycle}` : '—'} label={tA.range} />
        </div>

        {/* Симптомы */}
        <SectionTitle>{tA.symptoms}</SectionTitle>
        <Card>
          {a.symptomFreq.length ? (
            <div className="space-y-3">
              {a.symptomFreq.slice(0, 6).map((s) => (
                <Bar key={s.key} label={symptomLabel(s.key, s.custom)} count={s.count} max={maxSym} />
              ))}
            </div>
          ) : (
            <p className="text-center text-[14px] text-ink-muted">{tA.noSymptoms}</p>
          )}
        </Card>

        {/* Настроение */}
        {a.moodFreq.length > 0 && (
          <>
            <SectionTitle>{tA.mood}</SectionTitle>
            <Card>
              <div className="space-y-3">
                {a.moodFreq.map((m) => (
                  <Bar key={m.key} label={t.options.mood[m.key]} count={m.count} max={maxMood} />
                ))}
              </div>
            </Card>
          </>
        )}
        {/* Близость — только на устройстве, на сервер не уходит */}
        {showIntimacy && (
          <>
            <SectionTitle>{ti.title}</SectionTitle>
            <div className="grid grid-cols-2 gap-3">
              <Stat icon={<Heart size={18} />} tone="rose" value={String(is.days)} label={ti.daysCount} />
              <Stat icon={<ShieldOff size={18} />} tone="amber" value={String(is.protection.unprotected + is.protection.withdrawal)} label={ti.unprotectedCount} />
            </div>
            {(protectionRows.length > 0 || libidoRows.length > 0) && (
              <Card className="mt-3">
                {protectionRows.length > 0 && (
                  <>
                    <div className="mb-2.5 text-[13px] font-semibold text-ink-soft">{ti.breakdown}</div>
                    <div className="space-y-3">
                      {protectionRows.map((r) => (
                        <Bar key={r.k} label={r.label} count={r.count} max={is.days} />
                      ))}
                    </div>
                  </>
                )}
                {libidoRows.length > 0 && (
                  <>
                    <div className={`mb-2.5 text-[13px] font-semibold text-ink-soft ${protectionRows.length ? 'mt-5' : ''}`}>{ti.libidoTitle}</div>
                    <div className="space-y-3">
                      {libidoRows.map((r) => (
                        <Bar key={r.k} label={r.label} count={r.count} max={Math.max(...libidoRows.map((x) => x.count))} />
                      ))}
                    </div>
                  </>
                )}
              </Card>
            )}
            <p className="mt-2 px-1 text-[11.5px] leading-snug text-ink-faint">{ti.notContraception}</p>
          </>
        )}

        <p className="mt-3 px-1 text-[11.5px] text-ink-faint">
          {tA.basedOn} {a.logsCount} {plural(a.logsCount, tA.recordsWord)}. {t.common.disclaimer}
        </p>
      </div>
    </div>
  );
}

const TONES = {
  rose: 'bg-rose-100 text-rose-500',
  plum: 'bg-plum-100 text-plum-600',
  amber: 'bg-amber-100 text-amber-500',
  sky: 'bg-sky-100 text-sky-500',
};

function Stat({ icon, value, label, tone }: { icon: ReactNode; value: string; label: string; tone: keyof typeof TONES }) {
  return (
    <div className="glass min-w-0 p-3.5">
      <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${TONES[tone]}`}>{icon}</span>
      <div className="mt-2.5 whitespace-nowrap text-[19px] font-bold leading-tight tabular-nums">{value}</div>
      <div className="mt-0.5 text-[12px] leading-tight text-ink-muted [overflow-wrap:anywhere]">{label}</div>
    </div>
  );
}

function Bar({ label, count, max }: { label: string; count: number; max: number }) {
  return (
    <div>
      <div className="mb-1 flex justify-between gap-3 text-[13px]">
        <span className="min-w-0 text-ink [overflow-wrap:anywhere]">{label}</span>
        <span className="shrink-0 text-ink-muted">
          {count} {plural(count, ['раз', 'раза', 'раз'])}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-plum-100">
        <div className="h-full rounded-full bg-gradient-to-r from-plum-300 to-plum-600" style={{ width: `${(count / max) * 100}%` }} />
      </div>
    </div>
  );
}
