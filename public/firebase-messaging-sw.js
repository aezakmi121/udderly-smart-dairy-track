// Firebase Messaging Service Worker
// This service worker handles background push notifications

importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

// Firebase configuration - Using your actual config
const firebaseConfig = {
  apiKey: "AIzaSyCA0DqorvBjg_tWcInU35GunCO38Ca3m0E",
  authDomain: "udderlypush.firebaseapp.com",
  projectId: "udderlypush",
  storageBucket: "udderlypush.firebasestorage.app",
  messagingSenderId: "1056245498403",
  appId: "1:1056245498403:web:25d3a6a64dc06006142796"
};

console.log('🔥 SW: Firebase service worker starting...');
console.log('🔍 SW: Config check:', {
  hasApiKey: !!firebaseConfig.apiKey,
  projectId: firebaseConfig.projectId,
  messagingSenderId: firebaseConfig.messagingSenderId
});

// Initialize Firebase
try {
  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();
  console.log('✅ SW: Firebase initialized successfully');

  // Handle background messages
  messaging.onBackgroundMessage((payload) => {
    console.log('📩 SW: Background message received:', payload);
    
    const notificationTitle = payload.notification?.title || payload.data?.title || 'Dairy Farm Manager';
    const notificationOptions = {
      body: payload.notification?.body || payload.data?.body || 'New notification',
      icon: '/android-chrome-192x192.png',
      badge: '/favicon-32x32.png',
      tag: payload.data?.type || 'general',
      data: payload.data || {},
      requireInteraction: false,
      silent: false,
      actions: [
        {
          action: 'view',
          title: 'View',
          icon: '/favicon-16x16.png'
        }
      ]
    };

    console.log('📱 SW: Showing notification:', notificationTitle);
    self.registration.showNotification(notificationTitle, notificationOptions);
  });

} catch (error) {
  console.error('❌ SW: Firebase initialization failed:', error);
}

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('👆 SW: Notification click received:', event);
  
  event.notification.close();
  
  if (event.action === 'view' || !event.action) {
    // Open the app
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Handle service worker activation
self.addEventListener('activate', (event) => {
  console.log('🚀 SW: Service worker activated');
  event.waitUntil(self.clients.claim());
});

// Handle service worker installation
self.addEventListener('install', (event) => {
  console.log('📦 SW: Service worker installing');
  self.skipWaiting();
});