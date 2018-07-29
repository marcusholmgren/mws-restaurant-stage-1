importScripts('/js/dbhelper.js');

const CACHE_NAME = 'mws-restaurant-v12';
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
            ]);
        }).then(() => {
            DBHelper.populateRestaurants();
        }).then(() => {
            return self.skipWaiting();
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
    return self.clients.claim();
});

const cachedResponse = (cache, request) => {
    return cache.match(request).then((cachedResponse) => {
        return cachedResponse || fetch(request).then((networkResponse) => {
            cache.put(request, networkResponse.clone());
            return networkResponse;
        });
    });
};

self.addEventListener('fetch', (event) => {
    // Let the browser do its default thing
    // for non-GET requests.
    if (event.request.method != 'GET') return;

    const requestURL = new URL(event.request.url);
    const indexHtml = '/index.html';
    if (requestURL.pathname === '/' || requestURL.pathname === indexHtml) {
        event.respondWith(caches.open(CACHE_NAME).then((cache) => {
            return cachedResponse(cache, indexHtml);
        })
        );
        // Google maps API request caching
    } else if (requestURL.href.match(String.raw`^https://(maps|fonts)\.(googleapis|gstatic)\.com`)) {
        event.respondWith(caches.open(CACHE_GOOGLE_MAPS).then((cache) => {
            return cachedResponse(cache, event.request);
        }).catch(() => {
            console.log('Failed to load google maps URL:', requestURL);
            return new Response();
        })
        );
    } else if (requestURL.href.match(String.raw`^http[s]?://.*/(restaurants|reviews)/?(\d+)?`)) {
        return;
    } else {
        event.respondWith(
            caches.open(CACHE_NAME).then((cache) => {
                return cache.match(event.request, { ignoreSearch: true }).then((cachedResponse) => {
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

self.addEventListener('sync', (event) => {
    console.log('sync event-tag: ', event.tag);
    processDispatchQueue();
});

/**
 * Sequential processing of all queued syncronisation commands.
 */
function processDispatchQueue() {
    DBHelper.openDatabase().then((db) => {
        let store = DBHelper.openObjectStore(db, 'dispatch-queue');
        store.getAllKeys().onsuccess = (event) => {
            for (const queueId of event.target.result) {
                store.get(queueId).onsuccess = (e) => {
                    const {action, url, restaurant_id} = e.target.result;
                    console.log('Queue item', queueId, action, url, restaurant_id);
                    if (action === 'toggle-favorite') {
                         DBHelper.toggleFavorite(url, queueId, db).then(() => {
                            console.log('Sent toggle-favorite and delete from store dispatch-queue id: ', queueId);
                            DBHelper.deleteFromQueue(queueId);
                        });
                    } else {
                        console.warn(`Unkown dispatch-queue action: ${action}, id: ${queueId}`);
                    }
                };
            }
        };
    });
}
