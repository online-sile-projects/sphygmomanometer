const CACHE_NAME = 'blood-pressure-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/line-auth.js',
  '/config.js',
  '/images/hypertension-favicon-16x16.png',
  '/images/hypertension-favicon-32x32.png',
  '/images/hypertension-apple-touch-icon.png',
  '/images/hypertension-favicon-192x192.png',
  '/images/hypertension-favicon-512x512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});
