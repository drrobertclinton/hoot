// Progress, achievements, the practice log (for students, parents and teachers) and settings.
import { state, update, levelOf, levelTitle, streakAlive, resetAll, exportData, importData, dayKey } from '../state.js';
import { ACHIEVEMENTS } from '../achievements.js';
import { INSTRUMENTS, THEORY, byId } from '../content/instruments.js';
import { courseProgress } from './learn.js';
import { cards } from '../state.js';
import { isMastered } from '../core/srs.js';
import { hasPro, paywall } from '../gates.js';
import { icon, instIcon } from '../icons.js';
import { esc, fmtMins, relDay, toast, sheet } from '../util.js';
import * as input from '../audio/input.js';
import { audio, group, click } from '../audio/engine.js';

const totalMins = (S) => Object.values(S.days).reduce((a, d) => a + (d.mins || 0), 0);

export function meView(root) {
  const S = state(); const L = levelOf(); const streak = streakAlive();
  const done = Object.values(S.lessons).filter((l) => l.done).length;
  const cs = cards(); const mastered = cs.filter(isMastered).length;
  // 12-week heatmap
  const weeks = 12; const cells = []; const start = new Date(); start.setDate(start.getDate() - (weeks * 7 - 1) - start.getDay());
  for (let i = 0; i < weeks * 7; i++) { const d = new Date(start); d.setDate(start.getDate() + i); const k = dayKey(d); const m = (S.days[k] || {}).mins || 0; cells.push({ k, m, future: d > new Date() }); }
  const lvl = (m) => (m <= 0 ? 0 : m < 5 ? 1 : m < 15 ? 2 : m < 30 ? 3 : 4);
  const insts = [...INSTRUMENTS, THEORY].map((i) => ({ i, p: courseProgress(i.id) })).filter((x) => x.p.done > 0);
  root.innerHTML = `<div class="page"><header class="me-head"><div class="lvl-big"><span>${L.level}</span></div><div><p class="eyebrow">${levelTitle(L.level)}</p><h1>${S.profile.name ? esc(S.profile.name) : 'Your progress'}</h1><div class="mini-prog lg"><i style="width:${L.pct}%"></i></div><p class="muted small">${L.into} of ${L.need} XP to level ${L.level + 1}</p></div><a class="ib" href="#/settings" aria-label="Settings">${icon('gear')}</a></header>
    <section class="stat-grid">
      <div class="stat"><b>${streak}</b><small>day streak</small></div><div class="stat"><b>${S.streak.best}</b><small>best streak</small></div>
      <div class="stat"><b>${done}</b><small>lessons done</small></div><div class="stat"><b>${fmtMins(totalMins(S))}</b><small>practiced</small></div>
      <div class="stat"><b>${S.xp}</b><small>XP</small></div><div class="stat"><b>${mastered}/${cs.length}</b><small>cards mastered</small></div>
    </section>
    <section class="sect"><div class="sect-head"><h2>Practice calendar</h2><span class="muted small">${S.streak.freezes} streak freeze${S.streak.freezes === 1 ? '' : 's'} saved</span></div>
      <div class="heat" role="img" aria-label="Practice minutes over the last 12 weeks">${cells.map((c) => `<i class="h${c.future ? 'x' : lvl(c.m)}" title="${c.k}: ${Math.round(c.m)} min"></i>`).join('')}</div>
      <div class="heat-key muted small">Less <i class="h0"></i><i class="h1"></i><i class="h2"></i><i class="h3"></i><i class="h4"></i> More</div></section>
    ${insts.length ? `<section class="sect"><div class="sect-head"><h2>Courses</h2></div><div class="course-bars">${insts.map(({ i, p }) => `<a href="#/${i.id === 'theory' ? 'theory' : 'course/' + i.id}" class="cbar" style="--ic:${i.color}"><span class="inst-art xs">${instIcon(i.id)}</span><span><b>${esc(i.name)}</b><span class="mini-prog"><i style="width:${p.pct}%"></i></span></span><em>${p.done}/${p.total}</em></a>`).join('')}</div></section>` : ''}
    <section class="sect"><div class="sect-head"><h2>Achievements</h2><span class="muted small">${Object.keys(S.ach).length} of ${ACHIEVEMENTS.length}</span></div>
      <div class="ach-grid">${ACHIEVEMENTS.map((a) => `<div class="ach${S.ach[a.id] ? ' on' : ''}"><span>${icon(a.icon)}</span><div><b>${esc(a.title)}</b><small>${esc(a.text)}</small></div></div>`).join('')}</div></section>
    <section class="sect"><div class="sect-head"><h2>Practice log</h2><a class="link" href="#/log">See all and share</a></div>${logList(S.log.slice(0, 6))}</section>
  </div>`;
}

function logList(items) {
  if (!items.length) return '<p class="muted">Your practice will show up here.</p>';
  return `<ul class="log">${items.map((x) => { const i = byId(x.inst) || THEORY; return `<li><span class="inst-art xs" style="--ic:${i.color}">${instIcon(i.id)}</span><span class="lg-t"><b>${esc(x.title)}</b><small>${esc(i.name)} · ${relDay(x.at)} · ${x.mins} min</small></span>${x.score != null ? `<em>${x.kind === 'lesson' ? '★'.repeat(x.score) : x.score + '%'}</em>` : ''}</li>`; }).join('')}</ul>`;
}

export function logView(root) {
  const S = state();
  const wk = [...Array(7)].map((_, i) => { const d = new Date(); d.setDate(d.getDate() - i); return dayKey(d); });
  const weekMins = wk.reduce((a, k) => a + ((S.days[k] || {}).mins || 0), 0);
  const weekDays = wk.filter((k) => (S.days[k] || {}).mins > 0).length;
  root.innerHTML = `<div class="page narrow"><a class="back" href="#/me">${icon('back')}<span>Progress</span></a><header class="page-head"><h1>Practice log</h1><p class="lead">A record for you, a parent or a teacher. Share a weekly summary or export the full log.</p></header>
    <div class="card pad summary"><div><b>${fmtMins(weekMins)}</b><small>last 7 days</small></div><div><b>${weekDays}/7</b><small>days practiced</small></div><div><b>${streakAlive()}</b><small>day streak</small></div></div>
    <div class="row"><button class="btn primary" data-a="share">${icon('share')}<span>Share weekly report</span></button><button class="btn ghost" data-a="csv">${icon('doc')}<span>Export CSV</span></button></div>
    ${hasPro() ? '' : `<p class="muted small">Sharing reports is part of Pro. The log itself is always free.</p>`}
    ${logList(S.log.slice(0, 200))}</div>`;
  root.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-a]'); if (!b) return;
    if (!hasPro()) { paywall.open({ focus: 'pro', reason: 'Practice reports are part of Pro.' }); return; }
    if (b.dataset.a === 'share') await shareText('Weekly practice report', weeklyReport());
    if (b.dataset.a === 'csv') await shareFile('practice-log.csv', csv(), 'text/csv');
  });
}
function weeklyReport() {
  const S = state(); const lines = [`Practice report${S.profile.name ? ' for ' + S.profile.name : ''}`, `Week ending ${new Date().toLocaleDateString()}`, ''];
  for (let i = 6; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); const k = dayKey(d); const m = (S.days[k] || {}).mins || 0; lines.push(`${d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}: ${m ? Math.round(m) + ' min' : 'no practice'}`); }
  const since = Date.now() - 7 * 86400000; const items = S.log.filter((x) => x.at >= since);
  lines.push('', 'What was practiced:'); items.slice(0, 40).forEach((x) => lines.push(`- ${(byId(x.inst) || THEORY).name}: ${x.title}${x.score != null ? (x.kind === 'lesson' ? ` (${x.score}/3 stars)` : ` (${x.score}%)`) : ''}`));
  lines.push('', `Current streak: ${streakAlive()} days · Level ${levelOf().level}`);
  return lines.join('\n');
}
function csv() { const rows = [['date', 'time', 'instrument', 'type', 'item', 'minutes', 'score']]; state().log.forEach((x) => { const d = new Date(x.at); rows.push([dayKey(d), d.toTimeString().slice(0, 5), (byId(x.inst) || THEORY).name, x.kind, x.title, x.mins, x.score ?? '']); }); return rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n'); }
async function shareText(title, text) {
  const C = window.Capacitor; const Share = C && C.Plugins && C.Plugins.Share;
  try { if (Share && C.isNativePlatform()) { await Share.share({ title, text, dialogTitle: title }); return; } } catch { /* fall through */ }
  if (navigator.share) { try { await navigator.share({ title, text }); return; } catch { /* cancelled */ } }
  try { await navigator.clipboard.writeText(text); toast('Report copied. Paste it into a message or email.'); } catch { sheet(`<h2>Weekly report</h2><textarea class="report" readonly>${esc(text)}</textarea><div class="row"><button class="btn primary" data-close>Close</button></div>`); }
}
async function shareFile(name, data, type) {
  const C = window.Capacitor;
  if (C && C.isNativePlatform && C.isNativePlatform() && C.Plugins.Filesystem && C.Plugins.Share) {
    try { const r = await C.Plugins.Filesystem.writeFile({ path: name, data, directory: 'CACHE', encoding: 'utf8' }); await C.Plugins.Share.share({ title: name, url: r.uri }); return; } catch { /* fall back */ }
  }
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([data], { type })); a.download = name; document.body.appendChild(a); a.click(); a.remove();
}

export function settingsView(root) {
  const S = state(); const st = S.settings;
  root.innerHTML = `<div class="page narrow"><a class="back" href="#/me">${icon('back')}<span>Progress</span></a><header class="page-head"><h1>Settings</h1></header>
    ${paywall.membershipHTML({ heading: 'Membership', headingTag: 'h2' })}
    <section class="card pad set"><h2>Your profile</h2>
      <label class="field">Your name (optional)<input type="text" data-k="profile.name" value="${esc(S.profile.name)}" maxlength="40" autocomplete="nickname"></label>
      <label class="field">Main instrument<select data-k="profile.instrument">${INSTRUMENTS.map((i) => `<option value="${i.id}" ${S.profile.instrument === i.id ? 'selected' : ''}>${esc(i.name)}</option>`).join('')}</select></label>
      <label class="field">Daily goal<select data-k="profile.goal" data-num>${[5, 10, 15, 20, 30, 45, 60].map((m) => `<option value="${m}" ${S.profile.goal === m ? 'selected' : ''}>${m} minutes</option>`).join('')}</select></label></section>
    <section class="card pad set"><h2>Listening</h2>
      <label class="field">How the app hears you<select data-k="settings.input"><option value="auto" ${st.input === 'auto' ? 'selected' : ''}>Automatic (MIDI keyboard if connected, otherwise microphone)</option><option value="mic" ${st.input === 'mic' ? 'selected' : ''}>Microphone</option><option value="midi" ${st.input === 'midi' ? 'selected' : ''}>MIDI keyboard</option></select></label>
      <div class="row"><button class="btn ghost sm" data-a="mic">${icon('mic')}<span>Test microphone</span></button><button class="btn ghost sm" data-a="midi">${icon('midi')}<span>Find MIDI keyboard</span></button></div>
      <p class="muted small" data-r="io">${esc(ioText())}</p>
      <label class="field">Timing correction: <output data-r="lat">${Math.round(st.latency * 1000)} ms</output><input type="range" min="0" max="250" step="5" value="${Math.round(st.latency * 1000)}" data-k="settings.latency" data-ms></label>
      <button class="btn ghost sm" data-a="cal">Measure it</button>
      <p class="muted small">If the app often says you are late when you are on the beat, measure the delay: clap along with eight clicks.</p></section>
    <section class="card pad set"><h2>Sound and display</h2>
      <label class="field">Note names under the notes<select data-k="settings.names"><option value="letters" ${st.names === 'letters' ? 'selected' : ''}>Letters (C D E)</option><option value="solfege" ${st.names === 'solfege' ? 'selected' : ''}>Solfège (Do Re Mi)</option><option value="off" ${st.names === 'off' ? 'selected' : ''}>Off</option></select></label>
      <label class="field">Metronome volume<input type="range" min="0" max="1" step="0.05" value="${st.clickVol}" data-k="settings.clickVol" data-num></label>
      <label class="field">Backing band volume<input type="range" min="0" max="1" step="0.05" value="${st.backingVol}" data-k="settings.backingVol" data-num></label>
      <label class="field">Appearance<select data-k="settings.theme"><option value="system" ${st.theme === 'system' ? 'selected' : ''}>Match device</option><option value="light" ${st.theme === 'light' ? 'selected' : ''}>Light</option><option value="dark" ${st.theme === 'dark' ? 'selected' : ''}>Dark</option></select></label></section>
    <section class="card pad set"><h2>Your data</h2><p class="muted small">Everything stays on this device. Nothing is uploaded. Make a backup before changing phones.</p>
      <div class="row"><button class="btn ghost sm" data-a="export">${icon('share')}<span>Back up</span></button><label class="btn ghost sm file">${icon('doc')}<span>Restore</span><input type="file" accept="application/json,.json" data-a="import" hidden></label><button class="btn ghost sm danger" data-a="reset">Erase everything</button></div></section>
    <section class="card pad set"><h2>About</h2><p class="muted small">Vilasi Music by Vilasi, Inc. Version 1.0.0.</p><div class="row"><a class="btn ghost sm" href="support.html">Help</a><a class="btn ghost sm" href="privacy.html">Privacy</a><a class="btn ghost sm" href="terms.html">Terms</a></div><p class="muted small">Music notation by VexFlow (MIT License). Fonts: Inter and Fraunces (SIL Open Font License).</p></section></div>`;
  const R = (n) => root.querySelector(`[data-r="${n}"]`);
  root.addEventListener('change', (e) => {
    const k = e.target.dataset.k; if (!k) return;
    let v = e.target.value; if (e.target.dataset.num != null) v = Number(v); if (e.target.dataset.ms != null) v = Number(v) / 1000;
    const [a, b] = k.split('.'); update((s) => { s[a][b] = v; });
    if (k === 'settings.theme') applyTheme();
  });
  root.addEventListener('input', (e) => { if (e.target.dataset.ms != null) R('lat').textContent = `${e.target.value} ms`; });
  root.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-a]'); if (!b) return; const a = b.dataset.a;
    if (a === 'mic') { await input.startMic(); R('io').textContent = ioText(); if (input.micOn()) { let n = 0; const off = input.on('frame', (f) => { if (f.midiF && f.clarity > 0.85) { R('io').textContent = `Microphone works. Hearing ${f.freq.toFixed(1)} Hz.`; } if (++n > 400) { off(); input.stopMic(); } }); } }
    if (a === 'midi') { await input.startMidi(); R('io').textContent = ioText(); }
    if (a === 'cal') calibrate(R);
    if (a === 'export') { const data = exportData(); const name = `music-lessons-backup-${dayKey()}.json`; const C = window.Capacitor; if (C && C.isNativePlatform && C.isNativePlatform() && C.Plugins.Filesystem) { try { const r = await C.Plugins.Filesystem.writeFile({ path: name, data, directory: 'CACHE', encoding: 'utf8' }); await C.Plugins.Share.share({ title: name, url: r.uri }); return; } catch { /* fall back */ } } const x = document.createElement('a'); x.href = URL.createObjectURL(new Blob([data], { type: 'application/json' })); x.download = name; x.click(); }
    if (a === 'reset') { sheet(`<h2>Erase everything?</h2><p>This removes your progress, streak, log and settings from this device. Purchases are not affected and can be restored.</p><div class="row"><button class="btn ghost" data-close>Cancel</button><button class="btn danger" data-a="yes">Erase</button></div>`).el.addEventListener('click', (ev) => { if (ev.target.closest('[data-a="yes"]')) { resetAll(); location.hash = '#/welcome'; location.reload(); } }); }
  });
  root.querySelector('[data-a="import"]').addEventListener('change', async (e) => { const f = e.target.files[0]; if (!f) return; try { importData(await f.text()); toast('Backup restored.'); location.hash = '#/'; } catch (err) { toast(err.message || 'That file could not be read.'); } });
}
function ioText() { const s = input.status; const parts = []; parts.push(s.mic === 'on' ? 'Microphone on.' : s.mic === 'denied' ? s.micError : s.mic === 'unsupported' ? 'This device has no microphone access here.' : 'Microphone off until a lesson needs it.'); parts.push(s.midi === 'on' ? `MIDI: ${s.midiName || 'connected'}.` : s.midi === 'none' ? 'No MIDI keyboard found. Plug one in by USB or connect over Bluetooth, then try again.' : s.midi === 'unsupported' ? 'This device does not offer MIDI keyboards to the app. The microphone works with any piano or keyboard.' : ''); return parts.filter(Boolean).join(' '); }
async function calibrate(R) {
  await input.startMic(); if (!input.micOn()) { R('io').textContent = 'Calibration needs the microphone.'; return; }
  const a = audio(); const G = group(1); const spb = 0.6; const t0 = a.currentTime + 0.5 + 4 * spb; const taps = [];
  for (let i = 0; i < 12; i++) click(t0 - 4 * spb + i * spb, i % 4 === 0, G);
  R('io').textContent = 'Four clicks count in, then clap on the next eight clicks.';
  const off = input.on('onset', (o) => { if (o.t > t0 - 0.2) taps.push(o.t); });
  setTimeout(() => {
    off(); const offs = taps.map((t) => { const k = Math.round((t - t0) / spb); return t - (t0 + k * spb); }).filter((d) => d > -0.1 && d < 0.3);
    if (offs.length < 4) { R('io').textContent = 'Not enough claps were heard. Try again a little louder.'; return; }
    offs.sort((x, y) => x - y); const med = offs[Math.floor(offs.length / 2)];
    const v = Math.max(0, Math.min(0.25, med)); update((s) => { s.settings.latency = v; });
    R('lat').textContent = `${Math.round(v * 1000)} ms`; document.querySelector('[data-k="settings.latency"]').value = Math.round(v * 1000);
    R('io').textContent = `Done. Timing correction set to ${Math.round(v * 1000)} ms.`;
  }, (t0 - a.currentTime + 8 * spb + 0.5) * 1000);
}
export function applyTheme() {
  const t = state().settings.theme; const r = document.documentElement;
  if (t === 'system') r.removeAttribute('data-theme'); else r.setAttribute('data-theme', t);
  // Match the status bar text to the theme in the phone apps.
  const dark = t === 'dark' || (t === 'system' && window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
  const SB = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.StatusBar;
  if (SB && window.Capacitor.isNativePlatform()) SB.setStyle({ style: dark ? 'DARK' : 'LIGHT' }).catch(() => {});
}
