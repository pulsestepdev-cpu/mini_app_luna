import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { hideBackButton } from '@/app/telegram';
import { useLunaStore } from '@/store/useLunaStore';
import { currentStreak, milestoneToday } from '@/features/streak/streak';
import { todayKey } from '@/utils/date';
import { t } from '@/i18n';
import { LotusArt, SparkleBurst, StarField } from '@/components/art';
import { Button } from '@/components/ui';

export function SuccessPage() {
  const nav = useNavigate();
  useEffect(hideBackButton, []);
  const logs = useLunaStore((s) => s.logs);
  const milestone = milestoneToday(currentStreak(logs, todayKey()));
  const [title, text] = (milestone && t.success.milestones[milestone]) || [t.success.title, t.success.text];
  return (
    <div className="relative mx-auto flex min-h-full max-w-[440px] flex-col overflow-hidden bg-gradient-to-b from-[#3A2160] via-[#5B3891] to-[#8C66C2] text-white">
      <StarField count={22} />
      <div className="absolute left-1/2 top-[22%] h-72 w-72 -translate-x-1/2 rounded-full bg-[#F4C6F0]/25 blur-3xl" />

      <div className="relative flex flex-1 flex-col items-center justify-center px-8 text-center">
        <div className="relative animate-pop">
          <LotusArt className="w-64 animate-floaty" />
          <SparkleBurst className="left-1/2 top-[55%]" />
        </div>
        <h1 className="mt-6 animate-fadeUp text-[28px] font-bold">{title}</h1>
        <p className="mt-3 animate-fadeUp whitespace-pre-line text-[16px] leading-relaxed text-white/85 [animation-delay:120ms]">
          {text}
        </p>
      </div>

      <div className="relative px-8 pb-[calc(env(safe-area-inset-bottom)+36px)]">
        <Button variant="light" onClick={() => nav('/', { replace: true })}>
          {t.success.continue}
        </Button>
      </div>
    </div>
  );
}
