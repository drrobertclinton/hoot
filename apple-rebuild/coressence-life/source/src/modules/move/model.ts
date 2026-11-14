// Move: Pilates, yoga, stretching, strength and everyday activity.
import { lastDays, dayKey, weekStart, addDays } from '@core/dates';
import { streak, sum } from '@core/stats';

export type MoveType = 'pilates' | 'yoga' | 'stretch' | 'strength' | 'walk' | 'cardio' | 'other';
export type Workout = {
  id: string;
  date: string;
  type: MoveType;
  minutes: number;
  effort: number;
  routineId?: string;
  note?: string;
  /** Live heart rate from a Bluetooth strap: average, peak and minutes in zones 1 to 5. */
  avgHr?: number;
  maxHr?: number;
  zones?: [number, number, number, number, number];
  device?: string;
};
export type MoveSlice = { workouts: Workout[] };
export const KEY = 'move';
export const EMPTY: MoveSlice = { workouts: [] };

export const TYPES: { key: MoveType; label: string; icon: string; strength?: boolean }[] = [
  { key: 'pilates', label: 'Pilates', icon: 'target', strength: true },
  { key: 'yoga', label: 'Yoga', icon: 'sun' },
  { key: 'stretch', label: 'Stretching', icon: 'maximize-2' },
  { key: 'strength', label: 'Strength', icon: 'anchor', strength: true },
  { key: 'walk', label: 'Walk', icon: 'navigation' },
  { key: 'cardio', label: 'Cardio', icon: 'activity' },
  { key: 'other', label: 'Other', icon: 'plus-circle' },
];
export const typeLabel = (t: MoveType) => TYPES.find((x) => x.key === t)?.label ?? 'Session';

export function minutesOn(s: MoveSlice, date: string) {
  return sum(s.workouts.filter((w) => w.date === date).map((w) => w.minutes));
}

export function dailyMinutes(s: MoveSlice, days: number, end = dayKey()) {
  return lastDays(days, end).map((d) => ({ date: d, value: minutesOn(s, d) }));
}

/** This Monday-to-Sunday week: minutes and strength days (US Physical Activity Guidelines use weekly totals). */
export function weekSummary(s: MoveSlice, date = dayKey()) {
  const start = weekStart(date);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const ws = s.workouts.filter((w) => days.includes(w.date));
  const strengthDays = new Set(ws.filter((w) => TYPES.find((t) => t.key === w.type)?.strength).map((w) => w.date)).size;
  return { minutes: sum(ws.map((w) => w.minutes)), sessions: ws.length, strengthDays, days };
}

export function moveStreak(s: MoveSlice, today = dayKey()) {
  return streak(s.workouts.map((w) => w.date), today);
}

/** Movement ring 0..1: logged minutes (or device exercise minutes, whichever is higher) and steps. */
export function moveScore(minutes: number, goalMin: number, steps: number | undefined, goalSteps: number): number {
  const m = Math.min(1, minutes / Math.max(1, goalMin));
  if (steps === undefined) return m;
  const st = Math.min(1, steps / Math.max(1, goalSteps));
  return Math.min(1, m * 0.7 + st * 0.3);
}
