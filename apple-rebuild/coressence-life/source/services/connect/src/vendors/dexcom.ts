// Dexcom API v3 (G7, G6 and, for Stelo, through Dexcom's partner program). OAuth: /v2/oauth2/login and
// /v2/oauth2/token on api.dexcom.com (sandbox-api.dexcom.com while testing); the only scope is offline_access.
// Access tokens last about 10 minutes. US data arrives with a one-hour delay (three hours outside the US).
// A limited production key allows 5 users; wider release needs Dexcom's partner approval and data license.
// No webhooks: the service pulls when the app syncs.
import type { Batch } from '../schema.ts';
import { emptyBatch, getJson, isoNoMs, oauthTokens, postForm, setDay, type Ctx, type Vendor } from './types.ts';

const host = (ctx: Ctx) => (ctx.cfg.dexcomSandbox ? 'https://sandbox-api.dexcom.com' : ctx.creds.extra.REGION === 'eu' ? 'https://api.dexcom.eu' : ctx.creds.extra.REGION === 'jp' ? 'https://api.dexcom.jp' : 'https://api.dexcom.com');

export function fromDexcom(ctx: Pick<Ctx, 'dayOf' | 'now'>, records: any[]): Batch {
  const b = emptyBatch('dexcom', 'dexcom', ctx.now);
  const readings = records
    .filter((r) => typeof r.value === 'number' && (r.unit === 'mg/dL' || !r.unit))
    .map((r) => ({ t: Date.parse(/[zZ]|[+-]\d\d:?\d\d$/.test(r.systemTime) ? r.systemTime : r.systemTime + 'Z'), mgdl: r.value as number, origin: 'dexcom' as const, path: 'dexcom' as const }))
    .sort((a, c) => a.t - c.t);
  b.events.glucose = readings;
  const byDay: Record<string, number[]> = {};
  for (const r of readings) (byDay[ctx.dayOf(r.t)] ||= []).push(r.mgdl);
  for (const [d, xs] of Object.entries(byDay)) setDay(b, d, { glucoseAvg: Math.round(xs.reduce((a, v) => a + v, 0) / xs.length) });
  return b;
}

export const dexcom: Vendor = {
  id: 'dexcom',
  name: 'Dexcom',
  usesPkce: false,
  authorizeUrl: (ctx, state) => `${host(ctx)}/v2/oauth2/login?${new URLSearchParams({ client_id: ctx.creds.clientId, redirect_uri: ctx.redirectUri, response_type: 'code', scope: 'offline_access', state })}`,
  async exchange(ctx, code) {
    return oauthTokens(await postForm(ctx, 'dexcom', `${host(ctx)}/v2/oauth2/token`, { grant_type: 'authorization_code', code, redirect_uri: ctx.redirectUri, client_id: ctx.creds.clientId, client_secret: ctx.creds.clientSecret }), ctx.now);
  },
  async refresh(ctx, t) {
    return oauthTokens(await postForm(ctx, 'dexcom', `${host(ctx)}/v2/oauth2/token`, { grant_type: 'refresh_token', refresh_token: t.refreshToken!, redirect_uri: ctx.redirectUri, client_id: ctx.creds.clientId, client_secret: ctx.creds.clientSecret }), ctx.now);
  },
  async pull(ctx, t, days) {
    // Query in 30-day windows.
    const out: any[] = [];
    const span = Math.min(days, 90);
    for (let from = ctx.now - span * 86400_000; from < ctx.now; from += 30 * 86400_000) {
      const to = Math.min(ctx.now, from + 30 * 86400_000);
      const j = await getJson(ctx, 'dexcom', `${host(ctx)}/v3/users/self/egvs?startDate=${isoNoMs(from)}&endDate=${isoNoMs(to)}`, t.accessToken);
      out.push(...(j?.records || []));
    }
    return [fromDexcom(ctx, out)];
  },
};
