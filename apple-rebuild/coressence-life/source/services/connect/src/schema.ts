// One data model for every device and service. Apple Health, Health Connect, each vendor's cloud API, a Bluetooth
// chest strap and the optional aggregators all arrive as "batches" in this shape, and merge.ts decides which value
// wins when the same thing is reported twice. No imports: services/connect keeps a byte-for-byte copy of this file
// (tests/devices.test.ts checks the two match).

/** How the data reached Coressence. */
export type PathId =
  | 'manual'
  | 'healthkit'
  | 'healthconnect'
  | 'ble'
  | 'oura'
  | 'whoop'
  | 'garmin'
  | 'fitbit'
  | 'withings'
  | 'polar'
  | 'dexcom'
  | 'samsung'
  | 'terra'
  | 'junction'
  | 'rook';

/** Who measured it (the brand of the device or app that produced the number). */
export type BrandId =
  | 'apple'
  | 'oura'
  | 'whoop'
  | 'garmin'
  | 'fitbit'
  | 'google'
  | 'samsung'
  | 'withings'
  | 'polar'
  | 'dexcom'
  | 'libre'
  | 'omron'
  | 'coros'
  | 'suunto'
  | 'wahoo'
  | 'ultrahuman'
  | 'eightsleep'
  | 'strap'
  | 'phone'
  | 'other';

/** One number per local day (YYYY-MM-DD). Units are fixed so nothing is converted twice. */
export type DayMetrics = {
  steps?: number;
  distanceKm?: number;
  exerciseMin?: number;
  activeKcal?: number;
  basalKcal?: number;
  restingHr?: number;
  walkingHr?: number;
  /** The heart rate variability shown in the app: RMSSD when the source gives it, otherwise SDNN. */
  hrv?: number;
  hrvSdnn?: number;
  hrvRmssd?: number;
  respRate?: number;
  /** Percent. */
  spo2?: number;
  /** Overnight wrist, finger or skin temperature, difference from the device's own baseline, in °C. */
  tempDev?: number;
  /** mL/kg/min, as estimated by the device. */
  vo2max?: number;
  sleepH?: number;
  sleepDeepH?: number;
  sleepRemH?: number;
  sleepCoreH?: number;
  sleepAwakeH?: number;
  /** Minutes from midnight of the wake day (23:30 the night before is -30). */
  bedMin?: number;
  wakeMin?: number;
  weightKg?: number;
  bodyFatPct?: number;
  leanKg?: number;
  systolic?: number;
  diastolic?: number;
  /** mg/dL, average of the day's readings. */
  glucoseAvg?: number;
  mindfulMin?: number;
  /** dBA, average environmental sound level. */
  audioEnvDb?: number;
  /** dBA, average headphone level. */
  audioPhonesDb?: number;
  /** Beats per minute the heart rate dropped one minute after exercise. */
  cardioRecovery?: number;
  /** WHOOP day strain, 0 to 21, as reported. */
  vendorStrain?: number;
  /** WHOOP recovery, 0 to 100, as reported. */
  vendorRecovery?: number;
  /** Oura readiness, 0 to 100, as reported. */
  vendorReadiness?: number;
  /** Garmin, Polar or similar training load for the day, as reported. */
  vendorLoad?: number;
};
export type MetricKey = keyof DayMetrics;

export type HrZones = [number, number, number, number, number];

export type DeviceWorkout = {
  id: string;
  origin: BrandId;
  path: PathId;
  start: number;
  end: number;
  /** Coressence move type when it maps, otherwise 'other'. */
  type: 'pilates' | 'yoga' | 'stretch' | 'strength' | 'walk' | 'cardio' | 'run' | 'cycle' | 'swim' | 'other';
  label: string;
  kcal?: number;
  distanceKm?: number;
  avgHr?: number;
  maxHr?: number;
  /** Minutes in heart rate zones 1 to 5. */
  zones?: HrZones;
  /** Strain or training load the vendor reported for this session. */
  vendorLoad?: number;
};

export type BpReading = { t: number; sys: number; dia: number; pulse?: number; origin: BrandId; path: PathId };
export type GlucoseReading = { t: number; mgdl: number; origin: BrandId; path: PathId };
export type EcgClass = 'sinus' | 'afib' | 'inconclusive' | 'lowHr' | 'highHr' | 'poorReading' | 'notSet';
export type EcgRecord = { id: string; t: number; classification: EcgClass; avgHr?: number; symptoms?: boolean; origin: BrandId; path: PathId };
export type RhythmEvent = { id: string; t: number; kind: 'irregular' | 'high' | 'low'; origin: BrandId; path: PathId };
export type CycleEntry = { date: string; flow: 'none' | 'light' | 'medium' | 'heavy' | 'unspecified'; origin: BrandId; path: PathId };
export type SleepStage = 'awake' | 'rem' | 'core' | 'deep';
export type NightStages = { date: string; start: number; end: number; segments: { s: number; e: number; stage: SleepStage }[]; origin: BrandId; path: PathId };

export type HealthEvents = {
  workouts: DeviceWorkout[];
  bp: BpReading[];
  glucose: GlucoseReading[];
  ecg: EcgRecord[];
  rhythm: RhythmEvent[];
  cycle: CycleEntry[];
  nights: NightStages[];
};
export const EMPTY_EVENTS: HealthEvents = { workouts: [], bp: [], glucose: [], ecg: [], rhythm: [], cycle: [], nights: [] };

/** Everything one path delivered for one brand. */
export type Batch = {
  path: PathId;
  origin: BrandId;
  fetchedAt: number;
  days: Record<string, DayMetrics>;
  events: Partial<HealthEvents>;
};
