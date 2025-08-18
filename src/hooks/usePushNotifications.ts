import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { notificationScheduler } from '@/services/notificationScheduler';

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
      const permission = await Notification.requestPermission();
      setPermission(permission);
      
      if (permission === 'granted') {
        await enableNotifications();
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

  const enableNotifications = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Generate a simple token based on user ID and timestamp
      const browserToken = `browser_${user.id}_${Date.now()}`;
      
      // Save token to user profile
      const { error } = await supabase
        .from('profiles')
        .update({ fcm_token: browserToken } as any)
        .eq('id', user.id);

      if (error) {
        throw error;
      }

      setToken(browserToken);
      setIsEnabled(true);
      
      // Register service worker for notifications
      if ('serviceWorker' in navigator) {
        await navigator.serviceWorker.register('/sw.js');
      }

      // Start notification scheduler
      notificationScheduler.start();

      toast({
        title: 'Notifications Enabled',
        description: 'You will now receive push notifications for milking sessions and collection times.',
      });

    } catch (error) {
      console.error('Error enabling notifications:', error);
      toast({
        title: 'Failed to Enable',
        description: 'Unable to enable notifications. Please try again.',
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
    console.log('Test notification called, isSupported:', isSupported, 'isEnabled:', isEnabled, 'token:', token);
    console.log('Notification permission:', Notification.permission);
    
    if (!isSupported) {
      console.log('Browser not supported');
      toast({
        title: 'Not Supported',
        description: 'Push notifications are not supported in this browser.',
        variant: 'destructive'
      });
      return;
    }

    if (!isEnabled || !token) {
      console.log('Notifications not enabled or no token');
      toast({
        title: 'Notifications Not Enabled',
        description: 'Please enable notifications first.',
        variant: 'destructive'
      });
      return;
    }

    try {
      // Check if permission is still granted
      if (Notification.permission !== 'granted') {
        console.log('Permission not granted:', Notification.permission);
        toast({
          title: 'Permission Required',
          description: 'Please grant notification permission to send test notifications.',
          variant: 'destructive'
        });
        return;
      }

      console.log('Attempting to show notification...');

      // Show a browser notification directly
      const notification = new Notification('Test Notification', {
        body: 'This is a test notification from Dairy Farm Manager! 🥛',
        icon: '/android-chrome-192x192.png',
        badge: '/favicon-32x32.png',
        tag: 'test',
        requireInteraction: false,
        silent: false
      });

      console.log('Notification created:', notification);

      // Auto-close after 5 seconds
      setTimeout(() => {
        notification.close();
      }, 5000);

      toast({
        title: 'Test Sent',
        description: 'Test notification sent successfully!',
      });

    } catch (error) {
      console.error('Error sending test notification:', error);
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