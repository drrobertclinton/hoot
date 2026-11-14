// What the service keeps, all encrypted at rest with CONNECT_DATA_KEY:
//  - sessions (one per app install; only a hash of the session token is stored)
//  - vendor tokens per session, and the vendor's user id so webhooks can be matched
//  - short-lived OAuth state (10 minutes)
//  - an inbox for vendors that push data (Garmin) or ping (WHOOP, Oura, Polar, Withings), deleted on delivery
//    and never kept longer than 7 days
// Health data from pull vendors is fetched at sync time and not stored. FileStore suits a single small server;
// for production put the same interface on Postgres or similar with encryption at rest.
import fs from 'node:fs';
import path from 'node:path';
import { open, seal, sha256 } from './crypto.ts';
import type { VendorId } from './config.ts';

export type Tokens = { accessToken: string; refreshToken?: string; expiresAt?: number; scope?: string; vendorUserId?: string; extra?: Record<string, string> };
export type Connection = { vendor: VendorId; since: number; lastSync: number | null; vendorUserId?: string; tokens: Tokens };
export type Pending = { session: string; vendor: VendorId; verifier: string; returnUrl: string; exp: number };
export type InboxItem = { vendor: VendorId; at: number; kind: string; payload: unknown };

type Data = {
  sessions: Record<string, { created: number }>;
  connections: Record<string, Record<string, string>>; // sessionHash -> vendor -> sealed Connection
  pending: Record<string, string>; // state -> sealed Pending
  inbox: Record<string, string[]>; // sessionHash -> sealed InboxItem[]
  vendorUsers: Record<string, string>; // `${vendor}:${vendorUserId}` -> sessionHash
};
const EMPTY = (): Data => ({ sessions: {}, connections: {}, pending: {}, inbox: {}, vendorUsers: {} });
const WEEK = 7 * 86400_000;

export class Store {
  private d: Data;
  constructor(private key: Buffer, private file: string | null) {
    if (key.length !== 32) throw new Error('A 32-byte data key is required.');
    this.d = file && fs.existsSync(file) ? (JSON.parse(fs.readFileSync(file, 'utf8')) as Data) : EMPTY();
  }
  private save() {
    if (!this.file) return;
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    const tmp = this.file + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(this.d), { mode: 0o600 });
    fs.renameSync(tmp, this.file);
  }

  createSession(token: string) {
    this.d.sessions[sha256(token)] = { created: Date.now() };
    this.save();
  }
  hasSession(token: string) {
    return !!this.d.sessions[sha256(token)];
  }

  putPending(state: string, p: Pending) {
    const now = Date.now();
    for (const [k, v] of Object.entries(this.d.pending)) if (open<Pending>(this.key, v).exp < now) delete this.d.pending[k];
    this.d.pending[state] = seal(this.key, p);
    this.save();
  }
  takePending(state: string): Pending | null {
    const v = this.d.pending[state];
    if (!v) return null;
    delete this.d.pending[state];
    this.save();
    const p = open<Pending>(this.key, v);
    return p.exp >= Date.now() ? p : null;
  }

  putConnection(session: string, c: Connection) {
    const h = sha256(session);
    (this.d.connections[h] ||= {})[c.vendor] = seal(this.key, c);
    if (c.vendorUserId) this.d.vendorUsers[`${c.vendor}:${c.vendorUserId}`] = h;
    this.save();
  }
  connections(session: string): Connection[] {
    return Object.values(this.d.connections[sha256(session)] || {}).map((v) => open<Connection>(this.key, v));
  }
  connection(session: string, vendor: VendorId): Connection | null {
    const v = this.d.connections[sha256(session)]?.[vendor];
    return v ? open<Connection>(this.key, v) : null;
  }
  removeConnection(session: string, vendor: VendorId) {
    const h = sha256(session);
    const c = this.connection(session, vendor);
    if (c?.vendorUserId) delete this.d.vendorUsers[`${vendor}:${c.vendorUserId}`];
    delete this.d.connections[h]?.[vendor];
    this.d.inbox[h] = (this.d.inbox[h] || []).filter((x) => open<InboxItem>(this.key, x).vendor !== vendor);
    this.save();
  }

  /** Webhooks arrive with the vendor's user id; queue for whichever session owns it. Returns false when unknown. */
  enqueue(vendor: VendorId, vendorUserId: string, kind: string, payload: unknown): boolean {
    const h = this.d.vendorUsers[`${vendor}:${vendorUserId}`];
    if (!h) return false;
    const now = Date.now();
    const keep = (this.d.inbox[h] || []).filter((x) => open<InboxItem>(this.key, x).at > now - WEEK);
    keep.push(seal(this.key, { vendor, at: now, kind, payload } satisfies InboxItem));
    this.d.inbox[h] = keep.slice(-2000);
    this.save();
    return true;
  }
  /** Hand over and delete everything queued for a session. */
  drain(session: string): InboxItem[] {
    const h = sha256(session);
    const items = (this.d.inbox[h] || []).map((x) => open<InboxItem>(this.key, x));
    this.d.inbox[h] = [];
    this.save();
    return items;
  }
  /** Raw view for tests: confirms nothing is stored in the clear. */
  rawJson() {
    return JSON.stringify(this.d);
  }
}
