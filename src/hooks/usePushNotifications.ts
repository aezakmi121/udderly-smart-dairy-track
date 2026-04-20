import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { oneSignalService } from '@/services/oneSignalService';

export const usePushNotifications = () => {
  const [isSupported, setIsSupported] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isLoading, setIsLoading] = useState(false);
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null);
  const [isOptedIn, setIsOptedIn] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const supported = 'Notification' in window && 'serviceWorker' in navigator;
    setIsSupported(supported);
    if (supported) setPermission(Notification.permission);

    if (supported && oneSignalService.isConfigured()) {
      // Initialize SDK early so it's ready when the user clicks Enable
      oneSignalService.initialize();
    }

    checkStatus();
  }, []);

  // Sync UI state with DB + actual OneSignal subscription state
  const checkStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('onesignal_player_id')
        .eq('id', user.id)
        .single();

      const storedId = (profile as any)?.onesignal_player_id as string | null;
      // Ignore the legacy fake "ext:..." placeholder — treat as not registered
      const dbHasId = !!storedId && !storedId.startsWith('ext:');

      if (dbHasId) {
        setIsEnabled(true);
        setSubscriptionId(storedId);
      } else {
        // DB says disabled — make sure OneSignal is also opted out to stay in sync
        await oneSignalService.initialize();
        const optedIn = await oneSignalService.isOptedIn();
        if (optedIn) await oneSignalService.optOut();
        setIsEnabled(false);
        setSubscriptionId(null);
      }

      // Refresh live SDK status for display
      const status = await oneSignalService.getSubscriptionStatus();
      setIsOptedIn(status.optedIn);
      if (status.subscriptionId && dbHasId) setSubscriptionId(status.subscriptionId);
    } catch (error) {
      console.error('Error checking notification status:', error);
    }
  };

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      toast({
        title: 'Not Supported',
        description: 'Push notifications are not supported in this browser.',
        variant: 'destructive',
      });
      return false;
    }

    if (Notification.permission === 'denied') {
      toast({
        title: 'Notifications Blocked',
        description:
          'Your browser has blocked notifications for this site. Click the 🔒 lock icon in the address bar → Site settings → Allow notifications, then refresh.',
        variant: 'destructive',
      });
      return false;
    }

    if (!oneSignalService.isConfigured()) {
      toast({ title: 'Not Configured', description: 'OneSignal is not configured.', variant: 'destructive' });
      return false;
    }

    setIsLoading(true);

    try {
      // Step 1: Ensure SDK is ready
      const sdkReady = await oneSignalService.initialize();
      if (!sdkReady) {
        toast({
          title: 'Service Unavailable',
          description: 'Push notification service could not load. Try disabling ad blockers.',
          variant: 'destructive',
        });
        setIsLoading(false);
        return false;
      }

      // Step 2: Request browser permission
      // NOTE: The system prompt only appears the very first time per browser/site.
      // On subsequent enables the browser grants silently — this is correct behaviour.
      const granted = await oneSignalService.requestPermission();
      if (!granted) {
        toast({
          title: 'Permission Not Granted',
          description:
            Notification.permission === 'denied'
              ? 'Notifications are blocked in your browser settings. Allow them and refresh.'
              : 'You dismissed the notification prompt. Click Enable to try again.',
          variant: 'destructive',
        });
        setIsLoading(false);
        return false;
      }

      // Step 3: Resume the push subscription (critical for re-enable after disable)
      await oneSignalService.optIn();

      // Step 4: Link this device to the user's account
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setIsLoading(false); return false; }

      await oneSignalService.login(user.id);

      // Step 5: Get subscription ID and save to DB
      const playerId = await oneSignalService.getPlayerId();

      if (!playerId) {
        toast({
          title: 'Registration Incomplete',
          description: 'Device subscription ID not available. Try again — if this persists, reload the page.',
          variant: 'destructive',
        });
        setIsLoading(false);
        return false;
      }

      await supabase
        .from('profiles')
        .update({ onesignal_player_id: playerId } as any)
        .eq('id', user.id);

      setPermission('granted');
      setIsEnabled(true);
      setSubscriptionId(playerId);
      setIsOptedIn(true);
      toast({
        title: 'Notifications Enabled',
        description: 'Push notifications are active on this device.',
      });
      setIsLoading(false);
      return true;
    } catch (error) {
      console.error('Error enabling notifications:', error);
      toast({ title: 'Error', description: 'Failed to enable push notifications.', variant: 'destructive' });
      setIsLoading(false);
      return false;
    }
  }, [isSupported, toast]);

  const disableNotifications = async () => {
    try {
      // initialize() is called inside optOut/logout — SDK must be ready first
      await oneSignalService.optOut();
      await oneSignalService.logout();

      // Clear from DB
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('profiles')
        .update({ onesignal_player_id: null } as any)
        .eq('id', user.id);

      setIsEnabled(false);
      setSubscriptionId(null);
      setIsOptedIn(false);
      toast({ title: 'Notifications Disabled', description: 'You will no longer receive push notifications.' });
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

      const { data, error } = await supabase.functions.invoke('send-onesignal-notification', {
        body: {
          title: '🐄 Test Notification',
          body: 'Push notifications are working!',
          userId: user.id,
          data: { type: 'test', timestamp: new Date().toISOString() },
        },
      });

      if (error) {
        // Surface the actual server error to make diagnosis easier
        const detail = (error as any)?.message || JSON.stringify(error);
        toast({
          title: 'Test Failed',
          description: detail.includes('not configured')
            ? 'OneSignal secrets are not set in Supabase Edge Functions. Add ONESIGNAL_APP_ID and ONESIGNAL_REST_API_KEY in the Supabase dashboard → Edge Functions → Manage secrets.'
            : `Error: ${detail}`,
          variant: 'destructive',
        });
        return;
      }

      if (data?.error) {
        toast({
          title: 'Test Failed',
          description: data.error.includes('not configured')
            ? 'OneSignal secrets are not set in Supabase. Add ONESIGNAL_APP_ID and ONESIGNAL_REST_API_KEY in Supabase → Edge Functions → Manage secrets.'
            : data.error,
          variant: 'destructive',
        });
        return;
      }

      const recipients = data?.recipients ?? 0;
      if (recipients === 0) {
        toast({
          title: 'Sent but 0 Recipients',
          description: 'OneSignal found no registered device for your account. Disable notifications and re-enable to re-register this device.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Test Sent',
          description: `Notification dispatched to ${recipients} device(s). Check your notification tray.`,
        });
      }
    } catch (error: any) {
      console.error('Test notification error:', error);
      toast({ title: 'Error', description: error?.message || 'Failed to send test notification.', variant: 'destructive' });
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
    isOptedIn,
    subscriptionId,
    requestPermission,
    disableNotifications,
    sendTestToSelf,
    refreshPermissionStatus,
  };
};
