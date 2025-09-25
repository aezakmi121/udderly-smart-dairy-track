// Firebase Messaging Service Worker
// This service worker handles background push notifications

importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBvJ8nR2nPJKqr8HrR1WaW2m2Kqk5nQqPc",
  authDomain: "dairy-farm-manager.firebaseapp.com", 
  projectId: "dairy-farm-manager",
  storageBucket: "dairy-farm-manager.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef123456789"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('Background message received:', payload);
  
  const notificationTitle = payload.notification?.title || payload.data?.title || 'Dairy Farm Manager';
  const notificationOptions = {
    body: payload.notification?.body || payload.data?.body || 'New notification',
    icon: '/android-chrome-192x192.png',
    badge: '/favicon-32x32.png',
    tag: payload.data?.type || 'general',
    data: payload.data || {},
    actions: [
      {
        action: 'view',
        title: 'View',
        icon: '/favicon-16x16.png'
      }
    ]
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Notification click received:', event);
  
  event.notification.close();
  
  if (event.action === 'view' || !event.action) {
    // Open the app
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});