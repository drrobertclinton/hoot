// DOM helpers shared across screens.
export const $ = (sel, el = document) => el.querySelector(sel);
export const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export function el(html) { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; }
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const shuffle = (a) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
export const pick = (a) => a[Math.floor(Math.random() * a.length)];

let toastT;
export function toast(msg, ms = 2600) {
  const t = document.getElementById('toast'); if (!t) return;
  t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), ms);
}
/** Simple sheet/modal. Returns { close, el }. */
export function sheet(html, { onClose, wide = false, label = 'Dialog' } = {}) {
  const prev = document.activeElement;
  const scrim = el(`<div class="scrim"><div class="sheet${wide ? ' wide' : ''}" role="dialog" aria-modal="true" aria-label="${esc(label)}">${html}</div></div>`);
  document.body.appendChild(scrim); document.body.classList.add('noscroll');
  const close = () => { scrim.remove(); document.body.classList.remove('noscroll'); document.removeEventListener('keydown', key, true); onClose && onClose(); try { prev && prev.focus(); } catch { /* ignore */ } };
  const key = (e) => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
  document.addEventListener('keydown', key, true);
  scrim.addEventListener('click', (e) => { if (e.target === scrim || e.target.closest('[data-close]')) close(); });
  setTimeout(() => (scrim.querySelector('button, [tabindex], input') || scrim).focus(), 30);
  return { close, el: scrim };
}
export function fmtMins(m) { m = Math.round(m); if (m < 60) return `${m} min`; return `${Math.floor(m / 60)} h ${m % 60} min`; }
export function relDay(ts) {
  const d = new Date(ts), now = new Date(); const day = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((day(now) - day(d)) / 86400000);
  if (diff === 0) return 'Today'; if (diff === 1) return 'Yesterday';
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}
export function confetti(host = document.body) {
  const c = el('<div class="confetti" aria-hidden="true"></div>');
  const colors = ['#ff6a4d', '#ffc533', '#5b4cf0', '#12b5a6', '#e2557a'];
  for (let i = 0; i < 46; i++) {
    const p = document.createElement('i');
    p.style.left = Math.random() * 100 + '%'; p.style.background = colors[i % colors.length];
    p.style.animationDelay = (Math.random() * 0.4) + 's'; p.style.animationDuration = (1.4 + Math.random() * 1.2) + 's';
    p.style.transform = `rotate(${Math.random() * 360}deg)`;
    c.appendChild(p);
  }
  host.appendChild(c); setTimeout(() => c.remove(), 3200);
}
