// Apple Health (HealthKit) through @kingstinct/react-native-healthkit. iOS only; needs a development or store build.
// Read-only: Coressence never writes to Apple Health. Every sample keeps its source (Apple Watch, Oura, Garmin…),
// so normalize.ts can split it by brand and merge.ts can prefer a direct connection over the Apple Health copy.
import * as HK from '@kingstinct/react-native-healthkit';
import type { DayMetrics } from '../model';
import { mergeBatches } from '../../devices/merge';
import { platformToBatches, type PointKind, type RawPlatform, type RawPoint, type RawSleep, type RawWorkout } from './normalize';
import type { HealthProvider } from './types';

type QId = Parameters<typeof HK.queryQuantitySamples>[0];
type CId = Parameters<typeof HK.queryCategorySamples>[0];

/** Quantity types read, with the unit asked for and where each goes. */
const QUANTITIES: [QId, string, PointKind][] = [
  ['HKQuantityTypeIdentifierDistanceWalkingRunning', 'km', 'distanceKm'],
  ['HKQuantityTypeIdentifierActiveEnergyBurned', 'kcal', 'activeKcal'],
  ['HKQuantityTypeIdentifierBasalEnergyBurned', 'kcal', 'basalKcal'],
  ['HKQuantityTypeIdentifierAppleExerciseTime', 'min', 'exerciseMin'],
  ['HKQuantityTypeIdentifierRestingHeartRate', 'count/min', 'restingHr'],
  ['HKQuantityTypeIdentifierWalkingHeartRateAverage', 'count/min', 'walkingHr'],
  ['HKQuantityTypeIdentifierHeartRateVariabilitySDNN', 'ms', 'hrvSdnn'],
  ['HKQuantityTypeIdentifierRespiratoryRate', 'count/min', 'respRate'],
  ['HKQuantityTypeIdentifierOxygenSaturation', '%', 'spo2'],
  ['HKQuantityTypeIdentifierAppleSleepingWristTemperature', 'degC', 'tempAbs'],
  ['HKQuantityTypeIdentifierVO2Max', 'ml/(kg*min)', 'vo2max'],
  ['HKQuantityTypeIdentifierBodyMass', 'kg', 'weightKg'],
  ['HKQuantityTypeIdentifierBodyFatPercentage', '%', 'bodyFatPct'],
  ['HKQuantityTypeIdentifierLeanBodyMass', 'kg', 'leanKg'],
  ['HKQuantityTypeIdentifierBloodGlucose', 'mg/dL', 'glucose'],
  ['HKQuantityTypeIdentifierEnvironmentalAudioExposure', 'dBASPL', 'audioEnvDb'],
  ['HKQuantityTypeIdentifierHeadphoneAudioExposure', 'dBASPL', 'audioPhonesDb'],
  ['HKQuantityTypeIdentifierHeartRateRecoveryOneMinute', 'count/min', 'cardioRecovery'],
  ['HKQuantityTypeIdentifierHeartRate', 'count/min', 'heartRate'],
];
const CATEGORIES: CId[] = [
  'HKCategoryTypeIdentifierSleepAnalysis',
  'HKCategoryTypeIdentifierMindfulSession',
  'HKCategoryTypeIdentifierMenstrualFlow',
  'HKCategoryTypeIdentifierIrregularHeartRhythmEvent',
  'HKCategoryTypeIdentifierHighHeartRateEvent',
  'HKCategoryTypeIdentifierLowHeartRateEvent',
];
const READ = [
  'HKQuantityTypeIdentifierStepCount',
  'HKQuantityTypeIdentifierBloodPressureSystolic',
  'HKQuantityTypeIdentifierBloodPressureDiastolic',
  ...QUANTITIES.map((q) => q[0]),
  ...CATEGORIES,
  'HKWorkoutTypeIdentifier',
  'HKElectrocardiogramType',
] as const;

const origin = (x: { sourceRevision?: { source?: { bundleIdentifier?: string; name?: string } } }) => {
  const s = x.sourceRevision?.source;
  return `${s?.bundleIdentifier || ''} ${s?.name || ''}`.trim();
};
const ms = (d: Date | string | number) => new Date(d).getTime();
const safe = async <T>(p: () => Promise<T>, fallback: T): Promise<T> => {
  try {
    return await p();
  } catch {
    return fallback;
  }
};

// HKWorkoutActivityType raw values (Apple's enum).
const WORKOUT_TYPES: Record<number, [RawWorkout['type'], string]> = {
  37: ['run', 'Run'],
  52: ['walk', 'Walk'],
  24: ['walk', 'Hike'],
  13: ['cycle', 'Ride'],
  46: ['swim', 'Swim'],
  57: ['yoga', 'Yoga'],
  66: ['pilates', 'Pilates'],
  62: ['stretch', 'Flexibility'],
  50: ['strength', 'Strength'],
  20: ['strength', 'Functional strength'],
  59: ['strength', 'Core training'],
  63: ['cardio', 'Interval training'],
  16: ['cardio', 'Elliptical'],
  35: ['cardio', 'Rowing'],
  73: ['cardio', 'Mixed cardio'],
};

async function raw(days: number): Promise<RawPlatform> {
  const startDate = new Date();
  startDate.setHours(0, 0, 0, 0);
  startDate.setDate(startDate.getDate() - days + 1);
  const endDate = new Date();
  const filter = { date: { startDate, endDate } };
  const points: RawPlatform['points'] = {};

  for (const [id, unit, kind] of QUANTITIES) {
    const xs = await safe(() => HK.queryQuantitySamples(id, { limit: 0, filter, unit: unit as never }), [] as readonly any[]);
    points[kind] = xs.map((x: any): RawPoint => ({ start: ms(x.startDate), end: ms(x.endDate), value: Number(x.quantity), origin: origin(x) }));
  }
  // Apple Health stores HRV as SDNN only; RMSSD arrives through the direct brand connections.
  points.hrvRmssd = [];

  // Steps: Apple Health's own daily totals, which already remove the overlap between iPhone and Watch.
  const stepStats = await safe(() => HK.queryStatisticsCollectionForQuantity('HKQuantityTypeIdentifierStepCount', ['cumulativeSum'], startDate, { day: 1 }, { filter, unit: 'count' as never }), [] as readonly any[]);
  const stepsDaily = stepStats.filter((s: any) => s.startDate && s.sumQuantity).map((s: any) => {
    const d = new Date(s.startDate);
    return { date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`, value: Number(s.sumQuantity.quantity) };
  });

  const cat = async (id: CId) => (await safe(() => HK.queryCategorySamples(id, { limit: 0, filter }), [] as any[])) as any[];
  const sleepStage: Record<number, RawSleep['stage']> = { 0: 'inBed', 1: 'asleep', 2: 'awake', 3: 'core', 4: 'deep', 5: 'rem' };
  const sleep = (await cat('HKCategoryTypeIdentifierSleepAnalysis')).map((x): RawSleep => ({ start: ms(x.startDate), end: ms(x.endDate), stage: sleepStage[Number(x.value)] ?? 'asleep', origin: origin(x) }));
  points.mindfulMin = (await cat('HKCategoryTypeIdentifierMindfulSession')).map((x) => ({ start: ms(x.startDate), value: (ms(x.endDate) - ms(x.startDate)) / 60_000, origin: origin(x) }));
  const flowName: Record<number, 'unspecified' | 'light' | 'medium' | 'heavy' | 'none'> = { 1: 'unspecified', 2: 'light', 3: 'medium', 4: 'heavy', 5: 'none' };
  const flow = (await cat('HKCategoryTypeIdentifierMenstrualFlow')).map((x) => ({ t: ms(x.startDate), flow: flowName[Number(x.value)] ?? 'unspecified', origin: origin(x) }));
  const rhythm = [
    ...(await cat('HKCategoryTypeIdentifierIrregularHeartRhythmEvent')).map((x) => ({ id: x.uuid, t: ms(x.startDate), kind: 'irregular' as const, origin: origin(x) })),
    ...(await cat('HKCategoryTypeIdentifierHighHeartRateEvent')).map((x) => ({ id: x.uuid, t: ms(x.startDate), kind: 'high' as const, origin: origin(x) })),
    ...(await cat('HKCategoryTypeIdentifierLowHeartRateEvent')).map((x) => ({ id: x.uuid, t: ms(x.startDate), kind: 'low' as const, origin: origin(x) })),
  ];

  // Blood pressure: systolic and diastolic samples saved together share a start time.
  const q = async (id: string) => (await safe(() => HK.queryQuantitySamples(id as QId, { limit: 0, filter, unit: 'mmHg' as never }), [] as readonly any[])) as any[];
  const sys = await q('HKQuantityTypeIdentifierBloodPressureSystolic');
  const dia = await q('HKQuantityTypeIdentifierBloodPressureDiastolic');
  const bp = sys
    .map((s) => {
      const d = dia.find((x) => Math.abs(ms(x.startDate) - ms(s.startDate)) < 60_000);
      return d ? { t: ms(s.startDate), sys: Number(s.quantity), dia: Number(d.quantity), origin: origin(s) } : null;
    })
    .filter((x): x is NonNullable<typeof x> => !!x);

  const ecg = ((await safe(() => HK.queryElectrocardiogramSamples({ limit: 0, filter, includeVoltages: false }), [] as readonly any[])) as any[]).map((x) => ({
    id: x.uuid,
    t: ms(x.startDate),
    classification: String(x.classification),
    avgHr: x.averageHeartRateBpm ? Math.round(x.averageHeartRateBpm) : undefined,
    symptoms: x.symptomsStatus === 'present',
    origin: origin(x),
  }));

  const workouts = ((await safe(() => HK.queryWorkoutSamples({ limit: 0, filter } as never), [] as readonly any[])) as any[]).map((w): RawWorkout => {
    const [type, label] = WORKOUT_TYPES[Number(w.workoutActivityType)] ?? ['other', 'Workout'];
    const kcal = w.totalEnergyBurned?.quantity;
    const dist = w.totalDistance?.quantity;
    return { id: w.uuid, start: ms(w.startDate), end: ms(w.endDate), type, label, kcal: kcal ? Math.round(kcal) : undefined, distanceKm: dist ? Math.round((w.totalDistance.unit === 'm' ? dist / 1000 : dist) * 100) / 100 : undefined, origin: origin(w) };
  });

  return { path: 'healthkit', points, sleep, workouts, bp, ecg, rhythm, flow, stepsDaily };
}

export const healthKitProvider: HealthProvider = {
  id: 'healthkit',
  label: 'Apple Health',
  isAvailable: async () => safe(() => HK.isHealthDataAvailableAsync(), false),
  connect: async () => safe(() => HK.requestAuthorization({ toRead: READ as never, toShare: [] }), false),
  async fetchBatches(days) {
    return platformToBatches(await raw(days), { maxHr: 185 });
  },
  async fetchDaily(days): Promise<Record<string, DayMetrics>> {
    return mergeBatches(await this.fetchBatches(days)).days;
  },
};
