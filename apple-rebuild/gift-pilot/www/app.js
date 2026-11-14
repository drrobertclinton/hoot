/* Gift Pilot — all data stays in localStorage under the "giftpilot." prefix */
(function () {
'use strict';
var KEY = 'giftpilot.v1';
var CAT = window.GP_CATALOG;
var $ = function (s, r) { return (r || document).querySelector(s); };
var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
var uid = function () { return Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3); };
var money = function (n) { n = +n || 0; return '$' + n.toLocaleString('en-US', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 }); };
var hash = function (s) { var h = 7; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; };

/* ---------- icons ---------- */
var IC = {
  plane: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M21.5 2.5 2 10.2l6.3 2.6 1.9 6.7 3.1-4.3 4.6 3.3L21.5 2.5ZM9.6 12.4l7.6-5.6-5.9 6.9-.9 3-.8-4.3Z"/></svg>',
  jet: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M22 12c0-1-1.2-1.6-2.4-1.6h-4.3L10.6 3H8.4l2.3 7.4H6.2L4.4 8H2.8l1 4-1 4h1.6l1.8-2.4h4.5L8.400 21h2.2l4.7-7.400h4.300C20.800 13.600 22 13 22 12Z"/></svg>',
  gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3.2"/><path d="M19.400 13.500a7.600 7.600 0 0 0 0-3l2-1.500-2-3.400-2.300 1a7.600 7.600 0 0 0-2.600-1.500L14 2.500h-4l-.4 2.600A7.600 7.600 0 0 0 7 6.600l-2.400-1-2 3.400 2 1.500a7.600 7.600 0 0 0 0 3l-2 1.500 2 3.400 2.400-1a7.600 7.600 0 0 0 2.600 1.500l.4 2.600h4l.4-2.600a7.600 7.600 0 0 0 2.600-1.500l2.300 1 2-3.400-1.900-1.500Z"/></svg>',
  pencil: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16v4Z"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.500"/><path d="m16 16 4.500 4.500"/></svg>',
  lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
  unlock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 7.500-2"/></svg>',
  x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.600" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.800" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12.500 4.500 4.500L19 7"/></svg>',
  undo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.200" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 5 4 9l4 4"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/></svg>',
  cal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M8 3v4M16 3v4"/></svg>',
  trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.600" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
  swap: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.200" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8h13l-3-3M20 16H7l3 3"/></svg>'
};

/* ---------- dates & occasions ---------- */
var MON = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
var MONL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
var DOW = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
var TYPES = { birthday: 'Birthday', anniversary: 'Anniversary', christmas: 'Christmas', mothers: "Mother's Day", fathers: "Father's Day", valentines: "Valentine's Day", custom: 'Custom occasion' };
var OCODE = { birthday: 'b', anniversary: 'a', christmas: 'x', mothers: 'm', fathers: 'd', valentines: 'v', custom: '' };
var FIXED = { christmas: 1, mothers: 1, fathers: 1, valentines: 1 };
var STAT = ['planning', 'chosen', 'bought', 'wrapped', 'delivered'];
var STATL = { planning: 'Planning', chosen: 'Gift chosen', bought: 'Bought', wrapped: 'Wrapped', delivered: 'Delivered' };
var AGES = { k: 'Kid (0-12)', t: 'Teen (13-17)', a: 'Adult (18-64)', s: 'Senior (65+)' };
var LEADS = [3, 7, 14, 21, 30, 45];

function today() { var d = new Date(); d.setHours(0, 0, 0, 0); return d; }
function nthDow(y, m, dow, n) { var d = new Date(y, m, 1); return new Date(y, m, 1 + ((dow - d.getDay() + 7) % 7) + (n - 1) * 7); }
function dateFor(o, y) {
  switch (o.type) {
    case 'christmas': return new Date(y, 11, 25);
    case 'valentines': return new Date(y, 1, 14);
    case 'mothers': return nthDow(y, 4, 0, 2);
    case 'fathers': return nthDow(y, 5, 0, 3);
    default: return new Date(y, (o.month || 1) - 1, o.day || 1);
  }
}
function nextDate(o) {
  var t = today();
  if (o.once) { var d1 = new Date(o.year, o.month - 1, o.day); return d1 >= t ? d1 : null; }
  var d = dateFor(o, t.getFullYear());
  if (d < t) d = dateFor(o, t.getFullYear() + 1);
  return d;
}
function daysTo(d) { return Math.round((d - today()) / 864e5); }
function fmtDate(d) { return DOW[d.getDay()] + ' ' + d.getDate() + ' ' + MON[d.getMonth()]; }
function occLabel(o) { return o.type === 'custom' ? (o.label || 'Occasion') : TYPES[o.type]; }
function occStatus(o) { var d = nextDate(o); return d && o.sy === d.getFullYear() && o.st ? o.st : 'planning'; }
function occGift(o) { var d = nextDate(o); if (!d) return null; var y = d.getFullYear(); return S.gifts.filter(function (g) { return g.occId === o.id && g.year === y; })[0] || null; }

/* ---------- state ---------- */
var S, ui = { view: 'board', personId: null, focusOcc: null, seasonId: null, showSafe: false, fresh: true, taxi: null };

function blank() { return { v: 1, ageNoteSeen: false, adult21: false, defaultLead: 14, people: [], occasions: [], seasons: [], gifts: [], seeded: true }; }
function load() {
  try { var raw = localStorage.getItem(KEY); if (raw) { var s = JSON.parse(raw); if (s && s.people) return s; } } catch (e) {}
  return seed();
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { toast('Could not save — storage is full'); } }

function seed() {
  var s = blank(), t = today();
  var plus = function (n) { var d = new Date(t); d.setDate(d.getDate() + n); return d; };
  var mk = function (name, relation, age, notes) { return { id: uid(), name: name, relation: relation, age: age, sample: true, notes: notes, interview: null, plan: [], seen: [], rejected: [], wishlist: [], history: [] }; };
  var maya = mk('Maya Okafor', 'Partner', 'a', { sizes: 'Shoes 8, tops M, ring 6', colors: 'Forest green, terracotta', allergies: 'Lavender scents', other: 'Loves handmade over mass-produced.' });
  var frank = mk('Frank Delgado', 'Dad', 's', { sizes: 'Shirt L, hat 7 3/8', colors: 'Navy, anything Cubs blue', allergies: 'No sweets — watching sugar', other: 'Says he needs nothing. He means it less than he thinks.' });
  var priya = mk('Priya Nair', 'Best friend', 'a', { sizes: 'Tops S', colors: 'Mustard, teal', allergies: 'Tree nuts', other: 'Moving apartments in spring — keep it small.' });
  s.people = [maya, frank, priya];
  var yr = t.getFullYear();
  var w = function (txt, bought) { return { id: uid(), text: txt, bought: !!bought, at: bought ? Date.now() : 0 }; };
  maya.wishlist = [w('Speckled stoneware mug from the Saturday market'), w('That clothbound edition of Jane Eyre', true), w('Monstera cutting in a real pot'), w('Linen apron with cross-back straps')];
  frank.wishlist = [w('New fishing pliers'), w('Cubs 2016 documentary')];
  priya.wishlist = [w('Travel watercolor palette', true), w('Good carry-on packing cubes')];
  var h = function (title, y, occ, price) { return { id: uid(), title: title, year: y, occ: occ, price: price }; };
  maya.history = [h('Framed custom map of a meaningful place', yr - 1, 'Anniversary', 70), h('Enameled Dutch oven', yr - 1, 'Christmas', 180), h('Concert tickets to a favorite artist', yr - 2, 'Birthday', 150)];
  frank.history = [h('Compact binoculars for birding', yr - 1, "Father's Day", 110), h('Sheepskin-lined slippers', yr - 1, 'Christmas', 65)];
  priya.history = [h('Scratch-off world map', yr - 1, 'Birthday', 30)];
  var oc = function (p, type, d, lead, extra) { var o = { id: uid(), personId: p.id, type: type, lead: lead || 14 }; if (d) { o.month = d.getMonth() + 1; o.day = d.getDate(); } if (extra) for (var k in extra) o[k] = extra[k]; s.occasions.push(o); return o; };
  var mB = oc(maya, 'birthday', plus(9), 14);
  oc(maya, 'anniversary', new Date(yr, 5, 12), 21);
  var mX = oc(maya, 'christmas', null, 30);
  oc(maya, 'valentines', null, 14);
  oc(frank, 'birthday', plus(58), 14);
  oc(frank, 'fathers', null, 21);
  var fX = oc(frank, 'christmas', null, 30);
  oc(priya, 'birthday', plus(24), 7);
  var pX = oc(priya, 'christmas', null, 30);
  var xd = new Date(yr, 11, 25), xy = xd < t ? yr + 1 : yr;
  var season = { id: uid(), name: 'Christmas ' + xy, budget: 600, alloc: {} };
  season.alloc[maya.id] = 250; season.alloc[frank.id] = 150;
  s.seasons = [season, { id: uid(), name: 'Birthdays ' + xy, budget: 300, alloc: {} }];
  var g = function (p, o, title, planned, actual, st) { s.gifts.push({ id: uid(), personId: p.id, occId: o.id, seasonId: season.id, title: title, planned: planned, actual: actual, year: xy }); o.st = st; o.sy = xy; };
  g(maya, mX, 'Pottery wheel class for two', 130, 0, 'chosen');
  g(frank, fX, 'Handcrafted wooden chess set', 85, 79.5, 'bought');
  g(priya, pX, 'Watercolor travel set', 38, 41.2, 'wrapped');
  maya.interview = { answers: { cook: true, outdoors: true, tech: false, books: true, fitness: false, music: true, art: true, home: true, travel: true, games: false, style: false, plants: true, pets: false, coffee: true, sentimental: true, exp: true, practical: false }, budget: 120, at: Date.now() };
  s.seeded = true;
  S = s; buildPlan(maya); maya.plan[0].locked = true;
  return s;
}

/* ---------- interview + recommender ---------- */
var CARDS = [
  { k: 'cook', code: 'CHEF', q: 'Loves to cook or bake?', sub: 'Weekend recipes, good knives, feeding a crowd.' },
  { k: 'outdoors', code: 'TREK', q: 'Happiest outdoors?', sub: 'Trails, campsites, water, any excuse for fresh air.' },
  { k: 'tech', code: 'TECH', q: 'Lights up at a new gadget?', sub: 'Reads the reviews, knows the specs, loves a clever device.' },
  { k: 'books', code: 'READ', q: 'Always has a book going?', sub: 'Paper, e-reader or audiobook — there is a stack somewhere.' },
  { k: 'fitness', code: 'MOVE', q: 'Works out or plays a sport?', sub: 'Gym, runs, yoga, pickleball, a weekly league.' },
  { k: 'music', code: 'TUNE', q: 'Is music a big deal to them?', sub: 'Concerts, playlists, records, or an instrument in the corner.' },
  { k: 'art', code: 'MAKE', q: 'Likes making things by hand?', sub: 'Art, crafts, DIY, building, fixing.' },
  { k: 'home', code: 'NEST', q: 'Loves a cozy, well-kept home?', sub: 'Candles, good sheets, the right throw pillow.' },
  { k: 'travel', code: 'TRIP', q: 'Travels whenever they can?', sub: 'Always planning the next trip, keeps a bag half-packed.' },
  { k: 'games', code: 'PLAY', q: 'Into games or puzzles?', sub: 'Board games, video games, crosswords, jigsaw marathons.' },
  { k: 'style', code: 'CHIC', q: 'Cares about style and grooming?', sub: 'Notices fabrics, has a signature look or scent.' },
  { k: 'plants', code: 'GROW', q: 'A plant or garden person?', sub: 'Windowsill jungle, raised beds, names for the ferns.' },
  { k: 'pets', code: 'PETS', q: 'Devoted to a pet?', sub: 'The dog or cat gets its own Christmas stocking.' },
  { k: 'coffee', code: 'BREW', q: 'Has a coffee or tea ritual?', sub: 'A particular mug, a particular method, do not interrupt.' },
  { k: 'wine', code: 'VINO', q: 'Enjoys wine or spirits?', sub: 'A nice bottle or a well-made cocktail is always welcome.', alc: true },
  { k: 'sentimental', code: 'KEEP', q: 'Sentimental at heart?', sub: 'Keeps cards, frames photos, remembers dates.' },
  { k: 'exp', code: 'LIVE', q: 'Would rather do something than own something?', sub: 'Tickets, classes and trips beat another object on a shelf.' },
  { k: 'practical', code: 'TOOL', q: 'Prefers practical over whimsical?', sub: 'Wants things they will actually use every week.' }
];
var WHY = { cook: 'loves to cook', outdoors: 'is happiest outdoors', tech: 'lights up at gadgets', books: 'always has a book going', fitness: 'stays active', music: 'lives for music', art: 'likes making things by hand', home: 'loves a cozy home', travel: 'travels whenever possible', games: 'is into games', style: 'cares about style', plants: 'is a plant person', pets: 'is devoted to their pet', coffee: 'has a coffee or tea ritual', sentimental: 'is sentimental at heart', wine: 'enjoys wine or spirits' };
function deckFor() { return CARDS.filter(function (c) { return !c.alc || S.adult21; }); }
function ideaById(id) { for (var i = 0; i < CAT.length; i++) if (CAT[i].id === id) return CAT[i]; return null; }
function first(p) { return p.name.split(' ')[0]; }
function personOccs(p) {
  return S.occasions.filter(function (o) { return o.personId === p.id && nextDate(o); }).sort(function (a, b) { return nextDate(a) - nextDate(b); });
}
function alcOk(p) { return S.adult21 && p.interview && p.interview.answers.wine === true && (p.age === 'a' || p.age === 's'); }

function rank(p) {
  var a = p.interview.answers, B = p.interview.budget;
  var occs = personOccs(p), oc = occs.length ? OCODE[occs[0].type] : '';
  var given = {}; p.history.forEach(function (h) { given[h.title.toLowerCase()] = 1; });
  var out = [];
  CAT.forEach(function (it) {
    if (it.alc && !alcOk(p)) return;
    if (it.ages.indexOf(p.age) < 0) return;
    if (it.price > B * 1.1) return;
    if (given[it.title.toLowerCase()] || p.rejected.indexOf(it.id) >= 0) return;
    var sc = 0, hits = 0;
    it.tags.forEach(function (t, i) { if (a[t] === true) { sc += i === 0 ? 4 : 3; hits++; } else if (a[t] === false) sc -= 2.5; });
    if (!hits) sc -= 1.5;
    if (a.exp === true) sc += it.kind === 'E' ? 2.5 : 0; else if (a.exp === false) sc += it.kind === 'E' ? -1.5 : 1;
    if (a.practical === true) sc += it.flavor === 'P' ? 2 : -0.5; else if (a.practical === false) sc += it.flavor === 'F' ? 2 : 0;
    var r = it.price / B; sc += r >= 0.5 ? 1.5 : (r < 0.25 ? -1.5 : 0);
    if (oc && it.occ.indexOf(oc) >= 0) sc += 1.5;
    out.push({ it: it, sc: sc + Math.random() * 1.6 });
  });
  return out.sort(function (x, y) { return y.sc - x.sc; });
}
function why(p, it) {
  var a = p.interview.answers, n = first(p);
  var hits = it.tags.filter(function (t) { return a[t] === true && WHY[t]; }).map(function (t) { return WHY[t]; });
  var s = hits.length ? n + ' ' + hits.slice(0, 2).join(' and ') + '.' : 'A safe crowd-pleaser inside your budget for ' + n + '.';
  if (it.kind === 'E' && a.exp === true) s += ' You said doing beats owning, and this is something to do.';
  else if (it.flavor === 'P' && a.practical === true) s += ' Practical enough to get used every week.';
  else if (it.flavor === 'F' && a.practical === false) s += ' More delight than duty, which is the brief.';
  var occs = personOccs(p);
  if (occs.length && it.occ.indexOf(OCODE[occs[0].type]) >= 0) s += ' A classic fit for ' + occLabel(occs[0]) + '.';
  return s + ' Around ' + money(it.price) + ', under your ' + money(p.interview.budget) + ' ceiling.';
}
function buildPlan(p, replaceId) {
  var keep = (p.plan || []).filter(function (x) { return replaceId ? x.id !== replaceId : x.locked; });
  var keepIds = keep.map(function (x) { return x.id; });
  var ranked = rank(p).filter(function (r) { return keepIds.indexOf(r.it.id) < 0; });
  var fresh = ranked.filter(function (r) { return p.seen.indexOf(r.it.id) < 0; });
  if (fresh.length < 3 - keep.length) { p.seen = []; fresh = ranked; }
  var prim = {}; keep.forEach(function (x) { var it = ideaById(x.id); if (it) prim[it.tags[0]] = 1; });
  var add = [];
  fresh.forEach(function (r) { if (keep.length + add.length < 3 && !prim[r.it.tags[0]]) { prim[r.it.tags[0]] = 1; add.push(r.it); } });
  fresh.forEach(function (r) { if (keep.length + add.length < 3 && add.indexOf(r.it) < 0) add.push(r.it); });
  var added = add.map(function (it) { p.seen.push(it.id); return { id: it.id, locked: false, why: why(p, it) }; });
  if (replaceId) {
    var idx = -1; p.plan.forEach(function (x, i) { if (x.id === replaceId) idx = i; });
    p.plan = p.plan.filter(function (x) { return x.id !== replaceId; });
    if (added[0]) p.plan.splice(idx < 0 ? p.plan.length : idx, 0, added[0]);
  } else p.plan = keep.concat(added);
  return added.length;
}

/* ---------- small ui helpers ---------- */
function flaps(str, cls) {
  var s = String(str).toUpperCase(), out = '';
  for (var i = 0; i < s.length; i++) out += '<b style="--i:' + i + '">' + (s[i] === ' ' ? '&nbsp;' : esc(s[i])) + '</b>';
  return '<span class="fl ' + (cls || '') + '" role="text" aria-label="' + esc(str) + '">' + out + '</span>';
}
var toastT;
function toast(msg) { var t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove('show'); }, 2400); }
function person(id) { return S.people.filter(function (p) { return p.id === id; })[0]; }
function occ(id) { return S.occasions.filter(function (o) { return o.id === id; })[0]; }
function download(name, mime, text) {
  var blob = new Blob([text], { type: mime });
  try {
    var file = new File([blob], name, { type: mime });
    if (navigator.canShare && navigator.canShare({ files: [file] })) { navigator.share({ files: [file], title: name }).catch(function () {}); return; }
  } catch (e) {}
  var url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
}
function monthOpts(sel) { return MONL.map(function (m, i) { return '<option value="' + (i + 1) + '"' + (sel === i + 1 ? ' selected' : '') + '>' + m + '</option>'; }).join(''); }
function leadOpts(sel) { return LEADS.map(function (n) { return '<option value="' + n + '"' + (sel === n ? ' selected' : '') + '>' + n + ' days before</option>'; }).join(''); }

/* ---------- sheets ---------- */
function openSheet(html) {
  $('#sheet-root').innerHTML = '<div class="scrim" data-act="scrim"><div class="sheet" role="dialog" aria-modal="true"><div class="grab"></div>' + html + '</div></div>';
}
function closeSheet() { $('#sheet-root').innerHTML = ''; }
function fv(n) { var e = $('#sheet-root [name="' + n + '"]'); return e ? e.value.trim() : ''; }
function confirmSheet(title, body, label, cb, danger) {
  pendingConfirm = cb;
  openSheet('<h2>' + esc(title) + '</h2><p class="lede">' + body + '</p><button class="btn ' + (danger ? 'danger' : 'amber') + '" data-act="confirm-yes">' + esc(label) + '</button><button class="btn ghost" data-act="close-sheet">Cancel</button>');
}
var pendingConfirm = null;

/* ---------- render ---------- */
function render() {
  var main = $('main'), keep = main && main.dataset.k === ui.view + (ui.personId || '') ? main.scrollTop : 0;
  var fid = document.activeElement && document.activeElement.id;
  var inPerson = ui.view === 'person';
  var idx = { board: 0, people: 1, log: 2 }[ui.view] || 0;
  var top = inPerson
    ? '<div class="back-bar"><button class="back" data-act="back">&#8249; ' + (ui.from === 'people' ? 'PASSENGERS' : 'DEPARTURES') + '</button><span class="sp"></span><button class="icon-btn" data-act="settings" aria-label="Settings">' + IC.gear + '</button></div>'
    : '<div class="brand">' + IC.plane.replace('<svg', '<svg style="color:var(--amber)"') + '<h1>GIFT PILOT<small>EVERY GIFT, ON TIME</small></h1><button class="icon-btn" data-act="settings" aria-label="Settings">' + IC.gear + '</button></div>' +
      '<nav class="seg" role="tablist"><i style="transform:translateX(' + idx * 100 + '%)"></i>' +
      [['board', 'DEPARTURES'], ['people', 'PASSENGERS'], ['log', 'LOGBOOK']].map(function (t) { return '<button role="tab" aria-selected="' + (ui.view === t[0]) + '" data-act="nav" data-v="' + t[0] + '">' + t[1] + '</button>'; }).join('') + '</nav>';
  var body = ui.view === 'board' ? vBoard() : ui.view === 'people' ? vPeople() : ui.view === 'log' ? vLog() : vPerson();
  $('#app').innerHTML = '<header class="top">' + top + '</header><main data-k="' + ui.view + (ui.personId || '') + '" class="' + (ui.fresh ? 'fresh' : '') + '">' + body + '</main>';
  $('main').scrollTop = keep;
  if (fid && document.getElementById(fid)) document.getElementById(fid).focus();
  if (ui.scrollTo) { var el = document.getElementById(ui.scrollTo); if (el) el.scrollIntoView({ block: 'start' }); ui.scrollTo = null; }
  ui.fresh = false; ui.taxi = null;
}
function clock() { var d = new Date(); return d.getDate() + ' ' + MON[d.getMonth()] + ' ' + d.getFullYear() + ' · ' + ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2); }

function upcoming() {
  return S.occasions.map(function (o) { var d = nextDate(o), p = person(o.personId); return d && p ? { o: o, p: p, d: d, n: daysTo(d) } : null; }).filter(Boolean).sort(function (a, b) { return a.d - b.d; });
}
function isHot(u) { var st = occStatus(u.o); return u.n <= (u.o.lead || 14) && (st === 'planning' || st === 'chosen'); }

function vBoard() {
  var up = upcoming();
  if (!S.people.length) return '<div class="board"><div class="board-head"><h2>' + IC.jet + 'DEPARTURES</h2><time id="clock">' + clock() + '</time></div><div class="board-empty">The board is clear. Add your first passenger — someone you buy gifts for — and their occasions will line up here with a live countdown.</div></div><div class="cta-row"><button class="btn amber grow" data-act="add-person">' + IC.plus + 'Add a passenger</button></div>' + foot();
  var near = up.filter(function (u) { return u.n <= 90; });
  var hot = up.filter(isHot);
  var radar = '<section class="radar-wrap"><div class="radar" aria-label="Occasions radar, next 90 days">' +
    '<svg viewBox="0 0 100 100"><g fill="none" stroke="#2f6a62" stroke-width=".6"><circle cx="50" cy="50" r="16"/><circle cx="50" cy="50" r="32"/><circle cx="50" cy="50" r="47"/><path d="M50 2v96M2 50h96"/></g><g font-family="monospace" font-size="5" fill="#4f9a8c"><text x="52" y="37">30</text><text x="52" y="21">60</text><text x="52" y="7">90</text></g></svg><div class="sweep"></div>' +
    near.map(function (u) {
      var ang = (hash(u.o.id) % 360) * Math.PI / 180, r = 7 + (u.n / 90) * 38;
      return '<button class="blip' + (isHot(u) ? ' hot' : '') + '" style="left:' + (50 + Math.cos(ang) * r).toFixed(1) + '%;top:' + (50 + Math.sin(ang) * r).toFixed(1) + '%" data-act="open-occ" data-id="' + u.o.id + '" aria-label="' + esc(u.p.name + ' ' + occLabel(u.o) + ' in ' + u.n + ' days') + '"><i></i><span>' + esc(first(u.p).slice(0, 3).toUpperCase()) + '</span></button>';
    }).join('') + '</div><div class="radar-info"><small>OCCASIONS RADAR · 90 DAYS</small>' +
    (up.length ? flaps(first(up[0].p).slice(0, 9)) + '<p>Next out: <b>' + esc(occLabel(up[0].o)) + '</b> in <b>' + (up[0].n === 0 ? 'today' : up[0].n + (up[0].n === 1 ? ' day' : ' days')) + '</b>. ' + near.length + ' on radar' + (hot.length ? ', <b>' + hot.length + ' inside reminder window</b>.' : ', none urgent.') + '</p>' : '<p>No occasions yet. Add a departure to light up the radar.</p>') + '</div></section>';
  var rows = up.map(function (u, i) {
    var st = occStatus(u.o), cd = u.n === 0 ? 'NOW' : ('00' + Math.min(u.n, 999)).slice(-3);
    return '<button class="row" style="--row:' + Math.min(i, 9) + '" data-act="open-occ" data-id="' + u.o.id + '"><span class="cd">' + flaps(cd) + '<em>' + (u.n === 0 ? 'TODAY' : u.n === 1 ? 'DAY' : 'DAYS') + '</em></span>' +
      '<span class="dest">' + flaps(first(u.p).slice(0, 10), 'dim') + '<span class="sub">' + esc(occLabel(u.o).toUpperCase()) + ' · ' + u.d.getDate() + ' ' + MON[u.d.getMonth()] + '</span></span>' +
      '<span class="stc"><span class="st st-' + st + '"><i class="lamp"></i>' + STATL[st].toUpperCase() + '</span>' + (isHot(u) ? '<u>SHOP NOW</u>' : '') + '</span></button>';
  }).join('');
  return radar + '<div class="board"><div class="board-head"><h2>' + IC.jet + 'DEPARTURES</h2><time id="clock">' + clock() + '</time></div>' +
    '<div class="board-cols"><span>IN</span><span>PASSENGER</span><span>STATUS</span></div>' +
    (rows || '<div class="board-empty">No departures scheduled. Add a birthday, anniversary or holiday for one of your passengers.</div>') + '</div>' +
    '<div class="cta-row"><button class="btn dash" data-act="add-occ">' + IC.plus + 'Add a departure</button></div>' + foot();
}
function foot() { return '<p class="foot">Gift Pilot keeps everything on this device. No account, no tracking.<br>Some links may earn Vilasi a commission.</p>'; }

function vPeople() {
  var rows = S.people.map(function (p, i) {
    var os = personOccs(p), nx = os[0], bought = p.wishlist.filter(function (w) { return w.bought; }).length;
    return '<button class="pax" data-act="open-person" data-id="' + p.id + '"><span class="seat">' + flaps((i + 1) + 'A') + '<em>SEAT</em></span><span><h3>' + esc(p.name) + '</h3><p>' + esc(p.relation || 'Passenger') + ' · ' + AGES[p.age].split(' ')[0] + '</p><p>' +
      (nx ? '<b>' + esc(occLabel(nx)) + ' in ' + daysTo(nextDate(nx)) + 'd</b> · ' : '') + p.wishlist.length + ' wishes' + (bought ? ' (' + bought + ' bought)' : '') + ' · ' + p.history.length + ' past gifts</p></span><span class="chev">&#8250;</span></button>';
  }).join('');
  return '<div class="manifest-h">PASSENGER MANIFEST · ' + S.people.length + ' ABOARD</div><div class="pax-grid">' + rows + '</div>' +
    (S.people.length ? '' : '<div class="panel"><p class="hint">Nobody on the manifest yet. Add the people you buy gifts for — partner, parents, friends, kids, coworkers.</p></div>') +
    '<div class="cta-row"><button class="btn dash" data-act="add-person">' + IC.plus + 'Add a passenger</button></div>' + foot();
}

function barcode(seedStr) {
  var h = hash(seedStr), out = '';
  for (var i = 0; i < 26; i++) { h = (h * 1103515245 + 12345) >>> 0; out += '<i style="width:' + (1 + (h >> 16) % 4) + 'px"></i>'; }
  return '<div class="barcode" aria-hidden="true">' + out + '</div>';
}
function vPerson() {
  var p = person(ui.personId); if (!p) { ui.view = 'people'; return vPeople(); }
  var i = S.people.indexOf(p), os = personOccs(p), nx = os[0], h = hash(p.id);
  var code = (first(p).toUpperCase().replace(/[^A-Z]/g, '') + 'XXX').slice(0, 3);
  var pass = '<div class="pass"><div class="pass-main"><div class="pass-brand">' + IC.plane + 'GIFT PILOT<span>BOARDING PASS</span></div>' +
    '<div class="pass-route"><div><small>FROM</small><b>YOU</b></div><div class="line">' + IC.jet + '</div><div style="text-align:right"><small>TO</small><b>' + code + '</b></div></div>' +
    '<div class="pass-grid"><div class="w2"><small>PASSENGER</small><strong>' + esc(p.name) + '</strong></div><div class="w2"><small>RELATION</small><strong>' + esc(p.relation || '—') + '</strong></div>' +
    '<div><small>FLIGHT</small><span>GP' + (100 + h % 900) + '</span></div><div><small>GATE</small><span>' + 'ABCDEF'[h % 6] + (1 + (h >> 4) % 9) + '</span></div><div><small>SEAT</small><span>' + (i + 1) + 'A</span></div><div><small>CLASS</small><span>' + AGES[p.age].split(' ')[0].toUpperCase() + '</span></div></div></div>' +
    '<div class="pass-stub">' + barcode(p.id) + '<div class="stub-info"><small>NEXT DEPARTURE</small>' + (nx ? '<b>' + esc(occLabel(nx).toUpperCase()) + ' · ' + nextDate(nx).getDate() + ' ' + MON[nextDate(nx).getMonth()] + '</b><span>IN ' + daysTo(nextDate(nx)) + ' DAYS</span>' : '<b>NONE SCHEDULED</b><span>ADD ONE BELOW</span>') + '</div></div></div>';
  var jump = '<div class="jump">' + [['s-legs', 'DEPARTURES'], ['s-plan', 'FLIGHT PLAN'], ['s-wish', 'WISH LIST'], ['s-notes', 'NOTES'], ['s-hist', 'HISTORY']].map(function (j) { return '<button data-act="jump" data-t="' + j[0] + '">' + j[1] + '</button>'; }).join('') + '<button data-act="edit-person">EDIT</button></div>';

  /* departures */
  var legs = os.map(function (o) {
    var st = occStatus(o), si = STAT.indexOf(st), d = nextDate(o), g = occGift(o);
    var from = ui.taxi && ui.taxi.id === o.id ? ui.taxi.from : si;
    return '<div class="panel leg' + (ui.focusOcc === o.id ? ' focus' : '') + '" id="leg-' + o.id + '"><div class="leg-top"><b>' + esc(occLabel(o).toUpperCase()) + '</b><span>' + fmtDate(d) + ' ' + d.getFullYear() + ' · <em>' + (daysTo(d) === 0 ? 'TODAY' : 'IN ' + daysTo(d) + 'D') + '</em></span></div>' +
      '<div class="route" style="--to:' + si * 20 + '%;--from:' + from * 20 + '%"><span class="prog"></span><span class="jet">' + IC.jet + '</span>' +
      STAT.map(function (s, k) { return '<button class="' + (k < si ? 'done' : k === si ? 'cur' : '') + '" data-act="set-status" data-id="' + o.id + '" data-s="' + s + '" aria-pressed="' + (k === si) + '"><i></i>' + STATL[s].toUpperCase().replace('GIFT ', '') + '</button>'; }).join('') + '</div>' +
      '<div class="leg-gift">' + (g ? '<span>Gift: <b>' + esc(g.title) + '</b>' + (g.planned ? ' · ' + money(g.actual || g.planned) : '') + '</span><button class="tiny" data-act="find" data-q="' + esc(g.title) + '" aria-label="Find it">' + IC.search + '</button>' : '<span>No gift assigned yet. Pick one from the Flight plan or wish list below.</span>') + '</div>' +
      '<div class="leg-acts"><label class="sel">REMIND<select data-chg="lead" data-id="' + o.id + '" aria-label="Reminder lead time">' + leadOpts(o.lead || 14) + '</select></label>' +
      '<button class="btn ghost sm" data-act="ics" data-id="' + o.id + '">' + IC.cal + 'Add to calendar</button><button class="tiny" data-act="del-occ" data-id="' + o.id + '" aria-label="Remove occasion">' + IC.trash + '</button></div></div>';
  }).join('');
  var sLegs = '<section class="sec" id="s-legs"><div class="sec-h"><h3>DEPARTURES</h3><button class="mini" data-act="add-occ" data-pid="' + p.id + '">+ ADD</button></div>' + (legs || '<div class="panel"><p class="hint">No occasions for ' + esc(first(p)) + ' yet. Add a birthday or holiday to put them on the board.</p></div>') + '</section>';

  /* flight plan */
  var sPlan;
  if (!p.interview) {
    sPlan = '<div class="panel"><p class="hint" style="margin-bottom:12px">Answer ' + deckFor().length + ' quick yes/no cards about ' + esc(first(p)) + ', set a budget, and Gift Pilot files a Flight plan: three concrete gift picks, each with the reason it fits.</p><button class="btn amber" style="width:100%" data-act="iv-start">' + IC.plane + 'Start gift interview</button></div>';
  } else {
    var likes = Object.keys(p.interview.answers).filter(function (k) { return p.interview.answers[k] === true; }).length;
    sPlan = '<p class="plan-meta">CEILING ' + money(p.interview.budget) + ' · ' + likes + ' YES ANSWERS · ' + p.plan.filter(function (x) { return x.locked; }).length + '/3 LOCKED</p>' +
      (p.plan.length ? p.plan.map(function (x, k) {
        var it = ideaById(x.id); if (!it) return '';
        return '<div class="panel pick' + (x.locked ? ' locked' : '') + '"><div class="n">0' + (k + 1) + '<small>PICK</small></div><div><h4>' + esc(it.title) + '</h4><p class="why">' + esc(x.why) + '</p><div class="meta">~' + money(it.price) + '<i>·</i>' + (it.kind === 'E' ? 'EXPERIENCE' : 'THING') + '<i>·</i>' + (it.flavor === 'P' ? 'PRACTICAL' : 'FUN') + '</div><div class="acts">' +
          '<button class="btn ghost sm' + (x.locked ? ' on' : '') + '" data-act="lock" data-id="' + x.id + '" aria-pressed="' + x.locked + '">' + (x.locked ? IC.lock + 'Locked' : IC.unlock + 'Lock') + '</button>' +
          '<button class="btn ghost sm" data-act="find" data-q="' + esc(it.title) + '">' + IC.search + 'Find it</button>' +
          '<button class="btn ghost sm" data-act="assign" data-title="' + esc(it.title) + '" data-price="' + it.price + '">' + IC.jet + 'Assign</button>' +
          (x.locked ? '' : '<button class="btn ghost sm" data-act="swap" data-id="' + x.id + '">' + IC.swap + 'Not this</button>') + '</div></div></div>';
      }).join('') : '<div class="panel"><p class="hint">Nothing in the catalog fits this budget and these answers. Raise the ceiling or redo the interview.</p></div>') +
      '<div class="plan-bar"><button class="btn amber sm grow" data-act="rerun">' + IC.swap + 'Re-run unlocked</button><button class="btn ghost sm grow" data-act="iv-start">Redo interview</button></div>';
  }
  sPlan = '<section class="sec" id="s-plan"><div class="sec-h"><h3>FLIGHT PLAN</h3></div>' + sPlan + '</section>';

  /* wish list */
  var wl = p.wishlist.map(function (w) {
    var b = w.bought && !ui.showSafe;
    return '<div class="wish' + (b ? ' bought' : '') + '"><button class="chk" data-act="wish-toggle" data-id="' + w.id + '" role="checkbox" aria-checked="' + !!w.bought + '" aria-label="Mark bought secretly"><i>' + (b ? '&#10003;' : '') + '</i></button><div class="t"><span>' + esc(w.text) + '</span>' + (b ? '<em>SECRET</em>' : '') + '</div>' +
      '<button class="tiny" data-act="find" data-q="' + esc(w.text) + '" aria-label="Find it">' + IC.search + '</button><button class="tiny" data-act="assign" data-title="' + esc(w.text) + '" data-price="" aria-label="Assign to a departure">' + IC.jet + '</button><button class="tiny" data-act="wish-del" data-id="' + w.id + '" aria-label="Delete">' + IC.x + '</button></div>';
  }).join('');
  var sWish = '<section class="sec" id="s-wish"><div class="sec-h"><h3>WISH LIST</h3><button class="mini' + (ui.showSafe ? ' on' : '') + '" data-act="show-safe" aria-pressed="' + ui.showSafe + '">' + (ui.showSafe ? '● SHOW-SAFE ON' : '○ SHOW-SAFE') + '</button></div><div class="panel">' +
    (wl || '<p class="hint" style="margin-bottom:10px">Paste the list ' + esc(first(p)) + ' sent you, one item per line.</p>') +
    (ui.showSafe ? '<p class="hint" style="margin:8px 0">Show-safe hides what you have secretly bought, so you can hand over the phone.</p>' : '') +
    '<textarea id="wish-in" placeholder="Paste or type wishes, one per line" aria-label="Add wish list items" style="margin-top:10px"></textarea><button class="btn ghost sm" style="width:100%;margin-top:8px" data-act="wish-add">' + IC.plus + 'Add to wish list</button></div></section>';

  /* notes */
  var nf = function (k, label, ph) { return '<label class="field"><span>' + label + '</span><input type="text" id="n-' + k + '" data-inp="note" data-k="' + k + '" value="' + esc(p.notes[k] || '') + '" placeholder="' + ph + '"></label>'; };
  var sNotes = '<section class="sec" id="s-notes"><div class="sec-h"><h3>NOTES</h3></div><div class="panel">' + nf('sizes', 'SIZES', 'Shoes, tops, ring…') + nf('colors', 'FAVORITE COLORS', 'What they reach for') + nf('allergies', 'ALLERGIES / AVOID', 'Scents, foods, materials') +
    '<label class="field" style="margin:0"><span>ANYTHING ELSE</span><textarea id="n-other" data-inp="note" data-k="other" placeholder="Hints they dropped, brands they love">' + esc(p.notes.other || '') + '</textarea></label></div></section>';

  /* history */
  var hs = p.history.slice().sort(function (a, b) { return b.year - a.year; }).map(function (x) {
    return '<div class="hist"><span class="y">' + x.year + '</span><span class="t">' + esc(x.title) + '<small>' + esc(x.occ || '') + (x.price ? ' · ' + money(x.price) : '') + '</small></span><button class="tiny" data-act="hist-del" data-id="' + x.id + '" aria-label="Delete">' + IC.x + '</button></div>';
  }).join('');
  var sHist = '<section class="sec" id="s-hist"><div class="sec-h"><h3>GIFT HISTORY</h3></div><div class="panel">' + (hs || '<p class="hint">Nothing logged. Past gifts are skipped by the Flight plan and flagged if you try to repeat one.</p>') +
    '<div class="add-row"><input type="text" id="h-title" placeholder="Gift you gave" aria-label="Gift title"><input type="number" id="h-year" inputmode="numeric" value="' + today().getFullYear() + '" aria-label="Year"><button class="btn ghost sm" data-act="hist-add">Add</button></div></div></section>';

  return '<div class="person-wrap">' + pass + jump + sLegs + sPlan + sWish + sNotes + sHist + '</div>';
}

/* ---------- logbook ---------- */
function spent(g) { return +g.actual > 0 ? +g.actual : 0; }
function meter(planned, actual, cap, thin) {
  var committed = Math.max(planned, actual), over = cap > 0 && committed > cap, d = cap > 0 ? cap : Math.max(committed, 1);
  return '<div class="meter' + (thin ? ' thin' : '') + (over ? ' over' : '') + '" style="--pl:' + Math.min(100, planned / d * 100).toFixed(1) + '%;--ac:' + Math.min(100, actual / d * 100).toFixed(1) + '%" role="img" aria-label="' + money(actual) + ' spent, ' + money(planned) + ' planned of ' + money(cap) + '"><span class="pl"></span><span class="ac"></span></div>';
}
function vLog() {
  if (!S.seasons.length) return '<div class="panel"><p class="hint" style="margin-bottom:12px">A season is a budget window — Christmas, a birthday stretch, wedding season. Set a ceiling and log what each gift was planned to cost versus what you actually paid.</p><button class="btn amber" style="width:100%" data-act="add-season">' + IC.plus + 'Create a season</button></div>' + foot();
  var se = S.seasons.filter(function (s) { return s.id === ui.seasonId; })[0] || S.seasons[0]; ui.seasonId = se.id;
  var gs = S.gifts.filter(function (g) { return g.seasonId === se.id; });
  var planned = 0, actual = 0, committed = 0;
  gs.forEach(function (g) { planned += +g.planned || 0; actual += spent(g); committed += spent(g) || +g.planned || 0; });
  var left = se.budget - committed;
  var chips = '<div class="chips">' + S.seasons.map(function (s) { return '<button class="chip' + (s.id === se.id ? ' on' : '') + '" data-act="season" data-id="' + s.id + '">' + esc(s.name) + '</button>'; }).join('') + '<button class="chip" data-act="add-season">+ NEW SEASON</button></div>';
  var card = '<div class="gauge-card"><div class="gauge-top"><div><small>SEASON BUDGET</small><h2>' + esc(se.name) + '</h2></div><button class="icon-btn" data-act="edit-season" aria-label="Edit season">' + IC.pencil + '</button></div>' +
    '<div class="big">' + flaps(money(actual).replace(/\.\d+$/, '')) + '<span>SPENT OF ' + money(se.budget) + '</span></div>' + meter(planned, actual, se.budget) +
    '<div class="legend"><span><i class="a"></i>ACTUAL ' + money(actual) + '</span><span><i class="p"></i>PLANNED ' + money(planned) + '</span><span><b class="' + (left < 0 ? 'neg' : 'pos') + '">' + (left < 0 ? money(-left) + ' OVER' : money(left) + ' LEFT') + '</b></span></div></div>';
  var byP = {}; gs.forEach(function (g) { (byP[g.personId] = byP[g.personId] || []).push(g); });
  var ppl = S.people.filter(function (p) { return byP[p.id] || (se.alloc && se.alloc[p.id]); });
  var blocks = ppl.map(function (p) {
    var list = byP[p.id] || [], pl = 0, ac = 0, cm = 0;
    list.forEach(function (g) { pl += +g.planned || 0; ac += spent(g); cm += spent(g) || +g.planned || 0; });
    var cap = se.alloc && se.alloc[p.id] || 0;
    return '<div class="panel pm"><div class="pm-top"><b>' + esc(p.name) + '</b><span>' + money(cm) + (cap ? ' / ' + money(cap) : '') + '</span><button class="cap" data-act="cap" data-id="' + p.id + '">' + (cap ? 'EDIT CAP' : 'SET CAP') + '</button></div>' + meter(pl, ac, cap || se.budget, true) +
      (list.length ? '<div style="margin-top:10px"><div class="led h"><span>GIFT</span><span style="text-align:right">PLANNED</span><span style="text-align:right">ACTUAL</span><span></span></div>' + list.map(function (g) {
        var o = g.occId && occ(g.occId);
        return '<div class="led"><span class="t">' + esc(g.title) + (o ? '<small>' + esc(occLabel(o)) + ' · ' + STATL[occStatus(o)] + '</small>' : '') + '</span>' +
          '<input type="number" inputmode="decimal" min="0" step="0.01" id="gp-' + g.id + '" data-chg="gift-planned" data-id="' + g.id + '" value="' + (g.planned || '') + '" placeholder="0" aria-label="Planned price">' +
          '<input type="number" inputmode="decimal" min="0" step="0.01" id="ga-' + g.id + '" data-chg="gift-actual" data-id="' + g.id + '" value="' + (g.actual || '') + '" placeholder="—" aria-label="Actual price">' +
          '<button class="tiny" data-act="gift-del" data-id="' + g.id + '" aria-label="Delete gift">' + IC.x + '</button></div>';
      }).join('') + '</div>' : '<p class="hint" style="margin-top:8px">No gifts logged for this season yet.</p>') + '</div>';
  }).join('');
  return chips + card + '<div class="sec-h"><h3>BY PASSENGER</h3></div>' + (blocks || '<div class="panel"><p class="hint">No gifts in this season yet. Log one below, or assign a pick from someone\'s Flight plan.</p></div>') +
    '<div class="cta-row"><button class="btn dash" data-act="log-gift">' + IC.plus + 'Log a gift</button></div>' + foot();
}

/* ---------- sheets: forms ---------- */
function personSheet(p) {
  openSheet('<h2>' + (p ? 'Edit passenger' : 'New passenger') + '</h2><p class="lede">' + (p ? 'Update their details.' : 'Someone you buy gifts for.') + '</p>' +
    '<label class="field"><span>NAME</span><input type="text" name="name" value="' + esc(p ? p.name : '') + '" placeholder="First and last name" autocomplete="off"></label>' +
    '<div class="two"><label class="field"><span>RELATION</span><input type="text" name="relation" value="' + esc(p ? p.relation : '') + '" placeholder="Sister, coworker…"></label>' +
    '<label class="field"><span>AGE BAND</span><select name="age">' + Object.keys(AGES).map(function (k) { return '<option value="' + k + '"' + ((p ? p.age : 'a') === k ? ' selected' : '') + '>' + AGES[k] + '</option>'; }).join('') + '</select></label></div>' +
    (p ? '' : '<div class="two"><label class="field"><span>BIRTHDAY MONTH</span><select name="bm"><option value="">Skip</option>' + monthOpts(0) + '</select></label><label class="field"><span>DAY</span><input type="number" name="bd" inputmode="numeric" min="1" max="31" placeholder="1-31"></label></div>' +
      '<label class="field"><span>ALSO ADD</span><select name="xmas"><option value="1">Christmas</option><option value="">No holiday</option></select></label>') +
    '<button class="btn amber" data-act="save-person" data-id="' + (p ? p.id : '') + '">' + (p ? 'Save' : 'Board passenger') + '</button>' +
    (p ? '<button class="btn danger" data-act="del-person" data-id="' + p.id + '">Remove passenger</button>' : '') + '<button class="btn ghost" data-act="close-sheet">Cancel</button>');
}
function occSheet(pid) {
  if (!S.people.length) { toast('Add a passenger first'); return personSheet(); }
  openSheet('<h2>New departure</h2><p class="lede">Holidays calculate their own date each year. Birthdays and anniversaries repeat yearly.</p>' +
    '<label class="field"><span>PASSENGER</span><select name="pid">' + S.people.map(function (p) { return '<option value="' + p.id + '"' + (p.id === pid ? ' selected' : '') + '>' + esc(p.name) + '</option>'; }).join('') + '</select></label>' +
    '<label class="field"><span>OCCASION</span><select name="type" data-chg="occ-type">' + Object.keys(TYPES).map(function (k) { return '<option value="' + k + '">' + TYPES[k] + '</option>'; }).join('') + '</select></label>' +
    '<div id="occ-date"><div class="two"><label class="field"><span>MONTH</span><select name="month">' + monthOpts(today().getMonth() + 1) + '</select></label><label class="field"><span>DAY</span><input type="number" name="day" inputmode="numeric" min="1" max="31" value="' + today().getDate() + '"></label></div></div>' +
    '<div id="occ-custom" hidden><label class="field"><span>NAME</span><input type="text" name="label" placeholder="Graduation, housewarming…"></label><label class="field"><span>REPEATS</span><select name="once"><option value="">Every year</option><option value="1">One time only</option></select></label></div>' +
    '<label class="field"><span>REMIND ME</span><select name="lead">' + leadOpts(S.defaultLead || 14) + '</select></label>' +
    '<button class="btn amber" data-act="save-occ">Add to board</button><button class="btn ghost" data-act="close-sheet">Cancel</button>');
}
function seasonOpts(sel) { return '<option value="">No season (not budgeted)</option>' + S.seasons.map(function (s) { return '<option value="' + s.id + '"' + (s.id === sel ? ' selected' : '') + '>' + esc(s.name) + '</option>'; }).join(''); }
function occOptsFor(p, sel) { return '<option value="">No specific departure</option>' + personOccs(p).map(function (o) { return '<option value="' + o.id + '"' + (o.id === sel ? ' selected' : '') + '>' + esc(occLabel(o)) + ' · ' + fmtDate(nextDate(o)) + '</option>'; }).join(''); }
function guessSeason(o) {
  if (!o) return ui.view === 'log' ? ui.seasonId || '' : '';
  var key = o.type === 'christmas' ? 'christmas' : o.type === 'birthday' ? 'birthday' : '';
  var m = key && S.seasons.filter(function (s) { return s.name.toLowerCase().indexOf(key) >= 0; })[0];
  return m ? m.id : '';
}
function giftSheet(pid, title, price, occId) {
  if (!S.people.length) { toast('Add a passenger first'); return personSheet(); }
  var p = person(pid) || S.people[0], os = personOccs(p), o = occId ? occ(occId) : ui.view === 'log' ? null : (ui.focusOcc && occ(ui.focusOcc) && occ(ui.focusOcc).personId === p.id ? occ(ui.focusOcc) : os[0]);
  openSheet('<h2>' + (title ? 'Assign gift' : 'Log a gift') + '</h2><p class="lede">Attach it to a departure and a season budget. Enter the actual price once you have paid.</p>' +
    '<label class="field"><span>PASSENGER</span><select name="pid" data-chg="gift-person">' + S.people.map(function (x) { return '<option value="' + x.id + '"' + (x.id === p.id ? ' selected' : '') + '>' + esc(x.name) + '</option>'; }).join('') + '</select></label>' +
    '<label class="field"><span>GIFT</span><input type="text" name="title" value="' + esc(title || '') + '" placeholder="What is it?"></label>' +
    '<label class="field"><span>DEPARTURE</span><select name="occ">' + occOptsFor(p, o && o.id) + '</select></label>' +
    '<label class="field"><span>SEASON BUDGET</span><select name="season">' + seasonOpts(guessSeason(o) || (ui.view === 'log' ? ui.seasonId : '')) + '</select></label>' +
    '<div class="two"><label class="field"><span>PLANNED $</span><input type="number" name="planned" inputmode="decimal" min="0" step="0.01" value="' + (price || '') + '" placeholder="0"></label><label class="field"><span>ACTUAL $</span><input type="number" name="actual" inputmode="decimal" min="0" step="0.01" placeholder="When paid"></label></div>' +
    '<div id="repeat-warn"></div><button class="btn amber" data-act="save-gift">Save gift</button><button class="btn ghost" data-act="close-sheet">Cancel</button>');
}
function findSheet(q) {
  var e = encodeURIComponent(q);
  var link = function (letter, name, sub, url) { return '<a class="shop" href="' + url + '" target="_blank" rel="noopener noreferrer"><i>' + letter + '</i><b>' + name + '<small>' + sub + '</small></b><span>&#8599;</span></a>'; };
  openSheet('<h2>Find it</h2><p class="lede">Search the web for <b>' + esc(q) + '</b>. These open outside Gift Pilot; nothing is sold in this app.</p>' +
    link('G', 'Google Shopping', 'Compare prices across stores', 'https://www.google.com/search?tbm=shop&q=' + e) +
    link('A', 'Amazon', 'Fast shipping options', 'https://www.amazon.com/s?k=' + e) +
    link('E', 'Etsy', 'Handmade and personalized', 'https://www.etsy.com/search?q=' + e) +
    '<p class="aff">Some links may earn Vilasi a commission.</p><button class="btn ghost" data-act="close-sheet">Done</button>');
}
function settingsSheet() {
  var hasSample = S.people.some(function (p) { return p.sample; });
  openSheet('<h2>Settings</h2><p class="lede">Gift Pilot ' + '1.0' + ' · by Vilasi, Inc.</p>' +
    '<div class="set-row"><div>Show wine and spirits ideas<small>Off by default. Requires confirming you are 21 or older.</small></div><button class="tog" role="switch" aria-checked="' + !!S.adult21 + '" data-act="tog-21" aria-label="Show wine and spirits ideas"></button></div>' +
    '<div class="set-row"><div>Default reminder lead time<small>Used for new departures and calendar alerts.</small></div><label class="sel"><select data-chg="def-lead" aria-label="Default lead time">' + LEADS.map(function (n) { return '<option value="' + n + '"' + (S.defaultLead === n ? ' selected' : '') + '>' + n + ' days</option>'; }).join('') + '</select></label></div>' +
    '<p class="privacy"><b>Privacy.</b> No account, no analytics, no trackers, no ads. Everything you enter — people, wish lists, budgets — is stored only on this device and never sent anywhere. "Find it" opens a web search in your browser; only the gift idea text is passed to that site. Calendar files are generated on the device. Gift Pilot is intended for adults 18 and over.</p>' +
    '<button class="btn ghost" data-act="export">Export my data (JSON)</button>' +
    (hasSample ? '<button class="btn ghost" data-act="clear-sample">Remove sample passengers</button>' : '') +
    '<button class="btn danger" data-act="delete-all">Delete all data</button>' +
    '<p class="aff">Catalog: ' + CAT.length + ' bundled gift ideas, available offline.<br>Some links may earn Vilasi a commission.</p><button class="btn ghost" data-act="close-sheet">Close</button>');
}

/* ---------- interview overlay ---------- */
var iv = null;
function ivRender() {
  var root = $('#overlay-root'); if (!iv) { root.innerHTML = ''; return; }
  var p = person(iv.pid), deck = iv.deck, n = deck.length;
  var prog = '<div class="iv-prog">' + deck.map(function (c, i) { var a = iv.answers[c.k]; return '<i class="' + (i < iv.idx ? (a ? 'y' : 'n') : i === iv.idx ? 'c' : '') + '"></i>'; }).join('') + '<i class="' + (iv.idx >= n ? 'c' : '') + '"></i></div>';
  var head = '<div class="iv-top"><h2>GIFT INTERVIEW<small>' + esc(p.name.toUpperCase()) + ' · ' + (iv.idx < n ? 'CARD ' + (iv.idx + 1) + ' OF ' + n : 'BUDGET') + '</small></h2><button class="icon-btn" data-act="iv-close" aria-label="Close interview">' + IC.x + '</button></div>';
  var body;
  if (iv.idx < n) {
    var cards = '';
    for (var k = Math.min(n - 1, iv.idx + 2); k >= iv.idx; k--) {
      var c = deck[k], pos = k - iv.idx;
      cards += '<div class="card ' + (pos === 0 ? 'top' : 'b' + pos) + '"' + (pos === 0 ? ' id="iv-card"' : ' aria-hidden="true"') + '><div class="tag"><span>GP INTERVIEW</span><span>' + ('0' + (k + 1)).slice(-2) + '/' + n + '</span></div>' +
        '<span class="stamp y">YES</span><span class="stamp n">NOPE</span><div class="code">' + flaps(c.code) + '</div><h3>' + esc(c.q) + '</h3><p>' + esc(c.sub) + '</p><div class="perf"><span>&#8592; NO</span><span>SWIPE</span><span>YES &#8594;</span></div></div>';
    }
    body = '<div class="deck">' + cards + '</div><div class="iv-btns"><button class="rnd n" data-act="iv-no" aria-label="No">' + IC.x + '</button><button class="rnd u" data-act="iv-undo" aria-label="Undo"' + (iv.idx ? '' : ' disabled') + '>' + IC.undo + '</button><button class="rnd y" data-act="iv-yes" aria-label="Yes">' + IC.check + '</button></div>';
  } else {
    var pct = (iv.budget - 10) / 490 * 100;
    body = '<div class="budget"><small>BUDGET CEILING FOR ONE GIFT</small><div id="iv-bud">' + flaps(('$' + iv.budget)) + '</div><p>The Flight plan only suggests ideas at or below this. You can re-run later with a different ceiling.</p>' +
      '<input type="range" min="10" max="500" step="5" value="' + iv.budget + '" data-inp="iv-budget" style="--p:' + pct + '%" aria-label="Budget ceiling in dollars"><div class="ticks"><span>$10</span><span>$125</span><span>$250</span><span>$375</span><span>$500</span></div>' +
      '<button class="btn amber" data-act="iv-file">' + IC.plane + 'File flight plan</button><button class="btn ghost" style="margin-top:10px" data-act="iv-undo">Back to cards</button></div>';
  }
  root.innerHTML = '<div class="iv fresh">' + head + prog + body + '</div>';
  bindDrag();
}
function ivAnswer(yes) {
  if (!iv || iv.busy || iv.idx >= iv.deck.length) return;
  var card = $('#iv-card'); iv.busy = true;
  card.classList.remove('drag'); card.style.transform = ''; card.classList.add(yes ? 'go-r' : 'go-l');
  var st = $('.stamp.' + (yes ? 'y' : 'n'), card); if (st) st.style.opacity = 1;
  iv.answers[iv.deck[iv.idx].k] = yes;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  setTimeout(function () { if (!iv) return; iv.idx++; iv.busy = false; ivRender(); }, reduce ? 0 : 240);
}
function bindDrag() {
  var card = $('#iv-card'); if (!card) return;
  var sx = 0, sy = 0, dx = 0, on = false;
  card.addEventListener('pointerdown', function (e) { if (iv.busy) return; on = true; sx = e.clientX; sy = e.clientY; dx = 0; card.classList.add('drag'); try { card.setPointerCapture(e.pointerId); } catch (x) {} });
  card.addEventListener('pointermove', function (e) {
    if (!on) return; dx = e.clientX - sx; var dy = (e.clientY - sy) * 0.3;
    card.style.transform = 'translate(' + dx + 'px,' + dy + 'px) rotate(' + dx / 18 + 'deg)';
    $('.stamp.y', card).style.opacity = Math.max(0, Math.min(1, dx / 90)); $('.stamp.n', card).style.opacity = Math.max(0, Math.min(1, -dx / 90));
  });
  var end = function () {
    if (!on) return; on = false; card.classList.remove('drag');
    if (Math.abs(dx) > 90) ivAnswer(dx > 0);
    else { card.style.transform = ''; $('.stamp.y', card).style.opacity = 0; $('.stamp.n', card).style.opacity = 0; }
  };
  card.addEventListener('pointerup', end); card.addEventListener('pointercancel', end);
}

/* ---------- calendar ---------- */
function ics(o) {
  var p = person(o.personId), d = nextDate(o), pad = function (n) { return ('0' + n).slice(-2); };
  var ymd = function (x) { return x.getFullYear() + pad(x.getMonth() + 1) + pad(x.getDate()); };
  var d2 = new Date(d); d2.setDate(d2.getDate() + 1);
  var now = new Date(), stamp = now.getUTCFullYear() + pad(now.getUTCMonth() + 1) + pad(now.getUTCDate()) + 'T' + pad(now.getUTCHours()) + pad(now.getUTCMinutes()) + pad(now.getUTCSeconds()) + 'Z';
  var rr = o.once ? '' : o.type === 'mothers' ? 'RRULE:FREQ=YEARLY;BYMONTH=5;BYDAY=2SU' : o.type === 'fathers' ? 'RRULE:FREQ=YEARLY;BYMONTH=6;BYDAY=3SU' : 'RRULE:FREQ=YEARLY';
  var g = occGift(o), t = function (s) { return String(s).replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n'); };
  var lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Vilasi//Gift Pilot//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'BEGIN:VEVENT', 'UID:' + o.id + '@giftpilot.local', 'DTSTAMP:' + stamp,
    'DTSTART;VALUE=DATE:' + ymd(d), 'DTEND;VALUE=DATE:' + ymd(d2), 'SUMMARY:' + t(p.name + ' — ' + occLabel(o)), 'DESCRIPTION:' + t('Gift status: ' + STATL[occStatus(o)] + (g ? '. Gift: ' + g.title : '') + '. From Gift Pilot.'), 'TRANSP:TRANSPARENT'];
  if (rr) lines.push(rr);
  lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + t('Gift reminder: ' + p.name + ' — ' + occLabel(o) + ' in ' + (o.lead || 14) + ' days'), 'TRIGGER:-P' + (o.lead || 14) + 'D', 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR');
  return lines.join('\r\n') + '\r\n';
}

/* ---------- actions ---------- */
function go(view) { ui.view = view; ui.fresh = true; render(); }
function openPerson(id, occId, from) { ui.personId = id; ui.focusOcc = occId || null; ui.from = from || ui.view; ui.view = 'person'; ui.fresh = true; ui.showSafe = false; render(); if (occId) { var el = document.getElementById('leg-' + occId); } }
function logHistory(o) {
  var p = person(o.personId), g = occGift(o); if (!g) return false;
  var y = nextDate(o).getFullYear();
  if (p.history.some(function (h) { return h.title.toLowerCase() === g.title.toLowerCase() && h.year === y; })) return false;
  p.history.push({ id: uid(), title: g.title, year: y, occ: occLabel(o), price: +g.actual || +g.planned || 0 }); return true;
}
var A = {
  nav: function (el) { go(el.dataset.v); },
  back: function () { go(ui.from === 'people' ? 'people' : 'board'); },
  settings: settingsSheet,
  scrim: function (el, e) { if (e.target === el) closeSheet(); },
  'close-sheet': closeSheet,
  'confirm-yes': function () { var cb = pendingConfirm; pendingConfirm = null; closeSheet(); if (cb) cb(); },
  'open-occ': function (el) { var o = occ(el.dataset.id); openPerson(o.personId, o.id, 'board'); },
  'open-person': function (el) { openPerson(el.dataset.id, null, 'people'); },
  jump: function (el) { var t = document.getElementById(el.dataset.t); if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' }); },
  'add-person': function () { personSheet(); },
  'edit-person': function () { personSheet(person(ui.personId)); },
  'save-person': function (el) {
    var name = fv('name'); if (!name) return toast('Give them a name');
    var p = el.dataset.id && person(el.dataset.id);
    if (p) { p.name = name; p.relation = fv('relation'); p.age = fv('age'); }
    else {
      p = { id: uid(), name: name, relation: fv('relation'), age: fv('age'), notes: {}, interview: null, plan: [], seen: [], rejected: [], wishlist: [], history: [] };
      S.people.push(p);
      var bm = +fv('bm'), bd = +fv('bd');
      if (bm && bd >= 1 && bd <= 31) S.occasions.push({ id: uid(), personId: p.id, type: 'birthday', month: bm, day: bd, lead: S.defaultLead });
      if (fv('xmas')) S.occasions.push({ id: uid(), personId: p.id, type: 'christmas', lead: 30 });
    }
    save(); closeSheet();
    if (el.dataset.id) render(); else { openPerson(p.id, null, 'people'); toast(first(p) + ' is on the manifest'); }
  },
  'del-person': function (el) {
    var p = person(el.dataset.id);
    confirmSheet('Remove ' + p.name + '?', 'This deletes their occasions, wish list, notes, history and logged gifts. It cannot be undone.', 'Remove passenger', function () {
      S.people = S.people.filter(function (x) { return x.id !== p.id; }); S.occasions = S.occasions.filter(function (o) { return o.personId !== p.id; }); S.gifts = S.gifts.filter(function (g) { return g.personId !== p.id; });
      save(); go('people'); toast('Passenger removed');
    }, true);
  },
  'add-occ': function (el) { occSheet(el.dataset.pid || (ui.view === 'person' ? ui.personId : null)); },
  'save-occ': function () {
    var type = fv('type'), o = { id: uid(), personId: fv('pid'), type: type, lead: +fv('lead') || 14 };
    if (!FIXED[type]) {
      var m = +fv('month'), d = +fv('day'); if (!(d >= 1 && d <= new Date(2024, m, 0).getDate())) return toast('Enter a valid day for that month');
      o.month = m; o.day = d;
      if (type === 'custom') { o.label = fv('label') || 'Special occasion'; if (fv('once')) { o.once = true; var t = today(), y = t.getFullYear(); if (new Date(y, m - 1, d) < t) y++; o.year = y; } }
    }
    S.occasions.push(o); save(); closeSheet(); ui.focusOcc = o.id; ui.fresh = true; render();
    toast(occLabel(o) + ' added — ' + daysTo(nextDate(o)) + ' days out');
  },
  'del-occ': function (el) {
    var o = occ(el.dataset.id);
    confirmSheet('Remove ' + occLabel(o) + '?', 'It leaves the Departures board. Gifts already logged stay in the Logbook.', 'Remove departure', function () { S.occasions = S.occasions.filter(function (x) { return x.id !== o.id; }); save(); render(); }, true);
  },
  'set-status': function (el) {
    var o = occ(el.dataset.id), from = STAT.indexOf(occStatus(o)), s = el.dataset.s;
    o.st = s; o.sy = nextDate(o).getFullYear(); ui.taxi = { id: o.id, from: from }; ui.focusOcc = o.id;
    var msg = STATL[s];
    if (s === 'delivered') msg = logHistory(o) ? 'Delivered — logged to gift history' : 'Delivered. Nicely landed.';
    save(); render(); toast(msg);
  },
  ics: function (el) { var o = occ(el.dataset.id), p = person(o.personId); download((first(p) + '-' + occLabel(o)).replace(/[^a-z0-9]+/gi, '-').toLowerCase() + '.ics', 'text/calendar', ics(o)); toast('Calendar file ready — open it to add'); },
  find: function (el) { findSheet(el.dataset.q); },
  'iv-start': function () {
    var p = person(ui.personId);
    iv = { pid: p.id, idx: 0, deck: deckFor(), answers: {}, budget: p.interview ? p.interview.budget : 75 }; ivRender();
  },
  'iv-close': function () { iv = null; ivRender(); },
  'iv-yes': function () { ivAnswer(true); },
  'iv-no': function () { ivAnswer(false); },
  'iv-undo': function () { if (iv && iv.idx > 0 && !iv.busy) { iv.idx--; ivRender(); } },
  'iv-file': function () {
    var p = person(iv.pid);
    p.interview = { answers: iv.answers, budget: iv.budget, at: Date.now() }; p.plan = []; p.seen = [];
    buildPlan(p); save(); iv = null; ivRender(); ui.fresh = true; ui.scrollTo = 's-plan'; render();
    toast(p.plan.length ? 'Flight plan filed: ' + p.plan.length + ' picks' : 'No matches — try a higher ceiling');
  },
  lock: function (el) { var p = person(ui.personId); p.plan.forEach(function (x) { if (x.id === el.dataset.id) x.locked = !x.locked; }); save(); render(); },
  swap: function (el) {
    var p = person(ui.personId); p.rejected.push(el.dataset.id);
    var n = buildPlan(p, el.dataset.id); save(); ui.fresh = true; render(); toast(n ? 'Swapped in a new pick' : 'No more ideas fit — removed');
  },
  rerun: function () {
    var p = person(ui.personId);
    if (p.plan.length && p.plan.every(function (x) { return x.locked; })) return toast('All three picks are locked');
    buildPlan(p); save(); ui.fresh = true; render(); toast('Re-ran the unlocked picks');
  },
  assign: function (el) { giftSheet(ui.personId, el.dataset.title, el.dataset.price); },
  'log-gift': function () { giftSheet(null, '', '', null); },
  'save-gift': function (el) {
    var title = fv('title'), p = person(fv('pid')); if (!title) return toast('Name the gift');
    var rep = p.history.filter(function (h) { return h.title.toLowerCase() === title.toLowerCase(); })[0];
    if (rep && !el.dataset.ok) {
      $('#repeat-warn').innerHTML = '<div class="warn"><b>Repeat alert.</b> You gave ' + esc(first(p)) + ' this in ' + rep.year + (rep.occ ? ' for ' + esc(rep.occ) : '') + '. Save anyway?</div>';
      el.dataset.ok = '1'; el.textContent = 'Save anyway'; return;
    }
    var o = fv('occ') && occ(fv('occ')), d = o && nextDate(o);
    if (o) S.gifts = S.gifts.filter(function (g) { return !(g.occId === o.id && g.year === d.getFullYear()); });
    S.gifts.push({ id: uid(), personId: p.id, occId: o ? o.id : '', seasonId: fv('season'), title: title, planned: +fv('planned') || 0, actual: +fv('actual') || 0, year: d ? d.getFullYear() : today().getFullYear() });
    if (o && occStatus(o) === 'planning') { ui.taxi = { id: o.id, from: 0 }; o.st = +fv('actual') > 0 ? 'bought' : 'chosen'; o.sy = d.getFullYear(); }
    save(); closeSheet(); render(); toast(o ? 'Assigned to ' + occLabel(o) : 'Gift logged');
  },
  'gift-del': function (el) { S.gifts = S.gifts.filter(function (g) { return g.id !== el.dataset.id; }); save(); render(); toast('Gift removed'); },
  'wish-add': function () {
    var p = person(ui.personId), ta = $('#wish-in');
    var items = ta.value.split(/\n+/).map(function (s) { return s.replace(/^\s*(?:[-*•–]|\d+[.)])\s*/, '').trim(); }).filter(Boolean);
    if (!items.length) return toast('Type or paste at least one wish');
    items.forEach(function (t) { p.wishlist.push({ id: uid(), text: t.slice(0, 140), bought: false, at: 0 }); });
    save(); render(); toast(items.length + (items.length === 1 ? ' wish added' : ' wishes added'));
  },
  'wish-toggle': function (el) {
    var p = person(ui.personId), w = p.wishlist.filter(function (x) { return x.id === el.dataset.id; })[0];
    if (ui.showSafe) return toast('Turn off Show-safe to change this');
    w.bought = !w.bought; w.at = w.bought ? Date.now() : 0; save(); render(); toast(w.bought ? 'Marked bought — your secret' : 'Back on the list');
  },
  'wish-del': function (el) { var p = person(ui.personId); p.wishlist = p.wishlist.filter(function (x) { return x.id !== el.dataset.id; }); save(); render(); },
  'show-safe': function () { ui.showSafe = !ui.showSafe; render(); toast(ui.showSafe ? 'Show-safe on: purchases hidden' : 'Show-safe off'); },
  'hist-add': function () {
    var p = person(ui.personId), t = $('#h-title').value.trim(), y = +$('#h-year').value; if (!t) return toast('What did you give?');
    if (!(y > 1950 && y < 2200)) return toast('Enter a valid year');
    p.history.push({ id: uid(), title: t, year: y, occ: '', price: 0 }); save(); render(); toast('Logged to history');
  },
  'hist-del': function (el) { var p = person(ui.personId); p.history = p.history.filter(function (x) { return x.id !== el.dataset.id; }); save(); render(); },
  season: function (el) { ui.seasonId = el.dataset.id; ui.fresh = true; render(); },
  'add-season': function () {
    openSheet('<h2>New season</h2><p class="lede">A budget window for a run of gifts.</p><label class="field"><span>NAME</span><input type="text" name="sname" placeholder="Christmas ' + today().getFullYear() + '"></label><label class="field"><span>TOTAL BUDGET $</span><input type="number" name="sbudget" inputmode="decimal" min="0" placeholder="500"></label><button class="btn amber" data-act="save-season">Create season</button><button class="btn ghost" data-act="close-sheet">Cancel</button>');
  },
  'edit-season': function () {
    var s = S.seasons.filter(function (x) { return x.id === ui.seasonId; })[0];
    openSheet('<h2>Edit season</h2><p class="lede">Change the name or the ceiling.</p><label class="field"><span>NAME</span><input type="text" name="sname" value="' + esc(s.name) + '"></label><label class="field"><span>TOTAL BUDGET $</span><input type="number" name="sbudget" inputmode="decimal" min="0" value="' + s.budget + '"></label><button class="btn amber" data-act="save-season" data-id="' + s.id + '">Save</button><button class="btn danger" data-act="del-season" data-id="' + s.id + '">Delete season</button><button class="btn ghost" data-act="close-sheet">Cancel</button>');
  },
  'save-season': function (el) {
    var name = fv('sname'), b = +fv('sbudget'); if (!name) return toast('Name the season'); if (!(b > 0)) return toast('Set a budget above zero');
    var s = el.dataset.id && S.seasons.filter(function (x) { return x.id === el.dataset.id; })[0];
    if (s) { s.name = name; s.budget = b; } else { s = { id: uid(), name: name, budget: b, alloc: {} }; S.seasons.push(s); }
    ui.seasonId = s.id; save(); closeSheet(); ui.fresh = true; render();
  },
  'del-season': function (el) {
    confirmSheet('Delete this season?', 'Its gifts stay attached to their departures but leave the budget.', 'Delete season', function () {
      S.seasons = S.seasons.filter(function (x) { return x.id !== el.dataset.id; }); S.gifts.forEach(function (g) { if (g.seasonId === el.dataset.id) g.seasonId = ''; }); ui.seasonId = null; save(); render();
    }, true);
  },
  cap: function (el) {
    var s = S.seasons.filter(function (x) { return x.id === ui.seasonId; })[0], p = person(el.dataset.id);
    openSheet('<h2>Cap for ' + esc(first(p)) + '</h2><p class="lede">How much of ' + esc(s.name) + ' (' + money(s.budget) + ') is for ' + esc(first(p)) + '? Leave empty to remove the cap.</p><label class="field"><span>PERSON CAP $</span><input type="number" name="cap" inputmode="decimal" min="0" value="' + ((s.alloc && s.alloc[p.id]) || '') + '" placeholder="No cap"></label><button class="btn amber" data-act="save-cap" data-id="' + p.id + '">Save cap</button><button class="btn ghost" data-act="close-sheet">Cancel</button>');
  },
  'save-cap': function (el) { var s = S.seasons.filter(function (x) { return x.id === ui.seasonId; })[0]; s.alloc = s.alloc || {}; var v = +fv('cap'); if (v > 0) s.alloc[el.dataset.id] = v; else delete s.alloc[el.dataset.id]; save(); closeSheet(); render(); },
  'tog-21': function () {
    if (S.adult21) { S.adult21 = false; save(); settingsSheet(); toast('Wine and spirits ideas hidden'); return; }
    confirmSheet('Confirm your age', 'Wine and spirits gift ideas are only shown to adults of legal drinking age. Please confirm that you are 21 or older.', 'I am 21 or older', function () { S.adult21 = true; save(); settingsSheet(); toast('Enabled. Redo an interview to see the new card.'); });
  },
  export: function () { download('gift-pilot-export-' + new Date().toISOString().slice(0, 10) + '.json', 'application/json', JSON.stringify(S, null, 2)); toast('Export ready'); },
  'clear-sample': function () {
    confirmSheet('Remove sample passengers?', 'Maya, Frank and Priya and everything attached to them will be removed. People you added stay.', 'Remove samples', function () {
      var ids = S.people.filter(function (p) { return p.sample; }).map(function (p) { return p.id; });
      S.people = S.people.filter(function (p) { return !p.sample; }); S.occasions = S.occasions.filter(function (o) { return ids.indexOf(o.personId) < 0; }); S.gifts = S.gifts.filter(function (g) { return ids.indexOf(g.personId) < 0; });
      if (!S.gifts.length && !S.people.length) S.seasons = [];
      save(); go('board'); toast('Sample data cleared');
    }, true);
  },
  'delete-all': function () {
    confirmSheet('Delete all data?', 'Every passenger, occasion, wish list, budget and setting on this device is erased. This cannot be undone. Export first if you want a copy.', 'Erase everything', function () {
      S = blank(); S.ageNoteSeen = true; save(); ui = { view: 'board', personId: null, focusOcc: null, seasonId: null, showSafe: false, fresh: true, taxi: null }; render(); toast('All data deleted');
    }, true);
  },
  'gate-ok': function () { S.ageNoteSeen = true; save(); $('#gate') && $('#gate').remove(); }
};
var CH = {
  lead: function (el) { occ(el.dataset.id).lead = +el.value; save(); render(); toast('Reminder set ' + el.value + ' days before'); },
  'def-lead': function (el) { S.defaultLead = +el.value; save(); },
  'occ-type': function (el) { $('#occ-date').hidden = !!FIXED[el.value]; $('#occ-custom').hidden = el.value !== 'custom'; },
  'gift-person': function (el) { var p = person(el.value); $('#sheet-root [name="occ"]').innerHTML = occOptsFor(p, personOccs(p)[0] && personOccs(p)[0].id); $('#repeat-warn').innerHTML = ''; },
  'gift-planned': function (el) { var g = S.gifts.filter(function (x) { return x.id === el.dataset.id; })[0]; g.planned = Math.max(0, +el.value || 0); save(); setTimeout(render, 0); },
  'gift-actual': function (el) {
    var g = S.gifts.filter(function (x) { return x.id === el.dataset.id; })[0]; g.actual = Math.max(0, +el.value || 0);
    var o = g.occId && occ(g.occId); if (o && g.actual > 0 && STAT.indexOf(occStatus(o)) < 2 && nextDate(o)) { o.st = 'bought'; o.sy = nextDate(o).getFullYear(); toast('Marked bought on the board'); }
    save(); setTimeout(render, 0);
  }
};

document.addEventListener('click', function (e) {
  var el = e.target.closest('[data-act]'); if (!el) return;
  var fn = A[el.dataset.act]; if (fn) fn(el, e);
});
document.addEventListener('change', function (e) { var k = e.target.dataset && e.target.dataset.chg; if (k && CH[k]) CH[k](e.target); });
document.addEventListener('input', function (e) {
  var t = e.target, k = t.dataset && t.dataset.inp;
  if (k === 'note') { var p = person(ui.personId); p.notes[t.dataset.k] = t.value; save(); }
  else if (k === 'iv-budget' && iv) { iv.budget = +t.value; t.style.setProperty('--p', (iv.budget - 10) / 490 * 100 + '%'); $('#iv-bud').innerHTML = flaps('$' + iv.budget); }
});
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') { if ($('#sheet-root').firstChild) closeSheet(); else if (iv) { iv = null; ivRender(); } }
  if (iv && iv.idx < iv.deck.length && !$('#sheet-root').firstChild) { if (e.key === 'ArrowRight') ivAnswer(true); if (e.key === 'ArrowLeft') ivAnswer(false); }
});

/* ---------- boot ---------- */
S = load(); save();
render();
if (!S.ageNoteSeen) {
  var g = document.createElement('div'); g.className = 'gate'; g.id = 'gate';
  g.innerHTML = '<div class="gate-card" role="dialog" aria-modal="true" aria-labelledby="gate-h"><img src="icon.svg" alt="">' + '<div>' + flaps('WELCOME') + '</div><h2 id="gate-h">Gift Pilot is for adults</h2><p>This planner is made for people 18 and over who buy gifts for a lot of other people. It links out to shopping sites and handles budgets. Wine and spirits ideas stay hidden unless you confirm you are 21+ in Settings.</p><button class="btn amber" data-act="gate-ok">I am 18 or older — continue</button></div>';
  document.body.appendChild(g);
}
setInterval(function () { var c = $('#clock'); if (c) c.textContent = clock(); }, 20000);
var lastDay = today().getTime();
document.addEventListener('visibilitychange', function () { if (!document.hidden && today().getTime() !== lastDay) { lastDay = today().getTime(); render(); } });
})();
