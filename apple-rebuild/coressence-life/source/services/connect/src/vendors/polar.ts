// Polar AccessLink API v3. OAuth: https://flow.polar.com/oauth2/authorization, token
// https://polarremote.com/v2/oauth2/token (Basic auth with client id and secret). After sign-in the user must be
// registered with POST /v3/users. Access tokens do not expire until revoked. Clients are created at
// https://admin.polaraccesslink.com/ by any registered Polar Flow user.
// One webhook per client; Polar-Webhook-Signature = hex HMAC-SHA256 of the body with the key returned when the
// webhook was created (set it as POLAR_WEBHOOK_SECRET).
import { verifyPolar } from '../crypto.ts';
import type { Batch } from '../schema.ts';
import { emptyBatch, getJson, num, r1, r2, setDay, VendorError, type Ctx, type Vendor } from './types.ts';

const API = 'https://www.polaraccesslink.com/v3';

/** ISO 8601 duration ("PT1H2M3.5S") to minutes. */
export function isoMinutes(d: string | undefined): number {
  const m = /P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:([\d.]+)S)?/.exec(d || '');
  if (!m) return 0;
  return (Number(m[1] || 0) * 1440 + Number(m[2] || 0) * 60 + Number(m[3] || 0) + Number(m[4] || 0) / 60);
}

const SPORT: Record<string, ['run' | 'cycle' | 'walk' | 'strength' | 'yoga' | 'swim' | 'cardio' | 'other', string]> = {
  RUNNING: ['run', 'Run'],
  CYCLING: ['cycle', 'Ride'],
  WALKING: ['walk', 'Walk'],
  HIKING: ['walk', 'Hike'],
  STRENGTH_TRAINING: ['strength', 'Strength'],
  YOGA: ['yoga', 'Yoga'],
  SWIMMING: ['swim', 'Swim'],
};

export function fromPolar(ctx: Pick<Ctx, 'dayOf' | 'minOfDay' | 'now'>, p: { exercises: any[]; nights: any[]; recharges: any[] }): Batch {
  const b = emptyBatch('polar', 'polar', ctx.now);
  for (const n of p.nights) {
    const start = Date.parse(n.sleep_start_time);
    const end = Date.parse(n.sleep_end_time);
    const h = (s: number | undefined) => (typeof s === 'number' ? r2(s / 3600) : undefined);
    const deep = h(n.deep_sleep) ?? 0;
    const light = h(n.light_sleep) ?? 0;
    const rem = h(n.rem_sleep) ?? 0;
    setDay(b, n.date || ctx.dayOf(end), { sleepH: r1(deep + light + rem), sleepDeepH: deep, sleepCoreH: light, sleepRemH: rem, sleepAwakeH: h(n.total_interruption_duration), bedMin: ctx.minOfDay(start) - (ctx.dayOf(start) !== ctx.dayOf(end) ? 1440 : 0), wakeMin: ctx.minOfDay(end) });
  }
  for (const r of p.recharges) setDay(b, r.date, { hrvRmssd: num(r.heart_rate_variability_avg), hrv: num(r.heart_rate_variability_avg), restingHr: num(r.heart_rate_avg), respRate: num(r.breathing_rate_avg) !== undefined ? r1(r.breathing_rate_avg) : undefined });
  b.events.workouts = p.exercises.map((e) => {
    const start = Date.parse(e.start_time);
    const [type, label] = SPORT[String(e.sport)] ?? ['other', String(e.detailed_sport_info || e.sport || 'Workout').replace(/_/g, ' ').toLowerCase().replace(/^\w/, (x: string) => x.toUpperCase())];
    return { id: `polar-${e.id}`, origin: 'polar' as const, path: 'polar' as const, start, end: start + isoMinutes(e.duration) * 60_000, type, label, kcal: num(e.calories), distanceKm: num(e.distance) !== undefined ? r1(e.distance / 1000) : undefined, avgHr: num(e.heart_rate?.average), maxHr: num(e.heart_rate?.maximum), vendorLoad: num(e.training_load_pro?.['cardio-load']) ?? num(e.training_load) };
  });
  return b;
}

const basic = (ctx: Ctx) => 'Basic ' + Buffer.from(`${ctx.creds.clientId}:${ctx.creds.clientSecret}`).toString('base64');

export const polar: Vendor = {
  id: 'polar',
  name: 'Polar',
  usesPkce: false,
  authorizeUrl: (ctx, state) => `https://flow.polar.com/oauth2/authorization?${new URLSearchParams({ response_type: 'code', client_id: ctx.creds.clientId, redirect_uri: ctx.redirectUri, state })}`,
  async exchange(ctx, code) {
    const r = await ctx.fetch('https://polarremote.com/v2/oauth2/token', { method: 'POST', headers: { authorization: basic(ctx), 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json;charset=UTF-8' }, body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: ctx.redirectUri }).toString() });
    if (!r.ok) throw new VendorError('polar', r.status, await r.text());
    const j = await r.json();
    return { accessToken: j.access_token, vendorUserId: j.x_user_id !== undefined ? String(j.x_user_id) : undefined };
  },
  async afterConnect(ctx, t) {
    const r = await ctx.fetch(`${API}/users`, { method: 'POST', headers: { authorization: `Bearer ${t.accessToken}`, 'content-type': 'application/json', accept: 'application/json' }, body: JSON.stringify({ 'member-id': t.vendorUserId || `cl-${ctx.now}` }) });
    if (!r.ok && r.status !== 409) throw new VendorError('polar', r.status, 'user registration');
    return t;
  },
  async revoke(ctx, t) {
    if (t.vendorUserId) await ctx.fetch(`${API}/users/${t.vendorUserId}`, { method: 'DELETE', headers: { authorization: `Bearer ${t.accessToken}` } }).catch(() => undefined);
  },
  async pull(ctx, t) {
    const [exercises, sleep, recharge] = await Promise.all([
      getJson(ctx, 'polar', `${API}/exercises`, t.accessToken).catch(() => []),
      getJson(ctx, 'polar', `${API}/users/sleep`, t.accessToken).catch(() => null),
      getJson(ctx, 'polar', `${API}/users/nightly-recharge`, t.accessToken).catch(() => null),
    ]);
    return [fromPolar(ctx, { exercises: Array.isArray(exercises) ? exercises : [], nights: sleep?.nights || [], recharges: recharge?.recharges || [] })];
  },
  webhook(ctx, req) {
    const secret = ctx.creds.extra.WEBHOOK_SECRET || '';
    if (req.headers['polar-webhook-event'] === 'PING') return { ok: true, reply: '' };
    if (!secret || !verifyPolar(secret, req.raw, req.headers['polar-webhook-signature'] || '')) return { ok: false, status: 401 };
    const e = req.body as { user_id?: number | string; event?: string; entity_id?: string };
    return { ok: true, items: e.user_id !== undefined ? [{ vendorUserId: String(e.user_id), kind: String(e.event), payload: { entity_id: e.entity_id } }] : [] };
  },
};
