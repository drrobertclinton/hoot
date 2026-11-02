// Plain Node server for running the app anywhere (local testing, Render,
// Railway, a VPS): serves public/ and the /api routes. `npm start`.
import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { study, klass } from "./lib/routes.mjs";
import { persistent } from "./lib/store.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(here, "public");
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".json": "application/json" };
const MAX_BODY = 12 * 1024 * 1024;

const send = (res, status, body, type = "application/json") => {
  res.writeHead(status, { "content-type": type });
  res.end(type === "application/json" ? JSON.stringify(body) : body);
};

http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  const route = { "/api/study": study, "/api/class": klass }[url.pathname];
  if (route) {
    const ip = String(req.headers["x-forwarded-for"] || req.socket.remoteAddress || "").split(",")[0].trim();
    let body = null;
    if (req.method === "POST") {
      let size = 0; const chunks = [];
      for await (const c of req) { size += c.length; if (size > MAX_BODY) return send(res, 413, { code: "too_large" }); chunks.push(c); }
      try { body = JSON.parse(Buffer.concat(chunks).toString("utf8")); } catch { return send(res, 400, { code: "bad_request" }); }
    }
    const [status, json] = await route({ method: req.method, ip, query: url.searchParams, body });
    return send(res, status, json);
  }
  const file = path.join(PUBLIC, path.normalize(url.pathname === "/" ? "/index.html" : url.pathname));
  if (!file.startsWith(PUBLIC)) return send(res, 404, "Not found", "text/plain");
  try { send(res, 200, await readFile(file), TYPES[path.extname(file)] || "application/octet-stream"); }
  catch { send(res, 404, "Not found", "text/plain"); }
}).listen(process.env.PORT || 3000, () => console.log(`Hoot on http://localhost:${process.env.PORT || 3000}` + (persistent ? "" : " (classes kept in memory only)")));
