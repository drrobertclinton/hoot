// Restore: breathing, quiet time, gratitude, time outdoors and (optional) Scripture reflection.
import { dayKey, lastDays } from '@core/dates';
import { streak, sum } from '@core/stats';

export type RestoreKind = 'breathing' | 'quiet' | 'gratitude' | 'outdoors' | 'scripture' | 'connection';
export type RestoreSession = { id: string; date: string; kind: RestoreKind; minutes: number; note?: string };
export type RestoreSlice = { sessions: RestoreSession[] };
export const KEY = 'restore';
export const EMPTY: RestoreSlice = { sessions: [] };

export const KINDS: { key: RestoreKind; label: string; icon: string; faith?: boolean }[] = [
  { key: 'breathing', label: 'Slow breathing', icon: 'wind' },
  { key: 'quiet', label: 'Quiet time', icon: 'feather' },
  { key: 'gratitude', label: 'Gratitude', icon: 'smile' },
  { key: 'outdoors', label: 'Time outdoors', icon: 'cloud' },
  { key: 'connection', label: 'Time with people', icon: 'users' },
  { key: 'scripture', label: 'Scripture reflection', icon: 'book-open', faith: true },
];

export function restoreMinutes(s: RestoreSlice, date: string) {
  return sum(s.sessions.filter((x) => x.date === date).map((x) => x.minutes));
}

export function restoreScore(s: RestoreSlice, date: string, goal: number): number | null {
  const m = restoreMinutes(s, date);
  return m ? Math.min(1, m / Math.max(1, goal)) : null;
}

export function restoreSeries(s: RestoreSlice, days: number, end = dayKey()) {
  return lastDays(days, end).map((d) => ({ date: d, value: restoreMinutes(s, d) }));
}

export function restoreStreak(s: RestoreSlice, today = dayKey()) {
  return streak(s.sessions.map((x) => x.date), today);
}
