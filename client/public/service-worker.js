// Cache name - change version to force update
const CACHE_NAME = 'nurse-scheduler-v1';

// Assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
          return null;
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', (event) => {
  // Skip for API and authentication requests
  if (event.request.url.includes('/api/') || 
      event.request.url.includes('/auth/')) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }
        
        // Clone the request because it's a one-time use stream
        const fetchRequest = event.request.clone();
        
        return fetch(fetchRequest).then(
          (response) => {
            // Don't cache non-successful responses or non-GET requests
            if (!response || response.status !== 200 || event.request.method !== 'GET') {
              return response;
            }
            
            // Clone the response because it's a one-time use stream
            const responseToCache = response.clone();
            
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });
            
            return response;
          }
        );
      })
  );
});

// Push event - handle push notifications
self.addEventListener('push', (event) => {
  if (!event.data) return;
  
  try {
    const data = event.data.json();
    
    const options = {
      body: data.message || 'Nuova notifica',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-192x192.png',
      data: data.data || {}
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title || 'NurseScheduler', options)
    );
  } catch (error) {
    console.error('Error handling push notification:', error);
  }
});

// Notification click event - handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const notificationData = event.notification.data || {};
  let url = '/';
  
  // Set URL based on notification type
  if (notificationData.requestId) {
    url = '/change-requests';
  } else if (notificationData.scheduleGenerationId) {
    url = '/schedule';
  } else if (notificationData.vacationId) {
    url = '/vacations';
  } else if (notificationData.delegationId) {
    url = '/delegates';
  }
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clientsList) => {
      // If a window client already exists, focus it
      for (const client of clientsList) {
        if (client.url.includes(url) && 'focus' in client) {
          return client.focus();
        }
      }
      
      // Otherwise, open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    })
  );
});
