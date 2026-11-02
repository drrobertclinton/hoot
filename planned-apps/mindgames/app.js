/* Low Tide Mind Games: puzzle games with Jonah Pruitt and the Low Tide Club. On-device only. */
const { $, $$, esc, store, day, toast, sheet, closeSheet, tabs, registerSW } = Core;
const st = store('mindgames', { stars: {}, level: { fix: 1, code: 1, pattern: 1, memory: 1 }, daily: {}, played: 0 });
const D = st.data;

const CAST = { jonah: ['🔧', 'Jonah'], dez: ['🎨', 'Dez'], priya: ['🔬', 'Priya'], tuck: ['❓', 'Tuck'] };
const says = (who, text) => `<div class="say"><span class="who" aria-hidden="true">${CAST[who][0]}</span><p><b>${CAST[who][1]}:</b> ${text}</p></div>`;
const GAMES = [
  { id: 'fix', name: 'Fix It!', who: 'jonah', icon: '🔧', color: '#ffe9a8', blurb: 'Turn the pipes until every light on the dock turns on.' },
  { id: 'code', name: 'Crack the Tide Code', who: 'priya', icon: '🔐', color: '#d6f0e3', blurb: 'Use clues to open the clubhouse lockbox.' },
  { id: 'pattern', name: "Dez's Pattern Pad", who: 'dez', icon: '🎨', color: '#ffd9e2', blurb: 'What comes next? Spot the pattern.' },
  { id: 'memory', name: "Tuck's Beach Finds", who: 'tuck', icon: '🐚', color: '#dceafe', blurb: 'Flip cards and find the matching pairs.' }
];
let seedRand = Math.random;
function seeded(s) { let a = 0; for (const c of s) a = (a * 31 + c.charCodeAt(0)) >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const R = n => Math.floor(seedRand() * n);
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = R(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const totalStars = () => Object.values(D.stars).reduce((s, x) => s + x, 0);

function win(game, stars, msg, isDaily) {
  const key = isDaily ? 'daily-' + day() : game + '-' + D.level[game];
  D.stars[key] = Math.max(D.stars[key] || 0, stars); D.played++;
  if (isDaily) D.daily[day()] = stars; else D.level[game]++;
  st.save();
  setTimeout(() => sheet(`<div class="center"><div style="font-size:3rem">🎉</div><h2 style="margin:4px 0">${esc(msg)}</h2><div class="stars" style="font-size:2rem">${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}</div>
    ${says(GAMES.find(g => g.id === game).who, ['Nice work!', 'You figured it out!', 'That was some serious brain power.', 'Help first, then high fives!'][R(4)])}
    <div class="grid2 mt">${isDaily ? '<button class="btn ghost" onclick="Core.closeSheet();location.hash=\'games\'">More games</button>' : `<button class="btn" id="nx">Next level</button>`}<button class="btn ghost" onclick="Core.closeSheet();location.hash='games'">Back</button></div></div>`, p => {
    const n = $('#nx', p); if (n) n.onclick = () => { closeSheet(); App.refresh(); };
  }), 450);
}

/* ---------- Home ---------- */
function renderGames(el, [g]) {
  seedRand = Math.random;
  if (g) return play(el, g, false);
  el.innerHTML = `<div class="card hero" style="margin-top:16px"><p class="eyebrow">Heron Run Lane · Wilmington, NC</p><h2 style="margin:2px 0 6px">The tide is out. The club is open.</h2>
    <p class="small muted">Puzzles from Jonah, Dez, Priya and Tuck. ★ ${totalStars()} stars so far.</p></div>
    ${GAMES.map(x => `<button class="card gamecard" data-g="${x.id}"><span class="gi" style="background:${x.color}">${x.icon}</span><span class="grow"><h3 style="margin:0">${esc(x.name)}</h3><span class="small muted">${esc(x.blurb)}</span><br><span class="pill">Level ${D.level[x.id]}</span></span></button>`).join('')}
    <p class="disclaimer">No ads, no accounts, no chat. Everything stays on this device. Based on the Jonah Pruitt books by Clint Roberts.</p>`;
  el.onclick = e => { const b = e.target.closest('[data-g]'); if (b) location.hash = 'games/' + b.dataset.g; };
}
function play(el, g, isDaily) {
  el.onclick = null;
  const lvl = isDaily ? 3 + (new Date().getDay() % 3) : D.level[g];
  const G = GAMES.find(x => x.id === g);
  el.innerHTML = `<div class="row" style="margin-top:14px"><a class="btn ghost sm" href="#${isDaily ? 'daily' : 'games'}">‹ Back</a><h2 style="margin:0;flex:1;font-size:1.25rem">${esc(G.name)}</h2><span class="pill">${isDaily ? 'Daily' : 'Level ' + lvl}</span></div><div id="gm"></div>`;
  ({ fix: fixIt, code: tideCode, pattern: patternPad, memory: memoryGame })[g]($('#gm', el), lvl, isDaily);
}

/* ---------- Fix It! (rotate pipes so every light on the dock is lit) ---------- */
const N = 1, E = 2, S = 4, W = 8;
const rot = m => ((m << 1) | (m >> 3)) & 15;
function fixIt(el, lvl, isDaily) {
  const n = Math.min(7, 3 + Math.ceil(lvl / 2)), cells = n * n, sx = Math.floor(n / 2), sy = Math.floor(n / 2);
  // spanning tree from the source
  const m = Array(cells).fill(0), seen = Array(cells).fill(false), stack = [sy * n + sx]; seen[stack[0]] = true;
  while (stack.length) {
    const c = stack[stack.length - 1], x = c % n, y = (c / n) | 0;
    const nb = shuffle([[0, -1, N, S], [1, 0, E, W], [0, 1, S, N], [-1, 0, W, E]].filter(([dx, dy]) => { const X = x + dx, Y = y + dy; return X >= 0 && Y >= 0 && X < n && Y < n && !seen[Y * n + X]; }));
    if (!nb.length) { stack.pop(); continue; }
    const [dx, dy, a, b] = nb[0]; const d = (y + dy) * n + x + dx; m[c] |= a; m[d] |= b; seen[d] = true; stack.push(d);
  }
  const sol = [...m]; const t = m.map(v => { let r = R(4); let w = v; while (r--) w = rot(w); return w; });
  let moves = 0;
  const par = t.reduce((s, v, i) => { let k = 0, w = v; while (w !== sol[i] && k < 4) { w = rot(w); k++; } return s + k; }, 0);
  el.innerHTML = says('jonah', lvl === 1 ? 'The dock lights are out again. Tap a pipe to turn it. Get power from the yellow box to every lamp!' : 'Okay, this one is trickier. My fixes always work... eventually.') +
    `<div class="board" id="bd" style="grid-template-columns:repeat(${n},1fr)"></div><p class="center small muted" id="mv">Moves: 0</p>`;
  const bd = $('#bd', el);
  const svg = (v, i) => { const leaf = [N, E, S, W].filter(b => v & b).length === 1; return `<svg viewBox="0 0 100 100" aria-hidden="true">${v & N ? '<line class="pipe" x1="50" y1="50" x2="50" y2="0"/>' : ''}${v & E ? '<line class="pipe" x1="50" y1="50" x2="100" y2="50"/>' : ''}${v & S ? '<line class="pipe" x1="50" y1="50" x2="50" y2="100"/>' : ''}${v & W ? '<line class="pipe" x1="50" y1="50" x2="0" y2="50"/>' : ''}${i === sy * n + sx ? '<rect class="src" x="28" y="28" width="44" height="44" rx="10"/>' : leaf ? '<circle class="lamp" cx="50" cy="50" r="17"/>' : '<circle cx="50" cy="50" r="8" class="lamp"/>'}</svg>`; };
  const powered = () => { const on = new Set([sy * n + sx]), q = [sy * n + sx]; while (q.length) { const c = q.shift(), x = c % n, y = (c / n) | 0; for (const [dx, dy, a, b] of [[0, -1, N, S], [1, 0, E, W], [0, 1, S, N], [-1, 0, W, E]]) { const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= n || Y >= n) continue; const d = Y * n + X; if (!on.has(d) && (t[c] & a) && (t[d] & b)) { on.add(d); q.push(d); } } } return on; };
  const draw = () => { const on = powered(); bd.innerHTML = t.map((v, i) => `<button class="cell ${on.has(i) ? 'on' : ''}" data-i="${i}" aria-label="Pipe ${i + 1}${on.has(i) ? ', powered' : ''}">${svg(v, i)}</button>`).join(''); return on.size === cells; };
  draw();
  bd.onclick = e => { const b = e.target.closest('.cell'); if (!b) return; const i = +b.dataset.i; t[i] = rot(t[i]); moves++; $('#mv', el).textContent = 'Moves: ' + moves;
    if (draw()) { bd.onclick = null; const s = moves <= par + 2 ? 3 : moves <= par * 2 ? 2 : 1; win('fix', s, 'Every light is on!', isDaily); } };
}

/* ---------- Crack the Tide Code (logic code-breaking) ---------- */
const SYMS = ['🐚', '🦀', '⭐', '🐟', '⚓', '🌊'];
function tideCode(el, lvl, isDaily) {
  const len = lvl < 3 ? 3 : 4, k = Math.min(6, 3 + lvl), repeats = lvl >= 5, maxG = 10;
  const pool = SYMS.slice(0, k); const code = []; while (code.length < len) { const s = pool[R(k)]; if (repeats || !code.includes(s)) code.push(s); }
  const guesses = []; let cur = [];
  const score = g => { let b = 0, w = 0; const c1 = [], g1 = []; g.forEach((s, i) => { if (s === code[i]) b++; else { c1.push(code[i]); g1.push(s); } }); g1.forEach(s => { const j = c1.indexOf(s); if (j >= 0) { w++; c1.splice(j, 1); } }); return [b, w]; };
  const draw = () => {
    el.innerHTML = says('priya', lvl === 1 ? `The lockbox code is ${len} beach symbols${repeats ? '' : ', all different'}. After each guess I'll mark it: <b style="color:var(--accent)">●</b> = right symbol, right spot. <b style="color:var(--accent)">○</b> = right symbol, wrong spot.` : `${len} symbols from ${k}${repeats ? ', and symbols can repeat' : ''}. Think like a scientist!`) +
      `<div class="card">${guesses.map(([g, [b, w]]) => `<div class="guessrow">${g.map(s => `<span class="sym">${s}</span>`).join('')}<span class="peg" aria-label="${b} exact, ${w} close">${'<i class="b"></i>'.repeat(b)}${'<i class="w"></i>'.repeat(w)}${'<i></i>'.repeat(len - b - w)}</span></div>`).join('')}
      <div class="guessrow">${[...Array(len)].map((_, i) => `<span class="sym" style="border-color:var(--accent)">${cur[i] || ''}</span>`).join('')}</div>
      <p class="small muted">${maxG - guesses.length} guesses left</p></div>
      <div class="pick" id="pk">${pool.map(s => `<button data-s="${s}" aria-label="${s}">${s}</button>`).join('')}</div>
      <div class="grid2 mt"><button class="btn ghost" id="un">⌫ Undo</button><button class="btn" id="go" ${cur.length < len ? 'disabled' : ''}>Try it</button></div>`;
    $('#pk', el).onclick = e => { const b = e.target.closest('[data-s]'); if (b && cur.length < len) { cur.push(b.dataset.s); draw(); } };
    $('#un', el).onclick = () => { cur.pop(); draw(); };
    $('#go', el).onclick = () => {
      const r = score(cur); guesses.push([cur, r]); cur = [];
      if (r[0] === len) { draw(); win('code', guesses.length <= len + 1 ? 3 : guesses.length <= len + 3 ? 2 : 1, 'The lockbox is open!', isDaily); return; }
      if (guesses.length >= maxG) { draw(); sheet(`<div class="center"><h2>So close!</h2><p>The code was</p><div class="seq">${code.map(s => `<span>${s}</span>`).join('')}</div>${says('priya', 'Every wrong guess is data. Want to try a new code?')}<button class="btn block mt" onclick="Core.closeSheet();App.refresh()">New code</button></div>`); return; }
      draw();
    };
  };
  draw();
}

/* ---------- Dez's Pattern Pad ---------- */
const SHAPES = ['🔴', '🟦', '🔺', '⭐', '🟢', '🟨'];
function makePattern(lvl) {
  const t = R(lvl < 3 ? 3 : lvl < 5 ? 5 : 7);
  if (t === 0) { const s = shuffle([...SHAPES]).slice(0, 2 + R(2)); const L = 7; const a = [...Array(L)].map((_, i) => s[i % s.length]); return { show: a.slice(0, 6), ans: a[6], opts: s, tip: 'The shapes repeat in a loop.' }; }
  if (t === 1) { const a0 = 1 + R(9), d = 1 + R(lvl < 3 ? 3 : 9); const a = [...Array(6)].map((_, i) => a0 + d * i); return { show: a.slice(0, 5), ans: a[5], tip: `Each number goes up by ${d}.` }; }
  if (t === 2) { const s = shuffle([...SHAPES]).slice(0, 2); const a = [s[0], s[0], s[1], s[0], s[0], s[1], s[0]]; return { show: a.slice(0, 6), ans: a[6], opts: s.concat(shuffle(SHAPES.filter(x => !s.includes(x))).slice(0, 2)), tip: 'Two of one, then one of the other.' }; }
  if (t === 3) { const a0 = 30 + R(40), d = 2 + R(5); const a = [...Array(6)].map((_, i) => a0 - d * i); return { show: a.slice(0, 5), ans: a[5], tip: `Each number goes down by ${d}.` }; }
  if (t === 4) { const a0 = 1 + R(3); const a = [...Array(6)].map((_, i) => a0 * 2 ** i); return { show: a.slice(0, 5), ans: a[5], tip: 'Each number doubles.' }; }
  if (t === 5) { const a = [1, 1]; while (a.length < 7) a.push(a[a.length - 1] + a[a.length - 2]); return { show: a.slice(0, 6), ans: a[6], tip: 'Add the two numbers before it.' }; }
  const a0 = 1 + R(4); const a = [...Array(6)].map((_, i) => a0 + i * (i + 1) / 2); return { show: a.slice(0, 5), ans: a[5], tip: 'The jump grows by one each time: +1, +2, +3...' };
}
function patternPad(el, lvl, isDaily) {
  let q = 0, right = 0; const total = 6;
  const next = () => {
    if (q === total) { const s = right >= total ? 3 : right >= total - 2 ? 2 : 1; if (right >= 3) win('pattern', s, `${right} of ${total} right!`, isDaily); else el.innerHTML = says('dez', `You got ${right} of ${total}. Patterns get easier the more you look. Want to try again?`) + '<button class="btn block" onclick="App.refresh()">Try again</button>'; return; }
    q++;
    const p = makePattern(lvl);
    let opts = p.opts ? [...new Set(p.opts)].slice(0, 4) : [p.ans, p.ans + 1 + R(3), Math.max(0, p.ans - 1 - R(3)), p.ans + 5 + R(5)];
    if (!opts.includes(p.ans)) opts[0] = p.ans; opts = shuffle([...new Set(opts)]);
    el.innerHTML = says('dez', q === 1 ? 'I made a pattern in my sketchbook. What goes in the empty box?' : ['What comes next?', 'Look closely...', 'This one is sneaky.', 'Almost done!'][R(4)]) +
      `<p class="center small muted">Question ${q} of ${total} · ${right} right</p><div class="seq">${p.show.map(s => `<span>${s}</span>`).join('')}<span class="q">?</span></div>
      <div class="opts">${opts.map(o => `<button data-o="${o}">${o}</button>`).join('')}</div><button class="btn ghost sm mt" id="hint">💡 Hint</button><p id="tip" class="small muted"></p>`;
    $('#hint', el).onclick = () => $('#tip', el).textContent = p.tip;
    el.querySelector('.opts').onclick = e => { const b = e.target.closest('[data-o]'); if (!b) return; const ok = b.dataset.o == p.ans; if (ok) right++;
      b.style.background = ok ? 'var(--good)' : 'var(--bad)'; b.style.color = '#fff'; if (!ok) el.querySelector(`[data-o="${p.ans}"]`).style.outline = '3px solid var(--good)';
      el.querySelector('.opts').onclick = null; $('#tip', el).textContent = (ok ? 'Yes! ' : 'Not quite. ') + p.tip; setTimeout(next, ok ? 800 : 1800); };
  };
  next();
}

/* ---------- Tuck's Beach Finds (memory) ---------- */
const FINDS = ['🐚', '🦀', '⭐', '🐟', '⚓', '🪼', '🐢', '🦐', '🪸', '🧭', '🔦', '🛶'];
function memoryGame(el, lvl, isDaily) {
  const pairs = Math.min(12, 4 + lvl), cols = pairs <= 6 ? 4 : pairs <= 8 ? 4 : 6;
  const deck = shuffle([...shuffle([...FINDS]).slice(0, pairs)].flatMap(x => [x, x]));
  let open = [], got = 0, moves = 0, lock = false;
  el.innerHTML = says('tuck', lvl === 1 ? 'I found all this stuff at low tide! Why are there two of everything? Can you find the matching pairs?' : 'Why does the tide go out? Anyway, I found MORE stuff. Find the pairs!') +
    `<div class="mem" id="mm" style="grid-template-columns:repeat(${cols},1fr)">${deck.map((x, i) => `<button data-i="${i}" aria-label="Card ${i + 1}">${x}</button>`).join('')}</div><p class="center small muted" id="mv">Moves: 0</p>`;
  $('#mm', el).onclick = e => {
    const b = e.target.closest('button'); if (!b || lock || b.classList.contains('up') || b.classList.contains('got')) return;
    b.classList.add('up'); b.setAttribute('aria-label', deck[+b.dataset.i]); open.push(b);
    if (open.length === 2) {
      moves++; $('#mv', el).textContent = 'Moves: ' + moves; const [a, c] = open;
      if (deck[+a.dataset.i] === deck[+c.dataset.i]) { a.classList.add('got'); c.classList.add('got'); open = []; got++; if (got === pairs) win('memory', moves <= pairs + 2 ? 3 : moves <= pairs * 2 ? 2 : 1, `All ${pairs} pairs found!`, isDaily); }
      else { lock = true; setTimeout(() => { a.classList.remove('up'); c.classList.remove('up'); open = []; lock = false; }, 800); }
    }
  };
}

/* ---------- Daily puzzle ---------- */
function renderDaily(el, [g]) {
  seedRand = seeded(day());
  const pick = GAMES[R(4)];
  if (g) { seedRand = seeded(day() + g); return play(el, g, true); }
  const done = D.daily[day()];
  el.innerHTML = `<div class="card hero center" style="margin-top:16px"><p class="eyebrow">Today's puzzle</p><div style="font-size:3rem">${pick.icon}</div><h2 style="margin:0">${esc(pick.name)}</h2>
    <p class="muted small">Same puzzle for every club member today. A new one appears tomorrow.</p>
    ${done ? `<p class="stars" style="font-size:1.6rem">${'★'.repeat(done)}${'☆'.repeat(3 - done)}</p><p class="small">Done for today! You can play again for a better score.</p>` : ''}
    <a class="btn block mt" href="#daily/${pick.id}">${done ? 'Play again' : 'Play'}</a></div>
    ${says('tuck', 'Why is it called a daily puzzle? Because it comes every day! ...I think.')}`;
}

/* ---------- Club (progress + Club Code) ---------- */
function renderClub(el) {
  const s = totalStars();
  const ranks = [[0, 'New member'], [10, 'Mud explorer'], [30, 'Tide watcher'], [60, 'Junior fixer'], [100, 'Chief puzzler'], [160, 'Low Tide legend']];
  const rank = ranks.filter(r => s >= r[0]).pop(), nextR = ranks.find(r => r[0] > s);
  el.innerHTML = `<h2>My club card</h2><div class="card hero center"><div style="font-size:3rem">🏅</div><h2 style="margin:0">${esc(rank[1])}</h2><p class="stars" style="font-size:1.4rem">★ ${s}</p>
    ${nextR ? `<div class="bar"><i style="width:${Math.round((s - rank[0]) / (nextR[0] - rank[0]) * 100)}%"></i></div><p class="small muted mt">${nextR[0] - s} stars to ${esc(nextR[1])}</p>` : '<p>You reached the top rank!</p>'}</div>
    <div class="card"><h3>Levels</h3><ul class="list">${GAMES.map(g => `<li><span style="font-size:1.4rem">${g.icon}</span><span class="grow">${esc(g.name)}</span><span class="pill">Level ${D.level[g.id]}</span></li>`).join('')}</ul></div>
    <div class="card"><h3>The Club Code</h3><ol style="padding-left:20px;font-weight:700"><li>Help first.</li><li>No meanness. Not even to Grayson.</li><li>Check the tide.</li><li>Snacks are shared.</li><li>Tell the truth.</li></ol><p class="small muted">From the Jonah Pruitt books.</p></div>
    <div class="card"><h3>For grown-ups</h3><p class="small muted">No ads, no purchases, no chat, no accounts and no data collection. Progress is saved only on this device. Puzzles build logic, pattern spotting, working memory and persistence.</p>
    <button class="btn ghost sm" id="rs">Reset progress</button></div>`;
  $('#rs', el).onclick = () => { const a = 3 + Math.floor(Math.random() * 7), b = 4 + Math.floor(Math.random() * 6); sheet(`<h3>Grown-ups only</h3><p>What is ${a} × ${b}?</p><input class="i" id="ga" inputmode="numeric"><button class="btn danger mt" id="gg">Reset all progress</button>`, p => { $('#gg', p).onclick = () => { if (+$('#ga', p).value === a * b) { st.reset(); closeSheet(); location.hash = 'games'; location.reload(); } else toast('Not quite'); }; }); };
}

const App = window.App = tabs([
  { id: 'games', label: 'Games', icon: '<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>', render: renderGames },
  { id: 'daily', label: 'Daily', icon: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/><path d="m9 15 2 2 4-4"/>', render: renderDaily },
  { id: 'club', label: 'My club', icon: '<circle cx="12" cy="8" r="5"/><path d="M8.5 12.5 7 22l5-3 5 3-1.5-9.5"/>', render: renderClub }
], $('#main'));
registerSW();
