// Life hub: pulls every module together into the day's five pillar scores, the weekly numbers and coach notes (pure).
import { addDays, dayKey, daysBetween, lastDays, parseDay } from '@core/dates';
import { mean, round, sum } from '@core/stats';
import type { Goals } from '@core/settingsModel';
import * as track from '../track/model';
import * as measure from '../measure/model';
import * as move from '../move/model';
import * as fuel from '../fuel/model';
import * as sleep from '../sleep/model';
import * as recover from '../recover/model';
import * as restore from '../restore/model';
import * as rehearse from '../rehearse/model';
import * as plan from '../plan/model';
import * as coach from '../coach/model';
import { patternAdvice } from '../sleep/noise';

export type Slices = {
  track: track.TrackSlice;
  measure: measure.MeasureSlice;
  move: move.MoveSlice;
  fuel: fuel.FuelSlice;
  sleep: sleep.SleepSlice;
  recover: recover.RecoverSlice;
  restore: restore.RestoreSlice;
  rehearse: rehearse.RehearseSlice;
  plan: plan.PlanSlice;
  coach: coach.CoachSlice;
};

export type DaySnapshot = {
  date: string;
  sleep: { score: number | null; hours: number | null; quality: number | null };
  move: { score: number | null; minutes: number; steps?: number };
  fuel: { score: number | null; waterMl: number; meals: number };
  recover: { score: number | null; parts: { label: string; delta: number }[] };
  restore: { score: number | null; minutes: number };
  overall: number | null;
};

export function deviceSleep(m: measure.MeasureSlice): Record<string, number | undefined> {
  const out: Record<string, number | undefined> = {};
  for (const [d, v] of Object.entries(m.synced)) out[d] = v.sleepH;
  for (const [d, v] of Object.entries(m.manual)) if (v.sleepH !== undefined) out[d] = v.sleepH;
  return out;
}

/** The inputs behind one day's readiness score (used by the score and by the "Why this number" explainer). */
export function readinessInput(s: Slices, g: Goals, date = dayKey()): recover.ReadinessInput & { sleepHours: number | null } {
  const dm = measure.dayMetrics(s.measure, date);
  const hours = sleep.hoursFor(s.sleep, date, dm.sleepH);
  return {
    hrv: dm.hrv,
    hrvBase: measure.baseline(s.measure, 'hrv', date),
    rhr: dm.restingHr,
    rhrBase: measure.baseline(s.measure, 'restingHr', date),
    sleep: sleep.sleepScore(hours, s.sleep.logs[date]?.quality ?? null, g.sleepHours),
    sleepHours: hours,
    soreness: s.recover.logs[date]?.soreness ?? (s.track.checkins[date] ? (s.track.checkins[date].soreness - 1) * 2.5 : null),
    tempDev: dm.tempDev,
  };
}

export function snapshot(s: Slices, g: Goals, date = dayKey()): DaySnapshot {
  const dm = measure.dayMetrics(s.measure, date);
  const hours = sleep.hoursFor(s.sleep, date, dm.sleepH);
  const quality = s.sleep.logs[date]?.quality ?? null;
  const sleepScore = sleep.sleepScore(hours, quality, g.sleepHours);

  const logged = move.minutesOn(s.move, date);
  const minutes = Math.max(logged, dm.exerciseMin ?? 0);
  const moveScore = minutes || dm.steps ? move.moveScore(minutes, g.moveMinutes, dm.steps, g.steps) : null;

  const fuelScore = fuel.fuelScore(s.fuel, date, g.waterMl);

  const rec = recover.readiness({ ...readinessInput(s, g, date), sleep: sleepScore });

  const restoreScore = restore.restoreScore(s.restore, date, g.restoreMinutes);
  const all = [sleepScore, moveScore, fuelScore, rec.score, restoreScore].filter((x): x is number => x !== null);
  return {
    date,
    sleep: { score: sleepScore, hours, quality },
    move: { score: moveScore, minutes, steps: dm.steps },
    fuel: { score: fuelScore, waterMl: s.fuel.water[date] || 0, meals: s.fuel.meals.filter((m) => m.date === date).length },
    recover: { score: rec.score, parts: rec.parts },
    restore: { score: restoreScore, minutes: restore.restoreMinutes(s.restore, date) },
    overall: all.length ? all.reduce((a, b) => a + b, 0) / all.length : null,
  };
}

export type WeekNumber = { key: string; label: string; cur: number | null; prev: number | null; unit: string; dp: number; better: 'up' | 'down' | 'none' };

export function weekNumbers(s: Slices, g: Goals, end = dayKey()): WeekNumber[] {
  const cur = lastDays(7, end);
  const prev = lastDays(7, addDays(end, -7));
  const ds = deviceSleep(s.measure);
  const avg = (days: string[], f: (d: string) => number | null | undefined) => mean(days.map(f));
  const tot = (days: string[], f: (d: string) => number) => sum(days.map(f));
  const anyIn = (days: string[], f: (d: string) => boolean) => days.some(f);
  const n = (key: string, label: string, f: (days: string[]) => number | null, unit: string, dp: number, better: WeekNumber['better']): WeekNumber => ({ key, label, cur: f(cur), prev: f(prev), unit, dp, better });
  return [
    n('sleep', 'Sleep per night', (d) => avg(d, (x) => sleep.hoursFor(s.sleep, x, ds[x])), ' h', 1, 'up'),
    n('move', 'Movement', (d) => (anyIn(d, (x) => move.minutesOn(s.move, x) > 0) ? tot(d, (x) => move.minutesOn(s.move, x)) : null), ' min', 0, 'up'),
    n('steps', 'Steps per day', (d) => avg(d, (x) => measure.dayMetrics(s.measure, x).steps), '', 0, 'up'),
    n('water', 'Water per day', (d) => avg(d, (x) => s.fuel.water[x] ?? null), ' ml', 0, 'up'),
    n('energy', 'Energy (1–5)', (d) => avg(d, (x) => s.track.checkins[x]?.energy), '', 1, 'up'),
    n('stress', 'Stress (1–5)', (d) => avg(d, (x) => s.track.checkins[x]?.stress), '', 1, 'down'),
    n('restore', 'Restore', (d) => (anyIn(d, (x) => restore.restoreMinutes(s.restore, x) > 0) ? tot(d, (x) => restore.restoreMinutes(s.restore, x)) : null), ' min', 0, 'up'),
    n('rhr', 'Resting heart rate', (d) => avg(d, (x) => measure.dayMetrics(s.measure, x).restingHr), ' bpm', 0, 'down'),
    n('voice', 'Voice use per day', (d) => avg(d, (x) => s.rehearse.voice[x]?.voiceHours), ' h', 1, 'none'),
  ].filter((x) => x.cur !== null || x.prev !== null);
}

export function fmtNumber(w: WeekNumber, v: number | null): string {
  if (v === null) return '–';
  const r = round(v, w.dp);
  return (Math.abs(r) >= 1000 ? r.toLocaleString('en-US') : String(r)) + w.unit;
}

export type CoachNote = { id: string; module: string; tone: 'good' | 'info' | 'warn'; text: string; route?: string };

export function coachNotes(s: Slices, g: Goals, premium: boolean, today = dayKey()): CoachNote[] {
  const out: CoachNote[] = [];
  const ds = deviceSleep(s.measure);
  const avgSleep = sleep.avgSleep(s.sleep, 7, ds, today);
  if (avgSleep !== null && avgSleep < g.sleepHours - 0.75)
    out.push({ id: 'sleep-low', module: 'sleep', tone: 'warn', text: `Sleep has averaged ${avgSleep.toFixed(1)} hours over the last week, below your ${g.sleepHours}-hour goal. A steady wake time is the best place to start.`, route: '/sleep' });
  const spread = sleep.bedtimeSpread(s.sleep, today);
  if (spread !== null && spread > 60) out.push({ id: 'sleep-spread', module: 'sleep', tone: 'info', text: `Your bedtimes varied by about ${spread} minutes this week. Keeping them closer together can make falling asleep easier.`, route: '/sleep' });

  const wk = move.weekSummary(s.move, today);
  const dow = (parseDay(today).getDay() + 6) % 7; // 0 = Monday
  if (dow >= 3 && wk.strengthDays < g.strengthDays) out.push({ id: 'strength', module: 'move', tone: 'info', text: `${g.strengthDays - wk.strengthDays} more strength session${g.strengthDays - wk.strengthDays > 1 ? 's' : ''} this week would meet your goal. Pilates core basics counts.`, route: '/move' });
  if (wk.minutes >= g.weeklyMoveMinutes) out.push({ id: 'move-goal', module: 'move', tone: 'good', text: `You have reached ${wk.minutes} minutes of movement this week, past your ${g.weeklyMoveMinutes}-minute goal.`, route: '/move' });

  const water = mean(lastDays(7, today).map((d) => s.fuel.water[d] ?? null));
  if (water !== null && water < g.waterMl * 0.75) out.push({ id: 'water', module: 'fuel', tone: 'info', text: `Water has averaged ${Math.round(water)} ml a day. A glass with each meal closes most of the gap.`, route: '/fuel' });

  const stress = mean(lastDays(3, today).map((d) => s.track.checkins[d]?.stress));
  if (stress !== null && stress >= 3.7) out.push({ id: 'stress', module: 'restore', tone: 'warn', text: 'Stress has been high for the last few days. Five minutes of slow breathing in Restore is a simple reset.', route: '/restore' });

  const voice = rehearse.voiceAdvice(s.rehearse, today);
  if (voice.tone === 'warn') out.push({ id: 'voice', module: 'rehearse', tone: 'warn', text: voice.text, route: '/rehearse' });

  const noise = patternAdvice(s.sleep.nights);
  if (noise) out.push({ id: 'noise', module: 'sleep', tone: 'warn', text: noise, route: '/sleep' });

  const cs = track.checkinStreak(s.track, today);
  if (cs >= 5) out.push({ id: 'checkin-streak', module: 'track', tone: 'good', text: `${cs} days of check-ins in a row. That is what makes your weekly review useful.`, route: '/track' });

  if (premium) {
    const rel = track.relate(s.track, 'energy', ds as Record<string, number | undefined>, 30, today);
    const sl: Record<string, number | null> = {};
    for (const d of lastDays(30, today)) sl[d] = sleep.hoursFor(s.sleep, d, ds[d]);
    const r2 = track.relate(s.track, 'energy', sl, 30, today);
    const r = r2.r ?? rel.r;
    if (r !== null && r >= 0.35) out.push({ id: 'corr', module: 'track', tone: 'info', text: track.relationWords(r, 'sleep', 'energy') + ' Protecting sleep may be your best energy lever.', route: '/track' });
  }
  const rank = { warn: 0, info: 1, good: 2 } as const;
  return out.sort((a, b) => rank[a.tone] - rank[b.tone]);
}

export function cycleFor(s: Slices, today = dayKey()): coach.Phase {
  const p = plan.currentPlan(s.plan);
  const last = s.coach.reviews[0];
  return coach.cyclePhase({
    hasData: Object.keys(s.track.checkins).length >= 3,
    planStart: p ? p.created : null,
    lastReview: last ? last.date : null,
    lastReviewAdjusted: !!last?.adjustment,
    planAfterReview: !!(p && last && p.created >= last.date),
    reviews: s.coach.reviews.length,
    daysSince: (d) => daysBetween(d, today),
  });
}
