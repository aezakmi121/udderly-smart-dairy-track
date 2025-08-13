
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAppSetting } from '@/hooks/useAppSettings';
import { useEffect, useMemo, useState } from 'react';
import { formatDate } from '@/lib/dateUtils';

export interface Notification {
  id: string;
  type: 'low_stock' | 'pd_due' | 'vaccination_due' | 'delivery_due' | 'ai_due';
  title: string;
  message: string;
  priority: 'high' | 'medium' | 'low';
  read: boolean;
  created_at: string;
  entity_id?: string;
  entity_type?: string;
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
        // Check for low stock feed items - Fixed query
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
        console.error('Error fetching notifications:', error);
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
  const [readIds, setReadIds] = useState<Set<string>>(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('notification_read_ids') || '[]');
      return new Set<string>(stored);
    } catch {
      return new Set<string>();
    }
  });

  useEffect(() => {
    localStorage.setItem('notification_read_ids', JSON.stringify(Array.from(readIds)));
  }, [readIds]);

  const notifications = useMemo(
    () => rawNotifications.map(n => ({ ...n, read: readIds.has(n.id) })),
    [rawNotifications, readIds]
  );

  const markAsRead = (id: string) => {
    setReadIds(prev => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  const markAllAsRead = () => {
    setReadIds(new Set(rawNotifications.map(n => n.id)));
  };

  const unreadCount = notifications.filter(n => !n.read).length;
  const highPriorityCount = notifications.filter(n => n.priority === 'high' && !n.read).length;

  return {
    notifications,
    unreadCount,
    highPriorityCount,
    isLoading,
    markAsRead,
    markAllAsRead,
  };
};