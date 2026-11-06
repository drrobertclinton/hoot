// Achievements: checked after practice; unlocked ones are kept with the time they were earned.
import { state, update, streakAlive, levelOf } from './state.js';
import { COURSES } from './content/courses.js';

export const ACHIEVEMENTS = [
  { id: 'first', icon: 'sparkle', title: 'First note', text: 'Finish your first lesson.', test: (S) => doneCount(S) >= 1 },
  { id: 'five', icon: 'learn', title: 'Warming up', text: 'Finish 5 lessons.', test: (S) => doneCount(S) >= 5 },
  { id: 'twentyfive', icon: 'learn', title: 'Dedicated', text: 'Finish 25 lessons.', test: (S) => doneCount(S) >= 25 },
  { id: 'hundred', icon: 'trophy', title: 'Centurion', text: 'Finish 100 lessons.', test: (S) => doneCount(S) >= 100 },
  { id: 'stars3', icon: 'star', title: 'Three stars', text: 'Earn three stars on a lesson.', test: (S) => Object.values(S.lessons).some((l) => l.stars >= 3) },
  { id: 'streak3', icon: 'flame', title: 'On a roll', text: 'Practice three days in a row.', test: (S) => S.streak.best >= 3 },
  { id: 'streak7', icon: 'flame', title: 'One full week', text: 'Practice seven days in a row.', test: (S) => S.streak.best >= 7 },
  { id: 'streak30', icon: 'flame', title: 'Habit formed', text: 'Practice 30 days in a row.', test: (S) => S.streak.best >= 30 },
  { id: 'hour', icon: 'calendar', title: 'First hour', text: 'Practice for 60 minutes in total.', test: (S) => totalMins(S) >= 60 },
  { id: 'tenhours', icon: 'calendar', title: 'Ten hours', text: 'Practice for 10 hours in total.', test: (S) => totalMins(S) >= 600 },
  { id: 'theory1', icon: 'theory', title: 'Theory starter', text: 'Finish a theory unit.', test: (S) => COURSES.theory.some((u) => u.lessons.every((l) => S.lessons[l.id]?.done)) },
  { id: 'unit', icon: 'trophy', title: 'Unit cleared', text: 'Finish every lesson in an instrument unit.', test: (S) => Object.entries(COURSES).some(([k, us]) => k !== 'theory' && us.some((u) => u.lessons.every((l) => S.lessons[l.id]?.done))) },
  { id: 'multi', icon: 'songs', title: 'Multi-instrumentalist', text: 'Finish lessons on three instruments.', test: (S) => new Set(Object.keys(S.lessons).map((id) => instOf(id)).filter((x) => x && x !== 'theory')).size >= 3 },
  { id: 'song3', icon: 'songs', title: 'Showstopper', text: 'Get three stars on a song.', test: (S) => Object.values(S.songs).some((x) => x.best >= 3) },
  { id: 'review50', icon: 'cards', title: 'Memory builder', text: 'Review 50 flashcards.', test: (S) => Object.values(S.cards).reduce((a, c) => a + (c.reps || 0) + (c.lapses || 0), 0) >= 50 },
  { id: 'level5', icon: 'bolt', title: 'Level 5', text: 'Reach level 5.', test: (S) => levelOf(S.xp).level >= 5 },
];
const lessonInst = new Map(); for (const [k, us] of Object.entries(COURSES)) for (const u of us) for (const l of u.lessons) lessonInst.set(l.id, k);
const instOf = (id) => lessonInst.get(id);
const doneCount = (S) => Object.values(S.lessons).filter((l) => l.done).length;
const totalMins = (S) => Object.values(S.days).reduce((a, d) => a + (d.mins || 0), 0);

/** Returns achievements newly unlocked by the latest practice. */
export function checkAchievements() {
  const S = state(); const out = [];
  for (const a of ACHIEVEMENTS) if (!S.ach[a.id] && a.test(S)) { out.push(a); }
  if (out.length) update((s) => { out.forEach((a) => { s.ach[a.id] = Date.now(); }); });
  return out;
}
