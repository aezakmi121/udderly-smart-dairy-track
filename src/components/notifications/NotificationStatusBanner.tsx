import { useEffect, useState } from 'react';
import { Bell, X, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useAuth } from '@/components/auth/AuthProvider';

const DISMISS_KEY = 'notif_banner_dismissed_at';
const REAPPEAR_HOURS = 24;

/**
 * Persistent, low-intrusion banner shown when push notifications are not
 * enabled. Distinct from the one-time NotificationPromptDialog so users
 * who dismissed the dialog still have an obvious way to enable them.
 *
 * Hidden when:
 * - Not supported
 * - Already enabled
 * - User dismissed within the last 24h
 * - User not signed in
 */
export const NotificationStatusBanner = () => {
  const { user } = useAuth();
  const { isSupported, isEnabled, permission, isLoading, requestPermission } = usePushNotifications();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const at = localStorage.getItem(DISMISS_KEY);
    if (at) {
      const ageMs = Date.now() - new Date(at).getTime();
      if (ageMs < REAPPEAR_HOURS * 60 * 60 * 1000) setDismissed(true);
    }
  }, []);

  if (!user || !isSupported || isEnabled || dismissed) return null;

  const blocked = permission === 'denied';

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, new Date().toISOString());
    setDismissed(true);
  };

  return (
    <div className="fixed bottom-20 md:bottom-4 left-3 right-3 md:left-auto md:right-4 md:max-w-sm z-40">
      <div className="bg-card border border-border rounded-lg shadow-lg p-3 flex items-start gap-3">
        <div className={`mt-0.5 ${blocked ? 'text-destructive' : 'text-primary'}`}>
          {blocked ? <AlertTriangle className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">
            {blocked ? 'Notifications blocked' : 'Enable notifications'}
          </p>
          <p className="text-xs text-muted-foreground">
            {blocked
              ? 'Allow notifications in your browser settings to receive milking, PD and vaccination alerts.'
              : 'Get milking reminders, PD alerts and vaccination due notifications.'}
          </p>
          {!blocked && (
            <Button
              size="sm"
              className="mt-2 h-7 text-xs"
              onClick={requestPermission}
              disabled={isLoading}
            >
              {isLoading ? 'Enabling…' : 'Enable'}
            </Button>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDismiss}
          className="h-6 w-6 p-0 -mr-1 -mt-1"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
