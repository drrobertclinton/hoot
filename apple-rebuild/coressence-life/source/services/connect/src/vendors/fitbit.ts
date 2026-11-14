// Fitbit and Pixel Watch through the Google Health API (the successor to the Fitbit Web API, which Google turns off
// in autumn 2026). Google OAuth 2.0 with PKCE; every Google Health API scope is "restricted", so Google's privacy and
// security review is required before release (https://developers.google.com/health/app-verification).
// Data: GET https://health.googleapis.com/v4/users/me/dataTypes/{dataType}/dataPoints with an AIP-160 filter.
// Mapped so far, with field names checked against the v4 reference: steps, sleep (stages), daily resting heart
// rate and daily heart rate variability. Weight, blood oxygen, exercise, ECG and irregular rhythm notifications are
// listed in the reference too; add them in fromGoogle() once Google's verification is under way.
import type { Batch, NightStages, SleepStage } from '../schema.ts';
import { emptyBatch, getJson, oauthTokens, postForm, r1, r2, setDay, type Ctx, type Vendor } from './types.ts';

const API = 'https://health.googleapis.com/v4/users/me/dataTypes';
const S = 'https://www.googleapis.com/auth/googlehealth';
const SCOPES = [`${S}.activity_and_fitness.readonly`, `${S}.health_metrics_and_measurements.readonly`, `${S}.sleep.readonly`, `${S}.ecg.readonly`, `${S}.irn.readonly`].join(' ');

async function list(ctx: Ctx, token: string, type: string, filter: string, pageSize: number) {
  const out: any[] = [];
  let pageToken = '';
  do {
    const q = new URLSearchParams({ filter, pageSize: String(pageSize), ...(pageToken ? { pageToken } : {}) });
    const j = await getJson(ctx, 'fitbit', `${API}/${type}/dataPoints?${q}`, token);
    out.push(...(j?.dataPoints || []));
    pageToken = j?.nextPageToken || '';
  } while (pageToken && out.length < 20000);
  return out;
}

const dateKey = (d: { year: number; month: number; day: number } | undefined) => (d ? `${d.year}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}` : '');
const STAGE: Record<string, SleepStage> = { AWAKE: 'awake', RESTLESS: 'awake', LIGHT: 'core', ASLEEP: 'core', DEEP: 'deep', REM: 'rem' };

export function fromGoogle(ctx: Pick<Ctx, 'dayOf' | 'minOfDay' | 'now'>, p: { steps: any[]; sleep: any[]; rhr: any[]; hrv: any[] }): Batch {
  const b = emptyBatch('fitbit', 'fitbit', ctx.now);
  const steps: Record<string, number> = {};
  for (const x of p.steps) {
    const s = x.steps;
    if (!s?.interval?.startTime) continue;
    const d = ctx.dayOf(Date.parse(s.interval.startTime));
    steps[d] = (steps[d] || 0) + Number(s.count || 0);
  }
  for (const [d, v] of Object.entries(steps)) setDay(b, d, { steps: v });
  for (const x of p.rhr) if (x.dailyRestingHeartRate) setDay(b, dateKey(x.dailyRestingHeartRate.date), { restingHr: Number(x.dailyRestingHeartRate.beatsPerMinute) });
  for (const x of p.hrv) {
    const h = x.dailyHeartRateVariability;
    if (h?.averageHeartRateVariabilityMilliseconds !== undefined) setDay(b, dateKey(h.date), { hrvRmssd: Math.round(h.averageHeartRateVariabilityMilliseconds), hrv: Math.round(h.averageHeartRateVariabilityMilliseconds) });
  }
  const nights: NightStages[] = [];
  for (const x of p.sleep) {
    const s = x.sleep;
    if (!s?.interval || s.metadata?.nap) continue;
    const start = Date.parse(s.interval.startTime);
    const end = Date.parse(s.interval.endTime);
    const day = ctx.dayOf(end);
    const segs = (s.stages || []).map((st: any) => ({ s: Date.parse(st.startTime), e: Date.parse(st.endTime), stage: STAGE[st.type] ?? 'core' }));
    const h = (k: SleepStage) => r2(segs.filter((g: any) => g.stage === k).reduce((a: number, g: any) => a + (g.e - g.s), 0) / 3600_000);
    const asleepMin = s.summary?.minutesAsleep !== undefined ? Number(s.summary.minutesAsleep) : null;
    setDay(b, day, { sleepH: asleepMin !== null ? r1(asleepMin / 60) : r1(h('deep') + h('core') + h('rem')), sleepDeepH: segs.length ? h('deep') : undefined, sleepRemH: segs.length ? h('rem') : undefined, sleepCoreH: segs.length ? h('core') : undefined, sleepAwakeH: segs.length ? h('awake') : undefined, bedMin: ctx.minOfDay(start) - (ctx.dayOf(start) !== day ? 1440 : 0), wakeMin: ctx.minOfDay(end) });
    if (segs.length) nights.push({ date: day, start, end, segments: segs, origin: 'fitbit', path: 'fitbit' });
  }
  b.events.nights = nights.slice(-14);
  return b;
}

export const fitbit: Vendor = {
  id: 'fitbit',
  name: 'Google Health (Fitbit, Pixel Watch)',
  usesPkce: true,
  authorizeUrl: (ctx, state, challenge) => `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({ response_type: 'code', client_id: ctx.creds.clientId, redirect_uri: ctx.redirectUri, scope: SCOPES, state, access_type: 'offline', prompt: 'consent', include_granted_scopes: 'true', code_challenge: challenge!, code_challenge_method: 'S256' })}`,
  async exchange(ctx, code, verifier) {
    return oauthTokens(await postForm(ctx, 'fitbit', 'https://oauth2.googleapis.com/token', { grant_type: 'authorization_code', code, redirect_uri: ctx.redirectUri, client_id: ctx.creds.clientId, client_secret: ctx.creds.clientSecret, code_verifier: verifier! }), ctx.now);
  },
  async refresh(ctx, t) {
    const n = oauthTokens(await postForm(ctx, 'fitbit', 'https://oauth2.googleapis.com/token', { grant_type: 'refresh_token', refresh_token: t.refreshToken!, client_id: ctx.creds.clientId, client_secret: ctx.creds.clientSecret }), ctx.now);
    return { ...n, refreshToken: n.refreshToken || t.refreshToken }; // Google keeps the same refresh token
  },
  async revoke(ctx, t) {
    await postForm(ctx, 'fitbit', 'https://oauth2.googleapis.com/revoke', { token: t.refreshToken || t.accessToken }).catch(() => undefined);
  },
  async pull(ctx, t, days) {
    const from = new Date(ctx.now - days * 86400_000).toISOString();
    const fromDay = from.slice(0, 10);
    const [steps, sleep, rhr, hrv] = await Promise.all([
      list(ctx, t.accessToken, 'steps', `steps.interval.start_time >= "${from}"`, 10000),
      list(ctx, t.accessToken, 'sleep', `sleep.interval.end_time >= "${from}"`, 25),
      list(ctx, t.accessToken, 'daily-resting-heart-rate', `daily_resting_heart_rate.date >= "${fromDay}"`, 1000).catch(() => []),
      list(ctx, t.accessToken, 'daily-heart-rate-variability', `daily_heart_rate_variability.date >= "${fromDay}"`, 1000).catch(() => []),
    ]);
    return [fromGoogle(ctx, { steps, sleep, rhr, hrv })];
  },
};
