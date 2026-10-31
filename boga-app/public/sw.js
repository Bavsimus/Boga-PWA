// BOGA service worker — uygulama kabuğunu önbelleğe alır, çevrimdışı açılmayı sağlar.
// Veriler (Firestore) bu dosyadan geçmez; onları Firestore'un kendi önbelleği yönetir.
const VERSION = "v1";
const STATIC_CACHE = `boga-static-${VERSION}`;
const PAGE_CACHE = `boga-pages-${VERSION}`;
const PRECACHE = ["/", "/manifest.json", "/boga.png", "/icon-192x192.png", "/icon-512x512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(PAGE_CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k.startsWith("boga-") && k !== STATIC_CACHE && k !== PAGE_CACHE).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// Hash'li build dosyaları hiç değişmez: önce önbellek
const cacheFirst = async (request) => {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) (await caches.open(STATIC_CACHE)).put(request, response.clone());
  return response;
};

// Sayfalar ve RSC verisi: önce ağ (her zaman güncel), çevrimdışıysa önbellek
const networkFirst = async (request, fallbackUrl) => {
  try {
    const response = await fetch(request);
    if (response.ok) (await caches.open(PAGE_CACHE)).put(request, response.clone());
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) return cached;
    if (fallbackUrl) {
      const fallback = await caches.match(fallbackUrl);
      if (fallback) return fallback;
    }
    throw error;
  }
};

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/_next/image")) {
    event.respondWith(cacheFirst(request));
  } else if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, "/"));
  } else if (request.headers.get("RSC") === "1" || /\.(png|ico|svg|json|webmanifest)$/.test(url.pathname)) {
    event.respondWith(networkFirst(request));
  }
});
