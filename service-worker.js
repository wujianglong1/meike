const CACHE='daymark-shell-20260817-63';
const FILES=['./','./index.html','./daymark-styles-20260817-87.css','./daymark-styles-20260817-86.css','./daymark-styles-20260817-85.css','./daymark-styles-20260817-84.css','./daymark-styles-20260817-83.css','./daymark-styles-20260817-82.css','./daymark-styles-20260817-81.css','./daymark-app-20260817-55.js','./theme-cycle-20260817-31.js','./weather-forecast-20260817-54.js','./zoom-control-20260817-45.js','./life-journal-20260817-49.js','./module-controls-20260817-50.js','./daymark-account-20260817-9.js','./goals-planning-20260817-1.js','./calendar-day-link-20260817-3.js','./time-schedule-20260817-4.js','./page-refresh-20260817-1.js','./secret-book-20260817-2.js','./secret-lock-20260817-1.js','./secret-title-20260817-1.js','./link-book-20260817-2.js','./link-title-20260817-1.js','./manifest.webmanifest','./daymark-icon.svg'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  if(url.origin!==location.origin)return;
  event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).then(response=>{const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));return response}).catch(()=>caches.match('./index.html'))));
});
