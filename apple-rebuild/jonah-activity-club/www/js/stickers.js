/* Sticker Clubhouse: decorate the treehouse with earned stickers (drag, scale, rotate). Also the porch sticker book. */
(function () {
'use strict';
function mount(body, api) {
  var S = J.S, sel = null;
  var h = '<div class="sk-wrap"><div class="fit"><div class="scene">' + A.sceneSVG() + '<div class="sk-layer"></div></div></div>' +
    '<div class="sk-tools"><button class="rb" data-a="big" aria-label="Bigger">' + J.IC.plus + '</button><button class="rb" data-a="small" aria-label="Smaller">' + J.IC.minus + '</button><button class="rb" data-a="rot" aria-label="Turn">' + J.IC.rot + '</button><button class="rb" data-a="del" aria-label="Take off">' + J.IC.trash + '</button></div>' +
    '<div class="tray" aria-label="Your stickers">';
  J.STICKERS.forEach(function (id) {
    var have = S.stickers.indexOf(id) >= 0;
    h += '<button class="tr-it' + (have ? '' : ' locked') + '" data-id="' + id + '" aria-label="' + A.ITEM_NAMES[id] + (have ? ' sticker' : ' sticker, not won yet') + '">' + A.itemSVG(id) + (have ? '' : '<span class="lk">' + J.IC.lock + '</span>') + '</button>';
  });
  h += '</div></div>';
  body.innerHTML = h;
  var wrap = body.firstChild, scene = J.$('.scene', wrap), layer = J.$('.sk-layer', wrap), tools = J.$('.sk-tools', wrap);
  J.fit(J.$('.fit', wrap), scene, 1);
  function style(el, p) { el.style.left = p.x + '%'; el.style.top = p.y + '%'; el.style.transform = 'translate(-50%,-50%) rotate(' + p.r + 'deg) scale(' + p.s + ')'; }
  function render() {
    layer.innerHTML = '';
    S.placed.forEach(function (p, i) { var el = J.el('<div class="stk" data-i="' + i + '">' + A.itemSVG(p.id) + '</div>'); style(el, p); if (i === sel) el.classList.add('sel'); layer.appendChild(el); });
    tools.classList.toggle('show', sel != null);
  }
  function add(id, x, y) {
    if (S.placed.length >= 40) { J.sfx('no'); J.say('The treehouse is full! Take one off first.', true); return -1; }
    S.placed.push({ id: id, x: x == null ? J.rand(30, 70) : x, y: y == null ? J.rand(30, 60) : y, s: 1, r: J.rand(-10, 10) });
    sel = S.placed.length - 1; J.save(); render(); J.sfx('pop');
    var el = layer.lastChild; el.classList.add('plop'); return sel;
  }
  function pct(e) { var r = scene.getBoundingClientRect(); return [Math.max(2, Math.min(98, (e.clientX - r.left) / r.width * 100)), Math.max(2, Math.min(98, (e.clientY - r.top) / r.height * 100))]; }

  /* drag stickers already on the scene; two fingers = pinch to scale + twist */
  var drag = null, pts = {};
  layer.addEventListener('pointerdown', function (e) {
    var el = e.target.closest('.stk'); J.unlockAudio();
    pts[e.pointerId] = [e.clientX, e.clientY];
    var ids = Object.keys(pts);
    if (ids.length === 2 && sel != null) { var a = pts[ids[0]], b = pts[ids[1]]; drag = { pinch: true, d: Math.hypot(a[0] - b[0], a[1] - b[1]) || 1, ang: Math.atan2(b[1] - a[1], b[0] - a[0]), s: S.placed[sel].s, r: S.placed[sel].r }; return; }
    if (!el) { sel = null; render(); return; }
    e.preventDefault(); sel = +el.getAttribute('data-i');
    var p = S.placed[sel], q = pct(e); drag = { i: sel, ox: p.x - q[0], oy: p.y - q[1] };
    J.$$('.stk', layer).forEach(function (x) { x.classList.toggle('sel', x === el); }); tools.classList.add('show');
    try { layer.setPointerCapture(e.pointerId); } catch (x) {}
    J.sfx('tap');
  });
  layer.addEventListener('pointermove', function (e) {
    if (!drag) return; if (pts[e.pointerId]) pts[e.pointerId] = [e.clientX, e.clientY];
    var p = S.placed[sel], el = layer.children[sel]; if (!p || !el) return;
    if (drag.pinch) {
      var ids = Object.keys(pts); if (ids.length < 2) return; var a = pts[ids[0]], b = pts[ids[1]];
      p.s = Math.max(0.5, Math.min(2.6, drag.s * Math.hypot(a[0] - b[0], a[1] - b[1]) / drag.d));
      p.r = Math.round(drag.r + (Math.atan2(b[1] - a[1], b[0] - a[0]) - drag.ang) * 180 / Math.PI);
    } else { var q = pct(e); p.x = +(Math.max(2, Math.min(98, q[0] + drag.ox))).toFixed(1); p.y = +(Math.max(2, Math.min(98, q[1] + drag.oy))).toFixed(1); }
    style(el, p);
  });
  function up(e) { delete pts[e.pointerId]; if (drag) { drag = null; J.save(); } }
  layer.addEventListener('pointerup', up); layer.addEventListener('pointercancel', up);

  tools.onclick = function (e) {
    var b = e.target.closest('button'); if (!b || sel == null) return; var p = S.placed[sel], a = b.getAttribute('data-a'); J.sfx('tap');
    if (a === 'big') p.s = Math.min(2.6, +(p.s * 1.2).toFixed(2)); else if (a === 'small') p.s = Math.max(0.5, +(p.s / 1.2).toFixed(2)); else if (a === 'rot') p.r = (p.r + 20) % 360;
    else if (a === 'del') { S.placed.splice(sel, 1); sel = null; }
    J.save(); render();
  };

  /* tray: tap to add, or drag a sticker up onto the scene */
  var tray = J.$('.tray', wrap), td = null;
  tray.addEventListener('pointerdown', function (e) { var b = e.target.closest('.tr-it'); if (!b) return; J.unlockAudio(); td = { b: b, x: e.clientX, y: e.clientY, spawned: false, pid: e.pointerId }; });
  function tmove(e) {
    if (!td || e.pointerId !== td.pid || td.b.classList.contains('locked')) return;
    var tr = tray.getBoundingClientRect();
    if (!td.spawned && (e.clientY < tr.top - 4 || e.clientX < tr.left - 4)) {
      var q = pct(e), i = add(td.b.getAttribute('data-id'), q[0], q[1]); if (i < 0) { td = null; return; } td.spawned = true;
    }
    if (td.spawned) { var p = S.placed[sel], q2 = pct(e); p.x = +q2[0].toFixed(1); p.y = +q2[1].toFixed(1); style(layer.children[sel], p); e.preventDefault(); }
  }
  function tup(e) {
    if (!td || e.pointerId !== td.pid) return; var t = td; td = null;
    if (t.spawned) { J.save(); return; }
    if (Math.hypot(e.clientX - t.x, e.clientY - t.y) > 12) return;
    if (t.b.classList.contains('locked')) { J.sfx('no'); t.b.classList.remove('shake'); void t.b.getBoundingClientRect(); t.b.classList.add('shake'); J.say('Play the games to win this sticker!', true); return; }
    add(t.b.getAttribute('data-id')); J.say(A.ITEM_NAMES[t.b.getAttribute('data-id')], true);
  }
  window.addEventListener('pointermove', tmove, { passive: false }); window.addEventListener('pointerup', tup); window.addEventListener('pointercancel', function () { if (td && td.spawned) J.save(); td = null; });
  J.onClean(function () { window.removeEventListener('pointermove', tmove); window.removeEventListener('pointerup', tup); });
  render();
  J.say('Decorate the treehouse! Tap a sticker, then drag it where you like.');
}
J.act.stick = { mount: mount };

/* Heron Run Lane: meet the Low Tide Club and see the sticker book */
var LINES = { jonah: 'Hi! I\'m Jonah. I live on Heron Run Lane.', dez: 'I\'m Dez! I\'m in the Low Tide Club.', priya: 'I\'m Priya! Let\'s explore the beach.', tuck: 'I\'m Tuck! Low Tide Club forever!', pickles: 'Woof! That\'s Pickles, Jonah\'s dog. He is a very good boy.' };
J.act.porch = { mount: function (body) {
  var S = J.S, h = '<div class="porch"><div class="crew">';
  ['jonah', 'dez', 'priya', 'tuck'].forEach(function (k, i) { h += '<button class="mate" data-k="' + k + '" aria-label="' + A.KIDS[k].name + '">' + A.kidSVG(k, { wave: i === 0 }) + '<span>' + A.KIDS[k].name + '</span></button>'; });
  h += '<button class="mate dogm" data-k="pickles" aria-label="Pickles">' + A.picklesSVG(S.color.pickles, S.strokes.pickles, 'pk') + '<span>Pickles</span></button></div>';
  h += '<div class="book"><div class="book-head">' + J.IC.star + '<b>' + S.stars + '</b><span class="bk-count">' + A.itemSVG('star', 'it tiny') + S.stickers.length + ' / ' + J.STICKERS.length + '</span></div><div class="book-grid">';
  J.STICKERS.forEach(function (id) { var have = S.stickers.indexOf(id) >= 0; h += '<button class="bk-it' + (have ? '' : ' locked') + '" data-id="' + id + '" aria-label="' + A.ITEM_NAMES[id] + (have ? '' : ', not won yet') + '">' + A.itemSVG(id) + '</button>'; });
  h += '</div></div></div>';
  body.innerHTML = h;
  body.firstChild.onclick = function (e) {
    var m = e.target.closest('.mate'), b = e.target.closest('.bk-it');
    if (m) { J.sfx(m.getAttribute('data-k') === 'pickles' ? 'woof' : 'pop'); m.classList.remove('hop'); void m.getBoundingClientRect(); m.classList.add('hop'); J.say(LINES[m.getAttribute('data-k')], true); }
    if (b) { if (b.classList.contains('locked')) { J.sfx('no'); J.say('Play the games to win this sticker!', true); } else { J.sfx('pop'); J.say(A.ITEM_NAMES[b.getAttribute('data-id')], true); b.classList.remove('hop'); void b.getBoundingClientRect(); b.classList.add('hop'); } }
  };
  J.say('Welcome to Heron Run Lane! Tap a friend to say hello.');
} };
})();
