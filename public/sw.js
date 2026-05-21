/* GeekFon Society — Service Worker v1.0
   Network-first for API, cache-first for shell pages.
*/
var CACHE = 'gfs-v1';
var SHELL = [
  '/',
  '/dashboard',
  '/login',
  '/passport',
  '/roster',
  '/radio',
  '/chat',
  '/welcome',
  '/geekfon-logo.png',
  '/nav.js',
  '/footer.js',
  '/manifest.json'
];

self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE).then(function(c) {
      return c.addAll(SHELL);
    }).catch(function() {
      // Non-fatal: some shell pages may not exist yet
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE; })
            .map(function(k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function(e) {
  var url = e.request.url;

  // Always network-first for Supabase and Stripe API calls
  if (url.includes('supabase.co') || url.includes('stripe.com') || url.includes('/api/')) {
    e.respondWith(
      fetch(e.request).catch(function() {
        return new Response(
          JSON.stringify({ error: 'offline', message: 'No connection' }),
          { headers: { 'Content-Type': 'application/json' }, status: 503 }
        );
      })
    );
    return;
  }

  // Cache-first for everything else
  e.respondWith(
    caches.match(e.request).then(function(cached) {
      return cached || fetch(e.request).then(function(response) {
        // Cache successful GET responses for HTML, JS, CSS, images
        if (response.ok && e.request.method === 'GET') {
          var type = response.headers.get('content-type') || '';
          if (type.includes('html') || type.includes('javascript') ||
              type.includes('css') || type.includes('image')) {
            var clone = response.clone();
            caches.open(CACHE).then(function(c) { c.put(e.request, clone); });
          }
        }
        return response;
      });
    }).catch(function() {
      // Offline fallback for navigation requests
      if (e.request.mode === 'navigate') {
        return caches.match('/');
      }
    })
  );
});
