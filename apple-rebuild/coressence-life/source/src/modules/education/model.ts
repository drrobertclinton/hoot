// Education progress: saved decisions from each lesson and module, worksheets (draft or submitted with a
// receipt) and weekly homework. Pure logic; the React side is in state.ts.
import { ALL_LESSONS, lesson } from './catalog';
import { COURSE_TITLE, homework, worksheets, type Course, type HomeworkDef } from './course/modules';
import type { LessonField } from './lessons';

export type LessonProgress = { checkPassed: boolean; answers: Record<string, string>; completed: string | null };

export type SubmitState = 'draft' | 'submitted';
/** One filled copy of a worksheet. A person can keep several copies (for example a Daily record per day). */
export type SheetEntry = {
  id: string;
  /** e.g. live-ws1 */
  sheet: string;
  values: Record<string, string>;
  status: SubmitState;
  created: string;
  updated: string;
  /** ISO time of the latest submission, kept when the sheet is reopened for editing. */
  submittedAt: string | null;
  receipt: string | null;
};
export type HomeworkEntry = { values: Record<string, string>; status: SubmitState; updated: string; submittedAt: string | null; receipt: string | null; brief: string };

export type EduSlice = { progress: Record<string, LessonProgress>; sheets?: SheetEntry[]; homework?: Record<string, HomeworkEntry> };
export const KEY = 'edu';
export const EMPTY: EduSlice = { progress: {}, sheets: [], homework: {} };

export function completedCount(s: EduSlice, ids: string[] = ALL_LESSONS.map((l) => l.id)) {
  return ids.filter((id) => !!s.progress[id]?.completed).length;
}

export function nextLesson(s: EduSlice, ids: string[]) {
  return ids.find((id) => !s.progress[id]?.completed) ?? null;
}

/** Answers from lessons and modules, keyed by field, for pre-filling the plan builder (most recently saved wins).
 * With `since` (the current plan's date), only decisions saved on or after it, so a revision picks up new ones. */
export function planPrefill(s: EduSlice, since?: string): Record<string, string> {
  const out: Record<string, string> = {};
  const done = ALL_LESSONS.map((l, i) => ({ l, i, p: s.progress[l.id] }))
    .filter((x) => x.p?.answers && (!since || (x.p.completed || '') >= since))
    .sort((a, b) => (a.p!.completed || '').localeCompare(b.p!.completed || '') || a.i - b.i);
  for (const x of done) for (const [k, v] of Object.entries(x.p!.answers)) if (String(v ?? '').trim()) out[k] = v;
  return out;
}

// ------------------------------------------------------------------ worksheets
/** A short receipt code, stable for the same sheet and time: CL-L01-20261102-4F2A. */
export function receiptCode(sheetOrHomework: string, isoTime: string): string {
  const m = /^(live|perform)-(ws|hw)(\d+)$/.exec(sheetOrHomework);
  const tag = m ? `${m[1] === 'live' ? 'L' : 'P'}${m[2] === 'hw' ? 'H' : ''}${m[3].padStart(2, '0')}` : 'X';
  let h = 2166136261;
  for (const ch of sheetOrHomework + isoTime) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return `CL-${tag}-${isoTime.slice(0, 10).replace(/-/g, '')}-${(h >>> 0).toString(16).toUpperCase().padStart(8, '0').slice(0, 4)}`;
}

const hasText = (v: Record<string, string>) => Object.values(v).some((x) => String(x ?? '').trim());

export function saveSheet(s: EduSlice, entry: { id: string; sheet: string; values: Record<string, string> }, nowIso: string, submit: boolean): EduSlice {
  const sheets = s.sheets ?? [];
  const prev = sheets.find((x) => x.id === entry.id);
  if (submit && !hasText(entry.values)) return s;
  const next: SheetEntry = {
    id: entry.id,
    sheet: entry.sheet,
    values: entry.values,
    created: prev?.created ?? nowIso,
    updated: nowIso,
    status: submit ? 'submitted' : 'draft',
    submittedAt: submit ? nowIso : prev?.submittedAt ?? null,
    receipt: submit ? receiptCode(entry.sheet, nowIso) : prev?.receipt ?? null,
  };
  return { ...s, sheets: prev ? sheets.map((x) => (x.id === entry.id ? next : x)) : [...sheets, next] };
}

/** Reopen a submitted sheet for editing. The last receipt stays until it is submitted again. */
export function reopenSheet(s: EduSlice, id: string, nowIso: string): EduSlice {
  return { ...s, sheets: (s.sheets ?? []).map((x) => (x.id === id ? { ...x, status: 'draft' as const, updated: nowIso } : x)) };
}

export function removeSheet(s: EduSlice, id: string): EduSlice {
  return { ...s, sheets: (s.sheets ?? []).filter((x) => x.id !== id) };
}

export const sheetCopies = (s: EduSlice, sheet: string) => (s.sheets ?? []).filter((x) => x.sheet === sheet).sort((a, b) => b.updated.localeCompare(a.updated));
export const sheetSubmitted = (s: EduSlice, sheet: string) => sheetCopies(s, sheet).some((x) => x.submittedAt);

// ------------------------------------------------------------------ homework
export type HomeworkCheck = { label: string; done: boolean; route?: string }[];

export function homeworkChecklist(s: EduSlice, h: HomeworkDef, hasPlan: boolean): HomeworkCheck {
  const items: HomeworkCheck = h.modules.map((id) => ({ label: lesson(id)?.kind === 'lab' ? `Practice lab: ${lesson(id)?.title}` : `Module ${lesson(id)?.number}: ${lesson(id)?.title}`, done: !!s.progress[id]?.completed, route: `/lesson/${id}` }));
  for (const n of h.worksheets) {
    const key = `${h.course}-ws${n}`;
    const def = worksheets(h.course).find((w) => w.number === n);
    items.push({ label: `Worksheet ${n}: ${def?.title ?? ''} (submitted)`, done: sheetSubmitted(s, key), route: `/worksheet/${key}` });
  }
  if (h.needsPlan) items.push({ label: h.week === 2 ? 'A plan saved in the plan builder' : 'Your revised plan saved in the plan builder', done: hasPlan, route: '/plan-builder' });
  return items;
}

/** The brief that goes with a homework submission, assembled from the saved module decisions. */
export function homeworkBrief(s: EduSlice, h: HomeworkDef): string {
  const lines: string[] = [`${COURSE_TITLE[h.course]}: ${h.title}`, h.output, ''];
  for (const id of h.modules) {
    const l = lesson(id);
    const a = s.progress[id]?.answers;
    if (!l || !a) continue;
    const filled = l.apply.fields.filter((f) => String(a[f.key] ?? '').trim());
    if (!filled.length) continue;
    lines.push(l.kind === 'lab' ? `Practice lab: ${l.title}` : `Module ${l.number}: ${l.title}`);
    for (const f of filled) lines.push(`- ${f.label}: ${displayAnswer(f, a[f.key])}`);
    lines.push('');
  }
  return lines.join('\n').trim();
}

export function submitHomework(s: EduSlice, key: string, values: Record<string, string>, brief: string, nowIso: string, submit: boolean): EduSlice {
  const prev = s.homework?.[key];
  const e: HomeworkEntry = {
    values,
    brief,
    updated: nowIso,
    status: submit ? 'submitted' : 'draft',
    submittedAt: submit ? nowIso : prev?.submittedAt ?? null,
    receipt: submit ? receiptCode(key, nowIso) : prev?.receipt ?? null,
  };
  return { ...s, homework: { ...(s.homework ?? {}), [key]: e } };
}

// ------------------------------------------------------------------ progress (outputs, never streaks)
export function courseOutputs(s: EduSlice, course: Course, sequenceIds: string[]) {
  const items = sequenceIds.length + 10 + 4;
  const done =
    sequenceIds.filter((id) => !!s.progress[id]?.completed).length +
    worksheets(course).filter((w) => sheetSubmitted(s, w.key)).length +
    homework(course).filter((h) => s.homework?.[h.key]?.submittedAt).length;
  return { done, total: items };
}

// ------------------------------------------------------------------ export
export function displayAnswer(f: LessonField, v: string | undefined): string {
  if (!v) return '';
  if (f.kind === 'chips' || f.kind === 'choice') return v.split(',').map((k) => f.options?.find((o) => o.key === k)?.label ?? k).join(', ');
  return v;
}

type PlanLike = { created: string; start: string; outcome: string; why: string; action: string; constraint: string; dashboard: string[]; observeDays: number; minimum: string; ruleIf: string; ruleThen: string; reviewDay: number; reviewTime: string; week: { title: string; time?: string; kind: string }[][] };
const DAY = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const WEEKDAY = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** Plain-text export of the current plan, Worksheet 10 and the saved course decisions. */
export function planExportText(s: EduSlice, plan: PlanLike | null, courses: Course[], dashboardLabel: (k: string) => string, today: string): string {
  const out: string[] = ['Coressence Life: my current plan', `Exported ${today}. General education, not medical advice.`, ''];
  if (plan) {
    out.push(`Plan version dated ${plan.created} (started ${plan.start})`);
    const row = (k: string, v: string) => v && out.push(`${k}: ${v}`);
    row('Outcome', plan.outcome);
    row('Why it matters', plan.why);
    row('My one action', plan.action);
    row('Main constraint', plan.constraint);
    row('What I watch', `${plan.dashboard.map(dashboardLabel).join(', ')} for ${plan.observeDays} days`);
    out.push('Ordinary week:');
    plan.week.forEach((slots, i) => slots.length && out.push(`  ${DAY[i]}: ${slots.map((x) => `${x.title}${x.time ? ` at ${x.time}` : ''}`).join('; ')}`));
    row('Minimum plan', plan.minimum);
    if (plan.ruleIf || plan.ruleThen) out.push(`Decision rule: if ${plan.ruleIf}, then ${plan.ruleThen}`);
    out.push(`Weekly review: ${WEEKDAY[plan.reviewDay]} at ${plan.reviewTime}`);
  } else out.push('No plan saved yet in the plan builder.');
  for (const c of courses) {
    const ws10 = sheetCopies(s, `${c}-ws10`)[0];
    const def = worksheets(c).find((w) => w.number === 10)!;
    if (ws10) {
      out.push('', `${COURSE_TITLE[c]}, Worksheet 10: Final 30-day plan (${ws10.status === 'submitted' ? `submitted ${ws10.submittedAt?.slice(0, 10)}, receipt ${ws10.receipt}` : `draft, ${ws10.updated.slice(0, 10)}`})`);
      for (const f of def.fields) if (ws10.values[f.key]?.trim()) out.push(`${f.label}: ${ws10.values[f.key].trim()}`);
    }
    const decisions = ALL_LESSONS.filter((l) => l.course === c && s.progress[l.id]?.completed);
    if (decisions.length) {
      out.push('', `${COURSE_TITLE[c]}: saved decisions`);
      for (const l of decisions) {
        const a = s.progress[l.id].answers;
        out.push(`${l.kind === 'lab' ? 'Practice lab' : `Module ${l.number}`}: ${l.title} (saved ${s.progress[l.id].completed})`);
        for (const f of l.apply.fields) if (String(a[f.key] ?? '').trim()) out.push(`  - ${f.label}: ${displayAnswer(f, a[f.key])}`);
      }
    }
  }
  return out.join('\n');
}
