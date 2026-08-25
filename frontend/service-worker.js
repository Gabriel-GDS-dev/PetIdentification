const CACHE_NAME = "identificcao-pet-v23";
const APP_SHELL = [
  "./",
  "./index.html",
  "./styles.css?v=20",
  "./styles.css",
  "./app.js?v=22",
  "./app.js",
  "./pet-record-actions.js?v=3",
  "./pet-record-actions.js",
  "./manifest.webmanifest",
  "./assets/pet-icon.svg",
  "./assets/pet-icon-dark.svg",
  "./assets/pet-icon-180.png",
  "./assets/pet-icon-192.png",
  "./assets/pet-icon-512.png",
  "./assets/pet-icon-maskable-512.png",
  "./assets/pet-icon-dark-192.png",
  "./assets/pet-icon-dark-512.png",
  "./tcc_screenshots_mobile/Frente.png",
  "./tcc_screenshots_mobile/Verso.png"
];
self.addEventListener("install", (event) => { event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))); self.skipWaiting(); });
self.addEventListener("message", (event) => { if (event.data?.type === "SKIP_WAITING") self.skipWaiting(); });
self.addEventListener("activate", (event) => { event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))); self.clients.claim(); });
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.pathname.startsWith("/api/")) return;
  event.respondWith(fetch(event.request).then((response) => { if (response && response.ok) { const clone = response.clone(); caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone)); } return response; }).catch(() => caches.match(event.request)));
});
