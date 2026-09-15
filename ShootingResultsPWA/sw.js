// Service worker - offline cache appky (shell + vendor knihovny).
// Verze zvyš při každé změně seznamu souborů, aby se vynutila aktualizace cache.
const CACHE_NAME = "shooting-results-pwa-v1";

const ASSETS = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "css/style.css",
  "js/main.js",
  "js/dom.js",
  "js/state.js",
  "js/constants.js",
  "js/pdf.js",
  "js/views/home.js",
  "js/views/lottery.js",
  "js/views/entry.js",
  "js/views/results.js",
  "js/views/finale.js",
  "js/views/topstats.js",
  "js/views/presentation.js",
  "vendor/jspdf.umd.min.js",
  "vendor/jspdf.plugin.autotable.min.js",
  "vendor/DejaVuSans-normal.js",
  "vendor/DejaVuSans-bold.js",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request)
        .then((resp) => {
          if (resp && resp.ok) {
            const copy = resp.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return resp;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
