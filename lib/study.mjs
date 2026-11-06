// Server side of the study app: builds the prompts, calls Claude with the
// server's API key, and returns parsed study material. The browser never sees
// the key and can only ask for the two jobs below, never send its own prompt.
import Anthropic from "@anthropic-ai/sdk";

const MODEL = process.env.STUDY_MODEL || "claude-opus-5-5";
export const MAX_IMAGES = 3;          // photos per request (keeps uploads under host body limits)
const MAX_TEXT = 20000;               // characters of document text per request
export const MAX_IMAGE_B64 = 2_000_000;      // ~1.5 MB per photo after the browser shrinks it
export const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

let client;
const claude = () => (client ||= new Anthropic()); // reads ANTHROPIC_API_KEY

export class StudyError extends Error {
  constructor(code, status, message) { super(message || code); this.code = code; this.status = status; }
}

export const clip = (s, n) => String(s ?? "").slice(0, n);
const testName = name => (name ? ` ("${clip(name, 80).replace(/["\n]/g, "")}")` : "");

const JSON_SHAPE = `{"title":"short name for the test","subject":"Science","summary":"one or two encouraging sentences for the student about what this covers","notes":"plain-text study notes: every fact, term, definition, formula, date and example in this part, as short lines","cards":[{"front":"question or term","back":"short answer"}],"quiz":[{"q":"question","choices":["correct answer","wrong","wrong","wrong"],"answer":0,"why":"one sentence explaining the right answer"}]}`;

function batchPrompt({ part, total, name, imageCount, text }) {
  const units = imageCount || Math.max(1, Math.round(text.length / 2500));
  const cards = Math.min(25, Math.max(6, units * 5)), quiz = Math.min(12, Math.max(4, units * 3));
  const what = imageCount
    ? `The ${imageCount} attached photo(s) are pages of the student's review sheets or study guide. Read every page carefully, including handwriting, diagrams, tables, vocabulary, and worked examples.`
    : `Here is text from the student's study guide:\n---\n${text}\n---`;
  return `You are a friendly tutor helping a kid study for a school test${testName(name)}.
This is part ${part} of ${total} of the study material.
${what}

Make study materials for exactly what is in this part, at the student's grade level (judge it from the material):
- About ${cards} flashcards covering EVERY topic in this part. Front: a clear question or vocab term. Back: a short, correct answer a kid can remember (one or two sentences).
- About ${quiz} multiple-choice practice test questions written the way a teacher would put them on the real test: mix vocabulary, understanding, and apply-it questions. For math, include practice problems like the ones shown but with different numbers. Exactly 4 choices each; wrong choices should be believable. Put the correct answer first (index 0); the app shuffles them.
- Use only facts from the material, or basic facts needed to understand it. Never invent a fact that might be wrong.
- If a page is blurry or unreadable, skip it. If none of it is school material, reply {"error":"why"} instead.

Reply with ONLY one JSON object, no other text, shaped like:
${JSON_SHAPE}`;
}

function morePrompt({ name, notes, missed, existing }) {
  return `You are a friendly tutor helping a kid study for a school test${testName(name)}.
Here are the student's study notes from the review pages:
---
${notes}
---
${missed.length ? `The student just missed these questions, so include a few new questions on the same ideas (worded differently):\n${missed.join("\n")}\n` : ""}
Write 12 NEW multiple-choice practice questions in the style of a real teacher's test, different from these existing ones:
${existing.map(q => "- " + q).join("\n")}
Use only facts from the notes. Exactly 4 believable choices each. Put the correct answer first (index 0); the app shuffles them.
Reply with ONLY a JSON array, no other text, like: [{"q":"question","choices":["correct","wrong","wrong","wrong"],"answer":0,"why":"one sentence"}]`;
}

// Read one JSON value from the reply: the whole reply, a fenced block, or the
// span from the first { or [ to the last } or ].
export function parseJson(text) {
  const tries = [text, (text.match(/```(?:json)?\s*([\s\S]*?)```/) || [])[1]];
  const a = text.search(/[[{]/), b = Math.max(text.lastIndexOf("}"), text.lastIndexOf("]"));
  if (a >= 0 && b > a) tries.push(text.slice(a, b + 1));
  for (const t of tries) { if (!t) continue; try { return JSON.parse(t); } catch {} }
  throw new StudyError("invalid_json", 502, "Claude's answer could not be read");
}

// One call to Claude with the server's key. Returns the reply's text.
export async function callClaude(content, { system, maxTokens = 16000, messages } = {}) {
  let res;
  try {
    res = await claude().beta.messages.create({
      model: MODEL,
      max_tokens: maxTokens,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      ...(system ? { system } : {}),
      messages: messages || [{ role: "user", content }],
    });
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) throw new StudyError("rate_limited", 429);
    if (e instanceof Anthropic.AuthenticationError) throw new StudyError("server_misconfigured", 500, "API key missing or invalid");
    if (e instanceof Anthropic.BadRequestError) throw new StudyError("bad_request", 400, e.message);
    if (e instanceof Anthropic.APIConnectionError || e instanceof Anthropic.APIError) throw new StudyError("upstream_error", 502, "Claude said: " + (e.status || "") + " " + String(e.message).slice(0, 150));
    throw e;
  }
  if (res.stop_reason === "refusal") throw new StudyError("refused", 422);
  const text = res.content.filter(b => b.type === "text").map(b => b.text).join("");
  if (!text.trim()) throw new StudyError("empty_completion", 502);
  return text;
}

const ask = async content => parseJson(await callClaude(content));

// job: {kind:"batch", part, total, name, images:[{type, data}], text}
//    | {kind:"more", name, notes, missed:[...], existing:[...]}
export async function runJob(job) {
  if (!job || typeof job !== "object") throw new StudyError("bad_request", 400);
  if (job.kind === "batch") {
    const images = Array.isArray(job.images) ? job.images : [];
    const text = clip(job.text, MAX_TEXT);
    if (!images.length && !text.trim()) throw new StudyError("bad_request", 400, "nothing to read");
    if (images.length > MAX_IMAGES) throw new StudyError("bad_request", 400, `at most ${MAX_IMAGES} photos per part`);
    for (const im of images) {
      if (!im || !IMAGE_TYPES.has(im.type) || typeof im.data !== "string" || im.data.length > MAX_IMAGE_B64)
        throw new StudyError("image_rejected", 400);
    }
    const prompt = batchPrompt({
      part: Math.max(1, +job.part || 1), total: Math.max(1, +job.total || 1),
      name: job.name, imageCount: images.length, text: images.length ? "" : text,
    });
    const content = [
      ...images.map(im => ({ type: "image", source: { type: "base64", media_type: im.type, data: im.data } })),
      { type: "text", text: prompt },
    ];
    return ask(content);
  }
  if (job.kind === "more") {
    const notes = clip(job.notes, 40000);
    if (!notes.trim()) throw new StudyError("bad_request", 400, "no notes");
    const list = (v, n) => (Array.isArray(v) ? v : []).slice(0, n).map(s => clip(s, 300));
    return ask([{ type: "text", text: morePrompt({ name: job.name, notes, missed: list(job.missed, 20), existing: list(job.existing, 40) }) }]);
  }
  throw new StudyError("bad_request", 400, "unknown job");
}

// Small per-visitor limiter so a leaked link can't run up the bill.
// In-memory, so it resets when the server restarts; enough for a first launch.
const hits = new Map();
export function allow(ip, perHour = Number(process.env.STUDY_REQUESTS_PER_HOUR) || 120) {
  const now = Date.now(), list = (hits.get(ip) || []).filter(t => now - t < 3600_000);
  if (list.length >= perHour) { hits.set(ip, list); return false; }
  list.push(now); hits.set(ip, list);
  return true;
}
