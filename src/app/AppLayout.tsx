import { useEffect } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { BarChart3, BookOpen, CalendarDays, Home, User } from 'lucide-react';
import { t } from '@/i18n';
import { cn } from '@/utils/cn';
import { haptic } from '@/utils/feedback';
import { getTelegram } from './telegram';

const TABS = [
  { to: '/', label: t.nav.home, icon: Home, end: true },
  { to: '/calendar', label: t.nav.calendar, icon: CalendarDays },
  { to: '/analytics', label: t.nav.analytics, icon: BarChart3, also: ['/insights'] },
  { to: '/articles', label: t.nav.articles, icon: BookOpen },
  { to: '/profile', label: t.nav.profile, icon: User },
];

const ROOTS = TABS.map((t) => t.to);

/** Нативная кнопка «Назад» в шапке Telegram на вложенных экранах */
function useTelegramBackButton(pathname: string) {
  const nav = useNavigate();
  useEffect(() => {
    const tg = getTelegram();
    const bb = tg?.isVersionAtLeast('6.1') ? tg.BackButton : undefined;
    if (!bb) return;
    if (ROOTS.includes(pathname)) {
      bb.hide();
      return;
    }
    const back = () => {
      haptic.tap();
      // Если открыли сразу вложенный экран (нет истории) — на главную
      if (window.history.state?.idx > 0) nav(-1);
      else nav('/', { replace: true });
    };
    bb.onClick(back);
    bb.show();
    return () => bb.offClick(back);
  }, [pathname, nav]);
}

export function AppLayout({ tabs = false }: { tabs?: boolean }) {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  useTelegramBackButton(pathname);

  return (
    <div className="app-bg relative mx-auto min-h-full max-w-[440px] overflow-x-hidden">
      <main className={cn('animate-fadeUp', tabs ? 'pb-[calc(env(safe-area-inset-bottom)+96px)]' : 'pb-8')} key={pathname}>
        <Outlet />
      </main>
      {tabs && (
        <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-[440px] border-t border-edge/70 bg-surface/80 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl">
          <div className="flex px-1 pb-2 pt-2">
            {TABS.map(({ to, label, icon: Icon, end, also }) => {
              const extra = also?.some((p) => pathname.startsWith(p));
              return (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  onClick={() => pathname !== to && haptic.select()}
                  className={({ isActive }) =>
                    cn('tap flex min-w-0 flex-1 flex-col items-center gap-1 py-1 text-[10.5px] min-[360px]:text-[11px]', isActive || extra ? 'font-semibold text-plum-600' : 'text-ink-muted')
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon size={22} strokeWidth={isActive || extra ? 2.2 : 1.7} fill={isActive || extra ? 'currentColor' : 'none'} fillOpacity={0.15} />
                      <span className="max-w-full truncate">{label}</span>
                    </>
                  )}
                </NavLink>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
