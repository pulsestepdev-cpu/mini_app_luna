import { useEffect, useRef, useState } from 'react';
import { getTelegram } from '@/app/telegram';

/** Ярлык LUNA на главном экране телефона (Telegram Bot API 8.0+) */
export type HomeStatus = 'unsupported' | 'unknown' | 'added' | 'missed';

/**
 * ВЫКЛЮЧЕНО по просьбе владельца (на Android запускалась установка через браузер).
 * Код оставлен: чтобы вернуть кнопку «Добавить на экран телефона» на главной и в профиле,
 * поставь true. Страница установки public/add/ остаётся, но в приложении на неё нет ссылок.
 */
export const HOME_SCREEN_ENABLED = false;

/** Сколько ждём системное окно Telegram, прежде чем показать инструкцию */
const PROMPT_WAIT_MS = 2500;

/**
 * Telegram не сообщает, если не смог показать окно добавления (особенно на iPhone),
 * поэтому: вызываем addToHomeScreen, и если за пару секунд не было ни окна
 * (приложение не уходило в фон), ни события «добавлено» — показываем инструкцию.
 */
export function useHomeScreen() {
  const [status, setStatus] = useState<HomeStatus>('unsupported');
  const [helpOpen, setHelpOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const tg = getTelegram();
    if (!HOME_SCREEN_ENABLED || !tg) return;
    const native = tg.isVersionAtLeast('8.0') && !!tg.addToHomeScreen;
    // Телефон без нативной функции — всё равно можно добавить вручную по инструкции
    setStatus(native ? 'unknown' : isPhone() ? 'missed' : 'unsupported');
    if (native) tg.checkHomeScreenStatus?.((s) => setStatus(s === 'unsupported' && isPhone() ? 'missed' : s));
    const onAdded = () => {
      clearTimeout(timer.current);
      setStatus('added');
      setHelpOpen(false);
    };
    const onFailed = () => {
      clearTimeout(timer.current);
      setHelpOpen(true);
    };
    tg.onEvent?.('homeScreenAdded', onAdded);
    tg.onEvent?.('homeScreenFailed', onFailed);
    return () => {
      clearTimeout(timer.current);
      tg.offEvent?.('homeScreenAdded', onAdded);
      tg.offEvent?.('homeScreenFailed', onFailed);
    };
  }, []);

  const add = () => {
    const tg = getTelegram();
    if (!tg?.addToHomeScreen || !tg.isVersionAtLeast('8.0')) {
      setHelpOpen(true);
      return;
    }
    let promptShown = false;
    const onHide = () => {
      if (document.visibilityState === 'hidden') promptShown = true;
    };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('blur', onHide);
    tg.addToHomeScreen();
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('blur', onHide);
      if (!promptShown) setHelpOpen(true);
    }, PROMPT_WAIT_MS);
  };

  return { status, add, available: status === 'missed' || status === 'unknown', helpOpen, closeHelp: () => setHelpOpen(false) };
}

export function isIOS(): boolean {
  const p = getTelegram()?.platform;
  return p === 'ios' || /iPhone|iPad|iPod/.test(navigator.userAgent);
}

function isPhone(): boolean {
  const p = getTelegram()?.platform;
  return p === 'ios' || p === 'android' || p === 'android_x';
}
