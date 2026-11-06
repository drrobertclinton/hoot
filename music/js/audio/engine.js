// Sound engine: synthesized instruments, metronome and backing band, all made in Web Audio (no recordings).
import { mtof, parseMelody, chordMidi, parseChord } from '../core/music.js';
import { state } from '../state.js';

let ctx = null, master = null, comp = null;
const ksCache = new Map();

export function audio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC({ latencyHint: 'interactive' });
    comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 3; comp.attack.value = 0.004; comp.release.value = 0.2;
    master = ctx.createGain(); master.gain.value = 0.9;
    master.connect(comp); comp.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}
export const now = () => audio().currentTime;
// Test hook: lets automated tests line events up with the audio clock.
window.__audioNow = () => audio().currentTime;

/** A playback group: everything scheduled into it can be stopped at once. */
export function group(vol = 1) {
  const a = audio(); const out = a.createGain(); out.gain.value = vol; out.connect(master);
  const nodes = [];
  return {
    out, nodes,
    stop() { const t = a.currentTime; try { out.gain.cancelScheduledValues(t); out.gain.setTargetAtTime(0, t, 0.015); } catch { /* ignore */ } setTimeout(() => { nodes.forEach((n) => { try { n.stop(); } catch { /* already stopped */ } }); try { out.disconnect(); } catch { /* ignore */ } }, 120); },
  };
}

function env(g, t, { a = 0.005, d = 0.1, s = 0.6, r = 0.12, dur = 0.5, peak = 1 }) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(peak, t + a);
  g.gain.setTargetAtTime(peak * s, t + a, d / 3);
  const end = t + Math.max(dur, a + 0.01);
  g.gain.setValueAtTime(peak * s, end);
  g.gain.setTargetAtTime(0.0001, end, r / 3);
  return end + r;
}
function osc(type, f, t, end, dst, G) { const o = audio().createOscillator(); o.type = type; o.frequency.value = f; o.connect(dst); o.start(t); o.stop(end + 0.05); G.nodes.push(o); return o; }

// Karplus-Strong plucked string rendered to a buffer once per pitch.
function ksBuffer(midi, decay = 0.996, bright = 0.5) {
  const key = `${midi}:${decay}:${bright}`; if (ksCache.has(key)) return ksCache.get(key);
  const a = audio(), sr = a.sampleRate, f = mtof(midi), len = Math.floor(sr * Math.min(3, 1.2 + 120 / f));
  const buf = a.createBuffer(1, len, sr), d = buf.getChannelData(0);
  const N = Math.max(2, Math.round(sr / f - 0.5)); const line = new Float32Array(N);
  let seed = midi * 9301 + 49297; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < N; i++) line[i] = rnd() * 2 - 1;
  let prev = 0;
  for (let i = 0; i < N; i++) { prev = prev + bright * (line[i] - prev); line[i] = prev; } // soften the pluck
  for (let i = 0; i < len; i++) { const j = i % N, k = (i + 1) % N; const v = line[j]; d[i] = v * 0.5; line[j] = decay * 0.5 * (v + line[k]); }
  ksCache.set(key, buf); return buf;
}

/** Play one note. inst: piano | guitar | bass | harp | violin | cello | sax | trumpet | clarinet | voice | pad | ebass | bell */
export function note(midi, t, dur, inst = 'piano', G = null, vel = 0.8) {
  const a = audio(); G = G || group(1);
  const f = mtof(midi); const g = a.createGain(); g.connect(G.out);
  let end;
  switch (inst) {
    case 'guitar': case 'bass': case 'harp': case 'ebass': {
      const src = a.createBufferSource(); src.buffer = ksBuffer(midi, inst === 'harp' ? 0.998 : inst === 'guitar' ? 0.997 : 0.995, inst === 'harp' ? 0.35 : inst === 'guitar' ? 0.55 : 0.25);
      const lp = a.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = inst === 'bass' || inst === 'ebass' ? 1400 : 5200;
      src.connect(lp); lp.connect(g);
      g.gain.setValueAtTime(vel * (inst === 'bass' || inst === 'ebass' ? 1.5 : 1.1), t);
      end = t + Math.min(dur + 0.4, src.buffer.duration);
      g.gain.setTargetAtTime(0.0001, t + dur, inst === 'harp' ? 0.5 : 0.08);
      src.start(t); src.stop(end + 0.4); G.nodes.push(src);
      break;
    }
    case 'violin': case 'cello': case 'voice': case 'pad': {
      const lp = a.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = inst === 'pad' ? 1800 : inst === 'cello' ? 2400 : 3600; lp.Q.value = 0.7;
      lp.connect(g);
      const dst = lp;
      if (inst === 'voice') { // simple "ah" formants
        const sum = a.createGain(); sum.gain.value = 1; sum.connect(lp);
        const fm = [[800, 8, 1], [1150, 10, 0.5], [2900, 12, 0.25]].map(([fr, q, gain]) => { const bp = a.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = fr; bp.Q.value = q; const gg = a.createGain(); gg.gain.value = gain * 6; bp.connect(gg); gg.connect(sum); return bp; });
        const o = a.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; fm.forEach((bp) => o.connect(bp));
        const lfo = a.createOscillator(), lg = a.createGain(); lfo.frequency.value = 5.2; lg.gain.value = f * 0.006; lfo.connect(lg); lg.connect(o.frequency);
        end = env(g, t, { a: 0.08, d: 0.2, s: 0.8, r: 0.15, dur, peak: vel * 0.32 });
        o.start(t); o.stop(end + 0.05); lfo.start(t + 0.25); lfo.stop(end + 0.05); G.nodes.push(o, lfo);
        break;
      }
      const o1 = osc('sawtooth', f, t, t + dur + 0.4, dst, G), o2 = osc('sawtooth', f * 1.003, t, t + dur + 0.4, dst, G);
      if (inst !== 'pad') { const lfo = a.createOscillator(), lg = a.createGain(); lfo.frequency.value = 5.5; lg.gain.value = f * 0.005; lfo.connect(lg); lg.connect(o1.frequency); lg.connect(o2.frequency); lfo.start(t + 0.2); lfo.stop(t + dur + 0.5); G.nodes.push(lfo); }
      end = env(g, t, { a: inst === 'pad' ? 0.25 : 0.06, d: 0.2, s: 0.85, r: inst === 'pad' ? 0.5 : 0.15, dur, peak: vel * (inst === 'pad' ? 0.06 : 0.16) });
      break;
    }
    case 'sax': case 'clarinet': case 'trumpet': {
      const lp = a.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = inst === 'trumpet' ? 2 : 1; lp.connect(g);
      const base = inst === 'clarinet' ? 1600 : inst === 'sax' ? 2200 : 2600;
      lp.frequency.setValueAtTime(base * 0.4, t); lp.frequency.linearRampToValueAtTime(base, t + 0.06);
      osc(inst === 'clarinet' ? 'square' : 'sawtooth', f, t, t + dur + 0.3, lp, G);
      if (inst !== 'clarinet') osc('square', f, t, t + dur + 0.3, lp, G).detune.value = 3;
      end = env(g, t, { a: 0.03, d: 0.15, s: 0.8, r: 0.08, dur, peak: vel * 0.13 });
      break;
    }
    case 'bell': {
      osc('sine', f, t, t + dur + 0.6, g, G); osc('sine', f * 2.76, t, t + dur + 0.6, g, G);
      g.gain.setValueAtTime(vel * 0.25, t); g.gain.setTargetAtTime(0.0001, t, 0.25); end = t + dur + 0.6;
      break;
    }
    default: { // piano: two partial pairs, struck envelope, darker as it decays
      const lp = a.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(Math.min(9000, 1200 + f * 6 * vel), t); lp.frequency.setTargetAtTime(Math.min(4000, 600 + f * 2), t, 0.3);
      lp.connect(g);
      const p = [['triangle', 1, 0.6], ['sine', 2, 0.25], ['sine', 3, 0.08], ['sine', 1.002, 0.3]];
      const ring = Math.min(3.2, 0.6 + 260 / f);
      for (const [type, mul, amp] of p) { const gg = a.createGain(); gg.gain.value = amp; gg.connect(lp); osc(type, f * mul, t, t + dur + ring, gg, G); }
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vel * 0.42, t + 0.004);
      g.gain.setTargetAtTime(vel * 0.42 * 0.35, t + 0.004, ring / 2.5);
      g.gain.setTargetAtTime(0.0001, t + dur, 0.09);
      end = t + dur + 0.5;
    }
  }
  return end;
}

// ---------- drums and clicks ----------
let noiseBuf = null;
function noise() { if (noiseBuf) return noiseBuf; const a = audio(); noiseBuf = a.createBuffer(1, a.sampleRate, a.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; return noiseBuf; }
export function drum(kind, t, G, vel = 1) {
  const a = audio(); const g = a.createGain(); g.connect(G.out);
  if (kind === 'kick') {
    const o = a.createOscillator(); o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.12); o.connect(g);
    g.gain.setValueAtTime(vel * 0.9, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.3); o.start(t); o.stop(t + 0.32); G.nodes.push(o);
  } else {
    const n = a.createBufferSource(); n.buffer = noise(); const f = a.createBiquadFilter();
    f.type = kind === 'hat' ? 'highpass' : 'bandpass'; f.frequency.value = kind === 'hat' ? 7000 : 1800; f.Q.value = kind === 'hat' ? 0.7 : 0.9;
    n.connect(f); f.connect(g);
    const len = kind === 'hat' ? 0.05 : 0.16;
    g.gain.setValueAtTime(vel * (kind === 'hat' ? 0.18 : 0.45), t); g.gain.exponentialRampToValueAtTime(0.001, t + len);
    n.start(t, Math.random() * 0.5); n.stop(t + len + 0.02); G.nodes.push(n);
    if (kind === 'snare') { const o = a.createOscillator(); o.frequency.value = 190; const og = a.createGain(); og.gain.setValueAtTime(vel * 0.3, t); og.gain.exponentialRampToValueAtTime(0.001, t + 0.08); o.connect(og); og.connect(G.out); o.start(t); o.stop(t + 0.1); G.nodes.push(o); }
  }
}
export function click(t, accent, G, vol = state().settings.clickVol) {
  const a = audio(); const o = a.createOscillator(); const g = a.createGain();
  o.frequency.value = accent ? 1760 : 1175; o.connect(g); g.connect(G.out);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.5 * vol + 0.001, t + 0.001); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.045);
  o.start(t); o.stop(t + 0.06); G.nodes.push(o);
}

// ---------- melodies ----------
export const SOUND_FOR = { piano: 'piano', guitar: 'guitar', bass: 'bass', violin: 'violin', cello: 'cello', altosax: 'sax', tenorsax: 'sax', trumpet: 'trumpet', clarinet: 'clarinet', harp: 'harp', voice: 'voice', theory: 'piano' };

/** Schedule a written melody for an instrument. Returns { group, start, end, times:[{t, beats, notes}] } */
export function playMelody(text, { bpm = 80, inst = 'piano', transpose = 0, start = null, G = null, vol = 1 } = {}) {
  const a = audio(); G = G || group(vol);
  const spb = 60 / bpm; const t0 = start ?? a.currentTime + 0.12;
  const ev = parseMelody(text); const times = [];
  for (const e of ev) {
    const t = t0 + e.t * spb; times.push({ t, beats: e.beats, notes: e.notes, rest: e.rest });
    if (!e.rest) e.notes.forEach((m) => note(m - transpose, t, e.beats * spb * 0.92, SOUND_FOR[inst] || inst, G, 0.8));
  }
  const end = t0 + ev.reduce((s, e) => s + e.beats, 0) * spb;
  return { group: G, start: t0, end, times };
}

/** Metronome clicks from t0 for n beats. */
export function clicks(t0, bpm, n, perBar = 4, G = null) { G = G || group(1); for (let i = 0; i < n; i++) click(t0 + i * 60 / bpm, i % perBar === 0, G); return G; }

// ---------- backing band ----------
/**
 * chords: [{ sym, beats, t }] in concert pitch. style: pop | rock | ballad | waltz | swing | blues | classical | folk
 * Schedules bass, comping and drums from t0. Returns the group.
 */
export function backing(chords, { bpm, t0, style = 'pop', time = [4, 4], G = null, drums = true, vol = state().settings.backingVol } = {}) {
  G = G || group(vol); const spb = 60 / bpm;
  const swing = style === 'swing' || style === 'blues';
  const beatsPerBar = time[0] * 4 / time[1];
  for (const c of chords) {
    const { pc, q } = parseChord(c.sym);
    const root = 36 + pc + (pc > 7 ? -12 : 0) + 12; // bass around C2–G2... lifted an octave for small speakers
    const tones = chordMidi(52 + ((pc - 4 + 12) % 12), q === 'pow' ? 'maj' : q); // roots E3 to D#4, under the melody
    const start = t0 + c.t * spb;
    const n = c.beats;
    // bass
    if (style === 'waltz' || time[1] === 8 || beatsPerBar === 3) {
      for (let b = 0; b < n; b += (time[1] === 8 ? 1.5 : 3)) note(root, start + b * spb, spb * 0.9, 'ebass', G, 0.9);
    } else if (style === 'rock') {
      for (let b = 0; b < n; b += 0.5) note(root, start + b * spb, spb * 0.42, 'ebass', G, 0.75);
    } else if (style === 'blues' || style === 'swing') {
      const walk = [0, 4, 7, 9];
      for (let b = 0; b < n; b++) note(root + walk[b % 4], start + b * spb, spb * 0.85, 'ebass', G, 0.85);
    } else {
      for (let b = 0; b < n; b += 2) note(root + (b % 4 === 2 && style !== 'ballad' ? 7 : 0), start + b * spb, spb * 1.6, 'ebass', G, 0.85);
    }
    // comping
    if (style === 'classical') {
      const arp = [tones[0], tones[2], tones[1], tones[2]];
      for (let b = 0, i = 0; b < n - 1e-6; b += 0.5, i++) note(arp[i % 4], start + b * spb, spb * 0.5, 'piano', G, 0.45);
    } else if (style === 'waltz' || beatsPerBar === 3 || time[1] === 8) {
      const step = time[1] === 8 ? 0.5 : 1;
      for (let b = 0; b < n - 1e-6; b += step) { if (b % (time[1] === 8 ? 1.5 : 3) === 0) continue; tones.forEach((m) => note(m, start + b * spb, spb * 0.5, 'piano', G, 0.4)); }
    } else if (style === 'folk') {
      for (let b = 0; b < n; b++) tones.forEach((m, i) => note(m, start + b * spb + i * 0.012, spb * 0.9, 'guitar', G, 0.5));
    } else if (style === 'ballad') {
      tones.forEach((m) => note(m, start, n * spb, 'pad', G, 0.9));
      for (let b = 0; b < n; b += 2) tones.forEach((m) => note(m, start + b * spb, spb * 1.5, 'piano', G, 0.3));
    } else if (swing) {
      for (let b = 1; b < n; b += 2) tones.forEach((m) => note(m, start + b * spb, spb * 0.35, 'piano', G, 0.45));
    } else {
      tones.forEach((m) => note(m, start, n * spb, 'pad', G, 0.8));
      for (let b = 0; b < n; b++) tones.forEach((m) => note(m, start + (b + (style === 'pop' ? 0.5 : 0)) * spb, spb * 0.3, 'piano', G, 0.32));
    }
    // drums
    if (drums && style !== 'classical') {
      for (let b = 0; b < n; b++) {
        const bt = start + b * spb; const inBar = Math.round((c.t + b) % beatsPerBar);
        if (beatsPerBar === 3 || time[1] === 8) { if (inBar === 0) drum('kick', bt, G, 0.8); drum('hat', bt, G, inBar === 0 ? 0.9 : 0.6); continue; }
        if (style === 'ballad') { if (inBar === 0) drum('kick', bt, G, 0.6); if (inBar === 2) drum('snare', bt, G, 0.4); drum('hat', bt, G, 0.5); continue; }
        if (inBar === 0 || inBar === 2) drum('kick', bt, G); if (inBar === 1 || inBar === 3) drum('snare', bt, G, 0.8);
        drum('hat', bt, G, 0.8); drum('hat', bt + spb * (swing ? 0.667 : 0.5), G, 0.5);
      }
    }
  }
  return G;
}
