// Oura API v2. OAuth: https://cloud.ouraring.com/oauth/authorize, token https://api.ouraring.com/oauth/token.
// Apps are registered at https://developer.ouraring.com/. New apps are limited to about 10 users until Oura approves
// them, and Gen3 / Ring 4 owners need an active Oura Membership for API access.
// Webhooks: one subscription per data type and event, verified by a GET challenge and signed with
// x-oura-signature (HMAC-SHA256 of x-oura-timestamp + body, client secret, uppercase hex).
import { verifyOura } from '../crypto.ts';
import type { Batch, NightStages, SleepStage } from '../schema.ts';
import { emptyBatch, getJson, hours, num, oauthTokens, postForm, r1, setDay, ymd, type Ctx, type Vendor } from './types.ts';

const API = 'https://api.ouraring.com';
const SCOPES = 'daily heartrate workout spo2Daily personal';

async function all(ctx: Ctx, token: string, path: string, start: string, end: string) {
  const out: any[] = [];
  let next: string | undefined;
  do {
    const q = new URLSearchParams({ start_date: start, end_date: end, ...(next ? { next_token: next } : {}) });
    const j = await getJson(ctx, 'oura', `${API}/v2/usercollection/${path}?${q}`, token);
    out.push(...(j?.data || []));
    next = j?.next_token || undefined;
  } while (next && out.length < 5000);
  return out;
}

/** sleep_phase_5_min: one character per 5 minutes; 1 deep, 2 light, 3 REM, 4 awake. */
export function phasesToSegments(phases: string, start: number): NightStages['segments'] {
  const map: Record<string, SleepStage> = { '1': 'deep', '2': 'core', '3': 'rem', '4': 'awake' };
  const segs: NightStages['segments'] = [];
  for (let i = 0; i < phases.length; i++) {
    const stage = map[phases[i]];
    if (!stage) continue;
    const s = start + i * 300_000;
    const last = segs[segs.length - 1];
    if (last && last.stage === stage && last.e === s) last.e = s + 300_000;
    else segs.push({ s, e: s + 300_000, stage });
  }
  return segs;
}

export function fromOura(ctx: Pick<Ctx, 'dayOf' | 'minOfDay' | 'now'>, p: { sleep: any[]; readiness: any[]; activity: any[]; spo2: any[]; workouts: any[] }): Batch {
  const b = emptyBatch('oura', 'oura', ctx.now);
  const nights: NightStages[] = [];
  for (const s of p.sleep.filter((x) => x.type === 'long_sleep' || x.type === 'sleep')) {
    const start = Date.parse(s.bedtime_start);
    const end = Date.parse(s.bedtime_end);
    const day = s.day || ctx.dayOf(end);
    const bedMin = ctx.minOfDay(start) - (ctx.dayOf(start) !== ctx.dayOf(end) ? 1440 : 0);
    setDay(b, day, {
      sleepH: hours(s.total_sleep_duration),
      sleepDeepH: hours(s.deep_sleep_duration),
      sleepRemH: hours(s.rem_sleep_duration),
      sleepCoreH: hours(s.light_sleep_duration),
      sleepAwakeH: hours(s.awake_time),
      bedMin,
      wakeMin: ctx.minOfDay(end),
      hrvRmssd: num(s.average_hrv),
      hrv: num(s.average_hrv),
      restingHr: num(s.lowest_heart_rate),
      respRate: num(s.average_breath) !== undefined ? r1(s.average_breath) : undefined,
    });
    if (typeof s.sleep_phase_5_min === 'string') nights.push({ date: day, start, end, segments: phasesToSegments(s.sleep_phase_5_min, start), origin: 'oura', path: 'oura' });
  }
  for (const r of p.readiness) setDay(b, r.day, { vendorReadiness: num(r.score), tempDev: num(r.temperature_deviation) });
  for (const a of p.activity) setDay(b, a.day, { steps: num(a.steps), activeKcal: num(a.active_calories), distanceKm: num(a.equivalent_walking_distance) !== undefined ? r1(a.equivalent_walking_distance / 1000) : undefined });
  for (const s of p.spo2) setDay(b, s.day, { spo2: num(s.spo2_percentage?.average) });
  b.events.nights = nights.slice(-14);
  b.events.workouts = p.workouts.map((w) => ({
    id: `oura-${w.id}`,
    origin: 'oura' as const,
    path: 'oura' as const,
    start: Date.parse(w.start_datetime),
    end: Date.parse(w.end_datetime),
    type: /walk/i.test(w.activity) ? ('walk' as const) : /run/i.test(w.activity) ? ('run' as const) : /cycl|bik/i.test(w.activity) ? ('cycle' as const) : /yoga/i.test(w.activity) ? ('yoga' as const) : /strength|weight/i.test(w.activity) ? ('strength' as const) : ('other' as const),
    label: String(w.activity || 'Workout').replace(/_/g, ' ').replace(/^\w/, (c: string) => c.toUpperCase()),
    kcal: num(w.calories) !== undefined ? Math.round(w.calories) : undefined,
    distanceKm: num(w.distance) !== undefined ? r1(w.distance / 1000) : undefined,
  }));
  return b;
}

export const oura: Vendor = {
  id: 'oura',
  name: 'Oura',
  usesPkce: false,
  authorizeUrl: (ctx, state) => `https://cloud.ouraring.com/oauth/authorize?${new URLSearchParams({ response_type: 'code', client_id: ctx.creds.clientId, redirect_uri: ctx.redirectUri, scope: SCOPES, state })}`,
  async exchange(ctx, code) {
    return oauthTokens(await postForm(ctx, 'oura', `${API}/oauth/token`, { grant_type: 'authorization_code', code, redirect_uri: ctx.redirectUri, client_id: ctx.creds.clientId, client_secret: ctx.creds.clientSecret }), ctx.now);
  },
  async refresh(ctx, t) {
    return oauthTokens(await postForm(ctx, 'oura', `${API}/oauth/token`, { grant_type: 'refresh_token', refresh_token: t.refreshToken!, client_id: ctx.creds.clientId, client_secret: ctx.creds.clientSecret }), ctx.now);
  },
  async afterConnect(ctx, t) {
    const me = await getJson(ctx, 'oura', `${API}/v2/usercollection/personal_info`, t.accessToken).catch(() => null);
    return { ...t, vendorUserId: me?.id };
  },
  async pull(ctx, t, days) {
    const end = ymd(ctx.now + 86400_000);
    const start = ymd(ctx.now - days * 86400_000);
    const [sleep, readiness, activity, spo2, workouts] = await Promise.all([
      all(ctx, t.accessToken, 'sleep', start, end),
      all(ctx, t.accessToken, 'daily_readiness', start, end),
      all(ctx, t.accessToken, 'daily_activity', start, end),
      all(ctx, t.accessToken, 'daily_spo2', start, end).catch(() => []),
      all(ctx, t.accessToken, 'workout', start, end),
    ]);
    return [fromOura(ctx, { sleep, readiness, activity, spo2, workouts })];
  },
  webhook(ctx, req) {
    if (req.method === 'GET') {
      // Subscription check: echo the challenge when the verification token matches.
      const ok = !!ctx.creds.extra.WEBHOOK_TOKEN && req.query.verification_token === ctx.creds.extra.WEBHOOK_TOKEN;
      return ok ? { ok, reply: { challenge: req.query.challenge } } : { ok: false, status: 403 };
    }
    if (!verifyOura(ctx.creds.clientSecret, req.raw, req.headers['x-oura-timestamp'] || '', req.headers['x-oura-signature'] || '')) return { ok: false, status: 401 };
    const e = req.body as { user_id?: string; data_type?: string; event_type?: string; object_id?: string };
    return { ok: true, items: e.user_id ? [{ vendorUserId: e.user_id, kind: `${e.data_type}.${e.event_type}`, payload: { object_id: e.object_id } }] : [] };
  },
};
