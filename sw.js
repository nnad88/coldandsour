// Cache the app shell so the home-screen icon opens instantly and works offline.
// Supabase and Gemini calls are never cached — they always go to the network.
const CACHE = "coldandsour-v13";
// caches.keys() lists every cache on the ORIGIN, not just this worker's scope, and
// nnad88.github.io hosts other apps of mine. Sweeping "everything that isn't mine"
// would delete theirs — and they would delete this one right back, which leaves the
// shell missing exactly when Chrome checks whether the app works offline.
const MINE = "coldandsour-";
const SHELL = [
  "./index.html",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./icons/apple-touch-icon.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE)
      // addAll fails the whole install if any one file 404s, so take them one at a time
      .then((c) => Promise.all(SHELL.map((u) => c.add(u).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k.startsWith(MINE) && k !== CACHE).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

function cacheable(res) {
  return res && res.ok && !res.redirected && res.type === "basic";
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.hostname.endsWith("supabase.co")) return;              // always live
  if (url.hostname.endsWith("supabase.in")) return;
  if (url.hostname.endsWith("googleapis.com") &&
      url.pathname.indexOf("/v1beta/") === 0) return;            // Gemini, always live
  if (url.pathname.endsWith("/sw.js")) return;                   // never cache the worker

  // A cached redirect can never answer a navigation, so navigations go network-first
  // and fall back to the cached page only when the network is gone.
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((res) => {
          if (cacheable(res)) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put("./index.html", copy));
          }
          return res;
        })
        .catch(() => caches.match("./index.html").then((hit) => hit || Response.error()))
    );
    return;
  }

  const sameOrigin = url.origin === location.origin;
  const isFont = url.hostname.endsWith("gstatic.com") || url.hostname.endsWith("googleapis.com");
  if (!sameOrigin && !isFont) return;

  e.respondWith(
    caches.match(req).then((hit) => {
      const net = fetch(req)
        .then((res) => {
          if (res && res.ok && !res.redirected) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => hit);
      return hit || net;
    })
  );
});
