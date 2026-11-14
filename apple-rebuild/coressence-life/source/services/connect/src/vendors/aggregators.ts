// Optional single-integration path: Terra, Junction (formerly Vital) or ROOK instead of the direct connections.
// Off unless AGGREGATOR and AGGREGATOR_API_KEY are set. This is a starting point, not a finished integration:
// each aggregator has its own sign-in widget and user ids, which get wired in once a contract is signed.
// The mapping below follows Terra's published data models; confirm field names in the sandbox before use.
// Published pricing (checked 2026-10-23): Terra Quick Start from $499/month (100,000 credits; 200 credits per
// connected user per month), https://tryterra.co/pricing . Junction Launch $300/month for 1 to 500 connected
// users, https://www.junction.com/pricing . ROOK Core $399/month up to 750 active users, https://www.tryrook.io/pricing .
import type { AggregatorId, Config } from '../config.ts';
import type { Batch, BrandId } from '../schema.ts';
import { brandOf } from '../merge-lite.ts';
import { emptyBatch, num, r1, r2, setDay, type Ctx } from './types.ts';

export type AggregatorUser = { id: string; provider: string };

/** Terra "sleep" and "daily" objects to batches, one per underlying provider (so merge rules still apply). */
export function fromTerra(ctx: Pick<Ctx, 'dayOf' | 'now'>, provider: string, p: { sleep: any[]; daily: any[] }): Batch {
  const origin: BrandId = brandOf(provider);
  const b = { ...emptyBatch('terra', origin, ctx.now) };
  for (const s of p.sleep) {
    const end = Date.parse(s.metadata?.end_time);
    const a = s.sleep_durations_data?.asleep || {};
    const h = (x: unknown) => (typeof x === 'number' ? r2(x / 3600) : undefined);
    setDay(b, ctx.dayOf(end), { sleepH: h(a.duration_asleep_state_seconds) !== undefined ? r1(a.duration_asleep_state_seconds / 3600) : undefined, sleepDeepH: h(a.duration_deep_sleep_state_seconds), sleepRemH: h(a.duration_REM_sleep_state_seconds), sleepCoreH: h(a.duration_light_sleep_state_seconds), hrvRmssd: num(s.heart_rate_data?.summary?.avg_hrv_rmssd), restingHr: num(s.heart_rate_data?.summary?.resting_hr_bpm) });
  }
  for (const d of p.daily) setDay(b, ctx.dayOf(Date.parse(d.metadata?.start_time)), { steps: num(d.distance_data?.steps), activeKcal: num(d.calories_data?.net_activity_calories) !== undefined ? Math.round(d.calories_data.net_activity_calories) : undefined, restingHr: num(d.heart_rate_data?.summary?.resting_hr_bpm) });
  for (const x of Object.values(b.days)) if (x.hrvRmssd !== undefined) x.hrv = x.hrvRmssd;
  return b;
}

export async function aggregatorPull(id: AggregatorId, cfg: Config, ctx: Ctx, users: AggregatorUser[], days: number): Promise<Batch[]> {
  if (!cfg.aggregator || cfg.aggregator.id !== id) return [];
  const start = new Date(ctx.now - days * 86400_000).toISOString().slice(0, 10);
  const end = new Date(ctx.now).toISOString().slice(0, 10);
  if (id === 'terra') {
    const base = cfg.aggregator.baseUrl || 'https://api.tryterra.co/v2';
    const headers = { 'dev-id': cfg.aggregator.devId || '', 'x-api-key': cfg.aggregator.apiKey };
    const out: Batch[] = [];
    for (const u of users) {
      const get = async (type: string) => {
        const r = await ctx.fetch(`${base}/${type}?${new URLSearchParams({ user_id: u.id, start_date: start, end_date: end, to_webhook: 'false' })}`, { headers });
        return r.ok ? ((await r.json()).data as any[]) || [] : [];
      };
      out.push(fromTerra(ctx, u.provider, { sleep: await get('sleep'), daily: await get('daily') }));
    }
    return out;
  }
  // Junction and ROOK: add their summary endpoints here after signing up (see README, "Aggregator path").
  return [];
}
