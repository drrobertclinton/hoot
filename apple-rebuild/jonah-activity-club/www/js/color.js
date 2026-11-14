/* Treehouse Coloring: tap-to-fill regions + free crayon. The Pickles page drives the map Pickles. */
(function () {
'use strict';
var COLORS = ['#e8574b', '#f7a23b', '#f7c85a', '#7fbf7a', '#5bb5a6', '#6b9fd6', '#b08fd6', '#f08ab0',
  '#9a6a3e', '#e8b36b', '#3a4654', '#ffffff', '#cdeef0', '#2f7f86', '#f6cfa6', '#8a5a3c', '#bfe07a', '#ff9db0'];
var body, api;

function picker() {
  api.back(null); api.mid('');
  var h = '<div class="pick-grid">';
  A.PAGES.forEach(function (p) {
    h += '<button class="pagepick" data-id="' + p.id + '" aria-label="Color: ' + p.name + '">' + A.pageSVG(p.id, J.S.color[p.id], J.S.strokes[p.id], 'thumb') +
      (p.id === 'pickles' ? '<span class="pp-tag">' + A.itemSVG('paw') + '</span>' : '') + '</button>';
  });
  body.innerHTML = h + '</div>';
  body.firstChild.onclick = function (e) { var b = e.target.closest('.pagepick'); if (b) { J.sfx('pop'); editor(b.getAttribute('data-id')); } };
  J.say('Pick a picture to color!');
}

function editor(id) {
  var S = J.S, pg = A.PAGES.filter(function (p) { return p.id === id; })[0];
  if (!S.color[id]) S.color[id] = {}; if (!S.strokes[id]) S.strokes[id] = [];
  var n = J.band(8, 12, 18), pal = COLORS.slice(0, n), col = pal[0], mode = 'fill', size = J.band(22, 14, 12), undo = [];
  var sizes = J.band([22], [9, 16, 26], [5, 12, 24]);
  api.back(function () { J.clean(); picker(); });
  var h = '<div class="col-wrap"><div class="fit"><div class="paper">' + A.pageSVG(id, S.color[id], S.strokes[id]) +
    '</div></div><div class="tools">';
  api.mid(id === 'pickles' ? '<div class="pk-preview" aria-hidden="true"></div>' : '');
  h += '<div class="goal" role="status" aria-live="polite" aria-label="Sticker progress"><span class="g-dots"><i></i><i></i></span><span class="g-bar"><b></b><u></u></span><span class="g-stk">' + J.IC.star + '</span></div>';
  h += '<div class="tool-row"><button class="rb tl on" data-m="fill" aria-label="Fill with color">' + J.IC.bucket + '</button><button class="rb tl" data-m="brush" aria-label="Crayon">' + J.IC.crayon + '</button>';
  if (J.S.band === 2) h += '<button class="rb tl" data-m="erase" aria-label="Eraser">' + J.IC.eraser + '</button>';
  if (sizes.length > 1) sizes.forEach(function (z, i) { h += '<button class="rb sz' + (z === size ? ' on' : '') + '" data-z="' + z + '" aria-label="Crayon size ' + (i + 1) + '"><i style="width:' + (6 + i * 7) + 'px;height:' + (6 + i * 7) + 'px"></i></button>'; });
  h += '<span class="acts"><button class="rb" data-a="undo" aria-label="Undo">' + J.IC.undo + '</button><button class="rb" data-a="clear" aria-label="Start over">' + J.IC.trash + '</button><button class="rb go" data-a="done" aria-label="Finished">' + J.IC.check + '</button></span></div>';
  h += '<div class="pal" role="listbox" aria-label="Colors">';
  pal.forEach(function (c, i) { h += '<button class="cray' + (i === 0 ? ' on' : '') + '" data-c="' + c + '" style="--c:' + c + '" aria-label="Color ' + (i + 1) + '"><span></span></button>'; });
  h += '</div></div></div>';
  body.innerHTML = h;
  var wrap = body.firstChild, paper = J.$('.paper', wrap), svg = J.$('svg.page', wrap), layer = J.$('.strokes', svg), prev = J.$('.pk-preview');
  J.fit(J.$('.fit', wrap), paper, 1);
  J.say(id === 'pickles' ? 'Color Pickles! He will wear your colors on the map.' : 'Tap a color, then tap the picture!');

  function touched() { S.edits[id] = (S.edits[id] || 0) + 1; J.save(); showGoal(); if (prev) prev.innerHTML = A.picklesSVG(S.color.pickles, S.strokes.pickles, 'pk walking'); }
  if (prev) prev.innerHTML = A.picklesSVG(S.color.pickles, S.strokes.pickles, 'pk walking');
  function setFill(r, c) {
    J.$$('[data-r="' + r + '"]', svg).forEach(function (el) { el.setAttribute('fill', c || '#ffffff'); });
    if (c) S.color[id][r] = c; else delete S.color[id][r];
  }
  function redrawStrokes() { layer.innerHTML = S.strokes[id].map(A.strokeHTML).join(''); }

  /* Sticker rule (Knox): 2 or more colors AND three quarters of the picture colored. */
  var GN = 40, GSTEP = 400 / GN, cellKey = null, cellCount = 0, goalEl = J.$('.goal', wrap), lastMet = false;
  function isInk(c) { return c && String(c).toLowerCase() !== '#ffffff' && String(c).toLowerCase() !== '#fff'; }
  function mapCells() {
    var m = svg.getScreenCTM(); if (!m || !document.elementsFromPoint) return;
    layer.style.pointerEvents = 'none'; cellKey = new Array(GN * GN); cellCount = 0;
    for (var gy = 0; gy < GN; gy++) for (var gx = 0; gx < GN; gx++) {
      var x = (gx + 0.5) * GSTEP, y = (gy + 0.5) * GSTEP, els = document.elementsFromPoint(m.a * x + m.c * y + m.e, m.b * x + m.d * y + m.f), k = null;
      for (var i = 0; i < els.length; i++) { if (els[i] === svg) break; if (els[i].classList && els[i].classList.contains('rg')) { k = els[i].getAttribute('data-r'); break; } }
      cellKey[gy * GN + gx] = k; if (k) cellCount++;
    }
    if (cellCount < 40) { cellKey = null; }
  }
  function progress() {
    var cols = {}, hit = new Uint8Array(GN * GN), fills = S.color[id], n = 0, i;
    Object.keys(fills).forEach(function (r) { if (isInk(fills[r])) cols[fills[r].toLowerCase()] = 1; });
    S.strokes[id].forEach(function (st) {
      if (!isInk(st.c)) return; cols[st.c.toLowerCase()] = 1;
      var rad = st.w / 2 + 3, q = st.p;
      for (var k = 0; k < q.length; k += 2) {
        var x0 = Math.max(0, Math.floor((q[k] - rad) / GSTEP)), x1 = Math.min(GN - 1, Math.floor((q[k] + rad) / GSTEP)), y0 = Math.max(0, Math.floor((q[k + 1] - rad) / GSTEP)), y1 = Math.min(GN - 1, Math.floor((q[k + 1] + rad) / GSTEP));
        for (var gy = y0; gy <= y1; gy++) for (var gx = x0; gx <= x1; gx++) hit[gy * GN + gx] = 1;
      }
    });
    if (!cellKey) mapCells();
    var frac;
    if (cellKey) { for (i = 0; i < cellKey.length; i++) if (cellKey[i] && (isInk(fills[cellKey[i]]) || hit[i])) n++; frac = n / cellCount; }
    else { var tot = J.$$('.rg', svg).length || 1; frac = Object.keys(fills).filter(function (r) { return isInk(fills[r]); }).length / tot; }
    return { list: Object.keys(cols), colors: Object.keys(cols).length, frac: frac, met: Object.keys(cols).length >= 2 && frac >= 0.75 };
  }
  function showGoal(quiet) {
    var g = progress(), dots = J.$$('.g-dots i', goalEl);
    dots.forEach(function (d, i) { d.classList.toggle('on', g.colors > i); d.style.background = g.list[i] || ''; });
    J.$('.g-bar b', goalEl).style.width = Math.min(100, Math.round(g.frac * 100)) + '%';
    goalEl.classList.toggle('met', g.met);
    goalEl.setAttribute('aria-label', 'Sticker progress: ' + Math.min(g.colors, 2) + ' of 2 colors, ' + Math.round(g.frac * 100) + ' percent colored, goal 75 percent');
    if (g.met && !lastMet && !quiet) { J.sfx('win'); J.say('Sticker ready! Tap the check mark.', true); }
    lastMet = g.met; return g;
  }
  setTimeout(function () { showGoal(true); }, 60);
  goalEl.onclick = function () { var g = progress(); J.say(g.colors < 2 ? 'Use two colors or more to earn a sticker.' : g.met ? 'Sticker ready! Tap the check mark.' : 'Keep coloring! Fill most of the picture to earn a sticker.', true); };

  var cur = null, curEl = null;
  function pt(e) { var p = J.svgPt(svg, e); return [Math.round(Math.max(-5, Math.min(405, p.x))), Math.round(Math.max(-5, Math.min(405, p.y)))]; }
  function eraseAt(p) {
    var arr = S.strokes[id], hit = -1;
    for (var i = arr.length - 1; i >= 0 && hit < 0; i--) for (var k = 0; k < arr[i].p.length; k += 2) if (Math.hypot(arr[i].p[k] - p[0], arr[i].p[k + 1] - p[1]) < 12 + arr[i].w / 2) { hit = i; break; }
    if (hit >= 0) { var st = arr.splice(hit, 1)[0]; undo.push({ t: 'e', st: st, i: hit }); redrawStrokes(); J.sfx('tap'); touched(); }
  }
  svg.addEventListener('pointerdown', function (e) {
    e.preventDefault(); J.unlockAudio();
    if (mode === 'fill') {
      var r = e.target.closest ? e.target.closest('.rg') : null; if (!r) return;
      var key = r.getAttribute('data-r'); undo.push({ t: 'f', r: key, prev: S.color[id][key] || null });
      setFill(key, col); r.classList.remove('pop'); void r.getBoundingClientRect(); r.classList.add('pop'); J.sfx('pop'); touched(); return;
    }
    try { svg.setPointerCapture(e.pointerId); } catch (x) {}
    var p = pt(e);
    if (mode === 'erase') { cur = { erase: true }; eraseAt(p); return; }
    cur = { c: col, w: size, p: [p[0], p[1]] };
    layer.insertAdjacentHTML('beforeend', A.strokeHTML(cur)); curEl = layer.lastChild;
  });
  svg.addEventListener('pointermove', function (e) {
    if (!cur) return; var p = pt(e);
    if (cur.erase) { eraseAt(p); return; }
    var q = cur.p, L = q.length; if (Math.hypot(p[0] - q[L - 2], p[1] - q[L - 1]) < 3 || L > 1200) return;
    q.push(p[0], p[1]);
    curEl.setAttribute('d', curEl.getAttribute('d').replace('l.1 0', '') + 'L' + p[0] + ' ' + p[1]);
  });
  function end() {
    if (!cur) return;
    if (!cur.erase) { if (S.strokes[id].length >= 260) S.strokes[id].shift(); S.strokes[id].push(cur); undo.push({ t: 's' }); touched(); }
    cur = null; curEl = null;
  }
  svg.addEventListener('pointerup', end); svg.addEventListener('pointercancel', end);

  J.$('.pal', wrap).onclick = function (e) {
    var b = e.target.closest('.cray'); if (!b) return; col = b.getAttribute('data-c'); J.sfx('tap');
    J.$$('.cray', wrap).forEach(function (x) { x.classList.toggle('on', x === b); });
    if (mode === 'erase') setMode('brush');
  };
  function setMode(m) { mode = m; J.$$('.tl', wrap).forEach(function (x) { x.classList.toggle('on', x.getAttribute('data-m') === m); }); paper.setAttribute('data-mode', m); }
  setMode('fill');
  J.$('.tool-row', wrap).onclick = function (e) {
    var b = e.target.closest('button'); if (!b) return; J.sfx('tap');
    if (b.hasAttribute('data-m')) { setMode(b.getAttribute('data-m')); J.say(mode === 'fill' ? 'Fill!' : mode === 'brush' ? 'Crayon!' : 'Eraser!', true); return; }
    if (b.hasAttribute('data-z')) { size = +b.getAttribute('data-z'); J.$$('.sz', wrap).forEach(function (x) { x.classList.toggle('on', x === b); }); if (mode === 'fill') setMode('brush'); return; }
    var a = b.getAttribute('data-a');
    if (a === 'undo') {
      var u = undo.pop(); if (!u) return;
      if (u.t === 'f') setFill(u.r, u.prev); else if (u.t === 's') { S.strokes[id].pop(); redrawStrokes(); } else if (u.t === 'e') { S.strokes[id].splice(u.i, 0, u.st); redrawStrokes(); }
      touched();
    } else if (a === 'clear') {
      if (!b.classList.contains('sure')) { b.classList.add('sure'); J.say('Tap again to start over.', true); setTimeout(function () { b.classList.remove('sure'); }, 2500); return; }
      b.classList.remove('sure'); S.color[id] = {}; S.strokes[id] = []; undo = []; if (S.colorWon) delete S.colorWon[id];
      J.$$('.rg', svg).forEach(function (el) { el.setAttribute('fill', '#ffffff'); }); redrawStrokes(); touched();
    } else if (a === 'done') {
      var g = showGoal(true);
      if (!g.met) {
        J.sfx('no'); goalEl.classList.remove('nudge'); void goalEl.getBoundingClientRect(); goalEl.classList.add('nudge');
        J.say(g.colors < 2 ? 'Use two colors or more to earn a sticker!' : 'Almost! Color more of the picture to earn a sticker.', true); return;
      }
      if (!S.colorWon) S.colorWon = {};
      var rw = S.colorWon[id] ? { stars: 3, sticker: null } : J.award(3, 'color'); S.colorWon[id] = 1; S.colorDone[id] = S.edits[id] || 0; J.save();
      J.celebrate({ stars: 3, sticker: rw.sticker, pic: id === 'pickles' ? '<div class="stk-burst wide">' + A.picklesSVG(S.color.pickles, S.strokes.pickles, 'pk walking') + '</div>' : '<div class="stk-burst">' + A.pageSVG(id, S.color[id], S.strokes[id], 'thumb') + '</div>',
        text: id === 'pickles' ? 'Beautiful! Now Pickles wears your colors on the map!' : 'Beautiful coloring!', again: function () { J.clean(); picker(); } });
    }
  };
}

J.act.color = { mount: function (b, a) { body = b; api = a; picker(); } };
})();
