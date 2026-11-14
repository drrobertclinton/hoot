/* Worthmark — a ledger for deciding what is worth buying. All data stays in localStorage. */
(function () {
  'use strict';

  var KEY = 'worthmark.ledger.v1';
  var DAY = 864e5, HOUR = 36e5;
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var WDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var CATS = ['Clothing', 'Electronics', 'Home', 'Kitchen', 'Books', 'Hobby', 'Wellbeing', 'Travel', 'Gift', 'Other'];
  var ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

  /* ---------- The Worth Test ---------- */
  var QUESTIONS = [
    { q: 'Is this a need, or a want?', hint: 'Be straight with yourself. Nobody else reads this ledger.', o: [
      ['A need. I can’t manage without it', 2, 'It answers a real need, not a passing wish.'],
      ['A want that would truly improve my days', 1, 'It is a want, but one with a clear purpose.'],
      ['A want. It would simply be nice', -1, 'By your own account it is a nice-to-have.'],
      ['An impulse. I only just came across it', -2, 'You only just came across it, and impulses fade fast.']] },
    { q: 'What does it replace?', hint: 'Think of what you already own that does this job.', o: [
      ['Something broken or worn out', 2, 'It replaces something that has honestly worn out.'],
      ['Nothing. It does something new for me', 0, 'It replaces nothing, so it is one more thing to own.'],
      ['Something that works, but this is better', -1, 'What you have still works; this is an upgrade, not a fix.'],
      ['Something nearly identical I already own', -2, 'You already own something that does the same job.']] },
    { q: 'How often will you really use it?', hint: 'Not the ideal you. The you of an ordinary week.', o: [
      ['Most days', 2, 'You expect to reach for it most days, so its cost spreads thin.'],
      ['Every week', 1, 'Weekly use is enough for it to earn its keep.'],
      ['About once a month', 0, 'Monthly use makes each outing fairly expensive.'],
      ['A few times a year', -1, 'A few uses a year means a steep cost for each one.'],
      ['Honestly, I’m not sure', -2, 'You could not say how often you would use it.']] },
    { q: 'Could you borrow or rent it instead?', hint: 'A friend, a library, a hire shop, a neighbour.', o: [
      ['No, not realistically', 1, 'Borrowing or renting is not a realistic option.'],
      ['Perhaps, but owning makes more sense', 0, 'You could borrow it, though owning has its case.'],
      ['Yes, quite easily', -2, 'You could quite easily borrow or rent it instead.']] },
    { q: 'Would you still buy it at full price?', hint: 'Imagine the sale sticker gone.', o: [
      ['Yes, without hesitating', 2, 'You would pay full price, so no discount is doing the deciding.'],
      ['Probably', 1, 'You would probably still want it without a discount.'],
      ['I’d think twice', -1, 'At full price you would think twice.'],
      ['No. The discount is the reason', -2, 'The discount is doing the persuading, not the thing itself.']] },
    { q: 'Does it fit your budget this month?', hint: '', o: [
      ['Yes, comfortably', 2, 'It sits comfortably inside this month’s budget.'],
      ['Just about', 0, 'It fits this month, but only just.'],
      ['No. It would put me over', -2, 'It would push you past this month’s wants budget.'],
      ['Only on credit', -3, 'You would need credit to pay for it.']] },
    { q: 'Thirty days from now, how do you feel about it?', hint: 'Close your eyes. It has been yours for a month.', o: [
      ['Glad I bought it', 2, 'You picture yourself glad of it a month from now.'],
      ['Much the same either way', 0, 'A month on, you expect to feel indifferent.'],
      ['I’d have forgotten about it', -1, 'You suspect you will have forgotten it within a month.'],
      ['A little regretful', -2, 'You already suspect you will regret it.']] }
  ];
  var MAXSCORE = 13;

  function computeVerdict(ans) {
    var score = 0, reasons = [];
    ans.forEach(function (a, i) {
      var o = QUESTIONS[i].o[a]; score += o[1];
      reasons.push({ t: o[2], s: o[1] });
    });
    var v = score >= 8 ? 'BUY' : score >= 3 ? 'WAIT' : 'SKIP';
    var cap = '';
    var b = QUESTIONS[5].o[ans[5]][1];
    if (v === 'BUY' && b <= -2) { v = 'WAIT'; cap = 'Everything else points to yes, but the money is not there this month. Wait for a month when it is.'; }
    if (v === 'BUY' && QUESTIONS[6].o[ans[6]][1] <= -2) { v = 'WAIT'; cap = 'The sums add up, yet you expect to regret it. Give that instinct time to speak.'; }
    if (v === 'WAIT' && QUESTIONS[1].o[ans[1]][1] === -2 && QUESTIONS[3].o[ans[3]][1] === -2) { v = 'SKIP'; cap = 'You own one already and could borrow another. There is no case for a second.'; }
    reasons.sort(function (x, y) { return Math.abs(y.s) - Math.abs(x.s); });
    var head = cap || (v === 'BUY' ? 'This one has earned its place. Buy it with a clear conscience.'
      : v === 'WAIT' ? 'There is a case for it, but not a settled one. Let it sit in the vault and see if the wanting lasts.'
      : 'The case against is stronger than the case for. Keep the money.');
    return { answers: ans.slice(), score: score, verdict: v, reasons: reasons, head: head, at: Date.now() };
  }

  /* ---------- state ---------- */
  var S = load();
  function load() {
    try { var r = localStorage.getItem(KEY); if (r) { var p = JSON.parse(r); if (p && p.entries) return p; } } catch (e) {}
    var s = { v: 1, settings: { budget: 300, cur: '$' }, entries: seed() };
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {}
    return s;
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
  function uid() { return 'e' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

  function seed() {
    var n = Date.now();
    function uses(count, from) { var a = []; for (var i = 0; i < count; i++) a.push(Math.round(from + (n - from) * (i + 1) / (count + 1))); return a; }
    function mk(o) { o.id = uid(); o.seed = true; o.uses = o.uses || []; o.cpu = o.cpu || { perMonth: '', years: '', alts: [] }; return o; }
    return [
      mk({ name: 'Noise-cancelling headphones', price: 349, cat: 'Electronics', note: 'For the train. The old pair still work, they just leak sound.',
        createdAt: n - 20 * HOUR, status: 'cooling', vault: { start: n - 20 * HOUR, end: n + 52 * HOUR, hours: 72 },
        test: computeVerdict([1, 2, 1, 0, 2, 1, 0]), decision: 'wait',
        cpu: { perMonth: 20, years: 4, alts: [{ name: 'Mid-range pair', price: 149, uses: 720 }, { name: 'Keep the old earbuds', price: 0, uses: 400 }] } }),
      mk({ name: 'Espresso machine', price: 599, cat: 'Kitchen', note: 'Saw it at a friend’s house. The café habit is about $4 a day.',
        createdAt: n - 7 * DAY - 2 * HOUR, status: 'cooling', vault: { start: n - 7 * DAY - 2 * HOUR, end: n - 2 * HOUR, hours: 168 },
        test: computeVerdict([1, 1, 0, 0, 1, 1, 0]), decision: 'wait',
        cpu: { perMonth: 26, years: 6, alts: [{ name: 'Café flat white', price: 4, uses: 1 }, { name: 'Stovetop moka pot', price: 35, uses: 1500 }] } }),
      mk({ name: 'Paperback box set', price: 38, cat: 'Books', note: 'Birthday money, spent on purpose.',
        createdAt: n - 6 * DAY, status: 'bought', boughtAt: n - 6 * DAY, uses: uses(3, n - 6 * DAY) }),
      mk({ name: 'Limited-edition sneakers', price: 180, cat: 'Clothing', note: 'A countdown timer on the shop page. That was most of the appeal.',
        createdAt: n - 12 * DAY, status: 'skipped', skippedAt: n - 9 * DAY, vault: { start: n - 12 * DAY, end: n - 9 * DAY, hours: 72, answered: 'no' },
        test: computeVerdict([3, 3, 3, 0, 3, 2, 3]), decision: 'skip' }),
      mk({ name: 'Cast-iron Dutch oven', price: 89, cat: 'Kitchen', note: 'To replace the cracked casserole dish.',
        createdAt: n - 44 * DAY, status: 'bought', boughtAt: n - 41 * DAY, uses: uses(14, n - 41 * DAY),
        test: computeVerdict([1, 0, 1, 0, 0, 0, 0]), decision: 'buy',
        cpu: { perMonth: 6, years: 15, alts: [{ name: 'Thin supermarket pot', price: 30, uses: 150 }, { name: 'Enamelled designer brand', price: 380, uses: 1080 }] } }),
      mk({ name: 'Smart water bottle', price: 65, cat: 'Wellbeing', note: 'It glows when you forget to drink.',
        createdAt: n - 58 * DAY, status: 'returned', boughtAt: n - 58 * DAY, returnedAt: n - 49 * DAY, uses: uses(2, n - 58 * DAY).map(function (t) { return Math.min(t, n - 50 * DAY); }),
        regret: { rating: 2, lesson: 'A gadget will not build a habit for me. A plain glass on the desk did.', at: n - 49 * DAY } }),
      mk({ name: 'Standing desk', price: 420, cat: 'Home', note: 'Back pain after long days. Tried one at work for a month first.',
        createdAt: n - 78 * DAY, status: 'bought', boughtAt: n - 75 * DAY, uses: uses(52, n - 75 * DAY),
        test: computeVerdict([0, 1, 0, 0, 0, 0, 0]), decision: 'buy', marked: true,
        regret: { rating: 5, lesson: 'Trying it for a month before buying made the decision easy.', at: n - 45 * DAY },
        cpu: { perMonth: 20, years: 6, alts: [{ name: 'Desk-top riser', price: 140, uses: 700 }] } })
    ];
  }

  /* ---------- helpers ---------- */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function money(n, cents) {
    n = +n || 0; var neg = n < 0; n = Math.abs(n);
    var dec = (cents || Math.round(n * 100) % 100 !== 0) ? 2 : 0;
    return (neg ? '−' : '') + S.settings.cur + n.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
  }
  function perUse(n) { return n >= 100 ? money(Math.round(n)) : money(n, true); }
  function num(v) { var x = parseFloat(String(v == null ? '' : v).replace(/[^0-9.]/g, '')); return isFinite(x) ? x : NaN; }
  function dLong(t) { var d = new Date(t); return d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear(); }
  function dMid(t) { var d = new Date(t); return WDAYS[d.getDay()] + ' ' + d.getDate() + ' ' + MONTHS[d.getMonth()]; }
  function tStr(t) { var d = new Date(t), h = d.getHours(), m = d.getMinutes(); return (h % 12 || 12) + ':' + (m < 10 ? '0' : '') + m + (h < 12 ? ' am' : ' pm'); }
  function ago(t) { var n = Math.floor((Date.now() - t) / DAY); return n <= 0 ? 'today' : n === 1 ? 'yesterday' : n + ' days ago'; }
  function plural(n, w) { return n + ' ' + w + (n === 1 ? '' : 's'); }
  function cd(ms) {
    var s = Math.max(0, Math.floor(ms / 1000)), d = Math.floor(s / 86400); s -= d * 86400;
    var h = Math.floor(s / 3600); s -= h * 3600; var m = Math.floor(s / 60); s -= m * 60;
    function p(x) { return (x < 10 ? '0' : '') + x; }
    return (d ? d + 'd ' : '') + p(h) + 'h ' + p(m) + 'm ' + p(s) + 's';
  }
  function durLabel(h) { return h === 24 ? '24 hours' : h === 72 ? '72 hours' : h === 168 ? '7 days' : h + ' hours'; }
  function byId(id) { for (var i = 0; i < S.entries.length; i++) if (S.entries[i].id === id) return S.entries[i]; return null; }
  function vaultOver(e) { return e.status === 'cooling' && e.vault && Date.now() >= e.vault.end; }
  function regretDue(e) { return e.status === 'bought' && !e.regret && Date.now() - e.boughtAt >= 30 * DAY; }
  function sameMonth(t, d) { var x = new Date(t); return x.getFullYear() === d.getFullYear() && x.getMonth() === d.getMonth(); }
  function spentIn(d) { return S.entries.reduce(function (a, e) { return a + (e.status === 'bought' && e.boughtAt && sameMonth(e.boughtAt, d) ? e.price : 0); }, 0); }
  function savedTotal() { return S.entries.reduce(function (a, e) { return a + (e.status === 'skipped' ? e.price : 0); }, 0); }
  function lifeUses(c) { var a = num(c && c.perMonth), b = num(c && c.years); return a > 0 && b > 0 ? Math.round(a * 12 * b) : 0; }
  function suggestHours(p) { return p < 75 ? 24 : p < 400 ? 72 : 168; }
  function statusText(e) {
    switch (e.status) {
      case 'cooling': return vaultOver(e) ? 'Cool-off over' : 'Cooling off';
      case 'decided': return 'Decided' + (e.decision ? ': ' + e.decision : '');
      case 'bought': return 'Bought';
      case 'skipped': return 'Skipped';
      case 'returned': return 'Returned';
      default: return 'Considering';
    }
  }
  var sealN = 0;
  function seal(size, cls) {
    var id = 'sp' + (++sealN), big = size >= 70;
    return '<svg class="seal ' + (cls || '') + '" width="' + size + '" height="' + size + '" viewBox="0 0 100 100" role="img" aria-label="Worthmark seal">' +
      '<g fill="none" stroke="currentColor"><circle cx="50" cy="50" r="47" stroke-width="' + (big ? 1.6 : 4) + '"/>' +
      (big ? '<circle cx="50" cy="50" r="43.5" stroke-width=".8" stroke-dasharray="1 2.4"/><circle cx="50" cy="50" r="29" stroke-width="1"/>' : '') +
      '<path d="M' + (big ? '35 41 L42.5 60 L50 45 L57.5 60 L65 41' : '26 34 L38 68 L50 42 L62 68 L74 34') + '" stroke-width="' + (big ? 3.2 : 7) + '" stroke-linejoin="miter"/></g>' +
      (big ? '<defs><path id="' + id + '" d="M50 50 m-35 0 a35 35 0 1 1 70 0 a35 35 0 1 1 -70 0"/></defs>' +
        '<text font-size="7.4" letter-spacing="2.2" fill="currentColor" style="font-family:inherit;font-variant-numeric:lining-nums"><textPath href="#' + id + '">WORTH EVERY CENT · WORTHMARK · EARNED IN USE ·</textPath></text>' : '') +
      '</svg>';
  }

  /* ---------- router ---------- */
  var app = document.getElementById('app'), layer = document.getElementById('layer'), toastEl = document.getElementById('toast');
  var stack = [{ name: 'ledger', filter: 'all' }], ledgerY = 0;
  function cur() { return stack[stack.length - 1]; }
  function go(r) { if (cur().name === 'ledger') ledgerY = window.scrollY; stack.push(r); render('fwd'); }
  function swap(r) { stack[stack.length - 1] = r; render('fwd'); }
  function back() { if (stack.length > 1) stack.pop(); render('back'); }
  function render(mode) {
    var r = cur(), y = window.scrollY;
    sealN = 0;
    app.innerHTML = VIEWS[r.name](r);
    app.className = '';
    if (mode === 'fwd' || mode === 'back') { void app.offsetWidth; app.className = mode; }
    if (mode === 'keep') window.scrollTo(0, y);
    else if (mode === 'back' && r.name === 'ledger') window.scrollTo(0, ledgerY);
    else window.scrollTo(0, 0);
    if (r.focus) { var f = document.getElementById(r.focus); r.focus = null; if (f) f.scrollIntoView({ block: 'start' }); }
  }
  var toastT;
  function toast(m) { toastEl.textContent = m; toastEl.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(function () { toastEl.classList.remove('on'); }, 2400); }
  var sheetCb = null;
  function sheet(title, body, ok, cb, cancel) {
    sheetCb = cb;
    layer.innerHTML = '<div class="scrim" data-act="sheet-x"><div class="sheet" role="dialog" aria-modal="true" aria-label="' + esc(title) + '"><h3>' + esc(title) + '</h3><p>' + esc(body) + '</p>' +
      '<div class="row"><button class="btn" data-act="sheet-x">' + esc(cancel || 'Cancel') + '</button><button class="btn ink" data-act="sheet-ok">' + esc(ok) + '</button></div></div></div>';
  }
  function closeSheet() { layer.innerHTML = ''; sheetCb = null; }

  /* ---------- views ---------- */
  var VIEWS = {};

  function topbar(label, right) {
    return '<nav class="topbar"><button class="link" data-act="back" aria-label="Back">← ' + esc(label || 'Ledger') + '</button>' + (right || '<span></span>') + '</nav>';
  }
  function sec(n, title, aside, body, id) {
    return '<section class="sec"' + (id ? ' id="' + id + '"' : '') + '><header><span class="caps gold">§ ' + ROMAN[n] + '</span><h2>' + title + '</h2>' + (aside ? '<span class="caps">' + aside + '</span>' : '') + '</header>' + body + '</section>';
  }

  VIEWS.ledger = function (r) {
    var now = new Date(), budget = +S.settings.budget || 0, spent = spentIn(now), left = budget - spent;
    var vaultN = S.entries.filter(function (e) { return e.status === 'cooling'; }).length;
    var pct = budget > 0 ? Math.min(100, spent / budget * 100) : 0;
    var h = '<header class="mast"><div class="dateline"><span class="caps">' + dMid(now.getTime()) + '</span>' +
      '<button class="link" data-act="menu" aria-haspopup="true" aria-expanded="' + (r.menu ? 'true' : 'false') + '">Contents <span aria-hidden="true">≡</span></button></div>' +
      (r.menu ? '<div class="menu" role="menu"><button role="menuitem" data-act="nav" data-to="insights">Insights<small>Hit rate, regrets, money kept</small></button><button role="menuitem" data-act="nav" data-to="settings">Settings<small>Budget, privacy, your data</small></button></div>' : '') +
      '<h1>Worthmark' + seal(22) + '</h1><p class="motto">A ledger of things worth having, and things worth leaving.</p><div class="dbl"></div>' +
      '<div class="figs"><button class="fig' + (left < 0 ? ' over' : '') + '" data-act="nav" data-to="settings" aria-label="Wants budget, open settings"><b>' + money(left) + '</b><span class="caps">' + (left < 0 ? 'over this month' : 'left for wants') + '</span></button>' +
      '<button class="fig" data-act="nav" data-to="insights"><b>' + money(savedTotal()) + '</b><span class="caps">money kept</span></button>' +
      '<button class="fig" data-act="filter" data-f="cooling"><b>' + vaultN + '</b><span class="caps">in the vault</span></button></div>' +
      '<div class="guard" role="img" aria-label="' + Math.round(pct) + ' percent of the monthly wants budget spent"><i></i><u style="width:' + pct + '%"></u></div>' +
      '<p class="guardnote">' + (budget > 0 ? money(spent) + ' of ' + money(budget) + ' spent on wants in ' + MONTHS[now.getMonth()] : 'No monthly wants budget set. Add one in Settings.') + '</p></header>';

    // things asking for attention
    S.entries.forEach(function (e) {
      if (vaultOver(e)) h += '<div class="notice"><span class="caps gold">The vault has opened</span><h3>Still want the ' + esc(e.name) + '?</h3><p>' + durLabel(e.vault.hours) + ' have passed since you set it aside. ' + money(e.price) + ' is still yours.</p>' +
        '<div class="row"><button class="btn" data-act="still-yes" data-id="' + e.id + '">Yes, still</button><button class="btn ink" data-act="still-no" data-id="' + e.id + '">No, let it go</button></div></div>';
      else if (regretDue(e)) h += '<div class="notice"><span class="caps gold">Thirty days on</span><h3>Was the ' + esc(e.name) + ' worth it?</h3><p>You bought it ' + ago(e.boughtAt) + ' for ' + money(e.price) + ' and have used it ' + plural(e.uses.length, 'time') + '.</p>' +
        '<div class="row"><button class="btn ink" data-act="open" data-id="' + e.id + '" data-focus="regret">Answer the check-in</button></div></div>';
    });

    var F = [['all', 'All'], ['open', 'Deciding'], ['cooling', 'Cooling off'], ['bought', 'Bought'], ['skipped', 'Skipped'], ['returned', 'Returned']];
    var f = r.filter || 'all';
    h += '<div class="filters" role="toolbar" aria-label="Filter entries">' + F.map(function (x) { return '<button data-act="filter" data-f="' + x[0] + '" aria-pressed="' + (f === x[0]) + '">' + x[1] + '</button>'; }).join('') + '</div>';

    var list = S.entries.filter(function (e) { return f === 'all' || (f === 'open' ? (e.status === 'considering' || e.status === 'decided') : e.status === f); })
      .sort(function (a, b) { return b.createdAt - a.createdAt; });
    if (!S.entries.length) h += '<div class="blank"><h2>The page is blank.</h2><p>Tap the plus to write down the next thing you are tempted to buy. Worthmark will help you work out whether it deserves your money.</p></div>';
    else if (!list.length) h += '<div class="blank"><p><em>Nothing under this heading yet.</em></p></div>';
    var lastM = '';
    list.forEach(function (e) {
      var d = new Date(e.createdAt), mk = MONTHS[d.getMonth()] + ' ' + d.getFullYear();
      if (mk !== lastM) {
        lastM = mk;
        var c = list.filter(function (x) { var y = new Date(x.createdAt); return y.getMonth() === d.getMonth() && y.getFullYear() === d.getFullYear(); }).length;
        h += '<div class="month"><h2>' + mk + '</h2><span class="caps">' + plural(c, 'entry').replace('entrys', 'entries') + '</span></div>';
      }
      var struck = e.status === 'skipped' || e.status === 'returned';
      var meta = '<span class="st' + (e.status === 'cooling' || e.status === 'decided' ? ' on' : '') + '">' + esc(statusText(e)) + '</span> · ' + esc(e.cat);
      if (e.status === 'cooling' && !vaultOver(e)) meta += '<br><i class="num" data-cd="' + e.vault.end + '">' + cd(e.vault.end - Date.now()) + '</i>';
      else if (e.status === 'bought' && e.uses.length) meta += '<br><i>' + perUse(e.price / e.uses.length) + ' a use so far</i>';
      else if (e.status === 'skipped') meta += '<br><i>' + money(e.price) + ' kept</i>';
      var sub = e.test ? e.test.verdict : '';
      h += '<button class="line' + (struck ? ' struck' : '') + '" data-act="open" data-id="' + e.id + '"><span class="day"><b>' + d.getDate() + '</b><span>' + WDAYS[d.getDay()].slice(0, 3) + '</span></span>' +
        '<span><span class="nm">' + esc(e.name) + (e.marked ? seal(18) : '') + '</span><span class="meta" style="display:block">' + meta + '</span></span>' +
        '<span class="pr"><span>' + money(e.price) + '</span>' + (sub ? '<small>' + sub + '</small>' : '') + '</span></button>';
    });
    if (S.entries.some(function (e) { return e.seed; })) h += '<p class="seedbar">Some entries are examples to show how the ledger reads. <button data-act="clear-seed">Clear the examples</button></p>';
    h += '<button class="plus" data-act="new" aria-label="Write a new entry"><svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true"><path d="M14 3v22M3 14h22" stroke="currentColor" stroke-width="2" fill="none"/></svg></button>';
    return h;
  };

  VIEWS.form = function (r) {
    var e = r.id ? byId(r.id) : null, d = r.draft || (r.draft = e ? { name: e.name, price: e.price, cat: e.cat, note: e.note || '' } : { name: '', price: '', cat: 'Other', note: '' });
    return topbar(e ? 'Entry' : 'Ledger') +
      '<p class="caps kicker">' + (e ? 'Amend the entry' : 'New entry · ' + dLong(Date.now())) + '</p><h1 class="title">' + (e ? 'Set it straight.' : 'What is tempting you?') + '</h1>' +
      '<label class="field"><span class="caps">The thing</span><input id="f-name" type="text" maxlength="70" autocomplete="off" placeholder="e.g. Linen duvet cover" value="' + esc(d.name) + '"></label>' +
      '<label class="field"><span class="caps">The price (' + esc(S.settings.cur) + ')</span><input id="f-price" class="num" type="text" inputmode="decimal" autocomplete="off" placeholder="0.00" value="' + esc(d.price) + '"></label>' +
      '<div class="field"><span class="caps">Kind</span><div class="chips">' + CATS.map(function (c) { return '<button type="button" class="chip" data-act="cat" data-c="' + c + '" aria-pressed="' + (d.cat === c) + '">' + c + '</button>'; }).join('') + '</div></div>' +
      '<label class="field"><span class="caps">Why you want it (optional)</span><textarea id="f-note" maxlength="280" placeholder="A line to your future self">' + esc(d.note) + '</textarea></label>' +
      '<p class="err" id="f-err" role="alert"></p>' +
      (e ? '<div class="row"><button class="btn ink block" data-act="save-entry">Save the changes</button></div>'
        : '<div class="row"><button class="btn ink block" data-act="save-entry" data-then="test">Write it down and take the Worth Test</button></div><div class="row"><button class="btn block" data-act="save-entry">Just write it down</button></div>');
  };

  VIEWS.test = function (r) {
    var e = byId(r.id); if (!e) return VIEWS.ledger(stack[0]);
    var i = r.step, Q = QUESTIONS[i], hint = Q.hint;
    if (i === 5) {
      var b = +S.settings.budget || 0, left = b - spentIn(new Date());
      hint = b > 0 ? 'You have ' + money(left) + ' of your ' + money(b) + ' wants budget left this month. This costs ' + money(e.price) + ', which would leave ' + money(left - e.price) + '.'
        : 'You have not set a monthly wants budget, so judge it against what you can spare. This costs ' + money(e.price) + '.';
    }
    return '<nav class="topbar"><button class="link" data-act="test-back">← ' + (i ? 'Previous' : 'Leave the test') + '</button><span class="caps">The Worth Test</span></nav>' +
      '<div class="ticks" role="img" aria-label="Question ' + (i + 1) + ' of 7">' + QUESTIONS.map(function (_, k) { return '<i class="' + (k < i ? 'done' : k === i ? 'now' : '') + '"></i>'; }).join('') + '</div>' +
      '<div class="qnum" aria-hidden="true">' + (i + 1) + '</div><p class="caps">Question ' + (i + 1) + ' of 7 · ' + esc(e.name) + '</p>' +
      '<h1 class="q">' + Q.q + '</h1><p class="hint">' + esc(hint) + '</p>' +
      '<div class="opts">' + Q.o.map(function (o, k) { return '<button class="opt' + (r.answers[i] === k ? ' sel' : '') + '" data-act="answer" data-k="' + k + '"><b>' + 'abcde'[k] + '.</b><span>' + o[0] + '</span></button>'; }).join('') + '</div>';
  };

  function reasonsList(t) {
    return '<ul class="reasons">' + t.reasons.map(function (x) { return '<li class="' + (x.s < 0 ? 'con' : 'pro') + '"><b aria-hidden="true">' + (x.s > 0 ? '+' : x.s < 0 ? '−' : '·') + '</b><span>' + esc(x.t) + '</span></li>'; }).join('') + '</ul>';
  }
  function scaleBar(t) {
    var n = Math.max(0, Math.min(13, t.score)), s = '';
    for (var i = 0; i < 13; i++) s += '<i class="' + (i < n ? 'f' : '') + '"></i>';
    return '<div class="scale" role="img" aria-label="Score ' + t.score + ' of ' + MAXSCORE + '">' + s + '</div><p class="fine" style="margin-top:2px">Score ' + (t.score < 0 ? '−' + Math.abs(t.score) : t.score) + ' of ' + MAXSCORE + '. Eight or more is a buy; under three is a skip.</p>';
  }

  VIEWS.verdict = function (r) {
    var e = byId(r.id); if (!e || !e.test) return VIEWS.ledger(stack[0]);
    var t = e.test, v = t.verdict, hrs = suggestHours(e.price), acts;
    if (e.status === 'bought' || e.status === 'returned' || e.status === 'skipped' || e.status === 'cooling') acts = '<div class="row"><button class="btn ink block" data-act="to-entry" data-id="' + e.id + '">Back to the entry</button></div>';
    else if (v === 'BUY') acts = '<div class="row"><button class="btn ink block" data-act="buy" data-id="' + e.id + '">I’ll buy it</button></div><div class="row"><button class="btn block" data-act="vault" data-h="24" data-id="' + e.id + '">Sleep on it for 24 hours first</button></div>';
    else if (v === 'WAIT') acts = '<div class="row"><button class="btn ink block" data-act="vault" data-h="' + hrs + '" data-id="' + e.id + '">Put it in the vault for ' + durLabel(hrs) + '</button></div><div class="row"><button class="btn block" data-act="to-entry" data-id="' + e.id + '">Choose another length</button></div>';
    else acts = '<div class="row"><button class="btn ink block" data-act="skip" data-id="' + e.id + '">Skip it and keep ' + money(e.price) + '</button></div><div class="row"><button class="btn block" data-act="vault" data-h="' + hrs + '" data-id="' + e.id + '">Vault it for ' + durLabel(hrs) + ' anyway</button></div>';
    return topbar('Entry') + '<div class="verdict"><p class="caps">The verdict on</p><h1 class="title" style="font-style:italic;font-size:28px;margin-bottom:0">' + esc(e.name) + ', ' + money(e.price) + '</h1>' +
      '<div class="vstamp' + (r.fresh ? ' fresh' : '') + '">' + v + '</div><p class="big">' + esc(t.head) + '</p></div>' +
      '<section class="sec"><header><h2>The reasons</h2><span class="caps">strongest first</span></header>' + reasonsList(t) + scaleBar(t) + '</section>' +
      '<div style="margin-top:22px">' + acts + '</div>';
  };

  function tallyMarks(n) {
    var shown = Math.min(n, 50), s = '';
    for (var g = 0; g < Math.ceil(shown / 5); g++) {
      var k = Math.min(5, shown - g * 5), last = g === Math.ceil(shown / 5) - 1, p = '';
      for (var i = 0; i < Math.min(k, 4); i++) p += '<path' + (last && k < 5 && i === k - 1 ? ' class="new"' : '') + ' d="M' + (5 + i * 8) + ' 3 L' + (4 + i * 8) + ' 27"/>';
      if (k === 5) p += '<path' + (last ? ' class="new"' : '') + ' d="M0 23 L34 7"/>';
      s += '<svg width="34" height="30" viewBox="0 0 34 30" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round">' + p + '</g></svg>';
    }
    if (n > shown) s += '<em style="font-size:14px;color:var(--mute)">and ' + (n - shown) + ' more</em>';
    return s;
  }
  function spark(e, target) {
    var n = e.uses.length; if (n < 2) return '';
    var W = 320, H = 92, pts = [], max = e.price, lg = function (v) { return Math.log(Math.max(v, 0.01)); };
    var lo = lg(Math.min(e.price / n, target || e.price / n)) - 0.25, hi = lg(max) + 0.05;
    for (var i = 1; i <= n; i++) pts.push((4 + (i - 1) / (n - 1) * (W - 8)).toFixed(1) + ',' + (6 + (hi - lg(e.price / i)) / (hi - lo) * (H - 14)).toFixed(1));
    var ty = target ? 6 + (hi - lg(target)) / (hi - lo) * (H - 14) : null, lp = pts[pts.length - 1].split(',');
    return '<svg class="spark" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" role="img" aria-label="Cost per use falling from ' + perUse(e.price) + ' to ' + perUse(e.price / n) + '">' +
      (ty != null ? '<line x1="0" x2="' + W + '" y1="' + ty.toFixed(1) + '" y2="' + ty.toFixed(1) + '" stroke="#A07A2C" stroke-width="1" stroke-dasharray="3 4" vector-effect="non-scaling-stroke"/>' : '') +
      '<polyline points="' + pts.join(' ') + '" fill="none" stroke="#1A1814" stroke-width="1.6" vector-effect="non-scaling-stroke"/>' +
      '<circle cx="' + lp[0] + '" cy="' + lp[1] + '" r="3.2" fill="#1A1814"/></svg>' +
      '<p class="fine" style="margin-top:4px">Each use pulls the line down.' + (target ? ' The gold rule is your estimate of ' + perUse(target) + ' a use.' : '') + '</p>';
  }

  function cpuSection(e, n) {
    var life = lifeUses(e.cpu), est = life ? e.price / life : 0, owned = e.status === 'bought' || e.status === 'returned';
    var h = '';
    if (owned) {
      var u = e.uses.length, real = u ? e.price / u : e.price;
      h += '<p class="caps">Real cost per use</p><div class="cpu-hero"><b id="realcpu" class="' + (cur().bump ? 'bump' : '') + '">' + perUse(real) + '</b><span class="caps" style="text-align:right">' + plural(u, 'use') + ' logged</span></div>';
      cur().bump = false;
      if (u) h += '<div class="tally">' + tallyMarks(u) + '</div>';
      else h += '<p>Not used yet. Until the first use, it has cost you the whole ' + money(e.price) + '.</p>';
      if (e.status === 'bought') h += '<button class="usebtn" data-act="use" data-id="' + e.id + '"><svg width="20" height="24" viewBox="0 0 20 24" aria-hidden="true"><path d="M10 2 L9 22" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>Used it today</button>' +
        (u ? '<div class="row" style="justify-content:flex-end;margin-top:0"><button class="link" data-act="unuse" data-id="' + e.id + '">Strike the last mark</button></div>' : '');
      h += spark(e, est);
      if (est && u) {
        var need = Math.ceil(e.price / est) - u;
        h += '<p style="margin-top:10px">' + (need > 0 ? plural(need, 'more use') + ' until it reaches the ' + perUse(est) + ' you estimated.' : 'It has beaten your estimate of ' + perUse(est) + ' a use.') + '</p>';
      }
      h += '<p class="caps" style="margin-top:24px">Your estimate</p>';
    } else h += '<p>What does each use really cost? Estimate how much you will use it, then set it against the alternatives.</p>';
    h += '<div class="pair"><label class="field"><span class="caps">Uses a month</span><input class="num" type="text" inputmode="decimal" data-cpu="perMonth" data-id="' + e.id + '" placeholder="e.g. 8" value="' + esc(e.cpu.perMonth) + '"></label>' +
      '<label class="field"><span class="caps">Years it will last</span><input class="num" type="text" inputmode="decimal" data-cpu="years" data-id="' + e.id + '" placeholder="e.g. 5" value="' + esc(e.cpu.years) + '"></label></div>';
    if (life) {
      if (!owned) h += '<div class="cpu-hero"><b>' + perUse(est) + '</b><span class="caps" style="text-align:right">a use, over<br>' + life.toLocaleString('en-US') + ' uses</span></div>';
      var rows = [{ name: e.name, cpu: est, sub: money(e.price) + ' ÷ ' + life.toLocaleString('en-US'), me: true }].concat(e.cpu.alts.map(function (a, i) { return { name: a.name, cpu: a.uses ? a.price / a.uses : a.price, sub: money(a.price) + ' ÷ ' + a.uses.toLocaleString('en-US'), i: i }; }));
      var mx = Math.max.apply(null, rows.map(function (x) { return x.cpu; })) || 1, mn = Math.min.apply(null, rows.map(function (x) { return x.cpu; }));
      rows.sort(function (a, b) { return a.cpu - b.cpu; });
      h += '<div class="cmp">' + rows.map(function (x) {
        return '<div class="' + (x.me ? 'me' : 'alt') + '"><span class="lab"><span>' + (x.me ? '<b style="font-weight:500">' + esc(x.name) + '</b>' : esc(x.name)) + (rows.length > 1 && x.cpu === mn ? ' <em>— cheapest per use</em>' : '') + '</span><span class="num">' + perUse(x.cpu) + '</span></span><u style="width:' + Math.max(1, x.cpu / mx * 100) + '%"></u>' +
          (x.me ? '' : '<button class="x" data-act="alt-del" data-id="' + e.id + '" data-i="' + x.i + '" aria-label="Remove ' + esc(x.name) + '">×</button>') + '</div>';
      }).join('') + '</div>';
    } else h += '<p class="fine">Fill in both figures to see the cost of a single use.</p>';
    h += '<p class="caps" style="margin-top:22px">Compare an alternative</p><div class="addalt"><input class="inp sm" id="alt-name" type="text" maxlength="40" placeholder="Rent, borrow, cheaper…" aria-label="Alternative name"><input class="inp sm num" id="alt-price" type="text" inputmode="decimal" placeholder="Cost" aria-label="Alternative cost"><input class="inp sm num" id="alt-uses" type="text" inputmode="numeric" placeholder="Uses" aria-label="Uses you get for that cost"></div>' +
      '<div class="row"><button class="btn small" data-act="alt-add" data-id="' + e.id + '">Add to the comparison</button></div><p class="fine">For renting or paying each time, enter the cost of one go and 1 use.</p>';
    return sec(n, 'Cost per use', owned ? '' : 'price ÷ uses', h, 'cpu');
  }

  function regretSection(e, n, r) {
    var h = '', due = Date.now() - e.boughtAt >= 30 * DAY;
    if (e.regret && !r.revise) {
      var g = e.regret.rating;
      h += '<div class="earned">' + (e.marked ? seal(96, r.justMarked ? 'press' : '') : '') + '<div><p class="pips num" aria-label="' + g + ' out of 5">' + '●●●●●'.slice(0, g) + '○○○○○'.slice(0, 5 - g) + '</p>' +
        '<p class="big">' + ['', 'You regret it.', 'Mostly a regret.', 'It was fine. No more.', 'Worth it.', 'Worth every cent.'][g] + '</p>' +
        (e.marked ? '<p class="caps gold">It earned its Worthmark</p>' : '') + '</div></div>';
      if (e.regret.lesson) h += '<p class="quote">' + esc(e.regret.lesson) + '</p>';
      h += '<p class="fine">Recorded ' + dLong(e.regret.at) + '.</p><div class="row"><button class="btn small quiet" data-act="revise">Revise the answer</button></div>';
      r.justMarked = false;
    } else if (due || r.early || r.revise) {
      var pre = e.regret ? e.regret.rating : 0;
      h += '<p class="big">Was it worth it?</p><p>' + (e.status === 'returned' ? 'You sent it back. ' : '') + 'You paid ' + money(e.price) + ' and have used it ' + plural(e.uses.length, 'time') + '.</p>' +
        '<div class="rate" id="rate" data-v="' + pre + '" role="group" aria-label="Rating from 1 to 5">' + [1, 2, 3, 4, 5].map(function (i) { return '<button class="num" data-act="rate" data-v="' + i + '" aria-pressed="' + (pre === i) + '">' + i + '</button>'; }).join('') + '</div>' +
        '<div class="ratelabels"><span>Regret it</span><span>Worth every cent</span></div>' +
        '<label class="field"><span class="caps">The lesson, for next time</span><textarea id="lesson" maxlength="240" placeholder="What would you tell yourself before buying?">' + esc(e.regret ? e.regret.lesson : '') + '</textarea></label>' +
        '<p class="err" id="r-err" role="alert"></p><div class="row"><button class="btn ink block" data-act="regret-save" data-id="' + e.id + '">Record the answer</button></div>';
    } else {
      h += '<p>Thirty days after buying, Worthmark will ask whether it was worth it. That check-in opens on <b style="font-weight:500;color:var(--ink)">' + dLong(e.boughtAt + 30 * DAY) + '</b>.</p><div class="row"><button class="btn small quiet" data-act="early">Answer early</button></div>';
    }
    return sec(n, 'The regret check', due && !e.regret ? 'due now' : '30 days on', h, 'regret');
  }

  VIEWS.entry = function (r) {
    var e = byId(r.id); if (!e) return VIEWS.ledger(stack[0]);
    var order = S.entries.slice().sort(function (a, b) { return a.createdAt - b.createdAt; }), no = order.indexOf(e) + 1;
    var h = topbar('Ledger', '<button class="link" data-act="edit" data-id="' + e.id + '">Amend</button>') +
      '<p class="caps kicker">Entry No. ' + no + ' · Written ' + dLong(e.createdAt) + '</p><h1 class="title">' + esc(e.name) + '</h1>' +
      '<p class="deck">' + esc(e.cat) + '</p>' +
      '<div class="priceline"><b>' + money(e.price) + '</b><span class="caps" style="color:var(--ink)">' + esc(statusText(e)) + '</span></div>' +
      (e.note ? '<p class="note">' + esc(e.note) + '</p>' : '');
    var n = 0, s = '';

    // status
    if (e.status === 'cooling' && !vaultOver(e)) {
      var tot = e.vault.end - e.vault.start, done = Date.now() - e.vault.start;
      s = '<p class="caps">Opens in</p><div class="clock" data-cd="' + e.vault.end + '">' + cd(e.vault.end - Date.now()) + '</div>' +
        '<div class="bar"><u data-cdbar="' + e.vault.start + ',' + e.vault.end + '" style="width:' + Math.min(100, done / tot * 100).toFixed(2) + '%"></u></div>' +
        '<p>Set aside for ' + durLabel(e.vault.hours) + '. The vault opens ' + dMid(e.vault.end) + ' at ' + tStr(e.vault.end) + ', and then you will be asked one question: still want it?</p>' +
        '<div class="row"><button class="btn small" data-act="vault-end" data-id="' + e.id + '">Open the vault now</button><button class="btn small" data-act="skip" data-id="' + e.id + '">Skip it, keep ' + money(e.price) + '</button></div>';
      h += sec(n++, 'The cool-off vault', 'cooling off', s, 'vault');
    } else if (e.status === 'cooling') {
      s = '<p class="big">The cool-off is over. Still want it?</p><p>' + durLabel(e.vault.hours) + ' have passed since ' + dMid(e.vault.start) + '. If the wanting has gone, so can the ' + money(e.price) + ' price tag.</p>' +
        '<div class="row"><button class="btn" data-act="still-yes" data-id="' + e.id + '">Yes, still</button><button class="btn ink" data-act="still-no" data-id="' + e.id + '">No, let it go</button></div>';
      h += sec(n++, 'The cool-off vault', 'opened', s, 'vault');
    } else if (e.status === 'considering' || e.status === 'decided') {
      s = (e.status === 'decided' ? '<p class="big">' + (e.decision === 'buy' ? 'You have decided to buy it.' : e.decision === 'skip' ? 'The verdict was to skip it.' : 'The verdict was to wait.') + '</p>' : '<p>Set it aside and let the wanting cool. Pick a length; a live timer will count it down.</p>') +
        '<p class="caps" style="margin-top:14px">Put it in the vault for</p><div class="row" style="margin-top:6px">' + [24, 72, 168].map(function (x) { return '<button class="btn small" style="flex:1" data-act="vault" data-h="' + x + '" data-id="' + e.id + '">' + durLabel(x) + '</button>'; }).join('') + '</div>' +
        '<div class="row"><button class="btn ink" data-act="buy" data-id="' + e.id + '">I bought it</button><button class="btn" data-act="skip" data-id="' + e.id + '">Skip it, keep ' + money(e.price) + '</button></div>';
      h += sec(n++, 'The decision', '', s, 'vault');
    } else if (e.status === 'bought') {
      s = '<p>Bought ' + ago(e.boughtAt) + ', on ' + dLong(e.boughtAt) + '.' + (sameMonth(e.boughtAt, new Date()) ? ' It counts against this month’s wants budget.' : '') + '</p>' +
        '<div class="row"><button class="btn small quiet" data-act="return" data-id="' + e.id + '">I returned it</button></div>';
      h += sec(n++, 'The decision', '', s);
    } else if (e.status === 'skipped') {
      s = '<p class="big">You kept ' + money(e.price) + '.</p><p>Skipped on ' + dLong(e.skippedAt) + (e.vault && e.vault.answered === 'no' ? ', after ' + durLabel(e.vault.hours) + ' in the vault' : '') + '. It counts toward your money kept.</p>' +
        '<div class="row"><button class="btn small quiet" data-act="reconsider" data-id="' + e.id + '">Reconsider it</button></div>';
      h += sec(n++, 'The decision', '', s);
    } else if (e.status === 'returned') {
      s = '<p class="big">Sent back. ' + money(e.price) + ' recovered.</p><p>Bought ' + dLong(e.boughtAt) + ', returned ' + dLong(e.returnedAt) + '.</p>';
      h += sec(n++, 'The decision', '', s);
    }

    // regret (first for owned things when due)
    var owned = e.status === 'bought' || e.status === 'returned';
    if (owned && (regretDue(e) || r.early)) h += regretSection(e, n++, r);

    // worth test
    if (e.test) {
      s = '<div style="display:flex;gap:16px;align-items:center"><span class="vmini">' + e.test.verdict + '</span><p style="flex:1">' + esc(e.test.head) + '</p></div>' +
        '<div class="row"><button class="btn small" data-act="verdict" data-id="' + e.id + '">Read the reasons</button>' + (owned ? '' : '<button class="btn small quiet" data-act="test" data-id="' + e.id + '">Take it again</button>') + '</div>';
      h += sec(n++, 'The Worth Test', 'taken ' + ago(e.test.at), s, 'test');
    } else if (!owned && e.status !== 'skipped') {
      s = '<p>Seven honest questions about need, use, money and how you will feel in a month. It ends in one word: buy, wait or skip.</p><div class="row"><button class="btn ink block" data-act="test" data-id="' + e.id + '">Take the Worth Test</button></div>';
      h += sec(n++, 'The Worth Test', 'about a minute', s, 'test');
    }

    if (e.status !== 'skipped' || lifeUses(e.cpu)) h += cpuSection(e, n++);
    if (owned && !(regretDue(e) || r.early)) h += regretSection(e, n++, r);

    if (!owned) {
      var q = encodeURIComponent(e.name);
      var shops = [['Google Shopping', 'https://www.google.com/search?tbm=shop&q=' + q], ['Amazon', 'https://www.amazon.com/s?k=' + q], ['Walmart', 'https://www.walmart.com/search?q=' + q], ['Target', 'https://www.target.com/s?searchTerm=' + q], ['eBay', 'https://www.ebay.com/sch/i.html?_nkw=' + q]];
      s = '<div class="shops">' + shops.map(function (x) { return '<a href="' + x[1] + '" target="_blank" rel="noopener noreferrer external">' + x[0] + '<span>search ↗</span></a>'; }).join('') + '</div>' +
        '<p class="fine">Each opens a search for “' + esc(e.name) + '” in your browser. Worthmark is not paid by any shop and adds nothing to the links.</p>';
      h += sec(n++, 'Check the price', 'elsewhere', s, 'shops');
    }
    h += '<div class="row" style="margin-top:44px;justify-content:center"><button class="link" data-act="del" data-id="' + e.id + '">Tear out this entry</button></div>';
    return h;
  };

  VIEWS.insights = function () {
    var E = S.entries, rated = E.filter(function (e) { return e.regret; }), hits = rated.filter(function (e) { return e.regret.rating >= 4; }).length;
    var skipped = E.filter(function (e) { return e.status === 'skipped'; }), ret = E.filter(function (e) { return e.status === 'returned'; });
    var h = topbar('Ledger') + '<p class="caps kicker">Insights · as of ' + dLong(Date.now()) + '</p><h1 class="title">How your buying has gone.</h1>';
    h += '<div class="hero" style="border-top:2px solid var(--ink);margin-top:16px"><span class="caps">Hit rate</span>' +
      (rated.length ? '<b>' + Math.round(hits / rated.length * 100) + '<sup>%</sup></b><p class="deck">' + hits + ' of ' + plural(rated.length, 'purchase') + ' you have judged ' + (hits === 1 ? 'was' : 'were') + ' worth it.</p>'
        : '<b>—</b><p class="deck">No regret checks answered yet. They arrive 30 days after you buy.</p>') + '</div>';
    h += '<div class="duo"><div><b>' + money(savedTotal()) + '</b><span class="caps">kept by skipping ' + plural(skipped.length, 'thing') + '</span></div><div><b>' + money(ret.reduce(function (a, e) { return a + e.price; }, 0)) + '</b><span class="caps">recovered by ' + plural(ret.length, 'return') + '</span></div></div>';

    // regret by category
    var cats = {}; rated.forEach(function (e) { var c = cats[e.cat] || (cats[e.cat] = { n: 0, sum: 0, bad: 0, spent: 0 }); c.n++; c.sum += e.regret.rating; if (e.regret.rating <= 2) { c.bad++; c.spent += e.price; } });
    var ck = Object.keys(cats).sort(function (a, b) { return cats[a].sum / cats[a].n - cats[b].sum / cats[b].n; });
    var s = ck.length ? ck.map(function (k) { var c = cats[k], avg = c.sum / c.n; return '<div class="cat"><div class="lab"><span>' + esc(k) + '</span><em>' + (c.bad ? plural(c.bad, 'regret') + ', ' + money(c.spent) : 'no regrets') + ' · ' + avg.toFixed(1) + ' of 5</em></div><div class="track" role="img" aria-label="Average ' + avg.toFixed(1) + ' of 5"><u style="width:' + (avg / 5 * 100) + '%"></u></div></div>'; }).join('') + '<p class="fine">Most regretted first. The bar is the average answer to “was it worth it?”</p>'
      : '<p>Once you have answered a few regret checks, the kinds of thing you regret most will be listed here.</p>';
    h += sec(0, 'Where you regret most', 'by kind', s);

    // spending by month
    var now = new Date(), b = +S.settings.budget || 0, ms = [], mx = b;
    for (var i = 5; i >= 0; i--) { var d = new Date(now.getFullYear(), now.getMonth() - i, 1), v = spentIn(d); ms.push({ d: d, v: v }); if (v > mx) mx = v; }
    mx = mx || 1;
    s = '<div class="cols">' + (b ? '<span class="cap" style="bottom:' + (b / mx * 78) + '%">budget ' + money(b) + '</span>' : '') + ms.map(function (m, i) { return '<div class="c' + (i === 5 ? ' cur' : '') + '"><span>' + (m.v ? money(Math.round(m.v)) : '') + '</span><u style="height:' + (m.v / mx * 78) + '%"></u></div>'; }).join('') + '</div>' +
      '<div class="collab">' + ms.map(function (m) { return '<span class="caps">' + MONTHS[m.d.getMonth()].slice(0, 3) + '</span>'; }).join('') + '</div><p class="fine">Money spent on wants you kept, month by month. Returns are left out.</p>';
    h += sec(1, 'The monthly guardrail', 'six months', s);

    // verdicts + vault
    var tested = E.filter(function (e) { return e.test; }), vc = { BUY: 0, WAIT: 0, SKIP: 0 }; tested.forEach(function (e) { vc[e.test.verdict]++; });
    var vaulted = E.filter(function (e) { return e.vault && e.vault.answered; }), let_go = vaulted.filter(function (e) { return e.vault.answered === 'no'; }).length;
    s = '<div class="duo" style="grid-template-columns:1fr 1fr 1fr;border-top:1px solid var(--hair)">' + ['BUY', 'WAIT', 'SKIP'].map(function (k) { return '<div><b>' + vc[k] + '</b><span class="caps">' + k + '</span></div>'; }).join('') + '</div>' +
      '<p style="margin-top:12px">' + (tested.length ? 'You have taken the Worth Test ' + plural(tested.length, 'time') + '. ' : 'You have not taken the Worth Test yet. ') +
      (vaulted.length ? 'Of ' + plural(vaulted.length, 'thing') + ' that finished a cool-off, you let ' + let_go + ' go.' : 'Nothing has finished a cool-off yet.') + '</p>';
    h += sec(2, 'Verdicts and the vault', '', s);

    // best value
    var used = E.filter(function (e) { return e.status === 'bought' && e.uses.length; }).sort(function (a, b) { return a.price / a.uses.length - b.price / b.uses.length; });
    s = used.length ? '<div class="cmp">' + used.slice(0, 5).map(function (e) { return '<div><span class="lab"><span>' + esc(e.name) + (e.marked ? ' ' + seal(15, 'gold') : '') + ' <em>' + plural(e.uses.length, 'use') + '</em></span><span class="num">' + perUse(e.price / e.uses.length) + '</span></span></div>'; }).join('') + '</div>' : '<p>Log uses on the things you have bought and the best value will rise to the top here.</p>';
    h += sec(3, 'Best value so far', 'real cost per use', s);

    var les = rated.filter(function (e) { return e.regret.lesson; }).sort(function (a, b) { return b.regret.at - a.regret.at; });
    s = les.length ? les.map(function (e) { return '<div class="lesson"><p class="quote">' + esc(e.regret.lesson) + '</p><span class="caps">' + esc(e.name) + ' · ' + e.regret.rating + ' of 5</span></div>'; }).join('') : '<p>The lessons you write at each regret check are kept here, to read before the next purchase.</p>';
    h += sec(4, 'Lessons in your own words', '', s);
    return h;
  };

  VIEWS.settings = function () {
    var hasSeed = S.entries.some(function (e) { return e.seed; });
    var h = topbar('Ledger') + '<p class="caps kicker">Settings</p><h1 class="title">The fine print.</h1>';
    h += sec(0, 'Monthly guardrail', '', '<div class="set"><div>Wants budget each month<small>Everything you mark as bought counts against it. Set 0 to switch it off.</small></div><input id="set-budget" class="num" type="text" inputmode="decimal" aria-label="Monthly wants budget" value="' + esc(S.settings.budget) + '"></div>' +
      '<div class="set"><div>Currency mark</div><div class="curs">' + ['$', '£', '€', '¥', '₹'].map(function (c) { return '<button data-act="cur" data-c="' + c + '" aria-pressed="' + (S.settings.cur === c) + '" aria-label="Use ' + c + '">' + c + '</button>'; }).join('') + '</div></div>');
    h += sec(1, 'Your data', '', '<div class="set"><div>Export the ledger<small>Saves every entry and setting as a JSON file.</small></div><button class="btn small" data-act="export">Export</button></div>' +
      (hasSeed ? '<div class="set"><div>Example entries<small>Remove the samples that came with the app. Your own entries stay.</small></div><button class="btn small" data-act="clear-seed">Clear</button></div>' : '') +
      '<div class="set"><div>Delete everything<small>Erases all entries and settings from this device. It cannot be undone.</small></div><button class="btn small" data-act="wipe">Delete</button></div>');
    h += sec(2, 'Privacy', '', '<p>Worthmark has no accounts, no analytics, no advertising and no trackers. Everything you write is stored only on this device and is never sent anywhere.</p><p>The only time the app reaches the internet is when you tap a shop under “Check the price”, which opens that shop’s own search in your browser. Worthmark earns nothing from those links.</p>');
    h += sec(3, 'About', '', '<p>Worthmark is a notebook for buying on purpose: question a purchase before you make it, let it cool, and check afterwards whether it was worth the money. It gives general guidance to help you think, not financial advice.</p>');
    h += '<div class="colophon">' + seal(84) + 'Worthmark, version 1.0<br>' + plural(S.entries.length, 'entry').replace('entrys', 'entries') + ' in the ledger</div>';
    return h;
  };

  /* ---------- actions ---------- */
  function refresh(mode) { save(); render(mode || 'keep'); }
  function readDraft() {
    var r = cur(); if (r.name !== 'form' || !r.draft) return;
    var a = document.getElementById('f-name'); if (!a) return;
    r.draft.name = a.value; r.draft.price = document.getElementById('f-price').value; r.draft.note = document.getElementById('f-note').value;
  }
  function doSkip(e) {
    e.status = 'skipped'; e.skippedAt = Date.now(); e.decision = 'skip';
    toast(money(e.price) + ' kept. ' + money(savedTotal()) + ' in all.');
  }
  function doBuy(e) {
    e.status = 'bought'; e.boughtAt = Date.now(); e.decision = 'buy';
    var b = +S.settings.budget || 0, left = b - spentIn(new Date());
    toast(b ? (left < 0 ? 'Bought. You are ' + money(-left) + ' over this month.' : 'Bought. ' + money(left) + ' left for wants this month.') : 'Marked as bought.');
  }

  var A = {
    back: function () { back(); },
    menu: function () { cur().menu = !cur().menu; render('keep'); },
    nav: function (el) { cur().menu = false; go({ name: el.dataset.to }); },
    filter: function (el) { var r = cur(); r.filter = el.dataset.f; r.menu = false; render('keep'); var f = document.querySelector('.filters'); if (f && f.getBoundingClientRect().top < 0) f.scrollIntoView(); },
    open: function (el) { cur().menu = false; go({ name: 'entry', id: el.dataset.id, focus: el.dataset.focus || null }); },
    'new': function () { cur().menu = false; go({ name: 'form' }); },
    edit: function (el) { go({ name: 'form', id: el.dataset.id }); },
    cat: function (el) { readDraft(); cur().draft.cat = el.dataset.c; render('keep'); },
    'save-entry': function (el) {
      readDraft(); var r = cur(), d = r.draft, name = d.name.trim(), price = num(d.price), err = document.getElementById('f-err');
      if (!name) { err.textContent = 'Give the thing a name first.'; document.getElementById('f-name').focus(); return; }
      if (!(price >= 0)) { err.textContent = 'Write the price as a number, such as 49.99.'; document.getElementById('f-price').focus(); return; }
      price = Math.round(price * 100) / 100;
      if (r.id) { var e = byId(r.id); e.name = name; e.price = price; e.cat = d.cat; e.note = d.note.trim(); save(); stack.pop(); render('back'); toast('Entry amended.'); return; }
      var n = { id: uid(), name: name, price: price, cat: d.cat, note: d.note.trim(), createdAt: Date.now(), status: 'considering', uses: [], cpu: { perMonth: '', years: '', alts: [] } };
      S.entries.push(n); save();
      stack.pop(); stack.push({ name: 'entry', id: n.id });
      if (el.dataset.then === 'test') { stack.push({ name: 'test', id: n.id, step: 0, answers: [] }); }
      render('fwd'); if (el.dataset.then !== 'test') toast('Written into the ledger.');
    },
    test: function (el) { go({ name: 'test', id: el.dataset.id, step: 0, answers: [] }); },
    'test-back': function () { var r = cur(); if (r.step > 0) { r.step--; render('back'); } else back(); },
    answer: function (el) {
      var r = cur(); if (r.busy) return; r.busy = true; r.answers[r.step] = +el.dataset.k;
      [].forEach.call(document.querySelectorAll('.opt'), function (o) { o.classList.toggle('sel', o === el); });
      setTimeout(function () {
        r.busy = false; if (cur() !== r) return;
        if (r.step < QUESTIONS.length - 1) { r.step++; render('fwd'); return; }
        var e = byId(r.id); e.test = computeVerdict(r.answers);
        if (e.status === 'considering' || e.status === 'decided') { e.status = 'decided'; e.decision = e.test.verdict.toLowerCase(); }
        save(); swap({ name: 'verdict', id: e.id, fresh: true });
      }, 260);
    },
    verdict: function (el) { go({ name: 'verdict', id: el.dataset.id }); },
    'to-entry': function (el) { stack = [stack[0], { name: 'entry', id: el.dataset.id }]; render('back'); },
    vault: function (el) {
      var e = byId(el.dataset.id), h = +el.dataset.h, n = Date.now();
      e.status = 'cooling'; e.vault = { start: n, end: n + h * HOUR, hours: h }; save();
      stack = [stack[0], { name: 'entry', id: e.id }]; render(cur().name === 'entry' ? 'fwd' : 'back'); toast('In the vault for ' + durLabel(h) + '.');
    },
    'vault-end': function (el) {
      var e = byId(el.dataset.id);
      sheet('Open the vault early?', 'The point of the cool-off is the waiting. If you are sure, the vault will open now and ask whether you still want it.', 'Open it now', function () { e.vault.end = Date.now(); refresh(); }, 'Keep waiting');
    },
    'still-yes': function (el) { var e = byId(el.dataset.id); e.vault.answered = 'yes'; e.status = 'decided'; e.decision = 'buy'; refresh(); toast('Decided: buy. It survived the cool-off.'); },
    'still-no': function (el) { var e = byId(el.dataset.id); e.vault.answered = 'no'; doSkip(e); refresh(); },
    skip: function (el) { var e = byId(el.dataset.id); doSkip(e); save(); if (cur().name === 'verdict') { stack = [stack[0], { name: 'entry', id: e.id }]; render('back'); } else render('keep'); },
    buy: function (el) { var e = byId(el.dataset.id); doBuy(e); save(); if (cur().name === 'verdict') { stack = [stack[0], { name: 'entry', id: e.id }]; render('back'); } else render('keep'); },
    'return': function (el) {
      var e = byId(el.dataset.id);
      sheet('Mark as returned?', money(e.price) + ' will come off this month’s spending and be counted as recovered.', 'It went back', function () { e.status = 'returned'; e.returnedAt = Date.now(); refresh(); toast(money(e.price) + ' recovered.'); });
    },
    reconsider: function (el) { var e = byId(el.dataset.id); e.status = 'considering'; e.decision = null; refresh(); },
    use: function (el) { var e = byId(el.dataset.id); e.uses.push(Date.now()); cur().bump = true; refresh(); if (navigator.vibrate) { try { navigator.vibrate(8); } catch (x) {} } },
    unuse: function (el) { var e = byId(el.dataset.id); e.uses.pop(); refresh(); },
    'alt-add': function (el) {
      var e = byId(el.dataset.id), nm = document.getElementById('alt-name').value.trim(), p = num(document.getElementById('alt-price').value), u = Math.round(num(document.getElementById('alt-uses').value));
      if (!nm || !(p >= 0) || !(u >= 1)) { toast('Give the alternative a name, a cost and a number of uses.'); return; }
      e.cpu.alts.push({ name: nm, price: p, uses: u }); refresh();
    },
    'alt-del': function (el) { var e = byId(el.dataset.id); e.cpu.alts.splice(+el.dataset.i, 1); refresh(); },
    early: function () { cur().early = true; cur().focus = 'regret'; render('keep'); },
    revise: function () { cur().revise = true; cur().focus = 'regret'; render('keep'); },
    rate: function (el) {
      var box = document.getElementById('rate'); box.dataset.v = el.dataset.v;
      [].forEach.call(box.children, function (b) { b.setAttribute('aria-pressed', b === el ? 'true' : 'false'); });
      document.getElementById('r-err').textContent = '';
    },
    'regret-save': function (el) {
      var e = byId(el.dataset.id), v = +document.getElementById('rate').dataset.v, r = cur();
      if (!v) { document.getElementById('r-err').textContent = 'Choose a number from 1 to 5.'; return; }
      var was = !!e.marked;
      e.regret = { rating: v, lesson: document.getElementById('lesson').value.trim(), at: Date.now() };
      e.marked = v >= 4 && e.status === 'bought';
      r.revise = false; r.early = false; r.justMarked = e.marked && !was; r.focus = 'regret';
      refresh(); toast(e.marked ? 'It earned its Worthmark.' : 'Recorded. The lesson is kept in Insights.');
    },
    del: function (el) {
      var e = byId(el.dataset.id);
      sheet('Tear out this entry?', '“' + e.name + '” and everything recorded about it will be removed from the ledger.', 'Tear it out', function () { S.entries = S.entries.filter(function (x) { return x !== e; }); save(); stack = [stack[0]]; render('back'); toast('Entry removed.'); });
    },
    cur: function (el) { S.settings.cur = el.dataset.c; refresh(); },
    'clear-seed': function () {
      var n = S.entries.filter(function (e) { return e.seed; }).length;
      sheet('Clear the examples?', plural(n, 'example entry').replace('entrys', 'entries') + ' will be removed. Anything you wrote yourself stays.', 'Clear them', function () { S.entries = S.entries.filter(function (e) { return !e.seed; }); refresh(); toast('Examples cleared.'); });
    },
    wipe: function () {
      sheet('Delete everything?', 'Every entry, verdict, use and lesson will be erased from this device. There is no copy anywhere else.', 'Delete it all', function () {
        S = { v: 1, settings: { budget: 300, cur: '$' }, entries: [] }; save(); stack = [{ name: 'ledger', filter: 'all' }]; render('back'); toast('The ledger is empty.');
      });
    },
    'export': function () {
      var text = JSON.stringify({ app: 'Worthmark', exported: new Date().toISOString(), settings: S.settings, entries: S.entries }, null, 2);
      var fname = 'worthmark-ledger-' + new Date().toISOString().slice(0, 10) + '.json';
      try {
        var file = new File([text], fname, { type: 'application/json' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) { navigator.share({ files: [file], title: 'Worthmark ledger' }).catch(function () {}); return; }
      } catch (x) {}
      var url = URL.createObjectURL(new Blob([text], { type: 'application/json' })), a = document.createElement('a');
      a.href = url; a.download = fname; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 4000); toast('Ledger exported as ' + fname);
    },
    'sheet-x': function (el, ev) { if (ev.target === el) closeSheet(); },
    'sheet-ok': function () { var cb = sheetCb; closeSheet(); if (cb) cb(); }
  };

  document.addEventListener('click', function (ev) {
    var el = ev.target.closest('[data-act]');
    if (!el) { if (cur().menu) { cur().menu = false; render('keep'); } return; }
    if (cur().menu && el.dataset.act !== 'menu' && el.dataset.act !== 'nav') cur().menu = false;
    var fn = A[el.dataset.act]; if (fn) fn(el, ev);
  });
  document.addEventListener('change', function (ev) {
    var t = ev.target;
    if (t.dataset && t.dataset.cpu) {
      var e = byId(t.dataset.id), v = num(t.value); e.cpu[t.dataset.cpu] = v > 0 ? v : ''; refresh();
    } else if (t.id === 'set-budget') {
      var b = num(t.value); S.settings.budget = b >= 0 ? Math.round(b * 100) / 100 : 0; save(); t.value = S.settings.budget; toast(S.settings.budget ? 'Guardrail set at ' + money(S.settings.budget) + ' a month.' : 'Guardrail switched off.');
    }
  });
  document.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape') { if (layer.innerHTML) closeSheet(); else if (stack.length > 1) back(); }
    if (ev.key === 'Enter' && ev.target.tagName === 'INPUT') ev.target.blur();
  });

  // live countdowns
  setInterval(function () {
    var again = false, now = Date.now();
    [].forEach.call(document.querySelectorAll('[data-cd]'), function (el) { var left = +el.dataset.cd - now; if (left <= 0) again = true; else el.textContent = cd(left); });
    [].forEach.call(document.querySelectorAll('[data-cdbar]'), function (el) { var p = el.dataset.cdbar.split(','); el.style.width = Math.min(100, (now - p[0]) / (p[1] - p[0]) * 100).toFixed(2) + '%'; });
    if (again && !layer.innerHTML) render('keep');
  }, 1000);
  document.addEventListener('visibilitychange', function () { if (!document.hidden && !layer.innerHTML && (cur().name === 'ledger' || cur().name === 'entry')) { var a = document.activeElement; if (!a || (a.tagName !== 'INPUT' && a.tagName !== 'TEXTAREA')) render('keep'); } });

  render();
})();
