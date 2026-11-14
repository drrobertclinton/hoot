/// <reference types="node" />
// Fuel: Open Food Facts parsing, portion math, graceful network failures, and logged foods.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultPortion, legacySearchUrl, lookupBarcode, parseLookup, parseSearch, portionGrams, portionNutrients, searchFoods, searchUrl, validBarcode, OFF_USER_AGENT } from '../src/modules/fuel/off';
import { fuelScore, mealFood, portionWords, withPortion, type FuelSlice } from '../src/modules/fuel/model';

const YOGURT = {
  code: '3033490004743',
  status: 1,
  status_verbose: 'product found',
  product: {
    code: '3033490004743',
    product_name: 'Greek style yogurt',
    brands: 'Dairy Co, Store Brand',
    quantity: '500 g',
    serving_size: '125 g',
    serving_quantity: '125',
    nutriments: { 'energy-kcal_100g': 97, proteins_100g: 9, carbohydrates_100g: 4.1, sugars_100g: 4.1, fat_100g: 5, 'saturated-fat_100g': 3.3, salt_100g: 0.1 },
    image_front_small_url: 'https://images.openfoodfacts.org/x.jpg',
  },
};

test('parse a v2 product lookup', () => {
  const r = parseLookup(YOGURT, '3033490004743');
  assert.equal(r.status, 'ok');
  if (r.status !== 'ok') return;
  assert.equal(r.item.name, 'Greek style yogurt');
  assert.equal(r.item.brand, 'Dairy Co');
  assert.equal(r.item.servingG, 125);
  assert.equal(r.item.per100.energyKcal, 97);
  assert.equal(r.item.per100.fiber, null);
  assert.deepEqual(parseLookup({ status: 0, status_verbose: 'product not found' }, '123'), { status: 'not_found' });
  assert.deepEqual(parseLookup({ status: 1, product: { code: '1' } }, '1'), { status: 'not_found' }); // no name
  assert.equal(parseLookup(null, '1').status, 'error');
});

test('energy from kJ, salt from sodium, decimal commas, junk values', () => {
  const r = parseLookup({ status: 1, product: { product_name: 'Oat bar', nutriments: { energy_100g: 1674, sodium_100g: 0.2, proteins_100g: '7,5', fat_100g: 'n/a', sugars_100g: -3 } } }, '12345678');
  assert.equal(r.status, 'ok');
  if (r.status !== 'ok') return;
  assert.equal(r.item.code, '12345678');
  assert.equal(r.item.per100.energyKcal, 400.1);
  assert.equal(r.item.per100.salt, 0.5);
  assert.equal(r.item.per100.protein, 7.5);
  assert.equal(r.item.per100.fat, null);
  assert.equal(r.item.per100.sugars, null);
  assert.equal(r.item.servingG, null);
});

test('parse search results: drops nameless and duplicate products', () => {
  const items = parseSearch({ count: 3, products: [YOGURT.product, { code: '2', product_name: '' }, YOGURT.product, { code: '3', product_name_en: 'Lentil soup', nutriments: {} }] });
  assert.deepEqual(items.map((i) => i.name), ['Greek style yogurt', 'Lentil soup']);
  assert.deepEqual(parseSearch({}), []);
  assert.deepEqual(parseSearch('<html>'), []);
  assert.match(legacySearchUrl('greek yogurt & honey'), /search_terms=greek%20yogurt%20%26%20honey&search_simple=1&action=process&json=1/);
  assert.match(searchUrl('greek yogurt'), /^https:\/\/search\.openfoodfacts\.org\/search\?q=greek%20yogurt&page_size=20/);
  // search-a-licious shape: hits, brands as a list
  const hits = parseSearch({ hits: [{ code: '0894700010137', brands: ['Chobani'], product_name: 'Nonfat Greek Yogurt', nutriments: { 'energy-kcal_100g': 52.9 } }] });
  assert.equal(hits[0].brand, 'Chobani');
  assert.equal(hits[0].per100.energyKcal, 52.9);
});

test('portion math: servings and grams', () => {
  const r = parseLookup(YOGURT, '3033490004743');
  assert.equal(r.status, 'ok');
  if (r.status !== 'ok') return;
  const it = r.item;
  assert.deepEqual(defaultPortion(it), { mode: 'servings', amount: 1 });
  assert.equal(portionGrams(it, { mode: 'servings', amount: 1.5 }), 187.5);
  assert.equal(portionGrams(it, { mode: 'grams', amount: 200 }), 200);
  assert.equal(portionGrams(it, { mode: 'grams', amount: -5 }), 0);
  const one = portionNutrients(it, { mode: 'servings', amount: 1 });
  assert.equal(one.grams, 125);
  assert.equal(one.nutrients.energyKcal, 121); // 97 * 1.25, rounded
  assert.equal(one.nutrients.protein, 11.3);
  assert.equal(one.nutrients.fiber, null);
  const g = portionNutrients(it, { mode: 'grams', amount: 50 });
  assert.equal(g.nutrients.energyKcal, 49);
  assert.equal(g.nutrients.fat, 2.5);
  // No serving size on the label: servings give no estimate, grams do.
  const bare = { servingG: null, per100: it.per100 };
  assert.deepEqual(defaultPortion(bare), { mode: 'grams', amount: 100 });
  assert.equal(portionNutrients(bare, { mode: 'servings', amount: 1 }).nutrients.energyKcal, null);
  assert.equal(portionNutrients(bare, { mode: 'grams', amount: 100 }).nutrients.energyKcal, 97);
});

test('a logged food keeps the portion; editing the portion recalculates; pattern scoring is unchanged', () => {
  const r = parseLookup(YOGURT, '3033490004743');
  if (r.status !== 'ok') throw new Error('parse');
  const f = mealFood(r.item, { mode: 'servings', amount: 1 });
  assert.equal(f.source, 'openfoodfacts');
  assert.equal(f.nutrients.energyKcal, 121);
  assert.equal(portionWords(f), '1 serving of 125 g (125 g)');
  const f2 = withPortion(f, { mode: 'grams', amount: 250 });
  assert.equal(f2.nutrients.energyKcal, 243);
  assert.equal(portionWords(f2), '250 g');
  const s: FuelSlice = { meals: [{ id: 'm', date: '2026-11-02', time: '12:00', kind: 'lunch', tags: ['protein'], food: f2 }], water: {}, fasts: [] };
  assert.equal(fuelScore(s, '2026-11-02', 2000), (2 / 13) * 0.5);
});

type Res = { ok: boolean; status: number; json: () => Promise<unknown> };
const reply = (status: number, body: unknown): Res => ({ ok: status >= 200 && status < 300, status, json: async () => body });

test('network: user agent, not found, server down, offline, timeout, bad JSON; never throws', async () => {
  let seen: { url: string; headers?: Record<string, string> } | null = null;
  const ok = async (url: string, init?: { headers?: Record<string, string> }) => {
    seen = { url, headers: init?.headers };
    return reply(200, YOGURT);
  };
  const r = await lookupBarcode('3033490004743', { fetchImpl: ok });
  assert.equal(r.status, 'ok');
  assert.match(seen!.url, /^https:\/\/world\.openfoodfacts\.org\/api\/v2\/product\/3033490004743\.json\?fields=/);
  assert.equal(seen!.headers?.['User-Agent'], OFF_USER_AGENT);
  assert.match(OFF_USER_AGENT, /^CoressenceLife\/1\.\d+ \(support@vilasi\.co\)$/);
  await lookupBarcode('3033490004743', { fetchImpl: ok, sendUserAgent: false });
  assert.equal(seen!.headers?.['User-Agent'], undefined);

  assert.deepEqual(await lookupBarcode('3033490004743', { fetchImpl: async () => reply(404, {}) }), { status: 'not_found' });
  const down = await lookupBarcode('3033490004743', { fetchImpl: async () => reply(503, {}) });
  assert.equal(down.status, 'error');
  assert.match((down as { message: string }).message, /busy or down/);
  // Search falls back to the classic endpoint when the search service fails.
  const calls: string[] = [];
  const fb = await searchFoods('yogurt', { fetchImpl: async (u) => { calls.push(u); return u.includes('search.openfoodfacts.org') ? reply(502, {}) : reply(200, { products: [YOGURT.product] }); } });
  assert.equal(fb.status, 'ok');
  assert.equal(calls.length, 2);
  const offline = await searchFoods('yogurt', { fetchImpl: async () => { throw new TypeError('Network request failed'); } });
  assert.equal(offline.status, 'error');
  assert.match((offline as { message: string }).message, /Could not reach/);
  const slow = await searchFoods('yogurt', {
    timeoutMs: 20,
    fetchImpl: (_u, init) => new Promise((_res, rej) => init?.signal?.addEventListener('abort', () => rej(Object.assign(new Error('aborted'), { name: 'AbortError' })))),
  });
  assert.match((slow as { message: string }).message, /took too long/);
  const bad = await searchFoods('yogurt', { fetchImpl: async () => ({ ok: true, status: 200, json: async () => { throw new SyntaxError('Unexpected token <'); } }) });
  assert.equal(bad.status, 'error');
  assert.deepEqual(await searchFoods('y', { fetchImpl: async () => { throw new Error('should not be called'); } }), { status: 'ok', items: [] });
  const badCode = await lookupBarcode('12ab', { fetchImpl: async () => { throw new Error('should not be called'); } });
  assert.equal(badCode.status, 'error');
  assert.equal(validBarcode('012345678905'), true);
  assert.equal(validBarcode('1234567'), false);
});
