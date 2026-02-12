import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { oneSignalService } from '@/services/oneSignalService';

export const usePushNotifications = () => {
  const [isSupported, setIsSupported] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const supported = 'Notification' in window && 'serviceWorker' in navigator;
    setIsSupported(supported);
    if (supported) {
      setPermission(Notification.permission);
    }
    
    // Initialize OneSignal on mount
    if (supported && oneSignalService.isConfigured()) {
      oneSignalService.initialize().then(() => {
        console.log('OneSignal ready');
      });
    }
    
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('onesignal_player_id')
        .eq('id', user.id)
        .single();

      if ((profile as any)?.onesignal_player_id) {
        setIsEnabled(true);
      }
    } catch (error) {
      console.error('Error checking notification status:', error);
    }
  };

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      toast({ title: 'Not Supported', description: 'Push notifications are not supported in this browser.', variant: 'destructive' });
      return false;
    }

    if (Notification.permission === 'denied') {
      toast({
        title: 'Permission Blocked',
        description: 'Notifications are blocked. Click the 🔒 lock icon in your browser address bar → Site settings → Allow notifications, then refresh.',
        variant: 'destructive'
      });
      return false;
    }

    setIsLoading(true);

    try {
      // Try OneSignal first
      if (oneSignalService.isConfigured()) {
        console.log('Requesting permission via OneSignal...');
        const granted = await oneSignalService.requestPermission();
        
        if (granted) {
          await enableWithOneSignal();
          setIsLoading(false);
          return true;
        }
        
        // If OneSignal didn't work (SDK not loaded), fall back to native
        console.log('OneSignal permission not granted, trying native...');
      }

      // Fallback: browser native notifications
      console.log('Requesting native notification permission...');
      const perm = await Notification.requestPermission();
      setPermission(perm);
      
      if (perm === 'granted') {
        await enableNative();
        setIsLoading(false);
        return true;
      } else {
        toast({
          title: 'Permission Not Granted',
          description: perm === 'denied' 
            ? 'Notifications were blocked. Change this in your browser settings.' 
            : 'You dismissed the notification prompt. Click Enable to try again.',
          variant: 'destructive'
        });
      }
      
      setIsLoading(false);
      return false;
    } catch (error) {
      console.error('Error requesting permission:', error);
      toast({ title: 'Error', description: 'Failed to request notification permission.', variant: 'destructive' });
      setIsLoading(false);
      return false;
    }
  }, [isSupported, toast]);

  const enableWithOneSignal = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await oneSignalService.setExternalUserId(user.id);
    const playerId = await oneSignalService.getPlayerId();

    if (playerId) {
      await supabase
        .from('profiles')
        .update({ onesignal_player_id: playerId } as any)
        .eq('id', user.id);
      
      console.log('✅ OneSignal enabled, player ID saved:', playerId);
    }

    setIsEnabled(true);
    setPermission('granted');
    toast({ title: 'Notifications Enabled', description: 'Push notifications activated via OneSignal!' });
  };

  const enableNative = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const nativeId = `native_${user.id}_${Date.now()}`;
    await supabase
      .from('profiles')
      .update({ onesignal_player_id: nativeId } as any)
      .eq('id', user.id);

    setIsEnabled(true);
    setPermission('granted');
    toast({ title: 'Notifications Enabled', description: 'Browser notifications enabled!' });
  };

  const disableNotifications = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('profiles')
        .update({ onesignal_player_id: null } as any)
        .eq('id', user.id);

      setIsEnabled(false);
      toast({ title: 'Notifications Disabled', description: 'Push notifications have been disabled.' });
    } catch (error) {
      console.error('Error disabling notifications:', error);
      toast({ title: 'Error', description: 'Failed to disable notifications.', variant: 'destructive' });
    }
  };

  const testNotification = async () => {
    if (!isSupported || Notification.permission !== 'granted') {
      toast({ title: 'Setup Required', description: 'Please enable notifications first.', variant: 'destructive' });
      return;
    }

    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification('Test Notification', {
          body: 'Notifications are working! 🥛🐄',
          icon: '/android-chrome-192x192.png',
          badge: '/favicon-32x32.png',
          tag: 'test',
        });
      } else {
        new Notification('Test Notification', {
          body: 'Notifications are working! 🥛🐄',
          icon: '/android-chrome-192x192.png',
        });
      }

      toast({ title: 'Test Sent', description: 'Check your notification tray!' });
    } catch (error) {
      console.error('Test notification error:', error);
      toast({ title: 'Error', description: 'Failed to send test notification.', variant: 'destructive' });
    }
  };

  const refreshPermissionStatus = () => {
    const p = Notification.permission;
    setPermission(p);
    return p;
  };

  return {
    isSupported,
    permission,
    token: null as string | null,
    isEnabled,
    isLoading,
    requestPermission,
    disableNotifications,
    testNotification,
    refreshPermissionStatus,
  };
};
