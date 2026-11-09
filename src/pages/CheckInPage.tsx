import { useState, type ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Droplet, HeartPulse, Minus, Moon, Plus, Smile, UtensilsCrossed, Zap } from 'lucide-react';
import { t } from '@/i18n';
import { haptic, sound } from '@/utils/feedback';
import { useLunaStore, type LogInput } from '@/store/useLunaStore';
import type { Appetite, DateKey, Energy, Flow, Mood, Pain, SleepQuality } from '@/types';
import { fmtDayMonth, todayKey } from '@/utils/date';
import { Button, Chip, IconTile, PageHeader, Sheet } from '@/components/ui';

type SheetKind = 'mood' | 'energy' | 'pain' | 'sleep' | 'appetite' | 'flow' | null;
type FlowChoice = Flow | 'none';

const MOODS: Mood[] = ['good', 'neutral', 'sad', 'irritable', 'anxious', 'sensitive'];
const ENERGY: Energy[] = ['low', 'medium', 'high'];
const PAIN: Pain[] = ['none', 'mild', 'moderate', 'severe'];
const APPETITE: Appetite[] = ['low', 'normal', 'high'];
const SLEEP_Q: SleepQuality[] = ['bad', 'ok', 'good'];
const FLOWS: FlowChoice[] = ['none', 'spotting', 'light', 'medium', 'heavy'];
const SYMPTOMS = Object.keys(t.options.symptoms) as (keyof typeof t.options.symptoms)[];

export function CheckInPage() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const today = todayKey();
  const raw = params.get('date');
  const date: DateKey = raw && /^\d{4}-\d{2}-\d{2}$/.test(raw) && raw <= today ? raw : today;

  const existing = useLunaStore((s) => s.logs[date]);
  const existingFlow = useLunaStore((s) => s.periodDays[date]);
  const saveLog = useLunaStore((s) => s.saveLog);
  const deleteLog = useLunaStore((s) => s.deleteLog);
  const setPeriodDay = useLunaStore((s) => s.setPeriodDay);

  const [log, setLog] = useState<LogInput>(() =>
    existing
      ? { ...existing }
      : { date, symptoms: [], customSymptoms: [] },
  );
  const [flow, setFlow] = useState<FlowChoice | undefined>(existingFlow);
  const [sheet, setSheet] = useState<SheetKind>(null);
  const [otherOpen, setOtherOpen] = useState(false);
  const [otherText, setOtherText] = useState('');

  const patch = (p: Partial<LogInput>) => setLog((l) => ({ ...l, ...p }));
  const toggleSymptom = (s: string) =>
    patch({ symptoms: log.symptoms.includes(s) ? log.symptoms.filter((x) => x !== s) : [...log.symptoms, s] });
  const addCustom = () => {
    const v = otherText.trim();
    if (v && !log.customSymptoms.includes(v)) patch({ customSymptoms: [...log.customSymptoms, v] });
    setOtherText('');
    setOtherOpen(false);
  };

  const save = () => {
    haptic.success();
    sound.chime();
    saveLog(log);
    if (flow !== undefined) setPeriodDay(date, flow === 'none' ? null : flow);
    nav('/success', { replace: true });
  };

  const o = t.options;
  const sleepValue =
    log.sleepHours != null || log.sleepQuality
      ? [log.sleepHours != null ? `${log.sleepHours} ${t.checkin.hours}` : '', log.sleepQuality ? o.sleepQuality[log.sleepQuality] : ''].filter(Boolean).join(' · ')
      : undefined;

  return (
    <div>
      <PageHeader title={date === today ? t.checkin.title : `${t.checkin.title} · ${fmtDayMonth(date)}`} back />
      <div className="px-5">
        <h2 className="h-section mb-3 px-1">{t.checkin.howDoYouFeel}</h2>
        <div className="grid grid-cols-3 gap-2.5">
          <IconTile icon={<Smile size={26} strokeWidth={1.6} />} label={t.checkin.mood} value={log.mood && o.mood[log.mood]} active={!!log.mood} onClick={() => setSheet('mood')} />
          <IconTile icon={<Zap size={26} strokeWidth={1.6} />} label={t.checkin.energy} value={log.energy && o.energy[log.energy]} active={!!log.energy} onClick={() => setSheet('energy')} />
          <IconTile icon={<HeartPulse size={26} strokeWidth={1.6} />} label={t.checkin.pain} value={log.pain && o.pain[log.pain]} active={!!log.pain} onClick={() => setSheet('pain')} />
          <IconTile icon={<Moon size={26} strokeWidth={1.6} />} label={t.checkin.sleep} value={sleepValue} active={!!sleepValue} onClick={() => setSheet('sleep')} />
          <IconTile icon={<UtensilsCrossed size={26} strokeWidth={1.6} />} label={t.checkin.appetite} value={log.appetite && o.appetite[log.appetite]} active={!!log.appetite} onClick={() => setSheet('appetite')} />
          <IconTile icon={<Droplet size={26} strokeWidth={1.6} />} label={t.checkin.flow} value={flow && o.flow[flow]} active={!!flow && flow !== 'none'} onClick={() => setSheet('flow')} />
        </div>

        <h2 className="h-section mb-3 mt-6 px-1">{t.checkin.extra}</h2>
        <div className="flex flex-wrap gap-2">
          {SYMPTOMS.map((s) => (
            <Chip key={s} active={log.symptoms.includes(s)} onClick={() => toggleSymptom(s)}>
              {o.symptoms[s]}
            </Chip>
          ))}
          {log.customSymptoms.map((s) => (
            <Chip key={s} active onClick={() => patch({ customSymptoms: log.customSymptoms.filter((x) => x !== s) })}>
              {s} ×
            </Chip>
          ))}
          <Chip onClick={() => setOtherOpen(true)}>+ {t.checkin.other}</Chip>
        </div>
        {otherOpen && (
          <div className="mt-3 flex gap-2">
            <input
              autoFocus
              value={otherText}
              maxLength={40}
              onChange={(e) => setOtherText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addCustom()}
              placeholder={t.checkin.otherPlaceholder}
              className="flex-1 rounded-full border border-plum-100 bg-white/80 px-4 py-2.5 text-[14px] outline-none focus:border-plum-300"
            />
            <button onClick={addCustom} className="tap rounded-full bg-plum-600 px-4 text-[14px] font-medium text-white">
              {t.checkin.add}
            </button>
          </div>
        )}

        <div className="glass mt-6 p-4">
          <label className="mb-2 block text-[13px] text-ink-soft">{t.checkin.notes}</label>
          <textarea
            value={log.notes ?? ''}
            onChange={(e) => patch({ notes: e.target.value })}
            placeholder={t.checkin.notesPlaceholder}
            rows={3}
            maxLength={1000}
            className="w-full resize-none bg-transparent text-[14px] outline-none placeholder:text-ink-faint"
          />
        </div>

        <Button className="mt-6" onClick={save}>
          {t.common.save}
        </Button>
        {existing && (
          <button
            onClick={() => {
              deleteLog(date);
              nav(-1);
            }}
            className="tap mx-auto mt-3 block py-2 text-[14px] text-rose-500"
          >
            {t.common.delete}
          </button>
        )}
      </div>

      {/* Выбор значений */}
      <OptionsSheet open={sheet === 'mood'} title={t.checkin.mood} onClose={() => setSheet(null)} options={MOODS.map((v) => ({ v, label: o.mood[v] }))} value={log.mood} onPick={(mood) => patch({ mood })} />
      <OptionsSheet open={sheet === 'energy'} title={t.checkin.energy} onClose={() => setSheet(null)} options={ENERGY.map((v) => ({ v, label: o.energy[v] }))} value={log.energy} onPick={(energy) => patch({ energy })} />
      <OptionsSheet open={sheet === 'pain'} title={t.checkin.pain} onClose={() => setSheet(null)} options={PAIN.map((v) => ({ v, label: o.pain[v] }))} value={log.pain} onPick={(pain) => patch({ pain })} />
      <OptionsSheet open={sheet === 'appetite'} title={t.checkin.appetite} onClose={() => setSheet(null)} options={APPETITE.map((v) => ({ v, label: o.appetite[v] }))} value={log.appetite} onPick={(appetite) => patch({ appetite })} />
      <OptionsSheet open={sheet === 'flow'} title={t.checkin.flow} onClose={() => setSheet(null)} options={FLOWS.map((v) => ({ v, label: o.flow[v] }))} value={flow} onPick={(f) => setFlow(f ?? undefined)} />

      <Sheet open={sheet === 'sleep'} onClose={() => setSheet(null)} title={t.checkin.sleep}>
        <div className="mb-2 text-[13px] text-ink-muted">{t.checkin.sleepHours}</div>
        <div className="mb-5 flex items-center gap-3">
          <RoundBtn onClick={() => patch({ sleepHours: Math.max(0, (log.sleepHours ?? 8) - 0.5) })} label="−0.5">
            <Minus size={18} />
          </RoundBtn>
          <div className="flex-1 text-center text-[24px] font-bold">
            {log.sleepHours != null ? `${log.sleepHours} ${t.checkin.hours}` : '—'}
          </div>
          <RoundBtn onClick={() => patch({ sleepHours: Math.min(16, (log.sleepHours ?? 7.5) + 0.5) })} label="+0.5">
            <Plus size={18} />
          </RoundBtn>
        </div>
        <div className="mb-2 text-[13px] text-ink-muted">{t.checkin.sleepQuality}</div>
        <div className="mb-5 flex flex-wrap gap-2">
          {SLEEP_Q.map((q) => (
            <Chip key={q} active={log.sleepQuality === q} onClick={() => patch({ sleepQuality: log.sleepQuality === q ? undefined : q })}>
              {o.sleepQuality[q]}
            </Chip>
          ))}
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" className="flex-1" onClick={() => patch({ sleepHours: undefined, sleepQuality: undefined })}>
            {t.checkin.clear}
          </Button>
          <Button className="flex-1" onClick={() => setSheet(null)}>
            {t.common.done}
          </Button>
        </div>
      </Sheet>
    </div>
  );
}

function RoundBtn({ onClick, label, children }: { onClick: () => void; label: string; children: ReactNode }) {
  return (
    <button onClick={onClick} aria-label={label} className="tap rounded-full bg-plum-100 p-3 text-plum-700">
      {children}
    </button>
  );
}

function OptionsSheet<T extends string>({ open, title, options, value, onPick, onClose }: { open: boolean; title: string; options: { v: T; label: string }[]; value?: T; onPick: (v: T | undefined) => void; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <div className="grid grid-cols-2 gap-2.5 pb-2">
        {options.map((opt) => (
          <Chip
            key={opt.v}
            active={value === opt.v}
            className="py-3.5"
            onClick={() => {
              onPick(value === opt.v ? undefined : opt.v);
              onClose();
            }}
          >
            {opt.label}
          </Chip>
        ))}
      </div>
    </Sheet>
  );
}
