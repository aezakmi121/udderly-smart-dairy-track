import { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Firebase configuration - replace with your actual config
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id"
};

// VAPID key - replace with your actual VAPID key
const VAPID_KEY = "your-vapid-key";

export const usePushNotifications = () => {
  const [isSupported, setIsSupported] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const { toast } = useToast();

  useEffect(() => {
    // Check if the browser supports notifications
    setIsSupported('Notification' in window && 'serviceWorker' in navigator);
    setPermission(Notification.permission);
  }, []);

  const requestPermission = async (): Promise<boolean> => {
    if (!isSupported) {
      toast({
        title: 'Not Supported',
        description: 'Push notifications are not supported in this browser.',
        variant: 'destructive'
      });
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      setPermission(permission);
      
      if (permission === 'granted') {
        await initializeFirebaseMessaging();
        return true;
      } else {
        toast({
          title: 'Permission Denied',
          description: 'Please enable notifications to receive alerts.',
          variant: 'destructive'
        });
        return false;
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      toast({
        title: 'Error',
        description: 'Failed to request notification permission.',
        variant: 'destructive'
      });
      return false;
    }
  };

  const initializeFirebaseMessaging = async () => {
    try {
      // Initialize Firebase
      const app = initializeApp(firebaseConfig);
      const messaging = getMessaging(app);

      // Register service worker
      const registration = await navigator.serviceWorker.register('/sw.js');
      
      // Get FCM token
      const currentToken = await getToken(messaging, {
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: registration
      });

      if (currentToken) {
        console.log('FCM Token:', currentToken);
        setToken(currentToken);
        
        // Save token to user profile
        const { error } = await supabase
          .from('profiles')
          .update({ fcm_token: currentToken })
          .eq('id', (await supabase.auth.getUser()).data.user?.id);

        if (error) {
          console.error('Error saving FCM token:', error);
        } else {
          toast({
            title: 'Notifications Enabled',
            description: 'You will now receive push notifications.',
          });
        }

        // Handle foreground messages
        onMessage(messaging, (payload) => {
          console.log('Message received in foreground:', payload);
          
          toast({
            title: payload.notification?.title || 'New Notification',
            description: payload.notification?.body || '',
          });
        });

      } else {
        console.log('No registration token available.');
        toast({
          title: 'Token Error',
          description: 'Unable to generate notification token.',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error initializing Firebase messaging:', error);
      toast({
        title: 'Initialization Error',
        description: 'Failed to initialize push notifications.',
        variant: 'destructive'
      });
    }
  };

  const testNotification = async () => {
    if (!token) {
      toast({
        title: 'No Token',
        description: 'Please enable notifications first.',
        variant: 'destructive'
      });
      return;
    }

    try {
      const { error } = await supabase.functions.invoke('send-push-notification', {
        body: {
          tokens: [token],
          title: 'Test Notification',
          body: 'This is a test push notification from Dairy Farm Manager!',
          data: { type: 'test' }
        }
      });

      if (error) {
        throw error;
      }

      toast({
        title: 'Test Sent',
        description: 'Test notification sent successfully!',
      });
    } catch (error) {
      console.error('Error sending test notification:', error);
      toast({
        title: 'Send Error',
        description: 'Failed to send test notification.',
        variant: 'destructive'
      });
    }
  };

  return {
    isSupported,
    permission,
    token,
    requestPermission,
    testNotification
  };
};