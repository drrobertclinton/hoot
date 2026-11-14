/* Dock Word Hunt: listen-and-find (3-5), picture/sight words (6-8), word search (9-11). */
(function () {
'use strict';
var PIC = ['crab', 'star', 'fish', 'shell', 'snail', 'boat', 'sun', 'kite', 'bone', 'heart', 'pail', 'flag', 'tree', 'hat', 'ball', 'dog', 'whale', 'turtle'];
var SIGHT = ['the', 'and', 'see', 'you', 'can', 'play', 'look', 'come', 'here', 'said', 'like', 'jump', 'big', 'go', 'we', 'my', 'is', 'it', 'to', 'up', 'run', 'day', 'sea', 'sun'];
var HUNT = ['CRAB', 'SHELL', 'DOCK', 'TIDE', 'WAVE', 'SAND', 'BOAT', 'KITE', 'GULL', 'HERON', 'JONAH', 'PICKLES', 'DEZ', 'PRIYA', 'TUCK', 'FISH', 'STAR', 'SNAIL', 'BEACH', 'LIGHT', 'ANCHOR', 'MAP', 'CLUB', 'POOL'];
var body, api;
function word(id) { return id === 'star' ? 'star' : A.ITEM_NAMES[id]; }

function rounds() {
  var round = 0, N = 6, wrongs = 0, used = [];
  function q() {
    round++;
    var b = J.S.band, kind = b === 0 ? 'hear' : (round % 2 ? 'pic' : 'sight'), h = '<div class="wd-wrap"><div class="wd-top">', ans, opts, i, ask;
    var dots = '<span class="dots">'; for (i = 0; i < N; i++) dots += '<i class="' + (i < round - 1 ? 'on' : i === round - 1 ? 'now' : '') + '"></i>'; dots += '</span>';
    if (kind === 'sight') {
      var pool = J.shuffle(SIGHT.filter(function (w) { return used.indexOf(w) < 0; })); ans = pool[0]; used.push(ans);
      opts = J.shuffle([ans].concat(J.shuffle(SIGHT.filter(function (w) { return w !== ans && Math.abs(w.length - ans.length) < 2; })).slice(0, 3)));
      ask = 'Find the word: ' + ans + '.';
      h += '<button class="hear" aria-label="Hear the word again">' + J.IC.sound + '</button>' + dots + '</div><div class="wd-opts signs four">';
      opts.forEach(function (o) { h += '<button class="sign-b" data-o="' + o + '">' + o + '</button>'; });
    } else {
      var pp = J.shuffle(PIC.filter(function (w) { return used.indexOf(w) < 0; })); ans = pp[0]; used.push(ans);
      opts = J.shuffle([ans].concat(J.shuffle(PIC.filter(function (w) { return w !== ans; })).slice(0, 2)));
      if (kind === 'hear') {
        ask = 'Find the ' + word(ans) + '!';
        h += '<button class="hear wordy" aria-label="Hear the word again">' + J.IC.sound + '<b>' + word(ans) + '</b></button>' + dots + '</div><div class="wd-opts pics">';
        opts.forEach(function (o) { h += '<button class="pic-b" data-o="' + o + '" aria-label="' + word(o) + '">' + A.itemSVG(o) + '<span>' + word(o) + '</span></button>'; });
      } else {
        ask = 'What is this? Find the word.';
        h += '<div class="pic-show">' + A.itemSVG(ans) + '</div>' + dots + '</div><div class="wd-opts signs">';
        opts.forEach(function (o) { h += '<button class="sign-b" data-o="' + o + '">' + word(o) + '</button>'; });
      }
    }
    h += '</div></div>';
    body.innerHTML = h;
    var wrap = body.firstChild, hb = J.$('.hear', wrap);
    if (hb) hb.onclick = function () { J.sfx('tap'); J.say(ask, true); };
    J.$('.wd-opts', wrap).onclick = function (e) {
      var o = e.target.closest('button'); if (!o || o.disabled) return; J.unlockAudio();
      if (o.getAttribute('data-o') === ans) {
        o.classList.add('right'); J.sfx('ding'); J.$$('.wd-opts button', wrap).forEach(function (x) { x.disabled = true; });
        J.say('Yes! ' + (kind === 'sight' ? ans : word(ans)) + '!', true);
        setTimeout(function () {
          if (round >= N) { var rw = J.award(3, 'words'); J.celebrate({ stars: wrongs === 0 ? 3 : wrongs < 3 ? 2 : 1, sticker: rw.sticker, again: function () { rounds(); } }); } else q();
        }, 1100);
      } else { o.classList.add('wrong'); o.disabled = true; wrongs++; J.sfx('no'); J.say(kind === 'sight' ? 'That says ' + o.getAttribute('data-o') + '. Try again!' : 'That is the ' + word(o.getAttribute('data-o')) + '. Try again!', true); }
    };
    J.say(ask);
  }
  q();
}

function search() {
  J.clean();
  var N = 8, grid = [], words = [], x, y, tries, list = J.shuffle(HUNT), DIRS = [[1, 0], [0, 1], [1, 1], [1, -1]];
  for (y = 0; y < N; y++) { grid.push([]); for (x = 0; x < N; x++) grid[y].push(''); }
  for (var wi = 0; wi < list.length && words.length < 6; wi++) {
    var w = list[wi];
    for (tries = 0; tries < 120; tries++) {
      var d = J.pick(DIRS), sx = J.rand(0, N - 1), sy = J.rand(0, N - 1), ex = sx + d[0] * (w.length - 1), ey = sy + d[1] * (w.length - 1), ok = true, i;
      if (ex < 0 || ex >= N || ey < 0 || ey >= N) continue;
      for (i = 0; i < w.length; i++) { var ch = grid[sy + d[1] * i][sx + d[0] * i]; if (ch && ch !== w[i]) { ok = false; break; } }
      if (!ok) continue;
      for (i = 0; i < w.length; i++) grid[sy + d[1] * i][sx + d[0] * i] = w[i];
      words.push({ w: w, a: [sx, sy], b: [ex, ey], found: false }); break;
    }
  }
  for (y = 0; y < N; y++) for (x = 0; x < N; x++) if (!grid[y][x]) grid[y][x] = 'ABCDEFGHIKLMNOPRSTUW'[J.rand(0, 19)];
  var h = '<div class="ws-wrap"><div class="fit"><div class="ws-board"><svg class="ws-lines" viewBox="0 0 ' + N + ' ' + N + '"><g class="ws-found"></g><line class="ws-sel" x1="0" y1="0" x2="0" y2="0" style="display:none"/></svg><div class="ws-grid" style="grid-template-columns:repeat(' + N + ',1fr)">';
  for (y = 0; y < N; y++) for (x = 0; x < N; x++) h += '<span class="ws-c" data-x="' + x + '" data-y="' + y + '">' + grid[y][x] + '</span>';
  h += '</div></div></div><ul class="ws-list">';
  words.forEach(function (o, i) { h += '<li data-i="' + i + '">' + o.w.toLowerCase() + '</li>'; });
  h += '</ul></div>';
  body.innerHTML = h;
  var wrap = body.firstChild, board = J.$('.ws-board', wrap), sel = J.$('.ws-sel', wrap), foundG = J.$('.ws-found', wrap), a = null, b = null, left = words.length, t0 = Date.now();
  var cols = ['#f08a6b', '#f7c85a', '#5bb5a6', '#b08fd6', '#ef6f8a', '#7fbf7a'];
  J.fit(J.$('.fit', wrap), board, 1);
  function cell(e) { var r = board.getBoundingClientRect(); return [Math.max(0, Math.min(N - 1, Math.floor((e.clientX - r.left) / r.width * N))), Math.max(0, Math.min(N - 1, Math.floor((e.clientY - r.top) / r.height * N)))]; }
  function snap(p) { // snap the end to the nearest of 8 directions from a
    var dx = p[0] - a[0], dy = p[1] - a[1], L = Math.max(Math.abs(dx), Math.abs(dy)); if (!L) return a.slice();
    var ang = Math.round(Math.atan2(dy, dx) / (Math.PI / 4)), ux = Math.round(Math.cos(ang * Math.PI / 4)), uy = Math.round(Math.sin(ang * Math.PI / 4));
    while (L > 0 && (a[0] + ux * L < 0 || a[0] + ux * L >= N || a[1] + uy * L < 0 || a[1] + uy * L >= N)) L--;
    return [a[0] + ux * L, a[1] + uy * L];
  }
  function draw() { sel.style.display = ''; sel.setAttribute('x1', a[0] + 0.5); sel.setAttribute('y1', a[1] + 0.5); sel.setAttribute('x2', b[0] + 0.5); sel.setAttribute('y2', b[1] + 0.5); }
  board.addEventListener('pointerdown', function (e) { e.preventDefault(); J.unlockAudio(); try { board.setPointerCapture(e.pointerId); } catch (x) {} a = cell(e); b = a.slice(); draw(); J.sfx('tap'); });
  board.addEventListener('pointermove', function (e) { if (!a) return; var nb = snap(cell(e)); if (nb[0] !== b[0] || nb[1] !== b[1]) { b = nb; draw(); } });
  function up() {
    if (!a) return; sel.style.display = 'none';
    var hit = -1;
    words.forEach(function (o, i) { if (o.found) return; if ((o.a[0] === a[0] && o.a[1] === a[1] && o.b[0] === b[0] && o.b[1] === b[1]) || (o.b[0] === a[0] && o.b[1] === a[1] && o.a[0] === b[0] && o.a[1] === b[1])) hit = i; });
    if (hit >= 0) {
      var o = words[hit]; o.found = true; left--;
      foundG.insertAdjacentHTML('beforeend', '<line x1="' + (o.a[0] + 0.5) + '" y1="' + (o.a[1] + 0.5) + '" x2="' + (o.b[0] + 0.5) + '" y2="' + (o.b[1] + 0.5) + '" stroke="' + cols[hit % 6] + '"/>');
      J.$('.ws-list li[data-i="' + hit + '"]', wrap).classList.add('found'); J.sfx('ding'); J.say(o.w.toLowerCase(), true);
      if (!left) setTimeout(function () { var rw = J.award(3, 'words'), secs = (Date.now() - t0) / 1000; J.celebrate({ stars: secs < 120 ? 3 : secs < 240 ? 2 : 1, sticker: rw.sticker, text: 'You found every word!', again: function () { search(); } }); }, 700);
    } else if (a[0] !== b[0] || a[1] !== b[1]) J.sfx('no');
    a = b = null;
  }
  board.addEventListener('pointerup', up); board.addEventListener('pointercancel', up);
  J.say('Find the hidden words. Drag your finger across the letters.');
  J.act.words._dbg = words;
}
J.act.words = { mount: function (b, a) { body = b; api = a; a.back(null); if (J.S.band === 2) search(); else rounds(); } };
})();
