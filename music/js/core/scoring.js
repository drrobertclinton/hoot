// Scoring for play-along, listen-and-copy and rhythm exercises. Pure, so it is unit-tested in Node.

export const WINDOWS = { perfect: 0.07, good: 0.14, ok: 0.25 }; // seconds either side of the beat

/**
 * Match played notes to expected notes in time.
 * expected: [{ midi, t }]  (t in seconds; midi null/undefined = rhythm only)
 * played:   [{ midi, t }]
 * opts.octaveFree: accept the right note in any octave (voice, mixed instruments)
 * opts.latency: seconds to subtract from played times (measured input delay)
 * Returns { notes:[{ ...expected, status, offset, played }], extras, accuracy (0..100), timing (0..100), stars (0..3), counts }
 */
export function scorePerformance(expected, played, { octaveFree = false, latency = 0, windows = WINDOWS } = {}) {
  const used = new Set();
  const notes = expected.map((e) => {
    let best = null, bestAbs = Infinity, wrong = null, wrongAbs = Infinity;
    played.forEach((p, i) => {
      if (used.has(i)) return;
      const off = (p.t - latency) - e.t; const a = Math.abs(off);
      if (a > windows.ok) return;
      const pitchOk = e.midi == null || p.midi === e.midi || (octaveFree && ((p.midi - e.midi) % 12 + 12) % 12 === 0);
      if (pitchOk && a < bestAbs) { best = i; bestAbs = a; }
      if (!pitchOk && a < wrongAbs) { wrong = i; wrongAbs = a; }
    });
    if (best != null) {
      used.add(best);
      const off = (played[best].t - latency) - e.t;
      const status = bestAbs <= windows.perfect ? 'perfect' : bestAbs <= windows.good ? 'good' : off < 0 ? 'early' : 'late';
      return { ...e, status, offset: off, played: played[best] };
    }
    if (wrong != null) { used.add(wrong); return { ...e, status: 'wrong', offset: (played[wrong].t - latency) - e.t, played: played[wrong] }; }
    return { ...e, status: 'miss', offset: null, played: null };
  });
  const extras = played.filter((_, i) => !used.has(i)).length;
  const counts = { perfect: 0, good: 0, early: 0, late: 0, wrong: 0, miss: 0 };
  notes.forEach((n) => counts[n.status]++);
  const n = Math.max(1, notes.length);
  const pts = counts.perfect * 1 + counts.good * 0.85 + (counts.early + counts.late) * 0.5;
  const accuracy = Math.max(0, Math.round(100 * (pts - extras * 0.25) / n));
  const hit = notes.filter((x) => x.offset != null && x.status !== 'wrong');
  const timing = hit.length ? Math.round(100 * Math.max(0, 1 - hit.reduce((a, x) => a + Math.abs(x.offset), 0) / hit.length / windows.ok)) : 0;
  return { notes, extras, accuracy, timing, stars: starsFor(accuracy), counts };
}
export const starsFor = (acc) => (acc >= 90 ? 3 : acc >= 75 ? 2 : acc >= 50 ? 1 : 0);

/**
 * Wait mode: the music pauses on each note until it is played. Tracks right-first-time vs. after mistakes.
 */
export class WaitFollower {
  constructor(steps, { octaveFree = false } = {}) {
    // steps: [{ notes:[midi...] }]  (a chord step needs all its notes, in any order)
    this.steps = steps.filter((s) => s.notes && s.notes.length);
    this.octaveFree = octaveFree;
    this.i = 0; this.held = new Set(); this.mistakes = 0; this.stepMiss = 0; this.clean = 0;
  }
  get done() { return this.i >= this.steps.length; }
  get current() { return this.steps[this.i]; }
  eq(a, b) { return a === b || (this.octaveFree && ((a - b) % 12 + 12) % 12 === 0); }
  /** Feed one played note. Returns 'hit' (step complete), 'partial', 'wrong' or 'done'. */
  play(midi) {
    if (this.done) return 'done';
    const need = this.current.notes;
    const match = need.find((n) => this.eq(n, midi));
    if (match == null) { this.mistakes++; this.stepMiss++; return 'wrong'; }
    this.held.add(match);
    if (need.every((n) => this.held.has(n))) {
      if (!this.stepMiss) this.clean++;
      this.i++; this.held.clear(); this.stepMiss = 0;
      return 'hit';
    }
    return 'partial';
  }
  result() {
    const n = Math.max(1, this.steps.length);
    const accuracy = Math.round(100 * this.clean / n);
    return { accuracy, mistakes: this.mistakes, stars: starsFor(accuracy) };
  }
}

/** Listen-and-copy: compare a phrase played back from memory with the model. Order matters, timing is loose. */
export function scoreCopy(model, played, { octaveFree = false } = {}) {
  // Longest common subsequence on pitch, so one slip does not fail the rest of the phrase.
  const eq = (a, b) => a === b || (octaveFree && ((a - b) % 12 + 12) % 12 === 0);
  const A = model, B = played; const L = Array.from({ length: A.length + 1 }, () => new Array(B.length + 1).fill(0));
  for (let i = 1; i <= A.length; i++) for (let j = 1; j <= B.length; j++) L[i][j] = eq(A[i - 1], B[j - 1]) ? L[i - 1][j - 1] + 1 : Math.max(L[i - 1][j], L[i][j - 1]);
  const lcs = L[A.length][B.length];
  const accuracy = Math.max(0, Math.round(100 * (lcs - Math.max(0, B.length - A.length) * 0.5) / Math.max(1, A.length)));
  const perNote = A.map((m, i) => B[i] != null && eq(m, B[i]));
  return { accuracy, lcs, perNote, stars: starsFor(accuracy) };
}

/** Rhythm-only scoring for taps/claps against a beat grid (seconds). */
export function scoreRhythm(expectedTimes, tapTimes, opts = {}) {
  return scorePerformance(expectedTimes.map((t) => ({ t, midi: null })), tapTimes.map((t) => ({ t, midi: null })), opts);
}

/** Tuning grade for a sustained note: average cents -> words used across the app. */
export function tuningWord(cents) {
  const a = Math.abs(cents);
  if (a <= 10) return 'In tune';
  if (a <= 25) return cents > 0 ? 'A little sharp' : 'A little flat';
  return cents > 0 ? 'Sharp' : 'Flat';
}
