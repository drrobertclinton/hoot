// Vilasi billing core. Pure logic with no DOM and no store SDK, so it can be unit-tested.
// Entitlements: which paid features are unlocked (from the store's customer info, with a
// cached copy so the app keeps working offline). Counters: free-tier limits, daily and
// monthly allowances, and purchased credits, all kept on this device.

const DAY_MS = 86400000;

export function memoryStorage() {
  const m = new Map();
  return { get: (k) => (m.has(k) ? JSON.parse(m.get(k)) : null), set: (k, v) => { m.set(k, JSON.stringify(v)); }, remove: (k) => { m.delete(k); } };
}

export function localStore(prefix) {
  const mem = memoryStorage();
  const ls = (() => { try { const t = '__vb_t'; localStorage.setItem(t, '1'); localStorage.removeItem(t); return localStorage; } catch { return null; } })();
  return {
    get(k) { if (!ls) return mem.get(prefix + k); try { const v = ls.getItem(prefix + k); return v == null ? null : JSON.parse(v); } catch { return null; } },
    set(k, v) { if (!ls) return mem.set(prefix + k, v); try { ls.setItem(prefix + k, JSON.stringify(v)); } catch { mem.set(prefix + k, v); } },
    remove(k) { if (!ls) return mem.remove(prefix + k); try { ls.removeItem(prefix + k); } catch { /* ignore */ } },
  };
}

const pad = (n) => String(n).padStart(2, '0');
export function dayKey(t) { const d = new Date(t); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
export function monthKey(t) { const d = new Date(t); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; }

/** Strip an Android base-plan suffix ("id:monthly") so store ids match the catalog. */
export const baseProductId = (id) => String(id || '').split(':')[0];

export function createCore({ config, storage = memoryStorage(), now = () => Date.now() }) {
  const grants = config.grants || {};
  const catalog = config.products || [];
  const byId = Object.fromEntries(catalog.map((p) => [p.id, p]));
  const listeners = new Set();
  const emit = () => listeners.forEach((fn) => { try { fn(); } catch (e) { console.warn(e); } });

  // ---------- entitlements ----------
  function expand(ids) {
    const out = new Set();
    const walk = (id) => { if (out.has(id)) return; out.add(id); (grants[id] || []).forEach(walk); };
    [...ids].forEach(walk);
    return out;
  }

  // Cached map { entitlementId: expiresAtMs | null (never) } from the last customer info.
  function cached() { return storage.get('ent') || {}; }
  function activeRaw() {
    // A short grace period covers a renewal that happened while the phone was offline.
    const t = now(), grace = (config.offlineGraceDays ?? 3) * DAY_MS;
    return Object.entries(cached()).filter(([, exp]) => exp == null || exp + grace > t).map(([id]) => id);
  }
  function active() { return expand(activeRaw()); }
  const has = (ent) => !!ent && active().has(ent);

  /** Feed a RevenueCat CustomerInfo object. Returns the expanded active set. */
  function applyCustomerInfo(ci) {
    if (!ci || typeof ci !== 'object') return active();
    const ents = {};
    const act = (ci.entitlements && ci.entitlements.active) || {};
    for (const [id, e] of Object.entries(act)) {
      if (!e || e.isActive === false) continue;
      const exp = e.expirationDateMillis != null ? Number(e.expirationDateMillis) : e.expirationDate ? Date.parse(e.expirationDate) : null;
      ents[id] = Number.isFinite(exp) ? exp : null;
    }
    // Owned one-time unlocks also count if the entitlement was not attached in the dashboard.
    const txs = Array.isArray(ci.nonSubscriptionTransactions) ? ci.nonSubscriptionTransactions : [];
    const owned = new Set([...(ci.allPurchasedProductIdentifiers || []), ...txs.map((t) => t && (t.productIdentifier || t.productId))].map(baseProductId));
    for (const pid of owned) { const p = byId[pid]; if (p && p.type === 'non_consumable' && p.entitlement) ents[p.entitlement] = null; }
    storage.set('ent', ents);
    storage.set('entAt', now());
    creditTransactions(txs);
    emit();
    return active();
  }

  // ---------- consumable credits ----------
  function credits(kind) { return (storage.get('credits') || {})[kind] || 0; }
  function setCredits(kind, n) { const c = storage.get('credits') || {}; c[kind] = Math.max(0, n); storage.set('credits', c); }
  /** Credit each consumable transaction exactly once (ledger of transaction ids). */
  function creditTransactions(txs) {
    const seen = new Set(storage.get('ledger') || []);
    let changed = false;
    for (const t of txs || []) {
      if (!t) continue;
      const pid = baseProductId(t.productIdentifier || t.productId);
      const tid = String(t.transactionIdentifier || t.transactionId || t.revenueCatId || '');
      const p = byId[pid];
      if (!p || p.type !== 'consumable' || !p.grants || !tid || seen.has(tid)) continue;
      for (const [kind, amount] of Object.entries(p.grants)) setCredits(kind, credits(kind) + amount);
      seen.add(tid); changed = true;
    }
    if (changed) storage.set('ledger', [...seen]);
    return changed;
  }

  // ---------- free-tier limits ----------
  // config.limits: { name: { free: n, unlockedBy: 'entitlement' } }  ("Up to 50 bottles")
  function limitOf(name) {
    const L = (config.limits || {})[name];
    if (!L) return Infinity;
    if (L.unlockedBy && has(L.unlockedBy)) return Infinity;
    return L.free;
  }
  const canAdd = (name, current, adding = 1) => current + adding <= limitOf(name);

  // config.quotas: { name: { period: 'day'|'month'|'life', free: n, unlockedBy, paid?: { entitlement, amount } } }
  function periodKey(period) { const t = now(); return period === 'day' ? dayKey(t) : period === 'month' ? monthKey(t) : 'life'; }
  function used(name) { const Q = (config.quotas || {})[name]; if (!Q) return 0; return (storage.get(`q.${name}.${periodKey(Q.period)}`) || 0); }
  function quota(name) {
    const Q = (config.quotas || {})[name];
    if (!Q) return Infinity;
    if (Q.unlockedBy && has(Q.unlockedBy)) return Infinity;
    if (Q.paid && has(Q.paid.entitlement)) return Q.paid.amount;
    return Q.free;
  }
  const quotaLeft = (name) => Math.max(0, quota(name) - used(name));
  function useQuota(name, n = 1) {
    const Q = (config.quotas || {})[name]; if (!Q) return true;
    if (quotaLeft(name) < n) return false;
    const k = `q.${name}.${periodKey(Q.period)}`; storage.set(k, (storage.get(k) || 0) + n); emit();
    return true;
  }

  // Allowances that combine a subscription allowance, a one-off free starter amount and purchased
  // credits, spent in that order. config.allowances: { kind: { monthly: { entitlement, amount }, starter } }
  function allowance(kind) {
    const A = (config.allowances || {})[kind] || {};
    const mk = monthKey(now());
    const monthlyCap = A.monthly && has(A.monthly.entitlement) ? A.monthly.amount : 0;
    const monthlyUsed = storage.get(`a.${kind}.m.${mk}`) || 0;
    const starterUsed = storage.get(`a.${kind}.starter`) || 0;
    const monthly = Math.max(0, monthlyCap - monthlyUsed);
    const starter = Math.max(0, (A.starter || 0) - starterUsed);
    const bought = credits(kind);
    return { monthly, starter, bought, total: monthly + starter + bought };
  }
  function spend(kind, n = 1) {
    const a = allowance(kind);
    if (a.total < n) return false;
    const mk = monthKey(now());
    let left = n;
    const take = (avail, key) => { const x = Math.min(avail, left); if (x > 0) { storage.set(key, (storage.get(key) || 0) + x); left -= x; } };
    take(a.monthly, `a.${kind}.m.${mk}`);
    take(a.starter, `a.${kind}.starter`);
    if (left > 0) setCredits(kind, credits(kind) - left);
    emit();
    return true;
  }

  // ---------- plan naming ----------
  /** Highest tier the person has, using config.tiers order (lowest first). */
  function currentTier() {
    const tiers = (config.paywall && config.paywall.tiers) || config.tiers || [];
    let best = null;
    for (const t of tiers) if (has(t.entitlement)) best = t;
    if (has('vilasi_pass')) return { id: 'pass', name: 'Vilasi Pass', entitlement: 'vilasi_pass' };
    return best;
  }

  return {
    config, catalog, byId, expand, active, has, applyCustomerInfo, credits, setCredits, creditTransactions,
    limitOf, canAdd, used, quota, quotaLeft, useQuota, allowance, spend, currentTier,
    lastSync: () => storage.get('entAt'),
    onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    _emit: emit, DAY_MS,
  };
}
