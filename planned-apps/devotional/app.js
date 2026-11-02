/* Who Is in Charge? Daily: 30-day men's devotional. Everything stays on this device. */
const { $, $$, esc, store, day, addDays, fmtDay, uid, toast, sheet, closeSheet, tabs, dataCard, download, registerSW } = Core;
const st = store('devotional', { start: '', reminder: '06:30', read: {}, did: {}, journal: {}, checkin: {} });
const D = st.data;
const N = DAYS.length;
const BOOK_URL = 'https://hope.robertclintonmd.com/books';
const CTP_URL = 'https://calledtopray.app';
const TRANSLATION = 'Scripture quotations are from the World English Bible (WEB), which is in the public domain.';

const curDay = () => { if (!D.start) return 1; const n = Math.floor((new Date(day() + 'T12:00:00') - new Date(D.start + 'T12:00:00')) / 864e5) + 1; return Math.max(1, Math.min(N, n)); };
const paras = t => t.split(/\n\n+/).map(p => `<p>${esc(p)}</p>`).join('');

function welcome(el) {
  el.innerHTML = `<div class="card hero" style="margin-top:18px"><p class="eyebrow">30 days for men and fathers</p>
    <div class="dtitle">Who is really in charge of your life?</div>
    <p class="serif" style="font-size:1.1rem">One short thought, one Scripture and one thing to do today. Five minutes in the morning. A quick check-in at night. That's it.</p>
    <p class="small muted">Written as a companion to <i>Who Is in Charge? A Father's Drawing About Faith, Family, Failure, and What Matters Most</i> by Robert Clinton, MD.</p></div>
  <div class="card"><h3>When do you want to read?</h3><p class="small muted">Pick a time. We'll add a daily reminder to your phone's calendar.</p>
    <input class="i" type="time" id="wt" value="${esc(D.reminder)}">
    <button class="btn block mt" id="wgo">Start Day 1 today</button>
    <button class="btn ghost block mt" id="wskip">Just look around</button></div>
  <p class="disclaimer">Your journal stays on this phone. No account, no ads. ${TRANSLATION}</p>`;
  $('#wgo', el).onclick = () => { D.start = day(); D.reminder = $('#wt', el).value || '06:30'; st.save(); calendarFile(); location.hash = 'today'; App.refresh(); };
  $('#wskip', el).onclick = () => { D.start = day(); st.save(); App.refresh(); };
}

function renderToday(el, [n]) {
  if (!D.start) return welcome(el);
  const i = n ? Math.max(1, Math.min(N, +n)) : curDay();
  const d = DAYS[i - 1];
  if (!D.read[i]) { D.read[i] = day(); st.save(); }
  const ci = D.checkin[i];
  el.innerHTML = `
  <div class="row" style="margin-top:16px"><span class="eyebrow" style="flex:1">Day ${i} of ${N} · ${esc(d.week)}</span>
    ${i > 1 ? `<a class="btn ghost sm" href="#today/${i - 1}" aria-label="Previous day">‹</a>` : ''}${i < N ? `<a class="btn ghost sm" href="#today/${i + 1}" aria-label="Next day">›</a>` : ''}</div>
  <div class="dtitle">${esc(d.title)}</div>
  <div class="scripture">${esc(d.verse)}</div><div class="ref">${esc(d.ref)} (WEB)</div>
  <div class="row mt"><button class="btn ghost sm" id="listen">▶ Listen</button><span class="small muted">Robert's recorded readings are coming.</span></div>
  <div class="thought mt">${paras(d.thought)}</div>
  <div class="card hero"><p class="eyebrow">Today's one thing</p><p class="serif" style="font-size:1.12rem;margin:6px 0 12px">${esc(d.act)}</p>
    <button class="btn ${D.did[i] ? 'ghost' : ''} block" id="did">${D.did[i] ? '✓ Done. Well done.' : 'I did it'}</button></div>
  <div class="card"><p class="eyebrow">Think it through</p><p class="serif" style="font-size:1.1rem;margin:6px 0">${esc(d.ask)}</p>
    <textarea class="i" id="jr" placeholder="Write a few honest lines. Only you can see this.">${esc(D.journal[i] || '')}</textarea>
    <p class="small muted" id="jsaved">Saved on this phone as you type.</p></div>
  <div class="card"><h3>Evening check-in</h3><p class="small muted">How did today's one thing go? No grades. Just honesty.</p>
    <div class="chips" id="ci">${['Did it', 'Partly', 'Not today', 'Need prayer'].map(x => `<button class="chip" aria-pressed="${ci === x}">${x}</button>`).join('')}</div>
    ${ci === 'Not today' ? '<p class="small mt serif">That\'s all right. His mercies are new every morning. Try again tomorrow.</p>' : ''}
    ${ci === 'Need prayer' ? `<p class="small mt">Tell a brother you trust, or write it down in <a href="${CTP_URL}" target="_blank" rel="noopener">Called to Pray</a> so you remember to keep praying.</p>` : ''}</div>
  ${i === N ? `<div class="card hero"><h3>You finished 30 days.</h3><p class="small">Read it again with a friend, or go deeper with the 12-week <i>Who Is in Charge? Study Guide</i> for men's groups.</p><a class="btn sm" href="${BOOK_URL}" target="_blank" rel="noopener">See the books</a></div>` : ''}
  <p class="disclaimer">${TRANSLATION}</p>`;
  $('#did', el).onclick = () => { D.did[i] ? delete D.did[i] : (D.did[i] = day()); st.save(); if (D.did[i]) toast('Good. Keep going.'); App.refresh(); };
  let tm; $('#jr', el).oninput = e => { clearTimeout(tm); tm = setTimeout(() => { const v = e.target.value.trim(); v ? D.journal[i] = e.target.value : delete D.journal[i]; st.save(); $('#jsaved', el).textContent = 'Saved ✓'; }, 400); };
  $('#ci', el).onclick = e => { const b = e.target.closest('.chip'); if (!b) return; D.checkin[i] = D.checkin[i] === b.textContent ? undefined : b.textContent; if (D.checkin[i] === 'Did it') D.did[i] = D.did[i] || day(); st.save(); App.refresh(); };
  $('#listen', el).onclick = () => listen(d);
  $('#share').onclick = () => shareDay(d);
}

function listen(d) {
  if (!('speechSynthesis' in window)) { toast('Listening is not supported in this browser'); return; }
  if (speechSynthesis.speaking) { speechSynthesis.cancel(); return; }
  const u = new SpeechSynthesisUtterance(`${d.title}. ${d.ref.replace('–', ' to ')}. ${d.verse} ${d.thought.replace(/\n+/g, ' ')} Today's one thing. ${d.act} Think it through. ${d.ask}`);
  u.rate = .95; const v = speechSynthesis.getVoices().find(v => /en[-_]US/.test(v.lang) && /male|daniel|alex|aaron|fred/i.test(v.name)) || speechSynthesis.getVoices().find(v => /^en/.test(v.lang)); if (v) u.voice = v;
  speechSynthesis.speak(u); toast('Reading aloud. Tap Listen again to stop.');
}
function shareDay(d) {
  const text = `“${d.verse}” ${d.ref} (WEB)\n\nToday's one thing: ${d.act}`;
  if (navigator.share) navigator.share({ title: d.title, text, url: location.origin + location.pathname }).catch(() => { });
  else navigator.clipboard?.writeText(text).then(() => toast('Copied to share'));
}

function renderPlan(el) {
  if (!D.start) return welcome(el);
  const c = curDay(); const read = Object.keys(D.read).length, did = Object.keys(D.did).length;
  let wk = '';
  el.innerHTML = `<h2>Your 30 days</h2>
  <div class="grid3"><div class="stat"><b>${read}</b><span>Days read</span></div><div class="stat"><b>${did}</b><span>Things done</span></div><div class="stat"><b>${Object.keys(D.journal).length}</b><span>Journal entries</span></div></div>
  <p class="small muted mt">Miss a day? Just pick up where you are. There are no streaks to break here.</p>
  <div class="card"><div class="daygrid">${DAYS.map(d => `<button class="${D.read[d.day] ? 'read' : ''} ${D.did[d.day] ? 'did' : ''} ${d.day === c ? 'cur' : ''}" data-d="${d.day}" aria-label="Day ${d.day}">${d.day}</button>`).join('')}</div>
  <p class="small muted mt">Shaded = read · Gold dot = did the one thing · Outline = today</p></div>
  <ul class="list card">${DAYS.map(d => { const h = d.week !== wk ? (wk = d.week, `<li style="border:0;padding-bottom:0"><span class="eyebrow">${esc(d.week)}</span></li>`) : ''; return h + `<li data-d="${d.day}" style="cursor:pointer"><span class="pill">${d.day}</span><div class="grow"><b>${esc(d.title)}</b><div class="small muted">${esc(d.ref)}</div></div>${D.did[d.day] ? '✓' : ''}</li>`; }).join('')}</ul>`;
  el.onclick = e => { const b = e.target.closest('[data-d]'); if (b) location.hash = 'today/' + b.dataset.d; };
}

function renderJournal(el) {
  const ks = Object.keys(D.journal).map(Number).sort((a, b) => b - a);
  el.innerHTML = `<h2>Journal</h2><p class="small muted">Private. It never leaves this phone unless you export it.</p>
  ${ks.length ? ks.map(k => `<div class="card"><p class="eyebrow">Day ${k} · ${esc(DAYS[k - 1].title)}</p><p class="small muted serif" style="font-style:italic">${esc(DAYS[k - 1].ask)}</p><p class="serif" style="white-space:pre-wrap">${esc(D.journal[k])}</p><a class="small" href="#today/${k}">Open day ${k}</a></div>`).join('')
      : '<div class="empty card">Your reflections will show up here.</div>'}
  ${ks.length ? '<button class="btn ghost sm" id="jexp">Save journal as a text file</button>' : ''}`;
  const b = $('#jexp', el); if (b) b.onclick = () => download('my-journal.txt', ks.slice().reverse().map(k => `Day ${k}: ${DAYS[k - 1].title}\n${DAYS[k - 1].ask}\n\n${D.journal[k]}\n`).join('\n----\n\n'), 'text/plain');
}

function renderMore(el) {
  el.innerHTML = `<h2>More</h2>
  <div class="card"><h3>Become a Christian</h3><p class="small muted">If you're not sure where you stand with God, start here.</p><button class="btn sm" id="gospel">Read this first</button></div>
  <div class="card"><h3>Daily reminder</h3><p class="small muted">Adds a repeating reminder to your phone's calendar at the time you choose.</p>
    <div class="row"><input class="i" type="time" id="rt" value="${esc(D.reminder)}" style="max-width:150px"><button class="btn ghost sm" id="rset">Add to calendar</button></div></div>
  <div class="card"><h3>The book</h3><p class="small"><i>Who Is in Charge? A Father's Drawing About Faith, Family, Failure, and What Matters Most</i>, The Captain's Compass, Book One, by Robert Clinton, MD. There's also a 12-week study guide and leader's guide for men's groups.</p><a class="btn ghost sm" href="${BOOK_URL}" target="_blank" rel="noopener">See the books</a></div>
  <div class="card"><h3>Pray with Called to Pray</h3><p class="small muted">Daily Scripture, a prayer journal and prayer lists for the people you carry.</p><a class="btn ghost sm" href="${CTP_URL}" target="_blank" rel="noopener">Open Called to Pray</a></div>
  <div class="card"><h3>Start over</h3><p class="small muted">Begin Day 1 again today. Your journal is kept.</p><button class="btn ghost sm" id="restart">Restart the plan</button></div>
  <div id="dc"></div>
  <p class="disclaimer">${TRANSLATION} Devotional text © Robert Clinton, MD / Vilasi, Inc. No ads. Nothing you write is sent anywhere.</p>`;
  $('#gospel', el).onclick = gospel;
  $('#rset', el).onclick = () => { D.reminder = $('#rt', el).value || D.reminder; st.save(); calendarFile(); };
  $('#restart', el).onclick = () => { D.start = day(); D.read = {}; D.did = {}; D.checkin = {}; st.save(); toast('Day 1 starts today'); location.hash = 'today'; };
  $('#dc', el).appendChild(dataCard(st, 'Who Is in Charge Daily'));
}

function gospel() {
  sheet(`<p class="eyebrow">Who is in charge?</p><div class="dtitle" style="font-size:1.6rem">Knowing God, not just knowing about him</div>
  <div class="thought"><p>God made you, loves you and wants you to know him. But all of us have gone our own way.</p>
  <div class="scripture" style="font-size:1.05rem">For all have sinned, and fall short of the glory of God.</div><div class="ref">Romans 3:23</div>
  <p class="mt">Sin separates us from God, and we can't fix that by trying harder.</p>
  <div class="scripture" style="font-size:1.05rem">For the wages of sin is death, but the free gift of God is eternal life in Christ Jesus our Lord.</div><div class="ref">Romans 6:23</div>
  <p class="mt">Jesus, God's Son, died in our place and rose again. Forgiveness is a gift you receive, not a wage you earn.</p>
  <div class="scripture" style="font-size:1.05rem">For God so loved the world, that he gave his one and only Son, that whoever believes in him should not perish, but have eternal life.</div><div class="ref">John 3:16</div>
  <div class="scripture mt" style="font-size:1.05rem">If you will confess with your mouth that Jesus is Lord, and believe in your heart that God raised him from the dead, you will be saved.</div><div class="ref">Romans 10:9</div>
  <p class="mt">If you're ready, you can tell God in your own words. Something like: <i>"God, I've been running my own life, and I'm sorry. I believe Jesus died for me and rose again. I want him to be in charge now. Thank you for forgiving me. Amen."</i></p>
  <p>Then tell someone, find a church that teaches the Bible, and keep reading. You don't have to have it all figured out.</p></div>
  <a class="btn block" href="https://hope.robertclintonmd.com" target="_blank" rel="noopener">Learn more</a>
  <p class="small muted mt">Scripture from the World English Bible.</p>`);
}

function calendarFile() {
  const [h, m] = (D.reminder || '06:30').split(':');
  const dt = (D.start || day()).replace(/-/g, '') + 'T' + h + m + '00';
  const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Vilasi//Who Is in Charge Daily//EN', 'BEGIN:VEVENT', 'UID:' + uid() + '@wic-daily', 'DTSTAMP:' + new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z',
    'DTSTART:' + dt, 'DURATION:PT10M', 'RRULE:FREQ=DAILY;COUNT=30', 'SUMMARY:Who Is in Charge? Daily', 'DESCRIPTION:Five minutes: one thought\\, one Scripture\\, one thing to do today. ' + location.href.split('#')[0],
    'BEGIN:VALARM', 'TRIGGER:PT0M', 'ACTION:DISPLAY', 'DESCRIPTION:Time for today\'s devotional', 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  download('who-is-in-charge-daily.ics', ics, 'text/calendar'); toast('Open the file to add the reminder');
}

const App = tabs([
  { id: 'today', label: 'Today', icon: '<path d="M12 3v3M12 18v3M3 12h3M18 12h3"/><circle cx="12" cy="12" r="4"/>', render: renderToday },
  { id: 'plan', label: '30 days', icon: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/>', render: renderPlan },
  { id: 'journal', label: 'Journal', icon: '<path d="M4 4h12a4 4 0 0 1 4 4v12H8a4 4 0 0 1-4-4z"/><path d="M8 9h8M8 13h6"/>', render: renderJournal },
  { id: 'more', label: 'More', icon: '<circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>', render: renderMore }
], $('#main'));
registerSW();
