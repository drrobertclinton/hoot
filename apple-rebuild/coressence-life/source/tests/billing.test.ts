/// <reference types="node" />
// Plan rules and the runtime billing store with a mocked Purchases module (RevenueCat stand-in).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import * as cfg from '../src/core/billing/config';
import * as ent from '../src/core/billing/entitlements';
import { createBilling } from '../src/core/billing/billingCore';

const require = createRequire(import.meta.url);
const { makeMock } = require('../scripts/mockPurchases.js');

const memStorage = () => {
  const m = new Map<string, string>();
  return { getItem: async (k: string) => (m.has(k) ? m.get(k)! : null), setItem: async (k: string, v: string) => void m.set(k, v) };
};
const make = (opts: any = {}) =>
  createBilling({
    purchases: opts.purchases === undefined ? makeMock(cfg.CATALOG, opts) : opts.purchases,
    platform: opts.platform || 'ios',
    iosKey: cfg.REVENUECAT_IOS_KEY,
    androidKey: cfg.REVENUECAT_ANDROID_KEY,
    storage: opts.storage || memStorage(),
  });

test('placeholder keys ship in the config; no real keys in source', () => {
  assert.equal(cfg.isPlaceholderKey(cfg.REVENUECAT_IOS_KEY), true);
  assert.equal(cfg.isPlaceholderKey(cfg.REVENUECAT_ANDROID_KEY), true);
  assert.equal(cfg.isPlaceholderKey('appl_AbCdEf123456'), false);
  const root = path.join(__dirname, '..', 'src');
  for (const f of (fs.readdirSync(root, { recursive: true }) as string[]).filter((x) => /\.tsx?$/.test(x))) {
    const t = fs.readFileSync(path.join(root, f), 'utf8');
    assert.ok(!/(appl|goog|sk|pk)_[A-Za-z0-9]{16,}/.test(t), `key-like string in ${f}`);
  }
});

test('catalog follows the Coressence pricing plan', () => {
  const price = (id: string) => cfg.CATALOG.find((c) => c.product_id === id)!.price_usd;
  assert.equal(price(cfg.ALL_MONTHLY), 14.99);
  assert.equal(price(cfg.ALL_ANNUAL), 119.99);
  assert.equal(price(cfg.FAMILY_MONTHLY), 19.99);
  assert.equal(price(cfg.FAMILY_ANNUAL), 159.99);
  assert.equal(price(cfg.COURSE_LIVE), 49.99);
  assert.equal(price(cfg.COURSE_BOTH), 79.99);
  for (const c of cfg.CATALOG.filter((c) => c.type === 'auto_renewable_subscription')) {
    assert.equal(c.free_trial_days, 14);
    assert.deepEqual(c.entitlements, [cfg.ENT_ALL_ACCESS]);
    assert.equal(c.subscription_group, 'coressence.allaccess');
    assert.match(c.product_id, /^com\.coressence\.life\./);
  }
  assert.equal(ent.annualSavings(14.99, 119.99), 33);
});

test('lesson access: lesson 1 free; All-Access opens all; course tracks open their own lessons and the core', () => {
  const none = new Set<string>();
  assert.equal(ent.canOpenLesson('l1', 'core', none), true);
  assert.equal(ent.canOpenLesson('l2', 'core', none), false);
  assert.equal(ent.canOpenLesson('l7', 'perform', new Set([cfg.ENT_ALL_ACCESS])), true);
  assert.equal(ent.canOpenLesson('l2', 'core', new Set([cfg.ENT_COURSE_LIVE])), true);
  assert.equal(ent.canOpenLesson('l7', 'perform', new Set([cfg.ENT_COURSE_LIVE])), false);
  assert.equal(ent.canOpenLesson('l8', 'live', new Set([cfg.ENT_COURSE_LIVE])), true);
  assert.equal(ent.canOpenLesson('l8', 'live', none, true), true);
  assert.equal(ent.historyDays(false, 90), 7);
  assert.equal(ent.historyDays(true, 90), 90);
});

test('wording helpers', () => {
  assert.equal(ent.trialWords({ price: 0, periodUnit: 'DAY', periodNumberOfUnits: 14, cycles: 1 }), '14-day free trial');
  assert.equal(ent.periodWords('P1Y'), 'year');
  assert.equal(ent.periodWords('P1M'), 'month');
});

test('runtime: web preview shows US catalog prices and cannot buy', async () => {
  const b = make({ purchases: null });
  await b.init();
  assert.equal(b.getState().mode, 'preview');
  const p = await b.products();
  assert.equal(p[cfg.ALL_ANNUAL].priceString, '$119.99');
  assert.equal(ent.trialWords(p[cfg.ALL_ANNUAL].intro), '14-day free trial');
  const r = await b.purchase(cfg.ALL_MONTHLY);
  assert.equal(r.ok, false);
  assert.match(r.error!, /Coressence Life app/);
});

test('runtime: placeholder keys leave purchases unconfigured', async () => {
  const b = make({ purchases: { ...makeMock(cfg.CATALOG), __isMock: false } });
  await b.init();
  assert.equal(b.getState().mode, 'unconfigured');
  assert.equal(b.allAccess(), false);
});

test('runtime: store prices win over the catalog (local currency)', async () => {
  const b = make({ euro: true });
  const p = await b.products();
  assert.equal(p[cfg.ALL_MONTHLY].source, 'store');
  assert.equal(p[cfg.ALL_MONTHLY].priceString, '14,99 €');
  assert.equal(p[cfg.COURSE_BOTH].priceString, '79,99 €');
});

test('runtime: subscribe, cancel, restore on a new install, and expiry', async () => {
  const mock = makeMock(cfg.CATALOG, { cancelNext: true });
  const b = make({ purchases: mock });
  await b.init();
  assert.deepEqual(await b.purchase(cfg.ALL_ANNUAL), { ok: false, cancelled: true });
  assert.equal(b.allAccess(), false);
  assert.equal((await b.purchase(cfg.ALL_ANNUAL)).ok, true);
  assert.equal(b.allAccess(), true);
  const b2 = make({ purchases: mock, storage: memStorage() });
  await b2.init();
  await b2.restore();
  assert.equal(b2.allAccess(), true);
  await new Promise((r) => setTimeout(r, 5));
  mock._expire();
  await new Promise((r) => setTimeout(r, 5));
  assert.equal(b2.allAccess(), false);
});

test('runtime: one-time course purchase grants both course entitlements, not All-Access', async () => {
  const b = make();
  await b.init();
  assert.equal((await b.purchase(cfg.COURSE_BOTH)).ok, true);
  const e = b.entitlements();
  assert.ok(e.has(cfg.ENT_COURSE_LIVE) && e.has(cfg.ENT_COURSE_PERFORM));
  assert.equal(b.allAccess(), false);
  assert.equal(ent.canOpenLesson('l7', 'perform', e), true);
});
