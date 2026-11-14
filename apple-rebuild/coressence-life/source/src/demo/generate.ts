// Investor demo profile: 60 days of realistic, internally consistent sample data, ending today.
// Deterministic (seeded), so every demo looks the same on the same date. Clearly a sample person.
import { addDays, dayKey, lastDays, parseDay } from '@core/dates';
import type { TrackSlice } from '../modules/track/model';
import { DEFAULT_HABITS } from '../modules/track/model';
import type { MeasureSlice, DayMetrics } from '../modules/measure/model';
import type { MoveSlice, Workout, MoveType } from '../modules/move/model';
import type { FuelSlice, Meal, MealTag } from '../modules/fuel/model';
import type { SleepSlice, SleepLog, Night } from '../modules/sleep/model';
import { analyzeNight } from '../modules/sleep/noise';
import type { RecoverSlice, RecoveryAction } from '../modules/recover/model';
import type { RestoreSlice, RestoreKind } from '../modules/restore/model';
import type { RehearseSlice } from '../modules/rehearse/model';
import type { PlanSlice, PlanVersion } from '../modules/plan/model';
import { planToItems, blankWeek } from '../modules/plan/model';
import { TEMPLATES, newExperiment, type Experiment, type ExperimentSlice } from '../modules/experiment/model';
import type { PerformerSlice } from '../modules/performer/model';
import type { CoachSlice } from '../modules/coach/model';
import type { LabsSlice } from '../modules/labs/model';
import type { EduSlice } from '../modules/education/model';
import { demoDevices } from './devices';

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const fmt = (mins: number) => {
  const m = ((Math.round(mins) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
};

export const DEMO_NAME = 'Alex';

/** Build every module's demo slice. `now` is the moment the demo is generated (today, partly through the day). */
export function generateDemo(now = Date.now()): Record<string, unknown> {
  const today = dayKey(now);
  const hour = new Date(now).getHours() + new Date(now).getMinutes() / 60;
  const r = rng(Number(today.replace(/-/g, '')) % 100000);
  const days = lastDays(60, today);
  const n = (lo: number, hi: number) => lo + r() * (hi - lo);
  const pick = <T,>(xs: T[]) => xs[Math.floor(r() * xs.length)];
  const ago = (d: string) => Math.round((parseDay(today).getTime() - parseDay(d).getTime()) / 86400000);

  const track: TrackSlice = { checkins: {}, habits: DEFAULT_HABITS, done: {} };
  const measure: MeasureSlice = { source: 'none', lastSync: now - 20 * 60000, synced: {}, manual: {} };
  const move: MoveSlice = { workouts: [] };
  const fuel: FuelSlice = { meals: [], water: {}, fasts: [] };
  const sleep: SleepSlice = { logs: {}, nights: [] };
  const recover: RecoverSlice = { logs: {} };
  const restore: RestoreSlice = { sessions: [] };
  const rehearse: RehearseSlice = { voice: {} };
  let id = 0;
  const nid = (p: string) => `${p}demo${++id}`;

  let weight = 80.6;
  for (const d of days) {
    const a = ago(d);
    const isToday = a === 0;
    const dow = parseDay(d).getDay(); // 0 Sun
    const weekend = dow === 0 || dow === 6;
    const techWeek = a >= 4 && a <= 10; // a busy rehearsal stretch
    const improving = Math.min(1, (60 - a) / 60); // habits improve over the two months

    // Sleep
    const bedBase = weekend ? 23 * 60 + 40 : 22 * 60 + 50 + (techWeek ? 55 : 0);
    const trial = a <= 6; // this week's experiment: bedtime 30 minutes earlier
    const bed = bedBase + n(-25, 30) - improving * 15 - (trial ? 30 : 0);
    const hours = Math.max(5.2, Math.min(8.8, (techWeek ? 6.3 : 6.9) + improving * 0.6 + n(-0.7, 0.6) + (weekend ? 0.4 : 0) + (trial ? 0.55 : 0)));
    const wake = bed + hours * 60;
    const quality = Math.max(1, Math.min(5, Math.round(1 + (hours - 5) * 0.9 + n(-0.6, 0.6))));
    const log: SleepLog = { date: d, bed: fmt(bed), wake: fmt(wake), quality, awakenings: Math.round(n(0, 2.4)) };
    sleep.logs[d] = log;

    // Device numbers
    const dm: DayMetrics = {};
    const stepsFull = Math.round((weekend ? n(7000, 13000) : n(5200, 10500)) + improving * 900);
    dm.steps = isToday ? Math.round(stepsFull * Math.min(1, hour / 21) * 0.95) : stepsFull;
    dm.restingHr = Math.round(60 - improving * 3 + (techWeek ? 3.5 : 0) + (hours < 6.3 ? 2 : 0) + n(-1.5, 1.5));
    dm.hrv = Math.round(52 + improving * 7 - (techWeek ? 8 : 0) + (hours - 7) * 3 + n(-5, 5));
    dm.sleepH = Math.round((hours - n(0.1, 0.35)) * 10) / 10;
    dm.activeKcal = Math.round(dm.steps * 0.045 + n(80, 220));
    weight += n(-0.09, 0.06);
    if (a % 2 === 0) dm.weightKg = Math.round(weight * 10) / 10;

    // Check-in (skips a few days)
    if (isToday || r() > 0.08) {
      const energy = Math.max(1, Math.min(5, Math.round(1.2 + (hours - 5.2) * 0.85 + n(-0.7, 0.7))));
      const stress = Math.max(1, Math.min(5, Math.round((techWeek ? 3.6 : 2.4) + n(-0.9, 0.9))));
      track.checkins[d] = { date: d, energy, mood: Math.max(1, Math.min(5, Math.round(energy * 0.6 + n(1, 2.4)))), stress, soreness: Math.max(1, Math.min(5, Math.round(n(1, 3.4)))), focus: Math.max(1, Math.min(5, Math.round(energy * 0.7 + n(0.6, 1.8)))) };
    }
    const habits: string[] = [];
    if (r() < 0.55 + improving * 0.35) habits.push('h-daylight');
    if (r() < 0.5 + improving * 0.3) habits.push('h-protein');
    if (r() < 0.35 + improving * 0.4 && !techWeek) habits.push('h-screens');
    if (!isToday || hour > 9) track.done[d] = isToday ? habits.slice(0, 1) : habits;

    // Movement (plan: Mon strength, Tue pilates, Wed walk, Thu strength, Sat yoga, Sun long walk)
    const planned: Record<number, [MoveType, number] | null> = { 1: ['strength', 30], 2: ['pilates', 25], 3: ['walk', 30], 4: ['strength', 30], 5: null, 6: ['yoga', 25], 0: ['walk', 45] };
    const p = planned[dow];
    if (p && !isToday && r() < 0.68 + improving * 0.25 - (techWeek ? 0.25 : 0)) {
      const w: Workout = { id: nid('w'), date: d, type: p[0], minutes: Math.round(p[1] + n(-5, 8)), effort: Math.round(n(5, 8)), routineId: p[0] === 'pilates' ? 'pilates-core' : p[0] === 'yoga' ? 'yoga-gentle' : p[0] === 'strength' ? 'strength-a' : undefined };
      move.workouts.push(w);
    }
    if (!isToday && r() < 0.25) move.workouts.push({ id: nid('w'), date: d, type: 'stretch', minutes: Math.round(n(8, 15)), effort: 3, routineId: pick(['mobility-morning', 'desk-reset', 'evening-stretch']) });
    if (isToday && hour > 8) move.workouts.push({ id: nid('w'), date: d, type: 'stretch', minutes: 8, effort: 3, routineId: 'mobility-morning' });
    dm.exerciseMin = Math.round(move.workouts.filter((w) => w.date === d && w.type !== 'stretch').reduce((s2, w) => s2 + w.minutes, 0) + n(4, 18));
    if (isToday) dm.exerciseMin = Math.round(n(6, 12));
    measure.synced[d] = dm;

    // Food and water
    const mealTimes: [Meal['kind'], number][] = [['breakfast', 7.5], ['lunch', 12.5], ['dinner', 19]];
    for (const [kind, t] of mealTimes) {
      if (isToday && t > hour) continue;
      if (r() < 0.06) continue;
      const tags: MealTag[] = [];
      if (r() < 0.6 + improving * 0.3) tags.push('protein');
      if (r() < 0.5 + improving * 0.3) tags.push('plants');
      if (r() < 0.4) tags.push('wholegrain');
      if (r() < (techWeek ? 0.22 : 0.07)) tags.push('processed');
      fuel.meals.push({ id: nid('m'), date: d, time: fmt(t * 60 + n(-30, 30)), kind, tags });
    }
    if (!isToday && r() < 0.3) fuel.meals.push({ id: nid('m'), date: d, time: '15:30', kind: 'snack', tags: r() < 0.7 ? ['plants'] : ['processed'] });
    const water = Math.round((n(1300, 2400) + improving * 300) / 250) * 250;
    fuel.water[d] = isToday ? Math.round((water * Math.min(1, hour / 20)) / 250) * 250 : water;
    if (!isToday && r() < 0.45) {
      const start = parseDay(d).getTime() - 12 * 3600000 + (19.5 + n(0, 1)) * 3600000; // previous evening
      fuel.fasts.push({ id: nid('f'), start, end: start + n(12, 14.5) * 3600000 });
    }

    // Recovery and restore
    if (r() < 0.7 || isToday) {
      const actions: RecoveryAction[] = [];
      if (r() < 0.4) actions.push('mobility');
      if (r() < 0.3) actions.push('easywalk');
      if (r() < 0.15) actions.push('heat');
      if (r() < 0.25) actions.push('breathing');
      recover.logs[d] = { date: d, soreness: Math.round(n(1, techWeek ? 6 : 4.5)), actions };
    }
    const kinds: RestoreKind[] = ['breathing', 'quiet', 'gratitude', 'outdoors', 'connection'];
    if (r() < 0.6 + improving * 0.25 || isToday) restore.sessions.push({ id: nid('r'), date: d, kind: isToday ? 'breathing' : pick(kinds), minutes: isToday ? 5 : Math.round(n(5, 20)) });

    // Voice
    if (!isToday || hour > 12) {
      const vh = techWeek ? n(5, 7.5) : weekend ? n(1, 3.5) : n(2, 4.5);
      rehearse.voice[d] = { date: d, voiceHours: isToday ? 1.5 : Math.round(vh * 2) / 2, hoarseness: techWeek ? Math.round(n(1, 2.8)) : Math.round(n(0, 1.2)), warmedUp: r() < (techWeek ? 0.9 : 0.6), restMinutes: Math.round(n(0, 60) / 15) * 15 };
    }
  }
  move.workouts.sort((a, b) => b.date.localeCompare(a.date));

  // Connected devices: Oura, Apple Watch, Garmin, WHOOP, Withings and Dexcom Stelo, merged by the real rules.
  const restoreMinutes: Record<string, number> = {};
  for (const x of restore.sessions) if (x.kind === 'breathing' || x.kind === 'quiet') restoreMinutes[x.date] = (restoreMinutes[x.date] || 0) + x.minutes;
  const dev = demoDevices({ r, today, now, days, base: measure.synced, sleepLogs: sleep.logs, workouts: move.workouts, restoreMinutes, techWeek: (d) => ago(d) >= 4 && ago(d) <= 10 });
  Object.assign(measure, { source: 'healthkit' }, dev.measure);
  fuel.meals.sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
  fuel.fasts.sort((a, b) => b.start - a.start);

  // Sleep sound checks: six recent nights, three with frequent rhythmic sound (shows the clinician suggestion).
  const nightPlan: { a: number; snore: number; pauses: number; talk?: number }[] = [
    { a: 0, snore: 0.32, pauses: 7 },
    { a: 1, snore: 0.05, pauses: 0 },
    { a: 2, snore: 0.28, pauses: 4 },
    { a: 4, snore: 0.12, pauses: 1, talk: 45 },
    { a: 5, snore: 0.3, pauses: 6 },
    { a: 7, snore: 0.02, pauses: 0 },
  ];
  for (const np of nightPlan) {
    const d = addDays(today, -np.a);
    const l = sleep.logs[d];
    const start = parseDay(addDays(d, -1)).getTime() - 12 * 3600000 + hmToMin(l.bed) * 60000 + (hmToMin(l.bed) < 720 ? 86400000 : 0);
    const samples = synthNight(r, Math.round(sleepHoursOf(l) * 3600), np.snore, np.pauses, np.talk);
    const a = analyzeNight(samples, start, 1000);
    const night: Night = { id: `n-demo-${np.a}`, date: d, ...a };
    sleep.nights.push(night);
  }

  // Plan, created 20 days ago, with an ordinary week
  const week = blankWeek();
  week[0].push({ kind: 'move', title: 'Full-body strength', time: '07:00' });
  week[1].push({ kind: 'move', title: 'Pilates core basics', time: '07:00' });
  week[1].push({ kind: 'rehearsal', title: 'Rehearsal', time: '18:30' });
  week[2].push({ kind: 'move', title: 'Lunch walk', time: '12:15' });
  week[3].push({ kind: 'move', title: 'Full-body strength', time: '07:00' });
  week[3].push({ kind: 'rehearsal', title: 'Rehearsal', time: '18:30' });
  week[4].push({ kind: 'restore', title: 'Quiet evening, no screens after 9', time: '21:00' });
  week[5].push({ kind: 'move', title: 'Gentle yoga flow', time: '09:00' });
  week[6].push({ kind: 'move', title: 'Long walk', time: '10:00' });
  const v: PlanVersion = {
    id: 'p-demo-1',
    created: addDays(today, -20),
    start: addDays(today, -20),
    outcome: 'Steady energy through rehearsals and two-show days',
    why: 'I want to enjoy performing and still have energy for family on weekends.',
    action: 'Strength on Monday and Thursday mornings, and a wake time of 6:45',
    constraint: 'Evening rehearsals run late and my schedule changes week to week',
    dashboard: ['sleepH', 'energy', 'voice'],
    observeDays: 14,
    week,
    minimum: 'Two 10-minute strength sessions, the vocal warmup before rehearsal, and my wake time',
    ruleIf: 'my energy averages below 3 for a week',
    ruleThen: 'switch to my minimum plan and move strength to the weekend',
    reviewDay: 0,
    reviewTime: '18:00',
  };
  const items = planToItems(v, 4).map((it) => ({ ...it, done: it.date < today ? r() < 0.8 : false }));
  items.push({ id: 'i-demo-show1', date: addDays(today, 3), time: '19:30', title: 'Opening night', kind: 'performance', done: false, remind: true });
  items.push({ id: 'i-demo-show2', date: addDays(today, 4), time: '14:00', title: 'Matinee', kind: 'performance', done: false, remind: true });
  items.push({ id: 'i-demo-lesson', date: today, time: '20:00', title: 'Lesson 5: Food and fluids', kind: 'lesson', done: false, remind: true });
  items.sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || '')));
  const plan: PlanSlice = { versions: [v], items };

  const coach: CoachSlice = {
    reviews: [
      { id: 'rv-demo-2', date: addDays(today, -7), numbers: [], wins: 'Hit both strength sessions and kept my wake time five days out of seven.', obstacles: 'Tech rehearsals ran to 11 p.m. and I skipped dinner twice.', adjustment: 'Pack a dinner on rehearsal days and do the vocal cool-down before driving home.', ruleIf: 'rehearsal runs past 10:30', ruleThen: 'skip the next morning workout and do the minimum plan', nextReview: today },
      { id: 'rv-demo-1', date: addDays(today, -14), numbers: [], wins: 'Logged every day. Walking at lunch felt good.', obstacles: 'Bedtime drifted on weekends.', adjustment: 'Keep the 6:45 wake time on Saturdays too.', ruleIf: 'I sleep under 6 hours', ruleThen: 'swap strength for an easy walk', nextReview: addDays(today, -7) },
    ],
  };

  const labs: LabsSlice = {
    results: [
      { id: 'lab-d1', testId: 'ldl', date: addDays(today, -340), value: 134, high: 99 },
      { id: 'lab-d2', testId: 'ldl', date: addDays(today, -160), value: 121, high: 99 },
      { id: 'lab-d3', testId: 'ldl', date: addDays(today, -25), value: 112, high: 99 },
      { id: 'lab-d4', testId: 'hdl', date: addDays(today, -340), value: 47, low: 40 },
      { id: 'lab-d5', testId: 'hdl', date: addDays(today, -160), value: 50, low: 40 },
      { id: 'lab-d6', testId: 'hdl', date: addDays(today, -25), value: 53, low: 40 },
      { id: 'lab-d7', testId: 'a1c', date: addDays(today, -340), value: 5.6, low: 4.0, high: 5.6 },
      { id: 'lab-d8', testId: 'a1c', date: addDays(today, -25), value: 5.4, low: 4.0, high: 5.6 },
      { id: 'lab-d9', testId: 'vitd', date: addDays(today, -160), value: 24, low: 30, high: 100 },
      { id: 'lab-d10', testId: 'vitd', date: addDays(today, -25), value: 33, low: 30, high: 100 },
      { id: 'lab-d11', testId: 'tsh', date: addDays(today, -25), value: 1.9, low: 0.45, high: 4.5 },
      { id: 'lab-d12', testId: 'tg', date: addDays(today, -25), value: 118, high: 149 },
    ],
  };

  const edu: EduSlice = {
    progress: {
      l1: { checkPassed: true, answers: { start: 'About 6.5 hours of sleep on rehearsal nights, energy dips by mid-afternoon.' }, completed: addDays(today, -24) },
      l2: { checkPassed: true, answers: { outcome: v.outcome, why: v.why, action: v.action, constraint: v.constraint }, completed: addDays(today, -21) },
      l3: { checkPassed: true, answers: { wake: '6:45 AM', sleepChange: 'Caffeine finished by 1 p.m.' }, completed: addDays(today, -15) },
      l4: { checkPassed: true, answers: { strengthDays: 'Monday and Thursday mornings', weeklyMinutes: '150 minutes' }, completed: addDays(today, -9) },
    },
  };

  // Perform at Your Peak: Week 1 and the first Week 2 module are done, so this week's module is Food and fluids.
  ['live-m1', 'perform-m1', 'perform-m2', 'perform-m3', 'perform-lab1', 'perform-m4'].forEach((mid, i) => (edu.progress[mid] = { checkPassed: true, answers: {}, completed: addDays(today, -24 + i * 4) }));

  // Weekly Experiment: bedtime 30 minutes earlier, on its last day, after one kept and one dropped.
  const bedTpl = TEMPLATES.find((t) => t.id === 'bed-earlier')!;
  const running = newExperiment({ id: 'x-demo-3', template: bedTpl, start: addDays(today, -6) });
  [6, 5, 3, 2, 1, 0].forEach((k) => (running.done[addDays(today, -k)] = true));
  const past = (xid: string, tid: string, startAgo: number, decision: 'keep' | 'drop', before: number, after: number, adherence: number): Experiment => ({
    ...newExperiment({ id: xid, template: TEMPLATES.find((t) => t.id === tid)!, start: addDays(today, -startAgo) }),
    closed: { date: addDays(today, -startAgo + 7), decision, suggested: decision, before, after, adherence },
  });
  const experiment: ExperimentSlice = { current: running, history: [past('x-demo-2', 'voice-rest', 14, 'keep', 1.9, 1.1, 0.86), past('x-demo-1', 'walk-lunch', 21, 'drop', 8150, 8240, 0.71)] };
  const performer: PerformerSlice = { checks: { [addDays(today, 3)]: ['meals', 'travel'] }, notes: {} };

  return { track, measure, move, fuel, sleep, recover, restore, rehearse, plan, coach, labs, edu, experiment, performer, md: { interested: null }, devices: dev.devices, monitor: dev.monitor };
}

function hmToMin(t: string) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}
function sleepHoursOf(l: SleepLog) {
  let d = hmToMin(l.wake) - hmToMin(l.bed);
  if (d <= 0) d += 1440;
  return d / 60;
}

/** A synthetic night of loudness readings (dBFS once a second). */
function synthNight(r: () => number, seconds: number, snoreShare: number, pauses: number, talk = 0): number[] {
  const out = new Array<number>(seconds);
  for (let i = 0; i < seconds; i++) out[i] = -63 + r() * 4 + Math.sin(i / 1800) * 1.5;
  // snoring-like stretches of varied length and loudness, breaths every 3.5 to 5 seconds
  const target = snoreShare * seconds;
  const starts: number[] = [];
  let used = 0;
  let guard = 0;
  while (used < target && guard++ < 60) {
    const len = Math.min(Math.round(240 + r() * 1200), Math.max(120, Math.round(target - used)));
    const s = Math.floor(r() * Math.max(1, seconds - len - 60));
    if (starts.some((x) => Math.abs(x - s) < 1500)) continue;
    starts.push(s);
    const base = -41 + r() * 8;
    for (let t = s; t < Math.min(seconds, s + len); t += 4 + Math.round(r() * 1.4)) {
      const loud = base + (r() - 0.5) * 6;
      out[t] = loud;
      if (t + 1 < seconds && r() < 0.6) out[t + 1] = loud - 1 - r() * 2;
    }
    used += len;
  }
  starts.sort((a, b) => a - b);
  // pause-then-loud moments inside snoring stretches
  for (let k = 0; k < pauses && starts.length; k++) {
    const s = starts[k % starts.length] + 90 + Math.floor(r() * 150) + Math.floor(k / starts.length) * 70;
    for (let t = s; t < s + 16 && t < seconds; t++) out[t] = -63 + r() * 3;
    if (s + 17 < seconds) {
      out[s + 16] = -25 - r() * 3;
      out[s + 17] = -27 - r() * 3;
    }
  }
  // someone talking or a TV near the start of the night
  if (talk) for (let t = 300; t < 300 + talk && t < seconds; t++) out[t] = -40 + r() * 6;
  // a few brief noises (turning over, a cough, a car outside)
  for (let k = 0; k < 7; k++) {
    const t = Math.floor(r() * (seconds - 3));
    out[t] = -42 + r() * 10;
  }
  return out;
}
