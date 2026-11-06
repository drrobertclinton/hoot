// Music fundamentals shared by lessons, theory drills, notation and scoring. No DOM, so Node tests can import it.

export const SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export const FLAT_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
export const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
export const LETTER_PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
export const SOLFEGE = { C: 'Do', D: 'Re', E: 'Mi', F: 'Fa', G: 'Sol', A: 'La', B: 'Ti' };

export const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
export const ftom = (f) => 69 + 12 * Math.log2(f / 440);
export const pc = (m) => ((m % 12) + 12) % 12;
export const octaveOf = (m) => Math.floor(m / 12) - 1;

/** 'C#4', 'Bb3', 'E5' -> MIDI number. Accepts unicode accidentals and double accidentals. */
export function nameToMidi(name) {
  const s = String(name).trim().replace('♯', '#').replace('♭', 'b');
  const m = /^([A-Ga-g])(##|bb|#|b|x)?(-?\d+)$/.exec(s);
  if (!m) throw new Error('Bad note name: ' + name);
  const acc = { '#': 1, '##': 2, x: 2, b: -1, bb: -2 }[m[2]] || 0;
  return (Number(m[3]) + 1) * 12 + LETTER_PC[m[1].toUpperCase()] + acc;
}

/** MIDI -> 'C#4' (or 'Db4' with flats). */
export function midiToName(m, flats = false) {
  return (flats ? FLAT_NAMES : SHARP_NAMES)[pc(m)] + octaveOf(m);
}
export const pcName = (p, flats = false) => (flats ? FLAT_NAMES : SHARP_NAMES)[pc(p)];
export const pretty = (s) => String(s).replace(/#/g, '♯').replace(/(?<=[A-G])b/g, '♭');

/** Spelled pitch helpers: { letter:'F', acc:1, oct:4 } */
export function spell(name) {
  const m = /^([A-G])(##|bb|#|b)?(-?\d+)?$/.exec(name);
  if (!m) throw new Error('Bad spelling ' + name);
  return { letter: m[1], acc: { '#': 1, '##': 2, b: -1, bb: -2 }[m[2]] || 0, oct: m[3] == null ? null : Number(m[3]) };
}
export const accStr = (a) => ({ 0: '', 1: '#', 2: '##', '-1': 'b', '-2': 'bb' }[a]);

// ---------- intervals ----------
export const INTERVALS = [
  { semis: 0, short: 'P1', name: 'Unison' },
  { semis: 1, short: 'm2', name: 'Minor 2nd' },
  { semis: 2, short: 'M2', name: 'Major 2nd' },
  { semis: 3, short: 'm3', name: 'Minor 3rd' },
  { semis: 4, short: 'M3', name: 'Major 3rd' },
  { semis: 5, short: 'P4', name: 'Perfect 4th' },
  { semis: 6, short: 'TT', name: 'Tritone' },
  { semis: 7, short: 'P5', name: 'Perfect 5th' },
  { semis: 8, short: 'm6', name: 'Minor 6th' },
  { semis: 9, short: 'M6', name: 'Major 6th' },
  { semis: 10, short: 'm7', name: 'Minor 7th' },
  { semis: 11, short: 'M7', name: 'Major 7th' },
  { semis: 12, short: 'P8', name: 'Octave' },
];
export const intervalName = (semis) => (INTERVALS[semis] || {}).name;

/** Interval between two spelled notes, e.g. ('C4','E4') -> {number:3, quality:'M', semis:4, name:'Major 3rd'} */
export function spelledInterval(a, b) {
  const A = spell(a), B = spell(b);
  const ia = LETTERS.indexOf(A.letter) + 7 * (A.oct ?? 4), ib = LETTERS.indexOf(B.letter) + 7 * (B.oct ?? 4);
  const number = ib - ia + 1;
  const semis = nameToMidi(b.match(/\d/) ? b : b + '4') - nameToMidi(a.match(/\d/) ? a : a + '4');
  const simple = ((number - 1) % 7) + 1;
  const perfectType = [1, 4, 5].includes(simple);
  const base = { 1: 0, 2: 2, 3: 4, 4: 5, 5: 7, 6: 9, 7: 11 }[simple] + 12 * Math.floor((number - 1) / 7);
  const diff = semis - base;
  let quality;
  if (perfectType) quality = { 0: 'P', 1: 'A', '-1': 'd' }[diff];
  else quality = { 0: 'M', '-1': 'm', 1: 'A', '-2': 'd' }[diff];
  const qWord = { P: 'Perfect', M: 'Major', m: 'Minor', A: 'Augmented', d: 'Diminished' }[quality];
  const ord = { 1: 'Unison', 2: '2nd', 3: '3rd', 4: '4th', 5: '5th', 6: '6th', 7: '7th', 8: 'Octave' }[number] || number + 'th';
  const name = number === 1 && quality === 'P' ? 'Unison' : number === 8 && quality === 'P' ? 'Octave' : `${qWord} ${ord}`;
  return { number, quality, semis, name };
}

// ---------- scales ----------
export const SCALES = {
  major: { name: 'Major', steps: [2, 2, 1, 2, 2, 2, 1] },
  minor: { name: 'Natural minor', steps: [2, 1, 2, 2, 1, 2, 2] },
  harmonic: { name: 'Harmonic minor', steps: [2, 1, 2, 2, 1, 3, 1] },
  melodic: { name: 'Melodic minor (ascending)', steps: [2, 1, 2, 2, 2, 2, 1] },
  majpent: { name: 'Major pentatonic', steps: [2, 2, 3, 2, 3] },
  minpent: { name: 'Minor pentatonic', steps: [3, 2, 2, 3, 2] },
  blues: { name: 'Blues', steps: [3, 2, 1, 1, 3, 2] },
  dorian: { name: 'Dorian', steps: [2, 1, 2, 2, 2, 1, 2] },
  mixolydian: { name: 'Mixolydian', steps: [2, 2, 1, 2, 2, 1, 2] },
  chromatic: { name: 'Chromatic', steps: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1] },
};
/** MIDI notes of a scale from a root, ascending one octave (inclusive of the top). */
export function scaleMidi(root, type = 'major', octaves = 1) {
  const st = SCALES[type].steps; const out = [root]; let m = root;
  for (let o = 0; o < octaves; o++) for (const s of st) { m += s; out.push(m); }
  return out;
}

/** Correctly spelled 7-note scale (letters ascend one at a time). 'D','major' -> ['D','E','F#','G','A','B','C#'] */
export function spelledScale(tonic, type = 'major') {
  const st = SCALES[type].steps;
  if (st.length !== 7) throw new Error('spelledScale needs a 7-note scale');
  const t = spell(tonic); const out = [];
  let li = LETTERS.indexOf(t.letter), p = LETTER_PC[t.letter] + t.acc;
  for (let i = 0; i < 7; i++) {
    const letter = LETTERS[(li + i) % 7];
    let acc = ((p - LETTER_PC[letter]) % 12 + 12) % 12; if (acc > 6) acc -= 12;
    out.push(letter + accStr(acc));
    p += st[i];
  }
  return out;
}

// ---------- keys ----------
// Circle of fifths, major keys with their signature (+ sharps / - flats) and relative minor.
export const KEYS = [
  { major: 'C', minor: 'A', sig: 0 }, { major: 'G', minor: 'E', sig: 1 }, { major: 'D', minor: 'B', sig: 2 },
  { major: 'A', minor: 'F#', sig: 3 }, { major: 'E', minor: 'C#', sig: 4 }, { major: 'B', minor: 'G#', sig: 5 },
  { major: 'F#', minor: 'D#', sig: 6 }, { major: 'C#', minor: 'A#', sig: 7 },
  { major: 'F', minor: 'D', sig: -1 }, { major: 'Bb', minor: 'G', sig: -2 }, { major: 'Eb', minor: 'C', sig: -3 },
  { major: 'Ab', minor: 'F', sig: -4 }, { major: 'Db', minor: 'Bb', sig: -5 }, { major: 'Gb', minor: 'Eb', sig: -6 },
  { major: 'Cb', minor: 'Ab', sig: -7 },
];
export const SHARP_ORDER = ['F', 'C', 'G', 'D', 'A', 'E', 'B'];
export const FLAT_ORDER = ['B', 'E', 'A', 'D', 'G', 'C', 'F'];
export const keyByMajor = (k) => KEYS.find((x) => x.major === k);
export function sigAccidentals(sig) {
  return sig >= 0 ? SHARP_ORDER.slice(0, sig).map((l) => l + '#') : FLAT_ORDER.slice(0, -sig).map((l) => l + 'b');
}

// ---------- chords ----------
export const CHORDS = {
  maj: { name: 'major', sym: '', iv: [0, 4, 7] },
  min: { name: 'minor', sym: 'm', iv: [0, 3, 7] },
  dim: { name: 'diminished', sym: 'dim', iv: [0, 3, 6] },
  aug: { name: 'augmented', sym: 'aug', iv: [0, 4, 8] },
  sus2: { name: 'suspended 2nd', sym: 'sus2', iv: [0, 2, 7] },
  sus4: { name: 'suspended 4th', sym: 'sus4', iv: [0, 5, 7] },
  dom7: { name: 'dominant 7th', sym: '7', iv: [0, 4, 7, 10] },
  maj7: { name: 'major 7th', sym: 'maj7', iv: [0, 4, 7, 11] },
  min7: { name: 'minor 7th', sym: 'm7', iv: [0, 3, 7, 10] },
  m7b5: { name: 'half-diminished 7th', sym: 'm7♭5', iv: [0, 3, 6, 10] },
  dim7: { name: 'diminished 7th', sym: 'dim7', iv: [0, 3, 6, 9] },
  pow: { name: 'power chord', sym: '5', iv: [0, 7] },
};
export const chordMidi = (root, q) => CHORDS[q].iv.map((i) => root + i);
export const chordSymbol = (rootName, q) => pretty(rootName) + CHORDS[q].sym;

/** Parse 'C', 'Am', 'G7', 'F#m7', 'Bbmaj7', 'E5', 'Bdim' -> { root:'C', pc:0, q:'maj' } */
export function parseChord(sym) {
  const m = /^([A-G](?:#|b)?)(.*)$/.exec(sym.trim());
  if (!m) throw new Error('Bad chord ' + sym);
  const rest = m[2];
  const map = { '': 'maj', m: 'min', min: 'min', dim: 'dim', aug: 'aug', '+': 'aug', sus2: 'sus2', sus4: 'sus4', 7: 'dom7', maj7: 'maj7', m7: 'min7', m7b5: 'm7b5', dim7: 'dim7', 5: 'pow' };
  const q = map[rest];
  if (!q) throw new Error('Unknown chord quality ' + sym);
  return { root: m[1], pc: pc(nameToMidi(m[1] + '4')), q };
}

// Diatonic triads in a major key: I ii iii IV V vi vii°
export const DIATONIC_MAJOR = [
  { rn: 'I', q: 'maj' }, { rn: 'ii', q: 'min' }, { rn: 'iii', q: 'min' }, { rn: 'IV', q: 'maj' },
  { rn: 'V', q: 'maj' }, { rn: 'vi', q: 'min' }, { rn: 'vii°', q: 'dim' },
];
export const DIATONIC_MINOR = [
  { rn: 'i', q: 'min' }, { rn: 'ii°', q: 'dim' }, { rn: 'III', q: 'maj' }, { rn: 'iv', q: 'min' },
  { rn: 'v', q: 'min' }, { rn: 'VI', q: 'maj' }, { rn: 'VII', q: 'maj' },
];
/** Chord symbol for a Roman numeral in a major key: ('G','V') -> 'D' */
export function romanToChord(key, rn, minor = false) {
  const table = minor ? DIATONIC_MINOR : DIATONIC_MAJOR;
  const i = table.findIndex((x) => x.rn === rn || x.rn.replace('°', '') === rn.replace('°', '') && x.rn.toLowerCase() === rn.toLowerCase());
  if (i < 0) throw new Error('Unknown numeral ' + rn);
  const root = spelledScale(key, minor ? 'minor' : 'major')[i];
  return root + CHORDS[table[i].q].sym.replace('♭', 'b');
}

// ---------- rhythm ----------
export const DURATIONS = {
  w: { beats: 4, name: 'whole note', vex: 'w' },
  'h.': { beats: 3, name: 'dotted half note', vex: 'hd' },
  h: { beats: 2, name: 'half note', vex: 'h' },
  'q.': { beats: 1.5, name: 'dotted quarter note', vex: 'qd' },
  q: { beats: 1, name: 'quarter note', vex: 'q' },
  e: { beats: 0.5, name: 'eighth note', vex: '8' },
  s: { beats: 0.25, name: 'sixteenth note', vex: '16' },
};

/**
 * Melody text -> events. Tokens: NOTE/DUR, e.g. 'C4/q D4/e R/q C4+E4+G4/h' ('R' is a rest, '+' joins a chord).
 * Returns [{ notes:[midi...], names:['C4'], beats, dur:'q', rest, t (beats from start) }].
 */
export function parseMelody(text) {
  const out = []; let t = 0;
  for (const tok of String(text).trim().split(/\s+/)) {
    if (!tok || tok === '|') continue;
    const [n, d = 'q'] = tok.split('/');
    const D = DURATIONS[d]; if (!D) throw new Error('Bad duration ' + tok);
    const rest = n === 'R';
    const names = rest ? [] : n.split('+');
    out.push({ notes: names.map(nameToMidi), names, beats: D.beats, dur: d, rest, t });
    t += D.beats;
  }
  return out;
}
export const totalBeats = (ev) => ev.reduce((a, e) => a + e.beats, 0);
/** Transpose spelled names by semitones; picks sharps or flats by the preference given. */
export function transposeMelody(text, semis, flats = false) {
  if (!semis) return text;
  return String(text).trim().split(/\s+/).map((tok) => {
    if (tok === '|') return tok;
    const [n, d] = tok.split('/');
    if (n === 'R') return tok;
    return n.split('+').map((x) => midiToName(nameToMidi(x) + semis, flats)).join('+') + (d ? '/' + d : '');
  }).join(' ');
}
