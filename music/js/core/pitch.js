// Listening engine: YIN pitch detection, note onset tracking and chroma-based chord recognition.
// Pure functions on Float32Array frames, so the same code runs in the app and in Node tests.
import { ftom, pc, CHORDS } from './music.js';

export function rms(buf) {
  let s = 0; for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i];
  return Math.sqrt(s / buf.length);
}

/**
 * YIN fundamental-frequency estimator (de Cheveigné & Kawahara, 2002) with parabolic interpolation.
 * Returns { freq, clarity } (clarity 0..1, higher is more periodic) or { freq: 0 } when unvoiced.
 */
export function yin(buf, sr, { threshold = 0.15, fmin = 55, fmax = 1700 } = {}) {
  const tauMin = Math.max(2, Math.floor(sr / fmax));
  const tauMax = Math.min(Math.floor(buf.length / 2), Math.ceil(sr / fmin));
  const W = buf.length - tauMax;
  if (W < 16 || tauMax <= tauMin) return { freq: 0, clarity: 0 };
  const d = new Float32Array(tauMax + 1);
  for (let tau = 1; tau <= tauMax; tau++) {
    let s = 0;
    for (let i = 0; i < W; i++) { const x = buf[i] - buf[i + tau]; s += x * x; }
    d[tau] = s;
  }
  // cumulative mean normalized difference
  const c = new Float32Array(tauMax + 1); c[0] = 1; let run = 0;
  for (let tau = 1; tau <= tauMax; tau++) { run += d[tau]; c[tau] = run > 0 ? d[tau] * tau / run : 1; }
  let tau = -1;
  for (let t = tauMin; t <= tauMax; t++) {
    if (c[t] < threshold) { while (t + 1 <= tauMax && c[t + 1] < c[t]) t++; tau = t; break; }
  }
  if (tau < 0) {
    // no dip under the threshold: take the global minimum if it is reasonably low
    let best = tauMin; for (let t = tauMin; t <= tauMax; t++) if (c[t] < c[best]) best = t;
    if (c[best] > 0.35) return { freq: 0, clarity: 1 - c[best] };
    tau = best;
  }
  let better = tau;
  if (tau > 1 && tau < tauMax) {
    const a = c[tau - 1], b = c[tau], g = c[tau + 1];
    const den = a + g - 2 * b; if (den !== 0) better = tau + (a - g) / (2 * den);
  }
  return { freq: sr / better, clarity: Math.max(0, Math.min(1, 1 - c[tau])) };
}

/**
 * Turns a stream of analysis frames into discrete note events.
 * feed({ t, freq, clarity, level }) -> returns a completed or started event when one occurs.
 * An onset is: sound starts after silence, a new stable pitch, or a sharp level rise (re-attack of the same note).
 */
export class NoteTracker {
  constructor({ minLevel = 0.01, minClarity = 0.8, stableFrames = 3, reattackRatio = 1.45, transpose = 0 } = {}) {
    Object.assign(this, { minLevel, minClarity, stableFrames, reattackRatio, transpose });
    this.reset();
  }
  reset() { this.cur = null; this.cand = null; this.candN = 0; this.prevLevel = 0; this.hist = []; this.events = []; }
  feed(f) {
    const voiced = f.freq > 0 && f.clarity >= this.minClarity && f.level >= this.minLevel;
    const midiF = voiced ? ftom(f.freq) + this.transpose : null;
    const m = voiced ? Math.round(midiF) : null;
    let out = null;
    // re-attack: level jumps well above the lowest level of the last few frames (a new pluck, strike or tongued note)
    const low = this.hist.length ? Math.min(...this.hist) : 0;
    const sinceOnset = this.cur ? f.t - this.cur.t : Infinity;
    const rise = this.hist.length >= 3 && sinceOnset > 0.12 && f.level > low * this.reattackRatio && f.level - low > this.minLevel * 3;
    this.hist.push(f.level); if (this.hist.length > 4) this.hist.shift();
    if (!voiced) {
      if (this.cur) { this.cur.end = f.t; out = { type: 'end', note: this.cur }; this.cur = null; }
      this.cand = null; this.candN = 0;
    } else if (rise && this.cur) {
      // close the sounding note; the new attack becomes a candidate even if the pitch is the same
      this.cur.end = f.t; this.cur = null;
      this.cand = { midi: m, t: f.t, cents: [(midiF - m) * 100], peak: f.level }; this.candN = 1; this.hist = [f.level];
    } else if (this.cur && m === this.cur.midi) {
      this.cur.cents.push((midiF - m) * 100); this.cur.peak = Math.max(this.cur.peak, f.level);
    } else {
      if (this.cand && this.cand.midi === m) this.candN++; else { this.cand = { midi: m, t: f.t, cents: [], peak: f.level }; this.candN = 1; }
      this.cand.cents.push((midiF - m) * 100);
      if (this.candN >= this.stableFrames) {
        if (this.cur) { this.cur.end = this.cand.t; }
        this.cur = { midi: m, t: this.cand.t, cents: this.cand.cents, peak: this.cand.peak };
        this.events.push(this.cur);
        out = { type: 'start', note: this.cur };
        this.cand = null; this.candN = 0;
      }
    }
    this.prevLevel = f.level;
    return out;
  }
}
export const avgCents = (n) => (n.cents.length ? n.cents.reduce((a, b) => a + b, 0) / n.cents.length : 0);

/** Run YIN + NoteTracker across a whole signal (used by tests and by offline analysis). */
export function analyzeSignal(samples, sr, { hop = 512, frame = 2048, fmin = 55, fmax = 1700, transpose = 0, minLevel = 0.01 } = {}) {
  const tr = new NoteTracker({ transpose, minLevel });
  for (let i = 0; i + frame <= samples.length; i += hop) {
    const buf = samples.subarray(i, i + frame);
    const level = rms(buf);
    const p = level >= minLevel ? yin(buf, sr, { fmin, fmax }) : { freq: 0, clarity: 0 };
    tr.feed({ t: (i + frame / 2) / sr, freq: p.freq, clarity: p.clarity, level });
  }
  return tr.events.map((e) => ({ midi: e.midi, t: e.t, cents: Math.round(avgCents(e)) }));
}

/** Energy-based onset times (seconds) for rhythm exercises: claps, taps, any instrument. */
export function detectOnsets(samples, sr, { hop = 256, frame = 1024, ratio = 2.2, minLevel = 0.02, refractory = 0.09 } = {}) {
  const out = []; let prev = 0, last = -1;
  for (let i = 0; i + frame <= samples.length; i += hop) {
    const level = rms(samples.subarray(i, i + frame));
    const t = i / sr;
    if (level > minLevel && level > prev * ratio && t - last > refractory) { out.push(t); last = t; }
    prev = prev * 0.6 + level * 0.4;
  }
  return out;
}

// ---------- spectrum and chroma ----------
/** In-place radix-2 FFT. re/im lengths must be a power of two. */
export function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit;
    if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = -2 * Math.PI / len, wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const ar = re[i + k], ai = im[i + k];
        const br = re[i + k + len / 2] * cr - im[i + k + len / 2] * ci;
        const bi = re[i + k + len / 2] * ci + im[i + k + len / 2] * cr;
        re[i + k] = ar + br; im[i + k] = ai + bi; re[i + k + len / 2] = ar - br; im[i + k + len / 2] = ai - bi;
        const nr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = nr;
      }
    }
  }
}
/** Magnitude spectrum of a Hann-windowed frame (length is padded to a power of two). */
export function spectrum(buf) {
  let n = 1; while (n < buf.length) n <<= 1;
  const re = new Float32Array(n), im = new Float32Array(n);
  for (let i = 0; i < buf.length; i++) re[i] = buf[i] * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / (buf.length - 1)));
  fft(re, im);
  const mag = new Float32Array(n / 2);
  for (let i = 0; i < n / 2; i++) mag[i] = Math.hypot(re[i], im[i]);
  return mag;
}
/** 12-bin pitch-class profile from a magnitude spectrum (bins = fftSize/2). Spectral peaks from 70 Hz to 1.2 kHz,
 *  with upper partials weighted down so overtones do not outvote the chord tones. */
export function chromaFromSpectrum(mag, sr, { fmin = 70, fmax = 1200, knee = 250 } = {}) {
  const n = mag.length * 2; const ch = new Float32Array(12);
  for (let k = 2; k < mag.length - 1; k++) {
    const f = k * sr / n; if (f < fmin || f > fmax) continue;
    if (mag[k] < mag[k - 1] || mag[k] < mag[k + 1]) continue;
    const m = ftom(f); const near = Math.round(m);
    if (Math.abs(m - near) > 0.4) continue;
    ch[pc(near)] += mag[k] * (f < knee ? 1 : Math.pow(knee / f, 1.5));
  }
  const mx = Math.max(...ch) || 1; for (let i = 0; i < 12; i++) ch[i] /= mx;
  return ch;
}
export const chroma = (buf, sr) => chromaFromSpectrum(spectrum(buf), sr);

const TEMPLATE_Q = ['maj', 'min', 'dom7', 'min7', 'maj7', 'sus2', 'sus4', 'pow', 'dim'];
/** Best chord match for a chroma vector: { root (pc), q, score (cosine 0..1) } */
export function matchChord(ch, qualities = TEMPLATE_Q) {
  let best = { root: 0, q: 'maj', score: -1 };
  const norm = Math.hypot(...ch) || 1;
  for (const q of qualities) for (let r = 0; r < 12; r++) {
    const t = new Float32Array(12);
    CHORDS[q].iv.forEach((iv, i) => { t[(r + iv) % 12] = i === 0 ? 1.15 : 1; });
    let dot = 0; for (let i = 0; i < 12; i++) dot += ch[i] * t[i];
    const s = dot / (norm * Math.hypot(...t));
    if (s > best.score + 1e-6) best = { root: r, q, score: s };
  }
  return best;
}
/** Is the expected chord (root pc + quality) present? Tolerant to extra partials; checks the triad tones. */
export function chordPresent(ch, rootPc, q, { minTone = 0.35 } = {}) {
  const tones = CHORDS[q].iv.map((i) => (rootPc + i) % 12);
  const toneOk = tones.every((p) => ch[p] >= minTone);
  const best = matchChord(ch, [q, ...TEMPLATE_Q.filter((x) => x !== q)]);
  let same = best.root === rootPc && best.q === q;
  if (!same && best.root === rootPc && best.q === 'pow' && (q === 'maj' || q === 'min')) {
    // a quiet third (common on guitar): accept it if the right third beats the wrong one
    const third = ch[(rootPc + (q === 'maj' ? 4 : 3)) % 12], other = ch[(rootPc + (q === 'maj' ? 3 : 4)) % 12];
    same = third >= 0.1 && third > other;
  }
  if (q === 'pow' && best.root === rootPc && (best.q === 'maj' || best.q === 'min')) same = true;
  return { ok: same || (toneOk && best.score < 0.8), best, tones: tones.map((p) => ch[p]) };
}
