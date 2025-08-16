import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Settings, Bell, AlertTriangle, Info, Clock } from 'lucide-react';
import { useNotificationSettings } from '@/hooks/useNotificationSettings';
import { useUserPermissions } from '@/hooks/useUserPermissions';

interface NotificationSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const NotificationSettingsModal = ({ open, onOpenChange }: NotificationSettingsModalProps) => {
  const { settings, updateSetting, isLoading, isUpdating } = useNotificationSettings();
  const { userRole } = useUserPermissions();

  const categories = [
    {
      key: 'reminders',
      title: 'Task Reminders',
      description: 'AI due, PD due, vaccinations, deliveries, payments',
      icon: <Bell className="h-4 w-4" />,
      color: 'text-blue-600'
    },
    {
      key: 'alerts',
      title: 'System Alerts', 
      description: 'Low stock, sync failures, delivery delays',
      icon: <AlertTriangle className="h-4 w-4" />,
      color: 'text-red-600'
    },
    {
      key: 'updates',
      title: 'Informational Updates',
      description: 'Reports ready, insights, new features',
      icon: <Info className="h-4 w-4" />,
      color: 'text-green-600'
    }
  ];

  const channels = [
    { key: 'in_app', label: 'In-App Notifications', description: 'Show in notification bell' },
    { key: 'email', label: 'Email Notifications', description: 'Send to your email address' },
    { key: 'whatsapp', label: 'WhatsApp Notifications', description: 'Send via WhatsApp (if configured)' }
  ];

  const getSetting = (category: string) => {
    return settings.find(s => s.category === category) || {
      category,
      enabled: true,
      channels: ['in_app'],
      quiet_hours: null
    };
  };

  const getDefaultSettings = () => {
    if (userRole === 'admin') {
      return {
        reminders: { enabled: true, channels: ['in_app', 'email'] },
        alerts: { enabled: true, channels: ['in_app', 'email'] },
        updates: { enabled: true, channels: ['in_app'] }
      };
    } else if (userRole === 'worker') {
      return {
        reminders: { enabled: true, channels: ['in_app'] },
        alerts: { enabled: true, channels: ['in_app'] },
        updates: { enabled: false, channels: ['in_app'] }
      };
    } else {
      return {
        reminders: { enabled: false, channels: ['in_app'] },
        alerts: { enabled: false, channels: ['in_app'] },
        updates: { enabled: false, channels: ['in_app'] }
      };
    }
  };

  const applyDefaults = () => {
    const defaults = getDefaultSettings();
      Object.entries(defaults).forEach(([category, config]) => {
        updateSetting(category, config as any);
      });
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <div className="flex items-center justify-center py-8">
            Loading settings...
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Notification Settings
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Role-based defaults */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center justify-between">
                Role-Based Settings
                <Badge variant="outline">{userRole}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                Apply recommended settings for your role
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={applyDefaults}
                disabled={isUpdating}
              >
                Apply Recommended Settings
              </Button>
            </CardContent>
          </Card>

          {/* Notification Categories */}
          {categories.map(category => {
            const setting = getSetting(category.key);
            
            return (
              <Card key={category.key}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <span className={category.color}>
                      {category.icon}
                    </span>
                    {category.title}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {category.description}
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Enable/Disable */}
                  <div className="flex items-center justify-between">
                    <Label htmlFor={`${category.key}-enabled`}>
                      Enable {category.title}
                    </Label>
                    <Switch
                      id={`${category.key}-enabled`}
                      checked={setting.enabled}
                      onCheckedChange={(enabled) => 
                        updateSetting(category.key, { enabled })
                      }
                      disabled={isUpdating}
                    />
                  </div>

                  {setting.enabled && (
                    <>
                      {/* Delivery Channels */}
                      <div className="space-y-3">
                        <Label className="text-sm font-medium">Delivery Channels</Label>
                        {channels.map(channel => (
                          <div key={channel.key} className="flex items-start space-x-3">
                            <Checkbox
                              id={`${category.key}-${channel.key}`}
                              checked={setting.channels?.includes(channel.key as any)}
                              onCheckedChange={(checked) => {
                                const currentChannels = setting.channels || [];
                                const newChannels = checked
                                  ? [...currentChannels, channel.key as any]
                                  : currentChannels.filter(c => c !== channel.key);
                                updateSetting(category.key, { channels: newChannels as any });
                              }}
                              disabled={isUpdating}
                            />
                            <div className="grid gap-1.5 leading-none">
                              <Label
                                htmlFor={`${category.key}-${channel.key}`}
                                className="text-sm font-normal"
                              >
                                {channel.label}
                              </Label>
                              <p className="text-xs text-muted-foreground">
                                {channel.description}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Quiet Hours */}
                      <div className="space-y-3">
                        <Label className="flex items-center gap-2 text-sm font-medium">
                          <Clock className="h-4 w-4" />
                          Quiet Hours
                        </Label>
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center space-x-2">
                            <Label htmlFor={`${category.key}-start`} className="text-sm">From:</Label>
                            <Input
                              id={`${category.key}-start`}
                              type="time"
                              className="w-24"
                              value={setting.quiet_hours?.start || ''}
                              onChange={(e) => {
                                const quietHours = setting.quiet_hours || { start: '', end: '' };
                                updateSetting(category.key, {
                                  quiet_hours: { ...quietHours, start: e.target.value }
                                });
                              }}
                              disabled={isUpdating}
                            />
                          </div>
                          <div className="flex items-center space-x-2">
                            <Label htmlFor={`${category.key}-end`} className="text-sm">To:</Label>
                            <Input
                              id={`${category.key}-end`}
                              type="time"
                              className="w-24"
                              value={setting.quiet_hours?.end || ''}
                              onChange={(e) => {
                                const quietHours = setting.quiet_hours || { start: '', end: '' };
                                updateSetting(category.key, {
                                  quiet_hours: { ...quietHours, end: e.target.value }
                                });
                              }}
                              disabled={isUpdating}
                            />
                          </div>
                          {setting.quiet_hours?.start && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => updateSetting(category.key, { quiet_hours: null })}
                              disabled={isUpdating}
                            >
                              Clear
                            </Button>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          No notifications will be sent during these hours
                        </p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
};