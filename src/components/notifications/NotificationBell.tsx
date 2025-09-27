
import React, { useState } from 'react';
import { Bell, AlertTriangle, Calendar, Syringe, Heart, Package, X, Settings, Clock, History, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useEnhancedNotifications } from '@/hooks/useEnhancedNotifications';
import { cn } from '@/lib/utils';
import { NotificationSettingsModal } from './NotificationSettingsModal';
import { NotificationHistoryModal } from './NotificationHistoryModal';
import { NotificationDetailsModal } from './NotificationDetailsModal';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'low_stock':
      return <Package className="h-4 w-4" />;
    case 'pd_due':
      return <Heart className="h-4 w-4" />;
    case 'vaccination_due':
      return <Syringe className="h-4 w-4" />;
    case 'delivery_due':
      return <AlertTriangle className="h-4 w-4" />;
    case 'ai_due':
      return <Calendar className="h-4 w-4" />;
    default:
      return <Bell className="h-4 w-4" />;
  }
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'high':
      return 'text-red-600 bg-red-50 border-red-200';
    case 'medium':
      return 'text-orange-600 bg-orange-50 border-orange-200';
    case 'low':
      return 'text-blue-600 bg-blue-50 border-blue-200';
    default:
      return 'text-gray-600 bg-gray-50 border-gray-200';
  }
};

export const NotificationBell = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<any>(null);
  const { 
    notifications, 
    isLoading, 
    highPriorityCount, 
    unreadCount, 
    markAsRead, 
    markAllAsRead, 
    snoozeNotification, 
    dismissNotification 
  } = useEnhancedNotifications();
  const unread = notifications.filter(n => !n.read);

  if (isLoading) {
    return (
      <Button variant="ghost" size="sm" disabled>
        <Bell className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="relative">
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <Badge 
                variant={highPriorityCount > 0 ? "destructive" : "secondary"}
                className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-96 p-0" align="end">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="font-semibold">Notifications</h3>
                {unreadCount > 0 && (
                  <p className="text-sm text-muted-foreground">
                    {unreadCount} notification{unreadCount === 1 ? '' : 's'}
                    {highPriorityCount > 0 && (
                      <span className="text-red-600 font-medium"> {' '}({highPriorityCount} urgent)</span>
                    )}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {notifications.length > 0 && (
                  <Button variant="outline" size="sm" onClick={() => markAllAsRead()} className="text-xs px-2">
                    Mark all as read
                  </Button>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="px-2">
                      <Settings className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setShowSettings(true)}>
                      <Settings className="h-4 w-4 mr-2" />
                      Settings
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setShowHistory(true)}>
                      <History className="h-4 w-4 mr-2" />
                      History
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
          <ScrollArea className="max-h-96">
            {unread.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                All caught up — no new notifications
              </div>
            ) : (
              <div className="divide-y">
                {unread.map((notification) => (
                  <div
                    key={notification.id}
                    className={cn(
                      "p-3 border-l-4 hover:bg-accent/5",
                      getPriorityColor(notification.priority)
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div 
                            className="cursor-pointer flex-1" 
                            onClick={() => markAsRead(notification.id)}
                          >
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-foreground">
                                {notification.title}
                              </p>
                              {notification.data?.cows && (
                                <Badge variant="secondary" className="text-xs">
                                  {notification.data.cows.length}
                                </Badge>
                              )}
                              {notification.data?.items && (
                                <Badge variant="secondary" className="text-xs">
                                  {notification.data.items.length}
                                </Badge>
                              )}
                              {notification.priority === 'high' && (
                                <Badge variant="destructive" className="text-xs">
                                  Urgent
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              {notification.message}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(notification.created_at).toLocaleString()}
                            </p>
                          </div>
                          <div className="flex items-start gap-1 flex-wrap">
                            {(notification.type === 'delivery_due' || notification.type === 'pd_due' || notification.type === 'vaccination_due' || notification.type === 'low_stock') && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 touch-manipulation"
                                aria-label="View details"
                                onClick={(e) => { 
                                  e.stopPropagation(); 
                                  setSelectedNotification(notification);
                                  setShowDetails(true);
                                }}
                              >
                                <Eye className="h-3 w-3" />
                              </Button>
                            )}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-6 w-6 touch-manipulation">
                                  <Clock className="h-3 w-3" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => snoozeNotification(notification.id, 1)}>
                                  Snooze 1 hour
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => snoozeNotification(notification.id, 4)}>
                                  Snooze 4 hours
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => snoozeNotification(notification.id, 24)}>
                                  Snooze 1 day
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 touch-manipulation"
                              aria-label="Dismiss notification"
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                dismissNotification(notification.id); 
                              }}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </PopoverContent>
      </Popover>

      <NotificationSettingsModal 
        open={showSettings} 
        onOpenChange={setShowSettings} 
      />

      <NotificationHistoryModal 
        open={showHistory} 
        onOpenChange={setShowHistory} 
      />

      <NotificationDetailsModal 
        open={showDetails}
        onOpenChange={setShowDetails}
        notification={selectedNotification}
      />
    </>
  );
};
