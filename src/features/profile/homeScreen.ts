import { useEffect, useState } from 'react';
import { getTelegram } from '@/app/telegram';

/** Ярлык LUNA на главном экране телефона (Telegram Bot API 8.0+) */
export type HomeStatus = 'unsupported' | 'unknown' | 'added' | 'missed';

export function useHomeScreen() {
  const [status, setStatus] = useState<HomeStatus>('unsupported');

  useEffect(() => {
    const tg = getTelegram();
    if (!tg?.isVersionAtLeast('8.0') || !tg.addToHomeScreen) return;
    setStatus('unknown');
    tg.checkHomeScreenStatus?.((s) => setStatus(s));
    const onAdded = () => setStatus('added');
    tg.onEvent?.('homeScreenAdded', onAdded);
    return () => tg.offEvent?.('homeScreenAdded', onAdded);
  }, []);

  const add = () => getTelegram()?.addToHomeScreen?.();
  return { status, add, available: status === 'missed' || status === 'unknown' };
}
