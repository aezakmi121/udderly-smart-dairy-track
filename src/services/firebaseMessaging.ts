import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import { firebaseConfig, vapidKey } from '@/config/firebase';

let app: any = null;
let messaging: any = null;

export const initializeFirebaseMessaging = async () => {
  try {
    console.log('🔥 FIREBASE INIT: Starting Firebase Messaging initialization...');
    console.log('🔍 FIREBASE CONFIG:', {
      apiKey: firebaseConfig.apiKey?.substring(0, 15) + '...',
      projectId: firebaseConfig.projectId,
      messagingSenderId: firebaseConfig.messagingSenderId,
      appId: firebaseConfig.appId?.substring(0, 15) + '...',
      hasVapidKey: !!vapidKey,
      vapidKeyLength: vapidKey?.length
    });
    
    // Check if Firebase Messaging is supported
    console.log('🔍 SUPPORT CHECK: Checking Firebase Messaging support...');
    const supported = await isSupported();
    console.log('🔍 SUPPORT RESULT:', supported);
    
    if (!supported) {
      console.error('❌ FIREBASE: Firebase Messaging not supported in this browser');
      console.log('🔍 BROWSER INFO:', {
        userAgent: navigator.userAgent,
        serviceWorkerSupported: 'serviceWorker' in navigator,
        notificationSupported: 'Notification' in window
      });
      return null;
    }

    // Initialize Firebase if not already done
    if (!app) {
      console.log('🚀 FIREBASE: Initializing Firebase app...');
      app = initializeApp(firebaseConfig);
      console.log('✅ FIREBASE: Firebase app initialized');
    } else {
      console.log('✅ FIREBASE: Using existing Firebase app');
    }
    
    if (!messaging) {
      console.log('🚀 MESSAGING: Initializing Firebase messaging...');
      messaging = getMessaging(app);
      console.log('✅ MESSAGING: Firebase messaging initialized');
    } else {
      console.log('✅ MESSAGING: Using existing messaging instance');
    }

    return messaging;
  } catch (error) {
    console.error('❌ FIREBASE INIT ERROR:', error);
    console.error('❌ ERROR DETAILS:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined
    });
    return null;
  }
};

export const requestNotificationPermission = async (): Promise<string | null> => {
  try {
    console.log('🚀 TOKEN REQUEST: Starting FCM token request process...');
    
    const messagingInstance = await initializeFirebaseMessaging();
    if (!messagingInstance) {
      console.error('❌ TOKEN REQUEST: Firebase messaging not available');
      return null;
    }
    console.log('✅ TOKEN REQUEST: Messaging instance ready');

    // Check if service worker is supported
    if (!('serviceWorker' in navigator)) {
      console.error('❌ TOKEN REQUEST: Service Worker not supported');
      return null;
    }
    console.log('✅ TOKEN REQUEST: Service Worker supported');

    // First, unregister all existing service workers to avoid conflicts
    console.log('🧹 TOKEN REQUEST: Cleaning up existing service workers...');
    const existingRegistrations = await navigator.serviceWorker.getRegistrations();
    console.log(`📋 TOKEN REQUEST: Found ${existingRegistrations.length} existing registrations`);
    
    for (const reg of existingRegistrations) {
      console.log('🗑️ TOKEN REQUEST: Unregistering:', {
        scope: (reg as ServiceWorkerRegistration).scope,
        state: (reg as ServiceWorkerRegistration).active?.state,
        scriptURL: (reg as ServiceWorkerRegistration).active?.scriptURL
      });
      await reg.unregister();
    }
    console.log('✅ TOKEN REQUEST: Cleanup complete');

    // Wait a moment for cleanup to complete
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Register fresh Firebase messaging service worker
    console.log('🚀 TOKEN REQUEST: Registering fresh Firebase messaging service worker...');
    let registration;
    try {
      registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
        scope: '/firebase-cloud-messaging-push-scope'
      });
      console.log('✅ TOKEN REQUEST: Firebase messaging service worker registered');
      console.log('📋 SW DETAILS:', {
        scope: registration.scope,
        installing: !!registration.installing,
        waiting: !!registration.waiting,
        active: !!registration.active
      });
      
      // Wait for the service worker to be ready with timeout
      console.log('⏳ TOKEN REQUEST: Waiting for service worker to be ready...');
      const readyPromise = navigator.serviceWorker.ready;
      const timeoutPromise = new Promise<ServiceWorkerRegistration>((_, reject) => 
        setTimeout(() => reject(new Error('Service worker timeout')), 10000)
      );
      
      const readyRegistration = await Promise.race([readyPromise, timeoutPromise]);
      console.log('✅ TOKEN REQUEST: Service worker is ready');
      console.log('📋 READY SW:', {
        scope: readyRegistration.scope,
        state: readyRegistration.active?.state
      });
    } catch (regError) {
      console.error('❌ TOKEN REQUEST: Failed to register Firebase messaging service worker:', regError);
      throw regError;
    }
    
    // Check current permission
    console.log('🔍 TOKEN REQUEST: Checking current notification permission...');
    let permission = Notification.permission;
    console.log('📋 PERMISSION STATUS:', permission);
    
    if (permission !== 'granted') {
      console.log('📋 TOKEN REQUEST: Requesting notification permission...');
      permission = await Notification.requestPermission();
      console.log('📋 PERMISSION RESULT:', permission);
      
      if (permission !== 'granted') {
        console.error('❌ TOKEN REQUEST: Permission denied, cannot get FCM token');
        throw new Error(`Permission denied: ${permission}`);
      }
    }
    console.log('✅ TOKEN REQUEST: Notification permission granted');

    // Attempt to get FCM token with multiple retry strategies
    console.log('🎫 TOKEN REQUEST: Attempting to get FCM token with enhanced error handling...');
    console.log('🔑 VAPID KEY:', vapidKey?.substring(0, 30) + '...');
    
    const tokenStrategies = [
      // Strategy 1: With service worker registration
      () => getToken(messagingInstance, {
        vapidKey: vapidKey,
        serviceWorkerRegistration: registration
      }),
      
      // Strategy 2: Without explicit service worker registration
      () => getToken(messagingInstance, {
        vapidKey: vapidKey
      }),
      
      // Strategy 3: After a short delay
      async () => {
        await new Promise(resolve => setTimeout(resolve, 2000));
        return getToken(messagingInstance, {
          vapidKey: vapidKey,
          serviceWorkerRegistration: registration
        });
      }
    ];

    for (let i = 0; i < tokenStrategies.length; i++) {
      try {
        console.log(`🎫 TOKEN REQUEST: Trying strategy ${i + 1}...`);
        const token = await tokenStrategies[i]();
        
        if (token) {
          console.log('✅ TOKEN REQUEST: FCM Token generated successfully!');
          console.log('🎫 TOKEN PREVIEW:', token.substring(0, 30) + '...');
          console.log('📏 TOKEN LENGTH:', token.length);
          console.log('🔍 TOKEN STRUCTURE:', {
            startsCorrectly: token.startsWith('c') || token.startsWith('f') || token.startsWith('e'),
            hasCorrectLength: token.length > 100,
            containsColon: token.includes(':')
          });
          
          return token;
        } else {
          console.warn(`⚠️ TOKEN REQUEST: Strategy ${i + 1} returned null token`);
        }
      } catch (tokenError) {
        console.error(`❌ TOKEN REQUEST: Strategy ${i + 1} failed:`, tokenError);
        
        // Log specific error details for the first strategy
        if (i === 0) {
          console.error('❌ DETAILED ERROR ANALYSIS:', {
            name: tokenError instanceof Error ? tokenError.name : 'Unknown',
            message: tokenError instanceof Error ? tokenError.message : tokenError,
            stack: tokenError instanceof Error ? tokenError.stack : undefined
          });
          
          // Analyze specific error types
          if (tokenError instanceof Error) {
            if (tokenError.message.includes('Registration failed')) {
              console.error('🔍 SPECIFIC ERROR: Push service registration failed - FCM servers unreachable or VAPID key incorrect');
            } else if (tokenError.message.includes('messaging/unsupported-browser')) {
              console.error('🔍 SPECIFIC ERROR: Browser not supported for FCM');
            } else if (tokenError.message.includes('messaging/permission-blocked')) {
              console.error('🔍 SPECIFIC ERROR: Notification permission blocked');
            } else if (tokenError.message.includes('AbortError')) {
              console.error('🔍 SPECIFIC ERROR: Request was aborted - likely network or server issue');
            }
          }
        }
        
        // If this is the last strategy, throw the error
        if (i === tokenStrategies.length - 1) {
          throw tokenError;
        }
      }
    }
    
    throw new Error('All token generation strategies failed');
    
  } catch (error) {
    console.error('❌ TOKEN REQUEST: Complete failure in requestNotificationPermission:', error);
    console.error('❌ ERROR SUMMARY:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : error,
      isAbortError: error instanceof Error && error.name === 'AbortError',
      isNetworkError: error instanceof Error && error.message.includes('network'),
      isPermissionError: error instanceof Error && error.message.includes('permission')
    });
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
    console.log('🎫 GET TOKEN: Starting getFCMToken...');
    
    const messagingInstance = await initializeFirebaseMessaging();
    if (!messagingInstance) {
      console.error('❌ GET TOKEN: No messaging instance available');
      return null;
    }
    console.log('✅ GET TOKEN: Messaging instance ready');

    // Use existing service worker registration or register Firebase SW
    console.log('🔍 GET TOKEN: Checking for existing service worker registration...');
    let registration = await navigator.serviceWorker.getRegistration();
    
    if (!registration) {
      console.log('🚀 GET TOKEN: No existing registration, registering Firebase messaging service worker...');
      try {
        registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        console.log('✅ GET TOKEN: Firebase messaging service worker registered');
      } catch (regError) {
        console.error('❌ GET TOKEN: Failed to register service worker:', regError);
        return null;
      }
    } else {
      console.log('✅ GET TOKEN: Using existing service worker registration');
      console.log('📋 GET TOKEN: Registration details:', {
        scope: registration.scope,
        state: registration.active?.state,
        scriptURL: registration.active?.scriptURL
      });
    }

    console.log('🎫 GET TOKEN: Requesting FCM token...');
    console.log('🔑 GET TOKEN: VAPID key preview:', vapidKey?.substring(0, 30) + '...');
    
    try {
      const token = await getToken(messagingInstance, {
        vapidKey: vapidKey
      });

      if (token) {
        console.log('✅ GET TOKEN: FCM token generated successfully!');
        console.log('🎫 GET TOKEN: Token preview:', token.substring(0, 30) + '...');
        console.log('📏 GET TOKEN: Token length:', token.length);
      } else {
        console.error('❌ GET TOKEN: No token returned from getToken()');
      }

      return token;
    } catch (tokenError) {
      console.error('❌ GET TOKEN: Error getting FCM token:', tokenError);
      console.error('❌ GET TOKEN: Error details:', {
        name: tokenError instanceof Error ? tokenError.name : 'Unknown',
        message: tokenError instanceof Error ? tokenError.message : tokenError,
        stack: tokenError instanceof Error ? tokenError.stack : undefined
      });
      return null;
    }
  } catch (error) {
    console.error('❌ GET TOKEN: Unexpected error:', error);
    return null;
  }
};