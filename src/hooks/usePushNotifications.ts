import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { webPushService } from '@/services/webPushService';

export const usePushNotifications = () => {
  const [isSupported, setIsSupported] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isLoading, setIsLoading] = useState(false);
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const supported = webPushService.isSupported();
    setIsSupported(supported);
    if (supported) setPermission(Notification.permission);
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const sub = await webPushService.getSubscription();
      if (!sub) {
        setIsEnabled(false);
        setSubscriptionId(null);
        return;
      }

      // Verify the row exists in DB
      const { data: row } = await supabase
        .from('push_subscriptions' as any)
        .select('id')
        .eq('endpoint', sub.endpoint)
        .maybeSingle();

      if (row) {
        setIsEnabled(true);
        setSubscriptionId(sub.endpoint.slice(-12));
      } else {
        // Browser has a subscription but DB doesn't — re-register silently
        try {
          await webPushService.subscribe(user.id);
          setIsEnabled(true);
          setSubscriptionId(sub.endpoint.slice(-12));
        } catch {
          setIsEnabled(false);
          setSubscriptionId(null);
        }
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
    if (!webPushService.isConfigured()) {
      toast({ title: 'Not Configured', description: 'VAPID public key is missing.', variant: 'destructive' });
      return false;
    }
    if (Notification.permission === 'denied') {
      toast({
        title: 'Notifications Blocked',
        description: 'Click the 🔒 lock icon in the address bar → Site settings → Allow notifications, then refresh.',
        variant: 'destructive',
      });
      return false;
    }

    setIsLoading(true);
    try {
      const perm = await webPushService.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') {
        toast({ title: 'Permission Not Granted', description: 'Click Enable to try again.', variant: 'destructive' });
        return false;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const sub = await webPushService.subscribe(user.id);
      if (!sub) {
        toast({ title: 'Subscribe Failed', description: 'Could not register device.', variant: 'destructive' });
        return false;
      }

      setIsEnabled(true);
      setSubscriptionId(sub.endpoint.slice(-12));
      toast({ title: 'Notifications Enabled', description: 'This device will now receive push notifications.' });
      return true;
    } catch (error: any) {
      console.error('Error enabling notifications:', error);
      toast({ title: 'Error', description: error?.message || 'Failed to enable notifications.', variant: 'destructive' });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, toast]);

  const disableNotifications = async () => {
    try {
      await webPushService.unsubscribe();
      setIsEnabled(false);
      setSubscriptionId(null);
      toast({ title: 'Notifications Disabled', description: 'You will no longer receive push notifications on this device.' });
    } catch (error) {
      console.error('Error disabling notifications:', error);
      toast({ title: 'Error', description: 'Failed to disable notifications.', variant: 'destructive' });
    }
  };

  const sendTestToSelf = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: 'Not Logged In', description: 'You must be logged in.', variant: 'destructive' });
        return;
      }

      const { data, error } = await supabase.functions.invoke('send-web-push', {
        body: {
          title: '🐄 Test Notification',
          body: 'Push notifications are working!',
          userId: user.id,
          data: { type: 'test', timestamp: new Date().toISOString() },
        },
      });

      if (error) {
        toast({ title: 'Test Failed', description: (error as any)?.message || 'Unknown error', variant: 'destructive' });
        return;
      }
      if (data?.error) {
        toast({ title: 'Test Failed', description: data.error, variant: 'destructive' });
        return;
      }

      const recipients = data?.recipients ?? 0;
      if (recipients === 0) {
        toast({
          title: 'No Devices Registered',
          description: 'Click Disable then Enable to re-register this device.',
          variant: 'destructive',
        });
      } else {
        toast({ title: 'Test Sent', description: `Dispatched to ${recipients} device(s).` });
      }
    } catch (error: any) {
      console.error('Test notification error:', error);
      toast({ title: 'Error', description: error?.message || 'Failed to send test.', variant: 'destructive' });
    }
  };

  const refreshPermissionStatus = () => {
    const p = Notification.permission;
    setPermission(p);
    checkStatus();
    return p;
  };

  return {
    isSupported,
    permission,
    isEnabled,
    isLoading,
    isOptedIn: isEnabled,
    subscriptionId,
    requestPermission,
    disableNotifications,
    sendTestToSelf,
    refreshPermissionStatus,
  };
};
