// Lesson step renderers that are not the play-along engine: cards, quizzes, rhythm taps, long tones, chord checks,
// chord changes, strumming, tuning, improvisation, dynamics, breath and range.
import * as M from './core/music.js';
import { scoreRhythm, starsFor, tuningWord } from './core/scoring.js';
import { chordPresent } from './core/pitch.js';
import { audio, group, note, click, clicks, backing, playMelody, SOUND_FOR } from './audio/engine.js';
import * as input from './audio/input.js';
import { startListening, inputLabel } from './player.js';
import { keyboard, chordBox, fretboard, fingeringFor, harpDiagram, handsDiagram, circleDiagram, stringsDiagram, saxDiagram } from './viz/diagrams.js';
import { renderScore, renderKeySig } from './viz/notation.js';
import { GUITAR_CHORDS, byId, voicingMidi } from './content/instruments.js';
import { parseChords, transposeChordSym } from './content/songs.js';
import { state, update } from './state.js';
import { icon } from './icons.js';
import { esc, pick } from './util.js';

const P = M.pretty;
const fmtText = (t) => esc(t).replace(/♯/g, '♯');

/** Render any "viz" description into host. */
export async function renderVisual(host, viz, inst) {
  if (!viz) { host.hidden = true; return; }
  host.hidden = false;
  const k = viz.k;
  if (k === 'keys') keyboard(host, { ...viz, names: state().settings.names });
  else if (k === 'staff') await renderScore(host, { melody: viz.notes, clef: viz.clef, time: viz.time, free: viz.free || !viz.time, barsPerLine: 4, minBar: 120 });
  else if (k === 'keysig') await renderKeySig(host, viz.sig);
  else if (k === 'chordbox') host.innerHTML = chordBox(viz.sym);
  else if (k === 'fretboard') host.innerHTML = fretboard({ inst: byId(viz.inst || 'guitar'), from: viz.from || 0, frets: viz.frets || 5, scale: viz.scale, open: viz.open });
  else if (k === 'tab') { const ins = byId(viz.inst || inst.id); await renderScore(host, { melody: viz.notes, clef: ins.clef, tab: ins, free: true, barsPerLine: 3, minBar: 140 }); }
  else if (k === 'fingering') host.innerHTML = `<div class="fig-wrap">${fingeringFor(inst.id, viz.note)}</div>`;
  else if (k === 'harp') host.innerHTML = harpDiagram(viz);
  else if (k === 'hand') host.innerHTML = handsDiagram();
  else if (k === 'circle') host.innerHTML = circleDiagram();
  else if (k === 'strings') host.innerHTML = stringsDiagram(viz.inst);
}

const stars3 = (n) => `<div class="stars">${[1, 2, 3].map((k) => `<span class="${k <= n ? 'on' : ''}">${icon('star')}</span>`).join('')}</div>`;

// ---------- card ----------
export function cardStep(host, s, inst, done) {
  host.innerHTML = `<div class="step-card"><h2>${fmtText(s.title)}</h2><p class="lead">${fmtText(s.text)}</p><div class="viz-box" data-r="viz"></div><div class="step-go"><button class="btn primary lg" data-a="ok">Got it</button></div></div>`;
  renderVisual(host.querySelector('[data-r="viz"]'), s.viz, inst);
  host.querySelector('[data-a="ok"]').onclick = () => done({ stars: 3, accuracy: 100, secs: 10 });
  return {};
}

// ---------- quiz ----------
export function quizStep(host, s, inst, done) {
  const order = s.opts.map((o, i) => i);
  host.innerHTML = `<div class="step-quiz"><h2>${fmtText(s.q)}</h2><div class="viz-box" data-r="viz"></div><div class="drill-opts">${order.map((i) => `<button class="opt" data-i="${i}">${fmtText(s.opts[i])}</button>`).join('')}</div><div class="drill-fb" data-r="fb" aria-live="polite"></div><div class="step-go"><button class="btn primary" data-a="ok" hidden>Continue</button></div></div>`;
  renderVisual(host.querySelector('[data-r="viz"]'), s.viz, inst);
  let first = null;
  host.addEventListener('click', (e) => {
    const b = e.target.closest('.opt'); if (b && !b.disabled) {
      const i = Number(b.dataset.i); const ok = i === s.a; if (first == null) first = ok;
      b.classList.add(ok ? 'ok' : 'bad'); b.disabled = true;
      const fb = host.querySelector('[data-r="fb"]'); fb.className = 'drill-fb ' + (ok ? 'ok' : 'bad'); fb.innerHTML = `<b>${ok ? 'Correct!' : 'Not quite, try another.'}</b> ${ok ? fmtText(s.why || '') : ''}`;
      if (ok) { host.querySelectorAll('.opt').forEach((x) => (x.disabled = true)); const go = host.querySelector('[data-a="ok"]'); go.hidden = false; go.focus(); }
    }
    if (e.target.closest('[data-a="ok"]')) done({ stars: first ? 3 : 1, accuracy: first ? 100 : 50, secs: 12 });
  });
  return {};
}

// ---------- rhythm (tap, clap or play) ----------
export function rhythmStep(host, s, inst, done) {
  const toks = s.pattern.split(/\s+/);
  const mel = toks.map((t) => (t.endsWith('r') ? `R/${t.slice(0, -1)}` : `B4/${t}`)).join(' ');
  const ev = M.parseMelody(mel);
  const total = M.totalBeats(ev); const bar = 4; const bars = Math.ceil(total / bar);
  host.innerHTML = `<div class="step-rhythm"><p class="lead">${fmtText(s.text)}</p><div class="viz-box score-plain" data-r="score"></div>
    <div class="rh-ctl"><div class="tempo"><button class="ib" data-a="slower" aria-label="Slower">${icon('minus')}</button><output>${s.bpm}</output><span class="unit">BPM</span><button class="ib" data-a="faster" aria-label="Faster">${icon('plus')}</button></div><label class="tog"><input type="checkbox" data-a="mic"><span>Listen for claps</span></label></div>
    <button class="tap-pad big" data-a="tap" aria-label="Tap the rhythm">Tap</button>
    <div class="drill-fb" data-r="fb" aria-live="polite">Press Start: four clicks count you in. Tap the pad, press the space bar, or play any note.</div>
    <div class="step-go"><button class="btn primary lg" data-a="go">${icon('play')}<span>Start</span></button></div><div class="pl-result" data-r="res" hidden></div></div>`;
  const R = (n) => host.querySelector(`[data-r="${n}"]`);
  let bpm = s.bpm; let score = null; let G = null; let unsub = []; let running = false;
  renderScore(R('score'), { melody: mel + (total % bar ? ` R/${{ 1: 'q', 2: 'h', 3: 'h.' }[bar - (total % bar)]}` : ''), clef: 'treble', time: [4, 4], barsPerLine: 2 }).then((h) => (score = h));
  const tap = () => { const p = host.querySelector('[data-a="tap"]'); p.classList.add('hit'); setTimeout(() => p.classList.remove('hit'), 90); input.touchTap(); };
  const key = (e) => { if (e.code === 'Space' && running) { e.preventDefault(); tap(); } };
  document.addEventListener('keydown', key);
  host.addEventListener('pointerdown', (e) => { if (e.target.closest('[data-a="tap"]')) { e.preventDefault(); tap(); } });
  host.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-a]'); if (!b) return;
    if (b.dataset.a === 'slower' || b.dataset.a === 'faster') { if (running) return; bpm = Math.max(40, Math.min(160, bpm + (b.dataset.a === 'faster' ? 4 : -4))); host.querySelector('.rh-ctl output').textContent = bpm; }
    if (b.dataset.a === 'go') go();
    if (b.dataset.a === 'next') done(host._res);
  });
  async function go() {
    if (running) return; running = true; R('res').hidden = true;
    if (host.querySelector('[data-a="mic"]').checked) await input.startMic();
    const a = audio(); const spb = 60 / bpm; const t0 = a.currentTime + 0.2 + 4 * spb;
    G = group(1); clicks(t0 - 4 * spb, bpm, 4, 4, G); clicks(t0, bpm, bars * bar, 4, G);
    const expected = ev.filter((x) => !x.rest).map((x) => t0 + x.t * spb);
    const taps = [];
    window.__rhythm = { t0, spb, expected }; // test hook
    const add = (t) => { if (t > t0 - 0.35) { taps.push(t); const i = expected.findIndex((x) => Math.abs(x - t) < 0.2); const ei = ev.filter((x) => !x.rest)[i]; if (ei && score) score.mark(ev.indexOf(ei), 'ok'); } };
    unsub = [input.on('onset', (o) => add(o.t - (o.source === 'mic' ? state().settings.latency : 0))), input.on('note', (n) => { if (n.source !== 'mic') add(n.t); })];
    R('fb').textContent = '1, 2, 3, 4…';
    const tick = () => { if (!running) return; const beat = (a.currentTime - t0) / spb; if (score) score.cursor(beat >= 0 && beat <= total ? beat : null); if (beat >= 0 && beat < 0.2) R('fb').textContent = 'Tap!'; if (beat > total + 0.8) return finish(); requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
    function finish() {
      running = false; unsub.forEach((f) => f()); score && score.cursor(null);
      const r = scoreRhythm(expected, taps); host._res = { stars: r.stars, accuracy: r.accuracy, secs: total * spb + 6 };
      R('res').innerHTML = `<div class="res-card">${stars3(r.stars)}<h3>${r.accuracy}% in time</h3><p class="muted small">${r.counts.perfect + r.counts.good} on the beat · ${r.counts.early} early · ${r.counts.late} late · ${r.counts.miss} missed${r.extras ? ` · ${r.extras} extra` : ''}</p><div class="row"><button class="btn ghost" data-a="go">${icon('restart')}<span>Again</span></button><button class="btn primary" data-a="next">Continue</button></div></div>`;
      R('res').hidden = false; R('fb').textContent = '';
    }
  }
  return { destroy() { running = false; document.removeEventListener('keydown', key); unsub.forEach((f) => f()); if (G) G.stop(); } };
}

// ---------- long tone / pitch match ----------
export function toneStep(host, s, inst, done) {
  const target = M.nameToMidi(s.note);
  const fig = s.anyPitch ? '' : fingeringFor(inst.id, s.note);
  host.innerHTML = `<div class="step-tone"><p class="lead">${fmtText(s.text)}</p>
    <div class="tone-grid"><div class="tone-target"><span class="big-note">${s.anyPitch ? '♪' : P(s.note.replace(/\d+/, ''))}</span>${s.anyPitch ? '' : `<small>${s.note.replace(/\D/g, '')}</small>`}${fig ? `<div class="fig-wrap sm">${fig}</div>` : ''}</div>
    <div class="meter"><div class="meter-scale"><span>Flat</span><span>In tune</span><span>Sharp</span></div><div class="meter-track"><i class="zone"></i><b class="needle" data-r="needle"></b></div><div class="meter-read" data-r="read">Waiting for sound…</div>
    <div class="hold"><div class="hold-bar"><i data-r="bar"></i></div><span data-r="secs">0.0 / ${s.secs} s</span></div></div></div>
    <div class="step-go"><button class="btn ghost" data-a="demo">${icon('sound')}<span>Hear it</span></button><button class="btn primary lg" data-a="go">${icon('mic')}<span>Start listening</span></button></div><div class="pl-result" data-r="res" hidden></div></div>`;
  const R = (n) => host.querySelector(`[data-r="${n}"]`);
  let held = 0, last = null, cents = [], unsub = [], finished = false;
  host.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-a]'); if (!b) return;
    if (b.dataset.a === 'demo') { const G = group(1); const t = audio().currentTime + 0.05; note(target - inst.transpose, t, 1.6, SOUND_FOR[inst.id], G, 0.8); input.muteMic(t + 1.9); }
    if (b.dataset.a === 'go') {
      const ok = await startListening(inst);
      if (!input.micOn()) { R('read').textContent = 'This step needs the microphone. Allow it in your browser or device settings, then try again.'; return; }
      b.disabled = true; b.querySelector('span').textContent = 'Listening…';
      unsub.push(input.on('frame', (f) => {
        if (finished) return;
        const t = f.t;
        if (!f.midiF || f.clarity < 0.82) { R('read').textContent = f.level > f.gate ? 'Hold a steady note…' : 'Play or sing the note…'; last = null; return; }
        let d = (f.midiF - target) * 100;
        if (s.octaveFree || inst.octaveFree || s.anyPitch) d = ((d % 1200) + 1800) % 1200 - 600;
        if (s.anyPitch) d = Math.round(f.midiF) === f.midiF ? 0 : ((f.midiF - Math.round(f.midiF)) * 100);
        const nm = P(M.midiToName(Math.round(f.midiF)).replace(/\d+/, ''));
        const close = Math.abs(d) <= (s.anyPitch ? 50 : 35);
        R('needle').style.left = `${50 + Math.max(-50, Math.min(50, d))}%`; R('needle').className = 'needle ' + (Math.abs(d) <= 12 ? 'good' : close ? 'near' : 'off');
        R('read').textContent = Math.abs(d) > 150 ? `Hearing ${nm}. Aim for ${s.anyPitch ? 'any steady note' : P(s.note.replace(/\d+/, ''))}.` : `${nm}: ${tuningWord(d)} (${d > 0 ? '+' : ''}${Math.round(d)} cents)`;
        if (close) { if (last != null) held += Math.min(0.1, t - last); last = t; cents.push(Math.abs(d)); } else last = null;
        R('bar').style.width = `${Math.min(100, (held / s.secs) * 100)}%`; R('secs').textContent = `${held.toFixed(1)} / ${s.secs} s`;
        if (held >= s.secs) finish();
      }));
    }
    if (b.dataset.a === 'next') done(host._res);
    if (b.dataset.a === 'again') { host._res = null; held = 0; cents = []; finished = false; R('res').hidden = true; }
  });
  function finish() {
    finished = true; const avg = cents.reduce((a, b) => a + b, 0) / Math.max(1, cents.length);
    const stars = avg <= 10 ? 3 : avg <= 18 ? 2 : 1; host._res = { stars, accuracy: Math.round(Math.max(0, 100 - avg * 2)), secs: s.secs + 5 };
    R('res').innerHTML = `<div class="res-card">${stars3(stars)}<h3>${stars === 3 ? 'Rock steady!' : stars === 2 ? 'Nice and steady.' : 'You held it!'}</h3><p class="muted small">Average ${Math.round(avg)} cents from the center.</p><div class="row"><button class="btn ghost" data-a="again">${icon('restart')}<span>Again</span></button><button class="btn primary" data-a="next">Continue</button></div></div>`;
    R('res').hidden = false;
  }
  return { destroy() { unsub.forEach((f) => f()); } };
}

// ---------- chord check ----------
function chordTarget(s, inst) {
  if (s.voicing) { const ms = s.voicing.split('+').map(M.nameToMidi); return { midis: ms, pc: ms[0] % 12, q: M.parseChord(s.sym).q }; }
  const c = M.parseChord(s.sym); return { midis: voicingMidi(GUITAR_CHORDS[s.sym].frets), pc: c.pc, q: c.q };
}
export function chordStep(host, s, inst, done) {
  const tg = chordTarget(s, inst);
  const isGuitar = !s.voicing;
  host.innerHTML = `<div class="step-chord"><p class="lead">${fmtText(s.text)}</p><div class="chord-row"><div class="viz-box" data-r="viz"></div>
    <div class="chord-live"><div class="ring" data-r="ring"><span data-r="name">${P(s.sym)}</span></div><p class="muted small" data-r="msg">Press Start, then play the chord and let it ring.</p></div></div>
    <div class="step-go"><button class="btn ghost" data-a="demo">${icon('sound')}<span>Hear it</span></button><button class="btn primary lg" data-a="go">${icon('mic')}<span>Start</span></button></div><div class="pl-result" data-r="res" hidden></div></div>`;
  const R = (n) => host.querySelector(`[data-r="${n}"]`);
  if (isGuitar) R('viz').innerHTML = chordBox(s.sym);
  else keyboard(R('viz'), { from: 'C3', to: 'B4', hl: s.voicing.split('+'), label: true, onKey: (m) => { note(m, audio().currentTime, 0.6, 'piano', null, 0.7); input.touchNote(m); } });
  let timer = 0, unsub = [], good = 0, finished = false; const startT = performance.now();
  const held = new Set();
  host.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-a]'); if (!b) return;
    if (b.dataset.a === 'demo') { const G = group(1); const t = audio().currentTime + 0.05; tg.midis.forEach((m, i) => note(m - (isGuitar ? 0 : inst.transpose), t + (isGuitar ? i * 0.025 : 0), 1.8, isGuitar ? 'guitar' : 'piano', G, 0.7)); input.muteMic(t + 2.2); }
    if (b.dataset.a === 'go') {
      await startListening(inst); b.disabled = true; R('msg').textContent = inputLabel().k === 'touch' ? 'Tap the three marked keys.' : 'Listening… play the chord.';
      // MIDI or on-screen keys: all chord notes held (or tapped within 1.5 s)
      const recent = [];
      unsub.push(input.on('note', (n) => {
        if (n.source === 'mic' || finished) return;
        recent.push(n); const now = n.t; while (recent.length && now - recent[0].t > 1.5) recent.shift();
        const pcs = new Set(recent.map((x) => x.midi % 12)); const need = M.CHORDS[tg.q].iv.map((i) => (tg.pc + i) % 12);
        if (need.every((p) => pcs.has(p))) win();
      }));
      // microphone: chroma check, sustained for about half a second
      timer = setInterval(() => {
        if (finished || !input.micOn()) return;
        const ch = input.micChroma(); if (!ch || input.micLevel() < 0.01) { good = Math.max(0, good - 1); R('ring').className = 'ring'; return; }
        const r = chordPresent(ch, tg.pc, tg.q);
        good = r.ok ? good + 1 : Math.max(0, good - 1);
        R('ring').className = 'ring ' + (r.ok ? 'good' : 'hearing');
        R('msg').textContent = r.ok ? 'That is it, let it ring…' : `Hearing ${P(M.pcName(r.best.root, true))}${M.CHORDS[r.best.q].sym}. Check each string.`;
        if (good >= 6) win();
      }, 90);
    }
    if (b.dataset.a === 'next') done(host._res);
  });
  function win() {
    if (finished) return; finished = true; clearInterval(timer);
    R('ring').className = 'ring good done';
    const secs = (performance.now() - startT) / 1000; const stars = secs < 20 ? 3 : secs < 45 ? 2 : 1;
    host._res = { stars, accuracy: 100, secs };
    R('res').innerHTML = `<div class="res-card">${stars3(stars)}<h3>${P(s.sym)} sounds great!</h3><div class="row"><button class="btn primary" data-a="next">Continue</button></div></div>`; R('res').hidden = false;
  }
  return { destroy() { clearInterval(timer); unsub.forEach((f) => f()); } };
}

// ---------- chord changes / strumming ----------
export function changesStep(host, s, inst, done) {
  const strum = s.t === 'strum';
  const chords = strum ? [s.sym] : s.chords;
  const beatsEach = strum ? 4 : s.beats || 4;
  const rounds = strum ? s.bars || 2 : 2;
  const slots = strum ? s.pattern.split('') : null; // 8 eighth-note slots: D, U or -
  host.innerHTML = `<div class="step-changes"><p class="lead">${fmtText(s.text)}</p>
    <div class="ch-boxes">${chords.map((c, i) => `<div class="ch-box" data-i="${i}">${chordBox(c, { size: 0.8 })}</div>`).join('')}</div>
    ${strum ? `<div class="strum-row" aria-label="Strum pattern">${slots.map((x, i) => `<span class="sl ${x === 'D' ? 'd' : x === 'U' ? 'u' : 'r'}" data-k="${i}"><b>${x === 'D' ? '↓' : x === 'U' ? '↑' : '·'}</b><small>${i % 2 ? '&' : i / 2 + 1}</small></span>`).join('')}</div>` : ''}
    <div class="rh-ctl"><div class="tempo"><button class="ib" data-a="slower" aria-label="Slower">${icon('minus')}</button><output>${s.bpm}</output><span class="unit">BPM</span><button class="ib" data-a="faster" aria-label="Faster">${icon('plus')}</button></div></div>
    <div class="drill-fb" data-r="fb" aria-live="polite">${strum ? 'Strum along with the clicks. The app listens for the chord and the rhythm.' : 'Change chords on beat 1. The app checks each chord.'}</div>
    <div class="step-go"><button class="btn primary lg" data-a="go">${icon('play')}<span>Start</span></button></div><div class="pl-result" data-r="res" hidden></div></div>`;
  const R = (n) => host.querySelector(`[data-r="${n}"]`);
  let bpm = s.bpm, running = false, G = null, iv = 0, unsub = [];
  host.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-a]'); if (!b) return;
    if (b.dataset.a === 'slower' || b.dataset.a === 'faster') { if (running) return; bpm = Math.max(40, Math.min(160, bpm + (b.dataset.a === 'faster' ? 4 : -4))); host.querySelector('.rh-ctl output').textContent = bpm; }
    if (b.dataset.a === 'go') go();
    if (b.dataset.a === 'next') done(host._res);
  });
  async function go() {
    if (running) return; running = true; R('res').hidden = true;
    await startListening(inst);
    const a = audio(); const spb = 60 / bpm; const t0 = a.currentTime + 0.25 + 4 * spb; G = group(1);
    const seq = []; for (let r = 0; r < rounds; r++) chords.forEach((c) => seq.push(c));
    const total = seq.length * beatsEach;
    clicks(t0 - 4 * spb, bpm, 4, 4, G); clicks(t0, bpm, total, beatsEach, G);
    const hits = seq.map(() => ({ good: 0, n: 0 }));
    const onsets = [];
    unsub = [input.on('onset', (o) => onsets.push(o.t - (o.source === 'mic' ? state().settings.latency : 0)))];
    R('fb').textContent = 'Count in: 1, 2, 3, 4';
    iv = setInterval(() => {
      const beat = (a.currentTime - t0) / spb;
      if (beat < 0) return;
      const ci = Math.floor(beat / beatsEach);
      if (ci >= seq.length) return finish();
      const name = seq[ci];
      host.querySelectorAll('.ch-box').forEach((x) => x.classList.toggle('now', chords[Number(x.dataset.i)] === name));
      if (slots) { const k = Math.floor((beat % 4) * 2); host.querySelectorAll('.sl').forEach((x) => x.classList.toggle('now', Number(x.dataset.k) === k)); }
      R('fb').textContent = `${P(name)}${seq[ci + 1] && seq[ci + 1] !== name ? `  →  next: ${P(seq[ci + 1])}` : ''}`;
      // judge the chord in the second half of its time (after the change has settled)
      if ((beat % beatsEach) > beatsEach * 0.35 && input.micOn()) {
        const ch = input.micChroma(); if (ch && input.micLevel() > 0.008) { const c = M.parseChord(name); const r = chordPresent(ch, c.pc, c.q); hits[ci].n++; if (r.ok) hits[ci].good++; }
      }
    }, 60);
    function finish() {
      clearInterval(iv); running = false; unsub.forEach((f) => f());
      host.querySelectorAll('.ch-box, .sl').forEach((x) => x.classList.remove('now'));
      const chordScore = hits.filter((h) => h.n > 2 && h.good / h.n > 0.4).length / seq.length;
      let rhythmAcc = null;
      if (slots) {
        const exp = []; for (let bar = 0; bar < rounds; bar++) slots.forEach((x, k) => { if (x !== '-') exp.push(t0 + (bar * 4 + k / 2) * spb); });
        rhythmAcc = scoreRhythm(exp, onsets).accuracy;
      }
      const acc = Math.round(100 * (slots ? 0.5 * chordScore + 0.5 * (rhythmAcc / 100) : chordScore));
      const stars = !input.micOn() ? 1 : starsFor(acc);
      host._res = { stars: Math.max(1, stars), accuracy: acc, secs: total * spb + 5 };
      R('res').innerHTML = `<div class="res-card">${stars3(Math.max(1, stars))}<h3>${input.micOn() ? `${Math.round(chordScore * 100)}% of chords clean${rhythmAcc != null ? ` · ${rhythmAcc}% in rhythm` : ''}` : 'Done. Turn on the microphone for feedback.'}</h3><div class="row"><button class="btn ghost" data-a="go">${icon('restart')}<span>Again</span></button><button class="btn primary" data-a="next">Continue</button></div></div>`;
      R('res').hidden = false; R('fb').textContent = '';
    }
  }
  return { destroy() { clearInterval(iv); unsub.forEach((f) => f()); if (G) G.stop(); } };
}

// ---------- tuner step ----------
export function tuneStep(host, s, inst, done) {
  const targets = s.strings.map(M.nameToMidi);
  host.innerHTML = `<div class="step-tune"><p class="lead">${fmtText(s.text)}</p><div class="tune-strings">${s.strings.map((n, i) => `<button class="ts" data-i="${i}"><b>${P(n.replace(/\d+/, ''))}</b><small>${n.replace(/\D/g, '')}</small></button>`).join('')}</div>
    <div class="meter"><div class="meter-scale"><span>Flat</span><span>In tune</span><span>Sharp</span></div><div class="meter-track"><i class="zone"></i><b class="needle" data-r="needle"></b></div><div class="meter-read" data-r="read">Press Start and play one string.</div></div>
    <div class="step-go"><button class="btn primary lg" data-a="go">${icon('mic')}<span>Start tuner</span></button><button class="btn ghost" data-a="ok">I'm in tune</button></div></div>`;
  const R = (n) => host.querySelector(`[data-r="${n}"]`); let unsub = []; const tuned = new Set(); const hold = {};
  host.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-a], .ts'); if (!b) return;
    if (b.classList.contains('ts')) { const m = targets[Number(b.dataset.i)]; const G = group(1); note(m - inst.transpose, audio().currentTime + 0.05, 2, SOUND_FOR[inst.id], G, 0.8); input.muteMic(audio().currentTime + 2.3); }
    if (b.dataset.a === 'go') {
      await startListening(inst); b.disabled = true;
      unsub.push(input.on('frame', (f) => {
        if (!f.midiF || f.clarity < 0.85) return;
        let bi = 0; targets.forEach((m, i) => { if (Math.abs(f.midiF - m) < Math.abs(f.midiF - targets[bi])) bi = i; });
        const d = (f.midiF - targets[bi]) * 100; if (Math.abs(d) > 300) return;
        host.querySelectorAll('.ts').forEach((x, i) => x.classList.toggle('now', i === bi));
        R('needle').style.left = `${50 + Math.max(-50, Math.min(50, d))}%`; R('needle').className = 'needle ' + (Math.abs(d) <= 5 ? 'good' : Math.abs(d) <= 15 ? 'near' : 'off');
        R('read').textContent = `${P(s.strings[bi].replace(/\d+/, ''))} string: ${Math.abs(d) <= 5 ? 'in tune' : d < 0 ? `tune up (${Math.round(d)} cents)` : `tune down (+${Math.round(d)} cents)`}`;
        hold[bi] = Math.abs(d) <= 5 ? (hold[bi] || 0) + 1 : 0;
        if (hold[bi] > 12) { tuned.add(bi); host.querySelectorAll('.ts')[bi].classList.add('ok'); }
      }));
    }
    if (b.dataset.a === 'ok') done({ stars: tuned.size >= s.strings.length ? 3 : tuned.size ? 2 : 1, accuracy: 100, secs: 40 });
  });
  return { destroy() { unsub.forEach((f) => f()); } };
}

// ---------- improvisation ----------
export function improvStep(host, s, inst, done) {
  const scalePcs = s.scale.map((n) => M.nameToMidi(n + '4') % 12);
  const chords = parseChords(s.chords);
  host.innerHTML = `<div class="step-improv"><p class="lead">${fmtText(s.text)}</p>
    <div class="impro-scale">${s.scale.map((n) => `<span>${P(n)}</span>`).join('')}</div>
    <div class="impro-board"><div><b data-r="n">0</b><span>notes</span></div><div><b data-r="in">0%</b><span>in the scale</span></div><div><b data-r="var">0</b><span>different notes</span></div></div>
    <div class="impro-chord" data-r="chord"></div><div class="pl-keys" data-r="keys"></div>
    <div class="step-go"><button class="btn primary lg" data-a="go">${icon('play')}<span>Start the band</span></button></div><div class="pl-result" data-r="res" hidden></div></div>`;
  const R = (n) => host.querySelector(`[data-r="${n}"]`);
  if (inst.id === 'piano' || inst.id === 'harp') keyboard(R('keys'), { from: 'A3', to: 'C5', hl: s.scale.map((n) => n + (['A', 'B'].includes(n[0]) ? '3' : '4')).map((x) => M.midiToName(M.nameToMidi(x))), label: true, onKey: (m) => { note(m, audio().currentTime, 0.4, 'piano', null, 0.7); input.touchNote(m); } });
  let G = null, iv = 0, unsub = [], played = [];
  host.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-a]'); if (!b) return;
    if (b.dataset.a === 'go') {
      b.disabled = true; await startListening(inst);
      const a = audio(); const spb = 60 / s.bpm; const t0 = a.currentTime + 0.3 + 4 * spb; G = group(1);
      clicks(t0 - 4 * spb, s.bpm, 4, 4, G);
      const cc = chords.map((c) => ({ ...c, sym: transposeChordSym(c.sym, 0) }));
      backing(cc, { bpm: s.bpm, t0, style: s.style || 'blues', G });
      const end = t0 + chords.reduce((x, c) => x + c.beats, 0) * spb;
      unsub.push(input.on('note', (n) => {
        if (n.t < t0) return; played.push(n.midi);
        const inS = played.filter((m) => scalePcs.includes(m % 12)).length;
        R('n').textContent = played.length; R('in').textContent = Math.round(100 * inS / played.length) + '%'; R('var').textContent = new Set(played.map((m) => m % 12)).size;
      }));
      iv = setInterval(() => {
        const beat = (a.currentTime - t0) / spb; const c = chords.find((x) => beat >= x.t && beat < x.t + x.beats);
        R('chord').textContent = c ? `Now: ${P(c.sym)}` : beat < 0 ? 'Count in…' : '';
        if (a.currentTime > end + 0.3) finish();
      }, 100);
    }
    if (b.dataset.a === 'next') done(host._res);
  });
  function finish() {
    clearInterval(iv); unsub.forEach((f) => f());
    const inS = played.filter((m) => scalePcs.includes(m % 12)).length; const pct = played.length ? Math.round(100 * inS / played.length) : 0;
    const variety = new Set(played.map((m) => m % 12)).size;
    const stars = played.length < 6 ? 1 : pct >= 85 && variety >= 4 ? 3 : pct >= 65 ? 2 : 1;
    host._res = { stars, accuracy: pct, secs: s.secs };
    R('res').innerHTML = `<div class="res-card">${stars3(stars)}<h3>${played.length} notes, ${pct}% in the scale</h3><p class="muted small">${variety >= 4 ? 'Good variety.' : 'Next time, try using more of the scale.'} Leaving space between phrases sounds musical too.</p><div class="row"><button class="btn primary" data-a="next">Continue</button></div></div>`;
    R('res').hidden = false;
  }
  return { destroy() { clearInterval(iv); unsub.forEach((f) => f()); if (G) G.stop(); } };
}

// ---------- dynamics (soft then loud) ----------
export function dynamicsStep(host, s, inst, done) {
  host.innerHTML = `<div class="step-dyn"><p class="lead">${fmtText(s.text)}</p><div class="dyn-row"><div class="dyn" data-r="p"><span>p</span><small>soft</small><i></i></div><div class="dyn" data-r="f"><span>f</span><small>loud</small><i></i></div></div>
    <div class="pl-keys" data-r="keys"></div><div class="drill-fb" data-r="fb">Press Start. Play ${P(s.note.replace(/\d/, ''))} softly first.</div>
    <div class="step-go"><button class="btn primary lg" data-a="go">${icon('play')}<span>Start</span></button></div><div class="pl-result" data-r="res" hidden></div></div>`;
  const R = (n) => host.querySelector(`[data-r="${n}"]`); let unsub = []; let phase = 0; const lv = [];
  keyboard(R('keys'), { from: 'C4', to: 'B4', hl: [s.note], label: true, onKey: (m) => input.touchNote(m, 0.5) });
  host.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-a]'); if (!b) return;
    if (b.dataset.a === 'go') {
      b.disabled = true; await startListening(inst);
      unsub.push(input.on('note', (n) => {
        if (phase > 1) return; const v = n.vel ?? 0.6; lv[phase] = v;
        const box = R(phase ? 'f' : 'p'); box.querySelector('i').style.height = `${Math.round(v * 100)}%`; box.classList.add('done');
        phase++;
        if (phase === 1) R('fb').textContent = 'Now play it loudly.';
        if (phase === 2) { const ok = lv[1] > lv[0] * 1.25; R('fb').textContent = ok ? 'Clear difference. Well done.' : 'They sounded similar. Try a bigger contrast.'; host._res = { stars: ok ? 3 : 1, accuracy: ok ? 100 : 50, secs: 20 }; R('res').innerHTML = `<div class="res-card">${stars3(ok ? 3 : 1)}<div class="row"><button class="btn ghost" data-a="redo">${icon('restart')}<span>Again</span></button><button class="btn primary" data-a="next">Continue</button></div></div>`; R('res').hidden = false; }
      }));
      if (s.pedal) unsub.push(input.on('pedal', (p) => { R('fb').textContent = p.down ? 'Pedal down.' : 'Pedal up.'; }));
    }
    if (b.dataset.a === 'redo') { phase = 0; R('res').hidden = true; host.querySelectorAll('.dyn').forEach((x) => { x.classList.remove('done'); x.querySelector('i').style.height = '0'; }); R('fb').textContent = 'Softly first.'; }
    if (b.dataset.a === 'next') done(host._res);
  });
  return { destroy() { unsub.forEach((f) => f()); } };
}

// ---------- breath (sustain any sound) ----------
export function breathStep(host, s, inst, done) {
  host.innerHTML = `<div class="step-tone"><p class="lead">${fmtText(s.text)}</p><div class="breath-orb" data-r="orb"><b data-r="t">0.0</b><small>seconds</small></div>
    <div class="step-go"><button class="btn primary lg" data-a="go">${icon('mic')}<span>Start</span></button></div><div class="pl-result" data-r="res" hidden></div></div>`;
  const R = (n) => host.querySelector(`[data-r="${n}"]`); let unsub = []; let t0 = null, best = 0, lastT = 0;
  host.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-a]'); if (!b) return;
    if (b.dataset.a === 'go') {
      await input.startMic(); if (!input.micOn()) { R('t').textContent = '–'; host.querySelector('.lead').textContent = 'This exercise needs the microphone. Allow it in Settings, then try again.'; return; }
      b.disabled = true;
      unsub.push(input.on('frame', (f) => {
        const on = f.level > f.gate * 1.6;
        if (on) { if (t0 == null) t0 = f.t; lastT = f.t; } else if (t0 != null && f.t - lastT > 0.35) { best = Math.max(best, lastT - t0); t0 = null; if (best >= 3) finish(); }
        const cur = t0 != null ? f.t - t0 : 0; R('t').textContent = Math.max(cur, 0).toFixed(1); R('orb').style.setProperty('--p', Math.min(1, cur / s.secs)); R('orb').classList.toggle('on', on);
      }));
    }
    if (b.dataset.a === 'next') done(host._res);
  });
  function finish() {
    unsub.forEach((f) => f()); unsub = [];
    const stars = best >= s.secs ? 3 : best >= s.secs * 0.6 ? 2 : 1; host._res = { stars, accuracy: Math.min(100, Math.round(100 * best / s.secs)), secs: best + 5 };
    R('res').innerHTML = `<div class="res-card">${stars3(stars)}<h3>${best.toFixed(1)} seconds</h3><p class="muted small">Aim for ${s.secs} seconds of even sound. It grows with daily practice.</p><div class="row"><button class="btn primary" data-a="next">Continue</button></div></div>`; R('res').hidden = false;
  }
  return { destroy() { unsub.forEach((f) => f()); } };
}

// ---------- vocal range ----------
export function rangeStep(host, s, inst, done) {
  host.innerHTML = `<div class="step-tone"><p class="lead">${fmtText(s.text)}</p><div class="range-box"><div><small>Lowest</small><b data-r="lo">–</b></div><div><small>Highest</small><b data-r="hi">–</b></div></div><p class="muted small" data-r="type"></p>
    <div class="step-go"><button class="btn primary lg" data-a="go">${icon('mic')}<span>Start</span></button><button class="btn ghost" data-a="ok" hidden>Save my range</button></div></div>`;
  const R = (n) => host.querySelector(`[data-r="${n}"]`); let unsub = []; let lo = 200, hi = 0; const run = [];
  host.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-a]'); if (!b) return;
    if (b.dataset.a === 'go') {
      await input.startMic(); if (!input.micOn()) { R('type').textContent = 'This needs the microphone.'; return; }
      b.disabled = true; host.querySelector('[data-a="ok"]').hidden = false;
      unsub.push(input.on('frame', (f) => {
        if (!f.midiF || f.clarity < 0.9) { run.length = 0; return; }
        const m = Math.round(f.midiF); run.push(m); if (run.length > 8) run.shift();
        if (run.length >= 8 && run.every((x) => Math.abs(x - m) <= 1)) { lo = Math.min(lo, m); hi = Math.max(hi, m); R('lo').textContent = P(M.midiToName(lo)); R('hi').textContent = P(M.midiToName(hi)); R('type').textContent = voiceType(lo, hi); }
      }));
    }
    if (b.dataset.a === 'ok') { if (hi > 0) update((S) => { S.voiceRange = { lo, hi }; }); done({ stars: hi - lo >= 12 ? 3 : 2, accuracy: 100, secs: 30 }); }
  });
  return { destroy() { unsub.forEach((f) => f()); } };
}
export function voiceType(lo, hi) {
  if (hi - lo < 7) return 'Keep sliding to find more of your range.';
  const mid = (lo + hi) / 2;
  const t = mid >= 69 ? 'soprano' : mid >= 64 ? 'mezzo-soprano or alto' : mid >= 59 ? 'alto or tenor' : mid >= 54 ? 'baritone' : 'bass';
  return `Your comfortable range suggests ${t} territory. Range is only one clue; a teacher listens for tone and comfort too.`;
}
