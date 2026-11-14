/* Vilasi Timepieces — dial renderer. Draws a watch in SVG from its attributes. */
'use strict';
var NUMFONT = "Didot,'Bodoni 72','Bodoni MT','Hoefler Text','Playfair Display',Georgia,serif";
var CONDFONT = "'Avenir Next Condensed','DIN Condensed','Arial Narrow','Helvetica Neue',sans-serif";
var CASES = {
  steel: ['#f3f5f7', '#aab0b7', '#555c63'],
  gold: ['#fbe9b4', '#d0a64a', '#77561b'],
  black: ['#62666b', '#2b2e32', '#0b0c0e'],
  bronze: ['#e9bf92', '#a66d3c', '#573618'],
  titanium: ['#c6c8c8', '#868a8b', '#414546']
};
function hex2rgb(h) {
  h = String(h || '#111111').replace('#', '');
  if (h.length === 3) h = h.split('').map(function (c) { return c + c; }).join('');
  var n = parseInt(h, 16); if (isNaN(n)) n = 0x111111;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function mix(a, b, t) {
  var A = hex2rgb(a), B = hex2rgb(b);
  return '#' + A.map(function (v, i) { return Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0'); }).join('');
}
function lum(h) { var c = hex2rgb(h); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; }
function pt(a, r) { var t = a * Math.PI / 180; return [r * Math.sin(t), -r * Math.cos(t)]; }
function n2(v) { return (Math.round(v * 100) / 100).toString(); }
function caseRadius(w) { var d = Math.min(48, Math.max(30, +w.diameter || 40)); return 128 * d / 44; }

function handShape(kind, style, L, k, fill, lume, showLume) {
  var s = '', c;
  var lu = function (d) { return showLume ? '<path d="' + d + '" fill="' + lume + '"/>' : ''; };
  if (kind === 'h') {
    if (style === 'dauphine') {
      s += '<path d="M0 ' + n2(-L) + 'L' + n2(6 * k) + ' ' + n2(-7 * k) + 'L0 ' + n2(10 * k) + 'L' + n2(-6 * k) + ' ' + n2(-7 * k) + 'Z" fill="' + fill + '"/>';
      s += '<path d="M0 ' + n2(-L) + 'L' + n2(6 * k) + ' ' + n2(-7 * k) + 'L0 ' + n2(10 * k) + 'Z" fill="#000" opacity=".25"/>';
    } else if (style === 'sword') {
      s += '<path d="M0 ' + n2(-L) + 'L' + n2(5 * k) + ' ' + n2(-L * .3) + 'L' + n2(2.6 * k) + ' ' + n2(9 * k) + 'L' + n2(-2.6 * k) + ' ' + n2(9 * k) + 'L' + n2(-5 * k) + ' ' + n2(-L * .3) + 'Z" fill="' + fill + '"/>';
      s += lu('M0 ' + n2(-L + 7 * k) + 'L' + n2(2.6 * k) + ' ' + n2(-L * .32) + 'L0 ' + n2(-L * .14) + 'L' + n2(-2.6 * k) + ' ' + n2(-L * .32) + 'Z');
    } else if (style === 'mercedes') {
      s += '<rect x="' + n2(-1.9 * k) + '" y="' + n2(-L * .56) + '" width="' + n2(3.8 * k) + '" height="' + n2(L * .56 + 9 * k) + '" fill="' + fill + '"/>';
      s += '<circle cx="0" cy="' + n2(-L * .7) + '" r="' + n2(7.6 * k) + '" fill="' + (showLume ? lume : 'none') + '" stroke="' + fill + '" stroke-width="' + n2(2.2 * k) + '"/>';
      s += '<path d="M0 ' + n2(-L * .7) + 'V' + n2(-L * .7 - 7.6 * k) + 'M0 ' + n2(-L * .7) + 'L' + n2(6.5 * k) + ' ' + n2(-L * .7 + 3.9 * k) + 'M0 ' + n2(-L * .7) + 'L' + n2(-6.5 * k) + ' ' + n2(-L * .7 + 3.9 * k) + '" stroke="' + fill + '" stroke-width="' + n2(1.3 * k) + '"/>';
      s += '<path d="M0 ' + n2(-L) + 'L' + n2(3.6 * k) + ' ' + n2(-L * .85) + 'L' + n2(-3.6 * k) + ' ' + n2(-L * .85) + 'Z" fill="' + fill + '"/>';
    } else if (style === 'snowflake') {
      c = -L + 10.5 * k;
      s += '<rect x="' + n2(-2.2 * k) + '" y="' + n2(c) + '" width="' + n2(4.4 * k) + '" height="' + n2(-c + 9 * k) + '" fill="' + fill + '"/>';
      s += '<path d="M0 ' + n2(c - 10.5 * k) + 'L' + n2(9.5 * k) + ' ' + n2(c) + 'L0 ' + n2(c + 10.5 * k) + 'L' + n2(-9.5 * k) + ' ' + n2(c) + 'Z" fill="' + fill + '"/>';
      s += lu('M0 ' + n2(c - 7 * k) + 'L' + n2(6.3 * k) + ' ' + n2(c) + 'L0 ' + n2(c + 7 * k) + 'L' + n2(-6.3 * k) + ' ' + n2(c) + 'Z');
    } else if (style === 'arrow') {
      s += '<rect x="' + n2(-2.2 * k) + '" y="' + n2(-L * .55) + '" width="' + n2(4.4 * k) + '" height="' + n2(L * .55 + 9 * k) + '" fill="' + fill + '"/>';
      s += '<path d="M0 ' + n2(-L) + 'L' + n2(10.5 * k) + ' ' + n2(-L * .5) + 'L' + n2(-10.5 * k) + ' ' + n2(-L * .5) + 'Z" fill="' + fill + '"/>';
      s += lu('M0 ' + n2(-L + 8 * k) + 'L' + n2(6.4 * k) + ' ' + n2(-L * .56) + 'L' + n2(-6.4 * k) + ' ' + n2(-L * .56) + 'Z');
    } else {
      s += '<rect x="' + n2(-3.3 * k) + '" y="' + n2(-L) + '" width="' + n2(6.6 * k) + '" height="' + n2(L + 9 * k) + '" rx="' + n2(k) + '" fill="' + fill + '"/>';
      s += showLume ? '<rect x="' + n2(-1.6 * k) + '" y="' + n2(-L + 3 * k) + '" width="' + n2(3.2 * k) + '" height="' + n2(L * .6) + '" fill="' + lume + '"/>' : '';
    }
  } else {
    if (style === 'dauphine') {
      s += '<path d="M0 ' + n2(-L) + 'L' + n2(4.6 * k) + ' ' + n2(-7 * k) + 'L0 ' + n2(10 * k) + 'L' + n2(-4.6 * k) + ' ' + n2(-7 * k) + 'Z" fill="' + fill + '"/>';
      s += '<path d="M0 ' + n2(-L) + 'L' + n2(4.6 * k) + ' ' + n2(-7 * k) + 'L0 ' + n2(10 * k) + 'Z" fill="#000" opacity=".25"/>';
    } else if (style === 'baton' || style === 'snowflake') {
      var hw = style === 'snowflake' ? 3.4 : 2.6;
      s += '<rect x="' + n2(-hw * k) + '" y="' + n2(-L) + '" width="' + n2(2 * hw * k) + '" height="' + n2(L + 9 * k) + '" rx="' + n2(k) + '" fill="' + fill + '"/>';
      s += showLume ? '<rect x="' + n2(-hw * .5 * k) + '" y="' + n2(-L + 3 * k) + '" width="' + n2(hw * k) + '" height="' + n2(L * .62) + '" fill="' + lume + '"/>' : '';
    } else {
      s += '<path d="M0 ' + n2(-L) + 'L' + n2(4 * k) + ' ' + n2(-L * .28) + 'L' + n2(2.2 * k) + ' ' + n2(9 * k) + 'L' + n2(-2.2 * k) + ' ' + n2(9 * k) + 'L' + n2(-4 * k) + ' ' + n2(-L * .28) + 'Z" fill="' + fill + '"/>';
      s += lu('M0 ' + n2(-L + 8 * k) + 'L' + n2(2 * k) + ' ' + n2(-L * .3) + 'L0 ' + n2(-L * .1) + 'L' + n2(-2 * k) + ' ' + n2(-L * .3) + 'Z');
    }
  }
  return s;
}

/* Returns inner SVG markup for a watch centred on 0,0. o: {p: id prefix, mini: bool, live: bool} */
function drawWatch(w, o) {
  o = o || {};
  var p = o.p || ('d' + w.id);
  var R = o.mini ? 116 : caseRadius(w);
  var cs = CASES[w.caseFinish] || CASES.steel;
  var dial = w.dial || '#111214';
  var light = lum(dial) > 0.55;
  var hasBez = w.bezel && w.bezel !== 'plain';
  var dR = hasBez ? R * 0.74 : R * 0.86;
  var k = dR / 100;
  var ink = light ? '#16181b' : '#f1efe6';
  var lume = light ? '#1b1e21' : '#dfffe8';
  var warm = (w.caseFinish === 'gold' || w.caseFinish === 'bronze');
  var metal = warm ? cs[0] : (light ? '#24282c' : '#eef0f2');
  var bezC = w.bezelColor || '#121316';
  var bezInk = lum(bezC) > 0.55 ? '#16181b' : '#e9e7de';
  var strapCol = w.strap === 'bracelet' ? cs[1] : (w.strapColor || { leather: '#5b3a22', rubber: '#16181b', nato: '#3b463c' }[w.strap] || '#333');
  var accent = w.accent || (light ? '#b3261e' : '#f2efe4');
  var s = '', i, a, q, x, y;

  s += '<defs>' +
    '<linearGradient id="' + p + 'c" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + cs[0] + '"/><stop offset=".48" stop-color="' + cs[1] + '"/><stop offset="1" stop-color="' + cs[2] + '"/></linearGradient>' +
    '<linearGradient id="' + p + 'r" x1="1" y1="1" x2="0" y2="0"><stop offset="0" stop-color="' + cs[0] + '"/><stop offset=".5" stop-color="' + cs[1] + '"/><stop offset="1" stop-color="' + cs[2] + '"/></linearGradient>' +
    '<radialGradient id="' + p + 'd" cx=".5" cy=".4" r=".66"><stop offset="0" stop-color="' + mix(dial, '#ffffff', light ? .3 : .13) + '"/><stop offset=".68" stop-color="' + dial + '"/><stop offset="1" stop-color="' + mix(dial, '#000000', light ? .2 : .42) + '"/></radialGradient>' +
    '<linearGradient id="' + p + 's" gradientUnits="userSpaceOnUse" x1="0" y1="-210" x2="0" y2="210"><stop offset="0" stop-color="' + strapCol + '" stop-opacity="0"/><stop offset=".16" stop-color="' + mix(strapCol, '#000000', .25) + '"/><stop offset=".5" stop-color="' + strapCol + '"/><stop offset=".84" stop-color="' + mix(strapCol, '#000000', .25) + '"/><stop offset="1" stop-color="' + strapCol + '" stop-opacity="0"/></linearGradient>' +
    '</defs>';

  /* strap */
  var sw = R * 0.5;
  if (!o.mini) {
    s += '<rect x="' + n2(-sw) + '" y="-210" width="' + n2(sw * 2) + '" height="420" fill="url(#' + p + 's)"/>';
    if (w.strap === 'bracelet') {
      for (y = -200; y <= 200; y += 13) {
        if (Math.abs(y) < R * .9) continue;
        var op = .5 * (1 - (Math.abs(y) - R * .9) / (215 - R * .9));
        s += '<line x1="' + n2(-sw) + '" x2="' + n2(sw) + '" y1="' + y + '" y2="' + y + '" stroke="#000" stroke-width="1.4" opacity="' + n2(op) + '"/>';
      }
      s += '<line x1="' + n2(-sw * .42) + '" x2="' + n2(-sw * .42) + '" y1="-205" y2="205" stroke="#000" opacity=".22"/><line x1="' + n2(sw * .42) + '" x2="' + n2(sw * .42) + '" y1="-205" y2="205" stroke="#000" opacity=".22"/>';
    } else if (w.strap === 'leather') {
      s += '<line x1="' + n2(-sw + 6) + '" x2="' + n2(-sw + 6) + '" y1="-200" y2="200" stroke="#fff" stroke-dasharray="5 4" opacity=".28"/><line x1="' + n2(sw - 6) + '" x2="' + n2(sw - 6) + '" y1="-200" y2="200" stroke="#fff" stroke-dasharray="5 4" opacity=".28"/>';
    } else if (w.strap === 'nato') {
      s += '<rect x="' + n2(-sw * .22) + '" y="-200" width="' + n2(sw * .44) + '" height="400" fill="#000" opacity=".28"/>';
    } else {
      for (y = -196; y <= 196; y += 18) { if (Math.abs(y) < R) continue; s += '<line x1="' + n2(-sw + 8) + '" x2="' + n2(sw - 8) + '" y1="' + y + '" y2="' + y + '" stroke="#fff" opacity=".06" stroke-width="5"/>'; }
    }
  }
  /* lugs + crown */
  s += '<rect x="' + n2(-R * .74) + '" y="' + n2(-R * 1.13) + '" width="' + n2(R * .24) + '" height="' + n2(R * 2.26) + '" rx="7" fill="url(#' + p + 'c)" stroke="#000" stroke-opacity=".5"/>';
  s += '<rect x="' + n2(R * .5) + '" y="' + n2(-R * 1.13) + '" width="' + n2(R * .24) + '" height="' + n2(R * 2.26) + '" rx="7" fill="url(#' + p + 'r)" stroke="#000" stroke-opacity=".5"/>';
  s += '<rect x="' + n2(R - 4) + '" y="-10" width="16" height="20" rx="3" fill="url(#' + p + 'c)" stroke="#000" stroke-opacity=".5"/>';
  for (i = -6; i <= 6; i += 4) s += '<line x1="' + n2(R + 1) + '" x2="' + n2(R + 11) + '" y1="' + i + '" y2="' + i + '" stroke="#000" opacity=".35"/>';
  /* case */
  s += '<circle r="' + n2(R) + '" fill="url(#' + p + 'c)" stroke="#000" stroke-opacity=".55"/>';
  s += '<circle r="' + n2(R * .955) + '" fill="url(#' + p + 'r)"/>';
  if (hasBez) {
    var bo = R * .925, bi = dR * 1.045, bm = (bo + bi) / 2, fs = (bo - bi) * .62;
    s += '<circle r="' + n2(bo) + '" fill="' + bezC + '" stroke="#000" stroke-opacity=".6"/>';
    if (w.bezel === 'dive') {
      for (i = 0; i < 60; i++) {
        if (i === 0) continue;
        if (i % 10 === 0) { s += '<text transform="rotate(' + (i * 6) + ') translate(0 ' + n2(-bm) + ')" text-anchor="middle" dy=".36em" font-family="' + CONDFONT + '" font-weight="600" font-size="' + n2(fs) + '" fill="' + bezInk + '">' + i + '</text>'; }
        else if (i % 5 === 0) { q = pt(i * 6, bi + 3 * k); x = pt(i * 6, bo - 3 * k); s += '<line x1="' + n2(q[0]) + '" y1="' + n2(q[1]) + '" x2="' + n2(x[0]) + '" y2="' + n2(x[1]) + '" stroke="' + bezInk + '" stroke-width="' + n2(3 * k) + '"/>'; }
        else if (i < 15) { q = pt(i * 6, bm - 3 * k); x = pt(i * 6, bm + 3 * k); s += '<line x1="' + n2(q[0]) + '" y1="' + n2(q[1]) + '" x2="' + n2(x[0]) + '" y2="' + n2(x[1]) + '" stroke="' + bezInk + '" stroke-width="' + n2(1.2 * k) + '"/>'; }
      }
    } else if (w.bezel === 'gmt') {
      for (i = 1; i < 24; i++) {
        if (i % 2 === 0) s += '<text transform="rotate(' + (i * 15) + ') translate(0 ' + n2(-bm) + ')" text-anchor="middle" dy=".36em" font-family="' + CONDFONT + '" font-weight="600" font-size="' + n2(fs) + '" fill="' + bezInk + '">' + i + '</text>';
        else { q = pt(i * 15, bm); s += '<circle cx="' + n2(q[0]) + '" cy="' + n2(q[1]) + '" r="' + n2(1.8 * k) + '" fill="' + bezInk + '"/>'; }
      }
    } else {
      [500, 400, 300, 240, 200, 180, 160, 140, 120, 100, 90, 80, 70, 65].forEach(function (v) {
        var ang = 3600 / v * 6;
        s += '<text transform="rotate(' + n2(ang) + ') translate(0 ' + n2(-bm) + ')" text-anchor="middle" dy=".36em" font-family="' + CONDFONT + '" font-size="' + n2(fs * .78) + '" fill="' + bezInk + '">' + v + '</text>';
      });
    }
    if (w.bezel !== 'tachy') {
      s += '<path d="M' + n2(-fs * .55) + ' ' + n2(-bo + 3 * k) + 'L' + n2(fs * .55) + ' ' + n2(-bo + 3 * k) + 'L0 ' + n2(-bi - 3 * k) + 'Z" fill="' + bezInk + '"/><circle cx="0" cy="' + n2(-bm - 2 * k) + '" r="' + n2(2.6 * k) + '" fill="' + (light ? '#9dffb5' : '#b8ffcd') + '"/>';
    } else {
      s += '<text transform="translate(0 ' + n2(-bm) + ')" text-anchor="middle" dy=".36em" font-family="' + CONDFONT + '" font-size="' + n2(fs * .78) + '" fill="' + bezInk + '">60</text>';
    }
    s += '<circle r="' + n2(bi) + '" fill="url(#' + p + 'c)"/>';
  }
  /* dial */
  s += '<circle r="' + n2(dR) + '" fill="url(#' + p + 'd)" stroke="#000" stroke-opacity=".6"/>';
  for (i = 0; i < 60; i++) {
    q = pt(i * 6, dR * (i % 5 ? .945 : .925)); x = pt(i * 6, dR * .98);
    s += '<line x1="' + n2(q[0]) + '" y1="' + n2(q[1]) + '" x2="' + n2(x[0]) + '" y2="' + n2(x[1]) + '" stroke="' + ink + '" stroke-width="' + n2((i % 5 ? .9 : 1.8) * k) + '" opacity="' + (i % 5 ? .55 : .85) + '"/>';
  }
  var mk = w.markers || 'batons';
  var roman = ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
  var tri = function () { return '<path d="M' + n2(-9 * k) + ' ' + n2(-dR * .89) + 'L' + n2(9 * k) + ' ' + n2(-dR * .89) + 'L0 ' + n2(-dR * .68) + 'Z" fill="' + lume + '" stroke="' + metal + '" stroke-width="' + n2(1.4 * k) + '"/>'; };
  var bar = function (hw, r1, r2) { return '<rect x="' + n2(-hw * k) + '" y="' + n2(-dR * r2) + '" width="' + n2(2 * hw * k) + '" height="' + n2(dR * (r2 - r1)) + '" fill="' + lume + '" stroke="' + metal + '" stroke-width="' + n2(1.3 * k) + '"/>'; };
  var num = function (h, txt, size) { var c = pt(h * 30, dR * .73); return '<text x="' + n2(c[0]) + '" y="' + n2(c[1]) + '" text-anchor="middle" dy=".35em" font-family="' + NUMFONT + '" font-size="' + n2(dR * size) + '" fill="' + ink + '">' + txt + '</text>'; };
  for (i = 0; i < 12; i++) {
    if (w.date && i === 3) continue;
    var g = '';
    if (mk === 'arabic') { s += num(i, i === 0 ? 12 : i, .2); continue; }
    if (mk === 'roman') { s += num(i, roman[i], .15); continue; }
    if (mk === 'explorer') {
      if (i === 3 || i === 6 || i === 9) { s += num(i, i, .24); continue; }
      g = i === 0 ? tri() : bar(2.6, .7, .89);
    } else if (mk === 'dots') {
      if (i === 0) g = tri();
      else if (i % 3 === 0) g = bar(4, .68, .89);
      else g = '<circle cx="0" cy="' + n2(-dR * .8) + '" r="' + n2(7 * k) + '" fill="' + lume + '" stroke="' + metal + '" stroke-width="' + n2(1.4 * k) + '"/>';
    } else {
      if (i === 0) g = '<g transform="translate(' + n2(-4.6 * k) + ' 0)">' + bar(2.4, .68, .9) + '</g><g transform="translate(' + n2(4.6 * k) + ' 0)">' + bar(2.4, .68, .9) + '</g>';
      else g = bar(i % 3 === 0 ? 2.8 : 2.2, i % 3 === 0 ? .68 : .74, .9);
    }
    s += '<g transform="rotate(' + (i * 30) + ')">' + g + '</g>';
  }
  if (w.date) {
    s += '<rect x="' + n2(dR * .6) + '" y="' + n2(-9 * k) + '" width="' + n2(dR * .24) + '" height="' + n2(18 * k) + '" rx="' + n2(1.5 * k) + '" fill="#f6f4ec" stroke="' + metal + '" stroke-width="' + n2(1.2 * k) + '"/><text class="dt" x="' + n2(dR * .72) + '" y="0" dy=".36em" text-anchor="middle" font-family="' + CONDFONT + '" font-weight="600" font-size="' + n2(15 * k) + '" fill="#15171a">' + new Date().getDate() + '</text>';
  }
  /* No maker names or logos are ever drawn on a dial (wordmark-free by design). */
  var mvL = { automatic: 'AUTOMATIC', manual: 'HAND-WOUND', quartz: 'QUARTZ', solar: 'SOLAR' }[w.movement] || '';
  s += '<text y="' + n2(dR * .4) + '" text-anchor="middle" font-family="' + CONDFONT + '" font-size="' + n2(dR * .062) + '" letter-spacing="' + n2(dR * .02) + '" fill="' + ink + '" opacity=".8">' + mvL + '</text>';
  if (w.wr) s += '<text y="' + n2(dR * .5) + '" text-anchor="middle" font-family="' + CONDFONT + '" font-size="' + n2(dR * .056) + '" letter-spacing="' + n2(dR * .015) + '" fill="' + ink + '" opacity=".6">' + (+w.wr) + ' m</text>';
  /* hands */
  var hs = w.hands || 'baton';
  var showLume = !light;
  var hfill = metal;
  var ha = 305, ma = 61, sa = 210;
  if (o.live) { var d = new Date(); var sec = d.getSeconds(), mn = d.getMinutes() + sec / 60; ha = ((d.getHours() % 12) + mn / 60) * 30; ma = mn * 6; sa = sec * 6; }
  s += '<g class="hh" transform="rotate(' + n2(ha) + ')" filter="drop-shadow(0 1.5px 1.5px rgba(0,0,0,.5))">' + handShape('h', hs, dR * .54, k, hfill, lume, showLume) + '</g>';
  s += '<g class="mh" transform="rotate(' + n2(ma) + ')" filter="drop-shadow(0 2px 2px rgba(0,0,0,.5))">' + handShape('m', hs, dR * .82, k, hfill, lume, showLume) + '</g>';
  var sx = '';
  if (hs === 'snowflake') sx = '<path d="M0 ' + n2(-dR * .66) + 'l' + n2(4 * k) + ' ' + n2(4.5 * k) + 'l' + n2(-4 * k) + ' ' + n2(4.5 * k) + 'l' + n2(-4 * k) + ' ' + n2(-4.5 * k) + 'Z" fill="' + (showLume ? lume : accent) + '" stroke="' + accent + '" stroke-width="' + n2(k) + '"/>';
  if (hs === 'mercedes' || hs === 'sword') sx = '<circle cx="0" cy="' + n2(-dR * .62) + '" r="' + n2(3.6 * k) + '" fill="' + (showLume ? lume : accent) + '" stroke="' + accent + '" stroke-width="' + n2(k) + '"/>';
  s += '<g class="sh" transform="rotate(' + n2(sa) + ')"><line x1="0" y1="' + n2(24 * k) + '" x2="0" y2="' + n2(-dR * .88) + '" stroke="' + accent + '" stroke-width="' + n2(1.5 * k) + '"/><rect x="' + n2(-2.4 * k) + '" y="' + n2(12 * k) + '" width="' + n2(4.8 * k) + '" height="' + n2(14 * k) + '" rx="' + n2(2 * k) + '" fill="' + accent + '"/>' + sx + '</g>';
  s += '<circle r="' + n2(5.2 * k) + '" fill="' + hfill + '" stroke="#000" stroke-opacity=".5"/><circle r="' + n2(1.8 * k) + '" fill="#000" opacity=".55"/>';
  /* crystal glare */
  s += '<path d="M' + n2(-dR * .92) + ' ' + n2(-dR * .2) + 'A' + n2(dR * .95) + ' ' + n2(dR * .95) + ' 0 0 1 ' + n2(dR * .35) + ' ' + n2(-dR * .9) + 'A' + n2(dR * 1.5) + ' ' + n2(dR * 1.5) + ' 0 0 0 ' + n2(-dR * .92) + ' ' + n2(-dR * .2) + 'Z" fill="#fff" opacity=".07" pointer-events="none"/>';
  return s;
}
var _miniN = 0;
function miniWatch(w, size) {
  _miniN++;
  return '<svg class="mini" viewBox="-148 -148 296 296" width="' + (size || 56) + '" height="' + (size || 56) + '" aria-hidden="true">' + drawWatch(w, { p: 'm' + _miniN + '_', mini: true }) + '</svg>';
}
