// Sleep: nightly log, consistency, and the on-device sleep sound check.
import { dayKey, hm, lastDays, sleepHours } from '@core/dates';
import { mean, stdev } from '@core/stats';
import type { NightSummary, SoundEvent } from './noise';

export type SleepLog = { date: string; bed: string; wake: string; quality: number; awakenings: number; note?: string };
export type Night = {
  id: string;
  date: string;
  start: number;
  end: number;
  buckets: { t: number; max: number }[];
  events: SoundEvent[];
  summary: NightSummary;
};
export type SleepSlice = { logs: Record<string, SleepLog>; nights: Night[] };
export const KEY = 'sleep';
export const EMPTY: SleepSlice = { logs: {}, nights: [] };

export function hoursFor(s: SleepSlice, date: string, deviceHours?: number): number | null {
  const l = s.logs[date];
  if (l) return sleepHours(l.bed, l.wake);
  return typeof deviceHours === 'number' ? deviceHours : null;
}

/** Sleep ring 0..1: time asleep against your target, plus how rested you felt. */
export function sleepScore(hours: number | null, quality: number | null, target: number): number | null {
  if (hours === null) return null;
  const dur = Math.min(1, hours / Math.max(1, target));
  if (quality === null) return dur;
  return Math.min(1, dur * 0.7 + ((quality - 1) / 4) * 0.3);
}

/** Bedtime spread over the last week, in minutes (lower is steadier). */
export function bedtimeSpread(s: SleepSlice, end = dayKey(), days = 7): number | null {
  const mins = lastDays(days, end)
    .map((d) => s.logs[d])
    .filter(Boolean)
    .map((l) => {
      const m = hm(l!.bed);
      return m < 12 * 60 ? m + 1440 : m; // after midnight counts as late, not early
    });
  const sd = stdev(mins);
  return sd === null ? null : Math.round(sd);
}

export function sleepSeries(s: SleepSlice, days: number, device: Record<string, number | undefined> = {}, end = dayKey()) {
  return lastDays(days, end).map((d) => ({ date: d, value: hoursFor(s, d, device[d]) }));
}

export function avgSleep(s: SleepSlice, days: number, device: Record<string, number | undefined> = {}, end = dayKey()) {
  return mean(sleepSeries(s, days, device, end).map((x) => x.value));
}
