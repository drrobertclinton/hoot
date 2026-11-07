// Hoot tutor API as one Cloudflare Worker: /api/study and /api/class.
// Build: worker/build.sh. Paste worker/hoot-worker.js into the dashboard.
// Settings: ANTHROPIC_API_KEY (secret). Optional: KV binding HOOT (teacher classes
// + daily cap), DAILY_CAP (default 3000 Claude calls a day), ALLOWED_ORIGINS.
import { study, klass } from "../lib/routes.mjs";
import Anthropic from "./sdk-shim.mjs";
const DEFAULT_ORIGINS = "https://vilasi.co,https://www.vilasi.co";
function cors(req, env) {
  const allowed = (env.ALLOWED_ORIGINS || DEFAULT_ORIGINS).split(",").map(s => s.trim());
  const o = req.headers.get("origin") || "";
  return { "access-control-allow-origin": allowed.includes(o) ? o : allowed[0], "access-control-allow-methods": "GET,POST,OPTIONS", "access-control-allow-headers": "content-type", vary: "origin" };
}
export default {
  async fetch(req, env) {
    globalThis.process = { env };
    globalThis.__HOOT_KV = env.HOOT || null;
    const h = cors(req, env);
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: h });
    const url = new URL(req.url);
    const send = (s, j) => new Response(JSON.stringify(j), { status: s, headers: { ...h, "content-type": "application/json" } });
    if (url.pathname === "/" ) return send(200, { ok: true, app: "hoot-tutor", version: 5, key: Boolean(env.ANTHROPIC_API_KEY), classes: Boolean(env.HOOT) });
    if (url.pathname === "/selftest") { // one tiny Claude call, so setup problems show their real reason
      try {
        const r = await new Anthropic().messages.create({ model: "claude-opus-5-5", max_tokens: 16, messages: [{ role: "user", content: "Reply with the word ok." }] });
        return send(200, { ok: true, model: r.model, reply: (r.content || []).map(b => b.text || "").join("") });
      } catch (e) { return send(200, { ok: false, status: e.status || 0, error: String(e.message || e).slice(0, 300) }); }
    }
    const route = url.pathname === "/api/study" ? study : url.pathname === "/api/class" ? klass : null;
    if (!route) return send(404, { code: "not_found" });
    let body = null;
    if (req.method === "POST") {
      if (Number(req.headers.get("content-length") || 0) > 9_000_000) return send(413, { code: "too_large" });
      body = await req.json().catch(() => null);
    }
    if (route === study && env.HOOT) {
      const day = "cap:" + new Date().toISOString().slice(0, 10);
      const n = Number(await env.HOOT.get(day)) || 0;
      if (n >= (Number(env.DAILY_CAP) || 3000)) return send(429, { code: "rate_limited" });
      await env.HOOT.put(day, String(n + 1), { expirationTtl: 172800 });
    }
    const ip = req.headers.get("cf-connecting-ip") || "unknown";
    const [s, j] = await route({ method: req.method, ip, query: url.searchParams, body });
    return send(s, j);
  },
};
