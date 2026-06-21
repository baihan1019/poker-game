/**
 * Service Worker — 争上游扑克
 * 离线缓存壳资源，支持"添加到主屏幕"
 */

const CACHE = 'zhengshangyou-v1'
const PRECACHE = ['/', '/index.html', '/manifest.json']

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(PRECACHE))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((ks) =>
      Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return
  if (e.request.url.startsWith('ws')) return

  e.respondWith(
    fetch(e.request)
      .then((r) => {
        if (r.status === 200) {
          const clone = r.clone()
          caches.open(CACHE).then((c) => c.put(e.request, clone))
        }
        return r
      })
      .catch(() => caches.match(e.request).then((c) => c || new Response('离线', { status: 503 })))
  )
})
