// Merging and de-duplication (pure; unit-tested).
//
// The same night of sleep can reach the phone three ways: Oura's own API, Oura's copy in Apple Health, and an
// aggregator. The rules, in order:
//  1. Hand-entered numbers always win.
//  2. A copy that came through Apple Health, Health Connect or an aggregator is dropped when that brand is also
//     connected directly and its direct API reported the same metric for the same day ("prefer the direct API").
//  3. Of what is left, each metric takes the brand that measures it best (METRIC_PRIORITY), never a sum across
//     brands, so steps from a phone and a watch are not counted twice.
//  4. Workouts that overlap by more than half are one workout; the copy with heart rate zones wins, then the
//     direct API, then brand priority. Blood pressure readings within 3 minutes and glucose readings within
//     2.5 minutes of each other are the same reading.
import type { Batch, BrandId, DayMetrics, DeviceWorkout, HealthEvents, MetricKey, PathId } from './schema';
import { EMPTY_EVENTS } from './schema';

/** Which brand produced a sample, from its Apple Health bundle id / source name or Health Connect package name. */
export function brandOf(idOrName: string | undefined | null): BrandId {
  const s = String(idOrName || '').toLowerCase();
  if (!s) return 'other';
  const rules: [RegExp, BrandId][] = [
    [/oura/, 'oura'],
    [/whoop/, 'whoop'],
    [/garmin/, 'garmin'],
    [/fitbit/, 'fitbit'],
    [/withings|wiscale|health ?mate|nokia\.health/, 'withings'],
    [/polar/, 'polar'],
    [/dexcom|stelo/, 'dexcom'],
    [/libre|abbott|lingo/, 'libre'],
    [/omron/, 'omron'],
    [/samsung|shealth|\.sec\.android/, 'samsung'],
    [/coros/, 'coros'],
    [/suunto/, 'suunto'],
    [/wahoo/, 'wahoo'],
    [/ultrahuman/, 'ultrahuman'],
    [/eight ?sleep|eightsleep/, 'eightsleep'],
    [/google\.android\.apps\.fitness|google fit|pixel/, 'google'],
    [/^com\.apple\.|apple watch|^iphone|^health$/, 'apple'],
  ];
  for (const [re, b] of rules) if (re.test(s)) return b;
  return 'other';
}

/** Paths that carry copies of other brands' data. */
export const PLATFORM_PATHS: PathId[] = ['healthkit', 'healthconnect', 'terra', 'junction', 'rook'];
const DIRECT_FOR: Partial<Record<BrandId, PathId>> = { oura: 'oura', whoop: 'whoop', garmin: 'garmin', fitbit: 'fitbit', google: 'fitbit', withings: 'withings', polar: 'polar', dexcom: 'dexcom', samsung: 'samsung' };

const SLEEP: BrandId[] = ['oura', 'whoop', 'garmin', 'eightsleep', 'ultrahuman', 'fitbit', 'google', 'polar', 'samsung', 'apple', 'withings', 'coros', 'suunto', 'other', 'phone'];
const HEART: BrandId[] = ['oura', 'whoop', 'garmin', 'polar', 'ultrahuman', 'apple', 'fitbit', 'google', 'samsung', 'withings', 'coros', 'suunto', 'wahoo', 'strap', 'other', 'phone'];
const ACTIVITY: BrandId[] = ['apple', 'garmin', 'fitbit', 'google', 'samsung', 'polar', 'coros', 'suunto', 'whoop', 'oura', 'ultrahuman', 'withings', 'phone', 'other'];
const FITNESS: BrandId[] = ['garmin', 'apple', 'polar', 'coros', 'suunto', 'fitbit', 'google', 'samsung', 'whoop', 'oura', 'other'];
const BODY: BrandId[] = ['withings', 'garmin', 'fitbit', 'samsung', 'omron', 'apple', 'google', 'other', 'phone'];
const BP: BrandId[] = ['withings', 'omron', 'samsung', 'apple', 'garmin', 'other', 'phone'];
const GLUCOSE: BrandId[] = ['dexcom', 'libre', 'apple', 'samsung', 'other', 'phone'];

export const METRIC_PRIORITY: Record<MetricKey, BrandId[]> = {
  steps: ACTIVITY,
  distanceKm: ACTIVITY,
  exerciseMin: ACTIVITY,
  activeKcal: ACTIVITY,
  basalKcal: ACTIVITY,
  restingHr: HEART,
  walkingHr: HEART,
  hrv: HEART,
  hrvSdnn: HEART,
  hrvRmssd: HEART,
  respRate: SLEEP,
  spo2: SLEEP,
  tempDev: SLEEP,
  vo2max: FITNESS,
  sleepH: SLEEP,
  sleepDeepH: SLEEP,
  sleepRemH: SLEEP,
  sleepCoreH: SLEEP,
  sleepAwakeH: SLEEP,
  bedMin: SLEEP,
  wakeMin: SLEEP,
  weightKg: BODY,
  bodyFatPct: BODY,
  leanKg: BODY,
  systolic: BP,
  diastolic: BP,
  glucoseAvg: GLUCOSE,
  mindfulMin: ['apple', 'samsung', 'google', 'oura', 'other', 'phone'],
  audioEnvDb: ['apple', 'other'],
  audioPhonesDb: ['apple', 'other'],
  cardioRecovery: FITNESS,
  vendorStrain: ['whoop'],
  vendorRecovery: ['whoop'],
  vendorReadiness: ['oura'],
  vendorLoad: FITNESS,
};

const rank = (list: BrandId[], b: BrandId) => {
  const i = list.indexOf(b);
  return i < 0 ? list.length + 1 : i;
};
const isPlatform = (p: PathId) => PLATFORM_PATHS.includes(p);

export type Merged = {
  days: Record<string, DayMetrics>;
  /** Which brand each shown number came from. */
  provenance: Record<string, Partial<Record<MetricKey, BrandId>>>;
  events: HealthEvents;
};

export function mergeBatches(batches: Batch[], manual: Record<string, DayMetrics> = {}): Merged {
  // Direct-API coverage: brand -> day -> metrics it reported directly.
  const direct = new Map<BrandId, Record<string, Set<string>>>();
  for (const b of batches) {
    if (isPlatform(b.path) || b.path === 'manual' || b.path === 'ble') continue;
    const m = direct.get(b.origin) || {};
    for (const [d, dm] of Object.entries(b.days)) m[d] = new Set([...(m[d] || []), ...Object.keys(dm)]);
    direct.set(b.origin, m);
  }
  const shadowed = (b: Batch, day: string, key: string) => isPlatform(b.path) && !!DIRECT_FOR[b.origin] && !!direct.get(b.origin)?.[day]?.has(key);

  const best: Record<string, Partial<Record<MetricKey, { v: number; brand: BrandId; r: number; directPath: boolean }>>> = {};
  for (const b of batches) {
    for (const [day, dm] of Object.entries(b.days)) {
      for (const [k, v] of Object.entries(dm) as [MetricKey, number][]) {
        if (typeof v !== 'number' || !Number.isFinite(v) || shadowed(b, day, k)) continue;
        const r = rank(METRIC_PRIORITY[k] || [], b.origin);
        const cur = (best[day] ||= {})[k];
        const directPath = !isPlatform(b.path);
        // Lower rank wins; on a tie the direct API wins over a copy.
        if (!cur || r < cur.r || (r === cur.r && directPath && !cur.directPath)) best[day][k] = { v, brand: b.origin, r, directPath };
      }
    }
  }
  const days: Record<string, DayMetrics> = {};
  const provenance: Merged['provenance'] = {};
  for (const [day, ms] of Object.entries(best)) {
    days[day] = {};
    provenance[day] = {};
    for (const [k, x] of Object.entries(ms) as [MetricKey, { v: number; brand: BrandId }][]) {
      days[day][k] = x.v;
      provenance[day][k] = x.brand;
    }
  }
  for (const [day, dm] of Object.entries(manual)) {
    days[day] = { ...(days[day] || {}), ...dm };
    for (const k of Object.keys(dm) as MetricKey[]) (provenance[day] ||= {})[k] = 'phone';
  }
  return { days, provenance, events: mergeEvents(batches, direct) };
}

function eventRank(origin: BrandId, path: PathId, list: BrandId[], direct: Map<BrandId, unknown>) {
  // A platform copy of a directly connected brand sorts after everything else.
  const copyPenalty = isPlatform(path) && DIRECT_FOR[origin] && direct.has(origin) ? 100 : 0;
  return rank(list, origin) + copyPenalty + (isPlatform(path) ? 0.5 : 0);
}

export function overlapShare(a: { start: number; end: number }, b: { start: number; end: number }) {
  const o = Math.min(a.end, b.end) - Math.max(a.start, b.start);
  const shorter = Math.min(a.end - a.start, b.end - b.start);
  return o <= 0 || shorter <= 0 ? 0 : o / shorter;
}

export function dedupeWorkouts(ws: DeviceWorkout[], direct: Map<BrandId, unknown> = new Map()): DeviceWorkout[] {
  const score = (w: DeviceWorkout) => (w.zones ? 0 : 1000) + (w.avgHr ? 0 : 500) + eventRank(w.origin, w.path, FITNESS, direct);
  const sorted = [...ws].sort((a, b) => score(a) - score(b));
  const kept: DeviceWorkout[] = [];
  for (const w of sorted) if (!kept.some((k) => overlapShare(k, w) > 0.5)) kept.push(w);
  return kept.sort((a, b) => b.start - a.start);
}

function dedupeByTime<T extends { t: number; origin: BrandId; path: PathId }>(xs: T[], windowMs: number, list: BrandId[], direct: Map<BrandId, unknown>): T[] {
  const sorted = [...xs].sort((a, b) => eventRank(a.origin, a.path, list, direct) - eventRank(b.origin, b.path, list, direct));
  const kept: T[] = [];
  for (const x of sorted) if (!kept.some((k) => Math.abs(k.t - x.t) <= windowMs)) kept.push(x);
  return kept.sort((a, b) => a.t - b.t);
}

export function mergeEvents(batches: Batch[], direct: Map<BrandId, unknown> = new Map()): HealthEvents {
  const all = (k: keyof HealthEvents) => batches.flatMap((b) => (b.events[k] || []) as never[]);
  const nightsByDate = new Map<string, HealthEvents['nights'][number]>();
  for (const n of (all('nights') as HealthEvents['nights']).sort((a, b) => eventRank(a.origin, a.path, SLEEP, direct) - eventRank(b.origin, b.path, SLEEP, direct)))
    if (!nightsByDate.has(n.date)) nightsByDate.set(n.date, n);
  const cycleByDate = new Map<string, HealthEvents['cycle'][number]>();
  for (const c of all('cycle') as HealthEvents['cycle']) if (!cycleByDate.has(c.date) || c.flow !== 'none') cycleByDate.set(c.date, c);
  const uniq = <T extends { id: string; t: number }>(xs: T[]) => {
    const seen: T[] = [];
    for (const x of xs) if (!seen.some((s) => s.id === x.id || Math.abs(s.t - x.t) < 60_000)) seen.push(x);
    return seen.sort((a, b) => b.t - a.t);
  };
  return {
    ...EMPTY_EVENTS,
    workouts: dedupeWorkouts(all('workouts') as DeviceWorkout[], direct),
    bp: dedupeByTime(all('bp') as HealthEvents['bp'], 3 * 60_000, BP, direct),
    glucose: dedupeByTime(all('glucose') as HealthEvents['glucose'], 150_000, GLUCOSE, direct),
    ecg: uniq(all('ecg') as HealthEvents['ecg']),
    rhythm: uniq(all('rhythm') as HealthEvents['rhythm']),
    cycle: [...cycleByDate.values()].sort((a, b) => a.date.localeCompare(b.date)),
    nights: [...nightsByDate.values()].sort((a, b) => a.date.localeCompare(b.date)),
  };
}

/** Split samples that came through Apple Health or Health Connect into one batch per brand. */
export function splitByOrigin<T>(items: T[], originOf: (x: T) => BrandId): Map<BrandId, T[]> {
  const out = new Map<BrandId, T[]>();
  for (const x of items) {
    const b = originOf(x);
    out.set(b, [...(out.get(b) || []), x]);
  }
  return out;
}
