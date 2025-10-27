import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CollectionCenterDistribution {
  id: string;
  distribution_date: string;
  session: 'morning' | 'evening';
  cow_to_store: number;
  cow_to_plant: number;
  cow_to_farm_cream: number;
  buffalo_to_store: number;
  buffalo_to_plant: number;
  cash_sale: number;
  mixing: number;
  notes?: string;
}

export const useCollectionCenterDistributions = (selectedDate: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: distributions, isLoading } = useQuery({
    queryKey: ['collection-center-distributions', selectedDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('collection_center_distributions')
        .select('*')
        .eq('distribution_date', selectedDate)
        .order('session', { ascending: true });
      
      if (error) throw error;
      return data as CollectionCenterDistribution[];
    }
  });

  // Get total milk collected at collection center for the date/session
  const { data: collectionData } = useQuery({
    queryKey: ['collection-totals', selectedDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('milk_collections')
        .select('session, quantity, species')
        .eq('collection_date', selectedDate);
      
      if (error) throw error;
      
      const result: Record<string, { cow: number; buffalo: number }> = {
        morning: { cow: 0, buffalo: 0 },
        evening: { cow: 0, buffalo: 0 }
      };
      
      data.forEach(record => {
        const species = record.species.toLowerCase();
        if (species === 'cow') {
          result[record.session].cow += Number(record.quantity);
        } else if (species === 'buffalo') {
          result[record.session].buffalo += Number(record.quantity);
        }
      });
      
      return result;
    }
  });

  const addDistributionMutation = useMutation({
    mutationFn: async (newDistribution: Omit<CollectionCenterDistribution, 'id'>) => {
      const { data, error } = await supabase
        .from('collection_center_distributions')
        .insert(newDistribution)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collection-center-distributions'] });
      toast({ title: "Collection center distribution added successfully!" });
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
    mutationFn: async ({ id, ...updates }: Partial<CollectionCenterDistribution> & { id: string }) => {
      const { data, error } = await supabase
        .from('collection_center_distributions')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collection-center-distributions'] });
      toast({ title: "Distribution updated successfully!" });
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
        .from('collection_center_distributions')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collection-center-distributions'] });
      toast({ title: "Distribution deleted successfully!" });
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
    collectionData,
    isLoading,
    addDistributionMutation,
    updateDistributionMutation,
    deleteDistributionMutation
  };
};
