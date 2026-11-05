// Increment the cache name whenever a new version of the app is published.
const CACHE_NAME = 'magic-stopwatch-v13-20261105';
const APP_FILES = [
    './', './index.html', './style.css', './script.js',
    './app-shell.js', './manifest.webmanifest', './icon.svg'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(APP_FILES))
    );
});

self.addEventListener('install', event => { event.waitUntil(self.skipWaiting()); });

self.addEventListener('activate', event => {
    event.waitUntil((async () => {
        const names = await caches.keys();
        await Promise.all(names.filter(name => name.startsWith('magic-stopwatch-') && name !== CACHE_NAME)
            .map(name => caches.delete(name)));
        await self.clients.claim();
    })());
});

self.addEventListener('fetch', event => {
    const request = event.request;
    if (request.method !== 'GET') return;
    const url = new URL(request.url);
    if (url.origin !== self.location.origin || !url.pathname.startsWith(self.registration.scope.replace(url.origin, ''))) return;
    // App shell is served from the versioned offline cache; no external assets.
    event.respondWith((async () => {
        const cached = await caches.match(request, { ignoreSearch: true });
        if (cached) return cached;
        try { return await fetch(request); }
        catch (error) {
            if (request.mode === 'navigate') {
                const fallback = await caches.match('./index.html');
                if (fallback) return fallback;
            }
            throw error;
        }
    })());
});
