// Talking to Coressence Connect (services/connect). The app never sees a vendor client secret or token: it gets a
// sign-in link from the service, the person signs in on the vendor's own page, and the service later hands back
// the already-normalized batches. Apple Health and Health Connect data never goes to the service.
import { CONNECT } from '@core/appConfig';
import type { ConnectionId } from './catalog';
import type { VendorAvailability } from './model';
import type { Batch } from './schema';

export const serviceReady = () => !!CONNECT.serviceUrl;
const url = (p: string) => CONNECT.serviceUrl.replace(/\/+$/, '') + p;

async function call<T>(path: string, init: RequestInit & { session?: string | null } = {}): Promise<T> {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (init.session) headers.authorization = `Bearer ${init.session}`;
  const r = await fetch(url(path), { ...init, headers: { ...headers, ...((init.headers as Record<string, string>) || {}) } });
  if (!r.ok) throw new Error(`Connect ${r.status}`);
  return (await r.json()) as T;
}

/** A session for this install. The service links vendor tokens to it. */
export async function newSession(): Promise<string> {
  const r = await call<{ session: string }>('/v1/session', { method: 'POST', body: '{}' });
  return r.session;
}

export async function vendors(): Promise<Partial<Record<ConnectionId, VendorAvailability>>> {
  const r = await call<{ vendors: Record<string, VendorAvailability> }>('/v1/vendors');
  return r.vendors as Partial<Record<ConnectionId, VendorAvailability>>;
}

/** The vendor sign-in page to open. */
export async function startLink(vendor: ConnectionId, session: string): Promise<string> {
  const r = await call<{ url: string }>(`/v1/connect/${vendor}/start`, { method: 'POST', session, body: JSON.stringify({ returnUrl: CONNECT.returnUrl }) });
  return r.url;
}

export async function connectedVendors(session: string): Promise<{ vendor: ConnectionId; since: number; lastSync: number | null }[]> {
  const r = await call<{ connections: { vendor: ConnectionId; since: number; lastSync: number | null }[] }>('/v1/connections', { session });
  return r.connections;
}

export async function pull(session: string, days: number): Promise<Batch[]> {
  const r = await call<{ batches: Batch[] }>(`/v1/sync?days=${days}`, { session });
  return r.batches;
}

export async function unlink(vendor: ConnectionId, session: string): Promise<void> {
  await call(`/v1/connections/${vendor}`, { method: 'DELETE', session });
}
