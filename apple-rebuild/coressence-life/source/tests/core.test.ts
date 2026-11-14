/// <reference types="node" />
// Core logic: dates, streaks, reminders, scores, sleep sound analysis, plan builder and the demo profile.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addDays, lastDays, sleepHours, weekStart, dayKey } from '../src/core/dates';
import { bestStreak, correlation, streak } from '../src/core/stats';
import { buildReminders } from '../src/core/reminders';
import { DEFAULT_SETTINGS, DEFAULT_GOALS } from '../src/core/settingsModel';
import { routinePosition } from '../src/core/routine';
import { analyzeNight, interpret, patternAdvice } from '../src/modules/sleep/noise';
import { sleepScore, bedtimeSpread } from '../src/modules/sleep/model';
import { moveScore, weekSummary } from '../src/modules/move/model';
import { fuelScore } from '../src/modules/fuel/model';
import { readiness } from '../src/modules/recover/model';
import { planToItems, mergePlanItems, blankWeek, type PlanVersion } from '../src/modules/plan/model';
import { cyclePhase } from '../src/modules/coach/model';
import { rangeStatus } from '../src/modules/labs/model';
import { bucket } from '../src/modules/measure/providers/aggregate';
import { dayMetrics, baseline } from '../src/modules/measure/model';
import { hoarseRun, voiceAdvice } from '../src/modules/rehearse/model';
import { LESSONS } from '../src/modules/education/lessons';
import { MOVE_ROUTINES } from '../src/modules/move/routines';
import { WARMUPS } from '../src/modules/rehearse/warmups';
import { generateDemo } from '../src/demo/generate';
import { snapshot, weekNumbers, coachNotes, cycleFor, type Slices } from '../src/modules/life/today';

test('dates: day keys, ranges, weeks and sleep length across midnight', () => {
  assert.equal(addDays('2026-10-31', 1), '2026-11-01');
  assert.deepEqual(lastDays(3, '2026-10-02'), ['2026-09-30', '2026-10-01', '2026-10-02']);
  assert.equal(weekStart('2026-10-18'), '2026-10-12'); // Sunday -> Monday before
  assert.equal(sleepHours('23:30', '07:00'), 7.5);
  assert.equal(sleepHours('01:00', '06:30'), 5.5);
});

test('streaks count back from today, or from yesterday before today is logged', () => {
  const t = '2026-10-18';
  assert.equal(streak(['2026-10-16', '2026-10-17', '2026-10-18'], t), 3);
  assert.equal(streak(['2026-10-16', '2026-10-17'], t), 2);
  assert.equal(streak(['2026-10-15'], t), 0);
  assert.equal(bestStreak(['2026-10-01', '2026-10-02', '2026-10-05', '2026-10-06', '2026-10-07']), 3);
  assert.ok(Math.abs(correlation([[1, 2], [2, 4], [3, 6], [4, 8], [5, 10]])! - 1) < 1e-9);
  assert.equal(correlation([[1, 2], [2, 4]]), null);
});

test('reminders: daily, water every N hours, weekly review, plan items only in the future', () => {
  const r = structuredClone(DEFAULT_SETTINGS.reminders);
  assert.equal(buildReminders(r, []).length, 0);
  r.checkin.on = true;
  r.water = { on: true, everyHours: 2, from: '09:00', to: '19:00' };
  r.review = { on: true, weekday: 0, time: '18:00' };
  r.plan = { on: true, minutesBefore: 30 };
  const now = new Date(2026, 9, 18, 10, 0).getTime();
  const specs = buildReminders(r, [
    { id: 'a', date: '2026-10-18', time: '09:00', title: 'Past', remind: true },
    { id: 'b', date: '2026-10-19', time: '07:00', title: 'Strength', remind: true },
    { id: 'c', date: '2026-10-19', time: '12:00', title: 'No reminder', remind: false },
  ], now);
  assert.equal(specs.filter((s) => s.id.startsWith('water')).length, 6);
  const weekly = specs.find((s) => s.id === 'review')!;
  assert.deepEqual(weekly.trigger, { type: 'weekly', weekday: 1, hour: 18, minute: 0 });
  const plan = specs.filter((s) => s.id.startsWith('plan-'));
  assert.equal(plan.length, 1);
  assert.equal(plan[0].trigger.type === 'date' && new Date(plan[0].trigger.at).getHours(), 6);
});

test('ring scores', () => {
  assert.equal(sleepScore(null, null, 8), null);
  assert.equal(sleepScore(8, null, 8), 1);
  assert.ok(sleepScore(6, 3, 8)! < sleepScore(8, 4, 8)!);
  assert.equal(moveScore(30, 30, undefined, 8000), 1);
  assert.ok(Math.abs(moveScore(15, 30, 8000, 8000) - 0.65) < 1e-9);
  assert.equal(fuelScore({ meals: [], water: {}, fasts: [] }, '2026-10-18', 2000), null);
  const f = fuelScore({ meals: [{ id: 'm', date: 'd', time: '08:00', kind: 'breakfast', tags: ['protein', 'plants'] }], water: { d: 1000 }, fasts: [] }, 'd', 2000)!;
  assert.ok(f > 0.3 && f < 0.5);
});

test('readiness blends heart data, sleep and soreness, and explains itself', () => {
  assert.equal(readiness({}).score, null);
  const good = readiness({ hrv: 66, hrvBase: 55, rhr: 56, rhrBase: 58, sleep: 0.95, soreness: 2 });
  const poor = readiness({ hrv: 44, hrvBase: 55, rhr: 64, rhrBase: 58, sleep: 0.6, soreness: 7 });
  assert.ok(good.score! > 0.85, String(good.score));
  assert.ok(poor.score! < 0.45, String(poor.score));
  assert.equal(good.parts.length, 4);
});

function quietNight(sec: number) {
  return Array.from({ length: sec }, (_, i) => -62 + ((i * 7919) % 5));
}

test('sleep sound check: a quiet room stays quiet', () => {
  const a = analyzeNight(quietNight(3600), 0);
  assert.equal(a.events.length, 0);
  assert.equal(a.summary.level, 'quiet');
  assert.equal(a.buckets.length, 120);
  assert.match(interpret(a.summary).join(' '), /Very little rhythmic/);
});

test('sleep sound check: rhythmic sound, sustained noise and a pause-then-loud moment are found', () => {
  const s = quietNight(3600);
  for (let t = 600; t < 1500; t += 4) s[t] = s[t + 1] = -36; // ~15 min of breathing-rate sound
  for (let t = 1500; t < 1518; t++) s[t] = -62; // 18 s pause
  s[1518] = s[1519] = -24; // louder return
  for (let t = 1522; t < 1700; t += 4) s[t] = s[t + 1] = -36;
  for (let t = 2500; t < 2530; t++) s[t] = -30; // 30 s of talking
  s[3000] = -35; // one bump
  const a = analyzeNight(s, 0);
  assert.ok(a.summary.rhythmicMinutes >= 14, String(a.summary.rhythmicMinutes));
  assert.equal(a.summary.pauseLoud, 1);
  assert.equal(a.summary.sustained, 1);
  assert.equal(a.summary.brief, 1);
  assert.equal(a.summary.level, 'frequent');
  const text = interpret(a.summary).join(' ');
  assert.match(text, /snoring-like/);
  assert.match(text, /not a sleep test/);
  assert.doesNotMatch(text, /apnea/i);
});

test('sleep pattern advice needs frequent nights on at least 3 of the last 7', () => {
  const night = (level: 'quiet' | 'frequent') => ({ summary: { level } as any });
  assert.equal(patternAdvice([night('frequent'), night('frequent')]), null);
  assert.equal(patternAdvice([night('frequent'), night('quiet'), night('quiet'), night('quiet')]), null);
  assert.match(patternAdvice([night('frequent'), night('frequent'), night('quiet'), night('frequent')])!, /clinician/);
});

test('health samples aggregate into days (sum, average, latest, sleep credited to the wake day)', () => {
  const d1 = new Date(2026, 9, 17, 9).getTime();
  const d2 = new Date(2026, 9, 18, 9).getTime();
  const out = bucket([{ start: d1, value: 4000 }, { start: d1 + 3600000, value: 2000 }, { start: d2, value: 500 }], 'steps', 'sum');
  assert.equal(out['2026-10-17'].steps, 6000);
  bucket([{ start: d1, value: 60 }, { start: d1 + 1, value: 64 }], 'restingHr', 'avg', out);
  assert.equal(out['2026-10-17'].restingHr, 62);
  const bed = new Date(2026, 9, 17, 23, 0).getTime();
  bucket([{ start: bed, end: bed + 7.5 * 3600000, value: 0 }], 'sleepH', 'durationH', out);
  assert.equal(out['2026-10-18'].sleepH, 7.5);
  const m = { source: 'none' as const, lastSync: null, synced: { '2026-10-18': { steps: 100, restingHr: 60 } }, manual: { '2026-10-18': { restingHr: 58 } } };
  assert.deepEqual(dayMetrics(m, '2026-10-18'), { steps: 100, restingHr: 58 });
  assert.equal(baseline(m, 'restingHr', '2026-10-19'), 58);
});

test('plan builder: ordinary week to calendar items, review days, and re-planning keeps past items', () => {
  const week = blankWeek();
  week[0].push({ kind: 'move', title: 'Strength', time: '07:00' }); // Mondays
  const p: PlanVersion = { id: 'p1', created: '2026-10-12', start: '2026-10-12', outcome: 'o', why: '', action: 'a', constraint: 'c', dashboard: [], observeDays: 7, week, minimum: '', ruleIf: '', ruleThen: '', reviewDay: 0, reviewTime: '18:00' };
  const items = planToItems(p, 2);
  assert.deepEqual(items.filter((i) => i.kind === 'move').map((i) => i.date), ['2026-10-12', '2026-10-19']);
  assert.deepEqual(items.filter((i) => i.kind === 'review').map((i) => i.date), ['2026-10-18', '2026-10-25']);
  const done = items.map((i) => (i.date === '2026-10-12' ? { ...i, done: true } : i));
  const p2 = { ...p, id: 'p2', start: '2026-10-18', week: blankWeek() };
  const merged = mergePlanItems(done, planToItems(p2, 1), '2026-10-18');
  assert.ok(merged.some((i) => i.fromPlan === 'p1' && i.done));
  assert.ok(!merged.some((i) => i.fromPlan === 'p1' && i.date >= '2026-10-18'));
  assert.ok(merged.some((i) => i.fromPlan === 'p2' && i.kind === 'review'));
});

test('course cycle phase', () => {
  const since = (today: string) => (d: string) => Math.round((Date.parse(today) - Date.parse(d)) / 864e5);
  const base = { hasData: false, planStart: null, lastReview: null, lastReviewAdjusted: false, planAfterReview: false, reviews: 0, daysSince: since('2026-10-18') };
  assert.equal(cyclePhase(base), 'assess');
  assert.equal(cyclePhase({ ...base, hasData: true }), 'plan');
  assert.equal(cyclePhase({ ...base, planStart: '2026-10-17' }), 'execute');
  assert.equal(cyclePhase({ ...base, planStart: '2026-10-13' }), 'measure');
  assert.equal(cyclePhase({ ...base, planStart: '2026-10-10' }), 'review');
  assert.equal(cyclePhase({ ...base, planStart: '2026-10-01', lastReview: '2026-10-17', lastReviewAdjusted: true }), 'adjust');
  assert.equal(cyclePhase({ ...base, planStart: '2026-10-01', lastReview: '2026-10-16', reviews: 3, planAfterReview: true }), 'maintain');
});

test('labs compare only with the range on the report', () => {
  assert.equal(rangeStatus({ id: 'x', testId: 'ldl', date: 'd', value: 120 }), 'none');
  assert.equal(rangeStatus({ id: 'x', testId: 'ldl', date: 'd', value: 120, high: 99 }), 'above');
  assert.equal(rangeStatus({ id: 'x', testId: 'vitd', date: 'd', value: 24, low: 30, high: 100 }), 'below');
});

test('voice: hoarseness runs lead to plain advice', () => {
  const v: any = { voice: {} };
  for (const d of lastDays(4, '2026-10-18')) v.voice[d] = { date: d, voiceHours: 6, hoarseness: 2, warmedUp: true, restMinutes: 0 };
  assert.equal(hoarseRun(v, '2026-10-18'), 4);
  assert.equal(voiceAdvice(v, '2026-10-18').tone, 'warn');
});

test('routines and lessons are complete', () => {
  const r = MOVE_ROUTINES[0];
  assert.deepEqual(routinePosition(r, 0), { index: 0, left: r.steps[0].seconds, done: false });
  assert.equal(routinePosition(r, 99999).done, true);
  for (const x of [...MOVE_ROUTINES, ...WARMUPS]) assert.ok(x.steps.length >= 4 && x.steps.every((s) => s.seconds > 0 && s.cue.length > 4), x.id);
  assert.ok(LESSONS.length >= 6 && LESSONS.length <= 8);
  for (const l of LESSONS) {
    assert.ok(l.sections.length >= 3, l.id);
    assert.ok(l.check && l.check.correct >= 0 && l.check.correct < l.check.options.length, l.id);
    assert.ok(l.apply.fields.length >= 1, l.id);
    assert.match(l.example.body, /fictional/, l.id);
  }
  assert.ok(LESSONS.some((l) => l.track === 'perform') && LESSONS.some((l) => l.track === 'live'));
  const all = JSON.stringify([LESSONS, MOVE_ROUTINES, WARMUPS]);
  assert.doesNotMatch(all, /working draft|\bAI\b|cure|guarantee/i);
});

test('demo profile: 60 days of consistent data that fills every ring', () => {
  const now = new Date(2026, 9, 18, 10, 30).getTime();
  const demo = generateDemo(now) as unknown as Slices & Record<string, any>;
  const today = dayKey(now);
  assert.ok(Object.keys(demo.track.checkins).length > 50);
  assert.ok(demo.move.workouts.length > 30);
  assert.equal(demo.sleep.nights.length, 6);
  assert.ok(patternAdvice(demo.sleep.nights));
  assert.ok(demo.labs.results.length >= 10);
  const snap = snapshot(demo, DEFAULT_GOALS, today);
  for (const k of ['sleep', 'move', 'fuel', 'recover', 'restore'] as const) assert.notEqual(snap[k].score, null, k);
  assert.ok(weekNumbers(demo, DEFAULT_GOALS, today).length >= 7);
  assert.ok(coachNotes(demo, DEFAULT_GOALS, true, today).length >= 2);
  assert.ok(['execute', 'measure', 'review', 'adjust', 'maintain'].includes(cycleFor(demo, today)));
  assert.equal(weekSummary(demo.move, today).days.length, 7);
  assert.ok(bedtimeSpread(demo.sleep, today) !== null);
  // Same day, same demo.
  assert.deepEqual(generateDemo(now), generateDemo(now));
});

test('Scripture reflections use the WEB with "the LORD" for the divine name', async () => {
  const { REFLECTIONS, TRANSLATION } = await import('../src/modules/restore/scripture');
  assert.equal(TRANSLATION, 'WEB');
  assert.equal(REFLECTIONS.length, 8);
  const all = REFLECTIONS.map((r) => r.text).join(' ');
  assert.doesNotMatch(all, /Yahweh|\b(thee|thou|thy|thine|unto|hath|maketh|leadeth)\b/i);
  assert.ok(REFLECTIONS.some((r) => r.text.includes('The LORD is my shepherd')));
});
