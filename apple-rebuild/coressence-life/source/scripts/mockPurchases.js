// Test double for react-native-purchases (same method names and result shapes RevenueCat returns).
// Used by the unit tests (tests/billing.test.ts) and injected into the web build by scripts/screenshots.js
// as window.__PURCHASES_MOCK__, so the Pro screen and the gated features can be exercised without a store.
(function (root) {
  function makeMock(catalog, opts) {
    opts = opts || {};
    const st = { ent: {}, subs: [], tx: [], n: 0, listener: null, configured: null };
    // In the browser the stand-in store can keep its "account" across page loads, like a real store account.
    const PK = opts.persistKey;
    const ls = PK && typeof localStorage !== 'undefined' ? localStorage : null;
    if (ls) { try { Object.assign(st, JSON.parse(ls.getItem(PK) || '{}')); } catch (e) {} }
    const save = () => { if (ls) ls.setItem(PK, JSON.stringify({ ent: st.ent, subs: st.subs, tx: st.tx, n: st.n })); };
    const fmt = (p) => (opts.euro ? p.toFixed(2).replace('.', ',') + ' €' : '$' + p.toFixed(2));
    const prods = catalog.map((c) => ({
      identifier: c.product_id, title: c.product_id, description: '', price: c.price_usd, priceString: fmt(c.price_usd),
      currencyCode: opts.euro ? 'EUR' : 'USD', subscriptionPeriod: c.period || null,
      introPrice: c.free_trial_days ? { price: 0, priceString: fmt(0), period: 'P' + c.free_trial_days + 'D', periodUnit: 'DAY', periodNumberOfUnits: c.free_trial_days, cycles: 1 } : null,
      productCategory: c.type === 'auto_renewable_subscription' ? 'SUBSCRIPTION' : 'NON_SUBSCRIPTION', _c: c,
    }));
    const iso = (t) => new Date(t).toISOString();
    const ci = () => ({ entitlements: { active: JSON.parse(JSON.stringify(st.ent)), all: {} }, activeSubscriptions: st.subs.slice(), nonSubscriptionTransactions: st.tx.slice(), managementURL: 'https://apps.apple.com/account/subscriptions' });
    const grant = (c) => {
      const sub = c.type === 'auto_renewable_subscription';
      if (sub) st.subs = [c.product_id];
      for (const e of c.entitlements || [c.entitlement]) st.ent[e] = { identifier: e, isActive: true, productIdentifier: c.product_id, expirationDate: sub ? iso(Date.now() + 30 * 864e5) : null, willRenew: sub };
    };
    const buy = async (prod) => {
      if (opts.cancelNext) { opts.cancelNext = false; const e = new Error('cancelled'); e.userCancelled = true; throw e; }
      if (opts.failNext) { opts.failNext = false; throw new Error('The payment was declined.'); }
      const c = prod._c;
      let t = null;
      grant(c);
      if (c.type !== 'auto_renewable_subscription') { t = { transactionIdentifier: 'tx' + ++st.n, productIdentifier: c.product_id, purchaseDate: iso(Date.now()) }; st.tx.push(t); }
      save();
      const info = ci();
      if (st.listener) setTimeout(() => st.listener(info), 0);
      return { customerInfo: info, productIdentifier: c.product_id, transaction: t };
    };
    if (opts.pro && !Object.keys(st.ent).length) grant(catalog.find((c) => c.period === 'P1Y') || catalog[0]);
    return {
      __isMock: true, _st: st,
      configure: (o) => { st.configured = o; },
      addCustomerInfoUpdateListener: (fn) => { st.listener = fn; },
      getCustomerInfo: async () => ci(),
      getOfferings: async () => {
        const subs = prods.filter((p) => p.productCategory === 'SUBSCRIPTION').map((p) => ({ identifier: '$rc_' + p.identifier, packageType: 'CUSTOM', product: p }));
        return { current: { identifier: 'default', availablePackages: subs }, all: {} };
      },
      getProducts: async (ids) => prods.filter((p) => ids.includes(p.identifier)),
      purchasePackage: async (pkg) => buy(pkg.product),
      purchaseStoreProduct: async (prod) => buy(prod),
      restorePurchases: async () => ci(),
      _expire: () => { st.subs = []; for (const k of Object.keys(st.ent)) if (st.ent[k].expirationDate) delete st.ent[k]; if (st.listener) st.listener(ci()); },
    };
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { makeMock };
  if (root) root.__makePurchasesMock = makeMock;
})(typeof window !== 'undefined' ? window : typeof globalThis !== 'undefined' ? globalThis : null);
