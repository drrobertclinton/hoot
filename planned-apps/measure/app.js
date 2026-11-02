/* Coressence Measure: heart, body and mobility tracking. General wellness only. */
const { $, $$, esc, store, day, addDays, fmtDay, fmtTime, uid, toast, sheet, closeSheet, tabs, lineChart, dataCard, registerSW, WELLNESS } = Core;

const st = store('measure', {
  settings: { age: '', units: 'us', maxHR: '' },
  entries: [],   // {id,date,type,v,v2,note}
  tags: {},      // date -> [tag]
  rom: [],       // {id,date,test,side,reps:[],median}
  plan: { week: '', habits: [] } // habits: {id,text,done:{date:true}}
});
const D = st.data;

const METRICS = {
  rhr:   { name: 'Resting heart rate', unit: 'bpm', hint: 'Take it sitting quietly, ideally right after you wake up.', min: 30, max: 140 },
  hrv:   { name: 'Heart rate variability', unit: 'ms', hint: 'Copy the morning number from your watch or ring. Compare it only with your own readings from the same device.', min: 5, max: 250 },
  hrr:   { name: 'Heart-rate recovery', unit: 'bpm drop', hint: 'How far your heart rate falls in the first minute after hard effort. Use the guided test on the Heart tab.', min: 1, max: 100 },
  bp:    { name: 'Blood pressure (log)', unit: 'mmHg', hint: 'Type in a reading from your own cuff. A phone cannot measure blood pressure. This app only stores what you enter.', two: true, min: 50, max: 260 },
  weight:{ name: 'Body weight', unit: () => D.settings.units === 'metric' ? 'kg' : 'lb', hint: 'Same time of day, same scale, for the fairest comparison.', min: 20, max: 700 },
  waist: { name: 'Waist', unit: () => D.settings.units === 'metric' ? 'cm' : 'in', hint: 'Measure at the navel, relaxed, after breathing out.', min: 10, max: 120 }
};
const unitOf = k => typeof METRICS[k].unit === 'function' ? METRICS[k].unit() : METRICS[k].unit;
const TAGS = ['Poor sleep', 'Great sleep', 'Hard workout', 'Rest day', 'Alcohol', 'Stress', 'Travel', 'Feeling sick', 'Late meal', 'Caffeine late', 'Performance day'];

const ROM_TESTS = [
  { id: 'knee-flex', name: 'Knee bend', mode: 'tilt', place: 'Strap or hold the phone flat on the front of your shin.', start: 'Sit on a table edge, leg straight out in front.', move: 'Bend the knee back as far as is comfortable.' },
  { id: 'knee-ext',  name: 'Knee straightening', mode: 'tilt', place: 'Phone flat on the front of your shin.', start: 'Sit with the knee bent to a right angle.', move: 'Straighten the leg as far as is comfortable.' },
  { id: 'hip-flex',  name: 'Hip lift', mode: 'tilt', place: 'Phone flat on the front of your thigh.', start: 'Lie on your back, legs straight.', move: 'Bring the knee toward your chest as far as is comfortable.' },
  { id: 'sh-flex',   name: 'Shoulder forward raise', mode: 'tilt', place: 'Hold the phone flat against the outside of your upper arm.', start: 'Stand, arm relaxed at your side.', move: 'Raise the straight arm forward and up as far as is comfortable.' },
  { id: 'sh-abd',    name: 'Shoulder side raise', mode: 'tilt', place: 'Phone flat against the back of your upper arm.', start: 'Stand, arm relaxed at your side.', move: 'Raise the straight arm out to the side and up.' },
  { id: 'ankle-df',  name: 'Ankle flex (toes up)', mode: 'tilt', place: 'Phone flat on top of your foot.', start: 'Sit with your foot relaxed on the floor.', move: 'Pull your toes up toward your shin, heel down.' },
  { id: 'neck-rot',  name: 'Neck turn', mode: 'turn', place: 'Hold the phone flat on top of your head, screen up.', start: 'Sit tall, facing straight ahead.', move: 'Turn your head to one side as far as is comfortable.' },
  { id: 'trunk-flex',name: 'Forward bend', mode: 'tilt', place: 'Hold the phone flat against your breastbone.', start: 'Stand tall.', move: 'Bend forward at the hips as far as is comfortable.' }
];

const today = () => day();
const entriesOf = (k) => D.entries.filter(e => e.type === k).sort((a, b) => a.date.localeCompare(b.date));
const latest = k => { const e = entriesOf(k); return e[e.length - 1]; };
const avg = a => a.length ? a.reduce((s, x) => s + x, 0) / a.length : null;
const r1 = v => v == null ? '–' : Math.round(v * 10) / 10;
const median = a => { const s = [...a].sort((x, y) => x - y); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const mondayOf = iso => { const d = new Date(iso + 'T12:00:00'); const w = (d.getDay() + 6) % 7; d.setDate(d.getDate() - w); return day(d); };

function maxHR() { const a = +D.settings.age; if (+D.settings.maxHR) return +D.settings.maxHR; return a ? Math.round(208 - 0.7 * a) : null; }

/* ---------- Log sheet ---------- */
function logSheet(k, date = today()) {
  const m = METRICS[k];
  sheet(`<p class="eyebrow">Log</p><h3>${esc(m.name)}</h3><p class="small muted">${esc(m.hint)}</p>
    <label class="f">Date</label><input class="i" type="date" id="ld" value="${date}" max="${today()}">
    ${m.two ? `<div class="grid2"><div><label class="f">Top number (systolic)</label><input class="i" id="lv" inputmode="numeric" type="number"></div><div><label class="f">Bottom number (diastolic)</label><input class="i" id="lv2" inputmode="numeric" type="number"></div></div>`
            : `<label class="f">Value (${esc(unitOf(k))})</label><input class="i" id="lv" inputmode="decimal" type="number" step="0.1">`}
    <label class="f">Note (optional)</label><input class="i" id="ln" maxlength="140" placeholder="e.g. after a long rehearsal">
    <button class="btn block mt" id="lsave">Save</button>`, p => {
    $('#lv', p).focus();
    $('#lsave', p).onclick = () => {
      const v = parseFloat($('#lv', p).value), v2 = m.two ? parseFloat($('#lv2', p).value) : undefined;
      if (isNaN(v) || v < m.min || v > m.max || (m.two && (isNaN(v2) || v2 < 30 || v2 > 160))) { toast('Please check the number'); return; }
      D.entries.push({ id: uid(), date: $('#ld', p).value || today(), type: k, v, v2, note: $('#ln', p).value.trim() });
      st.save(); closeSheet(); toast('Saved'); App.refresh();
    };
  });
}

/* ---------- Today ---------- */
function renderToday(el) {
  const t = today(); const tg = D.tags[t] || [];
  ensureWeek();
  const mh = maxHR();
  el.innerHTML = `
  <div class="card hero"><p class="eyebrow">${fmtDay(t, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
    <h2 style="margin-top:4px">Measure what matters, not everything.</h2>
    <p class="muted small">Pick one or two numbers to watch this month. Small, steady entries beat perfect ones.</p>
    ${!D.settings.age ? `<button class="btn sm mt" onclick="location.hash='more'">Add your age for heart-rate zones</button>` : ''}
  </div>
  <h2>Log today</h2>
  <div class="grid2" id="quick">${Object.keys(METRICS).map(k => {
    const l = latest(k);
    return `<button class="card" style="margin:0;text-align:left;cursor:pointer" data-log="${k}"><span class="small muted" style="font-weight:700">${esc(METRICS[k].name)}</span><br><b style="font-size:1.35rem">${l ? (METRICS[k].two ? `${l.v}/${l.v2}` : r1(l.v)) : '–'}</b> <span class="small muted">${l ? esc(unitOf(k)) : ''}</span><br><span class="small muted">${l ? (l.date === t ? 'Today' : fmtDay(l.date)) : 'Tap to add'}</span></button>`;
  }).join('')}</div>
  <h2>What happened today?</h2>
  <p class="small muted">Tag your day. Trends uses these to show what tends to move your numbers.</p>
  <div class="chips" id="tags">${TAGS.map(x => `<button class="chip" aria-pressed="${tg.includes(x)}">${esc(x)}</button>`).join('')}</div>
  <h2>This week's habits</h2>
  ${weekHabitsHTML()}
  ${mh ? `<div class="card"><h3>Your heart-rate zones</h3><p class="small muted">Estimated max ${mh} bpm. See the Heart tab for details and live tracking.</p>${zonesHTML(mh, true)}</div>` : ''}
  <p class="disclaimer">${WELLNESS}</p>`;
  $('#quick', el).onclick = e => { const b = e.target.closest('[data-log]'); if (b) logSheet(b.dataset.log); };
  $('#tags', el).onclick = e => {
    const b = e.target.closest('.chip'); if (!b) return; const x = b.textContent;
    const a = D.tags[t] = D.tags[t] || []; const i = a.indexOf(x); i >= 0 ? a.splice(i, 1) : a.push(x);
    b.setAttribute('aria-pressed', i < 0); st.save();
  };
  bindHabits(el);
}

/* ---------- Weekly habit plan ---------- */
const HABIT_IDEAS = ['In bed by 10:30', 'Ten-minute walk after dinner', 'Water bottle refilled twice', 'Five minutes of slow breathing', 'No screens in the last 30 minutes', 'Strength session', 'Stretch for ten minutes', 'Morning daylight for 10 minutes', 'Caffeine before noon only'];
function ensureWeek() {
  const w = mondayOf(today());
  if (D.plan.week !== w) { D.plan.week = w; D.plan.habits = D.plan.habits.map(h => ({ ...h, done: {} })); st.save(); }
}
function weekHabitsHTML() {
  if (!D.plan.habits.length) return `<div class="card"><p class="muted small">Choose up to three small habits for this week. Watching how they line up with your numbers is the whole point.</p><button class="btn sm" data-h="edit">Pick habits</button></div>`;
  const days = [...Array(7)].map((_, i) => addDays(D.plan.week, i));
  return `<div class="card">${D.plan.habits.map(h => `<div class="mb"><div class="row"><b class="grow" style="flex:1">${esc(h.text)}</b><span class="small muted">${Object.keys(h.done).length}/7</span></div>
    <div class="row" style="gap:6px;margin-top:6px">${days.map(d => `<button class="chip" style="padding:6px 0;flex:1;text-align:center" data-h="tog" data-id="${h.id}" data-d="${d}" aria-pressed="${!!h.done[d]}" ${d > today() ? 'disabled' : ''}>${fmtDay(d, { weekday: 'narrow' })}</button>`).join('')}</div></div>`).join('')}
    <button class="btn ghost sm" data-h="edit">Change habits</button></div>`;
}
function bindHabits(el) {
  el.addEventListener('click', e => {
    const b = e.target.closest('[data-h]'); if (!b) return;
    if (b.dataset.h === 'tog') { const h = D.plan.habits.find(x => x.id === b.dataset.id); h.done[b.dataset.d] ? delete h.done[b.dataset.d] : h.done[b.dataset.d] = true; st.save(); App.refresh(); }
    if (b.dataset.h === 'edit') habitSheet();
  });
}
function habitSheet() {
  const cur = D.plan.habits.map(h => h.text);
  sheet(`<h3>This week's habits</h3><p class="small muted">Pick up to three, or write your own.</p>
    <div class="chips" id="hi">${[...new Set([...HABIT_IDEAS, ...cur])].map(x => `<button class="chip" aria-pressed="${cur.includes(x)}">${esc(x)}</button>`).join('')}</div>
    <label class="f">Your own</label><div class="row"><input class="i" id="hown" maxlength="60"><button class="btn sm" id="hadd">Add</button></div>
    <button class="btn block mt" id="hsave">Save</button>`, p => {
    $('#hi', p).onclick = e => { const b = e.target.closest('.chip'); if (!b) return; const on = b.getAttribute('aria-pressed') === 'true'; if (!on && $$('#hi [aria-pressed="true"]', p).length >= 3) { toast('Three is plenty for one week'); return; } b.setAttribute('aria-pressed', !on); };
    $('#hadd', p).onclick = () => { const v = $('#hown', p).value.trim(); if (!v) return; const b = document.createElement('button'); b.className = 'chip'; b.textContent = v; b.setAttribute('aria-pressed', $$('#hi [aria-pressed="true"]', p).length < 3); $('#hi', p).appendChild(b); $('#hown', p).value = ''; };
    $('#hsave', p).onclick = () => {
      const picked = $$('#hi [aria-pressed="true"]', p).map(b => b.textContent);
      D.plan.habits = picked.map(t => D.plan.habits.find(h => h.text === t) || { id: uid(), text: t, done: {} });
      st.save(); closeSheet(); App.refresh();
    };
  });
}

/* ---------- Heart ---------- */
const ZONES = [[.5, .6, 'Zone 1', 'Easy, warm-up and recovery'], [.6, .7, 'Zone 2', 'Comfortable, can hold a conversation'], [.7, .8, 'Zone 3', 'Steady, talking gets harder'], [.8, .9, 'Zone 4', 'Hard, a few words at a time'], [.9, 1, 'Zone 5', 'Very hard, short bursts only']];
function zonesHTML(mh, compact, live) {
  return `<ul class="list">${ZONES.map(([a, b, n, d], i) => `<li ${live != null && live >= Math.round(a * mh) && live < Math.round(b * mh) + (i === 4 ? 999 : 0) ? 'style="background:var(--soft);border-radius:10px;padding-left:8px"' : ''}><span class="pill">${n}</span><div class="grow"><b>${Math.round(a * mh)}–${Math.round(b * mh)} bpm</b>${compact ? '' : `<div class="small muted">${d}</div>`}</div></li>`).join('')}</ul>`;
}
let bt = null;
function renderHeart(el) {
  const mh = maxHR(); const r = latest('rhr');
  const vo2 = mh && r ? Math.round(15.3 * mh / r.v) : null;
  el.innerHTML = `
  <h2>Heart</h2>
  <div class="grid3">
    <div class="stat"><b>${r ? r.v : '–'}</b><span>Resting bpm</span></div>
    <div class="stat"><b>${latest('hrv') ? r1(latest('hrv').v) : '–'}</b><span>HRV ms</span></div>
    <div class="stat"><b>${latest('hrr') ? latest('hrr').v : '–'}</b><span>Recovery drop</span></div>
  </div>
  <div class="card"><h3>Count your pulse</h3><p class="small muted">Two fingers on the inside of your wrist or the side of your neck. Tap the big button each time you feel a beat for 30 seconds, or count silently and type the number.</p>
    <button class="btn block" id="pstart" style="min-height:64px;font-size:1.1rem">Start 30-second count</button>
    <div id="pout" class="center mt"></div></div>
  <div class="card"><h3>Heart-rate zones</h3>
    ${mh ? `<p class="small muted">Based on an estimated max of <b>${mh} bpm</b> (${D.settings.maxHR ? 'your own number' : '208 − 0.7 × age'}). Estimates can be off by 10 or more beats, so how the effort feels matters too.</p>${zonesHTML(mh, false, bt)}` : `<p class="muted small">Add your age on the More tab to see your zones.</p>`}
    <div id="btbox" class="mt"></div></div>
  <div class="card"><h3>Heart-rate recovery test</h3><p class="small muted">After a hard effort you choose (stairs, a run, a hard song-and-dance number), note your heart rate right as you stop, rest standing for one minute, then take it again. The drop is your recovery number. Only do this if hard exercise is already part of your routine and your doctor is fine with it.</p>
    <div class="grid2"><div><label class="f">At the moment you stopped</label><input class="i" id="hpk" type="number" inputmode="numeric" placeholder="bpm"></div><div><label class="f">One minute later</label><input class="i" id="hlt" type="number" inputmode="numeric" placeholder="bpm"></div></div>
    <button class="btn ghost sm mt" id="hrt">1-minute timer</button> <button class="btn sm mt" id="hsv">Save recovery</button></div>
  <div class="card"><h3>Fitness estimate</h3>${vo2 ? `<p class="big">${vo2}</p><p class="small muted">A rough VO₂max estimate (ml/kg/min) from your max and resting heart rate (Uth method). Treat it as a trend line for yourself, not a test result.</p>` : `<p class="small muted">Log a resting heart rate and add your age to see a rough fitness estimate.</p>`}</div>
  <p class="disclaimer">This app never checks for heart rhythm problems, high blood pressure or any other condition. If you have chest pain, fainting, a racing or irregular heartbeat, or shortness of breath, stop and get medical care. ${WELLNESS}</p>`;

  // pulse counter
  $('#pstart', el).onclick = () => {
    let n = 0, t0 = performance.now(); const btn = $('#pstart', el), out = $('#pout', el);
    btn.textContent = 'Tap on each beat'; btn.onclick = () => { n++; out.innerHTML = `<span class="big">${n}</span>`; if (navigator.vibrate) navigator.vibrate(8); };
    const iv = setInterval(() => { const left = 30000 - (performance.now() - t0); if (left <= 0) { clearInterval(iv); finish(); } else btn.textContent = `Tap on each beat · ${Math.ceil(left / 1000)}s`; }, 200);
    function finish() {
      btn.textContent = 'Start again'; btn.onclick = () => App.refresh();
      out.innerHTML = `<p class="small muted">Beats counted (edit if you counted silently)</p><input class="i center" id="pc" type="number" value="${n}" style="max-width:120px;margin:0 auto;display:block"><p class="mt"><b id="pbpm">${n * 2}</b> bpm</p><button class="btn sm" id="psave">Save as resting heart rate</button>`;
      $('#pc', out).oninput = e => $('#pbpm', out).textContent = (+e.target.value || 0) * 2;
      $('#psave', out).onclick = () => { const v = (+$('#pc', out).value) * 2; if (v < 30 || v > 140) { toast('That looks off, try again'); return; } D.entries.push({ id: uid(), date: today(), type: 'rhr', v, note: 'pulse count' }); st.save(); toast('Saved'); App.refresh(); };
    }
  };
  // recovery
  $('#hrt', el).onclick = e => { let s = 60; const b = e.target; b.disabled = true; const iv = setInterval(() => { s--; b.textContent = s > 0 ? `${s}s` : 'Time! Take your pulse'; if (s <= 0) { clearInterval(iv); b.disabled = false; if (navigator.vibrate) navigator.vibrate([200, 100, 200]); } }, 1000); };
  $('#hsv', el).onclick = () => { const a = +$('#hpk', el).value, b = +$('#hlt', el).value; if (!a || !b || b >= a) { toast('Enter both numbers, the second lower'); return; } D.entries.push({ id: uid(), date: today(), type: 'hrr', v: a - b, note: `${a} → ${b}` }); st.save(); toast(`Saved: dropped ${a - b} bpm`); App.refresh(); };
  // live HR from a Bluetooth chest strap or watch broadcasting HR
  const box = $('#btbox', el);
  if (navigator.bluetooth && mh) {
    box.innerHTML = `<button class="btn ghost sm" id="btc">${bt ? `Live: ${bt} bpm` : 'Connect a Bluetooth heart-rate strap'}</button><p class="small muted mt">Works in Chrome on Android and computers with straps that use the standard heart-rate signal.</p>`;
    $('#btc', box).onclick = connectHR;
  } else if (mh) box.innerHTML = `<p class="small muted">Live heart rate from a chest strap works in Chrome on Android. On iPhone, the App Store version will read Apple Health.</p>`;
}
async function connectHR() {
  try {
    const dev = await navigator.bluetooth.requestDevice({ filters: [{ services: ['heart_rate'] }] });
    const srv = await dev.gatt.connect(); const svc = await srv.getPrimaryService('heart_rate'); const ch = await svc.getCharacteristic('heart_rate_measurement');
    await ch.startNotifications();
    let last = 0;
    ch.addEventListener('characteristicvaluechanged', e => { const v = e.target.value; const f = v.getUint8(0); bt = f & 1 ? v.getUint16(1, true) : v.getUint8(1); if (Date.now() - last > 1000 && location.hash.startsWith('#heart')) { last = Date.now(); App.refresh(); } });
    toast('Connected');
  } catch (e) { toast('Could not connect: ' + (e.message || 'cancelled')); }
}

/* ---------- Mobility ---------- */
function renderMobility(el) {
  el.innerHTML = `<h2>Mobility</h2><p class="muted small">Track your own flexibility over time. Use the phone's motion sensor, three tries, and the app keeps the middle value. There are no "normal" scores here, only your own trend. Move gently and stop if anything hurts.</p>
  <ul class="list card">${ROM_TESTS.map(t => {
    const L = D.rom.filter(x => x.test === t.id && x.side === 'L').pop(), R = D.rom.filter(x => x.test === t.id && x.side === 'R').pop();
    return `<li><div class="grow"><b>${esc(t.name)}</b><div class="small muted">${t.id === 'trunk-flex' ? (L ? `Last ${L.median}°` : 'Not measured yet') : `Left ${L ? L.median + '°' : '–'} · Right ${R ? R.median + '°' : '–'}`}</div></div>
    ${t.id === 'trunk-flex' ? `<button class="btn sm" data-t="${t.id}" data-s="L">Measure</button>` : `<button class="btn sm ghost" data-t="${t.id}" data-s="L">Left</button><button class="btn sm ghost" data-t="${t.id}" data-s="R">Right</button>`}</li>`;
  }).join('')}</ul>
  <div class="card"><h3>Left vs right over time</h3><select class="i" id="mt">${ROM_TESTS.map(t => `<option value="${t.id}">${esc(t.name)}</option>`).join('')}</select><div id="mch" class="mt"></div></div>
  <p class="disclaimer">Phone-sensor angles are approximate and are for tracking your own progress only. They are not a clinical measurement. If you have pain, swelling or an injury, see a doctor or physical therapist. ${WELLNESS}</p>`;
  el.querySelector('.list').onclick = e => { const b = e.target.closest('[data-t]'); if (b) romSheet(ROM_TESTS.find(t => t.id === b.dataset.t), b.dataset.s); };
  const draw = () => { const id = $('#mt', el).value; const rows = D.rom.filter(x => x.test === id); const dates = [...new Set(rows.map(r => r.date))].sort();
    const pt = s => dates.map(d => [fmtDay(d, { month: 'numeric', day: 'numeric' }), (rows.filter(r => r.date === d && r.side === s).pop() || {}).median ?? null]);
    $('#mch', el).innerHTML = dates.length ? lineChart([{ points: pt('L'), cls: 'ln' }, ...(id === 'trunk-flex' ? [] : [{ points: pt('R'), cls: 'ln2' }])]) + (id === 'trunk-flex' ? '' : '<p class="small muted"><span style="color:var(--accent)">●</span> Left <span style="color:var(--blue)">●</span> Right</p>') : '<p class="empty">No measurements yet.</p>'; };
  $('#mt', el).onchange = draw; draw();
}

function romSheet(t, side) {
  const reps = [];
  sheet(`<p class="eyebrow">${esc(t.name)}${t.id === 'trunk-flex' ? '' : ' · ' + (side === 'L' ? 'Left' : 'Right')}</p><h3>Three tries</h3>
    <ol class="small" style="padding-left:18px"><li>${esc(t.place)}</li><li>${esc(t.start)} Tap <b>Set start</b>.</li><li>${esc(t.move)} Hold still and tap <b>Capture</b>.</li></ol>
    <div class="card center"><div class="big" id="ang">0°</div><p class="small muted" id="sens">Waiting for the motion sensor…</p>
      <div class="row mt" style="justify-content:center"><button class="btn ghost" id="zero">Set start</button><button class="btn" id="cap" disabled>Capture</button></div></div>
    <p class="small"><b>Tries:</b> <span id="reps">none yet</span></p>
    <details class="small mt"><summary>No motion sensor? Type the angle</summary><div class="row mt"><input class="i" id="man" type="number" inputmode="numeric" placeholder="degrees"><button class="btn sm" id="mad">Add try</button></div></details>
    <button class="btn block mt" id="rsave" disabled>Save middle value</button>`, async p => {
    let base = null, cur = null, live = 0, got = false;
    const angleBetween = (a, b) => { if (t.mode === 'turn') { let d = Math.abs(b.alpha - a.alpha) % 360; return d > 180 ? 360 - d : d; } const dot = a.x * b.x + a.y * b.y + a.z * b.z; const m = Math.hypot(a.x, a.y, a.z) * Math.hypot(b.x, b.y, b.z); return Math.acos(Math.max(-1, Math.min(1, dot / m))) * 180 / Math.PI; };
    const onMotion = e => { const g = e.accelerationIncludingGravity; if (!g || g.x == null) return; got = true; cur = cur && t.mode === 'tilt' ? { x: cur.x * .8 + g.x * .2, y: cur.y * .8 + g.y * .2, z: cur.z * .8 + g.z * .2 } : { x: g.x, y: g.y, z: g.z }; tick(); };
    const onOri = e => { if (e.alpha == null) return; got = true; cur = { alpha: e.webkitCompassHeading ?? e.alpha }; tick(); };
    const tick = () => { $('#sens', p).textContent = base ? 'Move now, then hold still and capture' : 'Get in the start position and tap Set start'; if (base && cur) { live = Math.round(angleBetween(base, cur)); $('#ang', p).textContent = live + '°'; } };
    try {
      const Perm = t.mode === 'turn' ? window.DeviceOrientationEvent : window.DeviceMotionEvent;
      if (Perm && typeof Perm.requestPermission === 'function') await Perm.requestPermission();
    } catch (e) { /* user will tap again */ }
    if (t.mode === 'turn') addEventListener('deviceorientation', onOri); else addEventListener('devicemotion', onMotion);
    setTimeout(() => { if (!got) $('#sens', p).textContent = 'No motion sensor found here. Use a phone, or type the angle below.'; }, 1500);
    const done = () => { removeEventListener('devicemotion', onMotion); removeEventListener('deviceorientation', onOri); };
    const showReps = () => { $('#reps', p).textContent = reps.length ? reps.map(r => r + '°').join(', ') + (reps.length >= 3 ? ` · middle ${median(reps)}°` : '') : 'none yet'; $('#rsave', p).disabled = !reps.length; };
    $('#zero', p).onclick = async () => {
      try { const Perm = t.mode === 'turn' ? window.DeviceOrientationEvent : window.DeviceMotionEvent; if (Perm && typeof Perm.requestPermission === 'function') await Perm.requestPermission(); } catch (e) { }
      if (!cur) { toast('No sensor reading yet'); return; } base = { ...cur }; $('#cap', p).disabled = false; tick();
    };
    $('#cap', p).onclick = () => { if (reps.length >= 3) reps.shift(); reps.push(live); base = null; $('#cap', p).disabled = true; $('#ang', p).textContent = '0°'; showReps(); if (navigator.vibrate) navigator.vibrate(30); };
    $('#mad', p).onclick = () => { const v = +$('#man', p).value; if (!v || v < 0 || v > 200) return; if (reps.length >= 3) reps.shift(); reps.push(Math.round(v)); $('#man', p).value = ''; showReps(); };
    $('#rsave', p).onclick = () => { D.rom.push({ id: uid(), date: today(), test: t.id, side, reps: [...reps], median: median(reps) }); st.save(); done(); closeSheet(); toast(`Saved ${median(reps)}°`); App.refresh(); };
    const obs = new MutationObserver(() => { if (!$('#sheet').classList.contains('on')) { done(); obs.disconnect(); } }); obs.observe($('#sheet'), { attributes: true });
  });
}

/* ---------- Trends ---------- */
function renderTrends(el, [sel]) {
  const k = sel && METRICS[sel] ? sel : 'rhr'; const m = METRICS[k];
  const range = +(sessionStorage.getItem('m.range') || 30);
  const from = addDays(today(), -range + 1);
  const rows = entriesOf(k).filter(e => e.date >= from);
  const byDay = {}; rows.forEach(e => { (byDay[e.date] = byDay[e.date] || []).push(e); });
  const dates = Object.keys(byDay).sort();
  const pts = f => dates.map(d => [fmtDay(d, { month: 'numeric', day: 'numeric' }), avg(byDay[d].map(f))]);
  const series = [{ points: pts(e => e.v) }]; if (m.two) series.push({ points: pts(e => e.v2), cls: 'ln2' });
  // what moved it
  const vals = d => avg(byDay[d].map(e => e.v));
  const overall = avg(dates.map(vals));
  const moved = TAGS.map(tag => { const ds = dates.filter(d => (D.tags[d] || []).includes(tag)); const nd = dates.filter(d => !(D.tags[d] || []).includes(tag)); return ds.length >= 2 && nd.length >= 2 ? { tag, n: ds.length, diff: avg(ds.map(vals)) - avg(nd.map(vals)) } : null; }).filter(Boolean).sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff)).slice(0, 4);
  el.innerHTML = `<h2>Trends</h2>
  <div class="chips">${Object.keys(METRICS).map(x => `<button class="chip" aria-pressed="${x === k}" data-k="${x}">${esc(METRICS[x].name.replace(' (log)', ''))}</button>`).join('')}</div>
  <div class="card"><div class="row"><h3 style="flex:1">${esc(m.name)}</h3><select class="i" id="rg" style="width:auto;min-height:36px;padding:4px 8px">${[7, 30, 90, 365].map(n => `<option value="${n}" ${n === range ? 'selected' : ''}>${n} days</option>`).join('')}</select></div>
    ${lineChart(series)}
    ${dates.length ? `<div class="grid3 mt"><div class="stat"><b>${m.two ? r1(avg(rows.map(e => e.v))) + '/' + r1(avg(rows.map(e => e.v2))) : r1(overall)}</b><span>Average</span></div><div class="stat"><b>${rows.length}</b><span>Entries</span></div><div class="stat"><b>${m.two ? '' : r1(Math.min(...rows.map(e => e.v))) + '–' + r1(Math.max(...rows.map(e => e.v)))}</b><span>${m.two ? '' : 'Range'}</span></div></div>` : ''}
  </div>
  <div class="card"><h3>What moved it</h3>${moved.length ? `<p class="small muted">Average on tagged days compared with your other days in this period. This shows a pattern in your own entries, not a cause.</p><ul class="list">${moved.map(x => `<li><div class="grow"><b>${esc(x.tag)}</b><div class="small muted">${x.n} days</div></div><b>${x.diff > 0 ? '+' : ''}${r1(x.diff)} ${esc(unitOf(k))}</b></li>`).join('')}</ul>` : `<p class="small muted">Tag at least two days on the Today tab (poor sleep, hard workout, stress…) along with entries, and patterns show up here.</p>`}</div>
  <div class="card"><h3>History</h3>${rows.length ? `<ul class="list">${[...rows].reverse().slice(0, 40).map(e => `<li><div class="grow"><b>${m.two ? `${e.v}/${e.v2}` : r1(e.v)} ${esc(unitOf(k))}</b><div class="small muted">${fmtDay(e.date)}${e.note ? ' · ' + esc(e.note) : ''}</div></div><button class="iconbtn" data-del="${e.id}" aria-label="Delete">✕</button></li>`).join('')}</ul>` : '<p class="empty">Nothing in this period.</p>'}
    <button class="btn sm mt" data-add="${k}">Add ${esc(m.name.toLowerCase())}</button></div>`;
  el.onclick = e => {
    const c = e.target.closest('[data-k]'); if (c) location.hash = 'trends/' + c.dataset.k;
    const d = e.target.closest('[data-del]'); if (d) { D.entries = D.entries.filter(x => x.id !== d.dataset.del); st.save(); App.refresh(); }
    const a = e.target.closest('[data-add]'); if (a) logSheet(a.dataset.add);
  };
  $('#rg', el).onchange = e => { sessionStorage.setItem('m.range', e.target.value); App.refresh(); };
}

/* ---------- More ---------- */
function renderMore(el) {
  el.innerHTML = `<h2>Settings</h2>
  <div class="card"><label class="f">Your age (for heart-rate zones)</label><input class="i" id="sa" type="number" inputmode="numeric" value="${esc(D.settings.age)}">
    <label class="f">Known max heart rate (optional, overrides the estimate)</label><input class="i" id="sm" type="number" inputmode="numeric" value="${esc(D.settings.maxHR)}">
    <label class="f">Units</label><select class="i" id="su"><option value="us">Pounds and inches</option><option value="metric" ${D.settings.units === 'metric' ? 'selected' : ''}>Kilograms and centimeters</option></select>
    <button class="btn mt" id="ss">Save settings</button></div>
  <div class="card"><h3>Report for your coach or doctor</h3><p class="small muted">A one-page summary of the last 30 days that you can print or save as a PDF.</p><button class="btn ghost sm" id="rep">Make report</button></div>
  <div class="card"><h3>Watches and rings</h3><p class="small muted">The App Store and Google Play versions of Measure will read Apple Health and Health Connect with your permission, so resting heart rate, HRV and weight fill in by themselves. In this web version, copy the morning numbers from your device's app.</p></div>
  <div class="card"><h3>Part of Coressence</h3><p class="small muted">Measure is one of the Coressence Life apps. Coressence Life helps you build a plan for sleep, nutrition, training, recovery and rest. <a href="../">See all Coressence apps</a></p></div>
  <div id="dc"></div>
  <p class="disclaimer">${WELLNESS}</p>`;
  $('#ss', el).onclick = () => { D.settings.age = $('#sa', el).value; D.settings.maxHR = $('#sm', el).value; D.settings.units = $('#su', el).value; st.save(); toast('Saved'); };
  $('#rep', el).onclick = report;
  $('#dc', el).appendChild(dataCard(st, 'Coressence Measure'));
}
function report() {
  const from = addDays(today(), -29);
  const rowsFor = k => entriesOf(k).filter(e => e.date >= from);
  const w = window.open('', '_blank'); if (!w) { toast('Allow pop-ups to make the report'); return; }
  const rom = ROM_TESTS.map(t => { const L = D.rom.filter(x => x.test === t.id && x.side === 'L').pop(), R = D.rom.filter(x => x.test === t.id && x.side === 'R').pop(); return L || R ? `<tr><td>${esc(t.name)}</td><td>${L ? L.median + '° (' + L.date + ')' : '–'}</td><td>${R ? R.median + '° (' + R.date + ')' : '–'}</td></tr>` : ''; }).join('');
  w.document.write(`<!doctype html><title>Coressence Measure report</title><style>body{font:14px/1.5 system-ui,sans-serif;max-width:720px;margin:24px auto;padding:0 16px;color:#0d2a3a}h1{font-size:20px}table{border-collapse:collapse;width:100%;margin:8px 0 18px}td,th{border-bottom:1px solid #d6e6ea;padding:6px;text-align:left}small{color:#4b6070}</style>
  <h1>Coressence Measure: 30-day summary</h1><small>${fmtDay(from)} to ${fmtDay(today())}. Self-entered and phone-sensor values, for wellness tracking only. Not a medical record.</small>
  <table><tr><th>Measure</th><th>Entries</th><th>Average</th><th>Lowest</th><th>Highest</th><th>Most recent</th></tr>
  ${Object.keys(METRICS).map(k => { const r = rowsFor(k); if (!r.length) return ''; const m = METRICS[k]; const f = e => m.two ? `${e.v}/${e.v2}` : r1(e.v); return `<tr><td>${esc(m.name)} (${esc(unitOf(k))})</td><td>${r.length}</td><td>${m.two ? r1(avg(r.map(e => e.v))) + '/' + r1(avg(r.map(e => e.v2))) : r1(avg(r.map(e => e.v)))}</td><td>${m.two ? '' : r1(Math.min(...r.map(e => e.v)))}</td><td>${m.two ? '' : r1(Math.max(...r.map(e => e.v)))}</td><td>${f(r[r.length - 1])} (${r[r.length - 1].date})</td></tr>`; }).join('')}</table>
  ${rom ? `<h2 style="font-size:16px">Flexibility (middle of three tries)</h2><table><tr><th>Movement</th><th>Left</th><th>Right</th></tr>${rom}</table>` : ''}
  <small>${WELLNESS}</small><script>setTimeout(()=>print(),300)<\/script>`);
  w.document.close();
}

const ICON = {
  today: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z"/>',
  mob: '<path d="M4 20 12 8l8 12"/><path d="M9 14a4 4 0 0 1 6 0"/>',
  trend: '<path d="M3 17l6-6 4 4 8-8"/><path d="M14 7h7v7"/>',
  more: '<circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>'
};
const App = tabs([
  { id: 'today', label: 'Today', icon: ICON.today, render: renderToday },
  { id: 'heart', label: 'Heart', icon: ICON.heart, render: renderHeart },
  { id: 'mobility', label: 'Mobility', icon: ICON.mob, render: renderMobility },
  { id: 'trends', label: 'Trends', icon: ICON.trend, render: renderTrends },
  { id: 'more', label: 'More', icon: ICON.more, render: renderMore }
], $('#main'));
registerSW();
