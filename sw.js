/* Service worker — Annuaire AFH
   - Page de l'annuaire : réseau d'abord (toujours la dernière version), cache si hors ligne
   - Polices et bibliothèque Supabase : cache, mis à jour en arrière-plan
   - Données Supabase : jamais mises en cache ici (gérées par l'application) */
const CACHE = 'annuaire-afh-v4';

self.addEventListener('install', e => {
    e.waitUntil(caches.open(CACHE).then(c => c.addAll(['./'])).catch(() => {}));
    self.skipWaiting();
});

self.addEventListener('activate', e => {
    e.waitUntil(
        caches.keys()
            .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', e => {
    const req = e.request;
    if (req.method !== 'GET') return;
    const url = new URL(req.url);

    // Base de données : jamais en cache
    if (url.hostname.endsWith('supabase.co') || url.hostname.endsWith('supabase.in')) return;

    // Page et fichiers du site : réseau d'abord
    if (url.origin === self.location.origin) {
        e.respondWith(
            fetch(req)
                .then(res => {
                    const copy = res.clone();
                    caches.open(CACHE).then(c => c.put(req, copy));
                    return res;
                })
                .catch(() => caches.match(req).then(r => r || caches.match('./')))
        );
        return;
    }

    // CDN (polices, supabase-js) : cache puis mise à jour en arrière-plan
    if (/fonts\.(googleapis|gstatic)\.com|cdn\.jsdelivr\.net/.test(url.hostname)) {
        e.respondWith(
            caches.match(req).then(cached => {
                const net = fetch(req).then(res => {
                    const copy = res.clone();
                    caches.open(CACHE).then(c => c.put(req, copy));
                    return res;
                }).catch(() => cached);
                return cached || net;
            })
        );
    }
});
