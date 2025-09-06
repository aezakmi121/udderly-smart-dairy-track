
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAppSetting } from '@/hooks/useAppSettings';
import { useEffect, useMemo, useState } from 'react';
import { formatDate } from '@/lib/dateUtils';

export interface Notification {
  id: string;
  type: 'low_stock' | 'pd_due' | 'vaccination_due' | 'delivery_due' | 'ai_due' | 'system_alert' | 'info_update' | 'payment_due' | 'sync_failed' | 'delivery_delay' | 'group_change_due';
  title: string;
  message: string;
  priority: 'high' | 'medium' | 'low';
  read: boolean;
  created_at: string;
  entity_id?: string;
  entity_type?: string;
  category?: 'reminders' | 'alerts' | 'updates';
  snoozed_until?: string | null;
  is_overdue?: boolean;
  group_count?: number;
}

export const useNotifications = () => {
  const { value: pdDays } = useAppSetting<number>('pd_alert_days');
  const { value: deliveryDays } = useAppSetting<number>('delivery_expected_days');
  const pdAlertDays = Number(pdDays ?? 60);
  const expectedDeliveryDays = Number(deliveryDays ?? 283);

  const { data: rawNotifications = [], isLoading } = useQuery({
    queryKey: ['notifications', pdAlertDays, expectedDeliveryDays],
    queryFn: async (): Promise<Notification[]> => {
      const notifications: Notification[] = [];

      try {
        // Check for low stock feed items
        const { data: lowStockItems } = await supabase
          .from('feed_items')
          .select('*')
          .filter('current_stock', 'lte', 'minimum_stock_level');

        lowStockItems?.forEach(item => {
          notifications.push({
            id: `low_stock_${item.id}`,
            type: 'low_stock',
            title: 'Low Stock Alert',
            message: `${item.name} is running low (${item.current_stock} ${item.unit} remaining)`,
            priority: 'high',
            read: false,
            created_at: new Date().toISOString(),
            entity_id: item.id,
            entity_type: 'feed_item'
          });
        });

        // Check for PD due records using ai_date + 60 days when pd_date is not set
        const todayDate = new Date();
        const today = todayDate.toISOString().split('T')[0];
        const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        const { data: pdCandidates } = await supabase
          .from('ai_records')
          .select(`
            *,
            cows!ai_records_cow_id_fkey (cow_number)
          `)
          .eq('pd_done', false);

        pdCandidates?.forEach(record => {
          const ai = new Date(record.ai_date);
          const due = record.pd_date ? new Date(record.pd_date) : new Date(ai.getTime() + pdAlertDays * 24 * 60 * 60 * 1000);
          if (due <= endDate) {
            const dueStr = due.toISOString().split('T')[0];
            const isToday = dueStr === today;
            const isOverdue = due < todayDate;
            notifications.push({
              id: `pd_due_${record.id}`,
              type: 'pd_due',
            title: isOverdue ? 'PD Check Overdue' : isToday ? 'PD Check Due Today' : 'PD Check Due',
              message: `PD check ${isOverdue ? 'overdue' : isToday ? 'due today' : 'due'} on ${formatDate(due)} for cow ${record.cows?.cow_number || 'Unknown'}`,
              priority: isOverdue || isToday ? 'high' : 'medium',
              read: false,
              created_at: new Date().toISOString(),
              entity_id: record.id,
              entity_type: 'ai_record'
            });
          }
        });

        // Check for vaccination due - Fixed foreign key relationship
        const { data: vaccinationDue } = await supabase
          .from('vaccination_records')
          .select(`
            *,
            cows!vaccination_records_cow_id_fkey (cow_number),
            vaccination_schedules!vaccination_schedule_id (vaccine_name)
          `)
          .lte('next_due_date', new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

        vaccinationDue?.forEach(record => {
          notifications.push({
            id: `vaccination_due_${record.id}`,
            type: 'vaccination_due',
            title: 'Vaccination Due',
            message: `${record.vaccination_schedules?.vaccine_name} due on ${formatDate(record.next_due_date)} for cow ${record.cows?.cow_number || 'Unknown'}`,
            priority: 'medium',
            read: false,
            created_at: new Date().toISOString(),
            entity_id: record.id,
            entity_type: 'vaccination_record'
          });
        });

        // Check for expected deliveries (within 30 days)
        const { data: deliveriesDue } = await supabase
          .from('ai_records')
          .select(`
            *,
            cows!ai_records_cow_id_fkey (cow_number)
          `)
          .eq('pd_result', 'positive');

        deliveriesDue?.forEach(record => {
          const ai = new Date(record.ai_date);
          const dueDate = record.expected_delivery_date
            ? new Date(record.expected_delivery_date)
            : new Date(ai.getTime() + expectedDeliveryDays * 24 * 60 * 60 * 1000);

          if (dueDate <= endDate) {
            const isTodayDelivery = dueDate.toISOString().split('T')[0] === today;
            notifications.push({
              id: `delivery_due_${record.id}`,
              type: 'delivery_due',
            title: isTodayDelivery ? 'Delivery Expected Today' : 'Delivery Expected',
              message: `${isTodayDelivery ? 'May deliver today' : 'Expected delivery on ' + formatDate(dueDate)} for cow ${record.cows?.cow_number || 'Unknown'}`,
              priority: 'high',
              read: false,
              created_at: new Date().toISOString(),
              entity_id: record.id,
              entity_type: 'ai_record'
            });
          }

          // Check for group change due (1 month before expected delivery)
          const groupChangeDate = new Date(dueDate.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days before delivery
          const groupChangeEndDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // Check within next 7 days
          
          if (groupChangeDate <= groupChangeEndDate && groupChangeDate >= todayDate) {
            notifications.push({
              id: `group_change_due_${record.id}`,
              type: 'group_change_due',
              title: 'Group Change Required',
              message: `Cow ${record.cows?.cow_number || 'Unknown'} should be moved from dry group to milking group (delivery expected ${formatDate(dueDate)})`,
              priority: 'medium',
              read: false,
              created_at: new Date().toISOString(),
              entity_id: record.id,
              entity_type: 'ai_record'
            });
          }
        });

        // AI due today (scheduled inseminations)
        const { data: aiDueToday } = await supabase
          .from('ai_records')
          .select(`
            *,
            cows!ai_records_cow_id_fkey (cow_number)
          `)
          .eq('ai_status', 'pending')
          .eq('ai_date', today);

        aiDueToday?.forEach(record => {
          notifications.push({
            id: `ai_due_${record.id}`,
            type: 'ai_due',
            title: 'AI Scheduled Today',
            message: `AI scheduled on ${formatDate(record.ai_date)} for cow ${record.cows?.cow_number || 'Unknown'}`,
            priority: 'medium',
            read: false,
            created_at: new Date().toISOString(),
            entity_id: record.id,
            entity_type: 'ai_record'
          });
        });

      } catch (error) {
        throw error;
      }

      // Sort by priority and created_at
      return notifications.sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        }
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    },
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });
  // Local read-state (no DB changes)
  // Enhanced state management with snoozing
  const [readIds, setReadIds] = useState<Set<string>>(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('notification_read_ids') || '[]');
      return new Set<string>(stored);
    } catch {
      return new Set<string>();
    }
  });

  const [snoozedNotifications, setSnoozedNotifications] = useState<Record<string, string>>(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('notification_snoozed') || '{}');
      return stored;
    } catch {
      return {};
    }
  });

  useEffect(() => {
    localStorage.setItem('notification_read_ids', JSON.stringify(Array.from(readIds)));
  }, [readIds]);

  // Sync read state across components and tabs
  useEffect(() => {
    const sync = () => {
      try {
        const stored = JSON.parse(localStorage.getItem('notification_read_ids') || '[]');
        const current = Array.from(readIds);
        const storedStr = JSON.stringify(stored);
        const currentStr = JSON.stringify(current);
        if (storedStr !== currentStr) {
          setReadIds(new Set<string>(stored));
        }
      } catch {
        // Ignore storage errors
      }
    };

    window.addEventListener('notifications:read-changed', sync as EventListener);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('notifications:read-changed', sync as EventListener);
      window.removeEventListener('storage', sync);
    };
  }, [readIds]);

  const notifications = useMemo(() => {
    const now = new Date();
    return rawNotifications
      .map(n => {
        const snoozedUntil = snoozedNotifications[n.id];
        const isSnoozed = snoozedUntil && new Date(snoozedUntil) > now;
        
        return {
          ...n,
          read: readIds.has(n.id),
          snoozed_until: snoozedUntil || null,
          category: getCategoryForType(n.type),
          is_overdue: isNotificationOverdue(n),
        };
      })
      .filter(n => {
        const snoozedUntil = snoozedNotifications[n.id];
        return !snoozedUntil || new Date(snoozedUntil) <= now;
      });
  }, [rawNotifications, readIds, snoozedNotifications]);

  const markAsRead = (id: string) => {
    setReadIds(prev => {
      const next = new Set(prev);
      next.add(id);
      try {
        localStorage.setItem('notification_read_ids', JSON.stringify(Array.from(next)));
        window.dispatchEvent(new CustomEvent('notifications:read-changed'));
      } catch {}
      return next;
    });
  };
  const markAllAsRead = () => {
    const all = new Set(rawNotifications.map(n => n.id));
    setReadIds(all);
    try {
      localStorage.setItem('notification_read_ids', JSON.stringify(Array.from(all)));
      window.dispatchEvent(new CustomEvent('notifications:read-changed'));
    } catch {}
  };

  const snoozeNotification = (id: string, hours: number) => {
    const snoozedUntil = new Date();
    snoozedUntil.setHours(snoozedUntil.getHours() + hours);
    
    setSnoozedNotifications(prev => {
      const next = { ...prev, [id]: snoozedUntil.toISOString() };
      try {
        localStorage.setItem('notification_snoozed', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const dismissNotification = (id: string) => {
    setReadIds(prev => {
      const next = new Set(prev);
      next.add(id);
      try {
        localStorage.setItem('notification_read_ids', JSON.stringify(Array.from(next)));
        window.dispatchEvent(new CustomEvent('notifications:read-changed'));
      } catch {}
      return next;
    });
  };

  // Group similar notifications
  const groupedNotifications = useMemo(() => {
    const groups: Record<string, Notification[]> = {};
    
    notifications.forEach(notification => {
      if (notification.read) return;
      
      const groupKey = getGroupKey(notification);
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(notification);
    });

    return Object.entries(groups).map(([key, items]) => {
      if (items.length === 1) {
        return items[0];
      }
      
      // Create grouped notification
      const first = items[0];
      return {
        ...first,
        id: `group_${key}`,
        title: getGroupTitle(first.type, items.length),
        message: getGroupMessage(first.type, items.length),
        group_count: items.length,
      };
    }).sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [notifications]);

  const unreadCount = notifications.filter(n => !n.read).length;
  const highPriorityCount = notifications.filter(n => n.priority === 'high' && !n.read).length;

  return {
    notifications: groupedNotifications,
    unreadCount,
    highPriorityCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    snoozeNotification,
    dismissNotification,
  };
};

// Helper functions
const getCategoryForType = (type: string): 'reminders' | 'alerts' | 'updates' => {
  switch (type) {
    case 'pd_due':
    case 'vaccination_due':
    case 'delivery_due':
    case 'ai_due':
    case 'payment_due':
    case 'group_change_due':
      return 'reminders';
    case 'low_stock':
    case 'sync_failed':
    case 'delivery_delay':
    case 'system_alert':
      return 'alerts';
    default:
      return 'updates';
  }
};

const isNotificationOverdue = (notification: Notification): boolean => {
  const now = new Date();
  const created = new Date(notification.created_at);
  const hoursDiff = (now.getTime() - created.getTime()) / (1000 * 60 * 60);
  
  if (notification.priority === 'high') return hoursDiff > 24;
  if (notification.priority === 'medium') return hoursDiff > 72;
  return hoursDiff > 168; // 1 week
};

const getGroupKey = (notification: Notification): string => {
  return notification.type;
};

const getGroupTitle = (type: string, count: number): string => {
  switch (type) {
    case 'pd_due':
      return `${count} PD Checks Due`;
    case 'vaccination_due':
      return `${count} Vaccinations Due`;
    case 'delivery_due':
      return `${count} Deliveries Expected`;
    case 'group_change_due':
      return `${count} Group Changes Due`;
    case 'low_stock':
      return `${count} Items Low in Stock`;
    default:
      return `${count} Notifications`;
  }
};

const getGroupMessage = (type: string, count: number): string => {
  switch (type) {
    case 'pd_due':
      return `${count} cows need pregnancy diagnosis checks`;
    case 'vaccination_due':
      return `${count} cows need vaccinations`;
    case 'delivery_due':
      return `${count} cows expected to deliver soon`;
    case 'group_change_due':
      return `${count} cows need to be moved from dry group to milking group`;
    case 'low_stock':
      return `${count} feed items are running low`;
    default:
      return `${count} notifications require attention`;
  }
};