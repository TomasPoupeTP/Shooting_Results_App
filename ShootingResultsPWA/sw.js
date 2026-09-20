// Service worker - offline cache aplikace (shell + vendor knihovny).
//
// Strategie: "network-first" - pokud má aplikace signál, vždy se použije
// nejnovější verze ze serveru (a cache se s ní přepíše). Cache se použije
// jen když síť selže (offline / bez signálu na střelnici). Díky tomu se po
// nahrání opravy aplikace aktualizuje hned při dalším otevření se signálem,
// místo aby donekonečna servírovala starou (rozbitou) verzi z cache.
//
// Verze zvyš při KAŽDÉM nasazení, které mění obsah některého z precachovaných
// souborů (i beze změny tohoto souboru nebo seznamu ASSETS) - jen tak prohlížeč
// u už otevřené (dlouho běžící) session spolehlivě pozná, že je nová verze SW,
// a spustí se auto-reload z main.js. Nová session dostane aktuální obsah vždy
// (network-first), ale bez bumpnutí verze by u NEZAVŘENÉ karty appka mohla
// zůstat na starém JS/CSS až do dalšího ručního reloadu.
const CACHE_NAME = "shooting-results-pwa-v10";

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
  "js/i18n.js",
  "js/dialog.js",
  "js/itemsheets.js",
  "js/views/home.js",
  "js/views/lottery.js",
  "js/views/entry.js",
  "js/views/results.js",
  "js/views/finale.js",
  "js/views/topstats.js",
  "js/views/presentation.js",
  "js/views/menu.js",
  "js/views/competitions.js",
  "js/views/appsettings.js",
  "js/views/help.js",
  "js/views/desktop.js",
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
    fetch(event.request)
      .then((resp) => {
        if (resp && resp.ok) {
          const copy = resp.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return resp;
      })
      .catch(() => caches.match(event.request))
  );
});
