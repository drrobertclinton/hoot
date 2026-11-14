import type { VendorId } from '../config.ts';
import { dexcom } from './dexcom.ts';
import { fitbit } from './fitbit.ts';
import { garmin } from './garmin.ts';
import { oura } from './oura.ts';
import { polar } from './polar.ts';
import type { Vendor } from './types.ts';
import { whoop } from './whoop.ts';
import { withings } from './withings.ts';

export const ADAPTERS: Record<VendorId, Vendor> = { oura, whoop, garmin, fitbit, withings, polar, dexcom };
