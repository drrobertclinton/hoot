// SVG diagrams: piano keyboard, fretboard, chord boxes, wind fingerings, string fingerboards, harp strings, hands, circle of fifths.
import { nameToMidi, midiToName, pc, KEYS, pretty, SOLFEGE } from '../core/music.js';
import { GUITAR_CHORDS, saxFingering, clarinetFingering, trumpetValves, stringFinger, byId, fretFor, isBlack } from '../content/instruments.js';
import { esc } from '../util.js';

const NS = 'http://www.w3.org/2000/svg';
const WHITE_PC = [0, 2, 4, 5, 7, 9, 11];

// ---------- keyboard ----------
/** Interactive keyboard. opts: { from, to, mark:{name:label}, hl:[names], label, black, onKey(midi), names } */
export function keyboard(host, opts = {}) {
  const lo = nameToMidi(opts.from || 'C4'), hi = nameToMidi(opts.to || 'C5');
  const whites = []; for (let m = lo; m <= hi; m++) if (!isBlack(m)) whites.push(m);
  const W = 40, H = 150, BW = 24, BH = 92; const width = whites.length * W;
  const marks = Object.fromEntries(Object.entries(opts.mark || {}).map(([k, v]) => [nameToMidi(k), v]));
  const hl = new Set((opts.hl || []).map(nameToMidi));
  const pos = {};
  let s = `<svg viewBox="0 0 ${width} ${H}" class="kb" role="group" aria-label="Piano keyboard">`;
  whites.forEach((m, i) => {
    const x = i * W; pos[m] = { x: x + W / 2, w: W };
    const lab = opts.label ? (opts.names === 'solfege' ? SOLFEGE[midiToName(m)[0]] : midiToName(m).replace(/\d/, '')) : '';
    s += `<g class="key white${hl.has(m) ? ' hl' : ''}${marks[m] != null ? ' mk' : ''}" data-m="${m}" role="button" aria-label="${midiToName(m)}"><rect x="${x + 1}" y="1" width="${W - 2}" height="${H - 2}" rx="5"/>`;
    if (marks[m] != null) s += `<circle cx="${x + W / 2}" cy="${H - 26}" r="12" class="fdot"/><text x="${x + W / 2}" y="${H - 21.5}" class="ftxt">${esc(marks[m])}</text>`;
    else if (lab) s += `<text x="${x + W / 2}" y="${H - 14}" class="ktxt">${esc(lab)}</text>`;
    if (m === 60 && opts.middleC !== false) s += `<circle cx="${x + W / 2}" cy="${H - 50}" r="2.5" class="mc"/>`;
    s += '</g>';
  });
  whites.forEach((m, i) => {
    const b = m + 1; if (b > hi || !isBlack(b)) return;
    const x = (i + 1) * W - BW / 2; pos[b] = { x: x + BW / 2, w: BW };
    s += `<g class="key black${hl.has(b) ? ' hl' : ''}${marks[b] != null ? ' mk' : ''}" data-m="${b}" role="button" aria-label="${midiToName(b)} / ${midiToName(b, true)}"><rect x="${x}" y="0" width="${BW}" height="${BH}" rx="3.5"/>`;
    if (marks[b] != null) s += `<circle cx="${x + BW / 2}" cy="${BH - 16}" r="10" class="fdot"/><text x="${x + BW / 2}" y="${BH - 12}" class="ftxt">${esc(marks[b])}</text>`;
    else if (opts.black && opts.label) s += `<text x="${x + BW / 2}" y="${BH - 12}" class="ktxt w">${esc(pretty(midiToName(b).replace(/\d/, '')))}</text>`;
    s += '</g>';
  });
  s += '</svg>';
  host.innerHTML = s;
  const svg = host.firstElementChild;
  const keyEl = (m) => svg.querySelector(`[data-m="${m}"]`);
  if (opts.onKey) {
    svg.classList.add('play');
    const down = (e) => { const k = e.target.closest('.key'); if (!k) return; e.preventDefault(); const m = Number(k.dataset.m); k.classList.add('down'); setTimeout(() => k.classList.remove('down'), 160); opts.onKey(m); };
    svg.addEventListener('pointerdown', down);
    svg.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') down(e); });
    svg.querySelectorAll('.key').forEach((k) => k.setAttribute('tabindex', '0'));
  }
  return {
    svg, lo, hi, width, pos,
    flash(m, cls = 'good', ms = 260) { const k = keyEl(m); if (!k) return; k.classList.add(cls); setTimeout(() => k.classList.remove(cls), ms); },
    target(ms) { svg.querySelectorAll('.key.tg').forEach((k) => k.classList.remove('tg')); (ms || []).forEach((m) => keyEl(m) && keyEl(m).classList.add('tg')); },
    setMarks(map) { svg.querySelectorAll('.key .fdot, .key .ftxt').forEach((x) => x.remove()); },
  };
}
/** Comfortable keyboard range around a set of notes (whole octaves, at least 1.5 octaves). */
export function rangeFor(midis, min = 13) {
  let lo = Math.min(...midis), hi = Math.max(...midis);
  lo = lo - (pc(lo) === 0 ? 0 : pc(lo)); // down to a C
  hi = Math.max(hi, lo + min); while (pc(hi) !== 0 && pc(hi) !== 4 && pc(hi) !== 11) hi++;
  return [midiToName(lo), midiToName(hi)];
}

// ---------- guitar chord box ----------
export function chordBox(sym, { inst = byId('guitar'), size = 1 } = {}) {
  const c = GUITAR_CHORDS[sym]; if (!c) return '';
  const n = c.frets.length; const fretted = c.frets.filter((f) => f > 0);
  const base = fretted.length && Math.max(...fretted) > 4 ? Math.min(...fretted) : 1;
  const W = 140, H = 168, x0 = 22, y0 = 40, dx = (W - 44) / (n - 1), dy = 24;
  let s = `<svg viewBox="0 0 ${W} ${H}" class="cbox" role="img" aria-label="${esc(sym)} chord diagram" style="max-width:${180 * size}px">`;
  s += `<text x="${W / 2}" y="18" class="cname">${esc(pretty(sym))}</text>`;
  for (let i = 0; i < n; i++) s += `<line x1="${x0 + i * dx}" y1="${y0}" x2="${x0 + i * dx}" y2="${y0 + dy * 5}" class="str"/>`;
  for (let f = 0; f <= 5; f++) s += `<line x1="${x0}" y1="${y0 + f * dy}" x2="${x0 + (n - 1) * dx}" y2="${y0 + f * dy}" class="${f === 0 && base === 1 ? 'nut' : 'fret'}"/>`;
  if (base > 1) s += `<text x="${x0 - 10}" y="${y0 + dy * 0.65}" class="fbase">${base}</text>`;
  if (c.barre) { const bf = c.barre.fret - base + 1; s += `<rect x="${x0 + c.barre.from * dx - 8}" y="${y0 + (bf - 0.5) * dy - 8}" width="${(c.barre.to - c.barre.from) * dx + 16}" height="16" rx="8" class="barre"/>`; }
  c.frets.forEach((f, i) => {
    const x = x0 + i * dx;
    if (f == null) s += `<text x="${x}" y="${y0 - 8}" class="xo">×</text>`;
    else if (f === 0) s += `<circle cx="${x}" cy="${y0 - 12}" r="5" class="open"/>`;
    else if (!(c.barre && f === c.barre.fret && c.fingers[i] === 1 && i !== c.barre.from)) {
      const fy = y0 + (f - base + 0.5) * dy; s += `<circle cx="${x}" cy="${fy}" r="9" class="dot"/><text x="${x}" y="${fy + 4}" class="dtxt">${c.fingers[i] || ''}</text>`;
    }
  });
  s += `<text x="${W / 2}" y="${H - 4}" class="snames">${inst.strings.map((x) => x.replace(/\d/, '')).join('  ')}</text></svg>`;
  return s;
}

// ---------- fretboard (horizontal, high string on top like tab) ----------
export function fretboard({ inst = byId('guitar'), from = 0, frets = 5, dots = [], scale = null, open = false } = {}) {
  const n = inst.strings.length; const W = 340, H = 30 + n * 22, x0 = 34, fw = (W - x0 - 10) / frets;
  let s = `<svg viewBox="0 0 ${W} ${H}" class="fboard" role="img" aria-label="${esc(inst.name)} fretboard">`;
  for (let f = 0; f <= frets; f++) s += `<line x1="${x0 + f * fw}" y1="14" x2="${x0 + f * fw}" y2="${14 + (n - 1) * 22}" class="${f === 0 && from === 0 ? 'nut' : 'fret'}"/>`;
  for (let i = 0; i < n; i++) { const y = 14 + i * 22; const sname = inst.strings[n - 1 - i].replace(/\d/, ''); s += `<line x1="${x0}" y1="${y}" x2="${W - 10}" y2="${y}" class="str" style="stroke-width:${1 + i * 0.35}"/><text x="${x0 - 14}" y="${y + 4}" class="sn">${sname}</text>`; }
  for (let f = 1; f <= frets; f++) s += `<text x="${x0 + (f - 0.5) * fw}" y="${H - 2}" class="fnum">${from + f}</text>`;
  let pts = dots;
  if (scale === 'Am-penta') {
    const pcs = [9, 0, 2, 4, 7]; pts = [];
    inst.strings.forEach((st, si) => { for (let f = from + 1; f <= from + frets; f++) { const m = nameToMidi(st) + f; if (pcs.includes(pc(m))) pts.push({ s: si, f, label: f - from === 1 ? '1' : f - from === 3 ? '3' : f - from === 4 ? '4' : '2', root: pc(m) === 9 }); } });
  }
  for (const d of pts) { const y = 14 + (n - 1 - d.s) * 22; const x = d.f === 0 ? x0 - 2 : x0 + (d.f - from - 0.5) * fw; s += `<circle cx="${x}" cy="${y}" r="9" class="dot${d.root ? ' root' : ''}"/><text x="${x}" y="${y + 4}" class="dtxt">${esc(d.label || '')}</text>`; }
  if (open) inst.strings.forEach((st, si) => { const y = 14 + (n - 1 - si) * 22; s += `<text x="${x0 + 6}" y="${y - 4}" class="onote">${st.replace(/\d/, '')}</text>`; });
  return s + '</svg>';
}

// ---------- wind fingerings ----------
export function saxDiagram(note) {
  const keys = new Set(saxFingering(note) || []);
  const c = (id, cx, cy, r, lab) => `<g class="wk${keys.has(id) ? ' on' : ''}"><circle cx="${cx}" cy="${cy}" r="${r}"/>${lab ? `<text x="${cx + r + 8}" y="${cy + 4}" class="wl">${lab}</text>` : ''}</g>`;
  let s = `<svg viewBox="0 0 160 300" class="wind" role="img" aria-label="Saxophone fingering for ${esc(pretty(note))}">`;
  s += `<rect x="58" y="10" width="44" height="280" rx="22" class="body"/>`;
  s += `<g class="wk${keys.has('oct') ? ' on' : ''}"><ellipse cx="34" cy="36" rx="12" ry="7"/><text x="10" y="58" class="wl sm">octave</text></g>`;
  s += c('L1', 80, 46, 14, '1') + `<g class="wk${keys.has('bis') ? ' on' : ''}"><circle cx="80" cy="70" r="5"/><text x="112" y="74" class="wl sm">bis</text></g>` + c('L2', 80, 94, 14, '2') + c('L3', 80, 128, 14, '3');
  s += `<line x1="62" y1="152" x2="98" y2="152" class="sep"/><text x="20" y="96" class="wl sm">left</text><text x="20" y="214" class="wl sm">right</text>`;
  s += c('R1', 80, 176, 14, '1') + c('R2', 80, 210, 14, '2') + c('R3', 80, 244, 14, '3');
  s += `<g class="wk${keys.has('lowC') ? ' on' : ''}"><ellipse cx="80" cy="274" rx="16" ry="7"/><text x="104" y="278" class="wl sm">low C</text></g>`;
  return s + '</svg>';
}
export function clarinetDiagram(note) {
  const keys = new Set(clarinetFingering(note) || []);
  const c = (id, cx, cy, r, lab, ring) => `<g class="wk${keys.has(id) ? ' on' : ''}${ring ? ' ring' : ''}"><circle cx="${cx}" cy="${cy}" r="${r}"/>${lab ? `<text x="${cx + r + 8}" y="${cy + 4}" class="wl">${lab}</text>` : ''}</g>`;
  let s = `<svg viewBox="0 0 170 310" class="wind" role="img" aria-label="Clarinet fingering for ${esc(pretty(note))}">`;
  s += `<rect x="64" y="8" width="34" height="294" rx="17" class="body"/>`;
  s += `<g class="wk${keys.has('A') ? ' on' : ''}"><rect x="72" y="14" width="18" height="9" rx="4.5"/><text x="102" y="23" class="wl sm">A key</text></g>`;
  s += c('T', 34, 62, 11, '') + `<text x="8" y="88" class="wl sm">thumb</text>`;
  s += `<g class="wk${keys.has('reg') ? ' on' : ''}"><rect x="22" y="34" width="24" height="9" rx="4.5"/><text x="4" y="30" class="wl sm">register</text></g>`;
  s += c('L1', 81, 50, 11, '1', 1) + c('L2', 81, 82, 11, '2', 1) + c('L3', 81, 114, 11, '3', 1);
  s += `<line x1="66" y1="136" x2="96" y2="136" class="sep"/>`;
  s += c('R1', 81, 160, 11, '1', 1) + c('R2', 81, 192, 11, '2', 1) + c('R3', 81, 224, 11, '3', 1);
  s += `<g class="wk${keys.has('EB') ? ' on' : ''}"><ellipse cx="66" cy="262" rx="13" ry="6"/><text x="6" y="266" class="wl sm">E/B</text></g>`;
  s += `<g class="wk${keys.has('FC') ? ' on' : ''}"><ellipse cx="96" cy="276" rx="13" ry="6"/><text x="114" y="280" class="wl sm">F/C</text></g>`;
  return s + '</svg>';
}
export function trumpetDiagram(note) {
  const v = trumpetValves(note) || '';
  let s = `<svg viewBox="0 0 220 130" class="wind" role="img" aria-label="Trumpet valves for ${esc(pretty(note))}: ${v === '0' ? 'open' : v.split('').join(' and ')}">`;
  s += `<rect x="20" y="48" width="180" height="16" rx="8" class="body"/>`;
  [1, 2, 3].forEach((n, i) => { const x = 60 + i * 50; s += `<g class="wk${v.includes(String(n)) ? ' on' : ''}"><rect x="${x - 15}" y="20" width="30" height="72" rx="10" class="valvebody"/><circle cx="${x}" cy="20" r="15"/><text x="${x}" y="25" class="vnum">${n}</text></g>`; });
  s += `<text x="110" y="122" class="wl mid">${v === '0' ? 'Open: no valves' : 'Valves ' + v.split('').join(' + ')}</text>`;
  return s + '</svg>';
}

// ---------- violin / cello fingerboard ----------
export function stringDiagram(note, instId) {
  const inst = byId(instId); const f = stringFinger(note, inst);
  const n = inst.strings.length; const W = 200, H = 260, x0 = 40, dx = (W - 80) / (n - 1);
  const steps = inst.id === 'violin' ? 8 : 6; const dy = (H - 70) / steps;
  let s = `<svg viewBox="0 0 ${W} ${H}" class="fboard vert" role="img" aria-label="${esc(inst.name)}: ${esc(pretty(note))}${f ? `, ${f.stringName} string, finger ${f.finger}` : ''}">`;
  s += `<rect x="${x0 - 14}" y="30" width="${(n - 1) * dx + 28}" height="${H - 46}" rx="8" class="board"/>`;
  inst.strings.forEach((st, i) => { const x = x0 + i * dx; s += `<line x1="${x}" y1="30" x2="${x}" y2="${H - 16}" class="str${f && f.string === i ? ' on' : ''}"/><text x="${x}" y="20" class="sn">${st.replace(/\d/, '')}</text>`; });
  s += `<line x1="${x0 - 14}" y1="30" x2="${x0 + (n - 1) * dx + 14}" y2="30" class="nut"/>`;
  if (f) {
    const x = x0 + f.string * dx;
    if (f.semis === 0) s += `<circle cx="${x}" cy="30" r="10" class="dot open"/><text x="${x}" y="34" class="dtxt">0</text>`;
    else { const y = 30 + f.semis * dy; s += `<circle cx="${x}" cy="${y}" r="12" class="dot"/><text x="${x}" y="${y + 4}" class="dtxt">${esc(f.finger.replace(/\D/g, ''))}</text>`; }
  }
  s += `<text x="${W / 2}" y="${H - 1}" class="wl mid">${f ? `${esc(pretty(note.replace(/\d/, '')))}: ${esc(f.stringName)} string, ${f.semis === 0 ? 'open' : 'finger ' + esc(f.finger)}` : ''}</text>`;
  return s + '</svg>';
}

// ---------- harp ----------
export function harpDiagram({ from = 'C4', to = 'C5', hl = [], sharp = [] } = {}) {
  const lo = nameToMidi(from), hi = nameToMidi(to); const ws = []; for (let m = lo; m <= hi; m++) if (!isBlack(m)) ws.push(m);
  const W = Math.max(220, ws.length * 26 + 20), H = 170; const hs = new Set(hl.map(nameToMidi));
  let s = `<svg viewBox="0 0 ${W} ${H}" class="harp" role="img" aria-label="Harp strings">`;
  ws.forEach((m, i) => {
    const x = 16 + i * 26, p = pc(m), len = 130 - i * (60 / ws.length);
    const cls = p === 0 ? 'c' : p === 5 ? 'f' : '';
    const letter = midiToName(m).replace(/\d/, '');
    s += `<line x1="${x}" y1="${H - 26 - len}" x2="${x}" y2="${H - 26}" class="hs ${cls}${hs.has(m) ? ' on' : ''}"/><text x="${x}" y="${H - 8}" class="sn">${letter}${sharp.includes(letter) ? '♯' : ''}</text>`;
  });
  return s + '</svg>';
}

// ---------- hands ----------
export function handsDiagram() {
  const hand = (cx, flip) => {
    const fx = [-34, -17, 0, 17, 34]; const fl = [34, 52, 58, 52, 40]; const nums = [1, 2, 3, 4, 5];
    let g = `<rect x="${cx - 42}" y="88" width="84" height="66" rx="26" class="palm"/>`;
    fx.forEach((dx, i) => {
      const k = flip ? 4 - i : i; const n = nums[k]; const len = fl[k];
      if (n === 1) { const tx = flip ? cx + 52 : cx - 52; g += `<rect x="${tx - 9}" y="${96}" width="18" height="44" rx="9" class="finger" transform="rotate(${flip ? 28 : -28} ${tx} 120)"/><text x="${tx + (flip ? 4 : -4)}" y="${112}" class="ftxt2">1</text>`; return; }
      const x = cx + dx * 1.05; g += `<rect x="${x - 8.5}" y="${92 - len}" width="17" height="${len + 10}" rx="8.5" class="finger"/><text x="${x}" y="${84 - len + 18}" class="ftxt2">${n}</text>`;
    });
    return g;
  };
  return `<svg viewBox="0 0 320 170" class="hands" role="img" aria-label="Finger numbers: thumbs are 1, little fingers are 5">${hand(80, true)}${hand(240, false)}<text x="80" y="168" class="wl mid">Left hand</text><text x="240" y="168" class="wl mid">Right hand</text></svg>`;
}

// ---------- circle of fifths ----------
export function circleDiagram() {
  const majors = ['C', 'G', 'D', 'A', 'E', 'B', 'F♯/G♭', 'D♭', 'A♭', 'E♭', 'B♭', 'F'];
  const minors = ['Am', 'Em', 'Bm', 'F♯m', 'C♯m', 'G♯m', 'E♭m', 'B♭m', 'Fm', 'Cm', 'Gm', 'Dm'];
  const sigs = ['', '1♯', '2♯', '3♯', '4♯', '5♯', '6♯/6♭', '5♭', '4♭', '3♭', '2♭', '1♭'];
  let s = '<svg viewBox="0 0 300 300" class="circle5" role="img" aria-label="Circle of fifths">';
  s += '<circle cx="150" cy="150" r="138" class="ring"/><circle cx="150" cy="150" r="92" class="ring2"/><circle cx="150" cy="150" r="54" class="ring3"/>';
  majors.forEach((k, i) => {
    const a = (i * 30 - 90) * Math.PI / 180; const x = 150 + Math.cos(a) * 116, y = 150 + Math.sin(a) * 116; const x2 = 150 + Math.cos(a) * 73, y2 = 150 + Math.sin(a) * 73;
    const x3 = 150 + Math.cos(a) * 147, y3 = 150 + Math.sin(a) * 147;
    s += `<text x="${x}" y="${y + 6}" class="maj">${k}</text><text x="${x2}" y="${y2 + 4}" class="min">${minors[i]}</text>`;
    if (sigs[i]) s += `<text x="${x3}" y="${y3 + 3}" class="sig">${sigs[i]}</text>`;
  });
  return s + '</svg>';
}

// ---------- open strings overview ----------
export function stringsDiagram(instId) {
  const inst = byId(instId);
  return `<div class="strings-ov">${inst.strings.map((s) => `<span><b>${s.replace(/\d/, '')}</b><small>${s}</small></span>`).join('')}</div>`;
}

/** Fingering diagram for the current instrument and a written note, or '' if the instrument has none. */
export function fingeringFor(instId, note) {
  if (instId === 'altosax' || instId === 'tenorsax') return saxDiagram(note);
  if (instId === 'clarinet') return clarinetDiagram(note);
  if (instId === 'trumpet') return trumpetDiagram(note);
  if (instId === 'violin' || instId === 'cello') return stringDiagram(note, instId);
  if (instId === 'guitar' || instId === 'bass') {
    const inst = byId(instId); const p = fretFor(note, inst); if (!p) return '';
    return fretboard({ inst, frets: Math.max(5, p.fret + 1), dots: [{ s: p.string, f: p.fret, label: p.fret === 0 ? '0' : String(Math.min(4, p.fret)) }] });
  }
  return '';
}
