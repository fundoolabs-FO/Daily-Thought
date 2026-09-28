/* Daily Thought service worker (hand-written, no build step).
 *
 * - Pages (navigations): network-first, cached copy on failure, then /offline.
 * - /_next/static/*: cache-first (file names are content-hashed).
 * - Skips non-GET, cross-origin (incl. Supabase) and /auth/* requests.
 * - Clears all caches when the page posts { type: "CLEAR_CACHES" } (sign out).
 *
 * Bump VERSION to invalidate caches from previous deploys.
 */
const VERSION = "v2";
const PAGE_CACHE = `dt-pages-${VERSION}`;
const STATIC_CACHE = `dt-static-${VERSION}`;
const OFFLINE_URL = "/offline";
const PRECACHE = [OFFLINE_URL, "/icons/icon-192.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(PAGE_CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== PAGE_CACHE && k !== STATIC_CACHE)
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "CLEAR_CACHES") {
    event.waitUntil(
      caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k)))),
    );
  }
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // Supabase, Google, etc.
  if (url.pathname.startsWith("/auth/")) return; // OAuth callback, sign out

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(networkFirstPage(request));
  }
  // Everything else (RSC payloads, API, images) goes straight to the network.
});

async function cacheFirst(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

async function networkFirstPage(request) {
  const cache = await caches.open(PAGE_CACHE);
  try {
    const response = await fetch(request);
    // Don't store redirects (e.g. to /login) or errors as the page.
    if (response.ok && !response.redirected && response.type === "basic") {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await cache.match(request, { ignoreSearch: true });
    return cached || (await cache.match(OFFLINE_URL)) || Response.error();
  }
}
