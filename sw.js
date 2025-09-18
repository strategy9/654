const CACHE_NAME = 'ship-captain-crew-v1.0.0';
const urlsToCache = [
  '/654/',
  '/654/index.html',
  '/654/manifest.json',
  // Add any CSS files, fonts, or other assets your app uses
  // If you're using external CDNs for fonts or libraries, add them here too
];

// Install event - cache resources
self.addEventListener('install', event => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Caching files');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('Service Worker: Installation complete');
        return self.skipWaiting(); // Force activation of new SW
      })
      .catch(error => {
        console.error('Service Worker: Error during installation', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('Service Worker: Activating...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Deleting old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker: Activation complete');
      return self.clients.claim(); // Take control of all pages
    })
  );
});

// Fetch event - serve from cache with network fallback
self.addEventListener('fetch', event => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension requests
  if (event.request.url.startsWith('chrome-extension://')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return cached version if available
        if (response) {
          console.log('Service Worker: Serving from cache', event.request.url);
          return response;
        }

        // Otherwise fetch from network
        console.log('Service Worker: Fetching from network', event.request.url);
        return fetch(event.request).then(response => {
          // Don't cache if not a valid response
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Clone the response for caching
          const responseToCache = response.clone();

          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache);
            });

          return response;
        });
      })
      .catch(error => {
        console.error('Service Worker: Fetch failed', error);
        
        // If this is a navigation request and we're offline, 
        // return the cached main page
        if (event.request.mode === 'navigate') {
          return caches.match('/654/');
        }
        
        // For other requests, just let them fail
        throw error;
      })
  );
});

// Handle background sync (for when the app comes back online)
self.addEventListener('sync', event => {
  console.log('Service Worker: Background sync', event.tag);
  // Add any sync logic here if needed
});

// Handle push notifications (if you add them later)
self.addEventListener('push', event => {
  console.log('Service Worker: Push received');
  // Add push notification logic here if needed
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
  console.log('Service Worker: Notification click');
  event.notification.close();
  
  // Open the app
  event.waitUntil(
    clients.openWindow('/654/')
  );
});

// Message handler for communication with main app
self.addEventListener('message', event => {
  console.log('Service Worker: Message received', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});
