// Garmin Connect Developer Program (Health and Activity APIs). Needs Garmin's approval: apply at
// https://www.garmin.com/en-US/forms/StarterGarminConnectDeveloperAccess/ . Commercial use carries a license fee.
// OAuth 2.0 with PKCE: https://connect.garmin.com/oauth2Confirm, token
// https://connectapi.garmin.com/di-oauth2-service/oauth/token, user id https://apis.garmin.com/wellness-api/rest/user/id.
// Starter access is push only: Garmin POSTs summaries to our webhook as they sync; nothing older than the
// connection is included. Field names follow Garmin's Health API specification; confirm them against the
// specification Garmin sends with approval before going live.
import type { Batch, HrZones } from '../schema.ts';
import type { InboxItem } from '../store.ts';
import { emptyBatch, getJson, hours, num, oauthTokens, postForm, r1, setDay, type Ctx, type Vendor } from './types.ts';

const KINDS = ['dailies', 'sleeps', 'hrv', 'bodyComps', 'bloodPressures', 'userMetrics', 'activities', 'pulseox', 'allDayRespiration', 'skinTemp', 'activityDetails'] as const;

const ACT: Record<string, ['run' | 'cycle' | 'walk' | 'strength' | 'yoga' | 'pilates' | 'swim' | 'cardio' | 'other', string]> = {
  RUNNING: ['run', 'Run'],
  TREADMILL_RUNNING: ['run', 'Treadmill run'],
  CYCLING: ['cycle', 'Ride'],
  INDOOR_CYCLING: ['cycle', 'Indoor ride'],
  WALKING: ['walk', 'Walk'],
  HIKING: ['walk', 'Hike'],
  STRENGTH_TRAINING: ['strength', 'Strength'],
  YOGA: ['yoga', 'Yoga'],
  PILATES: ['pilates', 'Pilates'],
  LAP_SWIMMING: ['swim', 'Pool swim'],
  OPEN_WATER_SWIMMING: ['swim', 'Open water swim'],
  HIIT: ['cardio', 'Interval training'],
};

export function fromGarmin(ctx: Pick<Ctx, 'dayOf' | 'minOfDay' | 'now'>, items: InboxItem[]): Batch {
  const b = emptyBatch('garmin', 'garmin', ctx.now);
  const by = (k: string) => items.filter((i) => i.kind === k).map((i) => i.payload as any);
  for (const d of by('dailies'))
    setDay(b, d.calendarDate, {
      steps: num(d.steps),
      distanceKm: num(d.distanceInMeters) !== undefined ? r1(d.distanceInMeters / 1000) : undefined,
      activeKcal: num(d.activeKilocalories),
      basalKcal: num(d.bmrKilocalories),
      restingHr: num(d.restingHeartRateInBeatsPerMinute),
      exerciseMin: d.moderateIntensityDurationInSeconds !== undefined ? Math.round(((d.moderateIntensityDurationInSeconds || 0) + (d.vigorousIntensityDurationInSeconds || 0)) / 60) : undefined,
    });
  for (const s of by('sleeps')) {
    const start = (s.startTimeInSeconds || 0) * 1000;
    const end = start + (s.durationInSeconds || 0) * 1000;
    const deep = hours(s.deepSleepDurationInSeconds) ?? 0;
    const light = hours(s.lightSleepDurationInSeconds) ?? 0;
    const rem = hours(s.remSleepInSeconds) ?? 0;
    setDay(b, s.calendarDate, { sleepH: r1(deep + light + rem), sleepDeepH: deep, sleepCoreH: light, sleepRemH: rem, sleepAwakeH: hours(s.awakeDurationInSeconds), bedMin: ctx.minOfDay(start) - (ctx.dayOf(start) !== ctx.dayOf(end) ? 1440 : 0), wakeMin: ctx.minOfDay(end) });
  }
  for (const h of by('hrv')) setDay(b, h.calendarDate, { hrvRmssd: num(h.lastNightAvg), hrv: num(h.lastNightAvg) });
  for (const m of by('userMetrics')) setDay(b, m.calendarDate, { vo2max: num(m.vo2Max) });
  for (const t of by('skinTemp')) setDay(b, t.calendarDate, { tempDev: num(t.avgDeviationCelsius) });
  for (const r of by('allDayRespiration')) {
    const vals = Object.values(r.timeOffsetEpochToBreaths || {}).filter((v): v is number => typeof v === 'number');
    if (vals.length) setDay(b, ctx.dayOf((r.startTimeInSeconds || 0) * 1000), { respRate: r1(vals.reduce((a, v) => a + v, 0) / vals.length) });
  }
  for (const p of by('pulseox')) {
    const vals = Object.values(p.timeOffsetSpo2Values || {}).filter((v): v is number => typeof v === 'number');
    if (vals.length) setDay(b, p.calendarDate, { spo2: Math.round(vals.reduce((a, v) => a + v, 0) / vals.length) });
  }
  for (const c of by('bodyComps')) {
    const t = (c.measurementTimeInSeconds || 0) * 1000;
    setDay(b, ctx.dayOf(t), { weightKg: num(c.weightInGrams) !== undefined ? r1(c.weightInGrams / 1000) : undefined, bodyFatPct: num(c.bodyFatInPercent) });
  }
  b.events.bp = by('bloodPressures').map((p) => ({ t: (p.measurementTimeInSeconds || 0) * 1000, sys: p.systolic, dia: p.diastolic, pulse: p.pulse, origin: 'garmin' as const, path: 'garmin' as const }));
  b.events.workouts = by('activities').map((a) => {
    const [type, label] = ACT[String(a.activityType)] ?? ['other', String(a.activityName || a.activityType || 'Workout').replace(/_/g, ' ').toLowerCase().replace(/^\w/, (x: string) => x.toUpperCase())];
    const start = (a.startTimeInSeconds || 0) * 1000;
    return { id: `garmin-${a.summaryId}`, origin: 'garmin' as const, path: 'garmin' as const, start, end: start + (a.durationInSeconds || 0) * 1000, type, label, kcal: num(a.activeKilocalories), distanceKm: num(a.distanceInMeters) !== undefined ? r1(a.distanceInMeters / 1000) : undefined, avgHr: num(a.averageHeartRateInBeatsPerMinute), maxHr: num(a.maxHeartRateInBeatsPerMinute), zones: undefined as HrZones | undefined };
  });
  return b;
}

export const garmin: Vendor = {
  id: 'garmin',
  name: 'Garmin',
  usesPkce: true,
  authorizeUrl: (ctx, state, challenge) => `https://connect.garmin.com/oauth2Confirm?${new URLSearchParams({ response_type: 'code', client_id: ctx.creds.clientId, code_challenge: challenge!, code_challenge_method: 'S256', redirect_uri: ctx.redirectUri, state })}`,
  async exchange(ctx, code, verifier) {
    return oauthTokens(await postForm(ctx, 'garmin', 'https://connectapi.garmin.com/di-oauth2-service/oauth/token', { grant_type: 'authorization_code', client_id: ctx.creds.clientId, client_secret: ctx.creds.clientSecret, code, code_verifier: verifier!, redirect_uri: ctx.redirectUri }), ctx.now);
  },
  async refresh(ctx, t) {
    return oauthTokens(await postForm(ctx, 'garmin', 'https://connectapi.garmin.com/di-oauth2-service/oauth/token', { grant_type: 'refresh_token', client_id: ctx.creds.clientId, client_secret: ctx.creds.clientSecret, refresh_token: t.refreshToken! }), ctx.now);
  },
  async afterConnect(ctx, t) {
    const me = await getJson(ctx, 'garmin', 'https://apis.garmin.com/wellness-api/rest/user/id', t.accessToken);
    return { ...t, vendorUserId: me?.userId };
  },
  async revoke(ctx, t) {
    await ctx.fetch('https://apis.garmin.com/wellness-api/rest/user/registration', { method: 'DELETE', headers: { authorization: `Bearer ${t.accessToken}` } }).catch(() => undefined);
  },
  async pull(ctx, _t, _days, inbox) {
    return [fromGarmin(ctx, inbox.filter((i) => i.vendor === 'garmin'))];
  },
  webhook(ctx, req) {
    // Garmin does not sign pushes, so the endpoint URL registered with Garmin carries a secret key.
    const key = ctx.creds.extra.WEBHOOK_TOKEN || '';
    if (!key || String(req.query.key || '') !== key) return { ok: false, status: 401 };
    // Garmin pushes {"dailies":[{userId,...}], ...}. Only accept users we know (checked by the store) and known kinds.
    const body = (req.body || {}) as Record<string, unknown>;
    const items: { vendorUserId: string; kind: string; payload: unknown }[] = [];
    for (const k of KINDS) for (const x of (Array.isArray(body[k]) ? body[k] : []) as any[]) if (x?.userId) items.push({ vendorUserId: String(x.userId), kind: k, payload: x });
    if (Array.isArray(body.deregistrations)) for (const x of body.deregistrations as any[]) if (x?.userId) items.push({ vendorUserId: String(x.userId), kind: 'deregistration', payload: {} });
    return { ok: true, items };
  },
};
