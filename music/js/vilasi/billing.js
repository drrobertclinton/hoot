// Vilasi billing runtime: connects the core to RevenueCat (@revenuecat/purchases-capacitor)
// inside the iOS and Android apps. In a normal browser it runs in "web preview" mode:
// the same plans are shown with catalog prices, and buying is left to the phone apps.
import { createCore, localStore, baseProductId } from './billing-core.js';

function plugin() {
  const C = window.Capacitor;
  if (!C || !C.isNativePlatform || !C.isNativePlatform()) return null;
  try { return (C.Plugins && C.Plugins.Purchases) || (C.registerPlugin && C.registerPlugin('Purchases')) || null; } catch { return null; }
}
const platform = () => { try { return window.Capacitor.getPlatform(); } catch { return 'web'; } };

const PERIOD_WORD = { P1W: 'week', P1M: 'month', P3M: '3 months', P6M: '6 months', P1Y: 'year' };
const UNIT_WORD = { DAY: 'day', WEEK: 'week', MONTH: 'month', YEAR: 'year' };
export const periodWord = (iso) => PERIOD_WORD[iso] || (iso ? iso.replace(/^P/, '').toLowerCase() : '');
function introOf(sp) {
  const ip = sp && sp.introPrice;
  if (!ip) return null;
  const n = ip.periodNumberOfUnits || 1, unit = UNIT_WORD[ip.periodUnit] || 'day';
  const span = unit === 'week' ? `${n * 7}-day` : `${n}-${unit}`;
  return { free: Number(ip.price) === 0, priceString: ip.priceString, span, periodText: `${n} ${unit}${n === 1 ? '' : 's'}`, firstText: n === 1 ? unit : `${n} ${unit}s` };
}
const money = (n) => '$' + Number(n).toFixed(2);

export function createBilling(config) {
  const core = createCore({ config, storage: localStore(`vb.${config.appKey}.`) });
  const P = plugin();
  const os = platform();
  const key = os === 'ios' ? config.REVENUECAT_IOS_KEY : os === 'android' ? config.REVENUECAT_ANDROID_KEY : '';
  const mode = !P ? 'preview' : key ? 'native' : 'unconfigured';
  let ready = null, products = null, managementURL = null, eligibility = {};

  async function refreshCustomer() {
    if (mode !== 'native') return;
    try { const r = await P.getCustomerInfo(); const ci = r && (r.customerInfo || r); if (ci && ci.entitlements) { managementURL = ci.managementURL || null; core.applyCustomerInfo(ci); } } catch (e) { console.warn('customer info unavailable', e && e.message); }
  }

  function init() {
    if (ready) return ready;
    ready = (async () => {
      if (mode !== 'native') return mode;
      try {
        // Anonymous App User ID for now. When Vilasi accounts exist, pass the account id here (and call logIn).
        await P.configure({ apiKey: key });
        try { await P.addCustomerInfoUpdateListener((ci) => { if (ci && ci.entitlements) { managementURL = ci.managementURL || null; core.applyCustomerInfo(ci); } }); } catch { /* optional */ }
        await refreshCustomer();
        document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') refreshCustomer(); });
      } catch (e) { console.warn('purchases setup failed', e && e.message); }
      return mode;
    })();
    return ready;
  }

  function catalogEntry(p) {
    const sub = p.type === 'auto_renewable_subscription';
    let intro = p.free_trial_days ? { free: true, span: `${p.free_trial_days}-day`, periodText: `${p.free_trial_days} days`, fromCatalog: true } : null;
    if (!intro && p.intro && config.launchOffer && config.launchOffer.enabled) {
      const n = p.intro.periods || 1, u = p.intro.unit || 'month';
      intro = { free: false, priceString: money(p.intro.price_usd), price: p.intro.price_usd, span: `${n}-${u}`, periodText: `${n} ${u}${n === 1 ? '' : 's'}`, firstText: n === 1 ? u : `${n} ${u}s`, fromCatalog: true };
    }
    return { id: p.id, type: p.type, title: p.title || '', priceString: money(p.price_usd), price: p.price_usd, period: sub ? p.period : null, intro, source: 'catalog' };
  }

  /** Map of productId -> display info. Store prices in the app; catalog prices in web preview. */
  async function loadProducts() {
    if (products) return products;
    await init();
    const map = {};
    if (mode !== 'native') { for (const p of core.catalog) map[p.id] = catalogEntry(p); return (products = map); }
    try {
      const offerings = await P.getOfferings();
      const all = Object.values((offerings && offerings.all) || {});
      if (offerings && offerings.current && !all.includes(offerings.current)) all.push(offerings.current);
      for (const off of all) for (const pkg of (off && off.availablePackages) || []) {
        const sp = pkg && pkg.product; if (!sp) continue;
        const id = baseProductId(sp.identifier);
        if (!core.byId[id] || map[id]) continue;
        map[id] = { id, type: core.byId[id].type, title: sp.title, priceString: sp.priceString, price: sp.price, period: sp.subscriptionPeriod || core.byId[id].period || null, intro: introOf(sp), pkg, source: 'store' };
      }
    } catch (e) { console.warn('offerings unavailable', e && e.message); }
    const missing = core.catalog.filter((p) => !map[p.id] && p.type !== 'auto_renewable_subscription').map((p) => p.id);
    if (missing.length) {
      try {
        const r = await P.getProducts({ productIdentifiers: missing, type: 'NON_SUBSCRIPTION' });
        for (const sp of (r && r.products) || []) {
          const id = baseProductId(sp.identifier); if (!core.byId[id]) continue;
          map[id] = { id, type: core.byId[id].type, title: sp.title, priceString: sp.priceString, price: sp.price, period: null, intro: null, product: sp, source: 'store' };
        }
      } catch (e) { console.warn('products unavailable', e && e.message); }
    }
    if (os === 'ios') {
      const subs = Object.values(map).filter((x) => x.intro).map((x) => x.id);
      if (subs.length) { try { eligibility = (await P.checkTrialOrIntroductoryPriceEligibility({ productIdentifiers: subs })) || {}; } catch { eligibility = {}; } }
    }
    for (const x of Object.values(map)) { const e = eligibility[x.id]; if (x.intro && e && Number(e.status) === 1) x.intro = null; }
    return (products = map);
  }

  const isCancel = (e) => !!e && (e.userCancelled === true || String(e.code) === '1' || /cancel/i.test(String(e.message || e.errorMessage || '')));

  async function purchase(productId) {
    if (mode !== 'native') return { ok: false, reason: mode };
    const map = await loadProducts();
    const x = map[productId];
    if (!x) return { ok: false, reason: 'unavailable' };
    try {
      const r = x.pkg ? await P.purchasePackage({ aPackage: x.pkg }) : await P.purchaseStoreProduct({ product: x.product });
      const ci = r && r.customerInfo;
      if (ci) { managementURL = ci.managementURL || managementURL; core.applyCustomerInfo(ci); }
      else await refreshCustomer();
      return { ok: true };
    } catch (e) {
      if (isCancel(e)) return { ok: false, reason: 'cancelled' };
      return { ok: false, reason: 'error', message: (e && (e.message || e.errorMessage)) || 'The purchase did not go through.' };
    }
  }

  async function restore() {
    if (mode !== 'native') return { ok: false, reason: mode };
    try {
      const r = await P.restorePurchases();
      const ci = r && (r.customerInfo || r);
      if (ci && ci.entitlements) { managementURL = ci.managementURL || managementURL; core.applyCustomerInfo(ci); }
      return { ok: true, active: [...core.active()] };
    } catch (e) { return { ok: false, reason: 'error', message: (e && e.message) || 'Restore did not finish.' }; }
  }

  return {
    ...core, mode, platform: os, init, loadProducts, purchase, restore, refresh: refreshCustomer,
    get managementURL() { return managementURL; },
    storeName: os === 'android' ? 'Google Play' : 'App Store',
  };
}
