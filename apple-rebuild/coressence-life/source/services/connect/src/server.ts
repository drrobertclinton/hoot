// Coressence Connect HTTP API (Fastify).
//
//   POST   /v1/session                      new install session (returns a bearer token for the app)
//   GET    /v1/vendors                      which vendors have credentials and are open to members
//   POST   /v1/connect/:vendor/start        sign-in link for a vendor (OAuth state + PKCE where supported)
//   GET    /v1/oauth/:vendor/callback       vendor redirects here; tokens are exchanged and stored encrypted
//   GET    /v1/connections                  this session's connected vendors
//   DELETE /v1/connections/:vendor          revoke at the vendor where possible, then delete tokens and queued data
//   GET    /v1/sync?days=90&tz=Area/City    normalized batches from every connected vendor
//   ALL    /v1/webhooks/:vendor             vendor notifications (signature or secret-key checked)
//   GET    /v1/aggregator/:id/sync          optional aggregator path (off unless configured)
//   GET    /health
import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from 'fastify';
import { VENDORS, type Config, type VendorId } from './config.ts';
import { pkce, randomId } from './crypto.ts';
import { Store, type Connection } from './store.ts';
import { ADAPTERS } from './vendors/index.ts';
import { makeDayFns, type Ctx } from './vendors/types.ts';
import { aggregatorPull } from './vendors/aggregators.ts';
import type { Batch } from './schema.ts';

export type Deps = { cfg: Config; store: Store; fetch?: typeof fetch; now?: () => number };

export function buildServer({ cfg, store, fetch: f = fetch, now = Date.now }: Deps): FastifyInstance {
  const app = Fastify({ logger: false, bodyLimit: 5 * 1024 * 1024 });
  // Keep the raw body for webhook signature checks.
  app.addContentTypeParser('application/json', { parseAs: 'string' }, (req, body, done) => {
    (req as FastifyRequest & { raw_body?: string }).raw_body = body as string;
    try {
      done(null, body ? JSON.parse(body as string) : {});
    } catch (e) {
      done(e as Error, undefined);
    }
  });
  app.addContentTypeParser('application/x-www-form-urlencoded', { parseAs: 'string' }, (req, body, done) => {
    (req as FastifyRequest & { raw_body?: string }).raw_body = body as string;
    done(null, Object.fromEntries(new URLSearchParams(body as string)));
  });

  const ctxFor = (vendor: VendorId, tz = 'UTC'): Ctx => {
    const creds = cfg.vendors[vendor]!;
    const fns = makeDayFns(tz);
    const hookKey = creds.extra.WEBHOOK_TOKEN ? `?key=${encodeURIComponent(creds.extra.WEBHOOK_TOKEN)}` : '';
    return { cfg, creds, redirectUri: `${cfg.publicUrl}/v1/oauth/${vendor}/callback`, webhookUrl: `${cfg.publicUrl}/v1/webhooks/${vendor}${hookKey}`, fetch: f, now: now(), ...fns };
  };
  const session = (req: FastifyRequest, reply: FastifyReply): string | null => {
    const h = String(req.headers.authorization || '');
    const tok = h.startsWith('Bearer ') ? h.slice(7) : '';
    if (!tok || !store.hasSession(tok)) {
      reply.code(401).send({ error: 'session' });
      return null;
    }
    return tok;
  };
  const vendorParam = (v: string): VendorId | null => (VENDORS.includes(v as VendorId) ? (v as VendorId) : null);

  async function fresh(s: string, c: Connection, tz: string): Promise<Connection> {
    const a = ADAPTERS[c.vendor];
    if (!a.refresh || !c.tokens.expiresAt || c.tokens.expiresAt - 120_000 > now() || !c.tokens.refreshToken) return c;
    const t = await a.refresh(ctxFor(c.vendor, tz), c.tokens);
    const next = { ...c, tokens: { ...c.tokens, ...t, vendorUserId: c.tokens.vendorUserId } };
    store.putConnection(s, next); // save at once: WHOOP and Garmin rotate refresh tokens
    return next;
  }

  app.get('/health', async () => ({ ok: true }));

  app.post('/v1/session', async () => {
    const token = randomId(32);
    store.createSession(token);
    return { session: token };
  });

  app.get('/v1/vendors', async () => ({
    vendors: Object.fromEntries(VENDORS.map((v) => [v, { configured: !!cfg.vendors[v], approved: !!cfg.vendors[v]?.live }])),
  }));

  app.post<{ Params: { vendor: string }; Body: { returnUrl?: string } }>('/v1/connect/:vendor/start', async (req, reply) => {
    const s = session(req, reply);
    if (!s) return;
    const vendor = vendorParam(req.params.vendor);
    if (!vendor || !cfg.vendors[vendor]) return reply.code(404).send({ error: 'vendor not configured' });
    const returnUrl = req.body?.returnUrl || cfg.returnUrls[0];
    if (!cfg.returnUrls.some((u) => returnUrl === u || returnUrl.startsWith(u + '?'))) return reply.code(400).send({ error: 'returnUrl not allowed' });
    const state = randomId(24);
    const p = ADAPTERS[vendor].usesPkce ? pkce() : { verifier: '', challenge: undefined };
    store.putPending(state, { session: s, vendor, verifier: p.verifier, returnUrl, exp: now() + 10 * 60_000 });
    return { url: ADAPTERS[vendor].authorizeUrl(ctxFor(vendor), state, p.challenge) };
  });

  app.get<{ Params: { vendor: string }; Querystring: { code?: string; state?: string; error?: string } }>('/v1/oauth/:vendor/callback', async (req, reply) => {
    const vendor = vendorParam(req.params.vendor);
    const pend = req.query.state ? store.takePending(req.query.state) : null;
    if (!vendor || !pend || pend.vendor !== vendor) return reply.code(400).type('text/plain').send('This sign-in link has expired. Please start again from the Coressence Life app.');
    const back = (ok: boolean) => reply.redirect(`${pend.returnUrl}${pend.returnUrl.includes('?') ? '&' : '?'}connected=${vendor}&ok=${ok ? 1 : 0}`);
    if (req.query.error || !req.query.code) return back(false);
    try {
      const ctx = ctxFor(vendor);
      let tokens = await ADAPTERS[vendor].exchange(ctx, req.query.code, pend.verifier || undefined);
      if (ADAPTERS[vendor].afterConnect) tokens = await ADAPTERS[vendor].afterConnect!(ctx, tokens);
      store.putConnection(pend.session, { vendor, since: now(), lastSync: null, vendorUserId: tokens.vendorUserId, tokens });
      return back(true);
    } catch {
      return back(false);
    }
  });

  app.get('/v1/connections', async (req, reply) => {
    const s = session(req, reply);
    if (!s) return;
    return { connections: store.connections(s).map((c) => ({ vendor: c.vendor, since: c.since, lastSync: c.lastSync })) };
  });

  app.delete<{ Params: { vendor: string } }>('/v1/connections/:vendor', async (req, reply) => {
    const s = session(req, reply);
    if (!s) return;
    const vendor = vendorParam(req.params.vendor);
    if (!vendor) return reply.code(404).send({ error: 'vendor' });
    const c = store.connection(s, vendor);
    if (c && cfg.vendors[vendor] && ADAPTERS[vendor].revoke) await ADAPTERS[vendor].revoke!(ctxFor(vendor), c.tokens).catch(() => undefined);
    store.removeConnection(s, vendor);
    return { ok: true };
  });

  app.get<{ Querystring: { days?: string; tz?: string } }>('/v1/sync', async (req, reply) => {
    const s = session(req, reply);
    if (!s) return;
    const days = Math.max(1, Math.min(90, Number(req.query.days) || 30));
    const tz = req.query.tz || 'UTC';
    const inbox = store.drain(s);
    const batches: Batch[] = [];
    const errors: { vendor: VendorId; status?: number }[] = [];
    for (const c0 of store.connections(s)) {
      if (!cfg.vendors[c0.vendor]) continue;
      try {
        const c = await fresh(s, c0, tz);
        batches.push(...(await ADAPTERS[c.vendor].pull(ctxFor(c.vendor, tz), c.tokens, days, inbox)));
        store.putConnection(s, { ...c, lastSync: now() });
      } catch (e) {
        errors.push({ vendor: c0.vendor, status: (e as { status?: number }).status });
      }
    }
    return { batches, errors };
  });

  const hook = async (req: FastifyRequest<{ Params: { vendor: string } }>, reply: FastifyReply) => {
    const vendor = vendorParam(req.params.vendor);
    if (!vendor || !cfg.vendors[vendor] || !ADAPTERS[vendor].webhook) return reply.code(404).send();
    const r = ADAPTERS[vendor].webhook!(ctxFor(vendor), {
      method: req.method,
      raw: (req as FastifyRequest & { raw_body?: string }).raw_body || '',
      headers: Object.fromEntries(Object.entries(req.headers).map(([k, v]) => [k.toLowerCase(), Array.isArray(v) ? v[0] : v])),
      query: req.query as Record<string, string>,
      body: req.body,
    });
    if (!r.ok) return reply.code(r.status || 401).send();
    for (const it of r.items || []) store.enqueue(vendor, it.vendorUserId, it.kind, it.payload);
    return reply.code(200).send(r.reply ?? { ok: true });
  };
  app.route({ method: ['GET', 'POST', 'HEAD'], url: '/v1/webhooks/:vendor', handler: hook });

  app.get<{ Params: { id: string }; Querystring: { days?: string; tz?: string } }>('/v1/aggregator/:id/sync', async (req, reply) => {
    const s = session(req, reply);
    if (!s) return;
    if (!cfg.aggregator || cfg.aggregator.id !== req.params.id) return { batches: [] };
    const fns = makeDayFns(req.query.tz || 'UTC');
    const ctx = { cfg, creds: { clientId: '', clientSecret: '', live: true, extra: {} }, redirectUri: '', webhookUrl: '', fetch: f, now: now(), ...fns };
    return { batches: await aggregatorPull(cfg.aggregator.id, cfg, ctx, [], Math.min(90, Number(req.query.days) || 30)) };
  });

  return app;
}
