// Track: how you feel (subjective check-ins) and the habits you are building.
import { dayKey, lastDays } from '@core/dates';
import { correlation, mean, streak } from '@core/stats';

export type Checkin = { date: string; energy: number; mood: number; stress: number; soreness: number; focus: number; note?: string };
export type Habit = { id: string; name: string; icon: string; archived?: boolean };
export type TrackSlice = { checkins: Record<string, Checkin>; habits: Habit[]; done: Record<string, string[]> };

export const KEY = 'track';
export const DEFAULT_HABITS: Habit[] = [
  { id: 'h-daylight', name: 'Morning daylight', icon: 'sun' },
  { id: 'h-protein', name: 'Protein at breakfast', icon: 'coffee' },
  { id: 'h-screens', name: 'Screens off before bed', icon: 'moon' },
];
export const EMPTY: TrackSlice = { checkins: {}, habits: DEFAULT_HABITS, done: {} };

export const METRICS: { key: keyof Omit<Checkin, 'date' | 'note'>; label: string; low: string; high: string; invert?: boolean }[] = [
  { key: 'energy', label: 'Energy', low: 'Drained', high: 'Strong' },
  { key: 'mood', label: 'Mood', low: 'Low', high: 'Good' },
  { key: 'stress', label: 'Stress', low: 'Calm', high: 'High', invert: true },
  { key: 'soreness', label: 'Soreness', low: 'None', high: 'A lot', invert: true },
  { key: 'focus', label: 'Focus', low: 'Scattered', high: 'Sharp' },
];

/** A 0..1 wellbeing index from a check-in (stress and soreness count in reverse). */
export function wellbeing(c: Checkin | undefined): number | null {
  if (!c) return null;
  const parts = METRICS.map((m) => (m.invert ? 6 - c[m.key] : c[m.key]));
  return (mean(parts)! - 1) / 4;
}

export function habitStreak(s: TrackSlice, id: string, today = dayKey()) {
  return streak(Object.entries(s.done).filter(([, ids]) => ids.includes(id)).map(([d]) => d), today);
}

export function checkinStreak(s: TrackSlice, today = dayKey()) {
  return streak(Object.keys(s.checkins), today);
}

export function series(s: TrackSlice, key: keyof Omit<Checkin, 'date' | 'note'>, days: number, end = dayKey()) {
  return lastDays(days, end).map((d) => ({ date: d, value: s.checkins[d] ? s.checkins[d][key] : null }));
}

/** Correlation between a check-in metric and any other daily number (e.g. sleep hours). */
export function relate(s: TrackSlice, key: keyof Omit<Checkin, 'date' | 'note'>, other: Record<string, number | null | undefined>, days: number, end = dayKey()) {
  const pairs: [number, number][] = [];
  for (const d of lastDays(days, end)) {
    const a = other[d];
    const b = s.checkins[d]?.[key];
    if (typeof a === 'number' && typeof b === 'number') pairs.push([a, b]);
  }
  return { r: correlation(pairs), n: pairs.length };
}

export function relationWords(r: number | null, a: string, b: string): string {
  if (r === null) return `Not enough paired days yet to compare ${a} and ${b}.`;
  const abs = Math.abs(r);
  if (abs < 0.2) return `So far, ${a} and ${b} do not move together much.`;
  const strength = abs >= 0.6 ? 'clearly' : abs >= 0.4 ? 'moderately' : 'slightly';
  return r > 0 ? `On days with more ${a}, your ${b} has ${strength} tended to be higher.` : `On days with more ${a}, your ${b} has ${strength} tended to be lower.`;
}
