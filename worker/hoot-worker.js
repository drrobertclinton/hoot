globalThis.process ??= { env: {} };
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// node_modules/fast-sha256/sha256.js
var require_sha256 = __commonJS({
  "node_modules/fast-sha256/sha256.js"(exports, module) {
    (function(root, factory) {
      var exports2 = {};
      factory(exports2);
      var sha2562 = exports2["default"];
      for (var k in exports2) {
        sha2562[k] = exports2[k];
      }
      if (typeof module === "object" && typeof module.exports === "object") {
        module.exports = sha2562;
      } else if (typeof define === "function" && define.amd) {
        define(function() {
          return sha2562;
        });
      } else {
        root.sha256 = sha2562;
      }
    })(exports, function(exports2) {
      "use strict";
      exports2.__esModule = true;
      exports2.digestLength = 32;
      exports2.blockSize = 64;
      var K = new Uint32Array([
        1116352408,
        1899447441,
        3049323471,
        3921009573,
        961987163,
        1508970993,
        2453635748,
        2870763221,
        3624381080,
        310598401,
        607225278,
        1426881987,
        1925078388,
        2162078206,
        2614888103,
        3248222580,
        3835390401,
        4022224774,
        264347078,
        604807628,
        770255983,
        1249150122,
        1555081692,
        1996064986,
        2554220882,
        2821834349,
        2952996808,
        3210313671,
        3336571891,
        3584528711,
        113926993,
        338241895,
        666307205,
        773529912,
        1294757372,
        1396182291,
        1695183700,
        1986661051,
        2177026350,
        2456956037,
        2730485921,
        2820302411,
        3259730800,
        3345764771,
        3516065817,
        3600352804,
        4094571909,
        275423344,
        430227734,
        506948616,
        659060556,
        883997877,
        958139571,
        1322822218,
        1537002063,
        1747873779,
        1955562222,
        2024104815,
        2227730452,
        2361852424,
        2428436474,
        2756734187,
        3204031479,
        3329325298
      ]);
      function hashBlocks(w, v, p, pos, len) {
        var a, b, c2, d, e, f, g, h, u, i, j, t1, t2;
        while (len >= 64) {
          a = v[0];
          b = v[1];
          c2 = v[2];
          d = v[3];
          e = v[4];
          f = v[5];
          g = v[6];
          h = v[7];
          for (i = 0; i < 16; i++) {
            j = pos + i * 4;
            w[i] = (p[j] & 255) << 24 | (p[j + 1] & 255) << 16 | (p[j + 2] & 255) << 8 | p[j + 3] & 255;
          }
          for (i = 16; i < 64; i++) {
            u = w[i - 2];
            t1 = (u >>> 17 | u << 32 - 17) ^ (u >>> 19 | u << 32 - 19) ^ u >>> 10;
            u = w[i - 15];
            t2 = (u >>> 7 | u << 32 - 7) ^ (u >>> 18 | u << 32 - 18) ^ u >>> 3;
            w[i] = (t1 + w[i - 7] | 0) + (t2 + w[i - 16] | 0);
          }
          for (i = 0; i < 64; i++) {
            t1 = (((e >>> 6 | e << 32 - 6) ^ (e >>> 11 | e << 32 - 11) ^ (e >>> 25 | e << 32 - 25)) + (e & f ^ ~e & g) | 0) + (h + (K[i] + w[i] | 0) | 0) | 0;
            t2 = ((a >>> 2 | a << 32 - 2) ^ (a >>> 13 | a << 32 - 13) ^ (a >>> 22 | a << 32 - 22)) + (a & b ^ a & c2 ^ b & c2) | 0;
            h = g;
            g = f;
            f = e;
            e = d + t1 | 0;
            d = c2;
            c2 = b;
            b = a;
            a = t1 + t2 | 0;
          }
          v[0] += a;
          v[1] += b;
          v[2] += c2;
          v[3] += d;
          v[4] += e;
          v[5] += f;
          v[6] += g;
          v[7] += h;
          pos += 64;
          len -= 64;
        }
        return pos;
      }
      var Hash = (
        /** @class */
        function() {
          function Hash2() {
            this.digestLength = exports2.digestLength;
            this.blockSize = exports2.blockSize;
            this.state = new Int32Array(8);
            this.temp = new Int32Array(64);
            this.buffer = new Uint8Array(128);
            this.bufferLength = 0;
            this.bytesHashed = 0;
            this.finished = false;
            this.reset();
          }
          Hash2.prototype.reset = function() {
            this.state[0] = 1779033703;
            this.state[1] = 3144134277;
            this.state[2] = 1013904242;
            this.state[3] = 2773480762;
            this.state[4] = 1359893119;
            this.state[5] = 2600822924;
            this.state[6] = 528734635;
            this.state[7] = 1541459225;
            this.bufferLength = 0;
            this.bytesHashed = 0;
            this.finished = false;
            return this;
          };
          Hash2.prototype.clean = function() {
            for (var i = 0; i < this.buffer.length; i++) {
              this.buffer[i] = 0;
            }
            for (var i = 0; i < this.temp.length; i++) {
              this.temp[i] = 0;
            }
            this.reset();
          };
          Hash2.prototype.update = function(data, dataLength) {
            if (dataLength === void 0) {
              dataLength = data.length;
            }
            if (this.finished) {
              throw new Error("SHA256: can't update because hash was finished.");
            }
            var dataPos = 0;
            this.bytesHashed += dataLength;
            if (this.bufferLength > 0) {
              while (this.bufferLength < 64 && dataLength > 0) {
                this.buffer[this.bufferLength++] = data[dataPos++];
                dataLength--;
              }
              if (this.bufferLength === 64) {
                hashBlocks(this.temp, this.state, this.buffer, 0, 64);
                this.bufferLength = 0;
              }
            }
            if (dataLength >= 64) {
              dataPos = hashBlocks(this.temp, this.state, data, dataPos, dataLength);
              dataLength %= 64;
            }
            while (dataLength > 0) {
              this.buffer[this.bufferLength++] = data[dataPos++];
              dataLength--;
            }
            return this;
          };
          Hash2.prototype.finish = function(out) {
            if (!this.finished) {
              var bytesHashed = this.bytesHashed;
              var left = this.bufferLength;
              var bitLenHi = bytesHashed / 536870912 | 0;
              var bitLenLo = bytesHashed << 3;
              var padLength = bytesHashed % 64 < 56 ? 64 : 128;
              this.buffer[left] = 128;
              for (var i = left + 1; i < padLength - 8; i++) {
                this.buffer[i] = 0;
              }
              this.buffer[padLength - 8] = bitLenHi >>> 24 & 255;
              this.buffer[padLength - 7] = bitLenHi >>> 16 & 255;
              this.buffer[padLength - 6] = bitLenHi >>> 8 & 255;
              this.buffer[padLength - 5] = bitLenHi >>> 0 & 255;
              this.buffer[padLength - 4] = bitLenLo >>> 24 & 255;
              this.buffer[padLength - 3] = bitLenLo >>> 16 & 255;
              this.buffer[padLength - 2] = bitLenLo >>> 8 & 255;
              this.buffer[padLength - 1] = bitLenLo >>> 0 & 255;
              hashBlocks(this.temp, this.state, this.buffer, 0, padLength);
              this.finished = true;
            }
            for (var i = 0; i < 8; i++) {
              out[i * 4 + 0] = this.state[i] >>> 24 & 255;
              out[i * 4 + 1] = this.state[i] >>> 16 & 255;
              out[i * 4 + 2] = this.state[i] >>> 8 & 255;
              out[i * 4 + 3] = this.state[i] >>> 0 & 255;
            }
            return this;
          };
          Hash2.prototype.digest = function() {
            var out = new Uint8Array(this.digestLength);
            this.finish(out);
            return out;
          };
          Hash2.prototype._saveState = function(out) {
            for (var i = 0; i < this.state.length; i++) {
              out[i] = this.state[i];
            }
          };
          Hash2.prototype._restoreState = function(from, bytesHashed) {
            for (var i = 0; i < this.state.length; i++) {
              this.state[i] = from[i];
            }
            this.bytesHashed = bytesHashed;
            this.finished = false;
            this.bufferLength = 0;
          };
          return Hash2;
        }()
      );
      exports2.Hash = Hash;
      var HMAC = (
        /** @class */
        function() {
          function HMAC2(key) {
            this.inner = new Hash();
            this.outer = new Hash();
            this.blockSize = this.inner.blockSize;
            this.digestLength = this.inner.digestLength;
            var pad = new Uint8Array(this.blockSize);
            if (key.length > this.blockSize) {
              new Hash().update(key).finish(pad).clean();
            } else {
              for (var i = 0; i < key.length; i++) {
                pad[i] = key[i];
              }
            }
            for (var i = 0; i < pad.length; i++) {
              pad[i] ^= 54;
            }
            this.inner.update(pad);
            for (var i = 0; i < pad.length; i++) {
              pad[i] ^= 54 ^ 92;
            }
            this.outer.update(pad);
            this.istate = new Uint32Array(8);
            this.ostate = new Uint32Array(8);
            this.inner._saveState(this.istate);
            this.outer._saveState(this.ostate);
            for (var i = 0; i < pad.length; i++) {
              pad[i] = 0;
            }
          }
          HMAC2.prototype.reset = function() {
            this.inner._restoreState(this.istate, this.inner.blockSize);
            this.outer._restoreState(this.ostate, this.outer.blockSize);
            return this;
          };
          HMAC2.prototype.clean = function() {
            for (var i = 0; i < this.istate.length; i++) {
              this.ostate[i] = this.istate[i] = 0;
            }
            this.inner.clean();
            this.outer.clean();
          };
          HMAC2.prototype.update = function(data) {
            this.inner.update(data);
            return this;
          };
          HMAC2.prototype.finish = function(out) {
            if (this.outer.finished) {
              this.outer.finish(out);
            } else {
              this.inner.finish(out);
              this.outer.update(out, this.digestLength).finish(out);
            }
            return this;
          };
          HMAC2.prototype.digest = function() {
            var out = new Uint8Array(this.digestLength);
            this.finish(out);
            return out;
          };
          return HMAC2;
        }()
      );
      exports2.HMAC = HMAC;
      function hash2(data) {
        var h = new Hash().update(data);
        var digest = h.digest();
        h.clean();
        return digest;
      }
      exports2.hash = hash2;
      exports2["default"] = hash2;
      function hmac(key, data) {
        var h = new HMAC(key).update(data);
        var digest = h.digest();
        h.clean();
        return digest;
      }
      exports2.hmac = hmac;
      function fillBuffer(buffer, hmac2, info, counter) {
        var num = counter[0];
        if (num === 0) {
          throw new Error("hkdf: cannot expand more");
        }
        hmac2.reset();
        if (num > 1) {
          hmac2.update(buffer);
        }
        if (info) {
          hmac2.update(info);
        }
        hmac2.update(counter);
        hmac2.finish(buffer);
        counter[0]++;
      }
      var hkdfSalt = new Uint8Array(exports2.digestLength);
      function hkdf(key, salt, info, length) {
        if (salt === void 0) {
          salt = hkdfSalt;
        }
        if (length === void 0) {
          length = 32;
        }
        var counter = new Uint8Array([1]);
        var okm = hmac(salt, key);
        var hmac_ = new HMAC(okm);
        var buffer = new Uint8Array(hmac_.digestLength);
        var bufpos = buffer.length;
        var out = new Uint8Array(length);
        for (var i = 0; i < length; i++) {
          if (bufpos === buffer.length) {
            fillBuffer(buffer, hmac_, info, counter);
            bufpos = 0;
          }
          out[i] = buffer[bufpos++];
        }
        hmac_.clean();
        buffer.fill(0);
        counter.fill(0);
        return out;
      }
      exports2.hkdf = hkdf;
      function pbkdf2(password, salt, iterations, dkLen) {
        var prf = new HMAC(password);
        var len = prf.digestLength;
        var ctr = new Uint8Array(4);
        var t = new Uint8Array(len);
        var u = new Uint8Array(len);
        var dk = new Uint8Array(dkLen);
        for (var i = 0; i * len < dkLen; i++) {
          var c2 = i + 1;
          ctr[0] = c2 >>> 24 & 255;
          ctr[1] = c2 >>> 16 & 255;
          ctr[2] = c2 >>> 8 & 255;
          ctr[3] = c2 >>> 0 & 255;
          prf.reset();
          prf.update(salt);
          prf.update(ctr);
          prf.finish(u);
          for (var j = 0; j < len; j++) {
            t[j] = u[j];
          }
          for (var j = 2; j <= iterations; j++) {
            prf.reset();
            prf.update(u).finish(u);
            for (var k = 0; k < len; k++) {
              t[k] ^= u[k];
            }
          }
          for (var j = 0; j < len && i * len + j < dkLen; j++) {
            dk[i * len + j] = t[j];
          }
        }
        for (var i = 0; i < len; i++) {
          t[i] = u[i] = 0;
        }
        for (var i = 0; i < 4; i++) {
          ctr[i] = 0;
        }
        prf.clean();
        return dk;
      }
      exports2.pbkdf2 = pbkdf2;
    });
  }
});

// worker/sdk-shim.mjs
var APIError = class extends Error {
  constructor(status, msg) {
    super(msg);
    this.status = status;
  }
};
var APIConnectionError = class extends APIError {
};
var RateLimitError = class extends APIError {
};
var AuthenticationError = class extends APIError {
};
var BadRequestError = class extends APIError {
};
async function create(args) {
  const first = args.model, tries = [first, "claude-sonnet-5-5", "claude-haiku-5-5"].filter((m, i, a) => a.indexOf(m) === i);
  let last;
  for (const model of tries) {
    try {
      return await one({ ...args, model });
    } catch (e) {
      last = e;
      if (!(e.status === 404 || e.status === 400 && /model/i.test(e.message))) throw e;
    }
  }
  throw last;
}
async function one({ betas, fallbacks, ...body }) {
  const key = String(globalThis.process?.env?.ANTHROPIC_API_KEY || "").replace(/[^\x21-\x7e]/g, "");
  if (!key) throw new AuthenticationError(401, "missing key");
  let r;
  try {
    r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2026-10-21" },
      body: JSON.stringify(body)
    });
  } catch (e) {
    throw new APIConnectionError(0, String(e));
  }
  const j = await r.json().catch(() => ({}));
  if (r.ok) return j;
  const msg = j.error && j.error.message || "HTTP " + r.status;
  console.error("claude api", r.status, msg);
  if (r.status === 429 || r.status === 529) throw new RateLimitError(r.status, msg);
  if (r.status === 401 || r.status === 403) throw new AuthenticationError(r.status, msg);
  if (r.status === 400) throw new BadRequestError(r.status, msg);
  throw new APIError(r.status, msg);
}
var Anthropic = class {
  constructor() {
    this.messages = { create };
    this.beta = { messages: { create } };
  }
};
Object.assign(Anthropic, { APIError, APIConnectionError, RateLimitError, AuthenticationError, BadRequestError });

// lib/study.mjs
var MODEL = process.env.STUDY_MODEL || "claude-opus-5-5";
var MAX_IMAGES = 3;
var MAX_TEXT = 2e4;
var MAX_IMAGE_B64 = 2e6;
var IMAGE_TYPES = /* @__PURE__ */ new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
var client;
var claude = () => client ||= new Anthropic();
var StudyError = class extends Error {
  constructor(code, status, message) {
    super(message || code);
    this.code = code;
    this.status = status;
  }
};
var clip = (s, n) => String(s ?? "").slice(0, n);
var testName = (name) => name ? ` ("${clip(name, 80).replace(/["\n]/g, "")}")` : "";
var JSON_SHAPE = `{"title":"short name for the test","subject":"Science","summary":"one or two encouraging sentences for the student about what this covers","notes":"plain-text study notes: every fact, term, definition, formula, date and example in this part, as short lines","cards":[{"front":"question or term","back":"short answer"}],"quiz":[{"q":"question","choices":["correct answer","wrong","wrong","wrong"],"answer":0,"why":"one sentence explaining the right answer"}]}`;
function batchPrompt({ part, total, name, imageCount, text }) {
  const units = imageCount || Math.max(1, Math.round(text.length / 2500));
  const cards = Math.min(25, Math.max(6, units * 5)), quiz = Math.min(12, Math.max(4, units * 3));
  const what = imageCount ? `The ${imageCount} attached photo(s) are pages of the student's review sheets or study guide. Read every page carefully, including handwriting, diagrams, tables, vocabulary, and worked examples.` : `Here is text from the student's study guide:
---
${text}
---`;
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
${missed.length ? `The student just missed these questions, so include a few new questions on the same ideas (worded differently):
${missed.join("\n")}
` : ""}
Write 12 NEW multiple-choice practice questions in the style of a real teacher's test, different from these existing ones:
${existing.map((q) => "- " + q).join("\n")}
Use only facts from the notes. Exactly 4 believable choices each. Put the correct answer first (index 0); the app shuffles them.
Reply with ONLY a JSON array, no other text, like: [{"q":"question","choices":["correct","wrong","wrong","wrong"],"answer":0,"why":"one sentence"}]`;
}
function parseJson(text) {
  const tries = [text, (text.match(/```(?:json)?\s*([\s\S]*?)```/) || [])[1]];
  const a = text.search(/[[{]/), b = Math.max(text.lastIndexOf("}"), text.lastIndexOf("]"));
  if (a >= 0 && b > a) tries.push(text.slice(a, b + 1));
  for (const t of tries) {
    if (!t) continue;
    try {
      return JSON.parse(t);
    } catch {
    }
  }
  throw new StudyError("invalid_json", 502, "Claude's answer could not be read");
}
async function callClaude(content, { system: system2, maxTokens = 16e3, messages } = {}) {
  let res;
  try {
    res = await claude().beta.messages.create({
      model: MODEL,
      max_tokens: maxTokens,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      ...system2 ? { system: system2 } : {},
      messages: messages || [{ role: "user", content }]
    });
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) throw new StudyError("rate_limited", 429);
    if (e instanceof Anthropic.AuthenticationError) throw new StudyError("server_misconfigured", 500, "API key missing or invalid");
    if (e instanceof Anthropic.BadRequestError) throw new StudyError("bad_request", 400, e.message);
    if (e instanceof Anthropic.APIConnectionError || e instanceof Anthropic.APIError) throw new StudyError("upstream_error", 502, "Claude said: " + (e.status || "") + " " + String(e.message).slice(0, 150));
    throw e;
  }
  if (res.stop_reason === "refusal") throw new StudyError("refused", 422);
  const text = res.content.filter((b) => b.type === "text").map((b) => b.text).join("");
  if (!text.trim()) throw new StudyError("empty_completion", 502);
  return text;
}
var ask = async (content) => parseJson(await callClaude(content));
async function runJob(job) {
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
      part: Math.max(1, +job.part || 1),
      total: Math.max(1, +job.total || 1),
      name: job.name,
      imageCount: images.length,
      text: images.length ? "" : text
    });
    const content = [
      ...images.map((im) => ({ type: "image", source: { type: "base64", media_type: im.type, data: im.data } })),
      { type: "text", text: prompt }
    ];
    return ask(content);
  }
  if (job.kind === "more") {
    const notes = clip(job.notes, 4e4);
    if (!notes.trim()) throw new StudyError("bad_request", 400, "no notes");
    const list = (v, n) => (Array.isArray(v) ? v : []).slice(0, n).map((s) => clip(s, 300));
    return ask([{ type: "text", text: morePrompt({ name: job.name, notes, missed: list(job.missed, 20), existing: list(job.existing, 40) }) }]);
  }
  throw new StudyError("bad_request", 400, "unknown job");
}
var hits = /* @__PURE__ */ new Map();
function allow(ip, perHour = Number(process.env.STUDY_REQUESTS_PER_HOUR) || 120) {
  const now = Date.now(), list = (hits.get(ip) || []).filter((t) => now - t < 36e5);
  if (list.length >= perHour) {
    hits.set(ip, list);
    return false;
  }
  list.push(now);
  hits.set(ip, list);
  return true;
}

// worker/crypto-shim.mjs
var import_fast_sha256 = __toESM(require_sha256(), 1);
var hex = (b) => [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
function createHash() {
  let s = "";
  const h = { update(v) {
    s += v;
    return h;
  }, digest() {
    return hex((0, import_fast_sha256.hash)(new TextEncoder().encode(s)));
  } };
  return h;
}
function randomBytes(n) {
  const b = crypto.getRandomValues(new Uint8Array(n));
  b.toString = (enc) => enc === "hex" ? hex(b) : btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return b;
}

// lib/store.mjs
var URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
var TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
var mem = /* @__PURE__ */ new Map();
var persistent = Boolean(URL_ && TOKEN);
async function redis(command) {
  const r = await fetch(URL_, { method: "POST", headers: { authorization: `Bearer ${TOKEN}`, "content-type": "application/json" }, body: JSON.stringify(command) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) throw new Error("store: " + (j.error || r.status));
  return j.result;
}
var kv = () => globalThis.__HOOT_KV;
async function get(key) {
  if (kv()) {
    const v2 = await kv().get(key);
    return v2 == null ? null : JSON.parse(v2);
  }
  const v = persistent ? await redis(["GET", key]) : mem.get(key);
  return v == null ? null : JSON.parse(v);
}
async function getMany(keys) {
  if (!keys.length) return [];
  if (kv()) return Promise.all(keys.map(get));
  const vals = persistent ? await redis(["MGET", ...keys]) : keys.map((k) => mem.get(k));
  return vals.map((v) => v == null ? null : JSON.parse(v));
}
async function set(key, value) {
  const v = JSON.stringify(value);
  if (kv()) return kv().put(key, v);
  if (persistent) await redis(["SET", key, v]);
  else mem.set(key, v);
}
async function create2(key, value) {
  const v = JSON.stringify(value);
  if (kv()) {
    if (await kv().get(key) != null) return false;
    await kv().put(key, v);
    return true;
  }
  if (persistent) return await redis(["SET", key, v, "NX"]) === "OK";
  if (mem.has(key)) return false;
  mem.set(key, v);
  return true;
}
async function del(key) {
  if (kv()) return kv().delete(key);
  if (persistent) await redis(["DEL", key]);
  else mem.delete(key);
}

// lib/classes.mjs
var CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
var MAX_SETS = 60;
var MAX_SET_BYTES = 3e5;
var hash = (s) => createHash("sha256").update(String(s)).digest("hex");
var clip2 = (s, n) => String(s ?? "").slice(0, n);
var cleanCode = (c2) => clip2(c2, 12).toUpperCase().replace(/[^A-Z0-9]/g, "");
function newCode() {
  const b = randomBytes(6);
  return [...b].map((x) => CODE_CHARS[x % CODE_CHARS.length]).join("");
}
async function load(code) {
  const meta = await get("class:" + cleanCode(code));
  if (!meta) throw new StudyError("class_not_found", 404);
  return meta;
}
function checkKey(meta, key) {
  if (!key || hash(key) !== meta.keyHash) throw new StudyError("not_teacher", 403);
}
function cleanSet(s) {
  if (!s || typeof s !== "object") throw new StudyError("bad_request", 400);
  const cards = (Array.isArray(s.cards) ? s.cards : []).slice(0, 300).filter((c2) => c2 && c2.front && c2.back).map((c2) => ({ front: clip2(c2.front, 600), back: clip2(c2.back, 1200) }));
  const quiz = (Array.isArray(s.quiz) ? s.quiz : []).slice(0, 200).filter((q) => q && q.q && Array.isArray(q.choices) && q.choices.length >= 2 && q.choices[+q.answer] != null).map((q) => ({ q: clip2(q.q, 600), choices: q.choices.slice(0, 6).map((c2) => clip2(c2, 300)), answer: +q.answer, why: clip2(q.why, 600) }));
  if (!cards.length && !quiz.length) throw new StudyError("bad_request", 400, "empty set");
  const out = {
    id: "t" + randomBytes(5).toString("hex"),
    name: clip2(s.name, 80) || "Study guide",
    subject: clip2(s.subject, 40),
    summary: clip2(s.summary, 400),
    notes: clip2(s.notes, 4e4),
    created: Date.now(),
    cards,
    quiz
  };
  if (JSON.stringify(out).length > MAX_SET_BYTES) throw new StudyError("too_large", 413);
  return out;
}
var publicView = async (code, meta) => ({
  code,
  name: meta.name,
  teacher: meta.teacher,
  sets: (await getMany(meta.setIds.map((id) => `set:${code}:${id}`))).filter(Boolean)
});
async function getClass(code) {
  code = cleanCode(code);
  return publicView(code, await load(code));
}
async function classAction(body) {
  const action = body && body.action;
  if (action === "create") {
    const name = clip2(body.name, 60).trim();
    if (!name) throw new StudyError("bad_request", 400, "class name needed");
    const key = randomBytes(18).toString("base64url");
    const meta2 = { name, teacher: clip2(body.teacher, 60).trim(), keyHash: hash(key), setIds: [], created: Date.now() };
    for (let i = 0; i < 5; i++) {
      const code2 = newCode();
      if (await create2("class:" + code2, meta2)) return { code: code2, key, name: meta2.name, teacher: meta2.teacher, sets: [] };
    }
    throw new StudyError("upstream_error", 500);
  }
  const code = cleanCode(body && body.code);
  const meta = await load(code);
  checkKey(meta, body.key);
  if (action === "manage") return publicView(code, meta);
  if (action === "addSet") {
    if (meta.setIds.length >= MAX_SETS) throw new StudyError("class_full", 409);
    const set2 = cleanSet(body.set);
    await set(`set:${code}:${set2.id}`, set2);
    meta.setIds.unshift(set2.id);
    await set("class:" + code, meta);
    return { set: set2 };
  }
  if (action === "removeSet") {
    const id = clip2(body.setId, 40);
    meta.setIds = meta.setIds.filter((x) => x !== id);
    await set("class:" + code, meta);
    await del(`set:${code}:${id}`);
    return { ok: true };
  }
  throw new StudyError("bad_request", 400, "unknown action");
}

// public/curriculum.mjs
var c = (id, band, subject, name, grade, units) => ({ id, band, subject, name, grade, units });
var COURSES = [
  // ---------- Elementary ----------
  c("math-k", "elem", "Math", "Kindergarten Math", "K", ["Counting to 20", "Counting to 100 by ones and tens", "Comparing numbers", "Adding within 10", "Subtracting within 10", "Making 10", "Teen numbers: tens and ones", "Measuring and comparing", "Sorting and counting groups", "Flat and solid shapes"]),
  c("math-1", "elem", "Math", "1st Grade Math", "1", ["Adding within 20", "Subtracting within 20", "Word problems with adding and subtracting", "The equal sign", "Counting to 120", "Place value: tens and ones", "Adding and subtracting tens", "Measuring length", "Telling time to the half hour", "Picture graphs and tally charts", "Shapes and halves and fourths"]),
  c("math-2", "elem", "Math", "2nd Grade Math", "2", ["Fact fluency within 20", "Odd and even, arrays", "Place value to 1,000", "Adding and subtracting within 100", "Adding and subtracting within 1,000", "Two-step word problems", "Measuring in inches, feet, centimeters and meters", "Time to 5 minutes", "Money: coins and bills", "Bar graphs and line plots", "Shapes, halves, thirds and fourths"]),
  c("math-3", "elem", "Math", "3rd Grade Math", "3", ["What multiplication means", "Multiplication facts", "What division means", "Division facts", "Properties of multiplication", "Two-step word problems", "Rounding and place value", "Adding and subtracting to 1,000", "Fractions as numbers", "Fractions on a number line", "Equivalent and comparing fractions", "Area", "Perimeter", "Time, liquid volume and mass", "Graphs and line plots", "Quadrilaterals"]),
  c("math-4", "elem", "Math", "4th Grade Math", "4", ["Place value to one million", "Adding and subtracting multi-digit numbers", "Multiplying by 1-digit numbers", "Multiplying 2-digit by 2-digit", "Dividing with remainders", "Factors, multiples, prime and composite", "Patterns", "Equivalent fractions", "Comparing fractions", "Adding and subtracting fractions and mixed numbers", "Multiplying fractions by whole numbers", "Decimals: tenths and hundredths", "Measurement conversions", "Angles and protractors", "Lines, angles and symmetry"]),
  c("math-5", "elem", "Math", "5th Grade Math", "5", ["Place value and powers of ten", "Multiplying multi-digit whole numbers", "Dividing by 2-digit numbers", "Decimal place value and rounding", "Adding and subtracting decimals", "Multiplying and dividing decimals", "Adding and subtracting fractions with unlike denominators", "Multiplying fractions", "Dividing with unit fractions", "Order of operations and expressions", "Coordinate plane", "Volume", "Converting measurements", "Classifying shapes"]),
  c("ela-k2", "elem", "Reading and writing", "Reading and Writing K\u20132", "K\u20132", ["Letters and sounds", "Blending and sounding out words", "Sight words", "Short and long vowels", "Reading with expression", "Who, what, where, when, why", "Retelling a story", "Characters and setting", "Main topic of a nonfiction text", "Capital letters and punctuation", "Writing complete sentences", "Writing a short story"]),
  c("ela-35", "elem", "Reading and writing", "Reading and Writing 3\u20135", "3\u20135", ["Main idea and details", "Summarizing", "Theme", "Characters, setting and plot", "Point of view", "Text features and structure", "Compare and contrast", "Making inferences", "Context clues and vocabulary", "Prefixes, suffixes and roots", "Figurative language", "Grammar: nouns, verbs, adjectives, adverbs", "Opinion writing", "Informative writing", "Narrative writing"]),
  c("sci-k5", "elem", "Science", "Science K\u20135", "K\u20135", ["Plants and animals and what they need", "Life cycles", "Habitats and food chains", "Weather and seasons", "The water cycle", "Rocks, soil and landforms", "Earth, sun, moon and stars", "Matter: solids, liquids and gases", "Forces and motion", "Energy, light and sound", "Electricity and magnets", "Human body systems", "Ecosystems and adaptations", "Doing a science experiment"]),
  c("ss-k5", "elem", "Social studies", "Social Studies K\u20135", "K\u20135", ["Families and communities", "Rules, laws and good citizens", "Maps and globes", "Needs, wants, goods and services", "American symbols and holidays", "Native peoples of North America", "Explorers", "The thirteen colonies", "The American Revolution", "The Constitution and three branches", "Your state's history and regions", "US regions and geography", "Westward expansion", "The Civil War and Reconstruction", "Economics: saving and spending"]),
  // ---------- Middle school ----------
  c("math-6", "middle", "Math", "6th Grade Math", "6", ["Ratios and rates", "Unit rates and percents", "Dividing fractions", "Multi-digit decimals", "GCF and LCM", "Negative numbers and absolute value", "The coordinate plane, all four quadrants", "Expressions and exponents", "Writing and solving one-step equations", "Inequalities", "Area of triangles and polygons", "Surface area and volume", "Statistics: mean, median, range and spread", "Dot plots, histograms and box plots"]),
  c("math-7", "middle", "Math", "7th Grade Math", "7", ["Proportional relationships", "Percent problems: tax, tip, discount, interest", "Adding and subtracting integers", "Multiplying and dividing integers and rationals", "Equivalent expressions", "Two-step equations", "Two-step inequalities", "Scale drawings", "Angles and triangles", "Circles: area and circumference", "Area, surface area and volume", "Sampling and inference", "Probability"]),
  c("math-8", "middle", "Math", "8th Grade Math", "8", ["Rational and irrational numbers", "Exponent rules", "Scientific notation", "Square and cube roots", "Solving multi-step linear equations", "Slope and graphing lines", "Functions", "Linear models", "Systems of equations", "Transformations", "Congruence and similarity", "The Pythagorean theorem", "Volume of cylinders, cones and spheres", "Scatter plots and two-way tables"]),
  c("ela-68", "middle", "Reading and writing", "English 6\u20138", "6\u20138", ["Citing text evidence", "Central idea and summary", "Theme and how it develops", "Character and plot development", "Point of view and author's purpose", "Comparing texts", "Argument and claims", "Word meaning and connotation", "Figurative language and tone", "Poetry", "Grammar: clauses, phrases and sentence types", "Punctuation and usage", "Argument essays", "Informative essays", "Narrative writing", "Research and citing sources"]),
  c("sci-68", "middle", "Science", "Science 6\u20138", "6\u20138", ["Scientific method and lab safety", "Cells and cell parts", "Body systems", "Genetics and heredity", "Evolution and natural selection", "Ecosystems and energy flow", "Atoms, elements and the periodic table", "Chemical and physical changes", "Forces and Newton's laws", "Energy and heat", "Waves, light and sound", "Earth's layers and plate tectonics", "Rocks and minerals", "Weather and climate", "The solar system and the universe", "Human impact on the earth"]),
  c("ss-68", "middle", "Social studies", "Social Studies 6\u20138", "6\u20138", ["Early humans and river civilizations", "Ancient Greece and Rome", "World religions", "Medieval Europe, Africa and Asia", "Renaissance and Reformation", "Age of exploration", "Geography and world regions", "Colonial America", "Revolution and the Constitution", "The early republic", "Your state's history", "Civil War and Reconstruction", "Industrialization and immigration", "Government and citizenship", "Economics basics"]),
  // ---------- High school ----------
  c("alg1", "high", "Math", "Algebra 1", "9", ["Expressions and order of operations", "Solving linear equations", "Literal equations", "Linear inequalities and compound inequalities", "Functions and function notation", "Slope, intercepts and graphing lines", "Writing linear equations", "Systems of equations and inequalities", "Exponent rules", "Exponential growth and decay", "Polynomials: adding, subtracting, multiplying", "Factoring", "Quadratic functions and graphs", "Solving quadratics: factoring, square roots, formula", "Radicals", "Statistics and scatter plots"]),
  c("geo", "high", "Math", "Geometry", "10", ["Points, lines, planes and angles", "Logic and proof", "Parallel lines and transversals", "Triangle congruence", "Triangle properties and centers", "Quadrilaterals and polygons", "Transformations", "Similarity", "Right triangles and the Pythagorean theorem", "Trigonometry: sine, cosine, tangent", "Circles: arcs, chords, tangents", "Area of figures", "Surface area and volume", "Coordinate geometry", "Probability"]),
  c("alg2", "high", "Math", "Algebra 2", "11", ["Functions and transformations", "Linear and absolute value functions", "Systems in three variables", "Quadratics and complex numbers", "Polynomial functions", "Polynomial division and the remainder theorem", "Rational expressions and equations", "Radical functions and rational exponents", "Exponential functions", "Logarithms", "Sequences and series", "Trigonometric functions and the unit circle", "Probability and counting", "Statistics and the normal distribution"]),
  c("precalc", "high", "Math", "Precalculus", "11\u201312", ["Functions and their inverses", "Polynomial and rational functions", "Exponential and logarithmic functions", "Angles and radian measure", "Trigonometric functions and graphs", "Trigonometric identities", "Solving trigonometric equations", "Law of sines and law of cosines", "Vectors", "Polar coordinates and complex numbers", "Parametric equations", "Conic sections", "Matrices", "Sequences, series and induction", "Introduction to limits"]),
  c("calc", "high", "Math", "Calculus", "12", ["Limits and continuity", "Definition of the derivative", "Derivative rules", "Chain rule", "Implicit differentiation", "Related rates", "Curve sketching with derivatives", "Optimization", "Linear approximation and L'H\xF4pital's rule", "Antiderivatives", "Riemann sums and the definite integral", "The Fundamental Theorem of Calculus", "U-substitution", "Area between curves", "Volumes of solids", "Differential equations and slope fields"]),
  c("stats", "high", "Math", "Statistics", "11\u201312", ["Describing data", "The normal distribution", "Scatter plots, correlation and regression", "Sampling and study design", "Probability rules", "Random variables", "Binomial and geometric distributions", "Sampling distributions", "Confidence intervals", "Hypothesis tests", "Chi-square tests", "Inference for regression"]),
  c("finmath", "high", "Math", "Personal Finance", "11\u201312", ["Budgeting", "Paychecks and taxes", "Banking and saving", "Simple and compound interest", "Credit and credit scores", "Loans and car buying", "Investing basics", "Insurance", "Paying for college"]),
  c("eng9", "high", "English", "English 9", "9", ["Short stories and literary elements", "Close reading and annotation", "Theme and symbolism", "Mythology and the epic", "Shakespeare: Romeo and Juliet", "Poetry and poetic devices", "Nonfiction and rhetoric", "Argument writing", "Literary analysis essays", "Grammar and usage", "Vocabulary and word roots", "Research skills"]),
  c("eng10", "high", "English", "English 10", "10", ["World literature", "Novel study and character analysis", "Drama and tragedy", "Poetry across cultures", "Rhetorical appeals: ethos, pathos, logos", "Analyzing arguments", "Writing a literary analysis", "Writing an argument", "Synthesis and research papers", "Grammar, punctuation and style", "Vocabulary in context"]),
  c("eng11", "high", "English", "English 11: American Literature", "11", ["Early American and colonial writing", "Revolutionary and founding documents", "Romanticism and Transcendentalism", "Slave narratives and the Civil War", "Realism and Naturalism", "The Harlem Renaissance", "Modernism and The Great Gatsby", "Contemporary American voices", "Rhetorical analysis", "Argument and synthesis essays", "College application essays"]),
  c("eng12", "high", "English", "English 12: British and World Literature", "12", ["Anglo-Saxon literature and Beowulf", "Chaucer and the Middle Ages", "Shakespeare: Macbeth or Hamlet", "Metaphysical and Romantic poets", "The Victorian novel", "Modern and postcolonial literature", "Literary criticism", "Research papers", "Writing for college and work"]),
  c("bio", "high", "Science", "Biology", "9\u201310", ["Characteristics of life and the scientific method", "Biochemistry: carbohydrates, lipids, proteins, nucleic acids", "Enzymes", "Cell structure", "Cell membrane and transport", "Photosynthesis", "Cellular respiration", "Cell cycle and mitosis", "Meiosis", "Mendelian genetics and Punnett squares", "DNA, RNA and protein synthesis", "Mutations and biotechnology", "Evolution and natural selection", "Classification", "Ecology and populations", "Human body systems"]),
  c("chem", "high", "Science", "Chemistry", "10\u201311", ["Measurement and significant figures", "Matter and its properties", "Atomic structure", "Electron configuration", "The periodic table and trends", "Ionic and covalent bonding", "Naming compounds and formulas", "The mole", "Chemical reactions and balancing equations", "Stoichiometry", "Gas laws", "Solutions and concentration", "Acids and bases", "Reaction rates and equilibrium", "Thermochemistry", "Nuclear chemistry"]),
  c("phys", "high", "Science", "Physics", "11\u201312", ["Units, vectors and graphing", "Motion in one dimension", "Projectile motion", "Newton's laws", "Friction and inclined planes", "Circular motion and gravity", "Work, energy and power", "Momentum and collisions", "Rotational motion", "Simple harmonic motion", "Waves and sound", "Light and optics", "Electric charge and fields", "Circuits", "Magnetism"]),
  c("earth", "high", "Science", "Earth and Environmental Science", "9", ["Earth in the solar system", "Plate tectonics", "Earthquakes and volcanoes", "Rocks and the rock cycle", "Weathering, erosion and soil", "The atmosphere", "Weather and climate", "Oceans and the hydrosphere", "Natural resources and energy", "Human impact and sustainability"]),
  c("world", "high", "Social studies", "World History", "9\u201310", ["Early civilizations", "Classical Greece, Rome, India and China", "World religions", "The Middle Ages", "The Renaissance and Reformation", "Exploration and empires", "Scientific Revolution and Enlightenment", "Age of revolutions", "Industrial Revolution", "Imperialism", "World War I", "Between the wars", "World War II", "The Cold War", "Decolonization", "Globalization and today"]),
  c("ush", "high", "Social studies", "US History", "10\u201311", ["Colonial America", "The American Revolution", "The Constitution", "The early republic", "Jacksonian democracy", "Westward expansion", "Civil War", "Reconstruction", "The Gilded Age and industrialization", "Progressive Era", "World War I", "The 1920s and the Great Depression", "World War II", "The Cold War", "Civil rights movement", "Modern America"]),
  c("civics", "high", "Social studies", "Civics and Government", "9\u201312", ["Foundations of American government", "The Constitution and amendments", "Federalism", "Congress", "The presidency", "The courts and landmark cases", "Civil liberties and civil rights", "Elections, parties and voting", "State and local government", "Being an active citizen"]),
  c("econ", "high", "Social studies", "Economics", "11\u201312", ["Scarcity and choices", "Supply and demand", "Market structures", "Business and labor", "Money and banking", "The Federal Reserve", "GDP, inflation and unemployment", "Government and taxes", "International trade"]),
  c("span1", "high", "World languages", "Spanish 1", "9\u201312", ["Greetings and introductions", "Numbers, dates and time", "Family and descriptions", "Ser and estar", "School and classes", "Present tense regular verbs", "Food and restaurants", "Irregular verbs: ir, tener, hacer", "Hobbies and sports", "Spanish-speaking countries and cultures"]),
  c("span2", "high", "World languages", "Spanish 2", "10\u201312", ["Reflexive verbs and daily routine", "Preterite tense", "Imperfect tense", "Preterite versus imperfect", "Direct and indirect object pronouns", "Commands", "Travel and directions", "Health and the body", "Future and conditional", "Introduction to the subjunctive"]),
  c("cs", "high", "Computer science", "Computer Science", "9\u201312", ["How computers and the internet work", "Binary and data", "Algorithms", "Variables and data types", "Conditionals", "Loops", "Functions", "Lists and arrays", "Debugging", "Making an app or game", "Cybersecurity and privacy"]),
  // ---------- AP ----------
  c("ap-calc-ab", "ap", "Math", "AP Calculus AB", "AP", ["Limits and continuity", "Differentiation: definition and basic rules", "Composite, implicit and inverse functions", "Contextual applications of derivatives", "Analytical applications of derivatives", "Integration and accumulation of change", "Differential equations", "Applications of integration", "AP free-response practice"]),
  c("ap-calc-bc", "ap", "Math", "AP Calculus BC", "AP", ["Everything in Calculus AB, reviewed", "Integration by parts and partial fractions", "Improper integrals", "Euler's method and logistic growth", "Parametric equations and vectors", "Polar coordinates and area", "Infinite series and convergence tests", "Taylor and Maclaurin series", "AP free-response practice"]),
  c("ap-stats", "ap", "Math", "AP Statistics", "AP", ["Exploring one-variable data", "Exploring two-variable data", "Collecting data", "Probability and random variables", "Sampling distributions", "Inference for proportions", "Inference for means", "Chi-square inference", "Inference for slopes", "AP free-response practice"]),
  c("ap-bio", "ap", "Science", "AP Biology", "AP", ["Chemistry of life", "Cell structure and function", "Cellular energetics", "Cell communication and cell cycle", "Heredity", "Gene expression and regulation", "Natural selection", "Ecology", "AP free-response practice"]),
  c("ap-chem", "ap", "Science", "AP Chemistry", "AP", ["Atomic structure and properties", "Molecular and ionic bonding", "Intermolecular forces", "Chemical reactions", "Kinetics", "Thermodynamics", "Equilibrium", "Acids and bases", "Applications of thermodynamics", "AP free-response practice"]),
  c("ap-phys1", "ap", "Science", "AP Physics 1", "AP", ["Kinematics", "Force and translational dynamics", "Work, energy and power", "Linear momentum", "Torque and rotational dynamics", "Energy and momentum of rotating systems", "Oscillations", "Fluids", "AP free-response practice"]),
  c("ap-lang", "ap", "English", "AP English Language", "AP", ["Rhetorical situation", "Claims and evidence", "Reasoning and organization", "Style and language choices", "The synthesis essay", "The rhetorical analysis essay", "The argument essay", "Multiple-choice reading strategies"]),
  c("ap-lit", "ap", "English", "AP English Literature", "AP", ["Short fiction", "Poetry", "Longer fiction and drama", "Character, setting and structure", "Figurative language", "The poetry analysis essay", "The prose analysis essay", "The literary argument essay"]),
  c("ap-ush", "ap", "Social studies", "AP US History", "AP", ["Periods 1\u20132: 1491\u20131754", "Period 3: 1754\u20131800", "Period 4: 1800\u20131848", "Period 5: 1844\u20131877", "Period 6: 1865\u20131898", "Period 7: 1890\u20131945", "Period 8: 1945\u20131980", "Period 9: 1980\u2013present", "DBQ and long essay practice"]),
  c("ap-gov", "ap", "Social studies", "AP US Government", "AP", ["Foundations of American democracy", "Interactions among branches", "Civil liberties and civil rights", "American political ideologies", "Political participation", "Required founding documents and court cases", "Argument essay practice"]),
  // ---------- Test prep ----------
  c("sat-math", "prep", "Test prep", "SAT Math", "SAT", ["How the digital SAT works", "Linear equations and inequalities", "Linear functions and systems", "Ratios, rates, percents and units", "Data and statistics", "Probability", "Quadratics and nonlinear functions", "Exponential functions", "Geometry and trigonometry", "Using Desmos on the test", "Timed practice sets"]),
  c("sat-rw", "prep", "Test prep", "SAT Reading and Writing", "SAT", ["How the digital SAT works", "Words in context", "Text structure and purpose", "Central ideas and details", "Command of evidence: text and graphs", "Inferences", "Boundaries: punctuation", "Form, structure and sense", "Transitions", "Rhetorical synthesis", "Timed practice sets"]),
  c("act-eng", "prep", "Test prep", "ACT English", "ACT", ["How the ACT works and pacing", "Punctuation", "Sentence structure", "Verbs, pronouns and agreement", "Concise writing", "Transitions and organization", "Adding and deleting sentences", "Timed practice"]),
  c("act-math", "prep", "Test prep", "ACT Math", "ACT", ["Pacing and calculator strategy", "Pre-algebra and number", "Elementary and intermediate algebra", "Coordinate geometry", "Plane geometry", "Trigonometry", "Functions", "Statistics and probability", "Timed practice"]),
  c("act-read", "prep", "Test prep", "ACT Reading", "ACT", ["Pacing and passage strategy", "Main idea and purpose", "Details and inferences", "Vocabulary in context", "Paired passages", "Literary narrative passages", "Science and social science passages", "Timed practice"]),
  c("act-sci", "prep", "Test prep", "ACT Science", "ACT", ["Pacing and strategy", "Reading tables and graphs", "Research summaries and experiments", "Conflicting viewpoints", "Outside science knowledge you need", "Timed practice"]),
  c("psat", "prep", "Test prep", "PSAT/NMSQT", "PSAT", ["How the PSAT and National Merit work", "Reading and writing skills", "Algebra", "Advanced math", "Problem solving and data", "Geometry and trigonometry", "Timed practice"]),
  // ---------- State tests (named for the student's state; see STATE_TESTS) ----------
  c("st-read", "state", "State tests", "Reading and English (grades 3\u20138)", "3\u20138", ["How your state test works", "Literary text: key ideas and details", "Literary text: craft and structure", "Informational text: key ideas", "Informational text: craft and structure", "Comparing texts", "Vocabulary and word meaning", "Writing and editing questions", "Timed practice by grade"]),
  c("st-math", "state", "State tests", "Math (grades 3\u20138)", "3\u20138", ["How your state test works and calculator rules", "Numbers and operations", "Fractions and decimals", "Ratios and proportions", "Expressions and equations", "Functions", "Geometry and measurement", "Statistics and probability", "Timed practice by grade"]),
  c("st-sci", "state", "State tests", "Science (grades 5 and 8)", "5, 8", ["How your state test works", "Forces, motion and energy", "Matter and its properties", "Earth systems and weather", "Space science", "Ecosystems", "Body systems and cells", "Heredity and evolution", "Timed practice"]),
  c("st-eoc-math", "state", "State tests", "High school math end-of-course test", "HS", ["How your state's end-of-course test works", "Linear equations and functions", "Systems", "Exponential functions", "Quadratic functions", "Geometry topics on the test", "Statistics", "Timed practice"]),
  c("st-eoc-bio", "state", "State tests", "High school biology end-of-course test", "HS", ["How the test works", "Cells and transport", "Energy in living things", "Genetics and DNA", "Evolution", "Ecology", "Timed practice"]),
  c("st-eoc-eng", "state", "State tests", "High school English end-of-course test", "HS", ["How the test works", "Literary analysis", "Informational and argument texts", "Vocabulary and figurative language", "Editing and revising", "Writing the essay", "Timed practice"]),
  c("st-eoc-hist", "state", "State tests", "High school US history or civics test", "HS", ["How the test works", "Founding documents and the Constitution", "How government works", "Major eras of US history", "Reading primary sources, maps and charts", "Timed practice"])
];
var STATES = ["Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", "Delaware", "District of Columbia", "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire", "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming"];
var STATE_TESTS = {
  "Alabama": "ACAP",
  "Alaska": "AK STAR",
  "Arizona": "AASA",
  "Arkansas": "ATLAS",
  "California": "CAASPP (Smarter Balanced)",
  "Colorado": "CMAS",
  "Connecticut": "Smarter Balanced",
  "Delaware": "DeSSA",
  "District of Columbia": "DC CAPE",
  "Florida": "FAST and B.E.S.T. end-of-course",
  "Georgia": "Georgia Milestones",
  "Hawaii": "Smarter Balanced",
  "Idaho": "ISAT",
  "Illinois": "Illinois Assessment of Readiness",
  "Indiana": "ILEARN",
  "Iowa": "ISASP",
  "Kansas": "KAP",
  "Kentucky": "KSA",
  "Louisiana": "LEAP 2025",
  "Maine": "Maine Through Year Assessment",
  "Maryland": "MCAP",
  "Massachusetts": "MCAS",
  "Michigan": "M-STEP",
  "Minnesota": "MCA",
  "Mississippi": "MAAP",
  "Missouri": "Missouri Assessment Program",
  "Montana": "MAST",
  "Nebraska": "NSCAS",
  "Nevada": "Smarter Balanced",
  "New Hampshire": "NH SAS",
  "New Jersey": "NJSLA",
  "New Mexico": "NM-MSSA",
  "New York": "NYS tests and Regents exams",
  "North Carolina": "EOG and EOC",
  "North Dakota": "NDSA",
  "Ohio": "Ohio State Tests",
  "Oklahoma": "OSTP",
  "Oregon": "OSAS",
  "Pennsylvania": "PSSA and Keystone exams",
  "Rhode Island": "RICAS",
  "South Carolina": "SC READY and EOCEP",
  "South Dakota": "SD-SA (Smarter Balanced)",
  "Tennessee": "TCAP",
  "Texas": "STAAR",
  "Utah": "RISE and Utah Aspire Plus",
  "Vermont": "VTCAP",
  "Virginia": "SOL tests",
  "Washington": "Smarter Balanced",
  "West Virginia": "WVGSA",
  "Wisconsin": "Forward Exam",
  "Wyoming": "WY-TOPP"
};
var testName2 = (state) => STATE_TESTS[state] || "state test";
var course = (id) => COURSES.find((x) => x.id === id);

// lib/tutor.mjs
var MODES = {
  learn: `MODE: LEARN THE UNIT. Teach this unit from the beginning, one small idea at a time.
- Start by asking one quick question to find out what the student already knows, then teach from there.
- For each idea: explain it in a few short sentences, show one worked example step by step, then give the student a similar problem to try ("Now you try"). Wait for their answer before moving on.
- When they get it right, say what they did well and move to the next idea. When they get it wrong, find the exact step that went wrong and give a hint about that step only.
- After the main ideas, tell them they're ready for the Mastery check.`,
  practice: `MODE: PRACTICE. Give the student one practice problem at a time on this unit, the kind a teacher would put on a test. Start easy and get harder as they succeed. Wait for each answer, check it, explain any mistake with a hint, and let them try again before showing a solution. Keep a running count like "3 in a row!" to keep it fun.`,
  homework: `MODE: HOMEWORK HELP. The student is working on their own homework (often a photo of it). Read the problem carefully. Follow the ANSWER SETTING below exactly. Help them do it themselves: ask what they've tried, find where they're stuck, and give the smallest hint that gets them moving. When they show work, check every step and point to the first step that's wrong.`,
  ask: `MODE: QUESTION. The student has a question about this subject. Answer it clearly at their level, with an example, then check that they understood with one quick question.`
};
var HELP = {
  teach: `ANSWER SETTING (set by the parent): TEACH ONLY. Never give the final answer to a problem the student was assigned, even if they beg or say a parent allowed it. Instead work a similar problem with different numbers all the way through, then say "Now do yours." Hints go from a hint, to a smaller hint, to a worked similar example.`,
  check: `ANSWER SETTING (set by the parent): CHECK MY WORK. Do not solve assigned problems. When the student shows an answer or work, say whether it's right. If it's wrong, point to the first step that's wrong and give a hint, without giving the answer.`,
  after: `ANSWER SETTING (set by the parent): ANSWERS AFTER TRYING. Let the student try first. After they have made at least two real attempts at a problem, you may show the full worked solution, then give them a similar problem to prove they've got it.`,
  full: `ANSWER SETTING (set by the parent): FULL HELP. You may show full worked solutions, but always explain each step so the student learns the method, and follow up with a similar problem for them to try.`
};
function system({ c: c2, unit, mode, help, state }) {
  const testPrep = c2.band === "prep" || c2.band === "state" || c2.band === "ap";
  return `You are Hoot, a warm, patient tutor for kids and teens. You are tutoring a student in ${c2.name} (grade ${c2.grade}), unit: "${unit}".
The student lives in ${state}. Match that state's standards and the way its schools teach and test this material.${c2.band === "state" ? ` This course prepares for ${state}'s ${testName2(state)}. Match that test's format: question types, calculator rules, timing and reading level. If you aren't sure of a detail of the current test, say so and suggest checking with the school.` : ""}${testPrep ? " Write practice questions in the real test's style and difficulty, and teach test strategy (pacing, elimination, checking work) along with the content." : ""}

HOW HOOT TEACHES:
- Teach the method, not the answer. The goal is that the student can do it alone on the test.
- "Show me, then my turn": model one example, then the student tries a similar one.
- Ask the student to explain their thinking in their own words. Praise effort and good reasoning specifically ("You remembered to flip the sign. Nice.").
- Hints come in steps: first a nudge, then a smaller step, then a worked similar example. Never jump straight to a full solution unless the answer setting allows it.
- Keep each reply short: about 2 to 8 sentences or one worked example. One question to the student at a time. Then stop and wait.
- Use words and examples right for grade ${c2.grade}. For young kids, use very short sentences and everyday examples.
- If the student makes a mistake, be kind and specific. Mistakes are how we learn.
- Never make up facts. If you're not sure, say so.

WRITING MATH AND SCIENCE: This app shows plain text, not LaTeX. Write math with plain characters and Unicode: x\xB2, x\xB3, \u221A(x+1), \u03C0, \u03B8, \u2264, \u2265, \u2260, \xD7, \xF7, \xBD, fractions as (a)/(b), \u222B, d/dx, lim x\u21923, \u03A3, \u0394, \xB0, H\u2082O, CO\u2082. Put each step of a worked example on its own line. No markdown headers or tables; short lists are fine.

${MODES[mode]}

${HELP[help]}

SAFETY: You are talking with a child. Stay on school topics. If the student asks for something unrelated, gently steer back to studying. Never ask for or repeat personal information (full name, address, school name, phone, photos of themselves). If the student says anything about being hurt, unsafe, bullied, or wanting to hurt themselves or someone else, stop tutoring, respond with kindness, tell them to talk to a parent or another trusted grown-up right now, and say that in the US they can call or text 988 any time to talk to someone. Do not continue the lesson in that reply.`;
}
var ROLES = { kid: "user", tutor: "assistant" };
function pick(job, needUnit = true) {
  const c2 = course(String(job.course || ""));
  if (!c2) throw new StudyError("bad_request", 400, "unknown course");
  const unit = c2.units[Number(job.unit)];
  if (needUnit && unit === void 0) throw new StudyError("bad_request", 400, "unknown unit");
  const state = STATES.includes(job.state) ? job.state : "North Carolina";
  return { c: c2, unit, state };
}
async function tutorTurn(job) {
  const { c: c2, unit, state } = pick(job);
  const mode = MODES[job.mode] ? job.mode : "learn";
  const help = HELP[job.help] ? job.help : "teach";
  const images = Array.isArray(job.images) ? job.images : [];
  if (images.length > MAX_IMAGES) throw new StudyError("bad_request", 400, `at most ${MAX_IMAGES} photos`);
  for (const im of images) {
    if (!im || !IMAGE_TYPES.has(im.type) || typeof im.data !== "string" || im.data.length > MAX_IMAGE_B64)
      throw new StudyError("image_rejected", 400);
  }
  const messages = [];
  for (const m of (Array.isArray(job.messages) ? job.messages : []).slice(-30)) {
    const role = ROLES[m && m.role], text = clip(m && m.text, 4e3).trim();
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
      ...images.map((im) => ({ type: "image", source: { type: "base64", media_type: im.type, data: im.data } })),
      { type: "text", text: last.content }
    ];
  }
  const say = await callClaude(null, { system: system({ c: c2, unit, mode, help, state }), messages, maxTokens: 4e3 });
  return { say: say.trim() };
}
async function masteryCheck(job) {
  const { c: c2, unit, state } = pick(job);
  const missed = (Array.isArray(job.missed) ? job.missed : []).slice(0, 10).map((s) => clip(s, 300));
  const prompt = `Write a mastery check for a student in ${c2.name}${c2.band === "state" ? ` (${state}'s ${testName2(state)})` : ""} (grade ${c2.grade}), unit "${unit}", following ${state}'s standards.
Write 8 multiple-choice questions that together prove the student has mastered this unit: start with the basics, then understanding, then two harder apply-it problems.${c2.band === "prep" || c2.band === "state" || c2.band === "ap" ? " Match the real test's question style and difficulty." : ""}
${missed.length ? `The student missed these last time, so test the same ideas with new wording and numbers:
${missed.join("\n")}
` : ""}Exactly 4 believable choices each (wrong choices should be common mistakes). Put the correct answer first (index 0); the app shuffles them. "why" is one or two sentences showing how to get the right answer.
Write math in plain text with Unicode (x\xB2, \u221A, \u03C0, \u2264, fractions as a/b), never LaTeX.
Reply with ONLY a JSON array, no other text, like: [{"q":"question","choices":["correct","wrong","wrong","wrong"],"answer":0,"why":"explanation"}]`;
  const out = parseJson(await callClaude([{ type: "text", text: prompt }], { maxTokens: 8e3 }));
  if (!Array.isArray(out)) throw new StudyError("invalid_json", 502);
  return out;
}
var unitList = (c2) => c2.units.map((u, i) => `${i}: ${u}`).join("\n");
var checkUnits = (list, c2) => [...new Set((Array.isArray(list) ? list : []).map(Number).filter((i) => Number.isInteger(i) && c2.units[i] !== void 0))];
async function diagnose(job) {
  const { c: c2, state } = pick(job, false);
  const n = Math.min(16, Math.max(8, c2.units.length));
  const prompt = `Write a placement check for a student in ${c2.name} (grade ${c2.grade})${c2.band === "state" ? ` preparing for ${state}'s ${testName2(state)}` : ""}, following ${state}'s standards.
The course units are:
${unitList(c2)}
Write ${n} multiple-choice questions spread across the units, at least one per unit where possible, at a typical on-grade difficulty, so the results show which units the student is strong or weak in. Tag each question with the number of the unit it tests.
Exactly 4 believable choices each (wrong choices should be common mistakes). Put the correct answer first (index 0); the app shuffles them. "why" is one or two sentences explaining the right answer.
Write math in plain text with Unicode, never LaTeX.
Reply with ONLY a JSON array, no other text, like: [{"unit":0,"q":"question","choices":["correct","wrong","wrong","wrong"],"answer":0,"why":"explanation"}]`;
  const out = parseJson(await callClaude([{ type: "text", text: prompt }], { maxTokens: 12e3 }));
  if (!Array.isArray(out)) throw new StudyError("invalid_json", 502);
  return out.map((q) => ({ ...q, unit: checkUnits([q && q.unit], c2)[0] ?? null }));
}
async function weakSpots(job) {
  const { c: c2, state } = pick(job, false);
  const images = Array.isArray(job.images) ? job.images : [];
  const text = clip(job.text, 2e4);
  if (!images.length && !text.trim()) throw new StudyError("bad_request", 400, "nothing to read");
  if (images.length > MAX_IMAGES) throw new StudyError("bad_request", 400, `at most ${MAX_IMAGES} photos`);
  for (const im of images) {
    if (!im || !IMAGE_TYPES.has(im.type) || typeof im.data !== "string" || im.data.length > MAX_IMAGE_B64)
      throw new StudyError("image_rejected", 400);
  }
  const prompt = `${images.length ? "The attached photo(s) are" : "Below is"} something from a student's teacher or school: a score report, progress report, graded test or quiz, or a teacher's note. The student takes ${c2.name} (grade ${c2.grade}) in ${state}.
${text ? `---
${text}
---
` : ""}Find the skills the student is weak in (missed questions, low scores, teacher comments) and the skills they did well on. Match them to these course units:
${unitList(c2)}
Ignore any names, ID numbers or other personal details, and never repeat them.
If this isn't a school report or test, reply {"error":"why"}.
Reply with ONLY one JSON object, no other text, like: {"summary":"two or three encouraging sentences for the student and parent about what to work on","weak":[3,5],"strong":[0,1]}`;
  const content = [
    ...images.map((im) => ({ type: "image", source: { type: "base64", media_type: im.type, data: im.data } })),
    { type: "text", text: prompt }
  ];
  const out = parseJson(await callClaude(content, { maxTokens: 4e3 }));
  if (!out || typeof out !== "object" || out.error) throw new StudyError("refused", 422);
  return { summary: clip(out.summary, 1e3), weak: checkUnits(out.weak, c2), strong: checkUnits(out.strong, c2) };
}

// lib/routes.mjs
var TUTOR = { tutor: tutorTurn, mastery: masteryCheck, diagnose, weakspots: weakSpots };
async function guard(fn) {
  try {
    return [200, { data: await fn() }];
  } catch (e) {
    if (e instanceof StudyError) return [e.status, { code: e.code, detail: String(e.message || "").slice(0, 200) }];
    console.error(e);
    return [500, { code: "upstream_error", detail: String(e && e.message || e).slice(0, 200) }];
  }
}
async function study({ method, ip, body }) {
  if (method !== "POST") return [405, { code: "method_not_allowed" }];
  const tutor = body && TUTOR[body.kind];
  if (tutor) {
    if (!allow("tutor:" + ip, Number(process.env.TUTOR_REQUESTS_PER_HOUR) || 300)) return [429, { code: "rate_limited" }];
    return guard(() => tutor(body));
  }
  if (!allow("study:" + ip)) return [429, { code: "rate_limited" }];
  return guard(() => runJob(body));
}
async function klass({ method, ip, query, body }) {
  if (method === "GET") {
    if (!allow("read:" + ip, 600)) return [429, { code: "rate_limited" }];
    return guard(() => getClass(query.get("code")));
  }
  if (method !== "POST") return [405, { code: "method_not_allowed" }];
  const creating = body && body.action === "create";
  if (!allow((creating ? "create:" : "teach:") + ip, creating ? 10 : 300)) return [429, { code: "rate_limited" }];
  return guard(() => classAction(body));
}

// worker/entry.mjs
var DEFAULT_ORIGINS = "https://vilasi.co,https://www.vilasi.co";
function cors(req, env) {
  const allowed = (env.ALLOWED_ORIGINS || DEFAULT_ORIGINS).split(",").map((s) => s.trim());
  const o = req.headers.get("origin") || "";
  return { "access-control-allow-origin": allowed.includes(o) ? o : allowed[0], "access-control-allow-methods": "GET,POST,OPTIONS", "access-control-allow-headers": "content-type", vary: "origin" };
}
var entry_default = {
  async fetch(req, env) {
    globalThis.process = { env };
    globalThis.__HOOT_KV = env.HOOT || null;
    const h = cors(req, env);
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: h });
    const url = new URL(req.url);
    const send = (s2, j2) => new Response(JSON.stringify(j2), { status: s2, headers: { ...h, "content-type": "application/json" } });
    if (url.pathname === "/") return send(200, { ok: true, app: "hoot-tutor", version: 5, key: Boolean(env.ANTHROPIC_API_KEY), classes: Boolean(env.HOOT) });
    if (url.pathname === "/selftest") {
      try {
        const r = await new Anthropic().messages.create({ model: "claude-opus-5-5", max_tokens: 16, messages: [{ role: "user", content: "Reply with the word ok." }] });
        return send(200, { ok: true, model: r.model, reply: (r.content || []).map((b) => b.text || "").join("") });
      } catch (e) {
        return send(200, { ok: false, status: e.status || 0, error: String(e.message || e).slice(0, 300) });
      }
    }
    const route = url.pathname === "/api/study" ? study : url.pathname === "/api/class" ? klass : null;
    if (!route) return send(404, { code: "not_found" });
    let body = null;
    if (req.method === "POST") {
      if (Number(req.headers.get("content-length") || 0) > 9e6) return send(413, { code: "too_large" });
      body = await req.json().catch(() => null);
    }
    if (route === study && env.HOOT) {
      const day = "cap:" + (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
      const n = Number(await env.HOOT.get(day)) || 0;
      if (n >= (Number(env.DAILY_CAP) || 3e3)) return send(429, { code: "rate_limited" });
      await env.HOOT.put(day, String(n + 1), { expirationTtl: 172800 });
    }
    const ip = req.headers.get("cf-connecting-ip") || "unknown";
    const [s, j] = await route({ method: req.method, ip, query: url.searchParams, body });
    return send(s, j);
  }
};
export {
  entry_default as default
};
