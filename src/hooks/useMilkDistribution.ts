import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface MilkDistribution {
  id: string;
  distribution_date: string;
  session: 'morning' | 'evening';
  total_production: number;
  calves: number;
  farm_workers: number;
  home: number;
  pradhan_ji: number;
  chunnu: number;
  store: number;
  cream_extraction: number;
  collection_center: number;
  cream_yield?: number;
  ffm_yield?: number;
  ffm_to_dahi?: number;
  ffm_to_plant?: number;
  notes?: string;
}

export const useMilkDistribution = (selectedDate: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: distributions, isLoading } = useQuery({
    queryKey: ['milk-distributions', selectedDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('milk_distributions')
        .select('*')
        .eq('distribution_date', selectedDate)
        .order('session', { ascending: true });
      
      if (error) throw error;
      return data as MilkDistribution[];
    }
  });

  const { data: productionData } = useQuery({
    queryKey: ['milk-production-for-distribution', selectedDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('milk_production')
        .select('session, quantity')
        .eq('production_date', selectedDate);
      
      if (error) throw error;
      
      const morning = data.filter(r => r.session === 'morning').reduce((sum, r) => sum + Number(r.quantity), 0);
      const evening = data.filter(r => r.session === 'evening').reduce((sum, r) => sum + Number(r.quantity), 0);
      
      return { morning, evening };
    }
  });

  const addDistributionMutation = useMutation({
    mutationFn: async (newDistribution: Omit<MilkDistribution, 'id'>) => {
      const { data, error } = await supabase
        .from('milk_distributions')
        .insert(newDistribution)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['milk-distributions'] });
      toast({ title: "Distribution record added successfully!" });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Error adding distribution", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  const updateDistributionMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<MilkDistribution> & { id: string }) => {
      const { data, error } = await supabase
        .from('milk_distributions')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['milk-distributions'] });
      toast({ title: "Distribution record updated successfully!" });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Error updating distribution", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  const deleteDistributionMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('milk_distributions')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['milk-distributions'] });
      toast({ title: "Distribution record deleted successfully!" });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Error deleting distribution", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  return {
    distributions,
    productionData,
    isLoading,
    addDistributionMutation,
    updateDistributionMutation,
    deleteDistributionMutation
  };
};
