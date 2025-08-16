import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { Bell, BellOff, Send } from 'lucide-react';

export const PushNotificationSettings = () => {
  const { isSupported, permission, token, isEnabled, requestPermission, disableNotifications, testNotification } = usePushNotifications();

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
            
            <div className="text-xs text-muted-foreground">
              <p><strong>You'll receive notifications for:</strong></p>
              <ul className="list-disc list-inside space-y-1 mt-1">
                <li>Morning milking session start time</li>
                <li>Evening milking session start time</li>
                <li>Milking session end reminders</li>
                <li>Milk collection start time</li>
                <li>Milk collection end time</li>
              </ul>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};