// App state: a small external store. Each module owns one "slice" (its own key and data shape), so any
// module can later move into its own app with only its slice. Two namespaces keep a person's own data
// ("user") apart from the investor demo profile ("demo"). Everything is saved on the device.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';
import { DEFAULT_SETTINGS, type Settings } from './settingsModel';
import { INVESTOR_DEMO } from './appConfig';

export type Namespace = 'user' | 'demo';

export interface AppState {
  ready: boolean;
  settings: Settings;
  slices: Record<Namespace, Record<string, unknown>>;
  demoDate: string | null;
}

const PREFIX = 'cl:';
let state: AppState = { ready: false, settings: DEFAULT_SETTINGS, slices: { user: {}, demo: {} }, demoDate: null };
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function getState() {
  return state;
}

export function useStore<T>(sel: (s: AppState) => T): T {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => sel(state),
    () => sel(state),
  );
}

export const activeNs = (s: AppState = state): Namespace => (s.settings.demo ? 'demo' : 'user');

// ------------------------------------------------------------------ saving (debounced)
const dirty = new Set<string>();
let timer: ReturnType<typeof setTimeout> | null = null;
function schedule(key: string) {
  dirty.add(key);
  if (timer) clearTimeout(timer);
  timer = setTimeout(flush, 400);
}

export async function flush() {
  if (timer) clearTimeout(timer);
  timer = null;
  const keys = [...dirty];
  dirty.clear();
  for (const k of keys) {
    try {
      if (k === 'settings') await AsyncStorage.setItem(PREFIX + 'settings', JSON.stringify(state.settings));
      else if (k === 'demoDate') await AsyncStorage.setItem(PREFIX + 'demoDate', JSON.stringify(state.demoDate));
      else {
        const [ns, slice] = k.split(':') as [Namespace, string];
        const v = state.slices[ns][slice];
        if (v === undefined) await AsyncStorage.removeItem(PREFIX + k);
        else await AsyncStorage.setItem(PREFIX + k, JSON.stringify(v));
      }
    } catch {
      dirty.add(k);
    }
  }
}

// ------------------------------------------------------------------ slices
export function getSlice<T>(key: string, def: T, ns: Namespace = activeNs()): T {
  const v = state.slices[ns][key] as T | undefined;
  return v === undefined ? def : v;
}

export function useSlice<T>(key: string, def: T): T {
  return useStore((s) => {
    const v = s.slices[activeNs(s)][key] as T | undefined;
    return v === undefined ? def : v;
  });
}

export function updateSlice<T>(key: string, def: T, fn: (cur: T) => T) {
  const ns = activeNs();
  const next = fn(getSlice(key, def, ns));
  state = { ...state, slices: { ...state.slices, [ns]: { ...state.slices[ns], [key]: next } } };
  emit();
  schedule(`${ns}:${key}`);
}

export function patchSettings(patch: Partial<Settings>) {
  state = { ...state, settings: { ...state.settings, ...patch } };
  emit();
  schedule('settings');
}

/** Replace the whole demo namespace (investor sample profile). */
export function setDemoSlices(slices: Record<string, unknown>, date: string) {
  const old = Object.keys(state.slices.demo);
  state = { ...state, slices: { ...state.slices, demo: slices }, demoDate: date };
  emit();
  [...new Set([...old, ...Object.keys(slices)])].forEach((k) => schedule(`demo:${k}`));
  schedule('demoDate');
}

export async function hydrate() {
  try {
    const keys = (await AsyncStorage.getAllKeys()).filter((k) => k.startsWith(PREFIX));
    const pairs = await AsyncStorage.multiGet(keys);
    const slices: AppState['slices'] = { user: {}, demo: {} };
    // The investor web demo starts in the demo profile with the Coressence+ preview on.
    let settings: Settings = INVESTOR_DEMO ? { ...DEFAULT_SETTINGS, onboarded: true, demo: true, previewAll: true, track: 'both' } : DEFAULT_SETTINGS;
    let demoDate: string | null = null;
    for (const [k, raw] of pairs) {
      if (!raw) continue;
      const key = k.slice(PREFIX.length);
      try {
        const v = JSON.parse(raw);
        if (key === 'settings') settings = { ...DEFAULT_SETTINGS, ...v, goals: { ...DEFAULT_SETTINGS.goals, ...(v.goals || {}) }, reminders: { ...DEFAULT_SETTINGS.reminders, ...(v.reminders || {}) } };
        else if (key === 'demoDate') demoDate = v;
        else {
          const [ns, slice] = key.split(':');
          if ((ns === 'user' || ns === 'demo') && slice) slices[ns][slice] = v;
        }
      } catch {
        /* skip a damaged entry */
      }
    }
    state = { ready: true, settings, slices, demoDate };
  } catch {
    state = { ...state, ready: true };
  }
  emit();
}

/** "Delete all my data": every slice, the demo profile and settings. */
export async function wipeAll() {
  try {
    const keys = (await AsyncStorage.getAllKeys()).filter((k) => k.startsWith(PREFIX));
    await AsyncStorage.multiRemove(keys);
  } catch {
    /* nothing stored */
  }
  dirty.clear();
  state = { ready: true, settings: DEFAULT_SETTINGS, slices: { user: {}, demo: {} }, demoDate: null };
  emit();
}
