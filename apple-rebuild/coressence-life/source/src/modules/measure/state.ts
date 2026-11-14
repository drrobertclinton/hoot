// Measure state and sync. One sync gathers every connected path (Apple Health or Health Connect on the phone,
// the direct vendor connections through Coressence Connect, and the optional aggregator), keeps the last batch
// from each, and merges them with devices/merge.ts so a number is never counted twice.
import { Platform } from 'react-native';
import { CONNECT } from '@core/appConfig';
import { getSlice, updateSlice, useSlice } from '@core/store';
import { EMPTY, KEY, type DayMetrics, type MeasureSlice, type SourceId } from './model';
import { nativeProvider } from './providers/native';
import { mergeBatches } from '../devices/merge';
import type { Batch, PathId } from '../devices/schema';
import { EMPTY as DEVICES_EMPTY, KEY as DEVICES_KEY, type DevicesSlice } from '../devices/model';
import { pull, serviceReady } from '../devices/cloud';
import { aggregatorOn, aggregatorProvider } from '../devices/aggregator';

export const useMeasure = () => useSlice<MeasureSlice>(KEY, EMPTY);
const up = (fn: (s: MeasureSlice) => MeasureSlice) => updateSlice<MeasureSlice>(KEY, EMPTY, fn);

export const provider = nativeProvider;
export const sourceLabel = (id: SourceId) => (id === 'healthkit' ? 'Apple Health' : id === 'healthconnect' ? 'Health Connect' : 'Not connected');
export const platformSourceName = Platform.OS === 'ios' ? 'Apple Health' : Platform.OS === 'android' ? 'Health Connect' : 'Apple Health or Health Connect';

export async function connectSource(): Promise<{ ok: boolean; message: string }> {
  if (!provider) return { ok: false, message: `${platformSourceName} is available in the Coressence Life app for iPhone and Android.` };
  try {
    if (!(await provider.isAvailable())) return { ok: false, message: Platform.OS === 'android' ? 'Health Connect is not installed or needs an update on this phone.' : 'Apple Health is not available on this device.' };
    if (!(await provider.connect())) return { ok: false, message: 'Permission was not granted. You can allow access in your phone settings at any time.' };
    up((s) => ({ ...s, source: provider.id as SourceId }));
    await syncNow();
    return { ok: true, message: `Connected to ${provider.label}.` };
  } catch {
    return { ok: false, message: 'Could not connect right now. Please try again.' };
  }
}

/** Replace the batches from the given paths and redo the merge. */
export function applyBatches(paths: PathId[], fresh: Batch[]) {
  up((cur) => {
    const kept = (cur.batches || []).filter((b) => !paths.includes(b.path));
    const batches = [...kept, ...fresh];
    const m = mergeBatches(batches);
    return { ...cur, batches, synced: m.days, provenance: m.provenance, events: m.events, lastSync: Date.now() };
  });
}

export async function syncNow(days = 90): Promise<boolean> {
  const s = getSlice<MeasureSlice>(KEY, EMPTY);
  const dev = getSlice<DevicesSlice>(DEVICES_KEY, DEVICES_EMPTY);
  const anyCloud = Object.values(dev.conns).some((c) => c?.connected);
  let ok = false;
  const tasks: Promise<void>[] = [];
  if (provider && s.source !== 'none')
    tasks.push(
      provider.fetchBatches(days).then((b) => {
        applyBatches([provider.id as PathId], b);
        ok = true;
      }),
    );
  if (serviceReady() && dev.session && anyCloud)
    tasks.push(
      pull(dev.session, days).then((b) => {
        applyBatches([...new Set(b.map((x) => x.path))], b);
        ok = true;
      }),
    );
  if (aggregatorOn() && CONNECT.aggregator) {
    const agg = aggregatorProvider(CONNECT.aggregator, () => dev.session);
    tasks.push(
      agg.fetchBatches(days).then((b) => {
        applyBatches([agg.id as PathId], b);
        ok = true;
      }),
    );
  }
  const results = await Promise.allSettled(tasks);
  return ok && results.every((r) => r.status === 'fulfilled');
}

/** Stop using the phone's health store. Data from other connections stays. */
export function disconnect() {
  up((s) => {
    const batches = (s.batches || []).filter((b) => b.path !== 'healthkit' && b.path !== 'healthconnect');
    const m = mergeBatches(batches);
    return { ...s, source: 'none', batches, synced: m.days, provenance: m.provenance, events: m.events, lastSync: batches.length ? s.lastSync : null };
  });
}

export function saveManual(date: string, patch: DayMetrics) {
  up((s) => ({ ...s, manual: { ...s.manual, [date]: { ...(s.manual[date] || {}), ...patch } } }));
}
