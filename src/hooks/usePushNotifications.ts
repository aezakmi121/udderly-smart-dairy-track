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

    if (!oneSignalService.isConfigured()) {
      toast({ title: 'Not Configured', description: 'OneSignal is not configured.', variant: 'destructive' });
      return false;
    }

    setIsLoading(true);

    try {
      console.log('Requesting permission via OneSignal...');
      const granted = await oneSignalService.requestPermission();

      if (!granted) {
        toast({
          title: 'Permission Not Granted',
          description: Notification.permission === 'denied'
            ? 'Notifications were blocked. Change this in your browser settings.'
            : 'You dismissed the notification prompt. Click Enable to try again.',
          variant: 'destructive'
        });
        setIsLoading(false);
        return false;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return false;
      }

      await oneSignalService.setExternalUserId(user.id);
      const playerId = await oneSignalService.getPlayerId();

      if (playerId) {
        await supabase
          .from('profiles')
          .update({ onesignal_player_id: playerId } as any)
          .eq('id', user.id);

        console.log('✅ OneSignal enabled, subscription ID saved:', playerId);
      } else {
        console.warn('⚠️ OneSignal permission granted but no subscription ID yet — user is still registered via external ID');
      }

      setIsEnabled(true);
      setPermission('granted');
      toast({ title: 'Notifications Enabled', description: 'Push notifications activated via OneSignal!' });
      setIsLoading(false);
      return true;
    } catch (error) {
      console.error('Error requesting permission:', error);
      toast({ title: 'Error', description: 'Failed to request notification permission.', variant: 'destructive' });
      setIsLoading(false);
      return false;
    }
  }, [isSupported, toast]);

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

  const sendTestToSelf = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: 'Not Logged In', description: 'You must be logged in to send a test notification.', variant: 'destructive' });
        return;
      }

      const { data, error } = await supabase.functions.invoke('send-onesignal-notification', {
        body: {
          title: 'Test Notification',
          body: 'Your push notifications are working! 🥛🐄',
          userId: user.id,
          data: { type: 'admin_test', timestamp: new Date().toISOString() },
        },
      });

      if (error) throw error;

      toast({ title: 'Test Sent', description: 'Check your notification tray!' });
      console.log('Test notification result:', data);
    } catch (error) {
      console.error('Test notification error:', error);
      toast({ title: 'Error', description: 'Failed to send test notification. Make sure OneSignal env vars are set in Supabase.', variant: 'destructive' });
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
    isEnabled,
    isLoading,
    requestPermission,
    disableNotifications,
    sendTestToSelf,
    refreshPermissionStatus,
  };
};
