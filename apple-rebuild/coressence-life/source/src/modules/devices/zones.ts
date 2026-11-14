// Heart rate zones and session load (pure; unit-tested). Zones use the common five-zone split by percent of
// maximum heart rate: 1 = 50–60%, 2 = 60–70%, 3 = 70–80%, 4 = 80–90%, 5 = 90% and up.
import type { HrZones } from './schema';

export const ZONE_BOUNDS = [0.5, 0.6, 0.7, 0.8, 0.9] as const;
export const ZONE_NAMES = ['Easy', 'Light', 'Steady', 'Hard', 'Maximum'] as const;

/** Estimated maximum heart rate. Uses the person's own value when set; otherwise 208 − 0.7 × age (Tanaka), or 185. */
export function maxHrFor(opts: { own?: number | null; age?: number | null } = {}): number {
  if (opts.own && opts.own > 120 && opts.own < 230) return Math.round(opts.own);
  if (opts.age && opts.age > 10 && opts.age < 100) return Math.round(208 - 0.7 * opts.age);
  return 185;
}

/** Zone 1–5 for one heart rate, or 0 below zone 1. */
export function zoneOf(bpm: number, maxHr: number): 0 | 1 | 2 | 3 | 4 | 5 {
  const p = bpm / maxHr;
  let z = 0;
  for (let i = 0; i < ZONE_BOUNDS.length; i++) if (p >= ZONE_BOUNDS[i]) z = i + 1;
  return z as 0 | 1 | 2 | 3 | 4 | 5;
}

/**
 * Minutes in each zone from timestamped heart rate samples between start and end. Each sample counts until the
 * next one, capped at 60 seconds so gaps in the data are not filled in.
 */
export function zonesFrom(samples: { t: number; bpm: number }[], start: number, end: number, maxHr: number): { zones: HrZones; avgHr: number | null; maxHr: number | null } {
  const xs = samples.filter((s) => s.t >= start && s.t <= end && s.bpm > 25 && s.bpm < 250).sort((a, b) => a.t - b.t);
  const zones: HrZones = [0, 0, 0, 0, 0];
  if (!xs.length) return { zones, avgHr: null, maxHr: null };
  let weighted = 0;
  let secs = 0;
  for (let i = 0; i < xs.length; i++) {
    const next = i + 1 < xs.length ? xs[i + 1].t : Math.min(end, xs[i].t + 5000);
    const dt = Math.max(0, Math.min(60, (next - xs[i].t) / 1000));
    const z = zoneOf(xs[i].bpm, maxHr);
    if (z > 0) zones[z - 1] += dt / 60;
    weighted += xs[i].bpm * dt;
    secs += dt;
  }
  const round = (m: number) => Math.round(m * 10) / 10;
  return { zones: zones.map(round) as HrZones, avgHr: secs ? Math.round(weighted / secs) : Math.round(xs[0].bpm), maxHr: Math.max(...xs.map((s) => s.bpm)) };
}

/**
 * Session load: zone-weighted minutes (1 × zone 1 … 5 × zone 5), the simple form of Edwards' training impulse.
 * Without heart rate, minutes × effort (1–10) ÷ 2 keeps logged sessions on a comparable scale.
 */
export function sessionLoad(w: { zones?: HrZones | null; minutes?: number; effort?: number | null }): number {
  if (w.zones && w.zones.some((z) => z > 0)) return Math.round(w.zones.reduce((a, m, i) => a + m * (i + 1), 0));
  if (w.minutes && w.effort) return Math.round((w.minutes * w.effort) / 2);
  return 0;
}
