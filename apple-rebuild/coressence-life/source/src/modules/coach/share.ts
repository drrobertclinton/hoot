// Coach Portal hand-off (pure; unit-tested in tests/coach.test.ts).
// 1) "Share with my coach": a small JSON summary built only from the categories the person switches on.
// 2) "Open coach feedback": validate a feedback file from the Coach Portal before it is stored.
// Values come from data already in the app; a value with no data is null, never estimated.
import { lastDays, weekStart } from '@core/dates';
import { mean } from '@core/stats';
import * as measure from '../measure/model';
import { courseSequence, type Course } from '../education/course/modules';
import type { EduSlice } from '../education/model';
import type { MoveSlice } from '../move/model';
import type { RehearseSlice } from '../rehearse/model';
import { hoursFor, type SleepSlice } from '../sleep/model';
import type { TrackSlice } from '../track/model';
import { deviceSleep } from '../life/today';

export type Consent = { track: boolean; measure: boolean; practice: boolean };
export const NO_CONSENT: Consent = { track: false, measure: false, practice: false };

export const CONSENT_INFO: { key: keyof Consent; title: string; line: string; keys: string[] }[] = [
  { key: 'track', title: 'Track', line: 'Shares your average mood from daily check-ins over the last 7 days.', keys: ['Avg mood (7d)'] },
  { key: 'measure', title: 'Measure', line: 'Shares your average sleep over the last 7 days and your resting heart rate from your devices or entries.', keys: ['Avg sleep (7d)', 'Resting HR'] },
  { key: 'practice', title: 'Practice', line: 'Shares how many workouts you logged this week, your voice use over 7 days and your current course week.', keys: ['Workouts this week', 'Voice load (7d)', 'Course week'] },
];

export type ShareSummary = Partial<Record<'Avg mood (7d)' | 'Avg sleep (7d)' | 'Resting HR' | 'Workouts this week' | 'Voice load (7d)' | 'Course week', number | null>>;
export type CoachShare = { type: 'coressence-share'; name: string | null; goal: string | null; consent: Consent; summary: ShareSummary };

export type ShareInput = {
  name: string;
  goal: string | null;
  track: TrackSlice;
  measure: measure.MeasureSlice;
  sleep: SleepSlice;
  move: MoveSlice;
  rehearse: RehearseSlice;
  edu: EduSlice;
  courses: Course[];
  today: string;
};

const r1 = (n: number | null) => (n === null ? null : Math.round(n * 10) / 10);

/** Current course week: the week of the next module to do, once at least one module is saved; 4 when all are done. */
export function courseWeek(edu: EduSlice, courses: Course[]): number | null {
  let best: number | null = null;
  for (const c of courses) {
    const seq = courseSequence(c);
    if (!seq.some((l) => edu.progress[l.id]?.completed)) continue;
    const next = seq.find((l) => !edu.progress[l.id]?.completed);
    const w = next?.week ?? 4;
    best = best === null ? w : Math.max(best, w);
  }
  return best;
}

export function buildShare(i: ShareInput, consent: Consent): CoachShare {
  const days = lastDays(7, i.today);
  const summary: ShareSummary = {};
  if (consent.track) {
    summary['Avg mood (7d)'] = r1(mean(days.map((d) => i.track.checkins[d]?.mood)));
  }
  if (consent.measure) {
    const ds = deviceSleep(i.measure);
    summary['Avg sleep (7d)'] = r1(mean(days.map((d) => hoursFor(i.sleep, d, ds[d]))));
    const rhr = mean(days.map((d) => measure.dayMetrics(i.measure, d).restingHr));
    summary['Resting HR'] = rhr === null ? null : Math.round(rhr);
  }
  if (consent.practice) {
    const from = weekStart(i.today);
    summary['Workouts this week'] = i.move.workouts.length ? i.move.workouts.filter((w) => w.date >= from && w.date <= i.today).length : null;
    const voice = days.map((d) => i.rehearse.voice[d]?.voiceHours).filter((v): v is number => typeof v === 'number');
    summary['Voice load (7d)'] = voice.length ? r1(voice.reduce((a, b) => a + b, 0)) : null;
    summary['Course week'] = courseWeek(i.edu, i.courses);
  }
  return { type: 'coressence-share', name: i.name.trim() || null, goal: i.goal?.trim() || null, consent: { ...consent }, summary };
}

export const shareFileName = (today: string) => `coressence-share-${today}.json`;

// ------------------------------------------------------------------ feedback from the Coach Portal
export type CoachFeedback = { type: 'coressence-coach-feedback'; coach: string; file: string; overall: string; comments: { at: string; text: string }[] };
export type StoredFeedback = CoachFeedback & { id: string; received: string };

const MAX_TEXT = 5000;
const MAX_COMMENTS = 200;
const isStr = (v: unknown, max = MAX_TEXT): v is string => typeof v === 'string' && v.length <= max;

/** Check a parsed feedback file. Returns the cleaned feedback or a friendly reason it was rejected. */
export function validateFeedback(raw: unknown): { ok: true; value: CoachFeedback } | { ok: false; error: string } {
  const bad = (error: string) => ({ ok: false as const, error });
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return bad('This file is not coach feedback from Coressence.');
  const o = raw as Record<string, unknown>;
  if (o.type !== 'coressence-coach-feedback') return bad('This file is not coach feedback from Coressence. Ask your coach to export feedback from the Coach Portal.');
  if (!isStr(o.coach, 200) || !o.coach.trim()) return bad('The feedback file is missing the coach’s name.');
  if (!isStr(o.file, 500)) return bad('The feedback file is missing the name of the shared file it answers.');
  if (!isStr(o.overall)) return bad('The feedback file is missing the overall note, or it is too long.');
  if (!Array.isArray(o.comments)) return bad('The feedback file’s comments are not in the expected format.');
  if (o.comments.length > MAX_COMMENTS) return bad('The feedback file has more comments than this app can show.');
  const comments: { at: string; text: string }[] = [];
  for (const c of o.comments) {
    if (!c || typeof c !== 'object' || !isStr((c as Record<string, unknown>).at, 200) || !isStr((c as Record<string, unknown>).text)) return bad('One of the comments in the feedback file is not in the expected format.');
    comments.push({ at: String((c as Record<string, unknown>).at), text: String((c as Record<string, unknown>).text) });
  }
  return { ok: true, value: { type: 'coressence-coach-feedback', coach: o.coach.trim(), file: o.file, overall: o.overall, comments } };
}

/** Parse file text then validate; bad JSON gets the same friendly message. */
export function parseFeedbackText(text: string): { ok: true; value: CoachFeedback } | { ok: false; error: string } {
  if (text.length > 2_000_000) return { ok: false, error: 'That file is too large to be coach feedback.' };
  try {
    return validateFeedback(JSON.parse(text));
  } catch {
    return { ok: false, error: 'This file could not be read. Coach feedback is a .json file exported from the Coach Portal.' };
  }
}

