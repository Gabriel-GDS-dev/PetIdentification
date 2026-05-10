const CACHE_NAME = "identificcao-pet-v6";
const APP_SHELL = [
  "./",
  "./index.html",
  "./styles.css?v=6",
  "./styles.css",
  "./app.js?v=6",
  "./app.js",
  "./manifest.webmanifest",
  "./pet-icon.svg",
  "./pet-icon-dark.svg",
  "./pet-icon-180.png",
  "./pet-icon-192.png",
  "./pet-icon-512.png",
  "./pet-icon-maskable-512.png",
  "./pet-icon-dark-192.png",
  "./pet-icon-dark-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
