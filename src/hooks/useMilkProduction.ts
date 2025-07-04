
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface MilkProduction {
  id: string;
  cow_id?: string;
  production_date: string;
  session: 'morning' | 'evening';
  quantity: number;
  fat_percentage?: number;
  snf_percentage?: number;
  remarks?: string;
}

export const useMilkProduction = (selectedDate: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: milkRecords, isLoading } = useQuery({
    queryKey: ['milk-production', selectedDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('milk_production')
        .select(`
          *,
          cows!cow_id (
            cow_number
          )
        `)
        .eq('production_date', selectedDate)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  const { data: dailyStats } = useQuery({
    queryKey: ['daily-milk-stats', selectedDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('milk_production')
        .select('quantity, session')
        .eq('production_date', selectedDate);
      
      if (error) throw error;
      
      const morning = data.filter(r => r.session === 'morning').reduce((sum, r) => sum + Number(r.quantity), 0);
      const evening = data.filter(r => r.session === 'evening').reduce((sum, r) => sum + Number(r.quantity), 0);
      
      return {
        morning,
        evening,
        total: morning + evening,
        records: data.length
      };
    }
  });

  const addRecordMutation = useMutation({
    mutationFn: async (newRecord: Omit<MilkProduction, 'id'>) => {
      const { data, error } = await supabase
        .from('milk_production')
        .insert(newRecord)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['milk-production'] });
      queryClient.invalidateQueries({ queryKey: ['daily-milk-stats'] });
      queryClient.invalidateQueries({ queryKey: ['cows'] });
      toast({ title: "Milk production record added successfully!" });
    }
  });

  const updateRecordMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<MilkProduction> & { id: string }) => {
      const { data, error } = await supabase
        .from('milk_production')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['milk-production'] });
      queryClient.invalidateQueries({ queryKey: ['daily-milk-stats'] });
      queryClient.invalidateQueries({ queryKey: ['cows'] });
      toast({ title: "Record updated successfully!" });
    }
  });

  const deleteRecordMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('milk_production')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['milk-production'] });
      queryClient.invalidateQueries({ queryKey: ['daily-milk-stats'] });
      queryClient.invalidateQueries({ queryKey: ['cows'] });
      toast({ title: "Record deleted successfully!" });
    }
  });

  return {
    milkRecords,
    dailyStats,
    isLoading,
    addRecordMutation,
    updateRecordMutation,
    deleteRecordMutation
  };
};
