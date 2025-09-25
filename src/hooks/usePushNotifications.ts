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
    console.log('🔄 ENABLE: Starting notification enablement process...');
    console.log('🔍 ENABLE: Current state:', {
      isSupported,
      permission: Notification.permission,
      hasToken: !!token,
      isEnabled
    });
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('❌ ENABLE: User not authenticated');
        throw new Error('User not authenticated');
      }
      console.log('✅ ENABLE: User authenticated:', { id: user.id, email: user.email });

      // Check permission again before enabling
      const currentPermission = Notification.permission;
      console.log('🔍 ENABLE: Current permission:', currentPermission);
      
      if (currentPermission !== 'granted') {
        console.error('❌ ENABLE: Permission not granted:', currentPermission);
        throw new Error(`Notification permission not granted: ${currentPermission}`);
      }
      console.log('✅ ENABLE: Permission is granted');

      console.log('🧹 ENABLE: Cleaning up existing service workers...');
      
      // Clean up any existing service workers first
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        console.log(`🔍 ENABLE: Found ${registrations.length} existing service worker registrations`);
        
        // Unregister old service workers to avoid conflicts
        for (const registration of registrations) {
          console.log('🔍 ENABLE: Checking registration:', {
            scope: registration.scope,
            scriptURL: registration.active?.scriptURL
          });
          
          if (registration.scope.includes('firebase-messaging')) {
            console.log('🗑️ ENABLE: Unregistering old Firebase messaging service worker');
            await registration.unregister();
          }
        }
      }
      console.log('✅ ENABLE: Service worker cleanup complete');
      
      // Try to get FCM token from Firebase first
      console.log('🎫 ENABLE: Attempting to get FCM token...');
      const fcmToken = await requestNotificationPermission();
      console.log('🎫 ENABLE: FCM token result:', fcmToken ? `${fcmToken.substring(0, 30)}...` : 'null');
      
      let tokenToSave = fcmToken;
      let tokenType = 'FCM';
      
      if (!fcmToken) {
        console.log('⚠️ FCM token generation failed, using browser fallback token');
        // Fallback to browser token for testing
        tokenToSave = `browser_${user.id}_${Date.now()}`;
        tokenType = 'Browser';
        
        // Register fallback service worker for browser notifications
        if ('serviceWorker' in navigator) {
          try {
            await navigator.serviceWorker.register('/sw.js');
            console.log('✅ Fallback service worker registered');
          } catch (swError) {
            console.error('❌ Failed to register fallback service worker:', swError);
          }
        }
      } else {
        console.log('✅ FCM token generated successfully:', fcmToken.substring(0, 20) + '...');
        // Set up foreground message listener for FCM
        setupForegroundMessageListener((payload) => {
          console.log('📱 Foreground notification received:', payload);
          toast({
            title: payload.notification?.title || 'Notification',
            description: payload.notification?.body || 'New message received',
          });
        });
      }

      // Save token to user profile with debug info
      console.log(`💾 Saving ${tokenType} token to profile:`, tokenToSave.substring(0, 20) + '...');
      const { error } = await supabase
        .from('profiles')
        .update({ fcm_token: tokenToSave } as any)
        .eq('id', user.id);

      if (error) {
        console.error('❌ Failed to save token to profile:', error);
        throw error;
      }

      setToken(tokenToSave);
      setIsEnabled(true);

      // Start notification scheduler
      notificationScheduler.start();

      toast({
        title: 'Notifications Enabled',
        description: `${tokenType} notifications activated successfully! Token: ${tokenToSave.substring(0, 20)}...`,
      });

      console.log('🎉 Notifications setup complete!', {
        tokenType,
        tokenPreview: tokenToSave.substring(0, 20) + '...',
        permission: currentPermission
      });

    } catch (error) {
      console.error('❌ Error enabling notifications:', error);
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
    console.log('🧪 TEST: Starting test notification process...');
    console.log('🔍 TEST: Current state:', {
      isSupported,
      permission: Notification.permission,
      hasToken: !!token,
      tokenPreview: token ? token.substring(0, 20) + '...' : 'null',
      isEnabled
    });
    
    if (!isSupported) {
      console.error('❌ TEST: Push notifications not supported');
      toast({
        title: 'Not Supported',
        description: 'Push notifications are not supported in this browser.',
        variant: 'destructive'
      });
      return;
    }

    try {
      // Check if permission is granted, if not request it
      const currentPermission = Notification.permission;
      console.log('🔍 TEST: Current permission:', currentPermission);
      
      if (currentPermission !== 'granted') {
        console.log('🔐 TEST: Requesting notification permission...');
        const permission = await Notification.requestPermission();
        console.log('📋 TEST: Permission result:', permission);
        setPermission(permission);
        
        if (permission !== 'granted') {
          console.error('❌ TEST: Permission denied');
          toast({
            title: 'Permission Denied',
            description: 'Please allow notifications in your browser to receive alerts.',
            variant: 'destructive'
          });
          return;
        }
        
        // If permission was just granted, enable notifications
        if (!isEnabled) {
          console.log('🔄 TEST: Permission just granted, enabling notifications...');
          await enableNotifications();
        }
      }

      // If still not enabled after permission granted, show error
      if (!isEnabled || !token) {
        console.error('❌ TEST: Not enabled or no token:', { isEnabled, hasToken: !!token });
        toast({
          title: 'Setup Required',
          description: 'Please enable notifications first using the Enable button.',
          variant: 'destructive'
        });
        return;
      }

      console.log('📤 TEST: Sending test notification...');
      console.log('🎫 TEST: Using token:', token.substring(0, 30) + '...');
      console.log('📏 TEST: Token length:', token.length);

      // Prepare notification payload
      const notificationPayload = {
        tokens: [token],
        title: 'Test Notification',
        body: 'This is a test notification from Dairy Farm Manager! 🥛 If you see this, notifications are working correctly.',
        data: {
          type: 'test',
          timestamp: new Date().toISOString()
        }
      };
      
      console.log('📦 TEST: Notification payload:', {
        tokenCount: notificationPayload.tokens.length,
        title: notificationPayload.title,
        bodyLength: notificationPayload.body.length,
        dataKeys: Object.keys(notificationPayload.data)
      });

      // Send actual FCM notification to test the full pipeline
      console.log('🚀 TEST: Invoking edge function...');
      const { data, error: sendError } = await supabase.functions.invoke('send-push-notification', {
        body: notificationPayload
      });

      console.log('📊 TEST: Edge function response:', { 
        hasData: !!data, 
        hasError: !!sendError,
        data: data,
        error: sendError 
      });

      if (sendError) {
        console.error('❌ TEST: FCM test failed with error:', sendError);
        console.error('❌ TEST: Error details:', {
          name: sendError.name,
          message: sendError.message,
          code: sendError.code
        });
        
        // If it's an UNREGISTERED token error, try to refresh the token
        if (sendError.message?.includes('UNREGISTERED') || sendError.message?.includes('NOT_FOUND')) {
          console.log('🔄 TEST: Token appears invalid, attempting to refresh...');
          toast({
            title: 'Token Expired',
            description: 'Your notification token has expired. Refreshing...',
            variant: 'default'
          });
          
          // Try to re-enable notifications to get a fresh token
          await enableNotifications();
          return;
        }
        
        // Fallback to local notification if FCM fails for other reasons
        console.log('🔄 TEST: Falling back to local notification');
        if ('serviceWorker' in navigator) {
          try {
            const registration = await navigator.serviceWorker.ready;
            console.log('📱 TEST: Showing local notification via service worker');
            
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
          } catch (localError) {
            console.error('❌ TEST: Local notification also failed:', localError);
            throw sendError;
          }
        } else {
          throw sendError;
        }
      } else if (data && data.failed > 0) {
        // Check if the response indicates failures even when no error is thrown
        console.log('⚠️ TEST: Edge function succeeded but FCM sends failed');
        console.log('📊 TEST: Response details:', {
          sent: data.sent,
          failed: data.failed,
          success: data.success,
          message: data.message,
          details: data.details
        });
        
        // Clear the expired token from the user's profile
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          console.log('🗑️ TEST: Clearing expired token from database...');
          await supabase
            .from('profiles')
            .update({ fcm_token: null })
            .eq('id', user.id);
        }

        // Clear local state
        setToken(null);
        setIsEnabled(false);
        
        toast({
          title: 'Token Expired',
          description: 'Your notification token expired. Click "Enable Notifications" to get a fresh one.',
          variant: 'default'
        });
        
        return;
      } else {
        console.log('✅ TEST: FCM test notification sent successfully!');
        console.log('📊 TEST: Response data:', data);
        console.log('🎉 TEST: Success details:', {
          sent: data?.sent,
          failed: data?.failed,
          message: data?.message
        });
        
        toast({
          title: 'Test Sent',
          description: data?.message || 'FCM test notification sent successfully!',
        });
      }

    } catch (error) {
      console.error('❌ TEST: Unexpected error during test notification:', error);
      console.error('❌ TEST: Error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined
      });
      
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