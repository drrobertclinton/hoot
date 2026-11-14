// iOS / Android: the RevenueCat SDK (react-native-purchases). The web build uses purchases.web.ts instead.
import Purchases from 'react-native-purchases';
import type { PurchasesLike } from './billingCore';

export function getPurchases(): PurchasesLike | null {
  return Purchases as unknown as PurchasesLike;
}
