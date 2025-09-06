
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface MilkCollection {
  id: string;
  farmer_id?: string;
  collection_date: string;
  session: 'morning' | 'evening';
  quantity: number;
  fat_percentage: number;
  snf_percentage: number;
  rate_per_liter: number;
  total_amount: number;
  is_accepted?: boolean;
  remarks?: string;
}

export const useMilkCollection = (selectedDate?: string, selectedSession?: 'morning' | 'evening') => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: collections, isLoading, error } = useQuery({
    queryKey: ['milk-collections', selectedDate ?? 'all', selectedSession ?? 'all'],
    queryFn: async () => {
      
      let query = supabase
        .from('milk_collections')
        .select(`
          *,
          farmers!milk_collections_farmer_id_fkey (name, farmer_code)
        `);
      
      if (selectedDate) {
        query = query.eq('collection_date', selectedDate);
      }
      if (selectedSession) {
        query = query.eq('session', selectedSession);
      }
      
      const { data, error } = await query.order('collection_date', { ascending: false });
      
      if (error) {
        
        throw error;
      }
      
      return data;
    }
  });

  const { data: dailyStats } = useQuery({
    queryKey: selectedDate ? ['daily-collection-stats', selectedDate] : ['daily-collection-stats', new Date().toISOString().split('T')[0]],
    queryFn: async () => {
      const dateToUse = selectedDate || new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('milk_collections')
        .select('quantity, total_amount, session')
        .eq('collection_date', dateToUse);
      
      if (error) throw error;
      
      const morning = data.filter(r => r.session === 'morning');
      const evening = data.filter(r => r.session === 'evening');
      
      return {
        morning: {
          quantity: morning.reduce((sum, r) => sum + Number(r.quantity), 0),
          amount: morning.reduce((sum, r) => sum + Number(r.total_amount), 0),
          count: morning.length
        },
        evening: {
          quantity: evening.reduce((sum, r) => sum + Number(r.quantity), 0),
          amount: evening.reduce((sum, r) => sum + Number(r.total_amount), 0),
          count: evening.length
        },
        total: {
          quantity: data.reduce((sum, r) => sum + Number(r.quantity), 0),
          amount: data.reduce((sum, r) => sum + Number(r.total_amount), 0),
          count: data.length
        }
      };
    }
  });

  const { data: farmers } = useQuery({
    queryKey: ['farmers-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('farmers')
        .select('id, name, farmer_code')
        .eq('is_active', true)
        .order('farmer_code');
      
      if (error) throw error;
      return data;
    }
  });

  const addCollectionMutation = useMutation({
    mutationFn: async (newCollection: Omit<MilkCollection, 'id'>) => {
      const { data, error } = await supabase
        .from('milk_collections')
        .insert(newCollection)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      
      queryClient.invalidateQueries({ queryKey: ['milk-collections'] });
      toast({ title: "Milk collection recorded successfully!" });
    },
    onError: (error) => {
      
      toast({ 
        title: "Failed to record milk collection", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  const updateCollectionMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<MilkCollection> & { id: string }) => {
      const { data, error } = await supabase
        .from('milk_collections')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['milk-collections'] });
      queryClient.invalidateQueries({ queryKey: ['daily-collection-stats'] });
      toast({ title: "Collection record updated successfully!" });
    },
    onError: (error) => {
      toast({ 
        title: "Failed to update collection record", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  const deleteCollectionMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('milk_collections')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['milk-collections'] });
      queryClient.invalidateQueries({ queryKey: ['daily-collection-stats'] });
      toast({ title: "Collection record deleted successfully!" });
    },
    onError: (error) => {
      toast({ 
        title: "Failed to delete collection record", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  return {
    collections,
    farmers,
    dailyStats,
    isLoading,
    addCollectionMutation,
    updateCollectionMutation,
    deleteCollectionMutation
  };
};
