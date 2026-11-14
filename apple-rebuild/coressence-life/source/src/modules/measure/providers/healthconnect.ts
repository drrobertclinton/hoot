// Android Health Connect through react-native-health-connect. Needs a development or store build. Read-only.
// Each record carries metadata.dataOrigin (the package that wrote it: Samsung Health, Fitbit, Garmin Connect,
// Oura…), which normalize.ts uses to split the data by brand.
import { getSdkStatus, initialize, readRecords, requestPermission, SdkAvailabilityStatus } from 'react-native-health-connect';
import type { DayMetrics } from '../model';
import { mergeBatches } from '../../devices/merge';
import { platformToBatches, type RawPlatform, type RawPoint, type RawSleep, type RawWorkout } from './normalize';
import type { HealthProvider } from './types';

export const HC_TYPES = [
  'Steps', 'Distance', 'ActiveCaloriesBurned', 'BasalMetabolicRate', 'ExerciseSession', 'HeartRate',
  'RestingHeartRate', 'HeartRateVariabilityRmssd', 'RespiratoryRate', 'OxygenSaturation', 'SkinTemperature', 'Vo2Max',
  'SleepSession', 'Weight', 'BodyFat', 'LeanBodyMass', 'BloodPressure', 'BloodGlucose', 'MenstruationFlow', 'MenstruationPeriod', 'MindfulnessSession',
] as const;
type HcType = (typeof HC_TYPES)[number];

async function read(type: HcType, startTime: string, endTime: string): Promise<any[]> {
  try {
    const out: any[] = [];
    let pageToken: string | undefined;
    do {
      const r: any = await readRecords(type as any, { timeRangeFilter: { operator: 'between', startTime, endTime }, pageToken } as any);
      out.push(...(r.records || []));
      pageToken = r.pageToken || undefined;
    } while (pageToken && out.length < 50000);
    return out;
  } catch {
    return [];
  }
}

const ms = (s: string) => Date.parse(s);
const org = (x: any) => String(x?.metadata?.dataOrigin || '');
// ExerciseSessionRecord exercise types (Health Connect constants).
const EXERCISE: Record<number, [RawWorkout['type'], string]> = {
  56: ['run', 'Run'],
  79: ['walk', 'Walk'],
  37: ['walk', 'Hike'],
  8: ['cycle', 'Ride'],
  74: ['swim', 'Swim'],
  83: ['yoga', 'Yoga'],
  48: ['pilates', 'Pilates'],
  71: ['stretch', 'Stretching'],
  70: ['strength', 'Strength'],
  81: ['strength', 'Weightlifting'],
  36: ['cardio', 'Interval training'],
};
// SleepStageType: 1 awake, 2 sleeping, 3 out of bed, 4 light, 5 deep, 6 REM.
const STAGE: Record<number, RawSleep['stage']> = { 0: 'asleep', 1: 'awake', 2: 'asleep', 3: 'awake', 4: 'core', 5: 'deep', 6: 'rem', 7: 'awake' };

async function raw(days: number): Promise<RawPlatform> {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - days + 1);
  const a = start.toISOString();
  const b = new Date().toISOString();
  const r = async (t: HcType) => read(t, a, b);
  const pt = (xs: any[], v: (x: any) => number, t: (x: any) => string = (x) => x.time ?? x.startTime): RawPoint[] => xs.map((x) => ({ start: ms(t(x)), value: v(x), origin: org(x) })).filter((p) => Number.isFinite(p.value));

  const points: RawPlatform['points'] = {
    steps: pt(await r('Steps'), (x) => x.count),
    distanceKm: pt(await r('Distance'), (x) => x.distance?.inKilometers ?? (x.distance?.inMeters ?? NaN) / 1000),
    activeKcal: pt(await r('ActiveCaloriesBurned'), (x) => x.energy?.inKilocalories ?? NaN),
    basalKcal: pt(await r('BasalMetabolicRate'), (x) => x.basalMetabolicRate?.inKilocaloriesPerDay ?? NaN),
    restingHr: pt(await r('RestingHeartRate'), (x) => x.beatsPerMinute),
    hrvRmssd: pt(await r('HeartRateVariabilityRmssd'), (x) => x.heartRateVariabilityMillis),
    respRate: pt(await r('RespiratoryRate'), (x) => x.rate),
    spo2: pt(await r('OxygenSaturation'), (x) => x.percentage),
    tempDelta: pt(await r('SkinTemperature'), (x) => {
      const ds = (x.deltas || []).map((d: any) => d.delta?.inCelsius).filter((v: unknown) => typeof v === 'number');
      return ds.length ? ds.reduce((s: number, v: number) => s + v, 0) / ds.length : NaN;
    }),
    vo2max: pt(await r('Vo2Max'), (x) => x.vo2MillilitersPerMinuteKilogram),
    weightKg: pt(await r('Weight'), (x) => x.weight?.inKilograms ?? NaN),
    bodyFatPct: pt(await r('BodyFat'), (x) => x.percentage),
    leanKg: pt(await r('LeanBodyMass'), (x) => x.mass?.inKilograms ?? NaN),
    glucose: pt(await r('BloodGlucose'), (x) => x.level?.inMilligramsPerDeciliter ?? NaN),
    mindfulMin: pt(await r('MindfulnessSession'), (x) => (ms(x.endTime) - ms(x.startTime)) / 60_000),
    heartRate: (await r('HeartRate')).flatMap((x) => (x.samples || []).map((s: any) => ({ start: ms(s.time), value: s.beatsPerMinute, origin: org(x) }))),
  };
  const sessions = await r('ExerciseSession');
  points.exerciseMin = pt(sessions, (x) => (ms(x.endTime) - ms(x.startTime)) / 60_000, (x) => x.startTime);

  const sleep: RawSleep[] = (await r('SleepSession')).flatMap((x) =>
    x.stages?.length ? x.stages.map((s: any) => ({ start: ms(s.startTime), end: ms(s.endTime), stage: STAGE[s.stage] ?? 'asleep', origin: org(x) })) : [{ start: ms(x.startTime), end: ms(x.endTime), stage: 'asleep' as const, origin: org(x) }],
  );
  const workouts: RawWorkout[] = sessions.map((x) => {
    const [type, label] = EXERCISE[x.exerciseType] ?? ['other', x.title || 'Workout'];
    return { id: x.metadata?.id || x.startTime, start: ms(x.startTime), end: ms(x.endTime), type, label, origin: org(x) };
  });
  const bp = (await r('BloodPressure')).map((x) => ({ t: ms(x.time), sys: x.systolic?.inMillimetersOfMercury, dia: x.diastolic?.inMillimetersOfMercury, origin: org(x) })).filter((x) => x.sys && x.dia);
  const flowName: Record<number, 'unspecified' | 'light' | 'medium' | 'heavy'> = { 0: 'unspecified', 1: 'light', 2: 'medium', 3: 'heavy' };
  const flow = [
    ...(await r('MenstruationFlow')).map((x) => ({ t: ms(x.time), flow: flowName[x.flow ?? 0] ?? 'unspecified', origin: org(x) })),
    ...(await r('MenstruationPeriod')).flatMap((x) => {
      const out: { t: number; flow: 'unspecified'; origin: string }[] = [];
      for (let t = ms(x.startTime); t < ms(x.endTime); t += 86400_000) out.push({ t, flow: 'unspecified', origin: org(x) });
      return out;
    }),
  ];
  return { path: 'healthconnect', points, sleep, workouts, bp, flow };
}

export const healthConnectProvider: HealthProvider = {
  id: 'healthconnect',
  label: 'Health Connect',
  async isAvailable() {
    try {
      return (await getSdkStatus()) === SdkAvailabilityStatus.SDK_AVAILABLE;
    } catch {
      return false;
    }
  },
  async connect() {
    try {
      if (!(await initialize())) return false;
      const perms: any[] = HC_TYPES.map((recordType) => ({ accessType: 'read', recordType }));
      perms.push({ accessType: 'read', recordType: 'ReadHealthDataHistory' });
      const granted = await requestPermission(perms as any);
      return granted.length > 0;
    } catch {
      return false;
    }
  },
  async fetchBatches(days) {
    return platformToBatches(await raw(days), { maxHr: 185 });
  },
  async fetchDaily(days): Promise<Record<string, DayMetrics>> {
    return mergeBatches(await this.fetchBatches(days)).days;
  },
};
