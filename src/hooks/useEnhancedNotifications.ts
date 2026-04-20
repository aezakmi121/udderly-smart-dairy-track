import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAppSetting } from './useAppSettings';

export interface DetailedNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  priority: 'high' | 'medium' | 'low';
  created_at: string;
  read?: boolean;
  snoozed?: boolean;
  snooze_until?: string;
  data?: {
    cows?: Array<{
      cow_no: string;
      expected_delivery?: string;
      days_remaining?: number;
      ai_date?: string;
      service_no?: number;
      overdue?: boolean;
      vaccine_name?: string;
      due_date?: string;
    }>;
    items?: Array<{
      id: string;
      name: string;
      current_stock: number;
      minimum_stock_level: number;
      unit: string;
    }>;
  };
}

const STORAGE_KEYS = {
  read: 'notification_read_state',
  snoozed: 'notification_snoozed_state',
  dismissed: 'notification_dismissed_state',
} as const;

const loadSet = (key: string): Set<string> => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
};

const loadMap = (key: string): Map<string, string> => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? new Map(Object.entries(JSON.parse(raw))) : new Map();
  } catch {
    return new Map();
  }
};

export const useEnhancedNotifications = () => {
  const [readNotifications, setReadNotifications] = useState<Set<string>>(() => loadSet(STORAGE_KEYS.read));
  const [dismissedNotifications, setDismissedNotifications] = useState<Set<string>>(() => loadSet(STORAGE_KEYS.dismissed));
  const [snoozedNotifications, setSnoozedNotifications] = useState<Map<string, string>>(() => loadMap(STORAGE_KEYS.snoozed));

  const pdAlertDays = useAppSetting<number>('pd_alert_days').value ?? 60;
  const expectedDeliveryDays = useAppSetting<number>('delivery_expected_days').value ?? 283;

  // Persist read state
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.read, JSON.stringify(Array.from(readNotifications)));
  }, [readNotifications]);

  // Persist dismissed state
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.dismissed, JSON.stringify(Array.from(dismissedNotifications)));
  }, [dismissedNotifications]);

  // Persist snoozed state
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.snoozed, JSON.stringify(Object.fromEntries(snoozedNotifications)));
  }, [snoozedNotifications]);

  const { data: rawNotifications = [], isLoading } = useQuery({
    queryKey: ['enhanced-notifications', pdAlertDays, expectedDeliveryDays],
    queryFn: async (): Promise<DetailedNotification[]> => {
      const notifications: DetailedNotification[] = [];
      const today = new Date().toISOString().split('T')[0];

      try {
        // 1. Expected deliveries (grouped by urgency)
        const { data: deliveryData } = await supabase
          .from('ai_records')
          .select('*, cows!ai_records_cow_id_fkey (cow_number)')
          .not('expected_delivery_date', 'is', null)
          .gte('expected_delivery_date', today)
          .lte('expected_delivery_date', new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
          .eq('is_successful', true)
          .is('actual_delivery_date', null);

        const urgentDeliveries: DetailedNotification['data']['cows'] = [];
        const upcomingDeliveries: DetailedNotification['data']['cows'] = [];

        deliveryData?.forEach(record => {
          const daysUntil = Math.ceil(
            (new Date(record.expected_delivery_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
          );
          const cowData = {
            cow_no: record.cows?.cow_number || 'Unknown',
            expected_delivery: record.expected_delivery_date,
            days_remaining: daysUntil,
          };
          if (daysUntil <= 3) urgentDeliveries.push(cowData);
          else upcomingDeliveries.push(cowData);
        });

        if (urgentDeliveries.length > 0) {
          notifications.push({
            id: 'delivery-urgent',
            type: 'delivery_due',
            title: `${urgentDeliveries.length} Urgent Deliveries`,
            message: `${urgentDeliveries.length} cows expected to deliver within 3 days`,
            priority: 'high',
            created_at: new Date().toISOString(),
            data: { cows: urgentDeliveries },
          });
        }
        if (upcomingDeliveries.length > 0) {
          notifications.push({
            id: 'delivery-upcoming',
            type: 'delivery_due',
            title: `${upcomingDeliveries.length} Deliveries Expected`,
            message: `${upcomingDeliveries.length} cows expected to deliver within 2 weeks`,
            priority: 'medium',
            created_at: new Date().toISOString(),
            data: { cows: upcomingDeliveries },
          });
        }

        // 2. PD due records (grouped)
        const { data: pdDueRecords } = await supabase
          .from('ai_records')
          .select('*, cows!ai_records_cow_id_fkey (cow_number)')
          .eq('ai_status', 'done')
          .eq('pd_done', false)
          .gte('ai_date', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
          .lte('ai_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

        const overduePD: DetailedNotification['data']['cows'] = [];
        const upcomingPD: DetailedNotification['data']['cows'] = [];

        pdDueRecords?.forEach(record => {
          const daysSinceAI = Math.ceil(
            (Date.now() - new Date(record.ai_date).getTime()) / (1000 * 60 * 60 * 24)
          );
          const cowData = {
            cow_no: record.cows?.cow_number || 'Unknown',
            ai_date: record.ai_date,
            service_no: record.service_number,
            overdue: daysSinceAI > pdAlertDays,
          };
          if (daysSinceAI > pdAlertDays) overduePD.push(cowData);
          else if (daysSinceAI >= pdAlertDays - 7) upcomingPD.push(cowData);
        });

        if (overduePD.length > 0) {
          notifications.push({
            id: 'pd-overdue',
            type: 'pd_due',
            title: `${overduePD.length} PD Checks Overdue`,
            message: `${overduePD.length} pregnancy diagnoses are overdue`,
            priority: 'high',
            created_at: new Date().toISOString(),
            data: { cows: overduePD },
          });
        }
        if (upcomingPD.length > 0) {
          notifications.push({
            id: 'pd-due',
            type: 'pd_due',
            title: `${upcomingPD.length} PD Checks Due`,
            message: `${upcomingPD.length} cows need pregnancy diagnosis`,
            priority: 'medium',
            created_at: new Date().toISOString(),
            data: { cows: upcomingPD },
          });
        }

        // 3. Vaccination due (grouped)
        const { data: vaccinationDue } = await supabase
          .from('vaccination_records')
          .select('*, cows!vaccination_records_cow_id_fkey (cow_number), vaccination_schedules!vaccination_schedule_id (vaccine_name)')
          .lte('next_due_date', new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

        const overdueVaccinations: DetailedNotification['data']['cows'] = [];
        const upcomingVaccinations: DetailedNotification['data']['cows'] = [];

        vaccinationDue?.forEach(record => {
          const daysUntil = Math.ceil(
            (new Date(record.next_due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
          );
          const cowData = {
            cow_no: record.cows?.cow_number || 'Unknown',
            vaccine_name: record.vaccination_schedules?.vaccine_name || 'Unknown',
            due_date: record.next_due_date,
            overdue: daysUntil < 0,
          };
          if (daysUntil < 0) overdueVaccinations.push(cowData);
          else if (daysUntil <= 7) upcomingVaccinations.push(cowData);
        });

        if (overdueVaccinations.length > 0) {
          notifications.push({
            id: 'vaccination-overdue',
            type: 'vaccination_due',
            title: `${overdueVaccinations.length} Vaccinations Overdue`,
            message: `${overdueVaccinations.length} vaccinations are overdue`,
            priority: 'high',
            created_at: new Date().toISOString(),
            data: { cows: overdueVaccinations },
          });
        }
        if (upcomingVaccinations.length > 0) {
          notifications.push({
            id: 'vaccination-due',
            type: 'vaccination_due',
            title: `${upcomingVaccinations.length} Vaccinations Due`,
            message: `${upcomingVaccinations.length} vaccinations due within 7 days`,
            priority: 'medium',
            created_at: new Date().toISOString(),
            data: { cows: upcomingVaccinations },
          });
        }

        // 4. Low stock items
        const { data: allFeedItems } = await supabase.from('feed_items').select('*');
        const lowStockItems = (allFeedItems || []).filter(item => {
          const current = parseFloat(item.current_stock?.toString() || '0');
          const minimum = parseFloat(item.minimum_stock_level?.toString() || '0');
          return current <= minimum && current > 0;
        });

        if (lowStockItems.length > 0) {
          notifications.push({
            id: 'low-stock',
            type: 'low_stock',
            title: `${lowStockItems.length} Items Low in Stock`,
            message: `${lowStockItems.length} feed items are running low`,
            priority: 'medium',
            created_at: new Date().toISOString(),
            data: {
              items: lowStockItems.map(item => ({
                id: item.id,
                name: item.name,
                current_stock: parseFloat(item.current_stock?.toString() || '0'),
                minimum_stock_level: parseFloat(item.minimum_stock_level?.toString() || '0'),
                unit: item.unit,
              })),
            },
          });
        }
      } catch (error) {
        console.error('Error fetching notifications:', error);
      }

      return notifications;
    },
    refetchInterval: 5 * 60 * 1000,
  });

  const notifications = useMemo(() => {
    const now = new Date();
    return rawNotifications
      .filter(n => {
        // Hide dismissed notifications — they stay gone until data changes
        if (dismissedNotifications.has(n.id)) return false;
        // Hide actively snoozed notifications
        const snoozeUntil = snoozedNotifications.get(n.id);
        if (snoozeUntil && new Date(snoozeUntil) > now) return false;
        return true;
      })
      .map(n => ({
        ...n,
        read: readNotifications.has(n.id),
        snoozed: snoozedNotifications.has(n.id),
        snooze_until: snoozedNotifications.get(n.id),
      }))
      .sort((a, b) => {
        const order = { high: 3, medium: 2, low: 1 };
        if (order[a.priority] !== order[b.priority]) return order[b.priority] - order[a.priority];
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  }, [rawNotifications, readNotifications, dismissedNotifications, snoozedNotifications]);

  const unreadCount = notifications.filter(n => !n.read).length;
  const highPriorityCount = notifications.filter(n => !n.read && n.priority === 'high').length;

  const markAsRead = (id: string) => {
    setReadNotifications(prev => new Set([...prev, id]));
  };

  const markAllAsRead = () => {
    setReadNotifications(prev => new Set([...prev, ...notifications.map(n => n.id)]));
  };

  const snoozeNotification = (id: string, hours: number) => {
    const snoozeUntil = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
    setSnoozedNotifications(prev => new Map([...prev, [id, snoozeUntil]]));
    markAsRead(id);
  };

  // Dismissed notifications are permanently hidden until the underlying data changes
  // (e.g., new cows added → new 'delivery-urgent' group with different data)
  const dismissNotification = (id: string) => {
    setDismissedNotifications(prev => new Set([...prev, id]));
  };

  return {
    notifications,
    isLoading,
    unreadCount,
    highPriorityCount,
    markAsRead,
    markAllAsRead,
    snoozeNotification,
    dismissNotification,
  };
};
