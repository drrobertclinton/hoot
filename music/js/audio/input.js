// Listening: microphone (pitch, onsets, chords), Web MIDI keyboards and on-screen touches, merged into one stream of
// note events in WRITTEN pitch for the current instrument, timed on the AudioContext clock.
import { audio } from './engine.js';
import { yin, rms, NoteTracker, chromaFromSpectrum } from '../core/pitch.js';
import { ftom } from '../core/music.js';

const subs = { note: new Set(), frame: new Set(), onset: new Set(), off: new Set(), status: new Set(), pedal: new Set() };
export const on = (type, fn) => { subs[type].add(fn); return () => subs[type].delete(fn); };
const emit = (type, ev) => subs[type].forEach((f) => { try { f(ev); } catch (e) { console.error(e); } });

let cfg = { transpose: 0, fmin: 60, fmax: 2000, frame: 2048 };
let mic = null; // { stream, src, an, buf, timer, tracker, spec }
let midiAccess = null; const midiInputs = new Map();
export const status = { mic: 'off', midi: 'off', midiName: '', micError: '' };

/** Configure listening for an instrument (written = sounding + transpose). */
export function configure(inst) {
  cfg = { transpose: inst.transpose || 0, fmin: inst.listen.fmin, fmax: inst.listen.fmax, frame: inst.listen.frame };
  if (mic) { mic.tracker = new NoteTracker({ transpose: cfg.transpose, minLevel: mic.minLevel }); setFrame(cfg.frame); }
}
function setFrame(n) { if (!mic) return; mic.an.fftSize = Math.max(2048, n * 2 > 32768 ? 32768 : n * 2); mic.buf = new Float32Array(mic.an.fftSize); mic.spec = new Float32Array(mic.an.frequencyBinCount); }

export const micSupported = () => !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
export async function startMic() {
  if (mic) return true;
  if (!micSupported()) { status.mic = 'unsupported'; emit('status', status); return false; }
  try {
    const a = audio();
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
    const src = a.createMediaStreamSource(stream);
    const an = a.createAnalyser(); an.smoothingTimeConstant = 0;
    src.connect(an);
    mic = { stream, src, an, minLevel: 0.008, noise: 0.002, tracker: new NoteTracker({ transpose: cfg.transpose, minLevel: 0.008 }) };
    setFrame(cfg.frame);
    mic.timer = setInterval(tick, 16);
    status.mic = 'on'; status.micError = ''; emit('status', status);
    return true;
  } catch (e) {
    status.mic = 'denied'; status.micError = e && e.name === 'NotAllowedError' ? 'Microphone permission was declined.' : 'The microphone could not be opened.';
    emit('status', status); return false;
  }
}
export function stopMic() {
  if (!mic) return;
  clearInterval(mic.timer); mic.stream.getTracks().forEach((t) => t.stop()); try { mic.src.disconnect(); } catch { /* ignore */ }
  mic = null; status.mic = 'off'; emit('status', status);
}
export const micOn = () => !!mic;

let lastLevel = 0, muteUntil = 0;
/** Ignore the microphone briefly (for example while the app itself plays a demo). */
export function muteMic(until) { muteUntil = until; }
function tick() {
  const a = audio(); if (!mic) return;
  mic.an.getFloatTimeDomainData(mic.buf);
  const frame = mic.buf.length > cfg.frame ? mic.buf.subarray(mic.buf.length - cfg.frame) : mic.buf;
  const level = rms(frame);
  // slowly learn the room's noise floor so the gate adapts to quiet and noisy rooms
  if (level < mic.noise * 3) mic.noise = mic.noise * 0.995 + level * 0.005;
  const gate = Math.max(0.006, mic.noise * 3.2);
  mic.tracker.minLevel = gate;
  const t = a.currentTime - (cfg.frame / 2) / a.sampleRate;
  const muted = t < muteUntil;
  const p = level >= gate && !muted ? yin(frame, a.sampleRate, { fmin: cfg.fmin, fmax: cfg.fmax }) : { freq: 0, clarity: 0 };
  const midiF = p.freq ? ftom(p.freq) + cfg.transpose : null;
  emit('frame', { t, level, freq: p.freq, clarity: p.clarity, midiF, gate, muted });
  if (!muted && level > gate * 2.5 && level > lastLevel * 2.2) emit('onset', { t, level, source: 'mic' });
  lastLevel = level * 0.5 + lastLevel * 0.5;
  const ev = mic.tracker.feed({ t, freq: p.freq, clarity: p.clarity, level });
  if (ev && ev.type === 'start') emit('note', { midi: ev.note.midi, t: ev.note.t, source: 'mic', vel: Math.min(1, level * 6) });
  if (ev && ev.type === 'end') emit('off', { midi: ev.note.midi, t, source: 'mic' });
}
/** 12-bin chroma of the current microphone sound (for chord checks). */
export function micChroma() {
  if (!mic) return null;
  mic.an.getFloatFrequencyData(mic.spec);
  const mag = new Float32Array(mic.spec.length); for (let i = 0; i < mag.length; i++) mag[i] = Math.pow(10, mic.spec[i] / 20);
  return chromaFromSpectrum(mag, audio().sampleRate);
}
export const micLevel = () => lastLevel;

// ---------- Web MIDI ----------
export const midiSupported = () => typeof navigator.requestMIDIAccess === 'function';
export async function startMidi() {
  if (midiAccess) return true;
  if (!midiSupported()) { status.midi = 'unsupported'; emit('status', status); return false; }
  try {
    midiAccess = await navigator.requestMIDIAccess({ sysex: false });
    const bind = () => {
      for (const inp of midiAccess.inputs.values()) if (!midiInputs.has(inp.id)) { inp.onmidimessage = onMidi; midiInputs.set(inp.id, inp); }
      const names = [...midiAccess.inputs.values()].map((i) => i.name).filter(Boolean);
      status.midi = names.length ? 'on' : 'none'; status.midiName = names[0] || ''; emit('status', status);
    };
    midiAccess.onstatechange = bind; bind();
    return true;
  } catch { status.midi = 'denied'; emit('status', status); return false; }
}
const held = new Set();
function onMidi(e) {
  const [st, d1, d2] = e.data; const cmd = st & 0xf0; const t = audio().currentTime;
  if (cmd === 0x90 && d2 > 0) { held.add(d1); emit('note', { midi: d1, t, source: 'midi', vel: d2 / 127 }); }
  else if (cmd === 0x80 || (cmd === 0x90 && d2 === 0)) { held.delete(d1); emit('off', { midi: d1, t, source: 'midi' }); }
  else if (cmd === 0xb0 && d1 === 64) emit('pedal', { down: d2 >= 64, t });
}
export const midiHeld = () => [...held];
export const midiOn = () => status.midi === 'on';

// ---------- on-screen keys / taps ----------
export function touchNote(midi, vel = 0.8) { emit('note', { midi, t: audio().currentTime, source: 'touch', vel }); }
export function touchTap() { emit('onset', { t: audio().currentTime, level: 1, source: 'touch' }); }
