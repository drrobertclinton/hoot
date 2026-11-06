import { PIANO } from './piano.js';
import { GUITAR } from './guitar.js';
import { VIOLIN, CELLO, BASS, ALTOSAX, TENORSAX, TRUMPET, CLARINET, HARP, VOICE } from './others.js';
import { THEORY_COURSE } from './theory.js';

export const COURSES = { piano: PIANO, guitar: GUITAR, violin: VIOLIN, cello: CELLO, bass: BASS, altosax: ALTOSAX, tenorsax: TENORSAX, trumpet: TRUMPET, clarinet: CLARINET, harp: HARP, voice: VOICE, theory: THEORY_COURSE };

// Free tier: the first unit of every instrument, and the first two units of theory.
const FREE_UNITS = { theory: 2 };
for (const [inst, units] of Object.entries(COURSES)) {
  units.forEach((u, ui) => u.lessons.forEach((l, li) => { l.inst = inst; l.unit = ui; l.index = li; l.free = ui < (FREE_UNITS[inst] || 1); }));
}
export const lessonsOf = (inst) => (COURSES[inst] || []).flatMap((u) => u.lessons);
export function findLesson(id) {
  for (const units of Object.values(COURSES)) for (const u of units) for (const l of u.lessons) if (l.id === id) return l;
  return null;
}
/** Next lesson in the same course, or null. */
export function nextLesson(l) { const all = lessonsOf(l.inst); const i = all.indexOf(l); return all[i + 1] || null; }
export const lessonCount = (inst) => lessonsOf(inst).length;
