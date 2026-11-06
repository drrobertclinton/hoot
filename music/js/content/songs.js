// Song library: public-domain melodies (traditional, or composers who died more than a century ago) and
// pieces written for this app. Melodies are in the written key shown; chords are bar-by-bar ('Sym:beats').
import { transposeMelody, parseMelody, nameToMidi, midiToName, pc, FLAT_NAMES, SHARP_NAMES } from '../core/music.js';

export const SONGS = [
  { id: 'hotcross', title: 'Hot Cross Buns', credit: 'Traditional', key: 'C', time: [4, 4], bpm: 84, level: 1, free: true, style: 'pop',
    melody: 'E4/q D4/q C4/h E4/q D4/q C4/h C4/e C4/e C4/e C4/e D4/e D4/e D4/e D4/e E4/q D4/q C4/h',
    chords: 'C:4 C:4 C:2 G:2 C:4' },
  { id: 'mary', title: 'Mary Had a Little Lamb', credit: 'Traditional', key: 'C', time: [4, 4], bpm: 92, level: 1, free: true, style: 'pop',
    melody: 'E4/q D4/q C4/q D4/q E4/q E4/q E4/h D4/q D4/q D4/h E4/q G4/q G4/h E4/q D4/q C4/q D4/q E4/q E4/q E4/q E4/q D4/q D4/q E4/q D4/q C4/w',
    chords: 'C:4 C:4 G:4 C:4 C:4 C:4 G:4 C:4' },
  { id: 'ode', title: 'Ode to Joy', credit: 'Ludwig van Beethoven, Symphony No. 9 (1824)', key: 'C', time: [4, 4], bpm: 96, level: 1, free: true, style: 'ballad',
    melody: 'E4/q E4/q F4/q G4/q G4/q F4/q E4/q D4/q C4/q C4/q D4/q E4/q E4/q. D4/e D4/h E4/q E4/q F4/q G4/q G4/q F4/q E4/q D4/q C4/q C4/q D4/q E4/q D4/q. C4/e C4/h',
    chords: 'C:4 G:4 C:4 G:4 C:4 G:4 C:4 G:2 C:2' },
  { id: 'twinkle', title: 'Twinkle, Twinkle, Little Star', credit: 'Traditional (French melody, 1761)', key: 'C', time: [4, 4], bpm: 96, level: 1, free: true, style: 'ballad',
    melody: 'C4/q C4/q G4/q G4/q A4/q A4/q G4/h F4/q F4/q E4/q E4/q D4/q D4/q C4/h G4/q G4/q F4/q F4/q E4/q E4/q D4/h G4/q G4/q F4/q F4/q E4/q E4/q D4/h C4/q C4/q G4/q G4/q A4/q A4/q G4/h F4/q F4/q E4/q E4/q D4/q D4/q C4/h',
    chords: 'C:4 F:2 C:2 F:2 C:2 G:2 C:2 C:2 F:2 C:2 G:2 C:2 F:2 C:2 G:2 C:4 F:2 C:2 F:2 C:2 G:2 C:2' },
  { id: 'sunrise', title: 'Sunrise Steps', credit: 'Original for this app', key: 'C', time: [4, 4], bpm: 92, level: 2, free: true, style: 'pop',
    melody: 'E4/q G4/q C5/h B4/q G4/q D5/h C5/q A4/q E4/h F4/q A4/q C5/h E5/q D5/q C5/q G4/q B4/q A4/q G4/h A4/q C5/q B4/q G4/q C5/w',
    chords: 'C:4 G:4 Am:4 F:4 C:4 G:4 F:2 G:2 C:4' },
  { id: 'frere', title: 'Frère Jacques', credit: 'Traditional (French round)', key: 'C', time: [4, 4], bpm: 100, level: 2, style: 'pop',
    melody: 'C4/q D4/q E4/q C4/q C4/q D4/q E4/q C4/q E4/q F4/q G4/h E4/q F4/q G4/h G4/e A4/e G4/e F4/e E4/q C4/q G4/e A4/e G4/e F4/e E4/q C4/q C4/q G3/q C4/h C4/q G3/q C4/h',
    chords: 'C:4 C:4 C:4 C:4 C:4 C:4 C:1 G:1 C:2 C:1 G:1 C:2' },
  { id: 'aucclair', title: 'Au Clair de la Lune', credit: 'Traditional (French)', key: 'C', time: [4, 4], bpm: 96, level: 2, style: 'ballad',
    melody: 'C4/q C4/q C4/q D4/q E4/h D4/h C4/q E4/q D4/q D4/q C4/w C4/q C4/q C4/q D4/q E4/h D4/h C4/q E4/q D4/q D4/q C4/w D4/q D4/q D4/q D4/q A3/h A3/h D4/q C4/q B3/q A3/q G3/w C4/q C4/q C4/q D4/q E4/h D4/h C4/q E4/q D4/q D4/q C4/w',
    chords: 'C:4 C:2 G:2 C:2 G:2 C:4 C:4 C:2 G:2 C:2 G:2 C:4 G:4 D:4 G:4 G:4 C:4 C:2 G:2 C:2 G:2 C:4' },
  { id: 'london', title: 'London Bridge', credit: 'Traditional (English)', key: 'C', time: [4, 4], bpm: 104, level: 2, style: 'pop',
    melody: 'G4/q. A4/e G4/q F4/q E4/q F4/q G4/h D4/q E4/q F4/h E4/q F4/q G4/h G4/q. A4/e G4/q F4/q E4/q F4/q G4/h D4/h G4/h E4/q C4/h.',
    chords: 'C:4 C:4 G:4 C:4 C:4 C:4 G:4 C:4' },
  { id: 'jingle', title: 'Jingle Bells (chorus)', credit: 'James Lord Pierpont (1857)', key: 'C', time: [4, 4], bpm: 112, level: 2, style: 'swing',
    melody: 'E4/q E4/q E4/h E4/q E4/q E4/h E4/q G4/q C4/q. D4/e E4/w F4/q F4/q F4/q. F4/e F4/q E4/q E4/q E4/e E4/e E4/q D4/q D4/q E4/q D4/h G4/h E4/q E4/q E4/h E4/q E4/q E4/h E4/q G4/q C4/q. D4/e E4/w F4/q F4/q F4/q F4/q F4/q E4/q E4/q E4/e E4/e G4/q G4/q F4/q D4/q C4/w',
    chords: 'C:4 C:4 C:4 C:4 F:4 C:4 D7:4 G:4 C:4 C:4 C:4 C:4 F:4 C:4 G:4 C:4' },
  { id: 'rowboat', title: 'Row, Row, Row Your Boat', credit: 'Traditional', key: 'C', time: [6, 8], bpm: 80, level: 3, style: 'waltz',
    melody: 'C4/q. C4/q. C4/q D4/e E4/q. E4/q D4/e E4/q F4/e G4/h. C5/e C5/e C5/e G4/e G4/e G4/e E4/e E4/e E4/e C4/e C4/e C4/e G4/q F4/e E4/q D4/e C4/h.',
    chords: 'C:3 C:3 C:3 C:3 C:3 C:3 G:3 C:3' },
  { id: 'amazing', title: 'Amazing Grace (opening)', credit: 'Traditional hymn tune "New Britain" (1829)', key: 'G', time: [3, 4], bpm: 84, level: 3, style: 'waltz',
    melody: 'R/h D4/q G4/h B4/e G4/e B4/h A4/q G4/h E4/q D4/h D4/q G4/h B4/e G4/e B4/h A4/q D5/h.',
    chords: 'G:3 G:3 G:3 C:3 G:3 G:3 G:2 D:1 D:3' },
  { id: 'campfire', title: 'Campfire Road', credit: 'Original for this app', key: 'G', time: [4, 4], bpm: 96, level: 2, style: 'folk',
    melody: 'G4/q B4/q D5/h C5/q B4/q A4/h B4/q G4/q A4/q B4/q A4/w G4/q B4/q D5/h E5/q D5/q C5/q A4/q B4/q A4/q G4/q A4/q G4/w',
    chords: 'G:4 C:2 D:2 G:4 D:4 G:4 C:4 G:2 D:2 G:4' },
  { id: 'minuet', title: 'Minuet in G', credit: 'Christian Petzold (c. 1725)', key: 'G', time: [3, 4], bpm: 100, level: 4, style: 'classical',
    melody: 'D5/q G4/e A4/e B4/e C5/e D5/q G4/q G4/q E5/q C5/e D5/e E5/e F#5/e G5/q G4/q G4/q C5/q D5/e C5/e B4/e A4/e B4/q C5/e B4/e A4/e G4/e F#4/q G4/e A4/e B4/e G4/e A4/h. D5/q G4/e A4/e B4/e C5/e D5/q G4/q G4/q E5/q C5/e D5/e E5/e F#5/e G5/q G4/q G4/q C5/q D5/e C5/e B4/e A4/e B4/q C5/e B4/e A4/e G4/e A4/q B4/e A4/e G4/e F#4/e G4/h.',
    chords: 'G:3 G:3 C:3 G:3 C:3 G:3 D:3 D:3 G:3 G:3 C:3 G:3 C:3 G:3 D:3 G:3' },
  { id: 'elise', title: 'Für Elise (theme)', credit: 'Ludwig van Beethoven (1810)', key: 'Am', time: [3, 8], bpm: 60, level: 4, style: 'classical',
    melody: 'R/q E5/s D#5/s E5/s D#5/s E5/s B4/s D5/s C5/s A4/e R/s C4/s E4/s A4/s B4/e R/s E4/s G#4/s B4/s C5/e R/s E4/s E5/s D#5/s E5/s D#5/s E5/s B4/s D5/s C5/s A4/e R/s C4/s E4/s A4/s B4/e R/s E4/s C5/s B4/s A4/q.',
    chords: 'Am:1.5 Am:1.5 Am:1.5 E:1.5 Am:1.5 Am:1.5 Am:1.5 E:1.5 Am:1.5' },
  { id: 'bluesroom', title: 'Blue Room Shuffle', credit: 'Original for this app', key: 'A', time: [4, 4], bpm: 96, level: 3, style: 'blues',
    melody: 'A4/q C5/q A4/h E4/q G4/q A4/h A4/q C5/q D5/q C5/q A4/w D5/q C5/q A4/h G4/q A4/q C5/h A4/q C5/q A4/h E4/q G4/q A4/h E5/q D5/q B4/h D5/q C5/q A4/h A4/q C5/q A4/q G4/q E4/h E4/h',
    chords: 'A7:4 A7:4 A7:4 A7:4 D7:4 D7:4 A7:4 A7:4 E7:4 D7:4 A7:4 E7:4' },
  { id: 'nightdrive', title: 'Night Drive', credit: 'Original for this app', key: 'Am', time: [4, 4], bpm: 104, level: 3, style: 'rock',
    melody: 'A4/q C5/q E5/q C5/q F4/q A4/q C5/q A4/q G4/q C5/q E5/q C5/q G4/q B4/q D5/q B4/q A4/q C5/q E5/q C5/q F4/q A4/q C5/q A4/q G4/q C5/q E5/q C5/q G4/q B4/q D5/q G4/q',
    chords: 'Am:4 F:4 C:4 G:4 Am:4 F:4 C:4 G:4' },
];
export const songById = (id) => SONGS.find((s) => s.id === id);

/** 'C:4 G:2' -> [{ sym, beats, t }] */
export function parseChords(text) {
  const out = []; let t = 0;
  for (const tok of String(text || '').trim().split(/\s+/)) { if (!tok) continue; const [sym, b] = tok.split(':'); const beats = Number(b || 4); out.push({ sym, beats, t }); t += beats; }
  return out;
}
export function transposeChordSym(sym, semis, flats = false) {
  if (!semis) return sym;
  const m = /^([A-G](?:#|b)?)(.*)$/.exec(sym);
  const p = pc(nameToMidi(m[1] + '4') + semis);
  return (flats ? FLAT_NAMES : SHARP_NAMES)[p] + m[2];
}

// Preferred written keys per instrument (semitones from the song's written key), then fit the octave.
const KEY_SHIFT = { violin: 2 }; // violin beginners read D major first (open D and A strings, high 2nd finger)
const CENTER = { piano: 'C5', guitar: 'D5', bass: 'D3', violin: 'A4', cello: 'D3', altosax: 'C5', tenorsax: 'C5', trumpet: 'G4', clarinet: 'E4', harp: 'G4', voice: 'G4' };

/** Melody and chords as this instrument reads them, plus the concert-pitch shift for playback. */
export function arrange(song, inst) {
  const shift = KEY_SHIFT[inst.id] || 0;
  const ev = parseMelody(song.melody).filter((e) => !e.rest);
  const notes = ev.flatMap((e) => e.notes); const lo = Math.min(...notes) + shift, hi = Math.max(...notes) + shift;
  const [rLo, rHi] = inst.range.map(nameToMidi);
  const center = nameToMidi(CENTER[inst.id] || 'C5');
  let best = 0, bestScore = Infinity;
  for (const o of [-24, -12, 0, 12, 24]) {
    const a = lo + o, b = hi + o;
    const outside = Math.max(0, rLo - a) + Math.max(0, b - rHi);
    const score = outside * 100 + Math.abs((a + b) / 2 - center);
    if (score < bestScore) { bestScore = score; best = o; }
  }
  const semis = shift + best;
  const flats = /b|F/.test(song.key) && !shift;
  return {
    melody: transposeMelody(song.melody, semis, flats),
    chords: parseChords(song.chords).map((c) => ({ ...c, sym: transposeChordSym(c.sym, shift, flats) })),
    // concert = written - transpose
    concertShift: -inst.transpose,
    writtenKeyShift: shift,
  };
}
export const songBeats = (song) => parseMelody(song.melody).reduce((a, e) => a + e.beats, 0);
export const lowestHighest = (melody) => { const n = parseMelody(melody).flatMap((e) => e.notes); return [midiToName(Math.min(...n)), midiToName(Math.max(...n))]; };
