/** Локальная календарная дата пользователя в формате YYYY-MM-DD */
export type DateKey = string;

export type Flow = 'spotting' | 'light' | 'medium' | 'heavy';
export type Mood = 'good' | 'neutral' | 'sad' | 'irritable' | 'anxious' | 'sensitive';
export type Energy = 'low' | 'medium' | 'high';
export type Pain = 'none' | 'mild' | 'moderate' | 'severe';
export type Appetite = 'low' | 'normal' | 'high';
export type SleepQuality = 'bad' | 'ok' | 'good';
export type Regularity = 'regular' | 'irregular' | 'unknown';

export interface DailyLog {
  date: DateKey;
  mood?: Mood;
  energy?: Energy;
  pain?: Pain;
  appetite?: Appetite;
  sleepHours?: number;
  sleepQuality?: SleepQuality;
  symptoms: string[];
  customSymptoms: string[];
  notes?: string;
  timezone: string;
  createdAt: string;
  updatedAt: string;
}

/** Защита при близости. withdrawal — прерванный акт (это не защита, но и не «без защиты» в чистом виде) */
export type Protection = 'protected' | 'unprotected' | 'withdrawal';
/** Сексуальное влечение */
export type Libido = 'low' | 'medium' | 'high';

/**
 * Близость за день (одна запись на день, как в Apple Health / Clue).
 * Самые чувствительные данные: хранятся только на устройстве и в копии
 * в облаке Telegram, на сервер LUNA и партнёру не уходят.
 */
export interface IntimacyLog {
  date: DateKey;
  /** Была близость. false — запись только о влечении */
  sex: boolean;
  /** Не указано — значит, не выбрано */
  protection?: Protection;
  orgasm?: boolean;
  /** Боль или дискомфорт во время близости — важно для врача */
  pain?: boolean;
  libido?: Libido;
  updatedAt: string;
}

export interface Profile {
  name: string;
  cycleLength: number | null;
  periodLength: number | null;
  regularity: Regularity | null;
  onboarded: boolean;
  createdAt: string;
  /** Своё фото (data URL, 256×256 JPEG). null/нет — не выбрано */
  photo?: string | null;
  /** Показывать фото из профиля Telegram, если своего нет (по умолчанию да) */
  useTelegramPhoto?: boolean;
}

export interface NotificationSettings {
  periodReminder: boolean;
  symptomReminder: boolean;
  tips: boolean;
  weeklyReport: boolean;
  time: string; // HH:mm
}

/** Ощущения интерфейса */
export interface Preferences {
  haptics: boolean;
  sounds: boolean;
  /** auto — как в Telegram / системе */
  theme: ThemePref;
  /** Раздел «Близость» (по умолчанию включён; undefined = да). Выключение только прячет, записи остаются */
  intimacy?: boolean;
}

export type ThemePref = 'auto' | 'light' | 'dark';

export type Phase = 'menstrual' | 'follicular' | 'ovulatory' | 'luteal';
export type Confidence = 'low' | 'medium' | 'high';
