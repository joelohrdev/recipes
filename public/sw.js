// Recipe Box service worker.
//
// - Pages: network first, so you always see the latest recipe when online;
//   the last saved copy when offline.
// - Next.js build files and recipe photos: cache first (they never change).
// - Anything that changes data (saves, the passcode, imports) always goes to
//   the network and is never cached.
//
// Bump VERSION to throw away old caches after a breaking change.

const VERSION = "v1";
const PAGES = `pages-${VERSION}`;
const ASSETS = `assets-${VERSION}`;
const OFFLINE_URL = "/offline";

// Pages that need the passcode or start an import; never stored.
const PRIVATE = [/^\/login/, /^\/import\//, /^\/recipes\/new/, /^\/recipes\/\d+\/edit/, /^\/api\//];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(PAGES);
      await Promise.all([OFFLINE_URL, "/"].map((url) => savePage(cache, url)));
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set([PAGES, ASSETS]);
      for (const key of await caches.keys()) if (!keep.has(key)) await caches.delete(key);
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // In-app navigations and Next's connectivity checks use RSC requests. Leave
  // them alone so Next can tell when the network is really down.
  if (request.headers.get("RSC") || url.searchParams.has("_rsc")) return;

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/photos/")) {
    event.respondWith(cacheFirst(request));
    return;
  }

  if (request.mode === "navigate" && !PRIVATE.some((re) => re.test(url.pathname))) {
    event.respondWith(networkFirst(request));
  }
});

async function cacheFirst(request) {
  const cache = await caches.open(ASSETS);
  const hit = await cache.match(request);
  if (hit) return hit;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

async function networkFirst(request) {
  const cache = await caches.open(PAGES);
  try {
    const response = await fetch(request);
    if (response.ok && response.type === "basic") {
      await cache.put(stripQuery(request.url), response.clone());
      cacheAssetsOf(response.clone());
    }
    return response;
  } catch {
    return (
      (await cache.match(stripQuery(request.url))) ??
      (await cache.match(OFFLINE_URL)) ??
      new Response("Offline", { status: 503, headers: { "Content-Type": "text/plain" } })
    );
  }
}

function stripQuery(url) {
  const u = new URL(url);
  u.search = "";
  u.hash = "";
  return u.href;
}

/** Fetch a page into the cache, plus the scripts and styles it needs. */
async function savePage(cache, url) {
  try {
    const response = await fetch(url, { credentials: "same-origin" });
    if (!response.ok) return;
    await cache.put(stripQuery(new URL(url, self.location.origin).href), response.clone());
    await cacheAssetsOf(response);
  } catch {
    // Offline or the server is down; try again next time.
  }
}

/** A saved page is only useful offline if its JavaScript and CSS are saved too. */
async function cacheAssetsOf(response) {
  try {
    const html = await response.text();
    const urls = new Set(html.match(/\/_next\/static\/[^"'\s)\\]+/g) ?? []);
    const cache = await caches.open(ASSETS);
    await Promise.all(
      [...urls].map(async (path) => {
        if (await cache.match(path)) return;
        const res = await fetch(path);
        if (res.ok) await cache.put(path, res);
      }),
    );
  } catch {
    // Not critical: assets are also cached as the browser loads them.
  }
}

// The recipe list sends every recipe's address and last-changed time, so the
// whole box can be read offline. Only new or changed recipes are fetched, and
// recipes that were deleted are dropped.
const VERSIONS_KEY = "/__offline-versions";

self.addEventListener("message", (event) => {
  if (event.data?.type !== "save-for-offline") return;
  const { pages = [], photos = [] } = event.data;
  event.waitUntil(
    (async () => {
      const pageCache = await caches.open(PAGES);
      const saved = await pageCache.match(VERSIONS_KEY);
      const versions = saved ? await saved.json() : {};
      const current = {};
      for (const page of pages) {
        const url = page?.url;
        if (typeof url !== "string" || !/^\/recipes\/\d+$/.test(url)) continue;
        current[url] = String(page.version);
        const href = new URL(url, self.location.origin).href;
        if (versions[url] === current[url] && (await pageCache.match(href))) continue;
        await savePage(pageCache, url);
      }
      for (const url of Object.keys(versions)) {
        if (!(url in current)) await pageCache.delete(new URL(url, self.location.origin).href);
      }
      await pageCache.put(VERSIONS_KEY, Response.json(current));

      const assetCache = await caches.open(ASSETS);
      for (const url of photos) {
        if (typeof url !== "string" || !url.startsWith("/photos/")) continue;
        if (await assetCache.match(url)) continue;
        try {
          const res = await fetch(url);
          if (res.ok) await assetCache.put(url, res);
        } catch {
          // Try again on the next visit.
        }
      }
    })(),
  );
});
