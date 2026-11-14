// Performer Day: for singers, actors and speakers. The countdown to the next show, a voice-load budget for today
// from the person's own voice log, and the performance-day sequence taught in Perform at Your Peak (pure).
import { addDays, dayKey, daysBetween, hm, lastDays } from '@core/dates';
import { clamp, mean, median } from '@core/stats';
import type { PlanItem } from '../plan/model';
import type { RehearseSlice } from '../rehearse/model';

export type PerformerSlice = {
  /** Checklist items ticked, by show date. */
  checks: Record<string, string[]>;
  /** After-show note, by show date. */
  notes: Record<string, { success: string; issue: string; question: string }>;
};
export const KEY = 'performer';
export const EMPTY: PerformerSlice = { checks: {}, notes: {} };

export type Show = { item: PlanItem; days: number; minutes: number | null };
export type ShowPhase = 'none' | 'build' | 'week' | 'eve' | 'day' | 'recovery';

/** The next performance on the calendar (today's counts until the end of the day). `nowMin` is minutes since midnight. */
export function nextShow(items: PlanItem[], today = dayKey(), nowMin?: number): Show | null {
  const item = items.filter((i) => i.kind === 'performance' && i.date >= today).sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || '')))[0];
  if (!item) return null;
  const days = daysBetween(today, item.date);
  const minutes = item.time && nowMin !== undefined ? days * 1440 + hm(item.time) - nowMin : null;
  return { item, days, minutes };
}

export const lastShow = (items: PlanItem[], today = dayKey()) => items.filter((i) => i.kind === 'performance' && i.date < today).sort((a, b) => b.date.localeCompare(a.date))[0] ?? null;

export function showPhase(next: Show | null, last: PlanItem | null, today = dayKey()): ShowPhase {
  if (next?.days === 0) return 'day';
  if (next?.days === 1) return 'eve';
  if (last && daysBetween(last.date, today) === 1) return 'recovery';
  if (next && next.days <= 7) return 'week';
  return next ? 'build' : 'none';
}

export const PHASE_COPY: Record<ShowPhase, { label: string; text: string }> = {
  none: { label: 'No show on the calendar', text: 'Add your next audition, opening or talk and the countdown, budget and sequence build around it.' },
  build: { label: 'Building', text: 'An ordinary training and rehearsal week. Place the demanding voice days first, then everything else.' },
  week: { label: 'Show week', text: 'Protect repeatability. Familiar meals, familiar warmup, and nothing new.' },
  eve: { label: 'Day before', text: 'Save the voice for tomorrow. Pack tonight and protect the sleep window.' },
  day: { label: 'Show day', text: 'Follow the sequence from waking to wind-down. Essentials first; comforts only if there is time.' },
  recovery: { label: 'Recovery day', text: 'Health and practical needs first. The review can wait until you have slept.' },
};

/** "3 days", "Tomorrow", "In 5 h 20 min", "Now". */
export function countdownWords(s: Show): string {
  if (s.days >= 2) return `${s.days} days`;
  if (s.days === 1) return 'Tomorrow';
  if (s.minutes === null) return 'Today';
  if (s.minutes <= 0) return 'Now';
  const h = Math.floor(s.minutes / 60);
  return h ? `${h} h ${s.minutes % 60} min` : `${s.minutes} min`;
}

export type BudgetPart = { label: string; hours: number; text: string };
export type VoiceBudget = { typical: number; logged: number; budget: number; used: number; left: number; status: 'open' | 'near' | 'over'; parts: BudgetPart[]; text: string };

const quarter = (x: number) => Math.round(x * 4) / 4;

/**
 * Today's voice-load budget in hours of off-stage voice use: speaking, teaching, rehearsing, warming up.
 * It starts from the person's own typical day (median of the last 28 logged days, 3 hours if nothing is logged,
 * kept between 2 and 6) and is trimmed for recent hoarseness, a heavy week, and the show itself:
 *   hoarseness 2 or more of 5 in the last two days: minus 25% per point above 1 (at most 60%)
 *   last 7 days averaged 30% above typical: minus 15%
 *   the day before a show: minus 30%; show day: minus 50% (the stage gets the rest); the day after: minus 30%
 * Never below half an hour. A planning guide from the person's own log, not a medical limit.
 */
export function voiceBudget(s: RehearseSlice, phase: ShowPhase, today = dayKey()): VoiceBudget {
  const past = lastDays(28, addDays(today, -1)).map((d) => s.voice[d]?.voiceHours).filter((x): x is number => typeof x === 'number');
  const typical = clamp(median(past) ?? 3, 2, 6);
  const parts: BudgetPart[] = [{ label: past.length ? 'Your typical day' : 'Starting point', hours: typical, text: past.length ? `Median of ${past.length} logged days in the last four weeks.` : 'Three hours until your voice log has a few days in it.' }];
  const recent = [today, addDays(today, -1)].map((d) => s.voice[d]?.hoarseness).filter((x): x is number => typeof x === 'number');
  const hoarse = recent.length ? Math.max(...recent) : 0;
  if (hoarse >= 2) parts.push({ label: `Hoarseness ${hoarse} of 5`, hours: -typical * Math.min(0.6, (hoarse - 1) * 0.25), text: 'Logged in the last two days. A hoarse voice gets less to do.' });
  const week = mean(lastDays(7, addDays(today, -1)).map((d) => s.voice[d]?.voiceHours));
  if (week !== null && week > typical * 1.3) parts.push({ label: 'Heavy week', hours: -typical * 0.15, text: `The last 7 days averaged ${week.toFixed(1)} h a day, well above your usual.` });
  if (phase === 'eve') parts.push({ label: 'Show tomorrow', hours: -typical * 0.3, text: 'Save it for the stage.' });
  if (phase === 'day') parts.push({ label: 'Show today', hours: -typical * 0.5, text: 'The performance takes the rest of today’s voice.' });
  if (phase === 'recovery') parts.push({ label: 'Day after a show', hours: -typical * 0.3, text: 'Limit avoidable loud conversation and let the voice settle.' });
  const budget = Math.max(0.5, quarter(parts.reduce((a, p) => a + p.hours, 0)));
  const used = s.voice[today]?.voiceHours ?? 0;
  const left = quarter(budget - used);
  const status: VoiceBudget['status'] = left < 0 ? 'over' : used >= budget * 0.8 ? 'near' : 'open';
  const text = left === 0 ? 'Today’s budget is spent. Rest the voice where you can.' : status === 'over' ? `Over today’s budget by ${Math.abs(left)} h. Rest the voice where you can and keep tomorrow lighter.` : status === 'near' ? `${left} h left. Choose what the remaining voice is for.` : `${left} h of off-stage voice use left today.`;
  return { typical, logged: past.length, budget, used, left, status, parts: parts.map((p) => ({ ...p, hours: quarter(p.hours) })), text };
}

export type CheckWhen = 'ahead' | 'before' | 'after';
export type CheckItem = { id: string; when: CheckWhen; label: string; essential: boolean; source: string; routine?: string; auto?: 'warmup' };

const LAB4 = 'Practice lab 4';
const LAB2 = 'Practice lab 2';
const PLAN = 'Plan example';

/**
 * The performance-day sequence from Perform at Your Peak: "meals, travel, call time, equipment, warmup, quiet time,
 * performance, and wind-down", with essentials kept apart from optional comforts as practice lab 4 asks.
 */
export const CHECKLIST: CheckItem[] = [
  { id: 'meals', when: 'ahead', label: 'Familiar meals planned, with a pre-show option I already know', essential: true, source: `${PLAN}: Food and fluids` },
  { id: 'water', when: 'ahead', label: 'Water packed and within reach', essential: true, source: `${PLAN}: Food and fluids` },
  { id: 'nothing-new', when: 'ahead', label: 'Nothing new today: no new supplement, fasting routine or device', essential: true, source: `${PLAN}: Food and fluids` },
  { id: 'travel', when: 'ahead', label: 'Travel and call time confirmed', essential: true, source: LAB4 },
  { id: 'equipment', when: 'ahead', label: 'Equipment, music and costume packed', essential: true, source: LAB4 },
  { id: 'contact', when: 'ahead', label: 'Contact and response plan if illness or injury changes what is safe', essential: true, source: LAB4 },
  { id: 'body', when: 'before', label: 'Body warmup: release shoulders, neck and jaw', essential: false, source: LAB4, routine: 'stage-physical' },
  { id: 'warmup', when: 'before', label: 'My familiar vocal warmup, at easy effort', essential: true, source: LAB4, routine: 'voice-10', auto: 'warmup' },
  { id: 'quiet', when: 'before', label: 'Quiet time before the call', essential: false, source: LAB4 },
  { id: 'cooldown', when: 'after', label: 'Voice cool-down and no loud conversation', essential: false, source: `${PLAN}: Recovery`, routine: 'voice-cooldown' },
  { id: 'meal-after', when: 'after', label: 'Practical post-show meal', essential: true, source: `${PLAN}: Food and fluids` },
  { id: 'sleep', when: 'after', label: 'Wind-down and post-show sleep routine', essential: true, source: LAB2 },
  { id: 'needs', when: 'after', label: 'Health and practical needs noted first', essential: true, source: LAB4 },
];

export const WHEN_LABEL: Record<CheckWhen, string> = { ahead: 'From waking', before: 'Before the call', after: 'After the show' };

export function checklistState(p: PerformerSlice, date: string, warmedUp: boolean) {
  const ticked = new Set(p.checks[date] ?? []);
  const items = CHECKLIST.map((c) => ({ ...c, done: ticked.has(c.id) || (c.auto === 'warmup' && warmedUp) }));
  const essentials = items.filter((x) => x.essential);
  return { items, done: items.filter((x) => x.done).length, total: items.length, essentialsDone: essentials.filter((x) => x.done).length, essentialsTotal: essentials.length };
}

export function toggleCheck(p: PerformerSlice, date: string, id: string): PerformerSlice {
  const cur = p.checks[date] ?? [];
  return { ...p, checks: { ...p.checks, [date]: cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id] } };
}
