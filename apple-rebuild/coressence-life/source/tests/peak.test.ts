/// <reference types="node" />
// Peak Cycle, Weekly Experiment, Performer Day and the readiness explainer.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addDays, lastDays } from '../src/core/dates';
import { DEFAULT_GOALS } from '../src/core/settingsModel';
import { generateDemo } from '../src/demo/generate';
import { STEPS, biggestSignal, stepFor, todayActions, weekDays, weekModule } from '../src/modules/cycle/model';
import { EMPTY as XEMPTY, METRICS, TEMPLATES, closeExperiment, evaluate, kept, newExperiment, templatesFor, type Experiment, type ExperimentSlice } from '../src/modules/experiment/model';
import { CHECKLIST, EMPTY as PEMPTY, checklistState, countdownWords, nextShow, showPhase, toggleCheck, voiceBudget } from '../src/modules/performer/model';
import { explainReadiness } from '../src/modules/recover/explain';
import { readiness } from '../src/modules/recover/model';
import { readinessInput, snapshot, type Slices } from '../src/modules/life/today';
import { courseSequence } from '../src/modules/education/course/modules';
import type { PlanItem } from '../src/modules/plan/model';
import type { RehearseSlice } from '../src/modules/rehearse/model';

const today = '2026-11-11'; // a Wednesday
const item = (p: Partial<PlanItem>): PlanItem => ({ id: 'i', date: today, title: 'x', kind: 'other', done: false, remind: false, ...p });

test('peak cycle: six steps, with execute as Do and maintain as keep what works', () => {
  assert.deepEqual(STEPS.map((s) => s.label), ['Assess', 'Plan', 'Do', 'Measure', 'Review', 'Adjust']);
  assert.equal(stepFor('execute').step.key, 'do');
  assert.equal(stepFor('review').index, 4);
  assert.deepEqual([stepFor('maintain').step.key, stepFor('maintain').keeping], ['do', true]);
  assert.equal(stepFor('assess').keeping, false);
});

test('peak cycle: the week runs Monday to Sunday and marks today, logged days and the future', () => {
  const w = weekDays({ track: { checkins: { '2026-11-09': { date: '2026-11-09', energy: 3, mood: 3, stress: 3, soreness: 1, focus: 3 } }, habits: [], done: {} }, plan: { versions: [], items: [item({ date: '2026-11-10', done: true }), item({ id: 'j', date: '2026-11-10' })] } }, today);
  assert.equal(w.length, 7);
  assert.equal(w[0].date, '2026-11-09');
  assert.equal(w[0].logged, true);
  assert.deepEqual([w[1].planned, w[1].done], [2, 1]);
  assert.equal(w[2].today, true);
  assert.equal(w[3].future, true);
});

test('peak cycle: this week’s module is the next unfinished one in the course already started', () => {
  const seqs = [
    { course: 'live' as const, lessons: courseSequence('live') },
    { course: 'perform' as const, lessons: courseSequence('perform') },
  ];
  const fresh = weekModule({ progress: {} }, seqs)!;
  assert.equal(fresh.lesson.id, 'live-m1');
  assert.equal(fresh.week, 1);
  const done = (ids: string[]) => ({ progress: Object.fromEntries(ids.map((id) => [id, { checkPassed: true, answers: {}, completed: today }])) });
  const mid = weekModule(done(['perform-m1', 'perform-m2', 'perform-m3', 'perform-lab1']), seqs)!;
  assert.deepEqual([mid.lesson.id, mid.course, mid.week, mid.position, mid.total], ['perform-m4', 'perform', 2, 5, 16]);
  assert.equal(weekModule(done(courseSequence('live').map((l) => l.id)), [seqs[0]]), null);
});

test('peak cycle: today has one to three actions, plan first, with the experiment always given a place', () => {
  const items = [item({ id: 'a', time: '07:00', done: true }), item({ id: 'b', time: '12:00' }), item({ id: 'c', time: '18:00' }), item({ id: 'd', time: '20:00' })];
  assert.deepEqual(todayActions({ items, checkedIn: true }).map((a) => a.id), ['b', 'c', 'd']);
  const withX = todayActions({ items, checkedIn: false, experiment: { title: 'Bed earlier', doneToday: false } });
  assert.deepEqual(withX.map((a) => a.id), ['b', 'c', 'experiment']);
  const empty = todayActions({ items: [], checkedIn: false, module: { id: 'live-m1', title: 'Module 1' } });
  assert.deepEqual(empty.map((a) => a.kind), ['checkin', 'module']);
  assert.equal(todayActions({ items: [], checkedIn: true }).length, 0);
});

test('weekly experiment: every template names a real course module and a measure', () => {
  for (const t of TEMPLATES) {
    assert.ok(METRICS[t.metric], t.id);
    assert.equal(courseSequence('live').find((l) => l.number === t.module && l.kind === 'module')?.title, t.moduleTitle, t.id);
  }
  assert.ok(templatesFor('live').every((t) => t.course === 'both'));
  assert.ok(templatesFor('perform').some((t) => t.course === 'perform'));
});

const exp = (done: number, start = addDays(today, -6)): Experiment => {
  const e = newExperiment({ id: 'x1', template: TEMPLATES[0], start });
  lastDays(7, addDays(start, 6)).slice(0, done).forEach((d) => (e.done[d] = true));
  return e;
};
const series = (before: number, after: number, start: string) => (d: string) => (d < start ? before : after);

test('weekly experiment: keep, adjust and drop follow the written rules', () => {
  const start = addDays(today, -6);
  const keep = evaluate(exp(6), series(6.4, 7.1, start), today);
  assert.deepEqual([keep.verdict, keep.status, keep.headline], ['keep', 'final', 'Keep it']);
  assert.ok(Math.abs(keep.change! - 0.7) < 1e-9);
  assert.match(keep.reason, /6\.4 h to 7\.1 h \(up 0\.7 h\)/);
  assert.match(keep.reason, /6 of 7 days/);
  // Improved, but done on too few days: the change was not really tested.
  assert.equal(evaluate(exp(2), series(6.4, 7.1, start), today).verdict, 'adjust');
  // Done faithfully, number flat: drop. Done patchily, number flat: adjust.
  assert.equal(evaluate(exp(6), series(6.4, 6.5, start), today).verdict, 'drop');
  assert.equal(evaluate(exp(4), series(6.4, 6.5, start), today).verdict, 'adjust');
  // Moved the wrong way.
  assert.equal(evaluate(exp(6), series(7.0, 6.4, start), today).verdict, 'drop');
  // A "lower is better" measure improves by going down.
  const stress = { ...exp(7), metric: 'stress' as const };
  assert.equal(evaluate(stress, series(3.6, 3.0, start), today).verdict, 'keep');
});

test('weekly experiment: no verdict without three measured days on each side; early reads are labelled', () => {
  const start = addDays(today, -1);
  const young = evaluate(exp(2, start), series(6.4, 7.1, start), today);
  assert.deepEqual([young.status, young.verdict, young.day, young.daysLeft], ['collecting', null, 2, 5]);
  const noBefore = evaluate(exp(6), (d) => (d < addDays(today, -6) ? null : 7), today);
  assert.equal(noBefore.status, 'collecting');
  assert.match(noBefore.reason, /week before has only 0 days/);
  const early = evaluate(exp(4, addDays(today, -3)), series(6.4, 7.1, addDays(today, -3)), today);
  assert.deepEqual([early.status, early.verdict], ['early', 'keep']);
  assert.match(early.headline, /^Early read/);
});

test('weekly experiment: closing files it in the history and "keep" builds the keep-what-works list', () => {
  const s: ExperimentSlice = { ...XEMPTY, current: exp(6) };
  const ev = evaluate(s.current!, series(6.4, 7.1, addDays(today, -6)), today);
  const closed = closeExperiment(s, 'keep', ev, today);
  assert.equal(closed.current, null);
  assert.equal(closed.history[0].closed?.decision, 'keep');
  assert.equal(closed.history[0].closed?.suggested, 'keep');
  assert.equal(kept(closed).length, 1);
  assert.equal(kept(closeExperiment(s, 'drop', ev, today)).length, 0);
});

test('performer day: countdown and phase follow the next performance on the calendar', () => {
  const items = [item({ id: 's1', kind: 'performance', date: addDays(today, 3), time: '19:30', title: 'Opening night' }), item({ id: 's0', kind: 'performance', date: addDays(today, -1) }), item({ id: 'r', kind: 'rehearsal' })];
  const n = nextShow(items, today, 9 * 60)!;
  assert.deepEqual([n.item.id, n.days, countdownWords(n)], ['s1', 3, '3 days']);
  assert.equal(showPhase(n, null, today), 'week');
  assert.equal(showPhase(nextShow(items, addDays(today, 2)), null, addDays(today, 2)), 'eve');
  const day = nextShow(items, addDays(today, 3), 14 * 60 + 10)!;
  assert.deepEqual([showPhase(day, null, addDays(today, 3)), countdownWords(day)], ['day', '5 h 20 min']);
  assert.equal(showPhase(null, items[0], addDays(today, 4)), 'recovery');
  assert.equal(showPhase(null, null, today), 'none');
  assert.equal(nextShow([item({ kind: 'rehearsal' })], today), null);
});

test('performer day: the voice budget starts from the person’s typical day and is trimmed for hoarseness and the show', () => {
  const voice: RehearseSlice = { voice: {} };
  assert.deepEqual([voiceBudget(voice, 'none', today).budget, voiceBudget(voice, 'none', today).logged], [3, 0]);
  for (const d of lastDays(28, addDays(today, -1))) voice.voice[d] = { date: d, voiceHours: 4, hoarseness: 0, warmedUp: true, restMinutes: 0 };
  const plain = voiceBudget(voice, 'build', today);
  assert.deepEqual([plain.typical, plain.budget, plain.left, plain.status], [4, 4, 4, 'open']);
  assert.equal(voiceBudget(voice, 'day', today).budget, 2);
  assert.equal(voiceBudget(voice, 'eve', today).budget, 2.75);
  voice.voice[addDays(today, -1)].hoarseness = 3;
  const hoarse = voiceBudget(voice, 'day', today);
  assert.equal(hoarse.budget, 0.5); // 4 - 2 (hoarse, 50%) - 2 (show) = 0, floored at half an hour
  assert.ok(hoarse.parts.some((p) => /Hoarseness 3/.test(p.label)));
  voice.voice[today] = { date: today, voiceHours: 1, hoarseness: 0, warmedUp: false, restMinutes: 0 };
  assert.deepEqual([voiceBudget(voice, 'day', today).status, voiceBudget(voice, 'day', today).left], ['over', -0.5]);
});

test('performer day: the checklist keeps essentials apart and ticks the warmup from the voice log', () => {
  assert.ok(CHECKLIST.filter((c) => c.essential).length >= 6);
  assert.ok(CHECKLIST.every((c) => c.source.length > 0));
  let p = toggleCheck(PEMPTY, today, 'water');
  p = toggleCheck(p, today, 'quiet');
  const st = checklistState(p, today, true);
  assert.equal(st.done, 3); // water, quiet, and the warmup from the log
  assert.equal(st.essentialsDone, 2);
  assert.equal(checklistState(toggleCheck(p, today, 'water'), today, false).done, 1);
});

test('why this number: the rows add up to the score and name the biggest mover', () => {
  const input = { hrv: 45, hrvBase: 50, rhr: 62, rhrBase: 60, sleep: 0.6, sleepHours: 6.1, sleepGoal: 8, soreness: 5, tempDev: null };
  const e = explainReadiness(input, { ...input, sleep: 0.8, soreness: 3 });
  assert.equal(e.score, Math.round(readiness(input).score! * 100));
  assert.equal(e.start + e.rows.reduce((a, r) => a + r.delta, 0), e.score);
  assert.equal(e.steps[e.steps.length - 1].to, e.score);
  assert.equal(e.biggest?.label, 'Sleep');
  assert.match(e.sentence, /Sleep moved it most today: −15 points/);
  assert.match(e.rows[0].text, /10% below your own average/);
  assert.equal(e.rows.find((r) => r.key === 'rhr')?.value, '62 bpm');
  assert.deepEqual([e.yesterday.score, e.yesterday.change, e.yesterday.mover], [55, -21, 'Sleep']);
  const none = explainReadiness({});
  assert.equal(none.score, null);
  assert.equal(none.missing.length, 4);
});

test('demo profile: a finished experiment with a keep verdict, a show this week and a readiness explanation', () => {
  const now = new Date(2026, 10, 11, 15, 30).getTime();
  const demo = generateDemo(now) as unknown as Slices & { experiment: ExperimentSlice; edu: { progress: Record<string, unknown> } };
  const x = demo.experiment.current!;
  const ev = evaluate(x, (d) => METRICS[x.metric].get(demo, d), today);
  assert.deepEqual([ev.status, ev.verdict], ['final', 'keep']);
  assert.ok(kept(demo.experiment).length >= 1);
  const show = nextShow(demo.plan.items, today, 15 * 60 + 30)!;
  assert.equal(show.days, 3);
  assert.ok(voiceBudget(demo.rehearse, showPhase(show, null, today), today).budget > 0);
  const e = explainReadiness(readinessInput(demo, DEFAULT_GOALS, today), readinessInput(demo, DEFAULT_GOALS, addDays(today, -1)));
  assert.equal(e.score, Math.round(snapshot(demo, DEFAULT_GOALS, today).recover.score! * 100));
  assert.ok(e.rows.length >= 4);
  const sig = biggestSignal(demo, today)!;
  assert.ok(sig.headline.length > 0 && sig.series.length === 14);
  assert.ok(demo.edu.progress['perform-m4']);
});
