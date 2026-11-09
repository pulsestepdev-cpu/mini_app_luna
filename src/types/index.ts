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

export interface Profile {
  name: string;
  cycleLength: number | null;
  periodLength: number | null;
  regularity: Regularity | null;
  onboarded: boolean;
  createdAt: string;
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
}

export type Phase = 'menstrual' | 'follicular' | 'ovulatory' | 'luteal';
export type Confidence = 'low' | 'medium' | 'high';
