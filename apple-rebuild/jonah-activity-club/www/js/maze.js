/* Boardwalk Mazes: generated mazes. Guide Pickles to Jonah. */
(function () {
'use strict';
var body, api, C = 40;
function gen(cols, rows) {
  // walls[y][x] = {r: wall on right, b: wall on bottom}
  var w = [], seen = [], x, y;
  for (y = 0; y < rows; y++) { w.push([]); seen.push([]); for (x = 0; x < cols; x++) { w[y].push({ r: true, b: true }); seen[y].push(false); } }
  var stack = [[0, 0]]; seen[0][0] = true;
  while (stack.length) {
    var c = stack[stack.length - 1], opts = [];
    [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) { var nx = c[0] + d[0], ny = c[1] + d[1]; if (nx >= 0 && ny >= 0 && nx < cols && ny < rows && !seen[ny][nx]) opts.push([nx, ny, d]); });
    if (!opts.length) { stack.pop(); continue; }
    var o = J.pick(opts), d = o[2];
    if (d[0] === 1) w[c[1]][c[0]].r = false; else if (d[0] === -1) w[o[1]][o[0]].r = false; else if (d[1] === 1) w[c[1]][c[0]].b = false; else w[o[1]][o[0]].b = false;
    seen[o[1]][o[0]] = true; stack.push([o[0], o[1]]);
  }
  return w;
}
function play() {
  J.clean(); api.back(null);
  var land = body.clientWidth > body.clientHeight, dims = J.band([4, 5], [7, 9], [10, 13]);
  var cols = land ? dims[1] : dims[0], rows = land ? dims[0] : dims[1], w = gen(cols, rows), px = 0, py = 0, gx = cols - 1, gy = rows - 1, steps = 0, hints = 0, over = false;
  function can(x, y, dx, dy) {
    var nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) return false;
    if (dx === 1) return !w[y][x].r; if (dx === -1) return !w[y][nx].r; if (dy === 1) return !w[y][x].b; return !w[ny][x].b;
  }
  var VW = cols * C + 20, VH = rows * C + 20, c = A.ctx('art', null, '', 4), s = '', x, y, d = '';
  s += '<path d="' + A.poly(A.rect(6, 6, cols * C + 8, rows * C + 8), 3) + '" fill="#e9c58f" stroke="' + A.INK + '" stroke-width="5" stroke-linejoin="round"/>';
  var planks = ''; for (y = 1; y < rows * 2; y++) planks += 'M10 ' + (10 + y * C / 2) + 'L' + (10 + cols * C) + ' ' + (10 + y * C / 2);
  s += '<path d="' + planks + '" stroke="#d9a66b" stroke-width="1.5" fill="none" opacity=".7"/>';
  for (y = 0; y < rows; y++) for (x = 0; x < cols; x++) {
    var X = 10 + x * C, Y = 10 + y * C;
    if (w[y][x].r && x < cols - 1) d += A.poly([[X + C, Y], [X + C, Y + C]], x * 31 + y * 7 + 1, false, 1);
    if (w[y][x].b && y < rows - 1) d += A.poly([[X, Y + C], [X + C, Y + C]], x * 17 + y * 13 + 2, false, 1);
  }
  s += '<g class="mz-trail"></g><g class="mz-hint"></g><path d="' + d + '" fill="none" stroke="' + A.INK + '" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>';
  s += '<g transform="translate(' + (10 + gx * C + 3) + ' ' + (10 + gy * C + 2) + ')"><g class="mz-goal">' + A.headSVG('jonah').replace('<svg ', '<svg width="34" height="34" ') + '</g></g>';
  s += '<g class="mz-pk"><g class="mz-pk-in">' + A.picklesSVG(J.S.color.pickles, J.S.strokes.pickles, 'pk').replace('<svg ', '<svg x="2" y="5" width="36" height="28" ') + '</g></g>';
  var h = '<div class="mz-wrap"><div class="fit"><div class="mz-board"><svg viewBox="0 0 ' + VW + ' ' + VH + '" class="mz-svg" aria-label="Maze. Guide Pickles to Jonah.">' + s + '</svg></div></div>' +
    '<div class="pad"><button class="rb" data-d="0,-1" aria-label="Up">' + J.IC.up + '</button><button class="rb" data-d="-1,0" aria-label="Left">' + J.IC.left + '</button><button class="rb hintb" data-a="hint" aria-label="Show me the way">' + A.itemSVG('bone') + '</button>' +
    '<button class="rb" data-d="1,0" aria-label="Right">' + J.IC.right + '</button><button class="rb" data-d="0,1" aria-label="Down">' + J.IC.down + '</button></div></div>';
  body.innerHTML = h;
  var wrap = body.firstChild, svg = J.$('.mz-svg', wrap), pk = J.$('.mz-pk', svg), trail = J.$('.mz-trail', svg), hintG = J.$('.mz-hint', svg);
  J.fit(J.$('.fit', wrap), J.$('.mz-board', wrap), VW / VH);
  function place(dx) {
    pk.style.transform = 'translate(' + (10 + px * C) + 'px,' + (10 + py * C) + 'px)';
    if (dx) J.$('.mz-pk-in', pk).setAttribute('transform', dx < 0 ? 'translate(' + C + ' 0) scale(-1 1)' : '');
  }
  function step(dx, dy) {
    if (over || !can(px, py, dx, dy)) return false;
    trail.insertAdjacentHTML('beforeend', '<circle cx="' + (10 + px * C + C / 2) + '" cy="' + (10 + py * C + C / 2) + '" r="4" fill="#9a6a3e" opacity=".45"/>');
    px += dx; py += dy; steps++; place(dx); J.sfx('step');
    if (px === gx && py === gy) {
      over = true; J.sfx('woof');
      setTimeout(function () { var rw = J.award(2, 'maze'); J.celebrate({ stars: hints === 0 ? 3 : hints === 1 ? 2 : 1, sticker: rw.sticker, text: 'Pickles found Jonah!', pic: '<div class="stk-burst">' + A.headSVG('jonah') + '</div>', next: function () { play(); } }); }, 500);
    }
    return true;
  }
  function path() { // BFS from Pickles to Jonah
    var prev = {}, q = [[px, py]], k = function (a, b) { return a + ',' + b; }; prev[k(px, py)] = null;
    while (q.length) {
      var cur = q.shift(); if (cur[0] === gx && cur[1] === gy) break;
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (dd) { if (can(cur[0], cur[1], dd[0], dd[1])) { var nk = k(cur[0] + dd[0], cur[1] + dd[1]); if (!(nk in prev)) { prev[nk] = cur; q.push([cur[0] + dd[0], cur[1] + dd[1]]); } } });
    }
    var out = [], p = [gx, gy]; while (p) { out.unshift(p); p = prev[k(p[0], p[1])]; } return out;
  }
  function hint() {
    hints++; var p = path().slice(1, J.band(7, 6, 5)), hh = '';
    p.forEach(function (q, i) { hh += '<circle class="hd" style="--d:' + (i * 0.12) + 's" cx="' + (10 + q[0] * C + C / 2) + '" cy="' + (10 + q[1] * C + C / 2) + '" r="7"/>'; });
    hintG.innerHTML = hh; J.sfx('ding'); J.say('Follow the dots!', true);
    setTimeout(function () { hintG.innerHTML = ''; }, 3200);
  }
  var dragging = false;
  function drag(e) {
    var p = J.svgPt(svg, e), tx = Math.floor((p.x - 10) / C), ty = Math.floor((p.y - 10) / C);
    for (var i = 0; i < 4; i++) {
      var dx = Math.sign(tx - px), dy = Math.sign(ty - py); if (!dx && !dy) return;
      var first = Math.abs(tx - px) >= Math.abs(ty - py);
      if (first ? (dx && step(dx, 0)) || (dy && step(0, dy)) : (dy && step(0, dy)) || (dx && step(dx, 0))) continue;
      return;
    }
  }
  svg.addEventListener('pointerdown', function (e) { e.preventDefault(); J.unlockAudio(); dragging = true; try { svg.setPointerCapture(e.pointerId); } catch (x) {} drag(e); });
  svg.addEventListener('pointermove', function (e) { if (dragging) drag(e); });
  svg.addEventListener('pointerup', function () { dragging = false; }); svg.addEventListener('pointercancel', function () { dragging = false; });
  J.$('.pad', wrap).onclick = function (e) {
    var b = e.target.closest('button'); if (!b) return; J.unlockAudio();
    if (b.getAttribute('data-a') === 'hint') { hint(); return; }
    var dd = b.getAttribute('data-d').split(','); if (!step(+dd[0], +dd[1])) J.sfx('no');
  };
  function key(e) { var m = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] }[e.key]; if (m) { e.preventDefault(); step(m[0], m[1]); } }
  window.addEventListener('keydown', key); J.onClean(function () { window.removeEventListener('keydown', key); });
  place(1);
  J.say('Help Pickles find Jonah! Drag Pickles along the boardwalk.');
  J.act.maze._dbg = { path: path, step: step, pos: function () { return [px, py]; } };
}
J.act.maze = { mount: function (b, a) { body = b; api = a; play(); } };
})();
