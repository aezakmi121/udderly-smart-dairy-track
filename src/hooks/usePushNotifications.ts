import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { oneSignalService } from '@/services/oneSignalService';

export const usePushNotifications = () => {
  const [isSupported, setIsSupported] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const { toast } = useToast();

  useEffect(() => {
    const supported = 'Notification' in window;
    setIsSupported(supported);
    if (supported) {
      setPermission(Notification.permission);
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

  const requestPermission = async (): Promise<boolean> => {
    if (!isSupported) {
      toast({ title: 'Not Supported', description: 'Push notifications are not supported.', variant: 'destructive' });
      return false;
    }

    try {
      if (Notification.permission === 'denied') {
        toast({
          title: 'Permission Blocked',
          description: 'Click the 🔒 lock icon in your browser address bar and allow notifications.',
          variant: 'destructive'
        });
        return false;
      }

      // If OneSignal is configured, use it
      if (oneSignalService.isConfigured()) {
        const granted = await oneSignalService.requestPermission();
        if (granted) {
          await enableWithOneSignal();
          return true;
        }
        return false;
      }

      // Fallback: browser native notifications
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm === 'granted') {
        await enableNative();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error requesting permission:', error);
      toast({ title: 'Error', description: 'Failed to request notification permission.', variant: 'destructive' });
      return false;
    }
  };

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
    toast({ title: 'Notifications Enabled', description: 'Browser notifications enabled. For full push support, configure OneSignal.' });
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
    requestPermission,
    disableNotifications,
    testNotification,
    refreshPermissionStatus,
  };
};
