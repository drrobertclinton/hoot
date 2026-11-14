/* Vilasi Timepieces — Wrist Fit, Accuracy Log, Timegrapher */
'use strict';

/* =================== WRIST FIT =================== */
function guessPpm() { var w = Math.min(window.innerWidth, window.innerHeight); if (w >= 700) return 5.2; return (window.devicePixelRatio || 2) >= 3 ? 6.04 : 6.42; }
function ppm() { return S.settings.pxPerMm || guessPpm(); }
function wristWidthMm(cm) { return cm * 10 * 0.345; }
function fitVerdict(cm, d, l, t) {
  var ww = wristWidthMm(cm), r = l / ww, pts = [], head, tone;
  if (r > 1.0) { head = 'Too long for this wrist'; tone = 'bad'; pts.push('Lug-to-lug is about ' + (l - ww).toFixed(1) + ' mm longer than your wrist is wide, so the lugs overhang and the strap drops straight down, leaving gaps.'); }
  else if (r > 0.92) { head = 'Wears large, edge to edge'; tone = 'warn'; pts.push('Lug-to-lug covers ' + Math.round(r * 100) + '% of your wrist width. It fits, but only just — expect a bold look.'); }
  else if (r >= 0.72) { head = 'Sits in the sweet spot'; tone = 'good'; pts.push('Lug-to-lug covers ' + Math.round(r * 100) + '% of your wrist width, leaving a margin on each side of about ' + ((ww - l) / 2).toFixed(1) + ' mm.'); }
  else { head = 'Wears small'; tone = 'note'; pts.push('Lug-to-lug covers only ' + Math.round(r * 100) + '% of your wrist width. Reads as a vintage or dress proportion.'); }
  var dr = d / ww;
  if (dr > 0.8) pts.push('The ' + n2(d) + ' mm case is ' + Math.round(dr * 100) + '% of your wrist width, so the dial dominates.');
  else if (dr < 0.56) pts.push('The case is narrow for this wrist (' + Math.round(dr * 100) + '% of its width).');
  if (t >= 14.5) pts.push('At ' + n2(t) + ' mm thick it sits tall and may catch on shirt cuffs.');
  else if (t <= 9.5) pts.push('At ' + n2(t) + ' mm thick it slides under a cuff easily.');
  if (t / d > 0.34 && t < 14.5) pts.push('Thick for its diameter, so it can feel top-heavy on a loose strap.');
  return { head: head, tone: tone, pts: pts, ratio: r, ww: ww };
}
TOOLS.fit = {
  kicker: 'No. 01 — True scale', title: 'Wrist Fit',
  open: function (a) {
    if (a.preset) ui.fit = a.preset;
    else { var w = curWatch(); ui.fit = w ? { id: w.id, d: +w.diameter, l: +w.l2l, t: +w.thickness, label: wname(w) } : { id: null, d: 40, l: 47, t: 11.5, label: 'Custom watch' }; }
  },
  render: function () {
    var f = ui.fit, st = S.settings, unit = st.unit || 'cm', cm = st.wristCm || 17;
    var wv = unit === 'cm' ? cm.toFixed(1) : (cm / 2.54).toFixed(2);
    var extra = '<button class="strip-b' + (!f.id ? ' on' : '') + '" data-act="fit-pick" data-id=""><svg viewBox="-30 -30 60 60" width="54" height="54"><circle r="21" fill="none" stroke="#8b9299" stroke-width="1.5" stroke-dasharray="3 4"/><path d="M-8 0H8M0 -8V8" stroke="#9dffb5" stroke-width="2"/></svg><span>' + (f.id ? 'Custom' : esc(f.label && f.label !== 'Custom watch' ? f.label : 'Custom')) + '</span></button>';
    return '<p class="lede">Enter your wrist and a watch’s three key measurements. The drawing below is rendered at real size on your screen.</p>' +
      watchStrip(f.id, 'fit-pick', extra) +
      '<div class="rule"><span>Your wrist</span></div>' +
      '<div class="frow"><label class="fld grow"><span>Circumference</span><input id="fitWrist" data-in="fit-wrist" inputmode="decimal" value="' + wv + '" aria-label="Wrist circumference"></label>' +
      '<div class="seg2" role="group" aria-label="Unit"><button class="' + (unit === 'cm' ? 'on' : '') + '" data-act="unit" data-v="cm">cm</button><button class="' + (unit === 'in' ? 'on' : '') + '" data-act="unit" data-v="in">in</button></div></div>' +
      '<div class="rule"><span>The watch — millimetres</span></div>' +
      '<div class="grid3"><label class="fld"><span>Case diameter</span><input data-in="fit-dim" data-k="d" inputmode="decimal" value="' + n2(f.d) + '"></label><label class="fld"><span>Lug-to-lug</span><input data-in="fit-dim" data-k="l" inputmode="decimal" value="' + n2(f.l) + '"></label><label class="fld"><span>Thickness</span><input data-in="fit-dim" data-k="t" inputmode="decimal" value="' + n2(f.t) + '"></label></div>' +
      '<div id="fitVerdict"></div>' +
      '<div class="scalebar"><div><b>' + (st.calibrated ? 'True scale · calibrated' : 'Estimated scale') + '</b><span>' + (st.calibrated ? ppm().toFixed(2) + ' px per mm on this screen' : 'Calibrate once with a bank card for exact 1:1 size') + '</span></div><button class="btn steel" data-act="calibrate">' + (st.calibrated ? 'Recalibrate' : 'Calibrate') + '</button></div>' +
      '<div id="fitDraw" class="fitdraw"></div>' +
      (f.id ? '<button class="btn ghost wide" data-act="fit-save">Save these measurements to ' + esc(f.label) + '</button>' : '') +
      '<p class="fine">Wrist width is estimated from circumference (about 34.5% of it). Hold the phone flat against your wrist to compare.</p>';
  },
  after: function () { drawFit(); }
};
function drawFit() {
  var box = $('#fitDraw'); if (!box) return;
  var f = ui.fit, cm = S.settings.wristCm || 17, P = ppm(), W = box.clientWidth || 340;
  var v = fitVerdict(cm, f.d, f.l, f.t), ww = v.ww;
  $('#fitVerdict').innerHTML = '<div class="verdict ' + v.tone + '"><div class="v-k">Verdict</div><h3>' + v.head + '</h3><ul>' + v.pts.map(function (p) { return '<li>' + p + '</li>'; }).join('') + '</ul><div class="v-bar"><i style="width:' + clamp((v.ratio - .5) / .65 * 100, 4, 100) + '%"></i><em style="left:33.8%"></em><em style="left:64.6%"></em><em class="edge" style="left:76.9%"></em></div><div class="v-leg"><span>small</span><span>ideal</span><span>large</span><span>over</span></div></div>';
  var G = '#9dffb5', ST = '#8b9299', BAD = '#ff6b5e';
  /* top view */
  var H = Math.max(ww, f.l) * P + 76, cx = W / 2, cy = H / 2, wt = cy - ww * P / 2, wb = cy + ww * P / 2;
  var r = f.d / 2 * P, lt = cy - f.l / 2 * P, lb = cy + f.l / 2 * P, sw = f.d * 0.5 * P, lw = Math.max(3, f.d * 0.09 * P);
  var s = '<svg width="' + W + '" height="' + n2(H) + '" viewBox="0 0 ' + W + ' ' + n2(H) + '" role="img" aria-label="Top view at true scale">' +
    '<defs><linearGradient id="armG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#15181b"/><stop offset=".5" stop-color="#23272c"/><stop offset="1" stop-color="#15181b"/></linearGradient></defs>' +
    '<rect x="-4" y="' + n2(wt) + '" width="' + (W + 8) + '" height="' + n2(ww * P) + '" fill="url(#armG)" stroke="' + ST + '" stroke-dasharray="6 5" stroke-opacity=".7"/>' +
    '<text x="10" y="' + n2(wb - 9) + '" class="ft">TOP VIEW</text>' +
    '<rect x="' + n2(cx - sw / 2) + '" y="' + n2(wt) + '" width="' + n2(sw) + '" height="' + n2(ww * P) + '" fill="#0d0f11" stroke="#3b4046"/>';
  if (f.l > ww) {
    s += '<rect x="' + n2(cx - r) + '" y="' + n2(lt) + '" width="' + n2(2 * r) + '" height="' + n2(wt - lt) + '" fill="' + BAD + '" opacity=".22"/><rect x="' + n2(cx - r) + '" y="' + n2(wb) + '" width="' + n2(2 * r) + '" height="' + n2(lb - wb) + '" fill="' + BAD + '" opacity=".22"/>';
  }
  [-1, 1].forEach(function (sx) {
    s += '<rect x="' + n2(cx + sx * (sw / 2 + lw / 2) - lw / 2) + '" y="' + n2(lt) + '" width="' + n2(lw) + '" height="' + n2(f.l * P) + '" rx="' + n2(lw / 3) + '" fill="#111417" stroke="' + (f.l > ww ? BAD : G) + '" stroke-width="1.5"/>';
  });
  s += '<rect x="' + n2(cx + r - 1) + '" y="' + n2(cy - 2.2 * P) + '" width="' + n2(2.6 * P) + '" height="' + n2(4.4 * P) + '" rx="2" fill="#111417" stroke="' + G + '" stroke-width="1.5"/>' +
    '<circle cx="' + cx + '" cy="' + n2(cy) + '" r="' + n2(r) + '" fill="#0a0c0e" stroke="' + G + '" stroke-width="2"/>' +
    '<circle cx="' + cx + '" cy="' + n2(cy) + '" r="' + n2(r * .82) + '" fill="none" stroke="' + G + '" stroke-opacity=".35"/>';
  for (var i = 0; i < 12; i++) { var a = pt(i * 30, r * .7), b = pt(i * 30, r * .8); s += '<line x1="' + n2(cx + a[0]) + '" y1="' + n2(cy + a[1]) + '" x2="' + n2(cx + b[0]) + '" y2="' + n2(cy + b[1]) + '" stroke="' + G + '" stroke-opacity=".5" stroke-width="' + (i % 3 ? 1 : 2) + '"/>'; }
  s += '<text x="' + cx + '" y="' + n2(cy - 4) + '" text-anchor="middle" class="fnum">' + n2(f.d) + '</text><text x="' + cx + '" y="' + n2(cy + 14) + '" text-anchor="middle" class="ft">MM CASE</text>';
  var dx = Math.min(W - 16, cx + r + 30);
  s += '<path d="M' + n2(dx - 6) + ' ' + n2(lt) + 'H' + n2(dx + 6) + 'M' + n2(dx) + ' ' + n2(lt) + 'V' + n2(lb) + 'M' + n2(dx - 6) + ' ' + n2(lb) + 'H' + n2(dx + 6) + '" stroke="' + ST + '" fill="none"/>' +
    '<text transform="translate(' + n2(dx + 13) + ' ' + n2(cy) + ') rotate(90)" text-anchor="middle" class="ft">LUG-TO-LUG ' + n2(f.l) + ' MM</text>';
  var wx = Math.max(16, cx - r - 30);
  s += '<path d="M' + n2(wx - 6) + ' ' + n2(wt) + 'H' + n2(wx + 6) + 'M' + n2(wx) + ' ' + n2(wt) + 'V' + n2(wb) + 'M' + n2(wx - 6) + ' ' + n2(wb) + 'H' + n2(wx + 6) + '" stroke="' + ST + '" fill="none"/>' +
    '<text transform="translate(' + n2(wx - 7) + ' ' + n2(cy) + ') rotate(-90)" text-anchor="middle" class="ft">WRIST ≈ ' + ww.toFixed(0) + ' MM</text></svg>';
  /* profile view */
  var ea = ww / 2, eb = Math.max(ea * .55, cm * 10 / (Math.PI * 1.008) - ea);
  var H2 = (eb * 2 + f.t) * P + 56, top = 26 + f.t * P, ecy = top + eb * P;
  var half = f.l / 2, lugY = top + 1.2 * P, gap = null;
  if (half < ea) { var surf = ecy - eb * P * Math.sqrt(1 - (half / ea) * (half / ea)); gap = (surf - lugY) / P; }
  var s2 = '<svg width="' + W + '" height="' + n2(H2) + '" viewBox="0 0 ' + W + ' ' + n2(H2) + '" role="img" aria-label="Side profile at true scale">' +
    '<ellipse cx="' + cx + '" cy="' + n2(ecy) + '" rx="' + n2(ea * P + 1.6 * P) + '" ry="' + n2(eb * P + 1.6 * P) + '" fill="none" stroke="#3b4046" stroke-width="' + n2(2.4 * P) + '"/>' +
    '<ellipse cx="' + cx + '" cy="' + n2(ecy) + '" rx="' + n2(ea * P) + '" ry="' + n2(eb * P) + '" fill="url(#armG)" stroke="' + ST + '" stroke-dasharray="6 5" stroke-opacity=".7"/>' +
    '<text x="' + cx + '" y="' + n2(ecy + 4) + '" text-anchor="middle" class="ft">WRIST · CROSS-SECTION</text>' +
    '<path d="M' + n2(cx - r) + ' ' + n2(top - 1.5 * P) + 'L' + n2(cx - half * P) + ' ' + n2(lugY) + 'M' + n2(cx + r) + ' ' + n2(top - 1.5 * P) + 'L' + n2(cx + half * P) + ' ' + n2(lugY) + '" stroke="' + (f.l > ww ? BAD : G) + '" stroke-width="' + n2(Math.max(2, 2.2 * P)) + '" stroke-linecap="round"/>' +
    '<rect x="' + n2(cx - r) + '" y="' + n2(top - f.t * P) + '" width="' + n2(2 * r) + '" height="' + n2(f.t * P) + '" rx="' + n2(Math.min(6, f.t * P / 3)) + '" fill="#0a0c0e" stroke="' + G + '" stroke-width="2"/>' +
    '<path d="M' + n2(cx + r + 10) + ' ' + n2(top - f.t * P) + 'h10M' + n2(cx + r + 15) + ' ' + n2(top - f.t * P) + 'V' + n2(top) + 'M' + n2(cx + r + 10) + ' ' + n2(top) + 'h10" stroke="' + ST + '" fill="none"/>' +
    '<text x="' + n2(cx + r + 26) + '" y="' + n2(top - f.t * P / 2 + 4) + '" class="ft">' + n2(f.t) + ' MM</text>' +
    '<text x="10" y="16" class="ft">SIDE PROFILE' + (gap != null ? ' · GAP UNDER LUGS ≈ ' + Math.max(0, gap).toFixed(1) + ' MM' : ' · LUGS PAST WRIST EDGE') + '</text></svg>';
  box.innerHTML = s + s2;
}
ACT['fit-pick'] = function (el) {
  var w = watchById(el.dataset.id);
  ui.fit = w ? { id: w.id, d: +w.diameter, l: +w.l2l, t: +w.thickness, label: wname(w) } : { id: null, d: ui.fit.d, l: ui.fit.l, t: ui.fit.t, label: 'Custom watch' };
  rerender();
};
ACT.unit = function (el) { S.settings.unit = el.dataset.v; save(); rerender(); };
IN['fit-wrist'] = function (el) {
  var v = num(el.value, 0); if (!v) return;
  var cm = (S.settings.unit === 'in') ? v * 2.54 : v;
  if (cm < 10 || cm > 30) return;
  S.settings.wristCm = Math.round(cm * 100) / 100; save(); drawFit();
};
IN['fit-dim'] = function (el) {
  var v = num(el.value, 0), k = el.dataset.k; if (!v || v < 2 || v > 80) return;
  ui.fit[k] = v; drawFit();
};
ACT['fit-save'] = function () {
  var w = watchById(ui.fit.id); if (!w) return;
  w.diameter = ui.fit.d; w.l2l = ui.fit.l; w.thickness = ui.fit.t; save(); toast('Measurements saved to ' + wname(w));
};
ACT.calibrate = function () {
  ui.cal = ppm();
  openModal('<div class="calib"><div class="cal-area"><div id="calCard" class="cal-card"><span>Place the card here,<br>top-left corners together</span></div></div>' +
    '<div class="cal-ctl"><h3>Calibrate true scale</h3><p>Hold any standard bank or ID card (85.6 × 54 mm) upright against the screen, its top-left corner in the marked corner. Adjust until the green outline matches the card’s right and bottom edges.</p>' +
    '<div class="cal-row"><button class="btn steel sq" data-act="cal-step" data-v="-0.02" aria-label="Smaller">−</button><input type="range" id="calRange" min="4.2" max="8.6" step="0.01" value="' + ui.cal.toFixed(2) + '" data-in="cal" aria-label="Scale"><button class="btn steel sq" data-act="cal-step" data-v="0.02" aria-label="Larger">+</button></div>' +
    '<div class="mrow"><button class="btn ghost" data-act="modal-close">Cancel</button><button class="btn lume" data-act="cal-save">Save scale</button></div></div></div>', 'full lock');
  calDraw();
};
function calDraw() { var c = $('#calCard'); if (!c) return; c.style.width = (53.98 * ui.cal) + 'px'; c.style.height = (85.6 * ui.cal) + 'px'; c.style.borderRadius = (3.18 * ui.cal) + 'px'; }
IN.cal = function (el) { ui.cal = num(el.value, ui.cal); calDraw(); };
ACT['cal-step'] = function (el) { ui.cal = clamp(ui.cal + (+el.dataset.v), 4.2, 8.6); $('#calRange').value = ui.cal.toFixed(2); calDraw(); };
ACT['cal-save'] = function () { S.settings.pxPerMm = Math.round(ui.cal * 100) / 100; S.settings.calibrated = true; save(); closeModal(); toast('Scale calibrated'); rerender(); };

/* =================== ACCURACY LOG =================== */
function accChart(w) {
  var rr = rates(w).filter(function (r) { return r.rate != null; }), sp = specOf(w);
  if (!rr.length) return '<div class="chart-empty">No rate yet. Sync once to set a baseline, then again a day or more later — or take a Timegrapher reading.</div>';
  var Wd = 340, Hd = 190, L = 36, Rr = 12, T = 14, B = 26;
  var lo = Math.min(sp.min, Math.min.apply(null, rr.map(function (r) { return r.rate; }))), hi = Math.max(sp.max, Math.max.apply(null, rr.map(function (r) { return r.rate; })));
  var pad = Math.max(1, (hi - lo) * .15); lo -= pad; hi += pad;
  var t0 = rr[0].t, t1 = rr[rr.length - 1].t, X = function (t) { return t1 === t0 ? (L + (Wd - L - Rr) / 2) : L + (t - t0) / (t1 - t0) * (Wd - L - Rr); }, Y = function (v) { return T + (hi - v) / (hi - lo) * (Hd - T - B); };
  var s = '<svg class="chart" viewBox="0 0 ' + Wd + ' ' + Hd + '" role="img" aria-label="Rate in seconds per day over time">';
  s += '<rect x="' + L + '" y="' + n2(Y(sp.max)) + '" width="' + (Wd - L - Rr) + '" height="' + n2(Y(sp.min) - Y(sp.max)) + '" fill="#9dffb5" opacity=".1"/>';
  s += '<line x1="' + L + '" x2="' + (Wd - Rr) + '" y1="' + n2(Y(sp.max)) + '" y2="' + n2(Y(sp.max)) + '" stroke="#9dffb5" stroke-opacity=".5" stroke-dasharray="3 4"/><line x1="' + L + '" x2="' + (Wd - Rr) + '" y1="' + n2(Y(sp.min)) + '" y2="' + n2(Y(sp.min)) + '" stroke="#9dffb5" stroke-opacity=".5" stroke-dasharray="3 4"/>';
  if (lo < 0 && hi > 0) s += '<line x1="' + L + '" x2="' + (Wd - Rr) + '" y1="' + n2(Y(0)) + '" y2="' + n2(Y(0)) + '" stroke="#5b626a"/><text x="' + (L - 6) + '" y="' + n2(Y(0) + 4) + '" text-anchor="end" class="ct">0</text>';
  s += '<text x="' + (L - 6) + '" y="' + n2(Y(sp.max) + 4) + '" text-anchor="end" class="ct g">' + (sp.max > 0 ? '+' : '') + sp.max + '</text><text x="' + (L - 6) + '" y="' + n2(Y(sp.min) + 4) + '" text-anchor="end" class="ct g">' + (sp.min < 0 ? '−' + Math.abs(sp.min) : sp.min) + '</text>';
  var line = rr.filter(function (r) { return r.type !== 'tg'; });
  if (line.length > 1) s += '<polyline points="' + line.map(function (r) { return n2(X(r.t)) + ',' + n2(Y(r.rate)); }).join(' ') + '" fill="none" stroke="#c9cdd2" stroke-width="1.6"/>';
  rr.forEach(function (r) {
    var out = r.rate < sp.min || r.rate > sp.max, c = out ? '#ffb454' : '#9dffb5', x = X(r.t), y = Y(r.rate);
    s += r.type === 'tg' ? '<path d="M' + n2(x) + ' ' + n2(y - 5.5) + 'l5.5 5.5l-5.5 5.5l-5.5 -5.5Z" fill="#050607" stroke="' + c + '" stroke-width="2"/>' : '<circle cx="' + n2(x) + '" cy="' + n2(y) + '" r="4.5" fill="' + c + '" stroke="#050607" stroke-width="1.5"/>';
  });
  var last = rr[rr.length - 1];
  s += '<text x="' + n2(Math.min(Wd - Rr, X(last.t))) + '" y="' + n2(Y(last.rate) - 10) + '" text-anchor="end" class="ct b">' + fmtRate(last.rate) + '</text>';
  s += '<text x="' + L + '" y="' + (Hd - 6) + '" class="ct">' + fmtDate(t0).replace(/ \d{4}$/, '') + '</text><text x="' + (Wd - Rr) + '" y="' + (Hd - 6) + '" text-anchor="end" class="ct">' + fmtDate(t1).replace(/ \d{4}$/, '') + '</text>';
  return s + '</svg><div class="legend"><span><i class="lg-dot"></i>Sync reading</span><span><i class="lg-dia"></i>Timegrapher</span><span><i class="lg-band"></i>Within spec</span></div>';
}
TOOLS.accuracy = {
  kicker: 'No. 02 — Seconds per day', title: 'Accuracy Log',
  render: function () {
    var w = selWatch(); if (!w) return emptyTool('Add a watch to start tracking how well it keeps time.');
    var rr = rates(w), withRate = rr.filter(function (r) { return r.rate != null; }), av = avgRate(w), sp = specOf(w), last = withRate[withRate.length - 1];
    var flag = '';
    if (last && (last.rate < sp.min || last.rate > sp.max)) flag = '<div class="flag warn"><b>Beyond spec</b>Latest rate ' + fmtRate(last.rate) + ' s/d is outside ' + esc(sp.n) + ' (' + specLabel(sp) + ').' + (av != null && av >= sp.min && av <= sp.max ? ' The average is still within tolerance — check again before acting; resting position affects rate.' : ' If this persists, the watch may need regulation or a service.') + '</div>';
    else if (av != null && (av < sp.min || av > sp.max)) flag = '<div class="flag warn"><b>Beyond spec</b>Average rate ' + fmtRate(av) + ' s/d is outside ' + esc(sp.n) + ' (' + specLabel(sp) + ').</div>';
    else if (av != null) flag = '<div class="flag ok"><b>Within spec</b>Running inside ' + esc(sp.n) + ' (' + specLabel(sp) + ').</div>';
    var pos = {}; withRate.forEach(function (r) { var k = r.pos || 'Mixed'; (pos[k] = pos[k] || []).push(r.rate); });
    var posH = Object.keys(pos).map(function (k) { var a = pos[k].reduce(function (x, y) { return x + y; }, 0) / pos[k].length; return '<div class="prow"><span>' + esc(k) + '</span><div class="pbar"><i style="left:50%;width:' + clamp(Math.abs(a) * 2.5, 1, 50) + '%;' + (a < 0 ? 'transform:translateX(-100%)' : '') + '"></i></div><b>' + fmtRate(a) + '</b></div>'; }).join('');
    var list = rr.slice().reverse().map(function (r) {
      var d = new Date(r.t), when = fmtDate(r.t) + ' · ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
      var main = r.type === 'tg' ? ('Timegrapher · ' + (+r.bph).toLocaleString('en-US') + ' bph · beat error ' + (+r.beat).toFixed(1) + ' ms') : ((r.reset ? 'Watch set · ' : '') + 'offset ' + (r.offset >= 0 ? '+' : '−') + Math.abs(r.offset).toFixed(1) + ' s');
      return '<div class="rd"><div class="rd-rate ' + (r.rate == null ? 'nil' : (r.rate < sp.min || r.rate > sp.max) ? 'out' : '') + '">' + (r.rate == null ? 'base' : fmtRate(r.rate)) + '</div><div class="rd-m"><b>' + main + '</b><span>' + when + ' · ' + esc(r.pos || '') + '</span></div><button class="icon-b" data-act="rd-del" data-id="' + r.id + '" aria-label="Delete reading"><svg viewBox="0 0 24 24" width="18" height="18"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button></div>';
    }).join('');
    var specOpts = Object.keys(SPECS).map(function (k) { return '<option value="' + k + '"' + (w.spec === k ? ' selected' : '') + '>' + SPECS[k].n + (SPECS[k].min != null ? ' (' + specLabel(SPECS[k]) + ')' : '') + '</option>'; }).join('');
    return watchStrip(w.id, 'sel') +
      '<div class="hero"><div class="hero-n">' + (av == null ? '—' : fmtRate(av)) + '</div><div class="hero-u">seconds / day<br><em>average rate</em></div></div>' + flag +
      '<div class="two"><button class="btn lume big" data-act="sync-open"><svg viewBox="-12 -12 24 24" width="22" height="22"><circle r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M0 -6V0" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>Sync now</button><button class="btn steel big" data-act="tool" data-tool="timegrapher"><svg viewBox="0 0 24 24" width="22" height="22"><path d="M2 14h4l2-8 3 13 3-9 2 4h6" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/></svg>Timegrapher</button></div>' +
      '<div class="rule"><span>Rate over time</span></div>' + accChart(w) +
      (posH ? '<div class="rule"><span>By position</span></div><div class="ptable">' + posH + '</div>' : '') +
      '<div class="rule"><span>Tolerance</span></div><label class="fld"><span>Specification for this movement</span><select data-in="spec">' + specOpts + '</select></label>' +
      (w.spec === 'custom' ? '<div class="grid2"><label class="fld"><span>Slowest allowed (s/d)</span><input data-in="spec-c" data-k="specMin" inputmode="text" value="' + esc(w.specMin) + '"></label><label class="fld"><span>Fastest allowed (s/d)</span><input data-in="spec-c" data-k="specMax" inputmode="text" value="' + esc(w.specMax) + '"></label></div>' : '') +
      '<div class="rule"><span>Readings</span></div>' + (list || '<p class="fine">No readings yet.</p>') +
      '<p class="fine">How it works: when your watch’s seconds hand reaches 12, tap Sync. The app compares that instant with the phone’s clock and stores the offset. The change in offset between two readings gives the rate.</p>';
  }
};
ACT.sel = function (el) { ui.sel = el.dataset.id; if (ui.tool === 'timegrapher') tgStop(); rerender(); };
IN.spec = function (el) { var w = selWatch(); w.spec = el.value; save(); rerender(); };
IN['spec-c'] = function (el, type) { if (type !== 'change') return; var w = selWatch(); w[el.dataset.k] = num(el.value.replace('−', '-'), 0); save(); rerender(); };
ACT['rd-del'] = function (el) {
  var w = selWatch(), id = el.dataset.id;
  confirmBox('Delete this reading?', 'Rates on either side of it will be recalculated.', 'Delete', function () { w.readings = w.readings.filter(function (r) { return r.id !== id; }); save(); rerender(); });
};
function syncDial() {
  var s = '<svg viewBox="-110 -110 220 220" class="syncdial" aria-hidden="true"><circle r="104" fill="#0b0d0f" stroke="#9dffb5" stroke-width="2"/>';
  for (var i = 0; i < 60; i++) { var a = pt(i * 6, i % 5 ? 94 : 88), b = pt(i * 6, 100); s += '<line x1="' + n2(a[0]) + '" y1="' + n2(a[1]) + '" x2="' + n2(b[0]) + '" y2="' + n2(b[1]) + '" stroke="' + (i === 0 ? '#9dffb5' : '#8b9299') + '" stroke-width="' + (i % 5 ? 1 : 2.4) + '"/>'; }
  s += '<path d="M-7 -84L7 -84L0 -70Z" fill="#9dffb5"/><g class="sh" id="syncHand"><line y1="16" y2="-80" stroke="#9dffb5" stroke-width="2"/><circle r="4" fill="#9dffb5"/></g>';
  s += '<text y="40" text-anchor="middle" font-family="' + CONDFONT + '" font-size="26" letter-spacing="6" fill="#e9ebed">SYNC</text><text id="syncSec" y="62" text-anchor="middle" font-family="' + NUMFONT + '" font-size="15" fill="#8b9299">phone :00</text></svg>';
  return s;
}
ACT['sync-open'] = function () {
  var w = selWatch(); if (!w) return;
  ui.sync = { stage: 'arm', min: 0, pos: 'On the wrist', reset: !w.readings.some(function (r) { return r.type !== 'tg'; }) };
  syncRender();
};
function syncRender() {
  var w = selWatch(), sy = ui.sync, h;
  if (sy.stage === 'arm') {
    h = '<h3>Sync ' + esc(wname(w)) + '</h3><p class="mtext">Watch the seconds hand on your <b>watch</b>. Tap the dial below at the exact moment it reaches 12.</p>' +
      '<button class="sync-b" id="syncBtn" aria-label="Sync now">' + syncDial() + '</button><div class="mrow"><button class="btn ghost" data-act="modal-close">Cancel</button></div>';
    openModal(h, 'syncm', function () { tickers = tickers.filter(function (f) { return f !== syncTick; }); });
    liveExtra = [{ s: $('#syncHand'), q: false }];
    tickers.push(syncTick); syncTick(new Date());
    $('#syncBtn').addEventListener('pointerdown', function (e) {
      e.preventDefault();
      var T = Date.now(), sec = (T / 1000) % 60;
      sy.t = T; sy.base = sec < 30 ? -sec : 60 - sec; sy.stage = 'result';
      if (navigator.vibrate) { try { navigator.vibrate(12); } catch (x) { } }
      syncRender();
    });
  } else {
    var off = sy.base + sy.min * 60;
    h = '<h3>Reading captured</h3><div class="sync-res"><div class="hero-n">' + (off >= 0 ? '+' : '−') + Math.abs(off).toFixed(1) + '<small>s</small></div><div class="hero-u">' + (Math.abs(off) < 0.05 ? 'dead on' : off > 0 ? 'watch is ahead of the phone' : 'watch is behind the phone') + '</div></div>' +
      '<div class="stepper"><span>Minute hand also off?</span><button class="btn steel sq" data-act="sync-min" data-v="-1" aria-label="One minute behind">−1</button><b>' + (sy.min > 0 ? '+' : '') + sy.min + ' min</b><button class="btn steel sq" data-act="sync-min" data-v="1" aria-label="One minute ahead">+1</button></div>' +
      '<div class="rule"><span>Position since the last reading</span></div>' + chips(POSITIONS.map(function (p) { return [p, p]; }), sy.pos, 'sync-pos') +
      '<label class="check"><input type="checkbox" data-in="sync-reset"' + (sy.reset ? ' checked' : '') + '><span>I have just set the watch — start a new run</span></label>' +
      '<div class="mrow"><button class="btn ghost" data-act="sync-open">Redo</button><button class="btn lume" data-act="sync-save">Save reading</button></div>';
    openModal(h, 'syncm');
  }
}
function syncTick(d) { var e = $('#syncSec'); if (e) e.textContent = 'phone :' + String(d.getSeconds()).padStart(2, '0'); }
ACT['sync-min'] = function (el) { ui.sync.min = clamp(ui.sync.min + (+el.dataset.v), -30, 30); syncRender(); };
ACT['sync-pos'] = function (el) { ui.sync.pos = el.dataset.v; syncRender(); };
IN['sync-reset'] = function (el) { ui.sync.reset = el.checked; };
ACT['sync-save'] = function () {
  var w = selWatch(), sy = ui.sync, first = !w.readings.some(function (r) { return r.type !== 'tg'; });
  w.readings.push({ id: uid(), t: sy.t, offset: Math.round((sy.base + sy.min * 60) * 10) / 10, pos: sy.pos, reset: !!sy.reset || first });
  save(); closeModal(); rerender();
  toast(first || sy.reset ? 'Baseline saved. Sync again in a day for a rate.' : 'Reading saved');
};

/* =================== TIMEGRAPHER =================== */
var tg = { status: 'idle', pos: 'Dial up' };
function tgStop() {
  if (tg.raf) cancelAnimationFrame(tg.raf); tg.raf = 0;
  try { if (tg.proc) { tg.proc.onaudioprocess = null; if (tg.proc.port) tg.proc.port.onmessage = null; tg.proc.disconnect(); } } catch (e) { }
  try { if (tg.stream) tg.stream.getTracks().forEach(function (t) { t.stop(); }); } catch (e) { }
  try { if (tg.ctx && tg.ctx.state !== 'closed') tg.ctx.close(); } catch (e) { }
  tg.proc = tg.stream = tg.ctx = tg.sim = null;
  if (tg.status === 'live' || tg.status === 'sim' || tg.status === 'starting') tg.status = tg.res ? 'held' : 'idle';
}
function tgStartMic() {
  tgStop(); tg.res = null; tg.saved = false; tg.anchor = null;
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !(window.AudioContext || window.webkitAudioContext)) { tg.status = 'unsupported'; rerender(); return; }
  tg.status = 'starting'; rerender();
  navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false, channelCount: 1 } }).then(function (stream) {
    if (ui.tool !== 'timegrapher' || tg.status !== 'starting') { stream.getTracks().forEach(function (t) { t.stop(); }); return; }
    var AC = window.AudioContext || window.webkitAudioContext, ctx = new AC();
    var src = ctx.createMediaStreamSource(stream), hp = ctx.createBiquadFilter(), mute = ctx.createGain();
    hp.type = 'highpass'; hp.frequency.value = 1200; mute.gain.value = 0;
    tg.eng = new TGEngine(ctx.sampleRate); tg.stream = stream; tg.ctx = ctx;
    var go = function (node) {
      if (tg.ctx !== ctx) return;
      src.connect(hp); hp.connect(node); node.connect(mute); mute.connect(ctx.destination);
      if (ctx.state === 'suspended') ctx.resume();
      tg.proc = node; tg.status = 'live'; tg.t0 = performance.now(); tg.lastA = 0;
      rerender(); tg.raf = requestAnimationFrame(tgLoop);
    };
    var legacy = function () {
      var proc = ctx.createScriptProcessor(2048, 1, 1);
      proc.onaudioprocess = function (e) { if (tg.eng) tg.eng.feed(e.inputBuffer.getChannelData(0)); };
      go(proc);
    };
    /* An audio worklet keeps every sample even when the screen is busy; older WebViews fall back. */
    if (ctx.audioWorklet && window.AudioWorkletNode) {
      var code = 'class T extends AudioWorkletProcessor{constructor(){super();this.b=new Float32Array(2048);this.n=0}process(i){var c=i[0]&&i[0][0];if(c){for(var k=0;k<c.length;k++){this.b[this.n++]=c[k];if(this.n===2048){this.port.postMessage(this.b.slice(0));this.n=0}}}return true}}registerProcessor("vtp-tap",T)';
      var attach = function () {
        var node = new AudioWorkletNode(ctx, 'vtp-tap', { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [1] });
        node.port.onmessage = function (e) { if (tg.eng) tg.eng.feed(e.data); };
        go(node);
      };
      ctx.audioWorklet.addModule('data:application/javascript;base64,' + btoa(code)).then(attach).catch(function () {
        var url = URL.createObjectURL(new Blob([code], { type: 'application/javascript' }));
        return ctx.audioWorklet.addModule(url).then(attach);
      }).catch(legacy);
    } else legacy();
  }).catch(function (err) {
    tg.status = (err && (err.name === 'NotAllowedError' || err.name === 'SecurityError')) ? 'denied' : 'unsupported'; rerender();
  });
}
function tgStartSim() {
  tgStop(); tg.res = null; tg.saved = false; tg.anchor = null;
  var w = selWatch(), bph = 28800;
  tg.eng = new TGEngine(48000); tg.sim = new TGSim(48000, bph, 6.5, 0.6);
  tg.status = 'sim'; tg.t0 = performance.now(); tg.lastF = tg.t0; tg.lastA = 0;
  rerender(); tg.raf = requestAnimationFrame(tgLoop);
}
function tgLoop(ts) {
  if (ui.tool !== 'timegrapher' || (tg.status !== 'live' && tg.status !== 'sim')) return;
  if (tg.sim) { var dt = Math.min(0.25, (ts - tg.lastF) / 1000); tg.lastF = ts; var nS = Math.round(dt * 48000); if (nS > 0) tg.eng.feed(tg.sim.make(nS)); }
  if (ts - tg.lastA > 350) {
    tg.lastA = ts; var r = tg.eng.analyse(40);
    if (r) { if (!tg.anchor || tg.anchor.bph !== r.bph) tg.anchor = { bph: r.bph, t: r.pts[0].t }; tg.res = r; }
    tgReadout();
  }
  tgDraw();
  tg.raf = requestAnimationFrame(tgLoop);
}
function tgReadout() {
  var r = tg.res, run = tg.status === 'live' || tg.status === 'sim', lock = run && tg.eng && tg.eng.res;
  var set = function (id, v) { var e = $('#' + id); if (e && e.textContent !== v) e.textContent = v; };
  set('tgRate', r ? fmtRate(r.rate) : '—'); set('tgBeat', r ? r.beat.toFixed(1) : '—'); set('tgBph', r ? r.bph.toLocaleString('en-US') : '—');
  var msg;
  if (tg.status === 'starting') msg = 'Waiting for microphone permission…';
  else if (!run) msg = r ? 'Reading held. Save it, or measure again.' : 'Ready when you are.';
  else if (!lock) msg = tg.eng.ticks.length < 4 ? 'Listening… press the microphone against the caseback.' : 'Hearing sound, but no steady beat yet. Hold still, somewhere quieter.';
  else if (r.span < 10) msg = 'Locked at ' + r.bph.toLocaleString('en-US') + ' bph — measuring, ' + Math.ceil(10 - r.span) + ' s to go…';
  else if (r.span < 25) msg = 'Good signal. Keep holding for a steadier figure.';
  else msg = 'Stable reading over ' + Math.round(r.span) + ' s.';
  if (tg.status === 'sim') msg = 'Practice signal — ' + msg;
  set('tgMsg', msg);
  var st = $('#tgStab'); if (st) st.style.width = (r && lock ? clamp(r.span / 30 * 100, 3, 100) : 0) + '%';
  var sb = $('#tgSave'); if (sb) sb.disabled = !(r && r.span >= 10 && tg.status !== 'sim' && !tg.saved);
}
function tgDraw() {
  var c = $('#tgCanvas'); if (!c || !tg.eng) return;
  var dpr = Math.min(3, window.devicePixelRatio || 1), W = c.clientWidth, H = c.clientHeight;
  if (c.width !== Math.round(W * dpr)) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); }
  var g = c.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.fillStyle = '#060809'; g.fillRect(0, 0, W, H);
  var topH = 46, i, x, y;
  g.strokeStyle = 'rgba(157,255,181,.09)'; g.lineWidth = 1; g.beginPath();
  for (x = W % 30; x < W; x += 30) { g.moveTo(x + .5, topH); g.lineTo(x + .5, H); }
  for (y = topH; y < H; y += 24) { g.moveTo(0, y + .5); g.lineTo(W, y + .5); }
  g.stroke();
  g.strokeStyle = 'rgba(139,146,153,.35)'; g.beginPath(); g.moveTo(0, topH + .5); g.lineTo(W, topH + .5); g.stroke();
  /* level strip: last 2 s */
  var e = tg.eng, L = e.lvl, n = L.length, mx = Math.max(e.peak * 1.2, 0.004);
  g.fillStyle = '#3f8f5b';
  for (i = 0; i < n; i++) { var v = L[(e.lvlI + i) % n], hh = Math.min(1, v / mx) * (topH - 8); g.fillRect(i / n * W, topH - 3 - hh, Math.max(1, W / n), hh); }
  /* paper trace: last 30 s */
  var a = tg.anchor, r = e.res;
  if (a && r) {
    var T = 3600 / a.bph, Wn = 0.012, now = e.now(), ph = H - topH - 12;
    for (i = 0; i < r.pts.length; i++) {
      var t = r.pts[i].t, k = Math.round((t - a.t) / T), dev = (t - a.t) - k * T;
      var yy = (((dev + Wn / 2) % Wn) + Wn) % Wn / Wn;
      x = W - (now - t) / 30 * W; if (x < 0) continue;
      g.fillStyle = (k % 2) ? '#e9ebed' : '#9dffb5';
      g.beginPath(); g.arc(x, topH + 6 + yy * ph, 2.2, 0, 6.3); g.fill();
    }
  }
  g.fillStyle = '#8b9299'; g.font = '10px ' + CONDFONT; g.fillText('SIGNAL', 8, 13); g.fillText('TRACE · 30 S · 12 MS', 8, topH + 14);
}
TOOLS.timegrapher = {
  kicker: 'No. 03 — Listen to the movement', title: 'Timegrapher',
  open: function () { tg.status = 'idle'; tg.res = null; tg.saved = false; tg.eng = null; },
  close: function () { tgStop(); },
  render: function () {
    var w = selWatch(); if (!w) return emptyTool('Add a watch to measure its beat with the microphone.');
    var run = tg.status === 'live' || tg.status === 'sim' || tg.status === 'starting';
    var qz = w.movement === 'quartz' || w.movement === 'solar' || w.movement === 'springdrive';
    var deny = '';
    if (tg.status === 'denied') deny = '<div class="flag warn"><b>Microphone access is off</b>The timegrapher needs the microphone to hear the movement. Allow it in Settings › Vilasi Timepieces › Microphone, then try again. Nothing is recorded or sent anywhere. You can still log accuracy with the Sync method, or try the practice signal below.</div><button class="btn steel wide" data-act="tg-to-sync">Use Sync instead</button>';
    if (tg.status === 'unsupported') deny = '<div class="flag warn"><b>No microphone available</b>This device or browser did not provide audio input. You can still log accuracy with the Sync method, or try the practice signal below.</div><button class="btn steel wide" data-act="tg-to-sync">Use Sync instead</button>';
    return watchStrip(w.id, 'sel') +
      (qz ? '<div class="flag note"><b>Mechanical movements only</b>' + esc(wname(w)) + ' is ' + (MOVES[w.movement] || '').toLowerCase() + '; it has no balance wheel to listen to. Use Sync for this watch.</div>' : '') +
      '<div class="tg-screen"><canvas id="tgCanvas" aria-label="Live timegrapher trace"></canvas><div class="tg-stab"><i id="tgStab"></i></div></div>' +
      '<div id="tgMsg" class="tg-msg" role="status">Ready when you are.</div>' +
      '<div class="tg-read"><div><b id="tgRate">—</b><span>seconds / day</span></div><div><b id="tgBeat">—</b><span>ms beat error</span></div><div><b id="tgBph">—</b><span>beats / hour</span></div></div>' +
      deny +
      '<div class="two">' + (run ? '<button class="btn steel big" data-act="tg-stop">Stop</button>' : '<button class="btn lume big" data-act="tg-start"><svg viewBox="0 0 24 24" width="20" height="20"><rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor"/><path d="M5 11a7 7 0 0014 0M12 18v3" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/></svg>Listen</button>') +
      '<button class="btn steel big" id="tgSave" data-act="tg-save" disabled>Save to log</button></div>' +
      '<div class="rule"><span>Position during the test</span></div>' + chips(POSITIONS.filter(function (p) { return p !== 'Mixed' && p !== 'On the wrist'; }).map(function (p) { return [p, p]; }), tg.pos, 'tg-pos') +
      '<div class="rule"><span>For a clean reading</span></div>' +
      '<ol class="steps"><li><b>Find a quiet room.</b> Fans, traffic and talking drown out the tick. Quiet works best.</li><li><b>Wind the watch</b> fully, and take it off the wrist.</li><li><b>Press the phone’s microphone</b> (bottom edge, beside the charging port) flat against the caseback. Rest both on something soft.</li><li><b>Hold still for 30 seconds.</b> The bar under the trace fills as the reading settles.</li></ol>' +
      '<p class="fine">Reading the trace: each dot is one tick. A level line means the watch is on time, a rising or falling line means it gains or loses, and two parallel lines show beat error. Beat rate is detected automatically (18,000 / 21,600 / 28,800 / 36,000 bph). Figures depend on your phone’s audio clock and are a guide, not a substitute for a watchmaker’s instrument; amplitude is not measured. Audio is analysed live on the device and never stored.</p>' +
      (run ? '' : '<button class="btn ghost wide" data-act="tg-sim">Try a practice signal (no watch needed)</button>');
  },
  after: function () { tgReadout(); tgDraw(); }
};
ACT['tg-start'] = function () { tgStartMic(); };
ACT['tg-sim'] = function () { tgStartSim(); };
ACT['tg-stop'] = function () { tgStop(); rerender(); };
ACT['tg-pos'] = function (el) { tg.pos = el.dataset.v; $$('[data-act="tg-pos"]').forEach(function (b) { var on = b.dataset.v === tg.pos; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); }); };
ACT['tg-to-sync'] = function () { openTool('accuracy', { keepSel: true }); ACT['sync-open'](); };
ACT['tg-save'] = function () {
  var w = selWatch(), r = tg.res; if (!w || !r || tg.status === 'sim') return;
  w.readings.push({ id: uid(), t: Date.now(), type: 'tg', rate: Math.round(r.rate * 10) / 10, beat: Math.round(r.beat * 10) / 10, bph: r.bph, pos: tg.pos });
  save(); tg.saved = true; tgReadout(); toast('Saved to the Accuracy Log');
};
