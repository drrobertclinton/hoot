// The 12 course modules for Live at Your Peak and Perform at Your Peak, plus the four performer practice labs.
//
// Text comes from the participant books through scripts/extract-course.js (live.generated.json and
// perform.generated.json; re-run the script after a book edit). This file holds only the hand-made choices that
// the books do not supply in a screen-ready form:
//   - which Part One chapters to link for further reading,
//   - the multiple-choice options for each knowledge check (the question and explanation come from the book's
//     "Worked examples and knowledge checks" section where one fits, otherwise from the topic's own text; `from`
//     records which),
//   - the decision fields and which plan builder field each one fills (outcome, why, action, constraint, minimum,
//     ruleIf, ruleThen, dashboard, observeDays),
//   - the next action (from the topic's Application paragraph and the weekly homework).
// Module structure follows "Course - Digital Module Plan.md". General education only; nothing here diagnoses.
import { DASHBOARD_OPTIONS } from '../../plan/model';
import type { BookRef, Lesson, LessonField } from '../lessons';
import liveBook from './live.generated.json';
import performBook from './perform.generated.json';

export type Course = 'live' | 'perform';
type Src = { file: string; heading: string; line: number };
type Para = string[];
export type BookContent = {
  track: Course;
  title: string;
  generatedFrom: string;
  disclaimer: { src: Src; body: Para; faith: Para } | null;
  chapters: { number: number; title: string; src: Src }[];
  weeks: { number: number; title: string; intro: Para; homework: Para; homeworkSrc?: Src; faith: { ref: string; body: Para; src: Src } | null; review: Para; src: Src }[];
  topics: {
    number: number;
    week: number;
    title: string;
    src: Src;
    reading: Para;
    application: string;
    subsections: { heading: string; body: Para; src: Src }[];
    example: { src: Src; body: Para; discuss: string } | null;
    prompts: { label: string; src: Src }[];
  }[];
  labs: { number: number; week: number; title: string; src: Src; reading: Para; submission: string; authorNote: Para; faith: { ref: string; body: Para } | null }[];
  worksheets: { number: number; week: number | null; title: string; src: Src; fields: string[]; notes: Para }[];
  knowledgeCheck: { number: number; question: string; answer: string; src: Src }[];
  cases: { number: number; title: string; body: Para; src: Src }[];
  planExample: { title: string; intro: Para; parts: { label: string; text: string }[]; src: Src } | null;
  finalExplanation: { prompts: string[]; src: Src } | null;
};

export const BOOKS: Record<Course, BookContent> = { live: liveBook as BookContent, perform: performBook as BookContent };
export const COURSE_TITLE: Record<Course, string> = { live: 'Live at Your Peak', perform: 'Perform at Your Peak' };

const ref = (label: string, s: Src): BookRef => ({ label, file: s.file, heading: s.heading, line: s.line });

// ------------------------------------------------------------------ hand-made module choices
type Check = { question?: string; options: string[]; correct: number; explanation?: string; kc?: number; from: string };
type ModuleSpec = {
  n: number;
  short: string;
  phase: string;
  minutes: number;
  worksheets: number[];
  chapters: Record<Course, number[]>;
  check: Check | Record<Course, Check>;
  fields: LessonField[];
  next: string;
  /** Part Three example to add for each track: a case number or 'plan' for the completed plan example. */
  extra?: Partial<Record<Course, number | 'plan'>>;
  planBuilder?: boolean;
};

const DECISIONS = [
  { key: 'keep', label: 'Keep' },
  { key: 'simplify', label: 'Simplify' },
  { key: 'progress', label: 'Progress' },
  { key: 'reduce', label: 'Reduce' },
  { key: 'seek help', label: 'Seek help' },
];

const SPECS: ModuleSpec[] = [
  {
    n: 1,
    short: 'Purpose',
    phase: 'Assess',
    minutes: 12,
    worksheets: [1],
    chapters: { live: [1], perform: [1] },
    check: {
      question: 'Your goal is greater stamina. Which of these can you observe this week?',
      options: ['Greater stamina, because it is the outcome', 'Attending a manageable session, because it is an action', 'Neither, until a device gives a reading', 'Both equally, from the first day'],
      correct: 1,
      explanation:
        'An outcome such as greater stamina takes time to evaluate. An action such as attending a manageable session can be observed immediately. Reviewing both prevents a slow outcome from hiding progress in the habits that support it.',
      from: 'Topic 1 reading',
    },
    fields: [
      { key: 'outcome', label: 'My primary outcome for this cycle', placeholder: 'Enough capacity to join weekend walks with my family', required: true },
      { key: 'why', label: 'Why this matters to me', placeholder: 'I have been saying no to outings I enjoy', multiline: true },
      { key: 'action', label: 'One action I can influence this week', placeholder: 'Two short sessions in openings I already have', required: true },
      { key: 'constraint', label: 'One constraint I will plan around', placeholder: 'Caregiving most evenings' },
    ],
    next: 'Fill in Worksheet 1 (Purpose and goal), then go on to Module 2. Your goal may change as you learn more about what matters and what is feasible.',
    planBuilder: true,
  },
  {
    n: 2,
    short: 'Baseline',
    phase: 'Assess',
    minutes: 12,
    worksheets: [2, 7],
    chapters: { live: [2], perform: [2] },
    check: {
      question: 'You forgot to record Wednesday. What goes in the record?',
      options: ['A zero', 'Your best guess', 'Mark it as missing, with a reason if useful', 'Copy Tuesday’s entry'],
      correct: 2,
      explanation:
        'Leave a blank marked as missing, describe why when useful, and continue. Do not give a missed entry a zero unless zero is the actual observation. A forgotten record and a day without activity are different events.',
      from: 'Topic 2, “Decide what belongs on your dashboard”',
    },
    fields: [
      { key: 'dashboard', label: 'My small dashboard (two or three entries)', placeholder: '', kind: 'chips', options: DASHBOARD_OPTIONS, required: true },
      { key: 'observeDays', label: 'Observation period', placeholder: '', kind: 'choice', options: [{ key: '7', label: '7 days' }, { key: '14', label: '14 days' }] },
      { key: 'method', label: 'My method, collection time, and rule for missing entries', placeholder: 'Energy in words each evening; missing days stay marked as missing', multiline: true },
    ],
    next: 'Record your chosen entries on at least five of the next seven days if practical (Worksheet 7, or a daily check-in in Track). Keep ordinary habits stable enough to observe them.',
  },
  {
    n: 3,
    short: 'Support',
    phase: 'Assess',
    minutes: 10,
    worksheets: [2],
    chapters: { live: [11], perform: [7] },
    check: {
      live: { kc: 6, options: ['The course instructor', 'An online fasting guide', 'The prescribing clinician or appropriate diabetes-care team', 'Another participant who has tried it'], correct: 2, from: 'Knowledge check 6' },
      perform: { kc: 5, options: ['Yes, until the note comes back', 'No. Stop the demanding task and get prompt appropriate advice', 'Only if a pitch app shows a problem', 'Yes, but more quietly'], correct: 1, from: 'Knowledge check 5' },
    },
    fields: [
      { key: 'supportQuestion', label: 'The question I need help with', placeholder: 'Can we adapt the schedule when my shifts change?', multiline: true, required: true },
      { key: 'supportWho', label: 'The right person or service', placeholder: 'My coach for the schedule; my clinician for the symptom question' },
      { key: 'supportPractical', label: 'The practical support that would make the routine easier', placeholder: 'A family member protects Tuesday evening' },
    ],
    next: 'Finish the Week 1 homework: a one-page baseline brief. Keep private clinical details in an appropriate clinical channel; a short note that professional guidance is being sought is enough here.',
    extra: { live: 3, perform: 3 },
  },
  {
    n: 4,
    short: 'Training week',
    phase: 'Plan',
    minutes: 12,
    worksheets: [3, 4],
    chapters: { live: [6, 7, 9], perform: [6, 9] },
    check: {
      question: 'Your schedule audit shows that Wednesday’s session keeps colliding with a late obligation. What is the first revision?',
      options: ['Add a fourth session to make up for it', 'Move or shorten that commitment', 'Keep it and try harder', 'Drop the plan and restart next month'],
      correct: 1,
      explanation:
        'The first revision is to move or shorten that commitment, not to add a fourth session as compensation. If the opening is shorter than the planned session, either move the session or select an appropriate shorter version rather than repeatedly pretending the conflict will disappear.',
      from: 'Topic 4 worked example and “Read the whole week before judging a session”',
    },
    fields: [
      { key: 'weekPurpose', label: 'The purpose of my planned sessions and where they fit', placeholder: 'Two strength sessions Monday and Thursday at lunch; easy walks Tuesday and Saturday', multiline: true, required: true },
      { key: 'weekConflict', label: 'The predictable conflict and my alternative', placeholder: 'If Thursday runs late, a 15-minute version at home', multiline: true },
    ],
    next: 'Open the plan builder and place these sessions in your ordinary week, with times. Mark fixed commitments first, then reliable openings, then optional work.',
    extra: { live: 1, perform: 2 },
    planBuilder: true,
  },
  {
    n: 5,
    short: 'Food and fluids',
    phase: 'Plan',
    minutes: 12,
    worksheets: [5],
    chapters: { live: [4, 5], perform: [4] },
    check: { kc: 2, options: ['You lost body fat', 'Fluid loss may explain some or much of it; one reading proves little', 'Your metabolism has changed', 'You should train in the heat more often'], correct: 1, from: 'Knowledge check 2' },
    fields: [
      { key: 'foodAccess', label: 'The difficult food or fluid access point I will address', placeholder: 'After late finishes there is nothing ready', multiline: true, required: true },
      { key: 'foodPlan', label: 'My ordinary-day arrangement and backup', placeholder: 'Pack a familiar meal in the morning; backup is a shelf-stable option in my bag', multiline: true, required: true },
    ],
    next: 'Fill in Worksheet 5 and try one logistical improvement first. Return to the nutrition and hydration chapters for the reasoning and for circumstances that need individualized advice.',
  },
  {
    n: 6,
    short: 'Recovery',
    phase: 'Plan',
    minutes: 12,
    worksheets: [4, 6],
    chapters: { live: [10], perform: [5] },
    check: {
      question: 'What is a minimum plan for?',
      options: ['Keeping you training regardless of symptoms', 'Preserving a few useful actions during an ordinary disruption', 'Replacing care when you feel unwell', 'Making up missed sessions the next week'],
      correct: 1,
      explanation:
        'A minimum routine preserves a few useful actions during an ordinary disruption. An emergency or clinical concern is different and may require stopping, seeking help, or following professional advice. The minimum plan should never become a rule that requires you to keep training regardless of symptoms or circumstances.',
      from: 'Topic 6, “Distinguish a minimum routine from an emergency plan”',
    },
    fields: [
      { key: 'recoveryProtect', label: 'The recovery opportunity I will protect', placeholder: 'Lights out by 11 on work nights; prepare tomorrow’s bag before winding down', multiline: true },
      { key: 'minimum', label: 'My minimum plan (one or two actions)', placeholder: 'One shorter session, regular meals and my sleep window', multiline: true, required: true },
      { key: 'ruleIf', label: 'If… (a specific trigger)', placeholder: 'the planned opening disappears', required: true },
      { key: 'ruleThen', label: 'Then I will…', placeholder: 'use the already chosen shorter alternative', required: true },
    ],
    next: 'Add these to your plan in the plan builder (minimum plan and decision rule), then finish the Week 2 homework: your scheduled plan, minimum alternative and one decision rule.',
    planBuilder: true,
  },
  {
    n: 7,
    short: 'Obstacles',
    phase: 'Review',
    minutes: 10,
    worksheets: [7, 8],
    chapters: { live: [3], perform: [3] },
    check: { kc: 3, options: ['Your commitment: try harder', 'The schedule or the session size', 'The goal: choose an easier one', 'Nothing: wait for a better month'], correct: 1, from: 'Knowledge check 3' },
    fields: [
      { key: 'obstacle', label: 'What happened, described without judgment', placeholder: 'Planned three sessions; two happened, both after my morning commitment', multiline: true, required: true },
      { key: 'adjustment', label: 'One likely explanation, an alternative, and the revision I will try', placeholder: 'Afternoons are unpredictable (or too tiring). Move one session to the morning.', multiline: true, required: true },
      { key: 'adjustDate', label: 'Date of the change', placeholder: 'Monday 9 November' },
    ],
    next: 'Use Worksheet 8 to compare the planned and actual week. Date the change so later records show which version of the plan you followed.',
  },
  {
    n: 8,
    short: 'Interpretation',
    phase: 'Measure',
    minutes: 12,
    worksheets: [8],
    chapters: { live: [2, 3], perform: [2, 3] },
    check: { kc: 1, options: ['Cancel today’s plan because the score is low', 'Stop using the device for good', 'Check context, measurement quality, recent trends and symptoms before changing much', 'Train harder to raise the score'], correct: 2, from: 'Knowledge check 1' },
    fields: [
      { key: 'interpretContext', label: 'What changed and how comparable the observations are', placeholder: 'Quieter week, more regular meals, fewer late finishes', multiline: true, required: true },
      { key: 'interpretDecision', label: 'My decision', placeholder: '', kind: 'choice', options: DECISIONS, required: true },
      { key: 'interpretWhy', label: 'My tentative interpretation and reason', placeholder: 'This may reflect the quieter schedule; keep the foundations', multiline: true },
      { key: 'reviewDate', label: 'Next review date', placeholder: 'Sunday 15 November' },
    ],
    next: 'Record the observation, context, tentative interpretation and decision in Worksheet 8, with the next review date. Avoid changing several parts of the routine in response to short-term swings.',
    extra: { perform: 2, live: 1 },
  },
  {
    n: 9,
    short: 'Claims',
    phase: 'Review',
    minutes: 12,
    worksheets: [9],
    chapters: { live: [12, 13], perform: [10, 11] },
    check: {
      kc: 4,
      options: ['Nothing; a mechanism is enough', 'A strong testimonial', 'Relevant human outcomes, sound methods in a relevant population, repeatability, safety, and a match between the actual product and the claim', 'A higher price'],
      correct: 2,
      from: 'Knowledge check 4',
    },
    fields: [
      { key: 'claim', label: 'The exact claim, the outcome I care about, and the evidence gap', placeholder: 'Claims faster recovery; I care about feeling less exhausted in the morning; the evidence describes a mechanism only', multiline: true, required: true },
      { key: 'claimDecision', label: 'My decision, its reason, and any professional question', placeholder: 'Not relevant to my present goal; protect sleep first', multiline: true, required: true },
    ],
    next: 'Complete Worksheet 9 as an appraisal, not a treatment trial: no purchase, medicine, peptide or test is needed. Then finish the Week 3 homework: a dated adjustment and this appraisal.',
    extra: { live: 4, perform: 4 },
  },
  {
    n: 10,
    short: 'Learning',
    phase: 'Review',
    minutes: 10,
    worksheets: [2, 8],
    chapters: { live: [3, 14], perform: [3, 13] },
    check: {
      kc: 7,
      options: ['Weight never matters', 'Weight may be irrelevant to the goal or may worsen anxiety, restriction or compulsive monitoring; function and behavior can be more useful measures', 'Scales are never accurate', 'To hide a lack of progress'],
      correct: 1,
      from: 'Knowledge check 7',
    },
    fields: [
      { key: 'learned', label: 'What improved in the process and what remains uncertain', placeholder: 'Two reliable openings each week; stamina is still unclear', multiline: true, required: true },
      { key: 'changedDecision', label: 'One decision I changed because of my observations', placeholder: 'Moved the Wednesday session after it collided three times', multiline: true, required: true },
    ],
    next: 'Compare your baseline (Worksheet 2) with your weekly reviews (Worksheet 8). Missing information can be acknowledged directly; it need not be disguised to show progress.',
  },
  {
    n: 11,
    short: 'Next cycle',
    phase: 'Adjust',
    minutes: 14,
    worksheets: [10],
    chapters: { live: [14], perform: [13] },
    check: {
      kc: 8,
      options: ['It has more goals', 'It specifies actions, timing, a minimum alternative, measures, adjustment rules, support and review dates', 'It is longer and more detailed', 'It has been signed by a coach'],
      correct: 1,
      from: 'Knowledge check 8',
    },
    fields: [
      { key: 'outcome', label: 'My next-cycle priority (primary purpose)', placeholder: 'Keep two strength sessions most weeks and extend comfortable walking', required: true },
      { key: 'planDates', label: 'Plan dates', placeholder: '16 November to 15 December' },
      { key: 'ruleIf', label: 'Progression or reduction rule: if…', placeholder: 'sessions stay comfortable for two weeks', required: true },
      { key: 'ruleThen', label: 'Then I will…', placeholder: 'change one small element, such as walking time', required: true },
      { key: 'leaveOut', label: 'What I will deliberately leave out', placeholder: 'A new recovery device until the routine is tested' },
    ],
    next: 'Open the plan builder to save the dated 30-day plan, then complete Worksheet 10. A second reader should be able to understand the routine and its backup without a lengthy explanation.',
    extra: { live: 'plan', perform: 'plan' },
    planBuilder: true,
  },
  {
    n: 12,
    short: 'Continuation',
    phase: 'Maintain',
    minutes: 10,
    worksheets: [6, 10],
    chapters: { live: [14], perform: [13] },
    check: {
      question: 'After an unusually disruptive month, what should your restart do?',
      options: ['Repay every missed session', 'Restart every lesson and record from the beginning', 'Start from current circumstances with an appropriate first action and a new review date', 'Wait for a quieter month'],
      correct: 2,
      explanation:
        'The restart rule should use current circumstances as the starting point. It should not demand compensation for every missed session or entry. The right return may be a smaller action, a revised schedule, or professional guidance, depending on what interrupted the routine.',
      from: 'Topic 12, “Make continuation easy to restart”',
    },
    fields: [
      { key: 'restart', label: 'My restart rule and where I will keep the current plan', placeholder: 'After a break, one short session and my sleep window; plan lives in this app and a printed copy', multiline: true, required: true },
      { key: 'firstReview', label: 'The date and purpose of my first independent review', placeholder: 'Sunday 20 December: does the schedule still fit?', required: true },
      { key: 'supportPlan', label: 'Support arrangements', placeholder: 'Coach monthly; clinician for the open question' },
    ],
    next: 'Put your first review in the calendar (Plan > weekly review), keep an exported copy of your plan, and finish the Week 4 homework.',
  },
];

// ------------------------------------------------------------------ performer labs
const LAB_FIELDS: LessonField[][] = [
  [
    { key: 'labDemands', label: 'My demands map: vocal, physical, cognitive and emotional, including speaking and social voice use', placeholder: 'Teaching 4 hours Tue/Thu, rehearsal 3 hours Wed–Sat, choir Sunday', multiline: true, required: true },
    { key: 'labNextDate', label: 'The next important date', placeholder: 'Audition, opening, recording or run' },
    { key: 'labOrdinary', label: 'What feels ordinary for me and what has changed (effort, comfort, reliability, recovery)', placeholder: 'Comfortable on teaching days; more effort after two rehearsals in a row', multiline: true },
    { key: 'labQuestion', label: 'A question for my teacher or clinician, if needed', placeholder: '', multiline: true },
  ],
  [
    { key: 'labCalendar', label: 'Performance-week calendar: rehearsals, performances, teaching, travel, and the most demanding days', placeholder: 'Thu–Sun shows; Sat two-show day; Mon off', multiline: true, required: true },
    { key: 'labAssignment', label: 'Practice assignment agreed with my coach: cue, intended response, stopping point, transfer to repertoire or a scene', placeholder: '', multiline: true },
    { key: 'labReduce', label: 'What I will reduce during tech week or a multi-show weekend', placeholder: 'Optional conditioning and extra practice', multiline: true, required: true },
    { key: 'labBackup', label: 'Low-equipment backup for travel', placeholder: '' },
  ],
  [
    { key: 'labTask', label: 'The task (from a recording already made during appropriate practice, or a written observation)', placeholder: 'Bridge of the second song, from Tuesday’s session', required: true },
    { key: 'labIssue', label: 'The observed issue and its context (dynamics, text, movement, fatigue)', placeholder: '', multiline: true, required: true },
    { key: 'labCue', label: 'The cue agreed with my coach', placeholder: '' },
    { key: 'labResult', label: 'What happened when it was tested', placeholder: '', multiline: true },
  ],
  [
    { key: 'labSequence', label: 'The sequence from waking through recovery: meals, travel, call time, equipment, warmup, quiet time, performance, wind-down', placeholder: '', multiline: true, required: true },
    { key: 'labEssential', label: 'Essential actions vs optional comforts', placeholder: 'Essential: familiar warmup, arrive on time. Optional: a particular gadget.', multiline: true },
    { key: 'labContact', label: 'Contact and response plan if illness or injury changes what is safe', placeholder: 'Stage manager, then my clinician', required: true },
    { key: 'labAfter', label: 'Afterwards: one success, one specific issue, one question for the next coaching session', placeholder: '', multiline: true },
  ],
];

const LAB_MODE: LessonField = {
  key: 'labMode',
  label: 'How I am taking part',
  placeholder: '',
  kind: 'choice',
  required: true,
  options: [
    { key: 'observation', label: 'Observation only (written notes)' },
    { key: 'private recording', label: 'With a private recording I keep' },
  ],
};

/** Saved output for each module, from the module and download map in "Course - Digital Module Plan.md". */
const PLAN_OUTPUT = [
  'A meaningful outcome, one action, and a constraint.',
  'A small dashboard, its methods, and an observation period.',
  'A support route and a clear question.',
  'Purposeful sessions placed in a realistic calendar.',
  'An ordinary-day food and fluid pattern and a practical backup.',
  'Protected recovery and a disrupted-week alternative.',
  'A comparison of intention with actual events, and one adjustment.',
  'Context, uncertainty, a decision, and a review date.',
  'An appraisal of one claim, without a purchase or treatment trial.',
  'A comparison of baseline and current observations, with their limits.',
  'A dated 30-day plan and decision rules.',
  'Scheduled reviews, a restart rule, and support arrangements.',
];

// ------------------------------------------------------------------ builders
const chapterRefs = (book: BookContent, nums: number[]) =>
  nums.map((n) => book.chapters.find((c) => c.number === n)).filter(Boolean).map((c) => ref(`Part One, Chapter ${c!.number}: ${c!.title}`, c!.src));

function extraExample(book: BookContent, which: number | 'plan' | undefined) {
  if (which === 'plan' && book.planExample) {
    return { title: book.planExample.title.replace(/^Completed plan example — /, 'Completed plan example: '), body: [...book.planExample.intro, ...book.planExample.parts.map((p) => `${p.label}: ${p.text}`)].join('\n\n') };
  }
  const c = typeof which === 'number' ? book.cases.find((x) => x.number === which) : undefined;
  return c ? { title: `Case ${c.number}: ${c.title}`, body: c.body.join('\n\n') } : undefined;
}

export function buildModule(course: Course, spec: ModuleSpec): Lesson {
  const book = BOOKS[course];
  const t = book.topics.find((x) => x.number === spec.n);
  if (!t) throw new Error(`Topic ${spec.n} missing from ${book.generatedFrom}; run node scripts/extract-course.js`);
  const week = book.weeks.find((w) => w.number === t.week)!;
  const ck = 'options' in spec.check ? (spec.check as Check) : (spec.check as Record<Course, Check>)[course];
  const kc = ck.kc ? book.knowledgeCheck.find((k) => k.number === ck.kc) : undefined;
  const reflection: LessonField[] = t.prompts
    .filter((p) => !/^Discussion notes/.test(p.label))
    .map((p, i) => ({ key: `t${spec.n}r${i + 1}`, label: p.label, placeholder: '', multiline: true, reflection: true }));
  const sheetRefs = spec.worksheets.map((n) => book.worksheets.find((w) => w.number === n)).filter(Boolean).map((w) => ref(`Worksheet ${w!.number}: ${w!.title}`, w!.src));
  const endOfWeek = spec.n % 3 === 0;
  return {
    id: `${course}-m${spec.n}`,
    number: spec.n,
    track: course,
    kind: 'module',
    course,
    week: t.week,
    phase: `Week ${t.week} · ${spec.phase}`,
    title: spec.short,
    minutes: spec.minutes,
    purpose: `${t.title}. ${t.reading[0] ?? ''}`.trim(),
    output: PLAN_OUTPUT[spec.n - 1],
    worksheet: sheetRefs.map((r) => r.label).join('; '),
    worksheets: spec.worksheets,
    sections: [{ heading: t.title, body: t.reading.join('\n\n') }, ...t.subsections.map((s) => ({ heading: s.heading, body: s.body.join('\n\n') }))],
    example: { title: 'Worked example (fictional)', body: (t.example?.body ?? []).join('\n\n') },
    discuss: t.example?.discuss,
    extraExample: extraExample(book, spec.extra?.[course]),
    check: {
      question: ck.question ?? kc?.question ?? '',
      options: ck.options,
      correct: ck.correct,
      explanation: ck.explanation ?? kc?.answer ?? '',
      from: ck.from,
    },
    apply: { intro: t.application, fields: [...spec.fields, ...reflection] },
    next: spec.next,
    faith: endOfWeek && week.faith ? { ref: week.faith.ref, body: week.faith.body } : undefined,
    planBuilder: spec.planBuilder,
    bookRefs: [
      ref(`Part Two, Week ${t.week}, Topic ${t.number}: ${t.title}`, t.src),
      ...(t.example ? [ref('Worked example and discussion', t.example.src)] : []),
      ...(kc ? [ref(`Knowledge check ${kc.number}`, kc.src)] : []),
      ...sheetRefs,
      ...chapterRefs(book, spec.chapters[course]),
    ],
    sources: [`${book.title}, Full Course Book (${book.generatedFrom}): Part Two, Week ${t.week}, Topic ${t.number}`],
  };
}

export function buildLab(n: number): Lesson {
  const book = BOOKS.perform;
  const lab = book.labs.find((x) => x.number === n);
  if (!lab) throw new Error(`Performer practice lab ${n} missing; run node scripts/extract-course.js`);
  return {
    id: `perform-lab${n}`,
    number: n,
    track: 'perform',
    kind: 'lab',
    course: 'perform',
    week: lab.week,
    phase: `Week ${lab.week} · Practice lab`,
    title: lab.title,
    minutes: 15,
    purpose: `Performer practice lab ${n}: ${lab.title.charAt(0).toLowerCase()}${lab.title.slice(1)}.`,
    output: lab.submission || 'A short written note for your coach.',
    worksheet: 'Practice lab note',
    sections: [{ heading: lab.title, body: lab.reading.join('\n\n') }],
    example: { title: '', body: '' },
    authorNote: lab.authorNote.length ? lab.authorNote : undefined,
    faith: lab.faith ? { ref: lab.faith.ref, body: lab.faith.body } : undefined,
    apply: {
      intro: 'Observation only is always a complete answer. No public performance is required.',
      note: 'Coressence does not record, upload or share audio or video. Any recording stays wherever you made it, private to you; nothing in a lab is public.',
      fields: [LAB_MODE, ...LAB_FIELDS[n - 1]],
    },
    next: n < 4 ? `Go on to Week ${lab.week + 1}.` : 'Bring this note to your coach, then finish the Week 4 homework.',
    bookRefs: [ref(`Part Two, Week ${lab.week}: Performer practice lab: ${lab.title}`, lab.src)],
    sources: [`${book.title}, Full Course Book (${book.generatedFrom}): Part Two, Week ${lab.week}, Performer practice lab`],
  };
}

export const COURSE_MODULES: Record<Course, Lesson[]> = {
  live: SPECS.map((s) => buildModule('live', s)),
  perform: SPECS.map((s) => buildModule('perform', s)),
};
export const PERFORM_LABS: Lesson[] = [1, 2, 3, 4].map(buildLab);

/** Modules in order, with each performer lab after its week's three modules. */
export function courseSequence(course: Course): Lesson[] {
  const out: Lesson[] = [];
  for (const m of COURSE_MODULES[course]) {
    out.push(m);
    if (course === 'perform' && m.number % 3 === 0) out.push(PERFORM_LABS[m.number / 3 - 1]);
  }
  return out;
}

// ------------------------------------------------------------------ worksheets and homework
export type WorksheetDef = { key: string; course: Course; number: number; title: string; week: number | null; fields: { key: string; label: string }[]; notes: string[]; src: BookRef };

/** Worksheet 3's book page is a table drawn by hand; give each day its own box. */
const DAY_FIELDS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((d) => `${d}: fixed obligations, travel, meals, sleep window, activity, one realistic opening`);

export function worksheets(course: Course): WorksheetDef[] {
  const book = BOOKS[course];
  return [...book.worksheets]
    .sort((a, b) => a.number - b.number)
    .map((w) => {
      const labels = w.number === 3 ? [...DAY_FIELDS, ...w.fields] : w.fields;
      return { key: `${course}-ws${w.number}`, course, number: w.number, title: w.title, week: w.week, fields: labels.map((label, i) => ({ key: `f${i + 1}`, label })), notes: w.notes, src: ref(`Worksheet ${w.number}: ${w.title}`, w.src) };
    });
}
export const worksheetDef = (key: string) => {
  const m = /^(live|perform)-ws(\d+)$/.exec(key);
  return m ? worksheets(m[1] as Course).find((w) => w.number === Number(m[2])) : undefined;
};

/** What each week's homework asks for, from the module plan and the book's weekly homework. */
const HOMEWORK_OUTPUT = [
  'A baseline brief: purpose, selected observations, constraints, and a support question if needed.',
  'Your first scheduled plan, a minimum alternative, and a decision rule.',
  'A dated adjustment justified by your observations, and a product-claim appraisal.',
  'A revised 30-day plan, a comparison with your baseline, and a review calendar.',
];
const HOMEWORK_SHEETS = [[1, 2], [4, 5, 6], [8, 9], [10]];

export type HomeworkDef = { key: string; course: Course; week: number; title: string; output: string; instructions: string[]; modules: string[]; worksheets: number[]; needsPlan: boolean; fields: { key: string; label: string }[]; faith?: { ref: string; body: string[] }; src?: BookRef };

export function homework(course: Course): HomeworkDef[] {
  const book = BOOKS[course];
  return book.weeks.map((w) => {
    const mods = COURSE_MODULES[course].filter((m) => m.week === w.number).map((m) => m.id);
    if (course === 'perform') mods.push(`perform-lab${w.number}`);
    return {
      key: `${course}-hw${w.number}`,
      course,
      week: w.number,
      title: `Week ${w.number}: ${w.title}`,
      output: HOMEWORK_OUTPUT[w.number - 1],
      instructions: w.homework,
      modules: mods,
      worksheets: HOMEWORK_SHEETS[w.number - 1],
      needsPlan: w.number === 2 || w.number === 4,
      fields: w.review.map((label, i) => ({ key: `r${i + 1}`, label })),
      faith: w.faith ? { ref: w.faith.ref, body: w.faith.body } : undefined,
      src: w.homeworkSrc ? ref(`Week ${w.number}: Weekly homework and discussion`, w.homeworkSrc) : undefined,
    };
  });
}
export const homeworkDef = (key: string) => {
  const m = /^(live|perform)-hw(\d)$/.exec(key);
  return m ? homework(m[1] as Course).find((h) => h.week === Number(m[2])) : undefined;
};
