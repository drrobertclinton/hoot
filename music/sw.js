// Offline-first service worker for the web preview. Bump VERSION on every release so installed copies refresh.
const VERSION = 'vilasi-music-v1.0.3-web';
const SHELL = [
  './',
  'fonts/fraunces-latin-wght-italic.woff2',
  'fonts/fraunces-latin-wght-normal.woff2',
  'fonts/inter-latin-wght-normal.woff2',
  'icons/apple-touch-icon.png',
  'icons/favicon-32.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/maskable-512.png',

  'js/achievements.js',
  'js/app.js',
  'js/audio/engine.js',
  'js/audio/input.js',
  'js/billing-config.js',
  'js/content/courses.js',
  'js/content/dsl.js',
  'js/content/guitar.js',
  'js/content/instruments.js',
  'js/content/others.js',
  'js/content/piano.js',
  'js/content/songs.js',
  'js/content/theory.js',
  'js/core/music.js',
  'js/core/pitch.js',
  'js/core/scoring.js',
  'js/core/srs.js',
  'js/drills.js',
  'js/gates.js',
  'js/icons.js',
  'js/paid.js',
  'js/player.js',
  'js/state.js',
  'js/steps.js',
  'js/util.js',
  'js/views/home.js',
  'js/views/learn.js',
  'js/views/lesson.js',
  'js/views/me.js',
  'js/views/onboarding.js',
  'js/views/practice.js',
  'js/vilasi/billing-core.js',
  'js/vilasi/billing.js',
  'js/vilasi/paywall.css',
  'js/vilasi/paywall.js',
  'js/viz/diagrams.js',
  'js/viz/falling.js',
  'js/viz/notation.js',
  'manifest.webmanifest',
  'native/config.js',
  'native/native.css',
  'native/native.js',
  'privacy',
  'styles.css',
  'support',
  'terms',
  'vendor/vexflow/vexflow-bravura.js',
];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then((res) => { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); return res; })
      .catch(() => caches.match(req, { ignoreSearch: true }).then((hit) => hit || caches.match('./'))));
    return;
  }
  e.respondWith(caches.match(req, { ignoreSearch: true }).then((hit) => {
    const net = fetch(req).then((res) => { if (res.ok && res.status === 200) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); } return res; }).catch(() => hit);
    return hit || net;
  }));
});
