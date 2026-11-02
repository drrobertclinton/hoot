/* My Books: a reading buddy for kids 8-12. Everything stays on this device. No accounts, no ads, no analytics. */
const { $, $$, esc, store, day, addDays, fmtDay, fmtTime, uid, toast, sheet, closeSheet, tabs, lineChart, dataCard, download, registerSW } = Core;
const st = store('mybooks', {
  kid: '', books: [], current: '', sessions: [], timer: null, words: [], checks: [], practice: [], snaps: 0,
  goal: 20, listenOn: false, highlight: true
});
const D = st.data;

/* ---------- tiny IndexedDB for voice answers (kept on this device) ---------- */
const idb = (() => {
  let dbp; const open = () => dbp = dbp || new Promise((res, rej) => { const r = indexedDB.open('mybooks', 1); r.onupgradeneeded = () => r.result.createObjectStore('audio'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  const tx = (mode, fn) => open().then(db => new Promise((res, rej) => { const t = db.transaction('audio', mode); const q = fn(t.objectStore('audio')); t.oncomplete = () => res(q && q.result); t.onerror = () => rej(t.error); }));
  return { put: (k, v) => tx('readwrite', s => s.put(v, k)), get: k => tx('readonly', s => s.get(k)), clear: () => tx('readwrite', s => s.clear()) };
})();

const bookOf = id => D.books.find(b => b.id === id);
const totalMin = () => D.sessions.reduce((s, x) => s + x.min, 0);
const minOn = d => D.sessions.filter(s => s.date === d).reduce((s, x) => s + x.min, 0);
const daysRead = () => new Set(D.sessions.map(s => s.date)).size;
const name = () => D.kid ? esc(D.kid) : 'reader';

/* ---------- Badges (no streaks, nothing to lose) ---------- */
const BADGES = [
  ['📖', 'First page', 'Read for the first time', () => D.sessions.length > 0],
  ['⏱️', 'One hour', '60 minutes in all', () => totalMin() >= 60],
  ['🚀', 'Five hours', '300 minutes in all', () => totalMin() >= 300],
  ['🏁', 'Book finished', 'Finish a whole book', () => D.books.some(b => b.done)],
  ['📚', 'Bookworm', 'Finish 3 books', () => D.books.filter(b => b.done).length >= 3],
  ['🔤', 'Word collector', 'Save 10 words', () => D.words.length >= 10],
  ['🧠', 'Word wizard', 'Save 25 words', () => D.words.length >= 25],
  ['💬', 'Storyteller', 'Do 5 chapter checks', () => D.checks.length >= 5],
  ['📸', 'Page snapper', 'Snap a page', () => D.snaps > 0],
  ['🎤', 'Read-aloud star', 'Practice reading aloud', () => D.practice.length > 0],
  ['🗓️', 'Five days', 'Read on 5 different days', () => daysRead() >= 5],
  ['🌟', 'Goal getter', 'Hit your daily goal', () => [...new Set(D.sessions.map(s => s.date))].some(d => minOn(d) >= D.goal)]
];
function checkBadges(before) { const now = BADGES.filter(b => b[4 - 1]()).map(b => b[1]); const fresh = now.filter(x => !before.includes(x)); if (fresh.length) { const b = BADGES.find(x => x[1] === fresh[0]); setTimeout(() => sheet(`<div class="center"><div style="font-size:4rem">${b[0]}</div><p class="eyebrow">New badge!</p><div class="wordbig">${esc(b[1])}</div><p class="muted">${esc(b[2])}</p><button class="btn block mt" onclick="Core.closeSheet()">Awesome</button></div>`), 350); } }
const earned = () => BADGES.filter(b => b[3]()).map(b => b[1]);

/* ---------- Home / Read ---------- */
let tick;
function renderRead(el) {
  clearInterval(tick);
  if (!D.kid) return hello(el);
  const b = bookOf(D.current); const today = minOn(day()); const pct = Math.min(100, Math.round(today / D.goal * 100));
  el.innerHTML = `
  <div class="card hero" style="margin-top:16px"><p class="eyebrow">Hi, ${name()}!</p>
    <h2 style="margin:4px 0 8px">${today >= D.goal ? 'You hit your goal today! 🎉' : today ? `${D.goal - today} more minutes to your goal` : 'Ready to read?'}</h2>
    <div class="bar"><i style="width:${pct}%"></i></div><p class="small muted mt">${today} of ${D.goal} minutes today</p></div>
  ${b ? `<div class="card"><div class="book"><div class="cover" style="${b.cover ? `background-image:url('${esc(b.cover)}')` : ''}">${b.cover ? '' : '📕'}</div><div class="grow"><p class="eyebrow">Reading now</p><h3>${esc(b.title)}</h3><p class="small muted">${b.author ? esc(b.author) + ' · ' : ''}Chapter ${b.chapter || 1}</p></div></div>
    <div class="timer mt" id="tm">${D.timer ? fmtTime(Date.now() - D.timer.start + (D.timer.acc || 0)) : '0:00'}</div>
    <div class="row" style="justify-content:center">${D.timer ? `<button class="btn sun" id="tstop" style="min-width:160px">Stop</button>` : `<button class="btn" id="tgo" style="min-width:200px;min-height:60px;font-size:1.2rem">▶ Start reading</button>`}</div>
    <div class="grid2 mt"><button class="btn ghost" id="snap">📸 Snap a page</button><button class="btn ghost" id="chap">✅ Finished a chapter</button></div></div>`
    : `<div class="card center"><p style="font-size:3rem">📚</p><h3>What are you reading?</h3><p class="muted">Add any book: a library book, a school book, a comic. Anything counts.</p><button class="btn" onclick="location.hash='books'">Add a book</button></div>`}
  <div class="card"><h3>Tricky word?</h3><p class="small muted">Type it to see what it means and hear how to say it.</p><div class="row"><input class="i" id="qw" placeholder="e.g. enormous" autocapitalize="off"><button class="btn sm" id="qwg">Look up</button></div></div>`;
  if (!b) return;
  $('#snap', el).onclick = () => snapPage(b);
  $('#chap', el).onclick = () => chapterCheck(b);
  $('#qwg', el).onclick = () => { const w = $('#qw', el).value.trim(); if (w) wordCard(w, b); };
  $('#qw', el).onkeydown = e => { if (e.key === 'Enter') $('#qwg', el).click(); };
  if ($('#tgo', el)) $('#tgo', el).onclick = () => { D.timer = { start: Date.now(), book: b.id, acc: 0 }; st.save(); App.refresh(); };
  if (D.timer) {
    tick = setInterval(() => { const t = $('#tm'); if (t) t.textContent = fmtTime(Date.now() - D.timer.start); else clearInterval(tick); }, 500);
    $('#tstop', el).onclick = () => stopTimer(b);
  }
}
function stopTimer(b) {
  const before = earned();
  const ms = Date.now() - D.timer.start; const min = Math.max(1, Math.round(ms / 60000)); D.timer = null;
  if (ms < 20000) { st.save(); toast('Timer cleared'); App.refresh(); return; }
  D.sessions.push({ id: uid(), date: day(), book: b.id, min }); st.save(); App.refresh();
  sheet(`<div class="center"><div style="font-size:3rem">⭐</div><div class="wordbig">${min} minute${min > 1 ? 's' : ''}!</div><p class="muted">Nice reading, ${name()}.</p></div>
    <div class="grid2 mt"><button class="btn ghost" id="c1">I finished a chapter</button><button class="btn ghost" id="c2">I finished the book!</button></div><button class="btn block mt" id="c3">Done</button>`, p => {
    $('#c1', p).onclick = () => chapterCheck(b);
    $('#c2', p).onclick = () => { b.done = day(); D.current = (D.books.find(x => !x.done && x.id !== b.id) || {}).id || ''; st.save(); closeSheet(); App.refresh(); checkBadges(before); toast('You finished a book! 🏁'); };
    $('#c3', p).onclick = () => { closeSheet(); checkBadges(before); };
  });
}
function hello(el) {
  el.innerHTML = `<div class="card hero center" style="margin-top:24px"><div style="font-size:3.5rem">📚🦉</div><h2>Hi! I'm your reading buddy.</h2><p class="muted">I help you keep track of your books, learn tricky words and practice reading out loud.</p>
    <label class="f" style="text-align:left">What should I call you? (A nickname is great.)</label><input class="i" id="kn" maxlength="20" autocomplete="off">
    <button class="btn block mt" id="kgo">Let's read</button></div>
    <p class="small muted center">Grown-ups: everything stays on this device. See the Grown-ups tab.</p>`;
  $('#kgo', el).onclick = () => { D.kid = $('#kn', el).value.trim().slice(0, 20) || 'Reader'; st.save(); App.refresh(); };
}

/* ---------- Books ---------- */
function renderBooks(el) {
  const reading = D.books.filter(b => !b.done), done = D.books.filter(b => b.done);
  const row = b => `<li data-b="${b.id}" style="cursor:pointer"><div class="cover" style="width:44px;height:64px;font-size:1.3rem;${b.cover ? `background-image:url('${esc(b.cover)}')` : ''}">${b.cover ? '' : '📕'}</div><div class="grow"><b>${esc(b.title)}</b><div class="small muted">${b.author ? esc(b.author) + ' · ' : ''}${D.sessions.filter(s => s.book === b.id).reduce((s, x) => s + x.min, 0)} min${b.done ? ' · finished ' + fmtDay(b.done) : ''}</div></div>${b.id === D.current ? '<span class="pill">Now</span>' : ''}</li>`;
  el.innerHTML = `<h2>My books</h2>
  <div class="card"><h3>Add a book</h3><div class="row"><input class="i" id="bq" placeholder="Title, author or the number on the back"><button class="btn sm" id="bs">Find</button></div><div id="br"></div>
    <button class="btn ghost sm mt" id="bm">Type it in myself</button></div>
  ${reading.length ? `<h2>Reading</h2><ul class="list card">${reading.map(row).join('')}</ul>` : ''}
  ${done.length ? `<h2>Finished 🏁</h2><ul class="list card">${done.map(row).join('')}</ul>` : ''}`;
  const search = async () => {
    const q = $('#bq', el).value.trim(); if (!q) return; const out = $('#br', el); out.innerHTML = '<p class="small muted mt">Looking…</p>';
    try {
      const r = await fetch('https://openlibrary.org/search.json?limit=8&fields=key,title,author_name,cover_i,first_publish_year&q=' + encodeURIComponent(q)).then(r => r.json());
      out.innerHTML = r.docs?.length ? `<ul class="list">${r.docs.map((d, i) => `<li><div class="cover" style="width:40px;height:58px;font-size:1.1rem;${d.cover_i ? `background-image:url('https://covers.openlibrary.org/b/id/${d.cover_i}-M.jpg')` : ''}">${d.cover_i ? '' : '📕'}</div><div class="grow"><b>${esc(d.title)}</b><div class="small muted">${esc((d.author_name || []).slice(0, 2).join(', '))}</div></div><button class="btn sm" data-add="${i}">Add</button></li>`).join('')}</ul>` : '<p class="small muted mt">No match. Try fewer words, or type it in yourself.</p>';
      out.onclick = e => { const a = e.target.closest('[data-add]'); if (!a) return; const d = r.docs[+a.dataset.add]; addBook({ title: d.title, author: (d.author_name || [])[0] || '', cover: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-M.jpg` : '' }); };
    } catch (e) { out.innerHTML = '<p class="small muted mt">Couldn\'t search right now. Type it in yourself instead.</p>'; }
  };
  $('#bs', el).onclick = search; $('#bq', el).onkeydown = e => { if (e.key === 'Enter') search(); };
  $('#bm', el).onclick = () => sheet(`<h3>Add a book</h3><label class="f">Title</label><input class="i" id="mt"><label class="f">Author (if you know it)</label><input class="i" id="ma"><button class="btn block mt" id="ms">Add</button>`, p => { $('#mt', p).focus(); $('#ms', p).onclick = () => { const t = $('#mt', p).value.trim(); if (t) { closeSheet(); addBook({ title: t, author: $('#ma', p).value.trim(), cover: '' }); } }; });
  el.querySelectorAll('[data-b]').forEach(li => li.onclick = () => bookSheet(bookOf(li.dataset.b)));
}
function addBook(b) { const nb = { id: uid(), ...b, added: day(), chapter: 1 }; D.books.unshift(nb); D.current = nb.id; st.save(); toast('Added! Happy reading.'); location.hash = 'read'; }
function bookSheet(b) {
  sheet(`<div class="book"><div class="cover" style="${b.cover ? `background-image:url('${esc(b.cover)}')` : ''}">${b.cover ? '' : '📕'}</div><div><h3>${esc(b.title)}</h3><p class="small muted">${esc(b.author || '')}</p></div></div>
    <label class="f">Chapter I'm on</label><input class="i" type="number" min="1" id="bc" value="${b.chapter || 1}" style="max-width:120px">
    <div class="grid2 mt"><button class="btn" id="bn">Read this one now</button>${b.done ? `<button class="btn ghost" id="bu">Not finished yet</button>` : `<button class="btn ghost" id="bd">I finished it! 🏁</button>`}</div>
    <button class="btn ghost sm mt" id="bx" style="color:var(--bad)">Remove book</button>`, p => {
    const save = () => { b.chapter = Math.max(1, +$('#bc', p).value || 1); };
    $('#bn', p).onclick = () => { save(); b.done = ''; D.current = b.id; st.save(); closeSheet(); location.hash = 'read'; };
    if ($('#bd', p)) $('#bd', p).onclick = () => { const before = earned(); save(); b.done = day(); if (D.current === b.id) D.current = ''; st.save(); closeSheet(); App.refresh(); checkBadges(before); };
    if ($('#bu', p)) $('#bu', p).onclick = () => { b.done = ''; st.save(); closeSheet(); App.refresh(); };
    $('#bx', p).onclick = () => { D.books = D.books.filter(x => x !== b); if (D.current === b.id) D.current = ''; st.save(); closeSheet(); App.refresh(); };
    $('#bc', p).onchange = () => { save(); st.save(); };
  });
}

/* ---------- Words ---------- */
const kidDefs = {}; // cache
async function define(word) {
  const w = word.toLowerCase();
  if (kidDefs[w]) return kidDefs[w];
  const tries = [w, w.replace(/'s$/, ''), w.replace(/ies$/, 'y'), w.replace(/es$/, ''), w.replace(/s$/, ''), w.replace(/ed$/, ''), w.replace(/ed$/, 'e'), w.replace(/ing$/, ''), w.replace(/ing$/, 'e'), w.replace(/ly$/, '')].filter((x, i, a) => x.length > 1 && a.indexOf(x) === i);
  for (const t of tries) {
    try {
      const r = await fetch('https://api.dictionaryapi.dev/api/v2/entries/en/' + encodeURIComponent(t)); if (!r.ok) continue;
      const j = await r.json(); const defs = [];
      j.forEach(e => e.meanings.forEach(m => m.definitions.forEach(d => defs.push({ pos: m.partOfSpeech, def: d.definition, ex: d.example }))));
      const pick = defs.filter(d => d.def.split(' ').length <= 22).sort((a, b) => a.def.length - b.def.length).slice(0, 2);
      return kidDefs[w] = { base: t, defs: pick.length ? pick : defs.slice(0, 1) };
    } catch (e) { return null; }
  }
  return { base: w, defs: [] };
}
function say(text, rate = .85) { if (!('speechSynthesis' in window)) return; speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.rate = rate; const v = speechSynthesis.getVoices().find(v => /^en[-_]US/.test(v.lang)); if (v) u.voice = v; speechSynthesis.speak(u); }
const syll = w => w.toLowerCase().replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '').replace(/^y/, '').match(/[aeiouy]{1,2}/g)?.length || 1;
async function wordCard(raw, b) {
  const w = raw.replace(/[^A-Za-z'’-]/g, '').replace(/’/g, "'"); if (!w) return;
  sheet(`<div class="center"><div class="wordbig">${esc(w.toLowerCase())}</div><p class="small muted">${syll(w)} syllable${syll(w) > 1 ? 's' : ''}</p>
    <div class="row" style="justify-content:center"><button class="btn sm" id="hs">🔊 Hear it</button><button class="btn ghost sm" id="hss">🐢 Say it slowly</button></div></div>
    <div id="dd" class="card"><p class="muted">Looking it up…</p></div>
    <button class="btn block" id="sv">⭐ Save to my words</button>`, async p => {
    $('#hs', p).onclick = () => say(w, .85); $('#hss', p).onclick = () => say(w.split('').join(' ') + '. ' + w, .5);
    say(w);
    const d = await define(w);
    $('#dd', p).innerHTML = d && d.defs.length ? d.defs.map(x => `<p><span class="pill">${esc(x.pos)}</span> ${esc(x.def)}</p>${x.ex ? `<p class="small muted"><i>"${esc(x.ex)}"</i></p>` : ''}`).join('') + `<button class="btn ghost sm" id="hd">🔊 Read me the meaning</button>`
      : `<p class="muted">I couldn't find that one. Ask a grown-up, or try the word without its ending (like "jump" for "jumping").</p>`;
    if ($('#hd', p)) $('#hd', p).onclick = () => say(d.defs[0].def, .9);
    $('#sv', p).onclick = () => { const before = earned(); if (!D.words.some(x => x.w === w.toLowerCase())) D.words.unshift({ w: w.toLowerCase(), def: d?.defs[0]?.def || '', book: b?.title || '', date: day() }); st.save(); closeSheet(); toast('Saved to My Words ⭐'); checkBadges(before); };
  });
}
function renderWords(el) {
  el.innerHTML = `<h2>My words</h2><p class="small muted">${D.words.length} word${D.words.length === 1 ? '' : 's'} learned. Tap one to hear it again.</p>
  ${D.words.length ? `<div class="card"><button class="btn sun block" id="quiz">🎯 Word game</button></div><ul class="list card">${D.words.map((x, i) => `<li data-i="${i}" style="cursor:pointer"><div class="grow"><b style="font-size:1.15rem">${esc(x.w)}</b><div class="small muted">${esc(x.def || '')}</div>${x.book ? `<div class="small muted">from ${esc(x.book)}</div>` : ''}</div><span>🔊</span></li>`).join('')}</ul>`
      : `<div class="card empty">📸 Snap a page or look up a tricky word, then tap ⭐ to save it here.</div>`}`;
  el.querySelectorAll('[data-i]').forEach(li => li.onclick = () => say(D.words[+li.dataset.i].w));
  const q = $('#quiz', el); if (q) q.onclick = wordGame;
}
function wordGame() {
  const pool = D.words.filter(w => w.def); if (pool.length < 3) { toast('Save 3 words with meanings to play'); return; }
  let score = 0, round = 0;
  const next = () => {
    if (round === Math.min(5, pool.length)) { sheet(`<div class="center"><div style="font-size:3rem">🏆</div><div class="wordbig">${score} / ${round}</div><p class="muted">Great job, ${name()}!</p><button class="btn block mt" onclick="Core.closeSheet()">Done</button></div>`); return; }
    round++;
    const ans = pool[Math.floor(Math.random() * pool.length)]; const opts = [ans, ...pool.filter(x => x !== ans).sort(() => Math.random() - .5).slice(0, 2)].sort(() => Math.random() - .5);
    sheet(`<p class="eyebrow">Round ${round}</p><h3>Which word means:</h3><p style="font-size:1.15rem">"${esc(ans.def)}"</p><div class="mt">${opts.map(o => `<button class="btn ghost block mb" data-w="${esc(o.w)}">${esc(o.w)}</button>`).join('')}</div>`, p => {
      p.querySelectorAll('[data-w]').forEach(b => b.onclick = () => { const ok = b.dataset.w === ans.w; if (ok) score++; b.style.background = ok ? 'var(--good)' : 'var(--bad)'; b.style.color = '#fff'; say(ok ? 'Yes! ' + ans.w : 'The answer is ' + ans.w); setTimeout(next, 1100); });
    });
  };
  next();
}

/* ---------- Snap a page: on-device text reading (Tesseract, self-hosted) ---------- */
let ocrWorker;
function loadScript(src) { return new Promise((res, rej) => { if (document.querySelector(`script[src="${src}"]`)) return res(); const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); }); }
async function getOCR(onProgress) {
  if (ocrWorker) return ocrWorker;
  await loadScript('vendor/tesseract.min.js');
  ocrWorker = await Tesseract.createWorker('eng', 1, { workerPath: new URL('vendor/worker.min.js', location.href).href, corePath: new URL('vendor/', location.href).href, langPath: new URL('vendor/lang', location.href).href, logger: m => onProgress && onProgress(m) });
  return ocrWorker;
}
async function shrink(file) {
  const img = await createImageBitmap(file); const s = Math.min(1, 1800 / Math.max(img.width, img.height));
  const c = document.createElement('canvas'); c.width = img.width * s; c.height = img.height * s; const g = c.getContext('2d'); g.filter = 'grayscale(1) contrast(1.25)'; g.drawImage(img, 0, 0, c.width, c.height); return c;
}
function snapPage(b) {
  sheet(`<h3>📸 Snap a page</h3><p class="small muted">Hold the phone flat over the page, in good light. The photo is read right here on this device and then thrown away.</p>
    <label class="btn block mt">Take a picture<input type="file" accept="image/*" capture="environment" hidden id="ph"></label>
    <details class="mt small"><summary>Or paste the words instead</summary><textarea class="i mt" id="pt"></textarea><button class="btn sm mt" id="pgo">Use these words</button></details>
    <div id="pst" class="mt"></div>`, p => {
    $('#ph', p).onchange = async e => {
      const f = e.target.files[0]; if (!f) return; const stt = $('#pst', p);
      stt.innerHTML = '<p class="muted">Getting ready to read… (first time takes a moment)</p><div class="bar"><i id="pb" style="width:5%"></i></div>';
      try {
        const w = await getOCR(m => { const bar = $('#pb'); if (bar && m.progress != null) bar.style.width = Math.round(m.progress * 100) + '%'; });
        const c = await shrink(f); const { data } = await w.recognize(c);
        const text = data.text.replace(/-\n(\w)/g, '$1').replace(/\s*\n\s*/g, ' ').replace(/\s{2,}/g, ' ').trim();
        if (text.split(' ').length < 3) { stt.innerHTML = '<p>Hmm, I couldn\'t read that. Try again with more light, holding the phone straight above the page.</p>'; return; }
        D.snaps++; st.save(); openPage(text, b);
      } catch (err) { stt.innerHTML = '<p>Reading pictures didn\'t work on this device. You can paste the words instead.</p>'; }
    };
    $('#pgo', p).onclick = () => { const t = $('#pt', p).value.trim(); if (t) openPage(t, b); };
  });
}
function openPage(text, b) {
  const words = text.split(/\s+/);
  sheet(`<p class="eyebrow">Tap any word</p><div class="pagetext card" id="pg">${words.map((w, i) => `<span class="w" data-i="${i}">${esc(w)}</span>`).join(' ')}</div>
    <div class="grid2"><button class="btn" id="rtm">🔊 Read it to me</button><button class="btn ghost" id="pr">🎤 Practice reading</button></div>
    <button class="btn ghost block mt" onclick="Core.closeSheet()">Close</button>`, p => {
    const pg = $('#pg', p);
    pg.onclick = e => { const s = e.target.closest('.w'); if (s) wordCard(s.textContent, b); };
    $('#rtm', p).onclick = () => readToMe(words, pg);
    $('#pr', p).onclick = () => practice(words, b);
  });
}
function readToMe(words, pg) {
  if (!('speechSynthesis' in window)) return toast('Reading aloud isn\'t supported here');
  speechSynthesis.cancel(); const text = words.join(' '); const starts = []; let pos = 0; words.forEach(w => { starts.push(pos); pos += w.length + 1; });
  const u = new SpeechSynthesisUtterance(text); u.rate = .9; const v = speechSynthesis.getVoices().find(v => /^en[-_]US/.test(v.lang)); if (v) u.voice = v;
  const spans = pg.querySelectorAll('.w');
  u.onboundary = e => { if (!D.highlight) return; let i = starts.findIndex((s, k) => e.charIndex >= s && (k === starts.length - 1 || e.charIndex < starts[k + 1])); spans.forEach(s => s.classList.remove('now')); if (spans[i]) { spans[i].classList.add('now'); spans[i].scrollIntoView({ block: 'nearest' }); } };
  u.onend = () => spans.forEach(s => s.classList.remove('now'));
  speechSynthesis.speak(u);
}

/* ---------- Read-aloud practice ---------- */
const norm = w => w.toLowerCase().replace(/[^a-z0-9']/g, '');
function practice(words, b) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const canListen = SR && D.listenOn;
  sheet(`<p class="eyebrow">Read-aloud practice</p><h3>Read it out loud, nice and steady.</h3>
    ${canListen ? '<p class="small muted">I\'ll listen and color the words you read. Words I didn\'t hear get a wavy line so you can try them again.</p>' : `<p class="small muted">The yellow box moves along at a steady pace. Try to keep up with it. Tap words you got stuck on.${SR ? ' (A grown-up can turn on "listen to me" in the Grown-ups tab.)' : ''}</p>`}
    <div class="pagetext card" id="pp">${words.map((w, i) => `<span class="w" data-i="${i}">${esc(w)}</span>`).join(' ')}</div>
    ${canListen ? '' : `<label class="f">Speed: <span id="spv">90</span> words a minute</label><input type="range" id="sp" min="40" max="160" value="90">`}
    <div class="row mt"><button class="btn" id="pgo2" style="flex:1">${canListen ? '🎤 Start listening' : '▶ Start'}</button><button class="btn ghost" id="pdone">Finish</button></div>
    <div id="pres" class="mt"></div>`, p => {
    const spans = [...p.querySelectorAll('#pp .w')]; let timer, rec, idx = 0; const t0 = Date.now(); const stuck = new Set();
    $('#pp', p).onclick = e => { const s = e.target.closest('.w'); if (!s) return; if (canListen) { wordCard(s.textContent, b); return; } s.classList.toggle('miss'); stuck[s.classList.contains('miss') ? 'add' : 'delete'](+s.dataset.i); };
    if (!canListen) $('#sp', p).oninput = e => $('#spv', p).textContent = e.target.value;
    const stop = () => { clearInterval(timer); try { rec && rec.stop(); } catch (e) { } };
    $('#pgo2', p).onclick = () => {
      if (canListen) {
        rec = new SR(); rec.lang = 'en-US'; rec.continuous = true; rec.interimResults = true;
        rec.onresult = e => { const heard = [...e.results].map(r => r[0].transcript).join(' ').split(/\s+/).map(norm).filter(Boolean); let j = 0; idx = 0;
          for (const h of heard) { for (let k = idx; k < Math.min(spans.length, idx + 4); k++) { if (norm(words[k]) === h) { for (let m = idx; m < k; m++) spans[m].classList.add('miss'); spans[k].classList.remove('miss'); spans[k].classList.add('ok'); idx = k + 1; break; } } j++; }
          spans.forEach(s => s.classList.remove('now')); if (spans[idx]) spans[idx].classList.add('now'); };
        rec.onerror = () => toast('Listening stopped'); rec.start(); $('#pgo2', p).textContent = '🎤 Listening…';
      } else {
        clearInterval(timer); idx = 0; const ms = 60000 / (+$('#sp', p).value);
        timer = setInterval(() => { spans.forEach(s => s.classList.remove('now')); if (idx >= spans.length) { clearInterval(timer); return; } spans[idx].classList.add('now'); spans[idx].scrollIntoView({ block: 'nearest' }); idx++; }, ms);
      }
    };
    $('#pdone', p).onclick = () => {
      stop(); const before = earned();
      const missed = canListen ? spans.filter(s => s.classList.contains('miss')).map(s => s.textContent) : [...stuck].map(i => words[i]);
      const readCount = canListen ? spans.filter(s => s.classList.contains('ok')).length : words.length;
      D.practice.push({ date: day(), words: words.length, read: readCount, sec: Math.round((Date.now() - t0) / 1000), missed: missed.slice(0, 30), book: b?.title || '' }); st.save();
      $('#pres', p).innerHTML = `<div class="card hero"><h3>Great practice! 🎤</h3>${missed.length ? `<p>Words to try again: ${missed.slice(0, 12).map(w => `<button class="chip" data-mw="${esc(w)}">${esc(w)}</button>`).join(' ')}</p>` : '<p>You read every word. Wow!</p>'}</div>`;
      $('#pres', p).onclick = e => { const c = e.target.closest('[data-mw]'); if (c) wordCard(c.dataset.mw, b); };
      checkBadges(before);
    };
    new MutationObserver((_, o) => { if (!$('#sheet').classList.contains('on')) { stop(); o.disconnect(); } }).observe($('#sheet'), { attributes: true });
  });
}

/* ---------- Chapter check (3 questions; a grown-up can read the answers) ---------- */
const QS = ['Who was in this chapter?', 'What was the most important thing that happened?', 'What do you think will happen next? Why?'];
function chapterCheck(b) {
  const ch = b.chapter || 1; const ans = ['', '', '']; const audio = [null, null, null];
  const step = i => {
    if (i === 3) {
      const before = earned(); const id = uid();
      audio.forEach((a, k) => { if (a) idb.put(id + ':' + k, a); });
      D.checks.unshift({ id, date: day(), book: b.title, bookId: b.id, chapter: ch, answers: ans, audio: audio.map(Boolean) });
      b.chapter = ch + 1; st.save(); App.refresh();
      sheet(`<div class="center"><div style="font-size:3.5rem">✅</div><div class="wordbig">Chapter ${ch} done!</div><p class="muted">On to chapter ${ch + 1}.</p><button class="btn block mt" onclick="Core.closeSheet()">Yay</button></div>`); checkBadges(before); return;
    }
    sheet(`<p class="eyebrow">Chapter ${ch} · question ${i + 1} of 3</p><h3 style="font-size:1.3rem">${QS[i]}</h3>
      <textarea class="i" id="qa" placeholder="Type your answer…">${esc(ans[i])}</textarea>
      <div class="row mt"><button class="btn ghost" id="qrec">🎤 Say it instead</button><span id="qrs" class="small muted"></span></div>
      <div class="row mt"><button class="btn" id="qn" style="flex:1">${i < 2 ? 'Next' : 'Finish'}</button><button class="btn ghost" id="qs">Skip</button></div>`, p => {
      $('#qa', p).focus();
      let mr, chunks = [];
      $('#qrec', p).onclick = async () => {
        if (mr && mr.state === 'recording') { mr.stop(); return; }
        try {
          const s = await navigator.mediaDevices.getUserMedia({ audio: true }); mr = new MediaRecorder(s); chunks = [];
          mr.ondataavailable = e => chunks.push(e.data); mr.onstop = () => { s.getTracks().forEach(t => t.stop()); audio[i] = new Blob(chunks, { type: mr.mimeType }); $('#qrs', p).textContent = 'Recorded ✓'; $('#qrec', p).textContent = '🎤 Record again'; };
          mr.start(); $('#qrec', p).innerHTML = '<span class="rec"></span> Stop'; $('#qrs', p).textContent = 'Recording… (stays on this device)';
          setTimeout(() => { if (mr.state === 'recording') mr.stop(); }, 60000);
        } catch (e) { toast('The microphone isn\'t available'); }
      };
      $('#qn', p).onclick = () => { ans[i] = $('#qa', p).value.trim(); if (mr && mr.state === 'recording') mr.stop(); setTimeout(() => step(i + 1), mr && mr.state === 'recording' ? 300 : 0); };
      $('#qs', p).onclick = () => step(i + 1);
    });
  };
  step(0);
}

/* ---------- Badges tab ---------- */
function renderBadges(el) {
  const e = earned();
  el.innerHTML = `<h2>Badges</h2><p class="small muted">${e.length} of ${BADGES.length} earned. No streaks here. Every minute counts, any day.</p>
  <div class="grid3 mb"><div class="stat"><b>${totalMin()}</b><span>Minutes</span></div><div class="stat"><b>${D.books.filter(b => b.done).length}</b><span>Books finished</span></div><div class="stat"><b>${D.words.length}</b><span>Words</span></div></div>
  <div class="badges">${BADGES.map(b => `<div class="badge ${e.includes(b[1]) ? 'on' : ''}"><div class="e">${b[0]}</div><b>${esc(b[1])}</b><span>${esc(b[2])}</span></div>`).join('')}</div>`;
}

/* ---------- Grown-ups (behind a grown-up gate) ---------- */
let gateOK = 0;
function gate(el, then) {
  if (Date.now() - gateOK < 10 * 60 * 1000) return then();
  const a = 6 + Math.floor(Math.random() * 7), b = 6 + Math.floor(Math.random() * 7);
  el.innerHTML = `<div class="card center" style="margin-top:24px"><p class="eyebrow">For grown-ups</p><h3>Please answer to continue</h3><p style="font-size:1.6rem;font-weight:900">${a} × ${b} = ?</p>
    <input class="i center" id="ga" inputmode="numeric" style="max-width:140px;margin:0 auto;display:block"><button class="btn mt" id="gg">Continue</button></div>`;
  $('#gg', el).onclick = () => { if (+$('#ga', el).value === a * b) { gateOK = Date.now(); then(); } else { toast('Not quite. Ask a grown-up!'); location.hash = 'read'; } };
}
function renderGrown(el) {
  gate(el, () => {
    const last7 = [...Array(7)].map((_, i) => addDays(day(), i - 6));
    el.innerHTML = `<h2>Grown-ups</h2>
    <div class="card"><h3>This week</h3>${lineChart([{ points: last7.map(d => [fmtDay(d, { weekday: 'short' }), minOn(d)]) }], { min: 0 })}
      <div class="grid3 mt"><div class="stat"><b>${last7.reduce((s, d) => s + minOn(d), 0)}</b><span>Minutes this week</span></div><div class="stat"><b>${last7.filter(d => minOn(d) >= D.goal).length}</b><span>Goal days</span></div><div class="stat"><b>${D.practice.length}</b><span>Read-aloud tries</span></div></div></div>
    <div class="card"><h3>Daily goal</h3><div class="row"><input type="range" id="gl" min="5" max="60" step="5" value="${D.goal}"><b id="glv" style="min-width:70px">${D.goal} min</b></div><p class="small muted">Gentle goals work best. There are no streaks to lose.</p></div>
    <div class="card"><h3>Chapter answers</h3>${D.checks.length ? `<ul class="list">${D.checks.slice(0, 20).map(c => `<li style="display:block"><b>${esc(c.book)}, chapter ${c.chapter}</b> <span class="small muted">${fmtDay(c.date)}</span>${QS.map((q, k) => `<div class="small mt"><span class="muted">${esc(q)}</span><br>${esc(c.answers[k] || (c.audio[k] ? '' : '(skipped)'))} ${c.audio[k] ? `<button class="btn ghost sm" data-play="${c.id}:${k}">▶ Voice answer</button>` : ''}</div>`).join('')}</li>`).join('')}</ul>` : '<p class="small muted">Answers show here after your child taps "Finished a chapter."</p>'}</div>
    <div class="card"><h3>Read-aloud practice</h3>${D.practice.length ? `<ul class="list">${D.practice.slice(-10).reverse().map(x => `<li><div class="grow"><b>${x.read}/${x.words} words</b> <span class="small muted">${fmtDay(x.date)} · ${Math.round(x.sec / 6) / 10} min${x.book ? ' · ' + esc(x.book) : ''}</span>${x.missed.length ? `<div class="small muted">Tricky: ${esc(x.missed.slice(0, 10).join(', '))}</div>` : ''}</div></li>`).join('')}</ul>` : '<p class="small muted">Nothing yet.</p>'}</div>
    <div class="card"><h3>Settings</h3>
      <label class="row" style="justify-content:space-between"><span><b>Highlight words while reading aloud</b></span><input type="checkbox" id="hl" ${D.highlight ? 'checked' : ''}></label>
      <label class="row mt" style="justify-content:space-between;align-items:flex-start"><span><b>"Listen to me" read-aloud checking</b><br><span class="small muted">Uses the browser's speech recognition. On many phones this sends your child's voice to Apple or Google to turn it into text. Off by default. The App Store version will do this on the device only.</span></span><input type="checkbox" id="lo" ${D.listenOn ? 'checked' : ''}></label>
      <label class="f">Child's nickname</label><input class="i" id="kn2" value="${esc(D.kid)}" maxlength="20"></div>
    <div class="card"><h3>Reading log for school</h3><p class="small muted">A printable log of dates, books and minutes for a teacher.</p><button class="btn ghost sm" id="log">Print reading log</button></div>
    <div class="card"><h3>Privacy</h3><p class="small muted">No account, no ads, no tracking. Books, minutes, answers and voice recordings stay on this device. Page photos are read on the device and not kept. Two lookups use the internet and send only the words typed: book search (Open Library) and word meanings (Free Dictionary API).</p></div>
    <div id="dc"></div>`;
    $('#gl', el).oninput = e => { D.goal = +e.target.value; $('#glv', el).textContent = D.goal + ' min'; st.save(); };
    $('#hl', el).onchange = e => { D.highlight = e.target.checked; st.save(); };
    $('#lo', el).onchange = e => { D.listenOn = e.target.checked; st.save(); };
    $('#kn2', el).onchange = e => { D.kid = e.target.value.trim(); st.save(); };
    $('#log', el).onclick = printLog;
    el.onclick = async e => { const b = e.target.closest('[data-play]'); if (!b) return; const blob = await idb.get(b.dataset.play); if (blob) new Audio(URL.createObjectURL(blob)).play(); else toast('Recording not found'); };
    const dc = dataCard(st, 'My Books'); dc.addEventListener('click', e => { if (e.target.dataset.a === 'del') idb.clear(); }, true); $('#dc', el).appendChild(dc);
  });
}
function printLog() {
  const w = window.open('', '_blank'); if (!w) return toast('Allow pop-ups to print');
  const rows = [...D.sessions].sort((a, b) => a.date.localeCompare(b.date)).map(s => `<tr><td>${s.date}</td><td>${esc(bookOf(s.book)?.title || '')}</td><td>${s.min}</td><td></td></tr>`).join('');
  w.document.write(`<!doctype html><title>Reading log</title><style>body{font:14px system-ui;max-width:720px;margin:24px auto;padding:0 16px}table{width:100%;border-collapse:collapse}td,th{border:1px solid #ccc;padding:6px;text-align:left}</style><h1>Reading log: ${esc(D.kid)}</h1><p>Total: ${totalMin()} minutes · ${D.books.filter(b => b.done).length} books finished</p><table><tr><th>Date</th><th>Book</th><th>Minutes</th><th>Grown-up initials</th></tr>${rows}</table><script>setTimeout(()=>print(),300)<\/script>`); w.document.close();
}

const App = tabs([
  { id: 'read', label: 'Read', icon: '<path d="M2 5c3-1.5 7-1.5 10 1v14c-3-2.5-7-2.5-10-1z"/><path d="M22 5c-3-1.5-7-1.5-10 1v14c3-2.5 7-2.5 10-1z"/>', render: renderRead },
  { id: 'books', label: 'Books', icon: '<path d="M5 3h4v18H5zM10 3h4v18h-4z"/><path d="M15.5 4l3.8-1 3 17.5-3.8 1z"/>', render: renderBooks },
  { id: 'words', label: 'Words', icon: '<path d="M4 20l5-14h2l5 14M6.5 14h7"/><path d="M18 8v8"/>', render: renderWords },
  { id: 'badges', label: 'Badges', icon: '<circle cx="12" cy="9" r="6"/><path d="M8.5 14 7 22l5-3 5 3-1.5-8"/>', render: renderBadges },
  { id: 'grown', label: 'Grown-ups', icon: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>', render: renderGrown }
], $('#main'));
registerSW();
