// Tiny stand-in for @anthropic-ai/sdk: one fetch call to the Claude API.
export class APIError extends Error { constructor(status, msg) { super(msg); this.status = status; } }
export class APIConnectionError extends APIError {}
export class RateLimitError extends APIError {}
export class AuthenticationError extends APIError {}
export class BadRequestError extends APIError {}
async function create(args) { // tries the asked-for model, then smaller ones if the account cannot use it
  const first = args.model, tries = [first, "claude-sonnet-5-5", "claude-haiku-5-5"].filter((m, i, a) => a.indexOf(m) === i);
  let last;
  for (const model of tries) {
    try { return await one({ ...args, model }); }
    catch (e) { last = e; if (!(e.status === 404 || (e.status === 400 && /model/i.test(e.message)))) throw e; }
  }
  throw last;
}
async function one({ betas, fallbacks, ...body }) {  // fallbacks/betas dropped: plain Messages API call
  const key = String(globalThis.process?.env?.ANTHROPIC_API_KEY || "").replace(/[^\x21-\x7e]/g, ""); // pasted keys often carry a stray space or line break
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
