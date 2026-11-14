/* Tide Pool: count sea creatures, and memory-match pairs. */
(function () {
'use strict';
var CR = ['crab', 'star', 'fish', 'shell', 'jelly', 'octo', 'snail', 'turtle'];
var PL = { crab: 'crabs', star: 'starfish', fish: 'fish', shell: 'shells', jelly: 'jellyfish', octo: 'octopuses', snail: 'snails', turtle: 'turtles' };
var NUM = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty'];
var body, api;

function menu() {
  J.clean(); api.back(null); api.mid('');
  body.innerHTML = '<div class="two-doors"><button class="door" data-m="count" aria-label="Count the sea creatures"><span class="door-art">' + A.itemSVG('crab') + A.itemSVG('crab') + A.itemSVG('crab') + '</span><span class="door-num">1 2 3</span></button>' +
    '<button class="door" data-m="match" aria-label="Match the pairs"><span class="door-art"><span class="mc">' + A.itemSVG('star') + '</span><span class="mc">' + A.itemSVG('star') + '</span></span><span class="door-num">' + A.itemSVG('heart', 'it tiny') + '</span></button></div>';
  body.firstChild.onclick = function (e) { var b = e.target.closest('.door'); if (!b) return; J.sfx('pop'); if (b.getAttribute('data-m') === 'count') count(); else match(); };
  J.say('Do you want to count, or play the matching game?');
}

function count() {
  var round = 0, ROUNDS = 5, wrongs = 0;
  api.back(menu);
  function q() {
    J.clean(); round++;
    var b = J.S.band, types = J.shuffle(CR), t1 = types[0], t2 = types[1], t3 = types[2], n1, n2 = 0, nd = 0, ans, ask, askPic;
    if (b === 0) { n1 = J.rand(1, 5); ans = n1; }
    else if (b === 1) { n1 = J.rand(3, 10); nd = J.rand(2, 4); ans = n1; }
    else { n1 = J.rand(3, 8); n2 = J.rand(3, 7); nd = J.rand(2, 4); ans = n1 + n2; }
    ask = b === 2 ? 'How many ' + PL[t1] + ' and ' + PL[t2] + ' altogether?' : 'How many ' + PL[t1] + '?';
    askPic = A.itemSVG(t1) + (b === 2 ? '<b>+</b>' + A.itemSVG(t2) : '') + '<b>?</b>';
    var items = []; var i;
    for (i = 0; i < n1; i++) items.push(t1); for (i = 0; i < n2; i++) items.push(t2); for (i = 0; i < nd; i++) items.push(b === 2 ? t3 : t2);
    var N = items.length, cols = Math.ceil(Math.sqrt(N * 1.25)), rows = Math.ceil(N / cols), cells = [];
    for (i = 0; i < cols * rows; i++) cells.push(i); cells = J.shuffle(cells).slice(0, N);
    var sz = Math.min(80 / cols, 78 / rows);
    var opts = [ans]; while (opts.length < (b === 0 ? 3 : 4)) { var o = Math.max(1, ans + J.rand(-3, 3)); if (opts.indexOf(o) < 0) opts.push(o); }
    opts = opts.sort(function (x, y) { return x - y; });
    var h = '<div class="cnt-wrap"><div class="ask" aria-label="' + ask + '">' + askPic + '<span class="dots">';
    for (i = 0; i < ROUNDS; i++) h += '<i class="' + (i < round - 1 ? 'on' : i === round - 1 ? 'now' : '') + '"></i>';
    h += '</span></div><div class="fit"><div class="pool">';
    J.shuffle(items).forEach(function (t, k) {
      var cx = cells[k] % cols, cy = Math.floor(cells[k] / cols);
      var x = 8 + (cx + 0.5) * (84 / cols) + (Math.random() - 0.5) * (84 / cols - sz) * 0.8, y = 9 + (cy + 0.5) * (82 / rows) + (Math.random() - 0.5) * (82 / rows - sz) * 0.8;
      h += '<button class="cre" data-t="' + t + '" style="left:' + x.toFixed(1) + '%;top:' + y.toFixed(1) + '%;width:' + sz.toFixed(1) + '%;--rot:' + J.rand(-14, 14) + 'deg" aria-label="' + A.ITEM_NAMES[t] + '">' + A.itemSVG(t) + '<em></em></button>';
    });
    h += '</div></div><div class="answers">';
    opts.forEach(function (o) { h += '<button class="ans" data-n="' + o + '">' + o + '</button>'; });
    h += '</div></div>';
    body.innerHTML = h;
    var wrap = body.firstChild, tally = 0;
    J.fit(J.$('.fit', wrap), J.$('.pool', wrap), 1, 16);
    J.$('.pool', wrap).onclick = function (e) {
      var c = e.target.closest('.cre'); if (!c) return;
      if (c.classList.contains('counted')) return;
      c.classList.add('counted'); tally++; c.querySelector('em').textContent = tally; J.sfx('pop'); J.say(NUM[tally] || String(tally), true);
    };
    J.$('.answers', wrap).onclick = function (e) {
      var a = e.target.closest('.ans'); if (!a || a.disabled) return;
      if (+a.getAttribute('data-n') === ans) {
        a.classList.add('right'); J.sfx('ding'); J.$$('.ans', wrap).forEach(function (x) { x.disabled = true; });
        J.say('Yes! ' + (NUM[ans] || ans) + '!', true);
        setTimeout(function () {
          if (round >= ROUNDS) { var rw = J.award(3, 'count'); J.celebrate({ stars: wrongs === 0 ? 3 : wrongs < 3 ? 2 : 1, sticker: rw.sticker, again: function () { count(); } }); }
          else q();
        }, 1100);
      } else { a.classList.add('wrong'); a.disabled = true; wrongs++; J.sfx('no'); J.say('Try again. Tap each one to count.', true); }
    };
    J.say(ask);
  }
  q();
}

function match() {
  J.clean(); api.back(menu);
  var pairs = J.band(3, 6, 8), kinds = J.shuffle(CR).slice(0, pairs), deck = J.shuffle(kinds.concat(kinds)), open = [], found = 0, flips = 0, lock = false;
  var h = '<div class="mm-wrap"><div class="fit"><div class="mm-grid">';
  deck.forEach(function (t, i) { h += '<button class="card" data-i="' + i + '" aria-label="Card"><span class="card-in"><span class="card-b">' + A.itemSVG('anchor', 'it back') + '</span><span class="card-f">' + A.itemSVG(t) + '</span></span></button>'; });
  h += '</div></div></div>';
  body.innerHTML = h;
  var wrap = body.firstChild, fitEl = J.$('.fit', wrap), grid = J.$('.mm-grid', wrap), n = deck.length;
  function layout() {
    var w = fitEl.clientWidth, hh = fitEl.clientHeight, best = 1, bs = 0;
    for (var c = 2; c <= n; c++) { if (n % c) continue; var r = n / c, s = Math.min(w / c, hh / (r * 1.2)); if (s > bs) { bs = s; best = c; } }
    grid.style.gridTemplateColumns = 'repeat(' + best + ',1fr)'; grid.style.width = Math.floor(bs * best) + 'px';
  }
  layout(); window.addEventListener('resize', layout); J.onClean(function () { window.removeEventListener('resize', layout); });
  grid.onclick = function (e) {
    var c = e.target.closest('.card'); if (!c || lock || c.classList.contains('up')) return;
    J.unlockAudio(); c.classList.add('up'); J.sfx('tap'); open.push(c); flips++;
    var t = deck[+c.getAttribute('data-i')]; J.say(A.ITEM_NAMES[t], true);
    if (open.length < 2) return;
    var a = open[0], b = open[1]; open = [];
    if (deck[+a.getAttribute('data-i')] === deck[+b.getAttribute('data-i')]) {
      setTimeout(function () { a.classList.add('ok'); b.classList.add('ok'); J.sfx('ding'); }, 350); found++;
      if (found === pairs) setTimeout(function () {
        var rw = J.award(3, 'match'), extra = flips - pairs * 2;
        J.celebrate({ stars: extra <= pairs * 2 ? 3 : extra <= pairs * 4 ? 2 : 1, sticker: rw.sticker, text: 'You found all the pairs!', again: function () { match(); } });
      }, 1000);
    } else { lock = true; setTimeout(function () { a.classList.remove('up'); b.classList.remove('up'); lock = false; }, J.band(1300, 1000, 850)); }
  };
  J.say('Find two that are the same!');
}
J.act.tide = { mount: function (b, a) { body = b; api = a; menu(); } };
})();
