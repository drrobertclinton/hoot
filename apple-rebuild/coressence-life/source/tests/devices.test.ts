/// <reference types="node" />
// Wearables: the shared data model, merge and de-duplication rules, Apple Health / Health Connect normalizing,
// heart rate zones, the Bluetooth heart rate parser, connection status, and the demo's multi-device profile.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { brandOf, mergeBatches, dedupeWorkouts, overlapShare } from '../src/modules/devices/merge';
import type { Batch, DeviceWorkout } from '../src/modules/devices/schema';
import { platformToBatches, nightsFrom, tempDeviation, pct } from '../src/modules/measure/providers/normalize';
import { maxHrFor, sessionLoad, zoneOf, zonesFrom } from '../src/modules/devices/zones';
import { base64ToBytes, parseHeartRate, simulatedBpm } from '../src/modules/move/hr/gatt';
import { statusOf, suppliedBy } from '../src/modules/devices/model';
import { CONNECTIONS, connectionInfo } from '../src/modules/devices/catalog';
import { AGGREGATORS } from '../src/modules/devices/aggregator';
import { generateDemo } from '../src/demo/generate';

const T0 = new Date(2026, 9, 18, 0, 0).getTime();
const H = 3600_000;
const batch = (p: Partial<Batch> & Pick<Batch, 'path' | 'origin'>): Batch => ({ fetchedAt: 0, days: {}, events: {}, ...p });

test('brands are recognised from Apple Health bundle ids and Health Connect package names', () => {
  assert.equal(brandOf('com.ouraring.oura Oura'), 'oura');
  assert.equal(brandOf('com.garmin.android.apps.connectmobile'), 'garmin');
  assert.equal(brandOf('com.sec.android.app.shealth'), 'samsung');
  assert.equal(brandOf('com.apple.health.8F2C Robert’s Apple Watch'), 'apple');
  assert.equal(brandOf('com.withings.wiscale2'), 'withings');
  assert.equal(brandOf('com.dexcom.stelo'), 'dexcom');
  assert.equal(brandOf('com.whoop.android'), 'whoop');
  assert.equal(brandOf('com.google.android.apps.fitness'), 'google');
  assert.equal(brandOf('fi.polar.polarflow'), 'polar');
  assert.equal(brandOf(''), 'other');
  assert.equal(brandOf('com.example.unknown'), 'other');
});

test('merge prefers the direct API over the Apple Health copy of the same metric, by brand priority, and manual wins', () => {
  const d = '2026-10-18';
  const m = mergeBatches(
    [
      batch({ path: 'healthkit', origin: 'oura', days: { [d]: { sleepH: 7.0, restingHr: 59, tempDev: 0.2 } } }),
      batch({ path: 'oura', origin: 'oura', days: { [d]: { sleepH: 7.4, restingHr: 57 } } }),
      batch({ path: 'healthkit', origin: 'apple', days: { [d]: { sleepH: 6.8, steps: 9000, restingHr: 58 } } }),
      batch({ path: 'garmin', origin: 'garmin', days: { [d]: { steps: 9400, vo2max: 44 } } }),
      batch({ path: 'healthkit', origin: 'apple', days: { '2026-10-17': { weightKg: 80 } } }),
    ],
    { [d]: { restingHr: 55 } },
  );
  assert.equal(m.days[d].sleepH, 7.4); // Oura API, not Oura's Apple Health copy or Apple Watch
  assert.equal(m.provenance[d].sleepH, 'oura');
  assert.equal(m.days[d].tempDev, 0.2); // only the copy had it, so the copy is used
  assert.equal(m.days[d].steps, 9000); // Apple first for steps; never summed with Garmin
  assert.equal(m.days[d].vo2max, 44);
  assert.equal(m.days[d].restingHr, 55); // hand-entered wins
  assert.equal(m.provenance[d].restingHr, 'phone');
  assert.equal(m.days['2026-10-17'].weightKg, 80);
});

test('workouts that overlap are one workout: the copy with heart rate zones wins, then the direct API', () => {
  const w = (id: string, origin: DeviceWorkout['origin'], p: DeviceWorkout['path'], start: number, mins: number, zones?: boolean): DeviceWorkout => ({ id, origin, path: p, start, end: start + mins * 60_000, type: 'run', label: 'Run', ...(zones ? { zones: [1, 2, 3, 4, 5] as DeviceWorkout['zones'], avgHr: 150 } : {}) });
  assert.ok(overlapShare({ start: 0, end: 100 }, { start: 40, end: 140 }) === 0.6);
  const kept = dedupeWorkouts([w('copy', 'garmin', 'healthkit', T0 + 60_000, 40), w('direct', 'garmin', 'garmin', T0, 41, true), w('walk', 'apple', 'healthkit', T0 + 5 * H, 30)], new Map([['garmin', {}]]));
  assert.deepEqual(kept.map((k) => k.id).sort(), ['direct', 'walk']);
  const m = mergeBatches([
    batch({ path: 'dexcom', origin: 'dexcom', events: { glucose: [{ t: T0, mgdl: 100, origin: 'dexcom', path: 'dexcom' }] } }),
    batch({ path: 'healthkit', origin: 'dexcom', events: { glucose: [{ t: T0 + 60_000, mgdl: 101, origin: 'dexcom', path: 'healthkit' }, { t: T0 + 15 * 60_000, mgdl: 110, origin: 'dexcom', path: 'healthkit' }] } }),
    batch({ path: 'withings', origin: 'withings', events: { bp: [{ t: T0, sys: 124, dia: 80, origin: 'withings', path: 'withings' }] } }),
    batch({ path: 'healthkit', origin: 'withings', events: { bp: [{ t: T0 + 90_000, sys: 124, dia: 80, origin: 'withings', path: 'healthkit' }] } }),
  ]);
  assert.deepEqual(m.events.glucose.map((g) => g.mgdl), [100, 110]);
  assert.equal(m.events.bp.length, 1);
  assert.equal(m.events.bp[0].path, 'withings');
});

test('Apple Health samples split by brand: stages, temperature baseline, percent units, HRV kinds, blood pressure, zones', () => {
  const bed = T0 - 1 * H; // 23:00
  const sleep = [
    { start: bed, end: bed + 1.5 * H, stage: 'core' as const, origin: 'com.ouraring.oura' },
    { start: bed + 1.5 * H, end: bed + 2.5 * H, stage: 'deep' as const, origin: 'com.ouraring.oura' },
    { start: bed + 2.5 * H, end: bed + 2.75 * H, stage: 'awake' as const, origin: 'com.ouraring.oura' },
    { start: bed + 2.75 * H, end: bed + 4.25 * H, stage: 'rem' as const, origin: 'com.ouraring.oura' },
    { start: bed + 4.25 * H, end: bed + 8 * H, stage: 'core' as const, origin: 'com.ouraring.oura' },
    { start: bed, end: bed + 8 * H, stage: 'inBed' as const, origin: 'com.apple.health.watch' },
    { start: bed + 0.5 * H, end: bed + 7.5 * H, stage: 'asleep' as const, origin: 'com.apple.health.watch' },
  ];
  const temps = Array.from({ length: 10 }, (_, i) => ({ start: T0 - i * 24 * H, value: i === 0 ? 36.6 : 36.2, origin: 'com.apple.health.watch' }));
  const hr = Array.from({ length: 360 }, (_, i) => ({ start: T0 + 17 * H + i * 5000, value: 160, origin: 'com.apple.health.watch' }));
  const out = platformToBatches(
    {
      path: 'healthkit',
      points: {
        spo2: [{ start: T0 + 2 * H, value: 0.97, origin: 'com.ouraring.oura' }],
        hrvSdnn: [{ start: T0 + 3 * H, value: 48, origin: 'com.apple.health.watch' }],
        hrvRmssd: [{ start: T0 + 3 * H, value: 61, origin: 'com.ouraring.oura' }],
        tempAbs: temps,
        heartRate: hr,
      },
      sleep,
      bp: [{ t: T0 + 7 * H, sys: 128, dia: 82, origin: 'com.withings.wiscale2' }],
      workouts: [{ id: 'w1', start: T0 + 17 * H, end: T0 + 17.5 * H, type: 'run', label: 'Run', origin: 'com.apple.health.watch' }],
      ecg: [{ id: 'e1', t: T0, classification: 'sinusRhythm', avgHr: 66, origin: 'com.apple.health.watch' }],
      stepsDaily: [{ date: '2026-10-18', value: 8123.4 }],
    },
    { maxHr: 185, now: 0 },
  );
  const by = (o: string) => out.find((b) => b.origin === o)!;
  const d = '2026-10-18';
  assert.equal(by('oura').days[d].sleepH, 7.8);
  assert.equal(by('oura').days[d].sleepDeepH, 1);
  assert.equal(by('oura').days[d].sleepAwakeH, 0.25);
  assert.equal(by('oura').days[d].bedMin, -60);
  assert.equal(by('oura').days[d].spo2, 97);
  assert.equal(by('oura').days[d].hrv, 61); // RMSSD shown when present
  assert.equal(by('apple').days[d].hrv, 48); // SDNN otherwise
  assert.equal(by('apple').days[d].sleepH, 7); // "asleep" only counts as light sleep; "in bed" is ignored
  assert.equal(by('apple').days[d].steps, 8123);
  assert.equal(by('apple').days[d].tempDev, 0.36); // vs the 10-night average of 36.24
  assert.equal(by('withings').days[d].systolic, 128);
  assert.equal(by('oura').events.nights!.length, 1);
  const w = by('apple').events.workouts![0];
  assert.equal(w.avgHr, 160);
  assert.ok(w.zones![3] > 25, String(w.zones)); // 160 / 185 = 86% -> zone 4
  assert.equal(by('apple').events.ecg![0].classification, 'sinus');
  assert.equal(pct(0.97), 97);
  assert.equal(pct(97), 97);
  assert.deepEqual(tempDeviation(temps.slice(0, 3)), []); // needs a week to set a baseline
  assert.equal(nightsFrom([{ start: T0, end: T0 + 20 * 60_000, stage: 'core', origin: 'x' }], 'other', 'healthkit').nights.length, 0); // short naps are not a night
});

test('heart rate zones and session load', () => {
  assert.equal(maxHrFor({}), 185);
  assert.equal(maxHrFor({ age: 56 }), 169);
  assert.equal(maxHrFor({ own: 178, age: 56 }), 178);
  assert.equal(zoneOf(90, 185), 0);
  assert.equal(zoneOf(100, 185), 1);
  assert.equal(zoneOf(170, 185), 5);
  const s = Array.from({ length: 121 }, (_, i) => ({ t: i * 5000, bpm: i < 60 ? 120 : 150 }));
  const z = zonesFrom(s, 0, 600_000, 185);
  assert.equal(z.zones.reduce((a, b) => a + b, 0), 10);
  assert.equal(z.zones[1], 5); // 120 = 65% -> zone 2
  assert.equal(z.zones[3], 5); // 150 = 81% -> zone 4
  assert.equal(z.maxHr, 150);
  assert.equal(sessionLoad({ zones: [10, 0, 0, 0, 2] }), 20);
  assert.equal(sessionLoad({ minutes: 30, effort: 6 }), 90);
  assert.equal(zonesFrom([], 0, 1, 185).avgHr, null);
});

test('Bluetooth Heart Rate Measurement (0x2A37) parsing', () => {
  assert.deepEqual(parseHeartRate(Uint8Array.from([0x00, 72]), 1), { t: 1, bpm: 72, rr: [], contact: null });
  // 16-bit heart rate, contact detected, two RR intervals (1024 and 512 units = 1000 ms and 500 ms)
  const r = parseHeartRate(Uint8Array.from([0x01 | 0x06 | 0x10, 0x2c, 0x01, 0x00, 0x04, 0x00, 0x02]), 2)!;
  assert.equal(r.bpm, 300);
  assert.equal(r.contact, true);
  assert.deepEqual(r.rr, [1000, 500]);
  assert.equal(parseHeartRate(Uint8Array.from([0x08, 80, 0x10, 0x00]), 3)!.energyKj, 16);
  assert.equal(parseHeartRate(Uint8Array.from([0x00])), null);
  assert.deepEqual([...base64ToBytes('EEgEBA==')], [0x10, 0x48, 0x04, 0x04]);
  assert.equal(parseHeartRate(base64ToBytes('AEg='))!.bpm, 72);
  for (let t = 0; t < 3600; t += 60) {
    const b = simulatedBpm(t);
    assert.ok(b > 60 && b < 190, String(b));
  }
});

test('connection status explains what each brand is waiting for', () => {
  const ctx = { platform: 'ios' as const, serviceReady: false, measureSource: 'none' as const, demo: false };
  assert.equal(statusOf(connectionInfo('healthkit'), { conns: {} }, ctx).status, 'not_connected');
  assert.equal(statusOf(connectionInfo('healthkit'), { conns: {} }, { ...ctx, measureSource: 'healthkit' }).status, 'connected');
  assert.equal(statusOf(connectionInfo('healthconnect'), { conns: {} }, ctx).label, 'On Android');
  assert.equal(statusOf(connectionInfo('oura'), { conns: {} }, ctx).status, 'waiting_service');
  assert.equal(statusOf(connectionInfo('garmin'), { conns: {} }, { ...ctx, serviceReady: true }).status, 'waiting_approval');
  assert.equal(statusOf(connectionInfo('garmin'), { conns: {}, vendors: { garmin: { configured: true, approved: true } } }, { ...ctx, serviceReady: true }).status, 'not_connected');
  assert.equal(statusOf(connectionInfo('whoop'), { conns: { whoop: { connected: true } } }, ctx).status, 'connected');
  assert.equal(statusOf(connectionInfo('ble'), { conns: {} }, ctx).status, 'ready');
  // Every direct connection that needs vendor approval says so, with a program link for Robert.
  for (const id of ['oura', 'whoop', 'garmin', 'fitbit', 'withings', 'dexcom', 'samsung'] as const) assert.ok(connectionInfo(id).approval && connectionInfo(id).programUrl, id);
  assert.ok(connectionInfo('oura').membership && connectionInfo('whoop').membership);
  assert.equal(new Set(CONNECTIONS.map((c) => c.id)).size, CONNECTIONS.length);
  assert.deepEqual(suppliedBy({ d1: { sleepH: 'oura', steps: 'apple' }, d2: { hrv: 'oura' } }, 'oura').sort(), ['hrv', 'sleepH']);
  assert.equal(AGGREGATORS.length, 3);
  for (const a of AGGREGATORS) assert.match(a.source, /^https:\/\//);
});

test('the shared schema in services/connect is an exact copy of the app’s', () => {
  const root = path.join(__dirname, '..');
  const app = fs.readFileSync(path.join(root, 'src/modules/devices/schema.ts'), 'utf8');
  const svc = fs.readFileSync(path.join(root, 'services/connect/src/schema.ts'), 'utf8');
  assert.equal(svc, app);
});

test('demo profile: multi-device data reaches every new screen, merged by the real rules', () => {
  const now = new Date(2026, 9, 18, 10, 30).getTime();
  const d = generateDemo(now) as any;
  const today = '2026-10-18';
  const m = d.measure;
  assert.equal(m.source, 'healthkit');
  assert.equal(m.provenance[today].sleepH, 'oura');
  assert.equal(m.provenance[today].steps, 'apple');
  assert.equal(m.provenance[today].weightKg, 'withings');
  assert.equal(m.provenance[today].vendorRecovery, 'whoop');
  assert.equal(m.provenance[today].glucoseAvg, 'dexcom');
  assert.ok(m.events.glucose.length > 1000);
  assert.ok(m.events.bp.length > 40);
  assert.ok(m.events.ecg.length >= 3);
  assert.ok(m.events.nights.length >= 10);
  assert.ok(m.events.cycle.length >= 10);
  // Garmin's Apple Health copies of its runs are dropped in favor of the Garmin API versions with zones.
  assert.ok(m.events.workouts.every((w: DeviceWorkout) => !(w.origin === 'garmin' && w.path === 'healthkit')));
  assert.ok(m.events.workouts.filter((w: DeviceWorkout) => w.origin === 'garmin').every((w: DeviceWorkout) => w.zones));
  for (const id of ['oura', 'whoop', 'garmin', 'withings', 'dexcom']) assert.equal(d.devices.conns[id].connected, true, id);
  assert.equal(d.monitor.targets.bpSys, 130);
});
