// Billing store for Coressence Life. Dependencies are injected so the logic can be unit-tested with a mocked
// Purchases module (tests/billing.test.ts). The app wires the real ones in billing.ts.
import { CATALOG, type CatalogProduct, isPlaceholderKey } from './config';
import { type CustomerSnapshot, activeEntitlements, hasAllAccess, snapshotFrom } from './entitlements';

export type PurchasesLike = {
  configure(o: { apiKey: string; appUserID?: string | null }): unknown;
  getCustomerInfo(): Promise<any>;
  getOfferings(): Promise<any>;
  getProducts(ids: string[], type?: any): Promise<any[]>;
  purchasePackage(pkg: any): Promise<any>;
  purchaseStoreProduct(product: any): Promise<any>;
  restorePurchases(): Promise<any>;
  addCustomerInfoUpdateListener(fn: (ci: any) => void): unknown;
};
export type StorageLike = { getItem(k: string): Promise<string | null>; setItem(k: string, v: string): Promise<void> };
export type Mode = 'loading' | 'preview' | 'unconfigured' | 'native';
export type ShopItem = { id: string; catalog: CatalogProduct; title: string; priceString: string; period: string; intro: any; source: 'store' | 'catalog'; pkg?: any; product?: any };
export type BillingState = { mode: Mode; snap: CustomerSnapshot | null; platform: string; version: number };
export type Result = { ok: boolean; cancelled?: boolean; error?: string };

const KEY = 'coressence-purchases-v1';

export function createBilling(deps: { purchases: PurchasesLike | null; platform: string; iosKey: string; androidKey: string; storage: StorageLike; now?: () => number }) {
  const now = deps.now ?? (() => Date.now());
  let state: BillingState = { mode: 'loading', snap: null, platform: deps.platform, version: 0 };
  const listeners = new Set<() => void>();
  let cache: Record<string, ShopItem> | null = null;
  let started: Promise<void> | null = null;

  const set = (patch: Partial<BillingState>) => {
    state = { ...state, ...patch, version: state.version + 1 };
    listeners.forEach((l) => l());
  };
  const apply = (ci: any) => {
    if (!ci) return;
    const snap = snapshotFrom(ci, now());
    set({ snap });
    deps.storage.setItem(KEY, JSON.stringify(snap)).catch(() => {});
  };

  async function init() {
    if (started) return started;
    started = (async () => {
      try {
        const raw = await deps.storage.getItem(KEY);
        if (raw) state = { ...state, snap: JSON.parse(raw) };
      } catch {
        /* no cache */
      }
      const p = deps.purchases;
      if (!p) return set({ mode: 'preview' });
      const key = deps.platform === 'android' ? deps.androidKey : deps.iosKey;
      if (isPlaceholderKey(key) && !(p as any).__isMock) return set({ mode: 'unconfigured' });
      try {
        // Anonymous app user id; no attributes, no attribution, no device identifiers.
        await p.configure({ apiKey: key });
        p.addCustomerInfoUpdateListener((ci) => apply(ci));
        set({ mode: 'native' });
        await refresh();
      } catch {
        set({ mode: 'unconfigured' });
      }
    })();
    return started;
  }

  async function refresh() {
    if (state.mode !== 'native' || !deps.purchases) return;
    try {
      apply(await deps.purchases.getCustomerInfo());
    } catch {
      /* offline: keep the cached snapshot */
    }
  }

  const fallback = (c: CatalogProduct): ShopItem => ({
    id: c.product_id,
    catalog: c,
    title: '',
    priceString: '$' + c.price_usd.toFixed(2),
    period: c.period || '',
    intro: c.free_trial_days ? { price: 0, periodNumberOfUnits: c.free_trial_days, periodUnit: 'DAY', cycles: 1 } : null,
    source: 'catalog',
  });

  async function products(force = false): Promise<Record<string, ShopItem>> {
    await init();
    if (cache && !force) return cache;
    const out: Record<string, ShopItem> = {};
    if (state.mode !== 'native' || !deps.purchases) {
      CATALOG.forEach((c) => (out[c.product_id] = fallback(c)));
      return (cache = out);
    }
    const p = deps.purchases;
    const byId = (id: string) => CATALOG.find((c) => c.product_id === String(id).split(':')[0]);
    try {
      const offs = await p.getOfferings();
      const all = [offs && offs.current, ...Object.values((offs && offs.all) || {})].filter(Boolean) as any[];
      for (const o of all)
        for (const pkg of o.availablePackages || []) {
          const c = byId(pkg.product && pkg.product.identifier);
          if (c && !out[c.product_id]) out[c.product_id] = { id: c.product_id, catalog: c, title: pkg.product.title, priceString: pkg.product.priceString, period: pkg.product.subscriptionPeriod || c.period || '', intro: pkg.product.introPrice || null, source: 'store', pkg, product: pkg.product };
        }
    } catch {
      /* fall through to getProducts */
    }
    const missing = CATALOG.filter((c) => !out[c.product_id]);
    const groups: [string, CatalogProduct[]][] = [
      ['SUBSCRIPTION', missing.filter((c) => c.type === 'auto_renewable_subscription')],
      ['NON_SUBSCRIPTION', missing.filter((c) => c.type !== 'auto_renewable_subscription')],
    ];
    for (const [type, list] of groups) {
      if (!list.length) continue;
      try {
        const prods = await p.getProducts(list.map((c) => c.product_id), type);
        for (const prod of prods || []) {
          const c = byId(prod.identifier);
          if (c && !out[c.product_id]) out[c.product_id] = { id: c.product_id, catalog: c, title: prod.title, priceString: prod.priceString, period: prod.subscriptionPeriod || c.period || '', intro: prod.introPrice || null, source: 'store', product: prod };
        }
      } catch {
        /* unavailable */
      }
    }
    return (cache = out);
  }

  async function purchase(id: string): Promise<Result> {
    await init();
    if (state.mode !== 'native' || !deps.purchases)
      return { ok: false, error: state.mode === 'preview' ? 'Coressence+ is purchased in the Coressence Life app for iPhone and Android.' : 'Purchases are not set up in this build yet.' };
    const item = (await products())[id];
    if (!item) return { ok: false, error: 'This item is not available from the store right now. Please try again later.' };
    try {
      const r = item.pkg ? await deps.purchases.purchasePackage(item.pkg) : await deps.purchases.purchaseStoreProduct(item.product);
      apply(r && r.customerInfo);
      return { ok: true };
    } catch (e: any) {
      if (e && (e.userCancelled || e.code === '1' || e.code === 1)) return { ok: false, cancelled: true };
      return { ok: false, error: (e && e.message) || 'The purchase did not go through.' };
    }
  }

  async function restore(): Promise<Result> {
    await init();
    if (state.mode !== 'native' || !deps.purchases)
      return { ok: false, error: state.mode === 'preview' ? 'Restore Purchases is available in the Coressence Life app.' : 'Purchases are not set up in this build yet.' };
    try {
      apply(await deps.purchases.restorePurchases());
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: (e && e.message) || 'Could not reach the store. Check the connection and try again.' };
    }
  }

  return {
    init,
    refresh,
    products,
    purchase,
    restore,
    getState: () => state,
    subscribe: (l: () => void) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    allAccess: () => hasAllAccess(state.snap, now()),
    entitlements: () => activeEntitlements(state.snap, now()),
    managementURL: () => state.snap?.managementURL || (deps.platform === 'android' ? 'https://play.google.com/store/account/subscriptions' : 'https://apps.apple.com/account/subscriptions'),
  };
}
export type Billing = ReturnType<typeof createBilling>;
