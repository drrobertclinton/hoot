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
