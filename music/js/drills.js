// Theory and ear-training drills. Each question is generated fresh; answers feed spaced repetition.
import * as M from './core/music.js';
import { shuffle, pick, esc, sleep } from './util.js';
import { renderScore, renderKeySig } from './viz/notation.js';
import { keyboard, rangeFor } from './viz/diagrams.js';
import { audio, group, note, playMelody, click } from './audio/engine.js';
import { srsGrade, state } from './state.js';
import { icon } from './icons.js';
import * as input from './audio/input.js';
import { scoreRhythm } from './core/scoring.js';

const P = M.pretty;
const letterOf = (n) => n.replace(/\d+/, '');
const opts4 = (right, pool) => { const o = shuffle([...new Set(pool.filter((x) => x !== right))]).slice(0, 3); const all = shuffle([right, ...o]); return { options: all, answer: all.indexOf(right) }; };
const ivName = (s) => M.intervalName(s);
const playNotes = (ms, { gap = 0.6, dur = 0.55, inst = 'piano', together = false } = {}) => { const G = group(1); const t = audio().currentTime + 0.08; ms.forEach((m, i) => note(m, together ? t : t + i * gap, together ? 1.6 : dur, inst, G, 0.75)); return G; };

export const DRILL_TITLES = {
  letterStep: 'Musical alphabet', keyName: 'Name the key', findKey: 'Find the key', steps: 'Half or whole step', noteName: 'Name the note',
  rhythmValue: 'Note values', barCount: 'Complete the bar', intervalNumber: 'Interval numbers', intervalQuality: 'Interval names', intervalEar: 'Intervals by ear',
  scaleNote: 'Scale notes', scaleQualityEar: 'Scales by ear', keySig: 'Key signatures', relative: 'Relative minor', chordSpell: 'Spell the chord', chordQuality: 'Chord quality',
  chordEar: 'Chords by ear', roman: 'Roman numerals', cadenceEar: 'Cadences by ear', higherLower: 'Higher or lower', stepSkip: 'Step or skip', dictation: 'Melodic dictation',
  rhythmEcho: 'Rhythm echo', rhythmRead: 'Rhythm reading',
};

/** Build one question. item (optional) forces a specific item, used by the review queue. */
export function makeQuestion(kind, p = {}, item = null) {
  switch (kind) {
    case 'letterStep': {
      const L = M.LETTERS; const a = item?.a ?? Math.floor(Math.random() * 7); const n = item?.n ?? pick([1, 2, 3, 4, -1, -2]);
      const right = L[((a + n) % 7 + 7) % 7];
      return { prompt: `What letter is ${Math.abs(n)} ${Math.abs(n) === 1 ? 'step' : 'steps'} ${n > 0 ? 'above' : 'below'} ${L[a]}?`, ...opts4(right, L), explain: `Count ${n > 0 ? 'up' : 'down'} the alphabet from ${L[a]}: ${right}.` };
    }
    case 'keyName': {
      const lo = M.nameToMidi(p.from || 'C4'), hi = M.nameToMidi(p.to || 'B4');
      const pool = []; for (let m = lo; m <= hi; m++) if (p.black || ![1, 3, 6, 8, 10].includes(m % 12)) pool.push(m);
      const m = item?.m ?? pick(pool);
      const nm = (x) => ([1, 3, 6, 8, 10].includes(x % 12) ? `${P(M.pcName(x))} / ${P(M.pcName(x, true))}` : M.pcName(x));
      const right = nm(m); const others = pool.map(nm);
      return { prompt: 'Which key is marked?', viz: { k: 'keys', from: M.midiToName(lo - (lo % 12)), to: M.midiToName(hi), hl: [M.midiToName(m)] }, ...opts4(right, [...others, 'C', 'D', 'E', 'F', 'G', 'A', 'B']), card: { id: `keyName:${m % 12}`, kind, p, item: { m } }, explain: `That key is ${right}.` };
    }
    case 'findKey': {
      const nm = item?.n ?? pick(p.pool);
      return { prompt: `Tap ${P(letterOf(nm))}`, input: 'keys', target: [M.nameToMidi(nm)], anyOctave: true, range: rangeFor(p.pool.map(M.nameToMidi)), explain: `${P(letterOf(nm))} is marked now.` };
    }
    case 'steps': {
      const a = 60 + Math.floor(Math.random() * 12); const d = pick([1, 2, 1, 2, 3]);
      const right = d === 1 ? 'Half step' : d === 2 ? 'Whole step' : 'Neither';
      const all = ['Half step', 'Whole step', 'Neither'];
      return { prompt: 'How far apart are the two marked keys?', viz: { k: 'keys', from: 'C4', to: 'B5', hl: [M.midiToName(a), M.midiToName(a + d)] }, options: all, answer: all.indexOf(right), explain: `${d} half step${d > 1 ? 's' : ''}: ${right.toLowerCase()}.` };
    }
    case 'noteName': {
      const n = item?.n ?? pick(p.pool); const right = letterOf(n);
      return { prompt: 'Name this note.', viz: { k: 'staff', clef: p.clef, notes: `${n}/w`, free: true }, ...opts4(right, M.LETTERS), card: { id: `noteName:${p.clef}:${n}`, kind, p, item: { n } }, explain: `It is ${right}${n.replace(/\D/g, '')}.`, play: [M.nameToMidi(n)] };
    }
    case 'rhythmValue': {
      const d = item?.d ?? pick(['w', 'h', 'q', 'e', 'h.', 'q.', 's']); const D = M.DURATIONS[d];
      const right = String(D.beats).replace('0.5', '½').replace('0.25', '¼').replace('1.5', '1½');
      const all = ['4', '3', '2', '1½', '1', '½', '¼'];
      return { prompt: `How many beats does a ${D.name} last in 4/4?`, viz: { k: 'staff', clef: 'treble', notes: `B4/${d}`, free: true }, ...opts4(right, all), card: { id: `rhythmValue:${d}`, kind, p, item: { d } }, explain: `A ${D.name} lasts ${right} beat${D.beats === 1 ? '' : 's'}.` };
    }
    case 'barCount': {
      const ts = pick([[4, 4], [3, 4], [2, 4]]); const bar = ts[0];
      const fills = { 4: [['q', 'q', 'q'], ['h', 'q'], ['q', 'h'], ['e', 'e', 'q', 'q'], ['h.']], 3: [['q', 'q'], ['h'], ['e', 'e', 'q']], 2: [['q'], ['e', 'e']] };
      const f = pick(fills[bar]); const used = f.reduce((a, d) => a + M.DURATIONS[d].beats, 0); const need = bar - used;
      const right = { 1: 'Quarter note', 2: 'Half note', 3: 'Dotted half note', 0.5: 'Eighth note', 4: 'Whole note' }[need];
      const all = ['Quarter note', 'Half note', 'Dotted half note', 'Eighth note', 'Whole note'];
      return { prompt: `This bar is in ${ts[0]}/${ts[1]}. Which note completes it?`, viz: { k: 'staff', clef: 'treble', notes: f.map((d) => `B4/${d}`).join(' '), time: ts }, ...opts4(right, all), explain: `The bar needs ${bar} beats; it has ${used}, so add ${need}: a ${right.toLowerCase()}.` };
    }
    case 'intervalNumber': {
      const base = pick(['C4', 'D4', 'E4', 'F4', 'G4']); const k = item?.k ?? (1 + Math.floor(Math.random() * 7));
      const li = M.LETTERS.indexOf(base[0]); const top = M.LETTERS[(li + k) % 7] + (4 + Math.floor((li + k) / 7));
      const names = ['2nd', '3rd', '4th', '5th', '6th', '7th', 'Octave']; const right = names[k - 1];
      return { prompt: 'What is the interval number?', viz: { k: 'staff', clef: 'treble', notes: `${base}/h ${top}/h`, free: true }, ...opts4(right, names), explain: `Count the letters ${base[0]} to ${top[0]}, including both: ${right}.`, play: [M.nameToMidi(base), M.nameToMidi(top)] };
    }
    case 'intervalQuality': {
      const semis = item?.s ?? pick([2, 3, 4, 5, 7, 9, 12]); const a = 60 + Math.floor(Math.random() * 7);
      const right = ivName(semis);
      return { prompt: 'Name the interval between the marked keys.', viz: { k: 'keys', from: 'C4', to: 'B5', hl: [M.midiToName(a), M.midiToName(a + semis)] }, ...opts4(right, [2, 3, 4, 5, 7, 9, 10, 11, 12].map(ivName)), card: { id: `intervalQuality:${semis}`, kind, p, item: { s: semis } }, explain: `${semis} half steps = ${right}.`, play: [a, a + semis] };
    }
    case 'intervalEar': {
      const semis = item?.s ?? pick(p.pool); const a = 55 + Math.floor(Math.random() * 10);
      const right = ivName(semis);
      return { prompt: 'Listen. Which interval is it?', listen: () => playNotes([a, a + semis]), ...opts4(right, p.pool.map(ivName)), card: { id: `intervalEar:${semis}`, kind, p, item: { s: semis } }, explain: `${right} (${semis} half steps).` };
    }
    case 'scaleNote': {
      const key = item?.key ?? pick(p.keys); const deg = item?.deg ?? (2 + Math.floor(Math.random() * 6));
      const sc = M.spelledScale(key, p.type || 'major'); const right = P(sc[deg - 1]);
      const pool = [...new Set([...sc.map(P), ...['C', 'D', 'E', 'F', 'G', 'A', 'B', 'F♯', 'C♯', 'B♭', 'E♭', 'G♯'].map((x) => x)])];
      const word = { 2: '2nd', 3: '3rd', 4: '4th', 5: '5th', 6: '6th', 7: '7th' }[deg];
      return { prompt: `What is the ${word} note of ${P(key)} ${p.type === 'minor' ? 'minor' : 'major'}?`, ...opts4(right, pool), card: { id: `scaleNote:${p.type}:${key}:${deg}`, kind, p, item: { key, deg } }, explain: `${P(key)} ${p.type === 'minor' ? 'minor' : 'major'}: ${sc.map(P).join(' ')}.` };
    }
    case 'scaleQualityEar': {
      const t = item?.t ?? pick(['major', 'minor', 'harmonic']); const names = { major: 'Major', minor: 'Natural minor', harmonic: 'Harmonic minor' };
      return { prompt: 'Listen. Which scale is it?', listen: () => playNotes(M.scaleMidi(57 + Math.floor(Math.random() * 5), t), { gap: 0.32, dur: 0.3 }), options: Object.values(names), answer: Object.keys(names).indexOf(t), explain: `It was ${names[t].toLowerCase()}.` };
    }
    case 'keySig': {
      const sig = item?.sig ?? pick(p.sigs); const k = M.KEYS.find((x) => x.sig === sig);
      const right = P(k.major) + ' major';
      return { prompt: 'Which major key has this signature?', viz: { k: 'keysig', sig }, ...opts4(right, M.KEYS.filter((x) => Math.abs(x.sig) <= 6).map((x) => P(x.major) + ' major')), card: { id: `keySig:${sig}`, kind, p, item: { sig } }, explain: sig === 0 ? 'No sharps or flats: C major.' : sig > 0 ? `The last sharp is ${P(M.SHARP_ORDER[sig - 1] + '#')}; a half step up is ${P(k.major)}.` : sig === -1 ? 'One flat is F major.' : `The second-to-last flat, ${P(M.FLAT_ORDER[-sig - 2] + 'b')}, names the key.` };
    }
    case 'relative': {
      const k = item?.k ?? pick(M.KEYS.filter((x) => Math.abs(x.sig) <= 4)); const right = P(k.minor) + ' minor';
      return { prompt: `What is the relative minor of ${P(k.major)} major?`, ...opts4(right, M.KEYS.map((x) => P(x.minor) + ' minor')), card: { id: `relative:${k.major}`, kind, p, item: { k } }, explain: `Three half steps below ${P(k.major)} is ${P(k.minor)}.` };
    }
    case 'chordSpell': {
      const root = item?.r ?? pick(['C', 'D', 'E', 'F', 'G', 'A', 'Bb', 'D', 'E']); const q = item?.q ?? pick(['maj', 'min']);
      const sc = M.spelledScale(root, q === 'maj' ? 'major' : 'minor'); const right = [sc[0], sc[2], sc[4]].map(P).join(' ');
      const wrong = [[sc[0], sc[1], sc[3]], [sc[0], sc[3], sc[5]], [sc[1], sc[3], sc[5]], [sc[0], M.spelledScale(root, q === 'maj' ? 'minor' : 'major')[2], sc[4]]].map((x) => x.map(P).join(' '));
      return { prompt: `Which notes make ${P(root)}${q === 'min' ? 'm' : ''} (${P(root)} ${q === 'min' ? 'minor' : 'major'})?`, ...opts4(right, wrong), card: { id: `chordSpell:${root}:${q}`, kind, p, item: { r: root, q } }, explain: `Root, third and fifth: ${right}.` };
    }
    case 'chordQuality': {
      const q = item?.q ?? pick(['maj', 'min', 'dim', 'aug']); const r = 60 + Math.floor(Math.random() * 7);
      const names = { maj: 'Major', min: 'Minor', dim: 'Diminished', aug: 'Augmented' };
      return { prompt: 'Which kind of triad is marked?', viz: { k: 'keys', from: 'C4', to: 'B5', hl: M.chordMidi(r, q).map((x) => M.midiToName(x)) }, options: Object.values(names), answer: Object.keys(names).indexOf(q), card: { id: `chordQuality:${q}`, kind, p, item: { q } }, explain: { maj: 'Major: 4 then 3 half steps.', min: 'Minor: 3 then 4 half steps.', dim: 'Diminished: 3 then 3 half steps.', aug: 'Augmented: 4 then 4 half steps.' }[q], play: M.chordMidi(r, q), together: true };
    }
    case 'chordEar': {
      const q = item?.q ?? pick(p.pool); const r = 55 + Math.floor(Math.random() * 7);
      const names = { maj: 'Major', min: 'Minor', dim: 'Diminished', aug: 'Augmented', maj7: 'Major 7th', dom7: 'Dominant 7th', min7: 'Minor 7th' };
      const opts = p.pool.map((x) => names[x]);
      return { prompt: 'Listen. Which chord is it?', listen: () => { const G = playNotes(M.chordMidi(r, q), { together: true }); setTimeout(() => playNotes(M.chordMidi(r, q), { gap: 0.28, dur: 0.4 }), 1700); return G; }, options: opts, answer: opts.indexOf(names[q]), card: { id: `chordEar:${q}`, kind, p, item: { q } }, explain: `It was ${names[q].toLowerCase()}.` };
    }
    case 'roman': {
      const key = item?.key ?? pick(p.keys); const d = item?.d ?? Math.floor(Math.random() * 6);
      const rn = M.DIATONIC_MAJOR[d].rn; const right = P(M.romanToChord(key, rn));
      const pool = M.DIATONIC_MAJOR.map((x) => P(M.romanToChord(key, x.rn)));
      return { prompt: `In ${P(key)} major, which chord is ${rn}?`, ...opts4(right, pool), card: { id: `roman:${key}:${rn}`, kind, p, item: { key, d } }, explain: `${P(key)} major chords: ${pool.join(', ')}.` };
    }
    case 'cadenceEar': {
      const types = { Authentic: ['G', 'C'], Plagal: ['F', 'C'], Half: ['C', 'G'], Deceptive: ['G', 'Am'] };
      const t = item?.t ?? pick(Object.keys(types));
      const v = { C: [60, 64, 67], G: [59, 62, 67], F: [60, 65, 69], Am: [60, 64, 69] };
      return { prompt: 'Listen to the two chords at the end. Which cadence is it?', listen: () => { const G = group(1); const t0 = audio().currentTime + 0.08; [['C', 0], ['F', 1], ...types[t].map((c, i) => [c, 2 + i])].forEach(([c, i]) => { v[c].forEach((m) => note(m, t0 + i * 0.9, 0.85, 'piano', G, 0.6)); note(v[c][0] - 12 - (c === 'G' ? -0 : 0), t0 + i * 0.9, 0.85, 'piano', G, 0.6); }); return G; }, options: Object.keys(types), answer: Object.keys(types).indexOf(t), explain: { Authentic: 'V to I: a full stop.', Plagal: 'IV to I: the "Amen" sound.', Half: 'Ending on V: a comma.', Deceptive: 'V to vi: a surprise.' }[t] };
    }
    case 'higherLower': {
      const a = 55 + Math.floor(Math.random() * 14); const d = pick([-5, -3, -2, -1, 1, 2, 3, 5, 0]);
      const right = d > 0 ? 'Higher' : d < 0 ? 'Lower' : 'Same';
      return { prompt: 'Is the second note higher, lower or the same?', listen: () => playNotes([a, a + d], { gap: 0.8 }), options: ['Higher', 'Lower', 'Same'], answer: ['Higher', 'Lower', 'Same'].indexOf(right), explain: `It went ${right === 'Same' ? 'nowhere: same note' : right.toLowerCase()}.` };
    }
    case 'stepSkip': {
      const kinds = { Steps: [0, 2, 4], Skips: [0, 4, 7], 'Repeated notes': [0, 0, 0] };
      const k = pick(Object.keys(kinds)); const a = 60 + pick([0, 2, 5, 7]);
      const ms = k === 'Steps' ? [a, a + 2, a + 4] : k === 'Skips' ? [a, a + 4, a + 7] : [a, a, a];
      return { prompt: 'How does the melody move?', listen: () => playNotes(ms, { gap: 0.5 }), options: Object.keys(kinds), answer: Object.keys(kinds).indexOf(k), explain: `${k}.` };
    }
    case 'dictation': {
      const pool = p.pool.map(M.nameToMidi); const ms = [pool[0]]; let i = 0;
      for (let k = 1; k < p.len; k++) { i = Math.max(0, Math.min(pool.length - 1, i + pick([-2, -1, 1, 1, 2]))); ms.push(pool[i]); }
      return { prompt: 'Listen, then play the melody back on the keys. It starts on C.', listen: () => playNotes(ms, { gap: 0.55 }), input: 'keys', sequence: ms, range: rangeFor(pool), explain: `It was ${ms.map((m) => P(M.pcName(m))).join(' ')}.` };
    }
    case 'rhythmEcho': {
      const pats = ['q q h', 'q e e q q', 'h q q', 'e e q e e q', 'q q e e q', 'q. e q q'];
      return { prompt: 'Listen to the rhythm, then tap it back.', input: 'rhythm', pattern: pick(pats), echo: true };
    }
    case 'rhythmRead': {
      const pats = ['q q h', 'q e e q q', 'h q q', 'e e q e e q', 'q q e e h', 'q. e q q', 'h. q', 'e e e e h'];
      return { prompt: 'Tap this rhythm in time after the count-in.', input: 'rhythm', pattern: pick(pats), echo: false };
    }
  }
  throw new Error('Unknown drill ' + kind);
}

/** Render a viz object used inside drills and lesson cards. */
export async function renderViz(host, viz, ctx = {}) {
  if (!viz) return;
  if (viz.k === 'keys') { keyboard(host, { ...viz, names: state().settings.names, onKey: ctx.onKey }); return; }
  if (viz.k === 'staff') { await renderScore(host, { melody: viz.notes, clef: viz.clef, time: viz.time, free: viz.free || !viz.time, barsPerLine: 4, minBar: 120 }); return; }
  if (viz.k === 'keysig') { await renderKeySig(host, viz.sig); return; }
}

/** Run a set of drill questions inside host. Calls onDone({ accuracy, stars }) at the end. */
export function runDrill(host, step, { onDone, questions = null, title = null } = {}) {
  const count = questions ? questions.length : step.count || 8;
  let qi = 0, right = 0, cur = null, answered = false, G = null; const unsub = [];
  host.innerHTML = `<div class="drill"><div class="drill-top"><span class="drill-title">${esc(title || DRILL_TITLES[step.kind] || 'Practice')}</span><span class="drill-prog" data-r="prog"></span></div>
    <div class="drill-q" data-r="q"></div><div class="drill-viz" data-r="viz"></div><div class="drill-opts" data-r="opts"></div><div class="drill-fb" data-r="fb" aria-live="polite"></div>
    <div class="drill-next"><button class="btn primary" data-a="next" hidden>Next</button></div></div>`;
  const R = (n) => host.querySelector(`[data-r="${n}"]`);
  const prog = () => { R('prog').innerHTML = Array.from({ length: count }, (_, i) => `<i class="${i < qi ? 'done' : i === qi ? 'now' : ''}"></i>`).join(''); };
  async function show() {
    answered = false; if (G) { G.stop(); G = null; }
    unsub.splice(0).forEach((f) => f());
    cur = questions ? makeQuestion(questions[qi].kind, questions[qi].p, questions[qi].item) : makeQuestion(step.kind, step);
    prog();
    R('q').innerHTML = `<h3>${esc(cur.prompt)}</h3>`; R('fb').innerHTML = ''; R('fb').className = 'drill-fb'; host.querySelector('[data-a="next"]').hidden = true;
    R('viz').innerHTML = ''; R('opts').innerHTML = '';
    if (cur.listen) { R('viz').innerHTML = `<button class="listen-big" data-a="hear">${icon('sound')}<span>Play</span></button>`; setTimeout(() => { G = cur.listen(); }, 250); }
    if (cur.viz) { const d = document.createElement('div'); d.className = 'viz-box'; R('viz').appendChild(d); await renderViz(d, cur.viz); }
    if (cur.input === 'keys') return keysQuestion();
    if (cur.input === 'rhythm') return rhythmQuestion();
    R('opts').innerHTML = cur.options.map((o, i) => `<button class="opt" data-i="${i}">${esc(o)}</button>`).join('');
  }
  function grade(ok, extra = '') {
    answered = true; if (ok) right++;
    if (cur.card) srsGrade(cur.card.id, ok ? 2 : 0, { kind: cur.card.kind, p: cur.card.p, item: cur.card.item, title: DRILL_TITLES[cur.card.kind] });
    R('fb').className = 'drill-fb ' + (ok ? 'ok' : 'bad');
    R('fb').innerHTML = `<b>${ok ? pick(['Correct!', 'Yes!', 'Nailed it.', 'Right!']) : 'Not quite.'}</b> ${esc(cur.explain || '')} ${extra}`;
    if (cur.play && !cur.listen) { G = playNotes(cur.play, { together: !!cur.together }); }
    const nb = host.querySelector('[data-a="next"]'); nb.hidden = false; nb.textContent = qi + 1 >= count ? 'Finish' : 'Next'; nb.focus({ preventScroll: true });
  }
  function keysQuestion() {
    const d = document.createElement('div'); d.className = 'viz-box keys'; R('viz').appendChild(d);
    const [from, to] = cur.range || ['C4', 'C5'];
    const got = [];
    const kb = keyboard(d, { from, to, label: false, onKey: (m) => { note(m, audio().currentTime, 0.45, 'piano', null, 0.7); input.touchNote(m); } });
    if (!cur.sequence) R('opts').innerHTML = '';
    const onNote = (n) => {
      if (answered) return;
      if (cur.target) { const ok = cur.target.some((t) => (cur.anyOctave ? (t - n.midi) % 12 === 0 : t === n.midi)); kb.flash(n.midi, ok ? 'good' : 'bad', 400); if (!ok) kb.target(cur.target.map((t) => { const near = [...Array(5)].map((_, k) => t + (k - 2) * 12).find((x) => x >= kb.lo && x <= kb.hi); return near; })); return grade(ok); }
      if (cur.sequence) { got.push(n.midi); const i = got.length - 1; const ok = n.midi === cur.sequence[i]; kb.flash(n.midi, ok ? 'good' : 'bad', 300); R('opts').innerHTML = cur.sequence.map((_, k) => `<i class="seqdot ${k < got.length ? (got[k] === cur.sequence[k] ? 'ok' : 'bad') : ''}"></i>`).join(''); if (!ok || got.length === cur.sequence.length) grade(got.every((g, k) => g === cur.sequence[k]) && got.length === cur.sequence.length); }
    };
    unsub.push(input.on('note', onNote));
    if (cur.sequence) R('opts').innerHTML = cur.sequence.map(() => '<i class="seqdot"></i>').join('');
  }
  function rhythmQuestion() {
    const ev = M.parseMelody(cur.pattern.split(' ').map((d) => `B4/${d}`).join(' '));
    const d = document.createElement('div'); d.className = 'viz-box'; R('viz').appendChild(d);
    if (!cur.echo) renderScore(d, { melody: ev.map((e) => `B4/${e.dur}`).join(' '), clef: 'treble', time: [4, 4], barsPerLine: 2 });
    R('opts').innerHTML = `<button class="btn primary" data-a="rgo">${icon('play')}<span>${cur.echo ? 'Hear it' : 'Start'}</span></button><button class="tap-pad" data-a="tap" aria-label="Tap">Tap</button>`;
    const bpm = 76, spb = 60 / bpm;
    R('opts').querySelector('[data-a="rgo"]').onclick = () => {
      const a = audio(); const Gx = group(1); G = Gx; const t0 = a.currentTime + 0.2;
      let tStart = t0;
      if (cur.echo) { ev.forEach((e) => click(t0 + e.t * spb, false, Gx, 1)); tStart = t0 + (M.totalBeats(ev) + 4) * spb; for (let i = 0; i < 4; i++) click(t0 + (M.totalBeats(ev) + i) * spb, i === 0, Gx); }
      else { for (let i = 0; i < 4; i++) click(t0 + i * spb, i === 0, Gx); tStart = t0 + 4 * spb; for (let i = 0; i < 4; i++) click(tStart + i * spb, i === 0, Gx, 0.35); }
      const expected = ev.filter((e) => !e.rest).map((e) => tStart + e.t * spb);
      const taps = [];
      const off = input.on('onset', (o) => { if (o.t > tStart - 0.3) taps.push(o.t); });
      const offN = input.on('note', (n) => { if (n.source !== 'mic' && n.t > tStart - 0.3) taps.push(n.t); });
      unsub.push(off, offN);
      R('fb').innerHTML = cur.echo ? 'Listen… then tap it back after the four clicks.' : 'Count in, then tap.';
      setTimeout(() => { off(); offN(); const r = scoreRhythm(expected, taps); grade(r.accuracy >= 70, `(${r.accuracy}% on time)`); }, (tStart - a.currentTime + M.totalBeats(ev) * spb + 0.8) * 1000);
    };
    const tapBtn = R('opts').querySelector('[data-a="tap"]');
    tapBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); tapBtn.classList.add('hit'); setTimeout(() => tapBtn.classList.remove('hit'), 90); input.touchTap(); });
  }
  host.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.classList.contains('opt') && !answered) { const i = Number(b.dataset.i); const ok = i === cur.answer; b.classList.add(ok ? 'ok' : 'bad'); if (!ok) host.querySelector(`.opt[data-i="${cur.answer}"]`).classList.add('ok'); host.querySelectorAll('.opt').forEach((x) => (x.disabled = true)); grade(ok); }
    if (b.dataset.a === 'hear' && cur.listen) { if (G) G.stop(); G = cur.listen(); }
    if (b.dataset.a === 'next') { qi++; if (qi >= count) { unsub.forEach((f) => f()); const accuracy = Math.round(100 * right / count); host.innerHTML = ''; onDone && onDone({ accuracy, stars: accuracy >= 90 ? 3 : accuracy >= 70 ? 2 : accuracy >= 40 ? 1 : 0, secs: count * 8 }); } else show(); }
  });
  host.addEventListener('keydown', (e) => { if (!answered && /^[1-4]$/.test(e.key)) host.querySelector(`.opt[data-i="${Number(e.key) - 1}"]`)?.click(); });
  show();
  return { destroy() { unsub.forEach((f) => f()); if (G) G.stop(); } };
}
