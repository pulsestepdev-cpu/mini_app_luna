import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { t } from '@/i18n';
import { useLunaStore } from '@/store/useLunaStore';
import { StarField } from '@/components/art';
import { Button, Sheet } from '@/components/ui';
import { cloudStorage } from '@/features/backup/autoBackup';
import { loadBackup } from '@/features/backup/cloud';
import type { Snapshot } from '@/store/useLunaStore';
import { fmt, plural } from '@/utils/date';
import { haptic } from '@/utils/feedback';

export function WelcomePage() {
  const nav = useNavigate();
  const onboarded = useLunaStore((s) => s.profile.onboarded);
  const importSnapshot = useLunaStore((s) => s.importSnapshot);
  const [found, setFound] = useState<{ snapshot: Snapshot; when: string; logs: number } | null>(null);

  // Новая установка в Telegram: если в облаке есть копия — предложить вернуть
  useEffect(() => {
    const cs = cloudStorage();
    if (!cs || onboarded) return;
    loadBackup(cs)
      .then((b) => b?.snapshot.profile.onboarded && setFound({ snapshot: b.snapshot, when: fmt(b.meta.savedAt.slice(0, 10), 'd MMMM'), logs: b.meta.logs }))
      .catch(() => undefined);
  }, [onboarded]);

  const restore = () => {
    if (!found) return;
    importSnapshot(found.snapshot);
    haptic.success();
    nav('/', { replace: true });
  };

  return (
    <div className="relative mx-auto flex min-h-full max-w-[440px] flex-col overflow-hidden bg-plum-900 text-white">
      {/* Фон: сгенерированная иллюстрация, при её отсутствии — градиент */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: "url('./art/welcome-bg.png'), linear-gradient(180deg, #3B2559 0%, #5E3896 55%, #B9A3E0 100%)",
        }}
      />
      {/* Дополнительное свечение луны и затемнение под кнопкой */}
      <div className="absolute left-1/2 top-[6%] h-56 w-56 rounded-full bg-[#F6D9F8]/20 blur-3xl" />
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-plum-900/55 to-transparent" />
      <StarField count={14} className="opacity-70" />

      <div className="relative flex flex-1 flex-col items-center px-8 pt-[38vh] text-center">
        <h1 className="animate-fadeUp font-serif text-[64px] font-medium leading-none tracking-[0.06em] drop-shadow-[0_2px_20px_rgba(255,220,255,0.35)]">
          LUNA
        </h1>
        <p className="mt-5 animate-fadeUp whitespace-pre-line text-[16px] leading-relaxed text-white/90 [animation-delay:120ms]">
          {t.welcome.tagline}
        </p>
      </div>

      <div className="relative px-8 pb-[calc(env(safe-area-inset-bottom)+36px)]">
        <Button variant="light" onClick={() => nav(onboarded ? '/' : '/setup')} className="text-plum-800">
          {t.welcome.start}
        </Button>
        <div className="mt-5 flex flex-col items-center gap-2 text-[13px] text-white/80">
          <span className="rounded-full bg-white/15 px-3 py-1 backdrop-blur">🇷🇺 {t.welcome.language}</span>
          <span className="flex items-center gap-1.5 text-white/65">
            <Lock size={12} /> {t.welcome.privacy}
          </span>
        </div>
      </div>
      <Sheet open={!!found} onClose={() => setFound(null)} title={t.backup.foundTitle}>
        {found && (
          <>
            <p className="text-[15px] leading-relaxed text-ink-soft">
              {t.backup.foundText(found.when, `${found.logs} ${plural(found.logs, ['запись', 'записи', 'записей'])} о самочувствии`)}
            </p>
            <Button className="mt-5" onClick={restore}>
              {t.backup.restoreYes}
            </Button>
            <Button variant="ghost" className="mt-2.5" onClick={() => setFound(null)}>
              {t.backup.restoreNo}
            </Button>
          </>
        )}
      </Sheet>
    </div>
  );
}
