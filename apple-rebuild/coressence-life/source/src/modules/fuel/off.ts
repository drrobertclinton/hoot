// Open Food Facts: product lookup by barcode and food search (free, no key, open data under the ODbL).
// Pure parsing and portion math (unit-tested in tests/fuel.test.ts) plus small fetch wrappers that never throw.
// Nutrient values are estimates from Open Food Facts' crowd-sourced labels; the app shows them as such and never
// sets calorie targets.

export const OFF_ATTRIBUTION = 'Data from Open Food Facts';
export const OFF_USER_AGENT = 'CoressenceLife/1.1 (support@vilasi.co)';
const BASE = 'https://world.openfoodfacts.org';
const FIELDS = ['code', 'product_name', 'product_name_en', 'generic_name', 'brands', 'quantity', 'serving_size', 'serving_quantity', 'nutriments', 'image_front_small_url'].join(',');

export type Nutrients = {
  energyKcal: number | null;
  protein: number | null;
  carbs: number | null;
  sugars: number | null;
  fat: number | null;
  satFat: number | null;
  fiber: number | null;
  salt: number | null;
};
export type FoodItem = {
  code: string;
  name: string;
  brand: string | null;
  quantity: string | null;
  servingText: string | null;
  /** Grams (or ml) in one serving, when the label gives it. */
  servingG: number | null;
  /** Per 100 g (or 100 ml). */
  per100: Nutrients;
  image: string | null;
};
export type Portion = { mode: 'servings' | 'grams'; amount: number };
export type LookupResult = { status: 'ok'; item: FoodItem } | { status: 'not_found' } | { status: 'error'; message: string };
export type SearchResult = { status: 'ok'; items: FoodItem[] } | { status: 'error'; message: string };

export const NUTRIENT_LABELS: { key: keyof Nutrients; label: string; unit: string }[] = [
  { key: 'energyKcal', label: 'Energy', unit: 'kcal' },
  { key: 'protein', label: 'Protein', unit: 'g' },
  { key: 'carbs', label: 'Carbohydrate', unit: 'g' },
  { key: 'sugars', label: 'of which sugars', unit: 'g' },
  { key: 'fat', label: 'Fat', unit: 'g' },
  { key: 'satFat', label: 'of which saturated', unit: 'g' },
  { key: 'fiber', label: 'Fiber', unit: 'g' },
  { key: 'salt', label: 'Salt', unit: 'g' },
];

const num = (v: unknown): number | null => {
  const n = typeof v === 'string' ? Number(v.replace(',', '.')) : typeof v === 'number' ? v : NaN;
  return Number.isFinite(n) && n >= 0 ? n : null;
};
const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null);

/** Barcodes are 8, 12, 13 or 14 digits (EAN-8, UPC-A, EAN-13, GTIN-14). */
export const validBarcode = (code: string) => /^\d{8}$|^\d{12,14}$/.test(code.trim());

function nutrientsFrom(n: Record<string, unknown> | undefined): Nutrients {
  const g = (k: string) => num(n?.[`${k}_100g`]);
  let kcal = g('energy-kcal');
  if (kcal === null) {
    // Open Food Facts stores `energy_100g` in kJ.
    const kj = g('energy-kj') ?? g('energy');
    kcal = kj === null ? null : Math.round((kj / 4.184) * 10) / 10;
  }
  let salt = g('salt');
  if (salt === null) {
    const sodium = g('sodium');
    salt = sodium === null ? null : Math.round(sodium * 2.5 * 1000) / 1000;
  }
  return { energyKcal: kcal, protein: g('proteins'), carbs: g('carbohydrates'), sugars: g('sugars'), fat: g('fat'), satFat: g('saturated-fat'), fiber: g('fiber'), salt };
}

/** One product object (the `product` of a v2 lookup, or an item of a search) to a FoodItem; null if unusable. */
export function parseProduct(p: unknown, fallbackCode = ''): FoodItem | null {
  if (!p || typeof p !== 'object') return null;
  const o = p as Record<string, unknown>;
  const name = str(o.product_name) ?? str(o.product_name_en) ?? str(o.generic_name);
  const code = str(o.code) ?? fallbackCode;
  if (!name || !code) return null;
  const brand = (Array.isArray(o.brands) ? str(o.brands[0]) : str(o.brands)?.split(',')[0].trim()) ?? null;
  return {
    code,
    name,
    brand,
    quantity: str(o.quantity),
    servingText: str(o.serving_size),
    servingG: num(o.serving_quantity) || null,
    per100: nutrientsFrom(o.nutriments as Record<string, unknown> | undefined),
    image: str(o.image_front_small_url),
  };
}

/** A v2 product response: {status: 1, product: {...}} or {status: 0, status_verbose: 'product not found'}. */
export function parseLookup(json: unknown, code: string): LookupResult {
  if (!json || typeof json !== 'object') return { status: 'error', message: 'Open Food Facts sent an answer we could not read.' };
  const o = json as Record<string, unknown>;
  if (o.status === 0 || o.status === 'failure' || !o.product) return { status: 'not_found' };
  const item = parseProduct(o.product, code);
  return item ? { status: 'ok', item } : { status: 'not_found' };
}

/** A search response: {hits: [...]} (search.openfoodfacts.org) or {products: [...]} (cgi/search.pl). Drops items without a name. */
export function parseSearch(json: unknown): FoodItem[] {
  const o = json && typeof json === 'object' ? (json as Record<string, unknown>) : null;
  const list = o ? (Array.isArray(o.hits) ? o.hits : o.products) : null;
  if (!Array.isArray(list)) return [];
  const seen = new Set<string>();
  const out: FoodItem[] = [];
  for (const p of list) {
    const it = parseProduct(p);
    if (it && !seen.has(it.code)) {
      seen.add(it.code);
      out.push(it);
    }
  }
  return out;
}

/** Grams for a portion: servings x serving size, or grams directly. Null when servings are chosen but the label has no serving size. */
export function portionGrams(item: Pick<FoodItem, 'servingG'>, portion: Portion): number | null {
  const a = Number.isFinite(portion.amount) && portion.amount > 0 ? portion.amount : 0;
  if (portion.mode === 'grams') return Math.round(a * 10) / 10;
  return item.servingG ? Math.round(a * item.servingG * 10) / 10 : null;
}

const r1 = (n: number) => Math.round(n * 10) / 10;

/** Nutrients for the portion (estimates). Values the label does not give stay null. */
export function portionNutrients(item: Pick<FoodItem, 'servingG' | 'per100'>, portion: Portion): { grams: number | null; nutrients: Nutrients } {
  const grams = portionGrams(item, portion);
  const out = {} as Nutrients;
  for (const { key } of NUTRIENT_LABELS) {
    const v = item.per100[key];
    out[key] = v === null || grams === null ? null : key === 'energyKcal' ? Math.round((v * grams) / 100) : r1((v * grams) / 100);
  }
  return { grams, nutrients: out };
}

/** The default portion: one serving if the label has a serving size, else 100 g. */
export const defaultPortion = (item: Pick<FoodItem, 'servingG'>): Portion => (item.servingG ? { mode: 'servings', amount: 1 } : { mode: 'grams', amount: 100 });

// ------------------------------------------------------------------ network (never throws)
type FetchLike = (url: string, init?: { headers?: Record<string, string>; signal?: AbortSignal }) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>;

async function getJson(fetchImpl: FetchLike, url: string, sendUserAgent: boolean, timeoutMs: number): Promise<{ ok: true; json: unknown; status: number } | { ok: false; message: string; status?: number }> {
  const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const t = ctl ? setTimeout(() => ctl.abort(), timeoutMs) : null;
  try {
    // Browsers do not allow setting User-Agent, so the web build relies on the browser's own.
    const res = await fetchImpl(url, { headers: sendUserAgent ? { 'User-Agent': OFF_USER_AGENT, Accept: 'application/json' } : { Accept: 'application/json' }, signal: ctl?.signal });
    if (res.status === 404) return { ok: true, json: { status: 0 }, status: 404 };
    if (!res.ok) return { ok: false, status: res.status, message: res.status === 429 || res.status >= 500 ? 'Open Food Facts is busy or down right now. Try again in a little while.' : `Open Food Facts answered with an error (${res.status}).` };
    return { ok: true, json: await res.json(), status: res.status };
  } catch (e) {
    const aborted = (e as { name?: string })?.name === 'AbortError';
    return { ok: false, message: aborted ? 'Open Food Facts took too long to answer. Check your connection and try again.' : 'Could not reach Open Food Facts. Check your connection and try again.' };
  } finally {
    if (t) clearTimeout(t);
  }
}

export async function lookupBarcode(code: string, opts: { fetchImpl?: FetchLike; sendUserAgent?: boolean; timeoutMs?: number } = {}): Promise<LookupResult> {
  const clean = code.trim();
  if (!validBarcode(clean)) return { status: 'error', message: 'That does not look like a product barcode (8, 12, 13 or 14 digits).' };
  const r = await getJson(opts.fetchImpl ?? (fetch as unknown as FetchLike), `${BASE}/api/v2/product/${clean}.json?fields=${FIELDS}`, opts.sendUserAgent ?? true, opts.timeoutMs ?? 10000);
  if (!r.ok) return { status: 'error', message: r.message };
  try {
    return parseLookup(r.json, clean);
  } catch {
    return { status: 'error', message: 'Open Food Facts sent an answer we could not read.' };
  }
}

/** Open Food Facts' search service (search-a-licious), with the classic full-text search as a fallback. */
export function searchUrl(query: string, page = 1) {
  return `https://search.openfoodfacts.org/search?q=${encodeURIComponent(query.trim())}&page_size=20&page=${page}&fields=${FIELDS}`;
}
export function legacySearchUrl(query: string, page = 1) {
  const q = encodeURIComponent(query.trim());
  return `${BASE}/cgi/search.pl?search_terms=${q}&search_simple=1&action=process&json=1&page_size=20&page=${page}&fields=${FIELDS}`;
}

export async function searchFoods(query: string, opts: { fetchImpl?: FetchLike; sendUserAgent?: boolean; timeoutMs?: number; page?: number } = {}): Promise<SearchResult> {
  if (query.trim().length < 2) return { status: 'ok', items: [] };
  const f = opts.fetchImpl ?? (fetch as unknown as FetchLike);
  let r = await getJson(f, searchUrl(query, opts.page), opts.sendUserAgent ?? true, opts.timeoutMs ?? 12000);
  if (!r.ok) r = await getJson(f, legacySearchUrl(query, opts.page), opts.sendUserAgent ?? true, opts.timeoutMs ?? 12000);
  if (!r.ok) return { status: 'error', message: r.message };
  try {
    return { status: 'ok', items: parseSearch(r.json) };
  } catch {
    return { status: 'error', message: 'Open Food Facts sent an answer we could not read.' };
  }
}
