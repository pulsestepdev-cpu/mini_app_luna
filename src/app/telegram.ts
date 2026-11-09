/**
 * Минимальная интеграция с Telegram Mini App.
 * Вне Telegram (обычный браузер) ничего не делает.
 * Авторизация через initData появится вместе с backend.
 */
interface TelegramWebApp {
  initData: string;
  platform: string;
  ready(): void;
  expand(): void;
  isVersionAtLeast(v: string): boolean;
  setHeaderColor(color: string): void;
  setBackgroundColor(color: string): void;
  setBottomBarColor?(color: string): void;
  disableVerticalSwipes?(): void;
  HapticFeedback?: {
    impactOccurred(style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft'): void;
    notificationOccurred(type: 'error' | 'success' | 'warning'): void;
    selectionChanged(): void;
  };
  showConfirm?(message: string, cb: (ok: boolean) => void): void;
  CloudStorage?: import('@/features/backup/cloud').CloudStorageApi;
  BackButton?: {
    show(): void;
    hide(): void;
    onClick(cb: () => void): void;
    offClick(cb: () => void): void;
  };
}

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp };
  }
}

export function getTelegram(): TelegramWebApp | null {
  const tg = window.Telegram?.WebApp;
  // Скрипт создаёт объект и вне Telegram, но initData там пустой
  return tg && tg.initData ? tg : null;
}

export function hideBackButton() {
  getTelegram()?.BackButton?.hide();
}

/** Подтверждение: в Telegram — нативный диалог (window.confirm там работает не везде) */
export function confirmDialog(message: string): Promise<boolean> {
  const tg = getTelegram();
  if (tg?.showConfirm && tg.isVersionAtLeast('6.2')) {
    return new Promise((resolve) => tg.showConfirm!(message, resolve));
  }
  return Promise.resolve(window.confirm(message));
}

export function initTelegram() {
  const tg = getTelegram();
  if (!tg) return;
  try {
    tg.ready();
    tg.expand(); // открыть на всю высоту, а не половиной экрана
    if (tg.isVersionAtLeast('6.1')) {
      tg.setHeaderColor('#F6F0FC');
      tg.setBackgroundColor('#EDE3F7');
    }
    // На iOS свайп вниз при прокрутке иначе сворачивает приложение
    if (tg.isVersionAtLeast('7.7')) tg.disableVerticalSwipes?.();
    if (tg.isVersionAtLeast('7.10')) tg.setBottomBarColor?.('#FFFFFF');
    document.documentElement.dataset.tg = tg.platform;
  } catch {
    /* старый клиент Telegram — работаем как обычная страница */
  }
}
