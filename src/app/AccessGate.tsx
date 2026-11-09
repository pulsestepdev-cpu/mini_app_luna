/**
 * Доступ к приложению: LUNA — личное приложение. Пускаем только тех, кого
 * одобрил владелец (решает сервер по подписи Telegram). Вне Telegram личность
 * проверить нельзя — просим открыть через бота.
 *
 * Чтобы не запереть одобренного человека при сбое сети, последнее «можно»
 * запоминается на устройстве; явное «нельзя» от сервера всегда сильнее.
 */
import { useEffect, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { t } from '@/i18n';
import { Illustration, StarField } from '@/components/art';
import { Button } from '@/components/ui';
import { refreshMe, serverAvailable, useServer } from '@/features/sync/server';

const CACHE_KEY = 'luna-access';

function readCache(): boolean {
  try {
    return localStorage.getItem(CACHE_KEY) === 'allowed';
  } catch {
    return false;
  }
}

function writeCache(allowed: boolean) {
  try {
    if (allowed) localStorage.setItem(CACHE_KEY, 'allowed');
    else localStorage.removeItem(CACHE_KEY);
  } catch {
    /* приватный режим и т. п. */
  }
}

export function AccessGate({ children }: { children: ReactNode }) {
  const inTelegram = serverAvailable();
  const { me, state } = useServer();
  const bypass = import.meta.env.DEV; // локальная разработка — без проверки

  useEffect(() => {
    if (!bypass && inTelegram) void refreshMe();
  }, [bypass, inTelegram]);

  useEffect(() => {
    if (me) writeCache(me.allowed);
  }, [me]);

  if (bypass) return <>{children}</>;
  if (!inTelegram) return <GateScreen kind="outside" bot={null} />;
  if (me?.allowed) return <>{children}</>;
  if (me?.denied) return <GateScreen kind="denied" bot={me.bot} />;
  if (me?.pending) return <GateScreen kind="pending" bot={me.bot} />;
  // Ответа сервера ещё нет (или сеть недоступна)
  if (readCache()) return <>{children}</>;
  if (state === 'error') return <GateScreen kind="error" bot={null} />;
  return <GateScreen kind="loading" bot={null} />;
}

type Kind = 'outside' | 'pending' | 'denied' | 'error' | 'loading';

function GateScreen({ kind, bot }: { kind: Kind; bot: string | null }) {
  const g = t.gate;
  const username = bot ?? 'luna_tracker_bot';
  const copy = kind === 'loading' ? null : g[kind];

  return (
    <div className="relative mx-auto flex min-h-full max-w-[440px] flex-col overflow-hidden bg-brand-900 text-white">
      <div
        className="absolute inset-0 bg-cover bg-center opacity-80"
        style={{ backgroundImage: "url('./art/welcome-bg.webp'), linear-gradient(180deg, #3B2559 0%, #5E3896 55%, #B9A3E0 100%)" }}
      />
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-brand-900/80 to-transparent" />
      <StarField count={12} className="opacity-60" />

      <div className="relative flex flex-1 flex-col items-center justify-center px-8 text-center">
        <div className="font-serif text-[44px] font-medium leading-none tracking-[0.06em]">LUNA</div>
        {kind === 'loading' ? (
          <Loader2 size={26} className="mt-8 animate-spin text-white/80" />
        ) : (
          <>
            <Illustration name={kind === 'denied' ? 'seedling' : 'moon'} className="mt-8 h-36 w-36 animate-floaty" />
            <h1 className="mt-4 text-[22px] font-bold">{copy!.title}</h1>
            <p className="mt-2 text-[15px] leading-relaxed text-white/85">{copy!.text}</p>
          </>
        )}
      </div>

      <div className="relative px-8 pb-[calc(env(safe-area-inset-bottom)+36px)]">
        {kind === 'outside' && (
          <a href={`https://t.me/${username}`} className="block">
            <Button variant="light">{g.openBot(username)}</Button>
          </a>
        )}
        {(kind === 'pending' || kind === 'error') && (
          <Button variant="light" onClick={() => void refreshMe()}>
            {g.retry}
          </Button>
        )}
      </div>
    </div>
  );
}
