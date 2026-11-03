const C='kitchen-v1';
self.addEventListener('install',e=>e.waitUntil(caches.open(C).then(c=>c.addAll(['./','index.html','manifest.json','icon.svg']))));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET'||e.request.url.includes('/api/'))return;e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)))});
