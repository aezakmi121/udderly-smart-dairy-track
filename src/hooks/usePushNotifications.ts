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
      
      // Handle different permission states
      if (permission === 'denied') {
        // Permission was previously denied - user needs to manually enable in browser
        toast({
          title: 'Permission Previously Denied',
          description: 'Please click the 🔒 lock icon in your browser address bar and allow notifications, then try again.',
          variant: 'destructive'
        });
        return false;
      } else if (permission === 'default') {
        console.log('Requesting notification permission...');
        // Request permission for the first time
        permission = await Notification.requestPermission();
        console.log('Permission result:', permission);
      }
      
      setPermission(permission);
      
      if (permission === 'granted') {
        await enableNotifications();
        return true;
      } else {
        toast({
          title: 'Permission Required',
          description: permission === 'denied' 
            ? 'Click the 🔒 lock icon in your browser address bar to allow notifications'
            : 'Please allow notifications to receive important updates.',
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

      // Check permission again before enabling
      const currentPermission = Notification.permission;
      if (currentPermission !== 'granted') {
        throw new Error(`Notification permission not granted: ${currentPermission}`);
      }

      console.log('Attempting to get FCM token...');
      
      // Clean up any existing service workers first
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        console.log('Existing service worker registrations:', registrations.length);
      }
      
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
          try {
            await navigator.serviceWorker.register('/sw.js');
            console.log('Fallback service worker registered');
          } catch (swError) {
            console.error('Failed to register fallback service worker:', swError);
          }
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

  const refreshPermissionStatus = () => {
    const currentPermission = Notification.permission;
    setPermission(currentPermission);
    console.log('Permission status refreshed:', currentPermission);
    return currentPermission;
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
      
      // Update permission state
      setPermission(Notification.permission);

      // Stop notification scheduler
      notificationScheduler.stop();

      toast({
        title: 'Notifications Disabled',
        description: 'Push notifications have been disabled. To re-enable, use the Enable button above.',
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

      // Send actual FCM notification to test the full pipeline
      const { error: sendError } = await supabase.functions.invoke('send-push-notification', {
        body: {
          tokens: [token],
          title: 'Test Notification',
          body: 'This is a test notification from Dairy Farm Manager! 🥛 If you see this, notifications are working correctly.',
          data: {
            type: 'test',
            timestamp: new Date().toISOString()
          }
        }
      });

      if (sendError) {
        console.error('FCM test failed, falling back to local notification:', sendError);
        
        // Fallback to local notification if FCM fails
        if ('serviceWorker' in navigator) {
          const registration = await navigator.serviceWorker.ready;
          
          await registration.showNotification('Test Notification (Local)', {
            body: 'This is a local test notification from Dairy Farm Manager! 🥛',
            icon: '/android-chrome-192x192.png',
            badge: '/favicon-32x32.png',
            tag: 'test',
            requireInteraction: false,
            silent: false
          });

          toast({
            title: 'Local Test Sent',
            description: 'FCM failed, but local notification sent successfully.',
            variant: 'default'
          });
        } else {
          throw sendError;
        }
      } else {
        toast({
          title: 'Test Sent',
          description: 'FCM test notification sent successfully!',
        });
      }

    } catch (error) {
      console.error('Test notification error:', error);
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
    testNotification,
    refreshPermissionStatus
  };
};