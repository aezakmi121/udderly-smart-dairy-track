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

export const useEnhancedNotifications = () => {
  const [readNotifications, setReadNotifications] = useState<Set<string>>(new Set());
  const [snoozedNotifications, setSnoozedNotifications] = useState<Map<string, string>>(new Map());
  
  const pdAlertDays = useAppSetting<number>('pd_alert_days')?.value || 60;
  const expectedDeliveryDays = useAppSetting<number>('delivery_expected_days')?.value || 283;

  // Load state from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('notification_read_state');
    if (stored) {
      try {
        setReadNotifications(new Set(JSON.parse(stored)));
      } catch (e) {
        console.error('Failed to parse stored notification state:', e);
      }
    }

    const snoozed = localStorage.getItem('notification_snoozed_state');
    if (snoozed) {
      try {
        const parsed = JSON.parse(snoozed);
        setSnoozedNotifications(new Map(Object.entries(parsed)));
      } catch (e) {
        console.error('Failed to parse snoozed notification state:', e);
      }
    }
  }, []);

  // Persist state to localStorage
  useEffect(() => {
    localStorage.setItem('notification_read_state', JSON.stringify(Array.from(readNotifications)));
  }, [readNotifications]);

  useEffect(() => {
    const snoozedObj = Object.fromEntries(snoozedNotifications);
    localStorage.setItem('notification_snoozed_state', JSON.stringify(snoozedObj));
  }, [snoozedNotifications]);

  const { data: rawNotifications = [], isLoading } = useQuery({
    queryKey: ['enhanced-notifications', pdAlertDays, expectedDeliveryDays],
    queryFn: async (): Promise<DetailedNotification[]> => {
      const notifications: DetailedNotification[] = [];

      try {
        // 1. Check for expected deliveries (grouped)
        const { data: deliveryData } = await supabase
          .from('ai_records')
          .select(`
            *,
            cows!ai_records_cow_id_fkey (cow_number)
          `)
          .not('expected_delivery_date', 'is', null)
          .gte('expected_delivery_date', new Date().toISOString().split('T')[0])
          .lte('expected_delivery_date', new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
          .eq('is_successful', true)
          .is('actual_delivery_date', null);

        // Group deliveries by urgency
        const urgentDeliveries: any[] = [];
        const upcomingDeliveries: any[] = [];
        
        deliveryData?.forEach(record => {
          const today = new Date();
          const deliveryDate = new Date(record.expected_delivery_date);
          const daysUntil = Math.ceil((deliveryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          
          const cowData = {
            cow_no: record.cows?.cow_number || 'Unknown',
            expected_delivery: record.expected_delivery_date,
            days_remaining: daysUntil
          };

          if (daysUntil <= 3) {
            urgentDeliveries.push(cowData);
          } else if (daysUntil <= 14) {
            upcomingDeliveries.push(cowData);
          }
        });

        if (urgentDeliveries.length > 0) {
          notifications.push({
            id: `delivery-urgent-${new Date().toDateString()}`,
            type: 'delivery_due',
            title: `${urgentDeliveries.length} Urgent Deliveries`,
            message: `${urgentDeliveries.length} cows expected to deliver within 3 days`,
            priority: 'high',
            created_at: new Date().toISOString(),
            data: { cows: urgentDeliveries }
          });
        }

        if (upcomingDeliveries.length > 0) {
          notifications.push({
            id: `delivery-upcoming-${new Date().toDateString()}`,
            type: 'delivery_due',
            title: `${upcomingDeliveries.length} Deliveries Expected`,
            message: `${upcomingDeliveries.length} cows expected to deliver within 2 weeks`,
            priority: 'medium',
            created_at: new Date().toISOString(),
            data: { cows: upcomingDeliveries }
          });
        }

        // 2. Check for PD due records (grouped)
        const { data: pdDueRecords } = await supabase
          .from('ai_records')
          .select(`
            *,
            cows!ai_records_cow_id_fkey (cow_number)
          `)
          .eq('ai_status', 'done')
          .eq('pd_done', false)
          .gte('ai_date', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
          .lte('ai_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

        const overduePD: any[] = [];
        const upcomingPD: any[] = [];
        
        pdDueRecords?.forEach(record => {
          const today = new Date();
          const aiDate = new Date(record.ai_date);
          const daysSinceAI = Math.ceil((today.getTime() - aiDate.getTime()) / (1000 * 60 * 60 * 24));
          
          const cowData = {
            cow_no: record.cows?.cow_number || 'Unknown',
            ai_date: record.ai_date,
            service_no: record.service_number,
            overdue: daysSinceAI > pdAlertDays
          };

          if (daysSinceAI > pdAlertDays) {
            overduePD.push(cowData);
          } else if (daysSinceAI >= pdAlertDays - 7) {
            upcomingPD.push(cowData);
          }
        });

        if (overduePD.length > 0) {
          notifications.push({
            id: `pd-overdue-${new Date().toDateString()}`,
            type: 'pd_due',
            title: `${overduePD.length} PD Checks Overdue`,
            message: `${overduePD.length} pregnancy diagnoses are overdue`,
            priority: 'high',
            created_at: new Date().toISOString(),
            data: { cows: overduePD }
          });
        }

        if (upcomingPD.length > 0) {
          notifications.push({
            id: `pd-due-${new Date().toDateString()}`,
            type: 'pd_due',
            title: `${upcomingPD.length} PD Checks Due`,
            message: `${upcomingPD.length} cows need pregnancy diagnosis`,
            priority: 'medium',
            created_at: new Date().toISOString(),
            data: { cows: upcomingPD }
          });
        }

        // 3. Check for vaccination due (grouped)
        const { data: vaccinationDue } = await supabase
          .from('vaccination_records')
          .select(`
            *,
            cows!vaccination_records_cow_id_fkey (cow_number),
            vaccination_schedules!vaccination_schedule_id (vaccine_name)
          `)
          .lte('next_due_date', new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

        const overdueVaccinations: any[] = [];
        const upcomingVaccinations: any[] = [];

        vaccinationDue?.forEach(record => {
          const today = new Date();
          const dueDate = new Date(record.next_due_date);
          const daysUntil = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

          const cowData = {
            cow_no: record.cows?.cow_number || 'Unknown',
            vaccine_name: record.vaccination_schedules?.vaccine_name || 'Unknown',
            due_date: record.next_due_date,
            overdue: daysUntil < 0
          };

          if (daysUntil < 0) {
            overdueVaccinations.push(cowData);
          } else if (daysUntil <= 7) {
            upcomingVaccinations.push(cowData);
          }
        });

        if (overdueVaccinations.length > 0) {
          notifications.push({
            id: `vaccination-overdue-${new Date().toDateString()}`,
            type: 'vaccination_due',
            title: `${overdueVaccinations.length} Vaccinations Overdue`,
            message: `${overdueVaccinations.length} vaccinations are overdue`,
            priority: 'high',
            created_at: new Date().toISOString(),
            data: { cows: overdueVaccinations }
          });
        }

        if (upcomingVaccinations.length > 0) {
          notifications.push({
            id: `vaccination-due-${new Date().toDateString()}`,
            type: 'vaccination_due',
            title: `${upcomingVaccinations.length} Vaccinations Due`,
            message: `${upcomingVaccinations.length} vaccinations due within 7 days`,
            priority: 'medium',
            created_at: new Date().toISOString(),
            data: { cows: upcomingVaccinations }
          });
        }

        // 4. Check for low stock items
        const { data: allFeedItems } = await supabase
          .from('feed_items')
          .select('*');

        const lowStockItems = allFeedItems?.filter(item => {
          const currentStock = parseFloat(item.current_stock?.toString() || '0');
          const minimumLevel = parseFloat(item.minimum_stock_level?.toString() || '0');
          return currentStock <= minimumLevel && currentStock > 0;
        }) || [];

        if (lowStockItems.length > 0) {
          notifications.push({
            id: `low-stock-${new Date().toDateString()}`,
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
                unit: item.unit
              }))
            }
          });
        }

      } catch (error) {
        console.error('Error fetching notifications:', error);
      }

      return notifications;
    },
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });

  const notifications = useMemo(() => {
    const now = new Date();
    
    return rawNotifications
      .filter(notification => {
        // Filter out snoozed notifications
        const snoozeUntil = snoozedNotifications.get(notification.id);
        if (snoozeUntil && new Date(snoozeUntil) > now) {
          return false;
        }
        return true;
      })
      .map(notification => ({
        ...notification,
        read: readNotifications.has(notification.id),
        snoozed: snoozedNotifications.has(notification.id),
        snooze_until: snoozedNotifications.get(notification.id)
      }))
      .sort((a, b) => {
        // Sort by priority first, then by creation date
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        }
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  }, [rawNotifications, readNotifications, snoozedNotifications]);

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
  };

  const dismissNotification = (id: string) => {
    markAsRead(id);
  };

  return {
    notifications,
    isLoading,
    unreadCount,
    highPriorityCount,
    markAsRead,
    markAllAsRead,
    snoozeNotification,
    dismissNotification
  };
};