/* Jonah Activity Club - original hand-wobbled SVG art. No external assets. */
(function (root) {
'use strict';
var INK = '#3a4654';
var JM = 1; // jitter multiplier for the current drawing scale

function rng(seed) {
  var s = (Math.floor(seed * 2654435761) >>> 0) || 7;
  return function () { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}
function r1(n) { return Math.round(n * 10) / 10; }
function smooth(pts, closed) {
  var n = pts.length, d = 'M' + r1(pts[0][0]) + ' ' + r1(pts[0][1]);
  function g(i) { return closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]; }
  var m = closed ? n : n - 1;
  for (var i = 0; i < m; i++) {
    var p0 = g(i - 1), p1 = g(i), p2 = g(i + 1), p3 = g(i + 2);
    d += 'C' + r1(p1[0] + (p2[0] - p0[0]) / 6) + ' ' + r1(p1[1] + (p2[1] - p0[1]) / 6) + ' ' +
      r1(p2[0] - (p3[0] - p1[0]) / 6) + ' ' + r1(p2[1] - (p3[1] - p1[1]) / 6) + ' ' + r1(p2[0]) + ' ' + r1(p2[1]);
  }
  return d + (closed ? 'Z' : '');
}
function blob(cx, cy, rx, ry, seed, j) {
  if (ry == null) ry = rx;
  var R = rng(seed || (cx * 1.3 + cy * 3.1 + rx));
  var n = Math.max(8, Math.min(18, Math.round((rx + ry) / (7 * JM))));
  if (j == null) j = 0.06;
  var pts = [], off = R() * 6;
  for (var i = 0; i < n; i++) {
    var a = off + i / n * Math.PI * 2, k = 1 + (R() - 0.5) * 2 * j;
    pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
  }
  return smooth(pts, true);
}
function poly(pts, seed, closed, j) {
  var R = rng(seed || (pts[0][0] + pts[0][1] * 7 + pts.length));
  j = (j == null ? 1.5 : j) * JM;
  var out = [], n = pts.length, m = closed === false ? n - 1 : n;
  for (var i = 0; i < m; i++) {
    var a = pts[i], b = pts[(i + 1) % n], L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    var k = Math.max(1, Math.round(L / (26 * JM))), nx = -(b[1] - a[1]) / L, ny = (b[0] - a[0]) / L;
    for (var t = 0; t < k; t++) {
      var f = t / k, w = (R() - 0.5) * 2 * j * (t === 0 ? 0.4 : 1);
      out.push([a[0] + (b[0] - a[0]) * f + nx * w, a[1] + (b[1] - a[1]) * f + ny * w]);
    }
  }
  if (closed === false) out.push(pts[n - 1]);
  return 'M' + out.map(function (p) { return r1(p[0]) + ' ' + r1(p[1]); }).join('L') + (closed === false ? '' : 'Z');
}
function curve(pts, closed, seed, j) {
  var R = rng(seed || (pts[0][0] * 3 + pts[0][1] + pts.length));
  j = (j == null ? 1.2 : j) * JM;
  return smooth(pts.map(function (p) { return [p[0] + (R() - 0.5) * 2 * j, p[1] + (R() - 0.5) * 2 * j]; }), closed !== false);
}
function withJ(m, fn) { var o = JM; JM = m; try { return fn(); } finally { JM = o; } }

/* drawing context: 'art' = full colour, 'color' = white regions the child fills */
function ctx(mode, saved, pre, sw) {
  return {
    mode: mode || 'art', saved: saved || {}, pre: pre || '', sw: sw || 4,
    f: function (id, col) {
      if (this.mode === 'color') { var k = this.pre + id; return 'fill="' + (this.saved[k] || '#ffffff') + '" data-r="' + k + '" class="rg"'; }
      return 'fill="' + col + '"';
    },
    sub: function (pre, sw) { return ctx(this.mode, this.saved, this.pre + pre, sw || this.sw); }
  };
}
function sh(c, id, col, d, extra) {
  return '<path d="' + d + '" ' + (id ? c.f(id, col) : 'fill="' + col + '"') + ' stroke="' + INK + '" stroke-width="' + c.sw +
    '" stroke-linejoin="round" stroke-linecap="round" ' + (extra || '') + '/>';
}
function fl(c, id, col, d) { return '<path d="' + d + '" ' + (id ? c.f(id, col) : 'fill="' + col + '"') + '/>'; }
function ln(c, d, extra) {
  return '<path d="' + d + '" fill="none" stroke="' + INK + '" stroke-width="' + r1(c.sw * 0.85) + '" stroke-linejoin="round" stroke-linecap="round" ' + (extra || '') + '/>';
}
function dot(x, y, r, col) { return '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="' + (col || INK) + '"/>'; }
function eye(c, x, y, r) { r = r || 5.5; return '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="#fff" stroke="' + INK + '" stroke-width="' + r1(c.sw * 0.7) + '"/>' + dot(x + 0.8, y + 0.8, r * 0.48); }
function smile(c, x, y, w) { w = w || 8; return ln(c, 'M' + (x - w) + ' ' + y + 'Q' + x + ' ' + (y + w) + ' ' + (x + w) + ' ' + y); }
function deco(c, html) { return c.mode === 'color' ? '' : html; }

/* ---------- 100x100 picture items (stickers, creatures, word pictures) ---------- */
var ITEMS = {
  crab: function (c) {
    return ln(c, 'M30 52L17 46M70 52L83 46M30 66L15 72M35 73L24 86M70 66L85 72M65 73L76 86M42 46L40 31M58 46L60 31') +
      sh(c, 'claw', '#ef6f5b', blob(15, 38, 11, 9, 3, 0.1)) + sh(c, 'claw', '#ef6f5b', blob(85, 38, 11, 9, 4, 0.1)) +
      sh(c, 'body', '#ef6f5b', blob(50, 61, 29, 19, 5)) + eye(c, 40, 28) + eye(c, 60, 28) + smile(c, 50, 63);
  },
  star: function (c) {
    var p = []; for (var i = 0; i < 10; i++) { var a = (-90 + i * 36) * Math.PI / 180, r = i % 2 ? 21 : 44; p.push([50 + Math.cos(a) * r, 54 + Math.sin(a) * r]); }
    return sh(c, 'body', '#f7b54a', curve(p, true, 9, 0.8)) + dot(42, 50, 3) + dot(58, 50, 3) + smile(c, 50, 57, 6);
  },
  fish: function (c) {
    return sh(c, 'tail', '#f08a6b', poly([[68, 50], [94, 28], [87, 50], [94, 74]], 3)) + sh(c, 'tail', '#f08a6b', poly([[34, 32], [52, 16], [58, 34]], 4)) +
      sh(c, 'body', '#f7c85a', blob(43, 51, 33, 21, 6)) + ln(c, 'M50 36Q58 51 50 66M60 40Q66 51 60 62') + eye(c, 27, 46) + smile(c, 22, 57, 5);
  },
  shell: function (c) {
    return sh(c, 'body', '#f6b8c0', curve([[50, 86], [16, 60], [15, 36], [31, 19], [50, 14], [69, 19], [85, 36], [84, 60]], true, 5)) +
      ln(c, 'M50 84L25 38M50 84L38 23M50 84L50 17M50 84L62 23M50 84L75 38') + sh(c, 'knob', '#f08ab0', blob(50, 87, 11, 6, 2));
  },
  jelly: function (c) {
    return ln(c, 'M30 52q-6 11 0 21t0 16M44 55q-6 11 0 21t0 16M58 55q6 11 0 21t0 16M72 52q6 11 0 21t0 13') +
      sh(c, 'body', '#c6a6e6', curve([[15, 55], [19, 29], [50, 12], [81, 29], [85, 55], [68, 50], [50, 57], [32, 50]], true, 6)) + dot(41, 36, 3) + dot(59, 36, 3) + smile(c, 50, 42, 5);
  },
  octo: function (c) {
    return sh(c, 'legs', '#f08ab0', blob(19, 72, 9, 15, 1)) + sh(c, 'legs', '#f08ab0', blob(38, 81, 9, 15, 2)) + sh(c, 'legs', '#f08ab0', blob(62, 81, 9, 15, 3)) +
      sh(c, 'legs', '#f08ab0', blob(81, 72, 9, 15, 4)) + sh(c, 'body', '#f08ab0', blob(50, 44, 31, 29, 5)) + eye(c, 40, 42) + eye(c, 60, 42) + smile(c, 50, 54, 6);
  },
  snail: function (c) {
    return ln(c, 'M21 52L14 35M27 52L29 35') + dot(14, 34, 3) + dot(29, 34, 3) +
      sh(c, 'body', '#f3d08a', curve([[9, 80], [13, 62], [22, 50], [31, 56], [31, 70], [60, 75], [88, 75], [93, 83], [50, 87]], true, 7)) +
      sh(c, 'shell', '#8fc9a8', blob(60, 50, 25, 23, 8)) + ln(c, 'M46 50a14 14 0 1 1 14 14a9 9 0 1 1 -7 -13') + dot(18, 63, 2.5);
  },
  turtle: function (c) {
    return sh(c, 'legs', '#a5d68c', blob(30, 75, 10, 8, 1)) + sh(c, 'legs', '#a5d68c', blob(68, 75, 10, 8, 2)) + sh(c, 'legs', '#a5d68c', blob(88, 53, 11, 10, 3)) +
      sh(c, 'legs', '#a5d68c', poly([[16, 62], [5, 66], [15, 68]], 4)) +
      sh(c, 'body', '#5fae7a', curve([[13, 68], [21, 37], [50, 24], [78, 37], [85, 68], [50, 72]], true, 5)) + ln(c, 'M36 33L43 68M64 33L57 68M21 50L79 50') + dot(91, 51, 2.5);
  },
  whale: function (c) {
    return ln(c, 'M36 25q-4 -12 -13 -12M36 25q4 -12 13 -12') +
      sh(c, 'body', '#7fb4d9', curve([[9, 57], [19, 35], [47, 27], [71, 37], [80, 51], [91, 35], [97, 44], [92, 63], [80, 66], [60, 80], [30, 80]], true, 4)) +
      dot(27, 52, 3) + smile(c, 22, 63, 6);
  },
  boat: function (c) {
    return ln(c, 'M50 64L50 11') + sh(c, 'sail', '#fff7e0', poly([[55, 15], [86, 55], [55, 55]], 3)) + sh(c, 'sail2', '#7cc6b8', poly([[45, 24], [45, 55], [19, 55]], 4)) +
      sh(c, 'body', '#e8574b', poly([[10, 63], [90, 63], [77, 86], [23, 86]], 5));
  },
  sun: function (c) {
    var s = ''; for (var i = 0; i < 8; i++) { var a = i * Math.PI / 4; s += 'M' + r1(50 + Math.cos(a) * 31) + ' ' + r1(50 + Math.sin(a) * 31) + 'L' + r1(50 + Math.cos(a) * 45) + ' ' + r1(50 + Math.sin(a) * 45); }
    return ln(c, s) + sh(c, 'body', '#f7c85a', blob(50, 50, 25, 25, 7)) + dot(42, 46, 3) + dot(58, 46, 3) + smile(c, 50, 53, 6);
  },
  kite: function (c) {
    return ln(c, 'M50 76q11 7 0 14t2 8') + sh(c, 'body', '#f08a6b', poly([[50, 6], [83, 40], [50, 77], [17, 40]], 6)) + ln(c, 'M50 8L50 75M19 40L81 40') +
      sh(c, 'bow', '#f7c85a', blob(54, 86, 6, 4, 2));
  },
  bone: function (c) {
    return '<g transform="rotate(-18 50 50)">' + sh(c, 'body', '#fff3d6', blob(22, 40, 11, 11, 1)) + sh(c, 'body', '#fff3d6', blob(22, 60, 11, 11, 2)) +
      sh(c, 'body', '#fff3d6', blob(78, 40, 11, 11, 3)) + sh(c, 'body', '#fff3d6', blob(78, 60, 11, 11, 4)) +
      fl(c, 'body', '#fff3d6', 'M24 41L76 41L76 59L24 59Z') + ln(c, 'M30 41L70 41M30 59L70 59') + '</g>';
  },
  heart: function (c) { return sh(c, 'body', '#ef6f8a', 'M50 85C21 63 9 45 14 30C19 13 41 12 50 31C59 12 81 13 86 30C91 45 79 63 50 85Z'); },
  pail: function (c) {
    return ln(c, 'M22 38Q50 -8 78 38') + sh(c, 'body', '#7cc6b8', poly([[21, 38], [79, 38], [70, 88], [30, 88]], 4)) + sh(c, 'rim', '#f7c85a', blob(50, 38, 31, 7, 5, 0.04)) +
      sh(c, 'band', '#fff7e0', poly([[25, 58], [75, 58], [73, 70], [27, 70]], 6));
  },
  flag: function (c) {
    return ln(c, 'M24 94L24 9') + sh(c, 'body', '#5bb5a6', poly([[24, 13], [84, 19], [72, 34], [84, 51], [24, 54]], 7)) + ln(c, 'M34 34q7 -8 14 0t14 0') + dot(24, 8, 4, '#f7c85a');
  },
  tree: function (c) {
    return sh(c, 'trunk', '#c98f5a', curve([[43, 93], [46, 62], [52, 40], [61, 41], [57, 64], [59, 93]], true, 3)) +
      sh(c, 'leaf', '#6fbf7a', blob(27, 38, 25, 11, 4, 0.1)) + sh(c, 'leaf', '#6fbf7a', blob(78, 38, 24, 11, 5, 0.1)) + sh(c, 'leaf', '#7fcf8a', blob(53, 23, 24, 13, 6, 0.1)) +
      dot(50, 42, 5, '#9a6a3e') + dot(60, 44, 5, '#9a6a3e');
  },
  hat: function (c) {
    return sh(c, 'brim', '#f7d98a', blob(50, 68, 43, 12, 3, 0.04)) + sh(c, 'body', '#f7c85a', curve([[25, 66], [29, 35], [50, 24], [71, 35], [75, 66], [50, 70]], true, 4)) +
      sh(c, 'band', '#e8574b', poly([[26.5, 54], [73.5, 54], [75, 65], [25, 65]], 5));
  },
  ball: function (c) {
    return sh(c, 'body', '#f7c85a', blob(50, 50, 37, 37, 2, 0.02)) + sh(c, 'a', '#ef6f5b', 'M50 13C35 30 35 70 50 87C29 85 13 69 13 50C13 31 29 15 50 13Z') +
      sh(c, 'b', '#5bb5a6', 'M50 13C65 30 65 70 50 87C71 85 87 69 87 50C87 31 71 15 50 13Z');
  },
  dog: function (c) {
    return sh(c, 'ear', '#9a6a3e', blob(20, 46, 12, 23, 1)) + sh(c, 'ear', '#9a6a3e', blob(80, 46, 12, 23, 2)) + sh(c, 'body', '#e8b36b', blob(50, 50, 31, 31, 3)) +
      sh(c, 'spot', '#9a6a3e', blob(38, 41, 12, 11, 4)) + sh(c, 'snout', '#fff3d6', blob(50, 65, 17, 13, 5)) + sh(c, null, INK, blob(50, 59, 6, 5, 6)) +
      dot(38, 42, 3.5) + dot(61, 42, 3.5) + ln(c, 'M50 64L50 69M43 70Q50 76 57 70');
  },
  lighthouse: function (c) {
    return sh(c, 'body', '#fff7e0', poly([[35, 92], [42, 30], [58, 30], [65, 92]], 3)) + sh(c, 'stripe', '#e8574b', poly([[40.6, 44], [59.4, 44], [61, 58], [39, 58]], 4)) +
      sh(c, 'stripe', '#e8574b', poly([[37.4, 73], [62.6, 73], [65, 92], [35, 92]], 5)) + sh(c, 'lamp', '#f7c85a', poly([[40, 17], [60, 17], [60, 30], [40, 30]], 6)) +
      sh(c, 'roof', '#e8574b', poly([[35, 18], [50, 5], [65, 18]], 7));
  },
  icecream: function (c) {
    return sh(c, 'cone', '#e9b77a', poly([[31, 48], [69, 48], [50, 95]], 3)) + ln(c, 'M38 56L56 76M62 56L45 76') + sh(c, 'body', '#f6b8c0', blob(50, 34, 25, 22, 4)) + sh(c, 'cherry', '#e8574b', blob(52, 11, 7, 7, 5));
  },
  anchor: function (c) {
    return sh(c, 'body', '#6b8fb3', 'M13 58L25 55C29 71 40 79 50 79C60 79 71 71 75 55L87 58C84 81 66 93 50 93C34 93 16 81 13 58Z') +
      sh(c, 'body', '#6b8fb3', poly([[45, 26], [55, 26], [55, 84], [45, 84]], 3)) + sh(c, 'body', '#6b8fb3', poly([[31, 36], [69, 36], [69, 45], [31, 45]], 4)) +
      '<circle cx="50" cy="17" r="9" fill="none" stroke="' + INK + '" stroke-width="' + c.sw * 1.6 + '"/><circle cx="50" cy="17" r="9" fill="none" stroke="#6b8fb3" stroke-width="' + c.sw * 0.7 + '"/>';
  },
  rainbow: function (c) {
    function band(o, i) { return 'M' + (50 - o) + ' 78A' + o + ' ' + o + ' 0 0 1 ' + (50 + o) + ' 78L' + (50 + i) + ' 78A' + i + ' ' + i + ' 0 0 0 ' + (50 - i) + ' 78Z'; }
    return sh(c, 'a', '#ef6f5b', band(44, 33)) + sh(c, 'b', '#f7c85a', band(33, 22)) + sh(c, 'c', '#5bb5a6', band(22, 11)) +
      sh(c, 'cloud', '#ffffff', blob(14, 80, 14, 9, 3)) + sh(c, 'cloud', '#ffffff', blob(86, 80, 14, 9, 4));
  },
  paw: function (c) {
    return sh(c, 'body', '#9a6a3e', blob(50, 64, 22, 18, 3)) + sh(c, 'toe', '#9a6a3e', blob(22, 42, 9, 11, 4)) + sh(c, 'toe', '#9a6a3e', blob(41, 27, 9, 12, 5)) +
      sh(c, 'toe', '#9a6a3e', blob(61, 27, 9, 12, 6)) + sh(c, 'toe', '#9a6a3e', blob(79, 42, 9, 11, 7));
  },
  crayon: function (c) {
    return '<g transform="rotate(38 50 50)">' + sh(c, 'tip', '#f08a6b', poly([[40, 20], [50, 3], [60, 20]], 3)) + sh(c, 'body', '#f08a6b', poly([[37, 20], [63, 20], [63, 94], [37, 94]], 4)) +
      sh(c, 'wrap', '#fff3d6', poly([[37, 38], [63, 38], [63, 74], [37, 74]], 5)) + ln(c, 'M43 50q7 -7 14 0M43 62q7 -7 14 0') + '</g>';
  }
};
var ITEM_NAMES = {
  crab: 'crab', star: 'starfish', fish: 'fish', shell: 'shell', jelly: 'jellyfish', octo: 'octopus', snail: 'snail', turtle: 'turtle', whale: 'whale', boat: 'boat',
  sun: 'sun', kite: 'kite', bone: 'bone', heart: 'heart', pail: 'pail', flag: 'flag', tree: 'tree', hat: 'hat', ball: 'ball', dog: 'dog', lighthouse: 'lighthouse',
  icecream: 'ice cream', anchor: 'anchor', rainbow: 'rainbow', paw: 'paw print', crayon: 'crayon'
};
function item(c, name) { return withJ(0.55, function () { return ITEMS[name](c); }); }
function itemAt(c, name, x, y, s, pre) { return '<g transform="translate(' + x + ' ' + y + ') scale(' + s + ')">' + item(c.sub(pre || name + '_', r1(3.2 / s * (c.sw / 4))), name) + '</g>'; }
function itemSVG(name, cls) { return '<svg viewBox="-3 -3 106 106" class="' + (cls || 'it') + '" aria-hidden="true">' + item(ctx('art', null, '', 3.4), name) + '</svg>'; }

/* ---------- the kids (200 x 320 box) ---------- */
var KIDS = {
  jonah: { name: 'Jonah', skin: '#f6cfa6', hair: '#b9824a', shirt: '#5bb5a6', shorts: '#e8574b', shoes: '#f7c85a' },
  dez: { name: 'Dez', skin: '#8a5a3c', hair: '#2e2a2a', shirt: '#f7c85a', shorts: '#4f7fb5', shoes: '#ef6f5b' },
  priya: { name: 'Priya', skin: '#c98f62', hair: '#2b2233', shirt: '#b08fd6', shorts: '#f08ab0', shoes: '#5bb5a6' },
  tuck: { name: 'Tuck', skin: '#fbdcc0', hair: '#e0703a', shirt: '#7fbf7a', shorts: '#6b8fb3', shoes: '#e8574b' }
};
function kid(c, who, o) {
  o = o || {}; var k = KIDS[who], s = '';
  if (who === 'priya') {
    [106, 129, 151].forEach(function (y, i) { s += sh(c, 'hair', k.hair, blob(45, y, 11, 13, y)) + sh(c, 'hair', k.hair, blob(155, y, 11, 13, y + 1)); });
    s += sh(c, 'tie', '#f7c85a', blob(45, 167, 8, 6, 3)) + sh(c, 'tie', '#f7c85a', blob(155, 167, 8, 6, 4));
  }
  s += sh(c, 'skin', k.skin, poly([[72, 225], [92, 225], [91, 287], [73, 287]], 1, true, 1)) + sh(c, 'skin', k.skin, poly([[108, 225], [128, 225], [127, 287], [109, 287]], 2, true, 1));
  s += sh(c, 'shoes', k.shoes, blob(77, 294, 20, 11, 3)) + sh(c, 'shoes', k.shoes, blob(124, 294, 20, 11, 4));
  s += sh(c, 'shorts', k.shorts, poly([[61, 186], [139, 186], [144, 240], [104, 240], [100, 216], [96, 240], [56, 240]], 5, true, 1.2));
  s += sh(c, 'skin', k.skin, poly([[66, 124], [45, 138], [33, 180], [48, 188], [58, 152], [70, 146]], 6, true, 1)) + sh(c, 'skin', k.skin, blob(39, 187, 10, 10, 7));
  if (o.wave) s += sh(c, 'skin', k.skin, poly([[130, 140], [150, 118], [160, 70], [176, 74], [168, 128], [140, 152]], 8, true, 1)) + sh(c, 'skin', k.skin, blob(170, 64, 11, 11, 9));
  else s += sh(c, 'skin', k.skin, poly([[134, 124], [155, 138], [167, 180], [152, 188], [142, 152], [130, 146]], 8, true, 1)) + sh(c, 'skin', k.skin, blob(161, 187, 10, 10, 9));
  s += sh(c, 'shirt', k.shirt, poly([[65, 116], [135, 116], [143, 195], [57, 195]], 10, true, 1.2));
  if (who === 'jonah') s += ln(c, 'M62 146L138 146M60 168L140 168');
  if (who === 'dez') s += '<g transform="translate(78 132) scale(.44)">' + item(c.sub('badge_', 7), 'star') + '</g>';
  if (who === 'priya') s += '<g transform="translate(82 138) scale(.36)">' + item(c.sub('badge_', 8), 'heart') + '</g>';
  if (who === 'tuck') s += ln(c, 'M80 166L120 166L118 190M82 166L82 190M100 118L100 150');
  s += sh(c, 'skin', k.skin, blob(54, 84, 9, 10, 11)) + sh(c, 'skin', k.skin, blob(146, 84, 9, 10, 12)) + sh(c, 'skin', k.skin, blob(100, 78, 47, 45, 13, 0.035));
  if (who === 'jonah') s += sh(c, 'hair', k.hair, curve([[53, 72], [51, 42], [68, 24], [87, 30], [98, 15], [113, 28], [131, 23], [147, 44], [149, 73], [135, 56], [118, 63], [100, 52], [82, 63], [66, 56]], true, 3));
  if (who === 'dez') s += sh(c, 'hair', k.hair, curve([[55, 68], [51, 36], [62, 14], [78, 12], [90, 4], [104, 10], [118, 3], [134, 13], [148, 34], [146, 68], [132, 50], [100, 45], [68, 50]], true, 4));
  if (who === 'priya') s += sh(c, 'hair', k.hair, curve([[50, 90], [48, 50], [65, 28], [100, 21], [135, 28], [152, 50], [150, 90], [139, 62], [112, 46], [100, 52], [84, 46], [61, 62]], true, 5));
  if (who === 'tuck') {
    s += sh(c, 'hair', k.hair, blob(55, 68, 9, 10, 2)) + sh(c, 'hair', k.hair, blob(145, 68, 9, 10, 3));
    s += sh(c, 'hat', '#f3dfb3', poly([[63, 50], [70, 13], [130, 13], [137, 50]], 6, true, 1.2)) + sh(c, 'hat', '#f3dfb3', poly([[36, 47], [164, 47], [155, 63], [45, 63]], 7, true, 1.2));
  }
  s += dot(84, 84, 5) + dot(116, 84, 5) + ln(c, 'M85 99Q100 112 115 99');
  s += deco(c, '<circle cx="70" cy="97" r="8" fill="#f08a6b" opacity=".35"/><circle cx="130" cy="97" r="8" fill="#f08a6b" opacity=".35"/>');
  if (who === 'jonah') s += dot(66, 92, 1.6) + dot(73, 96, 1.6) + dot(127, 96, 1.6) + dot(134, 92, 1.6);
  if (who === 'dez') s += '<g fill="none" stroke="' + INK + '" stroke-width="' + r1(c.sw * 0.8) + '"><circle cx="84" cy="84" r="13"/><circle cx="116" cy="84" r="13"/><path d="M97 84L103 84"/></g>';
  return s;
}
function kidAt(c, who, x, y, s, o) { return '<g transform="translate(' + x + ' ' + y + ') scale(' + s + ')">' + kid(c.sub(who + '_', r1(4 / s * (c.sw / 4))), who, o) + '</g>'; }
function kidSVG(who, o, cls) { return '<svg viewBox="16 -4 172 316" class="' + (cls || 'kid') + '" aria-hidden="true">' + kid(ctx('art', null, '', 4), who, o) + '</svg>'; }
function headSVG(who, cls) { return '<svg viewBox="30 -2 140 134" class="' + (cls || 'head') + '" aria-hidden="true">' + kid(ctx('art', null, '', 4.5), who) + '</svg>'; }

/* ---------- Pickles (400 box, side view, faces right) ---------- */
function pickles(c) {
  var clip = [];
  function P(id, col, d, extra) { clip.push(d); return sh(c, id, col, d, extra); }
  function leg(x, cls, id, col) { return '<g class="leg ' + cls + '">' + P(id, col, poly([[x, 250], [x + 30, 250], [x + 31, 332], [x + 40, 344], [x - 3, 346], [x, 332]], x, true, 1.4)) + '</g>'; }
  var s = '';
  s += '<g class="tail">' + P('pk_tail', '#e8b36b', curve([[112, 224], [78, 188], [60, 150], [66, 131], [83, 138], [99, 170], [134, 200]], true, 3)) + '</g>';
  s += leg(152, 'l2', 'pk_legb', '#cf9a55') + leg(264, 'l1', 'pk_legb', '#cf9a55');
  s += leg(118, 'l1', 'pk_legf', '#e8b36b') + leg(232, 'l2', 'pk_legf', '#e8b36b');
  s += P('pk_body', '#e8b36b', blob(200, 232, 104, 60, 11, 0.035));
  s += sh(c, 'pk_patch', '#fff3d6', blob(170, 222, 31, 23, 12));
  s += P('pk_collar', '#e8574b', poly([[246, 184], [292, 214], [283, 232], [238, 203]], 5, true, 1.2));
  s += sh(c, 'pk_tag', '#f7c85a', blob(268, 232, 9, 9, 6));
  s += '<g class="hd">' + P('pk_head', '#e8b36b', blob(300, 152, 60, 56, 13, 0.035));
  s += sh(c, 'pk_tongue', '#f58aa0', curve([[339, 194], [357, 194], [356, 213], [347, 218], [340, 212]], true, 4));
  s += P('pk_snout', '#fff3d6', blob(350, 174, 36, 27, 14, 0.04));
  s += sh(c, null, INK, blob(380, 162, 11, 9, 15)) + ln(c, 'M352 185Q362 195 375 187');
  s += sh(c, 'pk_spot', '#9a6a3e', blob(318, 138, 23, 21, 16));
  s += '<circle cx="320" cy="140" r="8" fill="' + INK + '"/><circle cx="323" cy="137" r="2.6" fill="#fff"/>';
  s += P('pk_ear', '#9a6a3e', curve([[268, 103], [246, 116], [232, 160], [240, 197], [262, 192], [280, 150], [287, 118]], true, 7)) + '</g>';
  return { html: s, clip: clip };
}
function strokeHTML(st) {
  var p = st.p, d = 'M' + p[0] + ' ' + p[1];
  if (p.length < 4) d += 'l.1 0'; else for (var i = 2; i < p.length; i += 2) d += 'L' + p[i] + ' ' + p[i + 1];
  return '<path d="' + d + '" fill="none" stroke="' + st.c + '" stroke-width="' + st.w + '" stroke-linecap="round" stroke-linejoin="round"/>';
}
var pkN = 0;
/* The Pickles sprite: uses the child's own colouring (fills + crayon strokes) once they have coloured him. */
function picklesSVG(saved, strokes, cls) {
  var has = false, k; saved = saved || {}; strokes = strokes || [];
  for (k in saved) if (k.indexOf('pk_') === 0) { has = true; break; }
  if (strokes.length) has = true;
  var p = pickles(ctx(has ? 'color' : 'art', saved, '', 5)), id = 'pkc' + (pkN++);
  var st = strokes.length ? '<defs><clipPath id="' + id + '">' + p.clip.map(function (d) { return '<path d="' + d + '"/>'; }).join('') + '</clipPath></defs>' : '';
  return '<svg viewBox="52 86 346 268" class="' + (cls || 'pk') + '" aria-hidden="true">' + st + p.html +
    (strokes.length ? '<g clip-path="url(#' + id + ')" class="strokes" opacity=".92">' + strokes.map(strokeHTML).join('') + '</g>' : '') + '</svg>';
}

/* ---------- colouring pages (400 x 400) ---------- */
function rect(x, y, w, h) { return [[x, y], [x + w, y], [x + w, y + h], [x, y + h]]; }
function treehouse(c) {
  var s = '';
  s += sh(c, 'trunk', '#b98556', poly([[168, 392], [180, 250], [150, 190], [250, 190], [222, 250], [234, 392]], 3));
  s += sh(c, 'leaf1', '#7fbf7a', blob(95, 150, 78, 62, 4)) + sh(c, 'leaf2', '#6fb06e', blob(305, 148, 80, 64, 5)) + sh(c, 'leaf3', '#8fcf86', blob(200, 78, 104, 62, 6));
  s += ln(c, 'M248 262L262 392M276 262L290 392M252 290L280 290M255 320L283 320M258 350L286 350M261 378L289 378');
  s += sh(c, 'deck', '#d9a66b', poly([[104, 250], [300, 250], [300, 266], [104, 266]], 7));
  s += sh(c, 'house', '#f3d9a4', poly(rect(124, 150, 156, 100), 8)) + sh(c, 'roof', '#f08a6b', poly([[108, 154], [202, 86], [296, 154]], 9));
  s += sh(c, 'door', '#5bb5a6', poly([[222, 250], [222, 192], [258, 192], [258, 250]], 10)) + dot(250, 224, 3);
  s += sh(c, 'window', '#cdeef0', blob(166, 198, 22, 22, 11, 0.03)) + ln(c, 'M144 198L188 198M166 176L166 220');
  s += ln(c, 'M202 88L202 46') + sh(c, 'flag', '#f7c85a', poly([[202, 48], [240, 56], [202, 68]], 12));
  return s;
}
var PAGES = [
  { id: 'pickles', name: 'Pickles', draw: function (c) {
    return sh(c, 'sky', '#cdeef0', poly(rect(-4, -4, 408, 310), 1)) + sh(c, 'sun', '#f7c85a', blob(62, 60, 34, 34, 2)) +
      sh(c, 'cloud', '#ffffff', blob(300, 52, 46, 20, 3, 0.1)) +
      sh(c, 'grass', '#a9d59a', curve([[-6, 318], [90, 304], [210, 316], [330, 304], [406, 316], [406, 406], [-6, 406]], true, 4)) +
      itemAt(c, 'ball', 6, 318, 0.62) + itemAt(c, 'bone', 300, 338, 0.56) + pickles(c).html;
  } },
  { id: 'jonah', name: 'Jonah at the beach', draw: function (c) {
    return sh(c, 'sky', '#cdeef0', poly(rect(-4, -4, 408, 220), 1)) + sh(c, 'sun', '#f7c85a', blob(60, 56, 32, 32, 2)) +
      sh(c, 'sea', '#8fd0c6', curve([[-6, 196], [70, 186], [150, 198], [240, 186], [330, 198], [406, 188], [406, 270], [-6, 270]], true, 3)) +
      sh(c, 'sand', '#f3dfb3', curve([[-6, 258], [100, 250], [220, 262], [330, 250], [406, 258], [406, 406], [-6, 406]], true, 4)) +
      sh(c, 'castle', '#f0cf8d', poly([[22, 350], [22, 286], [36, 286], [36, 296], [50, 296], [50, 268], [64, 268], [64, 278], [78, 278], [78, 268], [92, 268], [92, 296], [106, 296], [106, 286], [120, 286], [120, 350]], 5)) +
      sh(c, 'cdoor', '#c98f5a', 'M60 350L60 326Q71 310 82 326L82 350Z') + ln(c, 'M71 268L71 240') + sh(c, 'cflag', '#e8574b', poly([[71, 240], [92, 247], [71, 254]], 6)) +
      ln(c, 'M322 132Q318 80 330 62') + itemAt(c, 'kite', 296, -4, 0.78) + kidAt(c, 'jonah', 150, 78, 1, { wave: true }) + itemAt(c, 'pail', 322, 318, 0.6);
  } },
  { id: 'club', name: 'The Low Tide Club', draw: function (c) {
    return sh(c, 'sky', '#cdeef0', poly(rect(-4, -4, 408, 250), 1)) + sh(c, 'sun', '#f7c85a', blob(346, 54, 30, 30, 2)) + sh(c, 'cloud', '#ffffff', blob(84, 50, 50, 20, 3, 0.1)) +
      sh(c, 'sea', '#8fd0c6', curve([[-6, 214], [80, 204], [170, 216], [260, 204], [340, 216], [406, 206], [406, 280], [-6, 280]], true, 4)) +
      sh(c, 'sand', '#f3dfb3', curve([[-6, 272], [100, 264], [220, 276], [330, 264], [406, 272], [406, 406], [-6, 406]], true, 5)) +
      itemAt(c, 'flag', 158, 62, 0.9) + kidAt(c, 'dez', 0, 160, 0.68) + kidAt(c, 'priya', 132, 172, 0.68) + kidAt(c, 'tuck', 264, 160, 0.68) +
      itemAt(c, 'shell', 108, 356, 0.36) + itemAt(c, 'star', 246, 352, 0.4);
  } },
  { id: 'lighthouse', name: 'The lighthouse', draw: function (c) {
    return sh(c, 'sky', '#cdeef0', poly(rect(-4, -4, 408, 290), 1)) + sh(c, 'sun', '#f7c85a', blob(58, 62, 32, 32, 2)) + sh(c, 'cloud', '#ffffff', blob(318, 60, 48, 20, 3, 0.1)) +
      sh(c, 'beam', '#fbe9a8', poly([[200, 84], [20, 30], [20, 120]], 4)) + sh(c, 'beam', '#fbe9a8', poly([[200, 84], [380, 120], [380, 150]], 5)) +
      sh(c, 'sea', '#8fd0c6', curve([[-6, 268], [70, 258], [150, 270], [240, 258], [330, 270], [406, 260], [406, 406], [-6, 406]], true, 6)) +
      itemAt(c, 'boat', 296, 250, 0.8) + itemAt(c, 'whale', 14, 300, 0.7) +
      sh(c, 'rock', '#c9c2b4', curve([[96, 392], [110, 340], [160, 322], [240, 320], [292, 340], [306, 392]], true, 7)) +
      sh(c, 'tower', '#fff7e0', poly([[150, 340], [170, 112], [230, 112], [250, 340]], 8)) +
      sh(c, 'stripe1', '#e8574b', poly([[165, 170], [235, 170], [239, 216], [161, 216]], 9)) + sh(c, 'stripe2', '#e8574b', poly([[156.5, 266], [243.5, 266], [247.6, 312], [152.4, 312]], 10)) +
      sh(c, 'door', '#5bb5a6', 'M186 340L186 318Q200 302 214 318L214 340Z') + sh(c, 'gallery', '#6b8fb3', poly(rect(158, 104, 84, 12), 11)) +
      sh(c, 'lamp', '#f7c85a', poly(rect(174, 64, 52, 40), 12)) + ln(c, 'M200 64L200 104') + sh(c, 'roof', '#e8574b', poly([[164, 66], [200, 34], [236, 66]], 13));
  } },
  { id: 'treehouse', name: 'The treehouse', draw: function (c) {
    return sh(c, 'sky', '#cdeef0', poly(rect(-4, -4, 408, 340), 1)) + sh(c, 'sun', '#f7c85a', blob(352, 50, 28, 28, 2)) +
      sh(c, 'grass', '#a9d59a', curve([[-6, 340], [100, 330], [220, 342], [330, 330], [406, 340], [406, 406], [-6, 406]], true, 3)) + treehouse(c) +
      itemAt(c, 'dog', 60, 310, 0.72) + itemAt(c, 'bone', 320, 346, 0.5);
  } },
  { id: 'tidepool', name: 'Tide pool friends', draw: function (c) {
    return sh(c, 'sand', '#f3dfb3', poly(rect(-4, -4, 408, 408), 1)) + sh(c, 'water', '#bfe8e0', blob(200, 205, 176, 160, 2, 0.05)) +
      sh(c, 'rock1', '#c9c2b4', blob(52, 60, 50, 36, 3, 0.1)) + sh(c, 'rock2', '#b9b2a4', blob(350, 344, 52, 40, 4, 0.1)) + sh(c, 'rock3', '#c9c2b4', blob(346, 52, 40, 30, 5, 0.1)) +
      itemAt(c, 'crab', 40, 150, 1.05) + itemAt(c, 'star', 232, 60, 0.95) + itemAt(c, 'fish', 140, 78, 0.9) + itemAt(c, 'shell', 20, 300, 0.8) +
      itemAt(c, 'snail', 150, 286, 0.9) + itemAt(c, 'jelly', 264, 170, 0.95) + itemAt(c, 'turtle', 130, 180, 1.05);
  } }
];
function pageInner(id, mode, saved) { var pg = PAGES.filter(function (p) { return p.id === id; })[0]; return pg.draw(ctx(mode, saved, '', 4)); }
function pageSVG(id, saved, strokes, cls) {
  return '<svg viewBox="0 0 400 400" class="' + (cls || 'page') + '" aria-hidden="true">' + pageInner(id, 'color', saved || {}) +
    '<g class="strokes" opacity=".92">' + (strokes || []).map(strokeHTML).join('') + '</g></svg>';
}
function sceneSVG() {
  var c = ctx('art', null, '', 4);
  return '<svg viewBox="0 0 400 400" class="scene-art" aria-hidden="true">' + sh(c, null, '#cdeef0', poly(rect(-4, -4, 408, 340), 1)) + sh(c, null, '#f7c85a', blob(352, 50, 28, 28, 2)) +
    sh(c, null, '#ffffff', blob(70, 46, 44, 18, 3, 0.1)) + sh(c, null, '#a9d59a', curve([[-6, 340], [100, 330], [220, 342], [330, 330], [406, 340], [406, 406], [-6, 406]], true, 3)) + treehouse(c) + '</svg>';
}

var A = { INK: INK, rng: rng, blob: blob, poly: poly, curve: curve, smooth: smooth, withJ: withJ, ctx: ctx, sh: sh, fl: fl, ln: ln, dot: dot, eye: eye,
  ITEMS: ITEMS, ITEM_NAMES: ITEM_NAMES, item: item, itemAt: itemAt, itemSVG: itemSVG, KIDS: KIDS, kid: kid, kidAt: kidAt, kidSVG: kidSVG, headSVG: headSVG,
  pickles: pickles, picklesSVG: picklesSVG, strokeHTML: strokeHTML, PAGES: PAGES, pageSVG: pageSVG, pageInner: pageInner, sceneSVG: sceneSVG, treehouse: treehouse, rect: rect };
root.A = A;
if (typeof module !== 'undefined') module.exports = A;
})(typeof window !== 'undefined' ? window : globalThis);
