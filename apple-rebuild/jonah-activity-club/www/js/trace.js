/* Lighthouse Tracing: A-Z and 0-9 along dotted paths, with stroke checking and stars. */
(function () {
'use strict';
var O = 'M50 10Q12 10 12 70Q12 130 50 130Q88 130 88 70Q88 10 50 10';
var G = {
  A: ['M50 10L12 130', 'M50 10L88 130', 'M26 88L74 88'], B: ['M20 10L20 130', 'M20 10L55 10Q88 10 88 40Q88 70 55 70L20 70', 'M20 70L60 70Q92 70 92 100Q92 130 60 130L20 130'],
  C: ['M86 36Q72 10 50 10Q14 10 14 70Q14 130 50 130Q72 130 86 104'], D: ['M20 10L20 130', 'M20 10L45 10Q90 10 90 70Q90 130 45 130L20 130'],
  E: ['M20 10L20 130', 'M20 10L82 10', 'M20 70L70 70', 'M20 130L82 130'], F: ['M20 10L20 130', 'M20 10L82 10', 'M20 70L68 70'],
  G: ['M86 36Q72 10 50 10Q14 10 14 70Q14 130 50 130Q86 130 86 80L56 80'], H: ['M18 10L18 130', 'M82 10L82 130', 'M18 70L82 70'],
  I: ['M50 10L50 130', 'M28 10L72 10', 'M28 130L72 130'], J: ['M70 10L70 96Q70 130 44 130Q20 130 18 104'], K: ['M20 10L20 130', 'M82 10L20 78', 'M42 56L84 130'],
  L: ['M22 10L22 130L82 130'], M: ['M14 130L14 10L50 90L86 10L86 130'], N: ['M18 130L18 10L82 130L82 10'], O: [O],
  P: ['M20 10L20 130', 'M20 10L55 10Q90 10 90 42Q90 76 55 76L20 76'], Q: [O, 'M60 100L90 134'],
  R: ['M20 10L20 130', 'M20 10L55 10Q90 10 90 42Q90 76 55 76L20 76', 'M50 76L88 130'],
  S: ['M84 34Q74 10 50 10Q18 10 18 40Q18 64 50 70Q84 76 84 102Q84 130 50 130Q22 130 14 104'], T: ['M12 10L88 10', 'M50 10L50 130'],
  U: ['M16 10L16 90Q16 130 50 130Q84 130 84 90L84 10'], V: ['M12 10L50 130L88 10'], W: ['M8 10L28 130L50 40L72 130L92 10'],
  X: ['M16 10L84 130', 'M84 10L16 130'], Y: ['M14 10L50 70L86 10', 'M50 70L50 130'], Z: ['M16 10L84 10L16 130L84 130'],
  0: ['M50 10Q16 10 16 70Q16 130 50 130Q84 130 84 70Q84 10 50 10'], 1: ['M28 34L54 10L54 130'], 2: ['M18 40Q20 10 50 10Q82 10 82 40Q82 62 18 130L84 130'],
  3: ['M18 28Q30 10 50 10Q82 10 82 38Q82 68 46 68Q84 68 84 100Q84 130 50 130Q26 130 16 108'], 4: ['M66 130L66 10L14 94L90 94'],
  5: ['M78 10L26 10L22 62Q36 52 52 52Q84 52 84 90Q84 130 50 130Q28 130 16 110'], 6: ['M76 16Q30 30 20 90Q18 130 50 130Q82 130 82 96Q82 64 50 64Q26 64 20 92'],
  7: ['M16 10L84 10L40 130'], 8: ['M50 68Q20 60 20 38Q20 10 50 10Q80 10 80 38Q80 60 50 68Q16 78 16 102Q16 130 50 130Q84 130 84 102Q84 78 50 68'],
  9: ['M80 50Q78 78 50 78Q18 78 18 44Q18 10 50 10Q82 10 80 50Q78 100 40 130']
};
var ORDER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split('');
var WORD = { A: 'anchor', B: 'boat', C: 'crab', D: 'dock', E: 'eel', F: 'fish', G: 'gull', H: 'heron', I: 'island', J: 'Jonah', K: 'kite', L: 'lighthouse', M: 'map', N: 'net', O: 'octopus',
  P: 'Pickles', Q: 'quiet', R: 'rope', S: 'shell', T: 'tide', U: 'umbrella', V: 'view', W: 'wave', X: 'x marks the spot', Y: 'yellow', Z: 'zigzag' };
var INKS = ['#e8574b', '#5bb5a6', '#f7a23b', '#b08fd6'];
var body, api;

function stars3(n) { var h = '<span class="mini-stars">'; for (var i = 0; i < 3; i++) h += '<i class="' + (i < n ? 'on' : '') + '"></i>'; return h + '</span>'; }
function picker() {
  api.back(null); api.mid('');
  var h = '<div class="glyph-grid">';
  ORDER.forEach(function (ch, i) { h += (i === 26 ? '<div class="gg-sep"></div>' : '') + '<button class="gl" data-g="' + ch + '" aria-label="Trace ' + ch + '"><b>' + ch + '</b>' + stars3(J.S.trace[ch] || 0) + '</button>'; });
  body.innerHTML = h + '</div>';
  body.firstChild.onclick = function (e) { var b = e.target.closest('.gl'); if (b) { J.sfx('pop'); tracer(b.getAttribute('data-g')); } };
  J.say('Pick a letter or a number to trace!');
}

function tracer(ch) {
  J.clean();
  var tol = J.band(20, 15, 11), strokes = G[ch], si = 0, idx = 0, off = 0, total = 0, engaged = false, done = false;
  api.back(function () { J.clean(); picker(); });
  var h = '<div class="tr-wrap"><div class="fit"><div class="slate"><svg viewBox="-18 -12 136 164" class="tr-svg" aria-label="Trace ' + ch + '">';
  h += '<g class="tr-lines"><path d="M-12 10L112 10M-12 130L112 130"/><path d="M-12 70L112 70" stroke-dasharray="4 6"/></g>';
  strokes.forEach(function (d) { h += '<path class="tr-guide" d="' + d + '"/>'; });
  if (J.S.band < 2) strokes.forEach(function (d) { h += '<path class="tr-dots" d="' + d + '"/>'; });
  strokes.forEach(function (d, i) { h += '<path class="tr-ink" data-i="' + i + '" d="' + d + '" stroke="' + INKS[i % 4] + '"/>'; });
  h += '<g class="tr-start"><circle r="9"/><text y="4" text-anchor="middle"></text></g><path class="tr-arrow" d="M-5 -6L7 0L-5 6Z"/><g class="tr-spark"><circle r="6.5"/></g>';
  h += '</svg></div></div><div class="tr-side"><button class="rb" data-a="prev" aria-label="Previous">' + J.IC.left + '</button><div class="tr-big">' + ch + '</div><button class="rb" data-a="next" aria-label="Next">' + J.IC.right + '</button><button class="rb" data-a="redo" aria-label="Start again">' + J.IC.again + '</button></div></div>';
  body.innerHTML = h;
  var wrap = body.firstChild, svg = J.$('.tr-svg', wrap), inks = J.$$('.tr-ink', svg), startG = J.$('.tr-start', svg), arrow = J.$('.tr-arrow', svg), spark = J.$('.tr-spark', svg);
  J.fit(J.$('.fit', wrap), J.$('.slate', wrap), 136 / 164);
  var samples = inks.map(function (p) {
    var L = p.getTotalLength(), n = Math.max(2, Math.round(L / 3)), a = [];
    for (var i = 0; i <= n; i++) { var q = p.getPointAtLength(L * i / n); a.push([q.x, q.y]); }
    p.style.strokeDasharray = L + ' ' + (L + 10); p.style.strokeDashoffset = L; p._L = L; return a;
  });
  function show() {
    var a = samples[si], p = a[idx], q = a[Math.min(a.length - 1, idx + 4)];
    startG.setAttribute('transform', 'translate(' + p[0] + ' ' + p[1] + ')'); startG.lastChild.textContent = si + 1;
    spark.setAttribute('transform', 'translate(' + p[0] + ' ' + p[1] + ')');
    var ang = Math.atan2(q[1] - p[1], q[0] - p[0]) * 180 / Math.PI;
    arrow.setAttribute('transform', 'translate(' + (p[0] + Math.cos(ang * Math.PI / 180) * 16) + ' ' + (p[1] + Math.sin(ang * Math.PI / 180) * 16) + ') rotate(' + ang + ')');
    inks[si].style.strokeDashoffset = inks[si]._L * (1 - idx / (a.length - 1));
    startG.style.display = idx === 0 ? '' : 'none'; spark.style.display = idx === 0 ? 'none' : '';
  }
  function d2(p, q) { return Math.hypot(p.x - q[0], p.y - q[1]); }
  function advance(p) {
    var a = samples[si], moved = false;
    for (var guard = 0; guard < 40; guard++) {
      var step = 0;
      for (var k = 1; k <= 5 && idx + k < a.length; k++) if (d2(p, a[idx + k]) <= (k === 1 ? tol : tol * 0.75)) step = k;
      if (!step) break; idx += step; moved = true;
    }
    if (moved) { show(); if (idx % 6 === 0) J.sfx('step'); }
    if (idx >= a.length - 1) strokeDone();
  }
  function strokeDone() {
    engaged = false; J.sfx('ding'); inks[si].style.strokeDashoffset = 0; si++; idx = 0;
    if (si >= strokes.length) { finish(); return; }
    show();
  }
  function finish() {
    done = true; startG.style.display = arrow.style.display = spark.style.display = 'none'; wrap.classList.add('lit');
    var ratio = total ? off / total : 0, st = ratio < 0.1 ? 3 : ratio < 0.28 ? 2 : 1;
    if ((J.S.trace[ch] || 0) < st) J.S.trace[ch] = st;
    var rw = J.award(1, 'trace'), nx = ORDER[(ORDER.indexOf(ch) + 1) % ORDER.length];
    setTimeout(function () {
      J.celebrate({ stars: st, sticker: rw.sticker, text: (st === 3 ? 'Perfect ' : 'Nice ') + ch + '!', pic: '<div class="cele-glyph">' + ch + '</div>',
        again: function () { tracer(ch); }, next: function () { tracer(nx); } });
    }, J.reduced() ? 100 : 650);
  }
  svg.addEventListener('pointerdown', function (e) {
    e.preventDefault(); J.unlockAudio(); if (done) return;
    try { svg.setPointerCapture(e.pointerId); } catch (x) {}
    var p = J.svgPt(svg, e);
    if (d2(p, samples[si][idx]) <= tol * 1.7) { engaged = true; advance(p); }
    else { J.sfx('no'); startG.classList.remove('nudge'); spark.classList.remove('nudge'); void svg.getBoundingClientRect(); startG.classList.add('nudge'); spark.classList.add('nudge'); J.say(idx === 0 ? 'Start at the green dot.' : 'Start at the star.', true); }
  });
  svg.addEventListener('pointermove', function (e) {
    if (!engaged || done) return; var p = J.svgPt(svg, e), d = d2(p, samples[si][idx]);
    total++; if (d > tol * 1.5) off++;
    if (d > tol * 3.2) { engaged = false; J.sfx('no'); return; }
    advance(p);
  });
  function up() { engaged = false; }
  svg.addEventListener('pointerup', up); svg.addEventListener('pointercancel', up);
  J.$('.tr-side', wrap).onclick = function (e) {
    var b = e.target.closest('button'); if (!b) return; J.sfx('tap'); var a = b.getAttribute('data-a'), i = ORDER.indexOf(ch);
    tracer(a === 'prev' ? ORDER[(i + 35) % 36] : a === 'next' ? ORDER[(i + 1) % 36] : ch);
  };
  show();
  J.say(/[0-9]/.test(ch) ? 'Trace the number ' + ch + '.' : 'Trace the letter ' + ch + '. ' + ch + ' is for ' + WORD[ch] + '.');
}
J.act.trace = { mount: function (b, a) { body = b; api = a; picker(); }, GLYPHS: G, ORDER: ORDER };
})();
