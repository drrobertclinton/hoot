// Lesson player: steps one at a time, progress bar, scoring, completion celebration.
import { findLesson, nextLesson } from '../content/courses.js';
import { byId } from '../content/instruments.js';
import { songById, arrange } from '../content/songs.js';
import { mountPlayer, mountCopy, sightMelody } from '../player.js';
import { runDrill } from '../drills.js';
import * as St from '../steps.js';
import { renderScore } from '../viz/notation.js';
import { playMelody, audio } from '../audio/engine.js';
import * as input from '../audio/input.js';
import { state, finishLesson, levelOf, streakAlive } from '../state.js';
import { checkAchievements } from '../achievements.js';
import { hasPro, paywall } from '../gates.js';
import { icon, instIcon } from '../icons.js';
import { esc, confetti } from '../util.js';
import { parseMelody } from '../core/music.js';

const INTERACTIVE = new Set(['play', 'copy', 'rhythm', 'tone', 'chord', 'changes', 'strum', 'improv', 'drill', 'song', 'sight', 'dynamics', 'breath', 'range', 'quiz', 'tune']);

export function lessonView(root, id) {
  const lesson = findLesson(id);
  if (!lesson) { root.innerHTML = `<div class="page"><p>That lesson was not found.</p><a class="btn" href="#/learn">Back to lessons</a></div>`; return; }
  const inst = lesson.inst === 'theory' ? { ...byId('piano'), id: 'theory', name: 'Music Theory' } : byId(lesson.inst);
  const theInst = lesson.inst === 'theory' ? byId('piano') : inst;
  if (!lesson.free && !hasPro()) {
    root.innerHTML = `<div class="page narrow lesson-lock"><a class="back" href="#/course/${lesson.inst}">${icon('back')}<span>Back</span></a><div class="lock-hero">${instIcon(lesson.inst)}<h1>${esc(lesson.title)}</h1><p class="lead">${esc(lesson.sub)}</p></div>${paywall.lockHTML({ title: 'Part of Pro', text: 'The first unit of every course is free. Pro opens every lesson, song and drill on every instrument.', focus: 'pro' })}</div>`;
    return;
  }
  const steps = lesson.steps; let si = 0; const results = []; let cur = null; const t0 = performance.now();
  root.innerHTML = `<div class="lesson" style="--ic:${inst.color || 'var(--accent)'}">
    <header class="lesson-top"><a class="ib close" href="#/course/${lesson.inst}" aria-label="Close lesson">${icon('close')}</a>
      <div class="lesson-prog" role="progressbar" aria-label="Lesson progress" aria-valuemin="0" aria-valuemax="${steps.length}"><i data-r="bar"></i></div>
      <button class="skip" data-a="skip">Skip</button></header>
    <div class="lesson-title"><span class="li">${instIcon(lesson.inst)}</span><div><small>${esc(inst.name)}</small><h1>${esc(lesson.title)}</h1></div></div>
    <main class="lesson-body" data-r="body"></main></div>`;
  const body = root.querySelector('[data-r="body"]');
  const bar = root.querySelector('[data-r="bar"]');
  root.querySelector('[data-a="skip"]').onclick = () => advance({ stars: 0, accuracy: 0, secs: 0, skipped: true });

  function show() {
    if (cur && cur.destroy) cur.destroy(); cur = null;
    bar.style.width = `${(si / steps.length) * 100}%`; bar.parentElement.setAttribute('aria-valuenow', si);
    if (si >= steps.length) return complete();
    const s = steps[si]; body.innerHTML = ''; body.scrollTop = 0; window.scrollTo(0, 0);
    root.querySelector('[data-a="skip"]').hidden = !INTERACTIVE.has(s.t) || s.t === 'quiz';
    const host = document.createElement('div'); host.className = 'step step-' + s.t; body.appendChild(host);
    const done = (r) => advance(r || { stars: 1, accuracy: 0, secs: 0 });
    const pdone = (r, go) => { if (r) host._last = r; if (go) advance(host._last || r || { stars: 1 }); };
    switch (s.t) {
      case 'card': cur = St.cardStep(host, s, theInst, done); break;
      case 'quiz': cur = St.quizStep(host, s, theInst, done); break;
      case 'rhythm': cur = St.rhythmStep(host, s, theInst, done); break;
      case 'tone': cur = St.toneStep(host, s, theInst, done); break;
      case 'chord': cur = St.chordStep(host, s, theInst, done); break;
      case 'changes': case 'strum': cur = St.changesStep(host, s, theInst, done); break;
      case 'tune': cur = St.tuneStep(host, s, theInst, done); break;
      case 'improv': cur = St.improvStep(host, s, theInst, done); break;
      case 'dynamics': cur = St.dynamicsStep(host, s, theInst, done); break;
      case 'breath': cur = St.breathStep(host, s, theInst, done); break;
      case 'range': cur = St.rangeStep(host, s, theInst, done); break;
      case 'drill': cur = runDrill(host, s, { onDone: done }); break;
      case 'listen': cur = listenStep(host, s, theInst, done); break;
      case 'copy': host.innerHTML = `<p class="lead">${esc(s.text)}</p><div data-r="p"></div>`; cur = mountCopy(host.querySelector('[data-r="p"]'), { inst: theInst, melody: s.melody, bpm: s.bpm, octaveFree: s.octaveFree || theInst.octaveFree, onDone: pdone }); break;
      case 'play': case 'sight': {
        const melody = s.t === 'sight' ? sightMelody(s.pool, s.bars || 4) : s.melody;
        const clef = s.t === 'sight' ? s.clef : s.clef;
        host.innerHTML = `<p class="lead">${esc(s.text || 'Read the notes, then play them in time.')}</p><div data-r="p"></div>`;
        cur = mountPlayer(host.querySelector('[data-r="p"]'), { inst: theInst, melody, bpm: s.bpm, mode: s.t === 'sight' ? 'tempo' : s.mode, show: s.show, fingers: s.fingers, time: s.time, clef, chords: s.chords ? parseCh(s.chords) : null, style: 'pop', octaveFree: s.octaveFree || theInst.octaveFree, positions: s.positions, names: s.t === 'sight' ? null : undefined, onDone: pdone, forceKeys: lesson.inst === 'theory' });
        break;
      }
      case 'song': {
        const song = songById(s.id); const arr = arrange(song, theInst);
        host.innerHTML = `<div class="song-head"><div><h2>${esc(song.title)}</h2><p class="muted small">${esc(song.credit)}</p></div></div><p class="lead">${esc(s.text)}</p><div data-r="p"></div>`;
        cur = mountPlayer(host.querySelector('[data-r="p"]'), { inst: theInst, melody: arr.melody, bpm: s.bpm || song.bpm, mode: 'tempo', chords: arr.chords, style: song.style, time: song.time, key: keyFor(song, arr), octaveFree: s.octaveFree || theInst.octaveFree, show: theInst.strings ? 'tab' : 'staff', onDone: pdone });
        break;
      }
      default: host.innerHTML = `<p>${esc(s.text || '')}</p><button class="btn primary" data-a="ok">Continue</button>`; host.querySelector('[data-a="ok"]').onclick = () => done({ stars: 1 });
    }
  }
  function advance(r) { if (si >= steps.length) return; results[si] = { ...r, t: steps[si].t }; si++; show(); }
  function complete() {
    input.stopMic();
    const scored = results.filter((r) => r && INTERACTIVE.has(r.t) && !r.skipped);
    const avg = scored.length ? scored.reduce((a, r) => a + (r.stars || 0), 0) / scored.length : 3;
    const stars = Math.max(1, Math.round(avg));
    const secs = (performance.now() - t0) / 1000;
    const before = levelOf().level;
    const { gained } = finishLesson(lesson, stars, secs);
    const L = levelOf(); const streak = streakAlive();
    const newAch = checkAchievements();
    const nxt = nextLesson(lesson);
    bar.style.width = '100%'; root.querySelector('[data-a="skip"]').hidden = true;
    body.innerHTML = `<div class="complete"><div class="stars big">${[1, 2, 3].map((k) => `<span class="${k <= stars ? 'on' : ''}">${icon('star')}</span>`).join('')}</div>
      <h2>Lesson complete!</h2><p class="lead">${esc(lesson.title)}</p>
      <div class="res-stats"><div><b>+${gained}</b><span>XP</span></div><div><b>${streak}</b><span>day streak</span></div><div><b>${L.level}</b><span>level</span></div></div>
      ${L.level > before ? `<p class="levelup">${icon('sparkle')} Level ${L.level} reached!</p>` : ''}
      ${newAch.length ? `<div class="ach-new">${newAch.map((a) => `<div class="ach on"><span>${icon(a.icon)}</span><div><b>${esc(a.title)}</b><small>${esc(a.text)}</small></div></div>`).join('')}</div>` : ''}
      <div class="row">${nxt ? `<a class="btn primary lg" href="#/lesson/${nxt.id}">Next: ${esc(nxt.title)}</a>` : ''}<a class="btn ghost" href="#/course/${lesson.inst}">Back to course</a></div></div>`;
    if (stars >= 2) confetti(root);
  }
  show();
  return () => { if (cur && cur.destroy) cur.destroy(); };
}
const parseCh = (txt) => { const out = []; let t = 0; for (const tok of txt.split(/\s+/)) { const [sym, b] = tok.split(':'); out.push({ sym, beats: Number(b), t }); t += Number(b); } return out; };
function keyFor(song, arr) {
  const k = song.key.replace('m', '');
  if (song.key.endsWith('m')) return 'C';
  const shift = arr.writtenKeyShift || 0;
  const order = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
  const i = order.indexOf(k === 'F#' ? 'F#' : k); return order[(i + shift + 12) % 12];
}
export { keyFor };

function listenStep(host, s, inst, done) {
  host.innerHTML = `<p class="lead">${esc(s.text)}</p><div class="score-scroll short"><div class="score" data-r="score"></div></div><div class="step-go"><button class="btn ghost lg" data-a="play">${icon('play')}<span>Listen</span></button><button class="btn primary lg" data-a="ok">Continue</button></div>`;
  let score = null, pm = null, raf = 0;
  const notes = parseMelody(s.melody).flatMap((e) => e.notes);
  const clef = inst.clef === 'grand' ? (Math.max(...notes) < 60 ? 'bass' : Math.min(...notes) < 57 ? 'grand' : 'treble') : inst.clef;
  renderScore(host.querySelector('[data-r="score"]'), { melody: s.melody, clef, tab: s.show === 'tab' && inst.strings ? inst : null, fingers: s.fingers, names: state().settings.names !== 'off' ? state().settings.names : null }).then((h) => { score = h; });
  const inst2 = s.inst ? byId(s.inst) || inst : inst;
  const play = () => {
    if (pm) pm.group.stop(); cancelAnimationFrame(raf);
    pm = playMelody(s.melody, { bpm: s.bpm, inst: inst2.id, transpose: inst2.transpose });
    let i = 0; const tick = () => { const now = audio().currentTime; if (now > pm.end) { score && score.current(-1); return; } while (i < pm.times.length - 1 && now >= pm.times[i + 1].t) i++; if (score && now >= pm.times[0].t) score.current(i); raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
  };
  host.addEventListener('click', (e) => { const b = e.target.closest('[data-a]'); if (!b) return; if (b.dataset.a === 'play') play(); if (b.dataset.a === 'ok') done({ stars: 3, accuracy: 100, secs: 10 }); });
  setTimeout(play, 400);
  return { destroy() { cancelAnimationFrame(raf); if (pm) pm.group.stop(); } };
}
