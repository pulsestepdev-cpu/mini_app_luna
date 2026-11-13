import { useMemo, useState } from 'react';
import { FileDown, Loader2 } from 'lucide-react';
import { t } from '@/i18n';
import { useLunaStore } from '@/store/useLunaStore';
import { buildReport, type ReportRange } from '@/features/report/report';
import { getTelegram } from '@/app/telegram';
import { daysWord, fmt, fmtRange, todayKey } from '@/utils/date';
import { deliverFile } from '@/utils/share';
import { haptic } from '@/utils/feedback';
import { Button, Card, PageHeader, Segmented, Toast, Toggle } from '@/components/ui';

const RANGES: ReportRange[] = ['3m', '6m', '1y'];

export function ReportPage() {
  const periodDays = useLunaStore((s) => s.periodDays);
  const logs = useLunaStore((s) => s.logs);
  const profile = useLunaStore((s) => s.profile);
  const intimacy = useLunaStore((s) => s.intimacy);
  const intimacyOn = useLunaStore((s) => s.prefs.intimacy !== false);
  const [withIntimacy, setWithIntimacy] = useState(false);
  const [range, setRange] = useState<ReportRange>('6m');
  const [withNotes, setWithNotes] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const today = todayKey();
  const r = useMemo(
    () => buildReport(periodDays, logs, profile, range, today, intimacyOn ? intimacy : {}),
    [periodDays, logs, profile, range, today, intimacy, intimacyOn],
  );
  const s = r.summary;
  const symptomLabel = (k: string, custom: boolean) => (custom ? k : (t.options.symptoms as Record<string, string>)[k] ?? k);

  const save = async () => {
    setBusy(true);
    try {
      const { renderReportPdf } = await import('@/features/report/pdf');
      const blob = await renderReportPdf(r, { notes: withNotes, intimacy: withIntimacy });
      const res = await deliverFile(blob, `LUNA-otchet-${today}.pdf`, t.report.title);
      if (res !== 'cancelled') haptic.success();
    } catch {
      setToast('Не получилось собрать PDF');
      setTimeout(() => setToast(null), 2200);
    } finally {
      setBusy(false);
    }
  };

  const rows: [string, string][] = [
    [t.analytics.avgCycle, s.avgCycle != null ? daysWord(s.avgCycle) : '—'],
    [t.analytics.range, s.minCycle != null ? `${s.minCycle}–${daysWord(s.maxCycle!)}` : '—'],
    ['регулярность', s.regular == null ? 'мало данных' : s.regular ? t.analytics.regular : t.analytics.irregular],
    [t.analytics.avgPeriod, s.avgPeriod != null ? `${s.avgPeriod} дн.` : '—'],
    ['последние месячные', s.lastPeriodStart ? fmt(s.lastPeriodStart, 'd MMMM') : '—'],
    ['следующие', s.next ? (s.next.late ? `задержка ${daysWord(s.next.late)}` : `~${fmtRange(s.next.start, s.next.end)}`) : '—'],
  ];

  return (
    <div>
      <PageHeader title={t.report.title} back />
      <div className="px-5">
        <p className="-mt-1 mb-4 text-[14px] leading-snug text-ink-muted">{t.report.subtitle}</p>
        <Segmented value={range} onChange={setRange} options={RANGES.map((v) => ({ value: v, label: t.analytics.periods[v] }))} />

        {/* Предпросмотр — его можно просто показать врачу с экрана */}
        <Card className="mt-4">
          <div className="text-[12px] text-ink-muted">
            {t.report.period}: {fmt(r.from, 'd MMM yyyy')} — {fmt(r.to, 'd MMM yyyy')}
          </div>
          <dl className="mt-2 divide-y divide-plum-100/70">
            {rows.map(([k, v]) => (
              <div key={k} className="flex items-baseline justify-between gap-3 py-2">
                <dt className="text-[13px] text-ink-muted first-letter:uppercase">{k}</dt>
                <dd className="text-right text-[14px] font-semibold text-ink">{v}</dd>
              </div>
            ))}
          </dl>
        </Card>

        {r.rows.length > 0 && (
          <Card className="mt-3 p-0">
            <div className="grid grid-cols-[1.3fr_1fr_1fr] gap-2 border-b border-plum-100/70 px-4 py-2.5 text-[11.5px] font-semibold uppercase tracking-wide text-ink-muted">
              <span>Начало</span>
              <span>Месячные</span>
              <span>Цикл</span>
            </div>
            {r.rows.map((row) => (
              <div key={row.start} className="grid grid-cols-[1.3fr_1fr_1fr] gap-2 px-4 py-2 text-[13.5px] tabular-nums">
                <span className="text-ink">{fmt(row.start, 'd MMM yyyy')}</span>
                <span className="text-ink-soft">{row.periodLength != null ? daysWord(row.periodLength) : 'идут'}</span>
                <span className="text-ink-soft">{row.cycleLength != null ? daysWord(row.cycleLength) : '—'}</span>
              </div>
            ))}
          </Card>
        )}

        {r.symptoms.length > 0 && (
          <Card className="mt-3">
            <div className="mb-1.5 text-[13px] font-semibold text-ink">{t.analytics.symptoms}</div>
            <p className="text-[13.5px] leading-relaxed text-ink-soft">
              {r.symptoms
                .slice(0, 8)
                .map((x) => `${symptomLabel(x.key, x.custom)} (${x.count})`)
                .join(', ')}
            </p>
          </Card>
        )}

        <div className="glass mt-3 flex items-center gap-3 px-4 py-3.5">
          <div className="min-w-0 flex-1">
            <div className="text-[15px] text-ink">Включить заметки</div>
            <div className="text-[12px] text-ink-muted">Твои личные заметки попадут в PDF ({r.notes.length})</div>
          </div>
          <Toggle checked={withNotes} onChange={setWithNotes} label="Включить заметки" />
        </div>

        {r.intimacy.days > 0 && (
          <div className="glass mt-3 flex items-center gap-3 px-4 py-3.5">
            <div className="min-w-0 flex-1">
              <div className="text-[15px] text-ink">{t.intimacy.report}</div>
              <div className="text-[12px] text-ink-muted">{t.intimacy.reportHint}</div>
            </div>
            <Toggle checked={withIntimacy} onChange={setWithIntimacy} label={t.intimacy.report} />
          </div>
        )}

        <Button className="mt-5" onClick={save} disabled={busy}>
          {busy ? <Loader2 size={18} className="animate-spin" /> : <FileDown size={18} />}
          {busy ? t.report.preparing : t.report.download}
        </Button>
        <p className="mt-3 px-1 text-[12px] leading-snug text-ink-faint">
          {t.report.note} {getTelegram() ? t.report.tgNote : ''}
        </p>
      </div>
      <Toast text={toast} />
    </div>
  );
}
