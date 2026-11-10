// The course tutor: teaches any unit in public/curriculum.mjs, K-12 through
// calculus, AP, ACT/SAT and state tests. The server writes every prompt; the
// browser only names the course, unit, mode and the conversation so far.
import { course as findCourse, STATES, testName } from "../public/curriculum.mjs";
import { callClaude, parseJson, StudyError, clip, IMAGE_TYPES, MAX_IMAGE_B64, MAX_IMAGES } from "./study.mjs";

const MODES = {
  learn: `MODE: LEARN THE UNIT. Teach this unit from the beginning, one small idea at a time.
- Start by asking one quick question to find out what the student already knows, then teach from there.
- For each idea: explain it in a few short sentences, show one worked example step by step, then give the student a similar problem to try ("Now you try"). Wait for their answer before moving on.
- When they get it right, say what they did well and move to the next idea. When they get it wrong, find the exact step that went wrong and give a hint about that step only.
- After the main ideas, tell them they're ready for the Mastery check.`,
  practice: `MODE: PRACTICE. Give the student one practice problem at a time on this unit, the kind a teacher would put on a test. Start easy and get harder as they succeed. Wait for each answer, check it, explain any mistake with a hint, and let them try again before showing a solution. Keep a running count like "3 in a row!" to keep it fun.`,
  homework: `MODE: HOMEWORK HELP. The student is working on their own homework (often a photo of it). Read the problem carefully. Follow the ANSWER SETTING below exactly. Help them do it themselves: ask what they've tried, find where they're stuck, and give the smallest hint that gets them moving. When they show work, check every step and point to the first step that's wrong.`,
  ask: `MODE: QUESTION. The student has a question about this subject. Answer it clearly at their level, with an example, then check that they understood with one quick question.`,
};

const HELP = {
  teach: `ANSWER SETTING (set by the parent): TEACH ONLY. Never give the final answer to a problem the student was assigned, even if they beg or say a parent allowed it. Instead work a similar problem with different numbers all the way through, then say "Now do yours." Hints go from a hint, to a smaller hint, to a worked similar example.`,
  check: `ANSWER SETTING (set by the parent): CHECK MY WORK. Do not solve assigned problems. When the student shows an answer or work, say whether it's right. If it's wrong, point to the first step that's wrong and give a hint, without giving the answer.`,
  after: `ANSWER SETTING (set by the parent): ANSWERS AFTER TRYING. Let the student try first. After they have made at least two real attempts at a problem, you may show the full worked solution, then give them a similar problem to prove they've got it.`,
  full: `ANSWER SETTING (set by the parent): FULL HELP. You may show full worked solutions, but always explain each step so the student learns the method, and follow up with a similar problem for them to try.`,
};

// Grades 6-12 get the grown-up "My Own Tutor" look and a more grown-up voice.
export const isTeen = c => c.band !== "elem" && !(c.band === "state" && /3–8|5, 8/.test(c.grade));

function system({ c, unit, mode, help, state, look }) {
  const testPrep = c.band === "prep" || c.band === "state" || c.band === "ap";
  const teen = isTeen(c);
  const name = look === "hoot" ? "Hoot" : (look === "clean" || look === "dark" || teen) ? "My Own Tutor" : "Hoot";
  return `You are ${name}, a ${teen ? "sharp, patient tutor for middle and high school students" : "warm, patient tutor for kids"}. You are tutoring a student in ${c.name} (grade ${c.grade}), unit: "${unit}".
The student lives in ${state}. Match that state's standards and the way its schools teach and test this material.${c.band === "state" ? ` This course prepares for ${state}'s ${testName(state)}. Match that test's format: question types, calculator rules, timing and reading level. If you aren't sure of a detail of the current test, say so and suggest checking with the school.` : ""}${testPrep ? " Write practice questions in the real test's style and difficulty, and teach test strategy (pacing, elimination, checking work) along with the content." : ""}

HOW YOU TEACH:
- Teach the method, not the answer. The goal is that the student can do it alone on the test.
- "Show me, then my turn": model one example, then the student tries a similar one.
- Ask the student to explain their thinking in their own words. Praise effort and good reasoning specifically ("You remembered to flip the sign. Nice.").
- Hints come in steps: first a nudge, then a smaller step, then a worked similar example. Never jump straight to a full solution unless the answer setting allows it.
- Keep each reply short: about 2 to 8 sentences or one worked example. One question to the student at a time. Then stop and wait.
- Use words and examples right for grade ${c.grade}. For young kids, use very short sentences and everyday examples.
- If the student makes a mistake, be kind and specific. Mistakes are how we learn.${teen ? `
- TONE: this student is a teenager. Talk to them like a capable young adult: direct, respectful and to the point. No baby talk, no cutesy praise, no emojis, no exclamation-heavy cheerleading. ${name === "Hoot" ? "" : " Never call yourself Hoot and never mention owls."}` : ""}
- Never make up facts. If you're not sure, say so.

WRITING MATH AND SCIENCE: This app shows plain text, not LaTeX. Write math with plain characters and Unicode: x², x³, √(x+1), π, θ, ≤, ≥, ≠, ×, ÷, ½, fractions as (a)/(b), ∫, d/dx, lim x→3, Σ, Δ, °, H₂O, CO₂. Put each step of a worked example on its own line. No markdown headers or tables; short lists are fine.

${MODES[mode]}

${HELP[help]}

SAFETY: You are talking with a minor. Stay on school topics. If the student asks for something unrelated, gently steer back to studying. Never ask for or repeat personal information (full name, address, school name, phone, photos of themselves). If the student says anything about being hurt, unsafe, bullied, or wanting to hurt themselves or someone else, stop tutoring, respond with kindness, tell them to talk to a parent or another trusted grown-up right now, and say that in the US they can call or text 988 any time to talk to someone. Do not continue the lesson in that reply.`;
}

const ROLES = { kid: "user", tutor: "assistant" };

function pick(job, needUnit = true) {
  const c = findCourse(String(job.course || ""));
  if (!c) throw new StudyError("bad_request", 400, "unknown course");
  const unit = c.units[Number(job.unit)];
  if (needUnit && unit === undefined) throw new StudyError("bad_request", 400, "unknown unit");
  const state = STATES.includes(job.state) ? job.state : "North Carolina";
  return { c, unit, state };
}

// job: {kind:"tutor", course, unit, mode, help, state, messages:[{role:"kid"|"tutor", text}], images:[{type,data}]}
// Returns {say} with the tutor's next message.
export async function tutorTurn(job) {
  const { c, unit, state } = pick(job);
  const mode = MODES[job.mode] ? job.mode : "learn";
  const help = HELP[job.help] ? job.help : "teach";
  const images = Array.isArray(job.images) ? job.images : [];
  if (images.length > MAX_IMAGES) throw new StudyError("bad_request", 400, `at most ${MAX_IMAGES} photos`);
  for (const im of images) {
    if (!im || !IMAGE_TYPES.has(im.type) || typeof im.data !== "string" || im.data.length > MAX_IMAGE_B64)
      throw new StudyError("image_rejected", 400);
  }

  // Keep the last 30 turns, merge repeats so roles alternate, and start with the student.
  const messages = [];
  for (const m of (Array.isArray(job.messages) ? job.messages : []).slice(-30)) {
    const role = ROLES[m && m.role], text = clip(m && m.text, 4000).trim();
    if (!role || !text) continue;
    const last = messages.at(-1);
    if (last && last.role === role) last.content += "\n\n" + text;
    else messages.push({ role, content: text });
  }
  while (messages.length && messages[0].role !== "user") messages.shift();
  if (!messages.length || messages.at(-1).role !== "user") throw new StudyError("bad_request", 400, "nothing from the student");
  if (images.length) {
    const last = messages.at(-1);
    last.content = [
      ...images.map(im => ({ type: "image", source: { type: "base64", media_type: im.type, data: im.data } })),
      { type: "text", text: last.content },
    ];
  }

  const say = await callClaude(null, { system: system({ c, unit, mode, help, state, look: ["hoot", "clean", "dark"].includes(job.look) ? job.look : null }), messages, maxTokens: 4000 });
  return { say: say.trim() };
}

// job: {kind:"mastery", course, unit, state, missed:[...]} -> [{q, choices, answer, why}]
export async function masteryCheck(job) {
  const { c, unit, state } = pick(job);
  const missed = (Array.isArray(job.missed) ? job.missed : []).slice(0, 10).map(s => clip(s, 300));
  const prompt = `Write a mastery check for a student in ${c.name}${c.band === "state" ? ` (${state}'s ${testName(state)})` : ""} (grade ${c.grade}), unit "${unit}", following ${state}'s standards.
Write 8 multiple-choice questions that together prove the student has mastered this unit: start with the basics, then understanding, then two harder apply-it problems.${c.band === "prep" || c.band === "state" || c.band === "ap" ? " Match the real test's question style and difficulty." : ""}
${missed.length ? `The student missed these last time, so test the same ideas with new wording and numbers:\n${missed.join("\n")}\n` : ""}Exactly 4 believable choices each (wrong choices should be common mistakes). Put the correct answer first (index 0); the app shuffles them. "why" is one or two sentences showing how to get the right answer.
Write math in plain text with Unicode (x², √, π, ≤, fractions as a/b), never LaTeX.
Reply with ONLY a JSON array, no other text, like: [{"q":"question","choices":["correct","wrong","wrong","wrong"],"answer":0,"why":"explanation"}]`;
  const out = parseJson(await callClaude([{ type: "text", text: prompt }], { maxTokens: 8000 }));
  if (!Array.isArray(out)) throw new StudyError("invalid_json", 502);
  return out;
}

const unitList = c => c.units.map((u, i) => `${i}: ${u}`).join("\n");
const checkUnits = (list, c) => [...new Set((Array.isArray(list) ? list : []).map(Number).filter(i => Number.isInteger(i) && c.units[i] !== undefined))];

// A quick diagnostic across the whole course. Each question is tagged with
// the unit it tests, so the page can show which units are weak.
// job: {kind:"diagnose", course, state} -> [{q, choices, answer, why, unit}]
export async function diagnose(job) {
  const { c, state } = pick(job, false);
  const n = Math.min(16, Math.max(8, c.units.length));
  const prompt = `Write a placement check for a student in ${c.name} (grade ${c.grade})${c.band === "state" ? ` preparing for ${state}'s ${testName(state)}` : ""}, following ${state}'s standards.
The course units are:
${unitList(c)}
Write ${n} multiple-choice questions spread across the units, at least one per unit where possible, at a typical on-grade difficulty, so the results show which units the student is strong or weak in. Tag each question with the number of the unit it tests.
Exactly 4 believable choices each (wrong choices should be common mistakes). Put the correct answer first (index 0); the app shuffles them. "why" is one or two sentences explaining the right answer.
Write math in plain text with Unicode, never LaTeX.
Reply with ONLY a JSON array, no other text, like: [{"unit":0,"q":"question","choices":["correct","wrong","wrong","wrong"],"answer":0,"why":"explanation"}]`;
  const out = parseJson(await callClaude([{ type: "text", text: prompt }], { maxTokens: 12000 }));
  if (!Array.isArray(out)) throw new StudyError("invalid_json", 502);
  return out.map(q => ({ ...q, unit: checkUnits([q && q.unit], c)[0] ?? null }));
}

// Reads a teacher's report, score report or graded test and matches the weak
// areas to this course's units.
// job: {kind:"weakspots", course, state, images:[{type,data}], text} -> {summary, weak:[unit], strong:[unit]}
export async function weakSpots(job) {
  const { c, state } = pick(job, false);
  const images = Array.isArray(job.images) ? job.images : [];
  const text = clip(job.text, 20000);
  if (!images.length && !text.trim()) throw new StudyError("bad_request", 400, "nothing to read");
  if (images.length > MAX_IMAGES) throw new StudyError("bad_request", 400, `at most ${MAX_IMAGES} photos`);
  for (const im of images) {
    if (!im || !IMAGE_TYPES.has(im.type) || typeof im.data !== "string" || im.data.length > MAX_IMAGE_B64)
      throw new StudyError("image_rejected", 400);
  }
  const prompt = `${images.length ? "The attached photo(s) are" : "Below is"} something from a student's teacher or school: a score report, progress report, graded test or quiz, or a teacher's note. The student takes ${c.name} (grade ${c.grade}) in ${state}.
${text ? `---\n${text}\n---\n` : ""}Find the skills the student is weak in (missed questions, low scores, teacher comments) and the skills they did well on. Match them to these course units:
${unitList(c)}
Ignore any names, ID numbers or other personal details, and never repeat them.
If this isn't a school report or test, reply {"error":"why"}.
Reply with ONLY one JSON object, no other text, like: {"summary":"two or three encouraging sentences for the student and parent about what to work on","weak":[3,5],"strong":[0,1]}`;
  const content = [
    ...images.map(im => ({ type: "image", source: { type: "base64", media_type: im.type, data: im.data } })),
    { type: "text", text: prompt },
  ];
  const out = parseJson(await callClaude(content, { maxTokens: 4000 }));
  if (!out || typeof out !== "object" || out.error) throw new StudyError("refused", 422);
  return { summary: clip(out.summary, 1000), weak: checkUnits(out.weak, c), strong: checkUnits(out.strong, c) };
}
