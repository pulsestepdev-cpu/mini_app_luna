/**
 * Тема оформления: светлая, тёмная («лунная ночь») или авто.
 * Авто — как в Telegram (ночной режим), вне Telegram — как в системе.
 */
import { useEffect } from 'react';
import type { ThemePref } from '@/types';
import { useLunaStore } from '@/store/useLunaStore';
import { getTelegram } from './telegram';

type Resolved = 'light' | 'dark';

const COLORS: Record<Resolved, { header: string; bg: string; bar: string }> = {
  light: { header: '#F6F0FC', bg: '#EDE3F7', bar: '#FFFFFF' },
  dark: { header: '#18122B', bg: '#120D20', bar: '#1D162E' },
};

function systemDark() {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
}

export function resolveTheme(pref: ThemePref): Resolved {
  if (pref !== 'auto') return pref;
  const tg = getTelegram();
  if (tg?.colorScheme) return tg.colorScheme;
  return systemDark() ? 'dark' : 'light';
}

export function applyTheme(pref: ThemePref) {
  const theme = resolveTheme(pref);
  const root = document.documentElement;
  if (theme === 'dark') root.dataset.theme = 'dark';
  else delete root.dataset.theme;
  const c = COLORS[theme];
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', c.header);
  const tg = getTelegram();
  if (!tg) return;
  try {
    if (tg.isVersionAtLeast('6.1')) {
      tg.setHeaderColor(c.header);
      tg.setBackgroundColor(c.bg);
    }
    if (tg.isVersionAtLeast('7.10')) tg.setBottomBarColor?.(c.bar);
  } catch {
    /* старый клиент */
  }
}

/** Держит тему в актуальном состоянии: настройка, ночной режим Telegram, система */
export function useThemeSync() {
  const pref = useLunaStore((s) => s.prefs.theme);
  useEffect(() => {
    applyTheme(pref);
    if (pref !== 'auto') return;
    const tg = getTelegram();
    const onChange = () => applyTheme('auto');
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    mq?.addEventListener?.('change', onChange);
    tg?.onEvent?.('themeChanged', onChange);
    return () => {
      mq?.removeEventListener?.('change', onChange);
      tg?.offEvent?.('themeChanged', onChange);
    };
  }, [pref]);
}
