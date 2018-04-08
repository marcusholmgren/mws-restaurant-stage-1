const CACHE_NAME = 'mws-restaurant-v2';
const CACHE_GOOGLE_MAPS = 'GOOGLE_MAPS_CACHE';

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll([
                '/index.html',
                '/restaurant.html',
                '/css/styles.css',
                '/js/dbhelper.js',
                '/js/main.js',
                '/js/restaurant_info.js',
                '/data/restaurants.json',
            ]);
        })
    );
});


self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (CACHE_NAME !== cacheName &&
                        cacheName.startsWith('mws-restaurant') ||
                        CACHE_GOOGLE_MAPS === cacheName) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});


self.addEventListener('fetch', (event) => {
    const requestURL = new URL(event.request.url);
    const indexHtml = '/index.html';
    if (requestURL.pathname === '/' || requestURL.pathname === indexHtml) {
        event.respondWith(
            caches.open(CACHE_NAME).then((cache) => {
                return cache.match(indexHtml).then((cachedResponse) => {
                    const fetchResponse = fetch(indexHtml).then((networkResponse) => {
                        cache.put(indexHtml, networkResponse.clone());
                        return networkResponse;
                    });
                    return cachedResponse || fetchResponse;
                });
            })
        );
    // Google maps API request caching
    } else if (requestURL.href.startsWith('https://maps.googleapis.com') ||
               requestURL.href.startsWith('https://maps.gstatic.com' ||
               requestURL.href.startsWith('https://fonts.gstatic.com'))) {
        event.respondWith(caches.open(CACHE_GOOGLE_MAPS).then((cache) => {
            return cache.match(event.request).then((cachedResponse) => {
                    const fetchResponse = fetch(event.request).then((networkResponse) => {
                        cache.put(event.request, networkResponse.clone());
                        return networkResponse;
                    });
                    return cachedResponse || fetchResponse;
                });
            }).catch(() => {
                console.log('Failed to load google maps URL:', requestURL);
            })
        );
    } else {
        event.respondWith(
            caches.open(CACHE_NAME).then((cache) => {
                return cache.match(event.request, {ignoreSearch: true}).then((cachedResponse) => {
                    return cachedResponse || fetch(event.request).then((networkResponse) => {
                        cache.put(event.request, networkResponse.clone());
                        return networkResponse;
                    });
                }).catch(() => {
                    console.log('Error on fetch', event.request);
                    return fetch(event.request).then((networkResponse) => {
                        cache.put(event.request, networkResponse.clone());
                        return networkResponse;
                    });
                });
            })
        );
    }
});

