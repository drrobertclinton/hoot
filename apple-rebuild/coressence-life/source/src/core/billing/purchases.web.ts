// Web preview: no purchases on the web (Coressence+ shows US prices and "Get the app").
// Automated tests may inject a stand-in store as window.__PURCHASES_MOCK__ (scripts/mockPurchases.js).
import type { PurchasesLike } from './billingCore';

export function getPurchases(): PurchasesLike | null {
  const g = globalThis as unknown as { __PURCHASES_MOCK__?: PurchasesLike };
  return g.__PURCHASES_MOCK__ ?? null;
}
