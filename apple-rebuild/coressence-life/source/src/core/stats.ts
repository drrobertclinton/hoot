// Small, dependency-free helpers for streaks, averages and trends (unit-tested).
import { addDays, dayKey } from './dates';

/** Consecutive days with activity, ending today (or yesterday if today has nothing yet). */
export function streak(days: Iterable<string>, today: string = dayKey()): number {
  const set = new Set(days);
  let d = set.has(today) ? today : addDays(today, -1);
  let n = 0;
  while (set.has(d)) {
    n++;
    d = addDays(d, -1);
  }
  return n;
}

/** Longest run of consecutive days anywhere in the history. */
export function bestStreak(days: Iterable<string>): number {
  const sorted = [...new Set(days)].sort();
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const d of sorted) {
    run = prev && addDays(prev, 1) === d ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }
  return best;
}

export function mean(xs: (number | null | undefined)[]): number | null {
  const v = xs.filter((x): x is number => typeof x === 'number' && Number.isFinite(x));
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
}

export function sum(xs: (number | null | undefined)[]): number {
  return xs.reduce<number>((a, b) => a + (typeof b === 'number' && Number.isFinite(b) ? b : 0), 0);
}

export function median(xs: number[]): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export function percentile(xs: number[], p: number): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const i = Math.min(s.length - 1, Math.max(0, Math.round((p / 100) * (s.length - 1))));
  return s[i];
}

export function stdev(xs: number[]): number | null {
  const m = mean(xs);
  if (m === null || xs.length < 2) return null;
  return Math.sqrt(xs.reduce((a, x) => a + (x - m) ** 2, 0) / (xs.length - 1));
}

/** Pearson correlation for paired values; null with fewer than 5 pairs. */
export function correlation(pairs: [number, number][]): number | null {
  if (pairs.length < 5) return null;
  const mx = mean(pairs.map((p) => p[0]))!;
  const my = mean(pairs.map((p) => p[1]))!;
  let n = 0;
  let dx = 0;
  let dy = 0;
  for (const [x, y] of pairs) {
    n += (x - mx) * (y - my);
    dx += (x - mx) ** 2;
    dy += (y - my) ** 2;
  }
  if (!dx || !dy) return null;
  return n / Math.sqrt(dx * dy);
}

export const clamp = (x: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, x));
export const round = (x: number, dp = 0) => Math.round(x * 10 ** dp) / 10 ** dp;

/** Plain description of a change between two averages. */
export function changeWords(cur: number | null, prev: number | null, unit = '', dp = 0): string {
  if (cur === null) return 'No entries yet';
  if (prev === null) return `${round(cur, dp)}${unit}`;
  const d = round(cur - prev, dp);
  if (d === 0) return `${round(cur, dp)}${unit}, same as the week before`;
  return `${round(cur, dp)}${unit}, ${d > 0 ? 'up' : 'down'} ${Math.abs(d)}${unit} from the week before`;
}
