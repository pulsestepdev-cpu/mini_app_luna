import { useMemo } from 'react';
import { useLunaStore } from '@/store/useLunaStore';
import { todayKey } from '@/utils/date';
import { predict } from './engine';

export function useCycle() {
  const periodDays = useLunaStore((s) => s.periodDays);
  const profile = useLunaStore((s) => s.profile);
  const today = todayKey();
  const prediction = useMemo(() => predict(periodDays, profile, today), [periodDays, profile, today]);
  return { prediction, today, periodDays, profile };
}
