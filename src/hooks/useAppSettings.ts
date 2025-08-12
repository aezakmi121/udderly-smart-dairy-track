import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AppSettingRow {
  key: string;
  value: any;
}

export const useAppSetting = <T = any>(key: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data, isLoading, error } = useQuery<AppSettingRow | null>({
    queryKey: ['app-setting', key],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_settings')
        .select('key, value')
        .eq('key', key)
        .maybeSingle();
      if (error) throw error;
      return (data as AppSettingRow) ?? null;
    },
  });

  const mutation = useMutation({
    mutationFn: async (value: T) => {
      const { error } = await supabase
        .from('app_settings')
        .upsert({ key, value: value as any }, { onConflict: 'key' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app-setting', key] });
      toast({ title: 'Setting saved' });
    },
    onError: (e: any) => {
      toast({ title: 'Failed to save setting', description: e.message, variant: 'destructive' });
    }
  });

  return {
    value: (data?.value as T) ?? undefined,
    isLoading,
    error,
    save: mutation.mutate,
    saveAsync: mutation.mutateAsync,
    isSaving: mutation.isPending,
  };
};
