// Practice hub: song library and play-along, metronome with speed trainer, tuner, drone, and the weekly planner.
import { SONGS, songById, arrange } from '../content/songs.js';
import { INSTRUMENTS, byId } from '../content/instruments.js';
import { mountPlayer } from '../player.js';
import { keyFor } from './lesson.js';
import { audio, group, click, note, SOUND_FOR } from '../audio/engine.js';
import * as input from '../audio/input.js';
import { startListening } from '../player.js';
import { state, update, addPractice } from '../state.js';
import { checkAchievements } from '../achievements.js';
import { hasPro, paywall, FREE } from '../gates.js';
import { icon, instIcon } from '../icons.js';
import { esc, toast } from '../util.js';
import { midiToName, pretty, mtof, nameToMidi } from '../core/music.js';
import { tuningWord } from '../core/scoring.js';

const curInst = () => byId(state().profile.instrument) || byId('piano');
const songFree = (s) => s.free;

export function practiceView(root) {
  const inst = curInst();
  root.innerHTML = `<div class="page"><header class="page-head"><h1>Practice</h1><p class="lead">Tools, songs and your weekly plan.</p></header>
    <div class="tile-grid tools">
      <a class="tool-tile big" href="#/tools/metronome">${icon('metronome')}<span><b>Metronome</b><small>Accents, subdivisions, speed trainer</small></span></a>
      <a class="tool-tile big" href="#/tools/tuner">${icon('tuner')}<span><b>Tuner</b><small>Chromatic, with ${esc(inst.short)} strings and notes</small></span></a>
      <a class="tool-tile big" href="#/tools/drone">${icon('drone')}<span><b>Drone</b><small>Hold a reference pitch for scales</small></span></a>
      <a class="tool-tile big" href="#/plan">${icon('calendar')}<span><b>Practice plan</b><small>${state().plan.days.length} days a week · ${state().plan.mins} min</small></span></a>
    </div>
    <section class="sect"><div class="sect-head"><h2>Songs for ${esc(inst.name)}</h2><a class="link" href="#/instruments">Change instrument</a></div>
      <ul class="song-list">${SONGS.map((s) => { const best = state().songs[s.id]?.best; const locked = !songFree(s) && !hasPro();
        return `<li><a href="#/song/${s.id}" class="song-row${locked ? ' locked' : ''}"><span class="lvl l${s.level}">${s.level}</span><span class="st"><b>${esc(s.title)}</b><small>${esc(s.credit)}</small></span>${best ? `<span class="stars sm">${[1, 2, 3].map((k) => `<span class="${k <= best ? 'on' : ''}">${icon('star')}</span>`).join('')}</span>` : locked ? paywall.badgeHTML('Pro') : `<span class="free-pill">Free</span>`}</a></li>`; }).join('')}</ul>
      <p class="muted small">Every song is either public domain (traditional, or by composers who died long ago) or written for this app. Backing tracks are played live by the app.</p></section></div>`;
}

export function songView(root, id) {
  const song = songById(id); if (!song) { location.hash = '#/practice'; return; }
  const inst = curInst();
  if (!songFree(song) && !hasPro()) { root.innerHTML = `<div class="page narrow"><a class="back" href="#/practice">${icon('back')}<span>Practice</span></a><header class="page-head"><h1>${esc(song.title)}</h1><p class="muted">${esc(song.credit)}</p></header>${paywall.lockHTML({ title: 'Part of Pro', text: `${FREE.songs} songs are free. Pro opens the whole library, on every instrument.`, focus: 'pro' })}</div>`; return; }
  const arr = arrange(song, inst);
  root.innerHTML = `<div class="page wide"><a class="back" href="#/practice">${icon('back')}<span>Practice</span></a>
    <header class="song-head"><span class="inst-art sm" style="--ic:${inst.color}">${instIcon(inst.id)}</span><div><h1>${esc(song.title)}</h1><p class="muted small">${esc(song.credit)} · for ${esc(inst.name)} · ${song.time[0]}/${song.time[1]}</p></div></header>
    <div data-r="p"></div></div>`;
  const h = mountPlayer(root.querySelector('[data-r="p"]'), { inst, melody: arr.melody, bpm: song.bpm, mode: 'tempo', chords: arr.chords, style: song.style, time: song.time, key: keyFor(song, arr), octaveFree: inst.octaveFree, show: inst.strings ? 'tab' : 'staff', nextLabel: 'Done', onDone: (r, go) => {
    if (go) { location.hash = '#/practice'; return; }
    if (!r) return;
    update((S) => { const x = S.songs[id] || { best: 0, plays: 0 }; x.plays++; x.best = Math.max(x.best, r.stars || 0); S.songs[id] = x; });
    addPractice({ inst: inst.id, kind: 'song', title: song.title, secs: r.secs || 60, xp: 10 + (r.stars || 0) * 5, score: r.accuracy, id });
    checkAchievements().forEach((a) => toast(`Achievement: ${a.title}`));
  } });
  return () => h.destroy();
}

// ---------- metronome ----------
export function metronomeView(root) {
  const S = { bpm: 80, beats: 4, sub: 1, running: false, trainer: false, step: 4, every: 4, target: 120, tapTimes: [] };
  root.innerHTML = `<div class="page narrow tool"><a class="back" href="#/practice">${icon('back')}<span>Practice</span></a><header class="page-head"><h1>Metronome</h1></header>
    <div class="metro"><div class="beats" data-r="beats"></div>
      <div class="bpm-dial"><button class="ib big" data-a="m">${icon('minus')}</button><div><output data-r="bpm">80</output><small data-r="tname">Andante</small></div><button class="ib big" data-a="p">${icon('plus')}</button></div>
      <input type="range" min="30" max="240" value="80" data-r="slider" aria-label="Tempo">
      <div class="row center"><label class="field-inline">Beats <select data-r="beatsSel">${[2, 3, 4, 5, 6, 7].map((n) => `<option ${n === 4 ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
      <label class="field-inline">Subdivide <select data-r="subSel"><option value="1">Quarter</option><option value="2">Eighths</option><option value="3">Triplets</option><option value="4">Sixteenths</option></select></label>
      <button class="btn ghost sm" data-a="tap">Tap tempo</button></div>
      <details class="trainer"><summary>${icon('bolt')} Speed trainer ${hasPro() ? '' : paywall.badgeHTML('Pro')}</summary>
        <p class="muted small">Raise the tempo automatically: start slow, add a few BPM every few bars, stop at your goal.</p>
        <div class="row center"><label class="field-inline">Add <input type="number" min="1" max="20" value="4" data-r="step"> BPM</label><label class="field-inline">every <input type="number" min="1" max="16" value="4" data-r="every"> bars</label><label class="field-inline">up to <input type="number" min="40" max="240" value="120" data-r="target"></label></div>
        <label class="tog"><input type="checkbox" data-r="trainer"><span>Use speed trainer</span></label></details>
      <button class="btn primary xl" data-a="go">${icon('play')}<span>Start</span></button></div></div>`;
  const R = (n) => root.querySelector(`[data-r="${n}"]`);
  const names = [[40, 'Grave'], [60, 'Largo'], [66, 'Larghetto'], [76, 'Adagio'], [108, 'Andante'], [120, 'Moderato'], [156, 'Allegro'], [176, 'Vivace'], [200, 'Presto'], [999, 'Prestissimo']];
  const draw = () => { R('bpm').textContent = S.bpm; R('slider').value = S.bpm; R('tname').textContent = names.find(([b]) => S.bpm < b)[1]; R('beats').innerHTML = Array.from({ length: S.beats }, (_, i) => `<i class="${i === 0 ? 'acc' : ''}"></i>`).join(''); };
  draw();
  let G = null, timer = 0, next = 0, beat = 0, bar = 0, t0 = 0;
  function sched() {
    const a = audio(); const spb = 60 / S.bpm;
    while (next < a.currentTime + 0.12) {
      const b = beat % S.beats;
      click(next, b === 0, G);
      for (let k = 1; k < S.sub; k++) click(next + k * spb / S.sub, false, G, state().settings.clickVol * 0.45);
      const at = next; const idx = b; setTimeout(() => { R('beats').querySelectorAll('i').forEach((x, i) => x.classList.toggle('on', i === idx)); }, Math.max(0, (at - a.currentTime) * 1000));
      next += spb; beat++;
      if (beat % S.beats === 0) { bar++; if (S.trainer && hasPro() && bar % S.every === 0 && S.bpm < S.target) { S.bpm = Math.min(S.target, S.bpm + S.step); draw(); } }
    }
  }
  function start() { const a = audio(); G = group(1); next = a.currentTime + 0.08; beat = 0; bar = 0; t0 = performance.now(); timer = setInterval(sched, 25); sched(); S.running = true; root.querySelector('[data-a="go"]').innerHTML = `${icon('stop')}<span>Stop</span>`; }
  function stop() { clearInterval(timer); if (G) G.stop(); G = null; S.running = false; root.querySelector('[data-a="go"]').innerHTML = `${icon('play')}<span>Start</span>`; R('beats').querySelectorAll('i').forEach((x) => x.classList.remove('on')); const secs = (performance.now() - t0) / 1000; if (secs > 30) addPractice({ inst: state().profile.instrument, kind: 'tool', title: `Metronome practice at ${S.bpm} BPM`, secs, xp: Math.min(20, Math.round(secs / 30)) }); }
  root.addEventListener('click', (e) => {
    const b = e.target.closest('[data-a]'); if (!b) return;
    if (b.dataset.a === 'm') { S.bpm = Math.max(30, S.bpm - 1); draw(); }
    if (b.dataset.a === 'p') { S.bpm = Math.min(240, S.bpm + 1); draw(); }
    if (b.dataset.a === 'go') S.running ? stop() : start();
    if (b.dataset.a === 'tap') { const t = performance.now(); S.tapTimes = S.tapTimes.filter((x) => t - x < 2500); S.tapTimes.push(t); if (S.tapTimes.length >= 2) { const d = (S.tapTimes[S.tapTimes.length - 1] - S.tapTimes[0]) / (S.tapTimes.length - 1); S.bpm = Math.round(Math.max(30, Math.min(240, 60000 / d))); draw(); } }
  });
  root.addEventListener('input', (e) => {
    const r = e.target.dataset.r;
    if (r === 'slider') { S.bpm = Number(e.target.value); draw(); }
    if (r === 'beatsSel') { S.beats = Number(e.target.value); draw(); }
    if (r === 'subSel') S.sub = Number(e.target.value);
    if (r === 'step') S.step = Number(e.target.value) || 4; if (r === 'every') S.every = Number(e.target.value) || 4; if (r === 'target') S.target = Number(e.target.value) || 120;
    if (r === 'trainer') { if (!hasPro()) { e.target.checked = false; paywall.open({ focus: 'pro' }); return; } S.trainer = e.target.checked; }
  });
  return () => stop();
}

// ---------- tuner ----------
export function tunerView(root) {
  const inst = curInst(); let unsub = []; let ref = 440;
  root.innerHTML = `<div class="page narrow tool"><a class="back" href="#/practice">${icon('back')}<span>Practice</span></a><header class="page-head"><h1>Tuner</h1><p class="muted">${esc(inst.name)}${inst.transpose ? ` · showing written notes (${inst.transpose === 12 ? 'an octave above sounding' : 'transposed'})` : ''}</p></header>
    <div class="tuner"><div class="tuner-note"><b data-r="note">–</b><small data-r="oct"></small></div>
      <div class="gauge"><svg viewBox="0 0 300 160" aria-hidden="true"><path d="M30 150 A120 120 0 0 1 270 150" class="arc"/><path d="M138 33 A120 120 0 0 1 162 33" class="arc ok"/>${Array.from({ length: 11 }, (_, i) => { const a = Math.PI * (1 - i / 10); const x1 = 150 + Math.cos(a) * 112, y1 = 150 - Math.sin(a) * 112, x2 = 150 + Math.cos(a) * 124, y2 = 150 - Math.sin(a) * 124; return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="tick"/>`; }).join('')}<line x1="150" y1="150" x2="150" y2="40" class="ndl" data-r="ndl"/><circle cx="150" cy="150" r="7" class="hub"/></svg></div>
      <p class="meter-read" data-r="read">Press Start and play a note.</p>
      ${inst.strings ? `<div class="tune-strings">${inst.strings.map((s) => midiToName(nameToMidi(s) + inst.transpose)).map((s) => `<span class="ts"><b>${pretty(s.replace(/\d+/, ''))}</b><small>${s.replace(/\D/g, '')}</small></span>`).join('')}</div>` : ''}
      <div class="row center"><label class="field-inline">A4 = <input type="number" min="415" max="466" value="440" data-r="ref"> Hz</label></div>
      <button class="btn primary xl" data-a="go">${icon('mic')}<span>Start</span></button></div></div>`;
  const R = (n) => root.querySelector(`[data-r="${n}"]`);
  let smooth = 0;
  root.addEventListener('input', (e) => { if (e.target.dataset.r === 'ref') ref = Number(e.target.value) || 440; });
  root.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-a]'); if (!b) return;
    if (b.dataset.a === 'go') {
      if (unsub.length) { unsub.forEach((f) => f()); unsub = []; input.stopMic(); b.innerHTML = `${icon('mic')}<span>Start</span>`; return; }
      await startListening(inst); if (!input.micOn()) { R('read').textContent = 'The tuner needs the microphone. Allow it in your browser or device settings.'; return; }
      b.innerHTML = `${icon('stop')}<span>Stop</span>`;
      unsub.push(input.on('frame', (f) => {
        if (!f.midiF || f.clarity < 0.85) return;
        const mf = f.midiF - 12 * Math.log2(ref / 440); const m = Math.round(mf); const c = (mf - m) * 100;
        smooth = smooth * 0.6 + c * 0.4;
        const nm = midiToName(m, false); R('note').textContent = pretty(nm.replace(/\d+/, '')); R('oct').textContent = nm.replace(/\D/g, '');
        const ang = Math.max(-50, Math.min(50, smooth)) / 50 * 75 * Math.PI / 180;
        R('ndl').setAttribute('x2', String(150 + Math.sin(ang) * 110)); R('ndl').setAttribute('y2', String(150 - Math.cos(ang) * 110));
        R('ndl').classList.toggle('good', Math.abs(smooth) <= 5);
        R('read').textContent = `${tuningWord(smooth)} · ${smooth > 0 ? '+' : ''}${Math.round(smooth)} cents`;
        if (inst.strings) root.querySelectorAll('.tune-strings .ts').forEach((x, i) => x.classList.toggle('now', nameToMidi(inst.strings[i]) + inst.transpose === m));
      }));
    }
  });
  return () => { unsub.forEach((f) => f()); };
}

// ---------- drone ----------
export function droneView(root) {
  let nodes = null; let pc = 0, oct = 3;
  root.innerHTML = `<div class="page narrow tool"><a class="back" href="#/practice">${icon('back')}<span>Practice</span></a><header class="page-head"><h1>Drone</h1><p class="lead">A steady tone to tune scales and long notes against. Play your scale over it and listen for smooth, beat-free intervals.</p></header>
    <div class="drone-keys">${['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'].map((n, i) => `<button class="dk${i === 0 ? ' on' : ''}" data-pc="${i}">${n}</button>`).join('')}</div>
    <div class="row center"><label class="field-inline">Octave <select data-r="oct">${[2, 3, 4].map((o) => `<option ${o === 3 ? 'selected' : ''}>${o}</option>`).join('')}</select></label><label class="tog"><input type="checkbox" data-r="fifth" checked><span>Add the fifth</span></label></div>
    <button class="btn primary xl" data-a="go">${icon('play')}<span>Start drone</span></button></div>`;
  const stop = () => { if (nodes) { const a = audio(); nodes.g.gain.setTargetAtTime(0, a.currentTime, 0.1); const n = nodes; setTimeout(() => n.o.forEach((x) => x.stop()), 400); nodes = null; root.querySelector('[data-a="go"]').innerHTML = `${icon('play')}<span>Start drone</span>`; } };
  const start = () => {
    const a = audio(); const g = a.createGain(); g.gain.value = 0; g.connect(a.destination); g.gain.setTargetAtTime(0.16, a.currentTime, 0.2);
    const lp = a.createBiquadFilter(); lp.frequency.value = 1400; lp.connect(g);
    const m = 12 * (oct + 1) + pc; const fs = [mtof(m), mtof(m) * 1.002, root.querySelector('[data-r="fifth"]').checked ? mtof(m + 7) : null].filter(Boolean);
    const o = fs.map((f, i) => { const x = a.createOscillator(); x.type = i === 2 ? 'triangle' : 'sawtooth'; x.frequency.value = f; const gg = a.createGain(); gg.gain.value = i === 2 ? 0.5 : 0.35; x.connect(gg); gg.connect(lp); x.start(); return x; });
    nodes = { g, o }; root.querySelector('[data-a="go"]').innerHTML = `${icon('stop')}<span>Stop</span>`;
  };
  root.addEventListener('click', (e) => {
    const k = e.target.closest('.dk'); if (k) { pc = Number(k.dataset.pc); root.querySelectorAll('.dk').forEach((x) => x.classList.toggle('on', x === k)); if (nodes) { stop(); start(); } }
    const b = e.target.closest('[data-a="go"]'); if (b) nodes ? stop() : start();
  });
  root.addEventListener('change', (e) => { if (e.target.dataset.r === 'oct') { oct = Number(e.target.value); if (nodes) { stop(); start(); } } if (e.target.dataset.r === 'fifth' && nodes) { stop(); start(); } });
  return stop;
}

// ---------- weekly plan ----------
export function planView(root) {
  const P = state().plan; const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  root.innerHTML = `<div class="page narrow"><a class="back" href="#/practice">${icon('back')}<span>Practice</span></a><header class="page-head"><h1>Practice plan</h1><p class="lead">Short, regular practice beats long, rare sessions. Pick your days and how long.</p></header>
    <div class="card pad"><h3>Days</h3><div class="day-pick">${days.map((d, i) => `<button class="dp${P.days.includes(i) ? ' on' : ''}" data-d="${i}" aria-pressed="${P.days.includes(i)}">${d}</button>`).join('')}</div>
    <h3>Minutes per day</h3><div class="seg wide">${[5, 10, 15, 20, 30, 45].map((m) => `<button data-m="${m}" aria-pressed="${P.mins === m}">${m}</button>`).join('')}</div>
    <h3>Each session</h3><ol class="plan-recipe" data-r="recipe"></ol></div></div>`;
  const recipe = () => {
    const m = state().plan.mins; const warm = Math.max(2, Math.round(m * 0.15)), lesson = Math.round(m * 0.45), song = Math.round(m * 0.25), rev = Math.max(1, m - warm - lesson - song);
    root.querySelector('[data-r="recipe"]').innerHTML = `<li><b>${warm} min</b> warm-up: long tones, scales or open strings with the metronome</li><li><b>${lesson} min</b> your next lesson</li><li><b>${song} min</b> a song you are learning, slow then up to speed</li><li><b>${rev} min</b> theory review or ear gym</li>`;
  };
  recipe();
  root.addEventListener('click', (e) => {
    const d = e.target.closest('[data-d]'); if (d) { const i = Number(d.dataset.d); update((S) => { S.plan.days = S.plan.days.includes(i) ? S.plan.days.filter((x) => x !== i) : [...S.plan.days, i].sort(); }); d.classList.toggle('on'); d.setAttribute('aria-pressed', d.classList.contains('on')); }
    const m = e.target.closest('[data-m]'); if (m) { update((S) => { S.plan.mins = Number(m.dataset.m); S.profile.goal = Number(m.dataset.m); }); root.querySelectorAll('[data-m]').forEach((x) => x.setAttribute('aria-pressed', x === m)); recipe(); }
  });
}
