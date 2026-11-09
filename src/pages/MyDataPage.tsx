import { useEffect, useState } from 'react';
import { t } from '@/i18n';
import { useLunaStore } from '@/store/useLunaStore';
import { Button, PageHeader, Toast } from '@/components/ui';
import { CycleFields, type CycleFieldsValue } from '@/components/CycleFields';

export function MyDataPage() {
  const profile = useLunaStore((s) => s.profile);
  const updateProfile = useLunaStore((s) => s.updateProfile);
  const [name, setName] = useState(profile.name);
  const [cycle, setCycle] = useState<CycleFieldsValue>({
    cycleLength: profile.cycleLength,
    periodLength: profile.periodLength,
    regularity: profile.regularity,
  });
  const [toast, setToast] = useState<string | null>(null);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 1800);
    return () => clearTimeout(id);
  }, [toast]);

  return (
    <div>
      <PageHeader title={t.myData.title} back />
      <div className="space-y-4 px-5">
        <div className="glass p-4">
          <label className="mb-2 block text-[14px] font-semibold">{t.setup.name}</label>
          <input
            value={name}
            maxLength={40}
            onChange={(e) => setName(e.target.value)}
            placeholder={t.setup.namePlaceholder}
            className="w-full rounded-xl border border-plum-100 bg-surface/80 px-4 py-3 text-[15px] outline-none focus:border-plum-300"
          />
        </div>
        <CycleFields value={cycle} onChange={setCycle} />
        <p className="px-1 text-[12.5px] text-ink-muted">
          Когда в календаре накопится история, прогноз будет считаться по ней, а эти значения — использоваться только как запасные.
        </p>
        <Button
          onClick={() => {
            updateProfile({ name: name.trim(), ...cycle });
            setToast(t.myData.saved);
          }}
        >
          {t.common.save}
        </Button>
      </div>
      <Toast text={toast} />
    </div>
  );
}
