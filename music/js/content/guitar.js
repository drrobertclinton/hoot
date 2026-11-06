import { card, listen, play, tempo, copy, quiz, rhythm, chord, changes, improv, song, L, U } from './dsl.js';

// Guitar music is written an octave higher than it sounds; all notes below are written pitch.
const strum = (text, sym, pattern, o = {}) => ({ t: 'strum', text, sym, pattern, bpm: 70, bars: 2, ...o });
const tab = (notes) => ({ k: 'tab', notes });

export const GUITAR = [
  U('Getting Started', [
    L('g-hold', 'Holding the guitar', 'Comfort first', [
      card('Parts of the guitar', 'The headstock holds the tuning pegs. The neck has metal frets; pressing just behind a fret shortens the string and raises the pitch. You strum or pick over the sound hole (or the pickups on an electric).', { k: 'fretboard', frets: 5 }),
      card('How to sit', 'Rest the guitar\'s waist on your right leg (left leg if you play left-handed), body upright, neck angled slightly up. Your fretting thumb sits behind the neck, roughly behind your second finger.', null),
      card('String numbers', 'Strings are numbered 1 to 6 from the thinnest (high E) to the thickest (low E). Their names, thickest to thinnest: E A D G B E. Try: "Eddie Ate Dynamite, Good Bye Eddie".', { k: 'fretboard', frets: 3, open: true }),
      quiz('Which string is string 1?', ['The thickest', 'The thinnest', 'The middle one', 'The G string'], 1, 'String 1 is the thinnest, the high E.'),
    ]),
    L('g-tune', 'Tune up', 'Use the built-in tuner', [
      card('Standard tuning', 'From low to high: E A D G B E. Pluck one string at a time and turn its peg slowly until the needle centers. Always tune up to the note: if you are sharp, go below and come back up.', null),
      { t: 'tune', text: 'Tune each string. The tuner picks the nearest string for you.', strings: ['E3', 'A3', 'D4', 'G4', 'B4', 'E5'] },
    ]),
    L('g-open', 'Open strings', 'Pick each string cleanly', [
      card('Picking', 'Hold the pick between thumb and the side of your index finger, with just the tip showing. Pick downward through one string and stop on the next.', null),
      play('Play each open string from low to high when it lights up.', 'E3/q A3/q D4/q G4/q B4/q E5/q', { show: 'tab' }),
      tempo('Now in time: thickest to thinnest and back.', 'E3/q A3/q D4/q G4/q B4/q E5/q B4/q G4/q D4/q A3/q E3/h', { bpm: 66, show: 'tab' }),
    ]),
    L('g-tab', 'Reading tab', 'Lines are strings, numbers are frets', [
      card('Tablature', 'Tab has six lines, one per string, with the high E string on top. A number tells you which fret to press. 0 means open string.', tab('E5/q F5/q G5/q B4/q C5/q D5/q')),
      quiz('In tab, a "3" on the top line means...', ['Third string, open', 'High E string, 3rd fret', 'Low E string, 3rd fret', 'Play three times'], 1, 'The top line is the high E string. The number is the fret.'),
      quiz('A "0" on the second line from the top means...', ['B string, open', 'G string, open', 'Rest', 'First fret'], 0, 'The second line is the B string; 0 means open.'),
    ]),
    L('g-notes1', 'First notes: E, F, G', 'Top string, fingers 1 and 3', [
      card('Notes on the high E string', 'Open = E. 1st fret with finger 1 = F. 3rd fret with finger 3 = G. Press right behind the fret wire, on your fingertip.', tab('E5/q F5/q G5/q')),
      play('E, F, G and back.', 'E5/q F5/q G5/q F5/q E5/h', { show: 'tab' }),
      card('Notes on the B string', 'Open = B. 1st fret = C. 3rd fret = D. Same fingers as on the E string.', tab('B4/q C5/q D5/q')),
      play('B, C, D and back.', 'B4/q C5/q D5/q C5/q B4/h', { show: 'tab' }),
    ]),
  ]),
  U('First Chords', [
    L('g-em', 'E minor', 'Two fingers, six strings', [
      card('E minor (Em)', 'Finger 2 on the A string, 2nd fret. Finger 3 on the D string, 2nd fret. Strum all six strings.', { k: 'chordbox', sym: 'Em' }),
      chord('Strum Em and let it ring. The app listens for the chord.', 'Em'),
    ]),
    L('g-strum', 'Down strums', 'Keep the hand moving', [
      card('Quarter-note strumming', 'Strum down once on each beat, from the wrist. Keep it relaxed and even.', null),
      strum('Strum Em on every beat for two bars.', 'Em', 'D-D-D-D-', { bpm: 66 }),
    ]),
    L('g-am', 'A minor', 'Five strings', [
      card('A minor (Am)', 'Finger 1 on B string, 1st fret. Finger 2 on D string, 2nd fret. Finger 3 on G string, 2nd fret. Strum from the A string down; skip the low E.', { k: 'chordbox', sym: 'Am' }),
      chord('Play Am.', 'Am'),
      changes('Switch between Em and Am every four beats. Move fingers 2 and 3 as a pair.', ['Em', 'Am'], { bpm: 60 }),
    ]),
    L('g-c', 'C major', 'A stretch for finger 3', [
      card('C major', 'Finger 3 on A string, 3rd fret. Finger 2 on D string, 2nd fret. Finger 1 on B string, 1st fret. Strum from the A string.', { k: 'chordbox', sym: 'C' }),
      chord('Play C.', 'C'),
      changes('Am to C: fingers 1 and 2 stay put, only finger 3 moves.', ['Am', 'C'], { bpm: 60 }),
    ]),
    L('g-g', 'G major', 'Full and bright', [
      card('G major', 'Finger 2 on low E, 3rd fret. Finger 1 on A string, 2nd fret. Finger 3 on high E, 3rd fret. Strum all six.', { k: 'chordbox', sym: 'G' }),
      chord('Play G.', 'G'),
      changes('G to C.', ['G', 'C'], { bpm: 60 }),
    ]),
    L('g-d', 'D major', 'Four strings', [
      card('D major', 'Finger 1 on G string, 2nd fret. Finger 3 on B string, 3rd fret. Finger 2 on high E, 2nd fret. Strum from the D string only.', { k: 'chordbox', sym: 'D' }),
      chord('Play D.', 'D'),
      changes('G, C, D: the three-chord trick.', ['G', 'C', 'D', 'G'], { bpm: 60 }),
    ]),
    L('g-campfire', 'Campfire Road', 'Your first strummed song', [
      card('Chords for Campfire Road', 'G | C D | G | D | G | C | G D | G. Strum down on each beat; change on the beat.', null),
      song('Strum along with the band. The app checks each chord change.', 'campfire', { bpm: 76, part: 'chords' }),
    ]),
  ]),
  U('Melodies', [
    L('g-ode', 'Ode to Joy', 'Melody on two strings', [
      listen('The melody uses C, D, E, F and G on the B and high E strings.', 'E5/q E5/q F5/q G5/q G5/q F5/q E5/q D5/q C5/q C5/q D5/q E5/q E5/q. D5/e D5/h', { bpm: 88, show: 'tab' }),
      play('Play line one.', 'E5/q E5/q F5/q G5/q G5/q F5/q E5/q D5/q C5/q C5/q D5/q E5/q E5/q. D5/e D5/h', { show: 'tab' }),
      song('Full melody with backing.', 'ode', { bpm: 84 }),
    ]),
    L('g-gstring', 'Notes on the G string', 'G and A', [
      card('G string', 'Open = G. 2nd fret with finger 2 = A.', tab('G4/q A4/q')),
      play('G A B C D: across three strings.', 'G4/q A4/q B4/q C5/q D5/q C5/q B4/q A4/q G4/h', { show: 'tab' }),
      song('Mary Had a Little Lamb on guitar.', 'mary', { bpm: 84 }),
    ]),
    L('g-reading', 'Reading standard notation', 'Guitar sounds an octave lower', [
      card('Guitar notation', 'Guitar music uses the treble clef, written one octave higher than it sounds (a small 8 under the clef shows this). The open high E string is the top space.', { k: 'staff', clef: 'treble', notes: 'E5/q F5/q G5/q B4/q C5/q D5/q' }),
      { t: 'drill', kind: 'noteName', clef: 'treble', pool: ['G4', 'A4', 'B4', 'C5', 'D5', 'E5', 'F5', 'G5'], count: 8 },
      play('Read and play.', 'C5/q D5/q E5/q C5/q G4/q A4/q B4/q G4/q', { show: 'staff' }),
    ]),
    L('g-twinkle', 'Twinkle, Twinkle', 'Melody across three strings', [ song('Play the melody.', 'twinkle', { bpm: 84 }) ]),
  ]),
  U('Rhythm and Strumming', [
    L('g-downup', 'Down-up strumming', 'Eighth notes', [
      card('Down on the beat, up on the "and"', 'Count "1 and 2 and". Strum down on the numbers and up on the "and"s. Your hand never stops: it moves down and up like a pendulum even when it misses the strings.', null),
      strum('Down-up eighths on G.', 'G', 'DUDUDUDU', { bpm: 60 }),
    ]),
    L('g-folk', 'The folk strum', 'D, D-U, U-D-U', [
      card('The pattern', 'Down, down-up, up-down-up: count "1, 2 and, and 4 and". Beat 3\'s down strum is a "ghost": your hand moves but misses the strings.', null),
      rhythm('Tap the rhythm first.', 'q e e er e e e', { bpm: 66 }),
      strum('Now strum it on C.', 'C', 'D-DU-UDU', { bpm: 66 }),
      strum('And on G.', 'G', 'D-DU-UDU', { bpm: 72 }),
    ]),
    L('g-dmae', 'D minor, A and E', 'Three more open chords', [
      card('D minor', 'Finger 2 on G string 2nd fret, finger 3 on B string 3rd fret, finger 1 on high E 1st fret. Strum from D.', { k: 'chordbox', sym: 'Dm' }),
      chord('Play Dm.', 'Dm'),
      card('A major', 'Fingers 1, 2 and 3 side by side on the 2nd fret of the D, G and B strings. Strum from A.', { k: 'chordbox', sym: 'A' }),
      chord('Play A.', 'A'),
      card('E major', 'Like E minor, plus finger 1 on the G string, 1st fret.', { k: 'chordbox', sym: 'E' }),
      chord('Play E.', 'E'),
      changes('A, D, E.', ['A', 'D', 'E', 'A'], { bpm: 66 }),
    ]),
    L('g-sevens', 'Seventh chords', 'E7, A7, D7, G7, C7', [
      card('Dominant sevenths', 'Seventh chords add a bluesy pull toward the next chord. E7: like E but lift finger 3. A7: like A with the G string open.', { k: 'chordbox', sym: 'E7' }),
      chord('Play E7.', 'E7'), chord('Play A7.', 'A7'),
      card('D7 and G7', 'D7: finger 2 on G 2nd fret, finger 1 on B 1st fret, finger 3 on high E 2nd fret. G7: finger 3 on low E 3rd fret, finger 2 on A 2nd fret, finger 1 on high E 1st fret.', { k: 'chordbox', sym: 'D7' }),
      chord('Play D7.', 'D7'),
      changes('A7, D7, E7: the blues chords in A.', ['A7', 'D7', 'A7', 'E7'], { bpm: 66 }),
    ]),
  ]),
  U('Rock and Blues', [
    L('g-power', 'Power chords', 'Two notes, big sound', [
      card('Power chords', 'A root plus its fifth. With the root on the low E string: finger 1 on the root, finger 3 two frets higher on the A string. E5 uses the open E string.', { k: 'chordbox', sym: 'G5' }),
      chord('Play G5: 3rd fret low E, 5th fret A string.', 'G5'),
      changes('E5, G5, A5, G5. Mute unused strings with your fingers.', ['E5', 'G5', 'A5', 'G5'], { bpm: 80, beats: 2 }),
    ]),
    L('g-riff', 'Your first riff', 'Single notes on the low strings', [
      listen('An original riff in E. Low strings, open and 3rd fret.', 'E3/e E3/e G3/e E3/e A3/e E3/e G3/q E3/e E3/e G3/e E3/e B3/e A3/e G3/q', { bpm: 96, show: 'tab' }),
      play('Learn it slowly.', 'E3/e E3/e G3/e E3/e A3/e E3/e G3/q E3/e E3/e G3/e E3/e B3/e A3/e G3/q', { show: 'tab' }),
      tempo('Up to speed.', 'E3/e E3/e G3/e E3/e A3/e E3/e G3/q E3/e E3/e G3/e E3/e B3/e A3/e G3/q', { bpm: 88, show: 'tab' }),
    ]),
    L('g-shuffle', 'Blues shuffle', 'The 5-6 pattern', [
      card('Shuffle on A', 'Open A string with the D string at the 2nd fret (finger 1), then reach finger 3 to the 4th fret and back. Swing it: long-short.', tab('A3/e E4/e A3/e F#4/e')),
      tempo('Shuffle on A.', 'A3+E4/e A3+E4/e A3+F#4/e A3+F#4/e A3+E4/e A3+E4/e A3+F#4/e A3+F#4/e', { bpm: 80, show: 'tab' }),
      song('Play the Blue Room Shuffle melody.', 'bluesroom', { bpm: 84 }),
    ]),
    L('g-penta', 'The minor pentatonic', 'Box one in A', [
      card('A minor pentatonic, 5th position', 'Index finger at the 5th fret, ring finger at the 7th, little finger at the 8th. Low E: 5 8, A: 5 7, D: 5 7, G: 5 7, B: 5 8, high E: 5 8.', { k: 'fretboard', from: 4, frets: 5, scale: 'Am-penta' }),
      play('Up the box.', 'A3/q C4/q D4/q E4/q G4/q A4/q C5/q D5/q E5/q G5/q A5/q C6/q', { show: 'tab', positions: 'penta5' }),
      play('And back down.', 'C6/q A5/q G5/q E5/q D5/q C5/q A4/q G4/q E4/q D4/q C4/q A3/h', { show: 'tab', positions: 'penta5' }),
    ]),
    L('g-improv', 'Improvise a solo', 'Over a 12-bar blues', [
      card('Solo tips', 'Play short phrases, then rest. Repeat an idea you like. End phrases on A. Every note in the box fits.', null),
      improv('Solo over the blues in A.', { scale: ['A', 'C', 'D', 'E', 'G'], chords: 'A7:4 A7:4 A7:4 A7:4 D7:4 D7:4 A7:4 A7:4 E7:4 D7:4 A7:4 E7:4', bpm: 88, style: 'blues', secs: 34 }),
    ]),
  ]),
  U('Next Level', [
    L('g-fmaj7', 'Fmaj7 to F', 'The road to barre chords', [
      card('Fmaj7', 'Finger 3 on D string 3rd fret, finger 2 on G 2nd fret, finger 1 on B 1st fret, high E open. Strum the top four strings.', { k: 'chordbox', sym: 'Fmaj7' }),
      chord('Play Fmaj7.', 'Fmaj7'),
      card('F barre chord', 'Lay finger 1 flat across all six strings at the 1st fret. Finger 3 on A 3rd fret, finger 4 on D 3rd fret, finger 2 on G 2nd fret. Roll the index slightly onto its bony side for a cleaner barre.', { k: 'chordbox', sym: 'F' }),
      chord('Try the full F.', 'F'),
    ]),
    L('g-bm', 'B minor barre', 'A-string barre shape', [
      card('B minor', 'Finger 1 barres from the A string at the 2nd fret. Finger 3 on D 4th fret, finger 4 on G 4th fret, finger 2 on B 3rd fret. Do not play the low E.', { k: 'chordbox', sym: 'Bm' }),
      chord('Play Bm.', 'Bm'),
      changes('G, D, Em, C (a pop progression), then D to Bm.', ['G', 'D', 'Em', 'C'], { bpm: 72 }),
    ]),
    L('g-pick', 'Fingerpicking', 'Thumb and three fingers', [
      card('p i m a', 'Thumb (p) plays the bass strings. Index (i) plays the G string, middle (m) the B string, ring (a) the high E. One finger per string.', null),
      tempo('Arpeggio on C: thumb on the A string, then G, B, E, B, G.', 'C4/e G4/e C5/e E5/e C5/e G4/e C4/e G4/e C5/e E5/e C5/e G4/e', { bpm: 70, show: 'tab' }),
      tempo('Am: thumb on the A string.', 'A3/e A4/e C5/e E5/e C5/e A4/e A3/e A4/e C5/e E5/e C5/e A4/e', { bpm: 70, show: 'tab' }),
    ]),
    L('g-night', 'Night Drive', 'Am, F, C, G arpeggios', [
      changes('Chords first: Am, F (or Fmaj7), C, G.', ['Am', 'Fmaj7', 'C', 'G'], { bpm: 76 }),
      song('Play the arpeggiated melody.', 'nightdrive', { bpm: 88 }),
    ]),
    L('g-ear', 'Learn by ear', 'Copy short phrases', [
      copy('Copy this phrase on the high E and B strings.', 'E5/q D5/q C5/q D5/q E5/h', { show: 'tab' }),
      copy('And this one.', 'G5/q F5/q E5/q D5/q C5/h', { show: 'tab' }),
      copy('Pentatonic lick.', 'A4/e C5/e D5/e E5/e D5/e C5/e A4/q', { show: 'tab', bpm: 72 }),
    ]),
  ]),
];
