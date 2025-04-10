// Function to register service worker for PWA functionality
export async function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/service-worker.js');
      console.log('Service worker registered:', registration);
      return registration;
    } catch (error) {
      console.error('Service worker registration failed:', error);
      return null;
    }
  }
  return null;
}

// Function to request notification permission
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    console.log('This browser does not support notifications');
    return false;
  }
  
  // Check if we already have permission
  if (Notification.permission === 'granted') {
    return true;
  }
  
  // Request permission
  try {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return false;
  }
}

// Function to setup WebSocket connection for push notifications
export function setupNotificationWebSocket(userId: number, onMessage: (data: any) => void) {
  // Check if WebSocket is supported
  if (!('WebSocket' in window)) {
    console.error('WebSocket is not supported by this browser');
    return null;
  }
  
  // Create WebSocket connection
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}?userId=${userId}`;
  
  const socket = new WebSocket(wsUrl);
  
  socket.onopen = () => {
    console.log('WebSocket connection established');
  };
  
  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      onMessage(data);
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  };
  
  socket.onerror = (error) => {
    console.error('WebSocket error:', error);
  };
  
  socket.onclose = () => {
    console.log('WebSocket connection closed');
    // Attempt to reconnect after a delay
    setTimeout(() => {
      setupNotificationWebSocket(userId, onMessage);
    }, 5000);
  };
  
  return socket;
}

// Function to show a local notification
export function showNotification(title: string, options: NotificationOptions = {}) {
  if (!('Notification' in window)) {
    console.log('This browser does not support notifications');
    return;
  }
  
  if (Notification.permission === 'granted') {
    // Create notification
    const notification = new Notification(title, {
      icon: '/icons/icon-192x192.png',
      ...options
    });
    
    // Handle notification click
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  }
}

// Function to check if the app can be installed (PWA)
export function canInstallPWA(): boolean {
  return !!window.matchMedia('(display-mode: browser)').matches && 
         'BeforeInstallPromptEvent' in window;
}
