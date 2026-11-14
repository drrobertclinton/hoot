// Starts Coressence Connect. Configure with environment variables (see .env.example); refuses to start without
// a data key and a public https URL.
import { loadConfig } from './config.ts';
import { buildServer } from './server.ts';
import { Store } from './store.ts';

const cfg = loadConfig();
if (cfg.dataKey.length !== 32) throw new Error('Set CONNECT_DATA_KEY (openssl rand -base64 32).');
if (!/^https:\/\//.test(cfg.publicUrl)) throw new Error('Set CONNECT_PUBLIC_URL to this service’s public https address.');
const app = buildServer({ cfg, store: new Store(cfg.dataKey, cfg.storePath) });
app.listen({ port: cfg.port, host: '0.0.0.0' }).then(() => console.log(`Coressence Connect on :${cfg.port} (${Object.keys(cfg.vendors).join(', ') || 'no vendors configured yet'})`));
