import { Heart, Lock } from 'lucide-react';
import { t } from '@/i18n';
import type { DateKey } from '@/types';
import { LIBIDOS, PROTECTIONS, type IntimacyInput } from '@/features/intimacy/intimacy';
import { fmtDayMonth } from '@/utils/date';
import { Button, Chip, Sheet, Toggle } from '@/components/ui';

export const emptyIntimacy = (date: DateKey): IntimacyInput => ({ date, sex: false });

/**
 * Окно «Близость». Управляемое: каждое изменение сразу уходит в onChange
 * (в календаре — прямо в хранилище, в самочувствии — в черновик до «Сохранить»).
 */
export function IntimacySheet({
  open,
  onClose,
  value,
  onChange,
  date,
}: {
  open: boolean;
  onClose: () => void;
  value: IntimacyInput;
  onChange: (v: IntimacyInput) => void;
  date: DateKey;
}) {
  const ti = t.intimacy;
  const patch = (p: Partial<IntimacyInput>) => onChange({ ...value, ...p });

  return (
    <Sheet open={open} onClose={onClose} title={`${ti.title} · ${fmtDayMonth(date)}`}>
      <div className="glass-strong mb-4 p-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-500">
            <Heart size={18} fill="currentColor" fillOpacity={value.sex ? 0.9 : 0.25} />
          </span>
          <span className="flex-1 text-[15px] font-medium">{ti.had}</span>
          <Toggle checked={value.sex} onChange={(sex) => patch({ sex })} label={ti.had} />
        </div>

        {value.sex && (
          <div className="mt-4 animate-fadeIn">
            <div className="mb-2 text-[12.5px] text-ink-muted">{ti.protectionTitle}</div>
            <div className="flex flex-wrap gap-2">
              {PROTECTIONS.map((p) => (
                <Chip key={p} active={value.protection === p} onClick={() => patch({ protection: value.protection === p ? undefined : p })} className="px-3.5 py-2 text-[13.5px]">
                  {ti.protection[p]}
                </Chip>
              ))}
            </div>
            <div className="mb-2 mt-4 text-[12.5px] text-ink-muted">{ti.details}</div>
            <div className="flex flex-wrap gap-2">
              <Chip active={!!value.orgasm} onClick={() => patch({ orgasm: !value.orgasm })} className="px-3.5 py-2 text-[13.5px]">
                {ti.orgasm}
              </Chip>
              <Chip active={!!value.pain} onClick={() => patch({ pain: !value.pain })} className="px-3.5 py-2 text-[13.5px]">
                {ti.pain}
              </Chip>
            </div>
          </div>
        )}
      </div>

      <div className="mb-1 px-1 text-[13px] font-semibold text-ink-soft">{ti.libido}</div>
      <div className="mb-2 px-1 text-[12px] text-ink-muted">{ti.libidoHint}</div>
      <div className="mb-4 flex gap-2">
        {LIBIDOS.map((l) => (
          <Chip key={l} active={value.libido === l} onClick={() => patch({ libido: value.libido === l ? undefined : l })} className="flex-1 px-2">
            {ti.libidoLevel[l]}
          </Chip>
        ))}
      </div>

      <p className="mb-4 flex gap-2 px-1 text-[12px] leading-snug text-ink-faint">
        <Lock size={13} className="mt-0.5 shrink-0" />
        {ti.privacy}
      </p>

      <div className="flex gap-2">
        <Button variant="ghost" className="flex-1" onClick={() => onChange(emptyIntimacy(date))}>
          {t.checkin.clear}
        </Button>
        <Button className="flex-1" onClick={onClose}>
          {t.common.done}
        </Button>
      </div>
    </Sheet>
  );
}
