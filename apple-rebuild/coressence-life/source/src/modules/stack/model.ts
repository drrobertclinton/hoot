// Stack Check: one honest list of everything a person takes (medicines, supplements, peptides, anything else),
// laid out by time of day, with a summary to hand to a pharmacist or clinician. Pure; tested in tests/stack.test.ts.
// The app keeps the list and prepares the questions. It does not judge interactions or doses: that check belongs to
// a pharmacist or clinician looking at the whole list.
export type StackKind = 'medicine' | 'supplement' | 'peptide' | 'other';
export type StackTime = 'morning' | 'midday' | 'evening' | 'bedtime' | 'asNeeded';
export type StackItem = { id: string; name: string; kind: StackKind; amount: string; times: StackTime[]; why: string; by: string; started: string | null; paused: boolean; note: string };
export type StackSlice = { items: StackItem[]; reviewedOn: string | null; reviewedBy: string };
export const KEY = 'stack';
export const EMPTY: StackSlice = { items: [], reviewedOn: null, reviewedBy: '' };

export const KINDS: { key: StackKind; label: string; plural: string }[] = [
  { key: 'medicine', label: 'Medicine', plural: 'Medicines' },
  { key: 'supplement', label: 'Supplement', plural: 'Supplements' },
  { key: 'peptide', label: 'Peptide', plural: 'Peptides' },
  { key: 'other', label: 'Other', plural: 'Other' },
];
export const TIMES: { key: StackTime; label: string }[] = [
  { key: 'morning', label: 'Morning' },
  { key: 'midday', label: 'Midday' },
  { key: 'evening', label: 'Evening' },
  { key: 'bedtime', label: 'Bedtime' },
  { key: 'asNeeded', label: 'As needed' },
];

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');
export const active = (s: StackSlice) => s.items.filter((i) => !i.paused);

/** Items grouped by the time of day they are taken; an item with no time set goes under "No time set". */
export function byTime(s: StackSlice): { key: StackTime | 'unset'; label: string; items: StackItem[] }[] {
  const on = active(s);
  const rows = TIMES.map((t) => ({ key: t.key as StackTime | 'unset', label: t.label, items: on.filter((i) => i.times.includes(t.key)) }));
  const unset = on.filter((i) => !i.times.length);
  if (unset.length) rows.push({ key: 'unset', label: 'No time set', items: unset });
  return rows.filter((r) => r.items.length);
}

/** Names that appear more than once on the active list (same thing from two bottles is the commonest surprise). */
export function listedTwice(s: StackSlice): string[] {
  const seen = new Map<string, number>();
  active(s).forEach((i) => seen.set(norm(i.name), (seen.get(norm(i.name)) ?? 0) + 1));
  const out: string[] = [];
  active(s).forEach((i) => {
    if ((seen.get(norm(i.name)) ?? 0) > 1 && !out.some((n) => norm(n) === norm(i.name))) out.push(i.name.trim());
  });
  return out;
}

/** What the list itself is missing or should be asked about. Each line is a question for a professional, never a verdict. */
export function questions(s: StackSlice, today: string): string[] {
  const on = active(s);
  const q: string[] = [];
  if (!on.length) return q;
  if (on.length > 1) q.push(`I take these ${on.length} things. Is it safe to take them together, and at these times of day?`);
  const twice = listedTwice(s);
  if (twice.length) q.push(`${twice.join(' and ')} ${twice.length > 1 ? 'are' : 'is'} on my list more than once. Am I doubling up?`);
  const noWhy = on.filter((i) => !i.why.trim());
  if (noWhy.length) q.push(`What is ${noWhy.map((i) => i.name.trim()).join(', ')} for, and do I still need it?`);
  const self = on.filter((i) => i.kind !== 'medicine' && !i.by.trim());
  if (self.length && on.some((i) => i.kind === 'medicine')) q.push(`I started ${self.map((i) => i.name.trim()).join(', ')} on my own. Does that change anything with my prescriptions?`);
  if (on.some((i) => i.kind === 'peptide')) q.push('Who is supervising my peptides, and what should I watch for?');
  const many = TIMES.map((t) => on.filter((i) => i.times.includes(t.key)).length);
  if (Math.max(...many) >= 5) q.push('Several of these land at the same time of day. Should any be spaced apart or taken with food?');
  if (!s.reviewedOn) q.push('Can we review this whole list together today?');
  else if (monthsBetween(s.reviewedOn, today) >= 6) q.push(`This list was last reviewed ${s.reviewedOn}. Is it time to review it again?`);
  return q;
}

export function monthsBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  return (by - ay) * 12 + (bm - am) - (bd < ad ? 1 : 0);
}

/** Plain-text summary to show or send to a pharmacist or clinician. */
export function summaryText(s: StackSlice, name: string, today: string): string {
  const on = active(s);
  const lines: string[] = [`Everything I take${name ? `: ${name}` : ''}`, `As of ${today}`, ''];
  KINDS.forEach((k) => {
    const items = on.filter((i) => i.kind === k.key);
    if (!items.length) return;
    lines.push(k.plural.toUpperCase());
    items.forEach((i) => {
      const when = i.times.map((t) => TIMES.find((x) => x.key === t)?.label.toLowerCase()).filter(Boolean).join(', ');
      lines.push(`- ${i.name.trim()}${i.amount.trim() ? `, ${i.amount.trim()}` : ''}${when ? ` (${when})` : ''}`);
      const extra = [i.why.trim() ? `for: ${i.why.trim()}` : '', i.by.trim() ? `from: ${i.by.trim()}` : '', i.started ? `since ${i.started}` : '', i.note.trim()].filter(Boolean).join('; ');
      if (extra) lines.push(`  ${extra}`);
    });
    lines.push('');
  });
  const paused = s.items.filter((i) => i.paused);
  if (paused.length) lines.push('PAUSED OR STOPPED', ...paused.map((i) => `- ${i.name.trim()}`), '');
  const q = questions(s, today);
  if (q.length) lines.push('MY QUESTIONS', ...q.map((x) => `- ${x}`), '');
  lines.push('This list was written by me in the Coressence Life app. Amounts are as written on my labels.');
  return lines.join('\n');
}

export function upsert(s: StackSlice, item: StackItem): StackSlice {
  const i = s.items.findIndex((x) => x.id === item.id);
  const items = i < 0 ? [...s.items, item] : s.items.map((x) => (x.id === item.id ? item : x));
  return { ...s, items };
}
export const remove = (s: StackSlice, id: string): StackSlice => ({ ...s, items: s.items.filter((x) => x.id !== id) });
export const markReviewed = (s: StackSlice, today: string, by: string): StackSlice => ({ ...s, reviewedOn: today, reviewedBy: by.trim() });
