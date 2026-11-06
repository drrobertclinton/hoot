// Sync sha256 + random bytes for Workers (no node:crypto needed).
import { hash as sha256 } from "fast-sha256";
const hex = b => [...b].map(x => x.toString(16).padStart(2, "0")).join("");
export function createHash() {
  let s = "";
  const h = { update(v) { s += v; return h; }, digest() { return hex(sha256(new TextEncoder().encode(s))); } };
  return h;
}
export function randomBytes(n) {
  const b = crypto.getRandomValues(new Uint8Array(n));
  b.toString = enc => enc === "hex" ? hex(b) : btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return b;
}
