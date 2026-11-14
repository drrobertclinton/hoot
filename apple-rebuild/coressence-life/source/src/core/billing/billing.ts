// The app's billing store: RevenueCat on iOS/Android, a read-only preview on the web.
import { useSyncExternalStore } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { REVENUECAT_ANDROID_KEY, REVENUECAT_IOS_KEY } from './config';
import { createBilling, type BillingState } from './billingCore';
import { getPurchases } from './purchases';
import { useSettings } from '../settings';
import { DEMO_TOOLS, PURCHASES_LIVE } from '../appConfig';

export const billing = createBilling({
  purchases: getPurchases(),
  platform: Platform.OS,
  iosKey: REVENUECAT_IOS_KEY,
  androidKey: REVENUECAT_ANDROID_KEY,
  storage: AsyncStorage,
});

export function useBilling(): BillingState {
  return useSyncExternalStore(billing.subscribe, billing.getState, billing.getState);
}

/** True when Coressence+ All-Access is active, or the investor-demo preview switch is on. */
export function usePremium(): boolean {
  useBilling();
  const preview = useSettings((s) => s.previewAll);
  return !PURCHASES_LIVE || billing.allAccess() || (DEMO_TOOLS && preview);
}

/** Active entitlements, plus the demo preview flag. */
export function useEntitlements(): { ents: Set<string>; preview: boolean } {
  useBilling();
  const preview = useSettings((s) => s.previewAll);
  return { ents: billing.entitlements(), preview: DEMO_TOOLS && preview };
}
