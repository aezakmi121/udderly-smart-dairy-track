import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Bell, BellOff } from 'lucide-react';
import { usePushNotifications } from '@/hooks/usePushNotifications';

const PROMPT_DISMISSED_KEY = 'notification_prompt_dismissed';
const PROMPT_DISMISS_DAYS = 7; // Re-ask after 7 days

export const NotificationPromptDialog = () => {
  const [open, setOpen] = useState(false);
  const { isSupported, isEnabled, isLoading, permission, requestPermission } = usePushNotifications();

  useEffect(() => {
    // Don't show if not supported, already enabled, or browser blocked
    if (!isSupported || isEnabled || permission === 'denied') return;

    // Check if user dismissed recently
    const dismissed = localStorage.getItem(PROMPT_DISMISSED_KEY);
    if (dismissed) {
      const dismissedAt = new Date(dismissed).getTime();
      const now = Date.now();
      if (now - dismissedAt < PROMPT_DISMISS_DAYS * 24 * 60 * 60 * 1000) return;
    }

    // Delay showing the dialog so it doesn't appear instantly on load
    const timer = setTimeout(() => setOpen(true), 3000);
    return () => clearTimeout(timer);
  }, [isSupported, isEnabled, permission]);

  const handleEnable = async () => {
    const granted = await requestPermission();
    if (granted) {
      setOpen(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem(PROMPT_DISMISSED_KEY, new Date().toISOString());
    setOpen(false);
  };

  // If already enabled or not supported, render nothing
  if (!isSupported || isEnabled) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleDismiss(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Stay Updated with Notifications
          </DialogTitle>
          <DialogDescription className="space-y-2 pt-2">
            <p>Enable push notifications to receive timely alerts for:</p>
            <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
              <li>Morning & evening milking session reminders</li>
              <li>Vaccination due dates</li>
              <li>PD check & delivery alerts</li>
              <li>Low feed stock warnings</li>
            </ul>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={handleDismiss} className="flex items-center gap-2">
            <BellOff className="h-4 w-4" />
            Maybe Later
          </Button>
          <Button onClick={handleEnable} disabled={isLoading} className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            {isLoading ? 'Enabling...' : 'Enable Notifications'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
