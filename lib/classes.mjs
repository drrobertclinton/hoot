// Teacher classes. A teacher makes a class and gets a short class code (for
// kids) and a secret teacher key (to add or remove study guides). Only finished
// study sets are stored, never the uploaded pages, and no student information.
import { createHash, randomBytes } from "node:crypto";
import * as store from "./store.mjs";
import { StudyError } from "./study.mjs";

const CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no 0/O, 1/I/L
const MAX_SETS = 60;
const MAX_SET_BYTES = 300_000;

const hash = s => createHash("sha256").update(String(s)).digest("hex");
const clip = (s, n) => String(s ?? "").slice(0, n);
const cleanCode = c => clip(c, 12).toUpperCase().replace(/[^A-Z0-9]/g, "");

function newCode() {
  const b = randomBytes(6);
  return [...b].map(x => CODE_CHARS[x % CODE_CHARS.length]).join("");
}

async function load(code) {
  const meta = await store.get("class:" + cleanCode(code));
  if (!meta) throw new StudyError("class_not_found", 404);
  return meta;
}
function checkKey(meta, key) {
  if (!key || hash(key) !== meta.keyHash) throw new StudyError("not_teacher", 403);
}

// Keep only the fields the app uses, with sane sizes.
function cleanSet(s) {
  if (!s || typeof s !== "object") throw new StudyError("bad_request", 400);
  const cards = (Array.isArray(s.cards) ? s.cards : []).slice(0, 300)
    .filter(c => c && c.front && c.back).map(c => ({ front: clip(c.front, 600), back: clip(c.back, 1200) }));
  const quiz = (Array.isArray(s.quiz) ? s.quiz : []).slice(0, 200)
    .filter(q => q && q.q && Array.isArray(q.choices) && q.choices.length >= 2 && q.choices[+q.answer] != null)
    .map(q => ({ q: clip(q.q, 600), choices: q.choices.slice(0, 6).map(c => clip(c, 300)), answer: +q.answer, why: clip(q.why, 600) }));
  if (!cards.length && !quiz.length) throw new StudyError("bad_request", 400, "empty set");
  const out = {
    id: "t" + randomBytes(5).toString("hex"), name: clip(s.name, 80) || "Study guide",
    subject: clip(s.subject, 40), summary: clip(s.summary, 400), notes: clip(s.notes, 40000),
    created: Date.now(), cards, quiz,
  };
  if (JSON.stringify(out).length > MAX_SET_BYTES) throw new StudyError("too_large", 413);
  return out;
}

const publicView = async (code, meta) => ({
  code, name: meta.name, teacher: meta.teacher,
  sets: (await store.getMany(meta.setIds.map(id => `set:${code}:${id}`))).filter(Boolean),
});

export async function getClass(code) {
  code = cleanCode(code);
  return publicView(code, await load(code));
}

export async function classAction(body) {
  const action = body && body.action;
  if (action === "create") {
    const name = clip(body.name, 60).trim();
    if (!name) throw new StudyError("bad_request", 400, "class name needed");
    const key = randomBytes(18).toString("base64url");
    const meta = { name, teacher: clip(body.teacher, 60).trim(), keyHash: hash(key), setIds: [], created: Date.now() };
    for (let i = 0; i < 5; i++) {
      const code = newCode();
      if (await store.create("class:" + code, meta)) return { code, key, name: meta.name, teacher: meta.teacher, sets: [] };
    }
    throw new StudyError("upstream_error", 500);
  }
  const code = cleanCode(body && body.code);
  const meta = await load(code);
  checkKey(meta, body.key);
  if (action === "manage") return publicView(code, meta);
  if (action === "addSet") {
    if (meta.setIds.length >= MAX_SETS) throw new StudyError("class_full", 409);
    const set = cleanSet(body.set);
    await store.set(`set:${code}:${set.id}`, set);
    meta.setIds.unshift(set.id);
    await store.set("class:" + code, meta);
    return { set };
  }
  if (action === "removeSet") {
    const id = clip(body.setId, 40);
    meta.setIds = meta.setIds.filter(x => x !== id);
    await store.set("class:" + code, meta);
    await store.del(`set:${code}:${id}`);
    return { ok: true };
  }
  throw new StudyError("bad_request", 400, "unknown action");
}
