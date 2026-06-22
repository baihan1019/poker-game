/**
 * Service Worker — 争上游扑克
 * 自动适配子目录部署
 */

const CACHE = 'zsy-v1'
const BASE = (self.location.pathname.replace(/\/sw\.js$/, '') || '')
const PRECACHE = [`${BASE}/`, `${BASE}/index.html`, `${BASE}/manifest.json`]

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)))
  self.skipWaiting()
})

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))))
  self.clients.claim()
})

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || e.request.url.startsWith('ws')) return
  e.respondWith(
    fetch(e.request).then((r) => {
      if (r.status === 200) { const c = r.clone(); caches.open(CACHE).then((ca) => ca.put(e.request, c)); }
      return r
    }).catch(() => caches.match(e.request).then((c) => c || new Response('离线', {status: 503})))
  )
})
