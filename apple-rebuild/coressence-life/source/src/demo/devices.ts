// Investor demo: the sample person "Alex" wears an Oura ring at night, an Apple Watch by day, a Garmin Forerunner
// for runs and rides, and a WHOOP band; weighs in and takes blood pressure on Withings devices; and is trying a
// Dexcom Stelo glucose biosensor. Each brand arrives as its own batch (some twice, through Apple Health as well
// as directly), and the real merge rules in devices/merge.ts decide what is shown, so the demo exercises the same
// de-duplication a real phone would. Deterministic: everything comes from the seeded random function passed in.
import { addDays, parseDay } from '@core/dates';
import type { Batch, BpReading, CycleEntry, DayMetrics, DeviceWorkout, EcgRecord, GlucoseReading, NightStages, RhythmEvent, SleepStage } from '../modules/devices/schema';
import { mergeBatches } from '../modules/devices/merge';
import { zonesFrom } from '../modules/devices/zones';
import type { MeasureSlice } from '../modules/measure/model';
import type { Workout } from '../modules/move/model';
import type { SleepLog } from '../modules/sleep/model';
import type { DevicesSlice } from '../modules/devices/model';
import type { MonitorSlice } from '../modules/monitor/model';

type Input = {
  r: () => number;
  today: string;
  now: number;
  days: string[];
  base: Record<string, DayMetrics>;
  sleepLogs: Record<string, SleepLog>;
  workouts: Workout[];
  restoreMinutes: Record<string, number>;
  techWeek: (d: string) => boolean;
};

const hmToMin = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};
/** Local midnight of a day key (parseDay returns noon). */
const mid0 = (d: string) => parseDay(d).getTime() - 12 * 3600_000;
const r1 = (x: number) => Math.round(x * 10) / 10;
const r2 = (x: number) => Math.round(x * 100) / 100;

/** A night of stages: about 90-minute cycles, more deep sleep early and more REM late, a few brief awakenings. */
function stagesFor(r: () => number, start: number, end: number): { s: number; e: number; stage: SleepStage }[] {
  const out: { s: number; e: number; stage: SleepStage }[] = [];
  let t = start;
  let cycle = 0;
  const push = (mins: number, stage: SleepStage) => {
    const e = Math.min(end, t + mins * 60_000);
    if (e > t) out.push({ s: t, e, stage });
    t = e;
  };
  push(8 + r() * 10, 'core');
  while (t < end - 10 * 60_000) {
    const late = cycle / 5;
    push(18 + r() * 14, 'core');
    push(Math.max(4, (38 - cycle * 8) * (0.7 + r() * 0.5)), 'deep');
    push(10 + r() * 12, 'core');
    push((10 + late * 22) * (0.75 + r() * 0.5), 'rem');
    if (r() < 0.45) push(2 + r() * 6, 'awake');
    cycle++;
  }
  return out;
}

export function demoDevices({ r, today, now, days, base, sleepLogs, workouts, restoreMinutes, techWeek }: Input): { measure: Pick<MeasureSlice, 'synced' | 'provenance' | 'events' | 'batches'>; devices: DevicesSlice; monitor: MonitorSlice } {
  const n = (lo: number, hi: number) => lo + r() * (hi - lo);
  const ago = (d: string) => Math.round((parseDay(today).getTime() - parseDay(d).getTime()) / 86400000);
  const B = (path: Batch['path'], origin: Batch['origin']): Batch => ({ path, origin, fetchedAt: now - 20 * 60_000, days: {}, events: {} });
  const oura = B('oura', 'oura');
  const ouraCopy = B('healthkit', 'oura'); // Oura also writes sleep and heart rate to Apple Health
  const watch = B('healthkit', 'apple');
  const garmin = B('garmin', 'garmin');
  const garminCopy = B('healthkit', 'garmin'); // Garmin Connect copies workouts to Apple Health
  const whoop = B('whoop', 'whoop');
  const withings = B('withings', 'withings');
  const dexcom = B('dexcom', 'dexcom');

  // Cycle: periods every 28 to 30 days; the latest started 22 days ago, so today falls in the luteal phase.
  const cycle: CycleEntry[] = [];
  const periodStarts = [22, 51, 80].map((a) => addDays(today, -a));
  for (const ps of periodStarts) for (let k = 0; k < 5; k++) cycle.push({ date: addDays(ps, k), flow: k === 0 ? 'medium' : k < 3 ? 'heavy' : 'light', origin: 'apple', path: 'healthkit' });
  const cycleDay = (d: string) => {
    const start = periodStarts.find((ps) => ps <= d);
    return start ? Math.round((parseDay(d).getTime() - parseDay(start).getTime()) / 86400000) + 1 : 1;
  };

  const nights: NightStages[] = [];
  let vo2 = 40.6;
  let fat = 23.4;
  for (const d of days) {
    const a = ago(d);
    const b = base[d] || {};
    const tech = techWeek(d);
    const isToday = a === 0;
    const log = sleepLogs[d];
    const mid = mid0(d);
    // ---- Oura: the night
    if (log && b.sleepH) {
      let bedMin = hmToMin(log.bed);
      if (bedMin > 12 * 60) bedMin -= 1440;
      const start = mid + (bedMin + n(6, 16)) * 60_000;
      const end = start + b.sleepH * 3600_000 + n(10, 30) * 60_000;
      const segs = stagesFor(r, start, end);
      const h = (st: SleepStage) => segs.filter((x) => x.stage === st).reduce((s2, x) => s2 + (x.e - x.s), 0) / 3600_000;
      const lutealBump = cycleDay(d) >= 17 ? 0.28 : 0;
      oura.days[d] = {
        sleepH: r1(h('deep') + h('core') + h('rem')),
        sleepDeepH: r2(h('deep')),
        sleepRemH: r2(h('rem')),
        sleepCoreH: r2(h('core')),
        sleepAwakeH: r2(h('awake')),
        bedMin: Math.round((start - mid) / 60_000),
        wakeMin: Math.round((end - mid) / 60_000),
        restingHr: b.restingHr,
        hrvRmssd: b.hrv,
        hrv: b.hrv,
        tempDev: r2(n(-0.18, 0.18) + lutealBump + (tech ? 0.08 : 0)),
        respRate: r1(14.6 + n(-0.5, 0.5) + (tech ? 0.4 : 0)),
        spo2: Math.round(n(96, 98.4)),
        vendorReadiness: Math.round(Math.max(52, Math.min(94, 78 + ((b.hrv ?? 55) - 55) * 0.9 - (tech ? 9 : 0) + n(-5, 5)))),
      };
      if (a <= 13) nights.push({ date: d, start, end, segments: segs, origin: 'oura', path: 'oura' });
      // The Apple Health copy of the same night (slightly different numbers): merge.ts drops it in favor of Oura's API.
      ouraCopy.days[d] = { sleepH: r1((oura.days[d].sleepH ?? 0) - 0.2), restingHr: (b.restingHr ?? 58) + 1 };
    }
    // ---- Apple Watch: the day
    const steps = b.steps ?? 0;
    watch.days[d] = {
      steps,
      distanceKm: r1(steps * 0.00074),
      exerciseMin: b.exerciseMin,
      activeKcal: b.activeKcal,
      basalKcal: Math.round(1660 + n(-25, 25)),
      walkingHr: Math.round(98 + n(-4, 4) + (tech ? 3 : 0)),
      hrvSdnn: b.hrv ? Math.round(b.hrv * 0.82 + n(-4, 4)) : undefined,
      restingHr: b.restingHr ? b.restingHr + 1 : undefined,
      audioEnvDb: Math.round((tech ? 74 : 64) + n(-4, 4)),
      mindfulMin: restoreMinutes[d] ? Math.round(restoreMinutes[d] * 0.6) : undefined,
      sleepH: b.sleepH ? r1(b.sleepH + n(-0.4, 0.2)) : undefined, // Apple Watch sleep, also beaten by Oura
    };
    if (a % 7 === 3) vo2 += 0.12;
    watch.days[d].vo2max = r1(vo2 - 0.6);
    // ---- WHOOP: strain and recovery as WHOOP reports them
    whoop.days[d] = { vendorRecovery: Math.round(Math.max(30, Math.min(96, 62 + ((b.hrv ?? 55) - 55) * 1.6 - (tech ? 14 : 0) + n(-8, 8)))), vendorStrain: r1(Math.min(18.5, 8 + n(0, 4) + (tech ? 3 : 0))), hrvRmssd: b.hrv ? b.hrv + 3 : undefined, restingHr: b.restingHr, sleepH: b.sleepH ? r1(b.sleepH - 0.1) : undefined };
    if (isToday) delete whoop.days[d].vendorStrain;
    // ---- Withings: scale most mornings, blood pressure on about five days a week
    if (b.weightKg || r() < 0.4) {
      fat += n(-0.05, 0.03);
      const w = b.weightKg ?? 80;
      withings.days[d] = { weightKg: w, bodyFatPct: r1(fat), leanKg: r1(w * (1 - fat / 100)) };
    }
    if (r() < 0.75) {
      const bp: BpReading[] = [];
      const trend = Math.min(1, (60 - a) / 60);
      const sys = 131 - trend * 5 + (tech ? 4 : 0);
      const dia = 84 - trend * 3 + (tech ? 2 : 0);
      bp.push({ t: mid + 7 * 3600_000 + n(0, 40) * 60_000, sys: Math.round(sys + n(-5, 5)), dia: Math.round(dia + n(-3, 3)), pulse: (b.restingHr ?? 58) + Math.round(n(2, 8)), origin: 'withings', path: 'withings' });
      if (r() < 0.6 && !isToday) bp.push({ t: mid + 20.5 * 3600_000 + n(0, 40) * 60_000, sys: Math.round(sys - 3 + n(-5, 5)), dia: Math.round(dia - 2 + n(-3, 3)), pulse: (b.restingHr ?? 58) + Math.round(n(4, 10)), origin: 'withings', path: 'withings' });
      withings.events.bp = [...(withings.events.bp || []), ...bp];
      withings.days[d] = { ...(withings.days[d] || {}), systolic: Math.round(bp.reduce((s2, x) => s2 + x.sys, 0) / bp.length), diastolic: Math.round(bp.reduce((s2, x) => s2 + x.dia, 0) / bp.length) };
    }
  }

  // ---- Workouts: Apple Watch records the planned sessions with heart rate; Garmin records runs and rides.
  const hrTrace = (start: number, mins: number, peak: number) => {
    const xs: { t: number; bpm: number }[] = [];
    for (let s2 = 0; s2 < mins * 60; s2 += 5) {
      const warm = Math.min(1, s2 / 300);
      const cool = Math.min(1, (mins * 60 - s2) / 240);
      xs.push({ t: start + s2 * 1000, bpm: Math.round(78 + (peak - 78) * Math.min(warm, cool) + Math.sin(s2 / 45) * 6 + n(-3, 3)) });
    }
    return xs;
  };
  const peakFor: Record<string, number> = { strength: 138, pilates: 122, yoga: 108, walk: 112, stretch: 96, cardio: 150, run: 162, cycle: 150, other: 120 };
  const watchWorkouts: DeviceWorkout[] = [];
  for (const w of workouts) {
    if (w.type === 'stretch' || ago(w.date) > 45) continue;
    const start = mid0(w.date) + (w.type === 'walk' ? 12.25 : 7) * 3600_000;
    const tr = hrTrace(start, w.minutes, peakFor[w.type] + n(-6, 6));
    const z = zonesFrom(tr, start, start + w.minutes * 60_000, 185);
    const label = { pilates: 'Pilates', yoga: 'Yoga', strength: 'Strength', walk: 'Outdoor walk', cardio: 'Cardio', stretch: 'Flexibility', other: 'Workout' }[w.type];
    watchWorkouts.push({ id: `aw-${w.id}`, origin: 'apple', path: 'healthkit', start, end: start + w.minutes * 60_000, type: w.type, label, kcal: Math.round(w.minutes * (w.type === 'strength' ? 6.5 : 4.8)), avgHr: z.avgHr!, maxHr: z.maxHr!, zones: z.zones });
    if (w.type === 'strength' || w.type === 'walk') watch.days[w.date] = { ...watch.days[w.date], cardioRecovery: Math.round(n(24, 34)) };
  }
  watch.events.workouts = watchWorkouts;
  const garminWorkouts: DeviceWorkout[] = [];
  for (const d of days) {
    const dow = parseDay(d).getDay();
    const a = ago(d);
    if (a === 0 || a > 45) continue;
    const isRun = dow === 5 || (dow === 3 && r() < 0.5);
    const isRide = dow === 6 && r() < 0.7;
    if (!isRun && !isRide) continue;
    if (techWeek(d) && r() < 0.6) continue;
    const mins = isRun ? Math.round(n(28, 46)) : Math.round(n(50, 80));
    const start = mid0(d) + (isRun ? 17.5 : 9.5) * 3600_000;
    const tr = hrTrace(start, mins, (isRun ? 164 : 148) + n(-6, 6));
    const z = zonesFrom(tr, start, start + mins * 60_000, 185);
    const km = isRun ? r1(mins / 6.1) : r1(mins / 2.6);
    const gw: DeviceWorkout = { id: `gm-${d}`, origin: 'garmin', path: 'garmin', start, end: start + mins * 60_000, type: isRun ? 'run' : 'cycle', label: isRun ? 'Run' : 'Ride', kcal: Math.round(mins * (isRun ? 11 : 8.5)), distanceKm: km, avgHr: z.avgHr!, maxHr: z.maxHr!, zones: z.zones, vendorLoad: Math.round(z.zones.reduce((s2, m, i) => s2 + m * (i + 1), 0) * 0.9) };
    garminWorkouts.push(gw);
    garminCopy.events.workouts = [...(garminCopy.events.workouts || []), { id: `hk-${gw.id}`, origin: 'garmin', path: 'healthkit', start: gw.start + 60_000, end: gw.end, type: gw.type, label: gw.label, kcal: gw.kcal }];
  }
  garmin.events.workouts = garminWorkouts;
  // Garmin's own daily training load (7-day sum of session loads) and VO2 max.
  for (const d of days) {
    const from = mid0(addDays(d, -6));
    const to = mid0(d) + 86400_000;
    const load = garminWorkouts.filter((w) => w.start >= from && w.start < to).reduce((s2, w) => s2 + (w.vendorLoad ?? 0), 0);
    garmin.days[d] = { vendorLoad: load || undefined, vo2max: r1(vo2) };
  }

  // ---- Dexcom Stelo: a reading every 15 minutes for the last 14 days (shown with the US one-hour delay).
  const glucose: GlucoseReading[] = [];
  const latest = now - 62 * 60_000;
  const meals = [7.6, 12.6, 19.1];
  for (let t = latest - 14 * 86400_000; t <= latest; t += 15 * 60_000) {
    const dt = new Date(t);
    const hr = dt.getHours() + dt.getMinutes() / 60;
    let v = 91 + Math.sin(t / 3.1e6) * 3 + n(-4, 4) + (hr > 3 && hr < 7 ? 6 : 0); // a small rise before waking
    for (const m of meals) {
      const since = hr - m;
      if (since > 0 && since < 2.5) v += (since < 0.75 ? since / 0.75 : Math.max(0, 1 - (since - 0.75) / 1.75)) * (m === 19.1 ? (Math.floor(t / 86400_000) % 4 === 0 ? 92 : 52) : m === 12.6 ? 38 : 30) * (0.75 + ((Math.floor(t / 86400_000) * 7 + m) % 5) / 10);
    }
    glucose.push({ t, mgdl: Math.round(v), origin: 'dexcom', path: 'dexcom' });
  }
  dexcom.events.glucose = glucose;
  for (const d of days) {
    const from = mid0(d);
    const xs = glucose.filter((g) => g.t >= from && g.t < from + 86400_000);
    if (xs.length) dexcom.days[d] = { glucoseAvg: Math.round(xs.reduce((s2, g) => s2 + g.mgdl, 0) / xs.length) };
  }

  // ---- Apple Watch ECG recordings and one high heart rate notification during the busy week.
  const ecg: EcgRecord[] = [
    { id: 'ecg-demo-1', t: mid0(addDays(today, -52)) + 9.2 * 3600_000, classification: 'sinus', avgHr: 64, symptoms: false, origin: 'apple', path: 'healthkit' },
    { id: 'ecg-demo-2', t: mid0(addDays(today, -30)) + 21.6 * 3600_000, classification: 'sinus', avgHr: 71, symptoms: false, origin: 'apple', path: 'healthkit' },
    { id: 'ecg-demo-3', t: mid0(addDays(today, -8)) + 23.1 * 3600_000, classification: 'poorReading', symptoms: false, origin: 'apple', path: 'healthkit' },
    { id: 'ecg-demo-4', t: mid0(addDays(today, -8)) + 23.2 * 3600_000, classification: 'sinus', avgHr: 78, symptoms: true, origin: 'apple', path: 'healthkit' },
  ];
  const rhythm: RhythmEvent[] = [{ id: 'rh-demo-1', t: mid0(addDays(today, -8)) + 22.9 * 3600_000, kind: 'high', origin: 'apple', path: 'healthkit' }];
  watch.events.ecg = ecg;
  watch.events.rhythm = rhythm;
  watch.events.cycle = cycle;
  oura.events.nights = nights;

  const batches = [oura, ouraCopy, watch, garmin, garminCopy, whoop, withings, dexcom];
  const merged = mergeBatches(batches);
  const since = now - 34 * 86400_000;
  const conn = (lag: number) => ({ connected: true, since, lastSync: now - lag * 60_000 });
  return {
    measure: { synced: merged.days, provenance: merged.provenance, events: merged.events },
    devices: { conns: { oura: conn(18), whoop: conn(25), garmin: conn(41), withings: conn(12), dexcom: conn(62) } },
    monitor: { targets: { bpSys: 130, bpDia: 80, bpSetBy: 'Dr. Rivera (sample), June 2026', glucoseLow: 70, glucoseHigh: 180 }, cycleOn: true },
  };
}
