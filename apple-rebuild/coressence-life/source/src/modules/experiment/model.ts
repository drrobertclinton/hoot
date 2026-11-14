// Weekly Experiment: one change from the course, tried for a week, measured against the week before from the
// person's own data, and closed with a plain verdict: keep, adjust or drop (pure).
import { addDays, dayKey, daysBetween, hm, lastDays } from '@core/dates';
import { mean, round } from '@core/stats';
import type { Slices } from '../life/today';
import { dayMetrics } from '../measure/model';
import { hoursFor } from '../sleep/model';
import { minutesOn } from '../move/model';
import { restoreMinutes } from '../restore/model';

export type ExperimentMetric = 'sleepH' | 'sleepQuality' | 'bedtime' | 'energy' | 'stress' | 'mood' | 'focus' | 'soreness' | 'hrv' | 'restingHr' | 'steps' | 'moveMin' | 'water' | 'restoreMin' | 'hoarseness' | 'voiceHours';

export type MetricDef = {
  key: ExperimentMetric;
  label: string;
  unit: string;
  dp: number;
  better: 'up' | 'down' | 'none';
  /** The smallest change worth calling a change. */
  threshold: number;
  source: string;
  get: (s: Slices, date: string) => number | null;
  format?: (v: number) => string;
};

const num = (v: number | undefined | null) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const bedMinutes = (t: string) => {
  const m = hm(t);
  return m < 12 * 60 ? m + 1440 : m; // after midnight counts as late, not early
};
const clockWords = (mins: number) => {
  const m = ((Math.round(mins) % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60);
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m % 60).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
};

export const METRICS: Record<ExperimentMetric, MetricDef> = {
  sleepH: { key: 'sleepH', label: 'Sleep', unit: ' h', dp: 1, better: 'up', threshold: 0.25, source: 'Sleep log or your watch', get: (s, d) => hoursFor(s.sleep, d, dayMetrics(s.measure, d).sleepH) },
  sleepQuality: { key: 'sleepQuality', label: 'How rested you felt', unit: ' of 5', dp: 1, better: 'up', threshold: 0.3, source: 'Sleep log', get: (s, d) => num(s.sleep.logs[d]?.quality) },
  bedtime: { key: 'bedtime', label: 'Bedtime', unit: ' min', dp: 0, better: 'down', threshold: 15, source: 'Sleep log', get: (s, d) => (s.sleep.logs[d] ? bedMinutes(s.sleep.logs[d].bed) : null), format: clockWords },
  energy: { key: 'energy', label: 'Energy', unit: ' of 5', dp: 1, better: 'up', threshold: 0.3, source: 'Daily check-in', get: (s, d) => num(s.track.checkins[d]?.energy) },
  stress: { key: 'stress', label: 'Stress', unit: ' of 5', dp: 1, better: 'down', threshold: 0.3, source: 'Daily check-in', get: (s, d) => num(s.track.checkins[d]?.stress) },
  mood: { key: 'mood', label: 'Mood', unit: ' of 5', dp: 1, better: 'up', threshold: 0.3, source: 'Daily check-in', get: (s, d) => num(s.track.checkins[d]?.mood) },
  focus: { key: 'focus', label: 'Focus', unit: ' of 5', dp: 1, better: 'up', threshold: 0.3, source: 'Daily check-in', get: (s, d) => num(s.track.checkins[d]?.focus) },
  soreness: { key: 'soreness', label: 'Soreness', unit: ' of 10', dp: 1, better: 'down', threshold: 0.7, source: 'Recover log or check-in', get: (s, d) => num(s.recover.logs[d]?.soreness) ?? (s.track.checkins[d] ? (s.track.checkins[d].soreness - 1) * 2.5 : null) },
  hrv: { key: 'hrv', label: 'Heart rate variability', unit: ' ms', dp: 0, better: 'up', threshold: 3, source: 'Your watch or ring', get: (s, d) => num(dayMetrics(s.measure, d).hrv) },
  restingHr: { key: 'restingHr', label: 'Resting heart rate', unit: ' bpm', dp: 0, better: 'down', threshold: 1.5, source: 'Your watch or ring', get: (s, d) => num(dayMetrics(s.measure, d).restingHr) },
  steps: { key: 'steps', label: 'Steps', unit: '', dp: 0, better: 'up', threshold: 600, source: 'Your phone or watch', get: (s, d) => num(dayMetrics(s.measure, d).steps) },
  moveMin: { key: 'moveMin', label: 'Movement', unit: ' min', dp: 0, better: 'up', threshold: 5, source: 'Move log or your watch', get: (s, d) => { const v = Math.max(minutesOn(s.move, d), dayMetrics(s.measure, d).exerciseMin ?? 0); return v > 0 ? v : null; } },
  water: { key: 'water', label: 'Water', unit: ' ml', dp: 0, better: 'up', threshold: 200, source: 'Fuel log', get: (s, d) => num(s.fuel.water[d]) },
  restoreMin: { key: 'restoreMin', label: 'Restore time', unit: ' min', dp: 0, better: 'up', threshold: 3, source: 'Restore log', get: (s, d) => { const v = restoreMinutes(s.restore, d); return v > 0 ? v : null; } },
  hoarseness: { key: 'hoarseness', label: 'Hoarseness', unit: ' of 5', dp: 1, better: 'down', threshold: 0.4, source: 'Voice log', get: (s, d) => num(s.rehearse.voice[d]?.hoarseness) },
  voiceHours: { key: 'voiceHours', label: 'Voice use', unit: ' h', dp: 1, better: 'none', threshold: 0.5, source: 'Voice log', get: (s, d) => num(s.rehearse.voice[d]?.voiceHours) },
};

export const fmtMetric = (m: MetricDef, v: number | null) => (v === null ? '–' : m.format ? m.format(v) : `${Math.abs(v) >= 1000 ? round(v, m.dp).toLocaleString('en-US') : round(v, m.dp)}${m.unit}`);

export type Template = { id: string; title: string; how: string; metric: ExperimentMetric; course: 'live' | 'perform' | 'both'; module: number; moduleTitle: string; icon: string };

/** Changes the course asks people to try, each tied to the module that teaches it and to one measure. */
export const TEMPLATES: Template[] = [
  { id: 'bed-earlier', title: 'Bedtime 30 minutes earlier', how: 'Lights out half an hour before your usual time, every night this week.', metric: 'sleepH', course: 'both', module: 6, moduleTitle: 'Recovery', icon: 'moon' },
  { id: 'wake-steady', title: 'Same wake time every day', how: 'Pick one wake time and keep it, weekend included.', metric: 'energy', course: 'both', module: 6, moduleTitle: 'Recovery', icon: 'sunrise' },
  { id: 'walk-lunch', title: 'A 10-minute walk after lunch', how: 'Use an opening you already have. Ten minutes counts.', metric: 'steps', course: 'both', module: 4, moduleTitle: 'Training week', icon: 'navigation' },
  { id: 'water-meals', title: 'A glass of water with each meal', how: 'Put the glass down before the plate.', metric: 'water', course: 'both', module: 5, moduleTitle: 'Food and fluids', icon: 'droplet' },
  { id: 'dinner-packed', title: 'Pack the meal for the difficult moment', how: 'Decide tomorrow’s hardest meal tonight and pack it.', metric: 'energy', course: 'both', module: 5, moduleTitle: 'Food and fluids', icon: 'coffee' },
  { id: 'breathe-evening', title: 'Five minutes of slow breathing each evening', how: 'Same chair, same time, phone face down.', metric: 'stress', course: 'both', module: 6, moduleTitle: 'Recovery', icon: 'wind' },
  { id: 'minimum-plan', title: 'Use the minimum plan on hard days', how: 'On a crowded day, do the short version instead of skipping.', metric: 'moveMin', course: 'both', module: 7, moduleTitle: 'Obstacles', icon: 'shield' },
  { id: 'voice-rest', title: 'Ten quiet minutes between voice sessions', how: 'No talking, no humming. Water instead.', metric: 'hoarseness', course: 'perform', module: 6, moduleTitle: 'Recovery', icon: 'mic-off' },
  { id: 'warmup-always', title: 'Warm up before every heavy voice day', how: 'The familiar warmup, at the same easy effort, before the first long use.', metric: 'hoarseness', course: 'perform', module: 4, moduleTitle: 'Training week', icon: 'mic' },
  { id: 'quiet-after-show', title: 'No loud conversation after rehearsal', how: 'Limit avoidable loud talk on the way home and start the wind-down.', metric: 'sleepH', course: 'perform', module: 6, moduleTitle: 'Recovery', icon: 'volume-x' },
];

export const templatesFor = (track: 'live' | 'perform' | 'both') => TEMPLATES.filter((t) => t.course === 'both' || track === 'both' || t.course === track);

export type VerdictKey = 'keep' | 'adjust' | 'drop';
export type Experiment = {
  id: string;
  templateId: string | null;
  title: string;
  how: string;
  metric: ExperimentMetric;
  module?: number;
  moduleTitle?: string;
  start: string;
  days: number;
  /** Days the change was actually done. */
  done: Record<string, boolean>;
  /** Filled when the experiment is closed. */
  closed?: { date: string; decision: VerdictKey; suggested: VerdictKey | null; before: number | null; after: number | null; adherence: number };
};
export type ExperimentSlice = { current: Experiment | null; history: Experiment[] };
export const KEY = 'experiment';
export const EMPTY: ExperimentSlice = { current: null, history: [] };
export const LENGTH = 7;
const MIN_DAYS = 3;

export type Evaluation = {
  day: number;
  daysLeft: number;
  finished: boolean;
  beforeDays: { date: string; value: number | null }[];
  afterDays: { date: string; value: number | null; done: boolean }[];
  before: number | null;
  after: number | null;
  change: number | null;
  doneDays: number;
  elapsed: number;
  adherence: number;
  status: 'collecting' | 'early' | 'final';
  verdict: VerdictKey | null;
  headline: string;
  reason: string;
  next: string;
};

/**
 * Compare the experiment days so far with the 7 days before it started.
 * Rules, in order: fewer than 3 measured days on either side means no verdict yet. Done on fewer than half the days
 * means the change was not really tested: adjust (make it smaller). A meaningful move the right way means keep; the
 * wrong way means drop; no meaningful move after doing it faithfully means drop, otherwise adjust.
 */
export function evaluate(e: Experiment, value: (date: string) => number | null, today = dayKey()): Evaluation {
  const m = METRICS[e.metric];
  const last = addDays(e.start, e.days - 1);
  const end = today < last ? today : last;
  const elapsed = Math.max(0, Math.min(e.days, daysBetween(e.start, end) + 1));
  const beforeDays = lastDays(LENGTH, addDays(e.start, -1)).map((date) => ({ date, value: value(date) }));
  const afterDays = Array.from({ length: e.days }, (_, i) => addDays(e.start, i)).map((date) => ({ date, value: date <= end ? value(date) : null, done: !!e.done[date] }));
  const before = mean(beforeDays.map((x) => x.value));
  const after = mean(afterDays.map((x) => x.value));
  const nBefore = beforeDays.filter((x) => x.value !== null).length;
  const nAfter = afterDays.filter((x) => x.value !== null).length;
  const doneDays = afterDays.filter((x) => x.done && x.date <= end).length;
  const adherence = elapsed ? doneDays / elapsed : 0;
  const finished = today >= last;
  const base = { day: elapsed, daysLeft: Math.max(0, e.days - elapsed), finished, beforeDays, afterDays, before, after, doneDays, elapsed, adherence };
  const did = `You did it ${doneDays} of ${elapsed} day${elapsed === 1 ? '' : 's'}.`;

  if (before === null || after === null || nBefore < MIN_DAYS || nAfter < MIN_DAYS) {
    const missing = nBefore < MIN_DAYS ? `the week before has only ${nBefore} day${nBefore === 1 ? '' : 's'} of ${m.label.toLowerCase()}` : `only ${nAfter} day${nAfter === 1 ? '' : 's'} measured so far`;
    return { ...base, change: null, status: 'collecting', verdict: null, headline: 'Not enough data yet', reason: `A verdict needs at least ${MIN_DAYS} measured days before and after; ${missing}. ${m.source} is where this number comes from.`, next: finished ? 'Run it one more week and keep logging, or close it without a verdict.' : 'Keep going and keep logging.' };
  }

  const change = after - before;
  const amount = m.format ? `${round(Math.abs(change), 0)} min` : `${round(Math.abs(change), m.dp)}${m.unit}`;
  const way = m.format ? (change < 0 ? 'earlier' : 'later') : change > 0 ? 'up' : 'down';
  const moved = Math.abs(change) >= m.threshold;
  const improved = moved && (m.better === 'up' ? change > 0 : m.better === 'down' ? change < 0 : false);
  const worsened = moved && m.better !== 'none' && !improved;
  const numbers = `${m.label} went from ${fmtMetric(m, before)} to ${fmtMetric(m, after)}${moved ? ` (${way} ${amount})` : ', about the same'}.`;
  let verdict: VerdictKey;
  let reason: string;
  let next: string;
  if (adherence < 0.5) {
    verdict = 'adjust';
    reason = `${did} That is too few days to test the change, whatever the number did. ${numbers}`;
    next = 'Make it smaller or move it to a time that fits, then run it again.';
  } else if (improved) {
    verdict = 'keep';
    reason = `${numbers} ${did} The change moved the number it was meant to move.`;
    next = 'Keep it. It becomes a habit in Track so it stays in your week.';
  } else if (worsened) {
    verdict = 'drop';
    reason = `${numbers} ${did} The number moved the wrong way while you were doing it.`;
    next = 'Drop it and pick a different change next week.';
  } else if (adherence >= 0.7) {
    verdict = 'drop';
    reason = `${numbers} ${did} You did the work and the number did not respond.`;
    next = 'Drop it, or keep it only if you like it for its own sake, and test something else.';
  } else {
    verdict = 'adjust';
    reason = `${numbers} ${did} Not a clear result either way.`;
    next = 'Tighten it up and give it another week.';
  }
  const word = { keep: 'Keep it', adjust: 'Adjust it', drop: 'Drop it' }[verdict];
  return { ...base, change, status: finished ? 'final' : 'early', verdict, headline: finished ? word : `Early read: ${word.toLowerCase()}`, reason, next };
}

export const metricValue = (s: Slices, metric: ExperimentMetric) => (date: string) => METRICS[metric].get(s, date);

export function newExperiment(i: { id: string; template?: Template; title?: string; how?: string; metric?: ExperimentMetric; start?: string }): Experiment {
  const t = i.template;
  return { id: i.id, templateId: t?.id ?? null, title: (i.title ?? t?.title ?? 'My experiment').trim(), how: i.how ?? t?.how ?? '', metric: i.metric ?? t?.metric ?? 'energy', module: t?.module, moduleTitle: t?.moduleTitle, start: i.start ?? dayKey(), days: LENGTH, done: {} };
}

/** Close the running experiment with the person's decision and file it in the history (newest first). */
export function closeExperiment(s: ExperimentSlice, decision: VerdictKey, ev: Evaluation, today = dayKey()): ExperimentSlice {
  if (!s.current) return s;
  const closed: Experiment = { ...s.current, closed: { date: today, decision, suggested: ev.verdict, before: ev.before, after: ev.after, adherence: ev.adherence } };
  return { current: null, history: [closed, ...s.history] };
}

/** What the person has decided to keep, newest first: the "keep what works" list. */
export const kept = (s: ExperimentSlice) => s.history.filter((e) => e.closed?.decision === 'keep');
