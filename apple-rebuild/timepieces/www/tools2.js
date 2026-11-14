/* Vilasi Timepieces — Rotation, Service & Papers, Finder, Settings, Watch editor */
'use strict';

/* =================== ROTATION =================== */
var PLANS = [['dressy', 'Dressy'], ['sport', 'Sport'], ['travel', 'Travel'], ['everyday', 'Everyday']];
function suggest(plan) {
  var best = null, key = { dressy: 'dress', sport: 'sport', travel: 'travel', everyday: 'everyday' }[plan];
  S.watches.forEach(function (w) {
    var sc = 0, why = [], ds = daysSince(w.id);
    if (w.styles.indexOf(key) >= 0) { sc += 10; why.push('you tagged it for ' + plan + ' days'); }
    if (plan === 'dressy') { if (+w.thickness <= 10.5) { sc += 3; why.push('at ' + n2(+w.thickness) + ' mm it slips under a cuff'); } if (w.strap === 'leather') { sc += 2; why.push('it is on leather'); } }
    if (plan === 'sport') { if (+w.wr >= 100) { sc += 3; why.push(w.wr + ' m water resistance'); } if (w.strap !== 'leather') sc += 1; }
    if (plan === 'travel') { if (w.bezel === 'gmt') { sc += 4; why.push('its 24-hour bezel tracks a second time zone'); } else if (w.bezel === 'dive') { sc += 1.5; why.push('the rotating bezel can mark a second time zone'); } if (+w.wr >= 100) sc += 1; }
    if (plan === 'everyday' && w.strap === 'bracelet') sc += 1;
    sc += (ds == null ? 30 : Math.min(ds, 30)) / 30 * 5;
    if (ds == null) why.push('it has never been logged'); else if (ds >= 10) why.push('it has not been out for ' + ds + ' days');
    if (!best || sc > best.sc) best = { w: w, sc: sc, why: why };
  });
  return best;
}
TOOLS.rotation = {
  kicker: 'No. 04 — What am I wearing', title: 'Rotation',
  render: function () {
    if (!S.watches.length) return emptyTool('Add a watch to start logging what you wear.');
    var now = new Date(), today = ymd(now), on = wearsOn(today), plan = S.settings.plan || 'everyday', sg = suggest(plan);
    var h = '<div class="today"><div class="today-d">' + now.toLocaleDateString('en-GB', { weekday: 'long' }) + '<em>' + now.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' }) + '</em></div><div class="today-q">What am I wearing today?</div></div><div class="wearpick">';
    S.watches.forEach(function (w) { var o = on.indexOf(w.id) >= 0; h += '<button class="wp' + (o ? ' on' : '') + '" aria-pressed="' + o + '" data-act="wear" data-id="' + w.id + '" data-d="' + today + '">' + miniWatch(w, 78) + '<span>' + esc(w.model || w.brand) + '</span><em>' + (o ? 'Wearing' : 'Tap to log') + '</em></button>'; });
    h += '</div><div class="rule"><span>Today’s plan</span></div>' + chips(PLANS, plan, 'plan');
    if (sg) {
      var worn = on.indexOf(sg.w.id) >= 0;
      h += '<div class="sugg">' + miniWatch(sg.w, 92) + '<div><div class="v-k">Suggested</div><h3>' + esc(wname(sg.w)) + '</h3><p>' + (sg.why.length ? 'Because ' + esc(sg.why.slice(0, 3).join(', ')) + '.' : 'A sound choice for today.') + '</p>' +
        (worn ? '<span class="tagok">Already on your wrist</span>' : '<button class="btn lume" data-act="wear" data-id="' + sg.w.id + '" data-d="' + today + '">Wear it today</button>') + '</div></div>';
    }
    /* nudges */
    var nud = S.watches.map(function (w) { return { w: w, ds: daysSince(w.id) }; }).filter(function (x) { return x.ds == null || x.ds >= 14; }).sort(function (a, b) { return (b.ds == null ? 9999 : b.ds) - (a.ds == null ? 9999 : a.ds); });
    h += '<div class="rule"><span>Least worn</span></div>';
    h += nud.length ? nud.map(function (x) { return '<div class="nudge">' + miniWatch(x.w, 48) + '<p><b>' + esc(wname(x.w)) + '</b>' + (x.ds == null ? ' has never been logged. Give it a day out.' : ' has been resting for ' + x.ds + ' days.' + ((x.w.movement === 'automatic' || x.w.movement === 'manual') ? ' Running it now and then keeps the oils moving.' : '')) + '</p></div>'; }).join('') : '<p class="fine">Everything has been worn within the last two weeks. A well-balanced rotation.</p>';
    /* calendar heatmap */
    var f = ui.rotF && watchById(ui.rotF) ? ui.rotF : null;
    h += '<div class="rule"><span>Wear calendar · 10 weeks</span></div><div class="chips">' + '<button class="chip' + (!f ? ' on' : '') + '" data-act="rotf" data-v="">All</button>' + S.watches.map(function (w) { return '<button class="chip' + (f === w.id ? ' on' : '') + '" data-act="rotf" data-v="' + w.id + '"><i class="sw" style="background:' + esc(w.dial) + '"></i>' + esc(w.model || w.brand) + '</button>'; }).join('') + '</div>';
    var start = parseYmd(today); var dow = (start.getDay() + 6) % 7; start.setDate(start.getDate() - dow - 63);
    h += '<div class="cal"><div class="cal-h">' + ['M', 'T', 'W', 'T', 'F', 'S', 'S'].map(function (d) { return '<span>' + d + '</span>'; }).join('') + '</div><div class="cal-g">';
    for (var i = 0; i < 70; i++) {
      var d = new Date(start); d.setDate(start.getDate() + i); var k = ymd(d), fut = k > today, ws = wearsOn(k), hit = f ? ws.indexOf(f) >= 0 : ws.length > 0;
      var lvl = fut ? 0 : !hit ? 0 : f ? 3 : Math.min(3, ws.length + 1);
      var dotsH = ws.slice(0, 3).map(function (id) { var ww = watchById(id); return ww ? '<i style="background:' + esc(ww.dial) + '"></i>' : ''; }).join('');
      h += '<button class="day l' + lvl + (k === today ? ' now' : '') + '"' + (fut ? ' disabled' : '') + ' data-act="day" data-d="' + k + '" aria-label="' + fmtDate(k) + ', ' + ws.length + ' worn"><b>' + (d.getDate() === 1 ? d.toLocaleDateString('en-GB', { month: 'short' }) : d.getDate()) + '</b><span>' + dotsH + '</span></button>';
    }
    h += '</div></div>';
    /* share */
    var since = ymd(Date.now() - 90 * DAY), tot = 0, cnt = {};
    S.wears.forEach(function (x) { if (x.d >= since && watchById(x.w)) { cnt[x.w] = (cnt[x.w] || 0) + 1; tot++; } });
    h += '<div class="rule"><span>Last 90 days</span></div>';
    h += S.watches.slice().sort(function (a, b) { return (cnt[b.id] || 0) - (cnt[a.id] || 0); }).map(function (w) { var c = cnt[w.id] || 0, lw = lastWorn(w.id); return '<div class="share"><div class="share-t"><b>' + esc(wname(w)) + '</b><span>' + c + ' day' + (c === 1 ? '' : 's') + (lw ? ' · last ' + fmtDate(lw).replace(/ \d{4}$/, '') : '') + '</span></div><div class="share-b"><i style="width:' + (tot ? c / tot * 100 : 0) + '%"></i></div></div>'; }).join('');
    return h;
  }
};
ACT.wear = function (el) { var on = toggleWear(el.dataset.d, el.dataset.id), w = watchById(el.dataset.id); rerender(); toast(on ? wname(w) + ' logged' : 'Removed'); };
ACT.plan = function (el) { S.settings.plan = el.dataset.v; save(); rerender(); };
ACT.rotf = function (el) { ui.rotF = el.dataset.v || null; rerender(); };
ACT.day = function (el) { ui.day = el.dataset.d; dayModal(); };
function dayModal() {
  var ws = wearsOn(ui.day);
  openModal('<h3>' + fmtDate(ui.day) + '</h3><p class="mtext">Tap to mark what you wore.</p>' + S.watches.map(function (w) { var o = ws.indexOf(w.id) >= 0; return '<button class="dayrow' + (o ? ' on' : '') + '" aria-pressed="' + o + '" data-act="day-t" data-id="' + w.id + '">' + miniWatch(w, 46) + '<span>' + esc(wname(w)) + '</span><i></i></button>'; }).join('') + '<div class="mrow"><button class="btn lume" data-act="modal-close">Done</button></div>', '', function () { rerender(); });
}
ACT['day-t'] = function (el) { toggleWear(ui.day, el.dataset.id); var mc = modalClose; modalClose = null; dayModal(); modalClose = mc; };

/* =================== SERVICE & PAPERS =================== */
function setPath(o, p, v) { var a = p.split('.'); while (a.length > 1) { var k = a.shift(); o[k] = o[k] || {}; o = o[k]; } o[a[0]] = v; }
function getPath(o, p) { return p.split('.').reduce(function (x, k) { return x == null ? x : x[k]; }, o); }
function pfield(w, label, path, type, ph) {
  var v = getPath(w, path); if (v == null) v = '';
  return '<label class="fld"><span>' + label + '</span><input data-in="pf" data-p="' + path + '" data-t="' + type + '" ' + (type === 'date' ? 'type="date"' : type === 'num' ? 'inputmode="decimal"' : 'type="text"') + ' value="' + esc(v) + '" placeholder="' + (ph || '') + '"></label>';
}
TOOLS.papers = {
  kicker: 'No. 05 — Provenance', title: 'Service & Papers',
  render: function () {
    var w = selWatch(); if (!w) return emptyTool('Add a watch to keep its service dates, warranty and papers in one place.');
    var sv = svcStatus(w), we = warrantyEnd(w), base = w.service.last || w.purchase.date, pct = 0;
    if (sv.due && base) { var b0 = parseYmd(base).getTime(); pct = clamp((Date.now() - b0) / (sv.due - b0) * 100, 0, 100); }
    var have = PAPERS.filter(function (p) { return w.papers[p[0]]; }).length, core = ['innerBox', 'warrantyCard', 'manual'].every(function (k) { return w.papers[k]; });
    var totP = 0, totI = 0; S.watches.forEach(function (x) { totP += num(x.purchase.price, 0); totI += num(x.purchase.insured, 0) || num(x.purchase.price, 0); });
    var wst = !we ? '<span class="pill">No warranty date</span>' : we > Date.now() ? '<span class="pill ok">Covered until ' + fmtDate(we.getTime()) + '</span>' : '<span class="pill">Expired ' + fmtDate(we.getTime()) + '</span>';
    return watchStrip(w.id, 'sel') +
      '<div class="ledger"><div><b>' + S.watches.length + '</b><span>watches</span></div><div><b>' + fmtMoney(totP) + '</b><span>total paid</span></div><div><b>' + fmtMoney(totI) + '</b><span>declared value</span></div></div>' +
      '<div class="rule"><span>Service</span></div>' +
      '<div class="svc ' + sv.k + '"><div class="svc-t"><h3>' + sv.label + '</h3><span>' + (sv.due ? 'Next service ' + fmtDate(sv.due.getTime()) : 'Add a purchase or service date') + '</span></div><div class="svc-b"><i style="width:' + pct + '%"></i></div></div>' +
      '<div class="grid2">' + pfield(w, 'Last serviced', 'service.last', 'date') + pfield(w, 'Interval (years)', 'service.interval', 'num', String(svcInterval(w))) + '</div>' +
      (w.service.history.length ? w.service.history.slice().sort(function (a, b) { return a.date < b.date ? 1 : -1; }).map(function (x) { return '<div class="rd"><div class="rd-m"><b>' + esc(x.work || 'Service') + '</b><span>' + fmtDate(x.date) + (x.by ? ' · ' + esc(x.by) : '') + (x.cost ? ' · ' + fmtMoney(x.cost) : '') + '</span></div><button class="icon-b" data-act="svc-del" data-id="' + x.id + '" aria-label="Delete service entry"><svg viewBox="0 0 24 24" width="18" height="18"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button></div>'; }).join('') : '') +
      '<button class="btn steel wide" data-act="svc-add">Log a service</button>' +
      '<div class="rule"><span>Purchase & warranty</span></div>' + wst +
      '<div class="grid2">' + pfield(w, 'Purchase date', 'purchase.date', 'date') + pfield(w, 'Warranty (years)', 'warrantyYears', 'num') + pfield(w, 'Price paid', 'purchase.price', 'num', '0') + pfield(w, 'Declared value', 'purchase.insured', 'num', 'for insurance') + '</div>' +
      pfield(w, 'Purchased from', 'purchase.from', 'text', 'Dealer or seller') + pfield(w, 'Serial number', 'purchase.serial', 'text', 'Engraved on case or card') +
      '<div class="rule"><span>Box & papers · ' + have + ' of ' + PAPERS.length + '</span></div>' + (core && w.papers.outerBox ? '<span class="pill ok">Full set</span>' : core ? '<span class="pill ok">Box and papers</span>' : '<span class="pill">Incomplete set</span>') +
      '<div class="checks">' + PAPERS.map(function (p) { var o = !!w.papers[p[0]]; return '<button class="ck' + (o ? ' on' : '') + '" role="checkbox" aria-checked="' + o + '" data-act="paper" data-k="' + p[0] + '"><i></i>' + p[1] + '</button>'; }).join('') + '</div>' +
      '<label class="fld"><span>Notes</span><textarea data-in="pf" data-p="notes" data-t="text" rows="3" placeholder="Condition, strap changes, provenance…">' + esc(w.notes) + '</textarea></label>' +
      '<div class="rule"><span>Insurance summary</span></div><p class="fine">A dated record of each watch with reference, serial, price, declared value, papers and service history, ready to send to an insurer.</p>' +
      '<div class="two"><button class="btn lume" data-act="ins" data-s="one">This watch</button><button class="btn steel" data-act="ins" data-s="all">Whole collection</button></div>';
  }
};
IN.pf = function (el, type) {
  if (type !== 'change') return;
  var w = selWatch(), t = el.dataset.t, v = el.value;
  if (t === 'num') v = v === '' ? '' : num(v, '');
  setPath(w, el.dataset.p, v); save();
  if (el.tagName !== 'TEXTAREA' && t !== 'text') rerender();
};
ACT.paper = function (el) { var w = selWatch(); w.papers[el.dataset.k] = !w.papers[el.dataset.k]; save(); rerender(); };
ACT['svc-add'] = function () {
  openModal('<h3>Log a service</h3><label class="fld"><span>Date</span><input type="date" id="svD" value="' + ymd(Date.now()) + '"></label><label class="fld"><span>Work done</span><input id="svW" type="text" placeholder="Full service, regulation, new gaskets…"></label><div class="grid2"><label class="fld"><span>Carried out by</span><input id="svB" type="text" placeholder="Watchmaker"></label><label class="fld"><span>Cost</span><input id="svC" inputmode="decimal" placeholder="0"></label></div><div class="mrow"><button class="btn ghost" data-act="modal-close">Cancel</button><button class="btn lume" data-act="svc-save">Save</button></div>');
};
ACT['svc-save'] = function () {
  var w = selWatch(), d = $('#svD').value || ymd(Date.now());
  w.service.history.push({ id: uid(), date: d, work: $('#svW').value.trim() || 'Service', by: $('#svB').value.trim(), cost: num($('#svC').value, '') });
  if (!w.service.last || d > w.service.last) w.service.last = d;
  save(); closeModal(); rerender(); toast('Service logged');
};
ACT['svc-del'] = function (el) { var w = selWatch(); w.service.history = w.service.history.filter(function (x) { return x.id !== el.dataset.id; }); save(); rerender(); };
function insItems(ws) {
  return ws.map(function (w) {
    var have = PAPERS.filter(function (p) { return w.papers[p[0]]; }).map(function (p) { return p[1]; }), miss = PAPERS.filter(function (p) { return !w.papers[p[0]]; }).map(function (p) { return p[1]; }), we = warrantyEnd(w);
    return { w: w, rows: [
      ['Reference', w.ref || 'not recorded'], ['Serial number', w.purchase.serial || 'not recorded'],
      ['Description', n2(+w.diameter) + ' mm ' + w.caseFinish + ' case, ' + (MOVES[w.movement] || '').toLowerCase() + ' movement, ' + w.strap + (w.strap === 'bracelet' ? '' : ' strap')],
      ['Purchased', (w.purchase.date ? fmtDate(w.purchase.date) : 'date not recorded') + (w.purchase.from ? ' from ' + w.purchase.from : '')],
      ['Price paid', fmtMoney(w.purchase.price)], ['Declared value', fmtMoney(num(w.purchase.insured, 0) || w.purchase.price)],
      ['Warranty', we ? (we > Date.now() ? 'valid until ' : 'expired ') + fmtDate(we.getTime()) : 'not recorded'],
      ['Box and papers held', have.length ? have.join(', ') : 'none'], ['Not held', miss.length ? miss.join(', ') : 'none'],
      ['Service history', w.service.history.length ? w.service.history.map(function (x) { return fmtDate(x.date) + ' ' + x.work + (x.by ? ' (' + x.by + ')' : ''); }).join('; ') : 'no service recorded']
    ] };
  });
}
function insText(ws) {
  var it = insItems(ws), tot = 0; ws.forEach(function (w) { tot += num(w.purchase.insured, 0) || num(w.purchase.price, 0); });
  return 'WATCH SCHEDULE FOR INSURANCE\nPrepared ' + fmtDate(Date.now()) + ' with Vilasi Timepieces\nItems: ' + ws.length + '   Total declared value: ' + fmtMoney(tot) + '\n\n' +
    it.map(function (x, i) { return (i + 1) + '. ' + wname(x.w).toUpperCase() + '\n' + x.rows.map(function (r) { return '   ' + r[0] + ': ' + r[1]; }).join('\n'); }).join('\n\n') + '\n\nValues are as declared by the owner.\n';
}
function insHTML(ws) {
  var it = insItems(ws), tot = 0; ws.forEach(function (w) { tot += num(w.purchase.insured, 0) || num(w.purchase.price, 0); });
  return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Watch schedule for insurance</title><style>body{font:15px/1.5 Georgia,serif;color:#111;max-width:760px;margin:32px auto;padding:0 20px}h1{font-size:26px;margin:0 0 4px;font-weight:normal;letter-spacing:.02em}h2{font-size:19px;margin:0 0 8px;font-weight:normal}.sub{color:#555;font:13px/1.4 Helvetica,Arial,sans-serif;text-transform:uppercase;letter-spacing:.08em;border-bottom:2px solid #111;padding-bottom:12px}.it{display:flex;gap:20px;padding:22px 0;border-bottom:1px solid #bbb;page-break-inside:avoid}.it svg{flex:0 0 120px}table{border-collapse:collapse;width:100%;font:13px/1.45 Helvetica,Arial,sans-serif}td{padding:3px 0;vertical-align:top}td:first-child{color:#555;width:150px}.foot{color:#555;font:12px Helvetica,Arial,sans-serif;margin-top:18px}</style></head><body><h1>Watch schedule for insurance</h1><p class="sub">Prepared ' + fmtDate(Date.now()) + ' · ' + ws.length + ' item' + (ws.length === 1 ? '' : 's') + ' · Total declared value ' + esc(fmtMoney(tot)) + '</p>' +
    it.map(function (x, i) { return '<div class="it"><svg viewBox="-148 -148 296 296" width="120" height="120">' + drawWatch(x.w, { p: 'x' + i + '_', mini: true }) + '</svg><div style="flex:1"><h2>' + (i + 1) + '. ' + esc(wname(x.w)) + '</h2><table>' + x.rows.map(function (r) { return '<tr><td>' + esc(r[0]) + '</td><td>' + esc(r[1]) + '</td></tr>'; }).join('') + '</table></div></div>'; }).join('') +
    '<p class="foot">Values are as declared by the owner. Dial illustrations are drawn from recorded attributes and are not photographs. Prepared on the owner’s device with Vilasi Timepieces.</p></body></html>';
}
ACT.ins = function (el) {
  var ws = el.dataset.s === 'all' ? S.watches : [selWatch()]; ui.ins = ws;
  openModal('<h3>Insurance summary</h3><pre class="ins">' + esc(insText(ws)) + '</pre><div class="mrow three"><button class="btn ghost" data-act="modal-close">Close</button><button class="btn steel" data-act="ins-copy">Copy text</button><button class="btn lume" data-act="ins-dl">Export file</button></div>', 'tall');
};
ACT['ins-copy'] = function () {
  var t = insText(ui.ins), ok = function () { toast('Summary copied'); };
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(ok, function () { toast('Copy is not available here — use Export file'); });
  else { var ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); ok(); } catch (e) { toast('Copy is not available here'); } ta.remove(); }
};
ACT['ins-dl'] = function () { saveFile('watch-insurance-summary-' + ymd(Date.now()) + '.html', 'text/html', insHTML(ui.ins)); };

/* =================== FINDER =================== */
var BANDS = [[0, 500], [500, 1500], [1500, 4000], [4000, 10000], [10000, 1e9]];
var FQ = [
  { k: 'budget', q: 'What is your budget?', s: 'Prices are approximate retail in US dollars.', o: [[0, 'Under $500'], [1, '$500 – 1,500'], [2, '$1,500 – 4,000'], [3, '$4,000 – 10,000'], [4, 'Over $10,000']] },
  { k: 'wrist', q: 'How big is your wrist?', s: 'Measure around the wrist bone with a tape or a strip of paper.' },
  { k: 'style', q: 'Which style draws you in?', s: 'Pick the one you would reach for most.', o: [['dress', 'Dress'], ['diver', 'Diver'], ['field', 'Field / pilot'], ['chrono', 'Chronograph'], ['gmt', 'GMT / travel'], ['everyday', 'Everyday sports']] },
  { k: 'movement', q: 'What should power it?', s: 'Mechanical watches need wearing or winding; quartz and solar are grab-and-go.', o: [['automatic', 'Automatic'], ['manual', 'Hand-wound'], ['quartz', 'Quartz or solar'], ['any', 'No preference']] },
  { k: 'occ', q: 'Where will you wear it?', s: 'Choose all that apply.', m: true, o: [['office', 'Office'], ['weekend', 'Weekends'], ['water', 'In the water'], ['travel', 'Travel'], ['formal', 'Formal events']] },
  { k: 'avoid', q: 'Any brands to leave out?', s: 'Optional. Tap any you would rather not see. Names are listed for reference only; this app is not affiliated with any brand.', m: true }
];
function priceStr(r) { var f = function (n) { return '$' + n.toLocaleString('en-US'); }; return f(r.p[0]) + ' – ' + f(r.p[1]); }
function finderResults() {
  var f = S.finder, band = BANDS[f.budget == null ? 1 : f.budget], cm = f.wristCm || S.settings.wristCm || 17;
  var SN = { dress: 'dress watch', diver: 'dive watch', field: 'field or pilot watch', chrono: 'chronograph', gmt: 'travel watch', everyday: 'everyday sports watch' };
  return VTP_REF.map(function (r) {
    if ((f.avoid || []).indexOf(r.b) >= 0) return null;
    var sc = 0, why = [], inB = r.p[0] <= band[1] && r.p[1] >= band[0], near = !inB && r.p[0] <= band[1] * 1.2 && r.p[1] >= band[0] * 0.8;
    if (inB) { sc += 30; why.push('In budget at about ' + priceStr(r) + '.'); } else if (near) { sc += 8; why.push('A stretch: about ' + priceStr(r) + ', just outside your range.'); } else return null;
    var fv = fitVerdict(cm, r.d, r.l, r.t), pc = Math.round(fv.ratio * 100);
    if (fv.ratio > 1) { sc -= 30; why.push('Caution: ' + n2(r.l) + ' mm lug-to-lug would overhang your wrist.'); }
    else if (fv.ratio > 0.92) { sc += 5; why.push('Wears large on you: lug-to-lug covers ' + pc + '% of your wrist.'); }
    else if (fv.ratio >= 0.72) { sc += 20; why.push('Fits well: ' + n2(r.l) + ' mm lug-to-lug covers ' + pc + '% of your wrist.'); }
    else { sc += 9; why.push('On the small side for you (' + pc + '% of wrist width).'); }
    if (f.style && r.st.indexOf(f.style) >= 0) { sc += 26; why.push('A ' + SN[f.style] + ', as asked.'); }
    var mv = f.movement, mm = mv === 'quartz' ? (r.mv === 'quartz' || r.mv === 'solar') : mv === 'automatic' ? (r.mv === 'automatic' || r.mv === 'springdrive') : mv === 'manual' ? r.mv === 'manual' : false;
    if (mm) { sc += 15; why.push(MOVES[r.mv] + ' movement.'); } else if (mv && mv !== 'any') sc -= 6;
    var ov = (f.occ || []).filter(function (o) { return r.oc.indexOf(o) >= 0; });
    sc += ov.length * 6; if ((f.occ || []).indexOf('water') >= 0 && r.wr < 100) sc -= 12;
    if (ov.length) why.push('Suits ' + ov.map(function (o) { return { office: 'the office', weekend: 'weekends', water: 'swimming (' + r.wr + ' m)', travel: 'travel', formal: 'formal events' }[o]; }).join(', ') + '.');
    return { r: r, sc: sc, why: why, fv: fv };
  }).filter(Boolean).sort(function (a, b) { return b.sc - a.sc; }).slice(0, 6);
}
function refAsWatch(r) { return { id: 'ref', brand: r.b, model: r.m, dial: r.dl[0], hands: r.dl[1], markers: r.dl[2], bezel: r.dl[3], caseFinish: r.dl[4], strap: r.dl[5], movement: r.mv, wr: r.wr, diameter: r.d }; }
TOOLS.finder = {
  kicker: 'No. 06 — Six questions', title: 'Finder',
  open: function () { if (ui.fq == null) ui.fq = S.finder.done ? 6 : 0; },
  render: function () {
    var f = S.finder, q = ui.fq, h = '<div class="fprog" aria-label="Question ' + Math.min(q + 1, 6) + ' of 6">';
    for (var i = 0; i < 6; i++) h += '<i class="' + (i < q ? 'done' : i === q ? 'cur' : '') + '"></i>';
    h += '</div>';
    if (q < 6) {
      var Q = FQ[q], body;
      if (Q.k === 'wrist') {
        var unit = S.settings.unit || 'cm', cm = f.wristCm || S.settings.wristCm || 17;
        body = '<div class="frow"><label class="fld grow"><span>Circumference</span><input data-in="fq-wrist" inputmode="decimal" value="' + (unit === 'cm' ? cm.toFixed(1) : (cm / 2.54).toFixed(2)) + '"></label><div class="seg2"><button class="' + (unit === 'cm' ? 'on' : '') + '" data-act="unit" data-v="cm">cm</button><button class="' + (unit === 'in' ? 'on' : '') + '" data-act="unit" data-v="in">in</button></div></div><p class="fine">Typical adult wrists run from 14 to 20 cm (5.5 to 8 in).</p>';
      } else if (Q.k === 'avoid') {
        var brands = []; VTP_REF.forEach(function (r) { if (brands.indexOf(r.b) < 0) brands.push(r.b); }); brands.sort();
        body = chips(brands.map(function (b) { return [b, b]; }), f.avoid || [], 'fq-pick');
      } else body = '<div class="opts">' + Q.o.map(function (o) { var on = Q.m ? (f[Q.k] || []).indexOf(o[0]) >= 0 : f[Q.k] === o[0]; return '<button class="opt' + (on ? ' on' : '') + '" aria-pressed="' + on + '" data-act="fq-pick" data-v="' + o[0] + '"><i></i>' + o[1] + '</button>'; }).join('') + '</div>';
      h += '<div class="fq"><div class="fq-n">' + (q + 1) + '<small>/6</small></div><h3>' + Q.q + '</h3><p class="lede">' + Q.s + '</p>' + body + '</div>' +
        '<div class="two">' + (q > 0 ? '<button class="btn ghost" data-act="fq-back">Back</button>' : '<span></span>') + '<button class="btn lume" data-act="fq-next">' + (q === 5 ? 'Show my shortlist' : 'Next') + '</button></div>';
      return h;
    }
    var res = finderResults();
    h += '<p class="lede">Your shortlist, drawn from ' + VTP_REF.length + ' current models. Sizes and prices are approximate; not affiliated with any brand. Confirm with a retailer.</p>';
    if (!res.length) h += '<div class="flag note"><b>Nothing matched</b>Try a wider budget or remove some brand exclusions.</div>';
    res.forEach(function (x, i) {
      var r = x.r;
      h += '<article class="pick"><div class="pick-h">' + '<svg class="pick-ring" viewBox="-50 -50 100 100" width="84" height="84" aria-hidden="true"><circle r="' + n2(clamp(r.d, 30, 48)) + '" fill="none" stroke="currentColor" stroke-width="1.5" opacity=".55"/><circle r="' + n2(clamp(r.d, 30, 48) - 5) + '" fill="none" stroke="currentColor" stroke-width=".8" stroke-dasharray="1 5" opacity=".5"/><text y="2" text-anchor="middle" font-size="22" fill="currentColor">' + n2(r.d) + '</text><text y="17" text-anchor="middle" font-size="9" letter-spacing="1.5" fill="currentColor" opacity=".6">MM</text></svg><div><div class="v-k">' + (i === 0 ? 'Best match' : 'No. ' + (i + 1)) + '</div><h3>' + esc(r.b) + '<br><em>' + esc(r.m) + '</em></h3><div class="pick-p">' + priceStr(r) + '</div></div></div>' +
        '<div class="spec"><span><b>' + n2(r.d) + '</b>mm case</span><span><b>' + n2(r.l) + '</b>lug-to-lug</span><span><b>' + n2(r.t) + '</b>thick</span><span><b>' + r.wr + '</b>m WR</span></div>' +
        '<p class="pick-n">' + esc(r.n) + '</p><ul>' + x.why.map(function (y) { return '<li>' + esc(y) + '</li>'; }).join('') + '</ul>' +
        '<div class="two"><a class="btn steel" href="https://www.google.com/search?q=' + encodeURIComponent(r.b + ' ' + r.m + ' price') + '" target="_blank" rel="noopener noreferrer">Search prices ↗</a><button class="btn ghost" data-act="fq-try" data-i="' + VTP_REF.indexOf(r) + '">Try on wrist</button></div></article>';
    });
    h += '<button class="btn ghost wide" data-act="fq-restart">Change my answers</button><p class="fine">“Search prices” opens a web search in your browser. Vilasi Timepieces does not sell watches and earns nothing from these links.</p>';
    return h;
  }
};
ACT['fq-pick'] = function (el) {
  var Q = FQ[ui.fq], f = S.finder, v = el.dataset.v; if (Q.k === 'budget') v = +v;
  if (Q.m) { f[Q.k] = f[Q.k] || []; var i = f[Q.k].indexOf(v); if (i >= 0) f[Q.k].splice(i, 1); else f[Q.k].push(v); }
  else f[Q.k] = v;
  save(); rerender();
};
IN['fq-wrist'] = function (el) { var v = num(el.value, 0), cm = S.settings.unit === 'in' ? v * 2.54 : v; if (cm >= 10 && cm <= 30) { S.finder.wristCm = Math.round(cm * 100) / 100; save(); } };
ACT['fq-next'] = function () {
  var Q = FQ[ui.fq], f = S.finder;
  if (Q.o && !Q.m && f[Q.k] == null) { toast('Pick one to continue'); return; }
  if (Q.k === 'wrist' && !f.wristCm) f.wristCm = S.settings.wristCm || 17;
  ui.fq++; if (ui.fq === 6) f.done = true; save(); rerender(true);
};
ACT['fq-back'] = function () { ui.fq = Math.max(0, ui.fq - 1); rerender(true); };
ACT['fq-restart'] = function () { ui.fq = 0; rerender(true); };
ACT['fq-try'] = function (el) { var r = VTP_REF[+el.dataset.i]; if (S.finder.wristCm) { S.settings.wristCm = S.finder.wristCm; save(); } openTool('fit', { preset: { id: null, d: r.d, l: r.l, t: r.t, label: r.b + ' ' + r.m } }); };

/* =================== SETTINGS =================== */
TOOLS.settings = {
  kicker: 'Settings & about', title: 'Workshop',
  render: function () {
    var st = S.settings, unit = st.unit || 'cm', cm = st.wristCm || 17;
    return '<div class="rule"><span>You</span></div><div class="frow"><label class="fld grow"><span>Wrist circumference</span><input data-in="fit-wrist" inputmode="decimal" value="' + (unit === 'cm' ? cm.toFixed(1) : (cm / 2.54).toFixed(2)) + '"></label><div class="seg2"><button class="' + (unit === 'cm' ? 'on' : '') + '" data-act="unit" data-v="cm">cm</button><button class="' + (unit === 'in' ? 'on' : '') + '" data-act="unit" data-v="in">in</button></div></div>' +
      '<label class="fld"><span>Currency symbol</span><input data-in="cur" type="text" maxlength="4" value="' + esc(st.currency || '$') + '"></label>' +
      '<div class="scalebar"><div><b>' + (st.calibrated ? 'Screen scale calibrated' : 'Screen scale not calibrated') + '</b><span>Used by Wrist Fit to draw at real size</span></div><button class="btn steel" data-act="calibrate">' + (st.calibrated ? 'Redo' : 'Calibrate') + '</button></div>' +
      '<div class="rule"><span>Collection · ' + S.watches.length + '</span></div>' + S.watches.map(function (w) { return '<button class="dayrow" data-act="edit" data-id="' + w.id + '">' + miniWatch(w, 46) + '<span>' + esc(wname(w)) + (w.example ? ' <em>example</em>' : '') + '</span><b>Edit</b></button>'; }).join('') +
      '<button class="btn steel wide" data-act="add-watch">Add a watch</button>' +
      '<div class="rule"><span>Your data</span></div><div class="privacy"><h3>Private by design</h3><p>Everything you enter stays on this device. There are no accounts, no analytics and no trackers, and the app works fully offline. The Timegrapher analyses microphone audio live and never records or stores it. The only time the app reaches the internet is when you tap “Search prices” in the Finder, which opens a web search in your browser.</p></div>' +
      '<button class="btn steel wide" data-act="exp-json">Export backup (JSON)</button><label class="btn steel wide filelab">Restore from backup<input type="file" accept=".json,application/json" data-in="imp"></label>' +
      '<button class="btn ghost wide" data-act="reseed">Restore the three example watches</button><button class="btn danger wide" data-act="wipe">Delete all data</button>' +
      '<div class="about"><svg viewBox="-60 -60 120 120" width="64" height="64"><circle r="54" fill="#0b0d0f" stroke="#8b9299" stroke-width="3"/><path d="M0 0L-22 -30M0 0L22 -30" stroke="#9dffb5" stroke-width="6" stroke-linecap="round"/><circle r="5" fill="#e9ebed"/></svg><b>Vilasi Timepieces</b><span>Version 2.0 · Vilasi, Inc.</span><span>Reference data: ' + VTP_REF.length + ' models; figures are approximate; not affiliated with any brand. Brand and model names belong to their owners and are used as text for identification only. No brand names or logos are drawn on dials.</span></div>';
  }
};
IN.cur = function (el, type) { if (type !== 'change') return; S.settings.currency = el.value.trim() || '$'; save(); };
ACT.edit = function (el) { openTool('watch', { id: el.dataset.id }); };
ACT['exp-json'] = function () { saveFile('vilasi-timepieces-backup-' + ymd(Date.now()) + '.json', 'application/json', JSON.stringify(S, null, 2)); };
IN.imp = function (el) {
  var f = el.files && el.files[0]; if (!f) return;
  var rd = new FileReader();
  rd.onload = function () { try { var d = JSON.parse(rd.result); if (!d || !Array.isArray(d.watches)) throw 0; S = d; S.wears = S.wears || []; S.settings = S.settings || {}; S.finder = S.finder || {}; S.watches.forEach(normWatch); save(); ui.idx = 0; renderHome(); rerender(); toast('Backup restored'); } catch (e) { toast('That file is not a Vilasi Timepieces backup'); } };
  rd.readAsText(f);
};
ACT.reseed = function () {
  var sd = seedState(), n = 0;
  sd.watches.forEach(function (w) { if (!watchById(w.id)) { S.watches.push(w); n++; sd.wears.forEach(function (x) { if (x.w === w.id) S.wears.push(x); }); } });
  save(); renderHome(); rerender(); toast(n ? n + ' example watch' + (n === 1 ? '' : 'es') + ' restored' : 'The examples are already here');
};
ACT.wipe = function () {
  confirmBox('Delete all data?', 'This removes every watch, reading, wear log and setting from this device. It cannot be undone.', 'Delete everything', function () {
    S = { v: 1, watches: [], wears: [], settings: { wristCm: 17, unit: 'cm', pxPerMm: 0, calibrated: false, currency: '$', plan: 'everyday', hintSeen: true }, finder: {} };
    save(); ui.idx = 0; ui.sel = null; ui.fq = null; renderHome(); rerender(true); toast('All data deleted');
  });
};

/* =================== WATCH EDITOR =================== */
var SWATCH = ['#101113', '#f3f1ea', '#c9ccd1', '#17355e', '#1d4a35', '#6b1f24', '#0f4a52', '#e8731c', '#5b3a22', '#e7c9a6', '#f0c63a', '#8fb7d6'];
var ED = {
  caseFinish: [['steel', 'Steel'], ['titanium', 'Titanium'], ['gold', 'Gold'], ['bronze', 'Bronze'], ['black', 'Black']],
  hands: [['baton', 'Baton'], ['dauphine', 'Dauphine'], ['sword', 'Sword'], ['mercedes', 'Circle'], ['snowflake', 'Snowflake'], ['arrow', 'Broad arrow']],
  markers: [['batons', 'Batons'], ['dots', 'Dots'], ['arabic', 'Arabic'], ['roman', 'Roman'], ['explorer', '3-6-9']],
  bezel: [['plain', 'Plain'], ['dive', 'Dive'], ['gmt', '24-hour'], ['tachy', 'Tachymeter']],
  strap: [['bracelet', 'Bracelet'], ['leather', 'Leather'], ['rubber', 'Rubber'], ['nato', 'Fabric']],
  movement: [['automatic', 'Automatic'], ['manual', 'Hand-wound'], ['quartz', 'Quartz'], ['solar', 'Solar'], ['springdrive', 'Spring Drive']],
  styles: [['dress', 'Dressy'], ['sport', 'Sport'], ['travel', 'Travel'], ['everyday', 'Everyday']]
};
function edPreview() { var e = $('#edPrev'); if (e) e.innerHTML = '<svg viewBox="-170 -170 340 340" width="220" height="220" aria-hidden="true">' + drawWatch(ui.edit, { p: 'ed', mini: true }) + '</svg>'; }
TOOLS.watch = {
  kicker: 'The watch', title: 'Details',
  open: function (a) {
    var w = a.id ? watchById(a.id) : null;
    ui.edit = w ? JSON.parse(JSON.stringify(w)) : blankWatch(); ui.editNew = !w;
    $('#sheetTitle'); TOOLS.watch.title = w ? 'Details' : 'New watch';
  },
  render: function () {
    var w = ui.edit, sec = function (label, key) { return '<div class="rule"><span>' + label + '</span></div>' + chips(ED[key], w[key], 'ed-set', ' data-f="' + key + '"'); };
    var inp = function (label, f, t, ph) { return '<label class="fld"><span>' + label + '</span><input data-in="ef" data-f="' + f + '" data-t="' + (t || 'text') + '" ' + (t === 'num' ? 'inputmode="decimal"' : 'type="text"') + ' value="' + esc(w[f] == null ? '' : w[f]) + '" placeholder="' + (ph || '') + '"></label>'; };
    var refs = '';
    if (ui.editNew) refs = '<label class="fld"><span>Start from a reference model (optional)</span><select data-in="ef-ref"><option value="">Choose a model to prefill…</option>' + VTP_REF.map(function (r, i) { return '<option value="' + i + '">' + esc(r.b + ' ' + r.m) + '</option>'; }).join('') + '</select></label><p class="fine">Reference figures are approximate; not affiliated with any brand. Names are never drawn on the dial.</p>';
    return '<div id="edPrev" class="edprev"></div>' + refs +
      '<div class="grid2">' + inp('Brand', 'brand', 'text', 'Maker') + inp('Model', 'model', 'text', 'Model name') + '</div>' + inp('Reference', 'ref', 'text', 'Optional') +
      '<div class="rule"><span>Dial colour</span></div><div class="swatches">' + SWATCH.map(function (c) { return '<button class="swb' + (w.dial.toLowerCase() === c ? ' on' : '') + '" style="background:' + c + '" data-act="ed-set" data-f="dial" data-v="' + c + '" aria-label="Dial colour ' + c + '"></button>'; }).join('') + '<label class="swb custom" aria-label="Custom dial colour"><input type="color" data-in="ef" data-f="dial" data-t="text" value="' + esc(w.dial) + '"></label></div>' +
      sec('Hands', 'hands') + sec('Hour markers', 'markers') + sec('Bezel', 'bezel') + sec('Case', 'caseFinish') + sec('Strap', 'strap') +
      '<label class="check"><input type="checkbox" data-in="ef" data-f="date" data-t="bool"' + (w.date ? ' checked' : '') + '><span>Date window at 3 o’clock</span></label>' +
      '<div class="rule"><span>Measurements · mm</span></div><div class="grid3">' + inp('Diameter', 'diameter', 'num') + inp('Lug-to-lug', 'l2l', 'num') + inp('Thickness', 'thickness', 'num') + '</div>' + inp('Water resistance (m)', 'wr', 'num') +
      sec('Movement', 'movement') + sec('Wear it for', 'styles') +
      '<div class="two"><button class="btn ghost" data-act="close-sheet">Cancel</button><button class="btn lume" data-act="ed-save">' + (ui.editNew ? 'Add to collection' : 'Save changes') + '</button></div>' +
      (ui.editNew ? '' : '<button class="btn danger wide" data-act="ed-del">Delete this watch</button>');
  },
  after: function () { edPreview(); }
};
ACT['ed-set'] = function (el) {
  var f = el.dataset.f, v = el.dataset.v, w = ui.edit;
  if (f === 'styles') { var i = w.styles.indexOf(v); if (i >= 0) w.styles.splice(i, 1); else w.styles.push(v); }
  else w[f] = v;
  if (f === 'movement') w.spec = (v === 'quartz' || v === 'solar') ? 'quartz' : v === 'springdrive' ? 'sd' : (w.spec === 'quartz' || w.spec === 'sd') ? 'std' : w.spec;
  rerender();
};
IN.ef = function (el, type) {
  var w = ui.edit, f = el.dataset.f, t = el.dataset.t;
  if (t === 'bool') w[f] = el.checked; else if (t === 'num') { var v = num(el.value, null); if (v == null) return; w[f] = v; } else w[f] = el.value;
  edPreview();
  if (f === 'dial' && type === 'change') rerender();
};
IN['ef-ref'] = function (el) {
  if (el.value === '') return; var r = VTP_REF[+el.value], w = ui.edit;
  Object.assign(w, { brand: r.b, model: r.m, dial: r.dl[0], hands: r.dl[1], markers: r.dl[2], bezel: r.dl[3], caseFinish: r.dl[4], strap: r.dl[5], diameter: r.d, l2l: r.l, thickness: r.t, movement: r.mv, wr: r.wr });
  w.spec = (r.mv === 'quartz' || r.mv === 'solar') ? 'quartz' : r.mv === 'springdrive' ? 'sd' : 'std';
  w.styles = r.st.indexOf('dress') >= 0 ? ['dress'] : r.st.indexOf('gmt') >= 0 ? ['travel', 'everyday'] : ['sport', 'everyday'];
  rerender();
};
ACT['ed-save'] = function () {
  var w = ui.edit;
  if (!String(w.brand).trim() && !String(w.model).trim()) { toast('Give the watch a brand or a model name'); return; }
  w.brand = String(w.brand).trim(); w.model = String(w.model).trim();
  if (ui.editNew) { S.watches.push(w); ui.idx = S.watches.length - 1; }
  else { var i = S.watches.findIndex(function (x) { return x.id === w.id; }); if (i >= 0) S.watches[i] = w; }
  save(); toast(ui.editNew ? wname(w) + ' added' : 'Saved'); closeSheet();
};
ACT['ed-del'] = function () {
  var w = ui.edit;
  confirmBox('Delete ' + wname(w) + '?', 'Its readings, wear history and papers will be removed from this device.', 'Delete watch', function () {
    S.watches = S.watches.filter(function (x) { return x.id !== w.id; }); S.wears = S.wears.filter(function (x) { return x.w !== w.id; });
    save(); ui.idx = clamp(ui.idx, 0, S.watches.length); closeSheet(); toast('Watch deleted');
  });
};
document.addEventListener('DOMContentLoaded', boot);
