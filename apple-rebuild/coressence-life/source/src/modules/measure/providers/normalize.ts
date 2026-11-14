// Turns what Apple Health or Health Connect returned into one batch per brand (pure; unit-tested). The platform
// files only run the queries and hand over plain arrays in the RawPlatform shape, so all unit handling, sleep
// staging, temperature baselines and workout zones are tested here without a phone.
import { dayKey } from '@core/dates';
import { mean } from '@core/stats';
import type { Batch, BrandId, CycleEntry, DayMetrics, DeviceWorkout, EcgClass, MetricKey, NightStages, PathId, SleepStage } from '../../devices/schema';
import { brandOf } from '../../devices/merge';
import { zonesFrom } from '../../devices/zones';
import { bucket } from './aggregate';

export type RawPoint = { start: number; end?: number; value: number; origin: string };
export type PointKind =
  | 'steps' | 'distanceKm' | 'activeKcal' | 'basalKcal' | 'exerciseMin' | 'mindfulMin'
  | 'restingHr' | 'walkingHr' | 'hrvSdnn' | 'hrvRmssd' | 'respRate' | 'spo2' | 'tempAbs' | 'tempDelta' | 'vo2max'
  | 'weightKg' | 'bodyFatPct' | 'leanKg' | 'glucose' | 'audioEnvDb' | 'audioPhonesDb' | 'cardioRecovery' | 'heartRate';
export type RawSleep = { start: number; end: number; stage: SleepStage | 'inBed' | 'asleep'; origin: string };
export type RawWorkout = { id: string; start: number; end: number; type: DeviceWorkout['type']; label: string; kcal?: number; distanceKm?: number; origin: string };
export type RawPlatform = {
  path: Extract<PathId, 'healthkit' | 'healthconnect'>;
  points: Partial<Record<PointKind, RawPoint[]>>;
  sleep?: RawSleep[];
  workouts?: RawWorkout[];
  bp?: { t: number; sys: number; dia: number; pulse?: number; origin: string }[];
  ecg?: { id: string; t: number; classification: string; avgHr?: number; symptoms?: boolean; origin: string }[];
  rhythm?: { id: string; t: number; kind: 'irregular' | 'high' | 'low'; origin: string }[];
  flow?: { t: number; flow: CycleEntry['flow']; origin: string }[];
  /** Apple Health's own merged daily step totals (it already removes watch and phone overlap). */
  stepsDaily?: { date: string; value: number }[];
};

const SUM: PointKind[] = ['steps', 'distanceKm', 'activeKcal', 'basalKcal', 'exerciseMin', 'mindfulMin'];
const AVG: PointKind[] = ['restingHr', 'walkingHr', 'hrvSdnn', 'hrvRmssd', 'respRate', 'spo2', 'tempDelta', 'glucose', 'audioEnvDb', 'audioPhonesDb', 'cardioRecovery'];
const LAST: PointKind[] = ['vo2max', 'weightKg', 'bodyFatPct', 'leanKg'];
const KEY_OF: Partial<Record<PointKind, MetricKey>> = { hrvSdnn: 'hrvSdnn', hrvRmssd: 'hrvRmssd', tempDelta: 'tempDev', glucose: 'glucoseAvg' };

/** Apple returns blood oxygen and body fat as fractions (0.97); show percent. */
export const pct = (v: number) => (v <= 1.0001 ? v * 100 : v);

export const ECG_CLASS: Record<string, EcgClass> = {
  sinusRhythm: 'sinus',
  atrialFibrillation: 'afib',
  inconclusiveLowHeartRate: 'lowHr',
  inconclusiveHighHeartRate: 'highHr',
  inconclusivePoorReading: 'poorReading',
  inconclusiveOther: 'inconclusive',
  notSet: 'notSet',
};

/** Group sleep segments into nights (a gap of 3 hours or more starts a new night), credited to the wake day. */
export function nightsFrom(segs: RawSleep[], origin: BrandId, path: PathId): { days: Record<string, DayMetrics>; nights: NightStages[] } {
  const xs = [...segs].filter((s) => s.end > s.start).sort((a, b) => a.start - b.start);
  const groups: RawSleep[][] = [];
  for (const s of xs) {
    const g = groups[groups.length - 1];
    if (g && s.start - Math.max(...g.map((x) => x.end)) < 3 * 3600_000) g.push(s);
    else groups.push([s]);
  }
  const days: Record<string, DayMetrics> = {};
  const nights: NightStages[] = [];
  for (const g of groups) {
    // Prefer the staged segments; a source that only says "asleep" counts as light (core) sleep.
    const staged = g.filter((s) => s.stage !== 'inBed');
    if (!staged.length) continue;
    const asleep = staged.filter((s) => s.stage !== 'awake');
    if (!asleep.length) continue;
    const start = Math.min(...asleep.map((s) => s.start));
    const end = Math.max(...asleep.map((s) => s.end));
    if (end - start < 45 * 60_000) continue; // naps under 45 minutes are left out of the night
    const h = (st: SleepStage) => staged.filter((s) => (s.stage === 'asleep' ? 'core' : s.stage) === st && s.end > start && s.start < end).reduce((a, s) => a + (Math.min(s.end, end) - Math.max(s.start, start)), 0) / 3600_000;
    const day = dayKey(end);
    const r1 = (v: number) => Math.round(v * 100) / 100;
    const deep = h('deep');
    const rem = h('rem');
    const core = h('core');
    const awake = h('awake');
    const wakeMid = new Date(end);
    wakeMid.setHours(0, 0, 0, 0);
    const prev = days[day];
    const total = r1(deep + rem + core);
    // Two sleeps ending the same day (a night and a long nap): the longer one sets the times.
    if (!prev || (prev.sleepH ?? 0) < total) {
      days[day] = { sleepH: Math.round((deep + rem + core + (prev?.sleepH ?? 0)) * 10) / 10, sleepDeepH: r1(deep), sleepRemH: r1(rem), sleepCoreH: r1(core), sleepAwakeH: r1(awake), bedMin: Math.round((start - wakeMid.getTime()) / 60_000), wakeMin: Math.round((end - wakeMid.getTime()) / 60_000) };
      nights.push({ date: day, start, end, origin, path, segments: staged.map((s) => ({ s: s.start, e: s.end, stage: s.stage === 'asleep' ? 'core' : (s.stage as SleepStage) })) });
    } else {
      days[day] = { ...prev, sleepH: Math.round((prev.sleepH! + total) * 10) / 10 };
    }
  }
  const last = new Map<string, NightStages>();
  for (const n of nights) last.set(n.date, n);
  return { days, nights: [...last.values()] };
}

/** Temperature samples are absolute on Apple Health; turn them into a change from that device's own average. */
export function tempDeviation(points: RawPoint[]): RawPoint[] {
  const base = mean(points.map((p) => p.value));
  if (base === null || points.length < 7) return [];
  return points.map((p) => ({ ...p, value: Math.round((p.value - base) * 100) / 100 }));
}

export function platformToBatches(raw: RawPlatform, opts: { maxHr: number; now?: number }): Batch[] {
  const now = opts.now ?? Date.now();
  const byBrand = new Map<BrandId, Batch>();
  const batch = (b: BrandId) => {
    let x = byBrand.get(b);
    if (!x) byBrand.set(b, (x = { path: raw.path, origin: b, fetchedAt: now, days: {}, events: {} }));
    return x;
  };
  const group = <T extends { origin: string }>(xs: T[] | undefined) => {
    const m = new Map<BrandId, T[]>();
    for (const x of xs || []) {
      const b = brandOf(x.origin);
      m.set(b, [...(m.get(b) || []), x]);
    }
    return m;
  };

  for (const [kind, pts] of Object.entries(raw.points) as [PointKind, RawPoint[]][]) {
    if (kind === 'heartRate' || (kind === 'steps' && raw.stepsDaily)) continue;
    for (const [b, xs] of group(pts)) {
      const key = (KEY_OF[kind] || kind) as MetricKey;
      if (kind === 'tempAbs') {
        bucket(tempDeviation(xs), 'tempDev', 'avg', batch(b).days, 2);
        continue;
      }
      const vals = kind === 'spo2' || kind === 'bodyFatPct' ? xs.map((p) => ({ ...p, value: pct(p.value) })) : xs;
      bucket(vals, key, SUM.includes(kind) ? 'sum' : AVG.includes(kind) ? 'avg' : LAST.includes(kind) ? 'last' : 'avg', batch(b).days, kind === 'tempDelta' ? 2 : 1);
      if (kind === 'glucose') batch(b).events.glucose = xs.map((p) => ({ t: p.start, mgdl: Math.round(p.value), origin: b, path: raw.path }));
    }
  }
  if (raw.stepsDaily?.length) for (const s of raw.stepsDaily) (batch('apple').days[s.date] ||= {}).steps = Math.round(s.value);

  for (const [b, segs] of group(raw.sleep)) {
    const n = nightsFrom(segs, b, raw.path);
    const bt = batch(b);
    for (const [d, dm] of Object.entries(n.days)) bt.days[d] = { ...(bt.days[d] || {}), ...dm };
    bt.events.nights = n.nights.slice(-14);
  }

  const hr = (raw.points.heartRate || []).map((p) => ({ t: p.start, bpm: p.value }));
  for (const [b, ws] of group(raw.workouts)) {
    batch(b).events.workouts = ws.map((w) => {
      const z = zonesFrom(hr, w.start, w.end, opts.maxHr);
      return { id: `${raw.path}-${w.id}`, origin: b, path: raw.path, start: w.start, end: w.end, type: w.type, label: w.label, kcal: w.kcal, distanceKm: w.distanceKm, ...(z.avgHr ? { avgHr: z.avgHr, maxHr: z.maxHr!, zones: z.zones } : {}) };
    });
  }
  for (const [b, xs] of group(raw.bp)) {
    batch(b).events.bp = xs.map((x) => ({ t: x.t, sys: Math.round(x.sys), dia: Math.round(x.dia), pulse: x.pulse, origin: b, path: raw.path }));
    bucket(xs.map((x) => ({ start: x.t, value: x.sys })), 'systolic', 'avg', batch(b).days);
    bucket(xs.map((x) => ({ start: x.t, value: x.dia })), 'diastolic', 'avg', batch(b).days);
  }
  for (const [b, xs] of group(raw.ecg)) batch(b).events.ecg = xs.map((x) => ({ id: x.id, t: x.t, classification: ECG_CLASS[x.classification] ?? 'inconclusive', avgHr: x.avgHr, symptoms: x.symptoms, origin: b, path: raw.path }));
  for (const [b, xs] of group(raw.rhythm)) batch(b).events.rhythm = xs.map((x) => ({ ...x, origin: b, path: raw.path }));
  for (const [b, xs] of group(raw.flow)) batch(b).events.cycle = xs.map((x) => ({ date: dayKey(x.t), flow: x.flow, origin: b, path: raw.path }));

  // The shown HRV: RMSSD when the brand reports it, otherwise SDNN.
  for (const bt of byBrand.values()) for (const dm of Object.values(bt.days)) if (dm.hrvRmssd !== undefined || dm.hrvSdnn !== undefined) dm.hrv = dm.hrvRmssd ?? dm.hrvSdnn;
  return [...byBrand.values()].filter((b) => Object.keys(b.days).length || Object.values(b.events).some((e) => (e as unknown[])?.length));
}
