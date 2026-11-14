// Connected devices: which connections are on, and what each one is waiting for (pure; unit-tested).
import type { ConnectionId, ConnectionInfo } from './catalog';
import type { BrandId, MetricKey } from './schema';

export type ConnState = { connected: boolean; since?: number; lastSync?: number | null; message?: string };
export type VendorAvailability = { configured: boolean; approved: boolean };
export type DevicesSlice = {
  conns: Partial<Record<ConnectionId, ConnState>>;
  /** Session issued by the companion service for this install (not a vendor credential). */
  session?: string | null;
  /** Which vendors the companion service has credentials for, as it last reported. */
  vendors?: Partial<Record<ConnectionId, VendorAvailability>>;
  vendorsCheckedAt?: number;
};
export const KEY = 'devices';
export const EMPTY: DevicesSlice = { conns: {} };

export type Status = 'connected' | 'ready' | 'not_connected' | 'waiting_service' | 'waiting_approval' | 'unavailable';
export type StatusView = { status: Status; label: string; tone: 'ok' | 'info' | 'muted' | 'warn' };

export type StatusContext = {
  platform: 'ios' | 'android' | 'web';
  serviceReady: boolean;
  measureSource: 'none' | 'healthkit' | 'healthconnect';
  demo: boolean;
};

export function statusOf(info: ConnectionInfo, s: DevicesSlice, ctx: StatusContext): StatusView {
  const conn = s.conns[info.id];
  if (info.kind === 'platform') {
    const wanted = info.path as 'healthkit' | 'healthconnect';
    if (ctx.measureSource === wanted || conn?.connected) return { status: 'connected', label: info.id === 'samsung' ? 'Connected through Health Connect' : 'Connected', tone: 'ok' };
    const native = wanted === 'healthkit' ? 'ios' : 'android';
    if (ctx.platform !== native && !ctx.demo) return { status: 'unavailable', label: native === 'ios' ? 'On iPhone' : 'On Android', tone: 'muted' };
    return { status: 'not_connected', label: 'Not connected', tone: 'muted' };
  }
  if (info.kind === 'bluetooth') return { status: 'ready', label: ctx.platform === 'web' ? 'Simulated on the web preview' : 'Pair from Move', tone: 'info' };
  if (conn?.connected) return { status: 'connected', label: 'Connected', tone: 'ok' };
  if (ctx.demo) return { status: 'not_connected', label: 'Not connected', tone: 'muted' };
  if (!ctx.serviceReady) return { status: 'waiting_service', label: 'Coming soon', tone: 'info' };
  const v = s.vendors?.[info.id];
  if (!v?.configured || !v.approved) return { status: 'waiting_approval', label: `Waiting for ${info.name.split(' ')[0]} approval`, tone: 'warn' };
  return { status: 'not_connected', label: 'Not connected', tone: 'muted' };
}

/** Which metrics a brand supplied on the most recent day it supplied anything. */
export function suppliedBy(provenance: Record<string, Partial<Record<MetricKey, BrandId>>> | undefined, brand: BrandId, days = 7): MetricKey[] {
  if (!provenance) return [];
  const keys = new Set<MetricKey>();
  for (const d of Object.keys(provenance).sort().slice(-days)) for (const [k, b] of Object.entries(provenance[d])) if (b === brand) keys.add(k as MetricKey);
  return [...keys];
}

export function canConnect(v: StatusView) {
  return v.status === 'not_connected';
}
