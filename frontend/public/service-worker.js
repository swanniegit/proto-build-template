const CACHE_NAME = 'ai-proto-cache-v1'
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
]

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_ASSETS))
  )
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      )
    )
  )
})

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return

  event.respondWith(
    fetch(event.request)
      .then(response => {
        const clone = response.clone()
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone))
        return response
      })
      .catch(async () => {
        const cached = await caches.match(event.request)
        if (!cached) notifyOffline()
        return cached
      })
  )
})

function notifyOffline() {
  self.clients.matchAll().then(clients => {
    clients.forEach(client => client.postMessage({ type: 'offline' }))
  })
}
