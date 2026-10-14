/* オフラインでも開けるようにするための Service Worker
   - アプリ本体：キャッシュをすぐ返し、裏で最新版を取りに行く（次に開いたときに新しくなる）
   - Google Fonts：一度読んだらキャッシュから使う
   - YouTube など他のサイト：さわらない */
const CACHE = "asayoru-v1";
const FONT_CACHE = "asayoru-fonts-v1";
const SHELL = ["./", "index.html", "core.js", "meals.js", "recipes.js", "app.js", "manifest.webmanifest",
  "icons/icon-192.png", "icons/icon-512.png", "icons/maskable-512.png", "icons/apple-touch-icon.png", "icons/favicon.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE && k !== FONT_CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  if (url.origin === location.origin) {
    // ?date=… などが付いていても同じページとして扱う
    const isPage = req.mode === "navigate";
    const lookup = isPage ? caches.match("index.html") : caches.match(req, { ignoreSearch: true });
    const fresh = fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(isPage ? "index.html" : req, copy)); }
      return res;
    });
    e.respondWith(lookup.then(hit => {
      if (hit) { e.waitUntil(fresh.catch(() => {})); return hit; }
      return fresh.catch(() => caches.match("index.html"));
    }));
    return;
  }

  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    e.respondWith(caches.open(FONT_CACHE).then(c => c.match(req).then(hit => hit || fetch(req).then(res => { c.put(req, res.clone()); return res; }))));
  }
});
