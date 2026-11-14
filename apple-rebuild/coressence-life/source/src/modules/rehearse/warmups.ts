// Warmups for performers. General practice routines; they do not replace a voice teacher or a clinician.
import type { Routine } from '@core/routine';

const VOICE_CAUTION = 'Keep everything easy and comfortable. Stop if anything hurts or your voice feels strained.';

export const WARMUPS: Routine[] = [
  {
    id: 'voice-10',
    module: 'rehearse',
    title: 'Vocal warmup',
    kind: 'voice',
    level: 'Singers and actors',
    summary: 'Body, breath, then gentle semi-occluded exercises before you sing or speak at length.',
    caution: VOICE_CAUTION,
    steps: [
      { name: 'Release the body', seconds: 60, cue: 'Roll the shoulders, stretch the neck gently, and let the jaw hang loose.' },
      { name: 'Jaw and face massage', seconds: 45, cue: 'Small circles along the jaw hinge and cheeks. Let the mouth fall open a little.' },
      { name: 'Low, easy breathing', seconds: 60, cue: 'Hand on your belly. Breathe in through the nose, let the ribs widen, breathe out on a long, quiet "sss".' },
      { name: 'Hum', seconds: 60, cue: 'Hum at a comfortable speaking pitch. Feel the buzz around the lips and nose.' },
      { name: 'Lip trills', seconds: 90, cue: 'Bubble the lips and slide up and down through a comfortable range. Support lightly from the breath.' },
      { name: 'Straw phonation', seconds: 120, cue: 'Hum through a narrow straw with glides up and down. This keeps effort low while the voice warms.' },
      { name: 'Sirens on "ng"', seconds: 60, cue: 'As in "sing". Glide smoothly from low to high and back without pushing.' },
      { name: 'Five-note scales', seconds: 120, cue: 'On "oo" then "ee", in the middle of your range. Move up by half steps only while it stays easy.' },
      { name: 'Speak a line', seconds: 45, cue: 'Speak a line from your piece with forward, buzzy resonance at an easy volume.' },
    ],
  },
  {
    id: 'voice-speaking',
    module: 'rehearse',
    title: 'Speaking voice warmup',
    kind: 'voice',
    level: 'Speakers, teachers, presenters',
    summary: 'Five minutes before a talk, a class or a long day of calls.',
    caution: VOICE_CAUTION,
    steps: [
      { name: 'Shoulders and neck', seconds: 45, cue: 'Let tension go before you use your voice.' },
      { name: 'Breathing on "sss"', seconds: 45, cue: 'Quiet breath in, long even "sss" out.' },
      { name: 'Hum and chew', seconds: 60, cue: 'Hum while making gentle chewing motions. Easy, buzzy, relaxed.' },
      { name: 'Hum into words', seconds: 60, cue: '"Mmm-one, mmm-two, mmm-three" keeping the buzz forward.' },
      { name: 'Articulation', seconds: 60, cue: 'Tongue twisters at a calm pace: "red leather, yellow leather".' },
      { name: 'Read aloud', seconds: 30, cue: 'Your first few lines, at a comfortable pitch and volume.' },
    ],
  },
  {
    id: 'stage-physical',
    module: 'rehearse',
    title: 'Physical warmup before stage',
    kind: 'body',
    level: 'Performers',
    summary: 'Raise your heart rate a little, free the spine and settle nerves.',
    premium: true,
    caution: 'Move within a comfortable range. Stop if you feel sharp pain or dizziness.',
    steps: [
      { name: 'March and swing', seconds: 60, cue: 'March in place, arms swinging freely.' },
      { name: 'Spine rolls', seconds: 60, cue: 'Roll down from the head, knees soft, and roll back up slowly.' },
      { name: 'Hip circles', seconds: 45, cue: 'Hands on hips, wide slow circles both ways.' },
      { name: 'Shake out', seconds: 30, cue: 'Shake hands, arms and legs loose.' },
      { name: 'Grounding', seconds: 60, cue: 'Stand still, feel your feet, breathe in for four and out for six.' },
      { name: 'Focus', seconds: 45, cue: 'Picture your first moment on stage. Say your first line in your head.' },
    ],
  },
  {
    id: 'voice-cooldown',
    module: 'rehearse',
    title: 'Vocal cool-down',
    kind: 'voice',
    level: 'After shows and rehearsals',
    summary: 'Bring the voice down gently after heavy use.',
    caution: VOICE_CAUTION,
    steps: [
      { name: 'Descending sighs', seconds: 45, cue: 'Gentle sighs from a comfortable middle pitch down to low, unforced.' },
      { name: 'Straw glides down', seconds: 90, cue: 'Through the straw, slide from middle to low pitches only.' },
      { name: 'Hum at speaking pitch', seconds: 45, cue: 'Settle at your normal speaking pitch.' },
      { name: 'Water and quiet', seconds: 60, cue: 'Sip water and stay quiet for a minute. Avoid shouting over noise afterward.' },
    ],
  },
];
