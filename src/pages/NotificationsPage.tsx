import { useEffect, useState } from 'react';
import { Bell, BellRing, ChevronRight, HeartHandshake, Loader2, Send } from 'lucide-react';
import { t } from '@/i18n';
import { useLunaStore } from '@/store/useLunaStore';
import type { NotificationSettings } from '@/types';
import { FlowerArt } from '@/components/art';
import { Button, PageHeader, Toast, Toggle } from '@/components/ui';
import { confirmDialog, getTelegram } from '@/app/telegram';
import { createInvite, markStarted, refreshMe, removePartner, sendTest, serverAvailable, useServer } from '@/features/sync/server';
import { haptic } from '@/utils/feedback';

type BoolKey = Exclude<keyof NotificationSettings, 'time'>;

export function NotificationsPage() {
  const n = useLunaStore((s) => s.notifications);
  const update = useLunaStore((s) => s.updateNotifications);
  const { state, me } = useServer();
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const tN = t.notifications;
  const inTelegram = serverAvailable();

  useEffect(() => {
    if (inTelegram) void refreshMe();
  }, [inTelegram]);

  const flash = (text: string) => {
    setToast(text);
    setTimeout(() => setToast(null), 2200);
  };

  const rows: { key: BoolKey; label: string }[] = [
    { key: 'periodReminder', label: tN.period },
    { key: 'symptomReminder', label: tN.symptoms },
    { key: 'tips', label: tN.tips },
    { key: 'weeklyReport', label: tN.weekly },
  ];

  /** Telegram спросит «Разрешить боту писать вам?» */
  const allow = () => {
    const tg = getTelegram();
    if (!tg?.requestWriteAccess) return;
    tg.requestWriteAccess(async (granted) => {
      if (!granted) return;
      haptic.success();
      await markStarted().catch(() => undefined);
      await refreshMe();
    });
  };

  const test = async () => {
    setBusy(true);
    const res = await sendTest().catch(() => ({ ok: false }));
    setBusy(false);
    if (res.ok) haptic.success();
    flash(res.ok ? tN.testSent : tN.testFailed);
    void refreshMe();
  };

  const invite = async () => {
    setBusy(true);
    try {
      const { invite: link } = await createInvite();
      const share = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(tN.partner.shareText)}`;
      const tg = getTelegram();
      if (tg?.openTelegramLink) tg.openTelegramLink(share);
      else window.open(share, '_blank');
      await refreshMe();
    } finally {
      setBusy(false);
    }
  };

  const unlink = async () => {
    if (!(await confirmDialog(tN.partner.confirmRemove))) return;
    await removePartner().catch(() => undefined);
    haptic.select();
    flash(tN.partner.removed);
    await refreshMe();
  };

  const ready = inTelegram && state !== 'pending' && me?.allowed;
  const statusText = !inTelegram
    ? tN.status.outside
    : state === 'loading' && !me
      ? tN.status.loading
      : state === 'pending'
        ? tN.status.pending
        : state === 'error' && !me
          ? tN.status.error
          : me && !me.started
            ? tN.status.needAccess
            : tN.status.ok(me?.bot ?? 'luna_tracker_bot');

  return (
    <div>
      <PageHeader title={tN.title} back />
      <div className="px-5">
        {/* Связь с ботом */}
        <div className="glass p-4">
          <div className="flex gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-plum-100 text-plum-600">
              {state === 'loading' ? <Loader2 size={20} className="animate-spin" /> : <BellRing size={20} />}
            </span>
            <p className="text-[14px] leading-snug text-ink-soft">{statusText}</p>
          </div>
          {ready && me && !me.started && (
            <Button className="mt-3 h-11 text-[15px]" onClick={allow}>
              {tN.allow}
            </Button>
          )}
          {ready && me?.started && (
            <Button variant="soft" className="mt-3 h-11 text-[15px]" onClick={test} disabled={busy}>
              <Send size={17} /> {tN.test}
            </Button>
          )}
        </div>

        <div className="glass mt-4 divide-y divide-plum-100/70 p-0">
          {rows.map((r) => (
            <div key={r.key} className="flex items-center justify-between px-4 py-3.5">
              <span className="text-[15px] font-medium">{r.label}</span>
              <Toggle checked={n[r.key]} onChange={(v) => update({ [r.key]: v })} label={r.label} />
            </div>
          ))}
        </div>

        <label className="glass mt-4 flex items-center justify-between px-4 py-3.5">
          <span className="text-[15px] font-semibold">{tN.time}</span>
          <span className="flex items-center gap-1 text-[15px] text-ink-soft">
            <input
              type="time"
              value={n.time}
              onChange={(e) => e.target.value && update({ time: e.target.value })}
              className="bg-transparent text-right outline-none"
            />
            <ChevronRight size={18} className="text-ink-faint" />
          </span>
        </label>

        {/* Партнёр */}
        {ready && me && (
          <>
            <h2 className="h-section mb-2.5 mt-6 px-1">{tN.partner.title}</h2>
            <div className="glass p-4">
              <div className="flex gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-500">
                  <HeartHandshake size={20} />
                </span>
                <p className="text-[13.5px] leading-snug text-ink-soft">
                  {me.partner.linked ? tN.partner.linked(me.partner.name ?? 'Партнёр') : me.partner.invite ? tN.partner.waiting : tN.partner.text}
                </p>
              </div>
              {me.partner.linked ? (
                <Button variant="ghost" className="mt-3 h-11 text-[15px]" onClick={unlink}>
                  {tN.partner.remove}
                </Button>
              ) : (
                <Button variant={me.partner.invite ? 'soft' : 'primary'} className="mt-3 h-11 text-[15px]" onClick={invite} disabled={busy}>
                  {me.partner.invite ? tN.partner.inviteAgain : tN.partner.invite}
                </Button>
              )}
            </div>
          </>
        )}

        <div className="relative mt-6 overflow-hidden rounded-2.5xl bg-gradient-to-br from-plum-100 via-plum-200/70 to-rose-100 px-5 py-6 text-center shadow-card">
          <Bell size={30} className="mx-auto text-plum-600" strokeWidth={1.6} />
          <div className="mt-2 text-[16px] font-semibold text-ink">{tN.cardTitle}</div>
          <div className="mt-1 text-[13.5px] text-ink-soft">{tN.cardText}</div>
          <FlowerArt className="absolute -bottom-8 right-3 h-36 w-20 rotate-6" />
        </div>
      </div>
      <Toast text={toast} />
    </div>
  );
}
