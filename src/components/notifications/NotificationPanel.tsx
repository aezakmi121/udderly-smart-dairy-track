
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Calendar, Syringe, Heart, Package, Bell, X } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { cn } from '@/lib/utils';

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'low_stock':
      return <Package className="h-5 w-5" />;
    case 'pd_due':
      return <Heart className="h-5 w-5" />;
    case 'vaccination_due':
      return <Syringe className="h-5 w-5" />;
    case 'delivery_due':
      return <AlertTriangle className="h-5 w-5" />;
    default:
      return <Bell className="h-5 w-5" />;
  }
};

const getPriorityBadge = (priority: string) => {
  switch (priority) {
    case 'high':
      return <Badge variant="destructive">Urgent</Badge>;
    case 'medium':
      return <Badge variant="secondary">Medium</Badge>;
    case 'low':
      return <Badge variant="outline">Low</Badge>;
    default:
      return <Badge variant="outline">Normal</Badge>;
  }
};

export const NotificationPanel = () => {
  const { notifications, isLoading, highPriorityCount, markAsRead } = useNotifications();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">Loading notifications...</div>
        </CardContent>
      </Card>
    );
  }

  const urgentNotifications = notifications.filter(n => n.priority === 'high');
  const otherNotifications = notifications.filter(n => n.priority !== 'high');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
          </div>
          {highPriorityCount > 0 && (
            <Badge variant="destructive">{highPriorityCount} Urgent</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {notifications.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No notifications at this time</p>
            <p className="text-sm">All systems are running smoothly</p>
          </div>
        ) : (
          <>
            {urgentNotifications.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-red-600 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Urgent Notifications
                </h4>
                {urgentNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg"
                  >
                    <div className="flex-shrink-0 mt-0.5 text-red-600">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-1 gap-2">
                        <p className="text-sm font-medium text-red-900">
                          {notification.title}
                        </p>
                        <div className="flex items-center gap-2">
                          {getPriorityBadge(notification.priority)}
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Dismiss notification"
                            onClick={() => markAsRead(notification.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-sm text-red-700">
                        {notification.message}
                      </p>
                      <p className="text-xs text-red-500 mt-1">
                        {new Date(notification.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {otherNotifications.length > 0 && (
              <div className="space-y-3">
                {urgentNotifications.length > 0 && (
                  <h4 className="text-sm font-medium text-gray-600 flex items-center gap-2">
                    <Bell className="h-4 w-4" />
                    Other Notifications
                  </h4>
                )}
                {otherNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-lg border",
                      notification.priority === 'medium' 
                        ? "bg-orange-50 border-orange-200" 
                        : "bg-gray-50 border-gray-200"
                    )}
                  >
                    <div className={cn(
                      "flex-shrink-0 mt-0.5",
                      notification.priority === 'medium' ? "text-orange-600" : "text-gray-600"
                    )}>
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-1 gap-2">
                        <p className={cn(
                          "text-sm font-medium",
                          notification.priority === 'medium' ? "text-orange-900" : "text-gray-900"
                        )}>
                          {notification.title}
                        </p>
                        <div className="flex items-center gap-2">
                          {getPriorityBadge(notification.priority)}
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Dismiss notification"
                            onClick={() => markAsRead(notification.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <p className={cn(
                        "text-sm",
                        notification.priority === 'medium' ? "text-orange-700" : "text-gray-700"
                      )}>
                        {notification.message}
                      </p>
                      <p className={cn(
                        "text-xs mt-1",
                        notification.priority === 'medium' ? "text-orange-500" : "text-gray-500"
                      )}>
                        {new Date(notification.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};
