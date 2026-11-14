// Plan: the personal plan from the course process, and a calendar of what is scheduled.
import { addDays, dayKey, parseDay } from '@core/dates';

export type ItemKind = 'move' | 'rehearsal' | 'performance' | 'review' | 'lesson' | 'restore' | 'appointment' | 'other';
export type PlanItem = { id: string; date: string; time?: string; title: string; kind: ItemKind; done: boolean; remind: boolean; fromPlan?: string };
export type WeekSlot = { kind: ItemKind; title: string; time?: string };
export type PlanVersion = {
  id: string;
  created: string;
  start: string;
  outcome: string;
  why: string;
  action: string;
  constraint: string;
  dashboard: string[];
  observeDays: number;
  /** Ordinary week: index 0 = Monday ... 6 = Sunday. */
  week: WeekSlot[][];
  minimum: string;
  ruleIf: string;
  ruleThen: string;
  /** 0 = Sunday ... 6 = Saturday */
  reviewDay: number;
  reviewTime: string;
};
export type PlanSlice = { versions: PlanVersion[]; items: PlanItem[] };
export const KEY = 'plan';
export const EMPTY: PlanSlice = { versions: [], items: [] };

export const KINDS: { key: ItemKind; label: string; icon: string }[] = [
  { key: 'move', label: 'Movement', icon: 'activity' },
  { key: 'rehearsal', label: 'Rehearsal', icon: 'music' },
  { key: 'performance', label: 'Performance', icon: 'star' },
  { key: 'restore', label: 'Restore', icon: 'feather' },
  { key: 'lesson', label: 'Lesson', icon: 'book-open' },
  { key: 'review', label: 'Weekly review', icon: 'refresh-ccw' },
  { key: 'appointment', label: 'Appointment', icon: 'calendar' },
  { key: 'other', label: 'Other', icon: 'circle' },
];
export const kindIcon = (k: ItemKind) => KINDS.find((x) => x.key === k)?.icon ?? 'circle';

export const DASHBOARD_OPTIONS: { key: string; label: string }[] = [
  { key: 'sleepH', label: 'Hours of sleep' },
  { key: 'energy', label: 'Energy (check-in)' },
  { key: 'stress', label: 'Stress (check-in)' },
  { key: 'moveMin', label: 'Minutes of movement' },
  { key: 'steps', label: 'Steps' },
  { key: 'water', label: 'Water' },
  { key: 'restingHr', label: 'Resting heart rate' },
  { key: 'voice', label: 'Voice load and hoarseness' },
  { key: 'restore', label: 'Restore minutes' },
];

export const blankWeek = (): WeekSlot[][] => Array.from({ length: 7 }, () => []);

/** Monday-based index for a day key. */
const monIndex = (d: string) => (parseDay(d).getDay() + 6) % 7;

/** Calendar items for the plan's ordinary week and review days, for `weeks` weeks from the start date. */
export function planToItems(p: PlanVersion, weeks = 4, makeId: (n: number) => string = (n) => `${p.id}-${n}`): PlanItem[] {
  const out: PlanItem[] = [];
  let n = 0;
  for (let i = 0; i < weeks * 7; i++) {
    const date = addDays(p.start, i);
    for (const slot of p.week[monIndex(date)] || []) out.push({ id: makeId(n++), date, time: slot.time, title: slot.title, kind: slot.kind, done: false, remind: !!slot.time, fromPlan: p.id });
    if (parseDay(date).getDay() === p.reviewDay) out.push({ id: makeId(n++), date, time: p.reviewTime, title: 'Weekly review', kind: 'review', done: false, remind: true, fromPlan: p.id });
  }
  return out;
}

/** Replace the future, not-yet-done items of earlier plans with the new plan's items. Past and done items stay. */
export function mergePlanItems(items: PlanItem[], fresh: PlanItem[], today = dayKey()): PlanItem[] {
  const keep = items.filter((i) => !i.fromPlan || i.done || i.date < today);
  return [...keep, ...fresh.filter((f) => f.date >= today)].sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || '')));
}

export function itemsOn(items: PlanItem[], date: string) {
  return items.filter((i) => i.date === date).sort((a, b) => (a.time || '99').localeCompare(b.time || '99'));
}

export const currentPlan = (s: PlanSlice): PlanVersion | null => s.versions[0] ?? null;

export function adherence(items: PlanItem[], from: string, to: string): { done: number; total: number } {
  const xs = items.filter((i) => i.date >= from && i.date <= to && i.kind !== 'review');
  return { done: xs.filter((i) => i.done).length, total: xs.length };
}
