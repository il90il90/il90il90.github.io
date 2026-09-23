const CACHE = "israel-tv-v211";
const SHELL = [
  "./",
  "./index.html",
  "./channels.js",
  "./qrcode.min.js",
  "./jsqr.min.js",
  "./manifest.webmanifest",
  "./favicon.png",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-base.png",
  "./apple-touch-icon.png",
  "./apple-touch-icon-precomposed.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.endsWith("pwf.js")) {
    event.respondWith(fetch(request, { cache: "no-store" }));
    return;
  }

  const fresh = request.mode === "navigate"
    || url.pathname.endsWith("/")
    || url.pathname.endsWith(".html")
    || url.pathname.endsWith(".js");

  event.respondWith(
    fetch(request, fresh ? { cache: "no-store" } : undefined)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => caches.match(request).then((cached) => {
        if (cached) return cached;
        if (request.destination === "image" || /\.(png|jpe?g|gif|webp|svg)$/i.test(url.pathname)) {
          return new Response("", { status: 404, statusText: "Not Found" });
        }
        return caches.match("./index.html");
      }))
  );
});
