// オフラインで動かすための service worker。版番号つきのキャッシュに全ファイルを事前に入れる。
// VERSION と precache.json は tools/build-precache.mjs が作る（手で書き換えない）。
const VERSION = 'cc0ab2f80dd3';
const CACHE = 'katachi-' + VERSION;
const FONTS = 'katachi-fonts';

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const list = await (await fetch('precache.json', { cache: 'no-cache' })).json();
    const c = await caches.open(CACHE);
    await c.addAll(list.files.map(f => new Request(f, { cache: 'reload' })));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== CACHE && k !== FONTS) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  // 字体（Google Fonts）だけは外から読む。読めたものを保存し、ネットがないときはそれを使う
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith((async () => {
      const c = await caches.open(FONTS), hit = await c.match(e.request);
      const net = fetch(e.request).then(r => { if (r.ok || r.type === 'opaque') c.put(e.request, r.clone()); return r; }).catch(() => hit);
      return hit || net;
    })());
    return;
  }
  if (url.origin !== self.location.origin) return;
  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    const hit = await c.match(e.request, { ignoreSearch: true });
    if (hit) return hit;
    try { return await fetch(e.request); }
    catch { return (await c.match('index.html')) || Response.error(); }
  })());
});
