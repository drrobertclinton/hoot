import { card, listen, play, tempo, copy, quiz, rhythm, chord, changes, improv, song, L, U, F } from './dsl.js';

const RH_C = F('C4:1 D4:2 E4:3 F4:4 G4:5');
const LH_C = F('C3:5 D3:4 E3:3 F3:2 G3:1');
const RH_G = F('G4:1 A4:2 B4:3 C5:4 D5:5');

export const PIANO = [
  U('First Steps', [
    L('p-keys', 'Meet the keyboard', 'Find any C in two seconds', [
      card('Black keys are your map', 'The black keys come in groups of two and three. Every white key just left of a group of two is a C. The keyboard repeats the same twelve keys over and over: each repeat is an octave.', { k: 'keys', from: 'C3', to: 'B5', hl: ['C3', 'C4', 'C5'] }),
      card('Seven letter names', 'White keys use the letters A B C D E F G, then start again. Going right is higher, going left is lower.', { k: 'keys', from: 'C4', to: 'B4', label: true }),
      quiz('Which key sits just left of the group of two black keys?', ['A', 'C', 'F', 'E'], 1, 'C is always to the left of the two black keys. F is to the left of the three.', { k: 'keys', from: 'C4', to: 'B4' }),
      quiz('Which key sits just left of the group of three black keys?', ['F', 'G', 'D', 'B'], 0, 'F is to the left of the three black keys.', { k: 'keys', from: 'C4', to: 'B4' }),
      play('Play every C you can reach on your keyboard, from low to high. Middle C is the one nearest the center.', 'C3/q C4/q C5/q', { mode: 'wait', anyOctave: false, input: 'any' }),
    ]),
    L('p-fingers', 'Finger numbers and posture', 'Curved fingers, loose wrists', [
      card('Your fingers have numbers', 'Thumbs are 1, pointer fingers 2, middle 3, ring 4, little fingers 5. Both hands use the same numbers, so your thumbs are both 1.', { k: 'hand' }),
      card('Sit tall, hands round', 'Sit so your elbows are level with the keys, a little in front of your body. Keep fingers curved as if holding a ball, and play on the fingertips. Wrists stay level and loose.', null),
      quiz('Which number is your left-hand little finger?', ['1', '3', '5', '4'], 2, 'Little fingers are 5 on both hands.'),
      quiz('Which number is your right-hand thumb?', ['1', '5', '2', '0'], 0, 'Thumbs are 1 on both hands.'),
    ]),
    L('p-cpos', 'Middle C and C position', 'Five notes, five fingers', [
      card('Right hand C position', 'Put your right thumb on middle C. Each finger rests on the next white key: C D E F G with fingers 1 2 3 4 5.', { k: 'keys', from: 'C4', to: 'C5', mark: RH_C }),
      listen('Listen to the five notes going up and back down.', 'C4/q D4/q E4/q F4/q G4/q F4/q E4/q D4/q C4/h', { bpm: 84, fingers: RH_C }),
      play('Now you. Play each note when it lights up. The music waits for you.', 'C4/q D4/q E4/q F4/q G4/q F4/q E4/q D4/q C4/h', { fingers: RH_C }),
      tempo('Same five notes, in time with the click.', 'C4/q D4/q E4/q F4/q G4/q F4/q E4/q D4/q C4/w', { bpm: 66, fingers: RH_C }),
    ]),
    L('p-hotcross', 'Hot Cross Buns', 'Your first tune, fingers 3 2 1', [
      card('Three notes, one tune', 'This tune uses E, D and C with fingers 3, 2 and 1. Keep your hand in C position.', { k: 'keys', from: 'C4', to: 'G4', mark: F('C4:1 D4:2 E4:3') }),
      listen('Hear it first.', 'E4/q D4/q C4/h E4/q D4/q C4/h C4/e C4/e C4/e C4/e D4/e D4/e D4/e D4/e E4/q D4/q C4/h', { bpm: 84 }),
      play('Play along in wait mode.', 'E4/q D4/q C4/h E4/q D4/q C4/h C4/e C4/e C4/e C4/e D4/e D4/e D4/e D4/e E4/q D4/q C4/h', { fingers: RH_C }),
      song('Play it with the band.', 'hotcross', { bpm: 72 }),
    ]),
    L('p-mary', 'Mary Had a Little Lamb', 'Four fingers and a jump to G', [
      listen('Listen, and notice the reach up to G with finger 5.', 'E4/q D4/q C4/q D4/q E4/q E4/q E4/h D4/q D4/q D4/h E4/q G4/q G4/h', { bpm: 88, fingers: RH_C }),
      play('Learn the first half.', 'E4/q D4/q C4/q D4/q E4/q E4/q E4/h D4/q D4/q D4/h E4/q G4/q G4/h', { fingers: RH_C }),
      play('Now the second half.', 'E4/q D4/q C4/q D4/q E4/q E4/q E4/q E4/q D4/q D4/q E4/q D4/q C4/w', { fingers: RH_C }),
      song('The whole song with backing.', 'mary', { bpm: 80 }),
    ]),
  ]),
  U('Reading Music', [
    L('p-rhythm1', 'Quarter, half and whole notes', 'Counting the beat', [
      card('Notes have lengths', 'A quarter note lasts one beat. A half note lasts two. A whole note lasts four. Count out loud: "1 2 3 4" while you play.', { k: 'staff', clef: 'treble', notes: 'C4/q C4/q C4/h C4/w', time: [4, 4] }),
      rhythm('Tap along with the click. Tap the screen, a key, or clap.', 'q q h q q h', { bpm: 72 }),
      rhythm('Now a whole note: tap once and hold for four.', 'q q q q h h w', { bpm: 72 }),
      quiz('How many beats is a half note in 4/4?', ['1', '2', '3', '4'], 1, 'Half note = two beats.', { k: 'staff', clef: 'treble', notes: 'G4/h', time: [4, 4] }),
    ]),
    L('p-treble1', 'Treble clef: C to G', 'Lines and spaces', [
      card('The treble staff', 'The right hand usually reads the treble clef. Middle C sits on a short extra line below the staff. Each line and each space is the next letter.', { k: 'staff', clef: 'treble', notes: 'C4/q D4/q E4/q F4/q G4/q' }),
      quiz('Which note is on the bottom line of the treble staff?', ['C', 'E', 'G', 'F'], 1, 'The bottom line of the treble staff is E. Remember lines E G B D F: "Every Good Boy Does Fine".', { k: 'staff', clef: 'treble', notes: 'E4/w' }),
      { t: 'drill', kind: 'noteName', clef: 'treble', pool: ['C4', 'D4', 'E4', 'F4', 'G4'], count: 8 },
      play('Play what you see.', 'C4/q E4/q D4/q F4/q E4/q G4/q F4/q D4/q C4/w', { fingers: RH_C, show: 'staff' }),
    ]),
    L('p-ode', 'Ode to Joy', 'Beethoven, right hand', [
      card('A famous melody in five notes', 'Beethoven wrote this tune for his Ninth Symphony. It moves mostly by step, so you stay in C position the whole time.', null),
      listen('Listen to the first line.', 'E4/q E4/q F4/q G4/q G4/q F4/q E4/q D4/q C4/q C4/q D4/q E4/q E4/q. D4/e D4/h', { bpm: 92 }),
      play('Learn line one.', 'E4/q E4/q F4/q G4/q G4/q F4/q E4/q D4/q C4/q C4/q D4/q E4/q E4/q. D4/e D4/h', { fingers: RH_C }),
      play('Line two ends on C.', 'E4/q E4/q F4/q G4/q G4/q F4/q E4/q D4/q C4/q C4/q D4/q E4/q D4/q. C4/e C4/h', { fingers: RH_C }),
      song('Perform it with the backing track.', 'ode', { bpm: 84 }),
    ]),
    L('p-lhc', 'Left hand C position', 'Little finger on C', [
      card('Left hand C position', 'Put your left little finger (5) on the C below middle C. Fingers 5 4 3 2 1 rest on C D E F G.', { k: 'keys', from: 'C3', to: 'C4', mark: LH_C }),
      play('Up and down with the left hand.', 'C3/q D3/q E3/q F3/q G3/q F3/q E3/q D3/q C3/h', { fingers: LH_C }),
      card('The bass clef', 'The left hand usually reads the bass clef. Its top line is A, and middle C sits on a ledger line above the staff. Lines from the bottom: G B D F A ("Good Boys Do Fine Always").', { k: 'staff', clef: 'bass', notes: 'C3/q D3/q E3/q F3/q G3/q' }),
      { t: 'drill', kind: 'noteName', clef: 'bass', pool: ['C3', 'D3', 'E3', 'F3', 'G3', 'A3', 'B3'], count: 8 },
    ]),
    L('p-lhmel', 'Left-hand melody', 'Reading bass clef', [
      play('Hot Cross Buns, left hand. Fingers 3 4 5 for E D C.', 'E3/q D3/q C3/h E3/q D3/q C3/h C3/e C3/e C3/e C3/e D3/e D3/e D3/e D3/e E3/q D3/q C3/h', { fingers: LH_C, show: 'staff' }),
      play('Ode to Joy, left hand.', 'E3/q E3/q F3/q G3/q G3/q F3/q E3/q D3/q C3/q C3/q D3/q E3/q E3/q. D3/e D3/h', { fingers: LH_C }),
    ]),
    L('p-together1', 'Hands together: first try', 'Melody plus one bass note', [
      card('One hand moves, one hand holds', 'Start easy: the left hand holds a long C or G while the right hand plays the melody.', { k: 'keys', from: 'C3', to: 'G4', mark: { C3: 5, G3: 1, C4: 1, G4: 5 } }),
      play('Left hand C (whole note) under the right-hand notes.', 'C3+E4/q E4/q F4/q G4/q G3+G4/q F4/q E4/q D4/q C3+C4/q C4/q D4/q E4/q G3+E4/q. D4/e D4/h', { mode: 'wait' }),
      tempo('Now in time, slowly.', 'C3+E4/q E4/q F4/q G4/q G3+G4/q F4/q E4/q D4/q C3+C4/q C4/q D4/q E4/q G3+E4/q. D4/e D4/h', { bpm: 60 }),
    ]),
  ]),
  U('Both Hands', [
    L('p-twinkle', 'Twinkle, Twinkle', 'Stretching to A', [
      card('A small stretch', 'Twinkle uses A, one key above G. Reach with finger 5 or shift the hand: try both and keep the one that feels smooth.', { k: 'keys', from: 'C4', to: 'B4', mark: F('C4:1 D4:2 E4:3 F4:4 G4:5') }),
      play('The first line.', 'C4/q C4/q G4/q G4/q A4/q A4/q G4/h F4/q F4/q E4/q E4/q D4/q D4/q C4/h'),
      play('The middle line.', 'G4/q G4/q F4/q F4/q E4/q E4/q D4/h G4/q G4/q F4/q F4/q E4/q E4/q D4/h'),
      song('Full song with backing.', 'twinkle', { bpm: 84 }),
    ]),
    L('p-eighths', 'Eighth notes', 'Two notes per beat', [
      card('Eighth notes', 'Two eighth notes fit in one beat. Count "1 and 2 and". Eighth notes are often joined by a beam.', { k: 'staff', clef: 'treble', notes: 'C4/e D4/e E4/e F4/e G4/q G4/q', time: [4, 4] }),
      rhythm('Tap the eighths.', 'e e e e q q e e q h', { bpm: 66 }),
      play('Play it.', 'C4/e D4/e E4/e F4/e G4/q G4/q G4/e F4/e E4/e D4/e C4/h', { fingers: RH_C, mode: 'tempo', bpm: 60 }),
    ]),
    L('p-frere', 'Frère Jacques', 'Eighths and a low G', [
      listen('Listen.', 'C4/q D4/q E4/q C4/q C4/q D4/q E4/q C4/q E4/q F4/q G4/h E4/q F4/q G4/h G4/e A4/e G4/e F4/e E4/q C4/q', { bpm: 96 }),
      play('Lines one and two.', 'C4/q D4/q E4/q C4/q C4/q D4/q E4/q C4/q E4/q F4/q G4/h E4/q F4/q G4/h', { fingers: RH_C }),
      play('Lines three and four (thumb moves down to G below middle C at the end).', 'G4/e A4/e G4/e F4/e E4/q C4/q G4/e A4/e G4/e F4/e E4/q C4/q C4/q G3/q C4/h C4/q G3/q C4/h'),
      song('All together.', 'frere', { bpm: 88 }),
    ]),
    L('p-rests', 'Rests', 'Silence that counts', [
      card('Rests are beats of silence', 'A quarter rest is one beat of silence, a half rest two, a whole rest a full bar. Keep counting through them.', { k: 'staff', clef: 'treble', notes: 'C4/q R/q E4/q R/q G4/h R/h', time: [4, 4] }),
      rhythm('Tap only on the notes, stay still on the rests.', 'q qr q qr h hr', { bpm: 72 }),
      tempo('Play it.', 'C4/q R/q E4/q R/q G4/h R/h E4/q R/q C4/h', { bpm: 72, fingers: RH_C }),
    ]),
  ]),
  U('Chords', [
    L('p-ctriad', 'The C major chord', 'Three notes at once', [
      card('Triads', 'A triad stacks every other white key: C E G is a C major chord. Right hand fingers 1 3 5. Left hand fingers 5 3 1.', { k: 'keys', from: 'C4', to: 'C5', mark: F('C4:1 E4:3 G4:5') }),
      chord('Play a C chord with the right hand: C, E and G together.', 'C', { voicing: 'C4+E4+G4' }),
      chord('Now with the left hand: C, E and G below middle C.', 'C', { voicing: 'C3+E3+G3' }),
    ]),
    L('p-fg', 'F and G chords', 'The three chords that play a thousand songs', [
      card('F major and G major', 'Move the same shape: F A C is F major, G B D is G major. Keep fingers 1 3 5.', { k: 'keys', from: 'C4', to: 'D5', hl: ['F4', 'A4', 'C5'] }),
      chord('F major: F A C.', 'F', { voicing: 'F4+A4+C5' }),
      chord('G major: G B D.', 'G', { voicing: 'G4+B4+D5' }),
      quiz('Which notes make G major?', ['G B D', 'G A B', 'G C E', 'G Bb D'], 0, 'G major is G, B and D.'),
    ]),
    L('p-145', 'I, IV and V', 'Chord changes in time', [
      card('Numbers for chords', 'In the key of C, C is chord I, F is chord IV and G is chord V. Musicians use these numbers to move songs into any key.', null),
      play('Left hand chords: C, F, G, C.', 'C3+E3+G3/w F3+A3+C4/w G3+B3+D4/w C3+E3+G3/w', { mode: 'wait' }),
      tempo('Same chords, two beats each.', 'C3+E3+G3/h F3+A3+C4/h G3+B3+D4/h C3+E3+G3/h C3+E3+G3/h F3+A3+C4/h G3+B3+D4/h C3+E3+G3/h', { bpm: 72 }),
    ]),
    L('p-inversions', 'Inversions', 'Moving chords with less jumping', [
      card('Same notes, new order', 'C/E means a C chord with E on the bottom. Using inversions, C to F to G can be played with your hand barely moving: C E G, then C F A, then B D G.', { k: 'keys', from: 'B3', to: 'A4', hl: ['C4', 'F4', 'A4'] }),
      play('C E G, then C F A, then B D G, then C E G.', 'C4+E4+G4/h C4+F4+A4/h B3+D4+G4/h C4+E4+G4/h'),
      tempo('Keep the top finger close: smooth changes in time.', 'C4+E4+G4/h C4+F4+A4/h B3+D4+G4/h C4+E4+G4/h C4+E4+G4/h C4+F4+A4/h B3+D4+G4/h C4+E4+G4/w', { bpm: 72 }),
    ]),
    L('p-marychords', 'Melody with chords', 'Mary, hands together', [
      play('Right hand melody, left hand C and G chords on the first beat of each bar.', 'C3+E3+G3+E4/q D4/q C4/q D4/q C3+E3+G3+E4/q E4/q E4/h G3+B3+D4+D4/q D4/q D4/h C3+E3+G3+E4/q G4/q G4/h'),
      play('Second half.', 'C3+E3+G3+E4/q D4/q C4/q D4/q C3+E3+G3+E4/q E4/q E4/q E4/q G3+B3+D4+D4/q D4/q E4/q D4/q C3+E3+G3+C4/w'),
    ]),
    L('p-pop', 'The pop progression', 'C, G, A minor, F', [
      card('Four chords', 'C G Am F is the backbone of countless pop songs. A minor is A C E: a minor chord sounds darker than major.', { k: 'keys', from: 'C4', to: 'C5', hl: ['A4', 'C5', 'E5'] }),
      tempo('Right-hand chords, one bar each: C (C E G), G (B D G), Am (C E A), F (C F A).', 'C4+E4+G4/w B3+D4+G4/w C4+E4+A4/w C4+F4+A4/w', { bpm: 76 }),
      song('Play the chords under Sunrise Steps.', 'sunrise', { bpm: 84, part: 'chords' }),
    ]),
  ]),
  U('Scales and Technique', [
    L('p-cscale', 'C major scale, right hand', 'Thumb under', [
      card('The thumb crosses under', 'To play eight notes with five fingers, play C D E with 1 2 3, then tuck the thumb under to F, and finish G A B C with 2 3 4 5. Coming down, finger 3 crosses over the thumb.', { k: 'keys', from: 'C4', to: 'C5', mark: F('C4:1 D4:2 E4:3 F4:1 G4:2 A4:3 B4:4 C5:5') }),
      play('Up and down, slowly.', 'C4/q D4/q E4/q F4/q G4/q A4/q B4/q C5/q B4/q A4/q G4/q F4/q E4/q D4/q C4/h', { fingers: F('C4:1 D4:2 E4:3 F4:1 G4:2 A4:3 B4:4 C5:5') }),
      tempo('In time.', 'C4/q D4/q E4/q F4/q G4/q A4/q B4/q C5/q B4/q A4/q G4/q F4/q E4/q D4/q C4/h', { bpm: 72 }),
    ]),
    L('p-cscalelh', 'C major scale, left hand', '5 4 3 2 1, then 3 crosses over', [
      card('Left-hand fingering', 'Going up: 5 4 3 2 1 on C D E F G, then finger 3 crosses over the thumb to A, and 2 1 finish B C.', { k: 'keys', from: 'C3', to: 'C4', mark: F('C3:5 D3:4 E3:3 F3:2 G3:1 A3:3 B3:2 C4:1') }),
      play('Up and down.', 'C3/q D3/q E3/q F3/q G3/q A3/q B3/q C4/q B3/q A3/q G3/q F3/q E3/q D3/q C3/h', { fingers: F('C3:5 D3:4 E3:3 F3:2 G3:1 A3:3 B3:2 C4:1') }),
    ]),
    L('p-gscale', 'G major and the F sharp', 'Your first black key', [
      card('Sharps', 'A sharp (♯) raises a note by a half step, to the very next key. G major has one sharp: F♯, the black key just right of F. Fingering is the same as C major.', { k: 'keys', from: 'G4', to: 'G5', mark: F('G4:1 A4:2 B4:3 C5:1 D5:2 E5:3 F#5:4 G5:5') }),
      play('G major scale, right hand.', 'G4/q A4/q B4/q C5/q D5/q E5/q F#5/q G5/q F#5/q E5/q D5/q C5/q B4/q A4/q G4/h', { fingers: F('G4:1 A4:2 B4:3 C5:1 D5:2 E5:3 F#5:4 G5:5') }),
      play('Minuet warm-up in G position.', 'D5/q G4/e A4/e B4/e C5/e D5/q G4/q G4/q', { fingers: RH_G }),
    ]),
    L('p-minor5', 'Minor five-finger pattern', 'Major vs minor', [
      card('One key changes the mood', 'C D E F G is major. Lower the middle note to E♭ and you get C minor: C D E♭ F G. Hear how it turns darker.', { k: 'keys', from: 'C4', to: 'G4', hl: ['C4', 'D4', 'D#4', 'F4', 'G4'] }),
      listen('Major, then minor.', 'C4/q D4/q E4/q F4/q G4/h R/h C4/q D4/q Eb4/q F4/q G4/h', { bpm: 84 }),
      play('Play the minor pattern.', 'C4/q D4/q Eb4/q F4/q G4/q F4/q Eb4/q D4/q C4/h', { fingers: F('C4:1 D4:2 Eb4:3 F4:4 G4:5') }),
      quiz('What changed from C major to C minor?', ['The 2nd note went up', 'The 3rd note went down a half step', 'The 5th note went down', 'Nothing'], 1, 'Minor lowers the 3rd by a half step.'),
    ]),
    L('p-dynamics', 'Loud and soft', 'Dynamics and touch', [
      card('Dynamics', 'p (piano) means soft, f (forte) means loud, mp and mf are in between. On a piano, loudness comes from how fast the key goes down, not how hard you push after.', null),
      { t: 'dynamics', text: 'Play C softly, then strongly. With a MIDI keyboard you will see how fast each key went down.', note: 'C4' },
      quiz('What does "f" mean?', ['Fast', 'Loud', 'Fine', 'Flat'], 1, 'f is forte: loud.'),
    ]),
  ]),
  U('Pieces', [
    L('p-jingle', 'Jingle Bells', 'Dotted rhythms', [
      card('Dotted quarter + eighth', 'A dot adds half the note\'s value: a dotted quarter lasts 1½ beats, followed by an eighth to fill the beat.', { k: 'staff', clef: 'treble', notes: 'E4/q G4/q C4/q. D4/e E4/w', time: [4, 4] }),
      play('Learn the chorus, part one.', 'E4/q E4/q E4/h E4/q E4/q E4/h E4/q G4/q C4/q. D4/e E4/w', { fingers: RH_C }),
      song('With the band.', 'jingle', { bpm: 96 }),
    ]),
    L('p-aucclair', 'Au Clair de la Lune', 'Moving the hand down', [
      play('Section A.', 'C4/q C4/q C4/q D4/q E4/h D4/h C4/q E4/q D4/q D4/q C4/w', { fingers: RH_C }),
      play('Section B moves lower: thumb on G below middle C.', 'D4/q D4/q D4/q D4/q A3/h A3/h D4/q C4/q B3/q A3/q G3/w', { fingers: F('G3:1 A3:2 B3:3 C4:4 D4:5') }),
      song('Whole piece.', 'aucclair', { bpm: 88 }),
    ]),
    L('p-london', 'London Bridge', 'Steady eighths', [ song('Play the tune with the band.', 'london', { bpm: 92 }) ]),
    L('p-rowboat', 'Row, Row, Row Your Boat', 'Compound time: 6/8', [
      card('6/8 time', 'In 6/8 there are six eighth notes per bar, felt as two big beats. Count "1 2 3 4 5 6" with weight on 1 and 4.', { k: 'staff', clef: 'treble', notes: 'C4/q. C4/q. C4/q D4/e E4/q.', time: [6, 8] }),
      song('Play it.', 'rowboat', { bpm: 72 }),
    ]),
    L('p-minuet1', 'Minuet in G, part 1', 'Petzold, a classical favorite', [
      card('G position with extensions', 'Start with finger 5 on D. The melody leaps down to G, then climbs back by step. Watch for F♯.', { k: 'keys', from: 'F#4', to: 'G5', mark: RH_G }),
      play('Bars 1 to 4.', 'D5/q G4/e A4/e B4/e C5/e D5/q G4/q G4/q E5/q C5/e D5/e E5/e F#5/e G5/q G4/q G4/q', { time: [3, 4] }),
      play('Bars 5 to 8.', 'C5/q D5/e C5/e B4/e A4/e B4/q C5/e B4/e A4/e G4/e F#4/q G4/e A4/e B4/e G4/e A4/h.', { time: [3, 4] }),
    ]),
    L('p-minuet2', 'Minuet in G, part 2', 'The full piece', [ song('Play the whole minuet with accompaniment.', 'minuet', { bpm: 88 }) ], { xp: 40 }),
    L('p-elise', 'Für Elise theme', 'Beethoven, sixteenth notes', [
      card('The famous turn', 'Alternate E and D♯ with fingers 5 and 4, then drop down to B, D, C, A. Play slowly first: speed comes later.', { k: 'keys', from: 'A4', to: 'E5', mark: F('E5:5 D#5:4 B4:1 D5:3 C5:2 A4:1') }),
      play('Opening turn.', 'E5/s D#5/s E5/s D#5/s E5/s B4/s D5/s C5/s A4/e', { bpm: 50 }),
      song('The theme.', 'elise', { bpm: 52 }),
    ], { xp: 40 }),
    L('p-amazing', 'Amazing Grace', '3/4 and a pickup', [
      card('Pickup notes', 'Some songs start before beat 1. "A-" is a pickup on beat 3, and "-ma-" lands on the downbeat.', null),
      song('Play the opening phrase.', 'amazing', { bpm: 76 }),
    ]),
  ]),
  U('Accompaniment Styles', [
    L('p-broken', 'Broken chords', 'Spread the chord out', [
      card('Broken chords', 'Instead of playing C E G together, play them one at a time. The left hand often does this under a melody.', { k: 'keys', from: 'C3', to: 'G3', mark: LH_C }),
      tempo('C, F, G, C, broken.', 'C3/e E3/e G3/e E3/e C3/e E3/e G3/e E3/e C3/e F3/e A3/e F3/e C3/e F3/e A3/e F3/e B2/e D3/e G3/e D3/e B2/e D3/e G3/e D3/e C3/e E3/e G3/e E3/e C3/h', { bpm: 72 }),
    ]),
    L('p-alberti', 'Alberti bass', 'Low, high, middle, high', [
      card('A classical pattern', 'Alberti bass plays the chord tones in the order lowest, highest, middle, highest: C G E G.', null),
      tempo('Alberti on C and G.', 'C3/e G3/e E3/e G3/e C3/e G3/e E3/e G3/e B2/e G3/e D3/e G3/e B2/e G3/e D3/e G3/e C3/e G3/e E3/e G3/e C3/h', { bpm: 72 }),
    ]),
    L('p-waltz', 'Waltz pattern', 'Bass, chord, chord', [
      card('Oom-pah-pah', 'In 3/4, play the bass note on beat 1 and the chord on beats 2 and 3.', null),
      tempo('Waltz in G.', 'G2/q B2+D3/q B2+D3/q G2/q B2+D3/q B2+D3/q C3/q E3+G3/q E3+G3/q D3/q F#3+A3/q F#3+A3/q G2/h.', { bpm: 92, time: [3, 4] }),
    ]),
    L('p-blues', '12-bar blues', 'The form behind rock and roll', [
      card('The 12-bar blues', 'Twelve bars, three chords: I I I I | IV IV I I | V IV I V. In A that is A A A A | D D A A | E D A E.', null),
      tempo('Left-hand shuffle on A, D and E (root and fifth, then root and sixth).', 'A2+E3/q A2+F#3/q A2+E3/q A2+F#3/q D3+A3/q D3+B3/q D3+A3/q D3+B3/q A2+E3/q A2+F#3/q A2+E3/q A2+F#3/q E2+B2/q E2+C#3/q E2+B2/q E2+C#3/q', { bpm: 80 }),
      song('Play the melody of Blue Room Shuffle.', 'bluesroom', { bpm: 84 }),
    ]),
    L('p-improv', 'Improvise with the blues scale', 'No wrong notes', [
      card('The A blues scale', 'A C D E♭ E G A. Over the backing track, any of these notes sounds right. Start with three notes, play short phrases, and leave space.', { k: 'keys', from: 'A3', to: 'A4', hl: ['A3', 'C4', 'D4', 'D#4', 'E4', 'G4', 'A4'] }),
      improv('Make up your own phrases over a 12-bar blues in A. Notes from the scale earn points.', { scale: ['A', 'C', 'D', 'D#', 'E', 'G'], chords: 'A7:4 A7:4 A7:4 A7:4 D7:4 D7:4 A7:4 A7:4 E7:4 D7:4 A7:4 E7:4', bpm: 88, style: 'blues', secs: 34 }),
    ]),
    L('p-pedal', 'The sustain pedal', 'Connecting chords', [
      card('Legato pedaling', 'The right pedal keeps notes ringing. Change it just after each new chord: play the chord, lift the pedal, press it again right away.', null),
      { t: 'dynamics', text: 'Play C, then F, then G. With a MIDI keyboard and pedal, you will see when the pedal goes down.', note: 'C4', pedal: true },
    ]),
  ]),
  U('Musicianship', [
    L('p-ear1', 'Play by ear', 'Listen, then copy', [
      card('Listen and copy', 'You will hear a short phrase. Play it back. All phrases start on C and stay in C position.', { k: 'keys', from: 'C4', to: 'G4', mark: RH_C }),
      copy('Phrase 1.', 'C4/q D4/q E4/h', { bpm: 80 }),
      copy('Phrase 2.', 'E4/q D4/q C4/q D4/q E4/h', { bpm: 80 }),
      copy('Phrase 3.', 'C4/q E4/q G4/q E4/q C4/h', { bpm: 80 }),
      copy('Phrase 4.', 'G4/q F4/q E4/q D4/q C4/h', { bpm: 84 }),
    ]),
    L('p-sight1', 'Sight-reading 1', 'Read, then play', [
      card('How to sight-read', 'Before you play: find the first note, check the hand position, and look for patterns (steps, skips, repeats). Then keep going even if you miss one.', null),
      { t: 'sight', clef: 'treble', pool: ['C4', 'D4', 'E4', 'F4', 'G4'], bars: 4, bpm: 60 },
      { t: 'sight', clef: 'treble', pool: ['C4', 'D4', 'E4', 'F4', 'G4'], bars: 4, bpm: 66 },
    ]),
    L('p-sight2', 'Sight-reading 2', 'Bass clef and wider range', [
      { t: 'sight', clef: 'bass', pool: ['C3', 'D3', 'E3', 'F3', 'G3'], bars: 4, bpm: 60 },
      { t: 'sight', clef: 'treble', pool: ['G4', 'A4', 'B4', 'C5', 'D5'], bars: 4, bpm: 66 },
    ]),
    L('p-dmajor', 'D major and A minor', 'Two new scales', [
      card('D major', 'D major has two sharps: F♯ and C♯. Right hand fingering is the same as C major: 1 2 3, thumb under, 1 2 3 4 5.', { k: 'keys', from: 'D4', to: 'D5', mark: F('D4:1 E4:2 F#4:3 G4:1 A4:2 B4:3 C#5:4 D5:5') }),
      play('D major scale.', 'D4/q E4/q F#4/q G4/q A4/q B4/q C#5/q D5/q C#5/q B4/q A4/q G4/q F#4/q E4/q D4/h', { fingers: F('D4:1 E4:2 F#4:3 G4:1 A4:2 B4:3 C#5:4 D5:5') }),
      card('A natural minor', 'A minor uses only white keys, A to A. It is the relative minor of C major: same notes, different home.', { k: 'keys', from: 'A3', to: 'A4', mark: F('A3:1 B3:2 C4:3 D4:1 E4:2 F4:3 G4:4 A4:5') }),
      play('A minor scale.', 'A3/q B3/q C4/q D4/q E4/q F4/q G4/q A4/q G4/q F4/q E4/q D4/q C4/q B3/q A3/h', { fingers: F('A3:1 B3:2 C4:3 D4:1 E4:2 F4:3 G4:4 A4:5') }),
    ]),
  ]),
];
