import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Send } from 'lucide-react';

export const FCMPushTest: React.FC = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('Test Notification');
  const [body, setBody] = useState('This is a test notification from your web app!');
  const [testToken, setTestToken] = useState('');
  const [useCurrentUser, setUseCurrentUser] = useState(true);

  const sendTestNotification = async () => {
    setLoading(true);
    try {
      let requestBody: any = { title, body, data: { test: true } };

      if (useCurrentUser) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          toast({
            title: 'Not Authenticated',
            description: 'You must be logged in to test',
            variant: 'destructive',
          });
          return;
        }
        requestBody.userId = user.id;
      } else {
        if (!testToken.trim()) {
          toast({
            title: 'Token Required',
            description: 'Please enter an FCM token to test',
            variant: 'destructive',
          });
          return;
        }
        requestBody.tokens = [testToken];
      }

      const { data, error } = await supabase.functions.invoke('send-push-notification', {
        body: requestBody,
      });

      if (error) throw error;

      toast({
        title: 'Notification Sent',
        description: `Successfully sent to ${data.sent} device(s)`,
      });
    } catch (error) {
      console.error('Error sending notification:', error);
      toast({
        title: 'Failed to Send',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="use-current-user"
            checked={useCurrentUser}
            onChange={(e) => setUseCurrentUser(e.target.checked)}
            className="rounded"
          />
          <Label htmlFor="use-current-user" className="cursor-pointer">
            Send to my device (uses your FCM token)
          </Label>
        </div>
      </div>

      {!useCurrentUser && (
        <div className="space-y-2">
          <Label htmlFor="fcm-token">FCM Token</Label>
          <Input
            id="fcm-token"
            placeholder="Enter FCM device token"
            value={testToken}
            onChange={(e) => setTestToken(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Get this token from your app after registering for FCM push notifications
          </p>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="notif-title">Title</Label>
        <Input
          id="notif-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notif-body">Message</Label>
        <Textarea
          id="notif-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
        />
      </div>

      <Button onClick={sendTestNotification} disabled={loading} className="w-full">
        <Send className="h-4 w-4 mr-2" />
        {loading ? 'Sending...' : 'Send Test Notification'}
      </Button>
    </div>
  );
};
