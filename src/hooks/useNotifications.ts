
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Notification {
  id: string;
  type: 'low_stock' | 'pd_due' | 'vaccination_due' | 'delivery_due';
  title: string;
  message: string;
  priority: 'high' | 'medium' | 'low';
  read: boolean;
  created_at: string;
  entity_id?: string;
  entity_type?: string;
}

export const useNotifications = () => {
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications'],
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

        // Check for PD due records - Fixed foreign key relationship
        const { data: pdDueRecords } = await supabase
          .from('ai_records')
          .select(`
            *,
            cows!ai_records_cow_id_fkey (cow_number)
          `)
          .eq('pd_done', false)
          .lte('pd_date', new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

        pdDueRecords?.forEach(record => {
          notifications.push({
            id: `pd_due_${record.id}`,
            type: 'pd_due',
            title: 'PD Check Due',
            message: `PD check due for cow ${record.cows?.cow_number || 'Unknown'}`,
            priority: 'medium',
            read: false,
            created_at: new Date().toISOString(),
            entity_id: record.id,
            entity_type: 'ai_record'
          });
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
            message: `${record.vaccination_schedules?.vaccine_name} vaccination due for cow ${record.cows?.cow_number || 'Unknown'}`,
            priority: 'medium',
            read: false,
            created_at: new Date().toISOString(),
            entity_id: record.id,
            entity_type: 'vaccination_record'
          });
        });

        // Check for expected deliveries - Fixed foreign key relationship
        const { data: deliveriesDue } = await supabase
          .from('ai_records')
          .select(`
            *,
            cows!ai_records_cow_id_fkey (cow_number)
          `)
          .eq('pd_result', 'positive')
          .not('expected_delivery_date', 'is', null)
          .lte('expected_delivery_date', new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

        deliveriesDue?.forEach(record => {
          notifications.push({
            id: `delivery_due_${record.id}`,
            type: 'delivery_due',
            title: 'Delivery Expected',
            message: `Cow ${record.cows?.cow_number || 'Unknown'} expected to deliver soon`,
            priority: 'high',
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

  const unreadCount = notifications.filter(n => !n.read).length;
  const highPriorityCount = notifications.filter(n => n.priority === 'high' && !n.read).length;

  return {
    notifications,
    unreadCount,
    highPriorityCount,
    isLoading
  };
};
