import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { t } from '@/i18n';
import { useLunaStore } from '@/store/useLunaStore';
import { todayKey } from '@/utils/date';
import { Button, Chip, PageHeader } from '@/components/ui';
import { CycleFields, type CycleFieldsValue } from '@/components/CycleFields';

export function SetupPage() {
  const nav = useNavigate();
  const complete = useLunaStore((s) => s.completeOnboarding);
  const [name, setName] = useState('');
  const [lastPeriod, setLastPeriod] = useState<string>('');
  const [unknownDate, setUnknownDate] = useState(false);
  const [cycle, setCycle] = useState<CycleFieldsValue>({ cycleLength: 28, periodLength: 5, regularity: null });

  const finish = () => {
    complete({
      name,
      lastPeriodStart: unknownDate || !lastPeriod ? null : lastPeriod,
      cycleLength: cycle.cycleLength,
      periodLength: cycle.periodLength,
      regularity: cycle.regularity,
    });
    nav('/', { replace: true });
  };

  return (
    <div className="app-bg mx-auto min-h-full max-w-[440px] pb-10">
      <PageHeader title={t.setup.title} back />
      <div className="space-y-4 px-5">
        <p className="px-1 text-[14px] leading-relaxed text-ink-muted">{t.setup.subtitle}</p>

        <div className="glass p-4">
          <label className="mb-2 block text-[14px] font-semibold">{t.setup.name}</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t.setup.namePlaceholder}
            maxLength={40}
            className="w-full rounded-xl border border-plum-100 bg-surface/80 px-4 py-3 text-[15px] outline-none focus:border-plum-300"
          />
        </div>

        <div className="glass p-4">
          <label className="mb-2 block text-[14px] font-semibold">{t.setup.lastPeriod}</label>
          <input
            type="date"
            value={lastPeriod}
            max={todayKey()}
            disabled={unknownDate}
            onChange={(e) => setLastPeriod(e.target.value)}
            className="w-full rounded-xl border border-plum-100 bg-surface/80 px-4 py-3 text-[15px] outline-none focus:border-plum-300 disabled:opacity-40"
          />
          <div className="mt-3">
            <Chip active={unknownDate} onClick={() => setUnknownDate(!unknownDate)}>
              {t.setup.dontRemember}
            </Chip>
          </div>
        </div>

        <CycleFields value={cycle} onChange={setCycle} />

        <Button onClick={finish}>{t.setup.finish}</Button>
      </div>
    </div>
  );
}

