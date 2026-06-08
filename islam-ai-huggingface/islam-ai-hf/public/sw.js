// إسلام AI — Service Worker PWA
// بواسطة KHEDIM BENYAKHLEF dit BENY-JOE

const CACHE_NAME = "islam-ai-v1";
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
];

// Installation
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {});
    })
  );
  self.skipWaiting();
});

// Activation
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Fetch — Network first, cache fallback
self.addEventListener("fetch", (event) => {
  // Skip API calls and audio streams
  if (
    event.request.url.includes("/api/") ||
    event.request.url.includes("mp3quran.net") ||
    event.request.url.includes("alquran.cloud") ||
    event.request.url.includes("groq.com") ||
    event.request.method !== "GET"
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
