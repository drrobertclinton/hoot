// Settings come only from environment variables (see .env.example). No real keys live in this repository.
export type VendorId = 'oura' | 'whoop' | 'garmin' | 'fitbit' | 'withings' | 'polar' | 'dexcom';
export const VENDORS: VendorId[] = ['oura', 'whoop', 'garmin', 'fitbit', 'withings', 'polar', 'dexcom'];
export type AggregatorId = 'terra' | 'junction' | 'rook';

export type VendorCreds = { clientId: string; clientSecret: string; live: boolean; extra: Record<string, string> };

export type Config = {
  port: number;
  /** Public https address of this service, used to build OAuth redirect and webhook URLs. */
  publicUrl: string;
  /** 32-byte key (base64) that encrypts tokens and queued data at rest. */
  dataKey: Buffer;
  /** Where the encrypted store file lives (swap FileStore for a database in production). */
  storePath: string;
  /** App links the service may return to after sign-in. */
  returnUrls: string[];
  vendors: Partial<Record<VendorId, VendorCreds>>;
  aggregator: { id: AggregatorId; apiKey: string; devId?: string; baseUrl?: string } | null;
  /** Dexcom sandbox while testing. */
  dexcomSandbox: boolean;
};

const env = (k: string, e: NodeJS.ProcessEnv) => (e[k] || '').trim();

export function loadConfig(e: NodeJS.ProcessEnv = process.env): Config {
  const key = env('CONNECT_DATA_KEY', e);
  const dataKey = key ? Buffer.from(key, 'base64') : Buffer.alloc(0);
  if (key && dataKey.length !== 32) throw new Error('CONNECT_DATA_KEY must be 32 bytes, base64-encoded (openssl rand -base64 32).');
  const vendors: Config['vendors'] = {};
  for (const v of VENDORS) {
    const P = v.toUpperCase();
    const clientId = env(`${P}_CLIENT_ID`, e);
    const clientSecret = env(`${P}_CLIENT_SECRET`, e);
    if (!clientId || !clientSecret) continue;
    const extra: Record<string, string> = {};
    for (const [k, val] of Object.entries(e)) if (k.startsWith(`${P}_`) && !/_CLIENT_(ID|SECRET)$|_LIVE$/.test(k) && val) extra[k.slice(P.length + 1)] = val;
    vendors[v] = { clientId, clientSecret, live: env(`${P}_LIVE`, e) === 'true', extra };
  }
  const agg = env('AGGREGATOR', e) as AggregatorId | '';
  return {
    port: Number(env('PORT', e) || 8787),
    publicUrl: env('CONNECT_PUBLIC_URL', e).replace(/\/+$/, ''),
    dataKey,
    storePath: env('CONNECT_STORE_PATH', e) || './data/store.json',
    returnUrls: (env('CONNECT_RETURN_URLS', e) || 'coressence://devices').split(',').map((s) => s.trim()).filter(Boolean),
    vendors,
    aggregator: agg && env('AGGREGATOR_API_KEY', e) ? { id: agg, apiKey: env('AGGREGATOR_API_KEY', e), devId: env('AGGREGATOR_DEV_ID', e) || undefined, baseUrl: env('AGGREGATOR_BASE_URL', e) || undefined } : null,
    dexcomSandbox: env('DEXCOM_SANDBOX', e) !== 'false',
  };
}
