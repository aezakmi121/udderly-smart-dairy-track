import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import { firebaseConfig, vapidKey } from '@/config/firebase';

let app: any = null;
let messaging: any = null;

export const initializeFirebaseMessaging = async () => {
  try {
    // Check if Firebase Messaging is supported
    const supported = await isSupported();
    if (!supported) {
      console.log('Firebase Messaging not supported in this browser');
      return null;
    }

    // Initialize Firebase if not already done
    if (!app) {
      app = initializeApp(firebaseConfig);
      messaging = getMessaging(app);
    }

    return messaging;
  } catch (error) {
    console.error('Error initializing Firebase Messaging:', error);
    return null;
  }
};

export const requestNotificationPermission = async (): Promise<string | null> => {
  try {
    const messagingInstance = await initializeFirebaseMessaging();
    if (!messagingInstance) {
      return null;
    }

    // Check if service worker is registered
    if (!('serviceWorker' in navigator)) {
      console.error('Service Worker not supported');
      return null;
    }

    // Register service worker for Firebase messaging
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    
    // Check if permission is already granted, don't request again
    if (Notification.permission !== 'granted') {
      console.log('Permission not granted, cannot get FCM token');
      return null;
    }

    const token = await getToken(messagingInstance, {
      vapidKey: vapidKey,
      serviceWorkerRegistration: registration
    });

    console.log('FCM Token generated:', token);
    return token;
  } catch (error) {
    console.error('Error getting FCM token:', error);
    return null;
  }
};

export const setupForegroundMessageListener = (onMessageCallback: (payload: any) => void) => {
  if (!messaging) {
    console.log('Messaging not initialized');
    return;
  }

  // Handle messages when app is in foreground
  onMessage(messaging, (payload) => {
    console.log('Foreground message received:', payload);
    onMessageCallback(payload);
    
    // Show notification manually for foreground messages
    if (payload.notification) {
      new Notification(payload.notification.title || 'New Message', {
        body: payload.notification.body,
        icon: '/android-chrome-192x192.png',
        badge: '/favicon-32x32.png'
      });
    }
  });
};

export const getFCMToken = async (): Promise<string | null> => {
  try {
    const messagingInstance = await initializeFirebaseMessaging();
    if (!messagingInstance) {
      return null;
    }

    const registration = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js');
    if (!registration) {
      console.log('Service worker not registered, registering now...');
      await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    }

    const token = await getToken(messagingInstance, {
      vapidKey: vapidKey
    });

    return token;
  } catch (error) {
    console.error('Error getting FCM token:', error);
    return null;
  }
};