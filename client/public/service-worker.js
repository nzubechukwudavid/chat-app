// NRC Rail Hub - Progressive Web App Service Worker
const CACHE_NAME = 'nrc-rail-hub-v5';
const NETWORK_TIMEOUT_MS = 6000;
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/favicon.svg',
  '/apple-touch-icon.png',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-maskable-192.png',
  '/icon-maskable-512.png',
];

const OFFLINE_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Rail Hub - Offline</title>
    <style>
      :root { color-scheme: dark; }
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 24px;
        font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
        background: radial-gradient(circle at 50% 30%, #0d3826 0%, #071e14 55%, #040d09 100%);
        color: #fff;
      }
      main { max-width: 360px; text-align: center; }
      h1 { font-size: 22px; margin: 0 0 8px; }
      p { margin: 0 0 20px; color: rgba(255, 255, 255, 0.7); line-height: 1.5; }
      button {
        border: 0;
        border-radius: 999px;
        padding: 11px 22px;
        font: inherit;
        font-weight: 600;
        color: #04120b;
        background: #34d399;
        cursor: pointer;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>Rail Hub is offline</h1>
      <p>Check your connection, then try again. Your conversations are safe on the server.</p>
      <button type="button" onclick="location.reload()">Reload Rail Hub</button>
    </main>
  </body>
</html>`;

const offlineResponse = () =>
  new Response(OFFLINE_HTML, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });

/** Network request with a deadline so a bad connection cannot hang the shell. */
const fetchWithTimeout = (request, timeoutMs) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(request, { signal: controller.signal }).finally(() => clearTimeout(timer));
};

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Only handle GET requests with http/https schemes
  if (event.request.method !== 'GET' || !event.request.url.startsWith('http')) {
    return;
  }

  // Bypass service worker caching for real-time Stream Chat APIs and Render backend
  if (
    event.request.url.includes('onrender.com') ||
    event.request.url.includes('stream-io-api.com') ||
    event.request.url.includes('getstream.io') ||
    event.request.url.includes('/auth/')
  ) {
    return;
  }

  const isNavigation = event.request.mode === 'navigate';

  // Network-first with a hard deadline, then cache fallback. Without the
  // deadline a stalled network request leaves the app on a blank screen
  // instead of falling back to the last working shell.
  event.respondWith(
    fetchWithTimeout(event.request, NETWORK_TIMEOUT_MS)
      .then((response) => {
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          event.waitUntil(
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache)).catch(() => {})
          );
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(event.request);
        if (cached) return cached;

        if (isNavigation) {
          const shell = (await caches.match('/index.html')) || (await caches.match('/'));
          if (shell) return shell;
          return offlineResponse();
        }

        return new Response('', { status: 504, statusText: 'Gateway Timeout' });
      })
  );
});
