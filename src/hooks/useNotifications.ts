
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserPermissions } from './useUserPermissions';

interface Notification {
  id: string;
  type: 'low_stock' | 'ai_needed' | 'pregnancy_check' | 'vaccination_due' | 'calving_due';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  data?: any;
  created_at: string;
}

export const useNotifications = () => {
  const { canAccess } = useUserPermissions();

  const { data: notifications, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const notifications: Notification[] = [];
      const now = new Date();
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      // Low stock notifications (for farm workers and admins)
      if (canAccess.feedManagement) {
        const { data: lowStockItems } = await supabase
          .from('feed_items')
          .select('*')
          .lte('current_stock', 'minimum_stock_level');

        lowStockItems?.forEach(item => {
          notifications.push({
            id: `low_stock_${item.id}`,
            type: 'low_stock',
            title: 'Low Stock Alert',
            description: `${item.name} is running low (${item.current_stock} ${item.unit} remaining)`,
            priority: item.current_stock === 0 ? 'high' : 'medium',
            data: { item },
            created_at: now.toISOString()
          });
        });
      }

      // AI needed notifications (for farm workers and admins)
      if (canAccess.aiTracking) {
        const { data: cowsNeedingAI } = await supabase
          .from('cows')
          .select('*')
          .eq('status', 'active')
          .is('last_calving_date', null);

        cowsNeedingAI?.forEach(cow => {
          notifications.push({
            id: `ai_needed_${cow.id}`,
            type: 'ai_needed',
            title: 'AI Service Needed',
            description: `Cow ${cow.cow_number} may need AI service`,
            priority: 'medium',
            data: { cow },
            created_at: now.toISOString()
          });
        });

        // Check for cows that haven't been bred in over 60 days after calving
        const { data: cowsPostCalving } = await supabase
          .from('cows')
          .select('*')
          .eq('status', 'active')
          .not('last_calving_date', 'is', null);

        cowsPostCalving?.forEach(cow => {
          if (cow.last_calving_date) {
            const calvingDate = new Date(cow.last_calving_date);
            const daysSinceCalving = Math.floor((now.getTime() - calvingDate.getTime()) / (1000 * 60 * 60 * 24));
            
            if (daysSinceCalving > 60) {
              notifications.push({
                id: `ai_overdue_${cow.id}`,
                type: 'ai_needed',
                title: 'AI Service Overdue',
                description: `Cow ${cow.cow_number} calved ${daysSinceCalving} days ago and may need AI service`,
                priority: 'high',
                data: { cow, daysSinceCalving },
                created_at: now.toISOString()
              });
            }
          }
        });
      }

      // Pregnancy check notifications (for farm workers and admins)
      if (canAccess.aiTracking) {
        const { data: pendingPDRecords } = await supabase
          .from('ai_records')
          .select(`
            *,
            cows!cow_id (cow_number)
          `)
          .eq('pd_done', false)
          .lte('pd_date', thirtyDaysFromNow.toISOString().split('T')[0]);

        pendingPDRecords?.forEach(record => {
          const pdDate = new Date(record.pd_date);
          const daysUntilPD = Math.ceil((pdDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          
          notifications.push({
            id: `pd_due_${record.id}`,
            type: 'pregnancy_check',
            title: 'Pregnancy Check Due',
            description: `Cow ${record.cows?.cow_number} needs pregnancy check ${daysUntilPD > 0 ? `in ${daysUntilPD} days` : `${Math.abs(daysUntilPD)} days overdue`}`,
            priority: daysUntilPD < 0 ? 'high' : 'medium',
            data: { record, daysUntilPD },
            created_at: now.toISOString()
          });
        });
      }

      // Vaccination due notifications (for farm workers and admins)
      if (canAccess.vaccination) {
        const { data: upcomingVaccinations } = await supabase
          .from('vaccination_records')
          .select(`
            *,
            cows!cow_id (cow_number),
            vaccination_schedules!vaccination_schedule_id (vaccine_name)
          `)
          .lte('next_due_date', thirtyDaysFromNow.toISOString().split('T')[0]);

        upcomingVaccinations?.forEach(record => {
          const dueDate = new Date(record.next_due_date);
          const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          
          notifications.push({
            id: `vaccination_due_${record.id}`,
            type: 'vaccination_due',
            title: 'Vaccination Due',
            description: `${record.vaccination_schedules?.vaccine_name} for cow ${record.cows?.cow_number} ${daysUntilDue > 0 ? `due in ${daysUntilDue} days` : `overdue by ${Math.abs(daysUntilDue)} days`}`,
            priority: daysUntilDue < 0 ? 'high' : 'medium',
            data: { record, daysUntilDue },
            created_at: now.toISOString()
          });
        });
      }

      // Calving due notifications (for farm workers and admins)
      if (canAccess.aiTracking) {
        const { data: pregnantCows } = await supabase
          .from('ai_records')
          .select(`
            *,
            cows!cow_id (cow_number)
          `)
          .eq('pd_result', 'positive')
          .not('expected_delivery_date', 'is', null)
          .lte('expected_delivery_date', thirtyDaysFromNow.toISOString().split('T')[0]);

        pregnantCows?.forEach(record => {
          const deliveryDate = new Date(record.expected_delivery_date);
          const daysUntilCalving = Math.ceil((deliveryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          
          notifications.push({
            id: `calving_due_${record.id}`,
            type: 'calving_due',
            title: 'Calving Due',
            description: `Cow ${record.cows?.cow_number} expected to calve ${daysUntilCalving > 0 ? `in ${daysUntilCalving} days` : `${Math.abs(daysUntilCalving)} days ago`}`,
            priority: daysUntilCalving <= 7 ? 'high' : 'medium',
            data: { record, daysUntilCalving },
            created_at: now.toISOString()
          });
        });
      }

      // Sort notifications by priority and date
      return notifications.sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        }
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    },
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });

  const highPriorityCount = notifications?.filter(n => n.priority === 'high').length || 0;
  const totalCount = notifications?.length || 0;

  return {
    notifications: notifications || [],
    isLoading,
    highPriorityCount,
    totalCount
  };
};
