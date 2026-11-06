// Beginner tracks for violin, cello, bass, saxophone (alto and tenor), trumpet, clarinet, harp and voice.
// All notes are written pitch for the instrument.
import { card, listen, play, tempo, copy, quiz, rhythm, tone, chord, changes, improv, song, L, U } from './dsl.js';

const fing = (note) => ({ k: 'fingering', note });
const tune = (strings, text) => ({ t: 'tune', text, strings });

// ---------- violin ----------
export const VIOLIN = [
  U('Setting Up', [
    L('v-parts', 'Violin and bow', 'Parts and posture', [
      card('The violin', 'Four strings tuned G D A E, lowest to highest. The left jaw rests on the chin rest; the violin sits on your left collarbone, pointing slightly left, with the scroll at about nose height.', { k: 'strings', inst: 'violin' }),
      card('The bow hold', 'Bent thumb tip touches the frog where the stick meets the hair. Middle and ring fingers drape over the stick opposite the thumb. Index finger rests on the stick; little finger sits curved on top. Keep everything soft and round.', null),
      quiz('What are the violin strings, lowest to highest?', ['E A D G', 'G D A E', 'C G D A', 'G C E A'], 1, 'Violin strings are G D A E, a fifth apart.'),
    ]),
    L('v-tune', 'Tune the violin', 'Fine tuners first', [
      card('Tuning', 'Use the fine tuners on the tailpiece for small changes. Pegs are for big changes only; push them in gently as you turn so they hold.', null),
      tune(['G3', 'D4', 'A4', 'E5'], 'Bow each open string; the tuner finds the nearest string.'),
    ]),
    L('v-open', 'Open strings', 'Straight bows, full tone', [
      card('Bowing', 'Draw the bow halfway between the bridge and the end of the fingerboard, parallel to the bridge. Let the arm\'s weight sink into the string.', null),
      tone('Long bow on the open A string.', 'A4', 4),
      tone('Long bow on the open D string.', 'D4', 4),
      tempo('Open-string rhythm: A A D D.', 'A4/q A4/q D4/h A4/q A4/q D4/h', { bpm: 72 }),
    ]),
    L('v-rhythm', 'Rhythms on open strings', 'Short bows, steady pulse', [
      rhythm('Tap the rhythm first.', 'e e e e q q', { bpm: 66 }),
      tempo('Bow it on A: short-short-short-short, long, long.', 'A4/e A4/e A4/e A4/e A4/q A4/q A4/e A4/e A4/e A4/e A4/q A4/q', { bpm: 66 }),
      tempo('Now cross from E to A.', 'E5/e E5/e E5/e E5/e A4/q A4/q E5/e E5/e E5/e E5/e A4/h', { bpm: 66 }),
    ]),
  ]),
  U('First Fingers', [
    L('v-dstring', 'Fingers on the D string', 'E, F sharp, G', [
      card('First position, high 2nd finger', 'On the D string: 1st finger = E (a whole step up), 2nd finger = F♯ (close to the 3rd finger), 3rd finger = G. Many teachers put tapes on the fingerboard to help.', fing('F#4')),
      play('D E F♯ G and back.', 'D4/q E4/q F#4/q G4/q F#4/q E4/q D4/h'),
      tone('Hold F♯ and listen: it should ring in tune with the open A string above.', 'F#4', 3),
    ]),
    L('v-astring', 'Fingers on the A string', 'B, C sharp, D', [
      card('The same pattern on A', '1 = B, 2 (high) = C♯, 3 = D. Your hand shape does not change from the D string.', fing('C#5')),
      play('A B C♯ D and back.', 'A4/q B4/q C#5/q D5/q C#5/q B4/q A4/h'),
    ]),
    L('v-dscale', 'D major scale', 'Two strings, one pattern', [
      listen('Listen to the scale.', 'D4/q E4/q F#4/q G4/q A4/q B4/q C#5/q D5/q', { bpm: 80 }),
      play('Play it up and down.', 'D4/q E4/q F#4/q G4/q A4/q B4/q C#5/q D5/q C#5/q B4/q A4/q G4/q F#4/q E4/q D4/h'),
      tempo('In time.', 'D4/q E4/q F#4/q G4/q A4/q B4/q C#5/q D5/q C#5/q B4/q A4/q G4/q F#4/q E4/q D4/h', { bpm: 66 }),
    ]),
    L('v-mary', 'Mary Had a Little Lamb', 'On the D string', [ song('Play the tune with backing.', 'mary', { bpm: 76 }) ]),
    L('v-hotcross', 'Hot Cross Buns', 'F sharp, E, D', [ song('Play it with backing.', 'hotcross', { bpm: 72 }) ]),
    L('v-ode', 'Ode to Joy', 'D and A strings', [ song('Play the melody.', 'ode', { bpm: 80 }) ]),
  ]),
  U('More Strings', [
    L('v-twinkle', 'Twinkle, Twinkle', 'The classic first violin piece', [ song('Play it with backing.', 'twinkle', { bpm: 80 }) ]),
    L('v-estring', 'The E string', 'F sharp, G and A', [
      card('E string, first position', '1 = F♯, then G with a low 2nd finger (right next to the 1st), 3 = A. This is your first low 2.', fing('G5')),
      play('E F♯ G A and back.', 'E5/q F#5/q G5/q A5/q G5/q F#5/q E5/h'),
    ]),
    L('v-gstring', 'The G string', 'A, B, C, D', [
      card('G string', '1 = A, 2 (high) = B, 3 = C, 4 = D (the same pitch as the open D string).', fing('B3')),
      play('G major scale, low octave.', 'G3/q A3/q B3/q C4/q D4/q E4/q F#4/q G4/q F#4/q E4/q D4/q C4/q B3/q A3/q G3/h'),
    ]),
    L('v-frere', 'Frère Jacques', 'Three strings', [ song('Play it with backing.', 'frere', { bpm: 84 }) ]),
    L('v-amazing', 'Amazing Grace', 'In A major', [ song('Play the opening phrase.', 'amazing', { bpm: 72 }) ]),
    L('v-ear', 'Play by ear', 'Copy short phrases', [
      copy('Copy on the A string.', 'A4/q B4/q C#5/q A4/q', { bpm: 72 }),
      copy('Copy across D and A.', 'D4/q F#4/q A4/q F#4/q D4/h', { bpm: 72 }),
    ]),
  ]),
];

// ---------- cello ----------
export const CELLO = [
  U('Setting Up', [
    L('c-posture', 'Sitting with the cello', 'Endpin, knees, angle', [
      card('Posture', 'Sit on the front edge of the chair, feet flat. Set the endpin so the C peg is near your left ear and the top of the cello rests on your chest. Your knees lightly hold the lower sides.', { k: 'strings', inst: 'cello' }),
      card('The bow hold', 'Thumb bent, its tip against the stick at the frog. Fingers curve over the stick, more of the hand over the top than on violin. Let the arm\'s weight do the work.', null),
      quiz('What are the cello strings, lowest to highest?', ['G D A E', 'C G D A', 'E A D G', 'C F G A'], 1, 'Cello strings are C G D A, a fifth apart (an octave plus a fifth below the violin).'),
    ]),
    L('c-tune', 'Tune the cello', 'C, G, D, A', [ tune(['C2', 'G2', 'D3', 'A3'], 'Bow each open string; the tuner shows the nearest string.') ]),
    L('c-open', 'Open strings', 'Long, even bows', [
      tone('Long bow on the open D string.', 'D3', 4), tone('Long bow on the open A string.', 'A3', 4),
      tempo('Open-string pattern: D D A A.', 'D3/q D3/q A3/h D3/q D3/q A3/h', { bpm: 72 }),
    ]),
  ]),
  U('First Position', [
    L('c-dstring', 'Fingers on the D string', 'E, F sharp, G', [
      card('Cello first position', '1 = a whole step above the open string. 2, 3 and 4 are each a half step higher. On D: 1 = E, 3 = F♯, 4 = G. (2 would be F natural.)', fing('F#3')),
      play('D E F♯ G and back.', 'D3/q E3/q F#3/q G3/q F#3/q E3/q D3/h'),
    ]),
    L('c-astring', 'Fingers on the A string', 'B, C sharp, D', [
      card('A string', '1 = B, 3 = C♯, 4 = D. (2 = C natural.)', fing('C#4')),
      play('A B C♯ D.', 'A3/q B3/q C#4/q D4/q C#4/q B3/q A3/h'),
    ]),
    L('c-dscale', 'D major scale', '0 1 3 4, 0 1 3 4', [
      play('Play the D major scale.', 'D3/q E3/q F#3/q G3/q A3/q B3/q C#4/q D4/q C#4/q B3/q A3/q G3/q F#3/q E3/q D3/h'),
      tempo('In time.', 'D3/q E3/q F#3/q G3/q A3/q B3/q C#4/q D4/h', { bpm: 66 }),
    ]),
    L('c-cg', 'C and G strings', 'The low register', [
      card('Low strings', 'On G: 1 = A, 3 = B, 4 = C. On C: 1 = D, 3 = E, 4 = F.', fing('B2')),
      play('C major scale, low octave.', 'C2/q D2/q E2/q F2/q G2/q A2/q B2/q C3/q B2/q A2/q G2/q F2/q E2/q D2/q C2/h'),
    ]),
    L('c-ode', 'Ode to Joy', 'In C major', [ song('Play the melody.', 'ode', { bpm: 80 }) ]),
    L('c-mary', 'Mary Had a Little Lamb', 'Steady bows', [ song('Play it with backing.', 'mary', { bpm: 80 }) ]),
    L('c-twinkle', 'Twinkle, Twinkle', 'String crossings', [ song('Play it with backing.', 'twinkle', { bpm: 80 }) ]),
    L('c-aucclair', 'Au Clair de la Lune', 'Down to the G string', [ song('Play it with backing.', 'aucclair', { bpm: 84 }) ]),
    L('c-ear', 'Play by ear', 'Copy phrases', [ copy('Copy this phrase.', 'D3/q E3/q F#3/q D3/q', { bpm: 72 }), copy('And this.', 'A3/q G3/q F#3/q E3/q D3/h', { bpm: 72 }) ]),
  ]),
];

// ---------- bass guitar ----------
const btab = (notes) => ({ k: 'tab', notes, inst: 'bass' });
export const BASS = [
  U('Getting Started', [
    L('b-hold', 'Holding and plucking', 'Alternate two fingers', [
      card('Plucking', 'Rest your thumb on the pickup or the low E string. Pluck with the index and middle fingers, alternating i m i m, pulling through the string so it comes to rest on the next one.', { k: 'fretboard', inst: 'bass', frets: 3, open: true }),
      card('The strings', 'Bass strings are E A D G from thickest to thinnest: the same as the four lowest guitar strings, an octave lower.', null),
      quiz('Bass strings from thickest to thinnest are...', ['G D A E', 'E A D G', 'E A D G B E', 'C G D A'], 1, 'E A D G.'),
    ]),
    L('b-tune', 'Tune the bass', 'E, A, D, G', [ tune(['E2', 'A2', 'D3', 'G3'], 'Pluck each string; the tuner finds the nearest one.') ]),
    L('b-open', 'Open strings in time', 'Lock in with the click', [
      tempo('E, A, D, G, one per beat.', 'E2/q A2/q D3/q G3/q D3/q A2/q E2/h', { bpm: 72, show: 'tab' }),
      tempo('Eighth notes on E: alternate fingers.', 'E2/e E2/e E2/e E2/e E2/e E2/e E2/e E2/e A2/e A2/e A2/e A2/e A2/e A2/e A2/e A2/e', { bpm: 80, show: 'tab' }),
    ]),
    L('b-notes', 'Notes on E and A', 'One finger per fret', [
      card('First position', 'One finger per fret: finger 1 at fret 1, finger 2 at fret 2, and so on. E string: F (1), G (3), A (5). A string: B (2), C (3), D (5).', btab('F2/q G2/q B2/q C3/q')),
      play('Play G, A, B, C, D.', 'G2/q A2/q B2/q C3/q D3/q', { show: 'tab' }),
    ]),
  ]),
  U('Grooves', [
    L('b-roots', 'Root notes', 'Play the bottom of each chord', [
      card('Roots', 'The root is the note a chord is named after. A bass line built from roots holds the song together.', null),
      tempo('Roots for C, G, Am, F: one bar each, eighth notes.', 'C3/e C3/e C3/e C3/e C3/e C3/e C3/e C3/e G2/e G2/e G2/e G2/e G2/e G2/e G2/e G2/e A2/e A2/e A2/e A2/e A2/e A2/e A2/e A2/e F2/e F2/e F2/e F2/e F2/e F2/e F2/e F2/e', { bpm: 84, show: 'tab', chords: 'C:4 G:4 Am:4 F:4' }),
    ]),
    L('b-fifth', 'Root and fifth', 'The most useful shape on bass', [
      card('The fifth', 'From a root on the E or A string, the fifth is one string higher and two frets up. Root G (E string, 3rd fret), fifth D (A string, 5th fret).', btab('G2/q D3/q C3/q G3/q')),
      tempo('Root–fifth on C and G.', 'C3/q G3/q C3/q G3/q G2/q D3/q G2/q D3/q', { bpm: 80, show: 'tab', chords: 'C:4 G:4' }),
    ]),
    L('b-octave', 'Octaves', 'Two strings up, two frets up', [
      card('Octave shape', 'From the root, skip a string and go up two frets: G on the E string 3rd fret, G an octave up on the D string 5th fret.', btab('G2/e G3/e G2/e G3/e')),
      tempo('Disco-style octaves on A and D.', 'A2/e A3/e A2/e A3/e A2/e A3/e A2/e A3/e D3/e D4/e D3/e D4/e D3/e D4/e D3/e D4/e', { bpm: 92, show: 'tab', chords: 'Am:4 Dm:4' }),
    ]),
    L('b-scale', 'C major scale', 'Fingers 2 4, 1 2 4, 1 3 4', [
      card('A movable scale shape', 'Start with finger 2 on C (A string, 3rd fret). A string: 3 5. D string: 2 3 5. G string: 2 4 5. Fingers: 2 4, 1 2 4, 1 3 4.', btab('C3/q D3/q E3/q F3/q G3/q A3/q B3/q C4/q')),
      play('Up and down.', 'C3/q D3/q E3/q F3/q G3/q A3/q B3/q C4/q B3/q A3/q G3/q F3/q E3/q D3/q C3/h', { show: 'tab' }),
    ]),
    L('b-blues', 'Blues bass', 'Root, third, fifth, sixth', [
      card('A blues line in A', 'A walking shape: root, third, fifth, sixth, then back down. Over D and E, move the same shape.', btab('A2/q C#3/q E3/q F#3/q')),
      tempo('12-bar blues line.', 'A2/q C#3/q E3/q F#3/q G3/q F#3/q E3/q C#3/q A2/q C#3/q E3/q F#3/q G3/q F#3/q E3/q C#3/q D3/q F#3/q A3/q B3/q C4/q B3/q A3/q F#3/q D3/q F#3/q A3/q B3/q C4/q B3/q A3/q F#3/q A2/q C#3/q E3/q F#3/q G3/q F#3/q E3/q C#3/q A2/q C#3/q E3/q F#3/q G3/q F#3/q E3/q C#3/q E2/q G#2/q B2/q C#3/q D3/q F#3/q A3/q B3/q A2/q C#3/q E3/q F#3/q E2/q G#2/q B2/q D3/q', { bpm: 92, show: 'tab', chords: 'A7:4 A7:4 A7:4 A7:4 D7:4 D7:4 A7:4 A7:4 E7:4 D7:4 A7:4 E7:4' }),
    ]),
    L('b-night', 'Night Drive', 'Eighth-note roots', [
      tempo('Roots for Am, F, C, G in eighths.', 'A2/e A2/e A2/e A2/e A2/e A2/e A2/e A2/e F2/e F2/e F2/e F2/e F2/e F2/e F2/e F2/e C3/e C3/e C3/e C3/e C3/e C3/e C3/e C3/e G2/e G2/e G2/e G2/e G2/e G2/e G2/e G2/e', { bpm: 96, show: 'tab', chords: 'Am:4 F:4 C:4 G:4' }),
    ]),
    L('b-ear', 'Bass lines by ear', 'Copy grooves', [
      copy('Copy this groove.', 'A2/q E3/q A2/q G2/q', { bpm: 80, show: 'tab' }),
      copy('And this one.', 'C3/q G2/q A2/q E2/q', { bpm: 80, show: 'tab' }),
    ]),
  ]),
];

// ---------- saxophone ----------
function saxCourse(p) {
  return [
    U('Getting Started', [
      L(`${p}-setup`, 'Setting up', 'Reed, ligature, neck strap', [
        card('Reed and ligature', 'Wet the reed. Line its tip up with the tip of the mouthpiece, flat side against the mouthpiece, and tighten the ligature screws gently. Adjust the neck strap so the mouthpiece comes straight to your mouth.', null),
        quiz('Where does the reed go?', ['On top of the mouthpiece', 'Under the mouthpiece, flat side against it', 'Inside the neck', 'On the bell'], 1, 'The reed sits on the underside of the mouthpiece, held by the ligature.'),
      ]),
      L(`${p}-emb`, 'Embouchure', 'Your mouth shape', [
        card('Embouchure', 'Roll your lower lip slightly over your bottom teeth. Rest your top teeth on top of the mouthpiece, about a centimeter from the tip. Close the corners like a drawstring and breathe from low in the body.', null),
        tone('Play any steady note on the mouthpiece and neck, or a G on the full horn (left hand fingers 1 2 3).', 'G4', 3, { anyPitch: true }),
      ]),
      L(`${p}-bag`, 'B, A, G', 'The left-hand notes', [
        card('B, A and G', 'B: left hand finger 1. A: fingers 1 and 2. G: fingers 1, 2 and 3. Your left thumb rests on the button under the octave key, not on it.', fing('G4')),
        tone('Hold B.', 'B4', 3), tone('Hold A.', 'A4', 3), tone('Hold G.', 'G4', 3),
        play('B A G.', 'B4/q A4/q G4/h B4/q A4/q G4/h'),
      ]),
      L(`${p}-hotcross`, 'Hot Cross Buns', 'The classic first tune', [
        play('Hot Cross Buns on B, A, G.', 'B4/q A4/q G4/h B4/q A4/q G4/h G4/e G4/e G4/e G4/e A4/e A4/e A4/e A4/e B4/q A4/q G4/h', { chords: 'G:4 G:4 G:2 D:2 G:4' }),
        tempo('With the backing track.', 'B4/q A4/q G4/h B4/q A4/q G4/h G4/e G4/e G4/e G4/e A4/e A4/e A4/e A4/e B4/q A4/q G4/h', { bpm: 72, chords: 'G:4 G:4 G:2 D:2 G:4' }),
      ]),
      L(`${p}-long`, 'Long tones', 'The secret to a great sound', [
        card('Why long tones', 'Holding notes steady builds air support and a centered sound. Aim for no wobble in pitch or volume.', null),
        tone('Hold G for six seconds.', 'G4', 6), tone('Hold A for six seconds.', 'A4', 6),
      ]),
    ]),
    U('More Notes', [
      L(`${p}-low`, 'F, E and D', 'Add the right hand', [
        card('Right-hand notes', 'Keep G down (left 1 2 3) and add the right hand. F: right 1. E: right 1 2. D: right 1 2 3.', fing('D4')),
        play('G F E D and back.', 'G4/q F4/q E4/q D4/q E4/q F4/q G4/h'),
      ]),
      L(`${p}-c`, 'C and C sharp', 'Middle of the horn', [
        card('Middle C', 'C: left hand finger 2 only. C♯: no keys at all (just the thumb rest). B to C: lift 1, put down 2.', fing('C5')),
        play('A B C B A.', 'A4/q B4/q C5/q B4/q A4/h'),
      ]),
      L(`${p}-octave`, 'The octave key', 'Upper D, E, F, G', [
        card('Octave key', 'Your left thumb presses the octave key to jump up an octave with the same fingers. Upper D = low D fingering plus octave key.', fing('D5')),
        play('Low D to upper D, then E and F.', 'D4/h D5/h E4/h E5/h F4/h F5/h G4/h G5/h'),
      ]),
      L(`${p}-ode`, 'Ode to Joy', 'With the band', [ song('Play the melody.', 'ode', { bpm: 84 }) ]),
      L(`${p}-fsharp`, 'F sharp and G major', 'Right-hand finger 2', [
        card('F♯', 'Left 1 2 3, right finger 2 alone. Used in G major.', fing('F#4')),
        play('G major scale.', 'G4/q A4/q B4/q C5/q D5/q E5/q F#5/q G5/q F#5/q E5/q D5/q C5/q B4/q A4/q G4/h'),
      ]),
      L(`${p}-bflat`, 'B flat', 'The bis key', [
        card('B♭', 'Left finger 1 presses both its key and the small "bis" key just below it. (Another option: left 1 plus right 1.)', fing('Bb4')),
        play('F major scale.', 'F4/q G4/q A4/q Bb4/q C5/q D5/q E5/q F5/q E5/q D5/q C5/q Bb4/q A4/q G4/q F4/h'),
      ]),
      L(`${p}-lowc`, 'Low C', 'The right little finger', [
        card('Low C', 'Low D fingering plus the right little finger on the low C key. Keep the air warm and the jaw relaxed.', fing('C4')),
        play('C major scale.', 'C4/q D4/q E4/q F4/q G4/q A4/q B4/q C5/q B4/q A4/q G4/q F4/q E4/q D4/q C4/h'),
      ]),
      L(`${p}-twinkle`, 'Twinkle, Twinkle', 'C major', [ song('Play it.', 'twinkle', { bpm: 84 }) ]),
      L(`${p}-jingle`, 'Jingle Bells', 'Dotted rhythms', [ song('Play the chorus.', 'jingle', { bpm: 96 }) ]),
      L(`${p}-blues`, 'Blue Room Shuffle', 'Swing feel', [ song('Play the blues melody.', 'bluesroom', { bpm: 84 }) ]),
    ]),
  ];
}
export const ALTOSAX = saxCourse('as');
export const TENORSAX = saxCourse('ts');

// ---------- trumpet ----------
export const TRUMPET = [
  U('Getting Started', [
    L('t-buzz', 'Buzzing', 'Where the sound comes from', [
      card('The buzz', 'A trumpet\'s sound starts with your lips vibrating. Say "em", keep the lips together, and blow so they buzz. Then buzz on the mouthpiece alone.', null),
      card('Holding the trumpet', 'Left hand wraps around the valve casing. Right-hand fingertips rest on the three valves; the little finger stays out of the ring so the hand stays relaxed.', null),
      quiz('Which valve is closest to your mouth?', ['Valve 1', 'Valve 2', 'Valve 3', 'They are all level'], 0, 'Valve 1 is nearest the mouthpiece; valve 3 is nearest the bell.'),
    ]),
    L('t-c', 'Your first note: C', 'Open, no valves', [
      card('Written C, no valves', 'Middle C on trumpet uses no valves ("open"). Start with a relaxed buzz and steady air.', fing('C4')),
      tone('Hold C.', 'C4', 3), tone('Hold it again, a little longer.', 'C4', 5),
    ]),
    L('t-cde', 'D and E', 'Valves 1-3 and 1-2', [
      card('D and E', 'D = valves 1 and 3. E = valves 1 and 2. Press the valves straight down with your fingertips.', fing('D4')),
      play('C D E D C.', 'C4/q D4/q E4/q D4/q C4/h'),
    ]),
    L('t-hotcross', 'Hot Cross Buns', 'E, D, C', [ song('Play it with the band.', 'hotcross', { bpm: 72 }) ]),
    L('t-fg', 'F and G', 'Valve 1, then open', [
      card('F and G', 'F = valve 1. G = open, the same fingering as C: you get the higher note by faster air and a slightly firmer buzz.', fing('G4')),
      play('C D E F G.', 'C4/q D4/q E4/q F4/q G4/q F4/q E4/q D4/q C4/h'),
    ]),
  ]),
  U('Building Range', [
    L('t-slurs', 'Lip slurs', 'C to G without valves', [
      card('One fingering, many notes', 'With no valves pressed, the trumpet plays C, G, upper C, E and more. Moving between them with air alone is a lip slur.', null),
      play('Slur C to G and back, no valves.', 'C4/h G4/h C4/h G4/h C4/w'),
    ]),
    L('t-mary', 'Mary Had a Little Lamb', 'E D C and G', [ song('Play it.', 'mary', { bpm: 80 }) ]),
    L('t-ode', 'Ode to Joy', 'Five notes', [ song('Play the melody.', 'ode', { bpm: 84 }) ]),
    L('t-ab', 'A, B and upper C', 'Finishing the scale', [
      card('A, B, C', 'A = valves 1 and 2. B = valve 2. Upper C = open, a little more air than G.', fing('B4')),
      play('C major scale.', 'C4/q D4/q E4/q F4/q G4/q A4/q B4/q C5/q B4/q A4/q G4/q F4/q E4/q D4/q C4/h'),
    ]),
    L('t-twinkle', 'Twinkle, Twinkle', 'Up to A', [ song('Play it.', 'twinkle', { bpm: 84 }) ]),
    L('t-bflat', 'B flat', 'Valve 1', [
      card('B♭', 'B♭ uses valve 1 (the same as F, on a higher partial).', fing('Bb4')),
      play('F major scale up to upper F.', 'F4/q G4/q A4/q Bb4/q C5/q D5/q E5/q F5/q E5/q D5/q C5/q Bb4/q A4/q G4/q F4/h'),
    ]),
    L('t-jingle', 'Jingle Bells', 'Dotted rhythms', [ song('Play the chorus.', 'jingle', { bpm: 96 }) ]),
    L('t-frere', 'Frère Jacques', 'Down to low G', [
      card('Low G', 'Low G (below middle C) = valves 1 and 3, like D, on a lower partial. Relax the lips and open the throat.', fing('G4')),
      song('Play it.', 'frere', { bpm: 84 }),
    ]),
  ]),
];

// ---------- clarinet ----------
export const CLARINET = [
  U('Getting Started', [
    L('cl-setup', 'Putting it together', 'Reed, ligature, five parts', [
      card('Assembly', 'Mouthpiece, barrel, upper joint, lower joint, bell. Hold the upper joint\'s ring key down when joining it to the lower joint so the bridge key does not bend. The reed goes flat against the mouthpiece, tip lined up with the tip.', null),
      card('Embouchure', 'Lower lip slightly over the bottom teeth, top teeth resting on the mouthpiece. Point the chin, firm the corners, and keep the clarinet at roughly 30 to 40 degrees from your body.', null),
      quiz('Which joint should you hold the ring key down on when assembling?', ['The bell', 'The upper joint', 'The barrel', 'The mouthpiece'], 1, 'Holding the upper joint\'s ring key raises the bridge key so it clears the lower joint.'),
    ]),
    L('cl-g', 'Open G', 'No fingers at all', [
      card('Open G', 'With no keys or holes covered, the clarinet plays G. Left thumb hovers by its hole, right thumb under the thumb rest.', fing('G4')),
      tone('Hold open G.', 'G4', 3), tone('Again, steady and smooth.', 'G4', 5),
    ]),
    L('cl-fe', 'F and E', 'Thumb, then finger 1', [
      card('F and E', 'F = left thumb covers its hole. E = thumb plus left finger 1. Cover holes with the pads of the fingers.', fing('E4')),
      play('G F E F G.', 'G4/q F4/q E4/q F4/q G4/h'),
    ]),
    L('cl-dc', 'D and C', 'Fingers 2 and 3', [
      card('D and C', 'D = thumb + left 1 2. C = thumb + left 1 2 3.', fing('C4')),
      play('C D E F G and back.', 'C4/q D4/q E4/q F4/q G4/q F4/q E4/q D4/q C4/h'),
    ]),
    L('cl-hotcross', 'Hot Cross Buns', 'E, D, C', [ song('Play it with the band.', 'hotcross', { bpm: 72 }) ]),
  ]),
  U('More Notes', [
    L('cl-mary', 'Mary Had a Little Lamb', 'Five notes', [ song('Play it.', 'mary', { bpm: 80 }) ]),
    L('cl-ode', 'Ode to Joy', 'With the band', [ song('Play the melody.', 'ode', { bpm: 84 }) ]),
    L('cl-low', 'Low A and G', 'The right hand', [
      card('Right hand', 'Keep the left hand down (thumb + 1 2 3). Low A adds right fingers 1 and 2. Low G adds right 1 2 3. Seal every hole fully: a small leak makes a squeak.', fing('G3')),
      play('G A C D E.', 'G3/q A3/q C4/q D4/q E4/q D4/q C4/q A3/q G3/h'),
    ]),
    L('cl-throat', 'Throat A and B flat', 'The side keys', [
      card('Throat tones', 'A = the A key, pressed with the side of left finger 1. B♭ = the A key plus the register key (left thumb).', fing('A4')),
      play('G A B♭ A G.', 'G4/q A4/q Bb4/q A4/q G4/h'),
    ]),
    L('cl-twinkle', 'Twinkle, Twinkle', 'Using throat A', [ song('Play it.', 'twinkle', { bpm: 84 }) ]),
    L('cl-frere', 'Frère Jacques', 'Down to low G', [ song('Play it.', 'frere', { bpm: 84 }) ]),
    L('cl-break', 'Crossing the break', 'Register key: B, C, D', [
      card('The register key', 'The clarinet jumps a twelfth (an octave and a fifth) with the register key. Low E fingering + register key = B. Low F + register = C. Low G + register = D. B and C use the little-finger E/B and F/C keys.', fing('B4')),
      tone('Low G (all fingers down).', 'G3', 3),
      tone('Same fingers plus the register key: D.', 'D5', 3),
      play('G to D, slurred.', 'G3/h D5/h G3/h D5/h'),
    ]),
  ]),
];

// ---------- harp ----------
export const HARP = [
  U('Getting Started', [
    L('h-intro', 'Meet the harp', 'Colored strings', [
      card('Finding your way', 'C strings are red and F strings are black or dark blue, so you can find any note. Lever harps use small levers to raise a string a half step; pedal harps use seven pedals.', { k: 'harp', from: 'C4', to: 'C5' }),
      quiz('Which strings are red?', ['F', 'C', 'G', 'A'], 1, 'C strings are red; F strings are black or dark blue.'),
    ]),
    L('h-posture', 'Posture and hands', 'Thumbs up, fingers down', [
      card('Posture', 'The harp rests on your right shoulder. Sit tall with both hands at the strings, elbows relaxed and level.', null),
      card('Hand shape', 'Thumbs point up, fingers angle down. Play with fingers 1 to 4 (thumb to ring); the little finger is not used. After each note, close the finger into the palm.', { k: 'hand' }),
      quiz('Which finger is not used on the harp?', ['Thumb', 'Index', 'Ring', 'Little finger'], 3, 'Harpists use the thumb, index, middle and ring fingers.'),
    ]),
    L('h-place', 'Placing', 'Prepare before you play', [
      card('Placing', 'Put your finger on the string before you pluck it. This makes notes clean and lets your hand find the next note early.', null),
      play('Find the C strings: middle C, then the C an octave above.', 'C4/h C5/h C4/h C5/h'),
      play('C D E, thumb only.', 'C4/q D4/q E4/q D4/q C4/h'),
    ]),
  ]),
  U('Scales and Songs', [
    L('h-scale', 'C major scale', 'Fingers 4 3 2 1', [
      card('Going up', 'Place fingers 4 3 2 1 on C D E F, then play them in that order: ring finger first, thumb last. Then bring finger 4 across to G and repeat on G A B C.', { k: 'harp', from: 'C4', to: 'C5' }),
      play('C major scale up.', 'C4/q D4/q E4/q F4/q G4/q A4/q B4/q C5/h'),
      play('And down, thumb first.', 'C5/q B4/q A4/q G4/q F4/q E4/q D4/q C4/h'),
    ]),
    L('h-arp', 'Arpeggios', 'C E G C', [
      card('Four-finger arpeggio', 'Place 4 3 2 1 on C E G C and play from the bottom: ring, middle, index, thumb.', { k: 'harp', from: 'C4', to: 'C5' }),
      tempo('C arpeggio, then F and G.', 'C4/e E4/e G4/e C5/e F4/e A4/e C5/e F5/e G4/e B4/e D5/e G5/e C4/h', { bpm: 66 }),
    ]),
    L('h-mary', 'Mary Had a Little Lamb', 'Right hand melody', [ song('Play it.', 'mary', { bpm: 80 }) ]),
    L('h-ode', 'Ode to Joy', 'Right hand melody', [ song('Play it.', 'ode', { bpm: 80 }) ]),
    L('h-chords', 'Bass and chords', 'Left hand fifths', [
      card('Left hand fifths', 'The left hand plays low C and G together (fingers 3 and 1) while the right hand plays melody.', null),
      play('Left hand fifths: C–G, F–C, G–D, C–G.', 'C3+G3/w F3+C4/w G3+D4/w C3+G3/w'),
    ]),
    L('h-twinkle', 'Twinkle, Twinkle', 'With bass', [ song('Play it.', 'twinkle', { bpm: 84 }) ]),
    L('h-amazing', 'Amazing Grace', 'A harp favorite', [ song('Play the opening.', 'amazing', { bpm: 72 }) ]),
    L('h-levers', 'Levers and keys', 'G major on a lever harp', [
      card('Levers', 'Flip the F levers up (all octaves) and your C-tuned harp plays in G major. Set levers before you play, not during a phrase.', { k: 'harp', from: 'C4', to: 'C5', sharp: ['F'] }),
      play('G major scale with F levers raised.', 'G4/q A4/q B4/q C5/q D5/q E5/q F#5/q G5/h'),
      song('Minuet in G.', 'minuet', { bpm: 84 }),
    ]),
  ]),
];

// ---------- voice ----------
export const VOICE = [
  U('Foundations', [
    L('vo-posture', 'Posture', 'Balanced and free', [
      card('Stand tall', 'Feet hip-width apart, knees soft, ribcage gently lifted, shoulders relaxed and down, head balanced (not pushed forward). A free body makes a free sound.', null),
      quiz('Which helps singing most?', ['Locked knees', 'Raised shoulders', 'Relaxed shoulders and a balanced head', 'Chin pushed forward'], 2, 'Relaxed shoulders and a balanced head leave the throat and breath free.'),
    ]),
    L('vo-breath', 'Breathing', 'Low, quiet, steady', [
      card('The breath', 'Breathe in quietly through the nose or mouth and feel your waist and lower ribs widen. Breathe out on a steady "sss" without collapsing your chest.', null),
      { t: 'breath', text: 'Hiss on "sss" (or hum) as steadily as you can. The app times you.', secs: 12 },
    ]),
    L('vo-match', 'Matching pitch', 'Hear it, sing it', [
      card('Pitch matching', 'Listen to the note, hum it inside, then sing on "ah". Any octave counts: the app accepts the same note higher or lower.', null),
      tone('Sing this note.', 'C4', 3, { octaveFree: true, demo: true }),
      tone('And this one.', 'E4', 3, { octaveFree: true, demo: true }),
      tone('And this one.', 'G4', 3, { octaveFree: true, demo: true }),
    ]),
    L('vo-range', 'Find your range', 'Your comfortable notes', [
      card('Range', 'Sing gently from a comfortable middle note down as low as is easy, then up as high as is easy. Never push or strain.', null),
      { t: 'range', text: 'Slide gently from low to high on "oo". The app records your lowest and highest steady notes.' },
    ]),
  ]),
  U('Singing in Tune', [
    L('vo-five', 'Five-note scale', 'Do re mi fa sol', [
      card('Solfège', 'Do re mi fa sol: the first five notes of a major scale. Singers use these syllables to hear how notes relate.', null),
      play('Sing do re mi fa sol fa mi re do.', 'C4/q D4/q E4/q F4/q G4/q F4/q E4/q D4/q C4/h', { octaveFree: true, demo: true }),
    ]),
    L('vo-scale', 'The major scale', 'Do to do', [
      play('Sing the major scale up and down.', 'C4/q D4/q E4/q F4/q G4/q A4/q B4/q C5/q B4/q A4/q G4/q F4/q E4/q D4/q C4/h', { octaveFree: true, demo: true }),
    ]),
    L('vo-sustain', 'Steady tone', 'Hold it in tune', [
      tone('Hold D on "ah" for five seconds.', 'D4', 5, { octaveFree: true, demo: true }),
      tone('Hold A for five seconds.', 'A4', 5, { octaveFree: true, demo: true }),
    ]),
    L('vo-echo', 'Echo singing', 'Listen and copy', [
      copy('Sing it back.', 'C4/q E4/q G4/h', { octaveFree: true }),
      copy('And this.', 'G4/q F4/q E4/q D4/q C4/h', { octaveFree: true }),
      copy('A bit longer.', 'C4/q D4/q E4/q C4/q G4/h', { octaveFree: true }),
    ]),
    L('vo-intervals', 'Sing intervals', 'Thirds and fifths', [
      card('Thirds and fifths', 'Do to mi is a major third. Do to sol is a perfect fifth. Think of them as the first notes of a major chord.', null),
      play('Do mi do sol do.', 'C4/h E4/h C4/h G4/h C4/w', { octaveFree: true, demo: true }),
    ]),
    L('vo-twinkle', 'Twinkle, Twinkle', 'Your first song', [ song('Sing along.', 'twinkle', { bpm: 84, octaveFree: true }) ]),
    L('vo-ode', 'Ode to Joy', 'Smooth steps', [ song('Sing the melody on "loo".', 'ode', { bpm: 84, octaveFree: true }) ]),
    L('vo-amazing', 'Amazing Grace', 'Legato phrases', [ song('Sing the opening phrase.', 'amazing', { bpm: 72, octaveFree: true }) ]),
    L('vo-care', 'Caring for your voice', 'Healthy habits', [
      card('Healthy habits', 'Warm up before you sing and cool down after. Drink water through the day. If singing hurts or you stay hoarse, stop and rest; a hoarse voice that lasts more than two weeks should be checked by a doctor.', null),
      quiz('If your voice feels strained, you should...', ['Sing louder', 'Push through', 'Stop and rest', 'Clear your throat hard'], 2, 'Rest is the right call. Pain or strain is a signal to stop.'),
    ]),
  ]),
];
