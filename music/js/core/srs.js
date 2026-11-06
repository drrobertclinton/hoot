// Spaced repetition (SM-2 style) for theory flashcards: note names, key signatures, intervals, chords, ear skills.
const DAY = 86400000;

/** Grade 0..3 (again, hard, good, easy). Returns the updated card. */
export function review(card, grade, now = Date.now()) {
  const c = { ease: 2.5, interval: 0, reps: 0, lapses: 0, ...card };
  if (grade === 0) {
    c.reps = 0; c.lapses++; c.interval = 0; c.ease = Math.max(1.3, c.ease - 0.2);
    c.due = now + 10 * 60000; // again in ten minutes
  } else {
    c.reps++;
    if (c.reps === 1) c.interval = grade === 3 ? 3 : 1;
    else if (c.reps === 2) c.interval = grade === 3 ? 7 : grade === 1 ? 3 : 4;
    else c.interval = Math.round(c.interval * (grade === 1 ? 1.2 : grade === 3 ? c.ease * 1.3 : c.ease));
    c.ease = Math.max(1.3, c.ease + (grade === 3 ? 0.15 : grade === 1 ? -0.15 : 0));
    c.due = now + c.interval * DAY;
  }
  c.last = now;
  return c;
}
export const isDue = (card, now = Date.now()) => !card.due || card.due <= now;
export const isMastered = (card) => (card.interval || 0) >= 21;
/** Due cards first (oldest first), then new cards, capped. */
export function queue(cards, { now = Date.now(), max = 20, newMax = 8 } = {}) {
  const due = cards.filter((c) => c.due && c.due <= now).sort((a, b) => a.due - b.due);
  const fresh = cards.filter((c) => !c.due).slice(0, newMax);
  return [...due, ...fresh].slice(0, max);
}
