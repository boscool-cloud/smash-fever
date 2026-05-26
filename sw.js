// Smash Fever — U宝 Edition Service Worker
// Enables offline play & fast loading

const CACHE = 'smash-fever-v1';
const CORE_FILES = [
  './',
  './index.html',
  './icon.svg',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=Fredoka+One&family=Noto+Sans+SC:wght@500;700;900&family=Nunito:wght@400;600;700;800;900&display=swap'
];

// ---- Install: cache core files ----
self.addEventListener('install', e => {
  console.log('[SW] Installing Smash Fever...');
  e.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(CORE_FILES))
      .then(() => self.skipWaiting())
  );
});

// ---- Activate: clean old caches ----
self.addEventListener('activate', e => {
  console.log('[SW] Activating Smash Fever...');
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => {
          console.log('[SW] Removing old cache:', k);
          return caches.delete(k);
        })
      ))
      .then(() => self.clients.claim())
  );
});

// ---- Fetch: serve from cache, fallback to network ----
self.addEventListener('fetch', e => {
  const url = e.request.url;

  // Always go to network for Firebase / Google APIs
  if (url.includes('firebase') ||
      url.includes('googleapis.com') ||
      url.includes('gstatic.com/firebasejs') ||
      url.includes('firebaseapp.com') ||
      url.includes('firebasestorage')) {
    return; // Don't intercept Firebase calls
  }

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) {
        // Serve from cache, update in background
        fetch(e.request).then(response => {
          if (response && response.ok) {
            caches.open(CACHE).then(c => c.put(e.request, response));
          }
        }).catch(() => {});
        return cached;
      }
      // Not in cache — fetch from network and cache it
      return fetch(e.request).then(response => {
        if (response && response.ok) {
          const clone = response.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return response;
      }).catch(() => {
        // Offline fallback — serve main page
        if (e.request.destination === 'document') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
