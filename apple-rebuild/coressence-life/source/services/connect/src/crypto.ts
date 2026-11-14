// Encryption at rest, PKCE, random ids and webhook signature checks (Node's built-in crypto only).
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export const randomId = (bytes = 32) => randomBytes(bytes).toString('base64url');
export const sha256 = (s: string) => createHash('sha256').update(s).digest('base64url');

/** AES-256-GCM. Output: base64url(iv | tag | ciphertext). */
export function seal(key: Buffer, plain: unknown): string {
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', key, iv);
  const body = Buffer.concat([c.update(JSON.stringify(plain), 'utf8'), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), body]).toString('base64url');
}
export function open<T>(key: Buffer, sealed: string): T {
  const b = Buffer.from(sealed, 'base64url');
  const d = createDecipheriv('aes-256-gcm', key, b.subarray(0, 12));
  d.setAuthTag(b.subarray(12, 28));
  return JSON.parse(Buffer.concat([d.update(b.subarray(28)), d.final()]).toString('utf8')) as T;
}

/** PKCE (RFC 7636) S256 pair. */
export function pkce() {
  const verifier = randomBytes(48).toString('base64url');
  return { verifier, challenge: createHash('sha256').update(verifier).digest('base64url') };
}

export function safeEqual(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
export const hmac = (alg: 'sha256' | 'sha1', key: string, data: string, enc: 'hex' | 'base64') => createHmac(alg, key).update(data, 'utf8').digest(enc);

/** WHOOP: base64 HMAC-SHA256 of timestamp header + raw body, keyed with the client secret. */
export function verifyWhoop(secret: string, raw: string, timestamp: string, signature: string) {
  return !!timestamp && !!signature && safeEqual(hmac('sha256', secret, timestamp + raw, 'base64'), signature);
}
/** Oura: uppercase hex HMAC-SHA256 of timestamp header + body, keyed with the client secret. */
export function verifyOura(secret: string, raw: string, timestamp: string, signature: string) {
  return !!timestamp && !!signature && safeEqual(hmac('sha256', secret, timestamp + raw, 'hex').toUpperCase(), signature.toUpperCase());
}
/** Polar: hex HMAC-SHA256 of the raw body, keyed with the webhook's signature_secret_key. */
export function verifyPolar(secret: string, raw: string, signature: string) {
  return !!signature && safeEqual(hmac('sha256', secret, raw, 'hex'), signature.toLowerCase());
}
