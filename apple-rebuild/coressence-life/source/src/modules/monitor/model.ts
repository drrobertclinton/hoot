// Monitor: plain-language views of what connected devices report (pure; unit-tested). Nothing here diagnoses.
// Numbers are compared with the person's own history or with targets their clinician gave them, and when a
// pattern is worth a professional look the note says so in the app's usual words.
import { addDays, dayKey, hm, lastDays, parseDay } from '@core/dates';
import { clamp, mean, stdev } from '@core/stats';
import type { BpReading, CycleEntry, DeviceWorkout, EcgClass, EcgRecord, GlucoseReading, RhythmEvent } from '../devices/schema';
import { sessionLoad } from '../devices/zones';
import type { MeasureSlice } from '../measure/model';
import { dayMetrics } from '../measure/model';
import type { MoveSlice } from '../move/model';
import type { Meal, MealKind, MealTag } from '../fuel/model';

export type Targets = {
  /** Home blood pressure targets from the person's clinician. Empty until entered. */
  bpSys?: number;
  bpDia?: number;
  bpSetBy?: string;
  /** Glucose range shown as "in range". Defaults to 70–180 mg/dL, the range CGM reports use; change it to your clinician's. */
  glucoseLow: number;
  glucoseHigh: number;
  glucoseSetBy?: string;
};
export type MonitorSlice = { targets: Targets; cycleOn: boolean };
export const KEY = 'monitor';
export const EMPTY: MonitorSlice = { targets: { glucoseLow: 70, glucoseHigh: 180 }, cycleOn: false };

export type Tone = 'good' | 'info' | 'warn' | 'danger';
export type Insight = { tone: Tone; text: string };

const r1 = (x: number) => Math.round(x * 10) / 10;

// ------------------------------------------------------------------ sleep stages and consistency
export function stageSummary(m: MeasureSlice, days = 7, end = dayKey()) {
  const ds = lastDays(days, end).map((d) => dayMetrics(m, d)).filter((x) => x.sleepDeepH !== undefined || x.sleepRemH !== undefined);
  if (!ds.length) return null;
  const avg = (k: 'sleepDeepH' | 'sleepRemH' | 'sleepCoreH' | 'sleepAwakeH' | 'sleepH') => mean(ds.map((x) => x[k] ?? null)) ?? 0;
  const deep = avg('sleepDeepH');
  const rem = avg('sleepRemH');
  const core = avg('sleepCoreH');
  const awake = avg('sleepAwakeH');
  const asleep = deep + rem + core || avg('sleepH');
  return { nights: ds.length, deep: r1(deep), rem: r1(rem), core: r1(core), awake: r1(awake), asleep: r1(asleep), deepPct: asleep ? Math.round((deep / asleep) * 100) : 0, remPct: asleep ? Math.round((rem / asleep) * 100) : 0 };
}

/** Consistency 0–100 from how much bed and wake times moved over the last nights (100 = same times every night). */
export function sleepConsistency(m: MeasureSlice, days = 14, end = dayKey()) {
  const ds = lastDays(days, end).map((d) => dayMetrics(m, d));
  const bed = ds.map((x) => x.bedMin).filter((x): x is number => typeof x === 'number');
  const wake = ds.map((x) => x.wakeMin).filter((x): x is number => typeof x === 'number');
  if (bed.length < 5 || wake.length < 5) return null;
  const sdBed = stdev(bed)!;
  const sdWake = stdev(wake)!;
  const score = Math.round(clamp(100 - ((sdBed + sdWake) / 2 - 15) * (100 / 75)));
  return { score, sdBed: Math.round(sdBed), sdWake: Math.round(sdWake), nights: bed.length };
}

export function sleepInsights(m: MeasureSlice, end = dayKey()): Insight[] {
  const out: Insight[] = [];
  const c = sleepConsistency(m, 14, end);
  if (c && c.sdWake > 60) out.push({ tone: 'info', text: `Your wake time moved by about ${c.sdWake} minutes from night to night. A steadier wake time, weekends included, is the simplest way to make sleep more regular.` });
  else if (c && c.score >= 75) out.push({ tone: 'good', text: 'Your bed and wake times have been steady. That regularity supports better sleep on its own.' });
  const s = stageSummary(m, 7, end);
  if (s && s.awake > 1) out.push({ tone: 'info', text: `You were awake about ${s.awake} hours a night in bed this week. If that continues and you feel unrefreshed, it is worth raising with a clinician.` });
  return out;
}

// ------------------------------------------------------------------ strain and training load
/** Load for one day: device workouts by heart rate zones, plus logged Move sessions not already recorded by a device. */
export function dailyLoad(m: MeasureSlice, move: MoveSlice, date: string): number {
  const dev = (m.events?.workouts || []).filter((w) => dayKey(w.start) === date);
  const devLoad = dev.reduce((a, w) => a + sessionLoad({ zones: w.zones, minutes: (w.end - w.start) / 60_000 }), 0);
  const logged = move.workouts.filter((w) => w.date === date && !dev.some((d) => d.type === w.type || (d.type === 'run' && w.type === 'cardio')));
  return Math.round(devLoad + logged.reduce((a, w) => a + sessionLoad({ zones: (w as { zones?: DeviceWorkout['zones'] }).zones, minutes: w.minutes, effort: w.effort }), 0));
}

/**
 * Acute (last 7 days) against chronic (last 28 days) average daily load. Ratios between about 0.8 and 1.3 are
 * usually described as a steady build; above 1.5 is a sharp jump (Gabbett, Br J Sports Med 2016).
 */
export function loadBalance(m: MeasureSlice, move: MoveSlice, end = dayKey()) {
  const series = lastDays(28, end).map((d) => ({ date: d, load: dailyLoad(m, move, d) }));
  const acute = mean(series.slice(-7).map((x) => x.load)) ?? 0;
  const chronic = mean(series.map((x) => x.load)) ?? 0;
  const ratio = chronic > 0 ? r1(acute / chronic) : null;
  let words = 'Log or sync a few workouts to see your training balance.';
  let tone: Tone = 'info';
  if (ratio !== null) {
    if (ratio > 1.5) {
      words = 'This week’s load is well above your four-week average. A sharp jump like this is when soreness and overuse injuries tend to show up; consider an easier day.';
      tone = 'warn';
    } else if (ratio > 1.3) words = 'This week is busier than usual. Build up gradually and watch how you recover.';
    else if (ratio >= 0.8) {
      words = 'This week’s load is in line with your recent weeks: a steady build.';
      tone = 'good';
    } else words = 'A lighter week than usual. Fine for recovery; for fitness, ease back up gradually.';
  }
  return { series, acute: Math.round(acute), chronic: Math.round(chronic), ratio, words, tone };
}

// ------------------------------------------------------------------ glucose (display only)
export function glucoseStats(readings: GlucoseReading[], from: number, to: number, t: Pick<Targets, 'glucoseLow' | 'glucoseHigh'>) {
  const xs = readings.filter((r) => r.t >= from && r.t <= to).map((r) => r.mgdl);
  if (xs.length < 12) return null;
  const avg = mean(xs)!;
  const sd = stdev(xs) ?? 0;
  const share = (f: (v: number) => boolean) => Math.round((xs.filter(f).length / xs.length) * 100);
  return {
    n: xs.length,
    avg: Math.round(avg),
    cv: Math.round((sd / avg) * 100),
    inRange: share((v) => v >= t.glucoseLow && v <= t.glucoseHigh),
    below: share((v) => v < t.glucoseLow),
    above: share((v) => v > t.glucoseHigh),
    veryLow: xs.filter((v) => v < 54).length,
    min: Math.min(...xs),
    max: Math.max(...xs),
  };
}

export function glucoseDaily(readings: GlucoseReading[], days: number, t: Pick<Targets, 'glucoseLow' | 'glucoseHigh'>, end = dayKey()) {
  return lastDays(days, end).map((d) => {
    const from = parseDay(d).getTime() - 12 * 3600_000; // parseDay is noon; start at midnight
    const s = glucoseStats(readings, from, from + 86400_000 - 1, t);
    return { date: d, inRange: s?.inRange ?? null, avg: s?.avg ?? null };
  });
}

export function glucoseInsights(stats: ReturnType<typeof glucoseStats>, t: Targets): Insight[] {
  if (!stats) return [];
  const out: Insight[] = [];
  if (stats.veryLow > 0) out.push({ tone: 'warn', text: `Some readings were under 54 mg/dL. Sensors can read low when pressed on during sleep, but if you felt shaky, sweaty or confused, or this keeps happening, talk with your clinician.` });
  if (stats.cv > 36) out.push({ tone: 'info', text: `Your readings moved around a lot (variability ${stats.cv}%). Meals, activity and sleep all play a part; the Fuel log can help you see which.` });
  if (stats.inRange >= 90 && !stats.veryLow) out.push({ tone: 'good', text: `${stats.inRange}% of readings were inside ${t.glucoseLow}–${t.glucoseHigh} mg/dL.` });
  return out;
}

// ------------------------------------------------------------------ glucose with meals and workouts (display only)
const MIN = 60_000;
const between = (rs: GlucoseReading[], from: number, to: number) => rs.filter((r) => r.t >= from && r.t <= to);

/** When a logged meal happened, in the phone's local time. */
export function mealTime(m: Pick<Meal, 'date' | 'time'>): number {
  const d = parseDay(m.date);
  d.setHours(0, 0, 0, 0);
  return d.getTime() + hm(m.time) * MIN;
}

export type MealResponse = {
  id: string;
  t: number;
  kind: MealKind;
  tags: MealTag[];
  name?: string;
  /** Average in the 30 minutes before the meal. */
  before: number;
  /** Highest reading in the two hours after. */
  peak: number;
  rise: number;
  minutesToPeak: number;
  /** Reading closest to two hours after, when there is one. */
  at2h: number | null;
  /** A recorded workout or walk that began within 90 minutes after the meal. */
  movedAfter: boolean;
  curve: { min: number; mgdl: number }[];
};

/** The two hours after each logged meal. Meals without enough sensor readings around them are left out. */
export function mealResponses(readings: GlucoseReading[], meals: Meal[], workouts: DeviceWorkout[] = [], now = Date.now()): MealResponse[] {
  const out: MealResponse[] = [];
  for (const m of meals) {
    const t = mealTime(m);
    if (t + 120 * MIN > now) continue;
    const pre = between(readings, t - 30 * MIN, t);
    const post = between(readings, t, t + 120 * MIN);
    if (!pre.length || post.length < 4) continue;
    const before = Math.round(mean(pre.map((r) => r.mgdl))!);
    const top = post.reduce((a, r) => (r.mgdl > a.mgdl ? r : a));
    const late = between(readings, t + 105 * MIN, t + 135 * MIN).sort((a, b) => Math.abs(a.t - t - 120 * MIN) - Math.abs(b.t - t - 120 * MIN))[0];
    out.push({
      id: m.id,
      t,
      kind: m.kind,
      tags: m.tags,
      name: m.food?.name || m.note,
      before,
      peak: top.mgdl,
      rise: Math.max(0, top.mgdl - before),
      minutesToPeak: Math.round((top.t - t) / MIN),
      at2h: late ? late.mgdl : null,
      movedAfter: workouts.some((w) => w.start >= t - 5 * MIN && w.start <= t + 90 * MIN),
      curve: [...pre, ...post.filter((r) => r.t > t)].map((r) => ({ min: Math.round((r.t - t) / MIN), mgdl: r.mgdl })),
    });
  }
  return out.sort((a, b) => b.t - a.t);
}

export type WorkoutResponse = { id: string; t: number; label: string; minutes: number; before: number; lowest: number; after: number | null; change: number | null; /** A meal logged from 30 minutes before to an hour after: its rise would mask the workout's effect. */ mealNearby: boolean };

/** Glucose around each recorded workout: the 30 minutes before, the lowest point during, and the hour after. */
export function workoutResponses(readings: GlucoseReading[], workouts: DeviceWorkout[], now = Date.now(), meals: Meal[] = []): WorkoutResponse[] {
  const mealTimes = meals.map(mealTime);
  const seen = new Set<string>();
  const out: WorkoutResponse[] = [];
  for (const w of [...workouts].sort((a, b) => a.start - b.start)) {
    const slot = `${Math.round(w.start / (10 * MIN))}`; // the same session can arrive from two apps
    if (seen.has(slot) || w.end > now) continue;
    const pre = between(readings, w.start - 30 * MIN, w.start);
    const during = between(readings, w.start, w.end + 15 * MIN);
    if (!pre.length || !during.length) continue;
    seen.add(slot);
    const post = between(readings, w.end, w.end + 60 * MIN);
    const before = Math.round(mean(pre.map((r) => r.mgdl))!);
    const after = post.length ? Math.round(mean(post.map((r) => r.mgdl))!) : null;
    out.push({ id: w.id, t: w.start, label: w.label, minutes: Math.round((w.end - w.start) / MIN), before, lowest: Math.min(...during.map((r) => r.mgdl)), after, change: after === null ? null : after - before, mealNearby: mealTimes.some((t) => t >= w.start - 30 * MIN && t <= w.end + 60 * MIN) });
  }
  return out.sort((a, b) => b.t - a.t);
}

const avgRise = (xs: MealResponse[]) => (xs.length ? Math.round(mean(xs.map((x) => x.rise))!) : null);

/** Average rise by meal, by what was on the plate, and with or without movement afterwards. Groups need 3 meals. */
export function mealPatterns(rs: MealResponse[]) {
  const group = (label: string, xs: MealResponse[]) => ({ label, n: xs.length, rise: avgRise(xs) });
  const byKind = (['breakfast', 'lunch', 'dinner', 'snack'] as MealKind[]).map((k) => group(k[0].toUpperCase() + k.slice(1), rs.filter((r) => r.kind === k))).filter((g) => g.n >= 3);
  const pair = (a: string, xa: MealResponse[], b: string, xb: MealResponse[]) => (xa.length >= 3 && xb.length >= 3 ? [group(a, xa), group(b, xb)] : null);
  return {
    byKind,
    protein: pair('With protein', rs.filter((r) => r.tags.includes('protein')), 'Without', rs.filter((r) => !r.tags.includes('protein'))),
    plants: pair('With vegetables or fruit', rs.filter((r) => r.tags.includes('plants')), 'Without', rs.filter((r) => !r.tags.includes('plants'))),
    packaged: pair('Mostly packaged', rs.filter((r) => r.tags.includes('processed')), 'Not packaged', rs.filter((r) => !r.tags.includes('processed'))),
    moved: pair('Moved within 90 minutes', rs.filter((r) => r.movedAfter), 'Did not', rs.filter((r) => !r.movedAfter)),
  };
}

/** Plain observations from the person's own meals and workouts. They describe; they never tell anyone how to treat anything. */
export function glucoseLifeInsights(rs: MealResponse[], ws: WorkoutResponse[]): Insight[] {
  const out: Insight[] = [];
  const p = mealPatterns(rs);
  const said = (pr: ReturnType<typeof mealPatterns>['moved'], text: (a: number, b: number) => string, min = 8) => {
    if (pr && pr[0].rise !== null && pr[1].rise !== null && pr[1].rise - pr[0].rise >= min) out.push({ tone: 'good', text: text(pr[0].rise, pr[1].rise) });
  };
  said(p.moved, (a, b) => `After meals followed by a walk or workout, your glucose rose about ${a} mg/dL on average, against about ${b} when you stayed still. Ten minutes of walking after eating is an easy thing to repeat.`);
  said(p.protein, (a, b) => `Meals with protein rose about ${a} mg/dL on average; meals without rose about ${b}.`);
  said(p.plants, (a, b) => `Meals with vegetables or fruit rose about ${a} mg/dL on average; meals without rose about ${b}.`);
  if (p.packaged && p.packaged[0].rise !== null && p.packaged[1].rise !== null && p.packaged[0].rise - p.packaged[1].rise >= 8)
    out.push({ tone: 'info', text: `Mostly packaged meals rose about ${p.packaged[0].rise} mg/dL on average, against about ${p.packaged[1].rise} for the rest.` });
  const top = [...p.byKind].sort((a, b) => (b.rise ?? 0) - (a.rise ?? 0))[0];
  if (p.byKind.length >= 2 && top?.rise) out.push({ tone: 'info', text: `${top.label} is your biggest rise on average (about ${top.rise} mg/dL over ${top.n} meals). That is the meal where a change would show up most clearly.` });
  const drops = ws.filter((w) => w.change !== null && !w.mealNearby);
  if (drops.length >= 3) {
    const avg = Math.round(mean(drops.map((w) => w.change!))!);
    out.push({ tone: 'info', text: avg <= -5 ? `In the hour after a workout your glucose averaged about ${Math.abs(avg)} mg/dL lower than before it.` : avg >= 5 ? `In the hour after a workout your glucose averaged about ${avg} mg/dL higher than before it. Hard sessions can do that for a short while.` : 'Your glucose stayed about level across your recent workouts.' });
  }
  if (ws.some((w) => w.lowest < 70)) out.push({ tone: 'warn', text: 'Glucose dipped under 70 mg/dL around at least one workout. If you felt shaky or light-headed, or you take glucose-lowering medicine, raise it with your clinician.' });
  return out;
}

// ------------------------------------------------------------------ blood pressure (log and trends)
/** Device readings plus hand-entered ones (counted at noon on their day). */
export function bpReadings(m: MeasureSlice): BpReading[] {
  const out = [...(m.events?.bp || [])];
  for (const [d, dm] of Object.entries(m.manual)) if (dm.systolic && dm.diastolic) out.push({ t: parseDay(d).getTime(), sys: dm.systolic, dia: dm.diastolic, origin: 'phone', path: 'manual' });
  return out.sort((a, b) => b.t - a.t);
}

export function bpSummary(readings: BpReading[], t: Targets, now = Date.now()) {
  const within = (days: number) => readings.filter((r) => r.t >= now - days * 86400_000);
  const avg = (xs: BpReading[]) => (xs.length ? { sys: Math.round(mean(xs.map((r) => r.sys))!), dia: Math.round(mean(xs.map((r) => r.dia))!), n: xs.length } : null);
  const week = avg(within(7));
  const month = avg(within(30));
  const hasTargets = !!(t.bpSys && t.bpDia);
  const above = (r: { sys: number; dia: number }) => hasTargets && (r.sys > t.bpSys! || r.dia > t.bpDia!);
  const recent = within(14);
  return { week, month, hasTargets, aboveCount: recent.filter(above).length, recentCount: recent.length, above };
}

export function bpInsights(readings: BpReading[], t: Targets, now = Date.now()): Insight[] {
  const out: Insight[] = [];
  const latest = readings[0];
  if (latest && latest.t >= now - 2 * 86400_000 && (latest.sys >= 180 || latest.dia >= 120))
    out.push({ tone: 'danger', text: 'Your latest reading is 180/120 or higher. Rest quietly for five minutes and measure again. If it is still that high, contact your clinician right away. With chest pain, shortness of breath, back pain, numbness or weakness, or changes in vision or speech, call 911.' });
  const s = bpSummary(readings, t, now);
  if (!s.hasTargets) out.push({ tone: 'info', text: 'Ask your clinician what home blood pressure targets they want for you, and enter them here. Until then, Coressence shows your readings and averages without judging them.' });
  else if (s.week && s.week.n >= 6 && (s.week.sys > t.bpSys! || s.week.dia > t.bpDia!))
    {
    const which = s.week.sys > t.bpSys! && s.week.dia > t.bpDia! ? 'both numbers are' : s.week.sys > t.bpSys! ? 'the top number is' : 'the bottom number is';
    out.push({ tone: 'warn', text: `Your 7-day home average is ${s.week.sys}/${s.week.dia}; against the targets your clinician set (${t.bpSys}/${t.bpDia}), ${which} above target. Share these readings with them; they may want to review your plan.` });
  }
  else if (s.week && s.week.n >= 3) out.push({ tone: 'good', text: `Your 7-day average (${s.week.sys}/${s.week.dia}) is within the targets your clinician set.` });
  return out;
}

// ------------------------------------------------------------------ body composition
export function bodyTrend(m: MeasureSlice, key: 'weightKg' | 'bodyFatPct' | 'leanKg', days: number, end = dayKey()) {
  const series = lastDays(days, end).map((d) => ({ date: d, value: dayMetrics(m, d)[key] ?? null }));
  const firstWeek = mean(series.slice(0, 7).map((x) => x.value));
  const lastWeek = mean(series.slice(-7).map((x) => x.value));
  return { series, change: firstWeek !== null && lastWeek !== null ? Math.round((lastWeek - firstWeek) * 10) / 10 : null, latest: [...series].reverse().find((x) => x.value !== null)?.value ?? null };
}

// ------------------------------------------------------------------ cycle (estimates only)
export function periods(entries: CycleEntry[]): { start: string; end: string }[] {
  const days = [...new Set(entries.filter((e) => e.flow !== 'none').map((e) => e.date))].sort();
  const out: { start: string; end: string }[] = [];
  for (const d of days) {
    const last = out[out.length - 1];
    if (last && parseDay(d).getTime() - parseDay(last.end).getTime() <= 2 * 86400_000) last.end = d;
    else out.push({ start: d, end: d });
  }
  return out;
}

export type CyclePhase = 'period' | 'follicular' | 'ovulation' | 'luteal';
export const PHASE_LABEL: Record<CyclePhase, string> = { period: 'Period', follicular: 'Follicular phase', ovulation: 'Around ovulation (estimate)', luteal: 'Luteal phase' };

export function cycleState(entries: CycleEntry[], today = dayKey()) {
  const ps = periods(entries).filter((p) => p.start <= today);
  if (!ps.length) return null;
  const starts = ps.map((p) => parseDay(p.start).getTime());
  const lengths = starts.slice(1).map((s, i) => Math.round((s - starts[i]) / 86400_000)).filter((l) => l >= 15 && l <= 60);
  const recent = lengths.slice(-6);
  const avgLen = recent.length ? Math.round(mean(recent)!) : 28;
  const last = ps[ps.length - 1];
  const day = Math.round((parseDay(today).getTime() - parseDay(last.start).getTime()) / 86400_000) + 1;
  const periodLen = Math.round(mean(ps.slice(-6).map((p) => (parseDay(p.end).getTime() - parseDay(p.start).getTime()) / 86400_000 + 1))!);
  const ovulationDay = avgLen - 14;
  const phase: CyclePhase = day <= periodLen ? 'period' : Math.abs(day - ovulationDay) <= 1 ? 'ovulation' : day < ovulationDay ? 'follicular' : 'luteal';
  const spread = recent.length >= 3 ? Math.max(...recent) - Math.min(...recent) : 0;
  return { day, avgLen, periodLen, phase, nextStart: addDays(last.start, avgLen), lengths: recent, spread, count: ps.length };
}

export function cycleInsights(c: ReturnType<typeof cycleState>, m: MeasureSlice, today = dayKey()): Insight[] {
  if (!c) return [];
  const out: Insight[] = [];
  const dm = dayMetrics(m, today);
  if (c.phase === 'luteal' && typeof dm.tempDev === 'number' && dm.tempDev > 0.2)
    out.push({ tone: 'info', text: `Your overnight temperature is up ${dm.tempDev.toFixed(1)} °C. A small rise in the second half of a cycle is common, and resting heart rate often edges up too, so a lower readiness score this week may simply reflect that.` });
  if (c.phase === 'period') out.push({ tone: 'info', text: 'During a period, energy and sleep can dip. Gentle movement and an earlier night are reasonable choices if you feel run down.' });
  if (c.lengths.length >= 3 && (c.spread > 7 || c.avgLen < 21 || c.avgLen > 35))
    out.push({ tone: 'warn', text: 'Your recent cycles have been shorter, longer or less regular than the usual 21 to 35 days. That is worth mentioning to your clinician.' });
  return out;
}

// ------------------------------------------------------------------ heart rhythm records (display as reported)
export const ECG_LABEL: Record<EcgClass, string> = {
  sinus: 'Sinus rhythm',
  afib: 'Atrial fibrillation',
  inconclusive: 'Inconclusive',
  lowHr: 'Inconclusive: low heart rate',
  highHr: 'Inconclusive: high heart rate',
  poorReading: 'Inconclusive: poor recording',
  notSet: 'No result',
};
export const RHYTHM_LABEL: Record<RhythmEvent['kind'], string> = { irregular: 'Irregular rhythm notification', high: 'High heart rate notification', low: 'Low heart rate notification' };

export function rhythmHistory(ecg: EcgRecord[], rhythm: RhythmEvent[]) {
  return [
    ...ecg.map((e) => ({ id: e.id, t: e.t, kind: 'ecg' as const, title: ECG_LABEL[e.classification], detail: e.avgHr ? `ECG, average ${e.avgHr} bpm` : 'ECG', origin: e.origin, flag: e.classification === 'afib' })),
    ...rhythm.map((r) => ({ id: r.id, t: r.t, kind: 'notification' as const, title: RHYTHM_LABEL[r.kind], detail: 'Notification', origin: r.origin, flag: r.kind === 'irregular' })),
  ].sort((a, b) => b.t - a.t);
}

export function rhythmInsights(ecg: EcgRecord[], rhythm: RhythmEvent[], now = Date.now()): Insight[] {
  const recent = (t: number) => t >= now - 90 * 86400_000;
  const afib = ecg.filter((e) => e.classification === 'afib' && recent(e.t)).length;
  const irn = rhythm.filter((r) => r.kind === 'irregular' && recent(r.t)).length;
  const out: Insight[] = [];
  if (afib || irn)
    out.push({ tone: 'warn', text: `Your device reported ${[afib ? `${afib} ECG result${afib > 1 ? 's' : ''} of atrial fibrillation` : '', irn ? `${irn} irregular rhythm notification${irn > 1 ? 's' : ''}` : ''].filter(Boolean).join(' and ')} in the last 90 days. Coressence does not interpret these. Share them with your clinician, and if you have chest pain, fainting or trouble breathing, call 911.` });
  else if (ecg.length) out.push({ tone: 'good', text: 'Your recent ECG recordings were reported as sinus rhythm. Keep recording when your clinician asks or when you notice symptoms.' });
  return out;
}

// ------------------------------------------------------------------ the hub
export type MonitorCard = 'readiness' | 'sleep' | 'load' | 'glucose' | 'bp' | 'body' | 'cycle' | 'rhythm' | 'voice';
export function availableCards(m: MeasureSlice, s: MonitorSlice): MonitorCard[] {
  const ev = m.events;
  const any = (k: 'sleepDeepH' | 'weightKg' | 'bodyFatPct') => Object.values(m.synced).some((d) => d[k] !== undefined) || Object.values(m.manual).some((d) => d[k] !== undefined);
  const out: MonitorCard[] = ['readiness', 'load', 'bp'];
  if (any('sleepDeepH') || Object.values(m.synced).some((d) => d.bedMin !== undefined)) out.splice(1, 0, 'sleep');
  if (ev?.glucose?.length) out.push('glucose');
  if (any('weightKg') || any('bodyFatPct')) out.push('body');
  if (s.cycleOn || ev?.cycle?.length) out.push('cycle');
  if (ev?.ecg?.length || ev?.rhythm?.length) out.push('rhythm');
  out.push('voice');
  return out;
}
