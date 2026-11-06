// Small builders that keep the course files readable.
export const card = (title, text, viz) => ({ t: 'card', title, text, viz });
export const listen = (text, melody, o = {}) => ({ t: 'listen', text, melody, bpm: 80, ...o });
export const play = (text, melody, o = {}) => ({ t: 'play', text, melody, bpm: 72, mode: 'wait', ...o });
export const tempo = (text, melody, o = {}) => ({ t: 'play', text, melody, bpm: 72, mode: 'tempo', ...o });
export const copy = (text, melody, o = {}) => ({ t: 'copy', text, melody, bpm: 76, ...o });
export const quiz = (q, opts, a, why, viz) => ({ t: 'quiz', q, opts, a, why, viz });
export const rhythm = (text, pattern, o = {}) => ({ t: 'rhythm', text, pattern, bpm: 72, ...o });
export const tone = (text, note, secs = 4, o = {}) => ({ t: 'tone', text, note, secs, ...o });
export const chord = (text, sym, o = {}) => ({ t: 'chord', text, sym, ...o });
export const changes = (text, chords, o = {}) => ({ t: 'changes', text, chords, bpm: 60, beats: 4, ...o });
export const improv = (text, o = {}) => ({ t: 'improv', text, secs: 40, bpm: 84, ...o });
export const drill = (kind, o = {}) => ({ t: 'drill', kind, count: 8, ...o });
export const song = (text, id, o = {}) => ({ t: 'song', text, id, ...o });
export const L = (id, title, sub, steps, o = {}) => ({ id, title, sub, steps, xp: o.xp || 20 + steps.length * 5, ...o });
export const U = (title, lessons, o = {}) => ({ title, lessons, ...o });
/** Finger map string 'C4:1 D4:2' -> { C4: 1, D4: 2 } */
export const F = (s) => Object.fromEntries(s.trim().split(/\s+/).map((x) => x.split(':')).map(([n, f]) => [n, isNaN(f) ? f : Number(f)]));
