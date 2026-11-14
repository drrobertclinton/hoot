// Pure plan rules (no React Native imports; unit-tested in tests/billing.test.ts).
//
// Free: Today hub, Track, Plan, Coach, Labs, MD and Shop, plus the last 7 days of history in Measure, Move,
//       Fuel, Sleep, Recover, Restore and Rehearse, and lesson 1 of the course.
// Coressence+ All-Access (coressence_all_access): full history and trends in every module, correlations in
//       Track, every lesson in both course tracks.
// Course track (one-time): every lesson of that track (shared lessons open with either track).
import { ENT_ALL_ACCESS, ENT_COURSE_LIVE, ENT_COURSE_PERFORM, FREE } from './config';

export type EntitlementInfo = { productIdentifier: string; expirationDate: string | null; willRenew: boolean };
export type CustomerSnapshot = {
  active: Record<string, EntitlementInfo>;
  activeSubscriptions: string[];
  managementURL: string | null;
  fetchedAt: number;
};

const baseId = (id: string) => String(id || '').split(':')[0];

export function snapshotFrom(ci: any, now = Date.now()): CustomerSnapshot {
  const active: Record<string, EntitlementInfo> = {};
  const a = (ci && ci.entitlements && ci.entitlements.active) || {};
  for (const k of Object.keys(a)) {
    const e = a[k];
    if (!e || e.isActive === false) continue;
    active[k] = { productIdentifier: baseId(e.productIdentifier), expirationDate: e.expirationDate || null, willRenew: !!e.willRenew };
  }
  return { active, activeSubscriptions: ((ci && ci.activeSubscriptions) || []).map(baseId), managementURL: (ci && ci.managementURL) || null, fetchedAt: now };
}

export function activeEntitlements(s: CustomerSnapshot | null, now = Date.now()): Set<string> {
  const out = new Set<string>();
  if (!s) return out;
  for (const [k, e] of Object.entries(s.active)) {
    const exp = e.expirationDate ? Date.parse(e.expirationDate) : NaN;
    if (!Number.isNaN(exp) && exp < now - 60_000) continue;
    out.add(k);
  }
  return out;
}

export const hasAllAccess = (s: CustomerSnapshot | null, now = Date.now()) => activeEntitlements(s, now).has(ENT_ALL_ACCESS);

export type LessonTrack = 'core' | 'live' | 'perform';

/** Can this lesson be opened? */
export function canOpenLesson(lessonId: string, track: LessonTrack, ents: Set<string>, preview = false): boolean {
  if (preview || FREE.freeLessons.includes(lessonId) || ents.has(ENT_ALL_ACCESS)) return true;
  if (track === 'core') return ents.has(ENT_COURSE_LIVE) || ents.has(ENT_COURSE_PERFORM);
  return ents.has(track === 'live' ? ENT_COURSE_LIVE : ENT_COURSE_PERFORM);
}

/** How many days of history a module may show. */
export function historyDays(premium: boolean, wanted: number): number {
  return premium ? wanted : Math.min(wanted, FREE.historyDays);
}

export function trialWords(intro: any) {
  if (!intro || Number(intro.price) > 0) return '';
  const n = (Number(intro.periodNumberOfUnits) || 1) * (Number(intro.cycles) || 1);
  const unit = String(intro.periodUnit || 'DAY').toLowerCase().replace(/s$/, '');
  return `${n}-${unit} free trial`;
}

export function periodWords(iso: string | null | undefined) {
  const m = /^P(\d+)([DWMY])$/.exec(String(iso || ''));
  if (!m) return '';
  const n = Number(m[1]);
  const unit = ({ D: 'day', W: 'week', M: 'month', Y: 'year' } as Record<string, string>)[m[2]];
  return n === 1 ? unit : `${n} ${unit}s`;
}

/** "Save 33%" for annual vs 12 monthly payments. */
export function annualSavings(monthly: number, annual: number): number {
  if (!(monthly > 0) || !(annual > 0)) return 0;
  return Math.round((1 - annual / (monthly * 12)) * 100);
}
