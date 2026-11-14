/// <reference types="node" />
// Monitor: readiness with temperature, sleep stages and consistency, training load, glucose time in range,
// blood pressure against clinician targets, body trends, cycle estimates and heart rhythm records. Plain words,
// no diagnosis, and a clinician suggestion only when a pattern warrants it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lastDays } from '../src/core/dates';
import { readiness } from '../src/modules/recover/model';
import type { MeasureSlice } from '../src/modules/measure/model';
import type { BpReading, GlucoseReading } from '../src/modules/devices/schema';
import {
  availableCards,
  bodyTrend,
  bpInsights,
  bpSummary,
  cycleInsights,
  cycleState,
  glucoseDaily,
  glucoseInsights,
  glucoseStats,
  loadBalance,
  periods,
  rhythmHistory,
  rhythmInsights,
  sleepConsistency,
  stageSummary,
  EMPTY,
  type Insight,
} from '../src/modules/monitor/model';
import { generateDemo } from '../src/demo/generate';

const END = '2026-10-18';
const NOW = new Date(2026, 9, 18, 10, 0).getTime();
const slice = (days: Record<string, object>, events: Partial<NonNullable<MeasureSlice['events']>> = {}): MeasureSlice => ({ source: 'none', lastSync: null, synced: days as MeasureSlice['synced'], manual: {}, events: { workouts: [], bp: [], glucose: [], ecg: [], rhythm: [], cycle: [], nights: [], ...events } });
const words = (xs: Insight[]) => xs.map((x) => x.text).join(' ');

test('readiness counts an overnight temperature change, and only beyond ±0.3 °C', () => {
  const base = { hrv: 55, hrvBase: 55, rhr: 58, rhrBase: 58, sleep: 0.8 };
  assert.equal(readiness({ ...base, tempDev: 0.2 }).parts.length, 3);
  const warm = readiness({ ...base, tempDev: 0.8 });
  assert.equal(warm.parts.find((p) => p.label === 'Temperature')!.delta, -8);
  assert.ok(warm.score! < readiness(base).score!);
});

test('sleep stages and consistency', () => {
  const days: Record<string, object> = {};
  lastDays(14, END).forEach((d, i) => (days[d] = { sleepH: 7, sleepDeepH: 1.4, sleepRemH: 1.6, sleepCoreH: 4, sleepAwakeH: 0.5, bedMin: -60 + (i % 2) * 20, wakeMin: 390 + (i % 2) * 20 }));
  const s = stageSummary(slice(days), 7, END)!;
  assert.equal(s.deep, 1.4);
  assert.equal(s.deepPct, 20);
  const c = sleepConsistency(slice(days), 14, END)!;
  assert.ok(c.score >= 95, String(c.score));
  lastDays(14, END).forEach((d, i) => Object.assign(days[d], { bedMin: i % 2 ? -150 : 30, wakeMin: i % 2 ? 330 : 540 }));
  assert.ok(sleepConsistency(slice(days), 14, END)!.score < 40);
  assert.equal(sleepConsistency(slice({}), 14, END), null);
});

test('training load balance: steady, sharp jump, and lighter weeks', () => {
  const move = { workouts: lastDays(28, END).map((d, i) => ({ id: String(i), date: d, type: 'strength' as const, minutes: 40, effort: 6 })) };
  assert.equal(loadBalance(slice({}), move, END).tone, 'good');
  const jump = { workouts: move.workouts.map((w, i) => (i >= 21 ? { ...w, minutes: 140, effort: 9 } : w)) };
  const j = loadBalance(slice({}), jump, END);
  assert.ok(j.ratio! > 1.5, String(j.ratio));
  assert.equal(j.tone, 'warn');
  assert.equal(loadBalance(slice({}), { workouts: [] }, END).ratio, null);
});

test('glucose: time in range against the chosen range, lows flagged without diagnosing', () => {
  const t = { glucoseLow: 70, glucoseHigh: 180 };
  const xs: GlucoseReading[] = Array.from({ length: 96 }, (_, i) => ({ t: NOW - i * 15 * 60_000, mgdl: i < 4 ? 200 : i < 6 ? 50 : 100, origin: 'dexcom', path: 'dexcom' }));
  const s = glucoseStats(xs, NOW - 86400_000, NOW, t)!;
  assert.equal(s.n, 96);
  assert.equal(s.above, 4);
  assert.equal(s.below, 2);
  assert.equal(s.inRange, 94);
  assert.equal(s.veryLow, 2);
  const w = words(glucoseInsights(s, { ...EMPTY.targets }));
  assert.match(w, /clinician/);
  assert.doesNotMatch(w, /diabet|hypoglyc/i);
  assert.equal(glucoseStats(xs.slice(0, 5), NOW - 86400_000, NOW, t), null);
  assert.equal(glucoseDaily(xs, 2, t, '2026-10-18').length, 2);
});

test('blood pressure: no judgement without the clinician’s targets; above targets and 180/120 handled', () => {
  const r = (daysAgo: number, sys: number, dia: number): BpReading => ({ t: NOW - daysAgo * 86400_000, sys, dia, origin: 'withings', path: 'withings' });
  const xs = [0, 1, 1, 2, 3, 4, 5].map((d) => r(d, 136, 86));
  assert.match(words(bpInsights(xs, EMPTY.targets, NOW)), /Ask your clinician/);
  const t = { ...EMPTY.targets, bpSys: 130, bpDia: 80 };
  assert.match(words(bpInsights(xs, t, NOW)), /above target/);
  assert.equal(bpSummary(xs, t, NOW).aboveCount, 7);
  assert.match(words(bpInsights(xs.map((x) => ({ ...x, sys: 122, dia: 76 })), t, NOW)), /within the targets/);
  const crisis = bpInsights([r(0, 184, 112), ...xs], t, NOW);
  assert.equal(crisis[0].tone, 'danger');
  assert.match(crisis[0].text, /911/);
});

test('body trend, cycle estimates and heart rhythm records', () => {
  const days: Record<string, object> = {};
  lastDays(30, END).forEach((d, i) => (days[d] = { weightKg: 82 - i * 0.05 }));
  const b = bodyTrend(slice(days), 'weightKg', 30, END);
  assert.ok(b.change! < -1 && b.change! > -1.6, String(b.change));
  const entry = (date: string) => ({ date, flow: 'medium' as const, origin: 'apple' as const, path: 'healthkit' as const });
  const cyc = ['2026-08-20', '2026-08-21', '2026-08-22', '2026-09-18', '2026-09-19', '2026-10-17', '2026-10-18'].map(entry);
  assert.equal(periods(cyc).length, 3);
  const cs = cycleState(cyc, END)!;
  assert.equal(cs.day, 2);
  assert.equal(cs.phase, 'period');
  assert.equal(cs.avgLen, 29);
  const odd = ['2026-06-01', '2026-06-20', '2026-08-10', '2026-08-30'].map(entry);
  assert.match(words(cycleInsights(cycleState(odd, '2026-09-05'), slice({}), '2026-09-05')), /clinician/);
  const ecg = [{ id: 'e1', t: NOW - 86400_000, classification: 'afib' as const, origin: 'apple' as const, path: 'healthkit' as const }];
  const w = words(rhythmInsights(ecg, [], NOW));
  assert.match(w, /does not interpret/);
  assert.match(w, /clinician/);
  assert.equal(rhythmHistory(ecg, [{ id: 'r', t: NOW, kind: 'irregular', origin: 'apple', path: 'healthkit' }])[0].title, 'Irregular rhythm notification');
  assert.match(words(rhythmInsights([{ ...ecg[0], classification: 'sinus' }], [], NOW)), /sinus rhythm/);
});

test('demo: every Monitor card has data, and the words never diagnose', () => {
  const d = generateDemo(NOW) as any;
  const cards = availableCards(d.measure, d.monitor);
  for (const k of ['readiness', 'sleep', 'load', 'glucose', 'bp', 'body', 'cycle', 'rhythm', 'voice']) assert.ok(cards.includes(k as never), k);
  const ev = d.measure.events;
  const all = [
    ...bpInsights(ev.bp, d.monitor.targets, NOW),
    ...glucoseInsights(glucoseStats(ev.glucose, NOW - 14 * 86400_000, NOW, d.monitor.targets), d.monitor.targets),
    ...cycleInsights(cycleState(ev.cycle, END), d.measure, END),
    ...rhythmInsights(ev.ecg, ev.rhythm, NOW),
  ];
  assert.ok(all.length >= 3);
  assert.doesNotMatch(words(all), /you have (a|an)? ?(condition|disease|hypertension|diabetes|afib|atrial)|diagnosis is|\bAI\b|working draft/i);
});

// ---- glucose lined up with meals and workouts
import { glucoseLifeInsights, mealPatterns, mealResponses, mealTime, workoutResponses } from '../src/modules/monitor/model';
import { HOOKUPS, finalStep, searchHookups, stepsFor } from '../src/modules/devices/hookup';
import type { Meal } from '../src/modules/fuel/model';
import type { DeviceWorkout } from '../src/modules/devices/schema';

test('glucose with meals: before, peak, rise and the two-hour reading; movement after a meal is noticed', () => {
  const meals: Meal[] = [];
  const g: GlucoseReading[] = [];
  const workouts: DeviceWorkout[] = [];
  const days = lastDays(8, '2026-06-20');
  days.forEach((d, i) => {
    const m: Meal = { id: `m${i}`, date: d, time: '19:00', kind: 'dinner', tags: i % 2 ? ['protein', 'plants'] : [] };
    meals.push(m);
    const t0 = mealTime(m);
    const walked = i % 2 === 1;
    if (walked) workouts.push({ id: `w${i}`, origin: 'apple', path: 'healthkit', start: t0 + 20 * 60_000, end: t0 + 35 * 60_000, type: 'walk', label: 'Walk' });
    const top = walked ? 25 : 60;
    for (let min = -30; min <= 150; min += 15) {
      const bump = min <= 0 ? 0 : min <= 45 ? (top * min) / 45 : Math.max(0, top * (1 - (min - 45) / 90));
      g.push({ t: t0 + min * 60_000, mgdl: Math.round(90 + bump), origin: 'dexcom', path: 'healthkit' });
    }
  });
  const now = mealTime(meals[7]) + 4 * 3600_000;
  const rs = mealResponses(g, meals, workouts, now);
  assert.equal(rs.length, 8);
  const still = rs.find((r) => r.id === 'm0')!;
  assert.equal(still.before, 90);
  assert.equal(still.peak, 150);
  assert.equal(still.rise, 60);
  assert.equal(still.minutesToPeak, 45);
  assert.equal(still.at2h, 100);
  assert.equal(still.movedAfter, false);
  assert.equal(rs.find((r) => r.id === 'm1')!.movedAfter, true);
  const p = mealPatterns(rs);
  assert.deepEqual(p.moved!.map((x) => x.rise), [25, 60]);
  assert.equal(p.byKind[0].label, 'Dinner');
  const ws = workoutResponses(g, workouts, now);
  assert.equal(ws.length, 4);
  assert.ok(ws[0].after !== null && ws[0].lowest >= 90);
  const said = glucoseLifeInsights(rs, ws).map((i) => i.text).join(' ');
  assert.match(said, /walk or workout/);
  assert.match(said, /Meals with protein/);
  assert.doesNotMatch(said, /diagnos|insulin dose|you should take/i);
  // a meal too recent to have two hours of readings, or with no sensor data, is left out
  assert.equal(mealResponses(g, meals, workouts, mealTime(meals[7]) + 30 * 60_000).length, 7);
  assert.equal(mealResponses([], meals).length, 0);
});

test('device hookup guide: every brand has steps for a phone or says plainly why not', () => {
  assert.equal(new Set(HOOKUPS.map((h) => h.id)).size, HOOKUPS.length);
  for (const h of HOOKUPS) {
    assert.ok(h.ios.length || h.android.length, h.id);
    assert.ok(h.brings.length > 5, h.id);
    if (!h.ios.length || !h.android.length) assert.ok(h.note || h.id === 'apple-watch' || h.id === 'lingo', `${h.id} needs a note`);
  }
  const fitbit = HOOKUPS.find((h) => h.id === 'fitbit')!;
  assert.equal(stepsFor(fitbit, 'ios').length, 0);
  assert.equal(finalStep(fitbit, 'ios'), null);
  assert.match(fitbit.note!, /does not share with Apple Health/);
  assert.match(finalStep(HOOKUPS.find((h) => h.id === 'oura')!, 'ios')!, /Apple Health/);
  assert.deepEqual(searchHookups('stelo').map((h) => h.id), ['stelo']);
  assert.ok(searchHookups('glucose').length >= 3);
  for (const id of ['dexcom', 'stelo', 'libre', 'lingo', 'meter']) assert.equal(HOOKUPS.find((h) => h.id === id)!.group, 'glucose');
});
