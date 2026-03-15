// T&T Dashboard Service Worker
// Network-first strategy — always loads fresh from Netlify
// Data files (data.json, users.json, chats.json) always fetched live from GitHub

const CACHE = 'tt-dashboard-v1';
const STATIC = [
  '/',
  '/index.html',
  '/manifest.json',
  'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&display=swap'
];

// Install — cache static shell
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(STATIC)).then(() => self.skipWaiting())
  );
});

// Activate — clean old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch — network first, fall back to cache for shell only
// GitHub API calls always go network-only (never cache data)
self.addEventListener('fetch', e => {
  const url = e.request.url;

  // Never cache GitHub API calls — always live
  if (url.includes('api.github.com') || url.includes('fonts.gstatic.com')) {
    e.respondWith(fetch(e.request));
    return;
  }

  // Network first for everything else
  e.respondWith(
    fetch(e.request)
      .then(res => {
        // Cache a fresh copy of the shell
        if (res.ok && (url.endsWith('/') || url.endsWith('index.html'))) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
