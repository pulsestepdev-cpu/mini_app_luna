import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Clock } from 'lucide-react';
import { t } from '@/i18n';
import { articles, categoryLabels, type ArticleCategory } from '@/content/articles';
import { useCycle } from '@/features/cycle/useCycle';
import { articleForPhase } from '@/content/articles';
import { Chip, PageHeader } from '@/components/ui';
import { FlowerArt } from '@/components/art';

const CATS = Object.keys(categoryLabels) as ArticleCategory[];

export function ArticlesPage() {
  const nav = useNavigate();
  const { prediction } = useCycle();
  const [cat, setCat] = useState<ArticleCategory | 'all'>('all');
  const list = cat === 'all' ? articles : articles.filter((a) => a.category === cat);
  const featured = prediction ? articleForPhase(prediction.phase) : null;

  return (
    <div>
      <PageHeader title={t.articles.title} />
      <p className="-mt-1 mb-4 px-5 text-[14px] text-ink-muted">{t.articles.subtitle}</p>

      {featured && cat === 'all' && (
        <div className="px-5">
          <button
            onClick={() => nav(`/articles/${featured.slug}`)}
            className="tap relative mb-4 w-full overflow-hidden rounded-2.5xl bg-gradient-to-br from-brand-400 via-brand-500 to-brand-700 p-5 text-left text-white shadow-button"
          >
            <div className="relative z-10 max-w-[68%]">
              <div className="text-[12px] font-medium uppercase tracking-wide text-white/70">{t.articles.forPhase}</div>
              <div className="mt-1 text-[17px] font-semibold leading-snug">{featured.title}</div>
              <div className="mt-1.5 flex items-center gap-1 text-[12.5px] text-white/75">
                <Clock size={13} /> {featured.minutes} {t.articles.minutes}
              </div>
            </div>
            <FlowerArt className="absolute -bottom-4 -right-3 h-32 w-32 opacity-90" />
          </button>
        </div>
      )}

      <div className="scrollbar-none flex gap-2 overflow-x-auto px-5 pb-1">
        <Chip active={cat === 'all'} onClick={() => setCat('all')} className="shrink-0">
          {t.articles.all}
        </Chip>
        {CATS.map((c) => (
          <Chip key={c} active={cat === c} onClick={() => setCat(c)} className="shrink-0">
            {categoryLabels[c]}
          </Chip>
        ))}
      </div>

      <div className="mt-4 space-y-3 px-5">
        {list.map((a) => (
          <button key={a.slug} onClick={() => nav(`/articles/${a.slug}`)} className="glass tap flex w-full items-center gap-3 p-4 text-left">
            {a.cover && <img src={a.cover} alt="" loading="lazy" className="h-[72px] w-[72px] shrink-0 rounded-2xl object-cover" />}
            <div className="min-w-0 flex-1">
              <div className="mb-1 text-[11.5px] font-medium uppercase tracking-wide text-plum-500">{categoryLabels[a.category]}</div>
              <div className="text-[15px] font-semibold leading-snug">{a.title}</div>
              <div className="mt-1 text-[13px] leading-snug text-ink-muted">{a.description}</div>
              <div className="mt-2 flex items-center gap-1 text-[12px] text-ink-faint">
                <Clock size={12} /> {a.minutes} {t.articles.minutes}
              </div>
            </div>
            <ChevronRight size={18} className="shrink-0 text-ink-faint" />
          </button>
        ))}
      </div>
    </div>
  );
}
