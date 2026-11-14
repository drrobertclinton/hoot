/// <reference types="node" />
// Coach Portal hand-off: consent filtering in the share file, and the feedback validator.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildShare, courseWeek, parseFeedbackText, shareFileName, validateFeedback, NO_CONSENT, type ShareInput } from '../src/modules/coach/share';
import { EMPTY as EDU } from '../src/modules/education/model';

const today = '2026-11-04'; // a Wednesday
const base: ShareInput = {
  name: 'Sam',
  goal: 'Sustain the summer season',
  track: {
    checkins: {
      '2026-11-02': { date: '2026-11-02', energy: 3, mood: 4, stress: 2, soreness: 1, focus: 3 },
      '2026-11-03': { date: '2026-11-03', energy: 3, mood: 3, stress: 2, soreness: 1, focus: 3 },
      '2026-10-20': { date: '2026-10-20', energy: 3, mood: 1, stress: 2, soreness: 1, focus: 3 },
    },
    habits: [],
    done: {},
  },
  measure: { synced: { '2026-11-03': { sleepH: 7, restingHr: 58 } }, manual: { '2026-11-04': { restingHr: 61 } } } as unknown as ShareInput['measure'],
  sleep: { logs: { '2026-11-02': { date: '2026-11-02', bed: '23:00', wake: '06:00', quality: 3, awakenings: 0 } } } as unknown as ShareInput['sleep'],
  move: { workouts: [{ id: 'w1', date: '2026-11-02', type: 'strength', minutes: 30, effort: 5 }, { id: 'w2', date: '2026-11-04', type: 'walk', minutes: 20, effort: 3 }, { id: 'w0', date: '2026-11-01', type: 'walk', minutes: 20, effort: 3 }] } as unknown as ShareInput['move'],
  rehearse: { voice: { '2026-11-02': { date: '2026-11-02', voiceHours: 3, hoarseness: 0, warmedUp: true, restMinutes: 10 }, '2026-11-03': { date: '2026-11-03', voiceHours: 2.5, hoarseness: 1, warmedUp: true, restMinutes: 0 } } },
  edu: { ...EDU, progress: { 'perform-m1': { checkPassed: true, answers: {}, completed: '2026-11-01' }, 'perform-m2': { checkPassed: true, answers: {}, completed: '2026-11-02' }, 'perform-m3': { checkPassed: true, answers: {}, completed: '2026-11-03' } } },
  courses: ['perform'],
  today,
};

test('share file: exact shape, nothing beyond identity when every switch is off', () => {
  const s = buildShare(base, NO_CONSENT);
  assert.deepEqual(s, { type: 'coressence-share', name: 'Sam', goal: 'Sustain the summer season', consent: { track: false, measure: false, practice: false }, summary: {} });
  assert.equal(shareFileName(today), 'coressence-share-2026-11-04.json');
  assert.deepEqual(Object.keys(s), ['type', 'name', 'goal', 'consent', 'summary']);
});

test('share file: each switch adds only its own keys, from real data', () => {
  const t = buildShare(base, { track: true, measure: false, practice: false });
  assert.deepEqual(t.summary, { 'Avg mood (7d)': 3.5 }); // the 20 Oct check-in is outside 7 days
  const m = buildShare(base, { track: false, measure: true, practice: false });
  assert.deepEqual(Object.keys(m.summary).sort(), ['Avg sleep (7d)', 'Resting HR']);
  assert.equal(m.summary['Avg sleep (7d)'], 7);
  assert.equal(m.summary['Resting HR'], 60);
  const p = buildShare(base, { track: false, measure: false, practice: true });
  assert.deepEqual(p.summary, { 'Workouts this week': 2, 'Voice load (7d)': 5.5, 'Course week': 1 }); // lab 1 still open
  const all = buildShare(base, { track: true, measure: true, practice: true });
  assert.equal(Object.keys(all.summary).length, 6);
  assert.deepEqual(all.consent, { track: true, measure: true, practice: true });
});

test('share file: no data gives null, never an invented value', () => {
  const empty: ShareInput = { ...base, name: '  ', goal: null, track: { checkins: {}, habits: [], done: {} }, measure: { synced: {}, manual: {} } as unknown as ShareInput['measure'], sleep: { logs: {} } as unknown as ShareInput['sleep'], move: { workouts: [] }, rehearse: { voice: {} }, edu: EDU };
  const s = buildShare(empty, { track: true, measure: true, practice: true });
  assert.equal(s.name, null);
  assert.equal(s.goal, null);
  for (const v of Object.values(s.summary)) assert.equal(v, null);
  assert.equal(courseWeek({ ...EDU, progress: { 'live-m12': { checkPassed: true, answers: {}, completed: '2026-11-01' } } }, ['live']), 1);
});

const GOOD = { type: 'coressence-coach-feedback', coach: 'Jamie Rivera', file: 'coressence-share-2026-11-04.json', overall: 'Solid week. <b>Keep</b> the warmup.', comments: [{ at: 'Course week', text: 'Nice progress.' }, { at: 'Voice load (7d)', text: 'Plan a lighter Monday.' }] };

test('feedback validator accepts the Coach Portal shape and keeps text as text', () => {
  const r = validateFeedback(GOOD);
  assert.equal(r.ok, true);
  if (!r.ok) return;
  assert.equal(r.value.coach, 'Jamie Rivera');
  assert.equal(r.value.overall, 'Solid week. <b>Keep</b> the warmup.'); // stored verbatim, rendered as plain text
  assert.equal(r.value.comments.length, 2);
  assert.deepEqual(validateFeedback({ ...GOOD, comments: [] }).ok, true);
  assert.equal(parseFeedbackText(JSON.stringify(GOOD)).ok, true);
});

test('feedback validator rejects anything else with a friendly message', () => {
  const cases: unknown[] = [
    null,
    [],
    'text',
    { ...GOOD, type: 'coressence-share' },
    { ...GOOD, coach: '' },
    { ...GOOD, coach: 42 },
    { ...GOOD, file: undefined },
    { ...GOOD, overall: null },
    { ...GOOD, comments: 'none' },
    { ...GOOD, comments: [{ at: 'x' }] },
    { ...GOOD, comments: [{ at: 1, text: 'x' }] },
    { ...GOOD, overall: 'x'.repeat(5001) },
  ];
  for (const c of cases) {
    const r = validateFeedback(c);
    assert.equal(r.ok, false, JSON.stringify(c)?.slice(0, 60));
    if (!r.ok) assert.match(r.error, /^(This|The|One)/);
  }
  const bad = parseFeedbackText('{not json');
  assert.equal(bad.ok, false);
  if (!bad.ok) assert.match(bad.error, /could not be read/);
});
