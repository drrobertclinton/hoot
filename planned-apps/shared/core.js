/* Coressence app family: shared helpers. Served at /app/shared/core.js
   Everything stays on the person's device (localStorage). No accounts, no analytics. */
(function(){
  const $ = (s, el=document) => el.querySelector(s);
  const $$ = (s, el=document) => [...el.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function store(ns, defaults){
    const key = 'coressence.' + ns + '.v1';
    let data;
    try { data = Object.assign(structuredClone(defaults), JSON.parse(localStorage.getItem(key) || '{}')); }
    catch(e){ data = structuredClone(defaults); }
    return {
      get data(){ return data; },
      save(){ try { localStorage.setItem(key, JSON.stringify(data)); } catch(e){ toast('Could not save on this device'); } },
      reset(){ data = structuredClone(defaults); try { localStorage.removeItem(key); } catch(e){} },
      exportJSON(){ return JSON.stringify({app:ns, exported:new Date().toISOString(), data}, null, 2); },
      importJSON(txt){ const o = JSON.parse(txt); if(o.app !== ns) throw new Error('This file is from a different app.'); data = Object.assign(structuredClone(defaults), o.data); this.save(); }
    };
  }

  const day = (d=new Date()) => { const x = new Date(d); return x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')+'-'+String(x.getDate()).padStart(2,'0'); };
  const addDays = (iso, n) => { const d = new Date(iso+'T12:00:00'); d.setDate(d.getDate()+n); return day(d); };
  const fmtDay = (iso, opts={weekday:'short', month:'short', day:'numeric'}) => new Date(iso+'T12:00:00').toLocaleDateString(undefined, opts);
  const fmtTime = ms => { const s = Math.max(0, Math.round(ms/1000)); const m = Math.floor(s/60); return m + ':' + String(s%60).padStart(2,'0'); };
  const uid = () => Math.random().toString(36).slice(2,10) + Date.now().toString(36).slice(-4);

  let tt;
  function toast(msg){
    let t = $('#toast'); if(!t){ t = document.createElement('div'); t.id='toast'; t.className='toast'; t.setAttribute('role','status'); document.body.appendChild(t); }
    t.textContent = msg; t.classList.add('on'); clearTimeout(tt); tt = setTimeout(()=>t.classList.remove('on'), 2400);
  }

  function sheet(html, onMount){
    let s = $('#sheet'); if(!s){ s = document.createElement('div'); s.id='sheet'; s.className='sheet'; s.innerHTML='<div class="panel" role="dialog" aria-modal="true"></div>'; document.body.appendChild(s);
      s.addEventListener('click', e => { if(e.target === s) closeSheet(); }); }
    $('.panel', s).innerHTML = '<div class="grab"></div>' + html;
    s.classList.add('on'); document.body.style.overflow='hidden';
    onMount && onMount($('.panel', s));
  }
  function closeSheet(){ const s = $('#sheet'); if(s){ s.classList.remove('on'); document.body.style.overflow=''; } }
  document.addEventListener('keydown', e => { if(e.key === 'Escape') closeSheet(); });

  /* Tabs: [{id, label, icon(svg path d), render(el)}] */
  function tabs(list, mountEl){
    const bar = document.createElement('nav'); bar.className='tabs'; bar.setAttribute('aria-label','Sections');
    bar.innerHTML = '<div class="in">' + list.map(t => `<button data-tab="${t.id}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${t.icon}</svg>${esc(t.label)}</button>`).join('') + '</div>';
    document.body.appendChild(bar);
    function go(){
      closeSheet();
      const id = (location.hash.slice(1).split('/')[0]) || list[0].id;
      const t = list.find(x => x.id === id) || list[0];
      $$('button', bar).forEach(b => b.setAttribute('aria-current', b.dataset.tab === t.id ? 'page' : 'false'));
      mountEl.innerHTML = ''; t.render(mountEl, location.hash.slice(1).split('/').slice(1)); window.scrollTo(0,0);
    }
    bar.addEventListener('click', e => { const b = e.target.closest('button'); if(b) location.hash = b.dataset.tab; });
    addEventListener('hashchange', go); go();
    return { refresh: go };
  }

  /* Small SVG line chart. series: [{points:[[label,value]], cls:'ln'|'ln2'}] */
  function lineChart(series, {h=160, unit='', min, max}={}){
    const all = series.flatMap(s => s.points.map(p => p[1])).filter(v => v != null && !isNaN(v));
    if(!all.length) return '<p class="empty">No entries yet.</p>';
    let lo = min ?? Math.min(...all), hi = max ?? Math.max(...all); if(hi === lo){ hi += 1; lo -= 1; }
    const W = 320, H = h, L = 30, R = 8, T = 10, B = 22;
    const n = Math.max(...series.map(s => s.points.length));
    const x = i => L + (n<=1 ? (W-L-R)/2 : i*(W-L-R)/(n-1));
    const y = v => T + (1-(v-lo)/(hi-lo))*(H-T-B);
    let svg = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img">`;
    [lo, (lo+hi)/2, hi].forEach(v => { svg += `<line class="ax" x1="${L}" x2="${W-R}" y1="${y(v)}" y2="${y(v)}"/><text x="2" y="${y(v)+3}">${Math.round(v*10)/10}</text>`; });
    series.forEach((s, si) => {
      const pts = s.points.map((p,i)=>[i,p[1]]).filter(p => p[1] != null && !isNaN(p[1]));
      if(pts.length > 1) svg += `<polyline class="${s.cls||'ln'}" points="${pts.map(p=>x(p[0])+','+y(p[1])).join(' ')}"/>`;
      pts.forEach(p => svg += `<circle class="${(s.cls||'ln')==='ln2'?'dt2':'dt'}" cx="${x(p[0])}" cy="${y(p[1])}" r="3.2"/>`);
    });
    const pts0 = series[0].points; const step = Math.ceil(pts0.length/6);
    pts0.forEach((p,i) => { if(i%step===0 || i===pts0.length-1) svg += `<text x="${x(i)}" y="${H-6}" text-anchor="middle">${esc(p[0])}</text>`; });
    return svg + '</svg>';
  }

  function download(name, text, type='application/json'){
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], {type})); a.download = name; document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  /* Standard "Your data" card: export, import, delete all */
  function dataCard(st, appName){
    const el = document.createElement('div'); el.className='card';
    el.innerHTML = `<h3>Your data</h3><p class="small muted">${esc(appName)} keeps everything on this device only. Nothing is sent to Vilasi or anyone else. Clearing your browser data erases it, so export a backup now and then.</p>
      <div class="row wrap mt"><button class="btn ghost sm" data-a="exp">Export backup</button><label class="btn ghost sm">Import backup<input type="file" accept="application/json" hidden data-a="imp"></label><button class="btn ghost sm" data-a="del" style="color:var(--bad)">Delete everything</button></div>`;
    el.addEventListener('click', e => {
      const a = e.target.dataset.a;
      if(a === 'exp') download(appName.toLowerCase().replace(/\W+/g,'-') + '-backup-' + day() + '.json', st.exportJSON());
      if(a === 'del') sheet(`<h3>Delete everything?</h3><p class="muted">This erases all of your ${esc(appName)} entries on this device. It can't be undone.</p><div class="row mt"><button class="btn danger" id="yesdel">Delete</button><button class="btn ghost" onclick="Core.closeSheet()">Cancel</button></div>`, p => {
        p.querySelector('#yesdel').onclick = () => { st.reset(); closeSheet(); toast('Deleted'); location.hash=''; location.reload(); };
      });
    });
    el.addEventListener('change', e => {
      if(e.target.dataset.a !== 'imp') return; const f = e.target.files[0]; if(!f) return;
      f.text().then(t => { try { st.importJSON(t); toast('Backup restored'); setTimeout(()=>location.reload(), 600); } catch(err){ toast(err.message || 'That file could not be read'); } });
    });
    return el;
  }

  function registerSW(path='sw.js'){
    if('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register(path).catch(()=>{});
  }

  const WELLNESS = 'For general wellness and education only. This app does not diagnose, treat or prevent any condition and is not a medical device. Talk with your own doctor before changing medications, supplements or exercise, and call 911 in an emergency.';

  window.Core = { $, $$, esc, store, day, addDays, fmtDay, fmtTime, uid, toast, sheet, closeSheet, tabs, lineChart, download, dataCard, registerSW, WELLNESS };
})();
