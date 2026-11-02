#!/bin/bash
# usage: mksw.sh <appdir> <cache-name>  -- writes sw.js precaching every file in appdir plus ../shared
cd "$1"; files=$(find . -type f ! -name sw.js ! -name '*.md' | sed 's|^\./||' | sort | awk '{printf "\"%s\",", $0}')
cat > sw.js <<JS
const C='$2';
const FILES=['./',${files}$( [ -f core.js ] || echo "'../shared/core.css','../shared/core.js'" )];
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;const u=new URL(e.request.url);if(u.origin!==location.origin)return;
e.respondWith(fetch(e.request).then(r=>{if(r.ok){const cp=r.clone();caches.open(C).then(c=>c.put(e.request,cp))}return r}).catch(()=>caches.match(e.request,{ignoreSearch:true}).then(r=>r||caches.match('./'))))});
JS
