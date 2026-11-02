/* Hoot Coding: Owl Paths (blocks and loops) + JavaScript Lab (real code that draws). On-device only. */
const { $, $$, esc, store, toast, sheet, closeSheet, tabs, registerSW } = Core;
const st = store('hootcoding', { paths: {}, lab: {}, code: {} });
const D = st.data;

/* ================= Owl Paths ================= */
const LEVELS = [
  { name: 'First flight', tip: 'Tap ⬆ Forward three times, then press Run.', map: ['S..N'], sol: 'FFF' },
  { name: 'Turn the corner', tip: 'Owls turn in place. ↻ Right turns the owl to its right.', map: ['S.#', '#.#', '#.N'], sol: 'FRFFLF' },
  { name: 'Loop the loop', tip: 'Seven Forwards is a lot of blocks. Use 🔁 Repeat and put one Forward inside it.', map: ['S......N'], sol: '7(F)' },
  { name: 'Stairs', tip: 'Find the part that repeats: forward, turn, forward, turn.', map: ['S.###', '#..##', '##..#', '###.N'], sol: '3(FRFL)F' },
  { name: 'Around the pond', tip: 'Grab the acorn 🌰 first. A repeat can go inside another repeat!', map: ['S...a', '.###.', '.###.', '.###.', 'N....'], sol: '2(4(F)R)4(F)' },
  { name: 'Tall stairs', tip: 'Same idea as Stairs, just more steps. Change the repeat number.', map: ['S.####', '#..###', '##..##', '###..#', '####.N'], sol: '4(FRFL)F' },
  { name: 'Snake path', tip: 'The owl stops as soon as it reaches the nest, even in the middle of a loop.', map: ['S......', '######.', '.......', '.######', '.......', '######.', 'N......'], sol: '2(6(F)RFFR6(F)LFFL)' },
  { name: 'Square dance', tip: 'Three acorns at three corners. Loop the sides, then fly home.', map: ['S...a', '.....', '.....', '.....', 'a...a'], startNest: [0, 1], sol: '3(4(F)R)3(F)' },
  { name: 'Long way home', tip: 'Big numbers are fine inside a repeat.', map: ['S.........', '#########.', '#########.', '#########.', 'N.........'], sol: '9(F)R4(F)R9(F)' }
];
// The nest for Square dance sits at (0,1)
LEVELS[7].map = ['S...a', 'N....', '.....', '.....', 'a...a'];

function parseSol(s) { let i = 0; const read = () => { const out = []; while (i < s.length && s[i] !== ')') { const c = s[i]; if (/\d/.test(c)) { let n = ''; while (/\d/.test(s[i])) n += s[i++]; i++; const body = read(); i++; out.push({ t: 'rep', n: +n, body }); } else { out.push({ t: c }); i++; } } return out; }; return read(); }
const countBlocks = p => p.reduce((s, b) => s + 1 + (b.t === 'rep' ? countBlocks(b.body) : 0), 0);
const flat = p => p.flatMap(b => b.t === 'rep' ? Array(b.n).fill(0).flatMap(() => flat(b.body)) : [b]);
LEVELS.forEach(l => l.par = countBlocks(parseSol(l.sol)));

function world(l) { const g = l.map.map(r => r.split('')); let s, n; const acorns = new Set(); g.forEach((r, y) => r.forEach((c, x) => { if (c === 'S') s = [x, y]; if (c === 'N') n = [x, y]; if (c === 'a') acorns.add(x + ',' + y); })); return { g, s, n, acorns }; }
const DX = [1, 0, -1, 0], DY = [0, 1, 0, -1];
function simulate(l, prog) {
  const w = world(l); let [x, y] = w.s, d = 0; const got = new Set(); const trace = [{ x, y, d }];
  const steps = flat(prog);
  for (let k = 0; k < steps.length && k < 500; k++) {
    const t = steps[k].t;
    if (t === 'L') d = (d + 3) % 4; else if (t === 'R') d = (d + 1) % 4;
    else { const X = x + DX[d], Y = y + DY[d]; if (!w.g[Y] || !w.g[Y][X] || w.g[Y][X] === '#') { trace.push({ x, y, d, bonk: true }); return { ok: false, why: 'bonk', trace }; } x = X; y = Y; if (w.acorns.has(x + ',' + y)) got.add(x + ',' + y); }
    trace.push({ x, y, d });
    if (x === w.n[0] && y === w.n[1] && got.size === w.acorns.size) return { ok: true, trace };
  }
  const atNest = x === w.n[0] && y === w.n[1];
  return { ok: false, why: atNest ? 'acorns' : 'short', trace };
}

let prog = [], target = null, running = false, lastLevel = -1;
function renderPaths(el, [lvArg]) {
  const unlocked = Math.min(LEVELS.length, Object.keys(D.paths).length + 1);
  if (!lvArg) {
    el.innerHTML = `<div class="card hero" style="margin-top:16px"><p class="eyebrow">Owl Paths</p><h2 style="margin:2px 0">Teach the owl to fly home.</h2><p class="small muted">Put command blocks in order, use loops to say more with fewer blocks, and get the owl to its nest. Fewer blocks = more stars.</p></div>
      <div class="card"><div class="lv">${LEVELS.map((l, i) => `<button class="${D.paths[i] ? 'done' : ''}" data-l="${i}" ${i >= unlocked ? 'disabled' : ''} aria-label="Level ${i + 1}">${i + 1}<br><span class="stars" style="color:var(--bolt);font-size:.7rem">${D.paths[i] ? '★'.repeat(D.paths[i]) : ''}</span></button>`).join('')}</div></div>
      <div class="card"><h3>What you'll learn</h3><p class="small muted"><b>Sequences</b> (order matters), <b>loops</b> (repeat), <b>nested loops</b> (a loop inside a loop) and <b>debugging</b> (finding what went wrong). These are the same ideas used in real programming languages, which you can try in the Code Lab.</p></div>`;
    el.onclick = e => { const b = e.target.closest('[data-l]'); if (b) { prog = []; target = null; location.hash = 'paths/' + b.dataset.l; } };
    return;
  }
  el.onclick = null;
  const li = Math.min(+lvArg, unlocked - 1), l = LEVELS[li], w = world(l);
  if (li !== lastLevel) { prog = []; target = null; lastLevel = li; }
  el.innerHTML = `<div class="row" style="margin-top:14px"><a class="btn ghost sm" href="#paths">‹ Levels</a><h2 style="margin:0;flex:1;font-size:1.2rem">${li + 1}. ${esc(l.name)}</h2><span class="pill">Best: ${l.par} blocks</span></div>
    <div class="grid-board" id="gb" style="grid-template-columns:repeat(${w.g[0].length},1fr)">${w.g.map((r, y) => r.map((c, x) => `<div class="${c === '#' ? 'w' : c === 'N' ? 'n' : c === 'a' ? 'a' : ''}" data-xy="${x},${y}"></div>`).join('')).join('')}</div>
    <p class="small muted">💡 ${esc(l.tip)}</p>
    <div class="cmds" id="cm"><button data-c="F">⬆ Forward</button><button data-c="L">↺ Left</button><button data-c="R">↻ Right</button><button data-c="rep">🔁 Repeat</button></div>
    <p class="small muted mt" id="tg"></p>
    <div class="prog mt" id="pg"></div>
    <div class="grid2 mt"><button class="btn ghost" id="clr">Clear</button><button class="btn bolt" id="run">▶ Run</button></div>`;
  const gb = $('#gb', el);
  const owlAt = (s) => { $$('.owl', gb).forEach(o => o.remove()); const cell = gb.querySelector(`[data-xy="${s.x},${s.y}"]`); const o = document.createElement('span'); o.className = 'owl'; o.innerHTML = `${s.bonk ? '😵' : '🦉'}<span aria-hidden="true" style="position:absolute;inset:0;display:grid;place-items:center;transform:rotate(${[0, 90, 180, 270][s.d]}deg)"><span style="margin-left:78%;font-size:.75rem;color:#16213a">▶</span></span>`; cell.appendChild(o); };
  owlAt({ x: w.s[0], y: w.s[1], d: 0 });
  const blockHTML = (b, path) => b.t === 'rep'
    ? `<div class="blk rep ${target === path ? 'target' : ''}" data-p="${path}"><div class="row" style="gap:6px">🔁 Repeat <span class="cnt"><button data-dec="${path}" aria-label="Fewer">−</button><b>${b.n}</b><button data-inc="${path}" aria-label="More">+</button></span> times<button class="x" data-x="${path}" aria-label="Remove">✕</button></div><div class="in">${b.body.map((c, i) => blockHTML(c, path + '.' + i)).join('') || '<span class="small" style="opacity:.8">Tap here, then add blocks inside</span>'}</div></div>`
    : `<div class="blk" data-p="${path}">${{ F: '⬆ Forward', L: '↺ Left', R: '↻ Right' }[b.t]}<button class="x" data-x="${path}" aria-label="Remove">✕</button></div>`;
  const get = path => path.split('.').reduce((o, i, k) => k === 0 ? o[+i] : o.body[+i], prog);
  const listOf = path => path === null ? prog : get(path).body;
  const draw = () => { $('#pg', el).innerHTML = prog.map((b, i) => blockHTML(b, String(i))).join('') || '<span class="small muted">Your program goes here. Tap the blocks above.</span>'; $('#tg', el).textContent = `${countBlocks(prog)} block${countBlocks(prog) === 1 ? '' : 's'}` + (target !== null ? ' · adding inside the purple Repeat (tap empty space to add outside it)' : ''); };
  draw();
  $('#cm', el).onclick = e => { const b = e.target.closest('[data-c]'); if (!b || running) return; const c = b.dataset.c; const list = listOf(target); if (countBlocks(prog) >= 40) return toast('That\'s a lot of blocks! Try a loop.'); list.push(c === 'rep' ? { t: 'rep', n: 2, body: [] } : { t: c }); if (c === 'rep') target = target === null ? String(list.length - 1) : target + '.' + (list.length - 1); draw(); };
  $('#pg', el).onclick = e => {
    if (running) return;
    const x = e.target.closest('[data-x]'), inc = e.target.closest('[data-inc]'), dec = e.target.closest('[data-dec]');
    if (x) { const p = x.dataset.x.split('.'); const idx = +p.pop(); const parent = p.length ? get(p.join('.')).body : prog; parent.splice(idx, 1); if (target && (target === x.dataset.x || target.startsWith(x.dataset.x + '.'))) target = p.length ? p.join('.') : null; draw(); return; }
    if (inc) { const b = get(inc.dataset.inc); b.n = Math.min(20, b.n + 1); draw(); return; }
    if (dec) { const b = get(dec.dataset.dec); b.n = Math.max(2, b.n - 1); draw(); return; }
    const r = e.target.closest('.blk.rep'); target = r ? r.dataset.p : null; draw();
  };
  $('#clr', el).onclick = () => { if (running) return; prog = []; target = null; draw(); owlAt({ x: w.s[0], y: w.s[1], d: 0 }); $$('[data-xy]', gb).forEach(c => c.style.opacity = ''); };
  $('#run', el).onclick = () => {
    if (running || !prog.length) return; running = true;
    const r = simulate(l, prog); let k = 0; $$('[data-xy]', gb).forEach(c => c.style.opacity = '');
    const iv = setInterval(() => {
      const s = r.trace[k]; owlAt(s); const cell = gb.querySelector(`[data-xy="${s.x},${s.y}"]`); if (cell.classList.contains('a')) cell.style.opacity = '.35';
      if (++k >= r.trace.length) {
        clearInterval(iv); running = false;
        if (r.ok) { const n = countBlocks(prog), stars = n <= l.par ? 3 : n <= l.par + 3 ? 2 : 1; D.paths[li] = Math.max(D.paths[li] || 0, stars); st.save();
          sheet(`<div class="center"><div style="font-size:3rem">🦉🪺</div><h2>Home safe!</h2><p class="stars" style="color:var(--bolt);font-size:2rem">${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}</p><p class="muted">You used ${n} block${n === 1 ? '' : 's'}.${stars < 3 ? ` It can be done in ${l.par}. Can you use a loop to make it shorter?` : ' That\'s the shortest way!'}</p>
            <div class="grid2 mt"><button class="btn ghost" onclick="Core.closeSheet()">Try again</button>${li + 1 < LEVELS.length ? `<button class="btn" id="nl">Next level</button>` : `<button class="btn" onclick="Core.closeSheet();location.hash='lab'">Try the Code Lab</button>`}</div></div>`, p => { const b = $('#nl', p); if (b) b.onclick = () => { prog = []; target = null; location.hash = 'paths/' + (li + 1); }; });
        } else toast({ bonk: 'Bonk! The owl hit a tree. Check your turns.', acorns: 'Home, but some acorns are left behind!', short: 'The owl stopped before the nest. Add more steps.' }[r.why]);
      }
    }, 320);
  };
}

/* ================= Code Lab (JavaScript) ================= */
const LESSONS = [
  { t: 'Say hello', learn: 'Computers follow instructions exactly. <code>say("...")</code> shows a message. Text goes inside quotes.', code: 'say("Hello! My name is Hoot.")', task: 'Change the message so it says hello with YOUR name.', check: r => r.out.length && !/Hoot\./.test(r.out[0]) ? '' : 'Change the name inside the quotes, then Run.' },
  { t: 'Variables', learn: 'A <b>variable</b> is a labeled box that holds a value. <code>let</code> makes a new box. You can use the box later by its name.', code: 'let name = "Knox"\nlet age = 10\nsay("Hi, " + name)\nsay("Next year you will be " + (age + 1))', task: 'Make a variable called <code>food</code> with your favorite food, and say it.', check: r => /let\s+food\s*=/.test(r.code) && r.out.length >= 1 ? '' : 'Add a line like let food = "pizza" and say it.' },
  { t: 'Math machine', learn: 'Computers are great at math. <code>*</code> means times, <code>/</code> means divide.', code: 'say(7 * 8)\nsay(100 / 4)', task: 'Make the computer figure out how many minutes are in one day (24 hours × 60 minutes).', check: r => r.out.some(o => String(o).trim() === '1440') ? '' : 'Say the answer to 24 * 60.' },
  { t: 'Draw a line', learn: 'Meet the turtle 🐢. <code>forward(100)</code> moves it 100 steps and draws a line. <code>right(90)</code> turns it a quarter turn.', code: 'forward(100)\nright(90)\nforward(50)', task: 'Draw the letter L: go forward, turn, go forward.', check: r => r.cmds.filter(c => c[0] === 'f').length >= 2 && r.cmds.some(c => c[0] === 'r' || c[0] === 'l') ? '' : 'Use forward and right (or left) to make a corner.' },
  { t: 'Square', learn: 'A square has 4 equal sides and 4 turns of 90 degrees.', code: 'forward(100)\nright(90)\n', task: 'Finish the square.', check: r => r.cmds.filter(c => c[0] === 'f').length >= 4 && r.cmds.filter(c => (c[0] === 'r' || c[0] === 'l') && Math.abs(c[1]) === 90).length >= 3 ? '' : 'Four forwards and the turns between them.' },
  { t: 'Loops', learn: 'A <b>for loop</b> repeats code. <code>for (let i = 0; i < 4; i++) { ... }</code> runs the inside 4 times, just like the Repeat block.', code: 'for (let i = 0; i < 4; i++) {\n  forward(100)\n  right(90)\n}', task: 'Change it to draw a hexagon: 6 sides, turning 60 each time.', check: r => /for\s*\(/.test(r.code) && r.cmds.filter(c => c[0] === 'f').length === 6 && r.cmds.some(c => Math.abs(c[1]) === 60) ? '' : 'Loop 6 times and turn 60.' },
  { t: 'Colors', learn: '<code>color("red")</code> changes the pen color. <code>width(5)</code> makes the line thicker.', code: 'let colors = ["red", "orange", "gold", "green", "blue", "purple"]\nfor (let i = 0; i < 6; i++) {\n  color(colors[i])\n  forward(80)\n  right(60)\n}', task: 'Make a thick rainbow star: 5 sides, turn 144, width 6.', check: r => r.cmds.filter(c => c[0] === 'f').length >= 5 && r.cmds.some(c => Math.abs(c[1]) === 144) && r.cmds.some(c => c[0] === 'w' && c[1] >= 6) ? '' : 'Use width(6), loop 5 times, turn 144.' },
  { t: 'Functions', learn: 'A <b>function</b> is a recipe with a name. Write it once, use it many times. Values in the parentheses are <b>inputs</b>.', code: 'function square(size) {\n  for (let i = 0; i < 4; i++) {\n    forward(size)\n    right(90)\n  }\n}\nsquare(40)\nsquare(80)', task: 'Add a third, bigger square, then make a function called triangle.', check: r => /function\s+triangle/.test(r.code) && r.cmds.filter(c => c[0] === 'f').length >= 12 ? '' : 'Write function triangle(size) { ... } and call it.' },
  { t: 'Decisions', learn: '<code>if</code> lets the computer choose. <code>%</code> gives the remainder, so <code>n % 3 === 0</code> means n divides by 3.', code: 'for (let n = 1; n <= 15; n++) {\n  if (n % 3 === 0) {\n    say(n + " Hoot!")\n  } else {\n    say(n)\n  }\n}', task: 'Also say "Who!" for numbers that divide by 5. (15 should say Hoot! and Who!)', check: r => r.out.some(o => /Who/.test(o)) && /%\s*5/.test(r.code) ? '' : 'Add an if for n % 5 === 0.' },
  { t: 'Your art', learn: 'Mix everything: loops inside loops, colors and functions. Try changing numbers and see what happens!', code: 'for (let k = 0; k < 36; k++) {\n  color(k % 2 ? "teal" : "gold")\n  for (let i = 0; i < 4; i++) {\n    forward(90)\n    right(90)\n  }\n  right(10)\n}', task: 'Make your own design. Anything with at least 20 lines drawn counts!', check: r => r.cmds.filter(c => c[0] === 'f').length >= 20 ? '' : 'Draw at least 20 lines.' }
];

const WORKER_SRC = `
let out=[], cmds=[];
const fmt=v=>typeof v==='object'?JSON.stringify(v):String(v);
self.say=(...a)=>{ if(out.length<300) out.push(a.map(fmt).join(' ')); };
self.print=self.say; self.console={log:self.say};
self.forward=n=>{ if(cmds.length<5000) cmds.push(['f',+n||0]); };
self.back=n=>cmds.push(['f',-(+n||0)]);
self.right=n=>cmds.push(['r',+n||0]); self.left=n=>cmds.push(['l',+n||0]);
self.color=c=>cmds.push(['c',String(c)]); self.width=n=>cmds.push(['w',+n||1]);
self.penUp=()=>cmds.push(['u']); self.penDown=()=>cmds.push(['d']);
onmessage=e=>{ try{ (new Function(e.data))(); postMessage({out,cmds}); } catch(err){ postMessage({out,cmds,error:err.message}); } };`;
let workerURL;
function runCode(code) {
  return new Promise(res => {
    workerURL = workerURL || URL.createObjectURL(new Blob([WORKER_SRC], { type: 'text/javascript' }));
    const w = new Worker(workerURL); const to = setTimeout(() => { w.terminate(); res({ out: [], cmds: [], error: 'Your code took too long. Is there a loop that never ends?' }); }, 2500);
    w.onmessage = e => { clearTimeout(to); w.terminate(); res(e.data); };
    w.onerror = e => { clearTimeout(to); w.terminate(); res({ out: [], cmds: [], error: e.message }); e.preventDefault(); };
    w.postMessage(code);
  });
}
function drawTurtle(cv, cmds, animate) {
  const dpr = devicePixelRatio || 1, S = 400; cv.width = S * dpr; cv.height = S * dpr; const g = cv.getContext('2d'); g.scale(dpr, dpr);
  g.fillStyle = '#fffef7'; g.fillRect(0, 0, S, S); g.strokeStyle = '#eee9d6'; for (let i = 0; i <= S; i += 40) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, S); g.moveTo(0, i); g.lineTo(S, i); g.stroke(); }
  let x = S / 2, y = S / 2, a = -90, pen = true; g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = '#2459d6'; g.lineWidth = 3;
  const steps = cmds.slice(); let i = 0;
  const one = () => { const [c, v] = steps[i++]; if (c === 'f') { const nx = x + v * Math.cos(a * Math.PI / 180), ny = y + v * Math.sin(a * Math.PI / 180); if (pen) { g.beginPath(); g.moveTo(x, y); g.lineTo(nx, ny); g.stroke(); } x = nx; y = ny; } else if (c === 'r') a += v; else if (c === 'l') a -= v; else if (c === 'c') g.strokeStyle = v; else if (c === 'w') g.lineWidth = Math.max(1, Math.min(30, v)); else if (c === 'u') pen = false; else if (c === 'd') pen = true; };
  const turtle = () => { g.save(); g.translate(x, y); g.rotate((a + 90) * Math.PI / 180); g.font = '20px serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('🐢', 0, 0); g.restore(); };
  if (!animate || steps.length > 400) { while (i < steps.length) one(); turtle(); return; }
  const snap = g.getImageData(0, 0, cv.width, cv.height);
  let last; const frame = () => { if (last) g.putImageData(last, 0, 0); for (let k = 0; k < 3 && i < steps.length; k++) one(); last = g.getImageData(0, 0, cv.width, cv.height); g.setTransform(1, 0, 0, 1, 0, 0); g.scale(dpr, dpr); turtle(); if (i < steps.length) requestAnimationFrame(frame); };
  void snap; frame();
}
function renderLab(el, [nArg]) {
  if (nArg === undefined) {
    el.innerHTML = `<div class="card hero" style="margin-top:16px"><p class="eyebrow">Code Lab</p><h2 style="margin:2px 0">Write real code.</h2><p class="small muted">This is JavaScript, a language used on almost every website. Type commands, press Run, and the turtle draws what you tell it.</p></div>
      <ul class="list card">${LESSONS.map((l, i) => `<li data-n="${i}" style="cursor:pointer"><span class="pill">${i + 1}</span><div class="grow"><b>${esc(l.t)}</b></div>${D.lab[i] ? '✅' : '›'}</li>`).join('')}</ul>`;
    el.onclick = e => { const b = e.target.closest('[data-n]'); if (b) location.hash = 'lab/' + b.dataset.n; };
    return;
  }
  el.onclick = null;
  const n = Math.max(0, Math.min(LESSONS.length - 1, +nArg)), L = LESSONS[n];
  el.innerHTML = `<div class="row" style="margin-top:14px"><a class="btn ghost sm" href="#lab">‹ Lessons</a><h2 style="margin:0;flex:1;font-size:1.2rem">${n + 1}. ${esc(L.t)}</h2>${D.lab[n] ? '<span class="pill">Done ✅</span>' : ''}</div>
    <p class="mt">${L.learn}</p><div class="card" style="background:var(--soft)"><b>Your mission:</b> ${L.task}</div>
    <label for="ed" class="f">Code</label><textarea class="code" id="ed" spellcheck="false" autocapitalize="off" autocomplete="off">${esc(D.code[n] ?? L.code)}</textarea>
    <div class="grid3 mt"><button class="btn ghost sm" id="rs">Start over</button><button class="btn ghost sm" id="hl">Help</button><button class="btn bolt" id="rn">▶ Run</button></div>
    <canvas class="turtle" id="cv" width="400" height="400" aria-label="Turtle drawing"></canvas>
    <div class="out" id="out" aria-live="polite">Output shows here.</div>
    ${n + 1 < LESSONS.length ? `<a class="btn ghost block mt" href="#lab/${n + 1}">Next lesson ›</a>` : ''}`;
  const ed = $('#ed', el), cv = $('#cv', el), out = $('#out', el);
  drawTurtle(cv, [], false);
  ed.onkeydown = e => { if (e.key === 'Tab') { e.preventDefault(); const s = ed.selectionStart; ed.setRangeText('  ', s, ed.selectionEnd, 'end'); } };
  ed.oninput = () => { D.code[n] = ed.value; st.save(); };
  $('#rs', el).onclick = () => { ed.value = L.code; delete D.code[n]; st.save(); };
  $('#hl', el).onclick = () => sheet(`<h3>Commands you can use</h3><ul class="list">${[['say("hi")', 'Show a message'], ['forward(100)', 'Move and draw'], ['back(50)', 'Move backward'], ['right(90) / left(90)', 'Turn in degrees'], ['color("red")', 'Pen color'], ['width(4)', 'Pen thickness'], ['penUp() / penDown()', 'Stop or start drawing'], ['for (let i = 0; i < 5; i++) { }', 'Repeat 5 times'], ['if (x > 3) { } else { }', 'Make a choice'], ['function name(input) { }', 'Make your own command']].map(([c, d]) => `<li><code>${esc(c)}</code><span class="grow small muted" style="text-align:right">${d}</span></li>`).join('')}</ul><p class="small muted">Every ( needs a ), every { needs a }, and text needs "quotes".</p>`);
  $('#rn', el).onclick = async () => {
    const code = ed.value; out.textContent = 'Running…';
    const r = await runCode(code); r.code = code;
    out.innerHTML = r.out.map(esc).join('\n') + (r.error ? `${r.out.length ? '\n' : ''}<span class="err">⚠ ${esc(friendly(r.error))}</span>` : '') || '(no output)';
    drawTurtle(cv, r.cmds, true);
    if (!r.error) { const miss = L.check(r); if (!miss) { if (!D.lab[n]) { D.lab[n] = 1; st.save(); } toast('Mission complete! ✅'); } else out.innerHTML += `\n<span style="color:#ffd23f">Mission: ${esc(miss)}</span>`; }
  };
}
function friendly(m) {
  if (/is not defined/.test(m)) return m + '. Check the spelling, and that text has "quotes".';
  if (/Unexpected end of input/.test(m)) return 'Something is missing at the end. Do all your { have a } ?';
  if (/Unexpected token|missing \)/.test(m)) return m + '. Check your ( ) and { } and quotes.';
  return m;
}

/* ================= Progress ================= */
function renderMe(el) {
  const p = Object.keys(D.paths).length, s = Object.values(D.paths).reduce((a, b) => a + b, 0), c = Object.keys(D.lab).length;
  el.innerHTML = `<h2>My progress</h2><div class="grid3"><div class="stat"><b>${p}/${LEVELS.length}</b><span>Owl Paths</span></div><div class="stat"><b>★ ${s}</b><span>Stars</span></div><div class="stat"><b>${c}/${LESSONS.length}</b><span>Code missions</span></div></div>
  <div class="card"><h3>Coder badges</h3><ul class="list">${[['🧩', 'Sequencer', 'Finish Owl Paths level 2', !!D.paths[1]], ['🔁', 'Looper', 'Finish level 3 with a loop', (D.paths[2] || 0) >= 3], ['🪆', 'Nested loops', 'Finish Around the pond', !!D.paths[4]], ['🌟', 'Owl master', 'Finish all Owl Paths', p === LEVELS.length], ['⌨️', 'First code', 'Complete Code Lab 1', !!D.lab[0]], ['🐢', 'Turtle artist', 'Complete the Loops lesson', !!D.lab[5]], ['🧠', 'Function builder', 'Complete Functions', !!D.lab[7]], ['🏆', 'Real coder', 'Complete all 10 missions', c === LESSONS.length]].map(([e, t, d, on]) => `<li style="${on ? '' : 'opacity:.45'}"><span style="font-size:1.6rem">${e}</span><div class="grow"><b>${t}</b><div class="small muted">${d}</div></div>${on ? '✅' : ''}</li>`).join('')}</ul></div>
  <div class="card"><h3>For grown-ups</h3><p class="small muted">Hoot Coding teaches sequencing, loops, nested loops, variables, functions and conditionals, first with blocks and then with real JavaScript. Code runs in a sandbox on this device. No accounts, ads, chat or data collection.</p></div>
  <div id="dc"></div>`;
  $('#dc', el).appendChild(Core.dataCard(st, 'Hoot Coding'));
}

const App = tabs([
  { id: 'paths', label: 'Owl Paths', icon: '<path d="M4 20V10l8-6 8 6v10"/><path d="M9 20v-5h6v5"/>', render: renderPaths },
  { id: 'lab', label: 'Code Lab', icon: '<path d="m8 8-5 4 5 4M16 8l5 4-5 4M14 4l-4 16"/>', render: renderLab },
  { id: 'me', label: 'Progress', icon: '<circle cx="12" cy="8" r="5"/><path d="M8.5 12.5 7 22l5-3 5 3-1.5-9.5"/>', render: renderMe }
], $('#main'));
registerSW();
// for automated checks
window.__hoot = { LEVELS, simulate, parseSol, LESSONS, runCode };
