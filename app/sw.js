// EngLink Síndico: funcionamento sem internet.
const VERSAO = "englink-v1";
const ESSENCIAIS = ["./", "index.html", "manifest.webmanifest", "demo.json", "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png", "icons/favicon-32.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSAO).then(c => c.addAll(ESSENCIAIS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSAO).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // Página: busca a versão nova quando há internet; sem internet, usa a guardada.
  if (req.mode === "navigate"){
    e.respondWith(fetch(req).then(r => { const copia = r.clone(); caches.open(VERSAO).then(c => c.put("index.html", copia)); return r; })
      .catch(() => caches.match("index.html")));
    return;
  }
  // Fontes, biblioteca do QR code e arquivos do app: usa o guardado e atualiza por trás.
  const mesmoSite = url.origin === location.origin;
  const externoPermitido = /fonts\.(googleapis|gstatic)\.com$|cdnjs\.cloudflare\.com$/.test(url.hostname);
  if (!mesmoSite && !externoPermitido) return;
  e.respondWith(caches.open(VERSAO).then(async c => {
    const guardado = await c.match(req);
    const rede = fetch(req).then(r => { if (r.ok || r.type === "opaque") c.put(req, r.clone()); return r; }).catch(() => guardado);
    return guardado || rede;
  }));
});
