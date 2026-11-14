// Peak Cycle: the Coressence method as one weekly loop. Six steps (assess, plan, do, measure, review, adjust)
// and, once a rhythm holds, "keep what works". This file decides where the person is on the loop, which course
// module belongs to this week, today's one to three actions, and the single biggest signal in their data (pure).
import { addDays, dayKey, lastDays, weekStart } from '@core/dates';
import { mean, round, stdev } from '@core/stats';
import type { Phase } from '../coach/model';
import type { Lesson } from '../education/lessons';
import type { EduSlice } from '../education/model';
import type { PlanItem } from '../plan/model';
import type { Slices } from '../life/today';
import { METRICS, type ExperimentMetric } from '../experiment/model';

export type StepKey = 'assess' | 'plan' | 'do' | 'measure' | 'review' | 'adjust';
export type Step = { key: StepKey; n: number; label: string; ask: string; text: string; action: string; route: string; icon: 'compass' | 'edit-3' | 'play' | 'activity' | 'refresh-ccw' | 'sliders' };

export const STEPS: Step[] = [
  { key: 'assess', n: 1, label: 'Assess', ask: 'Where am I now?', text: 'A few days of honest check-ins and a small set of numbers.', action: 'Do today’s check-in', route: '/checkin', icon: 'compass' },
  { key: 'plan', n: 2, label: 'Plan', ask: 'What will I try?', text: 'One outcome, one action, and the constraint you are working around.', action: 'Build my plan', route: '/plan-builder', icon: 'edit-3' },
  { key: 'do', n: 3, label: 'Do', ask: 'Did I do it?', text: 'Carry the plan through an ordinary week. Use your minimum plan on hard days.', action: 'See this week’s plan', route: '/plan', icon: 'play' },
  { key: 'measure', n: 4, label: 'Measure', ask: 'What changed?', text: 'Keep logging. A week of observations beats one good or bad day.', action: 'Open my signals', route: '/monitor', icon: 'activity' },
  { key: 'review', n: 5, label: 'Review', ask: 'What did I learn?', text: 'Compare what you intended with what happened.', action: 'Start the weekly review', route: '/review', icon: 'refresh-ccw' },
  { key: 'adjust', n: 6, label: 'Adjust', ask: 'What one thing changes?', text: 'Change one thing, write the decision rule, and set the next review.', action: 'Revise my plan', route: '/plan-builder', icon: 'sliders' },
];

export const KEEP = { label: 'Keep what works', text: 'Your rhythm is holding. Keep it with a lighter review, and restart the loop when life changes.' };

/** Where a coach phase sits on the six-step loop. "Maintain" is the keep-what-works state, shown on the Do step. */
export function stepFor(phase: Phase): { step: Step; index: number; keeping: boolean } {
  const key: StepKey = phase === 'execute' || phase === 'maintain' ? 'do' : phase;
  const index = STEPS.findIndex((s) => s.key === key);
  return { step: STEPS[index], index, keeping: phase === 'maintain' };
}

export type WeekDay = { date: string; letter: string; today: boolean; future: boolean; logged: boolean; planned: number; done: number };

/** Monday to Sunday of the week that contains `today`, with what was logged and done on each day. */
export function weekDays(s: Pick<Slices, 'track' | 'plan'>, today = dayKey()): WeekDay[] {
  const start = weekStart(today);
  return ['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((letter, i) => {
    const date = addDays(start, i);
    const items = s.plan.items.filter((x) => x.date === date);
    return { date, letter, today: date === today, future: date > today, logged: !!s.track.checkins[date], planned: items.length, done: items.filter((x) => x.done).length };
  });
}

export type WeekModule = { lesson: Lesson; course: 'live' | 'perform' | null; position: number; total: number; completed: number; week: number | null };

/**
 * This week's course module: the next unfinished item in the person's course, in order. With both courses, the one
 * already started wins (most finished), so the week has one module, not two. `sequences` lists each course in order.
 */
export function weekModule(edu: EduSlice, sequences: { course: 'live' | 'perform'; lessons: Lesson[] }[], extras: Lesson[] = []): WeekModule | null {
  const done = (l: Lesson) => !!edu.progress[l.id]?.completed;
  const ranked = sequences
    .filter((q) => q.lessons.length)
    .map((q) => ({ ...q, completed: q.lessons.filter(done).length }))
    .sort((a, b) => b.completed - a.completed);
  for (const q of ranked) {
    const i = q.lessons.findIndex((l) => !done(l));
    if (i >= 0) return { lesson: q.lessons[i], course: q.course, position: i + 1, total: q.lessons.length, completed: q.completed, week: q.lessons[i].week ?? null };
  }
  const j = extras.findIndex((l) => !done(l));
  if (j >= 0) return { lesson: extras[j], course: null, position: j + 1, total: extras.length, completed: extras.filter(done).length, week: null };
  return null;
}

export type TodayAction =
  | { kind: 'plan'; id: string; title: string; done: boolean; time?: string; item: PlanItem }
  | { kind: 'experiment'; id: string; title: string; done: boolean }
  | { kind: 'checkin'; id: string; title: string; done: boolean }
  | { kind: 'module'; id: string; title: string; done: boolean; lessonId: string };

/**
 * Today's one to three actions. The plan comes first (open items before finished ones); the remaining places go to
 * this week's experiment, the check-in and this week's module, so there is always at least one thing to do.
 */
export function todayActions(i: { items: PlanItem[]; experiment?: { title: string; doneToday: boolean } | null; checkedIn: boolean; module?: { id: string; title: string } | null; max?: number }): TodayAction[] {
  const max = i.max ?? 3;
  const out: TodayAction[] = [...i.items]
    .sort((a, b) => Number(a.done) - Number(b.done) || (a.time || '99').localeCompare(b.time || '99'))
    .map((item) => ({ kind: 'plan' as const, id: item.id, title: item.title, done: item.done, time: item.time, item }));
  const plannedLesson = i.items.some((x) => x.kind === 'lesson');
  const fill: TodayAction[] = [];
  if (i.experiment) fill.push({ kind: 'experiment', id: 'experiment', title: i.experiment.title, done: i.experiment.doneToday });
  if (!i.checkedIn) fill.push({ kind: 'checkin', id: 'checkin', title: 'Do the 20-second check-in', done: false });
  if (i.module && !plannedLesson) fill.push({ kind: 'module', id: 'module', title: `Read ${i.module.title}`, done: false, lessonId: i.module.id });
  // The experiment always gets a place while it runs: it is the one change being tested this week.
  const head = i.experiment ? out.slice(0, max - 1) : out.slice(0, max);
  return [...head, ...fill].slice(0, max);
}

export type Signal = {
  key: ExperimentMetric;
  label: string;
  unit: string;
  dp: number;
  recent: number;
  usual: number;
  change: number;
  /** How unusual the change is against the person's own day-to-day spread. */
  size: number;
  tone: 'good' | 'warn' | 'info';
  headline: string;
  text: string;
  route: string;
  series: (number | null)[];
};

const SIGNAL_KEYS: ExperimentMetric[] = ['sleepH', 'hrv', 'restingHr', 'steps', 'energy', 'stress', 'soreness', 'hoarseness', 'voiceHours', 'water'];
const SIGNAL_ROUTE: Partial<Record<ExperimentMetric, string>> = { sleepH: '/sleep', hrv: '/monitor', restingHr: '/monitor', steps: '/measure', energy: '/track', stress: '/track', soreness: '/recover', hoarseness: '/rehearse', voiceHours: '/rehearse', water: '/fuel' };
const SIGNAL_HINT: Partial<Record<ExperimentMetric, [string, string]>> = {
  sleepH: ['Whatever changed this week is worth keeping.', 'Protect one earlier night before adding anything else.'],
  hrv: ['Your body is absorbing the week well.', 'A sign of extra load. Favor your minimum plan today.'],
  restingHr: ['A calmer heart at rest usually follows better sleep and steadier training.', 'Often follows short sleep, a heavy stretch or a cold coming on. Ease off and watch it.'],
  steps: ['Ordinary movement is adding up.', 'Look for one opening for a short walk today.'],
  energy: ['Note what you did differently so you can repeat it.', 'Check sleep and food timing first; they move energy most.'],
  stress: ['Notice what took pressure off this week.', 'Five minutes of slow breathing is the smallest useful reset.'],
  soreness: ['Recovery is keeping pace with training.', 'Give the hard session another day and move easily instead.'],
  hoarseness: ['Your voice is recovering between uses.', 'Lighten the voice load, drink, and build in vocal rest. See a clinician if it lasts.'],
  voiceHours: ['A lighter voice week leaves room for the next heavy one.', 'A heavy voice week. Plan short rests between sessions.'],
  water: ['Keep the habit that made this easy.', 'A glass with each meal closes most of the gap.'],
};

/**
 * The single biggest signal: the measure whose last 7 days moved furthest from the person's own usual (the 21 days
 * before), scaled by how much that measure normally varies. Needs 3 recent days and 5 earlier days of a measure.
 */
export function biggestSignal(s: Slices, today = dayKey()): Signal | null {
  const recentDays = lastDays(7, today);
  const usualDays = lastDays(21, addDays(today, -7));
  let best: Signal | null = null;
  for (const key of SIGNAL_KEYS) {
    const m = METRICS[key];
    const rec = recentDays.map((d) => m.get(s, d)).filter((x): x is number => x !== null);
    const base = usualDays.map((d) => m.get(s, d)).filter((x): x is number => x !== null);
    if (rec.length < 3 || base.length < 5) continue;
    const recent = mean(rec)!;
    const usual = mean(base)!;
    const spread = Math.max(stdev(base) ?? 0, Math.abs(usual) * 0.04, m.threshold / 2);
    const change = recent - usual;
    const size = Math.abs(change) / spread;
    if (best && size <= best.size) continue;
    const up = change > 0;
    const better = m.better === 'none' ? null : (m.better === 'up') === up;
    const small = Math.abs(change) < m.threshold;
    const tone: Signal['tone'] = small || better === null ? 'info' : better ? 'good' : 'warn';
    const amount = `${round(Math.abs(change), m.dp)}${m.unit}`;
    const hint = SIGNAL_HINT[key];
    const moved = better === null ? (up ? hint?.[1] : hint?.[0]) : better ? hint?.[0] : hint?.[1];
    best = {
      key,
      label: m.label,
      unit: m.unit,
      dp: m.dp,
      recent,
      usual,
      change,
      size,
      tone,
      headline: small ? `${m.label} is steady` : `${m.label} is ${up ? 'up' : 'down'} ${amount}`,
      text: small ? `Close to your usual ${round(usual, m.dp)}${m.unit}. Nothing in your data moved much this week.` : `Last 7 days against your usual ${round(usual, m.dp)}${m.unit}. ${moved ?? ''}`.trim(),
      route: SIGNAL_ROUTE[key] ?? '/monitor',
      series: lastDays(14, today).map((d) => m.get(s, d)),
    };
  }
  return best;
}
