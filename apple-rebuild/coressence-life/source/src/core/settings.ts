// App-wide settings (not part of any one module). Stored with the rest of the app data on the device.
import { useStore, getState, patchSettings } from './store';
import type { Settings, Goals } from './settingsModel';
export * from './settingsModel';

export function useSettings<T>(sel: (s: Settings) => T): T {
  return useStore((st) => sel(st.settings));
}

export function getSettings(): Settings {
  return getState().settings;
}

export function setSettings(patch: Partial<Settings>) {
  patchSettings(patch);
}

export function setGoals(patch: Partial<Goals>) {
  patchSettings({ goals: { ...getSettings().goals, ...patch } });
}
