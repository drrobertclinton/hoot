// Every way a device can connect, with what it provides and what it needs (pure data; shown on Connected devices).
// Program requirements were checked against each vendor's developer pages on 2026-10-23; see "Wearables test plan.md".
import type { BrandId, PathId } from './schema';

export type ConnectionId = 'healthkit' | 'healthconnect' | 'oura' | 'whoop' | 'garmin' | 'fitbit' | 'withings' | 'polar' | 'dexcom' | 'samsung' | 'ble';
export type ConnectionKind = 'platform' | 'cloud' | 'bluetooth';

export type ConnectionInfo = {
  id: ConnectionId;
  name: string;
  kind: ConnectionKind;
  path: PathId;
  brand: BrandId;
  /** Which phones it works on. */
  platforms: ('ios' | 'android' | 'web')[];
  devices: string;
  provides: string[];
  /** Plain note when the vendor must approve Coressence before real users can connect. */
  approval?: string;
  /** Plain note when the person needs a paid membership for the data to flow. */
  membership?: string;
  /** Developer program sign-up page (for Robert, not shown to members). */
  programUrl?: string;
  docsUrl: string;
};

export const CONNECTIONS: ConnectionInfo[] = [
  {
    id: 'healthkit',
    name: 'Apple Health',
    kind: 'platform',
    path: 'healthkit',
    brand: 'apple',
    platforms: ['ios'],
    devices: 'Apple Watch and iPhone, plus anything that writes to Apple Health: Garmin, Oura, WHOOP, Withings, Polar, Fitbit, Dexcom, FreeStyle Libre, Omron, Coros, Suunto, Eight Sleep and more',
    provides: ['Sleep stages', 'HRV (SDNN)', 'Resting and walking heart rate', 'Breathing rate', 'Blood oxygen', 'Wrist temperature', 'VO2 max', 'Steps, distance, energy', 'Workouts with heart rate', 'Weight, body fat, lean mass', 'Blood pressure', 'Glucose', 'Cycle tracking', 'Mindful minutes', 'ECG results and irregular rhythm notifications', 'Sound levels', 'Cardio recovery'],
    docsUrl: 'https://developer.apple.com/documentation/healthkit',
  },
  {
    id: 'healthconnect',
    name: 'Health Connect',
    kind: 'platform',
    path: 'healthconnect',
    brand: 'google',
    platforms: ['android'],
    devices: 'Android phones, Pixel Watch, Fitbit, Samsung Galaxy Watch and Ring, plus Garmin, Oura, WHOOP, Withings, Polar and others that share to Health Connect',
    provides: ['Sleep stages', 'HRV (RMSSD)', 'Resting heart rate', 'Breathing rate', 'Blood oxygen', 'Skin temperature', 'VO2 max', 'Steps, distance, energy', 'Workouts with heart rate', 'Weight, body fat, lean mass', 'Blood pressure', 'Glucose', 'Cycle tracking', 'Mindfulness'],
    approval: 'Google Play reviews the Health Connect declaration before release.',
    docsUrl: 'https://developer.android.com/health-and-fitness/guides/health-connect',
  },
  {
    id: 'oura',
    name: 'Oura',
    kind: 'cloud',
    path: 'oura',
    brand: 'oura',
    platforms: ['ios', 'android', 'web'],
    devices: 'Oura Ring 4 and Gen3',
    provides: ['Sleep stages and timing', 'Readiness score', 'HRV (RMSSD)', 'Resting heart rate', 'Temperature deviation', 'Blood oxygen', 'Breathing rate', 'Activity and workouts'],
    approval: 'Oura limits a new app to about 10 people until Oura approves it.',
    membership: 'Oura Ring 4 and Gen3 owners need an active Oura Membership for their data to reach other apps.',
    programUrl: 'https://developer.ouraring.com/',
    docsUrl: 'https://cloud.ouraring.com/v2/docs',
  },
  {
    id: 'whoop',
    name: 'WHOOP',
    kind: 'cloud',
    path: 'whoop',
    brand: 'whoop',
    platforms: ['ios', 'android', 'web'],
    devices: 'WHOOP 5.0, MG and 4.0',
    provides: ['Recovery score', 'Day strain', 'Sleep stages', 'HRV (RMSSD)', 'Resting heart rate', 'Skin temperature', 'Blood oxygen', 'Breathing rate', 'Workouts with heart rate zones'],
    approval: 'New WHOOP apps allow 10 members; higher limits need a WHOOP review.',
    membership: 'WHOOP is a paid membership, so every WHOOP user already has one.',
    programUrl: 'https://developer-dashboard.whoop.com',
    docsUrl: 'https://developer.whoop.com/api',
  },
  {
    id: 'garmin',
    name: 'Garmin',
    kind: 'cloud',
    path: 'garmin',
    brand: 'garmin',
    platforms: ['ios', 'android', 'web'],
    devices: 'Forerunner, Fenix, Venu, Vivoactive, Index scales and blood pressure monitors, HRM straps',
    provides: ['Workouts with heart rate zones', 'Training data', 'Sleep stages', 'HRV', 'Stress and Body Battery', 'Blood oxygen', 'Breathing rate', 'VO2 max', 'Body composition', 'Blood pressure', 'Women’s health'],
    approval: 'Garmin must approve Coressence in the Garmin Connect Developer Program. Commercial use carries a Garmin license fee.',
    programUrl: 'https://www.garmin.com/en-US/forms/StarterGarminConnectDeveloperAccess/',
    docsUrl: 'https://developer.garmin.com/gc-developer-program/overview/',
  },
  {
    id: 'fitbit',
    name: 'Fitbit and Pixel Watch',
    kind: 'cloud',
    path: 'fitbit',
    brand: 'fitbit',
    platforms: ['ios', 'android', 'web'],
    devices: 'Fitbit Charge, Sense, Versa, Inspire and Pixel Watch (through the Google Health API)',
    provides: ['Sleep stages', 'HRV', 'Resting heart rate', 'Skin temperature', 'Blood oxygen', 'Breathing rate', 'Steps and workouts', 'VO2 max', 'Weight and body fat', 'ECG results', 'Irregular rhythm notifications'],
    approval: 'Google treats every Google Health API permission as restricted, so Coressence needs Google’s privacy and security review first. The old Fitbit Web API shuts off this autumn.',
    programUrl: 'https://developers.google.com/health/get-started',
    docsUrl: 'https://developers.google.com/health/about',
  },
  {
    id: 'withings',
    name: 'Withings',
    kind: 'cloud',
    path: 'withings',
    brand: 'withings',
    platforms: ['ios', 'android', 'web'],
    devices: 'Body Smart, Body Scan and Body+ scales, BPM Connect and BPM Vision cuffs, ScanWatch, Sleep Analyzer',
    provides: ['Weight, body fat, lean mass', 'Blood pressure and pulse', 'Sleep', 'Steps and activity', 'Temperature'],
    approval: 'The free Withings plan allows 10 people until Withings reviews the app.',
    membership: 'Withings says accounts created after October 12, 2026 need Withings+ for data to reach partner apps on the free plan.',
    programUrl: 'https://developer.withings.com/',
    docsUrl: 'https://developer.withings.com/developer-guide/v3/integration-guide/public-health-data-api/public-health-data-api-overview/',
  },
  {
    id: 'polar',
    name: 'Polar',
    kind: 'cloud',
    path: 'polar',
    brand: 'polar',
    platforms: ['ios', 'android', 'web'],
    devices: 'Polar Vantage, Grit X, Pacer, Ignite, Loop and H10 / Verity Sense straps',
    provides: ['Workouts with heart rate zones', 'Cardio load', 'Sleep', 'Nightly Recharge', 'Continuous heart rate', 'Skin temperature, SpO2 and wrist ECG tests on supported watches'],
    programUrl: 'https://admin.polaraccesslink.com/',
    docsUrl: 'https://www.polar.com/accesslink-api/',
  },
  {
    id: 'dexcom',
    name: 'Dexcom (G7, G6, Stelo)',
    kind: 'cloud',
    path: 'dexcom',
    brand: 'dexcom',
    platforms: ['ios', 'android', 'web'],
    devices: 'Dexcom G7, G6 and Stelo glucose biosensors',
    provides: ['Glucose readings every 5 to 15 minutes, with a one-hour delay in the US', 'Logged events'],
    approval: 'Dexcom allows 5 people on a limited production key; wider release needs Dexcom’s partner approval and data license.',
    programUrl: 'https://developer.dexcom.com/',
    docsUrl: 'https://developer.dexcom.com/docs/',
  },
  {
    id: 'samsung',
    name: 'Samsung Health',
    kind: 'platform',
    path: 'healthconnect',
    brand: 'samsung',
    platforms: ['android'],
    devices: 'Galaxy Watch and Galaxy Ring',
    provides: ['Sleep', 'Heart rate', 'Steps and workouts', 'Blood oxygen', 'Body composition', 'Blood pressure (where available)'],
    approval: 'Works today through Health Connect. Samsung’s own Health Data SDK (for extra items such as irregular rhythm notifications) needs Samsung partner approval.',
    programUrl: 'https://developer.samsung.com/SHealth/business-partner/m48wvqi1mt9w2w4c',
    docsUrl: 'https://developer.samsung.com/health/data/overview.html',
  },
  {
    id: 'ble',
    name: 'Heart rate strap (Bluetooth)',
    kind: 'bluetooth',
    path: 'ble',
    brand: 'strap',
    platforms: ['ios', 'android', 'web'],
    devices: 'Any strap or armband using the standard Bluetooth Heart Rate Service: Polar H10 and Verity Sense, Garmin HRM-Pro and HRM 600, Wahoo TICKR, Coospo and most others',
    provides: ['Live heart rate and zones during a workout in Move'],
    docsUrl: 'https://www.bluetooth.com/specifications/specs/heart-rate-service-1-0/',
  },
];

/** Brands that reach Coressence only through Apple Health or Health Connect (no direct connection needed). */
export const ALSO_THROUGH_PLATFORM = ['Coros', 'Suunto', 'Amazfit / Zepp', 'Ultrahuman', 'Eight Sleep', 'Omron', 'FreeStyle Libre and Lingo', 'Wahoo', 'Xiaomi', 'Peloton', 'Strava', 'MyFitnessPal'];

export const connectionInfo = (id: ConnectionId) => CONNECTIONS.find((c) => c.id === id)!;
export const CLOUD_IDS = CONNECTIONS.filter((c) => c.kind === 'cloud').map((c) => c.id);

const BRAND_NAMES: Record<BrandId, string> = { apple: 'Apple Watch', oura: 'Oura', whoop: 'WHOOP', garmin: 'Garmin', fitbit: 'Fitbit', google: 'Pixel Watch', samsung: 'Samsung', withings: 'Withings', polar: 'Polar', dexcom: 'Dexcom', libre: 'FreeStyle Libre', omron: 'Omron', coros: 'Coros', suunto: 'Suunto', wahoo: 'Wahoo', ultrahuman: 'Ultrahuman', eightsleep: 'Eight Sleep', strap: 'Heart rate strap', phone: 'Entered by hand', other: 'Another app' };
export const brandName = (b: BrandId) => BRAND_NAMES[b] ?? 'Another app';
