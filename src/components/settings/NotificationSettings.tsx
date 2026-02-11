import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Bell, BellOff, Send, RefreshCw, AlertCircle, Calendar, Stethoscope, Baby, Syringe, Package, Clock } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useAppSetting } from '@/hooks/useAppSettings';
import { useToast } from '@/hooks/use-toast';

const DEFAULT_ALERT_CONFIG = {
  pd_check_days: 60,
  expected_delivery_days: 283,
  vaccination_reminder_days: 3,
  low_stock_threshold: true,
  milking_session_reminders: true,
  categories: {
    reminders: true,
    alerts: true,
    updates: true,
  }
};

export const NotificationSettings = () => {
  const { isSupported, permission, isEnabled, requestPermission, disableNotifications, testNotification, refreshPermissionStatus } = usePushNotifications();
  const { toast } = useToast();
  const { value: savedConfig, save: saveSettingValue, isSaving: saving } = useAppSetting<typeof DEFAULT_ALERT_CONFIG>('alert_configuration');
  
  const [alertConfig, setAlertConfig] = useState(DEFAULT_ALERT_CONFIG);

  useEffect(() => {
    if (savedConfig) {
      setAlertConfig({ ...DEFAULT_ALERT_CONFIG, ...savedConfig });
    }
  }, [savedConfig]);

  const saveConfig = (newConfig: typeof alertConfig) => {
    setAlertConfig(newConfig);
    saveSettingValue(newConfig);
  };

  const updateField = (field: string, value: any) => {
    const updated = { ...alertConfig, [field]: value };
    setAlertConfig(updated);
    saveConfig(updated);
  };

  const updateCategory = (key: string, value: boolean) => {
    const updated = {
      ...alertConfig,
      categories: { ...alertConfig.categories, [key]: value }
    };
    setAlertConfig(updated);
    saveConfig(updated);
  };

  return (
    <div className="space-y-6">
      {/* Push Notification Status */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold flex items-center gap-2">
          <Bell className="h-4 w-4" />
          Push Notifications
        </h4>

        {!isSupported && (
          <Alert>
            <BellOff className="h-4 w-4" />
            <AlertDescription>Push notifications are not supported in this browser.</AlertDescription>
          </Alert>
        )}

        {permission === 'denied' && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Notifications blocked. Click the 🔒 lock icon in your address bar → Allow notifications → Refresh.
            </AlertDescription>
          </Alert>
        )}

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">
              Status: {isEnabled ? '✅ Enabled' : permission === 'denied' ? '🚫 Blocked' : '⏸ Disabled'}
            </p>
            <p className="text-xs text-muted-foreground">
              Permission: {permission}
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={refreshPermissionStatus} variant="ghost" size="sm">
              <RefreshCw className="h-3 w-3" />
            </Button>
            {!isEnabled ? (
              <Button onClick={requestPermission} size="sm" disabled={permission === 'denied'}>
                Enable
              </Button>
            ) : (
              <Button onClick={disableNotifications} variant="outline" size="sm">
                Disable
              </Button>
            )}
          </div>
        </div>

        {isEnabled && (
          <Button onClick={testNotification} variant="outline" size="sm" className="w-full">
            <Send className="h-3 w-3 mr-2" />
            Send Test Notification
          </Button>
        )}
      </div>

      <Separator />

      {/* Alert Configuration */}
      <div className="space-y-4">
        <h4 className="text-sm font-semibold">Alert Timing Configuration</h4>

        <div className="grid gap-4">
          <Card>
            <CardContent className="pt-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Stethoscope className="h-4 w-4 text-blue-500" />
                  <div>
                    <p className="text-sm font-medium">PD Check Alert</p>
                    <p className="text-xs text-muted-foreground">Days after AI to check PD</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    className="w-20 h-8 text-sm"
                    value={alertConfig.pd_check_days}
                    onChange={(e) => updateField('pd_check_days', parseInt(e.target.value) || 60)}
                    min={30}
                    max={120}
                  />
                  <span className="text-xs text-muted-foreground">days</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Baby className="h-4 w-4 text-pink-500" />
                  <div>
                    <p className="text-sm font-medium">Expected Delivery Alert</p>
                    <p className="text-xs text-muted-foreground">Days after AI for delivery</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    className="w-20 h-8 text-sm"
                    value={alertConfig.expected_delivery_days}
                    onChange={(e) => updateField('expected_delivery_days', parseInt(e.target.value) || 283)}
                    min={250}
                    max={310}
                  />
                  <span className="text-xs text-muted-foreground">days</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Syringe className="h-4 w-4 text-green-500" />
                  <div>
                    <p className="text-sm font-medium">Vaccination Reminder</p>
                    <p className="text-xs text-muted-foreground">Days before due date</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    className="w-20 h-8 text-sm"
                    value={alertConfig.vaccination_reminder_days}
                    onChange={(e) => updateField('vaccination_reminder_days', parseInt(e.target.value) || 3)}
                    min={1}
                    max={14}
                  />
                  <span className="text-xs text-muted-foreground">days</span>
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-orange-500" />
                  <div>
                    <p className="text-sm font-medium">Low Feed Stock Alerts</p>
                    <p className="text-xs text-muted-foreground">Alert when stock below minimum</p>
                  </div>
                </div>
                <Switch
                  checked={alertConfig.low_stock_threshold}
                  onCheckedChange={(v) => updateField('low_stock_threshold', v)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-purple-500" />
                  <div>
                    <p className="text-sm font-medium">Milking Session Reminders</p>
                    <p className="text-xs text-muted-foreground">Remind at session start/end</p>
                  </div>
                </div>
                <Switch
                  checked={alertConfig.milking_session_reminders}
                  onCheckedChange={(v) => updateField('milking_session_reminders', v)}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Separator />

      {/* Notification Categories */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold">Notification Categories</h4>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">📋 Reminders</p>
              <p className="text-xs text-muted-foreground">PD, vaccination, delivery, AI schedules</p>
            </div>
            <Switch
              checked={alertConfig.categories.reminders}
              onCheckedChange={(v) => updateCategory('reminders', v)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">⚠️ Alerts</p>
              <p className="text-xs text-muted-foreground">Low stock, session start/end</p>
            </div>
            <Switch
              checked={alertConfig.categories.alerts}
              onCheckedChange={(v) => updateCategory('alerts', v)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">📊 Updates</p>
              <p className="text-xs text-muted-foreground">Collection summaries, reports</p>
            </div>
            <Switch
              checked={alertConfig.categories.updates}
              onCheckedChange={(v) => updateCategory('updates', v)}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
