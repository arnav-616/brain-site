// Offline copy for the private app on your phone. Network first: when the laptop is reachable you
// always get fresh data; when it isn't, the last copy is served, marked so the app can say how old
// it is. Registered only by the private app, only over https (Tailscale), never by the public site.
const CACHE = 'brain-offline-v2'

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil((async () => {
  for (const key of await caches.keys()) if (key !== CACHE) await caches.delete(key) // drop old copies
  await self.clients.claim()
})()))

self.addEventListener('fetch', (event) => {
  const req = event.request
  const url = new URL(req.url)
  // Only this site's GETs, never the dashboard API (changes need the laptop). Dev-server modules are
  // saved too: every module imports /@vite/client, whose live-reload socket just stays quiet offline.
  if (req.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/api/')) return
  event.respondWith((async () => {
    const cache = await caches.open(CACHE)
    try {
      const fresh = await fetch(req)
      if (fresh.ok) {
        // Save a copy stamped with when it was saved (the stamp travels inside the copy's headers).
        const copy = fresh.clone()
        const headers = new Headers(copy.headers)
        headers.set('x-brain-saved-at', new Date().toISOString())
        copy.blob().then(body => cache.put(req, new Response(body, { status: copy.status, statusText: copy.statusText, headers })))
      }
      return fresh
    } catch {
      const saved = await cache.match(req)
      if (!saved) throw new Error('offline and not saved yet')
      const headers = new Headers(saved.headers)
      headers.set('x-brain-offline', saved.headers.get('x-brain-saved-at') ?? 'unknown')
      return new Response(await saved.blob(), { status: saved.status, statusText: saved.statusText, headers })
    }
  })())
})
