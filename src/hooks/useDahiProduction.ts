import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface DahiProduction {
  id: string;
  production_date: string;
  batch_number?: string;
  ffm_used: number;
  dahi_yield: number;
  conversion_rate: number;
  production_cost?: number;
  cost_per_kg?: number;
  notes?: string;
}

export const useDahiProduction = (selectedDate?: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: productions, isLoading } = useQuery({
    queryKey: ['dahi-production', selectedDate],
    queryFn: async () => {
      let query = supabase
        .from('dahi_production')
        .select('*')
        .order('production_date', { ascending: false });
      
      if (selectedDate) {
        query = query.eq('production_date', selectedDate);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as DahiProduction[];
    }
  });

  const addProductionMutation = useMutation({
    mutationFn: async (newProduction: Omit<DahiProduction, 'id' | 'conversion_rate' | 'cost_per_kg'>) => {
      const { data, error } = await supabase
        .from('dahi_production')
        .insert(newProduction)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dahi-production'] });
      toast({ title: "Dahi production added successfully!" });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Error adding production", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  const updateProductionMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<DahiProduction> & { id: string }) => {
      const { data, error } = await supabase
        .from('dahi_production')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dahi-production'] });
      toast({ title: "Production updated successfully!" });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Error updating production", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  const deleteProductionMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('dahi_production')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dahi-production'] });
      toast({ title: "Production deleted successfully!" });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Error deleting production", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  return {
    productions,
    isLoading,
    addProductionMutation,
    updateProductionMutation,
    deleteProductionMutation
  };
};
