import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Cloud, CloudUpload, Download, FileText, History, ShieldCheck, Trash2 } from 'lucide-react';
import { t } from '@/i18n';
import { haptic } from '@/utils/feedback';
import { confirmDialog } from '@/app/telegram';
import { getSnapshot, useLunaStore } from '@/store/useLunaStore';
import { fmt, todayKey } from '@/utils/date';
import { deliverFile } from '@/utils/share';
import { backupNow, cloudStorage, useBackupStatus } from '@/features/backup/autoBackup';
import { loadBackup, removeBackup } from '@/features/backup/cloud';
import { ListRow, PageHeader, Toast } from '@/components/ui';

export function PrivacyPage() {
  const nav = useNavigate();
  const resetAll = useLunaStore((s) => s.resetAll);
  const importSnapshot = useLunaStore((s) => s.importSnapshot);
  const backup = useBackupStatus();
  const [toast, setToast] = useState<string | null>(null);
  const tB = t.backup;
  const inTelegram = !!cloudStorage();

  const flash = (text: string) => {
    setToast(text);
    setTimeout(() => setToast(null), 2200);
  };

  const exportData = () => {
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), ...getSnapshot() }, null, 2)], { type: 'application/json' });
    void deliverFile(blob, `luna-export-${todayKey()}.json`, 'LUNA');
  };

  const saveNow = async () => {
    const ok = await backupNow();
    if (ok) haptic.success();
    flash(ok ? tB.savedToast : tB.errorToast);
  };

  const restore = async () => {
    const cs = cloudStorage();
    if (!cs) return;
    const found = await loadBackup(cs).catch(() => null);
    if (!found) return flash(tB.notFound);
    const when = fmt(found.meta.savedAt.slice(0, 10), 'd MMMM');
    if (!(await confirmDialog(tB.confirmRestore(when)))) return;
    importSnapshot(found.snapshot);
    haptic.success();
    flash(tB.restoredToast);
  };

  const deleteAll = async () => {
    haptic.warning();
    if (!(await confirmDialog(t.privacy.confirmDelete))) return;
    const cs = cloudStorage();
    if (cs) await removeBackup(cs).catch(() => undefined);
    resetAll();
    nav('/welcome', { replace: true });
  };

  const status =
    !inTelegram ? tB.unavailable
    : backup.state === 'saving' ? tB.saving
    : backup.state === 'error' ? tB.error
    : backup.savedAt ? `${tB.savedAt} ${fmt(backup.savedAt.slice(0, 10), 'd MMM')}, ${new Date(backup.savedAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`
    : tB.never;

  return (
    <div>
      <PageHeader title={t.privacy.title} back />
      <div className="px-5">
        <div className="glass flex gap-3 p-4">
          <ShieldCheck size={22} className="shrink-0 text-plum-600" />
          <p className="text-[14px] leading-relaxed text-ink-soft">{t.privacy.text}</p>
        </div>

        <h2 className="h-section mb-2.5 mt-5 px-1">{tB.title}</h2>
        <div className="glass divide-y divide-plum-100/70 p-0">
          <div className="flex items-center gap-3 px-4 py-3.5">
            <Cloud size={20} className={inTelegram ? 'text-plum-600' : 'text-ink-faint'} />
            <div className="min-w-0 flex-1">
              <div className="text-[15px] text-ink">{tB.cloud}</div>
              <div className="text-[12px] text-ink-muted">{status}</div>
            </div>
          </div>
          {inTelegram && (
            <>
              <ListRow icon={<CloudUpload size={20} />} label={tB.saveNow} onClick={saveNow} />
              <ListRow icon={<History size={20} />} label={tB.restore} onClick={restore} />
            </>
          )}
        </div>
        <p className="mt-2 px-1 text-[12px] leading-snug text-ink-faint">{inTelegram ? tB.hint : tB.hintOutside}</p>

        <h2 className="h-section mb-2.5 mt-5 px-1">{t.privacy.files}</h2>
        <div className="glass divide-y divide-plum-100/70 p-0">
          <ListRow icon={<FileText size={20} />} label={t.report.open} onClick={() => nav('/report')} />
          <ListRow icon={<Download size={20} />} label={t.privacy.export} onClick={exportData} />
        </div>

        <div className="glass mt-5 p-0">
          <ListRow icon={<Trash2 size={20} />} label={t.privacy.delete} onClick={deleteAll} danger />
        </div>
        <p className="mt-2 px-1 text-[12px] text-ink-faint">{inTelegram ? t.privacy.deleteHintCloud : t.privacy.deleteHint}</p>
      </div>
      <Toast text={toast} />
    </div>
  );
}
