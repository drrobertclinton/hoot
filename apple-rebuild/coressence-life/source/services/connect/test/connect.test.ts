// Coressence Connect: encryption, sessions, the OAuth round trip, sync, webhooks and vendor normalizers.
// Every vendor call goes to a fake fetch; nothing here touches the network.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadConfig } from '../src/config.ts';
import { hmac, open, pkce, seal } from '../src/crypto.ts';
import { buildServer } from '../src/server.ts';
import { Store } from '../src/store.ts';
import { fromDexcom } from '../src/vendors/dexcom.ts';
import { fromGarmin } from '../src/vendors/garmin.ts';
import { fromOura, phasesToSegments } from '../src/vendors/oura.ts';
import { fromPolar, isoMinutes } from '../src/vendors/polar.ts';
import { fromWhoop } from '../src/vendors/whoop.ts';
import { fromWithings } from '../src/vendors/withings.ts';
import { fromGoogle } from '../src/vendors/fitbit.ts';
import { makeDayFns } from '../src/vendors/types.ts';
import { fromTerra } from '../src/vendors/aggregators.ts';

const KEY = Buffer.alloc(32, 7).toString('base64');
const ENV = {
  CONNECT_DATA_KEY: KEY,
  CONNECT_PUBLIC_URL: 'https://connect.example.test',
  WHOOP_CLIENT_ID: 'wid',
  WHOOP_CLIENT_SECRET: 'wsecret',
  WHOOP_LIVE: 'true',
  OURA_CLIENT_ID: 'oid',
  OURA_CLIENT_SECRET: 'osecret',
  OURA_WEBHOOK_TOKEN: 'verify-me',
  GARMIN_CLIENT_ID: 'gid',
  GARMIN_CLIENT_SECRET: 'gsecret',
  GARMIN_WEBHOOK_TOKEN: 'gkey',
  POLAR_CLIENT_ID: 'pid',
  POLAR_CLIENT_SECRET: 'psecret',
  POLAR_WEBHOOK_SECRET: 'polar-hook',
};
const NY = { ...makeDayFns('America/New_York'), now: Date.parse('2026-10-18T14:00:00Z') };

type Call = { url: string; init?: RequestInit };
function fakeFetch(routes: [RegExp, (c: Call) => unknown][]) {
  const calls: Call[] = [];
  const f = (async (url: string | URL, init?: RequestInit) => {
    const c = { url: String(url), init };
    calls.push(c);
    const hit = routes.find(([re]) => re.test(c.url));
    const body = hit ? hit[1](c) : { error: 'no route' };
    return new Response(JSON.stringify(body), { status: hit ? 200 : 404, headers: { 'content-type': 'application/json' } });
  }) as typeof fetch;
  return { f, calls };
}

function setup(routes: [RegExp, (c: Call) => unknown][] = []) {
  const cfg = loadConfig(ENV as unknown as NodeJS.ProcessEnv);
  const store = new Store(cfg.dataKey, null);
  const ff = fakeFetch(routes);
  return { cfg, store, app: buildServer({ cfg, store, fetch: ff.f }), calls: ff.calls };
}

test('config reads vendors from the environment only, and encryption round-trips', () => {
  const cfg = loadConfig(ENV as unknown as NodeJS.ProcessEnv);
  assert.deepEqual(Object.keys(cfg.vendors).sort(), ['garmin', 'oura', 'polar', 'whoop']);
  assert.equal(cfg.vendors.oura!.extra.WEBHOOK_TOKEN, 'verify-me');
  assert.equal(cfg.vendors.whoop!.live, true);
  assert.throws(() => loadConfig({ CONNECT_DATA_KEY: 'c2hvcnQ=' } as unknown as NodeJS.ProcessEnv));
  const sealed = seal(cfg.dataKey, { a: 1, token: 'secret' });
  assert.doesNotMatch(sealed, /secret/);
  assert.deepEqual(open(cfg.dataKey, sealed), { a: 1, token: 'secret' });
  const p = pkce();
  assert.ok(p.verifier.length >= 43 && p.challenge.length === 43);
});

test('OAuth round trip: start gives the vendor link, the callback stores encrypted tokens and returns to the app', async () => {
  const { app, store, calls } = setup([
    [/oauth2\/token/, () => ({ access_token: 'AT-1', refresh_token: 'RT-1', expires_in: 3600, scope: 'offline read:recovery' })],
    [/user\/profile\/basic/, () => ({ user_id: 4242 })],
  ]);
  const { session } = (await app.inject({ method: 'POST', url: '/v1/session' })).json();
  assert.equal((await app.inject({ method: 'GET', url: '/v1/connections' })).statusCode, 401);
  const vendors = (await app.inject({ method: 'GET', url: '/v1/vendors' })).json().vendors;
  assert.deepEqual(vendors.whoop, { configured: true, approved: true });
  assert.deepEqual(vendors.dexcom, { configured: false, approved: false });
  const bad = await app.inject({ method: 'POST', url: '/v1/connect/whoop/start', headers: { authorization: `Bearer ${session}` }, payload: { returnUrl: 'https://evil.test' } });
  assert.equal(bad.statusCode, 400);
  const start = await app.inject({ method: 'POST', url: '/v1/connect/whoop/start', headers: { authorization: `Bearer ${session}` }, payload: { returnUrl: 'coressence://devices' } });
  const link = new URL(start.json().url);
  assert.equal(link.origin + link.pathname, 'https://api.prod.whoop.com/oauth/oauth2/auth');
  assert.match(link.searchParams.get('scope')!, /offline/);
  assert.equal(link.searchParams.get('redirect_uri'), 'https://connect.example.test/v1/oauth/whoop/callback');
  const state = link.searchParams.get('state')!;
  assert.ok(state.length >= 8);
  const cb = await app.inject({ method: 'GET', url: `/v1/oauth/whoop/callback?code=abc&state=${state}` });
  assert.equal(cb.statusCode, 302);
  assert.equal(cb.headers.location, 'coressence://devices?connected=whoop&ok=1');
  assert.match(String(calls[0].init?.body), /code=abc/);
  assert.doesNotMatch(store.rawJson(), /AT-1|RT-1/);
  assert.equal(store.connection(session, 'whoop')!.vendorUserId, '4242');
  // The same state cannot be used twice.
  assert.equal((await app.inject({ method: 'GET', url: `/v1/oauth/whoop/callback?code=abc&state=${state}` })).statusCode, 400);
  const list = (await app.inject({ method: 'GET', url: '/v1/connections', headers: { authorization: `Bearer ${session}` } })).json();
  assert.deepEqual(list.connections.map((c: any) => c.vendor), ['whoop']);
});

test('Garmin uses PKCE, and its pushed summaries reach the member through sync, once', async () => {
  const { app, store } = setup([
    [/di-oauth2-service\/oauth\/token/, (c) => (/code_verifier=/.test(String(c.init?.body)) ? { access_token: 'G-AT', refresh_token: 'G-RT', expires_in: 86400 } : {})],
    [/wellness-api\/rest\/user\/id/, () => ({ userId: 'garmin-user-1' })],
  ]);
  const { session } = (await app.inject({ method: 'POST', url: '/v1/session' })).json();
  const auth = { authorization: `Bearer ${session}` };
  const link = new URL((await app.inject({ method: 'POST', url: '/v1/connect/garmin/start', headers: auth, payload: {} })).json().url);
  assert.equal(link.searchParams.get('code_challenge_method'), 'S256');
  await app.inject({ method: 'GET', url: `/v1/oauth/garmin/callback?code=g&state=${link.searchParams.get('state')}` });
  assert.equal(store.connection(session, 'garmin')!.vendorUserId, 'garmin-user-1');
  const push = { dailies: [{ userId: 'garmin-user-1', calendarDate: '2026-10-17', steps: 10234, restingHeartRateInBeatsPerMinute: 54 }], sleeps: [{ userId: 'someone-else', calendarDate: '2026-10-17' }] };
  assert.equal((await app.inject({ method: 'POST', url: '/v1/webhooks/garmin', payload: push })).statusCode, 401); // no key
  assert.equal((await app.inject({ method: 'POST', url: '/v1/webhooks/garmin?key=gkey', payload: push })).statusCode, 200);
  const sync = (await app.inject({ method: 'GET', url: '/v1/sync?days=7&tz=America/New_York', headers: auth })).json();
  const g = sync.batches.find((b: any) => b.path === 'garmin');
  assert.equal(g.days['2026-10-17'].steps, 10234);
  assert.equal(g.days['2026-10-17'].restingHr, 54);
  const again = (await app.inject({ method: 'GET', url: '/v1/sync?days=7', headers: auth })).json();
  assert.equal(Object.keys(again.batches.find((b: any) => b.path === 'garmin').days).length, 0);
  // Disconnect revokes at Garmin and removes the tokens.
  assert.equal((await app.inject({ method: 'DELETE', url: '/v1/connections/garmin', headers: auth })).statusCode, 200);
  assert.equal(store.connection(session, 'garmin'), null);
});

test('webhook signatures: WHOOP, Oura (with the challenge handshake) and Polar', async () => {
  const { app } = setup();
  const raw = JSON.stringify({ user_id: 4242, id: 'abc', type: 'recovery.updated' });
  const ts = '1760800000000';
  const good = hmac('sha256', 'wsecret', ts + raw, 'base64');
  const send = (sig: string) => app.inject({ method: 'POST', url: '/v1/webhooks/whoop', payload: raw, headers: { 'content-type': 'application/json', 'x-whoop-signature': sig, 'x-whoop-signature-timestamp': ts } });
  assert.equal((await send(good)).statusCode, 200);
  assert.equal((await send(good.replace(/.$/, good.endsWith('A') ? 'B' : 'A'))).statusCode, 401);
  const ch = await app.inject({ method: 'GET', url: '/v1/webhooks/oura?verification_token=verify-me&challenge=xyz' });
  assert.deepEqual(ch.json(), { challenge: 'xyz' });
  assert.equal((await app.inject({ method: 'GET', url: '/v1/webhooks/oura?verification_token=nope&challenge=xyz' })).statusCode, 403);
  const oraw = JSON.stringify({ event_type: 'create', data_type: 'sleep', object_id: 'o1', user_id: 'u1' });
  const osig = hmac('sha256', 'osecret', ts + oraw, 'hex').toUpperCase();
  assert.equal((await app.inject({ method: 'POST', url: '/v1/webhooks/oura', payload: oraw, headers: { 'content-type': 'application/json', 'x-oura-signature': osig, 'x-oura-timestamp': ts } })).statusCode, 200);
  const praw = JSON.stringify({ event: 'EXERCISE', user_id: 7, entity_id: 'e1' });
  assert.equal((await app.inject({ method: 'POST', url: '/v1/webhooks/polar', payload: praw, headers: { 'content-type': 'application/json', 'polar-webhook-signature': hmac('sha256', 'polar-hook', praw, 'hex') } })).statusCode, 200);
  assert.equal((await app.inject({ method: 'POST', url: '/v1/webhooks/polar', payload: praw, headers: { 'content-type': 'application/json', 'polar-webhook-signature': 'deadbeef' } })).statusCode, 401);
  assert.equal((await app.inject({ method: 'POST', url: '/v1/webhooks/dexcom', payload: '{}', headers: { 'content-type': 'application/json' } })).statusCode, 404);
});

test('vendor normalizers produce the shared schema in the member’s time zone', () => {
  const o = fromOura(NY, {
    sleep: [{ type: 'long_sleep', day: '2026-10-18', bedtime_start: '2026-10-17T23:10:00-04:00', bedtime_end: '2026-10-18T06:40:00-04:00', total_sleep_duration: 25200, deep_sleep_duration: 5400, rem_sleep_duration: 5760, light_sleep_duration: 14040, awake_time: 1800, average_hrv: 58, lowest_heart_rate: 53, average_breath: 14.75, sleep_phase_5_min: '2211443' }],
    readiness: [{ day: '2026-10-18', score: 84, temperature_deviation: 0.12 }],
    activity: [{ day: '2026-10-17', steps: 9100, active_calories: 420, equivalent_walking_distance: 7300 }],
    spo2: [{ day: '2026-10-18', spo2_percentage: { average: 97.2 } }],
    workouts: [{ id: 'w', activity: 'walking', start_datetime: '2026-10-17T12:00:00-04:00', end_datetime: '2026-10-17T12:30:00-04:00', calories: 120.4 }],
  });
  assert.deepEqual(
    { ...o.days['2026-10-18'] },
    { sleepH: 7, sleepDeepH: 1.5, sleepRemH: 1.6, sleepCoreH: 3.9, sleepAwakeH: 0.5, bedMin: -50, wakeMin: 400, hrvRmssd: 58, hrv: 58, restingHr: 53, respRate: 14.8, vendorReadiness: 84, tempDev: 0.12, spo2: 97.2 },
  );
  assert.equal(o.days['2026-10-17'].distanceKm, 7.3);
  assert.equal(o.events.workouts![0].type, 'walk');
  assert.deepEqual(phasesToSegments('2211', 0).map((s) => s.stage), ['core', 'deep']);

  const w = fromWhoop(NY, {
    recovery: [{ cycle_id: 1, sleep_id: 's1', score_state: 'SCORED', created_at: '2026-10-18T11:00:00Z', score: { recovery_score: 71, resting_heart_rate: 55, hrv_rmssd_milli: 61.4, spo2_percentage: 96.5, skin_temp_celsius: 33.4 } }],
    cycles: [{ id: 1, start: '2026-10-18T10:40:00Z', score: { strain: 12.34 } }],
    sleep: [{ id: 's1', nap: false, start: '2026-10-18T03:00:00Z', end: '2026-10-18T10:40:00Z', score: { respiratory_rate: 15.2, stage_summary: { total_light_sleep_time_milli: 14400000, total_slow_wave_sleep_time_milli: 5400000, total_rem_sleep_time_milli: 6300000, total_awake_time_milli: 1500000 } } }],
    workouts: [{ id: 'k', sport_name: 'running', start: '2026-10-17T21:00:00Z', end: '2026-10-17T21:40:00Z', score: { strain: 9.1, average_heart_rate: 152, max_heart_rate: 176, kilojoule: 1800, zone_durations: { zone_zero_milli: 0, zone_one_milli: 120000, zone_two_milli: 600000, zone_three_milli: 900000, zone_four_milli: 600000, zone_five_milli: 180000 } } }],
  });
  assert.equal(w.days['2026-10-18'].vendorRecovery, 71);
  assert.equal(w.days['2026-10-18'].vendorStrain, 12.3);
  assert.equal(w.days['2026-10-18'].hrv, 61);
  assert.equal(w.days['2026-10-18'].sleepH, 7.3);
  assert.deepEqual(w.events.workouts![0].zones, [2, 10, 15, 10, 3]);
  assert.equal(w.events.workouts![0].kcal, 430);

  const wi = fromWithings(NY, { measuregrps: [{ date: 1760781600, measures: [{ type: 1, value: 80150, unit: -3 }, { type: 6, value: 2210, unit: -2 }, { type: 10, value: 128, unit: 0 }, { type: 9, value: 81, unit: 0 }, { type: 11, value: 62, unit: 0 }] }], sleep: [] });
  const day = NY.dayOf(1760781600 * 1000);
  assert.equal(wi.days[day].weightKg, 80.2);
  assert.equal(wi.days[day].bodyFatPct, 22.1);
  assert.deepEqual([wi.events.bp![0].sys, wi.events.bp![0].dia, wi.events.bp![0].pulse], [128, 81, 62]);

  const dx = fromDexcom(NY, [{ systemTime: '2026-10-18T12:00:00', value: 104, unit: 'mg/dL' }, { systemTime: '2026-10-18T12:05:00', value: 110, unit: 'mg/dL' }, { systemTime: '2026-10-18T12:10:00', value: 6.1, unit: 'mmol/L' }]);
  assert.equal(dx.events.glucose!.length, 2);
  assert.equal(dx.days['2026-10-18'].glucoseAvg, 107);

  assert.equal(isoMinutes('PT1H2M30S'), 62.5);
  const p = fromPolar(NY, { exercises: [{ id: 1, start_time: '2026-10-17T07:00:00', duration: 'PT45M', sport: 'RUNNING', heart_rate: { average: 148, maximum: 171 }, calories: 510 }], nights: [], recharges: [{ date: '2026-10-18', heart_rate_avg: 52, heart_rate_variability_avg: 63, breathing_rate_avg: 14.2 }] });
  assert.equal(p.events.workouts![0].end - p.events.workouts![0].start, 45 * 60_000);
  assert.equal(p.days['2026-10-18'].hrv, 63);

  const g = fromGarmin(NY, [{ vendor: 'garmin', at: 0, kind: 'sleeps', payload: { calendarDate: '2026-10-18', startTimeInSeconds: 1760757000, durationInSeconds: 27000, deepSleepDurationInSeconds: 5400, lightSleepDurationInSeconds: 14400, remSleepInSeconds: 5400, awakeDurationInSeconds: 1800 } }, { vendor: 'garmin', at: 0, kind: 'bloodPressures', payload: { measurementTimeInSeconds: 1760781600, systolic: 122, diastolic: 78, pulse: 60 } }]);
  assert.equal(g.days['2026-10-18'].sleepH, 7);
  assert.equal(g.events.bp![0].sys, 122);

  const gh = fromGoogle(NY, { steps: [{ steps: { interval: { startTime: '2026-10-18T13:00:00Z' }, count: '1200' } }, { steps: { interval: { startTime: '2026-10-18T14:00:00Z' }, count: '800' } }], sleep: [], rhr: [{ dailyRestingHeartRate: { date: { year: 2026, month: 10, day: 18 }, beatsPerMinute: '57' } }], hrv: [{ dailyHeartRateVariability: { date: { year: 2026, month: 10, day: 18 }, averageHeartRateVariabilityMilliseconds: 44.6 } }] });
  assert.deepEqual({ ...gh.days['2026-10-18'] }, { steps: 2000, restingHr: 57, hrvRmssd: 45, hrv: 45 });

  const t = fromTerra(NY, 'GARMIN', { sleep: [], daily: [{ metadata: { start_time: '2026-10-18T04:00:00Z' }, distance_data: { steps: 5000 } }] });
  assert.equal(t.origin, 'garmin');
  assert.equal(t.path, 'terra');
  assert.equal(t.days['2026-10-18'].steps, 5000);
});
