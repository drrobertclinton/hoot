// Turning the investor demo on and off. The demo profile lives in its own namespace, so a person's own data
// is never touched; switching off returns to it exactly as it was.
import { dayKey } from '@core/dates';
import { getState, setDemoSlices } from '@core/store';
import { setSettings } from '@core/settings';
import { generateDemo } from './generate';

/** Make sure the demo profile exists and is current for today. */
export function ensureDemoFresh(force = false) {
  const st = getState();
  const today = dayKey();
  if (force || st.demoDate !== today || !Object.keys(st.slices.demo).length) setDemoSlices(generateDemo(Date.now()), today);
}

export function setDemo(on: boolean) {
  if (on) ensureDemoFresh();
  setSettings({ demo: on, ...(on ? {} : { previewAll: false }) });
}
