// Tiny key-value store. On Vercel, add an Upstash Redis database (Storage tab)
// and it sets KV_REST_API_URL / KV_REST_API_TOKEN (or UPSTASH_REDIS_REST_*).
// Without those it keeps data in memory, which is only good for local testing.
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

export async function get(key) {
  const v = persistent ? await redis(["GET", key]) : mem.get(key);
  return v == null ? null : JSON.parse(v);
}
export async function getMany(keys) {
  if (!keys.length) return [];
  const vals = persistent ? await redis(["MGET", ...keys]) : keys.map(k => mem.get(k));
  return vals.map(v => (v == null ? null : JSON.parse(v)));
}
export async function set(key, value) {
  const v = JSON.stringify(value);
  if (persistent) await redis(["SET", key, v]); else mem.set(key, v);
}
// Set only if the key is new; returns true when it was written.
export async function create(key, value) {
  const v = JSON.stringify(value);
  if (persistent) return (await redis(["SET", key, v, "NX"])) === "OK";
  if (mem.has(key)) return false;
  mem.set(key, v); return true;
}
export async function del(key) {
  if (persistent) await redis(["DEL", key]); else mem.delete(key);
}
