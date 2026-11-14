// WHOOP Developer Platform, API v2. OAuth: https://api.prod.whoop.com/oauth/oauth2/auth and /token; the `offline`
// scope returns a refresh token, and each refresh replaces both tokens. State must be at least 8 characters.
// New apps allow 10 members (Sandbox); higher tiers need WHOOP's review in the Developer Dashboard.
// Webhooks: X-WHOOP-Signature = base64 HMAC-SHA256(X-WHOOP-Signature-Timestamp + raw body, client secret).
import { verifyWhoop } from '../crypto.ts';
import type { Batch, HrZones } from '../schema.ts';
import { deviations, emptyBatch, getJson, num, oauthTokens, postForm, r1, setDay, type Ctx, type Vendor } from './types.ts';

const API = 'https://api.prod.whoop.com/developer';
const SCOPES = 'offline read:recovery read:cycles read:workout read:sleep read:body_measurement read:profile';

async function all(ctx: Ctx, token: string, path: string, start: string) {
  const out: any[] = [];
  let next: string | undefined;
  do {
    const q = new URLSearchParams({ start, limit: '25', ...(next ? { nextToken: next } : {}) });
    const j = await getJson(ctx, 'whoop', `${API}${path}?${q}`, token);
    out.push(...(j?.records || []));
    next = j?.next_token || undefined;
  } while (next && out.length < 2000);
  return out;
}

const SPORT: Record<string, ['run' | 'cycle' | 'walk' | 'strength' | 'yoga' | 'pilates' | 'swim' | 'cardio' | 'other', string]> = {
  running: ['run', 'Run'],
  cycling: ['cycle', 'Ride'],
  walking: ['walk', 'Walk'],
  hiking: ['walk', 'Hike'],
  weightlifting: ['strength', 'Strength'],
  'functional-fitness': ['strength', 'Functional fitness'],
  yoga: ['yoga', 'Yoga'],
  pilates: ['pilates', 'Pilates'],
  swimming: ['swim', 'Swim'],
  hiit: ['cardio', 'Interval training'],
};

export function fromWhoop(ctx: Pick<Ctx, 'dayOf' | 'minOfDay' | 'now'>, p: { recovery: any[]; cycles: any[]; sleep: any[]; workouts: any[] }): Batch {
  const b = emptyBatch('whoop', 'whoop', ctx.now);
  const sleepById = new Map(p.sleep.map((s) => [String(s.id), s]));
  const temps: { day: string; v: number }[] = [];
  for (const r of p.recovery.filter((x) => x.score_state === 'SCORED' && x.score)) {
    const s = sleepById.get(String(r.sleep_id));
    const day = ctx.dayOf(Date.parse(s?.end || r.created_at));
    setDay(b, day, { vendorRecovery: num(r.score.recovery_score), restingHr: num(r.score.resting_heart_rate), hrvRmssd: num(r.score.hrv_rmssd_milli) !== undefined ? Math.round(r.score.hrv_rmssd_milli) : undefined, spo2: num(r.score.spo2_percentage) !== undefined ? r1(r.score.spo2_percentage) : undefined });
    if (num(r.score.skin_temp_celsius) !== undefined) temps.push({ day, v: r.score.skin_temp_celsius });
  }
  for (const t of deviations(temps)) setDay(b, t.day, { tempDev: t.v });
  for (const c of p.cycles.filter((x) => x.score)) setDay(b, ctx.dayOf(Date.parse(c.start)), { vendorStrain: num(c.score.strain) !== undefined ? r1(c.score.strain) : undefined });
  for (const s of p.sleep.filter((x) => !x.nap && x.score?.stage_summary)) {
    const st = s.score.stage_summary;
    const end = Date.parse(s.end);
    const start = Date.parse(s.start);
    const h = (ms: number | undefined) => (typeof ms === 'number' ? Math.round((ms / 3600_000) * 100) / 100 : undefined);
    const deep = h(st.total_slow_wave_sleep_time_milli) ?? 0;
    const rem = h(st.total_rem_sleep_time_milli) ?? 0;
    const light = h(st.total_light_sleep_time_milli) ?? 0;
    setDay(b, ctx.dayOf(end), { sleepH: r1(deep + rem + light), sleepDeepH: deep, sleepRemH: rem, sleepCoreH: light, sleepAwakeH: h(st.total_awake_time_milli), respRate: num(s.score.respiratory_rate) !== undefined ? r1(s.score.respiratory_rate) : undefined, bedMin: ctx.minOfDay(start) - (ctx.dayOf(start) !== ctx.dayOf(end) ? 1440 : 0), wakeMin: ctx.minOfDay(end) });
  }
  for (const d of Object.values(b.days)) if (d.hrvRmssd !== undefined) d.hrv = d.hrvRmssd;
  b.events.workouts = p.workouts.map((w) => {
    const z = w.score?.zone_durations;
    const zones = z ? ([z.zone_one_milli, z.zone_two_milli, z.zone_three_milli, z.zone_four_milli, z.zone_five_milli].map((ms: number) => r1((ms || 0) / 60_000)) as HrZones) : undefined;
    const [type, label] = SPORT[String(w.sport_name || '').toLowerCase()] ?? ['other', w.sport_name ? String(w.sport_name).replace(/^\w/, (c: string) => c.toUpperCase()) : 'Workout'];
    return { id: `whoop-${w.id}`, origin: 'whoop' as const, path: 'whoop' as const, start: Date.parse(w.start), end: Date.parse(w.end), type, label, kcal: num(w.score?.kilojoule) !== undefined ? Math.round(w.score.kilojoule / 4.184) : undefined, distanceKm: num(w.score?.distance_meter) !== undefined ? r1(w.score.distance_meter / 1000) : undefined, avgHr: num(w.score?.average_heart_rate), maxHr: num(w.score?.max_heart_rate), zones, vendorLoad: num(w.score?.strain) };
  });
  return b;
}

export const whoop: Vendor = {
  id: 'whoop',
  name: 'WHOOP',
  usesPkce: false,
  authorizeUrl: (ctx, state) => `https://api.prod.whoop.com/oauth/oauth2/auth?${new URLSearchParams({ response_type: 'code', client_id: ctx.creds.clientId, redirect_uri: ctx.redirectUri, scope: SCOPES, state })}`,
  async exchange(ctx, code) {
    return oauthTokens(await postForm(ctx, 'whoop', 'https://api.prod.whoop.com/oauth/oauth2/token', { grant_type: 'authorization_code', code, redirect_uri: ctx.redirectUri, client_id: ctx.creds.clientId, client_secret: ctx.creds.clientSecret }), ctx.now);
  },
  async refresh(ctx, t) {
    return oauthTokens(await postForm(ctx, 'whoop', 'https://api.prod.whoop.com/oauth/oauth2/token', { grant_type: 'refresh_token', refresh_token: t.refreshToken!, client_id: ctx.creds.clientId, client_secret: ctx.creds.clientSecret, scope: 'offline' }), ctx.now);
  },
  async afterConnect(ctx, t) {
    const me = await getJson(ctx, 'whoop', `${API}/v2/user/profile/basic`, t.accessToken).catch(() => null);
    return { ...t, vendorUserId: me?.user_id !== undefined ? String(me.user_id) : undefined };
  },
  async revoke(ctx, t) {
    await ctx.fetch(`${API}/v2/user/access`, { method: 'DELETE', headers: { authorization: `Bearer ${t.accessToken}` } }).catch(() => undefined);
  },
  async pull(ctx, t, days) {
    const start = new Date(ctx.now - days * 86400_000).toISOString();
    const [recovery, cycles, sleep, workouts] = await Promise.all([all(ctx, t.accessToken, '/v2/recovery', start), all(ctx, t.accessToken, '/v2/cycle', start), all(ctx, t.accessToken, '/v2/activity/sleep', start), all(ctx, t.accessToken, '/v2/activity/workout', start)]);
    return [fromWhoop(ctx, { recovery, cycles, sleep, workouts })];
  },
  webhook(ctx, req) {
    if (!verifyWhoop(ctx.creds.clientSecret, req.raw, req.headers['x-whoop-signature-timestamp'] || '', req.headers['x-whoop-signature'] || '')) return { ok: false, status: 401 };
    const e = req.body as { user_id?: number | string; type?: string; id?: string };
    return { ok: true, items: e.user_id !== undefined ? [{ vendorUserId: String(e.user_id), kind: String(e.type), payload: { id: e.id } }] : [] };
  },
};
