// Staff notation with VexFlow (loaded on first use). Renders wrapped systems, highlights notes, and moves a cursor.
import { parseMelody, spell, midiToName, nameToMidi, LETTER_PC, sigAccidentals, keyByMajor, SOLFEGE } from '../core/music.js';
import { fretFor } from '../content/instruments.js';

let VFp = null;
export function loadVexFlow() {
  if (window.VexFlow) return Promise.resolve(window.VexFlow);
  if (!VFp) VFp = new Promise((res, rej) => {
    const s = document.createElement('script'); s.src = 'vendor/vexflow/vexflow-bravura.js'; s.async = true;
    s.onload = () => res(window.VexFlow); s.onerror = () => rej(new Error('Notation could not load'));
    document.head.appendChild(s);
  });
  return VFp;
}

const VDUR = { w: ['w', 0], 'h.': ['h', 1], h: ['h', 0], 'q.': ['q', 1], q: ['q', 0], e: ['8', 0], s: ['16', 0] };
const vkey = (name) => { const s = spell(name); return `${s.letter.toLowerCase()}/${s.oct}`; };

/**
 * opts: { melody, clef: treble|bass|grand|treble8|bass8, time:[4,4], key:'C', tab: instrument|null, positions,
 *         fingers: {name: n}, names: 'letters'|'solfege'|null, barsPerLine, width, free (no time signature) }
 * Returns a handle: { events, mark(i, cls), current(i), clearMarks(), cursor(beat), destroy() }
 */
export async function renderScore(host, opts) {
  const VF = await loadVexFlow();
  const { Renderer, Stave, StaveNote, Voice, Formatter, Accidental, Beam, Dot, GhostNote, StaveConnector, TabStave, TabNote, Annotation, Fraction } = VF;
  host.innerHTML = '';
  const time = opts.time || [4, 4];
  const barBeats = opts.free ? Infinity : time[0] * 4 / time[1];
  const ev = parseMelody(opts.melody);
  // split into bars
  const bars = []; let cur = []; let acc = 0;
  ev.forEach((e, i) => { e.i = i; cur.push(e); acc += e.beats; if (acc >= barBeats - 1e-6) { bars.push(cur); cur = []; acc = 0; } });
  if (cur.length) bars.push(cur);
  const width = Math.max(280, opts.width || host.clientWidth || 340);
  const grand = opts.clef === 'grand';
  const tab = opts.tab && opts.tab.strings ? opts.tab : null;
  const sig = (keyByMajor(opts.key || 'C') || { sig: 0 }).sig;
  const keyAcc = Object.fromEntries(sigAccidentals(sig).map((n) => [n[0], n.includes('#') ? 1 : -1]));
  const minBar = opts.minBar || (ev.length / Math.max(1, bars.length) > 6 ? 190 : 122);
  const perLine = Math.max(1, Math.min(opts.barsPerLine || 4, Math.floor((width - 80) / minBar)));
  const lines = Math.ceil(bars.length / perLine);
  const staffGap = grand ? 90 : 0; const tabGap = tab ? 95 : 0;
  const lineH = 112 + staffGap + tabGap + (opts.names ? 16 : 0);
  const height = lines * lineH + 10;
  const renderer = new Renderer(host, Renderer.Backends.SVG); renderer.resize(width, height);
  const ctx = renderer.getContext();
  const svg = host.querySelector('svg'); svg.classList.add('score-svg'); svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', 'Music notation');
  const notesOut = []; const clefOf = (c) => (c === 'treble8' ? 'treble' : c === 'bass8' ? 'bass' : c || 'treble');
  const mainClef = grand ? 'treble' : clefOf(opts.clef);

  bars.forEach((bar, bi) => {
    const line = Math.floor(bi / perLine), col = bi % perLine;
    const first = col === 0;
    const usable = width - 12; const extra = 62 + (sig ? Math.abs(sig) * 9 : 0) + (bi === 0 && !opts.free ? 22 : 0);
    const bw = (usable - extra) / Math.min(perLine, bars.length - line * perLine);
    const x = 6 + (first ? 0 : extra + col * bw);
    const w = first ? bw + extra : bw;
    const y = line * lineH + (opts.names ? 4 : 0);
    const top = new Stave(x, y, w);
    if (first) { top.addClef(mainClef, 'default', opts.clef === 'treble8' || opts.clef === 'bass8' ? '8vb' : undefined); if (sig) top.addKeySignature(opts.key); }
    if (bi === 0 && !opts.free) top.addTimeSignature(`${time[0]}/${time[1]}`);
    top.setContext(ctx).draw();
    let bot = null, tabStave = null;
    if (grand) {
      bot = new Stave(x, y + staffGap, w);
      if (first) { bot.addClef('bass'); if (sig) bot.addKeySignature(opts.key); }
      if (bi === 0 && !opts.free) bot.addTimeSignature(`${time[0]}/${time[1]}`);
      bot.setContext(ctx).draw();
      if (first) { new StaveConnector(top, bot).setType('brace').setContext(ctx).draw(); new StaveConnector(top, bot).setType('singleLeft').setContext(ctx).draw(); }
      new StaveConnector(top, bot).setType('singleRight').setContext(ctx).draw();
    }
    if (tab) { tabStave = new TabStave(x, y + 92 + staffGap, w); tabStave.setNumLines(tab.strings.length); if (first) tabStave.addTabGlyph(); tabStave.setContext(ctx).draw(); }

    const barAcc = { ...keyAcc }; const barAccOct = {};
    const mk = (e, keys, clef, isTop) => {
      const [d, dots] = VDUR[e.dur] || ['q', 0];
      if (!keys.length) return isTop || !grand ? null : null;
      const names = keys.map((m) => e.names[e.notes.indexOf(m)] || midiToName(m));
      const sorted = names.slice().sort((a, b) => nameToMidi(a) - nameToMidi(b));
      const n = new StaveNote({ keys: sorted.map(vkey), duration: d, clef, autoStem: true });
      sorted.forEach((nm, ki) => {
        const s = spell(nm); const id = s.letter + s.oct;
        const want = s.acc; const have = barAccOct[id] ?? barAcc[s.letter] ?? 0;
        if (want !== have) { n.addModifier(new Accidental(want === 0 ? 'n' : want > 0 ? '#'.repeat(want) : 'b'.repeat(-want)), ki); barAccOct[id] = want; }
      });
      if (dots) Dot.buildAndAttach([n], { all: true });
      if (opts.fingers && isTop) { const f = sorted.map((nm) => opts.fingers[nm]).filter((v) => v != null); if (f.length) n.addModifier(new Annotation(String(f[f.length - 1])).setVerticalJustification(Annotation.VerticalJustify.TOP).setFont('Inter', 11, 'bold'), 0); }
      if (opts.names && (isTop || grand)) { const s = spell(sorted[sorted.length - 1]); const lab = opts.names === 'solfege' ? SOLFEGE[s.letter] : s.letter + (s.acc > 0 ? '♯' : s.acc < 0 ? '♭' : ''); n.addModifier(new Annotation(lab).setVerticalJustification(Annotation.VerticalJustify.BOTTOM).setFont('Inter', 10), 0); }
      return n;
    };
    const restKey = (clef) => (clef === 'bass' ? 'd/3' : 'b/4');
    const rest = (e, clef) => { const [d, dots] = VDUR[e.dur] || ['q', 0]; const r = new StaveNote({ keys: [restKey(clef)], duration: d + 'r', clef }); if (dots) Dot.buildAndAttach([r], { all: true }); return r; };
    const ghost = (e) => { const [d, dots] = VDUR[e.dur] || ['q', 0]; const g = new GhostNote({ duration: d }); if (dots) Dot.buildAndAttach([g], { all: true }); return g; };
    const topNotes = [], botNotes = [], tabNotes = []; const owners = [];
    const anyBot = grand && bar.some((e) => e.notes.some((m) => m < 60));
    const anyTop = !grand || bar.some((e) => e.notes.some((m) => m >= 60));
    for (const e of bar) {
      if (e.rest) {
        const r = rest(e, mainClef); topNotes.push(r); owners.push([r, e]);
        if (grand) botNotes.push(anyBot ? rest(e, 'bass') : ghost(e));
        if (tab) tabNotes.push(new GhostNote({ duration: (VDUR[e.dur] || ['q'])[0] }));
        continue;
      }
      if (grand) {
        const hi = e.notes.filter((m) => m >= 60), lo = e.notes.filter((m) => m < 60);
        const tn = hi.length ? mk(e, hi, 'treble', true) : anyTop ? rest(e, 'treble') : ghost(e);
        const bn = lo.length ? mk(e, lo, 'bass', !hi.length) : anyBot ? ghost(e) : ghost(e);
        topNotes.push(tn); botNotes.push(bn);
        owners.push([hi.length ? tn : bn, e]);
      } else {
        const n = mk(e, e.notes, mainClef, true); topNotes.push(n); owners.push([n, e]);
      }
      if (tab) {
        const pos = e.names.map((nm) => posFor(nm, tab, opts.positions)).filter(Boolean);
        const [d, dots] = VDUR[e.dur] || ['q', 0];
        const tn = new TabNote({ positions: pos.length ? pos : [{ str: 1, fret: 'x' }], duration: d });
        if (dots) Dot.buildAndAttach([tn], { all: true });
        tabNotes.push(tn);
      }
    }
    const mkVoice = (notes) => { const v = new Voice({ numBeats: time[0], beatValue: time[1] }).setMode(Voice.Mode.SOFT); v.addTickables(notes); return v; };
    const vTop = mkVoice(topNotes); const voices = [vTop];
    let vBot = null, vTab = null;
    if (grand) { vBot = mkVoice(botNotes); voices.push(vBot); }
    if (tab) { vTab = mkVoice(tabNotes); voices.push(vTab); }
    const groups = time[1] === 8 ? [new Fraction(3, 8)] : undefined;
    const beams = [...Beam.generateBeams(topNotes.filter((n) => n instanceof StaveNote), { groups }), ...(grand ? Beam.generateBeams(botNotes.filter((n) => n instanceof StaveNote), { groups }) : [])];
    const fmt = new Formatter(); fmt.joinVoices([vTop]); if (vBot) fmt.joinVoices([vBot]); if (vTab) fmt.joinVoices([vTab]);
    const noteStart = Math.max(top.getNoteStartX(), bot ? bot.getNoteStartX() : 0);
    top.setNoteStartX(noteStart); if (bot) bot.setNoteStartX(noteStart); if (tabStave) tabStave.setNoteStartX(noteStart);
    fmt.format(voices, Math.max(40, x + w - noteStart - 16));
    vTop.draw(ctx, top); if (vBot) vBot.draw(ctx, bot); if (vTab) vTab.draw(ctx, tabStave);
    beams.forEach((b) => b.setContext(ctx).draw());
    for (const [n, e] of owners) {
      const elx = n.getSVGElement ? n.getSVGElement() : null;
      if (elx) elx.classList.add('sn');
      let nx = x + 20; try { nx = n.getAbsoluteX(); } catch { /* ghost */ }
      notesOut[e.i] = { el: elx, x: nx, y, line, t: e.t, beats: e.beats, ev: e };
    }
  });
  // fill rests that had no element (never null for rests, but keep indexes dense)
  ev.forEach((e, i) => { if (!notesOut[i]) notesOut[i] = { el: null, x: 0, y: 0, line: 0, t: e.t, beats: e.beats, ev: e }; });

  const cursor = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  cursor.setAttribute('class', 'score-cursor'); cursor.setAttribute('width', '3'); cursor.setAttribute('rx', '1.5'); cursor.setAttribute('height', String(lineH - 30)); cursor.style.display = 'none';
  svg.appendChild(cursor);
  let lastLine = -1;
  const scroller = opts.scroller || host.closest('.score-scroll') || host;
  const scrollLine = (line) => {
    if (line === lastLine) return; lastLine = line;
    const target = line * lineH - 6;
    try { scroller.scrollTo({ top: target, behavior: 'smooth' }); } catch { scroller.scrollTop = target; }
  };
  return {
    events: ev, notes: notesOut, lineH,
    mark(i, cls) { const n = notesOut[i]; if (n && n.el) { n.el.classList.remove('ok', 'bad', 'cur', 'late', 'miss'); if (cls) n.el.classList.add(cls); } },
    current(i) { notesOut.forEach((n, k) => n.el && n.el.classList.toggle('cur', k === i)); const n = notesOut[i]; if (n) scrollLine(n.line); },
    clearMarks() { notesOut.forEach((n) => n.el && n.el.classList.remove('ok', 'bad', 'cur', 'late', 'miss')); },
    cursor(beat) {
      if (beat == null) { cursor.style.display = 'none'; return; }
      let i = notesOut.findIndex((n) => beat >= n.t - 1e-6 && beat < n.t + n.beats - 1e-6);
      if (i < 0) i = beat < 0 ? 0 : notesOut.length - 1;
      const n = notesOut[i], nx = notesOut[i + 1];
      const frac = Math.max(0, Math.min(1, (beat - n.t) / n.beats));
      const x = nx && nx.line === n.line ? n.x + (nx.x - n.x) * frac : n.x + 30 * frac;
      cursor.style.display = ''; cursor.setAttribute('x', String(x - 4)); cursor.setAttribute('y', String(n.y + 18));
      scrollLine(n.line);
    },
    destroy() { host.innerHTML = ''; },
  };
}

function posFor(name, inst, positions) {
  const m = nameToMidi(name) - inst.transpose;
  const n = inst.strings.length;
  if (positions === 'penta5') {
    for (let s = 0; s < n; s++) { const f = m - nameToMidi(inst.strings[s]); if (f >= 5 && f <= 8) return { str: n - s, fret: f }; }
  }
  const p = fretFor(name, inst); return p ? { str: n - p.string, fret: p.fret } : null;
}

/** A key signature on its own (theory screens). */
export async function renderKeySig(host, sig, clef = 'treble') {
  const VF = await loadVexFlow(); host.innerHTML = '';
  const k = { 0: 'C', 1: 'G', 2: 'D', 3: 'A', 4: 'E', 5: 'B', 6: 'F#', 7: 'C#', '-1': 'F', '-2': 'Bb', '-3': 'Eb', '-4': 'Ab', '-5': 'Db', '-6': 'Gb', '-7': 'Cb' }[sig];
  const r = new VF.Renderer(host, VF.Renderer.Backends.SVG); r.resize(220, 110);
  const st = new VF.Stave(8, 8, 200); st.addClef(clef).addKeySignature(k); st.setContext(r.getContext()).draw();
  host.querySelector('svg').classList.add('score-svg');
}
export const pcOf = (letter) => LETTER_PC[letter];
