// Measure: objective numbers from connected devices (Apple Health, Health Connect, direct vendor connections,
// a Bluetooth strap) or entered by hand. The shared data model lives in ../devices/schema.ts.
import { lastDays, dayKey } from '@core/dates';
import { mean } from '@core/stats';
import type { Batch, BrandId, DayMetrics, HealthEvents, MetricKey } from '../devices/schema';
import { EMPTY_EVENTS } from '../devices/schema';

export type { DayMetrics, MetricKey };
export type SourceId = 'none' | 'healthkit' | 'healthconnect';

export type MeasureSlice = {
  source: SourceId;
  lastSync: number | null;
  /** Merged and de-duplicated values from every connected source (see devices/merge.ts). */
  synced: Record<string, DayMetrics>;
  /** Entered by hand (wins over synced values for the same day). */
  manual: Record<string, DayMetrics>;
  /** Which brand each synced number came from. */
  provenance?: Record<string, Partial<Record<MetricKey, BrandId>>>;
  /** Workouts, readings and records from devices, de-duplicated. */
  events?: HealthEvents;
  /** The last batch from each path and brand, kept so a merge can be redone when a connection changes. */
  batches?: Batch[];
};

export const KEY = 'measure';
export const EMPTY: MeasureSlice = { source: 'none', lastSync: null, synced: {}, manual: {} };
export const eventsOf = (s: MeasureSlice): HealthEvents => ({ ...EMPTY_EVENTS, ...(s.events || {}) });

type Info = { label: string; unit: string; decimals: number; better?: 'up' | 'down'; note: string; group: 'activity' | 'heart' | 'sleep' | 'body' | 'vitals' | 'mind' | 'vendor' };
export const METRIC_INFO: Record<MetricKey, Info> = {
  steps: { label: 'Steps', unit: '', decimals: 0, better: 'up', group: 'activity', note: 'Daily step count from your phone or watch.' },
  distanceKm: { label: 'Distance', unit: 'km', decimals: 1, better: 'up', group: 'activity', note: 'Walking and running distance your device recorded.' },
  exerciseMin: { label: 'Exercise', unit: 'min', decimals: 0, better: 'up', group: 'activity', note: 'Minutes of brisk activity your device counted.' },
  activeKcal: { label: 'Active energy', unit: 'kcal', decimals: 0, group: 'activity', note: 'Energy burned through movement, as estimated by your device. Estimates vary by device.' },
  basalKcal: { label: 'Resting energy', unit: 'kcal', decimals: 0, group: 'activity', note: 'Energy your body uses at rest, as estimated by your device.' },
  restingHr: { label: 'Resting heart rate', unit: 'bpm', decimals: 0, better: 'down', group: 'heart', note: 'Heart rate at rest. Compare it with your own usual level rather than with other people.' },
  walkingHr: { label: 'Walking heart rate', unit: 'bpm', decimals: 0, better: 'down', group: 'heart', note: 'Average heart rate while walking, as Apple Watch reports it.' },
  hrv: { label: 'Heart rate variability', unit: 'ms', decimals: 0, better: 'up', group: 'heart', note: 'Beat-to-beat variation. It differs a lot between people and devices, so watch your own trend.' },
  hrvSdnn: { label: 'HRV (SDNN)', unit: 'ms', decimals: 0, better: 'up', group: 'heart', note: 'SDNN is what Apple Watch reports. It is not interchangeable with RMSSD.' },
  hrvRmssd: { label: 'HRV (RMSSD)', unit: 'ms', decimals: 0, better: 'up', group: 'heart', note: 'RMSSD is what Oura, WHOOP, Garmin, Polar and Health Connect report.' },
  respRate: { label: 'Breathing rate', unit: '/min', decimals: 1, group: 'vitals', note: 'Breaths per minute during sleep. Your own usual level matters more than the number itself.' },
  spo2: { label: 'Blood oxygen', unit: '%', decimals: 0, group: 'vitals', note: 'Overnight average from a ring or watch sensor, as reported by the device. Wellness readings, not a medical oximeter.' },
  tempDev: { label: 'Temperature change', unit: '°C', decimals: 2, group: 'vitals', note: 'Overnight wrist, finger or skin temperature compared with the device’s own baseline.' },
  vo2max: { label: 'Cardio fitness (VO2 max)', unit: 'mL/kg/min', decimals: 1, better: 'up', group: 'heart', note: 'An estimate from your watch. Useful for your own trend over months.' },
  sleepH: { label: 'Sleep', unit: 'h', decimals: 1, better: 'up', group: 'sleep', note: 'Time asleep as recorded by your device.' },
  sleepDeepH: { label: 'Deep sleep', unit: 'h', decimals: 1, group: 'sleep', note: 'Device estimate of deep sleep. Stage estimates from wearables are approximate.' },
  sleepRemH: { label: 'REM sleep', unit: 'h', decimals: 1, group: 'sleep', note: 'Device estimate of REM sleep.' },
  sleepCoreH: { label: 'Light (core) sleep', unit: 'h', decimals: 1, group: 'sleep', note: 'Device estimate of light sleep (Apple calls it core).' },
  sleepAwakeH: { label: 'Awake in bed', unit: 'h', decimals: 1, better: 'down', group: 'sleep', note: 'Time awake between falling asleep and getting up.' },
  bedMin: { label: 'Bedtime', unit: '', decimals: 0, group: 'sleep', note: 'When sleep started.' },
  wakeMin: { label: 'Wake time', unit: '', decimals: 0, group: 'sleep', note: 'When sleep ended.' },
  weightKg: { label: 'Weight', unit: 'kg', decimals: 1, group: 'body', note: 'Day-to-day changes are mostly water. Look at the weekly trend.' },
  bodyFatPct: { label: 'Body fat', unit: '%', decimals: 1, better: 'down', group: 'body', note: 'Smart scales estimate body fat; the trend is more useful than any one reading.' },
  leanKg: { label: 'Lean mass', unit: 'kg', decimals: 1, better: 'up', group: 'body', note: 'Everything that is not fat, as estimated by a smart scale.' },
  systolic: { label: 'Blood pressure (top)', unit: 'mmHg', decimals: 0, group: 'vitals', note: 'From a cuff, entered by hand or synced from a connected monitor.' },
  diastolic: { label: 'Blood pressure (bottom)', unit: 'mmHg', decimals: 0, group: 'vitals', note: 'From a cuff, entered by hand or synced from a connected monitor.' },
  glucoseAvg: { label: 'Glucose (day average)', unit: 'mg/dL', decimals: 0, group: 'vitals', note: 'Average of the day’s readings from a connected glucose sensor, shown as reported.' },
  mindfulMin: { label: 'Mindful minutes', unit: 'min', decimals: 0, better: 'up', group: 'mind', note: 'Breathing and mindfulness sessions saved to Apple Health or Health Connect.' },
  audioEnvDb: { label: 'Sound around you', unit: 'dBA', decimals: 0, group: 'vitals', note: 'Average environmental sound level measured by Apple Watch.' },
  audioPhonesDb: { label: 'Headphone level', unit: 'dBA', decimals: 0, group: 'vitals', note: 'Average headphone listening level reported by iPhone.' },
  cardioRecovery: { label: 'Cardio recovery', unit: 'bpm', decimals: 0, better: 'up', group: 'heart', note: 'How far heart rate dropped one minute after a workout ended, as Apple Watch reports it.' },
  vendorStrain: { label: 'WHOOP strain', unit: '', decimals: 1, group: 'vendor', note: 'Day strain as WHOOP reports it (0 to 21).' },
  vendorRecovery: { label: 'WHOOP recovery', unit: '%', decimals: 0, group: 'vendor', note: 'Recovery as WHOOP reports it.' },
  vendorReadiness: { label: 'Oura readiness', unit: '', decimals: 0, group: 'vendor', note: 'Readiness as Oura reports it.' },
  vendorLoad: { label: 'Training load', unit: '', decimals: 0, group: 'vendor', note: 'Training load as your watch reports it.' },
};

/** Manual values win over synced values. */
export function dayMetrics(s: MeasureSlice, date: string): DayMetrics {
  return { ...(s.synced[date] || {}), ...(s.manual[date] || {}) };
}

export function metricSeries(s: MeasureSlice, key: MetricKey, days: number, end = dayKey()) {
  return lastDays(days, end).map((d) => ({ date: d, value: dayMetrics(s, d)[key] ?? null }));
}

/** Personal baseline: mean of the 14 days before the given day. */
export function baseline(s: MeasureSlice, key: MetricKey, date = dayKey(), days = 14): number | null {
  return mean(lastDays(days, date).slice(0, -1).map((d) => dayMetrics(s, d)[key] ?? null));
}

export function hasAnyData(s: MeasureSlice) {
  return Object.keys(s.synced).length > 0 || Object.keys(s.manual).length > 0;
}

export const kgToLb = (kg: number) => kg * 2.20462;
export const lbToKg = (lb: number) => lb / 2.20462;
