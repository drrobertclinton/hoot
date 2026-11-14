/* Grown-ups area behind a parent gate: hold 3 seconds, then solve a multiplication. */
(function () {
'use strict';
var holdT = null, holdStart = 0, raf = 0;
function ring(f) { var c = J.$('#hudGrown .ring'); if (c) c.style.strokeDashoffset = String(100 - 100 * f); }
function startHold(e) {
  e.preventDefault(); J.unlockAudio(); holdStart = performance.now(); J.$('#hudGrown').classList.add('holding');
  (function tick(now) { var f = Math.min(1, (now - holdStart) / 3000); ring(f); if (f < 1 && holdStart) raf = requestAnimationFrame(tick); })(holdStart);
  holdT = setTimeout(function () { endHold(); gate(); }, 3000);
}
function endHold() { var was = holdStart; clearTimeout(holdT); cancelAnimationFrame(raf); holdStart = 0; ring(0); J.$('#hudGrown').classList.remove('holding'); return was; }
function gate() {
  var a = J.rand(3, 9), b = J.rand(4, 9), val = '', box = J.$('#gate');
  var h = '<div class="gate-card" role="dialog" aria-modal="true" aria-label="Grown-ups check"><h2>Grown-ups only</h2><p>To continue, solve this:</p><div class="gate-q">' + a + ' × ' + b + ' = <output>?</output></div><div class="keys">';
  '123456789'.split('').forEach(function (k) { h += '<button data-k="' + k + '">' + k + '</button>'; });
  h += '<button data-k="del" aria-label="Delete">⌫</button><button data-k="0">0</button><button data-k="ok" class="ok">OK</button></div><button class="gate-x" data-k="x">Cancel</button></div>';
  box.innerHTML = h; box.hidden = false; J.hush();
  box.onclick = function (e) {
    var k = e.target.closest('button'); if (!k) return; k = k.getAttribute('data-k');
    if (k === 'x') { box.hidden = true; return; }
    if (k === 'del') val = val.slice(0, -1); else if (k === 'ok') {
      if (+val === a * b) { box.hidden = true; panel(); return; }
      val = ''; a = J.rand(3, 9); b = J.rand(4, 9); J.$('.gate-q', box).firstChild.textContent = a + ' × ' + b + ' = ';
      J.$('.gate-card', box).classList.remove('shake'); void box.getBoundingClientRect(); J.$('.gate-card', box).classList.add('shake');
    } else if (val.length < 3) val += k;
    J.$('output', box).textContent = val || '?';
  };
}
var BANDS = [['3–5', 'Listen and tap. No reading needed.'], ['6–8', 'Early reader: sight words, bigger puzzles.'], ['9–11', 'Word searches, sums, large mazes.']];
function panel() {
  var S = J.S, box = J.$('#parent'), pg = (box._pg || 'pickles'), i;
  var traced = Object.keys(S.trace).length, tstars = 0; for (var k in S.trace) tstars += S.trace[k];
  var h = '<div class="pa"><header class="pa-head"><h1>Grown-ups</h1><button class="pa-close" data-a="close">Done</button></header>';
  h += '<section><h2>Age band</h2><p class="hint">Sets the difficulty of every activity.</p><div class="seg">';
  BANDS.forEach(function (b, n) { h += '<button data-band="' + n + '" class="' + (S.band === n ? 'on' : '') + '" aria-pressed="' + (S.band === n) + '"><b>' + b[0] + '</b><span>' + b[1] + '</span></button>'; });
  h += '</div></section>';
  h += '<section><h2>Voice &amp; sound</h2><label class="sw"><input type="checkbox" id="paVoice"' + (S.voice ? ' checked' : '') + '><span class="sw-t"></span><span>Spoken prompts and sound effects</span></label><p class="hint">Uses the voice built into this device. Nothing is recorded or sent anywhere.</p></section>';
  h += '<section><h2>Progress</h2><div class="stats"><div><b>' + S.stars + '</b><span>stars</span></div><div><b>' + S.stickers.length + '/' + J.STICKERS.length + '</b><span>stickers</span></div><div><b>' + traced + '/36</b><span>letters &amp; numbers traced</span></div></div>';
  h += '<table class="pt"><tbody>';
  [['Coloring pages finished', S.stats.color], ['Letters and numbers traced (total)', S.stats.trace], ['Counting rounds', S.stats.count], ['Memory match games', S.stats.match], ['Mazes solved', S.stats.maze], ['Word rounds', S.stats.words]].forEach(function (r) { h += '<tr><td>' + r[0] + '</td><td>' + (r[1] || 0) + '</td></tr>'; });
  h += '</tbody></table><div class="tgrid" aria-label="Tracing stars">';
  J.act.trace.ORDER.forEach(function (ch) { h += '<span class="t' + (S.trace[ch] || 0) + '">' + ch + '</span>'; });
  h += '</div><p class="hint">Darker tiles earned more stars (' + tstars + ' tracing stars in total).</p></section>';
  h += '<section><h2>Print a coloring page</h2><p class="hint">Choose a page, then print a blank outline or your child\'s colored version.</p><div class="pp-row">';
  A.PAGES.forEach(function (p) { h += '<button class="pp' + (p.id === pg ? ' on' : '') + '" data-pg="' + p.id + '" aria-label="' + p.name + '">' + A.pageSVG(p.id, {}, [], 'thumb') + '<span>' + p.name + '</span></button>'; });
  h += '</div><div class="btn-row"><button class="pb" data-a="print">Print outline</button><button class="pb alt" data-a="printc">Print colored version</button></div></section>';
  h += '<section><h2>Privacy</h2><p>Jonah Activity Club has no accounts, no ads, no analytics, no in-app purchases and no links out of the app. It never connects to the internet. Everything your child makes — coloring, stickers, stars and progress — is stored only on this device and is erased if you delete it below or remove the app.</p></section>';
  h += '<section><h2>Your data</h2><div class="btn-row"><button class="pb alt" data-a="export">Export backup (JSON)</button><button class="pb danger" data-a="wipe">Delete all data</button></div><p class="hint" id="paMsg" role="status"></p></section>';
  h += '<p class="pa-foot">Jonah Activity Club · version 1.0 · Characters from the Jonah Pruitt books.</p></div>';
  box.innerHTML = h; box.hidden = false; box.scrollTop = 0;
  box.onchange = function (e) { if (e.target.id === 'paVoice') { S.voice = e.target.checked; J.save(); J.map.hud(); if (!S.voice) J.hush(); } };
  box.onclick = function (e) {
    var b = e.target.closest('button'); if (!b) return;
    if (b.hasAttribute('data-band')) { S.band = +b.getAttribute('data-band'); J.save(); var st = box.scrollTop; panel(); box.scrollTop = st; return; }
    if (b.hasAttribute('data-pg')) { box._pg = b.getAttribute('data-pg'); J.$$('.pp', box).forEach(function (x) { x.classList.toggle('on', x === b); }); return; }
    var a = b.getAttribute('data-a'), msg = J.$('#paMsg', box);
    if (a === 'close') { box.hidden = true; box.innerHTML = ''; J.map.hud(); J.map.refreshPickles(); }
    else if (a === 'print' || a === 'printc') {
      var id = box._pg || 'pickles', name = A.PAGES.filter(function (p) { return p.id === id; })[0].name;
      J.$('#printSheet').innerHTML = '<h1>' + name + '</h1>' + (a === 'print' ? A.pageSVG(id, {}, []) : A.pageSVG(id, S.color[id], S.strokes[id])) + '<p>Jonah Activity Club</p>';
      setTimeout(function () { window.print(); }, 60);
    } else if (a === 'export') {
      var json = JSON.stringify({ app: 'Jonah Activity Club', exported: new Date().toISOString(), data: S }, null, 2), done = false;
      try {
        var file = new File([json], 'jonah-activity-club-backup.json', { type: 'application/json' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) { navigator.share({ files: [file], title: 'Jonah Activity Club backup' }).catch(function () {}); done = true; }
      } catch (x) {}
      if (!done) { var u = URL.createObjectURL(new Blob([json], { type: 'application/json' })), l = document.createElement('a'); l.href = u; l.download = 'jonah-activity-club-backup.json'; document.body.appendChild(l); l.click(); l.remove(); setTimeout(function () { URL.revokeObjectURL(u); }, 2000); }
      msg.textContent = 'Backup file created (' + Math.round(json.length / 1024) + ' KB).';
    } else if (a === 'wipe') {
      if (!b.classList.contains('sure')) { b.classList.add('sure'); b.textContent = 'Tap again to delete everything'; return; }
      J.resetAll(); box._pg = null; panel(); J.$('#paMsg').textContent = 'All data deleted. The app is back to its starting state.'; J.map.hud(); J.map.refreshPickles();
    }
  };
}
J.parent = { init: function () {
  var b = J.$('#hudGrown');
  b.innerHTML = '<svg viewBox="0 0 40 40" class="ringsvg" aria-hidden="true"><circle cx="20" cy="20" r="16" pathLength="100" class="ring"/></svg>' + J.IC.lock;
  b.addEventListener('pointerdown', startHold);
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (ev) { b.addEventListener(ev, function () { var was = endHold(); if (was && performance.now() - was < 2900) { var t = J.$('#grownTip'); t.classList.add('show'); setTimeout(function () { t.classList.remove('show'); }, 2600); } }); });
  b.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  b.addEventListener('keydown', function (e) { if (e.key === 'Enter') gate(); });
}, panel: panel, gate: gate };
})();
