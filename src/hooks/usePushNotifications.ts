import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { notificationScheduler } from '@/services/notificationScheduler';
import { requestNotificationPermission, setupForegroundMessageListener, getFCMToken } from '@/services/firebaseMessaging';

export const usePushNotifications = () => {
  const [isSupported, setIsSupported] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isEnabled, setIsEnabled] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Check if the browser supports notifications
    setIsSupported('Notification' in window && 'serviceWorker' in navigator);
    setPermission(Notification.permission);
    
    // Check if user has already enabled notifications
    checkNotificationStatus();
  }, []);

  const checkNotificationStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('fcm_token')
          .eq('id', user.id)
          .single();
        
        if (profile?.fcm_token) {
          setToken(profile.fcm_token);
          setIsEnabled(true);
        }
      }
    } catch (error) {
      console.error('Error checking notification status:', error);
    }
  };

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
      // Check current permission status first
      console.log('Current permission status:', Notification.permission);
      
      let permission = Notification.permission;
      
      // Only request permission if not already granted or denied
      if (permission === 'default') {
        console.log('Requesting notification permission...');
        permission = await Notification.requestPermission();
      }
      
      setPermission(permission);
      
      if (permission === 'granted') {
        await enableNotifications();
        return true;
      } else {
        toast({
          title: 'Permission Denied',
          description: 'Please enable notifications in your browser settings to receive alerts.',
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

  const enableNotifications = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      console.log('Attempting to get FCM token...');
      // Try to get FCM token from Firebase first
      const fcmToken = await requestNotificationPermission();
      
      let tokenToSave = fcmToken;
      let tokenType = 'FCM';
      
      if (!fcmToken) {
        console.log('FCM token generation failed, using browser fallback token');
        // Fallback to browser token for testing
        tokenToSave = `browser_${user.id}_${Date.now()}`;
        tokenType = 'Browser';
        
        // Register fallback service worker for browser notifications
        if ('serviceWorker' in navigator) {
          await navigator.serviceWorker.register('/sw.js');
        }
      } else {
        console.log('FCM token generated successfully:', fcmToken);
        // Set up foreground message listener for FCM
        setupForegroundMessageListener((payload) => {
          console.log('Foreground notification received:', payload);
          toast({
            title: payload.notification?.title || 'Notification',
            description: payload.notification?.body || 'New message received',
          });
        });
      }

      // Save token to user profile
      const { error } = await supabase
        .from('profiles')
        .update({ fcm_token: tokenToSave } as any)
        .eq('id', user.id);

      if (error) throw error;

      setToken(tokenToSave);
      setIsEnabled(true);

      // Start notification scheduler
      notificationScheduler.start();

      toast({
        title: 'Notifications Enabled',
        description: `${tokenType} notifications activated successfully!`,
      });

    } catch (error) {
      console.error('Error enabling notifications:', error);
      toast({
        title: 'Failed to Enable',
        description: `Unable to enable notifications: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive'
      });
      throw error;
    }
  };

  const disableNotifications = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('profiles')
        .update({ fcm_token: null } as any)
        .eq('id', user.id);

      if (error) {
        throw error;
      }

      setToken(null);
      setIsEnabled(false);

      // Stop notification scheduler
      notificationScheduler.stop();

      toast({
        title: 'Notifications Disabled',
        description: 'You will no longer receive push notifications.',
      });

    } catch (error) {
      console.error('Error disabling notifications:', error);
      toast({
        title: 'Error',
        description: 'Failed to disable notifications.',
        variant: 'destructive'
      });
    }
  };

  const testNotification = async () => {
    if (!isSupported) {
      toast({
        title: 'Not Supported',
        description: 'Push notifications are not supported in this browser.',
        variant: 'destructive'
      });
      return;
    }

    try {
      // Check if permission is granted, if not request it
      if (Notification.permission !== 'granted') {
        console.log('Requesting notification permission...');
        const permission = await Notification.requestPermission();
        setPermission(permission);
        
        if (permission !== 'granted') {
          toast({
            title: 'Permission Denied',
            description: 'Please allow notifications in your browser to receive alerts.',
            variant: 'destructive'
          });
          return;
        }
        
        // If permission was just granted, enable notifications
        if (!isEnabled) {
          await enableNotifications();
        }
      }

      // If still not enabled after permission granted, show error
      if (!isEnabled || !token) {
        toast({
          title: 'Setup Required',
          description: 'Please enable notifications first using the Enable button.',
          variant: 'destructive'
        });
        return;
      }

      // Use service worker registration to show notification
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        
        await registration.showNotification('Test Notification', {
          body: 'This is a test notification from Dairy Farm Manager! 🥛',
          icon: '/android-chrome-192x192.png',
          badge: '/favicon-32x32.png',
          tag: 'test',
          requireInteraction: false,
          silent: false
        });

        toast({
          title: 'Test Sent',
          description: 'Test notification sent successfully!',
        });
      } else {
        throw new Error('Service worker not supported');
      }

    } catch (error) {
      toast({
        title: 'Send Error',
        description: `Failed to send test notification: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive'
      });
    }
  };

  return {
    isSupported,
    permission,
    token,
    isEnabled,
    requestPermission,
    disableNotifications,
    testNotification
  };
};