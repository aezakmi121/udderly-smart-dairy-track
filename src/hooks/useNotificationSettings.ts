import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface NotificationSetting {
  id: string;
  user_id: string;
  category: 'reminders' | 'alerts' | 'updates';
  enabled: boolean;
  channels: ('in_app' | 'email' | 'whatsapp')[];
  quiet_hours: {
    start: string;
    end: string;
  } | null;
  created_at: string;
  updated_at: string;
}

export const useNotificationSettings = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: settings = [], isLoading } = useQuery({
    queryKey: ['notification-settings'],
    queryFn: async (): Promise<NotificationSetting[]> => {
      const { data, error } = await supabase
        .from('notification_settings')
        .select('*')
        .order('category');

      if (error) throw error;
      return (data || []) as NotificationSetting[];
    },
  });

  const updateSettingMutation = useMutation({
    mutationFn: async ({ 
      category, 
      updates 
    }: { 
      category: string; 
      updates: Partial<Pick<NotificationSetting, 'enabled' | 'channels' | 'quiet_hours'>> 
    }) => {
      const { error } = await supabase
        .from('notification_settings')
        .upsert({
          user_id: (await supabase.auth.getUser()).data.user?.id,
          category,
          ...updates,
        }, { 
          onConflict: 'user_id,category' 
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-settings'] });
      toast({ title: 'Settings updated successfully' });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Failed to update settings', 
        description: error.message, 
        variant: 'destructive' 
      });
    }
  });

  const updateSetting = (category: string, updates: Partial<Pick<NotificationSetting, 'enabled' | 'channels' | 'quiet_hours'>>) => {
    updateSettingMutation.mutate({ category, updates });
  };

  return {
    settings,
    isLoading,
    updateSetting,
    isUpdating: updateSettingMutation.isPending,
  };
};