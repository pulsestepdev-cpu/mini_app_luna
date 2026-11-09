import { ExternalLink } from 'lucide-react';
import { t } from '@/i18n';
import { getTelegram } from '@/app/telegram';
import { isIOS } from '@/features/profile/homeScreen';
import { Button, Sheet } from '@/components/ui';

/** Если Telegram не показал окно «На главный экран» — запасной путь через браузер */
export function HomeScreenHelp({ open, onClose }: { open: boolean; onClose: () => void }) {
  const h = t.homeHelp;
  const ios = isIOS();
  const openInstallPage = () => {
    const url = new URL('./add/', window.location.href.split('#')[0]).toString();
    const tg = getTelegram();
    if (tg?.openLink) tg.openLink(url, { try_instant_view: false });
    else window.open(url, '_blank');
  };

  return (
    <Sheet open={open} onClose={onClose} title={h.title}>
      <p className="text-[14px] leading-relaxed text-ink-muted">{h.intro}</p>
      {!ios && (
        <div className="glass-strong mt-4 p-4">
          <div className="text-[13px] font-semibold uppercase tracking-wide text-plum-600">{h.androidQuickTitle}</div>
          <p className="mt-1.5 text-[14.5px] leading-relaxed text-ink-soft">{h.androidQuick}</p>
        </div>
      )}
      <div className="glass-strong mt-3 p-4">
        <div className="text-[13px] font-semibold uppercase tracking-wide text-plum-600">{ios ? h.iosTitle : h.browserTitle}</div>
        <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-[14.5px] leading-relaxed text-ink-soft">
          {(ios ? h.iosSteps : h.androidSteps).map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
      </div>
      <Button className="mt-4" onClick={openInstallPage}>
        <ExternalLink size={18} /> {h.openPage}
      </Button>
      <p className="mt-2.5 text-center text-[12px] text-ink-faint">{h.note}</p>
    </Sheet>
  );
}
