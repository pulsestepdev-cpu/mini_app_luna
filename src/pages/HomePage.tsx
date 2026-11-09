import { useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, BookOpen, CalendarDays, ChevronRight, Droplet, NotebookPen, Settings, Smartphone, Sparkles, X } from 'lucide-react';
import { useHomeScreen } from '@/features/profile/homeScreen';
import { t } from '@/i18n';
import { useLunaStore } from '@/store/useLunaStore';
import { useCycle } from '@/features/cycle/useCycle';
import { articleForPhase, getArticle } from '@/content/articles';
import { daysWord, fmtRange } from '@/utils/date';
import { Avatar, FlowerArt, Illustration, MoonPhase } from '@/components/art';
import { useCountUp } from '@/utils/motion';
import { currentStreak } from '@/features/streak/streak';
import { useAvatarSrc } from '@/features/profile/avatar';
import type { Phase } from '@/types';
import { Button, Card, EmptyState, ProgressRing, SectionTitle } from '@/components/ui';
import { MarkPeriodSheet } from '@/components/MarkPeriodSheet';
import { haptic, sound } from '@/utils/feedback';

export function HomePage() {
  const nav = useNavigate();
  const { prediction: p, today, periodDays, profile } = useCycle();
  const logs = useLunaStore((s) => s.logs);
  const hasLogToday = !!logs[today];
  const streak = useMemo(() => currentStreak(logs, today), [logs, today]);
  const setPeriodDay = useLunaStore((s) => s.setPeriodDay);
  const [markOpen, setMarkOpen] = useState(false);
  const avatarSrc = useAvatarSrc();
  const home = useHomeScreen();
  const [tipHidden, setTipHidden] = useState(() => {
    try {
      return localStorage.getItem('luna-home-tip') === 'hidden';
    } catch {
      return false;
    }
  });
  const hideTip = () => {
    setTipHidden(true);
    try {
      localStorage.setItem('luna-home-tip', 'hidden');
    } catch {
      /* ничего страшного */
    }
  };

  // При задержке вместо статьи по фазе — спокойный план действий
  const article = (p?.isLate && getArticle('late-period')) || articleForPhase(p?.phase ?? 'follicular');
  const day = useCountUp(p?.cycleDay ?? 0);
  const todayMarked = !!periodDays[today];

  return (
    <div className="px-5">
      {/* Приветствие */}
      <header className="flex items-center gap-3 pb-4 pt-[calc(env(safe-area-inset-top)+20px)]">
        <Avatar name={profile.name} size={48} src={avatarSrc} />
        <div className="flex-1 leading-tight">
          <div className="text-[17px] font-semibold">
            {greeting()}
            {profile.name ? `, ${profile.name}` : ''} ♡
          </div>
          <div className="mt-0.5 text-[14px] leading-snug text-ink-soft">{p ? phaseLine(p.phase, today) : t.home.howAreYou}</div>
        </div>
        <button onClick={() => nav('/profile')} className="tap rounded-full p-2 text-ink-soft" aria-label={t.nav.profile}>
          <Settings size={22} />
        </button>
      </header>

      {!p ? (
        <EmptyState
          art={<Illustration name="moon" className="h-36 w-36" />}
          title={t.home.noData}
          text={t.home.noDataText}
          action={<Button onClick={() => setMarkOpen(true)}>{t.home.markPeriod}</Button>}
        />
      ) : (
        <>
          {/* Текущий цикл */}
          <Card className="flex items-center justify-between py-5" onClick={() => nav('/calendar')}>
            <div>
              <div className="text-[14px] font-medium text-ink-soft">{t.home.currentCycle}</div>
              <div className="mt-0.5 text-[30px] font-bold leading-tight">
                {t.home.day} <span className="tabular-nums">{day}</span>
              </div>
              <div className="mt-2 text-[14px] leading-snug text-ink-soft">
                {t.home.phase}:
                <br />
                <span className="font-medium text-ink">{t.phases[p.phase]}</span>
              </div>
            </div>
            <ProgressRing value={p.cycleDay / p.cycleLength} size={108}>
              <MoonPhase progress={(p.cycleDay - 0.5) / p.cycleLength} size={60} />
            </ProgressRing>
          </Card>

          {/* Следующие месячные + быстрая отметка месячных */}
          <div className="glass mt-3 flex items-center gap-3 p-4">
            <button className="tap flex-1 text-left" onClick={() => nav('/calendar')}>
              {p.inPeriod ? (
                <div className="text-[15px] font-semibold text-rose-600">{t.home.periodNow}</div>
              ) : p.isLate ? (
                <>
                  <div className="text-[14px] text-ink-soft">{t.home.nextPeriod}</div>
                  <div className="text-[16px] font-semibold text-rose-600">
                    {t.home.late} {daysWord(p.lateBy)}
                  </div>
                </>
              ) : (
                <>
                  <div className="text-[14px] text-ink-soft">{t.home.nextPeriod}</div>
                  <div className="text-[16px] font-semibold">
                    {p.daysUntilNext === 0 ? t.home.today : `${t.home.inDays}${daysWord(p.daysUntilNext)}`}
                  </div>
                </>
              )}
              <div className="mt-0.5 text-[12.5px] text-ink-muted">
                {fmtRange(p.rangeStart, p.rangeEnd)} · {t.confidence[p.stats.confidence].toLowerCase()}
              </div>
            </button>
            {todayMarked ? (
              <ChevronRight size={20} className="text-ink-faint" />
            ) : (
              <button
                onClick={() => {
                  if (p.inPeriod) {
                    haptic.success();
                    sound.soft();
                    setPeriodDay(today, 'medium');
                  } else {
                    haptic.tap();
                    setMarkOpen(true);
                  }
                }}
                aria-label={p.inPeriod ? t.home.periodContinue : t.home.periodStarted}
                className="tap flex shrink-0 items-center gap-1.5 rounded-full bg-rose-100 px-3.5 py-2.5 text-[13px] font-semibold text-rose-600"
              >
                <Droplet size={15} fill="currentColor" fillOpacity={0.3} />
                {p.inPeriod ? t.home.periodTodayShort : t.home.periodStartedShort}
              </button>
            )}
          </div>

          {/* Отметка самочувствия */}
          <Button variant={hasLogToday ? 'ghost' : 'primary'} className="mt-3 h-12 text-[15px]" onClick={() => nav('/checkin')}>
            <NotebookPen size={18} />
            {hasLogToday ? t.home.checkedIn : t.home.checkIn}
          </Button>
          {streak.days >= 2 && (
            <div className="mt-2.5 flex animate-fadeIn items-center justify-center gap-1.5 text-[12.5px] text-ink-muted">
              <MoonPhase progress={0.5} size={14} />
              {(streak.includesToday ? t.streak.today : t.streak.pending)(daysWord(streak.days))}
            </div>
          )}
        </>
      )}

      {/* Ярлык на экран телефона — подсказка один раз, если телефон это умеет */}
      {p && home.status === 'missed' && !tipHidden && (
        <div className="glass mt-4 flex animate-fadeIn items-center gap-3 p-3.5 pr-2">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-plum-100 text-plum-600">
            <Smartphone size={19} />
          </span>
          <p className="min-w-0 flex-1 text-[13px] leading-snug text-ink-soft">{t.profile.homeScreenTip}</p>
          <button onClick={() => { haptic.tap(); home.add(); }} className="tap shrink-0 rounded-full bg-brand-600 px-3.5 py-2 text-[13px] font-semibold text-white">
            {t.profile.homeScreenAdd}
          </button>
          <button onClick={hideTip} className="tap shrink-0 rounded-full p-1.5 text-ink-faint" aria-label="Скрыть">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Быстрые действия */}
      <SectionTitle>{t.home.quick}</SectionTitle>
      <div className="grid grid-cols-4 gap-2.5">
        <QuickAction icon={<NotebookPen size={22} />} label={t.home.qSymptoms} onClick={() => nav('/checkin')} />
        <QuickAction icon={<CalendarDays size={22} />} label={t.home.qCalendar} onClick={() => nav('/calendar')} />
        <QuickAction icon={<BookOpen size={22} />} label={t.home.qArticles} onClick={() => nav('/articles')} />
        <QuickAction icon={<BarChart3 size={22} />} label={t.home.qAnalytics} onClick={() => nav('/analytics')} />
      </div>

      {/* Карточка дня */}
      <button
        onClick={() => nav(`/articles/${article.slug}`)}
        className="tap relative mt-5 flex w-full items-center overflow-hidden rounded-2.5xl bg-gradient-to-br from-brand-500 via-brand-600 to-brand-800 p-5 text-left text-white shadow-button"
      >
        <div className="relative z-10 max-w-[64%]">
          <div className="flex items-center gap-1.5 text-[12px] font-medium uppercase tracking-wide text-white/70">
            <Sparkles size={13} className="text-amber-300" /> {t.articles.forPhase}
          </div>
          <div className="mt-1.5 text-[16px] font-semibold leading-snug">{article.title}</div>
          <div className="mt-1 text-[13px] leading-snug text-white/75">{t.home.selfCare}</div>
        </div>
        <FlowerArt className="absolute -bottom-6 right-3 h-40 w-24 rotate-6 animate-floaty" />
      </button>

      <p className="mt-4 text-center text-[11.5px] text-ink-faint">{t.home.approxNote}</p>
      <MarkPeriodSheet open={markOpen} onClose={() => setMarkOpen(false)} />
    </div>
  );
}

function QuickAction({ icon, label, onClick }: { icon: ReactNode; label: string; onClick: () => void }) {
  return (
    <button onClick={() => { haptic.tap(); onClick(); }} className="tap flex flex-col items-center gap-1.5">
      <span className="flex h-14 w-14 items-center justify-center rounded-full border border-edge/80 bg-surface/75 text-plum-600 shadow-card">{icon}</span>
      <span className="whitespace-pre-line text-center text-[11.5px] leading-tight text-ink-soft">{label}</span>
    </button>
  );
}

function greeting(): string {
  const h = new Date().getHours();
  const g = t.home.greetings;
  if (h >= 5 && h < 12) return g.morning;
  if (h >= 12 && h < 17) return g.day;
  if (h >= 17 && h < 23) return g.evening;
  return g.night;
}

/** Фраза дня: одна и та же весь день, меняется на следующий */
function phaseLine(phase: Phase, today: string): string {
  const lines = t.home.phaseLines[phase];
  const dayNum = Math.floor(Date.parse(today) / 86_400_000);
  return lines[dayNum % lines.length];
}
