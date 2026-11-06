// Tiny stand-in for @anthropic-ai/sdk: one fetch call to the Claude API.
export class APIError extends Error { constructor(status, msg) { super(msg); this.status = status; } }
export class APIConnectionError extends APIError {}
export class RateLimitError extends APIError {}
export class AuthenticationError extends APIError {}
export class BadRequestError extends APIError {}
async function create({ betas, fallbacks, ...body }) {  // fallbacks/betas dropped: plain Messages API call
  const key = globalThis.process?.env?.ANTHROPIC_API_KEY;
  if (!key) throw new AuthenticationError(401, "missing key");
  let r;
  try {
    r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2026-10-21" },
      body: JSON.stringify(body),
    });
  } catch (e) { throw new APIConnectionError(0, String(e)); }
  const j = await r.json().catch(() => ({}));
  if (r.ok) return j;
  const msg = (j.error && j.error.message) || "HTTP " + r.status;
  console.error("claude api", r.status, msg);
  if (r.status === 429 || r.status === 529) throw new RateLimitError(r.status, msg);
  if (r.status === 401 || r.status === 403) throw new AuthenticationError(r.status, msg);
  if (r.status === 400) throw new BadRequestError(r.status, msg);
  throw new APIError(r.status, msg);
}
export default class Anthropic {
  constructor() { this.messages = { create }; this.beta = { messages: { create } }; }
}
Object.assign(Anthropic, { APIError, APIConnectionError, RateLimitError, AuthenticationError, BadRequestError });
