// Withings Public Health Data API. OAuth: https://account.withings.com/oauth2_user/authorize2, token via
// POST https://wbsapi.withings.net/v2/oauth2 (action=requesttoken). Scopes are comma-separated.
// Free "Start for Free" plan: 10 users until Withings reviews the app; Withings says accounts created after
// October 12, 2026 need Withings+ for partner data on that plan.
// Notifications: POST /notify action=subscribe per user (appli 1 weight, 4 blood pressure, 16 activity, 44 sleep).
// Withings does not sign notifications, so the callback URL carries a secret key and the user id must be known.
import type { Batch } from '../schema.ts';
import { emptyBatch, num, postForm, r1, r2, setDay, VendorError, type Ctx, type Vendor } from './types.ts';
import type { Tokens } from '../store.ts';
import { safeEqual } from '../crypto.ts';

const WBS = 'https://wbsapi.withings.net';

async function call(ctx: Ctx, path: string, token: string, params: Record<string, string>) {
  const j = await postForm(ctx, 'withings', `${WBS}${path}`, params, { authorization: `Bearer ${token}` });
  if (j.status !== 0) throw new VendorError('withings', 400, `status ${j.status}`);
  return j.body;
}
const tokensFrom = (body: any, now: number): Tokens => ({ accessToken: body.access_token, refreshToken: body.refresh_token, expiresAt: now + Number(body.expires_in || 10800) * 1000, scope: body.scope, vendorUserId: body.userid !== undefined ? String(body.userid) : undefined });

/** Measure types: 1 weight kg, 5 fat-free mass kg, 6 fat ratio %, 9 diastolic, 10 systolic, 11 heart pulse. */
export function fromWithings(ctx: Pick<Ctx, 'dayOf' | 'minOfDay' | 'now'>, p: { measuregrps: any[]; sleep: any[] }): Batch {
  const b = emptyBatch('withings', 'withings', ctx.now);
  const bp: NonNullable<Batch['events']['bp']> = [];
  for (const g of [...p.measuregrps].sort((x, y) => x.date - y.date)) {
    const t = g.date * 1000;
    const v = (type: number) => {
      const m = (g.measures || []).find((x: any) => x.type === type);
      return m ? m.value * 10 ** m.unit : undefined;
    };
    const day = ctx.dayOf(t);
    setDay(b, day, { weightKg: v(1) !== undefined ? r1(v(1)!) : undefined, leanKg: v(5) !== undefined ? r1(v(5)!) : undefined, bodyFatPct: v(6) !== undefined ? r1(v(6)!) : undefined });
    if (v(10) !== undefined && v(9) !== undefined) bp.push({ t, sys: Math.round(v(10)!), dia: Math.round(v(9)!), pulse: v(11) !== undefined ? Math.round(v(11)!) : undefined, origin: 'withings', path: 'withings' });
  }
  const byDay: Record<string, typeof bp> = {};
  for (const r of bp) (byDay[ctx.dayOf(r.t)] ||= []).push(r);
  for (const [day, xs] of Object.entries(byDay)) setDay(b, day, { systolic: Math.round(xs.reduce((a, r) => a + r.sys, 0) / xs.length), diastolic: Math.round(xs.reduce((a, r) => a + r.dia, 0) / xs.length) });
  b.events.bp = bp;
  for (const s of p.sleep) {
    const d = s.data || {};
    const deep = num(d.deepsleepduration) !== undefined ? r2(d.deepsleepduration / 3600) : undefined;
    const light = num(d.lightsleepduration) !== undefined ? r2(d.lightsleepduration / 3600) : undefined;
    const rem = num(d.remsleepduration) !== undefined ? r2(d.remsleepduration / 3600) : undefined;
    const end = s.enddate * 1000;
    const start = s.startdate * 1000;
    setDay(b, s.date || ctx.dayOf(end), { sleepH: r1((deep || 0) + (light || 0) + (rem || 0)), sleepDeepH: deep, sleepCoreH: light, sleepRemH: rem, sleepAwakeH: num(d.wakeupduration) !== undefined ? r2(d.wakeupduration / 3600) : undefined, restingHr: num(d.hr_min), respRate: num(d.rr_average), bedMin: ctx.minOfDay(start) - (ctx.dayOf(start) !== ctx.dayOf(end) ? 1440 : 0), wakeMin: ctx.minOfDay(end) });
  }
  return b;
}

export const withings: Vendor = {
  id: 'withings',
  name: 'Withings',
  usesPkce: false,
  authorizeUrl: (ctx, state) => `https://account.withings.com/oauth2_user/authorize2?${new URLSearchParams({ response_type: 'code', client_id: ctx.creds.clientId, redirect_uri: ctx.redirectUri, scope: 'user.info,user.metrics,user.activity,user.sleepevents', state })}`,
  async exchange(ctx, code) {
    const j = await postForm(ctx, 'withings', `${WBS}/v2/oauth2`, { action: 'requesttoken', grant_type: 'authorization_code', client_id: ctx.creds.clientId, client_secret: ctx.creds.clientSecret, code, redirect_uri: ctx.redirectUri });
    if (j.status !== 0) throw new VendorError('withings', 400, `status ${j.status}`);
    return tokensFrom(j.body, ctx.now);
  },
  async refresh(ctx, t) {
    const j = await postForm(ctx, 'withings', `${WBS}/v2/oauth2`, { action: 'requesttoken', grant_type: 'refresh_token', client_id: ctx.creds.clientId, client_secret: ctx.creds.clientSecret, refresh_token: t.refreshToken! });
    if (j.status !== 0) throw new VendorError('withings', 400, `status ${j.status}`);
    return tokensFrom(j.body, ctx.now);
  },
  async afterConnect(ctx, t) {
    for (const appli of ['1', '4', '44']) await call(ctx, '/notify', t.accessToken, { action: 'subscribe', callbackurl: ctx.webhookUrl, appli }).catch(() => undefined);
    return t;
  },
  async revoke(ctx, t) {
    for (const appli of ['1', '4', '44']) await call(ctx, '/notify', t.accessToken, { action: 'revoke', callbackurl: ctx.webhookUrl, appli }).catch(() => undefined);
  },
  async pull(ctx, t, days) {
    const startdate = String(Math.floor((ctx.now - days * 86400_000) / 1000));
    const enddate = String(Math.floor(ctx.now / 1000));
    const meas = await call(ctx, '/measure', t.accessToken, { action: 'getmeas', meastypes: '1,5,6,9,10,11', category: '1', startdate, enddate });
    const sleep = await call(ctx, '/v2/sleep', t.accessToken, { action: 'getsummary', startdateymd: new Date(ctx.now - days * 86400_000).toISOString().slice(0, 10), enddateymd: new Date(ctx.now).toISOString().slice(0, 10), data_fields: 'deepsleepduration,lightsleepduration,remsleepduration,wakeupduration,hr_min,rr_average' }).catch(() => ({ series: [] }));
    return [fromWithings(ctx, { measuregrps: meas?.measuregrps || [], sleep: sleep?.series || [] })];
  },
  webhook(ctx, req) {
    const key = ctx.creds.extra.WEBHOOK_TOKEN || '';
    if (!key || !safeEqual(String(req.query.key || ''), key)) return { ok: false, status: 401 };
    if (req.method === 'HEAD' || req.method === 'GET') return { ok: true, reply: '' }; // Withings checks the URL when subscribing
    const f = (typeof req.body === 'object' && req.body ? req.body : Object.fromEntries(new URLSearchParams(req.raw))) as Record<string, string>;
    return { ok: true, items: f.userid ? [{ vendorUserId: String(f.userid), kind: `appli.${f.appli}`, payload: { startdate: f.startdate, enddate: f.enddate } }] : [] };
  },
};
