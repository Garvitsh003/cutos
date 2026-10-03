const CACHE='cutos-v6-sync-20261004';
const ASSETS=["./", "./index.html", "./styles.css", "./app.js", "./meal-food.js?v=6", "./meal-food.css?v=6", "./manifest.webmanifest", "./sync-preserve.js?v=6", "./sync-config.js", "./sync-core.js?v=6", "./cloud-sync.js?v=6", "./cloud-sync.css?v=6", "./supabase.min.js"];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith('cutos-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
 if(e.request.method!=='GET'||new URL(e.request.url).origin!==self.location.origin)return;
 const allowed=ASSETS.map(p=>new URL(p,self.registration.scope).href);if(!allowed.includes(e.request.url))return;
 e.respondWith(fetch(e.request).then(r=>{if(r.ok){const copy=r.clone();e.waitUntil(caches.open(CACHE).then(c=>c.put(e.request,copy)));}return r;}).catch(()=>caches.match(e.request)));
});
