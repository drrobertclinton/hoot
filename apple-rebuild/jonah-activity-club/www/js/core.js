/* Jonah Activity Club - core: state, voice, sounds, stage, rewards */
(function () {
'use strict';
var J = window.J = { act: {} };
var KEY = 'jac.v1.state';

J.STICKERS = ['star', 'heart', 'bone', 'crab', 'boat', 'sun', 'fish', 'kite', 'shell', 'ball', 'dog', 'pail', 'snail', 'flag', 'jelly', 'hat', 'turtle', 'tree',
  'lighthouse', 'octo', 'icecream', 'whale', 'anchor', 'rainbow', 'paw', 'crayon'];

function defaults() {
  return {
    v: 1, band: 0, voice: true, stars: 0, pts: 0,
    stickers: ['star', 'heart', 'bone'],                       // starter stickers
    placed: [{ id: 'star', x: 78, y: 16, s: 1.1, r: -12 }, { id: 'heart', x: 50, y: 46, s: 0.8, r: 8 }], // starter decoration (deletable)
    color: {}, strokes: {}, edits: {}, colorDone: {}, trace: {},
    stats: { color: 0, trace: 0, count: 0, match: 0, maze: 0, words: 0 }, at: 'porch'
  };
}
function load() {
  var d = defaults();
  try { var raw = localStorage.getItem(KEY); if (raw) { var o = JSON.parse(raw); for (var k in o) d[k] = o[k]; } } catch (e) {}
  return d;
}
J.S = load();
J.save = function () { try { localStorage.setItem(KEY, JSON.stringify(J.S)); } catch (e) {} };
J.resetAll = function () {
  try { Object.keys(localStorage).forEach(function (k) { if (k.indexOf('jac.') === 0) localStorage.removeItem(k); }); } catch (e) {}
  J.S = defaults(); J.save();
};

/* ---------- helpers ---------- */
J.el = function (html) { var t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstChild; };
J.$ = function (s, r) { return (r || document).querySelector(s); };
J.$$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
J.rand = function (a, b) { return a + Math.floor(Math.random() * (b - a + 1)); };
J.pick = function (arr) { return arr[Math.floor(Math.random() * arr.length)]; };
J.shuffle = function (arr) { var a = arr.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; };
J.band = function (a, b, c) { return [a, b, c][J.S.band] ; };
J.reduced = function () { return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; };
J.svgPt = function (svg, e) { var p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; var m = svg.getScreenCTM(); return m ? p.matrixTransform(m.inverse()) : p; };
J.fit = function (parent, child, ratio, pad) {
  function f() { var w = parent.clientWidth - 2 * (pad || 0), h = parent.clientHeight - 2 * (pad || 0); if (!w || !h) return; var cw = w, ch = w / ratio; if (ch > h) { ch = h; cw = h * ratio; } child.style.width = Math.floor(cw) + 'px'; child.style.height = Math.floor(ch) + 'px'; }
  f();
  if (window.ResizeObserver) { var ro = new ResizeObserver(f); ro.observe(parent); J.onClean(function () { ro.disconnect(); }); }
  else { window.addEventListener('resize', f); J.onClean(function () { window.removeEventListener('resize', f); }); }
  return f;
};

/* ---------- icons (original, chunky) ---------- */
function ic(d, extra) { return '<svg viewBox="0 0 24 24" class="ic" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">' + d + '</g>' + (extra || '') + '</svg>'; }
J.IC = {
  back: ic('<path d="M11 5L4 12l7 7M5 12h15"/>'),
  next: ic('<path d="M13 5l7 7-7 7M19 12H4"/>'),
  again: ic('<path d="M19 12a7 7 0 1 1-2.2-5.1M19 4v4.5h-4.5"/>'),
  map: ic('<path d="M3 6.5l6-2.5 6 2.5 6-2.5v13.5l-6 2.5-6-2.5-6 2.5zM9 4v13.5M15 6.5V20"/>'),
  sound: ic('<path d="M4 9.5v5h3.5l5 4v-13l-5 4zM16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11"/>'),
  mute: ic('<path d="M4 9.5v5h3.5l5 4v-13l-5 4zM16.5 9.5l5 5M21.5 9.5l-5 5"/>'),
  undo: ic('<path d="M8 5L3.5 9.5 8 14M4 9.5h10a5.5 5.5 0 0 1 0 11h-3"/>'),
  trash: ic('<path d="M4 7h16M9 7V4h6v3M6.5 7l1 13h9l1-13M10 11v5.5M14 11v5.5"/>'),
  check: ic('<path d="M4 12.5l5.5 5.5L20 6.5"/>'),
  x: ic('<path d="M6 6l12 12M18 6L6 18"/>'),
  plus: ic('<path d="M12 5v14M5 12h14"/>'),
  minus: ic('<path d="M5 12h14"/>'),
  rot: ic('<path d="M5 12a7 7 0 1 0 2.2-5.1M5 4v4.5h4.5"/>'),
  lock: ic('<path d="M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3"/>'),
  play: ic('<path d="M8 5l11 7-11 7z" fill="currentColor"/>'),
  up: ic('<path d="M12 19V5M5.5 11.5L12 5l6.5 6.5"/>'),
  down: ic('<path d="M12 5v14M5.5 12.5L12 19l6.5-6.5"/>'),
  left: ic('<path d="M19 12H5M11.5 5.5L5 12l6.5 6.5"/>'),
  right: ic('<path d="M5 12h14M12.5 5.5L19 12l-6.5 6.5"/>'),
  bucket: ic('<path d="M5 9l7-5 7 9-8 6zM12 4v6M19.5 16c1 1.6 1.5 2.6 1.5 3.4a1.5 1.5 0 0 1-3 0c0-.8.5-1.8 1.5-3.4z"/>'),
  crayon: ic('<path d="M4 20l1.5-5L15 5.5l3.5 3.5L9 18.5zM13 7.5l3.5 3.5"/>'),
  eraser: ic('<path d="M8.5 19L3.5 14 13 4.5l7 7L12.5 19zM8.5 19h11M8.5 9l7 7"/>'),
  hint: ic('<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.3 1 2.1h5c0-.8.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>'),
  star: '<svg viewBox="0 0 24 24" class="ic" aria-hidden="true"><path d="M12 2.6l2.8 6 6.5.8-4.8 4.5 1.3 6.5L12 17.2 6.2 20.4l1.3-6.5L2.7 9.4l6.5-.8z" fill="currentColor" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>',
  print: ic('<path d="M7 9V4h10v5M7 17H4v-8h16v8h-3M7 14h10v6H7z"/>')
};

/* ---------- voice + sound ---------- */
var voice = null;
function chooseVoice() {
  try {
    var vs = speechSynthesis.getVoices() || [];
    var en = vs.filter(function (v) { return /^en/i.test(v.lang); });
    voice = en.filter(function (v) { return /Samantha|Karen|Moira|Tessa|Ava|Allison/i.test(v.name); })[0] || en.filter(function (v) { return v.localService; })[0] || en[0] || null;
  } catch (e) {}
}
if ('speechSynthesis' in window) { chooseVoice(); try { speechSynthesis.addEventListener('voiceschanged', chooseVoice); } catch (e) {} }
J.lastSaid = '';
J.say = function (text, keep) {
  if (!keep) J.lastSaid = text;
  if (!J.S.voice || !('speechSynthesis' in window) || !text) return;
  try {
    speechSynthesis.cancel();
    var u = new SpeechSynthesisUtterance(text); u.rate = 0.92; u.pitch = 1.15; u.lang = 'en-US'; if (voice) u.voice = voice;
    speechSynthesis.speak(u);
  } catch (e) {}
};
J.hush = function () { try { if ('speechSynthesis' in window) speechSynthesis.cancel(); } catch (e) {} };

var ac = null;
function tone(f, t0, dur, type, vol) {
  var o = ac.createOscillator(), g = ac.createGain();
  o.type = type || 'sine'; o.frequency.setValueAtTime(f, ac.currentTime + t0);
  g.gain.setValueAtTime(0.0001, ac.currentTime + t0);
  g.gain.exponentialRampToValueAtTime(vol || 0.16, ac.currentTime + t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + t0 + dur);
  o.connect(g); g.connect(ac.destination); o.start(ac.currentTime + t0); o.stop(ac.currentTime + t0 + dur + 0.05);
}
J.unlockAudio = function () {
  try { if (!ac) { var C = window.AudioContext || window.webkitAudioContext; if (C) ac = new C(); } if (ac && ac.state === 'suspended') ac.resume(); } catch (e) {}
};
J.sfx = function (name) {
  if (!J.S.voice || !ac) return;
  try {
    if (name === 'pop') tone(520, 0, 0.09, 'triangle');
    else if (name === 'tap') tone(380, 0, 0.06, 'triangle', 0.1);
    else if (name === 'ding') { tone(784, 0, 0.14, 'sine'); tone(1175, 0.09, 0.22, 'sine'); }
    else if (name === 'no') { tone(220, 0, 0.14, 'triangle', 0.12); tone(180, 0.1, 0.18, 'triangle', 0.12); }
    else if (name === 'win') [523, 659, 784, 1047].forEach(function (f, i) { tone(f, i * 0.11, 0.26, 'triangle'); });
    else if (name === 'step') tone(300 + Math.random() * 60, 0, 0.05, 'sine', 0.07);
    else if (name === 'woof') { tone(240, 0, 0.09, 'sawtooth', 0.1); tone(170, 0.07, 0.12, 'sawtooth', 0.1); }
  } catch (e) {}
};

/* ---------- rewards ---------- */
J.award = function (pts, kind) {
  var S = J.S; S.stars += pts; S.pts += pts; if (kind) S.stats[kind] = (S.stats[kind] || 0) + 1;
  var got = null;
  if (S.pts >= 3) {
    var locked = J.STICKERS.filter(function (id) { return S.stickers.indexOf(id) < 0; });
    if (locked.length) { got = locked[0]; S.stickers.push(got); S.pts -= 3; } else S.pts = 0;
  }
  J.save(); if (J.map) J.map.hud();
  return { stars: pts, sticker: got };
};
J.celebrate = function (o) {
  var n = Math.max(1, Math.min(3, o.stars || 3)), i, box = J.$('#cele');
  var h = '<div class="cele-card"><div class="cele-stars">';
  for (i = 0; i < 3; i++) h += '<span class="cs' + (i < n ? ' on' : '') + '" style="--d:' + (i * 0.16) + 's">' + J.IC.star + '</span>';
  h += '</div>';
  if (o.sticker) h += '<div class="cele-stk"><div class="stk-burst">' + A.itemSVG(o.sticker) + '</div><p>New sticker!</p></div>';
  else if (o.pic) h += '<div class="cele-stk">' + o.pic + '</div>';
  h += '<div class="cele-btns">';
  if (o.again) h += '<button class="rb big" data-a="again" aria-label="Play again">' + J.IC.again + '</button>';
  if (o.next) h += '<button class="rb big go" data-a="next" aria-label="Next">' + J.IC.next + '</button>';
  h += '<button class="rb big" data-a="map" aria-label="Back to the map">' + J.IC.map + '</button></div></div><div class="confetti" aria-hidden="true">';
  if (!J.reduced()) {
    var cols = ['#f08a6b', '#f7c85a', '#5bb5a6', '#b08fd6', '#ef6f8a', '#7fbf7a'];
    for (i = 0; i < 34; i++) h += '<i style="left:' + J.rand(2, 98) + '%;background:' + cols[i % 6] + ';--t:' + (1.6 + Math.random() * 1.6).toFixed(2) + 's;--dl:' + (Math.random() * 0.5).toFixed(2) + 's;--r:' + J.rand(-180, 180) + 'deg"></i>';
  }
  h += '</div>';
  box.innerHTML = h; box.hidden = false;
  J.sfx('win');
  J.say((o.text || J.pick(['Great job!', 'You did it!', 'Hooray!', 'Super work!'])) + (o.sticker ? ' You won a new sticker: the ' + A.ITEM_NAMES[o.sticker] + '!' : ''), true);
  box.onclick = function (e) {
    var b = e.target.closest('button'); if (!b) return;
    box.hidden = true; box.innerHTML = ''; J.sfx('pop');
    var a = b.getAttribute('data-a');
    if (a === 'again' && o.again) o.again(); else if (a === 'next' && o.next) o.next(); else J.close();
  };
};

/* ---------- stage (one activity at a time, opened from a map place) ---------- */
var cleans = [], backFn = null, current = null;
J.onClean = function (fn) { cleans.push(fn); };
J.clean = function () { var c = cleans; cleans = []; c.forEach(function (f) { try { f(); } catch (e) {} }); };
J.api = {
  back: function (fn) { backFn = fn || null; },
  prompt: function (text) { J.say(text); },
  mid: function (html) { J.$('#barMid').innerHTML = html || ''; return J.$('#barMid'); }
};
J.open = function (id, origin) {
  var st = J.$('#stage'), body = J.$('#body');
  J.clean(); backFn = null; current = id; J.$('#barMid').innerHTML = '';
  st.className = 'stage act-' + id; body.innerHTML = '';
  st.hidden = false;
  var x = origin ? origin[0] : innerWidth / 2, y = origin ? origin[1] : innerHeight / 2;
  if (!J.reduced()) {
    st.style.transition = 'none'; st.style.clipPath = 'circle(0px at ' + x + 'px ' + y + 'px)'; st.style.webkitClipPath = st.style.clipPath;
    st.getBoundingClientRect();
    st.style.transition = 'clip-path .5s ease-out, -webkit-clip-path .5s ease-out';
    st.style.clipPath = 'circle(150vmax at ' + x + 'px ' + y + 'px)'; st.style.webkitClipPath = st.style.clipPath;
    setTimeout(function () { st.style.clipPath = ''; st.style.webkitClipPath = ''; st.style.transition = ''; }, 560);
  }
  J.act[id].mount(body, J.api);
};
J.close = function () {
  var st = J.$('#stage'); J.hush(); J.clean(); backFn = null; current = null;
  st.hidden = true; J.$('#body').innerHTML = ''; J.$('#cele').hidden = true;
  if (J.map) { J.map.refreshPickles(); J.map.hud(); }
};
J.initStage = function () {
  J.$('#btnBack').innerHTML = J.IC.back; J.$('#btnSay').innerHTML = J.IC.sound;
  J.$('#btnBack').onclick = function () { J.sfx('pop'); if (backFn) { var f = backFn; backFn = null; f(); } else J.close(); };
  J.$('#btnSay').onclick = function () { J.sfx('tap'); J.say(J.lastSaid, true); };
};
})();
