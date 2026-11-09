import { Bell, ChevronRight } from 'lucide-react';
import { t } from '@/i18n';
import { useLunaStore } from '@/store/useLunaStore';
import type { NotificationSettings } from '@/types';
import { FlowerArt } from '@/components/art';
import { PageHeader, Toggle } from '@/components/ui';

type BoolKey = Exclude<keyof NotificationSettings, 'time'>;

export function NotificationsPage() {
  const n = useLunaStore((s) => s.notifications);
  const update = useLunaStore((s) => s.updateNotifications);
  const rows: { key: BoolKey; label: string }[] = [
    { key: 'periodReminder', label: t.notifications.period },
    { key: 'symptomReminder', label: t.notifications.symptoms },
    { key: 'tips', label: t.notifications.tips },
    { key: 'weeklyReport', label: t.notifications.weekly },
  ];

  return (
    <div>
      <PageHeader title={t.notifications.title} back />
      <div className="px-5">
        <div className="glass divide-y divide-plum-100/70 p-0">
          {rows.map((r) => (
            <div key={r.key} className="flex items-center justify-between px-4 py-3.5">
              <span className="text-[15px] font-medium">{r.label}</span>
              <Toggle checked={n[r.key]} onChange={(v) => update({ [r.key]: v })} label={r.label} />
            </div>
          ))}
        </div>

        <label className="glass mt-4 flex items-center justify-between px-4 py-3.5">
          <span className="text-[15px] font-semibold">{t.notifications.time}</span>
          <span className="flex items-center gap-1 text-[15px] text-ink-soft">
            <input
              type="time"
              value={n.time}
              onChange={(e) => e.target.value && update({ time: e.target.value })}
              className="bg-transparent text-right outline-none"
            />
            <ChevronRight size={18} className="text-ink-faint" />
          </span>
        </label>

        <p className="mt-3 px-1 text-[12.5px] text-ink-muted">{t.notifications.pending}</p>

        <div className="relative mt-5 overflow-hidden rounded-2.5xl bg-gradient-to-br from-plum-100 via-plum-200/70 to-rose-100 px-5 py-6 text-center shadow-card">
          <Bell size={30} className="mx-auto text-plum-600" strokeWidth={1.6} />
          <div className="mt-2 text-[16px] font-semibold text-ink">{t.notifications.cardTitle}</div>
          <div className="mt-1 text-[13.5px] text-ink-soft">{t.notifications.cardText}</div>
          <FlowerArt className="absolute -bottom-6 -right-4 h-28 w-28 opacity-90" />
        </div>
      </div>
    </div>
  );
}
