import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowRight, Info, Lightbulb, Star } from 'lucide-react';
import { t } from '@/i18n';
import { useLunaStore } from '@/store/useLunaStore';
import { buildInsights, type Insight, type InsightTone } from '@/features/insights/rules';
import { cn } from '@/utils/cn';
import { EmptyState, PageHeader, SectionTitle } from '@/components/ui';
import { Illustration } from '@/components/art';

const ICONS: Record<InsightTone, { icon: typeof Star; cls: string }> = {
  positive: { icon: Star, cls: 'bg-amber-100 text-amber-500' },
  attention: { icon: AlertTriangle, cls: 'bg-rose-100 text-rose-500' },
  tip: { icon: Lightbulb, cls: 'bg-amber-100 text-amber-500' },
  info: { icon: Info, cls: 'bg-sky-100 text-sky-500' },
};

export function InsightsPage() {
  const periodDays = useLunaStore((s) => s.periodDays);
  const logs = useLunaStore((s) => s.logs);
  const profile = useLunaStore((s) => s.profile);
  const insights = useMemo(() => buildInsights(periodDays, logs, profile), [periodDays, logs, profile]);

  const main = insights.filter((i) => i.tone === 'positive' || i.tone === 'info');
  const attention = insights.filter((i) => i.tone === 'attention');
  const tips = insights.filter((i) => i.tone === 'tip');
  const onlyTip = main.length + attention.length === 0;

  return (
    <div>
      <PageHeader title={t.insights.title} back />
      <div className="space-y-3 px-5">
        {onlyTip && <EmptyState art={<Illustration name="seedling" className="h-32 w-24" />} title={t.analytics.notEnough} text={t.insights.empty} />}
        {main.map((i) => <InsightCard key={i.id} insight={i} />)}
        {attention.length > 0 && (
          <>
            <SectionTitle>{t.insights.attention}</SectionTitle>
            {attention.map((i) => <InsightCard key={i.id} insight={i} />)}
          </>
        )}
        {tips.length > 0 && (
          <>
            <SectionTitle>{t.insights.tips}</SectionTitle>
            {tips.map((i) => <InsightCard key={i.id} insight={i} />)}
          </>
        )}
        <p className="px-1 pt-2 text-[11.5px] text-ink-faint">{t.common.disclaimer}</p>
      </div>
    </div>
  );
}

function InsightCard({ insight }: { insight: Insight }) {
  const nav = useNavigate();
  const { icon: Icon, cls } = ICONS[insight.tone];
  return (
    <div className="glass p-4">
      <div className="flex gap-3">
        <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full', cls)}>
          <Icon size={20} />
        </span>
        <div className="flex-1">
          <div className="text-[15px] font-semibold">{insight.title}</div>
          <p className="mt-1 text-[13.5px] leading-relaxed text-ink-soft">{insight.text}</p>
          {insight.basis && <p className="mt-1.5 text-[11.5px] text-ink-faint">{insight.basis}</p>}
        </div>
      </div>
      {insight.articleSlug && (
        <button
          onClick={() => nav(`/articles/${insight.articleSlug}`)}
          className="tap mt-3 flex w-full items-center justify-center gap-1.5 rounded-full bg-plum-100/80 py-2.5 text-[14px] font-medium text-plum-700"
        >
          {t.insights.more} <ArrowRight size={16} />
        </button>
      )}
    </div>
  );
}
