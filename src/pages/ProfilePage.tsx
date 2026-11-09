import { useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Camera, Check, FlaskConical, Globe, ImageUp, Info, Lock, MoonStar, Send, Smartphone, UserRound, Vibrate, Volume2 } from 'lucide-react';
import { useHomeScreen } from '@/features/profile/homeScreen';
import { t } from '@/i18n';
import { useLunaStore } from '@/store/useLunaStore';
import { fmt } from '@/utils/date';
import { Avatar } from '@/components/art';
import { Button, ListRow, Segmented, Sheet, Toast, Toggle } from '@/components/ui';
import { fileToAvatar, telegramPhotoUrl, useAvatarSrc } from '@/features/profile/avatar';
import { cn } from '@/utils/cn';
import type { ThemePref } from '@/types';
import { haptic, sound } from '@/utils/feedback';

export function ProfilePage() {
  const nav = useNavigate();
  const profile = useLunaStore((s) => s.profile);
  const seedDemo = useLunaStore((s) => s.seedDemo);
  const [langOpen, setLangOpen] = useState(false);
  const [photoOpen, setPhotoOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const avatarSrc = useAvatarSrc();
  const home = useHomeScreen();
  const updateProfile = useLunaStore((s) => s.updateProfile);
  const tgPhoto = telegramPhotoUrl();
  const photoMode = profile.photo ? 'custom' : (profile.useTelegramPhoto ?? true) && tgPhoto ? 'telegram' : 'none';

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      updateProfile({ photo: await fileToAvatar(file) });
      haptic.success();
      setPhotoOpen(false);
    } catch {
      setToast(t.profile.photoError);
      setTimeout(() => setToast(null), 2200);
    }
  };
  const prefs = useLunaStore((s) => s.prefs);
  const updatePrefs = useLunaStore((s) => s.updatePrefs);

  return (
    <div className="px-5 pt-[calc(env(safe-area-inset-top)+28px)]">
      <div className="flex flex-col items-center text-center">
        <button onClick={() => { haptic.tap(); setPhotoOpen(true); }} className="tap relative" aria-label={t.profile.photoChange}>
          <Avatar name={profile.name} size={96} src={avatarSrc} />
          <span className="absolute bottom-0.5 right-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-white shadow-soft ring-2 ring-surface">
            <Camera size={15} />
          </span>
        </button>
        <div className="mt-3 text-[20px] font-bold">{profile.name || 'LUNA'} ♡</div>
        <div className="text-[13px] text-ink-muted">{t.profile.since} {fmt(profile.createdAt.slice(0, 10), 'MMMM yyyy')}</div>
      </div>

      <div className="glass mt-6 divide-y divide-plum-100/70 overflow-hidden p-0">
        <ListRow icon={<UserRound size={20} />} label={t.profile.myData} onClick={() => nav('/profile/data')} />
        <ListRow icon={<Bell size={20} />} label={t.profile.notifications} onClick={() => nav('/profile/notifications')} />
        <ListRow icon={<Lock size={20} />} label={t.profile.privacy} onClick={() => nav('/profile/privacy')} />
        <ListRow icon={<Globe size={20} />} label={t.profile.language} value={t.profile.languageValue} onClick={() => setLangOpen(true)} />
        <ListRow icon={<Info size={20} />} label={t.profile.about} onClick={() => nav('/profile/about')} />
      </div>

      {(home.available || home.status === 'added') && (
        <div className="glass mt-4 p-0">
          {home.status === 'added' ? (
            <div className="flex items-center gap-3 px-4 py-3.5 text-[15px] text-ink-soft">
              <Smartphone size={20} className="text-plum-600" /> {t.profile.homeScreenAdded}
            </div>
          ) : (
            <button onClick={() => { haptic.tap(); home.add(); }} className="tap flex w-full items-center gap-3 px-4 py-3.5 text-left">
              <Smartphone size={20} className="text-plum-600" />
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] text-ink">{t.profile.homeScreen}</span>
                <span className="block text-[12px] text-ink-muted">{t.profile.homeScreenHint}</span>
              </span>
            </button>
          )}
        </div>
      )}

      <h2 className="h-section mb-2.5 mt-6 px-1">{t.profile.feel}</h2>
      <div className="glass divide-y divide-plum-100/70 overflow-hidden p-0">
        <div className="px-4 py-3.5">
          <div className="mb-2.5 flex items-center gap-3">
            <MoonStar size={20} className="text-ink-soft" />
            <div className="min-w-0 flex-1">
              <div className="text-[15px] text-ink">{t.profile.theme}</div>
              <div className="text-[12px] leading-snug text-ink-muted">{t.profile.themeHint}</div>
            </div>
          </div>
          <Segmented<ThemePref>
            value={prefs.theme}
            onChange={(v) => updatePrefs({ theme: v })}
            options={(['auto', 'light', 'dark'] as const).map((v) => ({ value: v, label: t.profile.themes[v] }))}
          />
        </div>
        <PrefRow
          icon={<Vibrate size={20} />}
          label={t.profile.haptics}
          hint={t.profile.hapticsHint}
          checked={prefs.haptics}
          onChange={(v) => {
            updatePrefs({ haptics: v });
            if (v) haptic.success();
          }}
        />
        <PrefRow
          icon={<Volume2 size={20} />}
          label={t.profile.sounds}
          hint={t.profile.soundsHint}
          checked={prefs.sounds}
          onChange={(v) => {
            updatePrefs({ sounds: v });
            if (v) sound.chime(); // сразу дать услышать, как звучит
          }}
        />
      </div>

      {import.meta.env.DEV && (
        <div className="mt-6">
          <Button variant="soft" onClick={() => { seedDemo(); nav('/'); }}>
            <FlaskConical size={18} /> {t.profile.demo}
          </Button>
          <p className="mt-1.5 text-center text-[11.5px] text-ink-faint">{t.profile.demoHint}</p>
        </div>
      )}

      <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { void onFile(e.target.files?.[0]); e.target.value = ''; }} />
      <Sheet open={photoOpen} onClose={() => setPhotoOpen(false)} title={t.profile.photo}>
        <div className="glass-strong divide-y divide-plum-100/70 overflow-hidden p-0">
          <PhotoOption icon={<ImageUp size={20} />} label={t.profile.photoPick} active={photoMode === 'custom'} onClick={() => fileRef.current?.click()} />
          {tgPhoto && (
            <PhotoOption
              icon={<Send size={20} />}
              label={t.profile.photoTelegram}
              hint={t.profile.photoTelegramHint}
              active={photoMode === 'telegram'}
              onClick={() => { updateProfile({ photo: null, useTelegramPhoto: true }); haptic.select(); setPhotoOpen(false); }}
            />
          )}
          <PhotoOption
            icon={<UserRound size={20} />}
            label={t.profile.photoNone}
            hint={t.profile.photoNoneHint}
            active={photoMode === 'none'}
            onClick={() => { updateProfile({ photo: null, useTelegramPhoto: false }); haptic.select(); setPhotoOpen(false); }}
          />
        </div>
      </Sheet>
      <Toast text={toast} />

      <Sheet open={langOpen} onClose={() => setLangOpen(false)} title={t.profile.language}>
        <div className="glass-strong flex items-center justify-between px-4 py-3.5">
          <span className="text-[15px]">🇷🇺 Русский</span>
          <Check size={20} className="text-plum-600" />
        </div>
        <p className="mt-3 px-1 text-[13px] text-ink-muted">עברית и English появятся в следующих версиях.</p>
      </Sheet>
    </div>
  );
}

function PrefRow({ icon, label, hint, checked, onChange }: { icon: ReactNode; label: string; hint: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <span className="text-ink-soft">{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="text-[15px] text-ink">{label}</div>
        <div className="text-[12px] leading-snug text-ink-muted">{hint}</div>
      </div>
      <Toggle checked={checked} onChange={onChange} label={label} />
    </div>
  );
}

function PhotoOption({ icon, label, hint, active, onClick }: { icon: ReactNode; label: string; hint?: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className="tap flex w-full items-center gap-3 px-4 py-3.5 text-left">
      <span className={cn('text-ink-soft', active && 'text-plum-600')}>{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] text-ink">{label}</span>
        {hint && <span className="block text-[12px] text-ink-muted">{hint}</span>}
      </span>
      {active && <Check size={20} className="text-plum-600" />}
    </button>
  );
}
