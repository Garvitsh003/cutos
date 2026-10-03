const CACHE = 'cutos-v4-ingredients-20261003';
const ASSETS = ['./','./index.html','./styles.css','./app.js','./meal-food.js?v=4','./meal-food.css?v=4','./manifest.webmanifest'];
self.addEventListener('install', e => {e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()));});
self.addEventListener('activate', e => {e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith('cutos-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch', e => {
 if(e.request.method!=='GET'||new URL(e.request.url).origin!==self.location.origin)return;
 const allowed=ASSETS.map(p=>new URL(p,self.registration.scope).href);
 if(!allowed.includes(e.request.url))return;
 e.respondWith(fetch(e.request).then(r=>{if(r.ok){const copy=r.clone();e.waitUntil(caches.open(CACHE).then(c=>c.put(e.request,copy)));}return r;}).catch(()=>caches.match(e.request)));
});
