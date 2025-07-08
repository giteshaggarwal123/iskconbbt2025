
// iOS-compatible service worker - minimal functionality
const CACHE_NAME = 'iskcon-bureau-v1';

// Check if we're running in a native app context
const isNativeApp = () => {
  return self.location.protocol === 'capacitor:' || 
         (typeof window !== 'undefined' && window.Capacitor && window.Capacitor.isNative);
};

self.addEventListener('install', function(event) {
  console.log('Service Worker installing...');
  // Skip waiting immediately in native apps
  if (isNativeApp()) {
    console.log('Native app detected - skipping service worker features');
    return;
  }
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  console.log('Service Worker activating...');
  if (isNativeApp()) {
    console.log('Native app detected - minimal activation');
    return;
  }
  event.waitUntil(self.clients.claim());
});

// Disable push notifications in native context - they're handled by Capacitor
self.addEventListener('push', function(event) {
  if (isNativeApp()) {
    console.log('Push notification skipped in native app');
    return;
  }
  
  // Web-only push notification handling
  let notificationData = {
    title: 'ISKCON Bureau Portal',
    body: 'You have a new notification',
    icon: '/lovable-uploads/7ccf6269-31c1-46b9-bc5c-60b58a22c03e.png',
    tag: 'iskcon-notification'
  };

  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = { ...notificationData, ...data };
    } catch (e) {
      console.log('Error parsing push data:', e);
    }
  }

  const promiseChain = self.registration.showNotification(
    notificationData.title,
    notificationData
  );

  event.waitUntil(promiseChain);
});

// Minimal fetch handling - avoid caching in native apps
self.addEventListener('fetch', function(event) {
  if (isNativeApp()) {
    return; // Let native app handle all requests
  }
  
  // Simple pass-through for web version
  return;
});
