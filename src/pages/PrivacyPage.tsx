import { useNavigate } from 'react-router-dom';
import { Download, ShieldCheck, Trash2 } from 'lucide-react';
import { t } from '@/i18n';
import { haptic } from '@/utils/feedback';
import { confirmDialog } from '@/app/telegram';
import { useLunaStore } from '@/store/useLunaStore';
import { todayKey } from '@/utils/date';
import { ListRow, PageHeader } from '@/components/ui';

export function PrivacyPage() {
  const nav = useNavigate();
  const resetAll = useLunaStore((s) => s.resetAll);

  const exportData = () => {
    const { profile, periodDays, logs, notifications } = useLunaStore.getState();
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), profile, periodDays, logs, notifications }, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `luna-export-${todayKey()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const deleteAll = async () => {
    haptic.warning();
    if (!(await confirmDialog(t.privacy.confirmDelete))) return;
    resetAll();
    nav('/welcome', { replace: true });
  };

  return (
    <div>
      <PageHeader title={t.privacy.title} back />
      <div className="px-5">
        <div className="glass flex gap-3 p-4">
          <ShieldCheck size={22} className="shrink-0 text-plum-600" />
          <p className="text-[14px] leading-relaxed text-ink-soft">{t.privacy.text}</p>
        </div>
        <div className="glass mt-4 divide-y divide-plum-100/70 p-0">
          <ListRow icon={<Download size={20} />} label={t.privacy.export} onClick={exportData} />
          <ListRow icon={<Trash2 size={20} />} label={t.privacy.delete} onClick={deleteAll} danger />
        </div>
        <p className="mt-3 px-1 text-[12px] text-ink-faint">{t.privacy.deleteHint}</p>
      </div>
    </div>
  );
}
