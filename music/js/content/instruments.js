// Instruments: written-vs-sounding transposition, listening ranges, and fingering data.
// Fingerings are standard beginner fingerings, cross-checked against published charts (see RESEARCH.md, "Fingering sources").
import { nameToMidi, midiToName, pc } from '../core/music.js';

// transpose = semitones the WRITTEN note is above the SOUNDING note.
export const INSTRUMENTS = [
  { id: 'piano', name: 'Piano', short: 'Piano', color: '#5b5bf0', clef: 'grand', transpose: 0, family: 'keys',
    listen: { fmin: 60, fmax: 2100, frame: 2048 }, midi: true, range: ['A0', 'C8'],
    blurb: 'Read music, play with both hands, chords, scales and real pieces.' },
  { id: 'guitar', name: 'Guitar', short: 'Guitar', color: '#ef6b3a', clef: 'treble8', transpose: 12, family: 'strings',
    listen: { fmin: 75, fmax: 1400, frame: 2048 }, strings: ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'], range: ['E3', 'E6'],
    blurb: 'Open chords, strumming, riffs, melodies and the pentatonic scale.' },
  { id: 'bass', name: 'Bass Guitar', short: 'Bass', color: '#d94f7c', clef: 'bass8', transpose: 12, family: 'strings',
    listen: { fmin: 36, fmax: 500, frame: 4096 }, strings: ['E1', 'A1', 'D2', 'G2'], range: ['E2', 'G4'],
    blurb: 'Lock in with the drums: roots, fifths, grooves and walking lines.' },
  { id: 'violin', name: 'Violin', short: 'Violin', color: '#c9822b', clef: 'treble', transpose: 0, family: 'strings',
    listen: { fmin: 180, fmax: 2700, frame: 2048 }, strings: ['G3', 'D4', 'A4', 'E5'], range: ['G3', 'B5'],
    blurb: 'Bow hold, open strings, first-position fingers and your first tunes.' },
  { id: 'cello', name: 'Cello', short: 'Cello', color: '#a3593a', clef: 'bass', transpose: 0, family: 'strings',
    listen: { fmin: 60, fmax: 900, frame: 2048 }, strings: ['C2', 'G2', 'D3', 'A3'], range: ['C2', 'D4'],
    blurb: 'Posture, bowing, first position on all four strings and warm melodies.' },
  { id: 'altosax', name: 'Alto Saxophone', short: 'Alto Sax', color: '#d6a11a', clef: 'treble', transpose: 9, family: 'winds',
    listen: { fmin: 120, fmax: 1000, frame: 2048 }, range: ['C4', 'C6'], sax: true,
    blurb: 'Embouchure, long tones, the left-hand notes, the octave key and songs.' },
  { id: 'tenorsax', name: 'Tenor Saxophone', short: 'Tenor Sax', color: '#b8861b', clef: 'treble', transpose: 14, family: 'winds',
    listen: { fmin: 90, fmax: 760, frame: 2048 }, range: ['C4', 'C6'], sax: true,
    blurb: 'Same fingerings as alto, a deeper voice. Long tones, notes and tunes.' },
  { id: 'trumpet', name: 'Trumpet', short: 'Trumpet', color: '#e0b43a', clef: 'treble', transpose: 2, family: 'winds',
    listen: { fmin: 140, fmax: 1100, frame: 2048 }, range: ['F#3', 'G5'],
    blurb: 'Buzzing, valves, lip slurs and the notes from low C to G.' },
  { id: 'clarinet', name: 'Clarinet', short: 'Clarinet', color: '#2f8f83', clef: 'treble', transpose: 2, family: 'winds',
    listen: { fmin: 130, fmax: 1300, frame: 2048 }, range: ['F3', 'D5'],
    blurb: 'Embouchure, the open-G notes, throat tones and crossing the break.' },
  { id: 'harp', name: 'Harp', short: 'Harp', color: '#7f56c9', clef: 'grand', transpose: 0, family: 'strings',
    listen: { fmin: 60, fmax: 2100, frame: 2048 }, range: ['C3', 'C6'],
    blurb: 'Hand shape, placing, scales, chords and arpeggios on lever or pedal harp.' },
  { id: 'voice', name: 'Voice', short: 'Voice', color: '#e2557a', clef: 'treble', transpose: 0, family: 'voice', octaveFree: true,
    listen: { fmin: 70, fmax: 1100, frame: 2048 }, range: ['C3', 'C6'],
    blurb: 'Posture, breath, matching pitch, scales and singing in tune.' },
];
export const THEORY = { id: 'theory', name: 'Music Theory', short: 'Theory', color: '#0f9b8e', blurb: 'Notes, rhythm, intervals, scales, keys, chords, ear training and sight-reading.' };
export const byId = (id) => (id === 'theory' ? THEORY : INSTRUMENTS.find((i) => i.id === id));

// ---------- guitar ----------
// frets low E to high E; null = do not play; fingers parallel (0 = open, null = muted). barre: { fret, from, to } string indexes
export const GUITAR_CHORDS = {
  Em: { frets: [0, 2, 2, 0, 0, 0], fingers: [0, 2, 3, 0, 0, 0] },
  E: { frets: [0, 2, 2, 1, 0, 0], fingers: [0, 2, 3, 1, 0, 0] },
  Am: { frets: [null, 0, 2, 2, 1, 0], fingers: [null, 0, 2, 3, 1, 0] },
  A: { frets: [null, 0, 2, 2, 2, 0], fingers: [null, 0, 1, 2, 3, 0] },
  D: { frets: [null, null, 0, 2, 3, 2], fingers: [null, null, 0, 1, 3, 2] },
  Dm: { frets: [null, null, 0, 2, 3, 1], fingers: [null, null, 0, 2, 3, 1] },
  C: { frets: [null, 3, 2, 0, 1, 0], fingers: [null, 3, 2, 0, 1, 0] },
  G: { frets: [3, 2, 0, 0, 0, 3], fingers: [2, 1, 0, 0, 0, 3] },
  E7: { frets: [0, 2, 0, 1, 0, 0], fingers: [0, 2, 0, 1, 0, 0] },
  A7: { frets: [null, 0, 2, 0, 2, 0], fingers: [null, 0, 2, 0, 3, 0] },
  D7: { frets: [null, null, 0, 2, 1, 2], fingers: [null, null, 0, 2, 1, 3] },
  G7: { frets: [3, 2, 0, 0, 0, 1], fingers: [3, 2, 0, 0, 0, 1] },
  C7: { frets: [null, 3, 2, 3, 1, 0], fingers: [null, 3, 2, 4, 1, 0] },
  Fmaj7: { frets: [null, null, 3, 2, 1, 0], fingers: [null, null, 3, 2, 1, 0] },
  F: { frets: [1, 3, 3, 2, 1, 1], fingers: [1, 3, 4, 2, 1, 1], barre: { fret: 1, from: 0, to: 5 } },
  Bm: { frets: [null, 2, 4, 4, 3, 2], fingers: [null, 1, 3, 4, 2, 1], barre: { fret: 2, from: 1, to: 5 } },
  E5: { frets: [0, 2, 2, null, null, null], fingers: [0, 1, 1, null, null, null] },
  A5: { frets: [null, 0, 2, 2, null, null], fingers: [null, 0, 1, 1, null, null] },
  G5: { frets: [3, 5, 5, null, null, null], fingers: [1, 3, 4, null, null, null] },
  C5: { frets: [null, 3, 5, 5, null, null], fingers: [null, 1, 3, 4, null, null] },
  D5: { frets: [null, 5, 7, 7, null, null], fingers: [null, 1, 3, 4, null, null] },
};
/** Sounding MIDI notes of a guitar voicing. */
export const voicingMidi = (frets, strings = INSTRUMENTS[1].strings) => frets.map((f, i) => (f == null ? null : nameToMidi(strings[i]) + f)).filter((x) => x != null);

/** Lowest-position fret for a written guitar/bass note: { string (0 = lowest), fret } */
export function fretFor(writtenName, inst) {
  const m = nameToMidi(writtenName) - inst.transpose;
  let best = null;
  inst.strings.forEach((s, i) => { const f = m - nameToMidi(s); if (f >= 0 && f <= 4 && (!best || i > best.string)) best = { string: i, fret: f }; });
  if (!best) inst.strings.forEach((s, i) => { const f = m - nameToMidi(s); if (f >= 0 && f <= 12 && (!best || f < best.fret)) best = { string: i, fret: f }; });
  return best;
}

// ---------- violin & cello (first position) ----------
// Violin: 1 = whole step above open; 2 low = minor 3rd, 2 high = major 3rd; 3 = perfect 4th; 4 = perfect 5th (the next open string).
// Cello: 1 = whole step; 2, 3, 4 each a half step higher, so 4 = perfect 4th.
export function stringFinger(writtenName, inst) {
  const m = nameToMidi(writtenName);
  const opens = inst.strings.map(nameToMidi);
  const table = inst.id === 'violin'
    ? [[0, '0'], [1, 'low 1'], [2, '1'], [3, 'low 2'], [4, 'high 2'], [5, '3'], [6, 'high 3'], [7, '4']]
    : [[0, '0'], [1, '1 (half position)'], [2, '1'], [3, '2'], [4, '3'], [5, '4']];
  for (let s = opens.length - 1; s >= 0; s--) {
    const d = m - opens[s];
    if (d < 0) continue;
    // prefer the open string over finger 4 on the string below, as beginners are taught
    const row = table.find(([semis]) => semis === d);
    if (row && !(inst.id === 'violin' && d === 7 && s < opens.length - 1)) return { string: s, stringName: inst.strings[s].replace(/\d/, ''), finger: row[1], semis: d };
  }
  return null;
}

// ---------- saxophone (alto and tenor share written fingerings) ----------
// Keys: oct (octave key, left thumb), L1, bis, L2, L3, R1, R2, R3, lowC (right little finger)
const SAXF = {
  C4: ['L1', 'L2', 'L3', 'R1', 'R2', 'R3', 'lowC'], D4: ['L1', 'L2', 'L3', 'R1', 'R2', 'R3'], E4: ['L1', 'L2', 'L3', 'R1', 'R2'],
  F4: ['L1', 'L2', 'L3', 'R1'], 'F#4': ['L1', 'L2', 'L3', 'R2'], G4: ['L1', 'L2', 'L3'], A4: ['L1', 'L2'], Bb4: ['L1', 'bis'],
  B4: ['L1'], C5: ['L2'], 'C#5': [],
};
export function saxFingering(name) {
  if (SAXF[name]) return SAXF[name];
  const m = nameToMidi(name);
  if (m >= nameToMidi('D5') && m <= nameToMidi('C6')) {
    const low = midiToName(m - 12, name.includes('b'));
    const base = SAXF[low] || SAXF[low.replace('A#', 'Bb')];
    if (base) return ['oct', ...base];
  }
  return null;
}

// ---------- clarinet ----------
// Holes: T (thumb), L1 L2 L3, R1 R2 R3; keys: A (throat A key), reg (register key), EB (the E/B little-finger key), FC (the F/C little-finger key)
const CLARF = {
  E3: ['T', 'L1', 'L2', 'L3', 'R1', 'R2', 'R3', 'EB'], F3: ['T', 'L1', 'L2', 'L3', 'R1', 'R2', 'R3', 'FC'],
  G3: ['T', 'L1', 'L2', 'L3', 'R1', 'R2', 'R3'], A3: ['T', 'L1', 'L2', 'L3', 'R1', 'R2'],
  C4: ['T', 'L1', 'L2', 'L3'], D4: ['T', 'L1', 'L2'], E4: ['T', 'L1'], F4: ['T'], G4: [], A4: ['A'], Bb4: ['A', 'reg'],
};
// Clarion register: register key + the chalumeau fingering a twelfth (19 semitones) lower.
export function clarinetFingering(name) {
  if (CLARF[name]) return CLARF[name];
  const low = midiToName(nameToMidi(name) - 19);
  return CLARF[low] ? [...CLARF[low], 'reg'] : null;
}

// ---------- trumpet (written pitch) ----------
const TRP = ['123', '13', '23', '12', '1', '2', '0', '123', '13', '23', '12', '1', '2', '0', '23', '12', '1', '2', '0', '12', '1', '2', '0', '1', '2', '0']; // F#3..G5 chromatic
export function trumpetValves(name) {
  const i = nameToMidi(name) - nameToMidi('F#3');
  return i >= 0 && i < TRP.length ? TRP[i] : null;
}
/** Partial (harmonic) used for a written note, for the explanation text: 2 = low C partial, 3 = G, 4 = middle C, 5 = E */
export function trumpetPartial(name) {
  const m = nameToMidi(name), v = trumpetValves(name); if (v == null) return null;
  const lower = { 0: 0, 1: 2, 2: 1, 3: 3, 12: 3, 13: 5, 23: 4, 123: 6 }[v] ?? 0;
  const open = m + lower; // the open-valve note of the same partial
  return { C4: 2, G4: 3, C5: 4, E5: 5, G5: 6 }[midiToName(open)] || null; // F#3..B3 use partial 2 as well
}

// ---------- harp ----------
export const harpStringColor = (name) => { const p = pc(nameToMidi(name)); return p === 0 ? 'red' : p === 5 ? 'dark' : 'plain'; };

// ---------- piano ----------
export const isBlack = (m) => [1, 3, 6, 8, 10].includes(pc(m));
