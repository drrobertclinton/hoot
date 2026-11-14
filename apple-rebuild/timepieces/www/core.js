/* Vilasi Timepieces — state, helpers, dial home, sheet infrastructure */
'use strict';
var KEY = 'vtp.v1.state';
var DAY = 86400000;
var RM = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
function $(s, r) { return (r || document).querySelector(s); }
function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function uid() { return Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4); }
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function ymd(d) { d = new Date(d); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
function parseYmd(s) { var a = String(s).split('-').map(Number); return new Date(a[0], a[1] - 1, a[2]); }
function fmtDate(v) { if (!v) return '—'; var d = typeof v === 'string' ? parseYmd(v) : new Date(v); return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); }
function fmtMonth(v) { var d = typeof v === 'string' ? parseYmd(v) : new Date(v); return d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }); }
function fmtRate(x) { return (x >= 0 ? '+' : '−') + Math.abs(x).toFixed(1); }
function fmtMoney(n) { if (n === '' || n == null || isNaN(+n)) return '—'; return (S.settings.currency || '$') + Math.round(+n).toLocaleString('en-US'); }
function num(v, d) { var n = parseFloat(String(v).replace(',', '.')); return isNaN(n) ? d : n; }
function addYears(s, y) { var d = parseYmd(s); var whole = Math.floor(y); d.setFullYear(d.getFullYear() + whole); d.setMonth(d.getMonth() + Math.round((y - whole) * 12)); return d; }

var SPECS = {
  cosc: { n: 'COSC chronometer', min: -4, max: 6 },
  metas: { n: 'METAS Master Chronometer', min: 0, max: 5 },
  superlative: { n: 'Superlative Chronometer', min: -2, max: 2 },
  gs: { n: 'Grand Seiko standard', min: -3, max: 5 },
  std: { n: 'Standard mechanical', min: -10, max: 20 },
  entry: { n: 'Entry-level mechanical', min: -20, max: 40 },
  sd: { n: 'Spring Drive', min: -1, max: 1 },
  quartz: { n: 'Quartz (±15 s/month)', min: -0.5, max: 0.5 },
  custom: { n: 'Custom tolerance' }
};
var MOVES = { automatic: 'Automatic', manual: 'Hand-wound', quartz: 'Quartz', solar: 'Solar quartz', springdrive: 'Spring Drive' };
var POSITIONS = ['On the wrist', 'Dial up', 'Dial down', 'Crown up', 'Crown down', 'Crown left', 'Mixed'];
var PAPERS = [['innerBox', 'Inner box'], ['outerBox', 'Outer box'], ['warrantyCard', 'Warranty card'], ['manual', 'Instruction manual'], ['hangTags', 'Hang tags'], ['spareLinks', 'Spare links / strap'], ['receipt', 'Purchase receipt'], ['servicePapers', 'Service papers']];

/* ---------- state ---------- */
var S;
function blankWatch() {
  return { id: 'w_' + uid(), brand: '', model: '', ref: '', dial: '#101113', caseFinish: 'steel', hands: 'baton', markers: 'batons', bezel: 'plain', bezelColor: '', strap: 'bracelet', strapColor: '', date: false, diameter: 40, l2l: 47, thickness: 11.5, movement: 'automatic', spec: 'std', specMin: -10, specMax: 20, styles: ['everyday'], wr: 100, purchase: { date: '', price: '', from: '', serial: '', insured: '' }, warrantyYears: 2, service: { last: '', interval: '', history: [] }, papers: {}, readings: [], notes: '' };
}
function seedState() {
  var now = Date.now();
  var ago = function (n) { return ymd(now - n * DAY); };
  var at = function (days, hour) { var d = new Date(now - days * DAY); d.setHours(hour, 12, 0, 0); return d.getTime(); };
  var a = Object.assign(blankWatch(), {
    id: 'w_seed_bb', brand: 'Tudor', model: 'Black Bay 58', ref: 'M79030N', dial: '#101113', hands: 'snowflake', markers: 'dots', bezel: 'dive', bezelColor: '#15161a', strap: 'bracelet', accent: '#eae4d0',
    diameter: 39, l2l: 47.8, thickness: 11.9, movement: 'automatic', spec: 'cosc', styles: ['sport', 'everyday', 'travel'], wr: 200, warrantyYears: 5, example: true,
    purchase: { date: ago(880), price: 3950, from: 'Authorised dealer', serial: 'EXAMPLE-0417', insured: 4300 },
    service: { last: '', interval: 10, history: [] },
    papers: { innerBox: true, outerBox: true, warrantyCard: true, manual: true, hangTags: true, spareLinks: true, receipt: true },
    readings: [
      { id: uid(), t: at(12, 8), offset: 1.0, pos: 'On the wrist', reset: true },
      { id: uid(), t: at(9, 8), offset: 7.3, pos: 'On the wrist' },
      { id: uid(), t: at(6, 8), offset: 16.3, pos: 'Dial up' },
      { id: uid(), t: at(3, 8), offset: 24.1, pos: 'On the wrist' },
      { id: uid(), t: at(1, 8), offset: 38.9, pos: 'Crown down' }
    ],
    notes: 'Example watch. Edit or delete it from the dial.'
  });
  var b = Object.assign(blankWatch(), {
    id: 'w_seed_al', brand: 'Seiko', model: 'Prospex Alpinist', ref: 'SPB121', dial: '#1d4a35', hands: 'dauphine', markers: 'explorer', bezel: 'plain', strap: 'leather', strapColor: '#4a2e1b', caseFinish: 'steel', date: true, accent: '#e9c66a',
    diameter: 39.5, l2l: 46.4, thickness: 13.2, movement: 'automatic', spec: 'custom', specMin: -15, specMax: 25, styles: ['sport', 'travel', 'everyday'], wr: 200, warrantyYears: 3, example: true,
    purchase: { date: ago(390), price: 725, from: 'Online retailer', serial: 'EXAMPLE-1D2204', insured: 750 },
    service: { last: '', interval: 5, history: [] },
    papers: { innerBox: true, warrantyCard: true, manual: true, receipt: true },
    readings: [
      { id: uid(), t: at(20, 21), offset: 0, pos: 'On the wrist', reset: true },
      { id: uid(), t: at(14, 21), offset: 52, pos: 'Mixed' },
      { id: uid(), t: at(7, 21), offset: 120, pos: 'Dial up' },
      { id: uid(), t: at(2, 21), offset: 161, pos: 'On the wrist' }
    ],
    notes: 'Example watch.'
  });
  var c = Object.assign(blankWatch(), {
    id: 'w_seed_no', brand: 'Nomos', model: 'Tangente 35', ref: '139', dial: '#f3f1ea', hands: 'baton', markers: 'arabic', bezel: 'plain', strap: 'leather', strapColor: '#15171a', accent: '#2f4f9e',
    diameter: 35, l2l: 45, thickness: 6.6, movement: 'manual', spec: 'std', styles: ['dress'], wr: 30, warrantyYears: 2, example: true,
    purchase: { date: ago(2050), price: 1680, from: 'Boutique', serial: 'EXAMPLE-88213', insured: 2100 },
    service: { last: '', interval: 5, history: [] },
    papers: { innerBox: true, outerBox: true, warrantyCard: true, manual: true },
    readings: [
      { id: uid(), t: at(30, 9), offset: -2, pos: 'Dial up', reset: true },
      { id: uid(), t: at(26, 9), offset: -9.6, pos: 'Dial up' },
      { id: uid(), t: at(25, 9), offset: -11, pos: 'On the wrist' }
    ],
    notes: 'Example watch. Service is shown as overdue to demonstrate the reminder.'
  });
  var wears = [];
  for (var i = 1; i <= 72; i++) {
    var v = (i * 7 + 3) % 10;
    if (v < 5) wears.push({ d: ago(i), w: a.id });
    else if (v < 8) wears.push({ d: ago(i), w: b.id });
    else if (v === 8 && i >= 25) wears.push({ d: ago(i), w: c.id });
    if (i % 9 === 4 && v < 5) wears.push({ d: ago(i), w: b.id });
  }
  return { v: 1, watches: [a, b, c], wears: wears, settings: { wristCm: 17, unit: 'cm', pxPerMm: 0, calibrated: false, currency: '$', plan: 'everyday', hintSeen: false }, finder: {} };
}
function load() {
  try {
    var raw = localStorage.getItem(KEY);
    if (raw) { S = JSON.parse(raw); if (!S || !Array.isArray(S.watches)) throw 0; }
    else S = seedState();
  } catch (e) { S = seedState(); }
  S.wears = S.wears || []; S.settings = S.settings || {}; S.finder = S.finder || {};
  S.watches.forEach(normWatch);
}
function normWatch(w) {
  var b = blankWatch();
  Object.keys(b).forEach(function (k) { if (w[k] === undefined && k !== 'id') w[k] = b[k]; });
  w.purchase = Object.assign({}, b.purchase, w.purchase); w.service = Object.assign({}, b.service, w.service);
  w.service.history = w.service.history || []; w.papers = w.papers || {}; w.readings = w.readings || []; w.styles = w.styles || [];
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { toast('Could not save — storage is full or blocked'); } }
function watchById(id) { for (var i = 0; i < S.watches.length; i++) if (S.watches[i].id === id) return S.watches[i]; return null; }
function wname(w) { return ((w.brand || '') + ' ' + (w.model || '')).trim() || 'Untitled watch'; }

/* ---------- derived data ---------- */
function wearsOn(d) { return S.wears.filter(function (x) { return x.d === d; }).map(function (x) { return x.w; }); }
function lastWorn(id) { var m = null; S.wears.forEach(function (x) { if (x.w === id && (!m || x.d > m)) m = x.d; }); return m; }
function daysSince(id) { var l = lastWorn(id); if (!l) return null; return Math.round((parseYmd(ymd(Date.now())) - parseYmd(l)) / DAY); }
function toggleWear(d, id) {
  var i = -1; S.wears.forEach(function (x, k) { if (x.d === d && x.w === id) i = k; });
  if (i >= 0) S.wears.splice(i, 1); else S.wears.push({ d: d, w: id });
  save(); return i < 0;
}
function rates(w) {
  var all = (w.readings || []).slice().sort(function (a, b) { return a.t - b.t; }), prev = null;
  return all.map(function (r) {
    if (r.type === 'tg') return Object.assign({}, r, { days: 0 });
    var rate = null, days = 0;
    if (prev && !r.reset) { days = (r.t - prev.t) / DAY; if (days >= 0.02) rate = (r.offset - prev.offset) / days; }
    prev = r;
    return Object.assign({}, r, { rate: rate, days: days });
  });
}
function avgRate(w) {
  var rr = rates(w).filter(function (r) { return r.rate != null; });
  var sy = rr.filter(function (r) { return r.type !== 'tg'; });
  var d = sy.reduce(function (a, r) { return a + r.days; }, 0);
  if (d > 0) return sy.reduce(function (a, r) { return a + r.rate * r.days; }, 0) / d;
  if (rr.length) return rr.reduce(function (a, r) { return a + r.rate; }, 0) / rr.length;
  return null;
}
function specOf(w) {
  if (w.spec === 'custom') return { n: 'Custom tolerance', min: num(w.specMin, -10), max: num(w.specMax, 20) };
  return SPECS[w.spec] || SPECS.std;
}
function specLabel(sp) { var f = function (v) { return (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v); }; return f(sp.min) + ' / ' + f(sp.max) + ' s/d'; }
function svcInterval(w) { return num(w.service.interval, 0) || ({ quartz: 3, solar: 10 }[w.movement] || 5); }
function svcDue(w) { var base = w.service.last || w.purchase.date; if (!base) return null; return addYears(base, svcInterval(w)); }
function svcStatus(w) {
  var due = svcDue(w); if (!due) return { k: 'none', label: 'No date set' };
  var days = Math.round((due - Date.now()) / DAY);
  if (days < 0) return { k: 'bad', label: 'Overdue by ' + humanDays(-days), due: due, days: days };
  if (days < 183) return { k: 'warn', label: 'Due in ' + humanDays(days), due: due, days: days };
  return { k: 'ok', label: 'Due ' + fmtMonth(due), due: due, days: days };
}
function humanDays(n) { if (n < 60) return n + ' day' + (n === 1 ? '' : 's'); if (n < 730) return Math.round(n / 30.4) + ' months'; return (n / 365).toFixed(1) + ' years'; }
function warrantyEnd(w) { if (!w.purchase.date || !num(w.warrantyYears, 0)) return null; return addYears(w.purchase.date, num(w.warrantyYears, 0)); }

/* ---------- ui state ---------- */
var ui = { idx: 0, tool: null, sel: null };
var TOOLS = {}, ACT = {}, IN = {};
function curWatch() { return S.watches[ui.idx] || null; }
function selWatch() { var w = watchById(ui.sel); if (!w) { w = curWatch() || S.watches[0] || null; ui.sel = w ? w.id : null; } return w; }

/* ---------- home ---------- */
var RING = [['fit', 'WRIST FIT'], ['accuracy', 'ACCURACY'], ['timegrapher', 'TIMEGRAPHER'], ['rotation', 'ROTATION'], ['papers', 'PAPERS'], ['finder', 'FINDER']];
function arcPath(r1, r2, a0, a1) {
  var P = function (a, r) { var q = pt(a, r); return n2(q[0]) + ' ' + n2(q[1]); };
  return 'M' + P(a0, r2) + 'A' + r2 + ' ' + r2 + ' 0 0 1 ' + P(a1, r2) + 'L' + P(a1, r1) + 'A' + r1 + ' ' + r1 + ' 0 0 0 ' + P(a0, r1) + 'Z';
}
function ringSVG() {
  var spans = [[24, 66], [69, 111], [114, 156], [204, 246], [249, 291], [294, 336]];
  var s = '<defs><linearGradient id="rgA" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4a5057"/><stop offset=".5" stop-color="#1d2024"/><stop offset="1" stop-color="#3a3f45"/></linearGradient>' +
    '<pattern id="rgB" width="3" height="3" patternUnits="userSpaceOnUse" patternTransform="rotate(18)"><rect width="3" height="3" fill="none"/><line x1="0" y1="0" x2="3" y2="0" stroke="#fff" stroke-opacity=".07"/></pattern></defs>';
  s += '<circle r="207.5" fill="none" stroke="#2a2e33" stroke-width="1"/><circle r="150.5" fill="none" stroke="#2a2e33" stroke-width="1"/>';
  spans.forEach(function (sp, i) {
    var mid = (sp[0] + sp[1]) / 2, rev = mid > 90 && mid < 270, rt = 179;
    var A = pt(sp[0] + 2, rev ? rt + 4.6 : rt - 4.6), B = pt(sp[1] - 2, rev ? rt + 4.6 : rt - 4.6), rr = rev ? rt + 4.6 : rt - 4.6;
    var d = rev ? ('M' + n2(B[0]) + ' ' + n2(B[1]) + 'A' + rr + ' ' + rr + ' 0 0 0 ' + n2(A[0]) + ' ' + n2(A[1])) : ('M' + n2(A[0]) + ' ' + n2(A[1]) + 'A' + rr + ' ' + rr + ' 0 0 1 ' + n2(B[0]) + ' ' + n2(B[1]));
    var seg = arcPath(153, 205, sp[0], sp[1]);
    s += '<g class="seg" role="button" tabindex="0" aria-label="' + RING[i][1] + '" data-act="tool" data-tool="' + RING[i][0] + '">' +
      '<path d="' + seg + '" fill="url(#rgA)"/><path d="' + seg + '" fill="url(#rgB)"/><path class="seg-edge" d="' + seg + '" fill="none" stroke="#5b626a" stroke-opacity=".55"/>' +
      '<path id="rp' + i + '" d="' + d + '" fill="none"/><text class="seg-t"><textPath href="#rp' + i + '" startOffset="50%" text-anchor="middle">' + RING[i][1] + '</textPath></text></g>';
  });
  /* pip at 12 and minute ticks in the gaps */
  s += '<path d="M-9 -200L9 -200L0 -184Z" fill="#9dffb5"/><circle cx="0" cy="-166" r="3" fill="#9dffb5" opacity=".7"/>';
  [-18, -12, 12, 18, 162, 168, 174, 180, 186, 192, 198].forEach(function (a) { var q = pt(a, 160), x = pt(a, 198); s += '<line x1="' + n2(q[0]) + '" y1="' + n2(q[1]) + '" x2="' + n2(x[0]) + '" y2="' + n2(x[1]) + '" stroke="#3b4046" stroke-width="1.2"/>'; });
  return s;
}
var live = [], liveExtra = [];
function renderHome() {
  var tr = $('#track'), h = '';
  S.watches.forEach(function (w) {
    h += '<div class="slide" data-id="' + w.id + '"><svg viewBox="-210 -210 420 420" data-q="' + ((w.movement === 'quartz' || w.movement === 'solar') ? 1 : 0) + '" data-sd="' + (w.movement === 'springdrive' ? 1 : 0) + '" role="img" aria-label="' + esc(wname(w)) + ' dial showing the current time">' + drawWatch(w, { p: 'h' + w.id, live: true }) + '</svg></div>';
  });
  h += '<div class="slide add" data-id=""><svg viewBox="-210 -210 420 420" role="img" aria-label="Add a watch"><circle r="118" fill="#0b0d0f" stroke="#3b4046" stroke-width="2" stroke-dasharray="3 9"/>' +
    '<circle r="96" fill="none" stroke="#1f2327"/><path d="M-26 0H26M0 -26V26" stroke="#9dffb5" stroke-width="3" stroke-linecap="round"/><text y="62" text-anchor="middle" font-family="' + CONDFONT + '" font-size="13" letter-spacing="3" fill="#8b9299">ADD A WATCH</text></svg></div>';
  tr.innerHTML = h;
  live = $$('#track svg[data-q]').map(function (sv) { return { h: $('.hh', sv), m: $('.mh', sv), s: $('.sh', sv), q: sv.dataset.q === '1', sd: sv.dataset.sd === '1' }; });
  ui.idx = clamp(ui.idx, 0, S.watches.length);
  setIdx(ui.idx, false);
}
function setIdx(i, anim) {
  ui.idx = clamp(i, 0, S.watches.length);
  var tr = $('#track');
  tr.style.transition = (anim && !RM) ? 'transform .5s cubic-bezier(.2,.85,.25,1)' : 'none';
  tr.style.transform = 'translateX(' + (-ui.idx * 100) + '%)';
  renderInfo();
}
function renderInfo() {
  var w = curWatch(), el = $('#info'), dots = '';
  for (var i = 0; i <= S.watches.length; i++) dots += '<button class="dot' + (i === ui.idx ? ' on' : '') + (i === S.watches.length ? ' plus' : '') + '" data-act="goto" data-i="' + i + '" aria-label="' + (i === S.watches.length ? 'Add a watch' : 'Watch ' + (i + 1)) + '"><i></i></button>';
  if (!w) {
    el.innerHTML = '<div class="brand">YOUR COLLECTION</div><h1 class="model">Add a watch</h1><div class="meta">' + (S.watches.length ? 'Tap the dial to add another piece.' : 'Start your collection — tap the dial. The Finder and Wrist Fit tools work without one.') + '</div><div class="pager">' + dots + '</div>' +
      '<button class="wear-btn" data-act="add-watch"><span>New watch</span></button>';
    return;
  }
  var av = avgRate(w), ds = daysSince(w.id), sv = svcStatus(w), today = ymd(Date.now()), on = wearsOn(today).indexOf(w.id) >= 0;
  el.innerHTML = '<div class="brand">' + esc((w.brand || 'Watch').toUpperCase()) + '</div><h1 class="model">' + esc(w.model || 'Untitled') + '</h1>' +
    '<div class="meta">' + n2(+w.diameter) + ' mm · ' + (MOVES[w.movement] || '') + (w.ref ? ' · Ref. ' + esc(w.ref) : '') + '</div>' +
    '<div class="pager">' + dots + '</div>' +
    '<div class="facts">' +
    '<button data-act="tool" data-tool="accuracy"><b>' + (av == null ? '—' : fmtRate(av)) + '</b><span>sec / day</span></button>' +
    '<button data-act="tool" data-tool="rotation"><b>' + (ds == null ? '—' : ds === 0 ? 'Today' : ds + ' d') + '</b><span>' + (ds === 0 ? 'on the wrist' : 'since worn') + '</span></button>' +
    '<button data-act="tool" data-tool="papers" class="' + (sv.k === 'bad' ? 'bad' : sv.k === 'warn' ? 'warn' : '') + '"><b>' + (sv.due ? fmtMonth(sv.due) : '—') + '</b><span>' + (sv.k === 'bad' ? 'service overdue' : 'service due') + '</span></button>' +
    '</div>' +
    '<button class="wear-btn' + (on ? ' on' : '') + '" data-act="wear-today" aria-pressed="' + on + '"><i></i><span>' + (on ? 'On the wrist today' : 'Wear this today') + '</span></button>';
}
function initSwipe() {
  var tr = $('#track'), st = null;
  tr.addEventListener('pointerdown', function (e) { st = { x: e.clientX, y: e.clientY, dx: 0, drag: false, t: Date.now(), id: e.pointerId }; });
  tr.addEventListener('pointermove', function (e) {
    if (!st) return;
    var dx = e.clientX - st.x, dy = e.clientY - st.y;
    if (!st.drag && Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) { st.drag = true; try { tr.setPointerCapture(st.id); } catch (x) { } tr.style.transition = 'none'; }
    if (st.drag) {
      st.dx = dx;
      if ((ui.idx === 0 && dx > 0) || (ui.idx === S.watches.length && dx < 0)) dx *= .3;
      tr.style.transform = 'translateX(calc(' + (-ui.idx * 100) + '% + ' + dx + 'px))';
    }
  });
  var end = function (e) {
    if (!st) return;
    var s = st; st = null;
    if (s.drag) {
      var W = tr.clientWidth, fast = Math.abs(s.dx) / Math.max(1, Date.now() - s.t) > .45;
      var go = (Math.abs(s.dx) > W * .22 || (fast && Math.abs(s.dx) > 30)) ? (s.dx < 0 ? 1 : -1) : 0;
      setIdx(ui.idx + go, true);
    } else if (e.type === 'pointerup' && Math.abs(e.clientX - s.x) < 8 && Math.abs(e.clientY - s.y) < 8) {
      var w = curWatch(); if (w) openTool('watch', { id: w.id }); else ACT['add-watch']();
    }
  };
  tr.addEventListener('pointerup', end); tr.addEventListener('pointercancel', end);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { if (!$('#modal').hidden) closeModal(); else if (ui.tool) closeSheet(); return; }
    if (ui.tool || !$('#modal').hidden) return;
    if (e.key === 'ArrowRight') setIdx(ui.idx + 1, true);
    if (e.key === 'ArrowLeft') setIdx(ui.idx - 1, true);
    if ((e.key === 'Enter' || e.key === ' ') && e.target.closest && e.target.closest('.seg')) { e.preventDefault(); openTool(e.target.closest('.seg').dataset.tool); }
  });
}
var lastSec = -1;
function frame() {
  var d = new Date(), ms = d.getMilliseconds(), sec = d.getSeconds(), sS = sec + ms / 1000, i, L, a;
  var all = live.concat(liveExtra);
  for (i = 0; i < all.length; i++) {
    L = all[i]; if (!L.s) continue;
    a = (L.q || RM) ? sec * 6 : L.sd ? sS * 6 : Math.floor(sS * 8) / 8 * 6;
    if (L.la !== a) { L.s.setAttribute('transform', 'rotate(' + a.toFixed(2) + ')'); L.la = a; }
  }
  if (sec !== lastSec) {
    lastSec = sec;
    var m = d.getMinutes() + sec / 60, h = (d.getHours() % 12) + m / 60;
    for (i = 0; i < live.length; i++) { L = live[i]; if (L.h) L.h.setAttribute('transform', 'rotate(' + (h * 30).toFixed(2) + ')'); if (L.m) L.m.setAttribute('transform', 'rotate(' + (m * 6).toFixed(2) + ')'); }
    var td = $('#today'); if (td) { var t = d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }).toUpperCase(); if (td.textContent !== t) td.textContent = t; }
    for (i = 0; i < tickers.length; i++) tickers[i](d);
  }
  requestAnimationFrame(frame);
}
var tickers = [];

/* ---------- sheets, modal, toast ---------- */
function openTool(name, arg) {
  var T = TOOLS[name]; if (!T) return;
  var prev = ui.tool;
  if (prev && TOOLS[prev].close) TOOLS[prev].close();
  ui.tool = name;
  if (arg && arg.sel) ui.sel = arg.sel;
  else if (!prev) { var cw = curWatch(); if (cw) ui.sel = cw.id; }
  if (T.open) T.open(arg || {});
  var sh = $('#sheet');
  $('#sheetKicker').textContent = T.kicker; $('#sheetTitle').textContent = T.title;
  sh.hidden = false; sh.dataset.tool = name;
  $('#sheetBody').scrollTop = 0;
  rerender(true);
  void sh.offsetWidth; sh.classList.add('open');
  if (!S.settings.hintSeen) { S.settings.hintSeen = true; save(); var hn = $('#hint'); if (hn) hn.hidden = true; }
}
function rerender(top) {
  if (!ui.tool) return;
  var b = $('#sheetBody'), st = b.scrollTop, T = TOOLS[ui.tool];
  b.innerHTML = T.render();
  b.scrollTop = top ? 0 : st;
  if (T.after) T.after();
}
function closeSheet() {
  if (!ui.tool) return;
  if (TOOLS[ui.tool].close) TOOLS[ui.tool].close();
  ui.tool = null;
  var sh = $('#sheet'); sh.classList.remove('open');
  setTimeout(function () { if (!ui.tool) { sh.hidden = true; $('#sheetBody').innerHTML = ''; } }, RM ? 0 : 380);
  renderHome();
}
var modalClose = null;
function openModal(html, cls, onClose) {
  var m = $('#modal'); $('#modalCard').className = 'modal-card ' + (cls || ''); $('#modalCard').innerHTML = html;
  m.hidden = false; void m.offsetWidth; m.classList.add('open'); modalClose = onClose || null;
}
function closeModal() {
  var m = $('#modal'); if (m.hidden) return;
  m.classList.remove('open'); m.hidden = true; $('#modalCard').innerHTML = '';
  liveExtra = [];
  if (modalClose) { var f = modalClose; modalClose = null; f(); }
}
var confirmCb = null;
function confirmBox(title, text, ok, cb) {
  confirmCb = cb;
  openModal('<h3>' + esc(title) + '</h3><p class="mtext">' + esc(text) + '</p><div class="mrow"><button class="btn ghost" data-act="modal-close">Cancel</button><button class="btn danger" data-act="confirm-ok">' + esc(ok) + '</button></div>', 'small');
}
ACT['confirm-ok'] = function () { var f = confirmCb; confirmCb = null; closeModal(); if (f) f(); };
ACT['modal-close'] = function () { closeModal(); };
ACT['close-sheet'] = function () { closeSheet(); };
var toastT;
function toast(msg) { var t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove('on'); }, 2400); }
function saveFile(name, mime, text) {
  var blob = new Blob([text], { type: mime });
  var fallback = function () {
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 800); toast('Saved ' + name);
  };
  try {
    var f = new File([blob], name, { type: mime });
    if (navigator.canShare && navigator.canShare({ files: [f] })) { navigator.share({ files: [f], title: name }).catch(function (e) { if (!e || e.name !== 'AbortError') fallback(); }); return; }
  } catch (e) { }
  fallback();
}

/* ---------- shared bits ---------- */
function watchStrip(sel, act, extra) {
  var h = '<div class="strip" role="tablist">';
  S.watches.forEach(function (w) {
    h += '<button role="tab" aria-selected="' + (w.id === sel) + '" class="strip-b' + (w.id === sel ? ' on' : '') + '" data-act="' + act + '" data-id="' + w.id + '">' + miniWatch(w, 54) + '<span>' + esc(w.model || w.brand || 'Watch') + '</span></button>';
  });
  return h + (extra || '') + '</div>';
}
function emptyTool(msg) { return '<div class="empty"><svg viewBox="-60 -60 120 120" width="96" height="96"><circle r="46" fill="none" stroke="#3b4046" stroke-width="2" stroke-dasharray="2 7"/><path d="M0 -24V0L16 10" stroke="#9dffb5" stroke-width="3" fill="none" stroke-linecap="round"/></svg><p>' + msg + '</p><button class="btn lume" data-act="add-watch">Add a watch</button></div>'; }
function chips(list, cur, act, attr) {
  return '<div class="chips">' + list.map(function (c) { var v = c[0], on = Array.isArray(cur) ? cur.indexOf(v) >= 0 : cur === v; return '<button class="chip' + (on ? ' on' : '') + '" aria-pressed="' + on + '" data-act="' + act + '" data-v="' + esc(v) + '"' + (attr || '') + '>' + esc(c[1]) + '</button>'; }).join('') + '</div>';
}

/* ---------- home actions ---------- */
ACT.tool = function (el) { openTool(el.dataset.tool); };
ACT.goto = function (el) { setIdx(+el.dataset.i, true); };
ACT['add-watch'] = function () { if (!$('#modal').hidden) closeModal(); openTool('watch', { id: null }); };
ACT['wear-today'] = function () {
  var w = curWatch(); if (!w) return;
  var on = toggleWear(ymd(Date.now()), w.id); renderInfo();
  toast(on ? wname(w) + ' logged for today' : 'Removed from today');
};

function boot() {
  load();
  $('#ring').innerHTML = ringSVG();
  renderHome(); initSwipe();
  if (S.settings.hintSeen) $('#hint').hidden = true;
  document.addEventListener('click', function (e) {
    var el = e.target.closest ? e.target.closest('[data-act]') : null; if (!el) return;
    if (el.tagName !== 'A') e.preventDefault();
    var f = ACT[el.dataset.act]; if (f) f(el, e);
  });
  var onIn = function (e) { var el = e.target; if (!el.dataset) return; var k = el.dataset.in; if (k && IN[k]) IN[k](el, e.type); };
  document.addEventListener('input', onIn); document.addEventListener('change', onIn);
  $('#modal').addEventListener('click', function (e) { if (e.target.id === 'modal' && !$('#modalCard').classList.contains('lock')) closeModal(); });
  requestAnimationFrame(frame);
}
