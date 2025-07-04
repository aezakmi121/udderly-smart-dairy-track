
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface MilkRateSetting {
  id: string;
  fat_min: number;
  fat_max: number;
  snf_min: number;
  snf_max: number;
  rate_per_liter: number;
  is_active: boolean;
  effective_from: string;
}

export const useMilkRateSettings = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: rateSettings, isLoading } = useQuery({
    queryKey: ['milk-rate-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('milk_rates')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  const addRateSettingMutation = useMutation({
    mutationFn: async (newRateSetting: Omit<MilkRateSetting, 'id'>) => {
      const { data, error } = await supabase
        .from('milk_rates')
        .insert(newRateSetting)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['milk-rate-settings'] });
      toast({ title: "Rate setting added successfully!" });
    }
  });

  // Simplified rate calculation - just use the most recent active rate
  const calculateRate = (fatPercentage: number, snfPercentage: number) => {
    if (!rateSettings || rateSettings.length === 0) return 0;
    
    // For now, just return the most recent rate (first in the ordered list)
    return rateSettings[0]?.rate_per_liter || 0;
  };

  return {
    rateSettings,
    isLoading,
    addRateSettingMutation,
    calculateRate
  };
};
