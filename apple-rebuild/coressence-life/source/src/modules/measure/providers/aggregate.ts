// Turns raw health samples into one set of numbers per local day (pure; unit-tested).
import { dayKey } from '@core/dates';
import type { DayMetrics, MetricKey } from '../model';

export type Sample = { start: string | number; end?: string | number; value: number };
type Mode = 'sum' | 'avg' | 'last' | 'durationH';

const ts = (x: string | number) => (typeof x === 'number' ? x : Date.parse(x));

export function bucket(samples: Sample[], key: MetricKey, mode: Mode, out: Record<string, DayMetrics> = {}, dp = 1): Record<string, DayMetrics> {
  const acc: Record<string, { total: number; n: number; lastTs: number; last: number }> = {};
  for (const s of samples) {
    const st = ts(s.start);
    const en = s.end !== undefined ? ts(s.end) : st;
    if (!Number.isFinite(st)) continue;
    // Sleep is credited to the morning it ends; everything else to the day it starts.
    const d = dayKey(mode === 'durationH' ? en : st);
    const a = (acc[d] ||= { total: 0, n: 0, lastTs: -Infinity, last: 0 });
    const v = mode === 'durationH' ? Math.max(0, en - st) / 3_600_000 : s.value;
    if (!Number.isFinite(v)) continue;
    a.total += v;
    a.n += 1;
    if (st >= a.lastTs) {
      a.lastTs = st;
      a.last = v;
    }
  }
  for (const [d, a] of Object.entries(acc)) {
    const v = mode === 'avg' ? a.total / a.n : mode === 'last' ? a.last : a.total;
    out[d] = { ...(out[d] || {}), [key]: Math.round(v * 10 ** dp) / 10 ** dp };
  }
  return out;
}
