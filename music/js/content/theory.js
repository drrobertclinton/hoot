// Music theory course. Drills generate fresh questions each time and feed the spaced-repetition review.
import { card, listen, quiz, rhythm, drill, L, U } from './dsl.js';

export const THEORY_COURSE = [
  U('Notes and the Keyboard', [
    L('th-alpha', 'The musical alphabet', 'Seven letters, repeating', [
      card('A to G, then again', 'Music uses seven letter names: A B C D E F G. After G comes A again, one octave higher. Notes with the same letter sound "the same, but higher or lower".', { k: 'keys', from: 'C4', to: 'B4', label: true }),
      quiz('What comes after G?', ['H', 'A', 'C', 'F'], 1, 'The alphabet wraps around: after G comes A.'),
      quiz('What comes two letters below C?', ['A', 'B', 'E', 'D'], 0, 'Going down from C: B, then A.'),
      drill('letterStep', { count: 6 }),
    ]),
    L('th-keys', 'Naming the keys', 'Use the black-key groups', [
      card('Landmarks', 'C is left of the two black keys. F is left of the three. From there, count up the alphabet.', { k: 'keys', from: 'C4', to: 'B4', hl: ['C4', 'F4'] }),
      drill('keyName', { from: 'C4', to: 'B4', count: 8 }),
      drill('findKey', { pool: ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4'], count: 6 }),
    ]),
    L('th-sharps', 'Sharps and flats', 'The black keys', [
      card('Sharp and flat', 'A sharp (♯) raises a note a half step; a flat (♭) lowers it a half step. Each black key has two names: the key between C and D is C♯ and also D♭. Two names for one sound are called enharmonic.', { k: 'keys', from: 'C4', to: 'B4', label: true, black: true }),
      quiz('What is another name for F♯?', ['G♭', 'E♯', 'F♭', 'G♯'], 0, 'F♯ and G♭ are the same key.'),
      quiz('Which white key is also called E♯?', ['E', 'F', 'D', 'B'], 1, 'There is no black key between E and F, so E♯ is F.'),
      drill('keyName', { from: 'C4', to: 'B4', black: true, count: 8 }),
    ]),
    L('th-steps', 'Half and whole steps', 'The smallest distances', [
      card('Steps', 'A half step is the very next key, black or white. A whole step is two half steps. E–F and B–C are half steps even though both keys are white.', { k: 'keys', from: 'C4', to: 'G4', hl: ['E4', 'F4'] }),
      drill('steps', { count: 8 }),
    ]),
  ]),
  U('Reading the Staff', [
    L('th-treble', 'Treble clef', 'Lines and spaces', [
      card('Treble clef', 'Lines from the bottom: E G B D F ("Every Good Boy Does Fine"). Spaces spell F A C E.', { k: 'staff', clef: 'treble', notes: 'E4/q G4/q B4/q D5/q F5/q F4/q A4/q C5/q E5/q' }),
      drill('noteName', { clef: 'treble', pool: ['E4', 'F4', 'G4', 'A4', 'B4', 'C5', 'D5', 'E5', 'F5'], count: 10 }),
    ]),
    L('th-bass', 'Bass clef', 'The other half of the grand staff', [
      card('Bass clef', 'Lines: G B D F A ("Good Boys Do Fine Always"). Spaces: A C E G ("All Cows Eat Grass"). The two dots of the clef surround the F line.', { k: 'staff', clef: 'bass', notes: 'G2/q B2/q D3/q F3/q A3/q A2/q C3/q E3/q G3/q' }),
      drill('noteName', { clef: 'bass', pool: ['G2', 'A2', 'B2', 'C3', 'D3', 'E3', 'F3', 'G3', 'A3'], count: 10 }),
    ]),
    L('th-ledger', 'Ledger lines and middle C', 'Beyond the five lines', [
      card('Ledger lines', 'Short lines extend the staff. Middle C sits on one ledger line below the treble staff, or one above the bass staff: it is the same note.', { k: 'staff', clef: 'grand', notes: 'C4/w' }),
      drill('noteName', { clef: 'treble', pool: ['A3', 'B3', 'C4', 'D4', 'G5', 'A5', 'B5', 'C6'], count: 8 }),
      drill('noteName', { clef: 'bass', pool: ['C2', 'D2', 'E2', 'F2', 'B3', 'C4', 'D4', 'E4'], count: 8 }),
    ]),
    L('th-grand', 'The grand staff', 'Both clefs at once', [
      card('Grand staff', 'Piano and harp read two staves joined by a brace: treble on top, bass below, with middle C between them.', { k: 'staff', clef: 'grand', notes: 'C3/q G3/q C4/q G4/q C5/q' }),
      drill('noteName', { clef: 'treble', pool: ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5', 'D5', 'E5', 'F5', 'G5'], count: 6 }),
      drill('noteName', { clef: 'bass', pool: ['F2', 'G2', 'A2', 'B2', 'C3', 'D3', 'E3', 'F3', 'G3', 'A3', 'B3', 'C4'], count: 6 }),
    ]),
  ]),
  U('Rhythm', [
    L('th-beat', 'Beat and tempo', 'The pulse of music', [
      card('Beat and tempo', 'The beat is the steady pulse you tap your foot to. Tempo is how fast it goes, measured in beats per minute (BPM). 60 BPM is one beat per second.', null),
      rhythm('Tap along with the beat.', 'q q q q q q q q', { bpm: 72 }),
      quiz('At 120 BPM, how many beats happen in one second?', ['1', '2', '4', '120'], 1, '120 beats per 60 seconds = 2 per second.'),
    ]),
    L('th-values', 'Note values', 'Whole, half, quarter, eighth, sixteenth', [
      card('Note values', 'Whole = 4 beats, half = 2, quarter = 1, eighth = ½, sixteenth = ¼ (in 4/4). Each is half the length of the one before.', { k: 'staff', clef: 'treble', notes: 'B4/w B4/h B4/h B4/q B4/q B4/q B4/q', time: [4, 4] }),
      drill('rhythmValue', { count: 8 }),
    ]),
    L('th-rests', 'Rests', 'Measured silence', [
      card('Rests', 'Every note value has a matching rest: whole rest hangs from a line, half rest sits on a line, quarter rest is a squiggle, eighth rest has one flag.', { k: 'staff', clef: 'treble', notes: 'R/w R/h R/q R/e R/e', time: [4, 4], free: true }),
      rhythm('Tap the notes, stay silent on the rests.', 'q qr q qr h hr', { bpm: 72 }),
    ]),
    L('th-time', 'Time signatures', '4/4, 3/4 and 2/4', [
      card('Time signatures', 'The top number is how many beats are in a bar. The bottom number is which note gets the beat (4 = quarter note). 3/4 has three quarter-note beats per bar: a waltz.', { k: 'staff', clef: 'treble', notes: 'C5/q C5/q C5/q C5/h.', time: [3, 4] }),
      drill('barCount', { count: 6 }),
    ]),
    L('th-eighths', 'Eighth notes', 'Counting "and"', [
      card('Counting eighths', 'Say "1 and 2 and 3 and 4 and". Eighth notes land on the numbers and the "and"s.', { k: 'staff', clef: 'treble', notes: 'C5/e C5/e C5/e C5/e C5/q C5/q', time: [4, 4] }),
      rhythm('Tap the rhythm.', 'e e e e q q', { bpm: 66 }),
      rhythm('And this one.', 'q e e q e e', { bpm: 66 }),
      rhythm('Mixed.', 'e e q e e q', { bpm: 72 }),
    ]),
    L('th-dots', 'Dots and ties', 'Longer notes', [
      card('Dots', 'A dot adds half the note\'s value. Dotted half = 3 beats. Dotted quarter = 1½ beats, usually followed by an eighth.', { k: 'staff', clef: 'treble', notes: 'C5/h. C5/q C5/q. C5/e C5/h', time: [4, 4] }),
      card('Ties', 'A tie joins two notes of the same pitch into one longer sound. Play the first and hold through the second.', null),
      rhythm('Dotted quarter and eighth.', 'q. e q. e h', { bpm: 66 }),
      quiz('How many beats is a dotted half note?', ['2', '2½', '3', '4'], 2, '2 + 1 = 3 beats.'),
    ]),
    L('th-68', 'Compound time', '6/8', [
      card('6/8', 'Six eighth notes per bar, grouped in two sets of three. It feels like two big beats, each split in three: "ONE two three FOUR five six".', { k: 'staff', clef: 'treble', notes: 'C5/e C5/e C5/e C5/e C5/e C5/e C5/q. C5/q.', time: [6, 8] }),
      rhythm('Tap 6/8 eighths.', 'e e e e e e q. q.', { bpm: 60 }),
      quiz('How many big beats does a bar of 6/8 usually feel like?', ['1', '2', '3', '6'], 1, 'Two dotted-quarter beats.'),
    ]),
  ]),
  U('Intervals', [
    L('th-int1', 'Counting intervals', 'Count both letters', [
      card('Interval numbers', 'Count the letters from one note to the other, including both. C to E: C D E = a 3rd. C to G: C D E F G = a 5th.', { k: 'staff', clef: 'treble', notes: 'C4+E4/w C4+G4/w' }),
      drill('intervalNumber', { count: 8 }),
    ]),
    L('th-int2', 'Major, minor and perfect', 'Interval quality', [
      card('Quality', 'Unisons, 4ths, 5ths and octaves are "perfect". 2nds, 3rds, 6ths and 7ths are major or minor: minor is one half step smaller. C–E is a major 3rd (4 half steps); C–E♭ is a minor 3rd (3).', { k: 'keys', from: 'C4', to: 'G4', hl: ['C4', 'E4'] }),
      drill('intervalQuality', { count: 8 }),
    ]),
    L('th-int-ear1', 'Hearing intervals', 'Song starts help', [
      card('Reference songs', 'Many musicians remember intervals with familiar tunes. Major 2nd: "Frère Jacques". Minor 3rd: "Greensleeves". Major 3rd: "When the Saints Go Marching In". Perfect 4th: "Here Comes the Bride". Perfect 5th: "Twinkle, Twinkle". Major 6th: "My Bonnie Lies Over the Ocean". Octave: "Take Me Out to the Ball Game". (All start on the interval named.)', null),
      drill('intervalEar', { pool: [2, 4, 7, 12], count: 8 }),
    ]),
    L('th-int-ear2', 'More intervals by ear', 'Thirds and sixths', [
      drill('intervalEar', { pool: [3, 4, 5, 7, 9, 12], count: 10 }),
    ]),
  ]),
  U('Scales', [
    L('th-major', 'The major scale', 'W W H W W W H', [
      card('Major scale formula', 'Whole, whole, half, whole, whole, whole, half. Start on any note and follow the pattern. From C it uses only white keys.', { k: 'keys', from: 'C4', to: 'C5', hl: ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5'] }),
      listen('C major scale.', 'C4/q D4/q E4/q F4/q G4/q A4/q B4/q C5/h', { bpm: 96, inst: 'piano' }),
      drill('scaleNote', { type: 'major', keys: ['C', 'G', 'D', 'F', 'A', 'Bb'], count: 8 }),
    ]),
    L('th-minor', 'Minor scales', 'Natural and harmonic', [
      card('Natural minor', 'W H W W H W W. A natural minor uses the same notes as C major. Harmonic minor raises the 7th a half step (G♯ in A minor) for a stronger pull home.', { k: 'keys', from: 'A3', to: 'A4', hl: ['A3', 'B3', 'C4', 'D4', 'E4', 'F4', 'G4', 'A4'] }),
      listen('A natural minor, then A harmonic minor.', 'A3/q B3/q C4/q D4/q E4/q F4/q G4/q A4/h R/h A3/q B3/q C4/q D4/q E4/q F4/q G#4/q A4/h', { bpm: 104, inst: 'piano' }),
      drill('scaleNote', { type: 'minor', keys: ['A', 'E', 'D', 'G', 'B'], count: 6 }),
      drill('scaleQualityEar', { count: 6 }),
    ]),
    L('th-penta', 'Pentatonic and blues', 'Five notes, no wrong ones', [
      card('Pentatonic', 'Major pentatonic: scale degrees 1 2 3 5 6 (C D E G A). Minor pentatonic: 1 ♭3 4 5 ♭7 (A C D E G). Add ♭5 to minor pentatonic for the blues scale (A C D E♭ E G).', { k: 'keys', from: 'A3', to: 'A4', hl: ['A3', 'C4', 'D4', 'E4', 'G4', 'A4'] }),
      quiz('Which note is added to A minor pentatonic to make the A blues scale?', ['B', 'E♭', 'F', 'G♯'], 1, 'The ♭5, E♭, is the "blue note".'),
      quiz('Which degrees make a major pentatonic?', ['1 2 3 4 5', '1 2 3 5 6', '1 3 5 7', '1 ♭3 4 5 ♭7'], 1, '1 2 3 5 6: no 4th or 7th.'),
    ]),
  ]),
  U('Keys', [
    L('th-sharpkeys', 'Sharp keys', 'F C G D A E B', [
      card('Order of sharps', 'Sharps always appear in this order: F C G D A E B. To name a sharp key, go up a half step from the last sharp: one sharp (F♯) = G major; two sharps (F♯ C♯) = D major.', { k: 'keysig', sig: 2 }),
      drill('keySig', { sigs: [0, 1, 2, 3, 4], count: 8 }),
    ]),
    L('th-flatkeys', 'Flat keys', 'B E A D G C F', [
      card('Order of flats', 'Flats appear as B E A D G C F (sharps backwards). The second-to-last flat names the key: B♭ E♭ = B♭ major. One flat is the exception to memorize: F major.', { k: 'keysig', sig: -3 }),
      drill('keySig', { sigs: [-1, -2, -3, -4, -5], count: 8 }),
    ]),
    L('th-circle', 'The circle of fifths', 'Every key in one picture', [
      card('Circle of fifths', 'Going clockwise, each key is a fifth higher and adds one sharp. Counterclockwise, each key is a fifth lower and adds one flat.', { k: 'circle' }),
      drill('keySig', { sigs: [-4, -3, -2, -1, 0, 1, 2, 3, 4, 5], count: 10 }),
    ]),
    L('th-relative', 'Relative minor', 'Same signature, different home', [
      card('Relative keys', 'Every major key shares its signature with a minor key three half steps lower. C major and A minor; G major and E minor; F major and D minor.', null),
      drill('relative', { count: 8 }),
    ]),
  ]),
  U('Chords', [
    L('th-triads', 'Building triads', 'Stack thirds', [
      card('Triads', 'A triad is a root, a third and a fifth: every other letter. C E G, D F A, E G B. On the staff, all three notes are on lines or all on spaces.', { k: 'staff', clef: 'treble', notes: 'C4+E4+G4/w D4+F4+A4/w E4+G4+B4/w' }),
      drill('chordSpell', { count: 8 }),
    ]),
    L('th-quality', 'Chord qualities', 'Major, minor, diminished, augmented', [
      card('Four kinds of triad', 'Major: major 3rd + minor 3rd (C E G). Minor: minor 3rd + major 3rd (C E♭ G). Diminished: two minor 3rds (C E♭ G♭). Augmented: two major 3rds (C E G♯).', { k: 'keys', from: 'C4', to: 'B4', hl: ['C4', 'D#4', 'G4'] }),
      drill('chordQuality', { count: 8 }),
    ]),
    L('th-chordear', 'Major or minor?', 'Hear the difference', [
      card('Bright and dark', 'Major chords usually sound bright and settled; minor chords sound darker. Listen for the middle note.', null),
      drill('chordEar', { pool: ['maj', 'min'], count: 10 }),
    ]),
    L('th-inv', 'Inversions', 'Different bass notes', [
      card('Inversions', 'Root position has the root on the bottom (C E G). First inversion has the third on the bottom (E G C). Second inversion has the fifth on the bottom (G C E). Written C/E and C/G.', { k: 'staff', clef: 'treble', notes: 'C4+E4+G4/w E4+G4+C5/w G4+C5+E5/w' }),
      quiz('E G C is which position of a C major chord?', ['Root position', 'First inversion', 'Second inversion', 'Not a C chord'], 1, 'The third (E) is on the bottom: first inversion.'),
      quiz('G C E is...', ['Root position', 'First inversion', 'Second inversion', 'G major'], 2, 'The fifth (G) is on the bottom: second inversion.'),
    ]),
    L('th-sevenths', 'Seventh chords', 'Four notes', [
      card('Seventh chords', 'Add another third on top of a triad. Major 7th: C E G B. Dominant 7th: C E G B♭. Minor 7th: C E♭ G B♭. Dominant 7th chords pull strongly toward the chord a fifth below.', null),
      drill('chordEar', { pool: ['maj7', 'dom7', 'min7'], count: 8 }),
    ]),
  ]),
  U('Harmony', [
    L('th-diatonic', 'Chords in a key', 'I ii iii IV V vi vii°', [
      card('Diatonic chords', 'Build a triad on each note of a major scale. The pattern is always: major, minor, minor, major, major, minor, diminished. Roman numerals show this: uppercase for major, lowercase for minor.', null),
      drill('roman', { keys: ['C', 'G', 'F', 'D'], count: 8 }),
    ]),
    L('th-progressions', 'Common progressions', 'I–IV–V, I–V–vi–IV, ii–V–I', [
      card('Progressions', 'I–IV–V–I: folk, rock, blues. I–V–vi–IV: modern pop. ii–V–I: jazz. Knowing these lets you play hundreds of songs in any key.', null),
      listen('I–V–vi–IV in C: C, G, Am, F.', 'C4+E4+G4/w B3+D4+G4/w C4+E4+A4/w C4+F4+A4/w', { bpm: 92, inst: 'piano' }),
      drill('roman', { keys: ['C', 'G', 'D', 'A', 'E', 'F', 'Bb'], count: 8 }),
    ]),
    L('th-cadence', 'Cadences', 'Musical punctuation', [
      card('Cadences', 'Authentic cadence V–I sounds final, like a period. Plagal IV–I is the "Amen" ending. A half cadence ends on V, like a comma. A deceptive cadence goes V–vi: you expect home and get a surprise.', null),
      listen('Authentic: G to C.', 'B3+D4+G4/h C4+E4+G4/h', { bpm: 72, inst: 'piano' }),
      listen('Deceptive: G to A minor.', 'B3+D4+G4/h C4+E4+A4/h', { bpm: 72, inst: 'piano' }),
      drill('cadenceEar', { count: 6 }),
    ]),
    L('th-blues12', 'The 12-bar blues', 'A form everyone shares', [
      card('12 bars', 'I I I I | IV IV I I | V IV I V. The last V (the turnaround) leads back to the top.', null),
      quiz('In the key of A, which chord is IV?', ['B', 'D', 'E', 'C♯m'], 1, 'Counting up A major: A B C♯ D. The 4th is D.'),
      quiz('In the key of E, which chord is V?', ['A', 'B', 'C♯', 'G♯'], 1, 'E F♯ G♯ A B: the 5th is B.'),
    ]),
  ]),
  U('Ear Training', [
    L('th-ear-hl', 'Higher or lower', 'The first ear skill', [ drill('higherLower', { count: 10 }) ]),
    L('th-ear-step', 'Step or skip', 'Shape of a melody', [ drill('stepSkip', { count: 8 }) ]),
    L('th-ear-dict1', 'Melodic dictation', 'Three notes', [
      card('Dictation', 'Listen to a short melody starting on C, then play it back on the keyboard. Sing it inside your head first.', null),
      drill('dictation', { len: 3, pool: ['C4', 'D4', 'E4', 'F4', 'G4'], count: 5 }),
    ]),
    L('th-ear-dict2', 'Melodic dictation', 'Five notes', [ drill('dictation', { len: 5, pool: ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5'], count: 5 }) ]),
    L('th-ear-rhythm', 'Rhythm dictation', 'Hear it, tap it', [ drill('rhythmEcho', { count: 5 }) ]),
  ]),
  U('Sight-Reading', [
    L('th-sr1', 'Reading in time', 'Treble clef', [
      card('Keep going', 'Look ahead, keep the beat, and do not stop for mistakes. Accuracy grows with daily practice of easy reading.', null),
      { t: 'sight', clef: 'treble', pool: ['C4', 'D4', 'E4', 'F4', 'G4'], bars: 4, bpm: 60 },
      { t: 'sight', clef: 'treble', pool: ['C4', 'D4', 'E4', 'F4', 'G4', 'A4'], bars: 4, bpm: 66 },
    ]),
    L('th-sr2', 'Reading in time', 'Bass clef', [ { t: 'sight', clef: 'bass', pool: ['C3', 'D3', 'E3', 'F3', 'G3'], bars: 4, bpm: 60 }, { t: 'sight', clef: 'bass', pool: ['G2', 'A2', 'B2', 'C3', 'D3'], bars: 4, bpm: 60 } ]),
    L('th-sr3', 'Rhythm reading', 'Clap what you see', [ drill('rhythmRead', { count: 4 }) ]),
    L('th-sr4', 'Wider range', 'Skips and steps', [ { t: 'sight', clef: 'treble', pool: ['C4', 'E4', 'G4', 'A4', 'C5', 'D5', 'E5'], bars: 4, bpm: 60 } ]),
  ]),
];
