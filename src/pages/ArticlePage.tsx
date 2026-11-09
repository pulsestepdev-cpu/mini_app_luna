import { Navigate, useParams } from 'react-router-dom';
import { Clock, ExternalLink, Info, ShieldCheck } from 'lucide-react';
import { t } from '@/i18n';
import { categoryLabels, getArticle } from '@/content/articles';
import { fmt } from '@/utils/date';
import { PageHeader } from '@/components/ui';

export function ArticlePage() {
  const { slug } = useParams();
  const a = slug ? getArticle(slug) : undefined;
  if (!a) return <Navigate to="/articles" replace />;

  return (
    <div>
      <PageHeader title="" back />
      <article className="px-5">
        {a.cover && <img src={a.cover} alt="" className="mb-4 aspect-[3/2] w-full animate-fadeIn rounded-2.5xl object-cover shadow-card" />}
        <div className="text-[12px] font-medium uppercase tracking-wide text-plum-500">{categoryLabels[a.category]}</div>
        <h1 className="mt-1 text-[24px] font-bold leading-tight">{a.title}</h1>
        <div className="mt-2 flex items-center gap-1 text-[12.5px] text-ink-muted">
          <Clock size={13} /> {a.minutes} {t.articles.minutes}
        </div>

        <div className="glass mt-5 space-y-3 p-5 text-[15px] leading-relaxed text-ink-soft">
          {a.body.map((b, i) => {
            if ('h' in b) return <h2 key={i} className="pt-2 text-[16px] font-semibold text-ink">{b.h}</h2>;
            if ('p' in b) return <p key={i}>{b.p}</p>;
            if ('list' in b)
              return (
                <ul key={i} className="space-y-1.5">
                  {b.list.map((li) => (
                    <li key={li} className="flex gap-2">
                      <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-plum-400" />
                      <span>{li}</span>
                    </li>
                  ))}
                </ul>
              );
            return (
              <div key={i} className="flex gap-2 rounded-xl bg-plum-50 p-3 text-[13.5px] text-plum-800">
                <Info size={17} className="mt-0.5 shrink-0" />
                <span>{b.note}</span>
              </div>
            );
          })}
        </div>

        <h2 className="h-section mb-2 mt-5 px-1">{t.articles.sources}</h2>
        <div className="glass divide-y divide-plum-100/70">
          {a.sources.map((s) => (
            <a key={s.url} href={s.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-3 text-[14px] text-plum-700">
              <span className="flex-1">{s.title}</span>
              <ExternalLink size={15} />
            </a>
          ))}
        </div>

        <div className="mt-4 flex items-start gap-2 px-1 text-[12px] text-ink-faint">
          <ShieldCheck size={14} className="mt-0.5 shrink-0" />
          <span>
            {a.reviewedAt ? `${t.articles.reviewed}: ${fmt(a.reviewedAt, 'd MMMM yyyy')}` : 'Медицинская проверка текста ещё не проводилась.'} {t.articles.disclaimer}
          </span>
        </div>
      </article>
    </div>
  );
}
