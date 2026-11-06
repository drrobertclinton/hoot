// App shell: hash router, tab bar, theme, service worker.
import { state, onChange } from './state.js';
import { billing } from './gates.js';
import { homeView } from './views/home.js';
import { instrumentsView, courseView, reviewView, earView } from './views/learn.js';
import { lessonView } from './views/lesson.js';
import { practiceView, songView, metronomeView, tunerView, droneView, planView } from './views/practice.js';
import { meView, logView, settingsView, applyTheme } from './views/me.js';
import { onboardingView } from './views/onboarding.js';
import { icon } from './icons.js';
import * as input from './audio/input.js';

let cleanup = null;
const routes = [
  [/^\/?$/, 'home', (r) => homeView(r)],
  [/^\/welcome$/, null, (r) => onboardingView(r)],
  [/^\/instruments$/, 'learn', (r) => instrumentsView(r)],
  [/^\/learn$/, 'learn', (r) => courseView(r, state().profile.instrument)],
  [/^\/course\/([a-z]+)$/, 'learn', (r, m) => courseView(r, m[1])],
  [/^\/lesson\/([a-z0-9-]+)$/, null, (r, m) => lessonView(r, m[1])],
  [/^\/theory$/, 'theory', (r) => courseView(r, 'theory')],
  [/^\/review$/, 'theory', (r) => reviewView(r)],
  [/^\/ear$/, 'theory', (r) => earView(r)],
  [/^\/ear\/(\d+)$/, 'theory', (r, m) => earView(r, m[1])],
  [/^\/practice$/, 'practice', (r) => practiceView(r)],
  [/^\/song\/([a-z0-9-]+)$/, 'practice', (r, m) => songView(r, m[1])],
  [/^\/tools\/metronome$/, 'practice', (r) => metronomeView(r)],
  [/^\/tools\/tuner$/, 'practice', (r) => tunerView(r)],
  [/^\/tools\/drone$/, 'practice', (r) => droneView(r)],
  [/^\/plan$/, 'practice', (r) => planView(r)],
  [/^\/me$/, 'me', (r) => meView(r)],
  [/^\/log$/, 'me', (r) => logView(r)],
  [/^\/settings$/, 'me', (r) => settingsView(r)],
];

/** Render the current route into a fresh <main> so listeners from the previous screen are dropped. */
export function route() {
  const path = (location.hash.replace(/^#/, '') || '/').split('?')[0];
  if (!state().onboarded && path !== '/welcome') { location.replace('#/welcome'); return; }
  if (typeof cleanup === 'function') { try { cleanup(); } catch (e) { console.warn(e); } }
  cleanup = null;
  if (!/^\/(lesson|song|tools)/.test(path)) input.stopMic();
  const old = document.getElementById('app'); const root = old.cloneNode(false); old.replaceWith(root);
  for (const [re, tab, fn] of routes) {
    const m = path.match(re); if (!m) continue;
    document.body.dataset.view = tab || 'full';
    document.querySelectorAll('.tabs a[data-tab]').forEach((a) => { if (a.dataset.tab === tab) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    const r = fn(root, m); if (typeof r === 'function') cleanup = r;
    window.scrollTo(0, 0);
    return;
  }
  location.replace('#/');
}

function shell() {
  const tabs = document.getElementById('tabs');
  tabs.innerHTML = `<a class="tabs-brand" href="#/" aria-label="Vilasi Music home"><span class="brandmark" aria-hidden="true"></span><span class="brandname">Vilasi Music</span></a>
    <a data-tab="home" href="#/">${icon('home')}<span>Today</span></a>
    <a data-tab="learn" href="#/learn">${icon('learn')}<span>Learn</span></a>
    <a data-tab="theory" href="#/theory">${icon('theory')}<span>Theory</span></a>
    <a data-tab="practice" href="#/practice">${icon('tools')}<span>Practice</span></a>
    <a data-tab="me" href="#/me">${icon('me')}<span>Me</span></a>
    <p class="tabs-foot">© 2026 Vilasi, Inc.</p>`;
}
shell(); applyTheme();
billing.onChange(() => { if (!/lesson|song/.test(location.hash)) route(); });
window.addEventListener('hashchange', route);
route();
if ('serviceWorker' in navigator && location.protocol !== 'file:' && !(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform())) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
