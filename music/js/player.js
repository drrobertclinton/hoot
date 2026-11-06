// The play-along engine used by lessons, songs and sight-reading: notation or falling notes, wait mode or in-time
// mode, backing band, metronome, and live scoring from the microphone, a MIDI keyboard or on-screen keys.
import { parseMelody, midiToName, pretty, nameToMidi } from './core/music.js';
import { scorePerformance, WaitFollower, scoreCopy, starsFor } from './core/scoring.js';
import { audio, group, playMelody, clicks, backing, note as synthNote, SOUND_FOR } from './audio/engine.js';
import * as input from './audio/input.js';
import { renderScore } from './viz/notation.js';
import { keyboard, rangeFor, fingeringFor } from './viz/diagrams.js';
import { fallingNotes } from './viz/falling.js';
import { transposeChordSym } from './content/songs.js';
import { state, update } from './state.js';
import { icon } from './icons.js';
import { esc, el, $, clamp } from './util.js';

const KEYS_INSTR = new Set(['piano', 'harp', 'theory']);

/** Start listening for this instrument according to the input setting. Returns a short status label. */
export async function startListening(inst) {
  input.configure(inst);
  const pref = state().settings.input;
  if ((pref === 'auto' || pref === 'midi') && input.midiSupported()) await input.startMidi();
  if ((pref === 'auto' && !input.midiOn()) || pref === 'mic') await input.startMic();
  if (pref === 'auto' && input.midiOn() && !KEYS_INSTR.has(inst.id)) await input.startMic();
  return inputLabel();
}
export function inputLabel() {
  const st = input.status;
  if (st.midi === 'on' && state().settings.input !== 'mic') return { k: 'midi', text: st.midiName ? `MIDI: ${st.midiName}` : 'MIDI keyboard' };
  if (st.mic === 'on') return { k: 'mic', text: 'Listening' };
  if (st.mic === 'denied') return { k: 'touch', text: 'Microphone is off. Use the on-screen keys, or allow the microphone in Settings.' };
  return { k: 'touch', text: 'The microphone turns on when you press Start' };
}

export function mountPlayer(host, o) {
  const inst = o.inst; const S = state().settings;
  const isKeys = KEYS_INSTR.has(inst.id) || o.forceKeys;
  const ev = parseMelody(o.melody);
  const allNotes = ev.flatMap((e) => e.notes);
  const st = { bpm: o.bpm || 72, mode: o.mode || 'wait', backing: !!(o.chords && o.chords.length) && o.backing !== false, view: o.show === 'falling' ? 'falling' : 'staff', running: false, G: null, unsub: [], raf: 0, done: false, keysOn: isKeys || !!o.touchKeys };
  const showTab = o.show === 'tab' && inst.strings;
  host.innerHTML = `
  <div class="player ${o.compact ? 'compact' : ''}">
    <div class="pl-bar">
      <button class="btn ghost sm" data-a="listen" aria-label="Listen to it first">${icon('sound')}<span>Listen</span></button>
      <div class="seg" role="group" aria-label="Mode">
        <button data-a="mode" data-v="wait" aria-pressed="${st.mode === 'wait'}">Wait for me</button>
        <button data-a="mode" data-v="tempo" aria-pressed="${st.mode === 'tempo'}">In time</button>
      </div>
      <div class="tempo" aria-label="Tempo"><button class="ib" data-a="slower" aria-label="Slower">${icon('minus')}</button><output data-o="bpm">${st.bpm}</output><span class="unit">BPM</span><button class="ib" data-a="faster" aria-label="Faster">${icon('plus')}</button></div>
      ${o.chords && o.chords.length ? `<label class="tog"><input type="checkbox" data-a="backing" ${st.backing ? 'checked' : ''}><span>Band</span></label>` : ''}
      ${inst.id === 'piano' ? `<div class="seg" role="group" aria-label="View"><button data-a="view" data-v="staff" aria-pressed="${st.view === 'staff'}">Notes</button><button data-a="view" data-v="falling" aria-pressed="${st.view === 'falling'}">Falling</button></div>` : ''}
    </div>
    <div class="pl-stage">
      <div class="score-scroll" data-r="scroll"><div class="score" data-r="score"><div class="score-loading">Preparing the music…</div></div></div>
      <canvas class="falling" data-r="falling" hidden></canvas>
    </div>
    <div class="pl-feedback" aria-live="polite"><span class="fb" data-r="fb">${st.mode === 'wait' ? 'Press Start, then play each note when it lights up.' : 'Press Start. You get one bar of clicks first.'}</span><span class="hear" data-r="hear"></span></div>
    <div class="pl-help" data-r="help"></div>
    <div class="pl-keys" data-r="keys" ${st.keysOn ? '' : 'hidden'}></div>
    <div class="pl-actions">
      <button class="btn primary lg" data-a="start">${icon('play')}<span>Start</span></button>
      ${!isKeys ? `<button class="btn ghost sm" data-a="touch" aria-pressed="${st.keysOn}">${icon('touch')}<span>On-screen keys</span></button>` : ''}
      <span class="chip in" data-r="input"></span>
    </div>
    <div class="pl-result" data-r="result" hidden></div>
  </div>`;
  const P = host.firstElementChild; const R = (n) => P.querySelector(`[data-r="${n}"]`);
  let score = null, kb = null, fall = null;

  // ---- notation ----
  const clef = o.clef || (inst.clef === 'grand' ? (Math.min(...allNotes) < 57 && Math.max(...allNotes) >= 60 ? 'grand' : Math.max(...allNotes) < 60 ? 'bass' : 'treble') : inst.clef);
  const fingers = o.fingers || null;
  async function drawScore() {
    try {
      score = await renderScore(R('score'), { melody: o.melody, clef, time: o.time || [4, 4], key: o.key || 'C', tab: showTab ? inst : null, positions: o.positions, fingers, names: o.names ?? (S.names !== 'off' && o.level !== 'adv' ? S.names : null), scroller: R('scroll') });
    } catch (e) { R('score').innerHTML = `<p class="muted">The notation could not be drawn on this device.</p>`; }
  }
  drawScore();

  // ---- keyboard ----
  function drawKeys() {
    if (!st.keysOn) { R('keys').hidden = true; return; }
    R('keys').hidden = false;
    const [from, to] = rangeFor(allNotes.length ? allNotes : [60, 72]);
    kb = keyboard(R('keys'), { from, to, mark: fingers || {}, onKey: (m) => { synthNote(m - inst.transpose, audio().currentTime, 0.5, SOUND_FOR[inst.id] || 'piano', null, 0.7); input.touchNote(m); }, label: true, names: S.names });
    R('keys').classList.toggle('scroll', kb.width > 520);
  }
  drawKeys();
  function setView(v) {
    st.view = v; R('scroll').hidden = v === 'falling'; R('falling').hidden = v !== 'falling';
    if (v === 'falling') { if (!st.keysOn) { st.keysOn = true; drawKeys(); } setupFalling(); }
    P.querySelectorAll('[data-a="view"]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.v === v));
  }
  function setupFalling() {
    if (fall) fall.stop();
    const spb = 60 / st.bpm;
    const list = []; ev.forEach((e, i) => { if (!e.rest) e.notes.forEach((m) => list.push({ midi: m, t: e.t * spb, dur: e.beats * spb * 0.95, i, finger: fingers && fingers[midiToName(m)], black: [1, 3, 6, 8, 10].includes(m % 12) })); });
    fall = fallingNotes(R('falling'), kb, list, { secsVisible: 3.2 });
    fall.start(() => (st.running && st.mode === 'tempo' ? audio().currentTime - st.t0 : (st.waitT || 0) - 0.25));
  }
  if (st.view === 'falling') setTimeout(() => setView('falling'), 0);

  // ---- helper (fingering of the current note) ----
  function helpFor(i) {
    const e = ev[i]; if (!e || e.rest) return;
    const nm = e.names[e.names.length - 1];
    const fig = fingeringFor(inst.id, nm);
    R('help').innerHTML = fig ? `<div class="help-fig"><div class="help-note">${esc(pretty(nm.replace(/\d+/, '')))}<small>${esc(nm.replace(/[^\d]/g, ''))}</small></div>${fig}</div>` : '';
  }

  // ---- input chip ----
  const chip = () => { const l = inputLabel(); R('input').innerHTML = `${icon(l.k === 'midi' ? 'midi' : l.k === 'mic' ? 'mic' : 'touch')}<span>${esc(l.text)}</span>`; R('input').dataset.k = l.k; };
  chip();
  st.unsub.push(input.on('status', chip));
  st.unsub.push(input.on('frame', (f) => {
    if (!f.midiF || f.clarity < 0.85) { R('hear').textContent = ''; return; }
    const m = Math.round(f.midiF); R('hear').textContent = `Hearing ${pretty(midiToName(m).replace(/\d+/, ''))}`;
  }));

  // ---- controls ----
  P.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-a]'); if (!b) return;
    const a = b.dataset.a;
    if (a === 'mode' && !st.running) { st.mode = b.dataset.v; P.querySelectorAll('[data-a="mode"]').forEach((x) => x.setAttribute('aria-pressed', x.dataset.v === st.mode)); feedback(st.mode === 'wait' ? 'The music waits for each note.' : 'Plays in time with a count-in.'); }
    if (a === 'slower' || a === 'faster') { if (st.running) return; st.bpm = clamp(st.bpm + (a === 'faster' ? 4 : -4), 30, 220); P.querySelector('[data-o="bpm"]').textContent = st.bpm; if (st.view === 'falling') setupFalling(); }
    if (a === 'view') setView(b.dataset.v);
    if (a === 'touch') { st.keysOn = !st.keysOn; b.setAttribute('aria-pressed', st.keysOn); drawKeys(); }
    if (a === 'listen') listen();
    if (a === 'start') { if (st.running) stop(true); else start(); }
    if (a === 'retry') { R('result').hidden = true; start(); }
    if (a === 'next') { o.onDone && o.onDone(st.result, true); }
  });
  P.addEventListener('change', (e) => { if (e.target.dataset.a === 'backing') st.backing = e.target.checked; });

  function feedback(text, cls = '') { const f = R('fb'); f.textContent = text; f.className = 'fb ' + cls; }
  const spb = () => 60 / st.bpm;
  const concertChords = () => (o.chords || []).map((c) => ({ ...c, sym: transposeChordSym(c.sym, -inst.transpose) }));

  function listen() {
    if (st.running) return;
    stopAudio();
    const pm = playMelody(o.melody, { bpm: st.bpm, inst: inst.id, transpose: inst.transpose });
    st.G = pm.group; input.muteMic(pm.end + 0.3);
    if (st.backing && o.chords) backing(concertChords(), { bpm: st.bpm, t0: pm.start, style: o.style || 'pop', time: o.time || [4, 4], G: st.G });
    let i = 0; const tick = () => {
      const now = audio().currentTime; if (now > pm.end + 0.1 || !st.G) { score && score.current(-1); score && score.cursor(null); return; }
      while (i < pm.times.length - 1 && now >= pm.times[i + 1].t) i++;
      if (score) score.current(i);
      if (kb && !pm.times[i].rest && now >= pm.times[i].t && now < pm.times[i].t + 0.15) pm.times[i].notes.forEach((m) => kb.flash(m, 'demo', 200));
      st.raf = requestAnimationFrame(tick);
    };
    st.raf = requestAnimationFrame(tick);
    feedback('Listen first. Press Start when you are ready.');
  }
  function stopAudio() { cancelAnimationFrame(st.raf); if (st.G) { st.G.stop(); st.G = null; } }

  async function start() {
    stopAudio();
    st.done = false; st.result = null; R('result').hidden = true;
    score && score.clearMarks(); fall && fall.reset();
    await startListening(inst); chip();
    st.running = true; st.started = performance.now();
    const btn = P.querySelector('[data-a="start"]'); btn.innerHTML = `${icon('stop')}<span>Stop</span>`; btn.classList.add('stop');
    P.classList.add('running');
    if (st.mode === 'wait') runWait(); else runTempo();
  }
  function stop(user) {
    st.running = false; stopAudio(); st.unsubRun && st.unsubRun.forEach((f) => f()); st.unsubRun = [];
    const btn = P.querySelector('[data-a="start"]'); if (btn) { btn.innerHTML = `${icon('play')}<span>Start</span>`; btn.classList.remove('stop'); }
    P.classList.remove('running');
    score && score.cursor(null); kb && kb.target([]);
    if (user) feedback('Stopped. Press Start to try again.');
  }

  // ---- wait mode ----
  function runWait() {
    const useAll = input.midiOn() || (st.keysOn && !input.micOn());
    const steps = []; const idx = [];
    ev.forEach((e, i) => { if (e.rest) return; steps.push({ notes: useAll ? e.notes : [Math.max(...e.notes)] }); idx.push(i); });
    const fol = new WaitFollower(steps, { octaveFree: !!o.octaveFree });
    let last = 0;
    const show = () => {
      const i = idx[fol.i]; if (i == null) return;
      score && score.current(i); helpFor(i); kb && kb.target(steps[fol.i].notes);
      st.waitT = ev[i].t * spb();
      const nm = ev[i].names.map((n) => pretty(n.replace(/\d+/, ''))).join(' + ');
      feedback(`Play ${nm}`);
    };
    show();
    st.unsubRun = [input.on('note', (n) => {
      if (!st.running) return;
      if (n.source === 'mic' && n.t < last) return;
      const i = idx[fol.i]; const r = fol.play(n.midi);
      if (r === 'hit') { score && score.mark(i, 'ok'); fall && fall.mark(i, 'ok'); kb && kb.flash(n.midi, 'good'); last = n.t; if (fol.done) return finish(fol.result()); show(); }
      else if (r === 'wrong') { score && score.mark(i, 'bad'); kb && kb.flash(n.midi, 'bad'); const want = steps[fol.i].notes.map((m) => pretty(midiToName(m).replace(/\d+/, ''))).join(' + '); feedback(`That was ${pretty(midiToName(n.midi).replace(/\d+/, ''))}. Look for ${want}.`, 'warn'); }
    })];
  }

  // ---- in-time mode ----
  function runTempo() {
    const a = audio(); const s = spb(); const time = o.time || [4, 4]; const perBar = time[1] === 8 ? time[0] / 3 : time[0];
    const countBeats = time[1] === 8 ? 2 : time[0];
    const countSpb = time[1] === 8 ? s * 1.5 : s;
    const t0 = a.currentTime + 0.25 + countBeats * countSpb; st.t0 = t0;
    window.__play = { t0, spb: s, events: ev }; // test hook
    st.G = group(1);
    const total = ev.reduce((x, e) => x + e.beats, 0);
    const useAll = input.midiOn();
    clicks(t0 - countBeats * countSpb, 60 / countSpb, countBeats, countBeats, st.G);
    if (st.backing && o.chords) backing(concertChords(), { bpm: st.bpm, t0, style: o.style || 'pop', time, G: st.G });
    else clicks(t0, time[1] === 8 ? st.bpm / 1.5 : st.bpm, Math.round(total / (time[1] === 8 ? 1.5 : 1)), perBar, st.G);
    const expected = []; ev.forEach((e, i) => { if (e.rest) return; (useAll ? e.notes : [Math.max(...e.notes)]).forEach((m) => expected.push({ midi: m, t: t0 + e.t * s, i })); });
    const played = [];
    const end = t0 + total * s;
    const lat = S.latency || 0;
    feedback('Count in… 1, 2, 3, 4', 'count');
    st.unsubRun = [input.on('note', (n) => {
      if (!st.running) return;
      const t = n.t - (n.source === 'mic' ? lat : 0.0);
      if (t < t0 - 0.3) return;
      played.push({ midi: n.midi, t });
      // live marking: nearest unmatched expected note within the window
      let best = null, bd = 0.25;
      for (const x of expected) { if (x.hit) continue; const d = Math.abs(x.t - t); if (d < bd) { bd = d; best = x; } }
      if (best) {
        const ok = best.midi === n.midi || (o.octaveFree && (best.midi - n.midi) % 12 === 0);
        if (ok) { best.hit = true; score && score.mark(best.i, bd < 0.14 ? 'ok' : 'late'); fall && fall.mark(best.i, 'ok'); kb && kb.flash(n.midi, 'good'); }
        else { score && score.mark(best.i, 'bad'); fall && fall.mark(best.i, 'bad'); kb && kb.flash(n.midi, 'bad'); }
      }
    })];
    const tick = () => {
      if (!st.running) return;
      const now = a.currentTime; const beat = (now - t0) / s;
      if (now < t0) { const c = Math.floor((now - (t0 - countBeats * countSpb)) / countSpb) + 1; feedback(c >= 1 ? `Count in… ${Array.from({ length: Math.min(c, countBeats) }, (_, k) => k + 1).join(', ')}` : 'Get ready…', 'count'); }
      else if (beat <= total) {
        score && score.cursor(beat);
        let i = ev.findIndex((e) => beat >= e.t && beat < e.t + e.beats); if (i >= 0 && i !== st.lastI) { st.lastI = i; helpFor(Math.min(ev.length - 1, i + (beat - ev[i].t > ev[i].beats * 0.6 ? 1 : 0))); kb && kb.target(ev[i].rest ? [] : ev[i].notes); feedback('Play!'); }
        // mark misses as they pass
        for (const x of expected) if (!x.hit && !x.missed && now > x.t + 0.3) { x.missed = true; score && !score.notes[x.i].el?.classList.contains('bad') && score.mark(x.i, 'miss'); }
      }
      if (now > end + 0.5) {
        const r = scorePerformance(expected.map((x) => ({ midi: x.midi, t: x.t, i: x.i })), played, { octaveFree: !!o.octaveFree });
        return finish({ accuracy: r.accuracy, timing: r.timing, stars: r.stars, counts: r.counts });
      }
      st.raf = requestAnimationFrame(tick);
    };
    st.raf = requestAnimationFrame(tick);
  }

  function finish(r) {
    stop(false); st.done = true; st.result = { ...r, secs: (performance.now() - st.started) / 1000, mode: st.mode, bpm: st.bpm };
    const stars = r.stars; const msg = stars === 3 ? 'Brilliant!' : stars === 2 ? 'Great work!' : stars === 1 ? 'Good start!' : 'Keep at it!';
    const res = R('result');
    res.innerHTML = `<div class="res-card"><div class="stars big">${[1, 2, 3].map((k) => `<span class="${k <= stars ? 'on' : ''}">${icon('star')}</span>`).join('')}</div>
      <h3>${msg}</h3>
      <div class="res-stats"><div><b>${r.accuracy}%</b><span>Accuracy</span></div>${r.timing != null ? `<div><b>${r.timing}%</b><span>Timing</span></div>` : `<div><b>${r.mistakes ?? 0}</b><span>Slips</span></div>`}<div><b>${st.bpm}</b><span>BPM</span></div></div>
      ${r.counts ? `<p class="muted small">${r.counts.perfect} perfect · ${r.counts.good} good · ${r.counts.early + r.counts.late} early or late · ${r.counts.wrong} wrong · ${r.counts.miss} missed</p>` : ''}
      ${stars < 2 && st.mode === 'tempo' ? '<p class="tip">Tip: slow it down a few BPM, or switch to "Wait for me" to learn the notes first.</p>' : ''}
      <div class="row"><button class="btn ghost" data-a="retry">${icon('restart')}<span>Try again</span></button>${o.nextLabel !== false ? `<button class="btn primary" data-a="next"><span>${esc(o.nextLabel || 'Continue')}</span></button>` : ''}</div></div>`;
    res.hidden = false; res.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    feedback(stars >= 2 ? 'Nicely done.' : 'Finished. Try again or move on.');
    o.onDone && o.onDone(st.result, false);
  }

  return {
    el: P,
    destroy() { stop(false); st.unsub.forEach((f) => f()); fall && fall.stop(); },
    start, listen,
  };
}

/** Listen-and-copy: the app plays a phrase, then listens for you to play it back. */
export function mountCopy(host, o) {
  const inst = o.inst; const model = parseMelody(o.melody).filter((e) => !e.rest).map((e) => Math.max(...e.notes));
  const isKeys = KEYS_INSTR.has(inst.id);
  const st = { phase: 'idle', played: [], unsub: [], keysOn: isKeys, bpm: o.bpm || 76 };
  host.innerHTML = `<div class="player copy">
    <div class="copy-stage"><div class="copy-orb" data-r="orb">${icon('ear')}</div><p class="copy-msg" data-r="msg">Listen to the phrase, then play it back.</p>
    <div class="copy-dots" data-r="dots">${model.map(() => '<i></i>').join('')}</div></div>
    <div class="pl-keys" data-r="keys" ${st.keysOn ? '' : 'hidden'}></div>
    <div class="pl-actions"><button class="btn primary lg" data-a="go">${icon('sound')}<span>Play the phrase</span></button>
    ${!isKeys ? `<button class="btn ghost sm" data-a="touch" aria-pressed="${st.keysOn}">${icon('touch')}<span>On-screen keys</span></button>` : ''}
    <button class="btn ghost sm" data-a="done" hidden>I'm done</button><span class="chip in" data-r="input"></span></div>
    <div class="pl-result" data-r="result" hidden></div></div>`;
  const P = host.firstElementChild; const R = (n) => P.querySelector(`[data-r="${n}"]`);
  let kb = null;
  const drawKeys = () => { if (!st.keysOn) { R('keys').hidden = true; return; } R('keys').hidden = false; const [f, t] = rangeFor(model); kb = keyboard(R('keys'), { from: f, to: t, label: true, names: state().settings.names, onKey: (m) => { synthNote(m - inst.transpose, audio().currentTime, 0.5, SOUND_FOR[inst.id] || 'piano', null, 0.7); input.touchNote(m); } }); };
  drawKeys();
  const chip = () => { const l = inputLabel(); R('input').innerHTML = `${icon(l.k === 'midi' ? 'midi' : l.k === 'mic' ? 'mic' : 'touch')}<span>${esc(l.text)}</span>`; };
  chip(); st.unsub.push(input.on('status', chip));
  let G = null, timer = 0;
  const dots = () => R('dots').querySelectorAll('i');
  async function go() {
    clearTimeout(timer); if (G) G.stop(); st.played = []; dots().forEach((d) => d.className = '');
    await startListening(inst); chip();
    st.phase = 'listen'; R('orb').className = 'copy-orb play'; R('msg').textContent = 'Listen…';
    const pm = playMelody(o.melody, { bpm: st.bpm, inst: inst.id, transpose: inst.transpose }); G = pm.group; input.muteMic(pm.end + 0.25);
    timer = setTimeout(() => { st.phase = 'copy'; R('orb').className = 'copy-orb rec'; R('msg').textContent = 'Your turn: play it back.'; P.querySelector('[data-a="done"]').hidden = false; }, (pm.end - audio().currentTime + 0.25) * 1000);
  }
  st.unsub.push(input.on('note', (n) => {
    if (st.phase !== 'copy') return;
    st.played.push(n.midi); const d = dots()[st.played.length - 1];
    if (d) d.className = (n.midi === model[st.played.length - 1] || (o.octaveFree && (n.midi - model[st.played.length - 1]) % 12 === 0)) ? 'ok' : 'bad';
    kb && kb.flash(n.midi, 'good');
    clearTimeout(timer);
    if (st.played.length >= model.length) timer = setTimeout(done, 500); else timer = setTimeout(done, 3500);
  }));
  function done() {
    if (st.phase !== 'copy') return; st.phase = 'idle'; clearTimeout(timer);
    P.querySelector('[data-a="done"]').hidden = true; R('orb').className = 'copy-orb';
    const r = scoreCopy(model, st.played, { octaveFree: !!o.octaveFree });
    const stars = r.stars;
    R('msg').textContent = stars === 3 ? 'Exactly right!' : stars >= 1 ? `${r.lcs} of ${model.length} notes right.` : 'Not quite. Listen again and try.';
    const res = R('result');
    res.innerHTML = `<div class="res-card"><div class="stars big">${[1, 2, 3].map((k) => `<span class="${k <= stars ? 'on' : ''}">${icon('star')}</span>`).join('')}</div><h3>${r.accuracy}% match</h3>
      <p class="muted small">The phrase was: ${model.map((m) => pretty(midiToName(m).replace(/\d+/, ''))).join(' ')}</p>
      <div class="row"><button class="btn ghost" data-a="go">${icon('restart')}<span>Try again</span></button><button class="btn primary" data-a="next"><span>Continue</span></button></div></div>`;
    res.hidden = false;
    o.onDone && o.onDone({ accuracy: r.accuracy, stars, secs: 20 }, false);
  }
  P.addEventListener('click', (e) => {
    const b = e.target.closest('[data-a]'); if (!b) return;
    if (b.dataset.a === 'go') { R('result').hidden = true; go(); }
    if (b.dataset.a === 'done') done();
    if (b.dataset.a === 'touch') { st.keysOn = !st.keysOn; b.setAttribute('aria-pressed', st.keysOn); drawKeys(); }
    if (b.dataset.a === 'next') o.onDone && o.onDone(null, true);
  });
  return { destroy() { clearTimeout(timer); if (G) G.stop(); st.unsub.forEach((f) => f()); } };
}

/** Random reading exercise (quarter and half notes from a pool). */
export function sightMelody(pool, bars = 4, seed = Date.now()) {
  let r = seed % 2147483647 || 7; const rnd = () => ((r = (r * 16807) % 2147483647) / 2147483647);
  const out = []; let prev = Math.floor(pool.length / 2);
  for (let b = 0; b < bars; b++) {
    const pat = b === bars - 1 ? ['h', 'h'] : rnd() < 0.5 ? ['q', 'q', 'q', 'q'] : rnd() < 0.5 ? ['q', 'q', 'h'] : ['h', 'q', 'q'];
    for (const d of pat) { const step = Math.round((rnd() - 0.5) * 4); prev = clamp(prev + (step === 0 ? 1 : step), 0, pool.length - 1); out.push(`${pool[prev]}/${d}`); }
  }
  out[out.length - 1] = `${pool[0]}/h`;
  return out.join(' ');
}
