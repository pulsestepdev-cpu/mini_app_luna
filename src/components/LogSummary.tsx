import { t } from '@/i18n';
import type { DailyLog } from '@/types';

/** Краткая сводка записи самочувствия за день */
export function LogSummary({ log }: { log: DailyLog }) {
  const o = t.options;
  const items: { label: string; value: string }[] = [];
  if (log.mood) items.push({ label: t.checkin.mood, value: o.mood[log.mood] });
  if (log.energy) items.push({ label: t.checkin.energy, value: o.energy[log.energy] });
  if (log.pain) items.push({ label: t.checkin.pain, value: o.pain[log.pain] });
  if (log.sleepHours != null || log.sleepQuality) {
    const parts = [log.sleepHours != null ? `${log.sleepHours} ${t.checkin.hours}` : '', log.sleepQuality ? o.sleepQuality[log.sleepQuality] : ''];
    items.push({ label: t.checkin.sleep, value: parts.filter(Boolean).join(', ') });
  }
  if (log.appetite) items.push({ label: t.checkin.appetite, value: o.appetite[log.appetite] });
  const symptoms = [...log.symptoms.map((s) => (o.symptoms as Record<string, string>)[s] ?? s), ...log.customSymptoms];

  return (
    <div className="space-y-2.5">
      {items.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {items.map((i) => (
            <div key={i.label} className="rounded-xl bg-surface/80 px-3 py-2">
              <div className="text-[11.5px] text-ink-muted">{i.label}</div>
              <div className="text-[14px] font-medium">{i.value}</div>
            </div>
          ))}
        </div>
      )}
      {symptoms.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {symptoms.map((s) => (
            <span key={s} className="rounded-full bg-plum-100 px-3 py-1 text-[13px] text-plum-800">
              {s}
            </span>
          ))}
        </div>
      )}
      {log.notes && <p className="rounded-xl bg-surface/80 px-3 py-2 text-[14px] italic text-ink-soft">«{log.notes}»</p>}
    </div>
  );
}
