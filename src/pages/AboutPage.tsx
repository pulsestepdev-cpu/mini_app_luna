import { t } from '@/i18n';
import { ALGORITHM_VERSION } from '@/features/cycle/engine';
import { PageHeader } from '@/components/ui';

export function AboutPage() {
  return (
    <div>
      <PageHeader title={t.about.title} back />
      <div className="space-y-4 px-5">
        <div className="glass p-5 text-center">
          <div className="font-serif text-[44px] font-medium tracking-[0.06em] text-plum-700">LUNA</div>
          <p className="mt-2 text-[14px] leading-relaxed text-ink-soft">{t.about.text}</p>
        </div>
        <div className="glass p-4 text-[13.5px] leading-relaxed text-ink-soft">{t.about.medical}</div>
        <p className="text-center text-[12px] text-ink-faint">
          {t.about.version} 0.1.0 · {ALGORITHM_VERSION}
        </p>
      </div>
    </div>
  );
}
