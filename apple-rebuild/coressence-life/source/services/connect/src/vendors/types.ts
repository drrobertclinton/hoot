// The shape every vendor adapter follows, plus small helpers shared by them.
import type { Config, VendorCreds, VendorId } from '../config.ts';
import type { InboxItem, Tokens } from '../store.ts';
import type { Batch, DayMetrics } from '../schema.ts';

export type Ctx = {
  cfg: Config;
  creds: VendorCreds;
  redirectUri: string;
  webhookUrl: string;
  fetch: typeof fetch;
  /** Local calendar day (YYYY-MM-DD) in the member's time zone. */
  dayOf: (t: number) => string;
  /** Minutes after local midnight. */
  minOfDay: (t: number) => number;
  now: number;
};

export type WebhookRequest = { method: string; raw: string; headers: Record<string, string | undefined>; query: Record<string, string | undefined>; body: unknown };
export type WebhookResult = { ok: boolean; status?: number; reply?: unknown; items?: { vendorUserId: string; kind: string; payload: unknown }[] };

export interface Vendor {
  id: VendorId;
  name: string;
  usesPkce: boolean;
  authorizeUrl(ctx: Ctx, state: string, challenge?: string): string;
  exchange(ctx: Ctx, code: string, verifier?: string): Promise<Tokens>;
  refresh?(ctx: Ctx, t: Tokens): Promise<Tokens>;
  /** Steps a vendor needs right after sign-in (register the user, subscribe to notifications, look up the user id). */
  afterConnect?(ctx: Ctx, t: Tokens): Promise<Tokens>;
  revoke?(ctx: Ctx, t: Tokens): Promise<void>;
  pull(ctx: Ctx, t: Tokens, days: number, inbox: InboxItem[]): Promise<Batch[]>;
  webhook?(ctx: Ctx, req: WebhookRequest): WebhookResult;
}

export function makeDayFns(tz: string) {
  let fmt: Intl.DateTimeFormat;
  try {
    fmt = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  } catch {
    fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'UTC', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  }
  const parts = (t: number) => Object.fromEntries(fmt.formatToParts(new Date(t)).map((p) => [p.type, p.value]));
  return {
    dayOf: (t: number) => {
      const p = parts(t);
      return `${p.year}-${p.month}-${p.day}`;
    },
    minOfDay: (t: number) => {
      const p = parts(t);
      return Number(p.hour) * 60 + Number(p.minute);
    },
  };
}

export class VendorError extends Error {
  constructor(public vendor: string, public status: number, msg: string) {
    super(`${vendor}: ${status} ${msg}`);
  }
}

export async function postForm(ctx: Ctx, vendor: string, url: string, params: Record<string, string>, headers: Record<string, string> = {}) {
  const r = await ctx.fetch(url, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json', ...headers }, body: new URLSearchParams(params).toString() });
  const text = await r.text();
  if (!r.ok) throw new VendorError(vendor, r.status, text.slice(0, 200));
  return text ? JSON.parse(text) : {};
}

export async function getJson(ctx: Ctx, vendor: string, url: string, token: string, headers: Record<string, string> = {}) {
  const r = await ctx.fetch(url, { headers: { authorization: `Bearer ${token}`, accept: 'application/json', ...headers } });
  if (r.status === 204) return null;
  const text = await r.text();
  if (!r.ok) throw new VendorError(vendor, r.status, text.slice(0, 200));
  return text ? JSON.parse(text) : null;
}

export function oauthTokens(j: any, now: number): Tokens {
  return { accessToken: j.access_token, refreshToken: j.refresh_token, expiresAt: j.expires_in ? now + Number(j.expires_in) * 1000 : undefined, scope: j.scope };
}

export const ymd = (t: number) => new Date(t).toISOString().slice(0, 10);
export const isoNoMs = (t: number) => new Date(t).toISOString().slice(0, 19);
export const r1 = (x: number) => Math.round(x * 10) / 10;
export const r2 = (x: number) => Math.round(x * 100) / 100;
export const hours = (sec: number | undefined | null) => (typeof sec === 'number' ? r2(sec / 3600) : undefined);
export const num = (x: unknown) => (typeof x === 'number' && Number.isFinite(x) ? x : undefined);

export function emptyBatch(path: Batch['path'], origin: Batch['origin'], now: number): Batch {
  return { path, origin, fetchedAt: now, days: {}, events: {} };
}
export function setDay(b: Batch, day: string, patch: DayMetrics) {
  const clean = Object.fromEntries(Object.entries(patch).filter(([, v]) => typeof v === 'number' && Number.isFinite(v)));
  if (Object.keys(clean).length) b.days[day] = { ...(b.days[day] || {}), ...clean };
}
/** Change from the average of the values given (for vendors that report absolute skin temperature). */
export function deviations(vals: { day: string; v: number }[]): { day: string; v: number }[] {
  if (vals.length < 7) return [];
  const base = vals.reduce((a, x) => a + x.v, 0) / vals.length;
  return vals.map((x) => ({ day: x.day, v: r2(x.v - base) }));
}
