// Brand detection, copied from the app's src/modules/devices/merge.ts (keep the two in step).
import type { BrandId } from './schema.ts';

/** Which brand produced a sample, from its Apple Health bundle id / source name or Health Connect package name. */
export function brandOf(idOrName: string | undefined | null): BrandId {
  const s = String(idOrName || '').toLowerCase();
  if (!s) return 'other';
  const rules: [RegExp, BrandId][] = [
    [/oura/, 'oura'],
    [/whoop/, 'whoop'],
    [/garmin/, 'garmin'],
    [/fitbit/, 'fitbit'],
    [/withings|wiscale|health ?mate|nokia\.health/, 'withings'],
    [/polar/, 'polar'],
    [/dexcom|stelo/, 'dexcom'],
    [/libre|abbott|lingo/, 'libre'],
    [/omron/, 'omron'],
    [/samsung|shealth|\.sec\.android/, 'samsung'],
    [/coros/, 'coros'],
    [/suunto/, 'suunto'],
    [/wahoo/, 'wahoo'],
    [/ultrahuman/, 'ultrahuman'],
    [/eight ?sleep|eightsleep/, 'eightsleep'],
    [/google\.android\.apps\.fitness|google fit|pixel/, 'google'],
    [/^com\.apple\.|apple watch|^iphone|^health$/, 'apple'],
  ];
  for (const [re, b] of rules) if (re.test(s)) return b;
  return 'other';
}
