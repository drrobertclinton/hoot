// Seed lessons for Live at Your Peak and Perform at Your Peak (Coressence Life Series).
// Each lesson follows the course module pattern: purpose and output, a short reading, a worked example with
// fictional people, one knowledge check, a guided application saved as a decision, and the next action.
// General education only. Nothing here diagnoses or treats a condition.
import type { LessonTrack } from '@core/billing/entitlements';

export type LessonField = {
  key: string;
  label: string;
  placeholder: string;
  multiline?: boolean;
  /** text (default), chips (pick several, saved comma-separated) or choice (pick one). */
  kind?: 'text' | 'chips' | 'choice';
  options?: { key: string; label: string }[];
  /** Must be answered before the decision can be saved. */
  required?: boolean;
  /** Optional reflection prompt taken from the book's "Make Topic N your own" page. */
  reflection?: boolean;
};
export type BookRef = { label: string; file: string; heading: string; line: number };
export type Lesson = {
  id: string;
  number: number;
  track: LessonTrack;
  phase: string;
  title: string;
  minutes: number;
  purpose: string;
  output: string;
  worksheet: string;
  sections: { heading: string; body: string }[];
  example: { title: string; body: string };
  /** Labs have no knowledge check. */
  check?: { question: string; options: string[]; correct: number; explanation: string; from?: string };
  apply: { intro: string; fields: LessonField[]; note?: string };
  next: string;
  sources: string[];
  // ---- course modules and performer labs (src/modules/education/course) ----
  kind?: 'lesson' | 'module' | 'lab';
  /** Which course this belongs to (modules and labs). */
  course?: 'live' | 'perform';
  week?: number;
  /** Worksheet numbers this module fills. */
  worksheets?: number[];
  /** Book headings the text was drawn from, and further reading. */
  bookRefs?: BookRef[];
  /** A second, track-specific example from Part Three of the book. */
  extraExample?: { title: string; body: string };
  discuss?: string;
  /** Faith & Reflection text, shown only when Settings > Faith content is on. */
  faith?: { ref: string; body: string[] };
  /** The author's personal note, shown as a quote. */
  authorNote?: string[];
  /** Show the plan builder button after saving. */
  planBuilder?: boolean;
};

export const LESSONS: Lesson[] = [
  {
    id: 'l1',
    number: 1,
    track: 'core',
    phase: 'Assess',
    title: 'The peak cycle',
    minutes: 8,
    purpose: 'Learn the seven-step cycle the whole course uses, so every change you make has a reason and a review date.',
    output: 'Your starting point in one sentence.',
    worksheet: 'Worksheet 1: Purpose and goal',
    sections: [
      {
        heading: 'Why a cycle, not a program',
        body: 'Most health plans fail for ordinary reasons: a busy week, a cold, a show that runs late. A fixed program has no answer for that. A cycle does. You assess where you are, plan a small change, carry it out, measure what happens, review it honestly, adjust one thing, and maintain what works. Then you go around again. Each turn teaches you something about your own body and schedule.',
      },
      {
        heading: 'The seven steps',
        body: 'Assess: notice your current sleep, movement, food, stress and energy without judging them. Plan: choose one outcome, one action and the constraint you are working around. Execute: do it in a normal week, not an ideal one. Measure: keep a few simple observations. Review: compare what you meant to do with what happened. Adjust: change one thing and write down why. Maintain: keep what works with a lighter touch, and restart the cycle when life changes.',
      },
      {
        heading: 'Start smaller than you think',
        body: 'The first cycle is about learning how the process works for you. A change you can keep on your worst week is worth more than a perfect plan you drop after five days. Progress in this course is measured by useful decisions you complete, not by streaks or scores.',
      },
    ],
    example: {
      title: 'Example: Maya, a teacher and parent',
      body: 'Maya (a fictional example) feels tired by mid-afternoon. Instead of starting a new diet and a gym plan at once, she spends a week noticing: she sleeps about six hours on school nights and skips lunch twice a week. Her first plan is one action: eat a packed lunch on school days. Her review date is the following Sunday.',
    },
    check: {
      question: 'What comes right after "Review" in the cycle?',
      options: ['Execute', 'Adjust', 'Maintain', 'Assess'],
      correct: 1,
      explanation: 'After reviewing what happened, you adjust one thing and set a new review date. Changing one thing at a time makes it clear what made the difference.',
    },
    apply: {
      intro: 'Write where you are starting from. Keep it short and honest.',
      fields: [{ key: 'start', label: 'My starting point', placeholder: 'For example: I sleep about 6 hours on weeknights and rarely move on workdays.', multiline: true }],
    },
    next: 'Spend the next three days doing a 20-second check-in each morning in Track.',
    sources: ['Coressence Life Series course framework'],
  },
  {
    id: 'l2',
    number: 2,
    track: 'core',
    phase: 'Assess and Plan',
    title: 'Purpose and baseline',
    minutes: 10,
    purpose: 'Choose one meaningful outcome and a small dashboard of observations to watch for one to two weeks.',
    output: 'One outcome, one action, one constraint, and the measures you will watch.',
    worksheet: 'Worksheets 1 and 2: Purpose and goal; Baseline and support',
    sections: [
      {
        heading: 'An outcome you care about',
        body: 'A useful outcome is something you would notice in your life: more energy for your kids in the evening, a steadier voice in the second act, walking the hills on vacation without stopping. Write why it matters to you. That reason is what you come back to on a hard week.',
      },
      {
        heading: 'One action and one constraint',
        body: 'Pick one action you control, sized for an ordinary week. Then name the constraint honestly: late rehearsals, a long commute, caregiving, travel, pain, budget. A plan that ignores the constraint will break on it.',
      },
      {
        heading: 'A small dashboard',
        body: 'Choose two or three observations, not ten. Good choices are simple and repeatable: hours of sleep, a 1–5 energy rating, minutes of movement, glasses of water. Watch them for seven to fourteen days before changing much. That is your baseline, and it is what makes later comparisons meaningful. You do not need a wearable device for this course; a daily check-in works.',
      },
      {
        heading: 'When to ask for support',
        body: 'If you have a medical condition, new symptoms, or you take medicines that affect blood sugar, blood pressure or heart rate, ask your clinician before changing exercise, fasting or diet patterns. Write the question down so you remember to ask it.',
      },
    ],
    example: {
      title: 'Example: Daniel, an actor in a summer season',
      body: 'Daniel (fictional) wants enough energy for two-show days. Action: a 15-minute walk before his call time. Constraint: rehearsals change daily. Dashboard: sleep hours, energy rating and voice hoarseness for 14 days. Support question for his clinician: whether his asthma inhaler timing should change on days he walks before shows.',
    },
    check: {
      question: 'Why watch a baseline for one to two weeks before changing your plan?',
      options: ['To prove you have enough discipline', 'Because one or two days are too noisy to compare against', 'Because devices need time to calibrate', 'It is not necessary'],
      correct: 1,
      explanation: 'Single days swing with stress, sleep, weather and schedule. A week or two of observations gives you a fair comparison point for later.',
    },
    apply: {
      intro: 'These answers fill in the first page of your plan in Plan.',
      fields: [
        { key: 'outcome', label: 'The outcome I want', placeholder: 'More energy in the evenings', multiline: false },
        { key: 'why', label: 'Why it matters to me', placeholder: 'So I can enjoy time with my family after work', multiline: true },
        { key: 'action', label: 'My one action', placeholder: 'A 20-minute walk at lunch on workdays' },
        { key: 'constraint', label: 'My main constraint', placeholder: 'Meetings run over and I lose my lunch hour' },
      ],
    },
    next: 'Open Plan and build your first plan from these answers.',
    sources: ['Coressence Life Series course framework'],
  },
  {
    id: 'l3',
    number: 3,
    track: 'core',
    phase: 'Plan',
    title: 'Sleep as the foundation',
    minutes: 10,
    purpose: 'Understand the few sleep habits with the strongest support, and choose one to work on.',
    output: 'A steady wake time and one sleep change.',
    worksheet: 'Worksheet 4: Ordinary-week plan',
    sections: [
      {
        heading: 'How much',
        body: 'The American Academy of Sleep Medicine and the Sleep Research Society recommend that adults regularly sleep seven or more hours a night. Needs vary between people, and teenagers need more. Regularly sleeping less is linked with poorer mood, focus, immune function and metabolic health.',
      },
      {
        heading: 'Anchor the morning',
        body: 'A consistent wake time, even on weekends within about an hour, steadies your body clock more than an early bedtime does. Bright light soon after waking, ideally outdoors, reinforces it. In the evening, dimmer light and a wind-down routine help sleepiness arrive on time.',
      },
      {
        heading: 'Caffeine, alcohol and the bedroom',
        body: 'Caffeine stays in the body for hours, and a study found that a dose taken six hours before bed still shortened sleep. Alcohol can make it easier to fall asleep but tends to break up sleep later in the night. A cool, dark, quiet room helps. If you are awake in bed for what feels like more than about 20 minutes, getting up to do something calm in dim light, then returning when sleepy, is a standard technique.',
      },
      {
        heading: 'When to get help',
        body: 'Long-lasting trouble falling or staying asleep deserves attention; cognitive behavioral therapy for insomnia (CBT-I) is the first recommended treatment for chronic insomnia. Loud snoring with pauses or gasping, or strong daytime sleepiness, are reasons to talk with a clinician about a sleep evaluation.',
      },
    ],
    example: {
      title: 'Example: Priya, a nurse coming off night shifts',
      body: 'Priya (fictional) cannot keep the same schedule every week, so she sets an anchor for her days off: up by 8:00, ten minutes outside with coffee, and caffeine finished by 1 p.m. On shift weeks she uses blackout curtains and a fixed sleep window after work.',
    },
    check: {
      question: 'Which change usually does the most to steady your body clock?',
      options: ['Sleeping in on weekends to catch up', 'A consistent wake time with morning light', 'A nightcap to fall asleep faster', 'Going to bed whenever you finish your work'],
      correct: 1,
      explanation: 'A regular wake time plus morning light gives the body clock a strong daily signal. Long weekend lie-ins tend to shift it later.',
    },
    apply: {
      intro: 'Choose your anchor and one change for the next two weeks.',
      fields: [
        { key: 'wake', label: 'My wake time', placeholder: '6:45 AM' },
        { key: 'sleepChange', label: 'One sleep change', placeholder: 'Caffeine finished by 1 p.m.' },
      ],
    },
    next: 'Turn on the bedtime reminder in Settings and log your sleep in the Sleep module each morning.',
    sources: ['Watson NF et al. Recommended amount of sleep for a healthy adult. Sleep. 2015', 'Drake C et al. Caffeine effects on sleep taken 0, 3, or 6 hours before going to bed. J Clin Sleep Med. 2013', 'Qaseem A et al. Management of chronic insomnia disorder in adults. Ann Intern Med. 2016'],
  },
  {
    id: 'l4',
    number: 4,
    track: 'core',
    phase: 'Plan and Execute',
    title: 'Movement that fits your week',
    minutes: 10,
    purpose: 'Use the national activity guidelines as a target and place purposeful sessions into a realistic calendar.',
    output: 'Movement sessions placed on specific days, including two for strength.',
    worksheet: 'Worksheets 3 and 4: Schedule audit; Ordinary-week plan',
    sections: [
      {
        heading: 'The weekly targets',
        body: 'The Physical Activity Guidelines for Americans recommend 150 to 300 minutes a week of moderate activity (or 75 to 150 minutes of vigorous activity), plus muscle-strengthening activity for all major muscle groups on two or more days a week. Older adults are also advised to include balance training. Any amount is better than none, and benefits start well below the target.',
      },
      {
        heading: 'How hard is moderate?',
        body: 'A simple guide is the talk test. During moderate activity you can talk but not sing. During vigorous activity you can only say a few words before pausing for breath.',
      },
      {
        heading: 'Pilates, yoga, stretching and strength',
        body: 'Pilates and many yoga styles build control, mobility and some strength, and they can count toward strength days when they challenge your muscles. Stretching improves range of motion and feels good but does not replace strength work. Strength sessions do not need a gym: bodyweight exercises, bands or household weights work when the last few repetitions feel challenging.',
      },
      {
        heading: 'Plan it like an appointment',
        body: 'Look at your real week first. Where are the open 20-minute windows? Put sessions there and give each a time. Short sessions count. If you are new to exercise, have a heart condition, or have symptoms like chest pain or fainting with exertion, check with your clinician before increasing intensity.',
      },
    ],
    example: {
      title: 'Example: Marcus, a commuter',
      body: 'Marcus (fictional) has a 50-minute commute. His audit finds three open windows: Tuesday and Thursday mornings and Saturday. He schedules 25-minute strength sessions on Tuesday and Thursday, a long walk on Saturday, and 10-minute walks after lunch on workdays. That adds up to about 150 minutes.',
    },
    check: {
      question: 'Which week meets both parts of the adult guideline?',
      options: ['Three 20-minute walks', '150 minutes of brisk walking and two strength sessions', 'Daily stretching only', 'One long hike on Sunday'],
      correct: 1,
      explanation: 'The guideline has two parts: at least 150 minutes of moderate activity across the week and muscle strengthening on two or more days.',
    },
    apply: {
      intro: 'Choose your strength days and your weekly minutes target.',
      fields: [
        { key: 'strengthDays', label: 'My two strength days', placeholder: 'Tuesday and Thursday mornings' },
        { key: 'weeklyMinutes', label: 'My weekly minutes for now', placeholder: '90 minutes, building toward 150' },
      ],
    },
    next: 'Add these sessions to your ordinary week in Plan, then try a guided routine in Move.',
    sources: ['U.S. Department of Health and Human Services. Physical Activity Guidelines for Americans, 2nd edition. 2018'],
  },
  {
    id: 'l5',
    number: 5,
    track: 'core',
    phase: 'Plan',
    title: 'Food and fluids for an ordinary day',
    minutes: 11,
    purpose: 'Build a simple eating pattern for a normal day and a practical backup for a busy one.',
    output: 'An ordinary-day food pattern, a backup option and a fluid habit.',
    worksheet: 'Worksheet 5: Food and hydration plan',
    sections: [
      {
        heading: 'Patterns over perfection',
        body: 'The Dietary Guidelines for Americans emphasize a pattern built mostly from vegetables, fruits, whole grains, beans, nuts, lean proteins and dairy or fortified alternatives, with less added sugar, sodium and saturated fat. This app logs meals by pattern rather than calories: did the meal include protein, vegetables or fruit, and whole grains or beans?',
      },
      {
        heading: 'Protein across the day',
        body: 'Adults need a baseline amount of protein each day (the recommended dietary allowance is 0.8 grams per kilogram of body weight), and active people and older adults often benefit from more. A practical approach is to include a protein source at each meal rather than saving most of it for dinner. People with kidney disease should follow their clinician’s guidance on protein.',
      },
      {
        heading: 'Fluids',
        body: 'The National Academies set adequate total water intake, from all drinks and food, at about 3.7 liters a day for men and 2.7 liters for women, with roughly 80 percent usually coming from drinks. Needs rise with heat and exercise. Pale yellow urine is a rough everyday sign of adequate hydration. Some people, such as those with heart or kidney conditions, are told to limit fluids; follow that advice.',
      },
      {
        heading: 'Eating windows',
        body: 'Time-restricted eating means eating within a set window, such as 8 a.m. to 6 p.m. Studies show mixed results; in several trials it worked about as well as other ways of reducing calories, not better. It is not appropriate for everyone, including people who are pregnant, under 18, have a history of eating disorders, or take medicines that lower blood sugar, without medical advice. The Fuel module can track a window if you choose to use one; it is optional.',
      },
    ],
    example: {
      title: 'Example: Elena, who travels for work',
      body: 'Elena (fictional) plans a normal day as eggs and fruit, a grain bowl at lunch, and a simple dinner with vegetables. Her backup for airport days is Greek yogurt, a banana and a bag of nuts, plus a refillable water bottle she fills after security.',
    },
    check: {
      question: 'What is a sensible way to use the fluid figures from the National Academies?',
      options: ['Drink exactly 3.7 liters of water every day no matter what', 'Use them as a rough guide that includes food and all drinks, adjusted for heat and activity', 'Ignore fluids unless you feel thirsty after exercise', 'Only count plain water'],
      correct: 1,
      explanation: 'The figures cover total water from food and drinks for an average healthy adult. Your needs change with heat, activity and health conditions.',
    },
    apply: {
      intro: 'Write a normal day and a backup you can actually get.',
      fields: [
        { key: 'ordinaryDay', label: 'My ordinary-day pattern', placeholder: 'Eggs and fruit; grain bowl; fish, rice and vegetables', multiline: true },
        { key: 'backup', label: 'My busy-day backup', placeholder: 'Yogurt, banana and nuts' },
        { key: 'fluids', label: 'My fluid habit', placeholder: 'A glass of water with every meal and a bottle at my desk' },
      ],
    },
    next: 'Set your daily water goal in Fuel and turn on water reminders if they help.',
    sources: ['U.S. Departments of Agriculture and Health and Human Services. Dietary Guidelines for Americans, 2020–2025', 'National Academies. Dietary Reference Intakes for Water, Potassium, Sodium, Chloride, and Sulfate. 2005', 'Liu D et al. Calorie restriction with or without time-restricted eating in weight loss. N Engl J Med. 2022'],
  },
  {
    id: 'l6',
    number: 6,
    track: 'core',
    phase: 'Review and Adjust',
    title: 'Recovery, reviews and decision rules',
    minutes: 12,
    purpose: 'Protect recovery, read your own data without overreacting, and decide in advance what you will do on a hard week.',
    output: 'A minimum plan, a decision rule and a review date.',
    worksheet: 'Worksheets 6 and 8: Minimum plan; Weekly review',
    sections: [
      {
        heading: 'Recovery is where adaptation happens',
        body: 'Training is the signal; recovery is when the body adapts to it. Sleep, food, easy days and stress all affect recovery. Signs that recovery is falling behind include tiredness that does not lift, worse sleep, a resting heart rate that stays above your usual level, and performance that drops for no clear reason.',
      },
      {
        heading: 'The minimum plan',
        body: 'Write the smallest version of your plan that still counts on a disrupted week: illness in the house, tech week, travel. For example, two 10-minute strength sessions and your wake time. Keeping the minimum keeps the habit alive and makes restarting easy.',
      },
      {
        heading: 'Reading your numbers',
        body: 'Look at weekly averages instead of single days. Write down the context (travel, illness, a late show) and how sure you are. Change one thing at a time so you can tell what helped. Wearable estimates for sleep stages and calories can be off; trends from the same device are more useful than single readings.',
      },
      {
        heading: 'Decision rules and claims',
        body: 'A decision rule turns review into action: "If my energy averages below 3 for a week, I will move my workout earlier and keep my bedtime." When a product or treatment promises a quick fix, ask what evidence supports it, who benefits from the sale, what it costs and what the risks are. You can often test the underlying habit without buying anything.',
      },
    ],
    example: {
      title: 'Example: Sam, during a heavy work month',
      body: 'Sam (fictional) notices his resting heart rate has been about 6 beats above his usual for a week, his sleep is short and his runs feel hard. His decision rule says to switch to the minimum plan: two short strength sessions, walks instead of runs, and a fixed bedtime until his numbers settle. He sets his next review for Sunday.',
    },
    check: {
      question: 'Your energy rating was low on Tuesday only. What does the course suggest?',
      options: ['Rewrite the whole plan', 'Note the context and look at the weekly average at your review', 'Buy a recovery supplement', 'Stop logging until you feel better'],
      correct: 1,
      explanation: 'One day is noise. Record the context and judge the trend at your review, then change one thing if the pattern holds.',
    },
    apply: {
      intro: 'These answers become the minimum plan and decision rule in Plan.',
      fields: [
        { key: 'minimum', label: 'My minimum plan', placeholder: 'Two 10-minute strength sessions and my wake time', multiline: true },
        { key: 'ruleIf', label: 'If…', placeholder: 'my energy averages below 3 for a week' },
        { key: 'ruleThen', label: 'Then I will…', placeholder: 'switch to my minimum plan and keep my bedtime' },
      ],
    },
    next: 'Do your first weekly review in Coach at the end of this week.',
    sources: ['Coressence Life Series course framework', 'Meeusen R et al. Prevention, diagnosis and treatment of the overtraining syndrome. Eur J Sport Sci. 2013'],
  },
  {
    id: 'l7',
    number: 7,
    track: 'perform',
    phase: 'Plan and Execute',
    title: 'Voice load and the performance week',
    minutes: 12,
    purpose: 'Plan your voice and energy across rehearsals and performances, and know the signs that need a professional.',
    output: 'Voice rest windows, a warmup habit and a show-day routine.',
    worksheet: 'Perform at Your Peak practice lab',
    sections: [
      {
        heading: 'Total voice load',
        body: 'Your voice does not distinguish between singing in rehearsal, talking over a noisy bar after the show and a long phone call. All of it adds up. Logging your daily hours of voice use alongside how your voice feels helps you see when the load is outrunning recovery.',
      },
      {
        heading: 'Everyday voice care',
        body: 'Stay well hydrated, since the vocal folds work best when the body is hydrated. Breathing humidified air helps in dry rooms. Warm up before heavy use and cool down afterward. Semi-occluded exercises such as lip trills and straw phonation let the voice work with less effort. Build short silent breaks into long days, and avoid shouting over noise.',
      },
      {
        heading: 'Planning the week',
        body: 'Put the heaviest vocal and physical work early in the week and protect sleep before performances. Many performers eat a familiar meal two to three hours before a show and keep a small snack for intermission. Slow breathing with a longer exhale can take the edge off pre-show adrenaline.',
      },
      {
        heading: 'When to see a professional',
        body: 'Hoarseness that lasts more than a few weeks should be checked by a clinician; when your voice is your job, it is reasonable to go sooner, ideally to an ENT or a laryngologist. Seek care promptly for pain, trouble swallowing or breathing, coughing up blood, or a sudden change in your voice after a strain. A voice teacher or speech-language pathologist can help with technique.',
      },
    ],
    example: {
      title: 'Example: Jordan, an ensemble singer in tech week',
      body: 'Jordan (fictional) logs 6 to 7 hours of voice use a day during tech, with hoarseness rising to 2 out of 5. He keeps his warmup, adds a 10-minute cool-down after rehearsal, texts instead of calling on his drive home, and schedules a silent morning on the day after the first preview.',
    },
    check: {
      question: 'Which counts toward total voice load?',
      options: ['Only singing', 'Only performances', 'Singing, speaking and talking over noise all add up', 'Only voice use above a certain volume'],
      correct: 2,
      explanation: 'All voice use adds to the load, including conversations, calls and talking in noisy places after the show.',
    },
    apply: {
      intro: 'Plan how you will protect your voice this run.',
      fields: [
        { key: 'restWindows', label: 'My voice rest windows', placeholder: 'Silent mornings after two-show days; text instead of calls on the drive home', multiline: true },
        { key: 'showDay', label: 'My show-day routine', placeholder: 'Meal 3 hours before, warmup at half hour, cool-down after' },
      ],
    },
    next: 'Log your voice each day in Rehearse and use the vocal warmup before rehearsals.',
    sources: ['Stachler RJ et al. Clinical Practice Guideline: Hoarseness (Dysphonia) (Update). Otolaryngol Head Neck Surg. 2018', 'Titze IR. Voice training and therapy with a semi-occluded vocal tract. J Speech Lang Hear Res. 2006'],
  },
  {
    id: 'l8',
    number: 8,
    track: 'live',
    phase: 'Plan and Maintain',
    title: 'Strength, balance and everyday energy',
    minutes: 11,
    purpose: 'Build the strength and balance that keep everyday life easy as the years go by, and protect your daily energy.',
    output: 'A balance practice time and one everyday strength habit.',
    worksheet: 'Live at Your Peak practice lab',
    sections: [
      {
        heading: 'Strength is for everyone',
        body: 'Muscle mass and strength tend to decline with age, and strength training slows that decline at any age. Getting up from a chair without your hands, carrying groceries, and climbing stairs are the real tests. Two strength sessions a week, matched to your current ability, make a difference.',
      },
      {
        heading: 'Balance can be trained',
        body: 'The U.S. Preventive Services Task Force and the CDC point to exercise that includes strength and balance as one of the most effective ways to lower fall risk in older adults. Practice next to a counter: single-leg stands, heel-to-toe walking, sit-to-stands. Tai chi is another well-studied option.',
      },
      {
        heading: 'Everyday energy',
        body: 'Long sitting stretches leave many people feeling flat. Short movement breaks, daylight in the morning, regular meals and steady sleep often help more than any product. If tiredness is new, severe or comes with other symptoms such as weight loss, shortness of breath or low mood, talk with your clinician.',
      },
      {
        heading: 'Match the plan to your access',
        body: 'Not everyone has a gym, a safe place to walk, or pain-free joints. The plan should fit your situation: chair-based strength, water exercise, or a physical therapist’s program all count. If you have had a fall, feel unsteady, or have a condition affecting balance, ask a clinician or physical therapist which exercises suit you.',
      },
    ],
    example: {
      title: 'Example: Ruth, recently retired',
      body: 'Ruth (fictional) wants to keep up with her grandchildren. She practices the Everyday balance routine at the kitchen counter after breakfast four days a week, does sit-to-stands during TV ad breaks, and walks with a friend on Saturdays.',
    },
    check: {
      question: 'Which approach has good evidence for lowering fall risk in older adults?',
      options: ['Stretching alone', 'Exercise that includes strength and balance training', 'Avoiding stairs', 'Resting more'],
      correct: 1,
      explanation: 'Exercise programs that include strength and balance work, such as tai chi or guided home programs, have been shown to reduce falls.',
    },
    apply: {
      intro: 'Choose when you will practice and one everyday strength habit.',
      fields: [
        { key: 'balanceTime', label: 'When I will practice balance', placeholder: 'After breakfast, Monday to Thursday' },
        { key: 'strengthHabit', label: 'My everyday strength habit', placeholder: 'Ten sit-to-stands while the kettle boils' },
      ],
    },
    next: 'Add the Everyday balance routine to your ordinary week in Plan.',
    sources: ['U.S. Preventive Services Task Force. Interventions to Prevent Falls in Community-Dwelling Older Adults. 2024', 'Sherrington C et al. Exercise for preventing falls in older people living in the community. Cochrane Database Syst Rev. 2019'],
  },
];

/** Seed lessons for the person's track (core lessons are in both). */
export function seedLessonsForTrack(track: 'live' | 'perform' | 'both') {
  return LESSONS.filter((l) => l.track === 'core' || track === 'both' || l.track === track);
}
