/* The island map: places are the navigation. Pickles walks the path before a place opens. */
(function () {
'use strict';
var W = 2400, H = 1000;
var PLACES = [
  { id: 'porch', stop: [300, 770], b: [420, 540], hit: [130, 440, 330, 280], icon: 'heart', label: 'Heron Run Lane, Jonah\'s house', say: 'Heron Run Lane! Jonah\'s house.' },
  { id: 'stick', stop: [600, 742], b: [745, 330], hit: [470, 180, 300, 520], icon: 'star', label: 'Treehouse sticker clubhouse', say: 'The treehouse! Sticker clubhouse.' },
  { id: 'color', stop: [820, 800], b: [905, 640], hit: [775, 600, 170, 170], icon: 'crayon', label: 'Treehouse coloring', say: 'Coloring time!' },
  { id: 'tide', stop: [1100, 662], b: [1235, 470], hit: [950, 430, 320, 200], icon: 'crab', label: 'Tide pools, count and match', say: 'The tide pools! Count and match.' },
  { id: 'words', stop: [1440, 592], b: [1345, 345], hit: [1320, 280, 330, 290], icon: 'fish', label: 'Dock word hunt', say: 'The dock! Word hunt.' },
  { id: 'maze', stop: [1800, 800], b: [2005, 545], hit: [1620, 430, 410, 320], icon: 'paw', label: 'Boardwalk mazes', say: 'The boardwalk! Maze time.' },
  { id: 'trace', stop: [2160, 642], b: [2275, 300], hit: [2050, 200, 280, 420], icon: 'lighthouse', label: 'Lighthouse tracing', say: 'The lighthouse! Let\'s trace.' }
];
var ROAD = [[215, 790], [300, 770], [450, 806], [600, 742], [715, 792], [820, 800], [965, 742], [1100, 662], [1275, 640], [1440, 592], [1610, 700], [1800, 800], [1995, 752], [2160, 642]];
var road, pk, scroller, svg, curL = 0, walking = false;

function scene() {
  var c = A.ctx('art', null, '', 5), s = '', i, sh = A.sh, ln = A.ln, blob = A.blob, poly = A.poly, curve = A.curve, rect = A.rect;
  s += '<defs><linearGradient id="gsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#bfe6ea"/><stop offset="1" stop-color="#fdf0cf"/></linearGradient></defs>';
  s += '<rect x="-10" y="-10" width="2420" height="1020" fill="url(#gsky)"/>';
  // sun, clouds, gulls
  var rays = ''; for (i = 0; i < 10; i++) { var a = i * Math.PI / 5; rays += 'M' + (1260 + Math.cos(a) * 84).toFixed(0) + ' ' + (130 + Math.sin(a) * 84).toFixed(0) + 'L' + (1260 + Math.cos(a) * 112).toFixed(0) + ' ' + (130 + Math.sin(a) * 112).toFixed(0); }
  s += '<g class="sunspin">' + ln(c, rays) + '</g>' + sh(c, null, '#f7c85a', blob(1260, 130, 66, 66, 2));
  [[330, 110, 1], [930, 90, 2], [1640, 150, 3]].forEach(function (p) {
    s += '<g class="cloud c' + p[2] + '">' + sh(c, null, '#fffdf6', blob(p[0], p[1], 92, 34, p[2] + 20, 0.12)) + sh(c, null, '#fffdf6', blob(p[0] + 30, p[1] - 28, 52, 30, p[2] + 30, 0.1)) + '</g>';
  });
  s += ln(c, 'M620 150q14 -16 28 0q14 -16 28 0M1440 210q12 -14 24 0q12 -14 24 0M2240 200q12 -14 24 0q12 -14 24 0');
  // back sea
  s += sh(c, null, '#8fd0c6', curve([[-20, 300], [300, 286], [640, 304], [1000, 288], [1360, 304], [1720, 288], [2080, 304], [2420, 290], [2420, 620], [-20, 620]], true, 4));
  var wv = ''; [[120, 350], [520, 380], [900, 340], [1180, 390], [1700, 350], [1930, 392], [2280, 360], [700, 420], [1600, 420]].forEach(function (p) { wv += 'M' + p[0] + ' ' + p[1] + 'q16 -14 32 0t32 0t32 0'; });
  s += '<path class="waves" d="' + wv + '" fill="none" stroke="#e6f6f0" stroke-width="6" stroke-linecap="round"/>';
  s += sh(c, null, '#a9d59a', curve([[150, 318], [200, 282], [270, 270], [340, 286], [380, 320]], true, 21)) + A.itemAt(c, 'tree', 232, 196, 0.9) + A.itemAt(c, 'boat', 700, 300, 0.7) + A.itemAt(c, 'whale', 1740, 330, 0.8) + A.itemAt(c, 'boat', 2290, 330, 0.6);
  // dock (drawn before the land so its foot tucks under the sand)
  s += ln(c, 'M1402 360L1402 420M1478 360L1478 420M1402 450L1402 500M1478 450L1478 500');
  s += sh(c, null, '#d9a66b', poly(rect(1396, 330, 88, 250), 7)) + ln(c, 'M1398 372L1482 372M1398 414L1482 414M1398 456L1482 456M1398 498L1482 498M1398 540L1482 540');
  s += sh(c, null, '#b98556', blob(1396, 330, 13, 13, 3)) + sh(c, null, '#b98556', blob(1484, 330, 13, 13, 4));
  s += '<g class="bob">' + ln(c, 'M1570 420L1570 322') + sh(c, null, '#fff7e0', poly([[1578, 330], [1630, 404], [1578, 404]], 3)) + sh(c, null, '#5bb5a6', poly([[1562, 344], [1562, 404], [1520, 404]], 4)) +
    sh(c, null, '#e8574b', poly([[1506, 418], [1640, 418], [1618, 458], [1528, 458]], 5)) + '</g>';
  // land
  s += sh(c, null, '#f3dfb3', curve([[-20, 480], [200, 440], [450, 452], [700, 420], [950, 462], [1200, 482], [1450, 470], [1700, 472], [1950, 440], [2200, 420], [2420, 440], [2420, 1020], [-20, 1020]], true, 5));
  s += sh(c, null, '#a9d59a', curve([[-20, 520], [260, 478], [600, 470], [900, 520], [930, 640], [840, 720], [600, 700], [330, 720], [120, 800], [-20, 800]], true, 6));
  s += sh(c, null, '#a9d59a', blob(2210, 560, 200, 84, 7, 0.08));
  // front sea
  s += sh(c, null, '#8fd0c6', curve([[-20, 930], [300, 902], [600, 940], [900, 906], [1200, 940], [1500, 906], [1800, 940], [2100, 906], [2420, 934], [2420, 1020], [-20, 1020]], true, 8));
  s += '<path class="waves" d="M200 960q16 -14 32 0t32 0t32 0M1000 968q16 -14 32 0t32 0t32 0M1900 962q16 -14 32 0t32 0t32 0" fill="none" stroke="#e6f6f0" stroke-width="6" stroke-linecap="round"/>';
  // the path
  var rd = A.smooth(ROAD, false);
  s += '<path d="' + rd + '" fill="none" stroke="#c9a970" stroke-width="44" stroke-linecap="round" opacity=".55"/>';
  s += '<path id="road" d="' + rd + '" fill="none" stroke="#fbeecb" stroke-width="30" stroke-linecap="round"/>';
  s += '<path d="' + rd + '" fill="none" stroke="#d6b77c" stroke-width="5" stroke-linecap="round" stroke-dasharray="2 26"/>';
  // little details: shells, grass tufts, flowers
  [[1000, 860, 'shell', 0.5], [1290, 780, 'star', 0.5], [1560, 860, 'shell', 0.45], [2080, 840, 'star', 0.5], [1180, 880, 'pail', 0.55], [480, 880, 'ball', 0.5]].forEach(function (p) { s += A.itemAt(c, p[2], p[0], p[1], p[3]); });
  s += ln(c, 'M90 700l6 -22l6 22l8 -24l4 24M520 640l6 -22l6 22l8 -24l4 24M2330 590l6 -22l6 22l8 -24l4 24M700 690l6 -20l6 20');
  [[150, 600], [470, 560], [880, 560], [2110, 540], [2330, 520]].forEach(function (p, k) { s += A.dot(p[0], p[1], 9, ['#f08ab0', '#f7c85a', '#fff7e0'][k % 3]) + A.dot(p[0], p[1], 3, '#f08a6b'); });

  // --- Heron Run Lane: Jonah's house ---
  var g = '';
  g += sh(c, null, '#fbe9c6', poly(rect(200, 560, 200, 150), 11)) + sh(c, null, '#f08a6b', poly([[176, 568], [300, 462], [424, 568]], 12));
  g += sh(c, null, '#c98f5a', poly(rect(352, 478, 26, 52), 13));
  g += sh(c, null, '#5bb5a6', 'M278 710L278 650Q300 622 322 650L322 710Z') + A.dot(314, 680, 4);
  g += sh(c, null, '#cdeef0', poly(rect(220, 600, 40, 40), 14)) + sh(c, null, '#cdeef0', poly(rect(340, 600, 40, 40), 15)) + ln(c, 'M240 600L240 640M220 620L260 620M360 600L360 640M340 620L380 620');
  g += sh(c, null, '#cdeef0', blob(300, 530, 16, 16, 16));
  var fence = ''; for (i = 0; i < 5; i++) fence += sh(c, null, '#fffdf6', poly([[136 + i * 22, 716], [136 + i * 22, 676], [144 + i * 22, 664], [152 + i * 22, 676], [152 + i * 22, 716]], 20 + i));
  g += fence + ln(c, 'M130 694L246 694');
  g += ln(c, 'M440 716L440 640') + sh(c, null, '#fff7e0', poly([[392, 640], [500, 631], [504, 664], [396, 672]], 30)) + '<text x="448" y="658" text-anchor="middle" class="sign" transform="rotate(-4 448 658)">Heron Run Ln</text>';
  // the heron
  g += ln(c, 'M146 660L142 716M158 660L164 716') + sh(c, null, '#a9bfd6', blob(152, 640, 30, 22, 31)) + '<path d="M168 632Q190 604 172 578" fill="none" stroke="' + A.INK + '" stroke-width="19" stroke-linecap="round"/><path d="M168 632Q190 604 172 578" fill="none" stroke="#a9bfd6" stroke-width="10" stroke-linecap="round"/>' +
    sh(c, null, '#a9bfd6', blob(170, 574, 11, 9, 32)) + sh(c, null, '#f7c85a', poly([[178, 570], [204, 576], [178, 580]], 33)) + A.dot(172, 572, 2.4);
  // --- Treehouse ---
  var t = '';
  t += sh(c, null, '#b98556', poly([[570, 726], [585, 520], [552, 440], [652, 440], [618, 520], [636, 726]], 41));
  t += sh(c, null, '#7fbf7a', blob(500, 400, 96, 74, 42)) + sh(c, null, '#6fb06e', blob(706, 392, 98, 78, 43)) + sh(c, null, '#8fcf86', blob(602, 290, 128, 82, 44));
  t += ln(c, 'M650 500L664 724M678 500L692 724M654 540L682 540M657 580L686 580M660 620L688 620M662 660L690 660M664 700L692 700');
  t += sh(c, null, '#d9a66b', poly(rect(506, 488, 196, 16), 45)) + sh(c, null, '#f3d9a4', poly(rect(526, 390, 156, 98), 46)) + sh(c, null, '#f08a6b', poly([[508, 396], [604, 326], [700, 396]], 47));
  t += sh(c, null, '#5bb5a6', poly(rect(624, 432, 36, 56), 48)) + sh(c, null, '#cdeef0', blob(568, 438, 22, 22, 49, 0.03)) + ln(c, 'M546 438L590 438M568 416L568 460');
  t += ln(c, 'M604 328L604 282') + '<g class="flagw">' + sh(c, null, '#f7c85a', poly([[604, 284], [646, 293], [604, 306]], 50)) + '</g>';
  // --- easel ---
  var e = ln(c, 'M800 770L822 650L846 770M822 700L822 776') + sh(c, null, '#fffdf6', poly(rect(784, 652, 78, 66), 51)) +
    '<path d="M796 700q10 -30 22 -8t20 -22" fill="none" stroke="#f08a6b" stroke-width="7" stroke-linecap="round"/><path d="M800 672q14 -12 26 0" fill="none" stroke="#5bb5a6" stroke-width="7" stroke-linecap="round"/>' +
    A.dot(846, 668, 7, '#f7c85a') + A.itemAt(c, 'crayon', 866, 730, 0.5) ;
  // --- tide pools ---
  var p = sh(c, null, '#c9c2b4', blob(1010, 520, 70, 46, 61, 0.1)) + sh(c, null, '#b9b2a4', blob(1200, 548, 64, 40, 62, 0.1)) + sh(c, null, '#bfe8e0', blob(1100, 540, 92, 50, 63, 0.07)) +
    sh(c, null, '#bfe8e0', blob(1010, 600, 44, 22, 64, 0.08)) + sh(c, null, '#c9c2b4', blob(1150, 480, 50, 28, 65, 0.1)) +
    A.itemAt(c, 'crab', 1040, 500, 0.62) + A.itemAt(c, 'star', 1118, 522, 0.5) + A.itemAt(c, 'snail', 1180, 500, 0.5);
  // --- boardwalk ---
  var b = '';
  b += '<g class="wheel">' + ln(c, 'M1890 440L1890 620M1800 530L1980 530M1826 466L1954 594M1954 466L1826 594') + '<circle cx="1890" cy="530" r="90" fill="none" stroke="' + A.INK + '" stroke-width="6"/>';
  [[1890, 440], [1980, 530], [1890, 620], [1800, 530], [1826, 466], [1954, 594], [1954, 466], [1826, 594]].forEach(function (q, k) { b += sh(c, null, ['#f08a6b', '#f7c85a', '#5bb5a6', '#b08fd6'][k % 4], blob(q[0], q[1], 15, 13, 70 + k)); });
  b += '</g>' + ln(c, 'M1890 530L1850 660M1890 530L1930 660') + sh(c, null, '#f7c85a', blob(1890, 530, 14, 14, 79));
  b += sh(c, null, '#d9a66b', poly(rect(1640, 650, 370, 84), 80)) + ln(c, 'M1642 678L2008 678M1642 706L2008 706M1700 652L1700 678M1790 678L1790 706M1880 652L1880 678M1950 706L1950 732M1740 706L1740 732');
  b += sh(c, null, '#fff7e0', poly(rect(1664, 560, 110, 92), 81)) + sh(c, null, '#e8574b', poly([[1650, 566], [1788, 566], [1776, 528], [1662, 528]], 82)) +
    '<path d="M1685 529L1680 566M1712 529L1710 566M1740 529L1742 566M1764 529L1768 566" stroke="#fff7e0" stroke-width="9" fill="none"/>' + ln(c, 'M1650 566L1788 566') +
    sh(c, null, '#cdeef0', poly(rect(1684, 586, 70, 34), 83)) + A.itemAt(c, 'icecream', 1694, 468, 0.56);
  b += ln(c, 'M1640 650L1640 610M2010 650L2010 610M1640 622L1664 622') + ln(c, 'M1650 734L1650 770M1760 734L1760 770M1890 734L1890 770M2000 734L2000 770');
  // --- lighthouse ---
  var l = '';
  l += '<g class="beam"><path d="M2160 268L1880 170L1880 300Z" fill="#fbe9a8" opacity=".75"/><path d="M2160 268L2420 210L2420 330Z" fill="#fbe9a8" opacity=".75"/></g>';
  l += sh(c, null, '#c9c2b4', curve([[2030, 620], [2060, 560], [2120, 536], [2200, 534], [2262, 558], [2292, 620], [2160, 640]], true, 90));
  l += sh(c, null, '#fff7e0', poly([[2112, 580], [2132, 300], [2188, 300], [2208, 580]], 91));
  l += sh(c, null, '#e8574b', poly([[2128, 352], [2192, 352], [2196, 408], [2124, 408]], 92)) + sh(c, null, '#e8574b', poly([[2120, 464], [2200, 464], [2204, 520], [2116, 520]], 93));
  l += sh(c, null, '#5bb5a6', 'M2146 580L2146 552Q2160 534 2174 552L2174 580Z');
  l += sh(c, null, '#6b8fb3', poly(rect(2118, 290, 84, 14), 94)) + sh(c, null, '#f7c85a', poly(rect(2136, 244, 48, 46), 95)) + ln(c, 'M2160 244L2160 290') + sh(c, null, '#e8574b', poly([[2124, 246], [2160, 206], [2196, 246]], 96));

  var art = { porch: g, stick: t, color: e, tide: p, maze: b, words: '', trace: l };
  PLACES.forEach(function (pl) {
    s += '<g class="place" data-p="' + pl.id + '" role="button" tabindex="0" aria-label="' + pl.label + '">' + art[pl.id] +
      '<rect class="hit" x="' + pl.hit[0] + '" y="' + pl.hit[1] + '" width="' + pl.hit[2] + '" height="' + pl.hit[3] + '" fill="transparent"/>' +
      '<g class="badge" transform="translate(' + pl.b[0] + ' ' + pl.b[1] + ')"><g class="badge-in"><path d="' + blob(0, 0, 56, 56, pl.b[0], 0.05) + '" fill="#fffdf6" stroke="' + A.INK + '" stroke-width="6"/>' +
      '<g transform="translate(-38 -38) scale(.76)">' + A.item(A.ctx('art', null, '', 4.5), pl.icon) + '</g>' +
      (pl.id === 'trace' ? '<text x="26" y="34" class="bt">A</text>' : pl.id === 'words' ? '<text x="20" y="38" class="bt sm">abc</text>' : pl.id === 'tide' ? '<text x="26" y="36" class="bt">3</text>' : '') +
      '</g></g></g>';
  });
  s += '<g id="pk"></g>';
  return s;
}

function pkHTML() { return '<g class="pk-flip"><g class="pk-bob">' + A.picklesSVG(J.S.color.pickles, J.S.strokes.pickles, 'pk').replace('<svg ', '<svg x="-75" y="-112" width="150" height="116" ') + '</g></g>'; }
function place(id) { return PLACES.filter(function (p) { return p.id === id; })[0]; }
function setPk(L, dir) {
  var pt = road.getPointAtLength(L); curL = L;
  pk.setAttribute('transform', 'translate(' + pt.x.toFixed(1) + ' ' + pt.y.toFixed(1) + ')');
  if (dir) pk.firstChild.setAttribute('transform', 'scale(' + dir + ' 1)');
  return pt;
}
function center(x, smoothly) {
  var k = svg.getBoundingClientRect().width / W, to = x * k - scroller.clientWidth / 2;
  if (smoothly && scroller.scrollTo) scroller.scrollTo({ left: to, behavior: J.reduced() ? 'auto' : 'smooth' }); else scroller.scrollLeft = to;
}
function screenOf(x, y) { var r = svg.getBoundingClientRect(); return [r.left + x * r.width / W, r.top + y * r.height / H]; }

J.map = {
  PLACES: PLACES,
  build: function () {
    scroller = J.$('#mapScroll');
    scroller.innerHTML = '<svg id="mapSvg" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="xMidYMid slice">' + A.withJ(2.2, scene) + '</svg>';
    svg = J.$('#mapSvg'); road = J.$('#road'); pk = J.$('#pk');
    var total = road.getTotalLength();
    PLACES.forEach(function (pl) {
      var best = 0, bd = 1e9; for (var i = 0; i <= 600; i++) { var L = total * i / 600, pt = road.getPointAtLength(L), d = Math.hypot(pt.x - pl.stop[0], pt.y - pl.stop[1]); if (d < bd) { bd = d; best = L; } }
      pl.L = best;
    });
    J.map.refreshPickles();
    setPk((place(J.S.at) || PLACES[0]).L, 1);
    svg.addEventListener('click', function (e) { var g = e.target.closest('.place'); if (g) J.map.go(g.getAttribute('data-p')); });
    svg.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { var g = e.target.closest('.place'); if (g) { e.preventDefault(); J.map.go(g.getAttribute('data-p')); } } });
    J.$('#nudgeL').innerHTML = J.IC.left; J.$('#nudgeR').innerHTML = J.IC.right;
    J.$('#nudgeL').onclick = function () { J.sfx('tap'); scroller.scrollBy({ left: -scroller.clientWidth * 0.7, behavior: J.reduced() ? 'auto' : 'smooth' }); };
    J.$('#nudgeR').onclick = function () { J.sfx('tap'); scroller.scrollBy({ left: scroller.clientWidth * 0.7, behavior: J.reduced() ? 'auto' : 'smooth' }); };
    function ends() { J.$('#nudgeL').classList.toggle('off', scroller.scrollLeft < 8); J.$('#nudgeR').classList.toggle('off', scroller.scrollLeft > scroller.scrollWidth - scroller.clientWidth - 8); }
    scroller.addEventListener('scroll', ends, { passive: true }); window.addEventListener('resize', ends);
    J.$('#hudVoice').onclick = function () { J.S.voice = !J.S.voice; J.save(); J.map.hud(); if (J.S.voice) { J.sfx('ding'); J.say('Voice on!', true); } else J.hush(); };
    J.$('#hudStars').onclick = function () { J.sfx('ding'); J.say('You have ' + J.S.stars + (J.S.stars === 1 ? ' star' : ' stars') + ' and ' + J.S.stickers.length + ' stickers!', true); };
    J.map.hud();
    setTimeout(function () { center(road.getPointAtLength(curL).x); ends(); }, 0);
  },
  hud: function () {
    J.$('#hudStars').innerHTML = J.IC.star + '<b>' + J.S.stars + '</b>';
    J.$('#hudStars').setAttribute('aria-label', J.S.stars + ' stars');
    J.$('#hudVoice').innerHTML = J.S.voice ? J.IC.sound : J.IC.mute;
    J.$('#hudVoice').setAttribute('aria-label', J.S.voice ? 'Voice is on. Tap to mute.' : 'Voice is off. Tap to turn on.');
    document.body.classList.toggle('muted', !J.S.voice);
  },
  refreshPickles: function () { if (pk) { var f = pk.firstChild && pk.firstChild.getAttribute('transform'); pk.innerHTML = pkHTML(); if (f) pk.firstChild.setAttribute('transform', f); } },
  go: function (id) {
    if (walking) return;
    var pl = place(id), from = curL, to = pl.L, dist = Math.abs(to - from);
    J.unlockAudio(); J.sfx('woof'); J.say(pl.say, true);
    var badge = svg.querySelector('.place[data-p="' + id + '"]'); badge.classList.add('picked');
    function arrive() {
      walking = false; pk.classList.remove('walking'); badge.classList.remove('picked');
      J.S.at = id; J.save();
      J.open(id, screenOf(pl.stop[0], pl.stop[1] - 50));
    }
    if (dist < 4) { arrive(); return; }
    walking = true; pk.classList.add('walking');
    var dur = J.reduced() ? 120 : Math.max(650, Math.min(2600, dist * 1.5)), t0 = performance.now(), dir = to > from ? 1 : -1, lastStep = 0;
    (function tick(now) {
      var f = Math.min(1, (now - t0) / dur), e = f < 0.5 ? 2 * f * f : 1 - Math.pow(-2 * f + 2, 2) / 2;
      var pt = setPk(from + (to - from) * e, dir); center(pt.x);
      if (now - lastStep > 190) { lastStep = now; J.sfx('step'); }
      if (f < 1) requestAnimationFrame(tick); else arrive();
    })(t0);
  }
};
})();
