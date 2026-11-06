// Tiny key-value store. On Vercel, add an Upstash Redis database (Storage tab)
// and it sets KV_REST_API_URL / KV_REST_API_TOKEN (or UPSTASH_REDIS_REST_*).
// On Cloudflare (worker/), a Workers KV namespace bound as HOOT is used instead.
// Without either it keeps data in memory, which is only good for local testing.
const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const mem = new Map();
export const persistent = Boolean(URL_ && TOKEN);

async function redis(command) {
  const r = await fetch(URL_, { method: "POST", headers: { authorization: `Bearer ${TOKEN}`, "content-type": "application/json" }, body: JSON.stringify(command) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) throw new Error("store: " + (j.error || r.status));
  return j.result;
}

// Cloudflare Workers KV, set per request by worker/entry.mjs.
const kv = () => globalThis.__HOOT_KV;

export async function get(key) {
  if (kv()) { const v = await kv().get(key); return v == null ? null : JSON.parse(v); }
  const v = persistent ? await redis(["GET", key]) : mem.get(key);
  return v == null ? null : JSON.parse(v);
}
export async function getMany(keys) {
  if (!keys.length) return [];
  if (kv()) return Promise.all(keys.map(get));
  const vals = persistent ? await redis(["MGET", ...keys]) : keys.map(k => mem.get(k));
  return vals.map(v => (v == null ? null : JSON.parse(v)));
}
export async function set(key, value) {
  const v = JSON.stringify(value);
  if (kv()) return kv().put(key, v);
  if (persistent) await redis(["SET", key, v]); else mem.set(key, v);
}
// Set only if the key is new; returns true when it was written.
export async function create(key, value) {
  const v = JSON.stringify(value);
  if (kv()) { if ((await kv().get(key)) != null) return false; await kv().put(key, v); return true; }
  if (persistent) return (await redis(["SET", key, v, "NX"])) === "OK";
  if (mem.has(key)) return false;
  mem.set(key, v); return true;
}
export async function del(key) {
  if (kv()) return kv().delete(key);
  if (persistent) await redis(["DEL", key]); else mem.delete(key);
}
