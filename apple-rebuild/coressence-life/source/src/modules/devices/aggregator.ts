// Optional aggregator path: Terra, Junction (formerly Vital) or ROOK in place of the direct vendor connections,
// behind the same HealthProvider interface. Off by default (CONNECT.aggregator = null). The aggregator's keys live
// only in services/connect; the app asks the service for the aggregator's data already in the shared schema.
// Batches from an aggregator count as copies, so a brand that is also connected directly keeps its direct data.
import { CONNECT } from '@core/appConfig';
import type { HealthProvider } from '../measure/providers/types';
import { mergeBatches } from './merge';
import type { Batch } from './schema';
import { serviceReady } from './cloud';

export type AggregatorId = 'terra' | 'junction' | 'rook';

export const AGGREGATORS: { id: AggregatorId; name: string; summary: string; pricing: string; source: string }[] = [
  {
    id: 'terra',
    name: 'Terra',
    summary: 'One API and widget for most wearables, with webhooks; Apple Health and Health Connect through its mobile SDK.',
    pricing: 'Quick Start from $499 a month billed monthly ($399 billed annually), including 100,000 credits; each connected user costs 200 credits a month.',
    source: 'https://tryterra.co/pricing',
  },
  {
    id: 'junction',
    name: 'Junction (formerly Vital)',
    summary: 'Wearables and lab testing APIs, 300+ device integrations, Link widget for sign-in.',
    pricing: 'Launch plan $300 a month for 1 to 500 connected users (wearables only); Enterprise is custom.',
    source: 'https://www.junction.com/pricing',
  },
  {
    id: 'rook',
    name: 'ROOK',
    summary: 'Wearables data API with health scores, plus a mobile SDK for Apple Health and Health Connect.',
    pricing: 'Core $399 a month up to 750 active users; Core+ $999 up to 5,000; Business $1,999 up to 15,000.',
    source: 'https://www.tryrook.io/pricing',
  },
];

export const aggregatorOn = () => CONNECT.aggregator !== null && serviceReady();

export function aggregatorProvider(id: AggregatorId, session: () => string | null | undefined): HealthProvider {
  const info = AGGREGATORS.find((a) => a.id === id)!;
  return {
    id,
    label: info.name,
    isAvailable: async () => aggregatorOn() && CONNECT.aggregator === id,
    connect: async () => aggregatorOn() && !!session(),
    async fetchBatches(days) {
      const s = session();
      if (!s || !aggregatorOn()) return [];
      const r = await fetch(`${CONNECT.serviceUrl.replace(/\/+$/, '')}/v1/aggregator/${id}/sync?days=${days}`, { headers: { authorization: `Bearer ${s}` } });
      if (!r.ok) return [];
      return ((await r.json()) as { batches: Batch[] }).batches.map((b) => ({ ...b, path: id }));
    },
    async fetchDaily(days) {
      return mergeBatches(await this.fetchBatches(days)).days;
    },
  };
}
