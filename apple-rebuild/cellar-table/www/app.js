/* Cellar & Table — app logic. Everything stays on this device. */
(function () {
  'use strict';
  var D = window.CT_DATA, TYPES = D.TYPES, STYLES = D.STYLES, DISHES = D.DISHES, AROMAS = D.AROMAS;
  var KEY = 'cellartable.v1.state';
  var NOW = new Date(), YEAR = NOW.getFullYear();
  var YFRAC = (NOW - new Date(YEAR, 0, 1)) / (365.25 * 864e5);
  var REDUCED = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function uid() { return Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4); }
  function money(n) { return '$' + Math.round(n || 0).toLocaleString('en-US'); }
  function today() { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function niceDate(s) { var p = String(s).split('-'); if (p.length < 3) return s; return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][+p[1] - 1] + ' ' + (+p[2]) + ', ' + p[0]; }
  function plural(n, w) { return n + ' ' + w + (n === 1 ? '' : 's'); }

  /* ---------- state ---------- */
  var S;
  function load() {
    try { var s = JSON.parse(localStorage.getItem(KEY)); if (s && s.racks && s.bottles) { s.journal = s.journal || []; s.rules = s.rules || {}; return s; } } catch (e) {}
    return D.seed();
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { toast('Storage is full. Remove a label photo and try again.'); } }
  S = load();
  var ui = { rack: S.racks[0] && S.racks[0].id, q: '', lit: null, moving: null, page: null, form: null, taste: null };

  function rackById(id) { return S.racks.filter(function (r) { return r.id === id; })[0]; }
  function curRack() { var r = rackById(ui.rack); if (!r) { r = S.racks[0]; ui.rack = r && r.id; } return r; }
  function bottle(id) { return S.bottles.filter(function (b) { return b.id === id; })[0]; }
  function bottleAt(rid, r, c) { return S.bottles.filter(function (b) { return b.rackId === rid && b.r === r && b.c === c; })[0]; }
  function firstFree(rid) { var k = rackById(rid); if (!k) return null; for (var r = 0; r < k.rows; r++) for (var c = 0; c < k.cols; c++) if (!bottleAt(rid, r, c)) return { r: r, c: c }; return null; }
  function slotName(r, c) { return String.fromCharCode(65 + r) + (c + 1); }
  function where(b) { var k = rackById(b.rackId); return (S.racks.length > 1 && k ? k.name + ' · ' : '') + slotName(b.r, b.c); }
  function rule(type) { return S.rules[type] || D.RULES[type] || [1, 5]; }
  function win(b) {
    var r = rule(b.type), base = b.vintage || new Date(b.addedAt || Date.now()).getFullYear();
    var from = b.from || base + r[0], to = b.to || base + r[1];
    if (to < from) to = from;
    return { from: from, to: to, custom: !!(b.from || b.to) };
  }
  function status(b) { var w = win(b); return YEAR < w.from ? 'hold' : YEAR > w.to ? 'past' : 'open'; }
  var ST = { open: 'Open now', hold: 'Hold', past: 'Past peak' };
  function vint(b) { return b.vintage ? String(b.vintage) : 'NV'; }
  function capHtml(b, st) { return '<span class="cap t-' + b.type + ' s-' + (st || status(b)) + '"><i>' + (b.vintage ? '’' + String(b.vintage).slice(2) : 'nv') + '</i></span>'; }
  function dot(type) { return '<span class="dot" style="--c:' + TYPES[type].color + '"></span>'; }

  function stylesOf(b) {
    if (b.style) return [b.style];
    var t = ((b.grape || '') + ' ' + (b.name || '') + ' ' + (b.region || '')).toLowerCase();
    switch (b.type) {
      case 'red':
        if (/cabernet sauv|syrah|shiraz|malbec|nebbiolo|barolo|barbaresco|zinfandel|petite|mourv|tannat|aglianico|touriga|monastrell|bordeaux|napa/.test(t)) return ['bold-red'];
        if (/pinot noir|gamay|beaujolais|burgundy|bourgogne|frappato|schiava|cinsault|zweigelt/.test(t)) return ['light-red'];
        return ['medium-red'];
      case 'white':
        if (/riesling|gew|muscat|moscato|torront|chenin/.test(t)) return ['aromatic-white'];
        if (/chardonnay|viognier|marsanne|roussanne|s[eé]millon|fuiss|meursault|white rioja/.test(t)) return ['rich-white'];
        return ['crisp-white'];
      case 'rose': return ['rose'];
      case 'sparkling': return ['sparkling'];
      case 'dessert': return ['sweet'];
      case 'fortified': return ['fortified'];
      default: return ['orange'];
    }
  }

  /* ---------- icons ---------- */
  var IC = {
    time: '<svg viewBox="0 0 36 36" class="ci" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M4 26h28M8 26v-4M14 26v-4M20 26v-4M26 26v-4"/><rect x="7" y="9" width="14" height="5" rx="2.5" fill="currentColor" fill-opacity=".25"/><rect x="15" y="16" width="14" height="5" rx="2.5"/><path d="M18 5v24" stroke-dasharray="2 3"/></svg>',
    wheel: '<svg viewBox="0 0 36 36" class="ci" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="18" cy="19" r="12"/><circle cx="18" cy="19" r="3.5" fill="currentColor" fill-opacity=".3"/><path d="M18 7v8.5M18 22.500V31M6 19h8.500M21.500 19H30M9.500 10.500l6 6M20.500 21.500l6 6M26.500 10.500l-6 6M15.500 21.500l-6 6"/><path d="M15.500 3h5L18 7z" fill="currentColor"/></svg>',
    book: '<svg viewBox="0 0 36 36" class="ci" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M18 9c-3-2.500-8-3-12-2v20c4-1 9-.5 12 2 3-2.500 8-3 12-2V7c-4-1-9-.5-12 2zM18 9v20"/><path d="M10 13h4M10 17h4M22 13h4M22 17h4"/></svg>',
    coin: '<svg viewBox="0 0 36 36" class="ci" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M6 30V18M13 30V10M20 30V15M27 30V6"/><path d="M4 30h28"/><circle cx="27" cy="6" r="1.500" fill="currentColor"/></svg>',
    rack: '<svg viewBox="0 0 36 36" class="ci" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="5" y="5" width="26" height="26" rx="4"/><circle cx="12.500" cy="12.500" r="3"/><circle cx="23.500" cy="12.500" r="3" fill="currentColor" fill-opacity=".35"/><circle cx="12.500" cy="23.500" r="3" fill="currentColor" fill-opacity=".35"/><circle cx="23.500" cy="23.500" r="3"/></svg>',
    gear: '<svg viewBox="0 0 36 36" class="ci" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M18 5l9 4v8c0 7-4 11-9 14-5-3-9-7-9-14V9z"/><path d="M13.500 18l3 3 6-6.500"/></svg>',
    glass: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M7 3h10c.5 5-1 9-5 9S6.500 8 7 3zM12 12v8M8 20h8"/><path d="M7 7h10" stroke-opacity=".5"/></svg>',
    find: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="8" stroke-dasharray="3 3"/></svg>',
    move: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v18M3 12h18M12 3l-3 3M12 3l3 3M12 21l-3-3M12 21l3-3M3 12l3-3M3 12l3 3M21 12l-3-3M21 12l-3 3"/></svg>',
    edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20l1-4L16 5l3 3L8 19zM14 7l3 3"/></svg>',
    cam: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.500"/></svg>',
    pic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="5" width="16" height="14" rx="2"/><path d="M4 16l5-5 4 4 3-3 4 4"/><circle cx="15.500" cy="9.500" r="1.200"/></svg>',
    bin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13M10 11v6M14 11v6"/></svg>',
    note: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h9l4 4v14H6zM15 3v4h4M9 12h7M9 16h5"/></svg>'
  };

  /* ---------- toast / dialog ---------- */
  var toastT;
  function toast(msg) { var t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove('show'); }, 2600); }
  var dlgCb = null;
  function confirmBox(title, msg, ok, cb) { $('#dlgT').textContent = title; $('#dlgM').textContent = msg; $('#dlgOk').textContent = ok; dlgCb = cb; $('#dialog').classList.add('show'); }

  /* ---------- home ---------- */
  function matchSet() {
    if (ui.q) { var q = ui.q.toLowerCase().split(/\s+/).filter(Boolean); var set = {}; S.bottles.forEach(function (b) { var hay = [b.name, b.producer, b.region, b.grape, TYPES[b.type].label, vint(b), b.notes, ST[status(b)]].join(' ').toLowerCase(); if (q.every(function (w) { return hay.indexOf(w) >= 0; })) set[b.id] = 1; }); return set; }
    if (ui.lit) return ui.lit.ids;
    return null;
  }
  function renderHome() { renderTabs(); renderRack(); renderResults(); renderDrawer(); }
  function renderTabs() {
    var m = matchSet();
    $('#rackTabs').innerHTML = S.racks.map(function (k) {
      var n = m ? S.bottles.filter(function (b) { return b.rackId === k.id && m[b.id]; }).length : 0;
      return '<button class="racktab' + (k.id === ui.rack ? ' on' : '') + '" data-act="tab" data-id="' + k.id + '">' + esc(k.name) + (n ? '<span class="n">' + n + '</span>' : '') + '</button>';
    }).join('') + '<button class="racktab plus" data-act="tool" data-tool="racks" aria-label="Add or edit racks">+</button>';
  }
  /* Nameplate: the rack's name once; the kind is added only when the name does not already say it. */
  function plaqueText(k) {
    var name = String(k.name || '').trim(), kind = String(k.kind || '').trim();
    if (!name) return kind || 'Rack';
    var nl = name.toLowerCase(), words = kind.toLowerCase().split(/\s+/);
    var said = !kind || nl.indexOf(words[words.length - 1]) >= 0;
    return said ? name : name + ' \u00b7 ' + kind.charAt(0).toUpperCase() + kind.slice(1);
  }
  function renderRack() {
    var k = curRack(), area = $('#rackArea');
    if (!k) { area.innerHTML = ''; return; }
    var avail = Math.min(area.clientWidth || 390, 620) - 28 - 22 - 20 - 6;
    var s = Math.max(46, Math.min(72, Math.floor((avail - (k.cols - 1) * 6) / k.cols)));
    var m = matchSet(), h = '';
    if (ui.moving) { var mb = bottle(ui.moving); h += '<div class="banner"><span>Tap a slot for <b>' + esc(mb ? mb.name : '') + '</b></span><button data-act="moveCancel">Cancel</button></div>'; }
    else if (ui.lit && !ui.q) h += '<div class="banner"><span>Lit for <b>' + esc(ui.lit.label) + '</b></span><button data-act="clearLit">Clear</button></div>';
    h += '<div class="rackwrap"><div class="rack" style="--s:' + s + 'px;--cols:' + k.cols + '"><span class="plaque">' + esc(plaqueText(k)) + '</span><div class="grid"><span></span>';
    for (var c = 0; c < k.cols; c++) h += '<span class="gl">' + (c + 1) + '</span>';
    var inRack = 0, ready = 0, typesSeen = {};
    for (var r = 0; r < k.rows; r++) {
      h += '<span class="gl">' + String.fromCharCode(65 + r) + '</span>';
      for (c = 0; c < k.cols; c++) {
        var b = bottleAt(k.id, r, c), cls = 'slot', st = '';
        if (b) { st = status(b); inRack++; if (st === 'open') ready++; typesSeen[b.type] = 1; cls += ' has'; if (m) cls += m[b.id] ? ' lit' : ' dim'; }
        if (ui.moving) cls += ' movable';
        h += '<button class="' + cls + '" data-act="slot" data-r="' + r + '" data-c="' + c + '"' + (b ? ' data-id="' + b.id + '"' : '') + ' aria-label="Slot ' + slotName(r, c) + (b ? ': ' + esc(b.name) + ' ' + vint(b) + ', ' + ST[st] : ', empty') + '">' + (b ? capHtml(b, st) : '') + '</button>';
      }
    }
    h += '</div></div></div><div class="rackinfo"><div class="count"><b>' + inRack + '</b> of ' + (k.rows * k.cols) + ' slots filled · <b>' + ready + '</b> ready to open</div><div class="legend">';
    Object.keys(TYPES).forEach(function (t) { if (typesSeen[t]) h += '<span>' + dot(t) + TYPES[t].label + '</span>'; });
    h += '<span><span class="dot glow"></span>In its window</span></div>';
    /* Open first: the ready bottle in this rack whose window closes soonest. */
    var firsts = S.bottles.filter(function (b) { return b.rackId === k.id && status(b) === 'open'; }).sort(function (a, b) { return win(a).to - win(b).to || (a.vintage || 9999) - (b.vintage || 9999); });
    if (firsts.length && !ui.moving) {
      var fb = firsts[0], left = win(fb).to - YEAR;
      h += '<button class="openfirst" data-act="find" data-id="' + fb.id + '">' + capHtml(fb, 'open') + '<span class="of-t"><small>Open first</small><b>' + esc(fb.name) + ' ' + vint(fb) + '</b><em>' + (left <= 0 ? 'Last year of its window' : left === 1 ? 'One year left in its window' : left + ' years left in its window') + ' \u00b7 slot ' + slotName(fb.r, fb.c) + '</em></span><span class="of-go" aria-hidden="true">\u203a</span></button>';
    }
    h += '<div class="hint">' + (inRack ? 'Tap a bottle to open its label. Press, hold and drag to move it.' : 'Tap any empty slot to lay down your first bottle.') + '</div></div>';
    area.innerHTML = h;
  }
  function renderResults() {
    var el = $('#results'); $('.searchbar').classList.toggle('has', !!ui.q);
    if (!ui.q) { el.innerHTML = ''; return; }
    var m = matchSet(), list = S.bottles.filter(function (b) { return m[b.id]; });
    if (!list.length) { el.innerHTML = '<span class="rnote">Nothing in the cellar matches “' + esc(ui.q) + '”.</span>'; return; }
    el.innerHTML = '<span class="rnote">' + plural(list.length, 'match') .replace('matchs', 'matches') + ' lit</span>' + list.map(function (b) {
      return '<button class="rchip" data-act="find" data-id="' + b.id + '">' + dot(b.type) + '<span><b>' + esc(b.name) + '</b><small>' + vint(b) + ' · find in ' + esc(where(b)) + '</small></span></button>';
    }).join('');
  }
  function renderDrawer() {
    var n = S.bottles.length, ready = S.bottles.filter(function (b) { return status(b) === 'open'; }).length;
    var val = S.bottles.reduce(function (a, b) { return a + (+b.value || +b.price || 0); }, 0);
    $('#drawerSum').textContent = plural(n, 'bottle') + ' · ' + ready + ' ready';
    function li(tool, icon, t, sub, v) { return '<li><button data-act="tool" data-tool="' + tool + '">' + icon + '<span class="ct"><b>' + t + '</b><small>' + sub + '</small></span><span class="cv">' + v + '</span></button></li>'; }
    $('#drawerBody').innerHTML = '<ul class="carte">' +
      li('timeline', IC.time, 'Drinking Windows', 'What to open, what to hold', ready + ' ready') +
      li('pairing', IC.wheel, 'Pairing Wheel', 'Spin a dish, find the bottle', DISHES.length + ' dishes') +
      li('journal', IC.book, 'Cellar Journal', 'Tasting notes and bottles enjoyed', plural(S.journal.length, 'entry').replace('entrys', 'entries')) +
      li('stats', IC.coin, 'Value &amp; Stats', 'Spend, estimates and what you collect', money(val)) +
      li('racks', IC.rack, 'Racks &amp; Fridges', 'Resize, rename, add storage', S.racks.length) +
      li('settings', IC.gear, 'Settings &amp; Privacy', 'Export, rules, delete everything', '') +
      '</ul><p class="carte-foot">Your cellar lives only on this device.</p>';
  }

  function find(id) {
    var b = bottle(id); if (!b) return;
    closePage(); closeSheet(); setDrawer(false);
    ui.rack = b.rackId; renderHome();
    var el = $('.slot[data-id="' + id + '"]'); if (!el) return;
    el.classList.add('pulse');
    el.scrollIntoView({ block: 'center', inline: 'center', behavior: REDUCED ? 'auto' : 'smooth' });
    setTimeout(function () { el.classList.remove('pulse'); }, 4600);
    toast(b.name + ' · slot ' + slotName(b.r, b.c));
  }
  function placeBottle(b, rid, r, c) {
    if (b.rackId === rid && b.r === r && b.c === c) return;
    var o = bottleAt(rid, r, c);
    if (o) { o.rackId = b.rackId; o.r = b.r; o.c = b.c; }
    b.rackId = rid; b.r = r; b.c = c; save(); renderHome();
    var el = $('.slot[data-id="' + b.id + '"]'); if (el) el.classList.add('landed');
    toast(o ? 'Swapped with ' + o.name : 'Moved to ' + slotName(r, c));
  }

  /* drag to move */
  var press = null, drag = null, suppress = false;
  function initDrag() {
    var area = $('#rackArea');
    area.addEventListener('pointerdown', function (e) {
      if (e.button || ui.moving) return;
      var el = e.target.closest('.slot.has'); if (!el) return;
      var x = e.clientX, y = e.clientY;
      press = { el: el, x: x, y: y, t: setTimeout(function () { beginDrag(x, y); }, 380) };
    });
    area.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    document.addEventListener('pointermove', function (e) {
      if (!press) return;
      if (drag) { moveGhost(e.clientX, e.clientY); }
      else if (Math.hypot(e.clientX - press.x, e.clientY - press.y) > 9) { clearTimeout(press.t); press = null; }
    });
    document.addEventListener('pointerup', function (e) {
      if (!press) return; clearTimeout(press.t);
      if (drag) { var tgt = drag.over, b = drag.b; endDrag(); suppress = true; setTimeout(function () { suppress = false; }, 80); drop(b, tgt); }
      press = null;
    });
    document.addEventListener('pointercancel', function () { if (press) { clearTimeout(press.t); press = null; } if (drag) endDrag(); });
    document.addEventListener('touchmove', function (e) { if (drag) e.preventDefault(); }, { passive: false });
  }
  function beginDrag(x, y) {
    if (!press) return;
    var el = press.el, b = bottle(el.dataset.id), cap = el.querySelector('.cap'); if (!b || !cap) { press = null; return; }
    var size = cap.offsetWidth, g = cap.cloneNode(true);
    g.classList.add('dragghost'); g.style.width = g.style.height = size + 'px'; g.style.setProperty('--s', el.offsetWidth + 'px');
    document.body.appendChild(g);
    drag = { b: b, g: g, el: el, over: null, size: size };
    el.classList.add('lifting'); document.body.classList.add('dragging');
    if (navigator.vibrate) { try { navigator.vibrate(10); } catch (e) {} }
    moveGhost(x, y);
  }
  function moveGhost(x, y) {
    drag.g.style.transform = 'translate(' + (x - drag.size / 2) + 'px,' + (y - drag.size / 2 - 14) + 'px) scale(1.3)';
    var t = document.elementFromPoint(x, y), tgt = t && (t.closest('.slot') || t.closest('.racktab:not(.plus)'));
    if (tgt !== drag.over) { if (drag.over) drag.over.classList.remove('droptarget'); drag.over = tgt; if (tgt) tgt.classList.add('droptarget'); }
  }
  function endDrag() {
    if (drag.over) drag.over.classList.remove('droptarget');
    drag.el.classList.remove('lifting'); drag.g.remove(); document.body.classList.remove('dragging'); drag = null;
  }
  function drop(b, tgt) {
    if (!tgt) return;
    if (tgt.classList.contains('racktab')) {
      var rid = tgt.dataset.id; if (rid === b.rackId) return;
      var f = firstFree(rid); if (!f) { toast('That rack is full'); return; }
      b.rackId = rid; b.r = f.r; b.c = f.c; save(); renderHome();
      toast('Moved to ' + rackById(rid).name + ' · ' + slotName(f.r, f.c)); return;
    }
    placeBottle(b, ui.rack, +tgt.dataset.r, +tgt.dataset.c);
  }

  /* drawer */
  function setDrawer(open) { $('#drawer').classList.toggle('open', open); $('#drawerScrim').classList.toggle('show', open); $('#drawerHandle').setAttribute('aria-expanded', open); }
  function initDrawer() {
    var d = $('#drawer'), h = $('#drawerHandle'), st = null;
    h.addEventListener('pointerdown', function (e) { st = { y: e.clientY, open: d.classList.contains('open'), moved: false, base: d.getBoundingClientRect().height }; try { h.setPointerCapture(e.pointerId); } catch (x) {} });
    h.addEventListener('pointermove', function (e) {
      if (!st) return; var dy = e.clientY - st.y; if (Math.abs(dy) > 6) st.moved = true; if (!st.moved) return;
      var peek = parseFloat(getComputedStyle(d).getPropertyValue('--peek')) || 70, closed = st.base - 70;
      var y = Math.max(0, Math.min(closed, (st.open ? 0 : closed) + dy));
      d.classList.add('dragging'); d.style.transform = 'translateY(' + y + 'px)';
    });
    function up(e) {
      if (!st) return; var dy = e.clientY - st.y; d.classList.remove('dragging'); d.style.transform = '';
      if (!st.moved) setDrawer(!st.open); else setDrawer(st.open ? dy < 60 : dy < -50);
      st = null;
    }
    h.addEventListener('pointerup', up); h.addEventListener('pointercancel', function () { if (st) { d.classList.remove('dragging'); d.style.transform = ''; st = null; } });
    h.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setDrawer(!d.classList.contains('open')); } });
  }

  /* ---------- sheet: bottle ---------- */
  function openSheet(html) { $('#sheetBody').innerHTML = html; $('#sheetBody').scrollTop = 0; $('#sheet').classList.add('show'); $('#sheetScrim').classList.add('show'); }
  function closeSheet() { $('#sheet').classList.remove('show'); $('#sheetScrim').classList.remove('show'); ui.form = null; }
  function windowBar(b) {
    var w = win(b), lo = Math.min(w.from, YEAR) - 1, hi = Math.max(w.to, YEAR) + 2, span = hi - lo;
    var l = (w.from - lo) / span * 100, wd = (w.to + 1 - w.from) / span * 100, n = Math.min(100, (YEAR + YFRAC - lo) / span * 100);
    return '<div class="wbar" style="--c:' + TYPES[b.type].color + '"><span class="trk"></span><span class="win" style="left:' + l + '%;width:' + wd + '%"></span><span class="now" style="left:' + n + '%"></span></div><div class="wlab"><span>' + lo + '</span><span>Window ' + w.from + '–' + w.to + (w.custom ? ' · your override' : ' · ' + TYPES[b.type].label + ' rule') + '</span><span>' + hi + '</span></div>';
  }
  function openBottle(id) {
    var b = bottle(id); if (!b) return; var st = status(b), w = win(b);
    var say = st === 'open' ? (w.to === YEAR ? 'Last year of its window. Open it soon.' : 'In its drinking window.') : st === 'hold' ? 'Sleeping. Opens in ' + w.from + '.' : 'Its window closed in ' + w.to + '. Drink up.';
    openSheet('<div class="sheet-head"><span class="sc">Slot ' + esc(where(b)) + '</span><button class="x" data-act="sheetClose" aria-label="Close">&times;</button></div>' +
      '<div class="bl"><div class="bl-in">' + (b.label ? '<img class="bl-photo" src="' + b.label + '" alt="Label photo">' : '') +
      '<div class="vint">' + vint(b) + '</div><h3>' + esc(b.name) + '</h3>' + (b.producer ? '<div class="prod">' + esc(b.producer) + '</div>' : '') +
      '<span class="orn">◆ ◆ ◆</span><div class="reg">' + esc([b.region, b.grape].filter(Boolean).join(' · ') || TYPES[b.type].label) + '</div></div></div>' +
      '<div class="status"><span class="badge ' + st + '">' + ST[st] + '</span><span>' + say + '</span></div>' + windowBar(b) +
      '<div class="facts"><div><small>Type</small><b>' + TYPES[b.type].label + '</b></div><div><small>Paid</small><b>' + (b.price ? money(b.price) : '—') + '</b></div><div><small>Est. value</small><b>' + (b.value ? money(b.value) : '—') + '</b></div></div>' +
      (b.notes ? '<p class="bnotes">' + esc(b.notes) + '</p>' : '') +
      '<button class="btn burg wide" data-act="taste" data-id="' + b.id + '">' + IC.glass.replace('<svg', '<svg width="22" height="22"') + ' Open it &amp; write a tasting note</button>' +
      '<div class="acts">' +
      '<button class="act" data-act="find" data-id="' + b.id + '">' + IC.find + 'Find</button>' +
      '<button class="act" data-act="moveStart" data-id="' + b.id + '">' + IC.move + 'Move</button>' +
      '<button class="act" data-act="edit" data-id="' + b.id + '">' + IC.edit + 'Edit</button>' +
      '<label class="act">' + IC.cam + 'Label<input type="file" accept="image/*" capture="environment" data-photo="bottle" data-id="' + b.id + '" aria-label="Photograph the label"></label>' +
      '<label class="act">' + IC.pic + 'Library<input type="file" accept="image/*" data-photo="bottle" data-id="' + b.id + '" aria-label="Choose a label photo"></label>' +
      (b.label ? '<button class="act" data-act="photoDel" data-id="' + b.id + '">' + IC.bin + 'No photo</button>' : '') +
      '<button class="act danger" data-act="remove" data-id="' + b.id + '">' + IC.bin + 'Remove</button>' +
      '</div>');
  }
  function openForm(b, pos) {
    var isNew = !b; b = b || { name: '', producer: '', vintage: YEAR - 2, type: 'red', region: '', grape: '', price: '', value: '', style: '', from: '', to: '', notes: '', label: '' };
    ui.form = { id: isNew ? null : b.id, pos: pos, type: b.type, label: b.label || '' };
    function inp(name, label, val, attrs) { return '<label class="f"><span>' + label + '</span><input name="' + name + '" value="' + esc(val == null ? '' : val) + '" ' + (attrs || '') + '></label>'; }
    var k = pos && rackById(pos.rackId);
    openSheet('<form id="bform" class="form" autocomplete="off" novalidate><div class="sheet-head"><span class="sc">' + (isNew ? 'New bottle · ' + esc((S.racks.length > 1 && k ? k.name + ' ' : 'slot ') + slotName(pos.r, pos.c)) : 'Edit bottle') + '</span><button type="button" class="x" data-act="sheetClose" aria-label="Close">&times;</button></div>' +
      inp('name', 'Wine name', b.name, 'placeholder="e.g. Chianti Classico Riserva" maxlength="80"') +
      inp('producer', 'Producer', b.producer, 'placeholder="Winery or estate" maxlength="80"') +
      '<div class="f2">' + inp('vintage', 'Vintage', b.vintage || '', 'type="number" inputmode="numeric" min="1900" max="' + (YEAR + 1) + '" placeholder="blank = NV"') + inp('region', 'Region', b.region, 'placeholder="e.g. Tuscany" maxlength="50"') + '</div>' +
      '<div class="f"><span class="flabel">Type</span><div class="types" id="ftypes">' + typeBtns(b.type) + '</div></div>' +
      '<div class="f2">' + inp('grape', 'Grape', b.grape, 'placeholder="e.g. Sangiovese" maxlength="60"') +
      '<label class="f"><span>Pairing style</span><select name="style"><option value="">Auto from grape</option>' + Object.keys(STYLES).map(function (s) { return '<option value="' + s + '"' + (b.style === s ? ' selected' : '') + '>' + STYLES[s].label + '</option>'; }).join('') + '</select></label></div>' +
      '<div class="f2">' + inp('price', 'Price paid ($)', b.price, 'type="number" inputmode="decimal" min="0" step="any" placeholder="0"') + inp('value', 'Your value estimate ($)', b.value, 'type="number" inputmode="decimal" min="0" step="any" placeholder="same as paid"') + '</div>' +
      '<div class="f2">' + inp('from', 'Drink from (year)', b.from || '', 'type="number" inputmode="numeric" min="1900" max="2200" placeholder="auto"') + inp('to', 'Drink by (year)', b.to || '', 'type="number" inputmode="numeric" min="1900" max="2200" placeholder="auto"') + '</div>' +
      '<p class="fhint">Leave the window on auto to use your rule for this type.</p>' +
      '<label class="f"><span>Cellar note</span><textarea name="notes" maxlength="400" placeholder="Where it came from, who it is for…">' + esc(b.notes) + '</textarea></label>' +
      '<div class="f"><span class="flabel">Label photo</span><div class="photorow" id="fphoto">' + formPhoto() + '</div></div>' +
      '<button class="btn burg wide" type="submit">' + (isNew ? 'Lay it down' : 'Save changes') + '</button></form>');
  }
  function typeBtns(cur) { return Object.keys(TYPES).map(function (t) { return '<button type="button" class="typeb' + (t === cur ? ' on' : '') + '" data-act="ftype" data-t="' + t + '">' + dot(t) + TYPES[t].label + '</button>'; }).join(''); }
  function formPhoto() {
    return (ui.form.label ? '<img src="' + ui.form.label + '" alt="Label">' : '') +
      '<label class="filebtn">' + IC.cam.replace('<svg', '<svg width="20" height="20"') + ' Take photo<input type="file" accept="image/*" capture="environment" data-photo="form"></label>' +
      '<label class="filebtn">' + IC.pic.replace('<svg', '<svg width="20" height="20"') + ' Choose<input type="file" accept="image/*" data-photo="form"></label>' +
      (ui.form.label ? '<button type="button" class="filebtn" data-act="fphotoDel">Remove</button>' : '');
  }
  function saveForm(f) {
    var v = function (n) { return (f.elements[n].value || '').trim(); }, num = function (n) { var x = parseFloat(v(n)); return isFinite(x) && x > 0 ? x : null; };
    if (!v('name')) { toast('Give the bottle a name'); f.elements.name.focus(); return; }
    var vin = num('vintage'); if (vin && (vin < 1900 || vin > YEAR + 1)) { toast('Vintage should be between 1900 and ' + (YEAR + 1)); return; }
    var from = num('from'), to = num('to'); if (from && to && to < from) { toast('“Drink by” should come after “drink from”'); return; }
    var data = { name: v('name'), producer: v('producer'), vintage: vin ? Math.round(vin) : null, type: ui.form.type, region: v('region'), grape: v('grape'), style: v('style'), price: num('price'), value: num('value'), from: from ? Math.round(from) : null, to: to ? Math.round(to) : null, notes: v('notes'), label: ui.form.label || '' };
    var b;
    if (ui.form.id) { b = bottle(ui.form.id); for (var k in data) b[k] = data[k]; toast('Saved'); }
    else { b = data; b.id = uid(); b.addedAt = Date.now(); b.rackId = ui.form.pos.rackId; b.r = ui.form.pos.r; b.c = ui.form.pos.c; S.bottles.push(b); toast(b.name + ' laid down in ' + slotName(b.r, b.c)); }
    save(); closeSheet(); renderHome(); refreshPage();
    var el = $('.slot[data-id="' + b.id + '"]'); if (el) el.classList.add('landed');
  }
  function readPhoto(file, cb) {
    if (!file) return;
    var r = new FileReader();
    r.onload = function () {
      var img = new Image();
      img.onload = function () {
        var max = 520, k = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(img.width * k)); c.height = Math.max(1, Math.round(img.height * k));
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        cb(c.toDataURL('image/jpeg', 0.72));
      };
      img.onerror = function () { toast('That image could not be read'); };
      img.src = r.result;
    };
    r.onerror = function () { toast('That image could not be read'); };
    r.readAsDataURL(file);
  }

  /* ---------- pages ---------- */
  var PAGES = {};
  function openPage(name, arg) {
    setDrawer(false); ui.page = name; ui.pageArg = arg;
    var p = PAGES[name]; $('#pgTitle').textContent = p.title; $('#pgExtra').innerHTML = p.extra || '';
    $('#pgBody').innerHTML = p.render(arg); $('#pgBody').scrollTop = 0;
    $('#page').classList.add('show'); $('#page').setAttribute('aria-hidden', 'false');
    if (p.after) p.after();
  }
  function closePage() { if (!ui.page) return; ui.page = null; $('#page').classList.remove('show'); $('#page').setAttribute('aria-hidden', 'true'); }
  function refreshPage() {
    if (!ui.page || ui.page === 'taste') return;
    var p = PAGES[ui.page], body = $('#pgBody'), sc = body.scrollTop, tl = $('#tl'), tx = tl && tl.scrollLeft, ty = tl && tl.scrollTop;
    body.innerHTML = p.render(ui.pageArg); body.scrollTop = sc;
    if (p.after) p.after(true);
    if (tl && $('#tl')) { $('#tl').scrollLeft = tx; $('#tl').scrollTop = ty; }
  }

  /* timeline */
  var PX = 46;
  PAGES.timeline = {
    title: 'Drinking Windows', extra: '<button class="linkbtn" data-act="rules">Rules</button>',
    render: function () {
      if (!S.bottles.length) return '<div class="empty"><b>No bottles yet</b>Add a bottle to the rack and its drinking window will appear here.</div>';
      var ws = S.bottles.map(function (b) { return { b: b, w: win(b), st: status(b) }; });
      var minY = YEAR, maxY = YEAR; ws.forEach(function (x) { minY = Math.min(minY, x.w.from); maxY = Math.max(maxY, x.w.to); }); minY -= 1; maxY += 1;
      var W = (maxY - minY + 1) * PX, nowX = (YEAR - minY + YFRAC) * PX;
      var G = [['open', 'Open now', 'in their window'], ['hold', 'Hold', 'still sleeping'], ['past', 'Past peak', 'drink soon or cook with it']];
      var cnt = { open: 0, hold: 0, past: 0 }; ws.forEach(function (x) { cnt[x.st]++; });
      var h = '<div class="tl-top">' + G.map(function (g) { return '<button class="tl-chip ' + g[0] + '" data-act="tlJump" data-g="' + g[0] + '"><b>' + cnt[g[0]] + '</b><small>' + g[1] + '</small></button>'; }).join('') + '</div>';
      h += '<div class="tl" id="tl" data-now="' + nowX + '"><div class="tl-in" style="width:' + W + 'px;--px:' + PX + 'px"><div class="tl-axis">';
      for (var y = minY; y <= maxY; y++) h += '<span style="left:' + ((y - minY) * PX) + 'px"' + (y === YEAR ? ' class="cur"' : '') + '>' + y + '</span>';
      h += '</div><div class="tl-now" style="left:' + nowX + 'px"></div>';
      G.forEach(function (g) {
        var rows = ws.filter(function (x) { return x.st === g[0]; });
        rows.sort(function (a, b) { return g[0] === 'hold' ? a.w.from - b.w.from : g[0] === 'open' ? a.w.to - b.w.to : b.w.to - a.w.to; });
        h += '<div><div class="tl-g" id="tlg-' + g[0] + '"><b>' + g[1] + '</b><i>' + (rows.length ? plural(rows.length, 'bottle') + ' ' + g[2] : 'none') + '</i></div></div>';
        rows.forEach(function (x) {
          var b = x.b, note = g[0] === 'open' ? (x.w.to === YEAR ? 'last year' : plural(x.w.to - YEAR, 'yr') + ' left') : g[0] === 'hold' ? 'in ' + plural(x.w.from - YEAR, 'yr') : plural(YEAR - x.w.to, 'yr') + ' over';
          h += '<button class="tl-row ' + g[0] + '" data-act="bottle" data-id="' + b.id + '"><span class="tl-name">' + dot(b.type) + '<b>' + esc(b.name) + '</b><em>' + vint(b) + ' · ' + x.w.from + '–' + x.w.to + ' · ' + note + '</em></span><span class="tl-bar" style="--c:' + TYPES[b.type].color + ';left:' + ((x.w.from - minY) * PX + 3) + 'px;width:' + ((x.w.to - x.w.from + 1) * PX - 6) + 'px"></span></button>';
        });
      });
      return h + '</div></div>';
    },
    after: function (keep) { var tl = $('#tl'); if (tl && !keep) tl.scrollLeft = Math.max(0, +tl.dataset.now - tl.clientWidth / 2); }
  };
  function openRules() {
    openSheet('<form id="rform" class="form" novalidate><div class="sheet-head"><span class="sc">Drinking-window rules</span><button type="button" class="x" data-act="sheetClose" aria-label="Close">&times;</button></div>' +
      '<p class="fhint">Years after the vintage that each type usually opens and closes. A bottle with its own “drink from / by” years ignores these.</p>' +
      '<div class="rules-row"><span></span><span class="flabel">Opens +</span><span class="flabel">Closes +</span></div>' +
      Object.keys(TYPES).map(function (t) { var r = rule(t); return '<div class="rules-row"><span class="nm">' + dot(t) + TYPES[t].label + '</span><input type="number" inputmode="numeric" min="0" max="80" name="a-' + t + '" value="' + r[0] + '" aria-label="' + TYPES[t].label + ' opens after years"><input type="number" inputmode="numeric" min="0" max="120" name="b-' + t + '" value="' + r[1] + '" aria-label="' + TYPES[t].label + ' closes after years"></div>'; }).join('') +
      '<div class="row" style="margin-top:20px"><button type="button" class="btn ghost" data-act="rulesReset" style="margin-top:0">Reset</button><button class="btn burg" type="submit" style="margin-top:0">Save rules</button></div></form>');
  }

  /* pairing */
  var pair = { rot: 0, idx: 0, busy: null };
  var SEG = 360 / DISHES.length, CATC = [['#7a1c30', '#8f2a40'], ['#5a3a1c', '#6d4824'], ['#4d5a2a', '#5f6d35'], ['#8a5a1a', '#a06c22']];
  function pt(r, deg) { var a = deg * Math.PI / 180; return (r * Math.sin(a)).toFixed(1) + ' ' + (-r * Math.cos(a)).toFixed(1); }
  function wheelSvg() {
    var h = '<svg viewBox="-320 -320 640 640" id="pwSvg" style="transform:rotate(' + pair.rot + 'deg)"><circle r="318" fill="#1a0e06"/><circle r="316" fill="none" stroke="#f0b95a" stroke-width="3"/>';
    DISHES.forEach(function (d, i) {
      var a = i * SEG, a0 = a - SEG / 2, a1 = a + SEG / 2;
      h += '<path class="seg" data-i="' + i + '" fill="' + CATC[d.c][i % 2] + '" d="M' + pt(112, a0) + ' L' + pt(308, a0) + ' A308 308 0 0 1 ' + pt(308, a1) + ' L' + pt(112, a1) + ' A112 112 0 0 0 ' + pt(112, a0) + 'Z"/>';
      h += '<text transform="rotate(' + (a + 90).toFixed(2) + ') translate(-296,5)">' + esc(d.n) + '</text>';
    });
    h += '<circle r="110" fill="#2a1707" stroke="#f0b95a" stroke-width="2"/><circle r="92" fill="none" stroke="#f0b95a" stroke-opacity=".4" stroke-dasharray="2 6"/><circle r="60" fill="#6e1629" stroke="#f0b95a" stroke-width="1.5"/></svg>';
    return h;
  }
  function pairOut() {
    var d = DISHES[pair.idx], rankSt = { open: 0, past: 1, hold: 2 }, owned = [];
    S.bottles.forEach(function (b) { var ss = stylesOf(b), hit = d.s.filter(function (x) { return ss.indexOf(x) >= 0; })[0]; if (hit) owned.push({ b: b, hit: hit, rank: d.s.indexOf(hit), st: status(b) }); });
    owned.sort(function (a, b) { return rankSt[a.st] - rankSt[b.st] || a.rank - b.rank; });
    var h = '<div class="dish"><span class="sc">' + D.CATS[d.c] + '</span><h3>' + esc(d.n) + '</h3><p>' + esc(d.w) + '</p><div class="styles">' +
      d.s.map(function (s, i) { return '<span class="stylechip' + (i === 0 ? ' best' : '') + '">' + (i === 0 ? 'Best: ' : '') + STYLES[s].label + '<small>' + STYLES[s].eg + '</small></span>'; }).join('') + '</div></div><div class="pad" style="padding-top:8px">';
    h += '<div class="h">From your cellar</div>';
    if (owned.length) {
      h += owned.map(function (o) {
        var adv = o.st === 'open' ? 'In its window now.' : o.st === 'hold' ? 'Still young: decant well, or wait.' : 'Past peak: drink it soon.';
        return '<button class="own" data-act="find" data-id="' + o.b.id + '">' + capHtml(o.b, o.st) + '<span class="ot"><b>' + esc(o.b.name) + ' ' + vint(o.b) + '</b><small>' + STYLES[o.hit].label + ': ' + STYLES[o.hit].why + '. ' + adv + '</small></span><span class="os">' + esc(slotName(o.b.r, o.b.c)) + '<br>' + ST[o.st] + '</span></button>';
      }).join('');
      h += '<button class="btn wide" style="margin-top:14px" data-act="pairLight">Light up ' + plural(owned.length, 'bottle') + ' on the rack</button>';
    } else h += '<p class="lede">Nothing in your racks fits yet. Next time you shop, look for a ' + STYLES[d.s[0]].label.toLowerCase() + ' (' + STYLES[d.s[0]].eg + ').</p>';
    h += '<div class="h">Or pick a dish</div>';
    D.CATS.forEach(function (c, ci) {
      h += '<p class="sc" style="color:var(--mute);margin:12px 0 8px">' + c + '</p><div class="picks">' + DISHES.map(function (x, i) { return x.c === ci ? '<button class="pick' + (i === pair.idx ? ' on' : '') + '" data-act="pick" data-i="' + i + '">' + esc(x.n) + '</button>' : ''; }).join('') + '</div>';
    });
    pair.owned = owned.map(function (o) { return o.b.id; });
    return h + '</div>';
  }
  function setWheel(rot, ms) {
    var svg = $('#pwSvg'); if (!svg) return;
    if (REDUCED) ms = 0;
    svg.style.transition = ms ? 'transform ' + ms + 'ms cubic-bezier(.12,.75,.12,1)' : 'none';
    pair.rot = rot; svg.style.transform = 'rotate(' + rot + 'deg)';
    clearTimeout(pair.busy);
    var n = DISHES.length, idx = ((Math.round(-rot / SEG) % n) + n) % n;
    pair.busy = setTimeout(function () { pair.idx = idx; $$('#pwSvg .seg').forEach(function (s, i) { s.classList.toggle('sel', i === idx); }); var o = $('#pairOut'); if (o) o.innerHTML = pairOut(); }, ms ? ms + 30 : 0);
  }
  function wheelTo(i, ms) { var target = -i * SEG, k = Math.round((pair.rot - target) / 360); setWheel(target + k * 360, ms == null ? 700 : ms); }
  PAGES.pairing = {
    title: 'Pairing Wheel',
    render: function () {
      return '<div class="pw" id="pw"><svg class="pw-pointer" viewBox="0 0 34 40"><path d="M17 38L4 8a13 13 0 0 1 26 0z" fill="#f0b95a" stroke="#2a1707" stroke-width="1.5"/><circle cx="17" cy="11" r="4" fill="#6e1629"/></svg>' + wheelSvg() + '<button class="btn pw-spin" data-act="spin">Spin the wheel</button></div><div id="pairOut">' + pairOut() + '</div>';
    },
    after: function () {
      $$('#pwSvg .seg').forEach(function (s, i) { s.classList.toggle('sel', i === pair.idx); });
      var pw = $('#pw'), st = null;
      pw.addEventListener('pointerdown', function (e) { if (e.target.closest('.pw-spin')) return; st = { x: e.clientX, rot: pair.rot, moved: false, lx: e.clientX, lt: e.timeStamp, v: 0, seg: e.target.closest('.seg') }; try { pw.setPointerCapture(e.pointerId); } catch (x) {} });
      pw.addEventListener('pointermove', function (e) {
        if (!st) return; var dx = e.clientX - st.x; if (Math.abs(dx) > 6) st.moved = true; if (!st.moved) return;
        var dt = e.timeStamp - st.lt; if (dt > 0) st.v = (e.clientX - st.lx) / dt; st.lx = e.clientX; st.lt = e.timeStamp;
        var svg = $('#pwSvg'); svg.style.transition = 'none'; pair.rot = st.rot + dx * 0.22; svg.style.transform = 'rotate(' + pair.rot + 'deg)';
      });
      function up() {
        if (!st) return; var s = st; st = null;
        if (!s.moved) { if (s.seg) wheelTo(+s.seg.dataset.i); return; }
        var target = pair.rot + Math.max(-1.5, Math.min(1.5, s.v)) * 0.22 * 320;
        setWheel(Math.round(target / SEG) * SEG, 800);
      }
      pw.addEventListener('pointerup', up); pw.addEventListener('pointercancel', up);
    }
  };

  /* tasting */
  var SCOREW = function (n) { return n >= 95 ? 'Extraordinary' : n >= 90 ? 'Outstanding' : n >= 85 ? 'Very good' : n >= 80 ? 'Good' : n >= 70 ? 'Average' : 'Below average'; };
  var STARW = ['Tap to rate', 'Poor', 'Fair', 'Good', 'Very good', 'Exceptional'];
  function aromaColor(name) { for (var i = 0; i < AROMAS.length; i++) if (AROMAS[i].d.indexOf(name) >= 0) return AROMAS[i].color; return '#b39c7d'; }
  function awSvg() {
    var t = ui.taste, n = AROMAS.length, cs = 360 / n, h = '<svg class="aw" id="aw" viewBox="-182 -182 364 364" role="group" aria-label="Aroma wheel">';
    AROMAS.forEach(function (cat, ci) {
      var a0 = ci * cs, a1 = a0 + cs, mid = a0 + cs / 2, on = ci === t.cat, flip = mid > 90 && mid < 270;
      h += '<path class="cat" data-act="awCat" data-i="' + ci + '" fill="' + cat.color + '" fill-opacity="' + (on ? 1 : .55) + '" d="M' + pt(44, a0) + ' L' + pt(92, a0) + ' A92 92 0 0 1 ' + pt(92, a1) + ' L' + pt(44, a1) + ' A44 44 0 0 0 ' + pt(44, a0) + 'Z"/>';
      h += '<text class="cl" text-anchor="middle" transform="rotate(' + mid + ') translate(0,' + (flip ? -62 : -65) + ')' + (flip ? ' rotate(180) translate(0,6)' : '') + '">' + cat.n + '</text>';
      var ds = cs / cat.d.length;
      cat.d.forEach(function (dn, di) {
        var b0 = a0 + di * ds, b1 = b0 + ds, bm = b0 + ds / 2, sel = t.aromas.indexOf(dn) >= 0;
        h += '<path class="ds" data-act="awDesc" data-n="' + dn + '" data-i="' + ci + '" fill="' + cat.color + '" fill-opacity="' + (sel ? 1 : on ? .34 : .16) + '" d="M' + pt(94, b0) + ' L' + pt(178, b0) + ' A178 178 0 0 1 ' + pt(178, b1) + ' L' + pt(94, b1) + ' A94 94 0 0 0 ' + pt(94, b0) + 'Z"/>';
        h += bm <= 180 ? '<text class="dl' + (sel ? ' on' : '') + '" transform="rotate(' + (bm - 90).toFixed(1) + ') translate(100,3)">' + dn + '</text>'
          : '<text class="dl' + (sel ? ' on' : '') + '" text-anchor="end" transform="rotate(' + (bm + 90).toFixed(1) + ') translate(-100,3)">' + dn + '</text>';
      });
    });
    h += '<circle r="42" fill="#1c1108" stroke="#f0b95a" stroke-opacity=".5"/><text class="hubn" y="6">' + t.aromas.length + '</text><text class="hubt" y="20">NOTES</text></svg>';
    return h;
  }
  function bloomHtml() {
    var t = ui.taste, cat = AROMAS[t.cat];
    return '<span class="sc">' + cat.n + ' · tap what you smell</span><div class="dchips" style="--c:' + cat.color + '">' + cat.d.map(function (dn) { return '<button class="dchip' + (t.aromas.indexOf(dn) >= 0 ? ' on' : '') + '" data-act="awDesc" data-n="' + dn + '">' + dn + '</button>'; }).join('') + '</div><div class="picked">' + (t.aromas.length ? t.aromas.join(' · ') : 'Nothing picked yet. Turn through the wheel.') + '</div>';
  }
  function scoreHtml() {
    var t = ui.taste;
    return '<div class="seg2"><button class="' + (t.mode === '100' ? 'on' : '') + '" data-act="tMode" data-m="100">100 points</button><button class="' + (t.mode === '5' ? 'on' : '') + '" data-act="tMode" data-m="5">5 stars</button></div>' +
      (t.mode === '100'
        ? '<div class="scorebox"><div class="scorenum" id="scoreNum">' + t.score + '</div><div class="scoreword" id="scoreWord">' + SCOREW(t.score) + '</div><input type="range" id="scoreRange" min="50" max="100" step="1" value="' + t.score + '" aria-label="Score out of 100"></div>'
        : '<div class="scorebox"><div class="stars">' + [1, 2, 3, 4, 5].map(function (n) { return '<button class="' + (n <= t.stars ? 'on' : '') + '" data-act="tStar" data-n="' + n + '" aria-label="' + n + ' stars">★</button>'; }).join('') + '</div><div class="scoreword">' + STARW[t.stars] + '</div></div>');
  }
  function refreshAroma() { $('#awWrap').innerHTML = awSvg(); $('#bloom').innerHTML = bloomHtml(); }
  PAGES.taste = {
    title: 'Tasting Note',
    render: function (id) {
      var b = bottle(id);
      ui.taste = { id: id, cat: 0, aromas: [], mode: S.scoreMode || '100', score: 88, stars: 0 };
      return '<div class="pad dk"><div class="tastehead"><h3>' + esc(b.name) + ' ' + vint(b) + '</h3><p>' + esc([b.producer, b.region].filter(Boolean).join(' · ')) + '</p></div>' +
        '<div class="h">Aroma wheel</div><div id="awWrap">' + awSvg() + '</div><div class="bloom" id="bloom">' + bloomHtml() + '</div>' +
        '<div class="h">Score</div><div id="scoreWrap">' + scoreHtml() + '</div>' +
        '<div class="h">The occasion</div>' +
        '<div class="f2"><label class="f"><span>Date</span><input type="date" id="tDate" value="' + today() + '" max="' + today() + '"></label><label class="f"><span>Drank it with</span><input id="tWho" placeholder="Names, or just me" maxlength="80"></label></div>' +
        '<label class="f"><span>Notes</span><textarea id="tNotes" maxlength="800" placeholder="How it tasted, what was on the table…"></textarea></label>' +
        '<button class="btn burg wide" style="margin-top:24px" data-act="tSave" data-drunk="1">Finished the bottle · move to Journal</button>' +
        '<button class="btn ghost wide" style="margin-top:10px;color:var(--cream)" data-act="tSave" data-drunk="0">Save note, keep bottle in rack</button></div>';
    }
  };
  function saveTaste(drunk) {
    var t = ui.taste, b = bottle(t.id); if (!b) return;
    if (t.mode === '5' && !t.stars) { toast('Tap a star rating first'); return; }
    var e = { id: uid(), date: $('#tDate').value || today(), drunk: drunk, name: b.name, producer: b.producer, vintage: b.vintage, type: b.type, region: b.region, grape: b.grape, price: b.price, label: b.label, mode: t.mode, score: t.mode === '100' ? t.score : t.stars, aromas: t.aromas.slice(), who: $('#tWho').value.trim(), notes: $('#tNotes').value.trim() };
    if (drunk) { e.bottle = JSON.parse(JSON.stringify(b)); S.bottles = S.bottles.filter(function (x) { return x.id !== b.id; }); }
    S.journal.unshift(e); S.scoreMode = t.mode; save(); renderHome();
    openPage('journal'); toast(drunk ? 'Cheers. Moved to your Cellar Journal.' : 'Tasting note saved.');
  }

  /* journal */
  PAGES.journal = {
    title: 'Cellar Journal',
    render: function () {
      if (!S.journal.length) return '<div class="empty"><b>The journal is blank</b>Open a bottle from the rack, tap “Open it &amp; write a tasting note”, and it will be remembered here.</div>';
      var list = S.journal.slice().sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : 0; });
      var spent = 0, drunk = 0; list.forEach(function (e) { if (e.drunk) { drunk++; spent += +e.price || 0; } });
      return '<div class="pad"><p class="lede">' + plural(drunk, 'bottle') + ' enjoyed' + (spent ? ', ' + money(spent) + ' well spent' : '') + '. ' + plural(list.length, 'note') + ' kept.</p>' + list.map(function (e) {
        return '<article class="jr"><div class="jr-top">' + (e.label ? '<img src="' + e.label + '" alt="">' : '') + '<div class="jr-t"><div class="jr-date">' + niceDate(e.date) + (e.drunk ? '' : ' · still in rack') + '</div><h3>' + esc(e.name) + ' ' + (e.vintage || 'NV') + '</h3><div class="sub">' + esc([e.producer, e.region].filter(Boolean).join(' · ')) + '</div></div>' +
          '<div class="jr-score">' + (e.mode === '100' ? '<b>' + e.score + '</b><small>points</small>' : '<span class="st">' + '★★★★★'.slice(0, e.score) + '☆☆☆☆☆'.slice(0, 5 - e.score) + '</span>') + '</div></div>' +
          (e.aromas && e.aromas.length ? '<div class="jr-ar">' + e.aromas.map(function (a) { return '<span style="--c:' + aromaColor(a) + '">' + esc(a) + '</span>'; }).join('') + '</div>' : '') +
          (e.notes ? '<p class="jr-n">“' + esc(e.notes) + '”</p>' : '') + (e.who ? '<p class="jr-w">Shared with ' + esc(e.who) + '</p>' : '') +
          '<div class="jr-acts">' + (e.drunk ? '<button data-act="jRestock" data-id="' + e.id + '">Bought another</button>' : '') + '<button data-act="jDel" data-id="' + e.id + '">Delete note</button></div></article>';
      }).join('') + '</div>';
    }
  };

  /* stats */
  function bars(pairs, colorFn) {
    var max = Math.max.apply(null, pairs.map(function (p) { return p[1]; }).concat([1]));
    return pairs.map(function (p) { return '<div class="barrow"><span class="bn">' + (p[2] || '') + esc(p[0]) + '</span><span class="bt"><i style="width:' + (p[1] / max * 100) + '%;' + (colorFn ? '--c:' + colorFn(p) : '') + '"></i></span><span class="bv">' + p[1] + '</span></div>'; }).join('');
  }
  function tally(key) { var m = {}; S.bottles.forEach(function (b) { var k = key(b); m[k] = (m[k] || 0) + 1; }); return m; }
  PAGES.stats = {
    title: 'Value & Stats',
    render: function () {
      var bs = S.bottles; if (!bs.length) return '<div class="empty"><b>An empty cellar</b>Add bottles to see what your collection is worth and what it is made of.</div>';
      var spend = 0, val = 0; bs.forEach(function (b) { spend += +b.price || 0; val += +b.value || +b.price || 0; });
      var diff = val - spend, ty = tally(function (b) { return b.type; }), rg = tally(function (b) { return b.region || 'Unknown'; }), vy = tally(function (b) { return b.vintage || 'NV'; });
      var st = tally(status);
      var h = '<div class="pad dk"><div class="trio"><div><b>' + bs.length + '</b><small>Bottles</small></div><div><b>' + money(spend) + '</b><small>Total spend</small></div><div><b>' + money(val) + '</b><small>Est. value</small></div></div>' +
        '<p class="gain">' + (diff === 0 ? 'Your estimates match what you paid.' : 'By your estimates the cellar is ' + (diff > 0 ? 'up ' : 'down ') + money(Math.abs(diff)) + (spend ? ' (' + (diff > 0 ? '+' : '−') + Math.abs(Math.round(diff / spend * 100)) + '%)' : '') + '.') + ' Average bottle ' + money(val / bs.length) + '.</p>';
      h += '<div class="h">By type</div>' + bars(Object.keys(TYPES).filter(function (t) { return ty[t]; }).map(function (t) { return [TYPES[t].label, ty[t], dot(t), TYPES[t].color]; }), function (p) { return p[3]; });
      h += '<div class="h">By region</div>' + bars(Object.keys(rg).map(function (k) { return [k, rg[k]]; }).sort(function (a, b) { return b[1] - a[1]; }).slice(0, 10));
      var vk = Object.keys(vy).sort(), vmax = Math.max.apply(null, vk.map(function (k) { return vy[k]; }));
      h += '<div class="h">By vintage</div><div class="vhist">' + vk.map(function (k) { return '<div><i data-n="' + vy[k] + '" style="height:' + (vy[k] / vmax * 80) + '%"></i><small>' + (k === 'NV' ? 'NV' : '’' + k.slice(2)) + '</small></div>'; }).join('') + '</div>';
      h += '<div class="h">Readiness</div>' + bars([['Open now', st.open || 0, '', '#f0b95a'], ['Hold', st.hold || 0, '', '#8a6338'], ['Past peak', st.past || 0, '', '#7c6a5a']], function (p) { return p[3]; });
      h += '<div class="h">Your value estimates</div><p class="lede">Enter what you believe each bottle is worth today. Blank uses the price you paid.</p>' +
        bs.slice().sort(function (a, b) { return (+b.value || +b.price || 0) - (+a.value || +a.price || 0); }).map(function (b) { return '<div class="valrow"><span class="vn"><b>' + esc(b.name) + ' ' + vint(b) + '</b><small>paid ' + (b.price ? money(b.price) : 'unknown') + ' · ' + esc(where(b)) + '</small></span><label>$<input type="number" inputmode="decimal" min="0" step="any" data-val="' + b.id + '" value="' + (b.value || '') + '" placeholder="' + (b.price || 0) + '" aria-label="Value estimate for ' + esc(b.name) + '"></label></div>'; }).join('');
      var jd = S.journal.filter(function (e) { return e.drunk; });
      if (jd.length) h += '<p class="gain" style="margin-top:22px">' + plural(jd.length, 'bottle') + ' already enjoyed, worth ' + money(jd.reduce(function (a, e) { return a + (+e.price || 0); }, 0)) + ' at purchase.</p>';
      return h + '</div>';
    }
  };

  /* racks */
  PAGES.racks = {
    title: 'Racks & Fridges',
    render: function () {
      return '<div class="pad dk"><p class="lede">Shape each rack to match the real thing: rows down, columns across. Your home screen mirrors it.</p>' + S.racks.map(function (k) {
        var n = S.bottles.filter(function (b) { return b.rackId === k.id; }).length;
        function step(f, label) { return '<div><span class="sc" style="color:var(--mute);font-size:13.5px">' + label + '</span><div class="stepper"><button data-act="rStep" data-id="' + k.id + '" data-f="' + f + '" data-d="-1" aria-label="Fewer ' + label + '">−</button><b>' + k[f] + '</b><button data-act="rStep" data-id="' + k.id + '" data-f="' + f + '" data-d="1" aria-label="More ' + label + '">+</button></div></div>'; }
        return '<div class="rk"><div class="f2"><label class="f" style="margin-top:0"><span>Name</span><input data-rname="' + k.id + '" value="' + esc(k.name) + '" maxlength="28"></label><label class="f" style="margin-top:0"><span>Kind</span><select data-rkind="' + k.id + '">' + ['Rack', 'Wine fridge', 'Cellar wall', 'Cabinet', 'Case'].map(function (o) { return '<option' + (o === k.kind ? ' selected' : '') + '>' + o + '</option>'; }).join('') + '</select></label></div>' +
          '<div class="f2" style="margin-top:12px">' + step('rows', 'rows') + step('cols', 'columns') + '</div>' +
          '<div class="rk-foot"><span>' + plural(n, 'bottle') + ' in ' + (k.rows * k.cols) + ' slots</span><span><button class="linkbtn" data-act="rShow" data-id="' + k.id + '">View</button>' + (S.racks.length > 1 ? '<button class="linkbtn" style="color:#ff9d8a" data-act="rDel" data-id="' + k.id + '">Delete</button>' : '') + '</span></div></div>';
      }).join('') + '<button class="btn wide" data-act="rAdd">Add a rack or fridge</button></div>';
    }
  };

  /* settings */
  PAGES.settings = {
    title: 'Settings & Privacy',
    render: function () {
      var seeds = S.bottles.filter(function (b) { return b.seed; }).length + S.journal.filter(function (e) { return e.seed; }).length;
      function row(act, t, sub, cls) { return '<button class="setrow ' + (cls || '') + '" data-act="' + act + '"><span class="ct"><b>' + t + '</b><small>' + sub + '</small></span><span class="chev">›</span></button>'; }
      return '<div class="pad dk"><div class="h">Privacy</div><div class="note"><p>Cellar &amp; Table has no accounts, no analytics, no ads and no trackers. It never connects to the internet.</p><p>Every bottle, photo and tasting note is stored only on this device. If you delete the app, the data goes with it, so export a backup first.</p></div>' +
        '<div class="h">Preferences</div>' +
        '<div class="setrow"><span class="ct"><b>Scoring scale</b><small>Used when you start a tasting note</small></span><div class="seg2"><button class="' + (S.scoreMode !== '5' ? 'on' : '') + '" data-act="sMode" data-m="100">100</button><button class="' + (S.scoreMode === '5' ? 'on' : '') + '" data-act="sMode" data-m="5">★ 5</button></div></div>' +
        row('rules', 'Drinking-window rules', 'Years each wine type opens and closes') +
        row('tool-racks', 'Racks &amp; fridges', plural(S.racks.length, 'storage unit')) +
        '<div class="h">Your data</div>' +
        row('export', 'Export a backup', 'Download everything as a JSON file') +
        row('import', 'Restore from backup', 'Replace this cellar with an exported file') +
        (seeds ? row('clearSeed', 'Clear the starter cellar', 'Remove the ' + seeds + ' sample items we poured for you') : '') +
        row('wipe', 'Delete all data', 'Erase every rack, bottle, photo and note', 'danger') +
        '<p class="about">Cellar &amp; Table · version 1.2<br>Made for adults of legal drinking age. Please enjoy wine responsibly.</p></div>';
    }
  };
  function exportData() {
    var name = 'cellar-and-table-' + today() + '.json', text = JSON.stringify({ app: 'Cellar & Table', exported: new Date().toISOString(), data: S }, null, 2);
    try {
      var file = new File([text], name, { type: 'application/json' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) { navigator.share({ files: [file], title: 'Cellar & Table backup' }).catch(function () {}); return; }
    } catch (e) {}
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' })); a.download = name; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500); toast('Backup saved as ' + name);
  }
  function importData(file) {
    var r = new FileReader();
    r.onload = function () {
      try {
        var j = JSON.parse(r.result), d = j.data || j;
        if (!d || !Array.isArray(d.racks) || !d.racks.length || !Array.isArray(d.bottles)) throw 0;
        confirmBox('Restore this backup?', 'It holds ' + plural(d.bottles.length, 'bottle') + ' and replaces everything currently in the app.', 'Restore', function () {
          d.journal = d.journal || []; d.rules = d.rules || {}; d.ageOk = true; S = d; ui.rack = S.racks[0].id; ui.q = ''; ui.lit = null; $('#q').value = ''; save(); renderHome(); refreshPage(); toast('Cellar restored');
        });
      } catch (e) { toast('That file is not a Cellar & Table backup'); }
    };
    r.readAsText(file);
  }

  /* ---------- age gate ---------- */
  var GLOGO = '<svg viewBox="0 0 32 32"><rect x="2" y="2" width="28" height="28" rx="6" fill="#4d3319" stroke="#f0b95a" stroke-width="1"/><g fill="#130b06"><circle cx="10" cy="10" r="4.500"/><circle cx="22" cy="10" r="4.500"/><circle cx="10" cy="22" r="4.500"/><circle cx="22" cy="22" r="4.500"/></g><circle cx="10" cy="10" r="3" fill="#ffd98f"/><circle cx="22" cy="22" r="3" fill="#e6d27a"/><circle cx="22" cy="10" r="3" fill="#a3243b"/></svg>';
  function gate(under) {
    var g = $('#gate');
    if (S.ageOk) { g.classList.remove('show'); g.innerHTML = ''; return; }
    g.innerHTML = under
      ? '<div class="gate-in">' + GLOGO + '<h2>Not just yet</h2><span class="sc">Adults only</span><p>Cellar &amp; Table is a wine cellar companion made only for adults of legal drinking age. Thank you for being honest.</p><button class="btn ghost" style="color:var(--cream)" data-act="gateBack">Go back</button></div>'
      : '<div class="gate-in">' + GLOGO + '<h2>Cellar <em>&amp;</em> Table</h2><span class="sc">Your rack, your table</span><p>This app is about wine. Are you 21 or older, and of legal drinking age where you live?</p><button class="btn" data-act="gateYes">Yes, I am 21 or older</button><button class="btn ghost" style="color:var(--cream)" data-act="gateNo">No, I am under 21</button><small>Asked once. Nothing is sent anywhere.</small></div>';
    g.classList.add('show');
  }

  /* ---------- actions ---------- */
  var A = {
    gateYes: function () { S.ageOk = true; save(); gate(); },
    gateNo: function () { gate(true); },
    gateBack: function () { gate(); },
    dlgCancel: function () { $('#dialog').classList.remove('show'); dlgCb = null; },
    dlgOk: function () { $('#dialog').classList.remove('show'); var cb = dlgCb; dlgCb = null; if (cb) cb(); },
    tab: function (el) { ui.rack = el.dataset.id; renderHome(); },
    clearSearch: function () { ui.q = ''; $('#q').value = ''; renderHome(); },
    clearLit: function () { ui.lit = null; renderHome(); },
    drawerClose: function () { setDrawer(false); },
    sheetClose: closeSheet,
    pageClose: closePage,
    tool: function (el) { openPage(el.dataset.tool); },
    'tool-racks': function () { openPage('racks'); },
    addBottle: function () {
      var f = firstFree(ui.rack), rid = ui.rack;
      if (!f) for (var i = 0; i < S.racks.length && !f; i++) { f = firstFree(S.racks[i].id); rid = S.racks[i].id; }
      if (!f) { toast('Every slot is full. Add a rack first.'); return; }
      if (rid !== ui.rack) { ui.rack = rid; renderHome(); }
      openForm(null, { rackId: rid, r: f.r, c: f.c });
    },
    slot: function (el) {
      if (suppress) return;
      var r = +el.dataset.r, c = +el.dataset.c;
      if (ui.moving) { var b = bottle(ui.moving); ui.moving = null; if (b) placeBottle(b, ui.rack, r, c); renderHome(); return; }
      if (el.dataset.id) openBottle(el.dataset.id); else openForm(null, { rackId: ui.rack, r: r, c: c });
    },
    bottle: function (el) { openBottle(el.dataset.id); },
    find: function (el) { find(el.dataset.id); },
    moveStart: function (el) { ui.moving = el.dataset.id; closeSheet(); closePage(); renderHome(); },
    moveCancel: function () { ui.moving = null; renderHome(); },
    edit: function (el) { openForm(bottle(el.dataset.id)); },
    ftype: function (el) { ui.form.type = el.dataset.t; $('#ftypes').innerHTML = typeBtns(ui.form.type); },
    fphotoDel: function () { ui.form.label = ''; $('#fphoto').innerHTML = formPhoto(); },
    photoDel: function (el) { var b = bottle(el.dataset.id); b.label = ''; save(); openBottle(b.id); },
    remove: function (el) {
      var b = bottle(el.dataset.id);
      confirmBox('Remove this bottle?', b.name + ' will leave the rack without a tasting note.', 'Remove', function () { S.bottles = S.bottles.filter(function (x) { return x.id !== b.id; }); save(); closeSheet(); renderHome(); refreshPage(); toast('Bottle removed'); });
    },
    taste: function (el) { var id = el.dataset.id; closeSheet(); openPage('taste', id); },
    rules: openRules,
    rulesReset: function () { S.rules = {}; save(); closeSheet(); renderHome(); refreshPage(); toast('Rules reset to the defaults'); },
    tlJump: function (el) { var tl = $('#tl'), g = $('#tlg-' + el.dataset.g); if (tl && g) tl.scrollTo({ top: g.parentNode.offsetTop - 34, behavior: REDUCED ? 'auto' : 'smooth' }); },
    spin: function () { var n = DISHES.length, steps = n * 2 + 1 + Math.floor(Math.random() * (n - 1)); var o = $('#pairOut .dish h3'); if (o) o.textContent = '…'; setWheel(Math.round(pair.rot / SEG) * SEG - steps * SEG, 2600); },
    pick: function (el) { wheelTo(+el.dataset.i); $('#pgBody').scrollTo({ top: 0, behavior: REDUCED ? 'auto' : 'smooth' }); },
    pairLight: function () { var ids = {}; (pair.owned || []).forEach(function (id) { ids[id] = 1; }); ui.lit = { ids: ids, label: DISHES[pair.idx].n }; ui.q = ''; $('#q').value = ''; var first = bottle(pair.owned[0]); if (first) ui.rack = first.rackId; closePage(); renderHome(); },
    awCat: function (el) { ui.taste.cat = +el.dataset.i; refreshAroma(); },
    awDesc: function (el) { var t = ui.taste, n = el.dataset.n, i = t.aromas.indexOf(n); if (i >= 0) t.aromas.splice(i, 1); else t.aromas.push(n); if (el.dataset.i != null) t.cat = +el.dataset.i; refreshAroma(); },
    tMode: function (el) { ui.taste.mode = el.dataset.m; $('#scoreWrap').innerHTML = scoreHtml(); },
    tStar: function (el) { ui.taste.stars = +el.dataset.n; $('#scoreWrap').innerHTML = scoreHtml(); },
    tSave: function (el) { saveTaste(el.dataset.drunk === '1'); },
    jDel: function (el) { confirmBox('Delete this note?', 'The tasting note will be erased from your journal.', 'Delete', function () { S.journal = S.journal.filter(function (e) { return e.id !== el.dataset.id; }); save(); renderHome(); refreshPage(); }); },
    jRestock: function (el) {
      var e = S.journal.filter(function (x) { return x.id === el.dataset.id; })[0]; if (!e) return;
      var rid = ui.rack, f = firstFree(rid); for (var i = 0; i < S.racks.length && !f; i++) { rid = S.racks[i].id; f = firstFree(rid); }
      if (!f) { toast('Every slot is full. Add a rack first.'); return; }
      var b = e.bottle ? JSON.parse(JSON.stringify(e.bottle)) : { name: e.name, producer: e.producer, vintage: e.vintage, type: e.type, region: e.region, grape: e.grape, price: e.price, value: null, style: '', from: null, to: null, notes: '', label: e.label || '' };
      b.id = uid(); b.seed = false; b.addedAt = Date.now(); b.rackId = rid; b.r = f.r; b.c = f.c; S.bottles.push(b); save(); find(b.id);
    },
    rStep: function (el) {
      var k = rackById(el.dataset.id), f = el.dataset.f, n = k[f] + (+el.dataset.d);
      if (n < 1 || n > 10) { toast(n < 1 ? 'A rack needs at least one ' + (f === 'rows' ? 'row' : 'column') : 'Ten is the most a rack can hold here'); return; }
      var blocked = S.bottles.some(function (b) { return b.rackId === k.id && (f === 'rows' ? b.r >= n : b.c >= n); });
      if (blocked) { toast('Move the bottles out of that ' + (f === 'rows' ? 'row' : 'column') + ' first'); return; }
      k[f] = n; save(); renderHome(); refreshPage();
    },
    rAdd: function () { var k = { id: uid(), name: S.racks.some(function (r) { return r.kind === 'Wine fridge'; }) ? 'New Rack' : 'Wine Fridge', kind: 'Wine fridge', rows: 3, cols: 4 }; if (k.name === 'New Rack') k.kind = 'Rack'; S.racks.push(k); save(); renderHome(); refreshPage(); toast(k.name + ' added'); var b = $('#pgBody'); b.scrollTop = b.scrollHeight; },
    rShow: function (el) { ui.rack = el.dataset.id; closePage(); renderHome(); },
    rDel: function (el) {
      var k = rackById(el.dataset.id), n = S.bottles.filter(function (b) { return b.rackId === k.id; }).length;
      confirmBox('Delete ' + k.name + '?', n ? 'Its ' + plural(n, 'bottle') + ' will be removed too.' : 'It is empty, so nothing else is lost.', 'Delete', function () { S.racks = S.racks.filter(function (r) { return r.id !== k.id; }); S.bottles = S.bottles.filter(function (b) { return b.rackId !== k.id; }); if (ui.rack === k.id) ui.rack = S.racks[0].id; save(); renderHome(); refreshPage(); });
    },
    sMode: function (el) { S.scoreMode = el.dataset.m; save(); refreshPage(); },
    export: exportData,
    import: function () { var i = $('#importFile'); i.value = ''; i.click(); },
    clearSeed: function () { confirmBox('Clear the starter cellar?', 'The sample bottles and sample journal note are removed. Anything you added stays.', 'Clear', function () { S.bottles = S.bottles.filter(function (b) { return !b.seed; }); S.journal = S.journal.filter(function (e) { return !e.seed; }); save(); renderHome(); refreshPage(); toast('Starter cellar cleared'); }); },
    wipe: function () {
      confirmBox('Delete everything?', 'All racks, bottles, label photos and tasting notes are erased from this device. This cannot be undone.', 'Delete all', function () {
        try { localStorage.removeItem(KEY); } catch (e) {}
        S = D.seed(); S.bottles = []; S.journal = []; ui = { rack: S.racks[0].id, q: '', lit: null, moving: null, page: null, form: null, taste: null }; $('#q').value = '';
        closePage(); closeSheet(); renderHome(); gate();
      });
    }
  };

  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-act]'); if (!el) return;
    var fn = A[el.dataset.act]; if (fn) fn(el, e);
  });
  document.addEventListener('submit', function (e) {
    e.preventDefault();
    if (e.target.id === 'bform') saveForm(e.target);
    else if (e.target.id === 'rform') {
      var f = e.target, bad = false, rules = {};
      Object.keys(TYPES).forEach(function (t) { var a = parseInt(f.elements['a-' + t].value, 10), b = parseInt(f.elements['b-' + t].value, 10); if (!(a >= 0) || !(b >= a)) bad = true; else if (a !== D.RULES[t][0] || b !== D.RULES[t][1]) rules[t] = [a, b]; });
      if (bad) { toast('Each “closes” year must be the same as or after “opens”'); return; }
      S.rules = rules; save(); closeSheet(); renderHome(); refreshPage(); toast('Window rules saved');
    }
  });
  document.addEventListener('change', function (e) {
    var t = e.target;
    if (t.dataset.photo) {
      var file = t.files && t.files[0], kind = t.dataset.photo, id = t.dataset.id;
      readPhoto(file, function (url) {
        if (kind === 'form' && ui.form) { ui.form.label = url; $('#fphoto').innerHTML = formPhoto(); }
        else if (kind === 'bottle') { var b = bottle(id); if (b) { b.label = url; save(); openBottle(id); toast('Label saved to this bottle'); } }
      });
    } else if (t.id === 'importFile') { if (t.files[0]) importData(t.files[0]); }
    else if (t.dataset.val) { var b = bottle(t.dataset.val), x = parseFloat(t.value); b.value = isFinite(x) && x > 0 ? x : null; save(); renderDrawer(); refreshPage(); }
    else if (t.dataset.rname) { var k = rackById(t.dataset.rname); k.name = t.value.trim() || k.name; save(); renderHome(); }
    else if (t.dataset.rkind) { rackById(t.dataset.rkind).kind = t.value; save(); renderHome(); }
  });
  document.addEventListener('input', function (e) {
    var t = e.target;
    if (t.id === 'q') { ui.q = t.value.trim(); ui.lit = null; renderTabs(); renderRack(); renderResults(); }
    else if (t.id === 'scoreRange') { ui.taste.score = +t.value; $('#scoreNum').textContent = t.value; $('#scoreWord').textContent = SCOREW(+t.value); }
  });
  $('#q').addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); this.blur(); var m = matchSet(), ids = m ? Object.keys(m) : []; if (ids.length === 1) find(ids[0]); } });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { if ($('#dialog').classList.contains('show')) A.dlgCancel(); else if ($('#sheet').classList.contains('show')) closeSheet(); else if (ui.page) closePage(); else setDrawer(false); } });
  var rz; window.addEventListener('resize', function () { clearTimeout(rz); rz = setTimeout(renderRack, 120); });

  initDrag(); initDrawer(); renderHome(); gate();
})();
