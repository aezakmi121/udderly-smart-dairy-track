import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface NotificationHistoryItem {
  id: string;
  user_id: string;
  notification_id: string;
  type: string;
  title: string;
  message: string;
  priority: 'high' | 'medium' | 'low';
  entity_id: string | null;
  entity_type: string | null;
  status: 'sent' | 'read' | 'dismissed' | 'snoozed';
  snoozed_until: string | null;
  is_grouped: boolean;
  group_key: string | null;
  created_at: string;
  read_at: string | null;
  dismissed_at: string | null;
}

export const useNotificationHistory = (days: number = 30) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: history = [], isLoading } = useQuery({
    queryKey: ['notification-history', days],
    queryFn: async (): Promise<NotificationHistoryItem[]> => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from('notification_history')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as NotificationHistoryItem[];
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ 
      id, 
      status, 
      snoozed_until 
    }: { 
      id: string; 
      status: NotificationHistoryItem['status']; 
      snoozed_until?: string | null;
    }) => {
      const updates: any = { 
        status,
        snoozed_until: snoozed_until || null,
      };

      if (status === 'read') {
        updates.read_at = new Date().toISOString();
      } else if (status === 'dismissed') {
        updates.dismissed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('notification_history')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-history'] });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Failed to update notification', 
        description: error.message, 
        variant: 'destructive' 
      });
    }
  });

  const updateStatus = (id: string, status: NotificationHistoryItem['status'], snoozedUntil?: string) => {
    updateStatusMutation.mutate({ id, status, snoozed_until: snoozedUntil });
  };

  const snoozeNotification = (id: string, hours: number) => {
    const snoozedUntil = new Date();
    snoozedUntil.setHours(snoozedUntil.getHours() + hours);
    updateStatus(id, 'snoozed', snoozedUntil.toISOString());
  };

  return {
    history,
    isLoading,
    updateStatus,
    snoozeNotification,
    isUpdating: updateStatusMutation.isPending,
  };
};