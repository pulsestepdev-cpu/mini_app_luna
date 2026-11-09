/**
 * Тактильная и звуковая обратная связь.
 *
 * Вибрация: внутри Telegram — нативный HapticFeedback (iOS и Android),
 * в обычном браузере — navigator.vibrate (работает только на Android;
 * Safari на iPhone вибрацию из веба не поддерживает).
 *
 * Звук: синтезируется Web Audio прямо в браузере — без файлов.
 * На iPhone уважает беззвучный режим (audioSession = ambient).
 */
import { getTelegram } from '@/app/telegram';
import { useLunaStore } from '@/store/useLunaStore';

type Impact = 'light' | 'medium' | 'heavy' | 'rigid' | 'soft';

const prefs = () => useLunaStore.getState().prefs;

function tgHaptics() {
  const tg = getTelegram();
  return tg && tg.isVersionAtLeast('6.1') ? tg.HapticFeedback ?? null : null;
}

function vibrate(pattern: number | number[]) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* не поддерживается */
  }
}

export const haptic = {
  /** Нажатие кнопки */
  tap(style: Impact = 'light') {
    if (!prefs().haptics) return;
    const h = tgHaptics();
    if (h) h.impactOccurred(style);
    else vibrate(style === 'light' || style === 'soft' ? 8 : 14);
  },
  /** Выбор варианта: чип, переключатель, вкладка */
  select() {
    if (!prefs().haptics) return;
    const h = tgHaptics();
    if (h) h.selectionChanged();
    else vibrate(5);
  },
  success() {
    if (!prefs().haptics) return;
    const h = tgHaptics();
    if (h) h.notificationOccurred('success');
    else vibrate([10, 60, 16]);
  },
  warning() {
    if (!prefs().haptics) return;
    const h = tgHaptics();
    if (h) h.notificationOccurred('warning');
    else vibrate([20, 80, 20]);
  },
};

/* ---------- Звук ---------- */
let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    const nav = navigator as Navigator & { audioSession?: { type: string } };
    if (nav.audioSession) nav.audioSession.type = 'ambient'; // не играть в беззвучном режиме iPhone
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx ??= new Ctor();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

/** Одна мягкая нота колокольчика */
function bell(ac: AudioContext, freq: number, at: number, gain: number, length = 1.4) {
  const t0 = ac.currentTime + at;
  const out = ac.createGain();
  out.gain.setValueAtTime(0, t0);
  out.gain.linearRampToValueAtTime(gain, t0 + 0.012);
  out.gain.exponentialRampToValueAtTime(0.0001, t0 + length);
  out.connect(ac.destination);
  // Основной тон + тихий обертон — звучит как стеклянный колокольчик
  for (const [mult, g] of [[1, 1], [2.76, 0.18], [5.4, 0.05]] as const) {
    const o = ac.createOscillator();
    const og = ac.createGain();
    o.type = 'sine';
    o.frequency.value = freq * mult;
    og.gain.value = g;
    o.connect(og).connect(out);
    o.start(t0);
    o.stop(t0 + length);
  }
}

export const sound = {
  /** Нежный двухнотный перезвон: запись сохранена */
  chime() {
    if (!prefs().sounds) return;
    const ac = audio();
    if (!ac) return;
    bell(ac, 1318.5, 0, 0.07); // E6
    bell(ac, 1975.5, 0.11, 0.05, 1.8); // B6
  },
  /** Короткий мягкий «тинь»: отмечены месячные */
  soft() {
    if (!prefs().sounds) return;
    const ac = audio();
    if (!ac) return;
    bell(ac, 1046.5, 0, 0.05, 0.9); // C6
  },
};
