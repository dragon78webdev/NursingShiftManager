// Versione del service worker
const CACHE_VERSION = 'v1';

// Installazione: precaricare le risorse essenziali
self.addEventListener('install', event => {
  console.log('[Service Worker] Installazione in corso...');
  
  // Skippa l'attesa e passa direttamente alla fase di attivazione
  self.skipWaiting();
  
  // Precaricare le risorse essenziali
  event.waitUntil(
    caches.open(CACHE_VERSION).then(cache => {
      return cache.addAll([
        '/',
        '/index.html',
        '/manifest.json',
        '/assets/icons/icon-192x192.png',
        '/assets/icons/icon-512x512.png',
        '/assets/icons/badge-72x72.png'
      ]);
    })
  );
});

// Attivazione: eliminare le cache obsolete
self.addEventListener('activate', event => {
  console.log('[Service Worker] Attivazione in corso...');
  
  // Richiedere il controllo immediato della pagina
  self.clients.claim();
  
  // Elimina le vecchie cache
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(cacheName => {
          return cacheName !== CACHE_VERSION;
        }).map(cacheName => {
          console.log('[Service Worker] Eliminazione della cache obsoleta:', cacheName);
          return caches.delete(cacheName);
        })
      );
    })
  );
});

// Gestione delle richieste
self.addEventListener('fetch', event => {
  // Ignora le richieste di API
  if (event.request.url.includes('/api/')) {
    return;
  }
  
  // Strategia stale-while-revalidate: serve dalla cache e poi aggiorna in background
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      const networkFetch = fetch(event.request).then(response => {
        // Aggiorna la cache con la nuova risposta
        if (response.ok && !event.request.url.includes('chrome-extension://')) {
          // Clona la risposta prima di cachearla
          const responseClone = response.clone();
          caches.open(CACHE_VERSION).then(cache => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      }).catch(error => {
        console.error('[Service Worker] Errore di fetch:', error);
        throw error;
      });
      
      // Usa la cache o la rete
      return cachedResponse || networkFetch;
    })
  );
});

// Gestione degli eventi di push
self.addEventListener('push', event => {
  console.log('[Service Worker] Notifica push ricevuta:', event);
  
  if (!event.data) {
    console.log('[Service Worker] Nessun dato nella notifica push');
    return;
  }
  
  try {
    // Estrai il payload della notifica
    const data = event.data.json();
    console.log('[Service Worker] Dati della notifica push:', data);
    
    // Dati di default per la notifica
    const title = data.notification.title || 'Nurse Scheduler';
    const options = {
      body: data.notification.body || 'Hai una nuova notifica',
      icon: data.notification.icon || '/assets/icons/icon-192x192.png',
      badge: data.notification.badge || '/assets/icons/badge-72x72.png',
      vibrate: data.notification.vibrate || [100, 50, 100],
      data: data.notification.data || {},
      actions: data.notification.actions || [
        { action: 'open', title: 'Apri' }
      ],
      tag: data.notification.tag || 'nurse-scheduler-notification',
      // Mostra la notifica anche se il tab è aperto
      requireInteraction: true
    };
    
    // Mostra la notifica
    event.waitUntil(
      self.registration.showNotification(title, options)
    );
  } catch (error) {
    console.error('[Service Worker] Errore nella gestione della notifica push:', error);
  }
});

// Gestione dei click sulle notifiche
self.addEventListener('notificationclick', event => {
  console.log('[Service Worker] Notifica cliccata:', event);
  
  // Chiudi la notifica
  event.notification.close();
  
  // Gestisci le azioni specifiche
  const action = event.action;
  const notification = event.notification;
  const data = notification.data || {};
  
  // Url di default per aprire l'app
  let url = '/';
  
  // Se è specificato un link nei dati della notifica, usa quello
  if (data.link) {
    url = data.link;
  }
  
  // Se è stata cliccata un'azione specifica
  if (action === 'explore' && data.link) {
    url = data.link;
  }
  
  // Apri o focalizza la finestra dell'app
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(clientsArr => {
      // Verifica se c'è già una finestra aperta
      const hadWindowToFocus = clientsArr.some(windowClient => {
        if (windowClient.url === url) {
          // Focalizza la finestra esistente
          return windowClient.focus();
        }
        return false;
      });
      
      // Se non c'è una finestra aperta, ne apre una nuova
      if (!hadWindowToFocus) {
        clients.openWindow(url).then(windowClient => {
          // Focalizza la nuova finestra
          if (windowClient) {
            windowClient.focus();
          }
        });
      }
    })
  );
});

// Gestione degli eventi di sincronizzazione in background
self.addEventListener('sync', event => {
  console.log('[Service Worker] Evento di sincronizzazione in background:', event);
  
  if (event.tag === 'sync-notifications') {
    // Qui potremmo implementare la sincronizzazione delle notifiche
    console.log('[Service Worker] Sincronizzazione delle notifiche in corso...');
  }
});

// Gestione degli eventi di notifica chiusa
self.addEventListener('notificationclose', event => {
  console.log('[Service Worker] Notifica chiusa:', event);
  // Qui potremmo registrare gli eventi di notifiche chiuse per analytics
});

// Logging per debug
console.log('[Service Worker] Caricato e in esecuzione!');