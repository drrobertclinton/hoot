// Cloudflare Worker entry: serves public/ (bundled in as text) and the two API
// routes from lib/routes.mjs. Build with `node cloudflare/build.mjs`, then
// upload dist/worker.js with the nodejs_compat flag and an ANTHROPIC_API_KEY secret.
import { study, klass } from "../lib/routes.mjs";
import index from "../public/index.html";
import tutor from "../public/tutor.html";
import teacher from "../public/teacher.html";
import privacy from "../public/privacy.html";
import style from "../public/style.css";
import maker from "../public/maker.js.raw";
import curriculum from "../public/curriculum.mjs.raw";

const FILES = {
  "/": [index, "text/html; charset=utf-8"],
  "/index.html": [index, "text/html; charset=utf-8"],
  "/tutor.html": [tutor, "text/html; charset=utf-8"],
  "/teacher.html": [teacher, "text/html; charset=utf-8"],
  "/privacy.html": [privacy, "text/html; charset=utf-8"],
  "/style.css": [style, "text/css; charset=utf-8"],
  "/maker.js": [maker, "text/javascript; charset=utf-8"],
  "/curriculum.mjs": [curriculum, "text/javascript; charset=utf-8"],
};
const MAX_BODY = 12 * 1024 * 1024;
const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

export default {
  async fetch(req, env) {
    // Secrets reach the shared code through process.env.
    for (const k of ["ANTHROPIC_API_KEY", "STUDY_MODEL", "KV_REST_API_URL", "KV_REST_API_TOKEN", "UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN", "TUTOR_REQUESTS_PER_HOUR", "STUDY_REQUESTS_PER_HOUR"])
      if (env[k] && !process.env[k]) process.env[k] = env[k];
    const url = new URL(req.url);
    const route = { "/api/study": study, "/api/class": klass }[url.pathname];
    if (route) {
      const ip = req.headers.get("cf-connecting-ip") || "unknown";
      let body = null;
      if (req.method === "POST") {
        if (Number(req.headers.get("content-length") || 0) > MAX_BODY) return json(413, { code: "too_large" });
        try { body = await req.json(); } catch { return json(400, { code: "bad_request" }); }
      }
      const [status, out] = await route({ method: req.method, ip, query: url.searchParams, body });
      return json(status, out);
    }
    if (url.pathname === "/health") return json(200, { ok: true, app: "my-own-tutor", key: !!process.env.ANTHROPIC_API_KEY });
    const f = FILES[url.pathname];
    if (!f) return new Response("Not found", { status: 404, headers: { "content-type": "text/plain" } });
    return new Response(f[0], { headers: { "content-type": f[1], "cache-control": "no-cache" } });
  },
};
