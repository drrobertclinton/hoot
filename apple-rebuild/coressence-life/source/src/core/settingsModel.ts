// Settings shape and defaults (no imports, so any file can use them).
export type Track = 'live' | 'perform' | 'both';
export type Appearance = 'system' | 'light' | 'dark';

export interface ReminderSettings {
  checkin: { on: boolean; time: string };
  water: { on: boolean; everyHours: number; from: string; to: string };
  bedtime: { on: boolean; time: string };
  review: { on: boolean; weekday: number; time: string };
  plan: { on: boolean; minutesBefore: number };
}

export interface Goals {
  sleepHours: number;
  moveMinutes: number;
  weeklyMoveMinutes: number;
  strengthDays: number;
  steps: number;
  waterMl: number;
  restoreMinutes: number;
  fastHours: number;
}

export interface Settings {
  onboarded: boolean;
  name: string;
  track: Track;
  appearance: Appearance;
  units: 'us' | 'metric';
  /** Optional faith content in Restore (Scripture reflection). Off by default so the app can be white-labeled. */
  faith: boolean;
  /** Investor demo: a separate sample profile with realistic data. The person's own data is untouched. */
  demo: boolean;
  /** Demo builds only: preview every Coressence+ feature without a purchase. */
  previewAll: boolean;
  goals: Goals;
  reminders: ReminderSettings;
  /** Maximum heart rate for zones. Empty means 185, or the person can enter the figure their clinician or a test gave. */
  maxHr?: number;
}

export const DEFAULT_GOALS: Goals = {
  sleepHours: 8,
  moveMinutes: 30,
  weeklyMoveMinutes: 150,
  strengthDays: 2,
  steps: 8000,
  waterMl: 2000,
  restoreMinutes: 10,
  fastHours: 12,
};

export const DEFAULT_SETTINGS: Settings = {
  onboarded: false,
  name: '',
  track: 'live',
  appearance: 'system',
  units: 'us',
  faith: false,
  demo: false,
  previewAll: false,
  goals: DEFAULT_GOALS,
  reminders: {
    checkin: { on: false, time: '08:00' },
    water: { on: false, everyHours: 2, from: '09:00', to: '19:00' },
    bedtime: { on: false, time: '22:00' },
    review: { on: false, weekday: 0, time: '18:00' },
    plan: { on: false, minutesBefore: 30 },
  },
};

