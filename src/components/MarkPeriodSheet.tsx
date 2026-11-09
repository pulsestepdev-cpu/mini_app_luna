import { useState } from 'react';
import { t } from '@/i18n';
import { haptic, sound } from '@/utils/feedback';
import { useLunaStore } from '@/store/useLunaStore';
import { addDaysKey, todayKey } from '@/utils/date';
import { Button, Sheet } from '@/components/ui';

/** Отметить начало месячных (по умолчанию — сегодня) */
export function MarkPeriodSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const today = todayKey();
  const [date, setDate] = useState(today);
  const setPeriodDay = useLunaStore((s) => s.setPeriodDay);
  const periodLength = useLunaStore((s) => s.profile.periodLength) ?? 5;

  const save = () => {
    // Отмечаем дни от начала до сегодня, но не больше обычной длительности
    for (let i = 0; i < periodLength; i++) {
      const d = addDaysKey(date, i);
      if (d > today) break;
      setPeriodDay(d, 'medium');
    }
    haptic.success();
    sound.soft();
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} title={t.home.markPeriod}>
      <label className="mb-2 block text-[14px] text-ink-muted">{t.home.periodFirstDay}</label>
      <input
        type="date"
        value={date}
        max={today}
        onChange={(e) => setDate(e.target.value || today)}
        className="mb-5 w-full rounded-xl border border-plum-100 bg-surface px-4 py-3 text-[15px] outline-none focus:border-plum-300"
      />
      <Button onClick={save}>{t.common.save}</Button>
    </Sheet>
  );
}
