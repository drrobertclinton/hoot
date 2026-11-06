// Everything the app remembers, kept on this device (localStorage). One object, saved after each change.
import { review as srsReview } from './core/srs.js';

const KEY = 'ml.state.v1';
const today = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const dayKey = today;

const DEFAULT = {
  onboarded: false,
  profile: { name: '', instrument: 'piano', level: 'new', goal: 15, audience: 'adult' },
  settings: { input: 'auto', latency: 0.06, names: 'letters', clickVol: 0.7, backingVol: 0.6, handed: 'right', reminders: false, theme: 'system', countIn: true },
  lessons: {},          // id -> { stars, best, done, at, attempts }
  xp: 0,
  streak: { count: 0, last: null, best: 0, freezes: 1 },
  days: {},             // 'YYYY-MM-DD' -> { mins, xp, lessons }
  log: [],              // practice log for students, parents and teachers
  cards: {},            // spaced repetition: id -> card
  ach: {},              // achievement id -> unlocked time
  plan: { days: [1, 2, 3, 4, 5], mins: 15, focus: [] },
  songs: {},            // song id -> { best, plays }
  voiceRange: null,
};

let S = load();
const listeners = new Set();
function load() {
  try { const raw = localStorage.getItem(KEY); if (raw) return merge(structuredClone(DEFAULT), JSON.parse(raw)); } catch { /* fresh start */ }
  return structuredClone(DEFAULT);
}
function merge(a, b) { for (const k of Object.keys(b || {})) { if (a[k] && typeof a[k] === 'object' && !Array.isArray(a[k]) && b[k] && typeof b[k] === 'object' && !Array.isArray(b[k])) merge(a[k], b[k]); else a[k] = b[k]; } return a; }
export function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch { /* storage full or blocked */ } listeners.forEach((f) => { try { f(S); } catch (e) { console.warn(e); } }); }
export const state = () => S;
export const onChange = (f) => { listeners.add(f); return () => listeners.delete(f); };
export function update(fn) { fn(S); save(); }
export function resetAll() { S = structuredClone(DEFAULT); save(); }
export function exportData() { return JSON.stringify({ app: 'music-lessons', version: 1, at: new Date().toISOString(), data: S }, null, 1); }
export function importData(text) { const o = JSON.parse(text); if (!o || o.app !== 'music-lessons' || !o.data) throw new Error('This file is not a backup from this app.'); S = merge(structuredClone(DEFAULT), o.data); save(); }

// ---------- levels and XP ----------
// Level n needs 100 * n * (n + 1) / 2 total XP: 100, 300, 600, 1000 ...
export function levelOf(xp = S.xp) { let n = 1; while (xp >= 50 * n * (n + 1)) n++; const lo = 50 * (n - 1) * n, hi = 50 * n * (n + 1); return { level: n, into: xp - lo, need: hi - lo, pct: Math.round(100 * (xp - lo) / (hi - lo)) }; }
export const LEVEL_TITLES = ['Newcomer', 'Explorer', 'Apprentice', 'Player', 'Performer', 'Musician', 'Virtuoso', 'Maestro'];
export const levelTitle = (n) => LEVEL_TITLES[Math.min(LEVEL_TITLES.length - 1, Math.floor((n - 1) / 3))];

// ---------- practice tracking ----------
function touchStreak() {
  const t = today(); const st = S.streak;
  if (st.last === t) return;
  const y = new Date(); y.setDate(y.getDate() - 1);
  const y2 = new Date(); y2.setDate(y2.getDate() - 2);
  if (st.last === today(y)) st.count++;
  else if (st.last === today(y2) && st.freezes > 0) { st.freezes--; st.count++; }
  else st.count = 1;
  st.last = t; st.best = Math.max(st.best, st.count);
  if (st.count % 7 === 0) st.freezes = Math.min(2, st.freezes + 1); // earn a streak freeze every week
}
/** Record practice. kind: lesson | song | review | tool | drill */
export function addPractice({ inst, kind, title, secs = 0, xp = 0, score = null, id = null }) {
  const t = today();
  const d = S.days[t] || (S.days[t] = { mins: 0, xp: 0, lessons: 0 });
  d.mins = Math.round((d.mins + secs / 60) * 10) / 10; d.xp += xp; if (kind === 'lesson') d.lessons++;
  S.xp += xp;
  if (secs >= 20 || xp > 0) touchStreak();
  S.log.unshift({ at: Date.now(), inst, kind, title, mins: Math.max(1, Math.round(secs / 60)), score, id });
  if (S.log.length > 600) S.log.length = 600;
  save();
}
export function streakAlive() { const st = S.streak; if (!st.last) return 0; const y = new Date(); y.setDate(y.getDate() - 1); return st.last === today() || st.last === today(y) ? st.count : 0; }
export const minutesToday = () => (S.days[today()] || {}).mins || 0;

export function finishLesson(lesson, stars, secs) {
  const rec = S.lessons[lesson.id] || { stars: 0, best: 0, done: false, attempts: 0 };
  const first = !rec.done;
  rec.attempts++; rec.done = true; rec.at = Date.now();
  const gained = first ? lesson.xp : Math.round(lesson.xp * 0.3) + Math.max(0, stars - rec.stars) * 5;
  rec.stars = Math.max(rec.stars, stars);
  S.lessons[lesson.id] = rec;
  addPractice({ inst: lesson.inst, kind: 'lesson', title: lesson.title, secs, xp: gained, score: stars, id: lesson.id });
  return { gained, first };
}
export const lessonRec = (id) => S.lessons[id] || null;

// ---------- spaced repetition ----------
export function srsGrade(id, grade, meta) {
  const c = S.cards[id] || { id, ...meta };
  S.cards[id] = srsReview(c, grade);
  save();
}
export const cards = () => Object.values(S.cards);
