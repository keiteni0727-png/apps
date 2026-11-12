/* オフラインでも開けるようにする。中身は「まずネットから、だめなら前回の控え」 */
const CACHE = "entame-form1112";
const SHELL = ["./", "../shared/u-base.css", "../shared/u-core.js", "manifest.json", "icon-180.png", "icon-192.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).catch(() => {}).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith("entame-") && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== "GET") return;
  const own = u.origin === location.origin;
  const lib = u.hostname === "www.gstatic.com" || u.hostname === "fonts.googleapis.com" || u.hostname === "fonts.gstatic.com";
  if (!own && !lib) return; /* Firebase との通信などは触らない */
  const put = res => { if (res && (res.ok || res.type === "opaque")) { const c = res.clone(); caches.open(CACHE).then(x => x.put(r, c)); } return res; };
  if (lib) e.respondWith(caches.match(r).then(hit => hit || fetch(r).then(put)));
  /* 自分のファイルは毎回サーバーに確認する（古い画面が残らないように） */
  else e.respondWith(fetch(r.url, { cache: "no-cache", credentials: "same-origin" }).then(put).catch(() => caches.match(r, { ignoreSearch: true }).then(hit => hit || caches.match("./"))));
});
