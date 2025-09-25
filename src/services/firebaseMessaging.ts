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
      console.log('Firebase messaging not available, falling back to browser notifications');
      return null;
    }

    // Check if service worker is supported
    if (!('serviceWorker' in navigator)) {
      console.error('Service Worker not supported');
      return null;
    }

    // Clear any existing registrations to avoid conflicts
    const existingRegistrations = await navigator.serviceWorker.getRegistrations();
    console.log(`Found ${existingRegistrations.length} existing service worker registrations`);

    // Register Firebase messaging service worker
    let registration;
    try {
      registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
        scope: '/'
      });
      console.log('Firebase messaging service worker registered successfully');
      
      // Wait for the service worker to be ready
      await navigator.serviceWorker.ready;
    } catch (regError) {
      console.error('Failed to register Firebase messaging service worker:', regError);
      return null;
    }
    
    // Check current permission
    let permission = Notification.permission;
    if (permission !== 'granted') {
      console.log('Requesting notification permission for FCM...');
      permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.log('Permission denied, cannot get FCM token');
        return null;
      }
    }

    try {
      const token = await getToken(messagingInstance, {
        vapidKey: vapidKey,
        serviceWorkerRegistration: registration
      });

      console.log('FCM Token generated:', token);
      return token;
    } catch (tokenError) {
      console.error('Error getting FCM token:', tokenError);
      // This is where the "Registration failed - push service error" typically occurs
      return null;
    }
  } catch (error) {
    console.error('Error in requestNotificationPermission:', error);
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

    // Use existing service worker registration or register Firebase SW
    let registration = await navigator.serviceWorker.getRegistration();
    if (!registration) {
      console.log('Registering Firebase messaging service worker...');
      registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
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