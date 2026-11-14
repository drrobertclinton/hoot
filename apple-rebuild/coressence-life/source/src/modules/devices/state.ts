// Connected devices state: connect and disconnect the direct vendor connections through Coressence Connect.
// In demo mode connecting is simulated, so the investor demo works with no service and no accounts.
import * as Linking from 'expo-linking';
import { getSlice, updateSlice, useSlice } from '@core/store';
import { getSettings } from '@core/settings';
import type { ConnectionId } from './catalog';
import { EMPTY, KEY, type DevicesSlice } from './model';
import { connectedVendors, newSession, serviceReady, startLink, unlink, vendors } from './cloud';
import { applyBatches, syncNow } from '../measure/state';
import type { PathId } from './schema';

export const useDevices = () => useSlice<DevicesSlice>(KEY, EMPTY);
const up = (fn: (s: DevicesSlice) => DevicesSlice) => updateSlice<DevicesSlice>(KEY, EMPTY, fn);

async function ensureSession(): Promise<string> {
  const s = getSlice<DevicesSlice>(KEY, EMPTY);
  if (s.session) return s.session;
  const session = await newSession();
  up((cur) => ({ ...cur, session }));
  return session;
}

/** Ask the service which vendors it has approved credentials for. Quiet when the service is not set up. */
export async function refreshVendors(): Promise<void> {
  if (!serviceReady() || getSettings().demo) return;
  try {
    const v = await vendors();
    up((s) => ({ ...s, vendors: v, vendorsCheckedAt: Date.now() }));
    const session = getSlice<DevicesSlice>(KEY, EMPTY).session;
    if (session) {
      const list = await connectedVendors(session);
      up((s) => {
        const conns = { ...s.conns };
        for (const c of list) conns[c.vendor] = { connected: true, since: c.since, lastSync: c.lastSync };
        return { ...s, conns };
      });
    }
  } catch {
    // offline or service down: keep what we had
  }
}

export async function connectVendor(id: ConnectionId): Promise<{ ok: boolean; message: string }> {
  if (getSettings().demo) {
    up((s) => ({ ...s, conns: { ...s.conns, [id]: { connected: true, since: Date.now(), lastSync: Date.now() } } }));
    return { ok: true, message: 'Connected (demo).' };
  }
  if (!serviceReady()) return { ok: false, message: 'Direct connections open when the Coressence connection service goes live. Apple Health and Health Connect work now.' };
  try {
    const session = await ensureSession();
    const link = await startLink(id, session);
    await Linking.openURL(link);
    return { ok: true, message: 'Finish signing in on the page that opened, then come back here.' };
  } catch {
    return { ok: false, message: 'Could not start the sign-in right now. Please try again.' };
  }
}

/** Called when the vendor sign-in returns to coressence://devices?connected=<vendor>. */
export async function finishVendor(id: ConnectionId, ok: boolean) {
  if (!ok) return;
  up((s) => ({ ...s, conns: { ...s.conns, [id]: { connected: true, since: Date.now(), lastSync: null } } }));
  await syncNow();
  up((s) => ({ ...s, conns: { ...s.conns, [id]: { ...(s.conns[id] || { connected: true }), lastSync: Date.now() } } }));
}

export async function disconnectVendor(id: ConnectionId): Promise<void> {
  const s = getSlice<DevicesSlice>(KEY, EMPTY);
  if (!getSettings().demo && s.session) {
    try {
      await unlink(id, s.session);
    } catch {
      // removed locally anyway; the service also drops tokens the vendor revokes
    }
  }
  up((cur) => {
    const conns = { ...cur.conns };
    delete conns[id];
    return { ...cur, conns };
  });
  applyBatches([id as PathId], []);
}
