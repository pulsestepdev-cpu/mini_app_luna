import { Minus, Plus } from 'lucide-react';
import { t } from '@/i18n';
import type { Regularity } from '@/types';
import { daysWord } from '@/utils/date';
import { Chip } from '@/components/ui';

export interface CycleFieldsValue {
  cycleLength: number | null;
  periodLength: number | null;
  regularity: Regularity | null;
}

function Stepper({ label, value, min, max, fallback, onChange }: { label: string; value: number | null; min: number; max: number; fallback: number; onChange: (v: number | null) => void }) {
  const v = value ?? fallback;
  return (
    <div className="glass p-4">
      <div className="mb-3 text-[14px] font-semibold">{label}</div>
      <div className="flex items-center gap-3">
        <button onClick={() => onChange(Math.max(min, v - 1))} disabled={value === null} className="tap rounded-full bg-plum-100 p-2.5 text-plum-700 disabled:opacity-40" aria-label="Меньше">
          <Minus size={18} />
        </button>
        <div className={`flex-1 text-center text-[20px] font-bold ${value === null ? 'text-ink-faint' : ''}`}>{daysWord(v)}</div>
        <button onClick={() => onChange(Math.min(max, v + 1))} disabled={value === null} className="tap rounded-full bg-plum-100 p-2.5 text-plum-700 disabled:opacity-40" aria-label="Больше">
          <Plus size={18} />
        </button>
      </div>
      <div className="mt-3">
        <Chip active={value === null} onClick={() => onChange(value === null ? fallback : null)}>
          {t.common.notSure}
        </Chip>
      </div>
    </div>
  );
}

/** Общие поля параметров цикла — онбординг и «Мои данные» */
export function CycleFields({ value, onChange }: { value: CycleFieldsValue; onChange: (v: CycleFieldsValue) => void }) {
  const regs: { v: Regularity; label: string }[] = [
    { v: 'regular', label: t.setup.regular },
    { v: 'irregular', label: t.setup.irregular },
    { v: 'unknown', label: t.setup.unknown },
  ];
  return (
    <>
      <Stepper label={t.setup.cycleLength} value={value.cycleLength} min={18} max={50} fallback={28} onChange={(cycleLength) => onChange({ ...value, cycleLength })} />
      <Stepper label={t.setup.periodLength} value={value.periodLength} min={1} max={12} fallback={5} onChange={(periodLength) => onChange({ ...value, periodLength })} />
      <div className="glass p-4">
        <div className="mb-3 text-[14px] font-semibold">{t.setup.regularity}</div>
        <div className="flex flex-wrap gap-2">
          {regs.map((r) => (
            <Chip key={r.v} active={value.regularity === r.v} onClick={() => onChange({ ...value, regularity: value.regularity === r.v ? null : r.v })}>
              {r.label}
            </Chip>
          ))}
        </div>
      </div>
    </>
  );
}
