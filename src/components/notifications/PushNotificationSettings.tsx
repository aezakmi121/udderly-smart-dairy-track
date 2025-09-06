import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { supabase } from '@/integrations/supabase/client';
import { Bell, BellOff, Send, Megaphone } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const PushNotificationSettings = () => {
  const { isSupported, permission, token, isEnabled, requestPermission, disableNotifications, testNotification } = usePushNotifications();
  const { isAdmin } = useUserPermissions();
  const { toast } = useToast();

  const broadcastTestNotification = async () => {
    try {
      // Get all user tokens from the database
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('fcm_token')
        .not('fcm_token', 'is', null);

      if (error) {
        throw error;
      }

      if (!profiles || profiles.length === 0) {
        toast({
          title: 'No Devices Found',
          description: 'No devices are registered for push notifications.',
          variant: 'destructive'
        });
        return;
      }

      const tokens = profiles.map(p => p.fcm_token).filter(Boolean);
      
      if (tokens.length === 0) {
        toast({
          title: 'No Valid Tokens',
          description: 'No valid notification tokens found.',
          variant: 'destructive'
        });
        return;
      }

      // Call the edge function to send notifications to all devices
      const { error: sendError } = await supabase.functions.invoke('send-push-notification', {
        body: {
          tokens,
          title: 'Admin Test Broadcast',
          body: `This is a test broadcast notification from admin! 📢 Received by ${tokens.length} device(s).`,
          data: {
            type: 'admin_test',
            timestamp: new Date().toISOString()
          }
        }
      });

      if (sendError) {
        throw sendError;
      }

      toast({
        title: 'Broadcast Sent',
        description: `Test broadcast sent to ${tokens.length} registered device(s)!`,
      });

    } catch (error) {
      console.error('Error broadcasting notification:', error);
      toast({
        title: 'Broadcast Failed',
        description: `Failed to send broadcast: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive'
      });
    }
  };

  if (!isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellOff className="h-5 w-5" />
            Push Notifications
          </CardTitle>
          <CardDescription>
            Push notifications are not supported in this browser.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Push Notifications
        </CardTitle>
        <CardDescription>
          Receive notifications for milking sessions and milk collection times on your device.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">
              Status: {isEnabled ? 'Enabled' : permission === 'denied' ? 'Denied' : 'Not enabled'}
            </p>
            <p className="text-xs text-muted-foreground">
              {token ? 'Device registered for notifications' : 'Device not registered'}
            </p>
          </div>
          
          {!isEnabled && permission !== 'denied' && (
            <Button onClick={requestPermission}>
              Enable Notifications
            </Button>
          )}
          
          {isEnabled && (
            <Button onClick={disableNotifications} variant="outline">
              Disable Notifications
            </Button>
          )}
        </div>

        {isEnabled && token && (
          <div className="space-y-2">
            <Button 
              onClick={testNotification} 
              variant="outline" 
              className="w-full flex items-center gap-2"
            >
              <Send className="h-4 w-4" />
              Send Test Notification
            </Button>
            
            {isAdmin && (
              <Button 
                onClick={broadcastTestNotification} 
                variant="secondary" 
                className="w-full flex items-center gap-2"
              >
                <Megaphone className="h-4 w-4" />
                Broadcast Test to All Devices
              </Button>
            )}
            
            <div className="text-xs text-muted-foreground">
              <p><strong>You'll receive notifications for:</strong></p>
              <ul className="list-disc list-inside space-y-1 mt-1">
                <li>Morning milking session start time</li>
                <li>Evening milking session start time</li>
                <li>Milking session end reminders</li>
                <li>Milk collection start time</li>
                <li>Milk collection end time</li>
              </ul>
              {isAdmin && (
                <p className="mt-2 text-orange-600 dark:text-orange-400">
                  <strong>Admin:</strong> You can broadcast test notifications to all registered devices.
                </p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};